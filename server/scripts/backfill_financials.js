const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Asset } = require('../models/Asset');
const AssetMetricsService = require('../services/assetMetricsService');

const path = require('path');
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('../config/database');

const backfillFinancials = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB via shared config');

        const assets = await Asset.find({});
        console.log(`Found ${assets.length} assets to process...`);

        for (const eq of assets) {
            // Generate random but realistic purchase price between $500 and $15,000 depending on type (heuristic)
            // We can base it loosely on category if available, otherwise random.
            let basePrice = 2000;
            if (eq.name && eq.name.toLowerCase().includes('automatique')) basePrice = 8000;
            if (eq.name && eq.name.toLowerCase().includes('surjeteuse')) basePrice = 3000;
            if (eq.name && eq.name.toLowerCase().includes('boutonnière')) basePrice = 5000;

            const randomVariation = Math.floor(Math.random() * 2000);
            const purchasePrice = basePrice + randomVariation;

            // Useful life: 5 to 15 years
            const usefulLifeYears = Math.floor(Math.random() * 10) + 5;

            // Updated fields if not already set
            const updates = {};
            if (!eq.purchasePrice) updates.purchasePrice = purchasePrice;
            if (!eq.usefulLifeYears) updates.usefulLifeYears = usefulLifeYears;

            if (Object.keys(updates).length > 0) {
                await Asset.findByIdAndUpdate(eq._id, updates);
                // console.log(`Updated ${eq.name || eq._id}: Price=$${purchasePrice}, Life=${usefulLifeYears}y`);
            }
        }

        console.log('Financial parameters set. Now calculating metrics (TCO, Depreciation)...');

        // Trigger recalculation of metrics for all asset to populate tco, currentValue, etc.
        const count = await AssetMetricsService.recalculateAll();

        console.log(`Successfully recalculated metrics for ${count} assets.`);
        console.log('Backfill complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during backfill:', error);
        process.exit(1);
    }
};

backfillFinancials();
