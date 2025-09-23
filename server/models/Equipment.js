const mongoose = require('mongoose');

const EQUIPMENT_STATUS = [
  'online',
  'maintenance',
  'breakdown',
  'offline',
  'scrapped'
];

const schema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentCategory',
    required: true,
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentType',
    required: true,
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
  chipNumber: {
    type: String,
    trim: true,
  },
  brand: {
    type: String,
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
module.exports = { Equipment, EQUIPMENT_STATUS };