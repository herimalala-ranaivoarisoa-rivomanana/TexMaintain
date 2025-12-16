const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Equipment } = require('./models/Equipment');
const EquipmentMetricsService = require('./services/equipmentMetricsService');
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

        // --- PART 2: Backfill equipmentId from equipment string ---
        console.log('\n--- Starting Equipment ID Backfill ---');
        const interventionsMissingId = await Intervention.find({
            equipmentId: { $exists: false }
        });
        console.log(`Found ${interventionsMissingId.length} interventions missing equipmentId.`);

        let matched = 0;
        for (const intervention of interventionsMissingId) {
            if (intervention.equipment) {
                // Try to find equipment by location matching intervention.equipment
                // Or by name if location fails? The migration script used location.
                const equipment = await Equipment.findOne({
                    location: { $regex: new RegExp(`^${intervention.equipment}$`, 'i') }
                });

                if (equipment) {
                    await Intervention.updateOne(
                        { _id: intervention._id },
                        { $set: { equipmentId: equipment._id } }
                    );
                    matched++;
                }
            }
        }
        console.log(`✅ Backfilled ${matched} equipmentIds.`);

        // --- PART 3: Recalculate Metrics (Conditional) ---
        if (updatedCount > 0 || matched > 0) {
            console.log('\n--- Starting Metrics Recalculation (Triggered by backfill) ---');
            const count = await EquipmentMetricsService.recalculateAll();
            console.log(`✅ Recalculated metrics for ${count} equipment.`);
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
