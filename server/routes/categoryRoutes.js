const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Category } = require('../models/Category');

const router = express.Router();

// GET /api/categories
router.get('/', requireUser, async (req, res) => {
  const categories = await Category.find()
    .populate('assetClass', 'name')
    .sort({ name: 1 })
    .lean();
  return res.status(200).json({ categories });
});

// GET /api/categories/statistics
router.get('/statistics', requireUser, async (req, res) => {
  try {
    const { Asset } = require('../models/Asset');

    // 1. Fetch all categories (GLOBAL, but we will merge stats)
    const categories = await Category.find()
      .populate('assetClass', 'name')
      .sort({ name: 1 })
      .lean();

    // 2. Aggregate Assets by Category (FILTERED by Factory)
    const matchStage = {};
    if (req.activeFactoryId) {
      matchStage.factory = new mongoose.Types.ObjectId(req.activeFactoryId);
    }
    // Also filter by Asset Class if provided in query
    if (req.query.assetClassId) {
      matchStage.assetClass = new mongoose.Types.ObjectId(req.query.assetClassId);
    }

    const stats = await Asset.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalAssets: { $sum: 1 },
          avgMtbf: { $avg: '$mtbf' },
          avgMttr: { $avg: '$mttr' },
          avgAvailability: { $avg: '$availability' },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    // 3. Merge Stats into Categories
    const categoriesWithStats = categories.map(cat => {
      const catStats = stats.find(s => s._id && s._id.toString() === cat._id.toString());

      const rawStatusCounts = catStats ? catStats.statusCounts : [];
      const statusBreakdown = {
        in_production: 0,
        offline: 0,
        maintenance: 0,
        breakdown: 0,
        other: 0
      };

      rawStatusCounts.forEach(status => {
        if (status === 'in_production') statusBreakdown.in_production++;
        else if (status === 'offline' || status === 'stored') statusBreakdown.offline++;
        else if (status === 'breakdown') statusBreakdown.breakdown++;
        else if (['scheduled_maintenance', 'under_repair', 'in_workshop', 'waiting_spare_parts', 'testing_after_repair', 'under_inspection'].includes(status)) statusBreakdown.maintenance++;
        else statusBreakdown.other++;
      });

      return {
        ...cat,
        statistics: {
          totalAssets: catStats ? catStats.totalAssets : 0,
          avgMtbf: catStats ? Math.round(catStats.avgMtbf || 0) : 0,
          avgMttr: catStats ? Math.round(catStats.avgMttr || 0) : 0,
          avgAvailability: catStats ? Math.round((catStats.avgAvailability || 0) * 100) / 100 : 0,
          statusBreakdown
        }
      };
    });

    return res.status(200).json({ categories: categoriesWithStats });

  } catch (error) {
    console.error('Error fetching category statistics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/categories
const { z } = require('zod');
const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  assetClass: z.string().min(1), // Required now
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = categorySchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Category.create(parse.data);
  return res.status(201).json({ success: true, category: created });
});

// PATCH /api/categories/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Category.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Category not found' });
  return res.status(200).json({ success: true, category: updated });
});

// DELETE /api/categories/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Category.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Category not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;