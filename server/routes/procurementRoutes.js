const express = require('express');
const router = express.Router();
const { Part } = require('../models/Part');
const { requireUser } = require('./middleware/auth');

// GET /api/procurement/orders - List all purchase orders
router.get('/orders', requireUser, async (req, res) => {
    try {
        // Find all parts that have pending orders
        const parts = await Part.find({
            'pendingOrders.0': { $exists: true }
        }).lean();

        const orders = [];

        parts.forEach(part => {
            if (part.pendingOrders && part.pendingOrders.length > 0) {
                part.pendingOrders.forEach(order => {
                    orders.push({
                        _id: order._id,
                        partId: part._id,
                        partName: part.name,
                        partNumber: part.partNumber,
                        quantity: order.quantity,
                        status: order.status,
                        orderDate: order.orderDate,
                        expectedDate: order.expectedDate,
                        supplier: order.supplier || part.supplier,
                        orderNumber: order.orderNumber,
                        totalPrice: (order.quantity * (part.unitPrice || 0))
                    });
                });
            }
        });

        // Sort by date desc
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        res.json({ orders });
    } catch (error) {
        console.error('Error fetching procurement orders:', error);
        res.status(500).json({ message: 'Error fetching procurement orders' });
    }
});

// GET /api/procurement/stats - Get procurement statistics
router.get('/stats', requireUser, async (req, res) => {
    try {
        const parts = await Part.find({
            'pendingOrders.0': { $exists: true }
        }).lean();

        let pendingCount = 0;
        let activeCount = 0;
        let completedCount = 0;
        const suppliers = new Set();

        parts.forEach(part => {
            if (part.supplier) suppliers.add(part.supplier);

            if (part.pendingOrders) {
                part.pendingOrders.forEach(order => {
                    if (order.supplier) suppliers.add(order.supplier);

                    if (order.status === 'pending') pendingCount++;
                    else if (['ordered', 'in_transit'].includes(order.status)) activeCount++;
                    else if (order.status === 'received') completedCount++;
                });
            }
        });

        res.json({
            pendingRequests: pendingCount,
            activeOrders: activeCount,
            completedOrders: completedCount,
            totalSuppliers: suppliers.size
        });
    } catch (error) {
        console.error('Error fetching procurement stats:', error);
        res.status(500).json({ message: 'Error fetching procurement stats' });
    }
});

// POST /api/procurement/orders - Create a new order (add to part)
router.post('/orders', requireUser, async (req, res) => {
    try {
        const { partId, quantity, supplier, notes, expectedDate } = req.body;

        const part = await Part.findById(partId);
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        await part.addOrder({
            quantity,
            supplier,
            notes,
            expectedDate,
            status: 'pending',
            orderNumber: `PO-${Date.now()}`
        });

        res.status(201).json({ message: 'Order created successfully' });
    } catch (error) {
        console.error('Error creating procurement order:', error);
        res.status(500).json({ message: 'Error creating procurement order' });
    }
});

// PATCH /api/procurement/orders/:id/status - Update order status
router.patch('/orders/:id/status', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, partId, quantity, reference } = req.body;

        const part = await Part.findById(partId);
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        await part.updateOrderStatus(id, status, { quantity, reference });

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

module.exports = router;
