const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
require('dotenv').config();

async function checkData() {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const total = await Intervention.countDocuments();
        const completed = await Intervention.countDocuments({ status: 'Completed' });
        const withDate = await Intervention.countDocuments({ completedDate: { $exists: true } });
        const withDateNotNull = await Intervention.countDocuments({ completedDate: { $ne: null } });

        console.log(`Total: ${total}`);
        console.log(`Completed: ${completed}`);
        console.log(`With completedDate (exists): ${withDate}`);
        console.log(`With completedDate (ne null): ${withDateNotNull}`);

        // Show a sample of a completed intervention WITHOUT completedDate if any
        const missing = await Intervention.findOne({
            status: 'Completed',
            completedDate: { $exists: false }
        }).lean();

        if (missing) {
            console.log('\nSample missing completedDate:');
            console.log(JSON.stringify(missing, null, 2));
        } else {
            console.log('\nNo interventions missing completedDate found via query.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();
