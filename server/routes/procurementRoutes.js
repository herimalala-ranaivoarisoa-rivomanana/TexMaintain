const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Part } = require('../models/Part');
const { requireUser } = require('./middleware/auth');

// GET /api/procurement/orders - List all purchase orders
router.get('/orders', requireUser, async (req, res) => {
    try {
        const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};

        // Find all parts that have pending orders AND belong to the factory
        const parts = await Part.find({
            ...factoryFilter,
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
                        reference: order.reference,
                        references: Array.isArray(order.references)
                            ? order.references
                            : (order.reference ? [order.reference] : []),
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
        const factoryFilter = req.activeFactoryId ? { factory: new mongoose.Types.ObjectId(req.activeFactoryId) } : {};

        const parts = await Part.find({
            ...factoryFilter,
            'pendingOrders.0': { $exists: true }
        }).lean();

        let pendingCount = 0;
        let activeCount = 0;
        let overdueCount = 0;
        let completedCount = 0;
        const suppliers = new Set();

        const now = new Date();

        parts.forEach(part => {
            if (part.supplier) suppliers.add(part.supplier);

            if (part.pendingOrders) {
                part.pendingOrders.forEach(order => {
                    if (order.supplier) suppliers.add(order.supplier);

                    if (order.status === 'pending') pendingCount++;
                    else if (['ordered', 'in_transit'].includes(order.status)) activeCount++;
                    else if (order.status === 'received') completedCount++;

                    if (
                        order.expectedDate &&
                        !['received', 'cancelled'].includes(order.status) &&
                        new Date(order.expectedDate) < now
                    ) {
                        overdueCount++;
                    }
                });
            }
        });

        res.json({
            pendingRequests: pendingCount,
            activeOrders: activeCount,
            overdueOrders: overdueCount,
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
        const { partId, quantity, supplier, notes, expectedDate, reference, references } = req.body;

        if (!partId || !mongoose.isValidObjectId(partId)) {
            return res.status(400).json({ message: 'Invalid partId' });
        }

        if (!quantity || Number(quantity) <= 0) {
            return res.status(400).json({ message: 'Quantity must be greater than 0' });
        }

        const query = { _id: partId };
        if (req.activeFactoryId) query.factory = req.activeFactoryId;

        const part = await Part.findOne(query);
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        await part.addOrder({
            quantity: Number(quantity),
            supplier,
            notes,
            expectedDate,
            reference,
            references,
            status: 'pending',
            orderNumber: `PO-${Date.now()}`
        });

        const createdOrder = part.pendingOrders?.[part.pendingOrders.length - 1];
        res.status(201).json({
            message: 'Order created successfully',
            order: createdOrder
                ? {
                    _id: createdOrder._id,
                    partId: part._id,
                    quantity: createdOrder.quantity,
                    status: createdOrder.status,
                    orderDate: createdOrder.orderDate,
                    expectedDate: createdOrder.expectedDate,
                    supplier: createdOrder.supplier,
                    orderNumber: createdOrder.orderNumber,
                    reference: createdOrder.reference,
                    references: createdOrder.references
                }
                : null
        });
    } catch (error) {
        console.error('Error creating procurement order:', error);
        res.status(500).json({ message: 'Error creating procurement order' });
    }
});

// PATCH /api/procurement/orders/:id/status - Update order status
router.patch('/orders/:id/status', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, partId, quantity, reference, references } = req.body;

        if (!partId || !mongoose.isValidObjectId(partId)) {
            return res.status(400).json({ message: 'Invalid partId' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const validStatuses = ['pending', 'ordered', 'in_transit', 'received', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const query = { _id: partId };
        if (req.activeFactoryId) query.factory = req.activeFactoryId;

        const part = await Part.findOne(query);
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        // quantity < existingOrder.quantity => split => permet in_transit partiel / received partiel
        await part.updateOrderStatus(id, status, {
            quantity: quantity !== undefined ? Number(quantity) : undefined,
            reference,
            references
        });

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

module.exports = router;
