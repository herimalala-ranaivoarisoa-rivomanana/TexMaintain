const mongoose = require('mongoose');
const { Equipment } = require('../models/Equipment');
const { EquipmentStatusHistory, STATUS_METADATA } = require('../models/EquipmentStatusHistory');
const { Intervention } = require('../models/Intervention');
const { Machinist } = require('../models/Machinist');
const { Mechanic } = require('../models/Mechanic');
const { Electrician } = require('../models/Electrician');
const { MaintenanceWorker } = require('../models/MaintenanceWorker');
const EquipmentMetricsService = require('./equipmentMetricsService');

/**
 * Equipment Status Service
 * Handles all status changes with complete traceability
 */

class EquipmentStatusService {
  /**
   * Change equipment status with validation and history tracking
   * @param {string} equipmentId - Equipment ID
   * @param {string} newStatus - New status to set
   * @param {string} userId - User making the change
   * @param {object} options - Additional options (reason, notes, interventionId, machinistId, metadata)
   * @returns {Promise<object>} Updated equipment and history entry
   */
  static async changeStatus(equipmentId, newStatus, userId, options = {}) {
    const { reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription, media, metadata = {} } = options;

    // Validate equipment exists
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    // Validate new status
    if (!STATUS_METADATA[newStatus]) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const previousStatus = equipment.status;

    // Validate required personnel for specific statuses
    if (newStatus === 'in_production' && !machinistId) {
      throw new Error('Machinist is required when setting equipment to In Production');
    }

    // Maintenance statuses requiring personnel
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance', 'in_workshop'];
    if (maintenanceStatuses.includes(newStatus)) {
      if (!mechanicId && !electricianId && !maintenanceWorkerId) {
        const statusLabel = STATUS_METADATA[newStatus]?.label || newStatus;
        throw new Error(`At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting equipment to ${statusLabel}`);
      }
    }

    // Check if transition is allowed (skip for initial status or same status)
    if (previousStatus && previousStatus !== newStatus) {
      if (!equipment.canTransitionTo(newStatus)) {
        const currentMeta = STATUS_METADATA[previousStatus];
        const newMeta = STATUS_METADATA[newStatus];
        throw new Error(
          `Invalid status transition from "${currentMeta?.label}" to "${newMeta?.label}". ` +
          `Allowed transitions: ${equipment.getAllowedTransitions().map(t => t.metadata?.label || t.status).join(', ')}`
        );
      }
    }

    // Calculate duration of previous status
    let duration = null;
    if (equipment.lastStatusChange) {
      duration = Math.floor((Date.now() - equipment.lastStatusChange.getTime()) / (1000 * 60)); // minutes
    }

    // Update last status history entry with duration
    if (previousStatus) {
      await EquipmentStatusHistory.findOneAndUpdate(
        { equipment: equipmentId, newStatus: previousStatus, duration: null },
        { duration },
        { sort: { timestamp: -1 } }
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
          const p = await Machinist.findById(machinistId);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (mechanicId) {
          const p = await Mechanic.findById(mechanicId);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (electricianId) {
          const p = await Electrician.findById(electricianId);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }
        if (maintenanceWorkerId) {
          const p = await MaintenanceWorker.findById(maintenanceWorkerId);
          if (p) personnelNames.push(`${p.firstName} ${p.lastName}`);
        }

        const assignedToName = personnelNames.join(', ');

        // Create Intervention
        const newIntervention = await Intervention.create({
          title: `Auto: ${STATUS_METADATA[newStatus]?.label || newStatus} - ${equipment.name || 'Equipment'}`,
          type,
          priority,
          status: personnelNames.length > 0 ? 'In Progress' : 'Pending',
          equipmentId: equipment._id,
          equipment: equipment.location || equipment.name || 'Unknown Location', // Legacy field support
          description: breakdownDescription || reason || notes || `Automatically created due to status change to ${STATUS_METADATA[newStatus]?.label || newStatus}`,
          assignedTo: assignedToName,
          dueDate: new Date(), // Immediate attention
          createdDate: new Date()
        });

        createdInterventionId = newIntervention._id;
        console.log(`Auto-created intervention ${newIntervention._id} for status ${newStatus}`);
      } catch (err) {
        console.error('Error auto-creating intervention:', err);
        // Don't block status change if intervention creation fails
      }
    }

    // Create history entry
    const historyEntry = await EquipmentStatusHistory.create({
      equipment: equipmentId,
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
    });

    // Update equipment status
    equipment.status = newStatus;
    equipment.lastStatusChange = new Date();
    equipment.lastStatusChangedBy = userId;
    equipment.currentStatusDuration = 0;

    // Save breakdown info if status is breakdown
    if (newStatus === 'breakdown') {
      if (breakdownType) equipment.lastBreakdownType = breakdownType;
      if (breakdownDescription) equipment.lastBreakdownDescription = breakdownDescription;
    }

    // Update status media
    equipment.statusMedia = options.media || [];

    await equipment.save();

    // Populate the history entry
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

    // Return updated equipment with populated fields
    const updatedEquipment = await Equipment.findById(equipmentId)
      .populate('category')
      .populate('type')
      .populate('lastStatusChangedBy', 'email role');

    // Trigger metric recalculation (availability/downtime changes)
    EquipmentMetricsService.calculateMetrics(equipmentId).catch(err =>
      console.error(`Error recalculating metrics for ${equipmentId}:`, err)
    );

    return {
      equipment: updatedEquipment,
      historyEntry
    };
  }

  /**
   * Get status history for an equipment
   * @param {string} equipmentId - Equipment ID
   * @param {object} options - Query options (limit, skip, startDate, endDate)
   * @returns {Promise<Array>} Status history entries
   */
  static async getStatusHistory(equipmentId, options = {}) {
    const { limit = 50, skip = 0, startDate, endDate } = options;

    // Validate and convert equipmentId to ObjectId
    if (!equipmentId || !mongoose.Types.ObjectId.isValid(equipmentId)) {
      throw new Error('Invalid equipment ID');
    }

    // Use direct comparison - Mongoose handles ObjectId conversion automatically
    const query = { equipment: equipmentId };

    console.log(`[getStatusHistory] Fetching history for equipment: ${equipmentId}`);
    console.log('[getStatusHistory] Query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      EquipmentStatusHistory.find(query)
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
      EquipmentStatusHistory.countDocuments(query)
    ]);

    console.log(`[getStatusHistory] Found ${total} total entries, returning ${history.length} entries`);
    if (history.length > 0) {
      console.log('[getStatusHistory] Sample entry equipment ID:', history[0].equipment);
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
   * Get status statistics for an equipment
   * @param {string} equipmentId - Equipment ID
   * @param {object} options - Query options (startDate, endDate)
   * @returns {Promise<object>} Status statistics
   */
  static async getStatusStatistics(equipmentId, options = {}) {
    const { startDate, endDate } = options;

    const query = { equipment: equipmentId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const history = await EquipmentStatusHistory.find(query)
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
   * Get current status duration for an equipment
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<number>} Duration in minutes
   */
  static async getCurrentStatusDuration(equipmentId) {
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment || !equipment.lastStatusChange) {
      return 0;
    }

    return Math.floor((Date.now() - equipment.lastStatusChange.getTime()) / (1000 * 60));
  }

  /**
   * Get all allowed transitions for an equipment's current status
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Array>} Allowed transitions with metadata
   */
  static async getAllowedTransitions(equipmentId) {
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    return equipment.getAllowedTransitions();
  }

  /**
   * Bulk status change for multiple equipment
   * @param {Array<string>} equipmentIds - Array of equipment IDs
   * @param {string} newStatus - New status to set
   * @param {string} userId - User making the change
   * @param {object} options - Additional options
   * @returns {Promise<object>} Results of bulk operation
   */
  static async bulkChangeStatus(equipmentIds, newStatus, userId, options = {}) {
    const results = {
      successful: [],
      failed: []
    };

    for (const equipmentId of equipmentIds) {
      try {
        const result = await this.changeStatus(equipmentId, newStatus, userId, options);
        results.successful.push({
          equipmentId,
          equipment: result.equipment
        });
      } catch (error) {
        results.failed.push({
          equipmentId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get equipment by status
   * @param {string} status - Status to filter by
   * @param {object} options - Query options
   * @returns {Promise<Array>} Equipment list
   */
  static async getEquipmentByStatus(status, options = {}) {
    const { limit = 50, skip = 0 } = options;

    const query = { status };

    const [equipment, total] = await Promise.all([
      Equipment.find(query)
        .sort({ lastStatusChange: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('type')
        .populate('lastStatusChangedBy', 'email role')
        .lean(),
      Equipment.countDocuments(query)
    ]);

    return {
      equipment,
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }

  /**
   * Get equipment by status category
   * @param {string} category - Category to filter by (production, maintenance, out_of_service)
   * @param {object} options - Query options
   * @returns {Promise<Array>} Equipment list
   */
  static async getEquipmentByCategory(category, options = {}) {
    const { limit = 50, skip = 0 } = options;

    const query = { statusCategory: category };

    const [equipment, total] = await Promise.all([
      Equipment.find(query)
        .sort({ lastStatusChange: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('type')
        .populate('lastStatusChangedBy', 'email role')
        .lean(),
      Equipment.countDocuments(query)
    ]);

    return {
      equipment,
      total,
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }
}

module.exports = EquipmentStatusService;