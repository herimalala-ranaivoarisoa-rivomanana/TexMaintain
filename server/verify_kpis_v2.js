const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
const { ProductionLine } = require('./models/ProductionLine'); // Corrected import
const { Intervention } = require('./models/Intervention');
require('dotenv').config();

async function verifyKPIsV2() {
    try {
        // Try simpler connection string without auth first
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Verifying KPI Calculations (V2)\n');

        // 1. Verify Interventions Data
        const totalInterventions = await Intervention.countDocuments();
        const completedInterventions = await Intervention.countDocuments({ status: 'Completed' });
        const withCompletedDate = await Intervention.countDocuments({ completedDate: { $exists: true } });

        console.log('1. Intervention Data Quality:');
        console.log(`   Total Interventions: ${totalInterventions}`);
        console.log(`   Completed: ${completedInterventions}`);
        console.log(`   With completedDate: ${withCompletedDate}`);

        if (completedInterventions > 0 && withCompletedDate === completedInterventions) {
            console.log('   ✅ All completed interventions have completedDate');
        } else {
            console.log('   ⚠️  Mismatch in completedDate');
        }

        // 2. Calculate Expected MTTR
        const interventions = await Intervention.find({
            status: 'Completed',
            completedDate: { $exists: true },
            createdDate: { $exists: true }
        }).lean();

        let totalDurationHours = 0;
        let validDurationsCount = 0;

        interventions.forEach(i => {
            if (i.completedDate && i.createdDate) {
                const duration = (i.completedDate - i.createdDate) / (1000 * 60 * 60);
                totalDurationHours += duration;
                validDurationsCount++;
            }
        });

        const expectedMTTR = validDurationsCount > 0 ? totalDurationHours / validDurationsCount : 0;
        console.log(`\n2. Expected MTTR:`);
        console.log(`   Total Duration (hours): ${totalDurationHours.toFixed(2)}`);
        console.log(`   Count: ${validDurationsCount}`);
        console.log(`   Calculated MTTR: ${expectedMTTR.toFixed(2)} hours`);

        // 3. Calculate Expected MTBF
        // Group by equipment
        const interventionsByEquipment = {};
        interventions.forEach(i => {
            const eqId = i.equipment?.toString(); // Use equipment field (ObjectId string)
            if (!interventionsByEquipment[eqId]) {
                interventionsByEquipment[eqId] = [];
            }
            interventionsByEquipment[eqId].push(i);
        });

        let totalIntervalsHours = 0;
        let totalIntervalsCount = 0;

        Object.keys(interventionsByEquipment).forEach(eqId => {
            // Sort by createdDate
            const eqInterventions = interventionsByEquipment[eqId].sort((a, b) => a.createdDate - b.createdDate);

            if (eqInterventions.length >= 2) {
                for (let i = 1; i < eqInterventions.length; i++) {
                    const interval = (eqInterventions[i].createdDate - eqInterventions[i - 1].createdDate) / (1000 * 60 * 60);
                    totalIntervalsHours += interval;
                    totalIntervalsCount++;
                }
            }
        });

        const expectedMTBF = totalIntervalsCount > 0 ? totalIntervalsHours / totalIntervalsCount : 0;
        console.log(`\n3. Expected MTBF:`);
        console.log(`   Total Interval Time (hours): ${totalIntervalsHours.toFixed(2)}`);
        console.log(`   Interval Count: ${totalIntervalsCount}`);
        console.log(`   Calculated MTBF: ${expectedMTBF.toFixed(2)} hours`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyKPIsV2();
