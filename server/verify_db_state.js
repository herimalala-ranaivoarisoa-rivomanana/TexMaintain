const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: '/home/aiaa4solutions/Documents/AQUARELLE/TexMaintain/server/.env' });

console.log('Checking for DATABASE_URL...');
if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is undefined!');
    console.log('Current directory:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('Env file path:', '/home/aiaa4solutions/Documents/AQUARELLE/TexMaintain/server/.env');
    process.exit(1);
} else {
    console.log('DATABASE_URL found');
}

const { Part } = require('./models/Part');

async function verifyState() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');

        const parts = await Part.find({ name: 'V-Belt Type A' });
        console.log(`Found ${parts.length} V-Belt Type A parts.`);

        let duplicates = 0;
        parts.forEach(p => {
            console.log(`Part ${p._id} (Factory: ${p.factory}): Pending Orders: ${p.pendingOrders.length}`);
            if (p.pendingOrders.length > 0) {
                p.pendingOrders.forEach(o => {
                    console.log(`  - Qty: ${o.quantity}, Status: ${o.status}, Expected: ${o.expectedDate}`);
                    if (o.quantity === 20 && o.status === 'ordered') {
                        duplicates++;
                    }
                });
            }
        });

        if (duplicates > 0) {
            console.log('⚠️  WARNING: Found duplicate hardcoded orders still in DB!');
        } else {
            console.log('✅  SUCCESS: No hardcoded duplicate orders found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyState();
