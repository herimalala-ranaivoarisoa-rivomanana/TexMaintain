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

        if (collectionNames.includes('productionsections')) {
            console.log('Renaming productionsections to processdepartments...');
            if (collectionNames.includes('processdepartments')) {
                console.log('Target processdepartments collection exists. Dropping it...');
                await db.collection('processdepartments').drop();
            }
            await db.collection('productionsections').rename('processdepartments');
        }

        // 2. Update Process Areas (formerly Production Lines)
        console.log('Updating Process Areas schema fields...');
        const processAreas = await db.collection('processareas').find({}).toArray();
        for (const area of processAreas) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            // Rename sections array to departments
            if (area.sections) {
                // Map sections to departments format
                // The structure inside sections is { sectionId: ObjectId, order: Number }
                // We need to change sectionId to departmentId
                const departments = area.sections.map(s => ({
                    departmentId: s.sectionId,
                    order: s.order
                }));
                updateDoc.departments = departments;
                unsetDoc.sections = "";
                updated = true;
            }

            // Rename legacy fields if any
            if (area.productionSectionId) { // unlikely but just in case
                // ...
            }

            if (updated) {
                await db.collection('processareas').updateOne({ _id: area._id }, { $set: updateDoc, $unset: unsetDoc });
            }
        }

        // 3. Update Process Departments (formerly Production Sections)
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

        // 4. Update Equipment
        console.log('Updating Equipment schema fields...');
        const equipment = await db.collection('equipment').find({}).toArray();
        for (const eq of equipment) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            if (eq.productionLine) {
                updateDoc.processArea = eq.productionLine;
                unsetDoc.productionLine = "";
                updated = true;
            }

            if (eq.productionSection) {
                updateDoc.processDepartment = eq.productionSection;
                unsetDoc.productionSection = "";
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
                await db.collection('equipment').updateOne({ _id: eq._id }, { $set: updateDoc, $unset: unsetDoc });
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
