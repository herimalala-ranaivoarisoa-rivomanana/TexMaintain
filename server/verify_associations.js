const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionSection } = require('./models/ProductionSection');
const { ProductionLine } = require('./models/ProductionLine');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const asset = await Asset.find().lean();
        const sections = await ProductionSection.find().populate('productionLine').lean();

        console.log(`Total Asset: ${asset.length}`);
        console.log(`Total Sections: ${sections.length}`);

        let orphanCount = 0;
        const orphans = [];

        // Build a set of all asset IDs that are in sections
        const associatedAssetIds = new Set();
        sections.forEach(section => {
            if (section.asset) {
                section.asset.forEach(item => {
                    if (item.assetId) {
                        associatedAssetIds.add(item.assetId.toString());
                    }
                });
            }
        });

        console.log(`Asset referenced in Sections: ${associatedAssetIds.size}`);

        asset.forEach(eq => {
            if (!associatedAssetIds.has(eq._id.toString())) {
                orphanCount++;
                orphans.push(`${eq.name} (${eq.code}) - Location: ${eq.location}`);
            }
        });

        if (orphanCount === 0) {
            console.log('✅ SUCCESS: All asset is associated with a section.');
        } else {
            console.log(`❌ FAILURE: ${orphanCount} asset are NOT associated with any section.`);
            console.log('Orphans:', orphans.slice(0, 5)); // Show first 5
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
