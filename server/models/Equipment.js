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
  name: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allow null/undefined values
  },
  factory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory',
    required: false, // Will be required after migration
    index: true
  },
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
  productionLine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionLine',
    required: false
  },
  productionSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionSection',
    required: false
  },
  processArea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessArea',
    required: false // Optional initially, but recommended
  },
  processDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessDepartment',
    required: false
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: false
  },
  assetClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetClass',
    required: false
  },
  // Deprecated: use `site` reference instead
  location: {
    type: String,
    required: false,
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
  criticality: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  criticalityScore: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  chipNumber: {
    type: String,
    trim: true,
    required: true,
    unique: true,
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
  availability: {
    type: Number, // Percentage
    default: 0
  },
  downtime: {
    type: Number, // Hours
    default: 0
  },
  lastDowntimeStart: {
    type: Date,
    default: null
  },
  operatingTime: {
    type: Number, // Hours
    default: 0
  },
  timeSinceAcquisition: {
    type: Number, // Days
    default: 0
  },
  lastMetricsUpdate: {
    type: Date,
    default: null
  },
  lastBreakdownType: {
    type: String,
    enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'electronic', 'software', 'structural', 'other'],
  },
  lastBreakdownDescription: {
    type: String,
  },
  scrappedReason: {
    type: String,
  },
  statusMedia: [{
    type: String,
    trim: true,
  }],
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastServicingReport: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Financial Data
  purchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  usefulLifeYears: {
    type: Number,
    default: 10, // Standard approximation for industrial equipment
    min: 1
  },
  salvageValue: {
    type: Number,
    default: 0,
    min: 0
  },
  // Calculated Financial Metrics
  currentValue: {
    type: Number,
    default: 0
  },
  totalMaintenanceCost: {
    type: Number,
    default: 0
  },
  tco: {
    type: Number,
    default: 0,
    description: 'Total Cost of Ownership = Purchase Price + Maintenance Costs'
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
  // Site change audit trail (lightweight)
  siteChangeHistory: [{
    fromSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    toSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    reason: { type: String, required: true, trim: true },
    documents: [{ type: String, required: true }],
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  }],
}, {
  versionKey: false,
});

// Update the updatedAt field and lastStatusChange before saving
schema.pre('save', function (next) {
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
schema.virtual('statusMetadata').get(function () {
  return STATUS_METADATA[this.status] || {};
});

// Method to check if status transition is allowed
schema.methods.canTransitionTo = function (newStatus) {
  const currentMetadata = STATUS_METADATA[this.status];
  if (!currentMetadata) return false;

  // Scrapped is terminal state
  if (this.status === EQUIPMENT_STATUSES.SCRAPPED) return false;

  // Check if transition is in allowed list
  return currentMetadata.allowedTransitions.includes(newStatus);
};

// Method to get allowed transitions
schema.methods.getAllowedTransitions = function () {
  const currentMetadata = STATUS_METADATA[this.status];
  if (!currentMetadata) return [];
  return currentMetadata.allowedTransitions.map(status => ({
    status,
    metadata: STATUS_METADATA[status]
  }));
};

// Static method to migrate legacy statuses
schema.statics.migrateLegacyStatus = function (legacyStatus) {
  return LEGACY_STATUS_MAP[legacyStatus] || legacyStatus;
};

const Equipment = mongoose.model('Equipment', schema);
module.exports = {
  Equipment,
  EQUIPMENT_STATUSES,
  LEGACY_STATUS_MAP
};