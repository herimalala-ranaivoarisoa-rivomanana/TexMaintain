const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Personnel } = require('../models/Personnel');

const router = express.Router();

// GET /api/maintenance-workers - Get all maintenance workers with pagination and filters
router.get('/', requireUser, async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }

    const { page = 1, limit = 50, q, isActive, specialization } = req.query;

    const query = { factory: new mongoose.Types.ObjectId(factoryId), role: 'MaintenanceWorker' };

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = specialization;
    }

    // Search by name or matricule
    if (q) {
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { matricule: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [workers, total] = await Promise.all([
      Personnel.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Personnel.countDocuments(query)
    ]);

    return res.status(200).json({
      workers,
      page: Number(page),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get maintenance workers error:', error);
    return res.status(500).json({ message: 'Failed to fetch maintenance workers' });
  }
});

// GET /api/maintenance-workers/:id - Get single maintenance worker
router.get('/:id', requireUser, async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }
    const worker = await Personnel.findOne({ ...query, role: 'MaintenanceWorker' }).lean();

    if (!worker) {
      return res.status(404).json({ message: 'Maintenance worker not found' });
    }

    return res.status(200).json(worker);
  } catch (error) {
    console.error('Get maintenance worker error:', error);
    return res.status(500).json({ message: 'Failed to fetch maintenance worker' });
  }
});

// POST /api/maintenance-workers - Create new maintenance worker
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }

    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Validate required fields
    if (!matricule || !firstName || !lastName) {
      return res.status(400).json({ message: 'Matricule, first name, and last name are required' });
    }

    // Check if matricule already exists
    const existing = await Personnel.findOne({
      matricule,
      factory: new mongoose.Types.ObjectId(factoryId),
      role: 'MaintenanceWorker'
    });
    if (existing) {
      return res.status(400).json({ message: 'A maintenance worker with this matricule already exists in this factory' });
    }

    const worker = new Personnel({
      matricule,
      firstName,
      lastName,
      specialization,
      certifications,
      isActive: isActive !== undefined ? isActive : true,
      factory: factoryId,
      role: 'MaintenanceWorker'
    });

    await worker.save();

    return res.status(201).json(worker);
  } catch (error) {
    console.error('Create maintenance worker error:', error);
    return res.status(500).json({ message: 'Failed to create maintenance worker' });
  }
});

// PUT /api/maintenance-workers/:id - Update maintenance worker
router.put('/:id', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');

    // Ensure worker belongs to factory on update
    const existingWorker = await Personnel.findOne({
      _id: req.params.id,
      role: 'MaintenanceWorker',
      ...(factoryId && { factory: new mongoose.Types.ObjectId(factoryId) })
    });

    if (!existingWorker) {
      return res.status(404).json({ message: 'Maintenance worker not found' });
    }

    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Check if matricule is being changed and if it already exists
    if (matricule) {
      const existing = await Personnel.findOne({
        matricule,
        _id: { $ne: req.params.id },
        factory: existingWorker.factory,
        role: 'MaintenanceWorker'
      });
      if (existing) {
        return res.status(400).json({ message: 'A maintenance worker with this matricule already exists in this factory' });
      }
    }

    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (isActive !== undefined) updateData.isActive = isActive;

    const worker = await Personnel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json(worker);
  } catch (error) {
    console.error('Update maintenance worker error:', error);
    return res.status(500).json({ message: 'Failed to update maintenance worker' });
  }
});

// DELETE /api/maintenance-workers/:id - Delete maintenance worker (soft delete by setting isActive to false)
router.delete('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }

    const worker = await Personnel.findOneAndUpdate(
      { ...query, role: 'MaintenanceWorker' },
      { isActive: false },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ message: 'Maintenance worker not found' });
    }

    return res.status(200).json({ message: 'Maintenance worker deactivated successfully' });
  } catch (error) {
    console.error('Delete maintenance worker error:', error);
    return res.status(500).json({ message: 'Failed to delete maintenance worker' });
  }
});

module.exports = router;
