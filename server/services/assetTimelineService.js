const mongoose = require('mongoose');
const { AssetStatusHistory } = require('../models/AssetStatusHistory');
const { Intervention } = require('../models/Intervention');
const { AssetPart } = require('../models/AssetPart');

/**
 * Asset Timeline Service
 * Consolidates all asset events into a unified timeline
 */

class AssetTimelineService {
  /**
   * Get unified timeline for an asset
   * Combines: status changes, interventions, parts usage, consumables usage
   * 
   * @param {string} assetId - Asset ID
   * @param {object} options - Query options (limit, skip, startDate, endDate, eventTypes)
   * @returns {Promise<object>} Unified timeline with all events
   */
  static async getUnifiedTimeline(assetId, options = {}) {
    const { limit = 50, skip = 0, startDate, endDate, eventTypes = ['all'] } = options;

    // Validate asset ID
    if (!assetId || !mongoose.Types.ObjectId.isValid(assetId)) {
      throw new Error('Invalid asset ID');
    }

    console.log(`[getUnifiedTimeline] Fetching timeline for asset: ${assetId}`);
    console.log(`[getUnifiedTimeline] Event types:`, eventTypes);

    const includeAll = eventTypes.includes('all');
    const includeStatus = includeAll || eventTypes.includes('status');
    const includeInterventions = includeAll || eventTypes.includes('interventions');
    const includeParts = includeAll || eventTypes.includes('parts');

    // Build date query
    const dateQuery = {};
    if (startDate || endDate) {
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
    }

    // Fetch all events in parallel
    const [statusChanges, interventions, partsUsage] = await Promise.all([
      // 1. Status changes
      includeStatus
        ? AssetStatusHistory.find({ 
            asset: assetId,
            ...(Object.keys(dateQuery).length > 0 && { timestamp: dateQuery })
          })
          .populate('changedBy', 'email role fullName')
          .populate('machinist', 'matricule firstName lastName fullName')
          .populate('mechanic', 'matricule firstName lastName fullName')
          .populate('electrician', 'matricule firstName lastName fullName')
          .populate('maintenanceWorker', 'matricule firstName lastName fullName')
          .populate('intervention', 'title type status')
          .lean()
        : Promise.resolve([]),

      // 2. Interventions
      includeInterventions
        ? Intervention.find({ 
            assetId,
            ...(Object.keys(dateQuery).length > 0 && { createdDate: dateQuery })
          })
          .lean()
        : Promise.resolve([]),

      // 3. Parts & Consumables usage
      includeParts
        ? AssetPart.find({ asset: assetId })
          .populate('part', 'name partNumber type category')
          .populate('replacementHistory.performedBy', 'email fullName')
          .lean()
        : Promise.resolve([])
    ]);

    // Transform to unified event format
    const events = [];

    // Add status change events
    statusChanges.forEach(change => {
      events.push({
        _id: change._id,
        type: 'status_change',
        timestamp: change.timestamp,
        title: `Status changed to ${change.newStatus}`,
        data: {
          previousStatus: change.previousStatus,
          newStatus: change.newStatus,
          changedBy: change.changedBy,
          reason: change.reason,
          notes: change.notes,
          duration: change.duration,
          machinist: change.machinist,
          mechanic: change.mechanic,
          electrician: change.electrician,
          maintenanceWorker: change.maintenanceWorker,
          breakdownInfo: change.breakdownInfo,
          intervention: change.intervention
        }
      });
    });

    // Add intervention events
    interventions.forEach(intervention => {
      events.push({
        _id: intervention._id,
        type: 'intervention',
        timestamp: intervention.createdDate,
        title: intervention.title,
        data: {
          type: intervention.type,
          priority: intervention.priority,
          status: intervention.status,
          assignedTo: intervention.assignedTo,
          description: intervention.description,
          dueDate: intervention.dueDate,
          completedDate: intervention.completedDate
        }
      });
    });

    // Add parts/consumables usage events
    partsUsage.forEach(association => {
      if (association.replacementHistory && association.replacementHistory.length > 0) {
        association.replacementHistory.forEach(replacement => {
          // Apply date filter on replacement date
          if (Object.keys(dateQuery).length > 0) {
            const replDate = new Date(replacement.date);
            if (dateQuery.$gte && replDate < dateQuery.$gte) return;
            if (dateQuery.$lte && replDate > dateQuery.$lte) return;
          }

          events.push({
            _id: `${association._id}_${replacement.date}`,
            type: association.part.type === 'consumable' ? 'consumable_usage' : 'part_replacement',
            timestamp: replacement.date,
            title: association.part.type === 'consumable' 
              ? `Used ${association.part.name}`
              : `Replaced ${association.part.name}`,
            data: {
              part: {
                _id: association.part._id,
                name: association.part.name,
                partNumber: association.part.partNumber,
                type: association.part.type,
                category: association.part.category
              },
              quantityUsed: replacement.quantityUsed,
              performedBy: replacement.performedBy,
              notes: replacement.notes
            }
          });
        });
      }
    });

    // Sort all events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = events.length;
    const paginatedEvents = events.slice(skip, skip + limit);

    console.log(`[getUnifiedTimeline] Total events: ${total}, returning ${paginatedEvents.length}`);

    return {
      timeline: paginatedEvents,
      total,
      counts: {
        statusChanges: statusChanges.length,
        interventions: interventions.length,
        partsUsage: partsUsage.reduce((sum, a) => sum + (a.replacementHistory?.length || 0), 0)
      },
      page: Math.floor(skip / limit) + 1,
      limit
    };
  }

  /**
   * Get timeline statistics
   * @param {string} assetId - Asset ID
   * @param {object} options - Query options (startDate, endDate)
   * @returns {Promise<object>} Timeline statistics
   */
  static async getTimelineStatistics(assetId, options = {}) {
    const { startDate, endDate } = options;

    const dateQuery = {};
    if (startDate || endDate) {
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
    }

    const [statusChangesCount, interventionsCount, partsUsage] = await Promise.all([
      AssetStatusHistory.countDocuments({ 
        asset: assetId,
        ...(Object.keys(dateQuery).length > 0 && { timestamp: dateQuery })
      }),
      
      Intervention.countDocuments({ 
        assetId,
        ...(Object.keys(dateQuery).length > 0 && { createdDate: dateQuery })
      }),
      
      AssetPart.find({ asset: assetId }).lean()
    ]);

    const partsReplacementsCount = partsUsage.reduce((sum, association) => {
      if (!association.replacementHistory) return sum;
      
      if (Object.keys(dateQuery).length === 0) {
        return sum + association.replacementHistory.length;
      }
      
      return sum + association.replacementHistory.filter(r => {
        const replDate = new Date(r.date);
        if (dateQuery.$gte && replDate < dateQuery.$gte) return false;
        if (dateQuery.$lte && replDate > dateQuery.$lte) return false;
        return true;
      }).length;
    }, 0);

    return {
      totalEvents: statusChangesCount + interventionsCount + partsReplacementsCount,
      statusChanges: statusChangesCount,
      interventions: interventionsCount,
      partsReplacements: partsReplacementsCount
    };
  }
}

module.exports = AssetTimelineService;
