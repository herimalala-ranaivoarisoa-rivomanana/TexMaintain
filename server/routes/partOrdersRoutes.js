const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { PartOrder, ORDER_STATUS } = require('../models/PartOrder');
const { Part } = require('../models/Part');

const router = express.Router();

// GET /api/part-orders (with pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, equipment, part, q, sort = 'createdAt', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
  if (equipment) query.equipment = equipment;
  if (part) query.part = part;
  if (q) query.$or = [
    { supplier: { $regex: q, $options: 'i' } },
    { notes: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [orders, total] = await Promise.all([
    PartOrder.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(Number(limit))
      .populate('part', 'name partNumber')
      .populate('equipment', 'model')
      .populate('orderedBy', 'email')
      .lean(),
    PartOrder.countDocuments(query)
  ]);
  return res.status(200).json({ orders, page: Number(page), total });
});

// GET /api/part-orders/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const order = await PartOrder.findById(id)
    .populate('part')
    .populate('equipment')
    .populate('orderedBy', 'email')
    .lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.status(200).json({ order });
});

// POST /api/part-orders
const { z } = require('zod');
const partOrderSchema = z.object({
  part: z.string().min(1),
  quantity: z.number().int().min(1),
  supplier: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
  expectedDelivery: z.coerce.date().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'procurement_manager', 'maintenance_manager']), async (req, res) => {
  const parse = partOrderSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  
  const orderData = {
    ...parse.data,
    orderedBy: req.user._id,
    status: 'pending'
  };
  
  const created = await PartOrder.create(orderData);
  const populated = await PartOrder.findById(created._id)
    .populate('part', 'name partNumber')
    .populate('equipment', 'model')
    .populate('orderedBy', 'email');
    
  return res.status(201).json({ success: true, order: populated });
});

// PATCH /api/part-orders/:id
router.patch('/:id', requireUser, requireRole(['admin', 'procurement_manager']), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  
  // Si le statut change vers 'received', mettre la date de réception
  if (updates.status === 'received' && !updates.actualDelivery) {
    updates.actualDelivery = new Date();
  }
  
  const updated = await PartOrder.findByIdAndUpdate(id, updates, { new: true })
    .populate('part', 'name partNumber')
    .populate('equipment', 'model')
    .populate('orderedBy', 'email')
    .lean();
    
  if (!updated) return res.status(404).json({ message: 'Order not found' });
  return res.status(200).json({ success: true, order: updated });
});

// DELETE /api/part-orders/:id
router.delete('/:id', requireUser, requireRole(['admin', 'procurement_manager']), async (req, res) => {
  const { id } = req.params;
  const deleted = await PartOrder.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Order not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;