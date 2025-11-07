const mongoose = require('mongoose');

const INTERVENTION_TYPES = ['Corrective', 'Preventive', 'Emergency'];
const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_VALUES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: INTERVENTION_TYPES, required: true },
  priority: { type: String, enum: PRIORITY_LEVELS, required: true },
  status: { type: String, enum: STATUS_VALUES, default: 'Pending', required: true },
  equipment: { type: String, required: true, trim: true }, // Legacy field for backward compatibility
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: false, index: true }, // Strong reference
  assignedTo: { type: String, trim: true },
  description: { type: String, trim: true },
  breakdownType: { type: String, enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'electronic', 'software', 'structural', 'other'], trim: true },
  createdDate: { type: Date, default: Date.now },
  startedDate: { type: Date },
  completedDate: { type: Date },
  dueDate: { type: Date },
}, { versionKey: false });

const Intervention = mongoose.model('Intervention', schema);

module.exports = { Intervention, INTERVENTION_TYPES, PRIORITY_LEVELS, STATUS_VALUES };



