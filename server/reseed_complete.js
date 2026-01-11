require('dotenv').config();
const mongoose = require('mongoose');
const SeedService = require('./services/seedService');

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';

const seedDatabase = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        // 1. CLEAR DATABASE (Except Users/Factories)
        await SeedService.clearDatabase();

        // 2. CORE STRUCTURE
        await SeedService.seedFactories(); // Ensures factories exist
        await SeedService.seedProcessAreas(); // Line 1, Line 2 etc. per factory

        // 3. LOOKUP DATA
        await SeedService.seedBrands();
        await SeedService.seedAssetCategories();
        await SeedService.seedSubCategorys();

        // 4. INVENTORY
        await SeedService.seedParts(); // Now per-factory

        // 5. ASSETS
        await SeedService.seedAsset(); // Already factory-aware
        await SeedService.seedAssetParts(); // Associations

        // 6. OPERATIONAL DATA
        await SeedService.seedProjects(); // Now per-factory
        await SeedService.seedMaintenancePersonnel();
        await SeedService.seedInterventions(); // Now linked to asset factory

        console.log('✅✅ FULL RESET AND RESEED COMPLETED SUCCESSFULLY! ✅✅');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
