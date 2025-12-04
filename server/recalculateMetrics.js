const mongoose = require('mongoose');
const dotenv = require('dotenv');
const EquipmentMetricsService = require('./services/equipmentMetricsService');
const { Equipment } = require('./models/Equipment');

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
        const count = await EquipmentMetricsService.recalculateAll();
        console.log(`Successfully recalculated metrics for ${count} equipment.`);
    } catch (error) {
        console.error('Error recalculating metrics:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
        process.exit(0);
    }
};

run();
