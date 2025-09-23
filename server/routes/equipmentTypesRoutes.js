const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { EquipmentType } = require('../models/EquipmentType');

const router = express.Router();

// GET /api/equipment-types (with optional category filter)
router.get('/', requireUser, async (req, res) => {
  const { category } = req.query;
  const query = category ? { category } : {};
  const types = await EquipmentType.find(query).populate('category', 'name').sort({ name: 1 }).lean();
  return res.status(200).json({ types });
});

// POST /api/equipment-types
const { z } = require('zod');
const typeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1), // ObjectId as string
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = typeSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await EquipmentType.create(parse.data);
  const populated = await EquipmentType.findById(created._id).populate('category', 'name');
  return res.status(201).json({ success: true, type: populated });
});

// PATCH /api/equipment-types/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await EquipmentType.findByIdAndUpdate(id, updates, { new: true }).populate('category', 'name').lean();
  if (!updated) return res.status(404).json({ message: 'Type not found' });
  return res.status(200).json({ success: true, type: updated });
});

// DELETE /api/equipment-types/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await EquipmentType.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Type not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;