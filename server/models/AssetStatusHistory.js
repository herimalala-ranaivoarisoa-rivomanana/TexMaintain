const mongoose = require('mongoose');

/**
 * Asset Status History Model
 * Tracks all status changes for complete traceability
 */

const ASSET_STATUS_CATEGORIES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

const ASSET_STATUSES = {
  // Production States
  IN_PRODUCTION: 'in_production',
  SETUP_ADJUSTMENT: 'setup_adjustment',
  PAUSED_BY_OPERATOR: 'paused_by_operator',
  CHANGEOVER: 'changeover',
  BREAKDOWN: 'breakdown',
  OFFLINE: 'offline',

  // Maintenance States
  SCHEDULED_MAINTENANCE: 'scheduled_maintenance',
  UNDER_REPAIR: 'under_repair',
  IN_WORKSHOP: 'in_workshop',
  WAITING_SPARE_PARTS: 'waiting_spare_parts',
  TESTING_AFTER_REPAIR: 'testing_after_repair',
  UNDER_INSPECTION: 'under_inspection',
  PENDING_VALIDATION: 'pending_validation',

  // Out of Service States
  STORED: 'stored',
  SCRAPPED: 'scrapped'
};

// Status metadata for UI and business logic
const STATUS_METADATA = {
  // Production States
  in_production: {
    label: 'In Production',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'green',
    icon: 'play',
    description: 'Asset is actively producing',
    allowedTransitions: ['setup_adjustment', 'paused_by_operator', 'changeover', 'breakdown', 'scheduled_maintenance', 'offline', 'stored']
  },
  setup_adjustment: {
    label: 'Setup/Adjustment',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'settings',
    description: 'Asset being set up or adjusted before production',
    allowedTransitions: ['in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored']
  },
  paused_by_operator: {
    label: 'Paused by Operator',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'yellow',
    icon: 'pause',
    description: 'Temporarily paused by operator',
    allowedTransitions: ['in_production', 'changeover', 'offline', 'stored']
  },
  changeover: {
    label: 'Changeover',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'refresh',
    description: 'Changing product series or configuration',
    allowedTransitions: ['setup_adjustment', 'in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored']
  },

  // Maintenance States
  scheduled_maintenance: {
    label: 'Scheduled Maintenance',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'calendar',
    description: 'Preventive maintenance in progress',
    allowedTransitions: ['in_production', 'offline', 'stored', 'scrapped']
  },
  breakdown: {
    label: 'Breakdown',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'alert-triangle',
    description: 'Asset has broken down',
    allowedTransitions: ['under_inspection', 'under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped']
  },
  under_repair: {
    label: 'Under Repair',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'wrench',
    description: 'Asset is being repaired',
    allowedTransitions: ['in_workshop', 'in_production', 'offline', 'stored', 'scrapped']
  },
  in_workshop: {
    label: 'In Workshop',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'tool',
    description: 'Asset moved to workshop for repair',
    allowedTransitions: ['waiting_spare_parts', 'testing_after_repair', 'in_production', 'stored', 'scrapped']
  },
  waiting_spare_parts: {
    label: 'Waiting Spare Parts',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'package',
    description: 'Waiting for spare parts to arrive',
    allowedTransitions: ['under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped']
  },
  testing_after_repair: {
    label: 'Testing After Repair',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'check-circle',
    description: 'Testing asset after repair',
    allowedTransitions: ['pending_validation', 'in_production', 'under_repair', 'stored', 'scrapped']
  },
  under_inspection: {
    label: 'Under Inspection',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'yellow',
    icon: 'search',
    description: 'Asset being inspected or diagnosed',
    allowedTransitions: ['under_repair', 'in_workshop', 'scheduled_maintenance', 'in_production', 'stored', 'scrapped']
  },
  pending_validation: {
    label: 'Pending Validation',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'clipboard-check',
    description: 'Awaiting validation for maintenance completion',
    allowedTransitions: ['in_production', 'setup_adjustment', 'under_repair', 'stored', 'scrapped']
  },

  // Out of Service States
  stored: {
    label: 'Stored',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'archive',
    description: 'Asset in storage/reserve',
    allowedTransitions: ['offline', 'setup_adjustment', 'under_inspection', 'scrapped']
  },
  offline: {
    label: 'Offline',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'power',
    description: 'Asset temporarily not in use',
    allowedTransitions: ['in_production', 'stored', 'setup_adjustment', 'scheduled_maintenance', 'scrapped']
  },
  scrapped: {
    label: 'Scrapped',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'black',
    icon: 'trash',
    description: 'Asset permanently decommissioned',
    allowedTransitions: [] // Terminal state
  }
};

const assetStatusHistorySchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset', // Migrated from Asset to Asset
    required: true,
    index: true
  },
  previousStatus: {
    type: String,
    enum: Object.values(ASSET_STATUSES),
    required: false
  },
  newStatus: {
    type: String,
    enum: Object.values(ASSET_STATUSES),
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  intervention: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intervention',
    required: false
  },
  machinist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: false
  },
  mechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: false
  },
  electrician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: false
  },
  maintenanceWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Personnel',
    required: false
  },
  breakdownInfo: {
    type: {
      type: String,
      enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'electronic', 'software', 'structural', 'other'],
      required: false
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  duration: {
    type: Number, // Duration in minutes (calculated when status changes again)
    default: null
  },
  media: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  versionKey: false,
  timestamps: false
});

// Indexes for efficient queries
assetStatusHistorySchema.index({ asset: 1, timestamp: -1 });
assetStatusHistorySchema.index({ newStatus: 1, timestamp: -1 });
assetStatusHistorySchema.index({ changedBy: 1, timestamp: -1 });

// Virtual for status category
assetStatusHistorySchema.virtual('statusCategory').get(function () {
  return STATUS_METADATA[this.newStatus]?.category || 'unknown';
});

// Virtual for status metadata
assetStatusHistorySchema.virtual('statusMetadata').get(function () {
  return STATUS_METADATA[this.newStatus] || {};
});

const AssetStatusHistory = mongoose.model('AssetStatusHistory', assetStatusHistorySchema);

module.exports = {
  AssetStatusHistory,
  ASSET_STATUSES,
  ASSET_STATUS_CATEGORIES,
  STATUS_METADATA
};