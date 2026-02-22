const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const { Asset, ASSET_STATUSES } = require('../models/Asset');
const { Category } = require('../models/Category');
const { SubCategory } = require('../models/SubCategory');
const { Part } = require('../models/Part');
const { Intervention } = require('../models/Intervention');
const { AssetStatusHistory, STATUS_METADATA } = require('../models/AssetStatusHistory');
const AssetPart = require('../models/AssetPart'); // Needs refactor later?
const AssetStatusService = require('../services/assetStatusService');
const AssetPartsService = require('../services/assetPartsService');
const { requireUser, requireRole } = require('./middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for status media uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/status-media';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'status-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// GET /api/assets
router.get('/', requireUser, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      subCategory, // Was type
      status,
      search,
      assetClass
    } = req.query;

    const query = {};
    if (req.activeFactoryId) {
      query.factory = new mongoose.Types.ObjectId(req.activeFactoryId);
    }

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory; // Changed from type
    if (assetClass) query.assetClass = assetClass;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Use aggregation for better performance with large datasets
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // We used find().countDocuments() in original, sticking to simple find for now unless perf needed
    const assets = await Asset.find(query)
      .populate('category', 'name')
      .populate('subCategory', 'name') // Changed from type
      .populate('assetClass', 'name')
      .populate('brand', 'name')
      .populate('productionLine', 'name')
      .populate('processArea', 'name')
      .populate('processSection', 'name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Asset.countDocuments(query);

    res.json({
      assets,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalAssets: total
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Error fetching assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('assetClass', 'name')
      .populate('brand', 'name')
      .populate('productionLine', 'name')
      .populate('productionSection', 'name')
      .populate('processArea', 'name')
      .populate('processSection', 'name')
      .populate('lastStatusChangedBy', 'email role')
      .lean();

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    return res.status(200).json({ asset });
  } catch (error) {
    console.error('Get asset error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get asset' });
  }
});

// GET /api/assets/:id/interventions
router.get('/:id/interventions', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, type, status, q, sort = 'createdDate', order = 'desc' } = req.query;

    const asset = await Asset.findById(id).lean();
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const query = { assetId: id };
    if (type) query.type = type;
    if (status) query.status = status;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
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
      asset,
      interventions,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get asset interventions error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get asset interventions' });
  }
});

// GET /api/assets/:id/consumable
router.get('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, skip = 0 } = req.query;

    // Get asset info
    const asset = await Asset.findById(id)
      .populate('category')
      .populate('subCategory')
      .lean();

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // First, get all consumable part IDs
    const { Part } = require('../models/Part');
    const consumableParts = await Part.find({ type: 'consumable' }).select('_id').lean();
    const consumablePartIds = consumableParts.map(p => p._id);

    // Then filter AssetParts by asset and consumable part IDs
    const assetParts = await AssetPart.find({
      asset: id,
      part: { $in: consumablePartIds }
    })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await AssetPart.countDocuments({
      asset: id,
      part: { $in: consumablePartIds }
    });

    return res.status(200).json({
      asset,
      assetParts,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get asset consumables error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get asset consumables' });
  }
});

// POST /api/assets/:id/consumable
const consumableSchema = z.object({
  part: z.string(),
  quantity: z.number().min(1),
});

router.post('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const parse = consumableSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    const created = await AssetPart.create({
      asset: id,
      part: parse.data.part,
      quantity: parse.data.quantity,
      changedBy: req.user._id
    });

    const populated = await AssetPart.findById(created._id)
      .populate('part', 'name partNumber')
      .populate('changedBy', 'email role')
      .lean();

    return res.status(201).json({ success: true, assetPart: populated });
  } catch (error) {
    console.error('Create asset consumable error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create asset consumable' });
  }
});

// POST /api/assets
const assetSchema = z.object({
  category: z.string().min(1), // ObjectId as string
  subCategory: z.string().min(1), // ObjectId as string (was type)
  status: z.enum(Object.values(ASSET_STATUSES)).optional(),
  location: z.string().min(1),
  name: z.string().optional(),
  code: z.string().optional(),
  assetClass: z.string().optional(),
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
    const parse = assetSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });

    // Transform empty strings to undefined for ObjectId fields
    const assetData = {
      ...parse.data,
      brand: parse.data.brand && parse.data.brand.trim() !== '' ? parse.data.brand : undefined,
      status: parse.data.status || ASSET_STATUSES.STORED,
      lastStatusChangedBy: req.user._id,
      lastStatusChange: new Date(),
      factory: req.activeFactoryId // Assign to current factory
    };

    const created = await Asset.create(assetData);

    // Create initial status history entry (without validation since it's the first status)
    await AssetStatusHistory.create({
      asset: created._id,
      previousStatus: null,
      newStatus: created.status,
      changedBy: req.user._id,
      reason: 'Initial asset creation',
      notes: 'Asset added to system',
      timestamp: new Date()
    });

    // Dupliquer automatiquement les associations de pièces/consommables
    // depuis d'autres assets du même subCategory
    let duplicatedPartsCount = 0;
    if (created.subCategory) {
      try {
        // Trouver un asset de référence du même subCategory
        const referenceAsset = await Asset.findOne({
          subCategory: created.subCategory,
          _id: { $ne: created._id }
        }).lean();

        if (referenceAsset) {
          // Récupérer toutes les associations de l'asset de référence
          const referenceAssociations = await AssetPart.find({
            asset: referenceAsset._id
          }).lean();

          if (referenceAssociations.length > 0) {
            // Créer les mêmes associations pour le nouvel asset
            const newAssociations = referenceAssociations.map(assoc => {
              // Calculer les valeurs (car insertMany ne déclenche pas le hook pre-save)
              const annualConsumption = assoc.quantityPerMachine * assoc.replacementFrequencyPerYear;
              const dailyConsumption = annualConsumption / 365;
              const safetyStock = Math.ceil(dailyConsumption * assoc.leadTimeDays * assoc.safetyCoefficient);
              const reorderPoint = Math.ceil(safetyStock + (dailyConsumption * assoc.leadTimeDays));

              return {
                asset: created._id,
                part: assoc.part,
                quantityPerMachine: assoc.quantityPerMachine,
                replacementFrequencyPerYear: assoc.replacementFrequencyPerYear,
                criticality: assoc.criticality,
                criticalityScore: assoc.criticalityScore,
                machineImportance: assoc.machineImportance,
                leadTimeDays: assoc.leadTimeDays,
                safetyCoefficient: assoc.safetyCoefficient,
                isStandardPart: assoc.isStandardPart,
                notes: assoc.notes ? `Auto-duplicated from reference asset. ${assoc.notes}` : 'Auto-duplicated from reference asset',
                changedBy: req.user._id,
                // Valeurs calculées
                annualConsumption: annualConsumption,
                dailyConsumption: dailyConsumption,
                safetyStock: safetyStock,
                reorderPoint: reorderPoint
              };
            });

            await AssetPart.insertMany(newAssociations);
            duplicatedPartsCount = newAssociations.length;

            // Recalculer le min/max pour chaque pièce dupliquée
            const uniqueParts = [...new Set(newAssociations.map(a => a.part.toString()))];
            for (const partId of uniqueParts) {
              try {
                await AssetPartsService.recalculateMinMaxForPart(partId);
                console.log(`Min/Max recalculated for part ${partId}`);
              } catch (recalcError) {
                console.error(`Error recalculating min/max for part ${partId}:`, recalcError);
              }
            }
          }
        }
      } catch (dupError) {
        console.error('Error duplicating parts to new asset:', dupError);
        // Don't fail asset creation
      }
    }

    const populated = await Asset.findById(created._id)
      .populate('category')
      .populate('subCategory')
      .populate('lastStatusChangedBy', 'email role')
      .lean();

    return res.status(201).json({
      success: true,
      asset: populated,
      duplicatedPartsCount,
      message: duplicatedPartsCount > 0
        ? `Asset created with ${duplicatedPartsCount} part(s)/consumable(s) auto-duplicated. Min/Max recalculated.`
        : 'Asset created'
    });
  } catch (error) {
    console.error('Create asset error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create asset' });
  }
});

// PATCH /api/assets/:id
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
      const asset = await Asset.findById(id);
      if (!asset) return res.status(404).json({ message: 'Asset not found' });

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
        await Asset.findByIdAndUpdate(id, updates);
      }

      // Change status with tracking
      const result = await AssetStatusService.changeStatus(
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

      return res.status(200).json({ success: true, asset: result.asset });
    }

    // Regular update without status change
    const updated = await Asset.findByIdAndUpdate(id, updates, { new: true })
      .populate('category')
      .populate('subCategory')
      .populate('brand')
      .populate('lastStatusChangedBy', 'email role')
      .lean();

    if (!updated) return res.status(404).json({ message: 'Asset not found' });
    return res.status(200).json({ success: true, asset: updated });
  } catch (error) {
    console.error('Update asset error:', error);
    return res.status(400).json({ message: error.message || 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Asset.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Asset not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete asset error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete asset' });
  }
});

// POST /api/assets/:id/change-status
// Change asset status with tracking
router.post('/:id/change-status', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager', 'foreman', 'mechanic', 'electrician', 'production_manager', 'line_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription, media } = req.body;

    console.log('Status change request:', { status, reason, notes, machinistId, mechanicId, electricianId, maintenanceWorkerId });

    if (!status || status.trim() === '') {
      return res.status(400).json({ message: 'Status is required' });
    }

    // If status is "in_production", machinistId is required
    if (status === 'in_production' && !machinistId) {
      return res.status(400).json({ message: 'Machinist is required when setting asset to In Production' });
    }

    // Maintenance statuses requiring personnel
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance', 'in_workshop'];
    if (maintenanceStatuses.includes(status) && !mechanicId && !electricianId && !maintenanceWorkerId) {
      const statusLabel = STATUS_METADATA[status]?.label || status;
      return res.status(400).json({
        message: `At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to ${statusLabel}`
      });
    }

    const result = await AssetStatusService.changeStatus(
      id,
      status,
      req.user._id,
      { reason, notes, interventionId, machinistId, mechanicId, electricianId, maintenanceWorkerId, breakdownType, breakdownDescription, media }
    );

    return res.status(200).json({
      success: true,
      asset: result.asset,
      historyEntry: result.historyEntry
    });
  } catch (error) {
    console.error('Change status error:', error);
    return res.status(400).json({ message: error.message || 'Failed to change status' });
  }
});

// GET /api/assets/:id/status-history
router.get('/:id/status-history', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page = 1, startDate, endDate } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await AssetStatusService.getStatusHistory(id, {
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

// GET /api/assets/:id/timeline
// Get unified timeline for an asset (status changes, interventions, parts usage)
router.get('/:id/timeline', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, page = 1, startDate, endDate, eventTypes } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    // Parse event types from query string
    let types = ['all'];
    if (eventTypes) {
      types = typeof eventTypes === 'string' ? eventTypes.split(',') : eventTypes;
    }

    const AssetTimelineService = require('../services/assetTimelineService');
    const result = await AssetTimelineService.getUnifiedTimeline(id, {
      limit: parseInt(limit) || 50,
      skip,
      startDate,
      endDate,
      eventTypes: types
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get asset timeline error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get asset timeline' });
  }
});

// GET /api/assets/:id/timeline/statistics
// Get timeline statistics for an asset
router.get('/:id/timeline/statistics', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const AssetTimelineService = require('../services/assetTimelineService');
    const stats = await AssetTimelineService.getTimelineStatistics(id, {
      startDate,
      endDate
    });

    return res.status(200).json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Get timeline statistics error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get timeline statistics' });
  }
});

// GET /api/assets/:id/status-statistics
// Get status statistics for an asset
router.get('/:id/status-statistics', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await AssetStatusService.getStatusStatistics(id, {
      startDate,
      endDate
    });

    return res.status(200).json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Get status statistics error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get status statistics' });
  }
});

// GET /api/assets/:id/allowed-transitions
// Get allowed status transitions for an asset
router.get('/:id/allowed-transitions', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const transitions = await AssetStatusService.getAllowedTransitions(id);
    return res.status(200).json({ success: true, transitions });
  } catch (error) {
    console.error('Get allowed transitions error:', error);
    return res.status(400).json({ message: error.message || 'Failed to get allowed transitions' });
  }
});

// GET /api/assets/status/:status
// Get all assets with a specific status
router.get('/status/:status', requireUser, async (req, res) => {
  try {
    const { status } = req.params;
    const { limit, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await AssetStatusService.getAssetByStatus(status, {
      limit: parseInt(limit) || 50,
      skip
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get assets by status error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get assets by status' });
  }
});

// GET /api/assets/category/:category
// Get all assets in a status category (production, maintenance, out_of_service)
router.get('/category/:category', requireUser, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * (parseInt(limit) || 50);

    const result = await AssetStatusService.getAssetByCategory(category, {
      limit: parseInt(limit) || 50,
      skip
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get assets by category error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get assets by category' });
  }
});

// POST /api/assets/bulk-change-status
// Bulk change status for multiple assets
router.post('/bulk-change-status', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const { assetIds, status, reason, notes } = req.body;
    // Support both assetIds and assetIds for backward compatibility
    const ids = assetIds || req.body.assetIds;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'assetIds array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const results = await AssetStatusService.bulkChangeStatus(
      ids,
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

// GET /api/assets/statuses/metadata
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
