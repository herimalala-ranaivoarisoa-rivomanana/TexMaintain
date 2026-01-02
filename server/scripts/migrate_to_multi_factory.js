const mongoose = require('mongoose');
require('dotenv').config();

// Load models
const { Factory } = require('../models/Factory');
const { User } = require('../models/User');
const { Equipment } = require('../models/Equipment');
const { ProcessArea } = require('../models/ProcessArea');
const { Part } = require('../models/Part');
const { connectDB } = require('../config/database');

async function migrate() {
    console.log('Connecting to MongoDB...');
    // We mock process.exit to avoid exiting in the migration script if connectDB calls it on error, 
    // though ideally we'd refactor connectDB. For now this is fine.
    await connectDB();
    console.log('Connected.');

    try {
        // 1. Check if default factory exists
        let defaultFactory = await Factory.findOne({ code: 'MAIN' });

        if (!defaultFactory) {
            console.log('Creating default Factory (MAIN)...');
            defaultFactory = await Factory.create({
                name: 'Usine Principale',
                code: 'MAIN',
                address: 'Antsirabe',
                description: 'Usine par défaut créée lors de la migration'
            });
            console.log(`Factory created with ID: ${defaultFactory._id}`);
        } else {
            console.log(`Default factory found: ${defaultFactory._id}`);
        }

        const factoryId = defaultFactory._id;

        // 2. Migrate Users
        console.log('Migrating Users...');
        const users = await User.find({
            $or: [
                { factories: { $size: 0 } },
                { activeFactory: { $exists: false } }
            ]
        });
        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            if (!user.factories || user.factories.length === 0) {
                user.factories = [factoryId];
            }
            if (!user.activeFactory) {
                user.activeFactory = factoryId;
            }
            if (!user.defaultFactory) {
                user.defaultFactory = factoryId;
            }
            await user.save();
        }

        // 3. Migrate Process Areas
        console.log('Migrating Process Areas...');
        const processAreas = await ProcessArea.find({ factory: { $exists: false } });
        console.log(`Found ${processAreas.length} ProcessAreas to migrate.`);
        if (processAreas.length > 0) {
            await ProcessArea.updateMany(
                { factory: { $exists: false } },
                { $set: { factory: factoryId } }
            );
        }

        // 4. Migrate Equipment
        console.log('Migrating Equipment...');
        const equipment = await Equipment.find({ factory: { $exists: false } });
        console.log(`Found ${equipment.length} Equipment to migrate.`);
        if (equipment.length > 0) {
            await Equipment.updateMany(
                { factory: { $exists: false } },
                { $set: { factory: factoryId } }
            );
        }

        // 5. Migrate Parts
        console.log('Migrating Parts...');
        const parts = await Part.find({ factory: { $exists: false } });
        console.log(`Found ${parts.length} Parts to migrate.`);
        if (parts.length > 0) {
            await Part.updateMany(
                { factory: { $exists: false } },
                { $set: { factory: factoryId } }
            );
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
