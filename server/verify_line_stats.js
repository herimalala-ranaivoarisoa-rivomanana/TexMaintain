const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionSection } = require('./models/ProductionSection');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const line = await ProductionLine.findOne({ name: 'Line 1' }).populate({
            path: 'sections.sectionId',
            populate: {
                path: 'asset.assetId',
                model: 'Asset'
            }
        }).lean();

        if (!line) {
            console.error('Line 1 not found');
            process.exit(1);
        }

        const assetList = [];
        if (line.sections) {
            line.sections.forEach(section => {
                if (section.sectionId && section.sectionId.asset) {
                    section.sectionId.asset.forEach(item => {
                        if (item.assetId) {
                            assetList.push(item.assetId);
                        }
                    });
                }
            });
        }

        const assetIds = assetList.map(e => e._id);
        console.log(`Found ${assetIds.length} asset for Line 1`);

        if (assetIds.length > 0) {
            // Test Aggregation
            const aggregation = await Asset.aggregate([
                { $match: { _id: { $in: assetIds } } },
                {
                    $group: {
                        _id: null,
                        avgMtbf: { $avg: '$mtbf' },
                        avgMttr: { $avg: '$mttr' }
                    }
                }
            ]);
            console.log('Aggregation Result:', aggregation);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
