const mongoose = require('mongoose');

const processDepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  processArea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessArea',
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
    breakdown: [{
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

    TimeSinceInsertion: {
      type: Number,
      default: 0
    },
    downTime: {
      type: Number,
      default: 0
    },
    workingTime: {
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
processDepartmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
processDepartmentSchema.index({ processArea: 1, order: 1 });
processDepartmentSchema.index({ name: 1 });

const ProcessDepartment = mongoose.model('ProcessDepartment', processDepartmentSchema);

module.exports = { ProcessDepartment };