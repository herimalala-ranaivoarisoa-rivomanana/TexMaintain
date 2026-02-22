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

        const asset = await Asset.find().lean();
        const departments = await ProductionDepartment.find().populate('productionLine').lean();

        console.log(`Total Asset: ${asset.length}`);
        console.log(`Total Departments: ${departments.length}`);

        let orphanCount = 0;
        const orphans = [];

        // Build a set of all asset IDs that are in departments
        const associatedAssetIds = new Set();
        departments.forEach(department => {
            if (department.asset) {
                department.asset.forEach(item => {
                    if (item.assetId) {
                        associatedAssetIds.add(item.assetId.toString());
                    }
                });
            }
        });

        console.log(`Asset referenced in Departments: ${associatedAssetIds.size}`);

        asset.forEach(eq => {
            if (!associatedAssetIds.has(eq._id.toString())) {
                orphanCount++;
                orphans.push(`${eq.name} (${eq.code}) - Location: ${eq.location}`);
            }
        });

        if (orphanCount === 0) {
            console.log('✅ SUCCESS: All asset is associated with a department.');
        } else {
            console.log(`❌ FAILURE: ${orphanCount} asset are NOT associated with any department.`);
            console.log('Orphans:', orphans.slice(0, 5)); // Show first 5
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
