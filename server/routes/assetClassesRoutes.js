const express = require('express');
const { z } = require('zod');
const { requireUser, requireRole } = require('./middleware/auth');
const { AssetClass, ASSET_CLASS_CODES } = require('../models/AssetClass');

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.enum(ASSET_CLASS_CODES),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

router.get('/', requireUser, async (req, res) => {
  const items = await AssetClass.find().lean();
  res.status(200).json({ assetClasses: items });
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = createSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid payload' });
  const exists = await AssetClass.findOne({ code: parse.data.code });
  if (exists) return res.status(409).json({ message: 'AssetClass with this code already exists' });
  const created = await AssetClass.create(parse.data);
  res.status(201).json({ success: true, assetClass: created });
});

router.patch('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const updates = req.body || {};
  if (updates.code && !ASSET_CLASS_CODES.includes(updates.code)) {
    return res.status(400).json({ message: 'Invalid code' });
  }
  const updated = await AssetClass.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true, assetClass: updated });
});

router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const del = await AssetClass.findByIdAndDelete(req.params.id).lean();
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true });
});

module.exports = router;
