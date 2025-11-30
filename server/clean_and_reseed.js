const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionSection } = require('./models/ProductionSection');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { EquipmentPart } = require('./models/EquipmentPart');
const { EquipmentStatusHistory } = require('./models/EquipmentStatusHistory');
const { Project } = require('./models/Project');
const { ProjectExpense } = require('./models/ProjectExpense');
const SeedService = require('./services/seedService');
require('dotenv').config();

async function cleanAndReseed() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        console.log('\n🗑️  Cleaning database...');

        // Delete in correct order (respecting dependencies)
        await ProjectExpense.deleteMany({});
        console.log('   - Deleted ProjectExpenses');

        await Project.deleteMany({});
        console.log('   - Deleted Projects');

        await EquipmentStatusHistory.deleteMany({});
        console.log('   - Deleted EquipmentStatusHistory');

        await EquipmentPart.deleteMany({});
        console.log('   - Deleted EquipmentParts');

        await Intervention.deleteMany({});
        console.log('   - Deleted Interventions');

        await ProductionSection.deleteMany({});
        console.log('   - Deleted ProductionSections');

        await ProductionLine.deleteMany({});
        console.log('   - Deleted ProductionLines');

        await Equipment.deleteMany({});
        console.log('   - Deleted Equipment');

        await Part.deleteMany({});
        console.log('   - Deleted Parts');

        console.log('\n✅ Database cleaned successfully!');

        console.log('\n🌱 Starting comprehensive seeding...');

        // Seed brands first
        await SeedService.seedBrands();
        console.log('   ✅ Brands seeded');

        // Seed equipment categories
        await SeedService.seedEquipmentCategories();
        console.log('   ✅ Equipment categories seeded');

        // Seed equipment types
        await SeedService.seedEquipmentTypes();
        console.log('   ✅ Equipment types seeded');

        // Seed equipment
        await SeedService.seedEquipment();
        console.log('   ✅ Equipment seeded');

        // Seed parts
        await SeedService.seedParts();
        console.log('   ✅ Parts seeded');

        // Seed production lines
        await SeedService.seedProductionLines();
        console.log('   ✅ Production lines seeded');

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n📊 Verifying data...');

        const counts = {
            equipment: await Equipment.countDocuments(),
            productionLines: await ProductionLine.countDocuments(),
            sections: await ProductionSection.countDocuments(),
            parts: await Part.countDocuments(),
            interventions: await Intervention.countDocuments()
        };

        console.log('   Equipment:', counts.equipment);
        console.log('   Production Lines:', counts.productionLines);
        console.log('   Sections:', counts.sections);
        console.log('   Parts:', counts.parts);
        console.log('   Interventions:', counts.interventions);

        // Verify equipment have name and code
        const equipmentWithoutName = await Equipment.countDocuments({
            $or: [{ name: { $exists: false } }, { name: '' }]
        });
        const equipmentWithoutCode = await Equipment.countDocuments({
            $or: [{ code: { $exists: false } }, { code: '' }]
        });

        console.log('\n🔍 Equipment validation:');
        console.log('   Without name:', equipmentWithoutName);
        console.log('   Without code:', equipmentWithoutCode);

        if (equipmentWithoutName === 0 && equipmentWithoutCode === 0) {
            console.log('   ✅ All equipment have name and code!');
        } else {
            console.log('   ⚠️  Some equipment missing name/code');
        }

        console.log('\n✅ All done! Database is ready.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

cleanAndReseed();
