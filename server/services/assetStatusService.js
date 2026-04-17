const mongoose = require('mongoose');
const { Asset } = require('../models/Asset');
const { AssetStatusHistory, STATUS_METADATA } = require('../models/AssetStatusHistory');
const { Intervention } = require('../models/Intervention');
const { Personnel } = require('../models/Personnel');
const AssetMetricsService = require('./assetMetricsService');

/**
 * Asset Status Service (works with Asset model)
 * Handles all status changes with complete traceability
 */

class AssetStatusService {
  /**
   * Change asset status with validation and history tracking
   * @param {string} assetId - Asset ID (was assetId)
   * @param {string} newStatus - New status to set
   * @param {string} userId - User making the change
   * @param {object} options - Additional options (reason, notes, interventionId, machinistId, metadata)
   * @returns {Promise<object>} Updated asset and history entry
   */
  static async changeStatus(assetId, newStatus, userId, options = {}) {
    const { reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription, media, metadata = {}, session = null } = options;

    // Validate asset exists
    const asset = await Asset.findById(assetId).session(session);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Validate new status
    if (!STATUS_METADATA[newStatus]) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const previousStatus = asset.status;

    // Validate required personnel for specific statuses
    if (newStatus === 'in_production' && (!machinistId || machinistId.trim() === '')) {
      throw new Error('Machinist is required when setting asset to In Production');
    }

    // Validate personnel roles if IDs are provided (skip empty strings)
    if (machinistId && machinistId.trim() !== '') {
      const p = await Personnel.findById(machinistId).session(session);
      if (!p || p.role !== 'machinist') throw new Error('Invalid Machinist ID or personnel is not a Machinist');
    }
    if (mechanicId && mechanicId.trim() !== '') {
      const p = await Personnel.findById(mechanicId).session(session);
      if (!p || p.role !== 'mechanic') throw new Error('Invalid Mechanic ID or personnel is not a Mechanic');
    }
    if (electricianId && electricianId.trim() !== '') {
      const p = await Personnel.findById(electricianId).session(session);
      if (!p || p.role !== 'electrician') throw new Error('Invalid Electrician ID or personnel is not an Electrician');
    }
    if (maintenanceWorkerId && maintenanceWorkerId.trim() !== '') {
      const p = await Personnel.findById(maintenanceWorkerId).session(session);
      if (!p || p.role !== 'maintenance_worker') throw new Error('Invalid Maintenance Worker ID or personnel is not a Maintenance Worker');
    }

    // Maintenance statuses requiring personnel
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance', 'in_workshop'];
    const hasMechanic = mechanicId && mechanicId.trim() !== '';
    const hasElectrician = electricianId && electricianId.trim() !== '';
    const hasMaintenanceWorker = maintenanceWorkerId && maintenanceWorkerId.trim() !== '';
    if (maintenanceStatuses.includes(newStatus)) {
      if (!hasMechanic && !hasElectrician && !hasMaintenanceWorker) {
        const statusLabel = STATUS_METADATA[newStatus]?.label || newStatus;
        throw new Error(`At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to ${statusLabel}`);
      }
    }

    // Check if transition is allowed (skip for initial status or same status)
    if (previousStatus && previousStatus !== newStatus) {
      if (!asset.canTransitionTo(newStatus)) {
        const currentMeta = STATUS_METADATA[previousStatus];
        const newMeta = STATUS_METADATA[newStatus];
        throw new Error(
          `Invalid status transition from "${currentMeta?.label}" to "${newMeta?.label}". ` +
          `Allowed transitions: ${asset.getAllowedTransitions().map(t => t.metadata?.label || t.status).join(', ')}`
        );
      }
    }

    // Calculate duration of previous status
    let duration = null;
    if (asset.lastStatusChange) {
      duration = Math.floor((Date.now() - asset.lastStatusChange.getTime()) / (1000 * 60)); // minutes
    }

    // Update last status history entry with duration
    if (previousStatus) {
      await AssetStatusHistory.findOneAndUpdate(
        { asset: assetId, newStatus: previousStatus, duration: null },
        { duration },
        { sort: { timestamp: -1 }, session }
      );
    }

    // Auto-create intervention if needed for specific statuses
    let createdInterventionId = null;
    const autoInterventionStatuses = ['breakdown', 'scheduled_maintenance', 'setup_adjustment'];

    if (autoInterventionStatuses.includes(newStatus) && !interventionId) {
      try {
        // Determine type and priority
        let type = 'Preventive';
        let priority = 'Medium';

        if (newStatus === 'breakdown') {
          type = 'Corrective';
          priority = 'Critical';
        } else if (newStatus === 'setup_adjustment') {
          priority = 'Low';
        }

        // Resolve assigned personnel name
        const personnelNames = [];

        if (machinistId) {
          const p = await Personnel.findById(machinistId).session(session);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (mechanicId) {
          const p = await Personnel.findById(mechanicId).session(session);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (electricianId) {
          const p = await Personnel.findById(electricianId).session(session);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (maintenanceWorkerId) {
          const p = await Personnel.findById(maintenanceWorkerId).session(session);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }

        const assignedToName = personnelNames.join(', ');

        // Create Intervention
        const [newIntervention] = await Intervention.create([{
          title: `Auto: ${STATUS_METADATA[newStatus]?.label || newStatus} - ${asset.name || asset.model || 'Asset'}`,
          type,
          priority,
          status: personnelNames.length > 0 ? 'In Progress' : 'Pending',
          assetId: asset._id,
          asset: asset.location || asset.name || asset.model || 'Unknown Location', // Legacy field support
          description: breakdownDescription || reason || notes || `Automatically created due to status change to ${STATUS_METADATA[newStatus]?.label || newStatus}`,
          assignedTo: assignedToName,
          dueDate: new Date(), // Immediate attention
          createdDate: new Date()
        }], { session });

        createdInterventionId = newIntervention._id;
        console.log(`Auto-created intervention ${newIntervention._id} for status ${newStatus}`);
      } catch (err) {
        console.error('Error auto-creating intervention:', err);
        // Don't block status change if intervention creation fails
      }
    }

    // Create history entry
    const [historyEntry] = await AssetStatusHistory.create([{
      asset: assetId,
      previousStatus: previousStatus || null,
      newStatus,
      changedBy: userId,
      reason: reason || '',
      notes: notes || '',
      intervention: interventionId || createdInterventionId || null,
      machinist: machinistId || null,
      mechanic: mechanicId || null,
      electrician: electricianId || null,
      maintenanceWorker: maintenanceWorkerId || null,
      breakdownInfo: (newStatus === 'breakdown' && (breakdownType || breakdownDescription)) ? {
        type: breakdownType,
        description: breakdownDescription
      } : undefined,
      media: options.media || [],
      metadata,
      timestamp: new Date()
    }], { session });

    // Update asset status
    asset.status = newStatus;
    asset.lastStatusChange = new Date();
    asset.lastStatusChangedBy = userId;
    asset.currentStatusDuration = 0;

    // Save breakdown info if status is breakdown
    if (newStatus === 'breakdown') {
      if (breakdownType) asset.lastBreakdownType = breakdownType;
      if (breakdownDescription) asset.lastBreakdownDescription = breakdownDescription;
    }

    // Update status media
    asset.statusMedia = options.media || [];

    await asset.save({ session });

    // Populate the history entry (population relies on read, should generally work even within session context if documents exist)
    // Note: Population in mongoose with session usually works fine.
    await historyEntry.populate('changedBy', 'email role');
    await historyEntry.populate('intervention', 'title type status');
    if (machinistId) {
      await historyEntry.populate('machinist', 'matricule firstName lastName fullName');
    }
    if (mechanicId) {
      await historyEntry.populate('mechanic', 'matricule firstName lastName fullName');
    }
    if (electricianId) {
      await historyEntry.populate('electrician', 'matricule firstName lastName fullName');
    }
    if (maintenanceWorkerId) {
      await historyEntry.populate('maintenanceWorker', 'matricule firstName lastName fullName');
    }

    // Return updated asset with populated fields
    const updatedAsset = await Asset.findById(assetId)
      .session(session)
      .populate('category')
      .populate('subCategory')
      .populate('lastStatusChangedBy', 'email role');

    // Trigger metric recalculation (availability/downtime changes)
    // Only invoke if NO session (committed), or if we are sure we want to run it now.
    // Metric Recalculation is heavy and maybe shouldn't be part of the transaction critical path if not necessary for consistency.
    // We can run it detached, but if transaction fails, we might have recalculated for nothing (or based on phantom data).
    // Better to run it AFTER transaction commits in the caller.
    // But this method calls it here.
    // We will conditionally run it if no session is passed, or let the caller handle it if session IS passed.
    if (!session) {
      AssetMetricsService.calculateMetrics(assetId).catch(err =>
        console.error(`Error recalculating metrics for ${assetId}:`, err)
      );
    }

    return {
      asset: updatedAsset, // Keep 'asset' key for backward compatibility
      asset: updatedAsset, // Add 'asset' key for new code
      historyEntry
    };
  }

  /**
   * Get status history for an asset
   * @param {string} assetId - Asset ID (was assetId)
   * @param {object} options - Query options (limit, skip, startDate, endDate)
   * @returns {Promise<Array>} Status history entries
   */
  static async getStatusHistory(assetId, options = {}) {
    const { limit = 50, skip = 0, startDate, endDate } = options;

    // Validate and convert assetId to ObjectId
    if (!assetId || !mongoose.Types.ObjectId.isValid(assetId)) {
      throw new Error('Invalid asset ID');
    }

    // Use direct comparison - Mongoose handles ObjectId conversion automatically
    const query = { asset: assetId };

    console.log(`[getStatusHistory] Fetching history for asset: ${assetId}`);
    console.log('[getStatusHistory] Query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      AssetStatusHistory.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('changedBy', 'email role')
        .populate('intervention', 'title type status')
        .populate('machinist', 'matricule firstName lastName fullName')
        .populate('mechanic', 'matricule firstName lastName fullName')
        .populate('electrician', 'matricule firstName lastName fullName')
        .populate('maintenanceWorker', 'matricule firstName lastName fullName')
        .lean(),
      AssetStatusHistory.countDocuments(query)
    ]);

    console.log(`[getStatusHistory] Found ${total} total entries, returning ${history.length} entries`);
    if (history.length > 0) {
      console.log('[getStatusHistory] Sample entry asset ID:', history[0].asset);
    }

    // Add metadata to each entry
    const enrichedHistory = history.map(entry => ({
      ...entry,
      statusMetadata: STATUS_METADATA[entry.newStatus] || {},
      previousStatusMetadata: entry.previousStatus ? STATUS_METADATA[entry.previousStatus] || {} : null
    }));

    return {
      history: enrichedHistory,
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }

  /**
   * Get status statistics for an asset
   * @param {string} assetId - Asset ID (was assetId)
   * @param {object} options - Query options (startDate, endDate)
   * @returns {Promise<object>} Status statistics
   */
  static async getStatusStatistics(assetId, options = {}) {
    const { startDate, endDate } = options;

    const query = { asset: assetId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const history = await AssetStatusHistory.find(query)
      .sort({ timestamp: 1 })
      .lean();

    // Calculate statistics
    const stats = {
      totalChanges: history.length,
      statusBreakdown: {},
      categoryBreakdown: {
        production: { count: 0, totalDuration: 0 },
        maintenance: { count: 0, totalDuration: 0 },
        out_of_service: { count: 0, totalDuration: 0 }
      },
      averageDuration: {},
      totalDuration: 0
    };

    history.forEach(entry => {
      const status = entry.newStatus;
      const metadata = STATUS_METADATA[status];
      const duration = entry.duration || 0;

      // Status breakdown
      if (!stats.statusBreakdown[status]) {
        stats.statusBreakdown[status] = {
          count: 0,
          totalDuration: 0,
          label: metadata?.label || status,
          color: metadata?.color || 'gray'
        };
      }
      stats.statusBreakdown[status].count++;
      stats.statusBreakdown[status].totalDuration += duration;

      // Category breakdown
      if (metadata?.category) {
        stats.categoryBreakdown[metadata.category].count++;
        stats.categoryBreakdown[metadata.category].totalDuration += duration;
      }

      stats.totalDuration += duration;
    });

    // Calculate averages
    Object.keys(stats.statusBreakdown).forEach(status => {
      const data = stats.statusBreakdown[status];
      stats.averageDuration[status] = data.count > 0 ? data.totalDuration / data.count : 0;
    });

    // Calculate percentages
    Object.keys(stats.statusBreakdown).forEach(status => {
      const data = stats.statusBreakdown[status];
      data.percentage = stats.totalDuration > 0 ? (data.totalDuration / stats.totalDuration) * 100 : 0;
    });

    Object.keys(stats.categoryBreakdown).forEach(category => {
      const data = stats.categoryBreakdown[category];
      data.percentage = stats.totalDuration > 0 ? (data.totalDuration / stats.totalDuration) * 100 : 0;
    });

    return stats;
  }

  /**
   * Get current status duration for an asset
   * @param {string} assetId - Asset ID (was assetId)
   * @returns {Promise<number>} Duration in minutes
   */
  static async getCurrentStatusDuration(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset || !asset.lastStatusChange) {
      return 0;
    }

    return Math.floor((Date.now() - asset.lastStatusChange.getTime()) / (1000 * 60));
  }

  /**
   * Get all allowed transitions for an asset's current status
   * @param {string} assetId - Asset ID (was assetId)
   * @returns {Promise<Array>} Allowed transitions with metadata
   */
  static async getAllowedTransitions(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    return asset.getAllowedTransitions();
  }

  /**
   * Bulk status change for multiple assets
   * @param {Array<string>} assetIds - Array of asset IDs (was assetIds)
   * @param {string} newStatus - New status to set
   * @param {string} userId - User making the change
   * @param {object} options - Additional options
   * @returns {Promise<object>} Results of bulk operation
   */
  static async bulkChangeStatus(assetIds, newStatus, userId, options = {}) {
    const results = {
      successful: [],
      failed: []
    };

    for (const assetId of assetIds) {
      try {
        const result = await this.changeStatus(assetId, newStatus, userId, options);
        results.successful.push({
          assetId,
          asset: result.asset, // Keep for backward compatibility
          asset: result.asset || result.asset // Add asset key
        });
      } catch (error) {
        results.failed.push({
          assetId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get assets by status
   * @param {string} status - Status to filter by
   * @param {object} options - Query options
   * @returns {Promise<Array>} Asset list
   */
  static async getAssetByStatus(status, options = {}) {
    const { limit = 50, skip = 0 } = options;

    const query = { status };

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ lastStatusChange: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('subCategory')
        .populate('lastStatusChangedBy', 'email role')
        .lean(),
      Asset.countDocuments(query)
    ]);

    return {
      asset: assets, // Keep for backward compatibility
      assets, // Add assets key
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }

  /**
   * Get assets by status category
   * @param {string} category - Category to filter by (production, maintenance, out_of_service)
   * @param {object} options - Query options
   * @returns {Promise<Array>} Asset list
   */
  static async getAssetByCategory(category, options = {}) {
    const { limit = 50, skip = 0 } = options;

    const query = { statusCategory: category };

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ lastStatusChange: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('subCategory')
        .populate('lastStatusChangedBy', 'email role')
        .lean(),
      Asset.countDocuments(query)
    ]);

    return {
      asset: assets, // Keep for backward compatibility
      assets, // Add assets key
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }
}

module.exports = AssetStatusService;