const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
require('dotenv').config();

async function checkEquipment() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const equipment = await Equipment.find().limit(5).lean();

        console.log('\n=== Sample Equipment ===');
        equipment.forEach((e, i) => {
            console.log(`\n${i + 1}. Equipment ID: ${e._id}`);
            console.log(`   name: ${e.name}`);
            console.log(`   code: ${e.code}`);
            console.log(`   serialNumber: ${e.serialNumber}`);
            console.log(`   type: ${e.type}`);
            console.log(`   category: ${e.category}`);
        });

        const countWithoutName = await Equipment.countDocuments({ name: { $exists: false } });
        const countWithoutCode = await Equipment.countDocuments({ code: { $exists: false } });
        const countWithEmptyName = await Equipment.countDocuments({ name: '' });
        const countWithEmptyCode = await Equipment.countDocuments({ code: '' });

        console.log('\n=== Statistics ===');
        console.log(`Total Equipment: ${await Equipment.countDocuments()}`);
        console.log(`Without name field: ${countWithoutName}`);
        console.log(`Without code field: ${countWithoutCode}`);
        console.log(`With empty name: ${countWithEmptyName}`);
        console.log(`With empty code: ${countWithEmptyCode}`);

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkEquipment();
