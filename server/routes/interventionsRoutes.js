const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Intervention } = require('../models/Intervention');
const { Equipment } = require('../models/Equipment');
const EquipmentMetricsService = require('../services/equipmentMetricsService');
const InterventionService = require('../services/interventionService');

const router = express.Router();

// GET /api/interventions (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, type, priority, q, sort = 'createdDate', order = 'desc' } = req.query || {};
  const factoryId = req.headers['x-factory-id'];
  const query = {};

  if (factoryId) {
    query.factory = factoryId;
  }

  if (status) {
    if (status === 'active') {
      query.status = { $in: ['Pending', 'In Progress'] };
    } else {
      query.status = status;
    }
  }
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (q) query.$or = [
    { title: { $regex: q, $options: 'i' } },
    { equipment: { $regex: q, $options: 'i' } },
    { assignedTo: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Intervention.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'equipmentId',
        select: 'location status category type',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' }
        ]
      })
      .lean(),
    Intervention.countDocuments(query)
  ]);
  return res.status(200).json({ interventions: items, page: Number(page), total });
});

// GET /api/interventions/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const intervention = await Intervention.findById(id)
    .populate({
      path: 'equipmentId',
      select: 'location status category type',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'type', select: 'name' }
      ]
    })
    .lean();
  if (!intervention) return res.status(404).json({ message: 'Intervention not found' });
  return res.status(200).json({ intervention });
});

// POST /api/interventions
const { z } = require('zod');
const interventionSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['Corrective', 'Preventive', 'Emergency']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']).optional(),
  equipment: z.string().min(1).optional(),
  equipmentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid equipmentId').optional(),
  assignedTo: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
}).refine((data) => !!(data.equipment || data.equipmentId), {
  message: 'Either equipment or equipmentId is required',
  path: ['equipment']
});

router.post('/', requireUser, async (req, res) => {
  if (!req.headers['x-factory-id']) {
    return res.status(400).json({ message: 'Factory context required (x-factory-id header missing)' });
  }
  const parse = interventionSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const data = {
    ...parse.data,
    factory: req.headers['x-factory-id']
  };
  try {
    // If equipmentId provided, validate and backfill equipment string
    if (data.equipmentId) {
      const eq = await Equipment.findById(data.equipmentId).lean();
      if (!eq) return res.status(400).json({ message: 'Invalid equipmentId: equipment not found' });
      if (!data.equipment) {
        data.equipment = eq.location || `Equipment ${eq._id}`;
      }
    }

    const created = await Intervention.create(data);
    const populated = await Intervention.findById(created._id)
      .populate({
        path: 'equipmentId',
        select: 'location status category type',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' }
        ]
      })
      .lean();

    // Trigger metric recalculation if intervention affects metrics
    if (created.equipmentId && created.status === 'Completed') {
      // Update lastMaintenance
      const completionDate = created.completedDate || created.dueDate || new Date();
      Equipment.findByIdAndUpdate(created.equipmentId, {
        lastMaintenance: completionDate
      }).catch(err => console.error(`Error updating lastMaintenance for ${created.equipmentId}:`, err));

      if (['Corrective', 'Emergency'].includes(created.type)) {
        // Don't await to avoid blocking response
        EquipmentMetricsService.calculateMetrics(created.equipmentId).catch(err =>
          console.error(`Error recalculating metrics for ${created.equipmentId}:`, err)
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Intervention created successfully',
      intervention: populated
    });
  } catch (error) {
    console.error('Create intervention error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create intervention' });
  }
});

// PATCH /api/interventions/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  try {
    // If equipmentId provided, validate and backfill equipment string
    if (updates.equipmentId) {
      const eq = await Equipment.findById(updates.equipmentId).lean();
      if (!eq) return res.status(400).json({ message: 'Invalid equipmentId: equipment not found' });
      if (!updates.equipment) {
        updates.equipment = eq.location || `Equipment ${eq._id}`;
      }
    }

    const updated = await Intervention.findByIdAndUpdate(id, updates, { new: true })
      .populate({
        path: 'equipmentId',
        select: 'location status category type',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' }
        ]
      })
      .lean();

    if (!updated) return res.status(404).json({ message: 'Intervention not found' });

    // Trigger metric recalculation if intervention affects metrics
    if (updated.equipmentId) {
      // If intervention is completed, update lastMaintenance on equipment
      if (updated.status === 'Completed') {
        const completionDate = updated.completedDate || updated.dueDate || new Date();
        await Equipment.findByIdAndUpdate(updated.equipmentId, {
          lastMaintenance: completionDate
        });
      }

      // Recalculate if status is Completed or was Completed, or if dates changed
      // Simplest approach: always recalculate for Corrective/Emergency
      if (['Corrective', 'Emergency'].includes(updated.type)) {
        EquipmentMetricsService.calculateMetrics(updated.equipmentId).catch(err =>
          console.error(`Error recalculating metrics for ${updated.equipmentId}:`, err)
        );
      }
    }

    return res.status(200).json({ success: true, intervention: updated });
  } catch (error) {
    console.error('Update intervention error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update intervention' });
  }
});

// DELETE /api/interventions/:id
router.delete('/:id', requireUser, require('../routes/middleware/auth').requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'foreman']), async (req, res) => {
  const { id } = req.params;
  const deleted = await Intervention.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Intervention not found' });

  // Trigger metric recalculation
  if (deleted.equipmentId && ['Corrective', 'Emergency'].includes(deleted.type)) {
    EquipmentMetricsService.calculateMetrics(deleted.equipmentId).catch(err =>
      console.error(`Error recalculating metrics for ${deleted.equipmentId}:`, err)
    );
  }

  return res.status(200).json({ success: true });
});

// POST /api/interventions/:id/start
router.post('/:id/start', requireUser, require('../routes/middleware/auth').requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'foreman', 'mechanic', 'electrician']), async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId, electricianId, maintenanceWorkerId } = req.body;

    const intervention = await InterventionService.startIntervention(id, req.user._id, {
      mechanicId,
      electricianId,
      maintenanceWorkerId
    });

    return res.status(200).json({ success: true, intervention });
  } catch (error) {
    console.error('Start intervention error:', error);
    return res.status(400).json({ message: error.message || 'Failed to start intervention' });
  }
});

// POST /api/interventions/:id/complete
router.post('/:id/complete', requireUser, require('../routes/middleware/auth').requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'foreman', 'mechanic', 'electrician']), async (req, res) => {
  try {
    const { id } = req.params;
    const { outcomeStatus, machinistId, notes, cost, actualDuration } = req.body;

    const intervention = await InterventionService.completeIntervention(id, req.user._id, {
      outcomeStatus,
      machinistId,
      notes,
      cost,
      actualDuration
    });

    return res.status(200).json({ success: true, intervention });
  } catch (error) {
    console.error('Complete intervention error:', error);
    return res.status(400).json({ message: error.message || 'Failed to complete intervention' });
  }
});

module.exports = router;


