const mongoose = require('mongoose');
const { Asset } = require('./models/Asset');
const { SubCategory } = require('./models/SubCategory');
const { Brand } = require('./models/Brand');
require('dotenv').config();

async function fixAssetNames() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const asset = await Asset.find()
            .populate('subCategory')
            .populate('brand')
            .lean();

        console.log(`\n📝 Updating ${asset.length} asset records...`);

        let updated = 0;
        for (let i = 0; i < asset.length; i++) {
            const ast = asset[i];

            // Generate name and code
            const typeName = ast.subCategory?.name || 'Asset';
            const brandName = ast.brand?.name || 'Generic';
            const code = `AST-${typeName.substring(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
            const name = `${typeName} ${ast.model || brandName}`;

            await Asset.updateOne(
                { _id: ast._id },
                {
                    $set: {
                        name: name,
                        code: code
                    }
                }
            );

            updated++;
            if (updated % 10 === 0) {
                console.log(`   Updated ${updated}/${asset.length}...`);
            }
        }

        console.log(`\n✅ Updated ${updated} asset records!`);

        // Verify
        const withoutName = await Asset.countDocuments({
            $or: [{ name: { $exists: false } }, { name: '' }]
        });
        const withoutCode = await Asset.countDocuments({
            $or: [{ code: { $exists: false } }, { code: '' }]
        });

        console.log('\n🔍 Verification:');
        console.log(`   Without name: ${withoutName}`);
        console.log(`   Without code: ${withoutCode}`);

        if (withoutName === 0 && withoutCode === 0) {
            console.log('   ✅ All asset now have name and code!');

            // Show sample
            const sample = await Asset.findOne().lean();
            console.log('\n📋 Sample asset:');
            console.log(`   Name: ${sample.name}`);
            console.log(`   Code: ${sample.code}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixAssetNames();
