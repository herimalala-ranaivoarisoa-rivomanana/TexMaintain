const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
require('dotenv').config();

async function backfillInterventions() {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Find completed interventions without completedDate
        const interventionsToUpdate = await Intervention.find({
            status: 'Completed',
            completedDate: { $exists: false }
        });

        console.log(`Found ${interventionsToUpdate.length} completed interventions missing completedDate.`);

        let updatedCount = 0;
        for (const intervention of interventionsToUpdate) {
            // Logic to estimate completedDate:
            // 1. Use dueDate if available
            // 2. Else use createdDate + 2 hours (default duration)

            let completedDate = intervention.dueDate;
            if (!completedDate) {
                completedDate = new Date(intervention.createdDate.getTime() + 2 * 60 * 60 * 1000);
            }

            // Ensure completedDate is after createdDate
            if (completedDate < intervention.createdDate) {
                completedDate = new Date(intervention.createdDate.getTime() + 2 * 60 * 60 * 1000);
            }

            intervention.completedDate = completedDate;

            // Also set durations if missing
            if (!intervention.actualDuration) {
                intervention.actualDuration = (completedDate - intervention.createdDate) / (1000 * 60 * 60);
            }
            if (!intervention.estimatedDuration) {
                intervention.estimatedDuration = 2; // Default 2 hours
            }

            await intervention.save();
            updatedCount++;
        }

        console.log(`✅ Successfully backfilled ${updatedCount} interventions.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

backfillInterventions();
