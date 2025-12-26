const express = require('express');
const { z } = require('zod');
const { requireUser, requireRole } = require('./middleware/auth');
const { BusinessUnit } = require('../models/BusinessUnit');

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

router.get('/', requireUser, async (req, res) => {
  const items = await BusinessUnit.find().lean();
  res.status(200).json({ businessUnits: items });
});

router.post('/', requireUser, requireRole(['admin']), async (req, res) => {
  const parse = createSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid payload' });
  const exists = await BusinessUnit.findOne({ code: parse.data.code });
  if (exists) return res.status(409).json({ message: 'BusinessUnit with this code already exists' });
  const created = await BusinessUnit.create(parse.data);
  res.status(201).json({ success: true, businessUnit: created });
});

router.patch('/:id', requireUser, requireRole(['admin']), async (req, res) => {
  const updated = await BusinessUnit.findByIdAndUpdate(req.params.id, req.body || {}, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true, businessUnit: updated });
});

router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const del = await BusinessUnit.findByIdAndDelete(req.params.id).lean();
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true });
});

module.exports = router;
