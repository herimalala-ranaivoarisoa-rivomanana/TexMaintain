const mongoose = require('mongoose');

const projectExpenseSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    part: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part',
        required: false
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Material', 'Labor', 'Service', 'Other'],
        default: 'Other',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const ProjectExpense = mongoose.model('ProjectExpense', projectExpenseSchema);

module.exports = { ProjectExpense };
