const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AssetMetricsService = require('./services/assetMetricsService');
const { Asset } = require('./models/Asset');

// Load env vars
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    console.log('Starting metrics recalculation...');
    try {
        const count = await AssetMetricsService.recalculateAll();
        console.log(`Successfully recalculated metrics for ${count} asset.`);
    } catch (error) {
        console.error('Error recalculating metrics:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
        process.exit(0);
    }
};

run();
