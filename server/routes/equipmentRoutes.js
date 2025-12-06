const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Equipment, EQUIPMENT_STATUSES } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { STATUS_METADATA, EquipmentStatusHistory } = require('../models/EquipmentStatusHistory');
const EquipmentStatusService = require('../services/equipmentStatusService');
const { z } = require('zod');
const EquipmentPartsService = require('../services/equipmentPartsService');
const { EquipmentPart } = require('../models/EquipmentPart');

const router = express.Router();

// Calculate maintenance metrics for equipment
// Calculate maintenance metrics for equipment - DEPRECATED
// Now using stored values in Equipment model
// async function calculateMetrics(equipment) { ... }

// GET /api/equipment (with basic pagination & filters)
router.get('/', requireUser, async (req, res) => {
  const { page = 1, limit = 50, status, category, q, sort = 'createdAt', order = 'desc' } = req.query || {};
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { location: { $regex: q, $options: 'i' } }
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Equipment.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).populate('category').populate('type').populate('brand').lean(),
    Equipment.countDocuments(query)
  ]);

  // Metrics are now stored in the equipment document
  // But we might want to calculate dynamic ones like downtime/availability if they are not persisted fully
  // For now, let's assume we want to calculate dynamic availability on the fly as it depends on "now"
  // Re-implementing LIGHTWEIGHT dynamic calculation for availability/downtime only

  items.forEach(item => {
    // Basic defaults if not present
    item.mtbf = item.mtbf || 0;
    item.mttr = item.mttr || 0;

    // Calculate dynamic availability
    let downtime = 0; // This should ideally be cumulative from history, but for now let's use the stored logic or re-calculate
    // The previous calculateMetrics did a heavy intervention scan for downtime.
    // We should probably rely on EquipmentStatusHistory for accurate downtime, but that's complex.
    // For this refactor, we will rely on what's stored in DB (if we added availability field) or re-calculate LIGHTLY.
    // Since we didn't add 'availability' to schema yet (commented out in service), we need to calculate it.
    // BUT, the service DOES calculate it and we could store it.
    // Let's assume for now we just return what's in the DB (which might be 0 if not migrated)
    // Wait, the migration script calls calculateMetrics which returns updates.
    // We should probably update the schema to store availability too if we want full performance.

    // For now, let's keep the heavy calculation REMOVED and rely on stored values.
    // If stored values are missing, they will be 0.
    // The migration script needs to be run.
  });

  return res.status(200).json({ equipment: items, page: Number(page), total });
});

// GET /api/equipment/:id
router.get('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const equipment = await Equipment.findById(id).populate('category').populate('type').populate('brand').lean();
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

  // Metrics are already in the equipment object
  // No need to recalculate

  return res.status(200).json({ equipment });
});

// GET /api/equipment/:id/parts
router.get('/:id/parts', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page = 1, startDate, endDate } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await EquipmentPartsService.get(id, req.user._id, {
      limit: parseInt(limit) || 50,
      skip,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get status history error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get status history' });
  }
});

// POST /api/equipment/:id/parts
const partSchema = z.object({
  part: z.string(),
  quantity: z.number().min(1),
});

router.post('/:id/parts', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const parse = partSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    const created = await EquipmentPart.create({
      equipment: id,
      part: parse.data.part,
      quantity: parse.data.quantity,
      changedBy: req.user._id
    });

    const populated = await EquipmentPart.findById(created._id)
      .populate('part', 'name partNumber')
      .populate('changedBy', 'email role')
      .lean();

    return res.status(201).json({ success: true, equipmentPart: populated });
  } catch (error) {
    console.error('Create equipment part error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment part' });
  }
});

// GET /api/equipment/:id/interventions
router.get('/:id/interventions', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, type, status, q, sort = 'createdDate', order = 'desc' } = req.query;

    // Get equipment info
    const equipment = await Equipment.findById(id)
      .populate('category')
      .populate('type')
      .lean();

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const query = { $or: [{ equipmentId: id }, { equipment: equipment.location }] };
    if (type) query.type = type;
    if (status) query.status = status;
    if (q) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortSpec = { [String(sort)]: String(order).toLowerCase() === 'asc' ? 1 : -1 };

    const [interventions, total] = await Promise.all([
      Intervention.find(query)
        .sort(sortSpec)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Intervention.countDocuments(query)
    ]);

    return res.status(200).json({
      equipment,
      interventions,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get equipment interventions error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment interventions' });
  }
});

// GET /api/equipment/:id/consumable
router.get('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, skip = 0 } = req.query;

    // Get equipment info
    const equipment = await Equipment.findById(id)
      .populate('category')
      .populate('type')
      .lean();

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // First, get all consumable part IDs
    const { Part } = require('../models/Part');
    const consumableParts = await Part.find({ type: 'consumable' }).select('_id').lean();
    const consumablePartIds = consumableParts.map(p => p._id);

    // Then filter EquipmentParts by equipment and consumable part IDs
    const equipmentParts = await EquipmentPart.find({
      equipment: id,
      part: { $in: consumablePartIds }
    })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await EquipmentPart.countDocuments({
      equipment: id,
      part: { $in: consumablePartIds }
    });

    return res.status(200).json({
      equipment,
      equipmentParts,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get equipment consumables error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment consumables' });
  }
});

// POST /api/equipment/:id/consumable
const consumableSchema = z.object({
  part: z.string(),
  quantity: z.number().min(1),
});

router.post('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const parse = consumableSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    const created = await EquipmentPart.create({
      equipment: id,
      part: parse.data.part,
      quantity: parse.data.quantity,
      changedBy: req.user._id
    });

    const populated = await EquipmentPart.findById(created._id)
      .populate('part', 'name partNumber')
      .populate('changedBy', 'email role')
      .lean();

    return res.status(201).json({ success: true, equipmentPart: populated });
  } catch (error) {
    console.error('Create equipment consumable error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment consumable' });
  }
});

// POST /api/equipment
const equipmentSchema = z.object({
  category: z.string().min(1), // ObjectId as string
  type: z.string().min(1), // ObjectId as string
  status: z.enum(Object.values(EQUIPMENT_STATUSES)),
  location: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  chipNumber: z.string().optional(),
  brand: z.string().optional(),
  acquisitionDate: z.coerce.date().optional(),
  lastMaintenance: z.coerce.date().optional(),
  nextMaintenance: z.coerce.date().optional(),
});

router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const parse = equipmentSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    // Transform empty strings to undefined for ObjectId fields
    const equipmentData = {
      ...parse.data,
      brand: parse.data.brand && parse.data.brand.trim() !== '' ? parse.data.brand : undefined,
      lastStatusChangedBy: req.user._id,
      lastStatusChange: new Date()
    };

    const created = await Equipment.create(equipmentData);

    // Create initial status history entry (without validation since it's the first status)
    await EquipmentStatusHistory.create({
      equipment: created._id,
      previousStatus: null,
      newStatus: created.status,
      changedBy: req.user._id,
      reason: 'Initial equipment creation',
      notes: 'Equipment added to system',
      timestamp: new Date()
    });

    // Dupliquer automatiquement les associations de pièces/consommables
    // depuis d'autres équipements du même type
    let duplicatedPartsCount = 0;
    if (created.type) {
      try {
        // Trouver un équipement de référence du même type
        const referenceEquipment = await Equipment.findOne({
          type: created.type,
          _id: { $ne: created._id }
        }).lean();

        if (referenceEquipment) {
          // Récupérer toutes les associations de l'équipement de référence
          const referenceAssociations = await EquipmentPart.find({
            equipment: referenceEquipment._id
          }).lean();

          if (referenceAssociations.length > 0) {
            // Créer les mêmes associations pour le nouvel équipement
            const newAssociations = referenceAssociations.map(assoc => {
              // Calculer les valeurs (car insertMany ne déclenche pas le hook pre-save)
              const annualConsumption = assoc.quantityPerMachine * assoc.replacementFrequencyPerYear;
              const dailyConsumption = annualConsumption / 365;
              const safetyStock = Math.ceil(dailyConsumption * assoc.leadTimeDays * assoc.safetyCoefficient);
              const reorderPoint = Math.ceil(safetyStock + (dailyConsumption * assoc.leadTimeDays));

              return {
                equipment: created._id,
                part: assoc.part,
                quantityPerMachine: assoc.quantityPerMachine,
                replacementFrequencyPerYear: assoc.replacementFrequencyPerYear,
                criticality: assoc.criticality,
                criticalityScore: assoc.criticalityScore,
                machineImportance: assoc.machineImportance,
                leadTimeDays: assoc.leadTimeDays,
                safetyCoefficient: assoc.safetyCoefficient,
                isStandardPart: assoc.isStandardPart,
                notes: assoc.notes ? `Auto-duplicated from reference equipment. ${assoc.notes}` : 'Auto-duplicated from reference equipment',
                changedBy: req.user._id,
                // Valeurs calculées
                annualConsumption: annualConsumption,
                dailyConsumption: dailyConsumption,
                safetyStock: safetyStock,
                reorderPoint: reorderPoint
              };
            });

            await EquipmentPart.insertMany(newAssociations);
            duplicatedPartsCount = newAssociations.length;

            // Recalculer le min/max pour chaque pièce dupliquée
            const uniqueParts = [...new Set(newAssociations.map(a => a.part.toString()))];
            for (const partId of uniqueParts) {
              try {
                await EquipmentPartsService.recalculateMinMaxForPart(partId);
                console.log(`Min/Max recalculated for part ${partId}`);
              } catch (recalcError) {
                console.error(`Error recalculating min/max for part ${partId}:`, recalcError);
              }
            }
          }
        }
      } catch (dupError) {
        console.error('Error duplicating parts to new equipment:', dupError);
        // Don't fail equipment creation
      }
    }

    const populated = await Equipment.findById(created._id)
      .populate('category')
      .populate('type')
      .populate('lastStatusChangedBy', 'email role')
      .lean();

    return res.status(201).json({
      success: true,
      equipment: populated,
      duplicatedPartsCount,
      message: duplicatedPartsCount > 0
        ? `Equipment created with ${duplicatedPartsCount} part(s)/consumable(s) auto-duplicated. Min/Max recalculated.`
        : 'Equipment created'
    });
  } catch (error) {
    console.error('Create equipment error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment' });
  }
});

// PATCH /api/equipment/:id
router.patch('/:id', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'line_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = (req.body || {});

    // Transform empty strings to undefined for ObjectId fields
    if (updates.brand !== undefined) {
      if (typeof updates.brand === 'string' && updates.brand.trim() === '') {
        delete updates.brand;
      }
    }

    // If status is being changed, use the status service
    if (updates.status) {
      const equipment = await Equipment.findById(id);
      if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

      // Extract status change details
      const {
        status,
        statusChangeReason,
        statusChangeNotes,
        machinistId,
        mechanicId,
        electricianId,
        maintenanceWorkerId,
        breakdownType,
        breakdownDescription
      } = updates;

      delete updates.status;
      delete updates.statusChangeReason;
      delete updates.statusChangeNotes;
      delete updates.machinistId;
      delete updates.mechanicId;
      delete updates.electricianId;
      delete updates.maintenanceWorkerId;
      delete updates.breakdownType;
      delete updates.breakdownDescription;

      // Update other fields first
      if (Object.keys(updates).length > 0) {
        await Equipment.findByIdAndUpdate(id, updates);
      }

      // Change status with tracking
      const result = await EquipmentStatusService.changeStatus(
        id,
        status,
        req.user._id,
        {
          reason: statusChangeReason || '',
          notes: statusChangeNotes || '',
          machinistId,
          mechanicId,
          electricianId,
          maintenanceWorkerId,
          breakdownType,
          breakdownDescription
        }
      );

      return res.status(200).json({ success: true, equipment: result.equipment });
    }

    // Regular update without status change
    const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true })
      .populate('category')
      .populate('type')
      .populate('brand')
      .populate('lastStatusChangedBy', 'email role')
      .lean();

    if (!updated) return res.status(404).json({ message: 'Equipment not found' });
    return res.status(200).json({ success: true, equipment: updated });
  } catch (error) {
    console.error('Update equipment error:', error);
    return res.status(400).json({ message: error.message || 'Failed to update equipment' });
  }
});

// DELETE /api/equipment/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const deleted = await Equipment.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ message: 'Equipment not found' });
  return res.status(200).json({ success: true });
});

// POST /api/equipment/:id/change-status
// Change equipment status with tracking
router.post('/:id/', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'mechanic', 'electrician']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes, interventionId, machinistId } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // If status is "in_production", machinistId is required
    if (status === 'in_production' && !machinistId) {
      return res.status(400).json({ message: 'Machinist is required when setting equipment to In Production' });
    }

    const result = await EquipmentStatusService.changeStatus(
      id,
      status,
      req.user._id,
      { reason, notes, interventionId, machinistId }
    );

    return res.status(200).json({
      success: true,
      equipment: result.equipment,
      historyEntry: result.historyEntry
    });
  } catch (error) {
    console.error('Change status error:', error);
    return res.status(400).json({ message: error.message || 'Failed to change status' });
  }
});

// POST /api/equipment/:id/change-status
// Change equipment status with tracking
router.post('/:id/change-status', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'foreman', 'mechanic', 'electrician', 'production_manager', 'line_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // If status is "in_production", machinistId is required
    if (status === 'in_production' && !machinistId) {
      return res.status(400).json({ message: 'Machinist is required when setting equipment to In Production' });
    }

    // Maintenance statuses requiring personnel
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance', 'in_workshop'];
    if (maintenanceStatuses.includes(status) && !mechanicId && !electricianId && !maintenanceWorkerId) {
      const { STATUS_METADATA } = require('../models/EquipmentStatusHistory');
      const statusLabel = STATUS_METADATA[status]?.label || status;
      return res.status(400).json({
        message: `At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting equipment to ${statusLabel}`
      });
    }

    const result = await EquipmentStatusService.changeStatus(
      id,
      status,
      req.user._id,
      { reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription }
    );

    return res.status(200).json({
      success: true,
      equipment: result.equipment,
      historyEntry: result.historyEntry
    });
  } catch (error) {
    console.error('Change status error:', error);
    return res.status(400).json({ message: error.message || 'Failed to change status' });
  }
});

// GET /api/equipment/:id/status-history
router.get('/:id/status-history', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page = 1, startDate, endDate } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await EquipmentStatusService.getStatusHistory(id, {
      limit: parseInt(limit) || 50,
      skip,
      startDate,
      endDate
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get status history error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get status history' });
  }
});



// GET /api/equipment/:id/status-statistics
// Get status statistics for an equipment
router.get('/:id/status-statistics', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await EquipmentStatusService.getStatusStatistics(id, {
      startDate,
      endDate
    });

    return res.status(200).json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Get status statistics error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get status statistics' });
  }
});

// GET /api/equipment/:id/allowed-transitions
// Get allowed status transitions for an equipment
router.get('/:id/allowed-transitions', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const transitions = await EquipmentStatusService.getAllowedTransitions(id);
    return res.status(200).json({ success: true, transitions });
  } catch (error) {
    console.error('Get allowed transitions error:', error);
    return res.status(400).json({ message: error.message || 'Failed to get allowed transitions' });
  }
});

// GET /api/equipment/status/:status
// Get all equipment with a specific status
router.get('/status/:status', requireUser, async (req, res) => {
  try {
    const { status } = req.params;
    const { limit, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await EquipmentStatusService.getEquipmentByStatus(status, {
      limit: parseInt(limit) || 50,
      skip
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get equipment by status error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment by status' });
  }
});

// GET /api/equipment/category/:category
// Get all equipment in a status category (production, maintenance, out_of_service)
router.get('/category/:category', requireUser, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await EquipmentStatusService.getEquipmentByCategory(category, {
      limit: parseInt(limit) || 50,
      skip
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get equipment by category error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment by category' });
  }
});

// POST /api/equipment/bulk-change-status
// Bulk change status for multiple equipment
router.post('/bulk-change-status', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const { equipmentIds, status, reason, notes } = req.body;

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({ message: 'equipmentIds array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const results = await EquipmentStatusService.bulkChangeStatus(
      equipmentIds,
      status,
      req.user._id,
      { reason, notes }
    );

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Bulk change status error:', error);
    return res.status(500).json({ message: error.message || 'Failed to bulk change status' });
  }
});

// GET /api/equipment/statuses/metadata
// Get all available statuses with metadata
router.get('/statuses/metadata', requireUser, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      statuses: STATUS_METADATA
    });
  } catch (error) {
    console.error('Get status metadata error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get status metadata' });
  }
});



module.exports = router;
