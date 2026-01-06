const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { EquipmentType } = require('../models/EquipmentType');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/equipment-types/statistics
router.get('/statistics', requireUser, async (req, res) => {
  try {
    const factoryId = req.activeFactoryId;

    // 1. Get all equipment types first (reference list)
    // Populate category for display
    const types = await EquipmentType.find().populate('category', 'name').sort({ name: 1 }).lean();

    // 2. Aggregate statistics from Equipment collection, filtered by factory
    const stats = await Equipment.aggregate([
      {
        $match: {
          factory: new mongoose.Types.ObjectId(factoryId)
        }
      },
      {
        $group: {
          _id: "$type", // Group by EquipmentType ID
          totalEquipment: { $sum: 1 },
          avgMtbf: { $avg: "$mtbf" },
          avgMttr: { $avg: "$mttr" },
          // Store raw sums for status to calculate availability if needed, or use pre-calculated availability from document
          // If availability is stored in document and updated correctly:
          avgAvailability: { $avg: "$availability" },

          // Status Counts
          onlineCount: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", [
                    EQUIPMENT_STATUSES.IN_PRODUCTION,
                    EQUIPMENT_STATUSES.SETUP_ADJUSTMENT,
                    EQUIPMENT_STATUSES.CHANGEOVER,
                    EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR
                  ]]
                },
                1,
                0
              ]
            }
          },
          maintenanceCount: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", [
                    EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE,
                    EQUIPMENT_STATUSES.UNDER_REPAIR,
                    EQUIPMENT_STATUSES.IN_WORKSHOP,
                    EQUIPMENT_STATUSES.WAITING_SPARE_PARTS,
                    EQUIPMENT_STATUSES.TESTING_AFTER_REPAIR,
                    EQUIPMENT_STATUSES.UNDER_INSPECTION,
                    EQUIPMENT_STATUSES.PENDING_VALIDATION
                  ]]
                },
                1,
                0
              ]
            }
          },
          breakdownCount: {
            $sum: {
              $cond: [{ $eq: ["$status", EQUIPMENT_STATUSES.BREAKDOWN] }, 1, 0]
            }
          },
          offlineCount: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", [
                    EQUIPMENT_STATUSES.OFFLINE,
                    EQUIPMENT_STATUSES.STORED
                  ]]
                },
                1,
                0
              ]
            }
          },
          scrappedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", EQUIPMENT_STATUSES.SCRAPPED] }, 1, 0]
            }
          }
        }
      }
    ]);

    // 3. Map stats to types
    const statsMap = new Map(stats.map(s => [String(s._id), s]));

    const result = types.map(type => {
      const typeStats = statsMap.get(String(type._id)) || {
        totalEquipment: 0,
        avgMtbf: 0,
        avgMttr: 0,
        avgAvailability: 0,
        onlineCount: 0,
        maintenanceCount: 0,
        breakdownCount: 0,
        offlineCount: 0,
        scrappedCount: 0
      };

      // Recalculate availability if DB value is 0 or suspect (fallback logic similar to frontend)
      // Frontend formula: (online + maintenance) / total * 100
      let availability = typeStats.avgAvailability;
      if (typeStats.totalEquipment > 0 && Math.abs(availability) < 0.01) {
        const operational = typeStats.onlineCount + typeStats.maintenanceCount;
        availability = (operational / typeStats.totalEquipment) * 100;
      }

      return {
        typeId: type._id,
        typeName: type.name,
        categoryName: type.category?.name || 'Uncategorized',
        totalEquipment: typeStats.totalEquipment,
        byStatus: {
          online: typeStats.onlineCount,
          maintenance: typeStats.maintenanceCount,
          breakdown: typeStats.breakdownCount,
          offline: typeStats.offlineCount,
          scrapped: typeStats.scrappedCount
        },
        avgMtbf: Math.round(typeStats.avgMtbf * 100) / 100,
        avgMttr: Math.round(typeStats.avgMttr * 100) / 100,
        availability: Math.round(availability * 100) / 100
      };
    });

    return res.status(200).json({ stats: result });

  } catch (error) {
    console.error('Get equipment type statistics error:', error);
    return res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/equipment-types (with optional category filter)
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
  category: z.string().min(1), // ObjectId as string
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