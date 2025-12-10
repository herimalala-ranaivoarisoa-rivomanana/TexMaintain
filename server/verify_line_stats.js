const mongoose = require('mongoose');
require('dotenv').config();
const { Equipment } = require('./models/Equipment');
const { ProductionLine } = require('./models/ProductionLine');
const { ProductionSection } = require('./models/ProductionSection');

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
        console.log(`Found ${equipmentIds.length} equipment for Line 1`);

        if (equipmentIds.length > 0) {
            // Test Aggregation
            const aggregation = await Equipment.aggregate([
                { $match: { _id: { $in: equipmentIds } } },
                {
                    $group: {
                        _id: null,
                        avgMtbf: { $avg: '$mtbf' },
                        avgMttr: { $avg: '$mttr' }
                    }
                }
            ]);
            console.log('Aggregation Result:', aggregation);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verify();
