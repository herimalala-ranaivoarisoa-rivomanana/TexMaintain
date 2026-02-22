const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionDepartment } = require('./models/ProductionDepartment');

const inspect = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const asset = await Asset.findOne();
        console.log('Sample Asset:', JSON.stringify(asset, null, 2));

        const department = await ProductionDepartment.findOne({ asset: { $exists: true, $not: { $size: 0 } } });
        if (department) {
            console.log('Sample Department with Asset:', JSON.stringify(department, null, 2));
        } else {
            console.log('No department found with asset.');
            const anyDepartment = await ProductionDepartment.findOne();
            console.log('Sample Empty Department:', JSON.stringify(anyDepartment, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspect();
