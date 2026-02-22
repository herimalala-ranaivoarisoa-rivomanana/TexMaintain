const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionDepartment } = require('./models/ProductionDepartment');
const { ProductionLine } = require('./models/ProductionLine');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        // Check Lines
        const lines = await ProductionLine.find().sort({ name: 1 });
        console.log(`Lines found: ${lines.length}`);
        lines.forEach(l => console.log(` - ${l.name}: ${l.departments.length} departments`));

        // Check Departments
        const departments = await ProductionDepartment.find();
        console.log(`Departments found: ${departments.length}`);
        const departmentNames = [...new Set(departments.map(s => s.name))];
        console.log('Department Names:', departmentNames.sort());

        // Check Asset
        const asset = await Asset.find();
        console.log(`Asset found: ${asset.length}`);

        // Check for forbidden keywords
        const forbidden = ['Hashima', 'Macpi', 'Veit', 'Brisay', 'Eastman', 'KM'];
        let forbiddenCount = 0;
        asset.forEach(e => {
            if (forbidden.some(f => e.name.includes(f) || e.model.includes(f))) {
                forbiddenCount++;
                console.warn(`⚠️ Forbidden Asset: ${e.name}`);
            }
        });

        if (forbiddenCount === 0) {
            console.log('✅ No forbidden asset found (Only sewing).');
        } else {
            console.log(`❌ Found ${forbiddenCount} forbidden asset.`);
        }

        // Check Association
        let orphanCount = 0;
        let missingFieldsCount = 0;
        const departmentsWithEq = await ProductionDepartment.find().lean();
        const associatedIds = new Set();
        departmentsWithEq.forEach(s => {
            if (s.asset) {
                s.asset.forEach(e => {
                    if (e.assetId) associatedIds.add(e.assetId.toString());
                });
            }
        });

        asset.forEach(e => {
            if (!associatedIds.has(e._id.toString())) orphanCount++;
            if (e.location !== 'Antsirabe-1' || !e.productionLine || !e.productionDepartment) {
                console.warn(`⚠️ Issue with EQ: ${e.name}. Loc: ${e.location}, Line: ${e.productionLine}, Department: ${e.productionDepartment}`);
                missingFieldsCount++;
            }
        });

        if (orphanCount === 0 && missingFieldsCount === 0) {
            console.log('✅ All asset associated and strictly formatted ("Antsirabe-1", Line, Department refs).');
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
