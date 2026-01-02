const { connectDB } = require('../config/database');
const { Equipment } = require('../models/Equipment');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
require('../models/EquipmentCategory'); // Ensure registration

const debugReports = async () => {
    try {
        await connectDB();
        console.log('--- Debugging Reports Data ---');

        // 1. Equipment Count
        const count = await Equipment.countDocuments();
        console.log('Equipment Count:', count);

        // 2. Active Interventions
        const activeInt = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
        console.log('Active Interventions:', activeInt);

        // 3. Low Stock
        const lowStock = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });
        console.log('Low Stock:', lowStock);

        // 4. Financials
        const financials = await Equipment.aggregate([
            {
                $group: {
                    _id: null,
                    totalTCO: { $sum: '$tco' },
                    totalAssetValue: { $sum: '$purchasePrice' }
                }
            }
        ]);
        console.log('Financials Aggregation:', financials);

        // 5. TCO By Category
        const tcoByCat = await Equipment.aggregate([
            {
                $lookup: {
                    from: 'equipmentcategories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo.name',
                    totalTCO: { $sum: '$tco' },
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('TCO By Category:', tcoByCat);

        process.exit(0);
    } catch (error) {
        console.error('DEBUG ERROR:', error);
        process.exit(1);
    }
};

debugReports();
