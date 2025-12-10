const mongoose = require('mongoose');
require('dotenv').config();
const { Equipment } = require('./models/Equipment');
const { ProductionSection } = require('./models/ProductionSection');

const inspect = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const equipment = await Equipment.findOne();
        console.log('Sample Equipment:', JSON.stringify(equipment, null, 2));

        const section = await ProductionSection.findOne({ equipment: { $exists: true, $not: { $size: 0 } } });
        if (section) {
            console.log('Sample Section with Equipment:', JSON.stringify(section, null, 2));
        } else {
            console.log('No section found with equipment.');
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
