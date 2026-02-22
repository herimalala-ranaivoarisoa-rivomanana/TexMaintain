const mongoose = require('mongoose');

const productionDepartmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
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
    productionLine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionLine',
        required: true
    },
    asset: [{
        assetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset'
        },
        order: {
            type: Number,
            default: 0
        },
        mtbf: { type: Number },
        mttr: { type: Number },
        downTime: { type: Number },
        workingTime: { type: Number },
        TimeSinceInsertion: { type: Number },
        assignedDate: {
            type: Date,
            default: Date.now
        }
    }],
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
productionDepartmentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
productionDepartmentSchema.index({ name: 1 });
productionDepartmentSchema.index({ productionLine: 1 });
productionDepartmentSchema.index({ status: 1 });

const ProductionDepartment = mongoose.model('ProductionDepartment', productionDepartmentSchema);

module.exports = { ProductionDepartment };
