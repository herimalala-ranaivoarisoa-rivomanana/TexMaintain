const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Intervention } = require('../models/Intervention');
const { Equipment } = require('../models/Equipment');
const EquipmentStatusService = require('../services/equipmentStatusService');

const router = express.Router();

// GET /api/interventions (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, type, priority, q, sort = 'createdDate', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
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
        select: 'location status category type model serialNumber chipNumber brand',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'brand', select: 'name' }
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
      select: 'location status category type model serialNumber chipNumber brand',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'brand', select: 'name' }
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
  const parse = interventionSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const data = { ...parse.data };
  try {
    // If equipmentId provided, validate and backfill equipment string
    if (data.equipmentId) {
      const eq = await Equipment.findById(data.equipmentId).lean();
      if (!eq) return res.status(400).json({ message: 'Invalid equipmentId: equipment not found' });
      if (!data.equipment) {
        data.equipment = eq.location || `Equipment ${eq._id}`;
      }
      
      // Check if there's already an active intervention for this equipment
      const activeIntervention = await Intervention.findOne({
        $or: [
          { equipmentId: data.equipmentId },
          { equipment: eq.location }
        ],
        status: { $in: ['Pending', 'In Progress'] }
      }).lean();
      
      if (activeIntervention) {
        return res.status(400).json({ 
          message: `Une intervention est déjà en cours pour cet équipement (${activeIntervention.title})` 
        });
      }
    }

    const created = await Intervention.create(data);
    const populated = await Intervention.findById(created._id)
      .populate({
        path: 'equipmentId',
        select: 'location status category type model serialNumber chipNumber brand',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'type', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      })
      .lean();

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
  const { equipmentStatus, equipmentStatusReason, equipmentStatusNotes, mechanicId, electricianId, maintenanceWorkerId, machinistId, ...updates } = req.body || {};
  
  try {
    // Get current intervention to check equipment
    const currentIntervention = await Intervention.findById(id).lean();
    if (!currentIntervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }
    
    // If equipmentId provided, validate and backfill equipment string
    if (updates.equipmentId) {
      const eq = await Equipment.findById(updates.equipmentId).lean();
      if (!eq) return res.status(400).json({ message: 'Invalid equipmentId: equipment not found' });
      if (!updates.equipment) {
        updates.equipment = eq.location || `Equipment ${eq._id}`;
      }
    }

    // If status is being changed to In Progress, set startedDate
    if (updates.status === 'In Progress') {
      updates.startedDate = new Date();
      
      // Auto-change equipment status from breakdown to under_repair when starting intervention
      if (currentIntervention.equipmentId && !equipmentStatus) {
        const equipment = await Equipment.findById(currentIntervention.equipmentId).lean();
        if (equipment && equipment.status === 'breakdown') {
          try {
            await EquipmentStatusService.changeStatus(
              currentIntervention.equipmentId,
              'under_repair',
              req.user._id,
              {
                reason: `Intervention started: ${currentIntervention.title}`,
                notes: 'Equipment moved from breakdown to under repair automatically',
                interventionId: id
              }
            );
          } catch (statusError) {
            console.error('Failed to auto-change equipment status:', statusError.message);
            // Don't fail the intervention update if status change fails
          }
        }
      }
    }
    
    // If status is being changed to Completed or Cancelled, set completedDate
    if (updates.status === 'Completed' || updates.status === 'Cancelled') {
      updates.completedDate = new Date();
    }

    // If equipment status change is requested, apply it (this overrides auto-change)
    if (equipmentStatus && currentIntervention.equipmentId) {
      try {
        const statusOptions = {
          reason: equipmentStatusReason || `Intervention status changed to ${updates.status || currentIntervention.status}`,
          notes: equipmentStatusNotes,
          interventionId: id
        };
        
        // Add personnel IDs if provided
        if (mechanicId) statusOptions.mechanicId = mechanicId;
        if (electricianId) statusOptions.electricianId = electricianId;
        if (maintenanceWorkerId) statusOptions.maintenanceWorkerId = maintenanceWorkerId;
        if (machinistId) statusOptions.machinistId = machinistId;
        
        await EquipmentStatusService.changeStatus(
          currentIntervention.equipmentId,
          equipmentStatus,
          req.user._id,
          statusOptions
        );
      } catch (statusError) {
        return res.status(400).json({ message: `Failed to change equipment status: ${statusError.message}` });
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
    return res.status(200).json({ success: true, intervention: updated });
  } catch (error) {
    console.error('Update intervention error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update intervention' });
  }
});

// DELETE /api/interventions/:id
router.delete('/:id', requireUser, require('../routes/middleware/auth').requireRole(['admin','maintenance_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const deleted = await Intervention.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Intervention not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;


