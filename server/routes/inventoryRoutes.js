const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Part } = require('../models/Part');

const router = express.Router();

// GET /api/inventory (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, category, q, sort = 'updatedAt', order = 'desc' } = req.query || {};
  const query = {};
  if (category) query.category = category;
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { partNumber: { $regex: q, $options: 'i' } },
    { supplier: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [parts, total] = await Promise.all([
    Part.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).lean(),
    Part.countDocuments(query)
  ]);
  return res.status(200).json({ parts, page: Number(page), total });
});

// GET /api/inventory/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const part = await Part.findById(id).lean();
  if (!part) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ part });
});

// PUT /api/inventory/:id/stock
router.put('/:id/stock', requireUser, requireRole(['admin','maintenance_manager','procurement_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const { quantity, type } = req.body || {};
  const part = await Part.findById(id);
  if (!part) return res.status(404).json({ message: 'Part not found' });
  const delta = type === 'in' ? Math.abs(quantity || 0) : -Math.abs(quantity || 0);
  part.currentStock = Math.max(0, (part.currentStock || 0) + delta);
  await part.save();
  return res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    newStock: part.currentStock
  });
});
 
// POST /api/inventory
const { z } = require('zod');
const partSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().min(1),
  category: z.string().min(1),
  currentStock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
});

router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  const parse = partSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Part.create(parse.data);
  return res.status(201).json({ success: true, part: created });
});

// PATCH /api/inventory/:id
router.patch('/:id', requireUser, requireRole(['admin','procurement_manager']), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Part.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ success: true, part: updated });
});

// DELETE /api/inventory/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Part.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ success: true });
});


module.exports = router;
