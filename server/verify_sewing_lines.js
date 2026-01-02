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

        // Check Lines
        const lines = await ProductionLine.find().sort({ name: 1 });
        console.log(`Lines found: ${lines.length}`);
        lines.forEach(l => console.log(` - ${l.name}: ${l.sections.length} sections`));

        // Check Sections
        const sections = await ProductionSection.find();
        console.log(`Sections found: ${sections.length}`);
        const sectionNames = [...new Set(sections.map(s => s.name))];
        console.log('Section Names:', sectionNames.sort());

        // Check Equipment
        const equipment = await Equipment.find();
        console.log(`Equipment found: ${equipment.length}`);

        // Check for forbidden keywords
        const forbidden = ['Hashima', 'Macpi', 'Veit', 'Brisay', 'Eastman', 'KM'];
        let forbiddenCount = 0;
        equipment.forEach(e => {
            if (forbidden.some(f => e.name.includes(f) || e.model.includes(f))) {
                forbiddenCount++;
                console.warn(`⚠️ Forbidden Equipment: ${e.name}`);
            }
        });

        if (forbiddenCount === 0) {
            console.log('✅ No forbidden equipment found (Only sewing).');
        } else {
            console.log(`❌ Found ${forbiddenCount} forbidden equipment.`);
        }

        // Check Association
        let orphanCount = 0;
        let missingFieldsCount = 0;
        const sectionsWithEq = await ProductionSection.find().lean();
        const associatedIds = new Set();
        sectionsWithEq.forEach(s => {
            if (s.equipment) {
                s.equipment.forEach(e => {
                    if (e.equipmentId) associatedIds.add(e.equipmentId.toString());
                });
            }
        });

        equipment.forEach(e => {
            if (!associatedIds.has(e._id.toString())) orphanCount++;
            if (e.location !== 'Antsirabe-1' || !e.productionLine || !e.productionSection) {
                console.warn(`⚠️ Issue with EQ: ${e.name}. Loc: ${e.location}, Line: ${e.productionLine}, Section: ${e.productionSection}`);
                missingFieldsCount++;
            }
        });

        if (orphanCount === 0 && missingFieldsCount === 0) {
            console.log('✅ All equipment associated and strictly formatted ("Antsirabe-1", Line, Section refs).');
        } else {
            console.log(`❌ ${orphanCount} orphans found. ${missingFieldsCount} with missing fields.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
