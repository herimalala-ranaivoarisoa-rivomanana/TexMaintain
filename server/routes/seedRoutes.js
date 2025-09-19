const express = require('express');
const SeedService = require('../services/seedService');
const { requireUser, requireRole } = require('./middleware/auth');

const router = express.Router();

// Seed admin user
router.post('/admin', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed admin user');
    const result = await SeedService.seedAdminUser();
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        ...(result.credentials && { credentials: result.credentials })
      }
    });
  } catch (error) {
    console.error('Error in seed admin route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed admin user'
    });
  }
});

// Seed equipment types
router.post('/equipment-types', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed equipment types');
    const result = await SeedService.seedEquipmentTypes();
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        created: result.created.length,
        skipped: result.skipped,
        equipment: result.created
      }
    });
  } catch (error) {
    console.error('Error in seed equipment types route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed equipment types'
    });
  }
});

// Seed parts
router.post('/parts', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed parts');
    const result = await SeedService.seedParts();

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        created: result.created.length,
        skipped: result.skipped,
        parts: result.created
      }
    });
  } catch (error) {
    console.error('Error in seed parts route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed parts'
    });
  }
});

module.exports = router;