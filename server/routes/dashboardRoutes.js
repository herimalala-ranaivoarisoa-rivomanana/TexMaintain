const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { ProductionLine } = require('../models/ProductionLine');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
const { ProductionSection } = require('../models/ProductionSection'); // Ensure this is registered
const { EquipmentStatusHistory } = require('../models/EquipmentStatusHistory');

const router = express.Router();

// Helper to compute MTTR and MTBF from interventions - DEPRECATED
// Now using stored values in Equipment model
// const computeReliability = async (equipmentIds) => { ... }

// GET /api/dashboard/kpis
router.get('/kpis', requireUser, async (req, res) => {
  try {
    const totalPlantEquipment = await Equipment.countDocuments();
    const activeInterventions = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
    const criticalParts = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });

    // Fetch Process areas first
    const productionLines = await ProductionLine.find().populate({
      path: 'sections.sectionId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment'
      }
    }).lean();

    // Collect all assigned equipment IDs for Global Reliability calculation
    const allAssignedEquipmentIds = [];
    for (const line of productionLines) {
      if (line.sections) {
        for (const section of line.sections) {
          if (section.sectionId && section.sectionId.equipment) {
            for (const item of section.sectionId.equipment) {
              if (item.equipmentId) {
                allAssignedEquipmentIds.push(item.equipmentId._id);
              }
            }
          }
        }
      }
    }

    // Aggregate MTBF and MTTR from Equipment collection
    // Only consider equipment that is assigned to process areas (or all? usually all active equipment)
    // For consistency with previous logic which used "allAssignedEquipmentIds", we filter by that.
    // If allAssignedEquipmentIds is empty, we might want to fallback to all equipment or return 0.

    let mttr = 0;
    let mtbf = 0;

    if (allAssignedEquipmentIds.length > 0) {
      const aggregation = await Equipment.aggregate([
        { $match: { _id: { $in: allAssignedEquipmentIds } } },
        {
          $group: {
            _id: null,
            avgMtbf: { $avg: '$mtbf' },
            avgMttr: { $avg: '$mttr' }
          }
        }
      ]);

      if (aggregation.length > 0) {
        mtbf = Math.round((aggregation[0].avgMtbf || 0) * 100) / 100;
        mttr = Math.round((aggregation[0].avgMttr || 0) * 100) / 100;
      }
    } else {
      // Fallback to all equipment if no lines defined yet?
      // Or just return 0.
    }

    // Aggregate data from all Process areas for Global OEE & Availability

    let totalTargetOutput = 0;
    let totalActualOutput = 0;
    let totalDefectCount = 0;

    // Time-based Availability Calculation
    let globalScheduledTime = 0;
    let globalUnplannedDowntime = 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    // Get all corrective/emergency interventions for today for downtime calculation
    const allDowntimeInterventions = await Intervention.find({
      type: { $in: ['Corrective', 'Emergency'] },
      createdDate: { $gte: startOfDay }
    }).lean();

    // Map interventions by equipment ID for fast lookup
    const downtimeByEquipment = {};
    allDowntimeInterventions.forEach(i => {
      let downtime = 0;
      if (i.status === 'Completed' && i.completedDate) {
        if (i.actualDuration) {
          downtime = i.actualDuration * 60; // hours to minutes
        } else {
          downtime = (i.completedDate - i.createdDate) / (1000 * 60); // minutes
        }
      } else {
        downtime = (now - i.createdDate) / (1000 * 60); // minutes
      }

      const eqId = i.equipment?.toString() || i.equipmentId?.toString();
      if (eqId) {
        downtimeByEquipment[eqId] = (downtimeByEquipment[eqId] || 0) + downtime;
      }
    });

    for (const line of productionLines) {
      // Aggregate Production Stats
      if (line.stats) {
        totalTargetOutput += line.stats.targetOutput || 0;
        totalActualOutput += line.stats.actualOutput || 0;
        totalDefectCount += line.stats.defectCount || 0;
      }

      // Aggregate Equipment Stats (Availability)
      let lineEquipmentCount = 0;
      const lineEquipmentIds = [];

      if (line.sections) {
        for (const section of line.sections) {
          if (section.sectionId && section.sectionId.equipment) {
            for (const item of section.sectionId.equipment) {
              if (item.equipmentId) {
                lineEquipmentCount++;
                lineEquipmentIds.push(item.equipmentId._id.toString());
              }
            }
          }
        }
      }

      // Calculate Scheduled Time for this line
      const shiftDuration = line.stats?.shiftDuration || 480;
      const plannedDowntime = line.stats?.plannedDowntime || 0;
      const scheduledTimePerEquipment = Math.max(0, shiftDuration - plannedDowntime);

      globalScheduledTime += lineEquipmentCount * scheduledTimePerEquipment;

      // Sum downtime for equipment in this line
      lineEquipmentIds.forEach(eqId => {
        globalUnplannedDowntime += (downtimeByEquipment[eqId] || 0);
      });
    }

    // Calculate Global Availability (Time-based)
    let availability = 0;
    if (globalScheduledTime > 0) {
      const globalUptime = Math.max(0, globalScheduledTime - globalUnplannedDowntime);
      availability = Math.round((globalUptime / globalScheduledTime) * 100 * 100) / 100;
    }

    // Calculate Global Performance
    let performance = 0;
    if (totalTargetOutput > 0) {
      performance = Math.min(totalActualOutput / totalTargetOutput, 1);
    }

    // Calculate Global Quality
    let quality = 0;
    if (totalActualOutput > 0) {
      const goodUnits = totalActualOutput - totalDefectCount;
      quality = Math.max(0, Math.min(1, goodUnits / totalActualOutput));
    }

    // Calculate Global OEE
    const availabilityFactor = availability / 100;
    const oee = Math.round(availabilityFactor * performance * quality * 100 * 100) / 100;

    // Calculate pending orders count
    const partsWithOrders = await Part.find({ 'pendingOrders.status': { $in: ['pending', 'ordered', 'in_transit'] } });
    const pendingOrders = partsWithOrders.reduce((total, part) => {
      return total + part.pendingOrders.filter(o => ['pending', 'ordered', 'in_transit'].includes(o.status)).length;
    }, 0);

    return res.status(200).json({
      kpis: {
        mttr,
        mtbf,
        oee,
        availability,
        totalEquipment: totalPlantEquipment,
        activeInterventions,
        criticalParts,
        pendingOrders
      }
    });

  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard KPIs' });
  }
});

// GET /api/dashboard/activities (last 10 changes based on creation dates)
router.get('/activities', requireUser, async (req, res) => {
  try {
    const recentInterventions = await Intervention.find().sort({ createdDate: -1 }).limit(5).lean();
    const recentParts = await Part.find().sort({ updatedAt: -1 }).limit(3).lean();
    const recentEquipment = await Equipment.find().sort({ updatedAt: -1 }).limit(2).lean();

    const activities = [
      ...recentInterventions.map(i => ({
        _id: String(i._id),
        type: 'intervention',
        description: `${i.type} intervention: ${i.title}`,
        timestamp: i.createdDate,
        priority: i.priority?.toLowerCase() || 'low'
      })),
      ...recentParts.map(p => ({
        _id: String(p._id),
        type: 'inventory',
        description: `Part updated: ${p.name} (${p.partNumber})`,
        timestamp: p.updatedAt,
        priority: 'medium'
      })),
      ...recentEquipment.map(e => ({
        _id: String(e._id),
        type: 'equipment',
        description: `Equipment updated: ${e.model || e.serialNumber || 'Unknown'}`,
        timestamp: e.updatedAt,
        priority: 'low'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ activities });
  } catch (error) {
    console.error('Dashboard activities error:', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard activities' });
  }
});

module.exports = router;
