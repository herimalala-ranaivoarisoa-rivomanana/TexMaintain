const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Asset } = require('./models/Asset');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { ProductionDepartment } = require('./models/ProductionDepartment'); // The fix
require('dotenv').config();

async function checkKPIs() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Simulate the aggregation logic from dashboardRoutes.js
        const productionLines = await ProductionLine.find().populate({
            path: 'departments.departmentId',
            populate: {
                path: 'asset.assetId',
                model: 'Asset'
            }
        }).lean();

        console.log(`Found ${productionLines.length} lines.`);

        // If this runs without "Schema hasn't been registered" error, the fix works.
        console.log('Successfully populated lines with departments and asset.');

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkKPIs();
