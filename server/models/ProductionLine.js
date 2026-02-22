const mongoose = require('mongoose');

const productionLineSchema = new mongoose.Schema({
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
  departments: [{
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionDepartment'
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
productionLineSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
productionLineSchema.index({ name: 1 });
productionLineSchema.index({ status: 1 });

const ProductionLine = mongoose.model('ProductionLine', productionLineSchema);

module.exports = { ProductionLine };