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

// Seed equipment categories
router.post('/equipment-categories', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed equipment categories');
    const result = await SeedService.seedEquipmentCategories();

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        created: result.created.length,
        skipped: result.skipped,
        categories: result.created
      }
    });
  } catch (error) {
    console.error('Error in seed equipment categories route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed equipment categories'
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
        types: result.created
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

// Seed equipment (sample data)
router.post('/equipment', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed equipment');
    const result = await SeedService.seedEquipment();

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
    console.error('Error in seed equipment route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed equipment'
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

// Seed brands
router.post('/brands', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Received request to seed brands');
    const result = await SeedService.seedBrands();

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        created: result.created.length,
        skipped: result.skipped,
        brands: result.created
      }
    });
  } catch (error) {
    console.error('Error in seed brands route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to seed brands'
    });
  }
});

// Seed all data (comprehensive seeder)
router.post('/all', requireUser, requireRole('admin'), async (req, res) => {
  try {
    console.log('Starting comprehensive database seeding...');

    const results = {};

    // Seed admin user
    try {
      results.admin = await SeedService.seedAdminUser();
      console.log('Admin user seeding completed');
    } catch (error) {
      console.log('Admin user seeding skipped (may already exist):', error.message);
      results.admin = { message: 'Admin user may already exist' };
    }

    // Seed equipment categories
    try {
      results.categories = await SeedService.seedEquipmentCategories();
      console.log('Equipment categories seeding completed');
    } catch (error) {
      console.error('Error seeding categories:', error);
      results.categories = { error: error.message };
    }

    // Seed equipment types
    try {
      results.types = await SeedService.seedEquipmentTypes();
      console.log('Equipment types seeding completed');
    } catch (error) {
      console.error('Error seeding types:', error);
      results.types = { error: error.message };
    }

    // Seed sample equipment
    try {
      results.equipment = await SeedService.seedEquipment();
      console.log('Sample equipment seeding completed');
    } catch (error) {
      console.error('Error seeding equipment:', error);
      results.equipment = { error: error.message };
    }

    // Seed parts
    try {
      results.parts = await SeedService.seedParts();
      console.log('Parts seeding completed');
    } catch (error) {
      console.error('Error seeding parts:', error);
      results.parts = { error: error.message };
    }

    // Seed brands
    try {
      results.brands = await SeedService.seedBrands();
      console.log('Brands seeding completed');
    } catch (error) {
      console.error('Error seeding brands:', error);
      results.brands = { error: error.message };
    }

    console.log('Comprehensive database seeding completed');

    res.status(200).json({
      success: true,
      message: 'Comprehensive database seeding completed',
      results
    });
  } catch (error) {
    console.error('Error in comprehensive seeding route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete comprehensive seeding'
    });
  }
});

module.exports = router;