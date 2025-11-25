const express = require('express');
const router = express.Router();
const { Project } = require('../models/Project');
const { requireUser } = require('./middleware/auth');

// GET /api/projects - List all projects
router.get('/', requireUser, async (req, res) => {
    try {
        const projects = await Project.find().sort({ startDate: -1 });
        res.json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

// GET /api/projects/stats - Get project statistics
router.get('/stats', requireUser, async (req, res) => {
    try {
        const [
            activeCount,
            completedCount,
            totalBudgetResult,
            totalTeamSizeResult
        ] = await Promise.all([
            Project.countDocuments({ status: 'In Progress' }),
            Project.countDocuments({ status: 'Completed' }),
            Project.aggregate([
                { $group: { _id: null, total: { $sum: '$budget' } } }
            ]),
            Project.aggregate([
                { $group: { _id: null, total: { $sum: '$teamSize' } } }
            ])
        ]);

        res.json({
            activeProjects: activeCount,
            completedProjects: completedCount,
            totalBudget: totalBudgetResult[0]?.total || 0,
            totalTeamMembers: totalTeamSizeResult[0]?.total || 0
        });
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({ message: 'Error fetching project stats' });
    }
});

// POST /api/projects - Create a new project
router.post('/', requireUser, async (req, res) => {
    try {
        const { title, description, budget, startDate, endDate, teamSize } = req.body;

        const project = new Project({
            title,
            description,
            budget,
            startDate,
            endDate,
            teamSize,
            createdBy: req.user._id
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

module.exports = router;
