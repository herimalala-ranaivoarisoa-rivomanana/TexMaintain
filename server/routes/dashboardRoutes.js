const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');

const router = express.Router();

// Helper to compute MTTR and MTBF from interventions (simplified)
const computeReliability = async () => {
  const interventions = await Intervention.find().lean();
  if (!interventions.length) {
    return { mttr: 0, mtbf: 0 };
  }
  const completed = interventions.filter(i => i.status === 'Completed');
  const mttr = completed.length ? 4.0 : 0; // placeholder average until duration tracking exists
  const mtbf = 680; // placeholder due to missing failure timestamps
  return { mttr, mtbf };
};

// GET /api/dashboard/kpis
router.get('/kpis', requireUser, async (req, res) => {
  const totalEquipment = await Equipment.countDocuments();
  const activeInterventions = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
  const criticalParts = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });
  const { mttr, mtbf } = await computeReliability();
  const availability = totalEquipment ? 92.0 : 0; // placeholder
  const oee = 85.0; // placeholder; would require performance and quality factors

  return res.status(200).json({
    kpis: {
      mttr,
      mtbf,
      oee,
      availability,
      totalEquipment,
      activeInterventions,
      criticalParts,
      pendingOrders: 0
    }
  });
});

// GET /api/dashboard/activities (last 10 changes based on creation dates)
router.get('/activities', requireUser, async (req, res) => {
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
});

module.exports = router;



