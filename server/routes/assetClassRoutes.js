const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { AssetClass } = require('../models/AssetClass');
const { z } = require('zod');

const router = express.Router();

const assetClassSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});

// GET /api/asset-classes
router.get('/', requireUser, async (req, res) => {
    const assetClasses = await AssetClass.find().sort({ name: 1 }).lean();
    return res.status(200).json({ assetClasses });
});

// POST /api/asset-classes
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
    const parse = assetClassSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
    const created = await AssetClass.create(parse.data);
    return res.status(201).json({ success: true, assetClass: created });
});

// PATCH /api/asset-classes/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const updated = await AssetClass.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Asset Class not found' });
    return res.status(200).json({ success: true, assetClass: updated });
});

// DELETE /api/asset-classes/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const deleted = await AssetClass.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Asset Class not found' });
    return res.status(200).json({ success: true });
});

module.exports = router;
