const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { SubCategory } = require('../models/SubCategory');
const { Asset, ASSET_STATUSES } = require('../models/Asset');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/sub-categories
router.get('/', requireUser, async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const subCategories = await SubCategory.find(query)
      .populate('category', 'name')
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({ subCategories });
  } catch (error) {
    console.error('Error fetching sub-categories:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sub-categories/statistics
router.get('/statistics', requireUser, async (req, res) => {
  try {
    const factoryId = req.activeFactoryId;

    // 1. Get all sub-categories first (reference list)
    // Populate category for display
    const subCategories = await SubCategory.find()
      .populate('category', 'name')
      .sort({ name: 1 })
      .lean();

    // 2. Aggregate statistics from Asset collection, filtered by factory
    const matchStage = {};
    if (factoryId) {
      matchStage.factory = new mongoose.Types.ObjectId(factoryId);
    }

    const stats = await Asset.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$subCategory', // Group by SubCategory ID
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

    // 3. Merge Stats into SubCategories
    const subCategoriesWithStats = subCategories.map(subCat => {
      const subCatStats = stats.find(s => s._id && s._id.toString() === subCat._id.toString());

      const rawStatusCounts = subCatStats ? subCatStats.statusCounts : [];
      const statusBreakdown = {
        in_production: 0,
        offline: 0,
        maintenance: 0,
        breakdown: 0,
        other: 0
      };

      rawStatusCounts.forEach(status => {
        // Same logic as categories
        if (status === 'in_production') statusBreakdown.in_production++;
        else if (status === 'offline' || status === 'stored') statusBreakdown.offline++;
        else if (status === 'breakdown') statusBreakdown.breakdown++;
        else if (['scheduled_maintenance', 'under_repair', 'in_workshop', 'waiting_spare_parts', 'testing_after_repair', 'under_inspection'].includes(status)) statusBreakdown.maintenance++;
        else statusBreakdown.other++;
      });

      return {
        ...subCat,
        statistics: {
          totalAssets: subCatStats ? subCatStats.totalAssets : 0,
          avgMtbf: subCatStats ? Math.round(subCatStats.avgMtbf || 0) : 0,
          avgMttr: subCatStats ? Math.round(subCatStats.avgMttr || 0) : 0,
          avgAvailability: subCatStats ? Math.round((subCatStats.avgAvailability || 0) * 100) / 100 : 0,
          statusBreakdown
        }
      };
    });

    return res.status(200).json({ subCategories: subCategoriesWithStats });

  } catch (error) {
    console.error('Error fetching sub-category statistics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sub-categories
const { z } = require('zod');
const subCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = subCategorySchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const { name, description, categoryId } = parse.data;

  const created = await SubCategory.create({
    name,
    description,
    category: categoryId
  });

  return res.status(201).json({ success: true, subCategory: created });
});

// PATCH /api/sub-categories/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await SubCategory.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Sub-Category not found' });
  return res.status(200).json({ success: true, subCategory: updated });
});

// DELETE /api/sub-categories/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await SubCategory.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Sub-Category not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;