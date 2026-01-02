const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');
const { EquipmentType } = require('../models/EquipmentType');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/equipment-types/stats
 * Returns aggregated statistics for equipment types scoped to the active factory.
 */
router.get('/stats', requireUser, async (req, res) => {
  try {
    const factoryId = req.activeFactoryId;
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory context required' });
    }

    // Aggregate stats from Equipment collection
    const stats = await Equipment.aggregate([
      { $match: { factory: new mongoose.Types.ObjectId(factoryId) } },
      {
        $group: {
          _id: "$type",
          totalEquipment: { $sum: 1 },
          online: {
            $sum: {
              $cond: [
                { $in: ["$status", ["in_production", "setup_adjustment", "changeover", "paused_by_operator"]] },
                1,
                0
              ]
            }
          },
          maintenance: {
            $sum: {
              $cond: [
                { $in: ["$status", ["scheduled_maintenance", "under_repair", "in_workshop", "waiting_spare_parts", "testing_after_repair", "under_inspection", "pending_validation"]] },
                1,
                0
              ]
            }
          },
          breakdown: {
            $sum: {
              $cond: [{ $eq: ["$status", "breakdown"] }, 1, 0]
            }
          },
          offline: {
            $sum: {
              $cond: [{ $in: ["$status", ["offline", "stored"]] }, 1, 0]
            }
          },
          scrapped: {
            $sum: {
              $cond: [{ $eq: ["$status", "scrapped"] }, 1, 0]
            }
          },
          avgMtbf: { $avg: "$mtbf" },
          avgMttr: { $avg: "$mttr" }
        }
      },
      // Lookup Type details
      {
        $lookup: {
          from: "equipmenttypes",
          localField: "_id",
          foreignField: "_id",
          as: "typeDetails"
        }
      },
      { $unwind: "$typeDetails" },
      // Lookup Category details
      {
        $lookup: {
          from: "equipmentcategories",
          localField: "typeDetails.category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          typeId: "$_id",
          typeName: "$typeDetails.name",
          categoryName: "$categoryDetails.name",
          totalEquipment: 1,
          byStatus: {
            online: "$online",
            maintenance: "$maintenance",
            breakdown: "$breakdown",
            offline: "$offline",
            scrapped: "$scrapped"
          },
          avgMtbf: { $ifNull: ["$avgMtbf", 0] },
          avgMttr: { $ifNull: ["$avgMttr", 0] },
          // Availability Calculation: (Online + Maintenance) / Total * 100
          availability: {
            $multiply: [
              { $divide: [{ $add: ["$online", "$maintenance"] }, "$totalEquipment"] },
              100
            ]
          }
        }
      }
    ]);

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('Error calculating equipment type stats:', error);
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/equipment-types (Existing)
router.get('/', requireUser, async (req, res) => {
  const { category } = req.query;
  const query = category ? { category } : {};
  const types = await EquipmentType.find(query).populate('category', 'name').sort({ name: 1 }).lean();
  return res.status(200).json({ types });
});

// POST /api/equipment-types
const { z } = require('zod');
const typeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = typeSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await EquipmentType.create(parse.data);
  const populated = await EquipmentType.findById(created._id).populate('category', 'name');
  return res.status(201).json({ success: true, type: populated });
});

// PATCH /api/equipment-types/:id
router.patch('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await EquipmentType.findByIdAndUpdate(id, updates, { new: true }).populate('category', 'name').lean();
  if (!updated) return res.status(404).json({ message: 'Type not found' });
  return res.status(200).json({ success: true, type: updated });
});

// DELETE /api/equipment-types/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await EquipmentType.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Type not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;