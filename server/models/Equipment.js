const mongoose = require('mongoose');

const EQUIPMENT_TYPES = [
  'spinning',
  'weaving', 
  'dyeing',
  'finishing',
  'cutting',
  'sewing',
  'packaging',
  'quality_control',
  'maintenance'
];

const EQUIPMENT_STATUS = [
  'operational',
  'maintenance', 
  'breakdown',
  'offline'
];

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: EQUIPMENT_TYPES,
  },
  status: {
    type: String,
    required: true,
    enum: EQUIPMENT_STATUS,
    default: 'operational',
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  model: {
    type: String,
    trim: true,
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  installationDate: {
    type: Date,
  },
  lastMaintenance: {
    type: Date,
  },
  nextMaintenance: {
    type: Date,
  },
  mtbf: {
    type: Number, // Mean Time Between Failures (hours)
    default: 0,
  },
  mttr: {
    type: Number, // Mean Time To Repair (hours)
    default: 0,
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

// Update the updatedAt field before saving
schema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Equipment = mongoose.model('Equipment', schema);

module.exports = { Equipment, EQUIPMENT_TYPES, EQUIPMENT_STATUS };