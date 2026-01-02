const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Equipment } = require('./models/Equipment');
require('dotenv').config();

async function checkInterventions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');

        const activeInterventions = await Intervention.find({
            status: { $in: ['Pending', 'In Progress'] }
        }).populate('equipment');

        console.log(`Found ${activeInterventions.length} active interventions.`);

        activeInterventions.forEach(i => {
            console.log(`\nIntervention ID: ${i._id}`);
            console.log(`Title: ${i.title}`);
            console.log(`Equipment ID in Intervention: ${i.equipment ? i.equipment._id : 'NULL'}`);
            console.log(`Equipment Name: ${i.equipment ? i.equipment.name : 'N/A'}`);

            if (!i.equipment) {
                console.log('WARNING: Equipment field is null or populated object is null.');
            }
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkInterventions();
