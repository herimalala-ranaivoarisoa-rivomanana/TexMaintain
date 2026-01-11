const { connectDB } = require('../config/database');
const { Asset } = require('../models/Asset');

const checkData = async () => {
    try {
        await connectDB();
        const eq = await Asset.findOne({ purchasePrice: { $gt: 0 } }).lean();
        if (eq) {
            console.log('Found asset with financial data:');
            console.log('ID:', eq._id);
            console.log('Name:', eq.name);
            console.log('Purchase Price:', eq.purchasePrice);
            console.log('Useful Life:', eq.usefulLifeYears);
            console.log('Current Value:', eq.currentValue);
            console.log('TCO:', eq.tco);
        } else {
            console.log('No asset found with purchasePrice > 0');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
