const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');

const router = express.Router();

// GET /api/equipment (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, type, q, sort = 'createdAt', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { location: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Equipment.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).lean(),
    Equipment.countDocuments(query)
  ]);
  return res.status(200).json({ equipment: items, page: Number(page), total });
});

// GET /api/equipment/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const equipment = await Equipment.findById(id).lean();
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ equipment });
});
 
// POST /api/equipment
const { z } = require('zod');
const equipmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['spinning','weaving','dyeing','finishing','cutting','sewing','packaging','quality_control','maintenance']),
  status: z.enum(['operational','maintenance','breakdown','offline']),
  location: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installationDate: z.coerce.date().optional(),
  lastMaintenance: z.coerce.date().optional(),
  nextMaintenance: z.coerce.date().optional(),
});

router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  const parse = equipmentSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Equipment.create(parse.data);
  return res.status(201).json({ success: true, equipment: created });
});

// PATCH /api/equipment/:id
router.patch('/:id', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const updates = (req.body || {});
  const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true, equipment: updated });
});

// DELETE /api/equipment/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Equipment.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;
