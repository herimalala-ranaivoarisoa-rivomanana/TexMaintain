const express = require('express');
const { requireUser } = require('./middleware/auth');
const { Intervention } = require('../models/Intervention');

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
    Intervention.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).lean(),
    Intervention.countDocuments(query)
  ]);
  return res.status(200).json({ interventions: items, page: Number(page), total });
});

// GET /api/interventions/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const intervention = await Intervention.findById(id).lean();
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
  equipment: z.string().min(1),
  assignedTo: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

router.post('/', requireUser, async (req, res) => {
  const parse = interventionSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Intervention.create(parse.data);
  return res.status(200).json({
    success: true,
    message: 'Intervention created successfully',
    intervention: created
  });
});

// PATCH /api/interventions/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Intervention.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Intervention not found' });
  return res.status(200).json({ success: true, intervention: updated });
});

// DELETE /api/interventions/:id
router.delete('/:id', requireUser, require('../routes/middleware/auth').requireRole(['admin','maintenance_manager']), async (req, res) => {
  const { id } = req.params;
  const deleted = await Intervention.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Intervention not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;


