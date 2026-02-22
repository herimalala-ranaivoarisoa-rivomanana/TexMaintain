const mongoose = require('mongoose');
require('dotenv').config();
const { Asset } = require('./models/Asset');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionDepartment } = require('./models/ProductionDepartment');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { AssetPart } = require('./models/AssetPart');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const line = await ProductionLine.findOne({ name: 'Line 1' }).populate({
            path: 'departments.departmentId',
            populate: {
                path: 'asset.assetId',
                model: 'Asset'
            }
        }).lean();

        if (!line) {
            console.error('Line 1 not found');
            process.exit(1);
        }

        const assetList = [];
        if (line.departments) {
            line.departments.forEach(department => {
                if (department.departmentId && department.departmentId.asset) {
                    department.departmentId.asset.forEach(item => {
                        if (item.assetId) {
                            assetList.push(item.assetId);
                        }
                    });
                }
            });
        }

        const assetIds = assetList.map(e => e._id);
        console.log(`Line 1 Asset Count: ${assetIds.length}`);

        // Active Interventions (Using assetId which is the correct ObjectId ref)
        const activeInterventionsCount = await Intervention.countDocuments({
            assetId: { $in: assetIds },
            status: { $in: ['Pending', 'In Progress'] }
        });
        console.log(`Active Interventions for Line 1: ${activeInterventionsCount}`);

        // Critical Parts (Low Stock for parts used by Line 1 asset)
        // 1. Get parts used by asset
        const assetParts = await AssetPart.find({ asset: { $in: assetIds } }).distinct('part');
        // 2. Check stock
        const criticalPartsCount = await Part.countDocuments({
            _id: { $in: assetParts },
            $expr: { $lte: ['$currentStock', '$minStock'] }
        });
        console.log(`Critical Parts for Line 1: ${criticalPartsCount}`);

        // Pending Orders
        const pendingOrdersParts = await Part.find({
            _id: { $in: assetParts },
            'pendingOrders.status': { $in: ['pending', 'ordered', 'in_transit'] }
        });

        let pendingOrdersCount = 0;
        pendingOrdersParts.forEach(p => {
            pendingOrdersCount += p.pendingOrders.filter(o => ['pending', 'ordered', 'in_transit'].includes(o.status)).length;
        });
        console.log(`Pending Orders for Line 1: ${pendingOrdersCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
