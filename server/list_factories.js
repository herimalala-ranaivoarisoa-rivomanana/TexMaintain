const mongoose = require('mongoose');
const { Factory } = require('./models/Factory');
require('dotenv').config();

async function listFactories() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        const factories = await Factory.find({});
        console.log(`\nTOTAL FACTORIES FOUND: ${factories.length}`);
        console.log('---------------------------------------------------');
        factories.forEach(f => {
            console.log(`ID: ${f._id} | Code: ${f.code.padEnd(15)} | Name: ${f.name}`);
        });
        console.log('---------------------------------------------------');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listFactories();
