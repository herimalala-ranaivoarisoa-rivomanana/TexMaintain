const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionSection } = require('./models/ProductionSection');

const inspect = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const asset = await Asset.findOne();
        console.log('Sample Asset:', JSON.stringify(asset, null, 2));

        const section = await ProductionSection.findOne({ asset: { $exists: true, $not: { $size: 0 } } });
        if (section) {
            console.log('Sample Section with Asset:', JSON.stringify(section, null, 2));
        } else {
            console.log('No section found with asset.');
            const anySection = await ProductionSection.findOne();
            console.log('Sample Empty Section:', JSON.stringify(anySection, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspect();
