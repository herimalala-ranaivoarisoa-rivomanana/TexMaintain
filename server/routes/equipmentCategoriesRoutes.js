const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { EquipmentCategory } = require('../models/EquipmentCategory');

const router = express.Router();

// GET /api/equipment-categories
router.get('/', requireUser, async (req, res) => {
  const categories = await EquipmentCategory.find().sort({ name: 1 }).lean();
  return res.status(200).json({ categories });
});

// POST /api/equipment-categories
const { z } = require('zod');
const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  const parse = categorySchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await EquipmentCategory.create(parse.data);
  return res.status(201).json({ success: true, category: created });
});

// PATCH /api/equipment-categories/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await EquipmentCategory.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Category not found' });
  return res.status(200).json({ success: true, category: updated });
});

// DELETE /api/equipment-categories/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await EquipmentCategory.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Category not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;