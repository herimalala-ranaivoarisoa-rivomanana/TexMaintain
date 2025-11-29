const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Equipment } = require('./models/Equipment');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Global Counts (General Dashboard)
        const globalEquipmentCount = await Equipment.countDocuments();
        const globalInterventionCount = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });

        console.log('--- GLOBAL DATA ---');
        console.log(`Total Equipment: ${globalEquipmentCount}`);
        console.log(`Active Interventions: ${globalInterventionCount}`);

        // 2. Production Line Counts
        const lines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: {
                path: 'equipment.equipmentId',
                model: 'Equipment'
            }
        });

        console.log(`\nFound ${lines.length} Production Lines`);

        for (const line of lines) {
            console.log(`\n--- LINE: ${line.name} ---`);

            const equipmentIds = [];
            line.sections.forEach(section => {
                if (section.sectionId && section.sectionId.equipment) {
                    section.sectionId.equipment.forEach(item => {
                        if (item.equipmentId) {
                            equipmentIds.push(item.equipmentId._id);
                        }
                    });
                }
            });

            console.log(`Equipment on Line: ${equipmentIds.length}`);

            const lineInterventionCount = await Intervention.countDocuments({
                equipment: { $in: equipmentIds },
                status: { $in: ['Pending', 'In Progress'] }
            });
            console.log(`Active Interventions on Line: ${lineInterventionCount}`);

            const unassignedCount = globalEquipmentCount - equipmentIds.length;
            if (unassignedCount > 0) {
                console.log(`\nWARNING: ${unassignedCount} equipment(s) are NOT assigned to this line.`);

                // Find unassigned equipment
                const allEquipment = await Equipment.find({}, '_id name');
                const assignedSet = new Set(equipmentIds.map(id => id.toString()));
                const unassigned = allEquipment.filter(e => !assignedSet.has(e._id.toString()));

                console.log('Unassigned Equipment:', unassigned.map(e => e.name));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
