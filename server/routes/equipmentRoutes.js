const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Equipment } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { EquipmentPart } = require('../models/EquipmentPart');
const { PartOrder } = require('../models/PartOrder');

const router = express.Router();

// GET /api/equipment (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, category, q, sort = 'createdAt', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (q) query.$or = [
    { location: { $regex: q, $options: 'i' } },
    { model: { $regex: q, $options: 'i' } },
    { brand: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Equipment.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(Number(limit))
      .populate('category')
      .populate('type')
      .populate('productionSection', 'name')
      .populate('productionLine', 'name')
      .lean(),
    Equipment.countDocuments(query)
  ]);
  return res.status(200).json({ equipment: items, page: Number(page), total });
});

// GET /api/equipment/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const equipment = await Equipment.findById(id)
    .populate('category')
    .populate('type')
    .populate('productionSection', 'name')
    .populate('productionLine', 'name')
    .lean();
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ equipment });
});
 
// POST /api/equipment
const { z } = require('zod');
const equipmentSchema = z.object({
  category: z.string().min(1), // ObjectId as string
  type: z.string().min(1), // ObjectId as string
  status: z.enum(['online','maintenance','breakdown','offline','scrapped']),
  location: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().min(1), // Rendu obligatoire
  serialNumber: z.string().optional(),
  chipNumber: z.string().optional(),
  brand: z.string().optional(),
  installationDate: z.coerce.date().optional(),
  lastMaintenance: z.coerce.date().optional(),
  nextMaintenance: z.coerce.date().optional(),
  productionSection: z.string().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const parse = equipmentSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const created = await Equipment.create(parse.data);
  const populated = await Equipment.findById(created._id).populate('category').populate('type').lean();
  return res.status(201).json({ success: true, equipment: populated });
});

// PATCH /api/equipment/:id
router.patch('/:id', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','foreman']), async (req, res) => {
  const { id } = req.params;
  const updates = (req.body || {});
  const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true }).populate('category').populate('type').lean();
  if (!updated) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true, equipment: updated });
});

// DELETE /api/equipment/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Equipment.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true });
});

// GET /api/equipment/:id/interventions - Historique des interventions
router.get('/:id/interventions', requireUser, async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, type, status, sort = 'createdDate', order = 'desc' } = req.query;
  
  // Vérifier que l'équipement existe
  const equipment = await Equipment.findById(id).populate('category').populate('type');
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
  
  const query = {
    $or: [
      { equipment: id },
      { equipment: equipment.category?.name + ' - ' + equipment.type?.name },
      { equipment: { $regex: equipment.model || '', $options: 'i' } }
    ]
  };
  if (type) query.type = type;
  if (status) query.status = status;
  
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  
  const [interventions, total] = await Promise.all([
    Intervention.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).lean(),
    Intervention.countDocuments(query)
  ]);
  
  return res.status(200).json({
    equipment: equipment.toObject(),
    interventions,
    page: Number(page),
    total
  });
});

// GET /api/equipment/:id/parts - Pièces associées à l'équipement
router.get('/:id/parts', requireUser, async (req, res) => {
  const { id } = req.params;
  
  // Vérifier que l'équipement existe
  const equipment = await Equipment.findById(id).populate('category').populate('type');
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
  
  try {
    const equipmentParts = await EquipmentPart.find({ equipment: id })
      .populate({
        path: 'part',
        model: 'Part'
      })
      .lean();
      
    // Enrichir avec info commandes en cours
    const enrichedParts = await Promise.all(
      equipmentParts.map(async (ep) => {
        const pendingOrders = await PartOrder.find({
          part: ep.part._id,
          status: { $in: ['pending', 'ordered'] }
        }).populate('orderedBy', 'email');
        
        return {
          ...ep,
          part: {
            ...ep.part,
            pendingOrders,
            pendingQuantity: pendingOrders.reduce((sum, o) => sum + o.quantity, 0)
          }
        };
      })
    );
    
    return res.status(200).json({
      equipment: equipment.toObject(),
      equipmentParts: enrichedParts
    });
  } catch (error) {
    console.error('Error fetching equipment parts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/equipment/:id/assign-section - Assigner à une section
router.post('/:id/assign-section', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const { id } = req.params;
  const { sectionId } = req.body;

  try {
    const equipment = await Equipment.findById(id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    // Vérifier si la section est déjà occupée par un autre équipement
    if (sectionId) {
      const existingEquipment = await Equipment.findOne({
        productionSection: sectionId,
        _id: { $ne: id }
      });

      if (existingEquipment) {
        return res.status(400).json({
          message: 'Cette section est déjà occupée par un autre équipement',
          existingEquipment: {
            _id: existingEquipment._id,
            model: existingEquipment.model,
            location: existingEquipment.location
          }
        });
      }
    }

    // Ajouter à l'historique d'affectation si changement de section
    if (equipment.productionSection && equipment.productionSection.toString() !== sectionId) {
      equipment.assignmentHistory.push({
        section: equipment.productionSection,
        line: equipment.productionLine,
        unassignedAt: new Date(),
        assignedBy: req.user._id
      });
    }

    // Nouvelle affectation
    if (sectionId) {
      equipment.assignmentHistory.push({
        section: sectionId,
        assignedAt: new Date(),
        assignedBy: req.user._id
      });
    }

    equipment.productionSection = sectionId || null;
    await equipment.save(); // Le middleware gérera le statut et productionLine

    const updatedEquipment = await Equipment.findById(id)
      .populate('productionSection', 'name')
      .populate('productionLine', 'name');

    return res.status(200).json({
      success: true,
      equipment: updatedEquipment
    });
  } catch (error) {
    console.error('Error assigning equipment to section:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/equipment/:id/parts - Associer une pièce à l'équipement
router.post('/:id/parts', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const { id } = req.params;
  const { partId, quantity = 1, replacementFrequency, notes } = req.body;
  
  try {
    const equipmentPart = await EquipmentPart.create({
      equipment: id,
      part: partId,
      quantity,
      replacementFrequency,
      notes
    });
    
    const populated = await EquipmentPart.findById(equipmentPart._id)
      .populate('part')
      .lean();
    
    return res.status(201).json({
      success: true,
      equipmentPart: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Cette pièce est déjà associée à cet équipement' });
    }
    console.error('Error associating part to equipment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
