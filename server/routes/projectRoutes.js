const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Project } = require('../models/Project');
const { requireUser } = require('./middleware/auth');
const { ProjectExpense } = require('../models/ProjectExpense');
const { Part } = require('../models/Part');

// GET /api/projects - List all projects
router.get('/', requireUser, async (req, res) => {
    try {
        const factoryId = req.activeFactoryId;
        const query = factoryId ? { factory: factoryId } : {};

        const projects = await Project.find(query).sort({ startDate: -1 });
        res.json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

// GET /api/projects/stats - Get project statistics
router.get('/stats', requireUser, async (req, res) => {
    try {
        const factoryId = req.activeFactoryId;
        const query = factoryId ? { factory: new mongoose.Types.ObjectId(factoryId) } : {};
        const countQuery = factoryId ? { factory: factoryId } : {};

        const [
            activeCount,
            completedCount,
            totalBudgetResult,
            totalTeamSizeResult
        ] = await Promise.all([
            Project.countDocuments({ ...countQuery, status: 'In Progress' }),
            Project.countDocuments({ ...countQuery, status: 'Completed' }),
            Project.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$budget' } } }
            ]),
            Project.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$teamSize' } } }
            ])
        ]);

        const stats = {
            activeProjects: activeCount,
            completedProjects: completedCount,
            totalBudget: totalBudgetResult[0]?.total || 0,
            totalTeamMembers: totalTeamSizeResult[0]?.total || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({ message: 'Error fetching project stats' });
    }
});

// POST /api/projects - Create a new project
router.post('/', requireUser, async (req, res) => {
    try {
        const { title, description, budget, startDate, endDate, teamSize, status } = req.body;

        const project = new Project({
            title,
            description,
            budget,
            startDate,
            endDate,
            teamSize,
            teamSize,
            status: status || 'Planned',
            createdBy: req.user._id,
            factory: req.activeFactoryId
        });

        await project.save();
        res.status(201).json({ message: 'Project created successfully', project });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Error creating project' });
    }
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const project = await Project.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project updated successfully', project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Error updating project' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByIdAndDelete(id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Also delete associated expenses
        await ProjectExpense.deleteMany({ project: id });

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project' });
    }
});

// --- Expenses Management ---

// GET /api/projects/:id/details - Get project with expense summary
router.get('/:id/details', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Calculate total expenses
        const expenses = await ProjectExpense.find({ project: id });
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        res.json({
            project,
            totalSpent,
            expenseCount: expenses.length
        });
    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({ message: 'Error fetching project details' });
    }
});

// GET /api/projects/:id/expenses - Get project expenses
router.get('/:id/expenses', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const expenses = await ProjectExpense.find({ project: id })
            .sort({ date: -1 })
            .populate('createdBy', 'firstName lastName email');

        res.json({ expenses });
    } catch (error) {
        console.error('Error fetching project expenses:', error);
        res.status(500).json({ message: 'Error fetching project expenses' });
    }
});

// POST /api/projects/:id/expenses - Add expense
router.post('/:id/expenses', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, category, amount, date } = req.body;

        const expense = new ProjectExpense({
            project: id,
            description,
            category,
            amount,
            date: date || new Date(),
            createdBy: req.user._id
        });

        await expense.save();

        res.status(201).json({ message: 'Expense added successfully', expense });
    } catch (error) {
        console.error('Error adding project expense:', error);
        res.status(500).json({ message: 'Error adding project expense' });
    }
});

// POST /api/projects/:id/parts - Consume part for project
router.post('/:id/parts', requireUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { partId, quantity, date } = req.body;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be greater than 0' });
        }

        const part = await Part.findById(partId);
        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        if (part.currentStock < quantity) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${part.currentStock}`
            });
        }

        // 1. Decrement stock
        part.currentStock -= quantity;
        await part.save();

        // 2. Create Expense
        const totalCost = quantity * part.unitPrice;

        const expense = new ProjectExpense({
            project: id,
            part: partId,
            description: `Used ${quantity}x ${part.name}`,
            category: 'Material',
            amount: totalCost,
            date: date || new Date(),
            createdBy: req.user._id
        });

        await expense.save();

        res.status(201).json({
            message: 'Part consumed successfully',
            expense,
            newStock: part.currentStock
        });

    } catch (error) {
        console.error('Error consuming part:', error);
        res.status(500).json({ message: 'Error consuming part' });
    }
});

module.exports = router;
