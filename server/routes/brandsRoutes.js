const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Brand } = require('../models/Brand');

const router = express.Router();

// GET /api/brands
router.get('/', requireUser, async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).lean();
  return res.status(200).json({ brands });
});

// GET /api/brands/statistics
router.get('/statistics', requireUser, async (req, res) => {
  try {
    const { Equipment } = require('../models/Equipment');

    // 1. Fetch all brands
    const brands = await Brand.find().sort({ name: 1 }).lean();

    // 2. Aggregate Equipment by Brand (FILTERED by Factory)
    const matchStage = {};
    if (req.activeFactoryId) {
      matchStage.factory = new mongoose.Types.ObjectId(req.activeFactoryId);
    }

    const stats = await Equipment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$brand', // Grouping by brand ID
          totalEquipment: { $sum: 1 },
          avgMtbf: { $avg: '$mtbf' },
          avgMttr: { $avg: '$mttr' },
          avgAvailability: { $avg: '$availability' },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    // 3. Merge Stats into Brands
    const brandsWithStats = brands.map(brand => {
      const brandStats = stats.find(s => s._id && s._id.toString() === brand._id.toString());

      const rawStatusCounts = brandStats ? brandStats.statusCounts : [];
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
        ...brand,
        statistics: {
          totalEquipment: brandStats ? brandStats.totalEquipment : 0,
          avgMtbf: brandStats ? Math.round(brandStats.avgMtbf || 0) : 0,
          avgMttr: brandStats ? Math.round(brandStats.avgMttr || 0) : 0,
          avgAvailability: brandStats ? Math.round((brandStats.avgAvailability || 0) * 100) / 100 : 0,
          statusBreakdown
        }
      };
    });

    return res.status(200).json({ brands: brandsWithStats });

  } catch (error) {
    console.error('Error fetching brand statistics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/brands
const { z } = require('zod');
const brandSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = brandSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Brand.create(parse.data);
  return res.status(201).json({ success: true, brand: created });
});

// PATCH /api/brands/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Brand.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Brand not found' });
  return res.status(200).json({ success: true, brand: updated });
});

// DELETE /api/brands/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Brand.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Brand not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;