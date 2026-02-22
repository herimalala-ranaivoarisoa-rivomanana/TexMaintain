const mongoose = require('mongoose');

const processAreaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    factory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Factory',
        required: false, // Will be required after migration
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    // Classification: e.g., 'Production', 'Utility', 'Facility'
    type: {
        type: String,
        enum: ['production', 'utility', 'facility', 'warehouse', 'office', 'other'],
        default: 'production'
    },
    sections: [{
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProcessSection'
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    stats: {
        targetOutput: { type: Number, default: 0 },
        actualOutput: { type: Number, default: 0 },
        defectCount: { type: Number, default: 0 },
        shiftDuration: { type: Number, default: 480 }, // minutes (8 hours)
        plannedDowntime: { type: Number, default: 0 }, // minutes
        lastUpdated: { type: Date, default: Date.now }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
processAreaSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
processAreaSchema.index({ name: 1 });
processAreaSchema.index({ status: 1 });

const ProcessArea = mongoose.model('ProcessArea', processAreaSchema);

module.exports = { ProcessArea };
