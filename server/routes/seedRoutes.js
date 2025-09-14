const express = require('express');
const SeedService = require('../services/seedService');

const router = express.Router();

// Seed admin user
router.post('/admin', async (req, res) => {
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
router.post('/equipment-types', async (req, res) => {
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

module.exports = router;