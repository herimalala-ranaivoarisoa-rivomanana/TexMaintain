const mongoose = require('mongoose');

const factorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        uppercase: true
    },
    address: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false
});

// Update the updatedAt field before saving
factorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Factory = mongoose.model('Factory', factorySchema);

module.exports = { Factory };
