const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');
const { ProductionSection } = require('../models/ProductionSection');
const { ProductionLine } = require('../models/ProductionLine');
const mongoose = require('mongoose');

const router = express.Router();

const productionSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productionLine: z.string().min(1),
});

// GET /api/production-sections
router.get('/', requireUser, async (req, res) => {
  try {
    const sections = await ProductionSection.find()
      .populate('productionLine', 'name')
      .populate('asset.assetId', 'name')
      .sort({ productionLine: 1, name: 1 })
      .lean();
    return res.status(200).json({ sections });
  } catch (error) {
    console.error('Get production sections error:', error);
    return res.status(500).json({ message: 'Failed to fetch production sections' });
  }
});

// GET /api/production-sections/:id
router.get('/:id', requireUser, async (req, res) => {
  try {
    const section = await ProductionSection.findById(req.params.id)
      .populate('productionLine', 'name')
      .populate('asset.assetId', 'name')
      .lean();
    if (!section) return res.status(404).json({ message: 'Production section not found' });
    return res.status(200).json({ section });
  } catch (error) {
    console.error('Get production section error:', error);
    return res.status(500).json({ message: 'Failed to fetch production section' });
  }
});

// POST /api/production-sections (admin only)
router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const parse = productionSectionSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    // Validate productionLine exists
    const lineExists = await ProductionLine.findById(parse.data.productionLine);
    if (!lineExists) return res.status(400).json({ message: 'Production line not found' });

    const created = await ProductionSection.create(parse.data);
    return res.status(201).json({ success: true, section: created });
  } catch (error) {
    console.error('Create production section error:', error);
    return res.status(500).json({ message: 'Failed to create production section' });
  }
});

// PATCH /api/production-sections/:id (admin only)
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    if (updates.productionLine) {
      const lineExists = await ProductionLine.findById(updates.productionLine);
      if (!lineExists) return res.status(400).json({ message: 'Production line not found' });
    }
    const updated = await ProductionSection.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Production section not found' });
    return res.status(200).json({ success: true, section: updated });
  } catch (error) {
    console.error('Update production section error:', error);
    return res.status(500).json({ message: 'Failed to update production section' });
  }
});

// DELETE /api/production-sections/:id (admin only)
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProductionSection.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Production section not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete production section error:', error);
    return res.status(500).json({ message: 'Failed to delete production section' });
  }
});

// PATCH /api/production-sections/:id/asset (Reorder assets within section)
router.patch('/:id/asset', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { asset } = req.body; // Array of { assetId, order }

    if (!Array.isArray(asset)) {
      return res.status(400).json({ message: 'Asset must be an array' });
    }

    const updated = await ProductionSection.findByIdAndUpdate(id, { asset }, { new: true })
      .populate('asset.assetId', 'name')
      .lean();

    if (!updated) return res.status(404).json({ message: 'Production section not found' });
    return res.status(200).json({ success: true, section: updated });
  } catch (error) {
    console.error('Update production section asset order error:', error);
    return res.status(500).json({ message: 'Failed to update asset order' });
  }
});

module.exports = router;
