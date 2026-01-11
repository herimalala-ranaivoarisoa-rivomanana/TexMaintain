const mongoose = require('mongoose');
require('dotenv').config();
const SeedService = require('./services/seedService');

const debug = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        console.log('Running seedAsset...');
        try {
            const result = await SeedService.seedAsset();
            console.log('Result:', result);
        } catch (e) {
            console.error('Error in seedAsset:', e);
        }

        process.exit(0);
    } catch (error) {
        console.error('System Error:', error);
        process.exit(1);
    }
};

debug();
