const mongoose = require('mongoose');
require('dotenv').config();
const { Equipment } = require('./models/Equipment');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionSection } = require('./models/ProductionSection');
const { Intervention } = require('./models/Intervention');
const { Part } = require('./models/Part');
const { EquipmentPart } = require('./models/EquipmentPart');

const verify = async () => {
    try {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const line = await ProductionLine.findOne({ name: 'Line 1' }).populate({
            path: 'sections.sectionId',
            populate: {
                path: 'equipment.equipmentId',
                model: 'Equipment'
            }
        }).lean();

        if (!line) {
            console.error('Line 1 not found');
            process.exit(1);
        }

        const equipmentList = [];
        if (line.sections) {
            line.sections.forEach(section => {
                if (section.sectionId && section.sectionId.equipment) {
                    section.sectionId.equipment.forEach(item => {
                        if (item.equipmentId) {
                            equipmentList.push(item.equipmentId);
                        }
                    });
                }
            });
        }

        const equipmentIds = equipmentList.map(e => e._id);
        console.log(`Line 1 Equipment Count: ${equipmentIds.length}`);

        // Active Interventions (Using equipmentId which is the correct ObjectId ref)
        const activeInterventionsCount = await Intervention.countDocuments({
            equipmentId: { $in: equipmentIds },
            status: { $in: ['Pending', 'In Progress'] }
        });
        console.log(`Active Interventions for Line 1: ${activeInterventionsCount}`);

        // Critical Parts (Low Stock for parts used by Line 1 equipment)
        // 1. Get parts used by equipment
        const equipmentParts = await EquipmentPart.find({ equipment: { $in: equipmentIds } }).distinct('part');
        // 2. Check stock
        const criticalPartsCount = await Part.countDocuments({
            _id: { $in: equipmentParts },
            $expr: { $lte: ['$currentStock', '$minStock'] }
        });
        console.log(`Critical Parts for Line 1: ${criticalPartsCount}`);

        // Pending Orders
        const pendingOrdersParts = await Part.find({
            _id: { $in: equipmentParts },
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
