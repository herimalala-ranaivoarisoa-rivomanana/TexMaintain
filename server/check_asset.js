const mongoose = require('mongoose');
const { Asset } = require('./models/Asset');
require('dotenv').config();

const ids = ['692f0f11d08882b2f17a60bd', '692f0f11d08882b2f17a60ba'];

async function check() {
    try {
        await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain');
        console.log('Connected to DB');

        for (const id of ids) {
            const exists = await Asset.findById(id);
            console.log(`ID ${id}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
            if (exists) {
                console.log('Status:', exists.status);
            }
        }

        // Also list all asset to see what's there
        const all = await Asset.find({}, '_id name status').limit(5);
        console.log('First 5 asset:', all);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
