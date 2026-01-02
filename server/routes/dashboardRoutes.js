const express = require('express');
const mongoose = require('mongoose');
const { requireUser } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');
const { ProcessArea } = require('../models/ProcessArea');
const { ProcessDepartment } = require('../models/ProcessDepartment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');

const router = express.Router();

// GET /api/dashboard/kpis
router.get('/kpis', requireUser, async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }

    const factoryQuery = { factory: new mongoose.Types.ObjectId(factoryId) };

    const totalPlantEquipment = await Equipment.countDocuments(factoryQuery);
    const activeInterventions = await Intervention.countDocuments({ ...factoryQuery, status: { $in: ['Pending', 'In Progress'] } });
    const criticalParts = await Part.countDocuments({ ...factoryQuery, $expr: { $lte: ['$currentStock', '$minStock'] } });

    // Fetch Process areas first
    const processAreas = await ProcessArea.find(factoryQuery).populate({
      path: 'departments.departmentId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment'
      }
    }).lean();

    // Collect all assigned equipment IDs for Global Reliability calculation
    const allAssignedEquipmentIds = [];
    for (const area of processAreas) {
      if (area.departments) {
        for (const dept of area.departments) {
          if (dept.departmentId && dept.departmentId.equipment) {
            for (const item of dept.departmentId.equipment) {
              if (item.equipmentId) {
                allAssignedEquipmentIds.push(item.equipmentId._id);
              }
            }
          }
        }
      }
    }

    // Aggregate MTBF and MTTR from Equipment collection
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
      ...factoryQuery,
      type: { $in: ['Corrective', 'Emergency'] }, // Use exact casing from SeedService
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

      const eqId = i.equipmentId?.toString(); // Ensure we use equipmentId ref
      if (eqId) {
        downtimeByEquipment[eqId] = (downtimeByEquipment[eqId] || 0) + downtime;
      }
    });

    for (const area of processAreas) {
      // Aggregate Production Stats from Area
      if (area.stats) {
        totalTargetOutput += area.stats.targetOutput || 0;
        totalActualOutput += area.stats.actualOutput || 0;
        totalDefectCount += area.stats.defectCount || 0;
      }

      // Aggregate Equipment Stats (Availability)
      let areaEquipmentCount = 0;
      const areaEquipmentIds = [];

      if (area.departments) {
        for (const dept of area.departments) {
          if (dept.departmentId && dept.departmentId.equipment) {
            for (const item of dept.departmentId.equipment) {
              if (item.equipmentId) {
                areaEquipmentCount++;
                areaEquipmentIds.push(item.equipmentId._id.toString());
              }
            }
          }
        }
      }

      // Calculate Scheduled Time for this area
      const shiftDuration = area.stats?.shiftDuration || 480;
      const plannedDowntime = area.stats?.plannedDowntime || 0;
      const scheduledTimePerEquipment = Math.max(0, shiftDuration - plannedDowntime);

      globalScheduledTime += areaEquipmentCount * scheduledTimePerEquipment;

      // Sum downtime for equipment in this area
      areaEquipmentIds.forEach(eqId => {
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
    const partsWithOrders = await Part.find({ ...factoryQuery, 'pendingOrders.status': { $in: ['pending', 'ordered', 'in_transit'] } });
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
    const factoryId = req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }
    const factoryQuery = { factory: new mongoose.Types.ObjectId(factoryId) };

    const recentInterventions = await Intervention.find(factoryQuery).sort({ createdDate: -1 }).limit(5).lean();
    const recentParts = await Part.find(factoryQuery).sort({ updatedAt: -1 }).limit(3).lean();
    const recentEquipment = await Equipment.find(factoryQuery).sort({ updatedAt: -1 }).limit(2).lean();

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
