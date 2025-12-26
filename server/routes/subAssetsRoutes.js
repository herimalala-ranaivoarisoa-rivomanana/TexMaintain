const express = require('express');
const { z } = require('zod');
const { requireUser, requireRole } = require('./middleware/auth');
const { SubAsset } = require('../models/SubAsset');

const router = express.Router();

const createSchema = z.object({
  equipment: z.string().min(1),
  name: z.string().min(1),
  code: z.string().optional(),
  type: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  criticality: z.enum(['low','medium','high','critical']).optional(),
  notes: z.string().optional()
});

router.get('/', requireUser, async (req, res) => {
  const { equipment } = req.query;
  const query = {};
  if (equipment) query.equipment = equipment;
  const items = await SubAsset.find(query).lean();
  res.status(200).json({ subAssets: items });
});

router.post('/', requireUser, requireRole(['admin','maintenance_manager']), async (req, res) => {
  const parse = createSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid payload' });
  const created = await SubAsset.create(parse.data);
  res.status(201).json({ success: true, subAsset: created });
});

router.patch('/:id', requireUser, requireRole(['admin','maintenance_manager']), async (req, res) => {
  const updates = req.body || {};
  const updated = await SubAsset.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true, subAsset: updated });
});

router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const del = await SubAsset.findByIdAndDelete(req.params.id).lean();
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true });
});

module.exports = router;
