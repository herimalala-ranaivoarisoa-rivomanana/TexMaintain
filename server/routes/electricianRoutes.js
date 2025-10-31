const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Electrician } = require('../models/Electrician');

const router = express.Router();

// GET /api/electricians - Get all electricians with pagination and filters
router.get('/', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 50, q, isActive, specialization } = req.query;

    const query = {};
    
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
      Electrician.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Electrician.countDocuments(query)
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
    const electrician = await Electrician.findById(req.params.id).lean();
    
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
    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Validate required fields
    if (!matricule || !firstName || !lastName) {
      return res.status(400).json({ message: 'Matricule, first name, and last name are required' });
    }

    // Check if matricule already exists
    const existing = await Electrician.findOne({ matricule });
    if (existing) {
      return res.status(400).json({ message: 'An electrician with this matricule already exists' });
    }

    const electrician = new Electrician({
      matricule,
      firstName,
      lastName,
      specialization,
      certifications,
      isActive: isActive !== undefined ? isActive : true
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
    const { matricule, firstName, lastName, specialization, certifications, isActive } = req.body;

    // Check if matricule is being changed and if it already exists
    if (matricule) {
      const existing = await Electrician.findOne({ 
        matricule, 
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ message: 'An electrician with this matricule already exists' });
      }
    }

    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (isActive !== undefined) updateData.isActive = isActive;

    const electrician = await Electrician.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!electrician) {
      return res.status(404).json({ message: 'Electrician not found' });
    }

    return res.status(200).json(electrician);
  } catch (error) {
    console.error('Update electrician error:', error);
    return res.status(500).json({ message: 'Failed to update electrician' });
  }
});

// DELETE /api/electricians/:id - Delete electrician (soft delete by setting isActive to false)
router.delete('/:id', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  try {
    const electrician = await Electrician.findByIdAndUpdate(
      req.params.id,
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
