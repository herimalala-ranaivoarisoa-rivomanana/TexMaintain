const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Personnel } = require('../models/Personnel');

const router = express.Router();

// GET /api/electricians - Get all electricians with pagination and filters
router.get('/', requireUser, async (req, res) => {
  try {
    const factoryId = req.activeFactoryId || req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }

    const { page = 1, limit = 50, q, isActive, specialization } = req.query;

    const query = { factory: new mongoose.Types.ObjectId(factoryId), role: 'Electrician' };

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

    const [electricians, total] = await Promise.all([
      Personnel.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Personnel.countDocuments(query)
    ]);

    return res.status(200).json({
      electricians,
      page: Number(page),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get electricians error:', error);
    return res.status(500).json({ message: 'Failed to fetch electricians' });
  }
});

// GET /api/electricians/:id - Get single electrician
router.get('/:id', requireUser, async (req, res) => {
  try {
    const factoryId = req.activeFactoryId || req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }
    const electrician = await Personnel.findOne({ ...query, role: 'Electrician' }).lean();

    if (!electrician) {
      return res.status(404).json({ message: 'Electrician not found' });
    }

    return res.status(200).json(electrician);
  } catch (error) {
    console.error('Get electrician error:', error);
    return res.status(500).json({ message: 'Failed to fetch electrician' });
  }
});

// POST /api/electricians - Create new electrician
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.activeFactoryId || req.header('x-factory-id');
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
      role: 'Electrician'
    });
    if (existing) {
      return res.status(400).json({ message: 'An electrician with this matricule already exists in this factory' });
    }

    const electrician = new Personnel({
      matricule,
      firstName,
      lastName,
      specialization,
      certifications,
      isActive: isActive !== undefined ? isActive : true,
      factory: factoryId,
      role: 'Electrician'
    });

    await electrician.save();

    return res.status(201).json(electrician);
  } catch (error) {
    console.error('Create electrician error:', error);
    return res.status(500).json({ message: 'Failed to create electrician' });
  }
});

// PUT /api/electricians/:id - Update electrician
router.put('/:id', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.activeFactoryId || req.header('x-factory-id');

    // Ensure electrician belongs to factory on update
    const existingElectrician = await Personnel.findOne({
      _id: req.params.id,
      role: 'Electrician',
      ...(factoryId && { factory: new mongoose.Types.ObjectId(factoryId) })
    });

    if (!existingElectrician) {
      return res.status(404).json({ message: 'Electrician not found' });
    }

    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Check if matricule is being changed and if it already exists
    if (matricule) {
      const existing = await Personnel.findOne({
        matricule,
        _id: { $ne: req.params.id },
        factory: existingElectrician.factory,
        role: 'Electrician'
      });
      if (existing) {
        return res.status(400).json({ message: 'An electrician with this matricule already exists in this factory' });
      }
    }

    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (isActive !== undefined) updateData.isActive = isActive;

    const electrician = await Personnel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json(electrician);
  } catch (error) {
    console.error('Update electrician error:', error);
    return res.status(500).json({ message: 'Failed to update electrician' });
  }
});

// DELETE /api/electricians/:id - Delete electrician (soft delete by setting isActive to false)
router.delete('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.activeFactoryId || req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }

    const electrician = await Personnel.findOneAndUpdate(
      { ...query, role: 'Electrician' },
      { isActive: false },
      { new: true }
    );

    if (!electrician) {
      return res.status(404).json({ message: 'Electrician not found' });
    }

    return res.status(200).json({ message: 'Electrician deactivated successfully' });
  } catch (error) {
    console.error('Delete electrician error:', error);
    return res.status(500).json({ message: 'Failed to delete electrician' });
  }
});

module.exports = router;
