const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Brand } = require('../models/Brand');

const router = express.Router();

// GET /api/brands
router.get('/', requireUser, async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).lean();
  return res.status(200).json({ brands });
});

// POST /api/brands
const { z } = require('zod');
const brandSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = brandSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Brand.create(parse.data);
  return res.status(201).json({ success: true, brand: created });
});

// PATCH /api/brands/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Brand.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Brand not found' });
  return res.status(200).json({ success: true, brand: updated });
});

// DELETE /api/brands/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Brand.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Brand not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;