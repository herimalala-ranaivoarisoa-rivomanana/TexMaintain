const mongoose = require('mongoose');

const INTERVENTION_TYPES = ['Corrective', 'Preventive', 'Emergency'];
const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_VALUES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: INTERVENTION_TYPES, required: true },
  priority: { type: String, enum: PRIORITY_LEVELS, required: true },
  status: { type: String, enum: STATUS_VALUES, default: 'Pending', required: true },
  asset: { type: String, required: false, trim: true }, // Legacy field (deprecated) - use assetId
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: false, index: true }, // Strong reference (migrated from Asset to Asset)
  factory: { type: mongoose.Schema.Types.ObjectId, ref: 'Factory', required: true, index: true },
  assignedTo: { type: String, trim: true },
  description: { type: String, trim: true },
  createdDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  completedDate: { type: Date }, // Actual completion date for MTTR calculation
  estimatedDuration: { type: Number }, // Estimated duration in hours
  actualDuration: { type: Number }, // Actual duration in hours
  cost: { type: Number, default: 0 }, // Cost of intervention
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

// Update the updatedAt field before saving
schema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Intervention = mongoose.model('Intervention', schema);

module.exports = { Intervention, INTERVENTION_TYPES, PRIORITY_LEVELS, STATUS_VALUES };



