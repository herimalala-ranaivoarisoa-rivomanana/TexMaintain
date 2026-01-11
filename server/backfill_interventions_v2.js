const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Asset } = require('./models/Asset');
const AssetMetricsService = require('./services/assetMetricsService');
require('dotenv').config();

async function backfillInterventions() {
    try {
        // Assume connection is already established
        console.log('🔄 Starting automated backfill and metrics calculation...');

        // Find completed interventions without completedDate
        const interventionsToUpdate = await Intervention.find({
            status: 'Completed',
            completedDate: { $exists: false }
        });

        console.log(`Found ${interventionsToUpdate.length} completed interventions missing completedDate.`);

        let updatedCount = 0;
        for (const intervention of interventionsToUpdate) {
            let completedDate = intervention.dueDate;
            if (!completedDate) {
                completedDate = new Date(intervention.createdDate.getTime() + 2 * 60 * 60 * 1000);
            }

            if (completedDate < intervention.createdDate) {
                completedDate = new Date(intervention.createdDate.getTime() + 2 * 60 * 60 * 1000);
            }

            // Use updateOne to force update
            await Intervention.updateOne(
                { _id: intervention._id },
                {
                    $set: {
                        completedDate: completedDate,
                        actualDuration: intervention.actualDuration || 2,
                        estimatedDuration: intervention.estimatedDuration || 2
                    }
                }
            );

            updatedCount++;
            if (updatedCount % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n✅ Successfully backfilled ${updatedCount} interventions using updateOne.`);

        // Verify immediately
        const remaining = await Intervention.countDocuments({
            status: 'Completed',
            completedDate: { $exists: false }
        });
        console.log(`Remaining missing completedDate: ${remaining}`);

        // --- PART 2: Backfill assetId from asset string ---
        console.log('\n--- Starting Asset ID Backfill ---');
        const interventionsMissingId = await Intervention.find({
            assetId: { $exists: false }
        });
        console.log(`Found ${interventionsMissingId.length} interventions missing assetId.`);

        let matched = 0;
        for (const intervention of interventionsMissingId) {
            if (intervention.asset) {
                // Try to find asset by location matching intervention.asset
                // Or by name if location fails? The migration script used location.
                const asset = await Asset.findOne({
                    location: { $regex: new RegExp(`^${intervention.asset}$`, 'i') }
                });

                if (asset) {
                    await Intervention.updateOne(
                        { _id: intervention._id },
                        { $set: { assetId: asset._id } }
                    );
                    matched++;
                }
            }
        }
        console.log(`✅ Backfilled ${matched} assetIds.`);

        // --- PART 3: Recalculate Metrics (Conditional) ---
        if (updatedCount > 0 || matched > 0) {
            console.log('\n--- Starting Metrics Recalculation (Triggered by backfill) ---');
            const count = await AssetMetricsService.recalculateAll();
            console.log(`✅ Recalculated metrics for ${count} asset.`);
        } else {
            console.log('\n--- Skipping Metrics Recalculation (No backfill changes) ---');
        }

        console.log('✨ Automated backfill completed successfully.');
        // Do not exit process, just return
        return true;

    } catch (error) {
        console.error('❌ Error during backfill:', error);
        // Do not exit process, just log error
        return false;
    }
}

module.exports = backfillInterventions;
