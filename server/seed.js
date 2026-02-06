#!/usr/bin/env node

/**
 * Database Seeder Script
 * Run this script to populate the database with initial data
 *
 * Usage: node seed.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const SeedService = require('./services/seedService');

async function runSeeder() {
  try {
    console.log('🌱 Starting database seeding process...\n');

    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    const results = {};

    // Seed Factories
    console.log('🏭 Seeding factories...');
    try {
      results.factories = await SeedService.seedFactories();
      console.log(`✅ Factories seeded: ${results.factories.created.length} found/created\n`);
    } catch (error) {
      console.error('❌ Error seeding factories:', error.message + '\n');
    }

    // Seed admin user
    console.log('👤 Seeding admin user...');
    try {
      results.admin = await SeedService.seedAdminUser();
      console.log('✅ Admin user seeded successfully');
      console.log(`   Email: ${results.admin.credentials?.email}`);
      console.log(`   Password: ${results.admin.credentials?.password}\n`);
    } catch (error) {
      console.log('⚠️  Admin user seeding skipped (may already exist):', error.message + '\n');
    }

    // Seed maintenance personnel
    console.log('👷 Seeding maintenance personnel...');
    try {
      results.personnel = await SeedService.seedMaintenancePersonnel();
      console.log(`✅ Personnel seeding completed:`);
      console.log(`   - Mechanics: ${results.personnel.results.mechanics.created} created`);
      console.log(`   - Electricians: ${results.personnel.results.electricians.created} created`);
      console.log(`   - Workers: ${results.personnel.results.workers.created} created`);
      console.log(`   - Machinists: ${results.personnel.results.machinists.created} created\n`);
    } catch (error) {
      console.error('❌ Error seeding personnel:', error.message + '\n');
    }

    // Seed asset classes
    console.log('📚 Seeding asset classes...');
    try {
      results.assetClasses = await SeedService.seedAssetClasses();
      console.log(`✅ Asset classes seeded: ${results.assetClasses.created.length} found/created\n`);
    } catch (error) {
      console.error('❌ Error seeding asset classes:', error.message + '\n');
    }

    // Seed categories
    console.log('🏷️  Seeding categories...');
    try {
      results.categories = await SeedService.seedAssetCategories();
      console.log(`✅ Categories seeded: ${results.categories.created} created, ${results.categories.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding categories:', error.message + '\n');
    }

    // Seed sub-categories
    console.log('🔧 Seeding sub-categories...');
    try {
      results.types = await SeedService.seedSubCategorys();
      console.log(`✅ Sub-categories seeded: ${results.types.created} created, ${results.types.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding sub-categories:', error.message + '\n');
    }

    // Seed process areas and sections (moved before asset)
    console.log('🏭 Seeding process areas (ProcessArea/Department)...');
    try {
      results.processAreas = await SeedService.seedProcessAreas();
      console.log(`✅ Process areas seeded: ${results.processAreas.created.length} found/created\n`);
    } catch (error) {
      console.error('❌ Error seeding process areas:', error.message + '\n');
    }

    // Seed brands
    console.log('🏷️  Seeding brands...');
    try {
      results.brands = await SeedService.seedBrands();
      console.log(`✅ Brands seeded: ${results.brands.created} created, ${results.brands.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding brands:', error.message + '\n');
    }

    // Seed sample asset
    console.log('⚙️  Seeding sample asset...');
    try {
      results.asset = await SeedService.seedAsset();
      console.log(`✅ Sample asset seeded: ${results.asset.created} created, ${results.asset.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding asset:', error.message + '\n');
    }

    // Seed interventions (historical data)
    console.log('🛠️  Seeding historical interventions...');
    try {
      results.interventions = await SeedService.seedInterventions();
      console.log(`✅ Interventions seeded: ${results.interventions.created} created, ${results.interventions.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding interventions:', error.message + '\n');
    }

    // Seed parts
    console.log('🔩 Seeding parts...');
    try {
      results.parts = await SeedService.seedParts();
      console.log(`✅ Parts seeded: ${results.parts.created} created, ${results.parts.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding parts:', error.message + '\n');
    }

    // Seed asset parts associations
    console.log('🔗 Seeding asset-parts associations...');
    try {
      results.assetParts = await SeedService.seedAssetParts();
      console.log(`✅ Asset-parts associations seeded: ${results.assetParts.created} created, ${results.assetParts.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding asset-parts:', error.message + '\n');
    }

    // Seed projects
    console.log('📁 Seeding projects...');
    try {
      results.projects = await SeedService.seedProjects();
      console.log(`✅ Projects seeded: ${results.projects.created} created, ${results.projects.skipped} skipped\n`);
    } catch (error) {
      console.error('❌ Error seeding projects:', error.message + '\n');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Admin User: ${results.admin?.success ? 'Created' : 'Skipped'}`);
    console.log(`   - Personnel: ${results.personnel?.results ? 'Created' : 'Skipped'}`);
    console.log(`   - Categories: ${results.categories?.created || 0} created`);
    console.log(`   - Types: ${results.types?.created || 0} created`);
    console.log(`   - Brands: ${results.brands?.created || 0} created`);
    console.log(`   - Asset: ${results.asset?.created || 0} created`);
    console.log(`   - Process areas: ${results.productionLines?.created || 0} created`);
    console.log(`   - Interventions: ${results.interventions?.created || 0} created`);
    console.log(`   - Parts: ${results.parts?.created || 0} created`);
    console.log(`   - Asset-Parts: ${results.assetParts?.created || 0} created`);
    console.log(`   - Projects: ${results.projects?.created || 0} created`);

    if (results.admin?.credentials) {
      console.log('\n🔐 Admin Credentials:');
      console.log(`   Email: ${results.admin.credentials.email}`);
      console.log(`   Password: ${results.admin.credentials.password}`);
    }

    console.log('\n🚀 You can now start the application!');

  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📪 Disconnected from database');
  }
}

// Run the seeder
runSeeder().catch(console.error);