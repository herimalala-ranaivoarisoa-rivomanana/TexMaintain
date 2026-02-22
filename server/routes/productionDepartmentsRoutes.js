const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');
const { ProductionDepartment } = require('../models/ProductionDepartment');
const { ProductionLine } = require('../models/ProductionLine');
const mongoose = require('mongoose');

const router = express.Router();

const productionDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productionLine: z.string().min(1),
});

// GET /api/production-departments
router.get('/', requireUser, async (req, res) => {
  try {
    const departments = await ProductionDepartment.find()
      .populate('productionLine', 'name')
      .populate('asset.assetId', 'name')
      .sort({ productionLine: 1, name: 1 })
      .lean();
    return res.status(200).json({ departments });
  } catch (error) {
    console.error('Get production departments error:', error);
    return res.status(500).json({ message: 'Failed to fetch production departments' });
  }
});

// GET /api/production-departments/:id
router.get('/:id', requireUser, async (req, res) => {
  try {
    const department = await ProductionDepartment.findById(req.params.id)
      .populate('productionLine', 'name')
      .populate('asset.assetId', 'name')
      .lean();
    if (!department) return res.status(404).json({ message: 'Production department not found' });
    return res.status(200).json({ department });
  } catch (error) {
    console.error('Get production department error:', error);
    return res.status(500).json({ message: 'Failed to fetch production department' });
  }
});

// POST /api/production-departments (admin only)
router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const parse = productionDepartmentSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    // Validate productionLine exists
    const lineExists = await ProductionLine.findById(parse.data.productionLine);
    if (!lineExists) return res.status(400).json({ message: 'Production line not found' });

    const created = await ProductionDepartment.create(parse.data);
    return res.status(201).json({ success: true, department: created });
  } catch (error) {
    console.error('Create production department error:', error);
    return res.status(500).json({ message: 'Failed to create production department' });
  }
});

// PATCH /api/production-departments/:id (admin only)
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    if (updates.productionLine) {
      const lineExists = await ProductionLine.findById(updates.productionLine);
      if (!lineExists) return res.status(400).json({ message: 'Production line not found' });
    }
    const updated = await ProductionDepartment.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Production department not found' });
    return res.status(200).json({ success: true, department: updated });
  } catch (error) {
    console.error('Update production department error:', error);
    return res.status(500).json({ message: 'Failed to update production department' });
  }
});

// DELETE /api/production-departments/:id (admin only)
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProductionDepartment.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Production department not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete production department error:', error);
    return res.status(500).json({ message: 'Failed to delete production department' });
  }
});

// PATCH /api/production-departments/:id/asset (Reorder assets within department)
router.patch('/:id/asset', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { asset } = req.body; // Array of { assetId, order }

    if (!Array.isArray(asset)) {
      return res.status(400).json({ message: 'Asset must be an array' });
    }

    const updated = await ProductionDepartment.findByIdAndUpdate(id, { asset }, { new: true })
      .populate('asset.assetId', 'name')
      .lean();

    if (!updated) return res.status(404).json({ message: 'Production department not found' });
    return res.status(200).json({ success: true, department: updated });
  } catch (error) {
    console.error('Update production department asset order error:', error);
    return res.status(500).json({ message: 'Failed to update asset order' });
  }
});

module.exports = router;
