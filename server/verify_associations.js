const mongoose = require('mongoose');
require('dotenv').config();
const { Equipment } = require('./models/Equipment');
const { ProductionSection } = require('./models/ProductionSection');
const { ProductionLine } = require('./models/ProductionLine');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const equipment = await Equipment.find().lean();
        const sections = await ProductionSection.find().populate('productionLine').lean();

        console.log(`Total Equipment: ${equipment.length}`);
        console.log(`Total Sections: ${sections.length}`);

        let orphanCount = 0;
        const orphans = [];

        // Build a set of all equipment IDs that are in sections
        const associatedEquipmentIds = new Set();
        sections.forEach(section => {
            if (section.equipment) {
                section.equipment.forEach(item => {
                    if (item.equipmentId) {
                        associatedEquipmentIds.add(item.equipmentId.toString());
                    }
                });
            }
        });

        console.log(`Equipment referenced in Sections: ${associatedEquipmentIds.size}`);

        equipment.forEach(eq => {
            if (!associatedEquipmentIds.has(eq._id.toString())) {
                orphanCount++;
                orphans.push(`${eq.name} (${eq.code}) - Location: ${eq.location}`);
            }
        });

        if (orphanCount === 0) {
            console.log('✅ SUCCESS: All equipment is associated with a section.');
        } else {
            console.log(`❌ FAILURE: ${orphanCount} equipment are NOT associated with any section.`);
            console.log('Orphans:', orphans.slice(0, 5)); // Show first 5
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
