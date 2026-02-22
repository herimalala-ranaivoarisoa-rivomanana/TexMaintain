const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const migrate = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Rename Collections
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.includes('productionlines')) {
            console.log('Renaming productionlines to processareas...');
            if (collectionNames.includes('processareas')) {
                console.log('Target processareas collection exists. Dropping it...');
                await db.collection('processareas').drop();
            }
            await db.collection('productionlines').rename('processareas');
        }

        if (collectionNames.includes('productiondepartments')) {
            console.log('Renaming productiondepartments to processdepartments...');
            if (collectionNames.includes('processdepartments')) {
                console.log('Target processdepartments collection exists. Dropping it...');
                await db.collection('processdepartments').drop();
            }
            await db.collection('productiondepartments').rename('processdepartments');
        }

        // 2. Update Process Areas (formerly Production Lines)
        console.log('Updating Process Areas schema fields...');
        const processAreas = await db.collection('processareas').find({}).toArray();
        for (const area of processAreas) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            // Rename departments array to departments
            if (area.departments) {
                // Map departments to departments format
                // The structure inside departments is { departmentId: ObjectId, order: Number }
                // We need to change departmentId to departmentId
                const departments = area.departments.map(s => ({
                    departmentId: s.departmentId,
                    order: s.order
                }));
                updateDoc.departments = departments;
                unsetDoc.departments = "";
                updated = true;
            }

            // Rename legacy fields if any
            if (area.productionDepartmentId) { // unlikely but just in case
                // ...
            }

            if (updated) {
                await db.collection('processareas').updateOne({ _id: area._id }, { $set: updateDoc, $unset: unsetDoc });
            }
        }

        // 3. Update Process Departments (formerly Production Departments)
        console.log('Updating Process Departments schema fields...');
        const departments = await db.collection('processdepartments').find({}).toArray();
        for (const dept of departments) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            if (dept.productionLine) {
                updateDoc.processArea = dept.productionLine;
                unsetDoc.productionLine = "";
                updated = true;
            }

            if (updated) {
                await db.collection('processdepartments').updateOne({ _id: dept._id }, { $set: updateDoc, $unset: unsetDoc });
            }
        }

        // 4. Update Asset
        console.log('Updating Asset schema fields...');
        const asset = await db.collection('asset').find({}).toArray();
        for (const eq of asset) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            if (eq.productionLine) {
                updateDoc.processArea = eq.productionLine;
                unsetDoc.productionLine = "";
                updated = true;
            }

            if (eq.productionDepartment) {
                updateDoc.processDepartment = eq.productionDepartment;
                unsetDoc.productionDepartment = "";
                updated = true;
            }

            // Add new fields if missing
            if (!eq.assetCategory) {
                updateDoc.assetCategory = 'production'; // Default
                updated = true;
            }
            if (!eq.criticality) {
                updateDoc.criticality = 'C'; // Default
                updated = true;
            }

            if (updated) {
                await db.collection('asset').updateOne({ _id: eq._id }, { $set: updateDoc, $unset: unsetDoc });
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
