const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');
const { ProcessArea } = require('../models/ProcessArea');
const { ProcessDepartment } = require('../models/ProcessDepartment');

const router = express.Router();

const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
const { EquipmentPart } = require('../models/EquipmentPart');

// Helper to compute MTTR and MTBF from equipment IDs
const computeReliability = async (equipmentIds) => {
  if (!equipmentIds || equipmentIds.length === 0) {
    return { mttr: 0, mtbf: 0 };
  }

  const aggregation = await Equipment.aggregate([
    { $match: { _id: { $in: equipmentIds } } },
    {
      $group: {
        _id: null,
        avgMtbf: { $avg: '$mtbf' },
        avgMttr: { $avg: '$mttr' }
      }
    }
  ]);

  if (aggregation.length > 0) {
    return {
      mttr: Math.round((aggregation[0].avgMttr || 0) * 100) / 100,
      mtbf: Math.round((aggregation[0].avgMtbf || 0) * 100) / 100
    };
  }

  return { mttr: 0, mtbf: 0 };
};

const processAreaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  type: z.enum(['production', 'utility', 'facility', 'warehouse', 'office', 'other']).optional(),
  stats: z.object({
    targetOutput: z.number().optional(),
    actualOutput: z.number().optional(),
    defectCount: z.number().optional(),
    shiftDuration: z.number().optional(),
    plannedDowntime: z.number().optional()
  }).optional()
});

// GET /api/process-areas
router.get('/', requireUser, async (req, res) => {
  const processAreas = await ProcessArea.find().populate({
    path: 'departments.departmentId',
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
  return res.status(200).json({ processAreas });
});

// GET /api/process-areas/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  try {
    const processArea = await ProcessArea.findById(id).populate({
      path: 'departments.departmentId',
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

    if (!processArea) {
      return res.status(404).json({ message: 'Process area not found' });
    }

    return res.status(200).json({ processArea });
  } catch (error) {
    console.error('Error fetching process area:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/process-areas/:id/dashboard
router.get('/:id/dashboard', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Process Area and all its equipment
    const processArea = await ProcessArea.findById(id).populate({
      path: 'departments.departmentId',
      populate: {
        path: 'equipment.equipmentId',
        model: 'Equipment'
      }
    }).lean();

    if (!processArea) return res.status(404).json({ message: 'Process area not found' });

    // Extract all equipment IDs
    const equipmentList = [];
    if (processArea.departments) {
      processArea.departments.forEach(dept => {
        if (dept.departmentId && dept.departmentId.equipment) {
          dept.departmentId.equipment.forEach(item => {
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
    let availability = 0;
    const shiftDuration = processArea.stats?.shiftDuration || 480;
    const plannedDowntime = processArea.stats?.plannedDowntime || 0;
    const scheduledTimePerEquipment = Math.max(0, shiftDuration - plannedDowntime);
    const totalScheduledTime = totalEquipment * scheduledTimePerEquipment;

    let totalUnplannedDowntime = 0;
    if (totalScheduledTime > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      const downtimeInterventions = await Intervention.find({
        equipment: { $in: equipmentIds },
        type: { $in: ['Corrective', 'Emergency'] },
        createdDate: { $gte: startOfDay }
      }).lean();

      downtimeInterventions.forEach(intervention => {
        let downtime = 0;
        if (intervention.status === 'Completed' && intervention.completedDate) {
          if (intervention.actualDuration) {
            downtime = intervention.actualDuration * 60;
          } else {
            downtime = (intervention.completedDate - intervention.createdDate) / (1000 * 60);
          }
        } else {
          downtime = (now - intervention.createdDate) / (1000 * 60);
        }
        totalUnplannedDowntime += downtime;
      });

      const actualUptime = Math.max(0, totalScheduledTime - totalUnplannedDowntime);
      availability = Math.round((actualUptime / totalScheduledTime) * 100 * 100) / 100;
    }

    let performance = 0;
    if (processArea.stats && processArea.stats.targetOutput > 0) {
      performance = Math.min(processArea.stats.actualOutput / processArea.stats.targetOutput, 1);
    }

    let quality = 0;
    if (processArea.stats && processArea.stats.actualOutput > 0) {
      const goodUnits = processArea.stats.actualOutput - processArea.stats.defectCount;
      quality = Math.max(0, Math.min(1, goodUnits / processArea.stats.actualOutput));
    }

    const availabilityFactor = availability / 100;
    const oee = Math.round(availabilityFactor * performance * quality * 100 * 100) / 100;

    const { mttr, mtbf } = await computeReliability(equipmentIds);

    const activeInterventionsListRaw = await Intervention.find({
      equipmentId: { $in: equipmentIds },
      status: { $in: ['Pending', 'In Progress'] }
    }).populate('equipmentId', 'name code').sort({ priority: 1, createdDate: -1 }).lean();

    const activeInterventionsList = activeInterventionsListRaw.map(i => ({
      ...i,
      equipment: i.equipmentId
    }));

    const activeInterventions = activeInterventionsList.length;

    const equipmentParts = await EquipmentPart.find({ equipment: { $in: equipmentIds } }).distinct('part');
    const allReorderAlerts = await EquipmentPart.findPartsNeedingReorder();
    const lineReorderAlerts = allReorderAlerts.filter(alert =>
      equipmentParts.some(partId => partId.toString() === alert.part._id.toString())
    );
    const criticalParts = lineReorderAlerts.length;

    const partsWithOrders = await Part.find({
      _id: { $in: equipmentParts },
      'pendingOrders.status': { $in: ['pending', 'ordered', 'in_transit'] }
    });

    const pendingOrders = partsWithOrders.reduce((total, part) => {
      return total + part.pendingOrders.filter(o => ['pending', 'ordered', 'in_transit'].includes(o.status)).length;
    }, 0);

    const recentInterventions = await Intervention.find({ equipmentId: { $in: equipmentIds } })
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

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      processArea,
      kpis: {
        totalEquipment,
        activeInterventions,
        criticalParts,
        pendingOrders,
        availability,
        performance,
        quality,
        oee,
        mttr,
        mtbf
      },
      details: {
        activeInterventions: activeInterventionsList,
        criticalParts: lineReorderAlerts,
        equipment: equipmentList
      },
      reorderAlerts: lineReorderAlerts,
      recentActivities: activities.slice(0, 10)
    });

  } catch (error) {
    console.error('Error fetching process area dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireUser, async (req, res) => {
  const parse = processAreaSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await ProcessArea.create(parse.data);
  return res.status(201).json({ success: true, processArea: created });
});

// PATCH /api/process-areas/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProcessArea.findByIdAndUpdate(id, updates, { new: true }).populate({
    path: 'departments.departmentId',
    model: 'ProcessDepartment'
  }).lean();
  if (!updated) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true, processArea: updated });
});

// PATCH /api/process-areas/:id/departments (update department order)
router.patch('/:id/departments', requireUser, async (req, res) => {
  const { id } = req.params;
  const { departments } = req.body || {};

  if (!Array.isArray(departments)) {
    return res.status(400).json({ message: 'Departments must be an array' });
  }

  const updated = await ProcessArea.findByIdAndUpdate(id, { departments }, { new: true }).populate({
    path: 'departments.departmentId',
    model: 'ProcessDepartment'
  }).lean();

  if (!updated) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true, processArea: updated });
});

// DELETE /api/process-areas/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  // Delete associated departments first
  await ProcessDepartment.deleteMany({ processArea: id });

  const deleted = await ProcessArea.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Process area not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;