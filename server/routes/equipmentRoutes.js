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
// PATCH /api/equipment/:id/status - Changer le statut d'un équipement
router.patch('/:id/status', requireUser, async (req, res) => {
  const { id } = req.params;
  const { newStatus, reason, notes, interventionData } = req.body;
  
  try {
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }
    
    // Vérifier si le nouveau statut est autorisé
    const availableStatuses = equipment.getAvailableStatuses();
    if (!availableStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        message: 'Status change not allowed',
        availableStatuses,
        currentStatus: equipment.status,
        inProductionSection: !!equipment.productionSection
      });
    }
    
    // Mettre à jour les métriques avant le changement de statut
    equipment.updateOperatingMetrics();
    
    const now = new Date();
    const oldStatus = equipment.status;
    
    // Gestion spécifique selon le nouveau statut
    switch (newStatus) {
      case 'breakdown':
        equipment.lastDowntime = now;
        equipment.productionMetrics.lastBreakdownStart = now;
        equipment.productionMetrics.isOperating = false;
        equipment.productionMetrics.breakdownCount += 1;
        
        // Créer automatiquement une intervention si des données sont fournies
        if (interventionData) {
          const { Intervention } = require('../models/Intervention');
          const intervention = new Intervention({
            title: interventionData.title || `Panne - ${equipment.model}`,
            type: 'Corrective',
            priority: interventionData.priority || 'High',
            status: 'Pending',
            equipment: equipment._id,
            description: interventionData.description,
            assignedTo: interventionData.assignedTo,
            createdDate: now
          });
          await intervention.save();
          
          // Ajouter l'intervention à l'historique de statut
          equipment.statusHistory.push({
            status: newStatus,
            changedAt: now,
            changedBy: req.user._id,
            reason: reason || 'Breakdown reported',
            interventionId: intervention._id,
            notes
          });
        }
        break;
        
      case 'online':
        equipment.productionMetrics.isOperating = true;
        equipment.productionMetrics.lastOperatingStart = now;
        if (oldStatus === 'breakdown') {
          equipment.productionMetrics.lastBreakdownStart = null;
        }
        break;
        
      case 'offline':
        equipment.productionMetrics.isOperating = false;
        equipment.productionMetrics.lastOperatingStart = null;
        break;
        
      case 'maintenance':
      case 'scrapped':
        equipment.productionMetrics.isOperating = false;
        equipment.productionMetrics.lastOperatingStart = null;
        break;
    }
    
    // Mettre à jour le statut
    equipment.status = newStatus;
    
    // Ajouter à l'historique si pas déjà fait
    if (!equipment.statusHistory.some(h => h.changedAt.getTime() === now.getTime())) {
      equipment.statusHistory.push({
        status: newStatus,
        changedAt: now,
        changedBy: req.user._id,
        reason,
        notes
      });
    }
    
    await equipment.save();
    
    // Retourner l'équipement mis à jour avec les nouvelles métriques
    const updatedEquipment = await Equipment.findById(id)
      .populate('category')
      .populate('type')
      .populate('productionSection', 'name')
      .populate('productionLine', 'name');
    
    res.json({ 
      equipment: updatedEquipment,
      message: `Status changed from ${oldStatus} to ${newStatus}`,
      availableStatuses: updatedEquipment.getAvailableStatuses()
    });
    
  } catch (error) {
    console.error('Error changing equipment status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/equipment/:id/available-statuses - Obtenir les statuts disponibles
router.get('/:id/available-statuses', requireUser, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }
    
    const availableStatuses = equipment.getAvailableStatuses();
    
    res.json({
      currentStatus: equipment.status,
      availableStatuses,
      inProductionSection: !!equipment.productionSection,
      productionSection: equipment.productionSection,
      productionLine: equipment.productionLine
    });
  } catch (error) {
    console.error('Error getting available statuses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/equipment/:id/metrics - Obtenir les métriques détaillées
router.get('/:id/metrics', requireUser, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }
    
    // Si l'équipement est assigné à une section mais n'a pas de insertedAt, l'initialiser
    if (equipment.productionSection && !equipment.productionMetrics.insertedAt) {
      equipment.productionMetrics.insertedAt = new Date();
      equipment.productionMetrics.isOperating = equipment.status === 'online';
      await equipment.save();
    }
    
    // Mettre à jour les métriques avant de les retourner
    equipment.updateOperatingMetrics();
    await equipment.save();
    
    // Calculs temporels de base
    const now = new Date();
    const acquisitionDate = equipment.installationDate || equipment.createdAt;
    const insertionDate = equipment.productionMetrics.insertedAt;
    
    // Temps depuis acquisition et insertion (en heures)
    const timeSinceAcquisition = acquisitionDate ? (now - acquisitionDate) / (1000 * 60 * 60) : 0;
    const timeSinceInsertion = insertionDate ? (now - insertionDate) / (1000 * 60 * 60) : 0;
    
    // CORRECTION RADICALE : Forcer la cohérence absolue des métriques
    const maxSectionTime = Math.max(timeSinceInsertion, 0);
    
    // Récupérer les valeurs brutes
    const rawSectionOperatingHours = equipment.productionMetrics.operatingHours || 0;
    const rawSectionDowntimeHours = equipment.productionMetrics.sectionDowntimeHours || 0;
    const rawTotalOperatingHours = equipment.totalOperatingHours || 0;
    const rawTotalDowntimeHours = equipment.downtimeHours || 0;
    
    // ÉTAPE 1: Limiter strictement les métriques de section au temps disponible
    let correctedSectionOperatingHours = Math.min(rawSectionOperatingHours, maxSectionTime);
    let correctedSectionDowntimeHours = Math.min(rawSectionDowntimeHours, maxSectionTime);
    
    // ÉTAPE 2: S'assurer que la somme ne dépasse jamais le temps disponible
    const totalSectionTime = correctedSectionOperatingHours + correctedSectionDowntimeHours;
    if (totalSectionTime > maxSectionTime && maxSectionTime > 0) {
      // Si la somme dépasse, proportionner en gardant les ratios
      const ratio = maxSectionTime / totalSectionTime;
      correctedSectionOperatingHours = correctedSectionOperatingHours * ratio;
      correctedSectionDowntimeHours = correctedSectionDowntimeHours * ratio;
    }
    
    // ÉTAPE 3: Forcer la synchronisation des métriques globales
    // Les métriques globales DOIVENT être au moins égales aux métriques de section
    const finalTotalOperatingHours = Math.max(rawTotalOperatingHours, correctedSectionOperatingHours);
    const finalTotalDowntimeHours = Math.max(rawTotalDowntimeHours, correctedSectionDowntimeHours);
    
    // ÉTAPE 4: Validation finale - si les métriques globales sont encore incohérentes, les forcer
    const finalSectionOperatingHours = correctedSectionOperatingHours;
    const finalSectionDowntimeHours = correctedSectionDowntimeHours;
    

    
    // Calculs corrects de MTBF et MTTR avec les métriques validées
    const breakdownCount = equipment.productionMetrics.breakdownCount || 0;
    const sectionMTBF = breakdownCount > 0 ? finalSectionOperatingHours / breakdownCount : 0;
    const sectionMTTR = breakdownCount > 0 ? finalSectionDowntimeHours / breakdownCount : 0;
    
    // Calculs globaux de MTBF et MTTR (basés sur l'historique total)
    const globalBreakdownCount = Math.max(breakdownCount, 1); // Au moins 1 pour éviter division par 0
    const globalMTBF = finalTotalOperatingHours / globalBreakdownCount;
    const globalMTTR = finalTotalDowntimeHours / globalBreakdownCount;
    
    const metrics = {
      // Métriques globales (validées et synchronisées)
      mtbf: globalMTBF,
      mttr: globalMTTR,
      totalOperatingHours: finalTotalOperatingHours,
      downtimeHours: finalTotalDowntimeHours,
      installationDate: equipment.installationDate,
      createdAt: equipment.createdAt,
      
      // Availability globale (Operating hours / (Operating hours + Downtime hours))
      globalAvailability: finalTotalOperatingHours + finalTotalDowntimeHours > 0 ?
        (finalTotalOperatingHours / (finalTotalOperatingHours + finalTotalDowntimeHours)) * 100 : 0,
      
      // Métriques de production (validées et ajustées)
      productionMetrics: {
        ...equipment.productionMetrics.toObject(),
        operatingHours: finalSectionOperatingHours,
        sectionDowntimeHours: finalSectionDowntimeHours
      },
      
      // Métriques calculées pour la section actuelle (corrigées)
      sectionMTBF: sectionMTBF,
      sectionMTTR: sectionMTTR,
      
      // Temps depuis l'insertion dans la section
      timeSinceInsertion: timeSinceInsertion,
      
      // Disponibilité de section (Operating hours / (Operating hours + Downtime hours))
      availability: finalSectionOperatingHours + finalSectionDowntimeHours > 0 ?
        (finalSectionOperatingHours / (finalSectionOperatingHours + finalSectionDowntimeHours)) * 100 : 0
    };
    
    res.json({ metrics });
  } catch (error) {
    console.error('Error getting equipment metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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
