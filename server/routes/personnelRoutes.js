const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireRole } = require('./middleware/auth');
const { Personnel } = require('../models/Personnel');

const router = express.Router();

// GET /api/personnel - Get all personnel (filtered by factory)
router.get('/', requireUser, async (req, res) => {
    try {
        const factoryId = req.activeFactoryId || req.header('x-factory-id');
        if (!factoryId) {
            return res.status(400).json({ message: 'Factory Header Missing' });
        }

        const { page = 1, limit = 50, q, isActive, role, specialization } = req.query;

        const query = { factory: new mongoose.Types.ObjectId(factoryId) };

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (role) {
            query.role = role;
        }

        if (specialization) {
            query.specialization = specialization;
        }

        if (q) {
            query.$or = [
                { fullName: { $regex: q, $options: 'i' } },
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } },
                { matricule: { $regex: q, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [personnel, total] = await Promise.all([
            Personnel.find(query)
                .sort({ lastName: 1, firstName: 1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Personnel.countDocuments(query)
        ]);

        return res.status(200).json({
            personnel,
            page: Number(page),
            total,
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Get personnel error:', error);
        return res.status(500).json({ message: 'Failed to fetch personnel' });
    }
});

// GET /api/personnel/:id
router.get('/:id', requireUser, async (req, res) => {
    try {
        const factoryId = req.activeFactoryId || req.header('x-factory-id');
        const query = { _id: req.params.id };
        if (factoryId) {
            query.factory = new mongoose.Types.ObjectId(factoryId);
        }

        const person = await Personnel.findOne(query).lean();
        if (!person) {
            return res.status(404).json({ message: 'Personnel not found' });
        }
        return res.status(200).json(person);
    } catch (error) {
        console.error('Get person error:', error);
        return res.status(500).json({ message: 'Failed to fetch personnel' });
    }
});

// POST /api/personnel - Create new personnel
router.post('/', requireUser, requireRole(['admin', 'hr', 'maintenance_manager']), async (req, res) => {
    try {
        const factoryId = req.activeFactoryId || req.header('x-factory-id');
        if (!factoryId) {
            return res.status(400).json({ message: 'Factory Header Missing' });
        }

        const { matricule, firstName, lastName, role, specialization, certifications, isActive } = req.body;

        if (!matricule || !firstName || !lastName || !role) {
            return res.status(400).json({ message: 'Matricule, firstName, lastName, and role are required' });
        }

        const validRoles = ['Mechanic', 'Electrician', 'Machinist', 'MaintenanceWorker'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }

        // Check duplicate matricule in factory
        const existing = await Personnel.findOne({
            matricule,
            factory: new mongoose.Types.ObjectId(factoryId)
        });
        if (existing) {
            return res.status(400).json({ message: 'Personnel with this matricule already exists in this factory' });
        }

        const person = new Personnel({
            matricule,
            firstName,
            lastName,
            role,
            specialization,
            certifications,
            isActive: isActive !== undefined ? isActive : true,
            factory: factoryId
        });

        await person.save();
        return res.status(201).json(person);

    } catch (error) {
        console.error('Create personnel error:', error);
        return res.status(500).json({ message: 'Failed to create personnel' });
    }
});

// PUT /api/personnel/:id
router.put('/:id', requireUser, requireRole(['admin', 'hr', 'maintenance_manager']), async (req, res) => {
    try {
        const factoryId = req.activeFactoryId || req.header('x-factory-id');
        const existing = await Personnel.findOne({
            _id: req.params.id,
            ...(factoryId && { factory: new mongoose.Types.ObjectId(factoryId) })
        });

        if (!existing) {
            return res.status(404).json({ message: 'Personnel not found' });
        }

        const { matricule, firstName, lastName, role, specialization, certifications, isActive } = req.body;

        if (matricule) {
            const dup = await Personnel.findOne({
                matricule,
                _id: { $ne: req.params.id },
                factory: existing.factory
            });
            if (dup) return res.status(400).json({ message: 'Matricule already in use' });
        }

        const updateData = {};
        if (matricule !== undefined) updateData.matricule = matricule;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (role !== undefined) updateData.role = role;
        if (specialization !== undefined) updateData.specialization = specialization;
        if (certifications !== undefined) updateData.certifications = certifications;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await Personnel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Update personnel error:', error);
        return res.status(500).json({ message: 'Failed to update personnel' });
    }
});

// DELETE /api/personnel/:id (Soft delete)
router.delete('/:id', requireUser, requireRole(['admin', 'hr', 'maintenance_manager']), async (req, res) => {
    try {
        const factoryId = req.activeFactoryId || req.header('x-factory-id');
        const query = { _id: req.params.id };
        if (factoryId) {
            query.factory = new mongoose.Types.ObjectId(factoryId);
        }

        const person = await Personnel.findOneAndUpdate(
            query,
            { isActive: false },
            { new: true }
        );

        if (!person) return res.status(404).json({ message: 'Personnel not found' });

        return res.status(200).json({ message: 'Personnel deactivated successfully' });
    } catch (error) {
        console.error('Delete personnel error:', error);
        return res.status(500).json({ message: 'Failed to delete personnel' });
    }
});

module.exports = router;
