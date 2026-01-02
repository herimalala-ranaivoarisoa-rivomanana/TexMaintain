const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
const { EquipmentType } = require('./models/EquipmentType');
const { Brand } = require('./models/Brand');
require('dotenv').config();

async function fixEquipmentNames() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const equipment = await Equipment.find()
            .populate('type')
            .populate('brand')
            .lean();

        console.log(`\n📝 Updating ${equipment.length} equipment records...`);

        let updated = 0;
        for (let i = 0; i < equipment.length; i++) {
            const eq = equipment[i];

            // Generate name and code
            const typeName = eq.type?.name || 'Equipment';
            const brandName = eq.brand?.name || 'Generic';
            const code = `EQ-${typeName.substring(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
            const name = `${typeName} ${eq.model || brandName}`;

            await Equipment.updateOne(
                { _id: eq._id },
                {
                    $set: {
                        name: name,
                        code: code
                    }
                }
            );

            updated++;
            if (updated % 10 === 0) {
                console.log(`   Updated ${updated}/${equipment.length}...`);
            }
        }

        console.log(`\n✅ Updated ${updated} equipment records!`);

        // Verify
        const withoutName = await Equipment.countDocuments({
            $or: [{ name: { $exists: false } }, { name: '' }]
        });
        const withoutCode = await Equipment.countDocuments({
            $or: [{ code: { $exists: false } }, { code: '' }]
        });

        console.log('\n🔍 Verification:');
        console.log(`   Without name: ${withoutName}`);
        console.log(`   Without code: ${withoutCode}`);

        if (withoutName === 0 && withoutCode === 0) {
            console.log('   ✅ All equipment now have name and code!');

            // Show sample
            const sample = await Equipment.findOne().lean();
            console.log('\n📋 Sample equipment:');
            console.log(`   Name: ${sample.name}`);
            console.log(`   Code: ${sample.code}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixEquipmentNames();
