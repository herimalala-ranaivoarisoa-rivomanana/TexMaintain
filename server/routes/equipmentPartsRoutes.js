const express = require('express');
const { EquipmentPart } = require('../models/EquipmentPart');
const { Equipment } = require('../models/Equipment');
const { Part } = require('../models/Part');
const { requireUser, requireRole } = require('./middleware/auth');
const { z } = require('zod');
const EquipmentPartsService = require('../services/equipmentPartsService');

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
  notes: z.string().optional(),
  mediaBefore: z.array(z.string()).optional(),
  mediaAfter: z.array(z.string()).optional()
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

    // Multi-tenant Filter: Ensure we only show associations for equipment in the active factory
    if (req.activeFactoryId) {
      // Get all equipment IDs for this factory
      const factoryEquipment = await Equipment.find({ factory: req.activeFactoryId }).select('_id');
      const allowedEquipmentIds = factoryEquipment.map(e => e._id);

      if (equipment) {
        // Verify requested equipment is in allowed list
        if (!allowedEquipmentIds.some(id => id.toString() === equipment)) {
          // If requesting restricted equipment, return empty
          return res.status(200).json({ success: true, associations: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } });
        }
        filter.equipment = equipment;
      } else {
        // Constrain by all allowed equipment
        filter.equipment = { $in: allowedEquipmentIds };
      }
    } else if (equipment) {
      filter.equipment = equipment;
    }
    if (part) filter.part = part;
    if (criticality) filter.criticality = criticality;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const associations = await EquipmentPart.find(filter)
      .populate('equipment', 'model serialNumber location category type')
      .populate('part', 'name partNumber category type currentStock minStock maxStock unitPrice supplier')
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
      .populate('part', 'name partNumber category type currentStock minStock maxStock unitPrice supplier')
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
    const alerts = await EquipmentPart.findPartsNeedingReorder(req.activeFactoryId);

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
 * Créer une nouvelle association équipement-pièce
 * Option: duplicateToSameType pour dupliquer sur tous les équipements du même type
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
    const { duplicateToSameType = true } = req.body; // Par défaut: true

    // Vérifier que l'équipement et la pièce existent
    const equipment = await Equipment.findById(data.equipment).populate('type');
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const part = await Part.findById(data.part);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Vérifier qu'il n'existe pas déjà une association
    const existing = await EquipmentPart.findOne({
      equipment: data.equipment,
      part: data.part
    });

    if (existing) {
      return res.status(400).json({
        message: 'This part is already associated with this equipment'
      });
    }

    // Créer l'association principale
    const association = new EquipmentPart({
      ...data,
      changedBy: req.user._id
    });

    await association.save();

    let duplicatedCount = 0;

    // Dupliquer sur tous les équipements du même type si demandé
    if (duplicateToSameType && equipment.type) {
      try {
        // Trouver tous les autres équipements du même type
        const sameTypeEquipments = await Equipment.find({
          type: equipment.type._id,
          _id: { $ne: equipment._id } // Exclure l'équipement actuel
        });

        // Créer les associations pour chaque équipement
        const duplications = [];
        for (const otherEquipment of sameTypeEquipments) {
          // Vérifier qu'il n'existe pas déjà une association
          const existingAssoc = await EquipmentPart.findOne({
            equipment: otherEquipment._id,
            part: data.part
          });

          if (!existingAssoc) {
            // Calculer les valeurs (car insertMany ne déclenche pas le hook pre-save)
            const annualConsumption = data.quantityPerMachine * data.replacementFrequencyPerYear;
            const dailyConsumption = annualConsumption / 365;
            const safetyStock = Math.ceil(dailyConsumption * data.leadTimeDays * data.safetyCoefficient);
            const reorderPoint = Math.ceil(safetyStock + (dailyConsumption * data.leadTimeDays));

            const criticalityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
            const criticalityScore = criticalityMap[data.criticality] || 2;

            duplications.push({
              equipment: otherEquipment._id,
              part: data.part,
              quantityPerMachine: data.quantityPerMachine,
              replacementFrequencyPerYear: data.replacementFrequencyPerYear,
              criticality: data.criticality,
              criticalityScore: criticalityScore,
              machineImportance: data.machineImportance,
              leadTimeDays: data.leadTimeDays,
              safetyCoefficient: data.safetyCoefficient,
              isStandardPart: data.isStandardPart,
              notes: data.notes,
              changedBy: req.user._id,
              // Valeurs calculées
              annualConsumption: annualConsumption,
              dailyConsumption: dailyConsumption,
              safetyStock: safetyStock,
              reorderPoint: reorderPoint
            });
          }
        }

        if (duplications.length > 0) {
          await EquipmentPart.insertMany(duplications);
          duplicatedCount = duplications.length;
        }
      } catch (dupError) {
        console.error('Error duplicating to same type equipment:', dupError);
        // Don't fail the request if duplication fails
      }
    }

    // Recalculer automatiquement le min/max de la pièce
    let recalculatedMinMax = null;
    try {
      recalculatedMinMax = await EquipmentPartsService.recalculateMinMaxForPart(data.part);
      console.log(`Min/Max recalculated for part ${data.part}:`, recalculatedMinMax);
    } catch (recalcError) {
      console.error('Error recalculating min/max:', recalcError);
      // Don't fail the request if recalculation fails
    }

    const populated = await EquipmentPart.findById(association._id)
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name partNumber category currentStock minStock maxStock')
      .populate('changedBy', 'fullName email')
      .lean();

    return res.status(201).json({
      success: true,
      association: populated,
      duplicatedCount,
      recalculatedMinMax,
      message: duplicatedCount > 0
        ? `Association created and duplicated to ${duplicatedCount} equipment(s) of the same type. Min/Max recalculated.`
        : 'Association created. Min/Max recalculated.'
    });
  } catch (error) {
    console.error('Error creating association:', error);
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

    // Find the association first
    const association = await EquipmentPart.findById(id)
      .populate('equipment');

    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }

    // Update fields
    Object.assign(association, parse.data);
    association.changedBy = req.user._id;

    // Save (this will trigger pre-save hook for nextReplacementDate recalculation)
    await association.save();

    // Propager automatiquement les modifications aux équipements du même type
    let propagatedCount = 0;
    if (association.equipment.type) {
      try {
        // Trouver toutes les autres associations du même type avec la même pièce
        const sameTypeEquipments = await Equipment.find({
          type: association.equipment.type,
          _id: { $ne: association.equipment._id }
        });

        for (const otherEquipment of sameTypeEquipments) {
          // Trouver l'association si elle existe
          const otherAssoc = await EquipmentPart.findOne({
            equipment: otherEquipment._id,
            part: association.part
          });

          if (otherAssoc) {
            // Mettre à jour les champs (utilise Object.assign pour déclencher les setters)
            Object.assign(otherAssoc, {
              quantityPerMachine: parse.data.quantityPerMachine,
              replacementFrequencyPerYear: parse.data.replacementFrequencyPerYear,
              criticality: parse.data.criticality,
              machineImportance: parse.data.machineImportance,
              leadTimeDays: parse.data.leadTimeDays,
              safetyCoefficient: parse.data.safetyCoefficient,
              isStandardPart: parse.data.isStandardPart,
              changedBy: req.user._id
            });

            // Sauvegarder (déclenche le pre-save hook pour recalculer les valeurs)
            await otherAssoc.save();
            propagatedCount++;
          }
        }

        console.log(`Propagated changes to ${propagatedCount} equipment(s) of the same type`);
      } catch (propError) {
        console.error('Error propagating changes:', propError);
        // Don't fail the request if propagation fails
      }
    }

    // Populate for response
    const populated = await EquipmentPart.findById(id)
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name partNumber currentStock minStock maxStock')
      .populate('changedBy', 'fullName email')
      .lean();

    // Recalculer automatiquement le min/max de la pièce après modification
    let recalculatedMinMax = null;
    try {
      recalculatedMinMax = await EquipmentPartsService.recalculateMinMaxForPart(association.part._id);
      console.log(`Min/Max recalculated after update for part ${association.part._id}:`, recalculatedMinMax);
    } catch (recalcError) {
      console.error('Error recalculating min/max after update:', recalcError);
      // Don't fail the request if recalculation fails
    }

    return res.status(200).json({
      success: true,
      association: populated,
      propagatedCount,
      recalculatedMinMax,
      message: propagatedCount > 0
        ? `Association updated and propagated to ${propagatedCount} equipment(s). Min/Max recalculated: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
        : recalculatedMinMax
          ? `Association updated. Min/Max recalculated: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
          : 'Association updated'
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

    // Récupérer l'association avant de la supprimer (pour avoir le partId)
    const association = await EquipmentPart.findById(id);

    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }

    const partId = association.part;

    // Supprimer l'association
    await EquipmentPart.findByIdAndDelete(id);

    // Recalculer automatiquement le min/max de la pièce après suppression
    let recalculatedMinMax = null;
    try {
      recalculatedMinMax = await EquipmentPartsService.recalculateMinMaxForPart(partId);
      console.log(`Min/Max recalculated after deletion for part ${partId}:`, recalculatedMinMax);
    } catch (recalcError) {
      console.error('Error recalculating min/max after delete:', recalcError);
      // Don't fail the request if recalculation fails
    }

    return res.status(200).json({
      success: true,
      recalculatedMinMax,
      message: recalculatedMinMax
        ? `Association deleted. Min/Max recalculated: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
        : 'Association deleted'
    });
  } catch (error) {
    console.error('Error deleting association:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/equipment-parts/:id/record-replacement
 * Enregistrer un remplacement de pièce (pour parts)
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

    const { quantityUsed, notes, mediaBefore, mediaAfter } = parse.data;

    const association = await EquipmentPart.findById(id);
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }

    // Enregistrer le remplacement
    await association.recordReplacement(quantityUsed, req.user._id, notes || '', mediaBefore || [], mediaAfter || []);

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

/**
 * POST /api/equipment-parts/recalculate-all
 * Recalculer toutes les associations existantes (admin uniquement)
 */
router.post('/recalculate-all', requireUser, requireRole(['admin']), async (req, res) => {
  try {
    const associations = await EquipmentPart.find({});

    let updated = 0;
    for (const assoc of associations) {
      await assoc.save(); // Le hook pre-save va recalculer
      updated++;
    }

    return res.status(200).json({
      success: true,
      updated,
      message: `${updated} association(s) recalculée(s)`
    });
  } catch (error) {
    console.error('Error recalculating associations:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/equipment-parts/:id/record-usage
 * Enregistrer une utilisation de consommable (pour consumables)
 */
router.post('/:id/record-usage', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Utiliser le même schéma de validation (quantity et notes)
    const parse = recordReplacementSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: parse.error.issues[0]?.message || 'Invalid request'
      });
    }

    const { quantityUsed, notes, mediaBefore, mediaAfter } = parse.data;

    const association = await EquipmentPart.findById(id);
    if (!association) {
      return res.status(404).json({ message: 'Association not found' });
    }

    // Enregistrer l'utilisation (même méthode que remplacement)
    // La différence est sémantique, pas technique
    await association.recordReplacement(quantityUsed, req.user._id, notes || '', mediaBefore || [], mediaAfter || []);

    // Mettre à jour le stock du consommable
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
      message: 'Usage recorded successfully'
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
