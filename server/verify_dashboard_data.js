const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Asset } = require('./models/Asset');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Global Counts (General Dashboard)
        const globalAssetCount = await Asset.countDocuments();
        const globalInterventionCount = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });

        console.log('--- GLOBAL DATA ---');
        console.log(`Total Asset: ${globalAssetCount}`);
        console.log(`Active Interventions: ${globalInterventionCount}`);

        // 2. Process Area Counts
        const lines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: {
                path: 'asset.assetId',
                model: 'Asset'
            }
        });

        console.log(`\nFound ${lines.length} Process areas`);

        for (const line of lines) {
            console.log(`\n--- LINE: ${line.name} ---`);

            const assetIds = [];
            line.sections.forEach(section => {
                if (section.sectionId && section.sectionId.asset) {
                    section.sectionId.asset.forEach(item => {
                        if (item.assetId) {
                            assetIds.push(item.assetId._id);
                        }
                    });
                }
            });

            console.log(`Asset on Line: ${assetIds.length}`);

            const lineInterventionCount = await Intervention.countDocuments({
                asset: { $in: assetIds },
                status: { $in: ['Pending', 'In Progress'] }
            });
            console.log(`Active Interventions on Line: ${lineInterventionCount}`);

            const unassignedCount = globalAssetCount - assetIds.length;
            if (unassignedCount > 0) {
                console.log(`\nWARNING: ${unassignedCount} asset(s) are NOT assigned to this line.`);

                // Find unassigned asset
                const allAsset = await Asset.find({}, '_id name');
                const assignedSet = new Set(assetIds.map(id => id.toString()));
                const unassigned = allAsset.filter(e => !assignedSet.has(e._id.toString()));

                console.log('Unassigned Asset:', unassigned.map(e => e.name));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
