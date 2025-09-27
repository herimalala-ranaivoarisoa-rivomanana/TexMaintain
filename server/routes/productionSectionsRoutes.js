const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { ProductionSection } = require('../models/ProductionSection');
const { ProductionLine } = require('../models/ProductionLine');

const router = express.Router();

// GET /api/production-sections (with filters)
router.get('/', async (req, res) => {
  const { productionLine, q, sort = 'order', order = 'asc' } = req.query || {};
  const query = {};
  if (productionLine) query.productionLine = productionLine;
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { description: { $regex: q, $options: 'i' } }
  ];
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const sections = await ProductionSection.find(query).sort(sortSpec).populate('productionLine').populate({
    path: 'equipment.equipmentId',
    model: 'Equipment',
    populate: ['category', 'type']
  }).lean();
  return res.status(200).json({ sections });
});

// GET /api/production-sections/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const section = await ProductionSection.findById(id).populate('productionLine').populate({
    path: 'equipment.equipmentId',
    model: 'Equipment',
    populate: ['category', 'type']
  }).lean();
  if (!section) return res.status(404).json({ message: 'Production section not found' });
  return res.status(200).json({ section });
});

// POST /api/production-sections
const { z } = require('zod');
const productionSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productionLine: z.string().min(1),
  order: z.number().optional(),
});

router.post('/', requireUser, async (req, res) => {
  const parse = productionSectionSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

  const created = await ProductionSection.create(parse.data);

  // Add section to production line
  await ProductionLine.findByIdAndUpdate(parse.data.productionLine, {
    $push: { sections: { sectionId: created._id, order: parse.data.order || 0 } }
  });

  const populated = await ProductionSection.findById(created._id).populate('productionLine');
  return res.status(201).json({ success: true, section: populated });
});

// PATCH /api/production-sections/:id
router.patch('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const updated = await ProductionSection.findByIdAndUpdate(id, updates, { new: true }).populate('productionLine').populate({
    path: 'equipment.equipmentId',
    model: 'Equipment',
    populate: ['category', 'type']
  }).lean();
  if (!updated) return res.status(404).json({ message: 'Production section not found' });
  return res.status(200).json({ success: true, section: updated });
});

// PATCH /api/production-sections/:id/equipment (update equipment order)
router.patch('/:id/equipment', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const { id } = req.params;
  const { equipment } = req.body || {};

  if (!Array.isArray(equipment)) {
    return res.status(400).json({ message: 'Equipment must be an array' });
  }

  try {
    // 1. Récupérer l'ancienne configuration de la section
    const oldSection = await ProductionSection.findById(id);
    if (!oldSection) return res.status(404).json({ message: 'Production section not found' });

    const oldEquipmentIds = oldSection.equipment.map(e => e.equipmentId.toString());
    const newEquipmentIds = equipment.map(e => e.equipmentId.toString());

    // 2. Mettre à jour la section avec les nouveaux équipements
    const updated = await ProductionSection.findByIdAndUpdate(id, { equipment }, { new: true }).populate({
      path: 'equipment.equipmentId',
      model: 'Equipment',
      populate: ['category', 'type']
    }).lean();

    // 3. Équipements retirés de la section → productionSection = null (statut → offline)
    const removedIds = oldEquipmentIds.filter(equipId => !newEquipmentIds.includes(equipId));
    if (removedIds.length > 0) {
      const { Equipment } = require('../models/Equipment');
      // Utiliser save() individuellement pour déclencher le middleware
      for (const equipId of removedIds) {
        const equipment = await Equipment.findById(equipId);
        if (equipment) {
          equipment.productionSection = null;
          await equipment.save(); // Déclenche le middleware pre('save')
        }
      }
      console.log(`Equipment removed from section ${id}:`, removedIds);
    }

    // 4. Équipements ajoutés à la section → productionSection = sectionId (statut → online)
    const addedIds = newEquipmentIds.filter(equipId => !oldEquipmentIds.includes(equipId));
    if (addedIds.length > 0) {
      const { Equipment } = require('../models/Equipment');
      // Utiliser save() individuellement pour déclencher le middleware
      for (const equipId of addedIds) {
        const equipment = await Equipment.findById(equipId);
        if (equipment) {
          equipment.productionSection = id;
          await equipment.save(); // Déclenche le middleware pre('save')
        }
      }
      console.log(`Equipment added to section ${id}:`, addedIds);
    }

    return res.status(200).json({ success: true, section: updated });
  } catch (error) {
    console.error('Error updating section equipment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/production-sections/:id
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  // Remove section from production line
  const section = await ProductionSection.findById(id);
  if (section) {
    await ProductionLine.findByIdAndUpdate(section.productionLine, {
      $pull: { sections: { sectionId: id } }
    });
  }

  const deleted = await ProductionSection.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Production section not found' });
  return res.status(200).json({ success: true });
});

module.exports = router;