const mongoose = require('mongoose');
const { Asset } = require('./models/Asset');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionDepartment } = require('./models/ProductionDepartment');
require('dotenv').config();

async function inspectDB() {
    try {
        const mongoUri = 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const totalAsset = await Asset.countDocuments();
        const totalLines = await ProductionLine.countDocuments();
        const totalDepartments = await ProductionDepartment.countDocuments();

        console.log(`Total Asset: ${totalAsset}`);
        console.log(`Total Process areas: ${totalLines}`);
        console.log(`Total Departments: ${totalDepartments}`);

        const lines = await ProductionLine.find().populate({
            path: 'departments.departmentId',
            populate: { path: 'asset.assetId' }
        });

        for (const line of lines) {
            let lineEquipCount = 0;
            line.departments.forEach(s => {
                if (s.departmentId && s.departmentId.asset) {
                    lineEquipCount += s.departmentId.asset.length;
                }
            });
            console.log(`Line '${line.name}': ${lineEquipCount} asset assigned.`);
        }

        const assignedEquipIds = new Set();
        lines.forEach(l => l.departments.forEach(s => {
            if (s.departmentId && s.departmentId.asset) {
                s.departmentId.asset.forEach(e => assignedEquipIds.add(e.assetId?.toString()));
            }
        }));

        console.log(`Total Assigned Asset: ${assignedEquipIds.size}`);
        console.log(`Total Unassigned (Orphan) Asset: ${totalAsset - assignedEquipIds.size}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectDB();
