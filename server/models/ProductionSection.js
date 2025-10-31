const mongoose = require('mongoose');

const productionSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  productionLine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionLine',
    required: true
  },
  equipment: [{
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment'
    },
    order: {
      type: Number,
      default: 0
    },
    breakdown:[{
      lastBreakDown: {
        type: Date,
      },
      startOfRepair: {
        type: Date,
      },
      endOfRepair: {
        type: Date,
      },
    }],

    TimeSinceInsertion:{
      type: Number,
      default: 0
    },
    downTime:{
      type: Number,
      default: 0
    },
    workingTime:{
      type: Number,
      default: 0
    },
    mtbf: {
      type: Number, // Mean Time Between Failures (hours)
      default: 0,
    },
    mttr: {
      type: Number, // Mean Time To Repair (hours)
      default: 0,
    },
  }],
  order: {
    type: Number,
    default: 0
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
productionSectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
productionSectionSchema.index({ productionLine: 1, order: 1 });
productionSectionSchema.index({ name: 1 });

const ProductionSection = mongoose.model('ProductionSection', productionSectionSchema);

module.exports = { ProductionSection };