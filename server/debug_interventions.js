const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Asset } = require('./models/Asset');
require('dotenv').config();

async function checkInterventions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');

        const activeInterventions = await Intervention.find({
            status: { $in: ['Pending', 'In Progress'] }
        }).populate('asset');

        console.log(`Found ${activeInterventions.length} active interventions.`);

        activeInterventions.forEach(i => {
            console.log(`\nIntervention ID: ${i._id}`);
            console.log(`Title: ${i.title}`);
            console.log(`Asset ID in Intervention: ${i.asset ? i.asset._id : 'NULL'}`);
            console.log(`Asset Name: ${i.asset ? i.asset.name : 'N/A'}`);

            if (!i.asset) {
                console.log('WARNING: Asset field is null or populated object is null.');
            }
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkInterventions();
