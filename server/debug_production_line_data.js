const mongoose = require('mongoose');
const { ProductionLine } = require('./models/ProductionLine');
const { Equipment } = require('./models/Equipment');
const { ProductionSection } = require('./models/ProductionSection');
require('dotenv').config();

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');
        console.log('Connected to MongoDB');

        // 1. Get all Process areas
        const lines = await ProductionLine.find().populate({
            path: 'sections.sectionId',
            populate: {
                path: 'equipment.equipmentId',
                model: 'Equipment'
            }
        });

        console.log(`\nFound ${lines.length} Process areas.`);

        if (lines.length === 0) {
            console.log('No process areas found.');
        } else {
            lines.forEach(line => {
                console.log(`\nLine: ${line.name} (ID: ${line._id})`);
                console.log(`Sections count: ${line.sections.length}`);

                let totalEquipOnLine = 0;
                line.sections.forEach((s, idx) => {
                    const section = s.sectionId;
                    if (!section) {
                        console.log(`  Section ${idx}: NULL (Reference broken?)`);
                        return;
                    }
                    console.log(`  Section ${idx}: ${section.name} (ID: ${section._id})`);
                    console.log(`    Equipment count in section: ${section.equipment ? section.equipment.length : 0}`);

                    if (section.equipment) {
                        section.equipment.forEach(e => {
                            console.log(`      - Equipment ID: ${e.equipmentId ? e.equipmentId._id : 'NULL'}`);
                            if (e.equipmentId) totalEquipOnLine++;
                        });
                    }
                });
                console.log(`Total Equipment linked to Line: ${totalEquipOnLine}`);
            });
        }

        // 2. Get all Equipment
        const allEquipment = await Equipment.find({}, '_id name status');
        console.log(`\nTotal Equipment in DB: ${allEquipment.length}`);
        allEquipment.forEach(e => {
            console.log(`  - ${e.name} (${e.status}) ID: ${e._id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugData();
