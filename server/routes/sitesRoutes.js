const express = require('express');
const { z } = require('zod');
const { requireUser, requireRole } = require('./middleware/auth');
const { Site } = require('../models/Site');
const { BusinessUnit } = require('../models/BusinessUnit');

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  businessUnit: z.string().optional(),
  isActive: z.boolean().optional()
});

router.get('/', requireUser, async (req, res) => {
  const items = await Site.find().populate('businessUnit', 'name code').lean();
  res.status(200).json({ sites: items });
});

router.post('/', requireUser, requireRole(['admin']), async (req, res) => {
  const parse = createSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid payload' });
  if (parse.data.businessUnit) {
    const bu = await BusinessUnit.findById(parse.data.businessUnit).lean();
    if (!bu) return res.status(400).json({ message: 'Invalid businessUnit' });
  }
  const exists = await Site.findOne({ code: parse.data.code });
  if (exists) return res.status(409).json({ message: 'Site with this code already exists' });
  const created = await Site.create(parse.data);
  res.status(201).json({ success: true, site: created });
});

router.patch('/:id', requireUser, requireRole(['admin']), async (req, res) => {
  const updates = req.body || {};
  if (updates.businessUnit) {
    const bu = await BusinessUnit.findById(updates.businessUnit).lean();
    if (!bu) return res.status(400).json({ message: 'Invalid businessUnit' });
  }
  const updated = await Site.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true, site: updated });
});

router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const del = await Site.findByIdAndDelete(req.params.id).lean();
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true });
});

module.exports = router;
