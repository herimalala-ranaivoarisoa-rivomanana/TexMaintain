const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
const { EquipmentStatusHistory } = require('../models/EquipmentStatusHistory');

const router = express.Router();

// Helper to compute MTTR and MTBF from interventions
const computeReliability = async () => {
  const interventions = await Intervention.find({
    type: { $in: ['Corrective', 'Emergency'] },
    status: 'Completed'
  }).sort({ createdDate: 1 }).lean();

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
    const totalEquipment = await Equipment.countDocuments();
    const activeInterventions = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
    const criticalParts = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });
    const { mttr, mtbf } = await computeReliability();

    // Calculate real availability from equipment in production
    let availability = 0;
    if (totalEquipment > 0) {
      const inProductionCount = await Equipment.countDocuments({
        status: EQUIPMENT_STATUSES.IN_PRODUCTION
      });
      availability = Math.round((inProductionCount / totalEquipment) * 100 * 100) / 100;
    }

    // OEE calculation would require performance and quality data
    // For now, estimate based on availability and assuming 95% performance/quality
    const oee = Math.round(availability * 0.95 * 100) / 100;

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
        totalEquipment,
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
        description: `Equipment updated: ${e.name} (${e.type})`,
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



