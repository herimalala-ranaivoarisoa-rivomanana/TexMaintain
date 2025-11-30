const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Equipment } = require('./models/Equipment');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { ProductionSection } = require('./models/ProductionSection'); // The fix
require('dotenv').config();

async function checkKPIs() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Simulate the aggregation logic from dashboardRoutes.js
        const productionLines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: {
                path: 'equipment.equipmentId',
                model: 'Equipment'
            }
        }).lean();

        console.log(`Found ${productionLines.length} lines.`);

        // If this runs without "Schema hasn't been registered" error, the fix works.
        console.log('Successfully populated lines with sections and equipment.');

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkKPIs();
