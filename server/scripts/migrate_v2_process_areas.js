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
            console.log('Renaming productionsections to processsections...');
            if (collectionNames.includes('processsections')) {
                console.log('Target processsections collection exists. Dropping it...');
                await db.collection('processsections').drop();
            }
            await db.collection('productionsections').rename('processsections');
        }

        // 2. Update Process Areas (formerly Production Lines)
        console.log('Updating Process Areas schema fields...');
        const processAreas = await db.collection('processareas').find({}).toArray();
        for (const area of processAreas) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            // Rename sections array to sections
            if (area.sections) {
                // Map sections to sections format
                // The structure inside sections is { sectionId: ObjectId, order: Number }
                // We need to change sectionId to sectionId
                const sections = area.sections.map(s => ({
                    sectionId: s.sectionId,
                    order: s.order
                }));
                updateDoc.sections = sections;
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

        // 3. Update Process Sections (formerly Production Sections)
        console.log('Updating Process Sections schema fields...');
        const sections = await db.collection('processsections').find({}).toArray();
        for (const dept of sections) {
            let updated = false;
            const updateDoc = {};
            const unsetDoc = {};

            if (dept.productionLine) {
                updateDoc.processArea = dept.productionLine;
                unsetDoc.productionLine = "";
                updated = true;
            }

            if (updated) {
                await db.collection('processsections').updateOne({ _id: dept._id }, { $set: updateDoc, $unset: unsetDoc });
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

            if (eq.productionSection) {
                updateDoc.processSection = eq.productionSection;
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
