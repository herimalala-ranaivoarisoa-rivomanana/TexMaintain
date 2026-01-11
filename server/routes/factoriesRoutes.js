const express = require('express');
const { requireUser, requireRole } = require('./middleware/auth');
const { Factory } = require('../models/Factory');

const router = express.Router();

// GET /api/factories - Get all factories
router.get('/', requireUser, async (req, res) => {
  try {
    const { isActive, q } = req.query;
    
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } }
      ];
    }
    
    const factories = await Factory.find(query).sort({ name: 1 }).lean();
    return res.status(200).json({ factories });
  } catch (error) {
    console.error('Error fetching factories:', error);
    return res.status(500).json({ message: 'Error fetching factories', error: error.message });
  }
});

// GET /api/factories/:id - Get a single factory
router.get('/:id', requireUser, async (req, res) => {
  try {
    const factory = await Factory.findById(req.params.id).lean();
    
    if (!factory) {
      return res.status(404).json({ message: 'Factory not found' });
    }
    
    return res.status(200).json({ factory });
  } catch (error) {
    console.error('Error fetching factory:', error);
    return res.status(500).json({ message: 'Error fetching factory', error: error.message });
  }
});

// POST /api/factories - Create a new factory (admin only)
router.post('/', requireUser, requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, address, description, settings, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    
    const factory = new Factory({
      name,
      code: code.toUpperCase(),
      address,
      description,
      settings: settings || {},
      isActive: isActive !== undefined ? isActive : true
    });
    
    await factory.save();
    
    return res.status(201).json({ 
      message: 'Factory created successfully',
      factory 
    });
  } catch (error) {
    console.error('Error creating factory:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Factory with this ${field} already exists` 
      });
    }
    
    return res.status(500).json({ message: 'Error creating factory', error: error.message });
  }
});

// PATCH /api/factories/:id - Update a factory (admin only)
router.patch('/:id', requireUser, requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, address, description, settings, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const factory = await Factory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    if (!factory) {
      return res.status(404).json({ message: 'Factory not found' });
    }
    
    return res.status(200).json({ 
      message: 'Factory updated successfully',
      factory 
    });
  } catch (error) {
    console.error('Error updating factory:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Factory with this ${field} already exists` 
      });
    }
    
    return res.status(500).json({ message: 'Error updating factory', error: error.message });
  }
});

// DELETE /api/factories/:id - Delete a factory (admin only)
router.delete('/:id', requireUser, requireRole(['admin']), async (req, res) => {
  try {
    const factory = await Factory.findByIdAndDelete(req.params.id).lean();
    
    if (!factory) {
      return res.status(404).json({ message: 'Factory not found' });
    }
    
    return res.status(200).json({ 
      message: 'Factory deleted successfully',
      factory 
    });
  } catch (error) {
    console.error('Error deleting factory:', error);
    return res.status(500).json({ message: 'Error deleting factory', error: error.message });
  }
});

module.exports = router;
