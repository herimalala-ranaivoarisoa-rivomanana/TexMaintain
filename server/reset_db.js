const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionSection } = require('./models/ProductionSection');
const { ProductionLine } = require('./models/ProductionLine');
const { AssetPart } = require('./models/AssetPart');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { Project } = require('./models/Project');

const clean = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        console.log('Deleting Asset...');
        await Asset.deleteMany({});

        console.log('Deleting ProductionLines...');
        await ProductionLine.deleteMany({});

        console.log('Deleting ProductionSections...');
        await ProductionSection.deleteMany({});

        console.log('Deleting AssetParts...');
        await AssetPart.deleteMany({});

        console.log('Deleting Interventions...');
        await Intervention.deleteMany({});

        console.log('Deleting Parts...');
        await Part.deleteMany({});

        console.log('Deleting Projects...');
        await Project.deleteMany({});

        console.log('✅ Cleaned All Production Data.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

clean();
