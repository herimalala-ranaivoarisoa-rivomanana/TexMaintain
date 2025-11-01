const express = require('express');
const { EquipmentPart } = require('../models/EquipmentPart');
const { Equipment } = require('../models/Equipment');
const { Part } = require('../models/Part');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');

const router = express.Router();

// === VALIDATION SCHEMAS ===

const createAssociationSchema = z.object({
  equipment: z.string().min(1, 'Equipment ID is required'),
  part: z.string().min(1, 'Part ID is required'),
  quantityPerMachine: z.number().min(0.1).default(1),
  replacementFrequencyPerYear: z.number().min(0).default(1),
  criticality: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  machineImportance: z.number().min(1).max(100).default(50),
  leadTimeDays: z.number().min(0).default(15),
  safetyCoefficient: z.number().min(1).max(3).default(1.4),
  isStandardPart: z.boolean().default(true),
  notes: z.string().optional()
});

const updateAssociationSchema = createAssociationSchema.partial().omit({ equipment: true, part: true });

const recordReplacementSchema = z.object({
  quantityUsed: z.number().min(0.1),
  notes: z.string().optional()
});

// === ROUTES ===

/**
 * GET /api/equipment-parts
 * Liste toutes les associations équipement-pièce
 */
router.get('/', requireUser, async (req, res) => {
  try {
    const { equipment, part, criticality, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (equipment) filter.equipment = equipment;
    if (part) filter.part = part;
    if (criticality) filter.criticality = criticality;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const associations = await EquipmentPart.find(filter)
      .populate('equipment', 'model serialNumber location category type')
      .populate('part', 'name partNumber category currentStock')
      .populate('changedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await EquipmentPart.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      associations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching equipment-parts:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/equipment-parts/equipment/:equipmentId
 * Liste toutes les pièces associées à un équipement
 */
router.get('/equipment/:equipmentId', requireUser, async (req, res) => {
  try {
    const { equipmentId } = req.params;
    
    const associations = await EquipmentPart.find({ equipment: equipmentId })
      .populate('part', 'name partNumber category currentStock unitPrice supplier')
      .populate('changedBy', 'fullName email')
      .sort({ criticality: -1, createdAt: -1 })
      .lean();
    
    return res.status(200).json({
      success: true,
      associations,
      count: associations.length
    });
  } catch (error) {
    console.error('Error fetching equipment parts:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/equipment-parts/part/:partId
 * Liste tous les équipements utilisant une pièce
 */
router.get('/part/:partId', requireUser, async (req, res) => {
  try {
    const { partId } = req.params;
    
    const associations = await EquipmentPart.find({ part: partId })
      .populate('equipment', 'model serialNumber location status category type')
      .populate('changedBy', 'fullName email')
      .sort({ machineImportance: -1, criticality: -1 })
      .lean();
    
    return res.status(200).json({
      success: true,
      associations,
      count: associations.length
    });
  } catch (error) {
    console.error('Error fetching part equipment:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/equipment-parts/part/:partId/global-stock
 * Calcule le stock global nécessaire pour une pièce
 */
router.get('/part/:partId/global-stock', requireUser, async (req, res) => {
  try {
    const { partId } = req.params;
    
    const globalStock = await EquipmentPart.calculateGlobalStock(partId);
    
    // Récupérer aussi le stock actuel de la pièce
    const part = await Part.findById(partId).lean();
    
    return res.status(200).json({
      success: true,
      part: {
        _id: part._id,
        name: part.name,
        partNumber: part.partNumber,
        currentStock: part.currentStock || 0
      },
      globalStock,
      status: part.currentStock <= globalStock.globalSafetyStock ? 'critical' :
              part.currentStock <= globalStock.globalReorderPoint ? 'warning' : 'ok'
    });
  } catch (error) {
    console.error('Error calculating global stock:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/equipment-parts/reorder-alerts
 * Liste des pièces nécessitant un réapprovisionnement
 */
router.get('/reorder-alerts', requireUser, async (req, res) => {
  try {
    const alerts = await EquipmentPart.findPartsNeedingReorder();
    
    return res.status(200).json({
      success: true,
      alerts,
      count: alerts.length,
      critical: alerts.filter(a => a.urgency === 'critical').length,
      warning: alerts.filter(a => a.urgency === 'warning').length
    });
  } catch (error) {
    console.error('Error fetching reorder alerts:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/equipment-parts/:id
 * Détails d'une association
 */
router.get('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const association = await EquipmentPart.findById(id)
      .populate('equipment')
      .populate('part')
      .populate('changedBy', 'fullName email')
      .populate('replacementHistory.performedBy', 'fullName email')
      .lean();
    
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }
    
    return res.status(200).json({
      success: true,
      association
    });
  } catch (error) {
    console.error('Error fetching association:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/equipment-parts
 * Créer une association équipement-pièce
 */
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const parse = createAssociationSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        message: parse.error.issues[0]?.message || 'Invalid request' 
      });
    }
    
    const data = parse.data;
    
    // Vérifier que l'équipement existe
    const equipment = await Equipment.findById(data.equipment);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }
    
    // Vérifier que la pièce existe
    const part = await Part.findById(data.part);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }
    
    // Créer l'association
    const association = new EquipmentPart({
      ...data,
      changedBy: req.user._id
    });
    
    await association.save();
    
    const populated = await EquipmentPart.findById(association._id)
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name partNumber')
      .populate('changedBy', 'fullName email')
      .lean();
    
    return res.status(201).json({
      success: true,
      association: populated
    });
  } catch (error) {
    console.error('Error creating association:', error);
    
    // Gestion de l'erreur de doublon
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'This part is already associated with this equipment' 
      });
    }
    
    return res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/equipment-parts/:id
 * Modifier une association
 */
router.patch('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const parse = updateAssociationSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        message: parse.error.issues[0]?.message || 'Invalid request' 
      });
    }
    
    const updates = {
      ...parse.data,
      changedBy: req.user._id
    };
    
    const association = await EquipmentPart.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name partNumber')
      .populate('changedBy', 'fullName email')
      .lean();
    
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }
    
    return res.status(200).json({
      success: true,
      association
    });
  } catch (error) {
    console.error('Error updating association:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/equipment-parts/:id
 * Supprimer une association
 */
router.delete('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const association = await EquipmentPart.findByIdAndDelete(id);
    
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Association deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting association:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/equipment-parts/:id/record-replacement
 * Enregistrer un remplacement de pièce
 */
router.post('/:id/record-replacement', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const parse = recordReplacementSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        message: parse.error.issues[0]?.message || 'Invalid request' 
      });
    }
    
    const { quantityUsed, notes } = parse.data;
    
    const association = await EquipmentPart.findById(id);
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }
    
    // Enregistrer le remplacement
    await association.recordReplacement(quantityUsed, req.user._id, notes || '');
    
    // Mettre à jour le stock de la pièce
    await Part.findByIdAndUpdate(
      association.part,
      { $inc: { currentStock: -quantityUsed } }
    );
    
    const updated = await EquipmentPart.findById(id)
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name partNumber currentStock')
      .populate('replacementHistory.performedBy', 'fullName email')
      .lean();
    
    return res.status(200).json({
      success: true,
      association: updated,
      message: 'Replacement recorded successfully'
    });
  } catch (error) {
    console.error('Error recording replacement:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
