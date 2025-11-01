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
async function calculateMetrics(equipment) {
  // Find interventions by equipmentId (preferred) or fallback to location string match
  const interventions = await Intervention.find({
    $or: [
      { equipmentId: equipment._id },
      { equipment: equipment.location }
    ],
    type: { $in: ['Corrective', 'Emergency'] },
    status: 'Completed'
  }).sort({ createdDate: 1 }).lean();

  let mtbf = 0;
  let mttr = 0;
  let downtime = 0;

  if (interventions.length > 1) {
    const intervals = [];
    for (let i = 1; i < interventions.length; i++) {
      intervals.push((interventions[i].createdDate - interventions[i - 1].createdDate) / (1000 * 60 * 60)); // hours
    }
    mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  if (interventions.length > 0) {
    const durations = interventions.filter(i => i.dueDate).map(i => (i.dueDate - i.createdDate) / (1000 * 60 * 60));
    if (durations.length > 0) {
      mttr = durations.reduce((a, b) => a + b, 0) / durations.length;
      downtime = durations.reduce((a, b) => a + b, 0);
    }
  }

  // Add current downtime if equipment is not in production
  let currentDowntime = 0;
  if (equipment.status !== EQUIPMENT_STATUSES.IN_PRODUCTION && equipment.lastStatusChange) {
    currentDowntime = (Date.now() - new Date(equipment.lastStatusChange).getTime()) / (1000 * 60 * 60); // hours
    downtime += currentDowntime;
  }

  let timeSinceAcquisition = 0;
  let operatingTime = 0;
  let availability = 0;

  if (equipment.acquisitionDate) {
    timeSinceAcquisition = (Date.now() - new Date(equipment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24); // days
    operatingTime = timeSinceAcquisition * 24 - downtime; // hours
    if (timeSinceAcquisition * 24 > 0) {
      availability = (operatingTime / (timeSinceAcquisition * 24)) * 100;
    }
  }

  // If equipment is currently not in production, set availability to 0
  if (equipment.status !== EQUIPMENT_STATUSES.IN_PRODUCTION) {
    availability = 0;
  }

  return {
    mtbf: Math.round(mtbf * 100) / 100,
    mttr: Math.round(mttr * 100) / 100,
    timeSinceAcquisition: Math.round(timeSinceAcquisition * 100) / 100,
    operatingTime: Math.round(operatingTime * 100) / 100,
    downtime: Math.round(downtime * 100) / 100,
    availability: Math.round(availability * 100) / 100
  };
}

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
    Equipment.find(query).sort(sortSpec).skip(skip).limit(Number(limit)).populate('category').populate('type').lean(),
    Equipment.countDocuments(query)
  ]);

  // Calculate maintenance metrics for each equipment
  const metricsPromises = items.map(item => calculateMetrics(item));
  const metricsResults = await Promise.all(metricsPromises);
  items.forEach((item, index) => {
    item.mtbf = metricsResults[index].mtbf;
    item.mttr = metricsResults[index].mttr;
    item.timeSinceAcquisition = metricsResults[index].timeSinceAcquisition;
    item.operatingTime = metricsResults[index].operatingTime;
    item.downtime = metricsResults[index].downtime;
    item.availability = metricsResults[index].availability;
  });

  return res.status(200).json({ equipment: items, page: Number(page), total });
});

// GET /api/equipment/:id
router.get('/:id', requireUser, async (req, res) => {
   const { id } = req.params;
   const equipment = await Equipment.findById(id).populate('category').populate('type').lean();
   if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

   // Calculate maintenance metrics
   const metrics = await calculateMetrics(equipment);
   equipment.mtbf = metrics.mtbf;
   equipment.mttr = metrics.mttr;
   equipment.timeSinceAcquisition = metrics.timeSinceAcquisition;
   equipment.operatingTime = metrics.operatingTime;
   equipment.downtime = metrics.downtime;
   equipment.availability = metrics.availability;

   return res.status(200).json({ equipment });
 });

 // GET /api/equipment/:id/parts
router.get('/:id/parts', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page = 1, startDate, endDate } = req.query;
    
    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);
    
    const result = await EquipmentPartsService.get(id,req.user._id,{
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
    
    const populated = await Equipment.findById(created._id)
      .populate('category')
      .populate('type')
      .populate('lastStatusChangedBy', 'email role')
      .lean();
    
    return res.status(201).json({ success: true, equipment: populated });
  } catch (error) {
    console.error('Create equipment error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create equipment' });
  }
});

// PATCH /api/equipment/:id
router.patch('/:id', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','line_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = (req.body || {});
    
    // If status is being changed, use the status service
    if (updates.status) {
      const equipment = await Equipment.findById(id);
      if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
      
      // Extract status change details
      const { status, statusChangeReason, statusChangeNotes } = updates;
      delete updates.status;
      delete updates.statusChangeReason;
      delete updates.statusChangeNotes;
      
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
          notes: statusChangeNotes || ''
        }
      );
      
      return res.status(200).json({ success: true, equipment: result.equipment });
    }
    
    // Regular update without status change
    const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true })
      .populate('category')
      .populate('type')
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
router.post('/:id/', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','mechanic','electrician']), async (req, res) => {
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
router.post('/:id/change-status', requireUser, requireRole(['admin','maintenance_manager','assistant_maintenance_manager','foreman','mechanic','electrician','production_manager','line_manager']), async (req, res) => {
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
router.post('/bulk-change-status', requireUser, requireRole(['admin','maintenance_manager']), async (req, res) => {
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
