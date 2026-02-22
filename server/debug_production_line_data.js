const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Asset } = require('./models/Asset');
const { ProductionSection } = require('./models/ProductionSection');
require('dotenv').config();

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Get all Process areas
        const lines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: {
                path: 'asset.assetId',
                model: 'Asset'
            }
        });

        console.log(`\nFound ${lines.length} Process areas.`);

        if (lines.length === 0) {
            console.log('No process areas found.');
        } else {
            lines.forEach(line => {
                console.log(`\nLine: ${line.name} (ID: ${line._id})`);
                console.log(`Sections count: ${line.sections.length}`);

                let totalEquipOnLine = 0;
                line.sections.forEach((s, idx) => {
                    const section = s.sectionId;
                    if (!section) {
                        console.log(`  Section ${idx}: NULL (Reference broken?)`);
                        return;
                    }
                    console.log(`  Section ${idx}: ${section.name} (ID: ${section._id})`);
                    console.log(`    Asset count in section: ${section.asset ? section.asset.length : 0}`);

                    if (section.asset) {
                        section.asset.forEach(e => {
                            console.log(`      - Asset ID: ${e.assetId ? e.assetId._id : 'NULL'}`);
                            if (e.assetId) totalEquipOnLine++;
                        });
                    }
                });
                console.log(`Total Asset linked to Line: ${totalEquipOnLine}`);
            });
        }

        // 2. Get all Asset
        const allAsset = await Asset.find({}, '_id name status');
        console.log(`\nTotal Asset in DB: ${allAsset.length}`);
        allAsset.forEach(e => {
            console.log(`  - ${e.name} (${e.status}) ID: ${e._id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugData();
