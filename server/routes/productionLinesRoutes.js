const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');
const { ProductionLine } = require('../models/ProductionLine');
const { ProductionSection } = require('../models/ProductionSection');

const router = express.Router();

const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
const { EquipmentPart } = require('../models/EquipmentPart');

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

const productionLineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  stats: z.object({
    targetOutput: z.number().optional(),
    actualOutput: z.number().optional(),
    defectCount: z.number().optional(),
    shiftDuration: z.number().optional(),
    plannedDowntime: z.number().optional()
  }).optional()
});

// GET /api/process-area
router.get('/', requireUser, async (req, res) => {
  const productionLines = await ProductionLine.find().populate({
    path: 'sections.sectionId',
    populate: {
      path: 'equipment.equipmentId',
      model: 'Equipment',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'brand', select: 'name' }
      ]
    }
  }).sort({ name: 1 }).lean();
  return res.status(200).json({ productionLines });
});

// GET /api/process-area/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  try {
    const productionLine = await ProductionLine.findById(id).populate({
      path: 'sections.sectionId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      }
    }).lean();

    if (!productionLine) {
      return res.status(404).json({ message: 'Process area not found' });
    }

    return res.status(200).json({ productionLine });
  } catch (error) {
    console.error('Error fetching production line:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/process-area/:id/dashboard
router.get('/:id/dashboard', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Process Area and all its equipment
    const productionLine = await ProductionLine.findById(id).populate({
      path: 'sections.sectionId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment'
      }
    }).lean();

    if (!productionLine) return res.status(404).json({ message: 'Process area not found' });

    // Extract all equipment IDs
    const equipmentList = [];
    if (productionLine.sections) {
      productionLine.sections.forEach(section => {
        if (section.sectionId && section.sectionId.equipment) {
          section.sectionId.equipment.forEach(item => {
            if (item.equipmentId) {
              equipmentList.push(item.equipmentId);
            }
          });
        }
      });
    }

    const equipmentIds = equipmentList.map(e => e._id);
    const totalEquipment = equipmentIds.length;

    // 2. Calculate KPIs

    // Availability (Time-based: (Scheduled Time - Downtime) / Scheduled Time)
    let availability = 0;

    // 1. Calculate Scheduled Time (in minutes)
    // Default shift is 8 hours (480 mins) if not specified
    const shiftDuration = productionLine.stats?.shiftDuration || 480;
    const plannedDowntime = productionLine.stats?.plannedDowntime || 0;
    const scheduledTimePerEquipment = Math.max(0, shiftDuration - plannedDowntime);
    const totalScheduledTime = totalEquipment * scheduledTimePerEquipment;

    // 2. Calculate Unplanned Downtime (Today)
    let totalUnplannedDowntime = 0;

    if (totalScheduledTime > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      // Find interventions created today that caused downtime (Corrective/Emergency)
      const downtimeInterventions = await Intervention.find({
        equipment: { $in: equipmentIds },
        type: { $in: ['Corrective', 'Emergency'] },
        createdDate: { $gte: startOfDay }
      }).lean();

      downtimeInterventions.forEach(intervention => {
        let downtime = 0;

        if (intervention.status === 'Completed' && intervention.completedDate) {
          // Completed: use actual duration or difference between completed and created
          if (intervention.actualDuration) {
            downtime = intervention.actualDuration * 60; // Convert hours to minutes
          } else {
            downtime = (intervention.completedDate - intervention.createdDate) / (1000 * 60); // minutes
          }
        } else {
          // Active: downtime is from creation until now
          downtime = (now - intervention.createdDate) / (1000 * 60); // minutes
        }

        totalUnplannedDowntime += downtime;
      });

      // 3. Calculate Availability Ratio
      // Ensure downtime doesn't exceed scheduled time (can happen if overtime or bad data)
      const actualUptime = Math.max(0, totalScheduledTime - totalUnplannedDowntime);
      availability = Math.round((actualUptime / totalScheduledTime) * 100 * 100) / 100;
    }

    // Performance = Actual Output / Target Output
    let performance = 0;
    if (productionLine.stats && productionLine.stats.targetOutput > 0) {
      performance = Math.min(productionLine.stats.actualOutput / productionLine.stats.targetOutput, 1);
    }

    // Quality = (Actual Output - Defects) / Actual Output
    let quality = 0;
    if (productionLine.stats && productionLine.stats.actualOutput > 0) {
      const goodUnits = productionLine.stats.actualOutput - productionLine.stats.defectCount;
      quality = Math.max(0, Math.min(1, goodUnits / productionLine.stats.actualOutput));
    }

    // OEE = Availability * Performance * Quality
    // Ensure factors are <= 1 for calculation
    const availabilityFactor = availability / 100;
    const oee = Math.round(availabilityFactor * performance * quality * 100 * 100) / 100;

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
        description: `Equipment updated: ${e.name || e.code}`,
        timestamp: e.updatedAt,
        priority: 'low'
      }))
    ];

    // Sort combined activities by timestamp desc
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      productionLine,
      kpis: {
        availability,
        performance,
        quality,
        oee,
        mttr,
        mtbf
      },
      activeInterventions,
      criticalParts,
      pendingOrders,
      recentActivities: activities.slice(0, 10)
    });

  } catch (error) {
    console.error('Error fetching production line dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireUser, async (req, res) => {
  const parse = productionLineSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await ProductionLine.create(parse.data);
  return res.status(201).json({ success: true, productionLine: created });
});

// PATCH /api/process-area/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProductionLine.findByIdAndUpdate(id, updates, { new: true }).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection'
  }).lean();
  if (!updated) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// PATCH /api/process-area/:id/sections (update section order)
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

  if (!updated) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// DELETE /api/process-area/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  // Delete associated sections first
  await ProductionSection.deleteMany({ productionLine: id });

  const deleted = await ProductionLine.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;