const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { ProductionLine } = require('../models/ProductionLine');
const { ProductionSection } = require('../models/ProductionSection');

const router = express.Router();

const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');

// Helper to compute MTTR and MTBF from interventions (reused logic)
const computeReliability = async (equipmentIds) => {
  const query = {
    type: { $in: ['Corrective', 'Emergency'] },
    status: 'Completed'
  };

  if (equipmentIds && equipmentIds.length > 0) {
    query.equipment = { $in: equipmentIds };
  }

  const interventions = await Intervention.find(query).sort({ createdDate: 1 }).lean();

  if (!interventions.length) {
    return { mttr: 0, mtbf: 0 };
  }

  // Calculate MTBF
  let mtbf = 0;
  if (interventions.length > 1) {
    const intervals = [];
    for (let i = 1; i < interventions.length; i++) {
      const interval = (interventions[i].createdDate - interventions[i - 1].createdDate) / (1000 * 60 * 60);
      intervals.push(interval);
    }
    mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  // Calculate MTTR
  const durations = interventions
    .filter(i => i.dueDate && i.createdDate)
    .map(i => (i.dueDate - i.createdDate) / (1000 * 60 * 60));

  const mttr = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  return {
    mttr: Math.round(mttr * 100) / 100,
    mtbf: Math.round(mtbf * 100) / 100
  };
};

const { EquipmentPart } = require('../models/EquipmentPart');

// GET /api/production-lines/:id/dashboard
router.get('/:id/dashboard', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Production Line and all its equipment
    const productionLine = await ProductionLine.findById(id).populate({
      path: 'sections.sectionId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment'
      }
    }).lean();

    if (!productionLine) return res.status(404).json({ message: 'Production line not found' });

    // Extract all equipment IDs
    const equipmentList = [];
    productionLine.sections.forEach(section => {
      if (section.sectionId && section.sectionId.equipment) {
        section.sectionId.equipment.forEach(item => {
          if (item.equipmentId) {
            equipmentList.push(item.equipmentId);
          }
        });
      }
    });

    const equipmentIds = equipmentList.map(e => e._id);
    const totalEquipment = equipmentIds.length;

    // 2. Calculate KPIs

    // Availability (Equipment in Production / Total)
    let availability = 0;
    if (totalEquipment > 0) {
      const inProductionCount = equipmentList.filter(e => e.status === 'In Production').length;
      availability = Math.round((inProductionCount / totalEquipment) * 100 * 100) / 100;
    }

    // OEE (Estimate)
    const oee = Math.round(availability * 0.95 * 100) / 100;

    // Reliability (MTTR/MTBF) specific to this line
    const { mttr, mtbf } = await computeReliability(equipmentIds);

    // Active Interventions
    const activeInterventionsList = await Intervention.find({
      equipment: { $in: equipmentIds },
      status: { $in: ['Pending', 'In Progress'] }
    }).populate('equipment', 'name code').sort({ priority: 1, createdDate: -1 }).lean();

    const activeInterventions = activeInterventionsList.length;

    // Critical Parts & Reorder Alerts
    // Find parts used by this equipment
    const equipmentParts = await EquipmentPart.find({ equipment: { $in: equipmentIds } }).distinct('part');

    // Get all reorder alerts globally
    const allReorderAlerts = await EquipmentPart.findPartsNeedingReorder();

    // Filter alerts for parts used on this line
    const lineReorderAlerts = allReorderAlerts.filter(alert =>
      equipmentParts.some(partId => partId.toString() === alert.part._id.toString())
    );

    const criticalParts = lineReorderAlerts.length;

    // Pending Orders (Parts used on this line that have pending orders)
    // We can check the parts found in equipmentParts
    const partsWithOrders = await Part.find({
      _id: { $in: equipmentParts },
      'pendingOrders.status': { $in: ['pending', 'ordered', 'in_transit'] }
    });

    const pendingOrders = partsWithOrders.reduce((total, part) => {
      return total + part.pendingOrders.filter(o => ['pending', 'ordered', 'in_transit'].includes(o.status)).length;
    }, 0);

    // 3. Recent Activities (Interventions, Parts, Equipment)
    const recentInterventions = await Intervention.find({ equipment: { $in: equipmentIds } })
      .sort({ createdDate: -1 }).limit(5).lean();

    const recentParts = await Part.find({ _id: { $in: equipmentParts } })
      .sort({ updatedAt: -1 }).limit(3).lean();

    const recentEquipment = await Equipment.find({ _id: { $in: equipmentIds } })
      .sort({ updatedAt: -1 }).limit(2).lean();

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
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    return res.status(200).json({
      kpis: {
        totalEquipment,
        activeInterventions,
        criticalParts,
        pendingOrders,
        mttr,
        mtbf,
        availability,
        oee
      },
      details: {
        activeInterventions: activeInterventionsList,
        criticalParts: lineReorderAlerts.map(a => a.part), // For backward compatibility if needed
        equipment: equipmentList
      },
      reorderAlerts: lineReorderAlerts,
      activities
    });

  } catch (error) {
    console.error('Error in GET /api/production-lines/:id/dashboard:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/production-lines (with pagination & filters)
router.get('/', async (req, res) => {
  console.log('GET /api/production-lines called');
  try {
    const { page = 1, limit = 50, status, q, sort = 'createdAt', order = 'desc' } = req.query || {};
    console.log('Query params:', { page, limit, status, q, sort, order });

    const query = {};
    if (status) query.status = status;
    if (q) query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];

    console.log('MongoDB query:', query);

    const skip = (Number(page) - 1) * Number(limit);
    const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      ProductionLine.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).populate({
        path: 'sections.sectionId',
        model: 'ProductionSection',
        populate: {
          path: 'equipment.equipmentId',
          model: 'Equipment',
          populate: ['category', 'type']
        }
      }).lean(),
      ProductionLine.countDocuments(query)
    ]);

    console.log(`Found ${items.length} production lines, total: ${total}`);
    return res.status(200).json({ productionLines: items, page: Number(page), total });
  } catch (error) {
    console.error('Error in GET /api/production-lines:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/production-lines/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const productionLine = await ProductionLine.findById(id).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection',
    populate: {
      path: 'equipment.equipmentId',
      model: 'Equipment',
      populate: ['category', 'type']
    }
  }).lean();
  if (!productionLine) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ productionLine });
});

// POST /api/production-lines
const { z } = require('zod');
const productionLineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

router.post('/', requireUser, async (req, res) => {
  const parse = productionLineSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await ProductionLine.create(parse.data);
  return res.status(201).json({ success: true, productionLine: created });
});

// PATCH /api/production-lines/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProductionLine.findByIdAndUpdate(id, updates, { new: true }).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection'
  }).lean();
  if (!updated) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// PATCH /api/production-lines/:id/sections (update section order)
router.patch('/:id/sections', requireUser, async (req, res) => {
  const { id } = req.params;
  const { sections } = req.body || {};

  if (!Array.isArray(sections)) {
    return res.status(400).json({ message: 'Sections must be an array' });
  }

  const updated = await ProductionLine.findByIdAndUpdate(id, { sections }, { new: true }).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection'
  }).lean();

  if (!updated) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// DELETE /api/production-lines/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  // Delete associated sections first
  await ProductionSection.deleteMany({ productionLine: id });

  const deleted = await ProductionLine.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;