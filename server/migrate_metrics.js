const mongoose = require('mongoose');
require('dotenv').config();
const AssetMetricsService = require('./services/assetMetricsService');

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Starting metrics migration...');
        const count = await AssetMetricsService.recalculateAll();

        console.log(`Successfully recalculated metrics for ${count} asset.`);

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
