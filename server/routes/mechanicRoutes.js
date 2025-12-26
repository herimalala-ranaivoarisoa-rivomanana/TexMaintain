const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Mechanic } = require('../models/Mechanic');

const router = express.Router();

// GET /api/mechanics - Get all mechanics with pagination and filters
router.get('/', requireUser, async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    if (!factoryId) {
      return res.status(400).json({ message: 'Factory Header Missing' });
    }

    const { page = 1, limit = 50, q, isActive, specialization } = req.query;

    const query = { factory: new mongoose.Types.ObjectId(factoryId) };

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

    const [mechanics, total] = await Promise.all([
      Mechanic.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Mechanic.countDocuments(query)
    ]);

    return res.status(200).json({
      mechanics,
      page: Number(page),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get mechanics error:', error);
    return res.status(500).json({ message: 'Failed to fetch mechanics' });
  }
});

// GET /api/mechanics/:id - Get single mechanic
router.get('/:id', requireUser, async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }

    const mechanic = await Mechanic.findOne(query).lean();

    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    return res.status(200).json(mechanic);
  } catch (error) {
    console.error('Get mechanic error:', error);
    return res.status(500).json({ message: 'Failed to fetch mechanic' });
  }
});

// POST /api/mechanics - Create new mechanic
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

    // Check if matricule already exists IN THE SAME FACTORY
    const existing = await Mechanic.findOne({
      matricule,
      factory: new mongoose.Types.ObjectId(factoryId)
    });
    if (existing) {
      return res.status(400).json({ message: 'A mechanic with this matricule already exists in this factory' });
    }

    const mechanic = new Mechanic({
      matricule,
      firstName,
      lastName,
      specialization,
      certifications,
      isActive: isActive !== undefined ? isActive : true,
      factory: factoryId
    });

    await mechanic.save();

    return res.status(201).json(mechanic);
  } catch (error) {
    console.error('Create mechanic error:', error);
    return res.status(500).json({ message: 'Failed to create mechanic' });
  }
});

// PUT /api/mechanics/:id - Update mechanic
router.put('/:id', requireUser, requireRole(['admin', 'maintenance_manager', 'assistant_maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');

    // Ensure mechanic belongs to factory on update
    const existingMechanic = await Mechanic.findOne({
      _id: req.params.id,
      ...(factoryId && { factory: new mongoose.Types.ObjectId(factoryId) })
    });

    if (!existingMechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Check if matricule is being changed and if it already exists
    if (matricule) {
      const existing = await Mechanic.findOne({
        matricule,
        _id: { $ne: req.params.id },
        factory: existingMechanic.factory
      });
      if (existing) {
        return res.status(400).json({ message: 'A mechanic with this matricule already exists in this factory' });
      }
    }

    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (isActive !== undefined) updateData.isActive = isActive;

    const mechanic = await Mechanic.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json(mechanic);
  } catch (error) {
    console.error('Update mechanic error:', error);
    return res.status(500).json({ message: 'Failed to update mechanic' });
  }
});

// DELETE /api/mechanics/:id - Delete mechanic (soft delete by setting isActive to false)
router.delete('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const factoryId = req.header('x-factory-id');
    const query = { _id: req.params.id };
    if (factoryId) {
      query.factory = new mongoose.Types.ObjectId(factoryId);
    }

    const mechanic = await Mechanic.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );

    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    return res.status(200).json({ message: 'Mechanic deactivated successfully' });
  } catch (error) {
    console.error('Delete mechanic error:', error);
    return res.status(500).json({ message: 'Failed to delete mechanic' });
  }
});

module.exports = router;
