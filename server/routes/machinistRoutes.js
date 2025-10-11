const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Machinist } = require('../models/Machinist');

const router = express.Router();

// GET /api/machinists - Get all machinists with pagination and filters
router.get('/', requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 50, q, isActive } = req.query;

    const query = {};
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
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

    const [machinists, total] = await Promise.all([
      Machinist.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Machinist.countDocuments(query)
    ]);

    return res.status(200).json({
      machinists,
      page: Number(page),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get machinists error:', error);
    return res.status(500).json({ message: 'Failed to fetch machinists' });
  }
});

// GET /api/machinists/:id - Get single machinist
router.get('/:id', requireUser, async (req, res) => {
  try {
    const machinist = await Machinist.findById(req.params.id).lean();
    
    if (!machinist) {
      return res.status(404).json({ message: 'Machinist not found' });
    }
    
    return res.status(200).json(machinist);
  } catch (error) {
    console.error('Get machinist error:', error);
    return res.status(500).json({ message: 'Failed to fetch machinist' });
  }
});

// POST /api/machinists - Create new machinist
router.post('/', requireUser, requireRole(['admin', 'production_manager', 'line_manager']), async (req, res) => {
  try {
    const { matricule, firstName, lastName, isActive } = req.body;

    // Validate required fields
    if (!matricule || !firstName || !lastName) {
      return res.status(400).json({ message: 'Matricule, first name, and last name are required' });
    }

    // Check if matricule already exists
    const existing = await Machinist.findOne({ matricule });
    if (existing) {
      return res.status(400).json({ message: 'A machinist with this matricule already exists' });
    }

    const machinist = new Machinist({
      matricule,
      firstName,
      lastName,
      isActive: isActive !== undefined ? isActive : true
    });

    await machinist.save();

    return res.status(201).json(machinist);
  } catch (error) {
    console.error('Create machinist error:', error);
    return res.status(500).json({ message: 'Failed to create machinist' });
  }
});

// PUT /api/machinists/:id - Update machinist
router.put('/:id', requireUser, requireRole(['admin', 'production_manager', 'line_manager']), async (req, res) => {
  try {
    const { matricule, firstName, lastName, isActive } = req.body;

    // Check if matricule is being changed and if it already exists
    if (matricule) {
      const existing = await Machinist.findOne({ 
        matricule, 
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ message: 'A machinist with this matricule already exists' });
      }
    }

    const updateData = {};
    if (matricule !== undefined) updateData.matricule = matricule;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (isActive !== undefined) updateData.isActive = isActive;

    const machinist = await Machinist.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!machinist) {
      return res.status(404).json({ message: 'Machinist not found' });
    }

    return res.status(200).json(machinist);
  } catch (error) {
    console.error('Update machinist error:', error);
    return res.status(500).json({ message: 'Failed to update machinist' });
  }
});

// DELETE /api/machinists/:id - Delete machinist (soft delete by setting isActive to false)
router.delete('/:id', requireUser, requireRole(['admin', 'production_manager']), async (req, res) => {
  try {
    const machinist = await Machinist.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!machinist) {
      return res.status(404).json({ message: 'Machinist not found' });
    }

    return res.status(200).json({ message: 'Machinist deactivated successfully' });
  } catch (error) {
    console.error('Delete machinist error:', error);
    return res.status(500).json({ message: 'Failed to delete machinist' });
  }
});

module.exports = router;
