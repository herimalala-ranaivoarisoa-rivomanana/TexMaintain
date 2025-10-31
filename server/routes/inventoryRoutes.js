const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Part } = require('../models/Part');
const { EquipmentPart } = require('../models/EquipmentPart');

const router = express.Router();

// GET /api/inventory (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, category, q, sort = 'updatedAt', order = 'desc', type } = req.query || {};
  const and = [];
  if (category) and.push({ category });
  let tFilter = null;
  if (typeof type === 'string') {
    const t = String(type).toLowerCase();
    if (t === 'part' || t === 'consumable') tFilter = t;
  }
  if (tFilter) and.push({ type: tFilter });
  if (q) and.push({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { partNumber: { $regex: q, $options: 'i' } },
      { supplier: { $regex: q, $options: 'i' } }
    ]
  });
  const query = and.length ? { $and: and } : {};
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1, _id: 1 };
  const lmt = Math.max(1, Number(limit));
  const requestedPage = Math.max(1, Number(page));
  
  // Count filtered total first to clamp page
  const total = await Part.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / lmt));
  const safePage = Math.min(requestedPage, totalPages);
  const skip = (safePage - 1) * lmt;

  // Get paginated results and GLOBAL statistics based on ALL parts
  const [parts, globalStats, allCount] = await Promise.all([
    Part.find(query).sort(sortSpec).skip(skip).limit(lmt).lean(),
    Part.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Part.countDocuments({})
  ]);
  
  // Format global statistics (ALL parts in inventory)
  const statistics = {
    total: allCount,
    parts: 0,
    consumables: 0
  };
  
  globalStats.forEach(stat => {
    if (stat._id === 'part') statistics.parts = stat.count;
    if (stat._id === 'consumable') statistics.consumables = stat.count;
  });
  
  statistics.total = statistics.parts + statistics.consumables;

  // Compute FILTERED aggregates (independent of pagination)
  const filteredAgg = await Part.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        filteredTotal: { $sum: 1 },
        filteredCritical: {
          $sum: {
            $cond: [ { $lte: [ { $ifNull: ['$currentStock', 0] }, { $ifNull: ['$minStock', 0] } ] }, 1, 0 ]
          }
        },
        filteredTotalValue: { $sum: { $multiply: [ { $ifNull: ['$currentStock', 0] }, { $ifNull: ['$unitPrice', 0] } ] } }
      }
    },
    {
      $project: {
        _id: 0,
        filteredTotal: 1,
        filteredCritical: 1,
        filteredTotalValue: 1,
        filteredAverageValue: {
          $cond: [ { $gt: ['$filteredTotal', 0] }, { $divide: ['$filteredTotalValue', '$filteredTotal'] }, 0 ]
        }
      }
    }
  ]);

  const filtered = filteredAgg[0] || { filteredTotal: 0, filteredCritical: 0, filteredTotalValue: 0, filteredAverageValue: 0 };
  
  return res.status(200).json({
    parts,
    page: safePage,
    total, // total matching current filters (for pagination)
    statistics, // global tab counts (distinct equipment-attached)
    filteredTotal: filtered.filteredTotal,
    filteredCritical: filtered.filteredCritical,
    filteredTotalValue: filtered.filteredTotalValue,
    filteredAverageValue: filtered.filteredAverageValue,
  });
});

// GET /api/inventory/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const part = await Part.findById(id).lean();
  if (!part) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ part });
});

// PUT /api/inventory/:id/stock
router.put('/:id/stock', requireUser, requireRole(['admin','maintenance_manager','procurement_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const { quantity, type } = req.body || {};
  const part = await Part.findById(id);
  if (!part) return res.status(404).json({ message: 'Part not found' });
  const delta = type === 'in' ? Math.abs(quantity || 0) : -Math.abs(quantity || 0);
  part.currentStock = Math.max(0, (part.currentStock || 0) + delta);
  await part.save();
  return res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    newStock: part.currentStock
  });
});
 
// POST /api/inventory
const { z } = require('zod');
const partSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(['part', 'consumable']).optional(),
  currentStock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
});

router.post('/', requireUser, requireRole('admin'), async (req, res) => {
  const parse = partSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Part.create(parse.data);
  return res.status(201).json({ success: true, part: created });
});

// PATCH /api/inventory/:id
router.patch('/:id', requireUser, requireRole(['admin','procurement_manager']), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await Part.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ success: true, part: updated });
});

// DELETE /api/inventory/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Part.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Part not found' });
  return res.status(200).json({ success: true });
});


module.exports = router;
