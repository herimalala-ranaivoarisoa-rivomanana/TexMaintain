const mongoose = require('mongoose');
const { User } = require('./models/User');
const { Factory } = require('./models/Factory');
require('dotenv').config();

async function updateAdmin() {
    await mongoose.connect(process.env.DATABASE_URL);

    const adminEmail = 'admin@texmaintain.com';
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
        console.log('Admin user not found!');
        process.exit(1);
    }

    const factories = await Factory.find();
    if (factories.length === 0) {
        console.log('No factories found!');
        process.exit(1);
    }

    console.log(`User: ${user.email}`);
    console.log(`Current Factories: ${user.factories ? user.factories.length : 0}`);

    const factoryIds = factories.map(f => f._id);

    user.factories = factoryIds;
    // Set active factory to first one if not set
    if (!user.activeFactory) {
        user.activeFactory = factoryIds[0];
    }

    await user.save();

    console.log('-----------------------------------');
    console.log(`Updated User Factories: ${user.factories.length}`);
    console.log('Factories assigned:');
    factories.forEach(f => console.log(`- ${f.name}`));

    await mongoose.disconnect();
}

updateAdmin();
