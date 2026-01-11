const { connectDB } = require('../config/database');
const { Asset } = require('../models/Asset');
const { Intervention } = require('../models/Intervention');
const { Part } = require('../models/Part');
require('../models/Category'); // Ensure registration

const debugReports = async () => {
    try {
        await connectDB();
        console.log('--- Debugging Reports Data ---');

        // 1. Asset Count
        const count = await Asset.countDocuments();
        console.log('Asset Count:', count);

        // 2. Active Interventions
        const activeInt = await Intervention.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
        console.log('Active Interventions:', activeInt);

        // 3. Low Stock
        const lowStock = await Part.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } });
        console.log('Low Stock:', lowStock);

        // 4. Financials
        const financials = await Asset.aggregate([
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
        const tcoByCat = await Asset.aggregate([
            {
                $lookup: {
                    from: 'assetcategories',
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
