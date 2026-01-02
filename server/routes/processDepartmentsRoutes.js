const express = require('express');
const { requireUser } = require('./middleware/auth');
const { z } = require('zod');
const { ProcessDepartment } = require('../models/ProcessDepartment');
const { ProcessArea } = require('../models/ProcessArea');
const { Equipment } = require('../models/Equipment');

const router = express.Router();

const departmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  processArea: z.string().min(1), // ObjectId
  order: z.number().optional()
});

// GET /api/process-departments
router.get('/', requireUser, async (req, res) => {
  const departments = await ProcessDepartment.find()
    .populate('processArea', 'name')
    .sort({ processArea: 1, order: 1 })
    .lean();
  return res.status(200).json({ processDepartments: departments });
});

// POST /api/process-departments
router.post('/', requireUser, async (req, res) => {
  const parse = departmentSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const created = await ProcessDepartment.create(parse.data);

  // Add to Process Area
  await ProcessArea.findByIdAndUpdate(parse.data.processArea, {
    $push: { departments: { departmentId: created._id, order: parse.data.order || 0 } }
  });

  return res.status(201).json({ success: true, processDepartment: created });
});

// PATCH /api/process-departments/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProcessDepartment.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Process department not found' });
  return res.status(200).json({ success: true, processDepartment: updated });
});

// DELETE /api/process-departments/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const department = await ProcessDepartment.findById(id);
  if (!department) return res.status(404).json({ message: 'Process department not found' });

  // Remove from Process Area
  await ProcessArea.findByIdAndUpdate(department.processArea, {
    $pull: { departments: { departmentId: id } }
  });

  await ProcessDepartment.deleteOne({ _id: id });
  return res.status(200).json({ success: true });
});

// PATCH /api/process-departments/:id/equipment (Reorder equipment within department)
router.patch('/:id/equipment', requireUser, async (req, res) => {
  const { id } = req.params;
  const { equipment } = req.body; // Array of { equipmentId, order }

  if (!Array.isArray(equipment)) {
    return res.status(400).json({ message: 'Equipment must be an array' });
  }

  const updated = await ProcessDepartment.findByIdAndUpdate(id, { equipment }, { new: true })
    .populate('equipment.equipmentId') // Optional populate
    .lean();

  if (!updated) return res.status(404).json({ message: 'Process department not found' });
  return res.status(200).json({ success: true, processDepartment: updated });
});

module.exports = router;