const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionSection } = require('./models/ProductionSection');
require('dotenv').config();

async function inspectDB() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const totalEquipment = await Equipment.countDocuments();
        const totalLines = await ProductionLine.countDocuments();
        const totalSections = await ProductionSection.countDocuments();

        console.log(`Total Equipment: ${totalEquipment}`);
        console.log(`Total Production Lines: ${totalLines}`);
        console.log(`Total Sections: ${totalSections}`);

        const lines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: { path: 'equipment.equipmentId' }
        });

        for (const line of lines) {
            let lineEquipCount = 0;
            line.sections.forEach(s => {
                if (s.sectionId && s.sectionId.equipment) {
                    lineEquipCount += s.sectionId.equipment.length;
                }
            });
            console.log(`Line '${line.name}': ${lineEquipCount} equipment assigned.`);
        }

        const assignedEquipIds = new Set();
        lines.forEach(l => l.sections.forEach(s => {
            if (s.sectionId && s.sectionId.equipment) {
                s.sectionId.equipment.forEach(e => assignedEquipIds.add(e.equipmentId?.toString()));
            }
        }));

        console.log(`Total Assigned Equipment: ${assignedEquipIds.size}`);
        console.log(`Total Unassigned (Orphan) Equipment: ${totalEquipment - assignedEquipIds.size}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectDB();
