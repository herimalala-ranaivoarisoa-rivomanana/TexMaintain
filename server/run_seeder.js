const mongoose = require('mongoose');
const SeedService = require('./services/seedService');
require('dotenv').config();

async function runSeeder() {
    try {
        // Connect to MongoDB
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        console.log(`Connecting to MongoDB at ${mongoUri}...`);
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected');

        console.log('Starting comprehensive seeding...');

        // 1. Admin User
        try {
            await SeedService.seedAdminUser();
            console.log('Admin user seeded.');
        } catch (e) { console.log('Admin user seed skipped/failed:', e.message); }

        // 2. Categories
        try {
            await SeedService.seedEquipmentCategories();
            console.log('Categories seeded.');
        } catch (e) { console.log('Categories seed failed:', e.message); }

        // 3. Types
        try {
            await SeedService.seedEquipmentTypes();
            console.log('Types seeded.');
        } catch (e) { console.log('Types seed failed:', e.message); }

        // 4. Brands
        try {
            await SeedService.seedBrands();
            console.log('Brands seeded.');
        } catch (e) { console.log('Brands seed failed:', e.message); }

        // 5. Equipment (includes new logic for 30+ items)
        try {
            await SeedService.seedEquipment();
            console.log('Equipment seeded.');
        } catch (e) { console.log('Equipment seed failed:', e.message); }

        // 6. Parts
        try {
            await SeedService.seedParts();
            console.log('Parts seeded.');
        } catch (e) { console.log('Parts seed failed:', e.message); }

        // 7. Production Lines (New)
        try {
            await SeedService.seedProductionLines();
            console.log('Production Lines seeded.');
        } catch (e) { console.log('Production Lines seed failed:', e.message); }

        // 8. Equipment Parts
        try {
            await SeedService.seedEquipmentParts();
            console.log('Equipment Parts seeded.');
        } catch (e) { console.log('Equipment Parts seed failed:', e.message); }

        // 9. Maintenance Personnel
        try {
            await SeedService.seedMaintenancePersonnel();
            console.log('Maintenance Personnel seeded.');
        } catch (e) { console.log('Maintenance Personnel seed failed:', e.message); }

        // 10. Interventions
        try {
            await SeedService.seedInterventions();
            console.log('Interventions seeded.');
        } catch (e) { console.log('Interventions seed failed:', e.message); }

        // 11. Projects
        try {
            await SeedService.seedProjects();
            console.log('Projects seeded.');
        } catch (e) { console.log('Projects seed failed:', e.message); }

        console.log('Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seeder failed:', error);
        process.exit(1);
    }
}

runSeeder();
