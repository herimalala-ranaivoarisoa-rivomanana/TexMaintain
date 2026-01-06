const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Mechanic } = require('../models/Mechanic');
const { Electrician } = require('../models/Electrician');
const { Machinist } = require('../models/Machinist');
const { MaintenanceWorker } = require('../models/MaintenanceWorker');
const { Personnel } = require('../models/Personnel');

async function migrate() {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Mappings
        const models = [
            { model: Mechanic, role: 'Mechanic' },
            { model: Electrician, role: 'Electrician' },
            { model: Machinist, role: 'Machinist' },
            { model: MaintenanceWorker, role: 'MaintenanceWorker' }
        ];

        let totalMigrated = 0;
        let errors = 0;

        for (const { model, role } of models) {
            console.log(`Migrating ${role}s...`);
            const items = await model.find({}).lean();

            for (const item of items) {
                try {
                    // Check if already exists (idempotency)
                    const exists = await Personnel.findById(item._id);
                    if (exists) {
                        console.log(`Skipping existing ${role}: ${item.fullName} (${item._id})`);
                        continue;
                    }

                    const personnelData = {
                        _id: item._id, // PRESERVE ID
                        matricule: item.matricule,
                        firstName: item.firstName,
                        lastName: item.lastName,
                        fullName: item.fullName,
                        factory: item.factory,
                        role: role,
                        specialization: item.specialization,
                        certifications: item.certifications || [],
                        isActive: item.isActive,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    };

                    await Personnel.create(personnelData);
                    totalMigrated++;
                } catch (err) {
                    console.error(`Error migrating ${role} ${item._id}:`, err.message);
                    errors++;
                }
            }
        }

        console.log(`Migration Complete. Migrated: ${totalMigrated}, Errors: ${errors}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
