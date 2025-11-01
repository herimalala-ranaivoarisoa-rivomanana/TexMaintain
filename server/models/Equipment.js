const mongoose = require('mongoose');
const { EQUIPMENT_STATUSES, STATUS_METADATA } = require('./EquipmentStatusHistory');

// Legacy status mapping for backward compatibility
const LEGACY_STATUS_MAP = {
  'online': 'in_production',
  'maintenance': 'scheduled_maintenance',
  'breakdown': 'breakdown',
  'offline': 'offline',
  'scrapped': 'scrapped'
};

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
    enum: Object.values(EQUIPMENT_STATUSES),
    default: EQUIPMENT_STATUSES.STORED,
  },
  statusCategory: {
    type: String,
    enum: ['production', 'maintenance', 'out_of_service'],
    default: 'out_of_service'
  },
  lastStatusChange: {
    type: Date,
    default: Date.now,
  },
  lastStatusChangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  currentStatusDuration: {
    type: Number, // Duration in minutes
    default: 0
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: false,
  },
  acquisitionDate: {
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
  lastBreakdownType: {
    type: String,
    enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'electronic', 'software', 'structural', 'other'],
  },
  lastBreakdownDescription: {
    type: String,
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

// Update the updatedAt field and lastStatusChange before saving
schema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('status')) {
    this.lastStatusChange = Date.now();
    // Update status category based on new status
    const metadata = STATUS_METADATA[this.status];
    if (metadata) {
      this.statusCategory = metadata.category;
    }
  }
  next();
});

// Virtual for status metadata
schema.virtual('statusMetadata').get(function() {
  return STATUS_METADATA[this.status] || {};
});

// Method to check if status transition is allowed
schema.methods.canTransitionTo = function(newStatus) {
  const currentMetadata = STATUS_METADATA[this.status];
  if (!currentMetadata) return false;
  
  // Scrapped is terminal state
  if (this.status === EQUIPMENT_STATUSES.SCRAPPED) return false;
  
  // Check if transition is in allowed list
  return currentMetadata.allowedTransitions.includes(newStatus);
};

// Method to get allowed transitions
schema.methods.getAllowedTransitions = function() {
  const currentMetadata = STATUS_METADATA[this.status];
  if (!currentMetadata) return [];
  return currentMetadata.allowedTransitions.map(status => ({
    status,
    metadata: STATUS_METADATA[status]
  }));
};

// Static method to migrate legacy statuses
schema.statics.migrateLegacyStatus = function(legacyStatus) {
  return LEGACY_STATUS_MAP[legacyStatus] || legacyStatus;
};

const Equipment = mongoose.model('Equipment', schema);
module.exports = {
  Equipment,
  EQUIPMENT_STATUSES,
  LEGACY_STATUS_MAP
};