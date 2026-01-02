const mongoose = require('mongoose');
const { Part } = require('../models/Part');
require('dotenv').config();

const verifySplitParams = async () => {
    try {
        const uri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain';
        console.log('Connecting to MongoDB with URI starting with:', uri.substring(0, 15) + '...');

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // 1. Create a dummy part
        const part = new Part({
            name: 'TEST_SPLIT_PART',
            partNumber: 'TEST-001',
            category: 'Test',
            currentStock: 0,
            minStock: 10,
            maxStock: 100
        });
        await part.save();
        console.log('1. Created Part:', part._id);

        // 2. Add an order (Quantity 100)
        await part.addOrder({
            quantity: 100,
            status: 'pending',
            supplier: 'Test Supplier',
            orderNumber: 'PO-TEST-1'
        });
        // Reload part to get the order ID
        const partWithOrder = await Part.findById(part._id);
        const originalOrder = partWithOrder.pendingOrders[0];
        console.log('2. Added Order:', originalOrder._id, 'Qty:', originalOrder.quantity);

        // 3. Perform Partial Update (Move 30 to 'in_transit')
        console.log('3. Moving 30 units to "in_transit" with Ref "BL-123"...');
        await partWithOrder.updateOrderStatus(originalOrder._id, 'in_transit', {
            quantity: 30,
            reference: 'BL-123'
        });

        // 4. Verify Results
        const partUpdated = await Part.findById(part._id);
        console.log('4. Verifying Orders...');

        if (partUpdated.pendingOrders.length !== 2) {
            console.error('FAIL: Expected 2 orders, found', partUpdated.pendingOrders.length);
        } else {
            const pendingOrder = partUpdated.pendingOrders.find(o => o.status === 'pending');
            const transitOrder = partUpdated.pendingOrders.find(o => o.status === 'in_transit');

            console.log(' - Pending Qty:', pendingOrder.quantity, '(Expected 70)');
            console.log(' - Transit Qty:', transitOrder.quantity, '(Expected 30)');
            console.log(' - Transit Ref:', transitOrder.reference, '(Expected BL-123)');

            if (pendingOrder.quantity === 70 && transitOrder.quantity === 30 && transitOrder.reference === 'BL-123') {
                console.log('SUCCESS: Logic Verified Correctly!');
            } else {
                console.error('FAIL: Quantities or Reference mismatch');
            }
        }

        // Cleanup
        await Part.deleteOne({ _id: part._id });
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifySplitParams();
