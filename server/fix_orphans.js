const mongoose = require('mongoose');
const { Intervention } = require('./models/Intervention');
const { Equipment } = require('./models/Equipment');
require('dotenv').config();

async function fixOrphans() {
    try {
        await mongoose.connect('mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Get valid equipment IDs
        const allEquipment = await Equipment.find({}, '_id');
        const validEquipmentIds = allEquipment.map(e => e._id.toString());

        if (validEquipmentIds.length === 0) {
            console.log('No valid equipment found. Cannot reassign.');
            return;
        }

        const targetEquipmentId = validEquipmentIds[0];
        console.log(`Target Equipment for reassignment: ${targetEquipmentId}`);

        // 2. Find orphans
        const orphans = await Intervention.find({
            equipment: { $nin: validEquipmentIds }
        });

        console.log(`Found ${orphans.length} orphan interventions.`);

        // 3. Reassign
        if (orphans.length > 0) {
            const result = await Intervention.updateMany(
                { _id: { $in: orphans.map(o => o._id) } },
                { $set: { equipment: targetEquipmentId } }
            );
            console.log(`Reassigned ${result.modifiedCount} interventions to ${targetEquipmentId}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixOrphans();
