const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { ProductionLine } = require('../models/ProductionLine');
const { ProductionSection } = require('../models/ProductionSection');

const router = express.Router();

// GET /api/production-lines (with pagination & filters)
router.get('/', async (req, res) => {
  console.log('GET /api/production-lines called');
  try {
    const { page = 1, limit = 50, status, q, sort = 'createdAt', order = 'desc' } = req.query || {};
    console.log('Query params:', { page, limit, status, q, sort, order });

    const query = {};
    if (status) query.status = status;
    if (q) query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];

    console.log('MongoDB query:', query);

    const skip = (Number(page) - 1) * Number(limit);
    const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      ProductionLine.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).populate({
        path: 'sections.sectionId',
        model: 'ProductionSection',
        populate: {
          path: 'equipment.equipmentId',
          model: 'Equipment',
          populate: ['category', 'type']
        }
      }).lean(),
      ProductionLine.countDocuments(query)
    ]);

    console.log(`Found ${items.length} production lines, total: ${total}`);
    return res.status(200).json({ productionLines: items, page: Number(page), total });
  } catch (error) {
    console.error('Error in GET /api/production-lines:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/production-lines/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const productionLine = await ProductionLine.findById(id).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection',
    populate: {
      path: 'equipment.equipmentId',
      model: 'Equipment',
      populate: ['category', 'type']
    }
  }).lean();
  if (!productionLine) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ productionLine });
});

// POST /api/production-lines
const { z } = require('zod');
const productionLineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

router.post('/', requireUser, async (req, res) => {
  const parse = productionLineSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await ProductionLine.create(parse.data);
  return res.status(201).json({ success: true, productionLine: created });
});

// PATCH /api/production-lines/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProductionLine.findByIdAndUpdate(id, updates, { new: true }).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection'
  }).lean();
  if (!updated) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// PATCH /api/production-lines/:id/sections (update section order)
router.patch('/:id/sections', requireUser, async (req, res) => {
  const { id } = req.params;
  const { sections } = req.body || {};

  if (!Array.isArray(sections)) {
    return res.status(400).json({ message: 'Sections must be an array' });
  }

  const updated = await ProductionLine.findByIdAndUpdate(id, { sections }, { new: true }).populate({
    path: 'sections.sectionId',
    model: 'ProductionSection'
  }).lean();

  if (!updated) return res.status(404).json({ message: 'Production line not found' });
  return res.status(200).json({ success: true, productionLine: updated });
});

// DELETE /api/production-lines/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Trouver toutes les sections de cette ligne de production
    const sections = await ProductionSection.find({ productionLine: id }).lean();
    const sectionIds = sections.map(section => section._id.toString());
    
    // 2. Mettre à jour tous les équipements assignés à ces sections
    if (sectionIds.length > 0) {
      const { Equipment } = require('../models/Equipment');
      
      // Trouver tous les équipements assignés aux sections de cette ligne
      const equipmentToUpdate = await Equipment.find({ 
        productionSection: { $in: sectionIds } 
      });
      
      // Mettre à jour chaque équipement individuellement pour déclencher le middleware
      for (const equipment of equipmentToUpdate) {
        equipment.productionSection = null; // Cela déclenchera le passage à "offline"
        await equipment.save();
      }
      
      console.log(`Updated ${equipmentToUpdate.length} equipment to offline (production line ${id} deleted)`);
    }

    // 3. Supprimer les sections associées
    await ProductionSection.deleteMany({ productionLine: id });

    // 4. Supprimer la ligne de production
    const deleted = await ProductionLine.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Production line not found' });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting production line:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;