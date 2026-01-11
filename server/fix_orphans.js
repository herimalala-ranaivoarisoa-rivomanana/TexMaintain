const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Asset } = require('./models/Asset');
require('dotenv').config();

async function fixOrphans() {
    try {
        await mongoose.connect('mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Get valid asset IDs
        const allAsset = await Asset.find({}, '_id');
        const validAssetIds = allAsset.map(e => e._id.toString());

        if (validAssetIds.length === 0) {
            console.log('No valid asset found. Cannot reassign.');
            return;
        }

        const targetAssetId = validAssetIds[0];
        console.log(`Target Asset for reassignment: ${targetAssetId}`);

        // 2. Find orphans
        const orphans = await Intervention.find({
            asset: { $nin: validAssetIds }
        });

        console.log(`Found ${orphans.length} orphan interventions.`);

        // 3. Reassign
        if (orphans.length > 0) {
            const result = await Intervention.updateMany(
                { _id: { $in: orphans.map(o => o._id) } },
                { $set: { asset: targetAssetId } }
            );
            console.log(`Reassigned ${result.modifiedCount} interventions to ${targetAssetId}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixOrphans();
