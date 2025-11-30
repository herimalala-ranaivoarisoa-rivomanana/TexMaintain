const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { ProductionLine } = require('../models/ProductionLine');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
const { ProductionSection } = require('../models/ProductionSection'); // Ensure this is registered
const { EquipmentStatusHistory } = require('../models/EquipmentStatusHistory');

const router = express.Router();

// Helper to compute MTTR and MTBF from interventions
const computeReliability = async (equipmentIds) => {
  const query = {
    type: { $in: ['Corrective', 'Emergency'] },
    status: 'Completed'
  };

  if (equipmentIds) {
    if (equipmentIds.length === 0) {
      return { mttr: 0, mtbf: 0 };
    }
    query.equipment = { $in: equipmentIds };
  }

  const interventions = await Intervention.find(query).sort({ createdDate: 1 }).lean();

  if (!interventions.length) {
    return { mttr: 0, mtbf: 0 };
  }

  // Calculate MTBF (Mean Time Between Failures)
  let mtbf = 0;
  if (interventions.length > 1) {
    const intervals = [];
    for (let i = 1; i < interventions.length; i++) {
      const interval = (interventions[i].createdDate - interventions[i - 1].createdDate) / (1000 * 60 * 60); // hours
      intervals.push(interval);
    }
    mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  // Calculate MTTR (Mean Time To Repair)
  const durations = interventions
    .filter(i => i.dueDate && i.createdDate)
    .map(i => (i.dueDate - i.createdDate) / (1000 * 60 * 60)); // hours

  const mttr = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  return {
    mttr: Math.round(mttr * 100) / 100,
    mtbf: Math.round(mtbf * 100) / 100
  };
};

// GET /api/dashboard/kpis
router.get('/kpis', requireUser, async (req, res) => {
  try {
    const totalPlantEquipment = await Equipment.countDocuments();
    const activeInterventions = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
    const criticalParts = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });

    // Fetch Production Lines first
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

    const { mttr, mtbf } = await computeReliability(allAssignedEquipmentIds);

    // Aggregate data from all Production Lines for Global OEE & Availability

    let totalTargetOutput = 0;
    let totalActualOutput = 0;
    let totalDefectCount = 0;
    let totalAssignedEquipment = 0;
    let totalActiveAssignedEquipment = 0;

    for (const line of productionLines) {
      // Aggregate Production Stats
      if (line.stats) {
        totalTargetOutput += line.stats.targetOutput || 0;
        totalActualOutput += line.stats.actualOutput || 0;
        totalDefectCount += line.stats.defectCount || 0;
      }

      // Aggregate Equipment Stats (Availability)
      if (line.sections) {
        for (const section of line.sections) {
          if (section.sectionId && section.sectionId.equipment) {
            for (const item of section.sectionId.equipment) {
              if (item.equipmentId) {
                totalAssignedEquipment++;
                if (item.equipmentId.status === 'in_production') {
                  totalActiveAssignedEquipment++;
                }
              }
            }
          }
        }
      }
    }

    // Calculate Global Availability (Active on Lines / Total on Lines)
    let availability = 0;
    if (totalAssignedEquipment > 0) {
      availability = Math.round((totalActiveAssignedEquipment / totalAssignedEquipment) * 100 * 100) / 100;
    }

    // Calculate Global Performance
    let performance = 0;
    if (totalTargetOutput > 0) {
      performance = totalActualOutput / totalTargetOutput;
    }

    // Calculate Global Quality
    let quality = 0;
    if (totalActualOutput > 0) {
      quality = (totalActualOutput - totalDefectCount) / totalActualOutput;
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
        totalEquipment: totalPlantEquipment, // Keep total plant count for inventory view
        totalAssignedEquipment, // Add this for clarity if needed by frontend
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
        description: `Equipment updated: ${e.name || e.code || 'Unknown'} (${e.code || e._id})`,
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
