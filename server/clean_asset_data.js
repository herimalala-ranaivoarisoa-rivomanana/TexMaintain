const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionDepartment } = require('./models/ProductionDepartment');
const { ProductionLine } = require('./models/ProductionLine');
const { AssetPart } = require('./models/AssetPart');
const { Intervention } = require('./models/Intervention');

const clean = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        console.log('Deleting Asset...');
        await Asset.deleteMany({});

        console.log('Deleting ProductionLines...');
        await ProductionLine.deleteMany({});

        console.log('Deleting ProductionDepartments...');
        await ProductionDepartment.deleteMany({});

        console.log('Deleting AssetParts...');
        await AssetPart.deleteMany({});

        console.log('Deleting Interventions...');
        await Intervention.deleteMany({});

        console.log('✅ Cleaned Asset and related data.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

clean();
