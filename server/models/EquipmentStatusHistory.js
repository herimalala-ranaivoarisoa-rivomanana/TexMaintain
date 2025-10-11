const mongoose = require('mongoose');

/**
 * Equipment Status History Model
 * Tracks all status changes for complete traceability
 */

const EQUIPMENT_STATUS_CATEGORIES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

const EQUIPMENT_STATUSES = {
  // Production States
  IN_PRODUCTION: 'in_production',
  SETUP_ADJUSTMENT: 'setup_adjustment',
  PAUSED_BY_OPERATOR: 'paused_by_operator',
  CHANGEOVER: 'changeover',
  
  // Maintenance States
  SCHEDULED_MAINTENANCE: 'scheduled_maintenance',
  BREAKDOWN: 'breakdown',
  UNDER_REPAIR: 'under_repair',
  IN_WORKSHOP: 'in_workshop',
  WAITING_SPARE_PARTS: 'waiting_spare_parts',
  TESTING_AFTER_REPAIR: 'testing_after_repair',
  UNDER_INSPECTION: 'under_inspection',
  PENDING_VALIDATION: 'pending_validation',
  
  // Out of Service States
  STORED: 'stored',
  OFFLINE: 'offline',
  SCRAPPED: 'scrapped'
};

// Status metadata for UI and business logic
const STATUS_METADATA = {
  // Production States
  in_production: {
    label: 'In Production',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'green',
    icon: 'play',
    description: 'Equipment is actively producing',
    allowedTransitions: ['setup_adjustment', 'paused_by_operator', 'changeover', 'breakdown', 'scheduled_maintenance']
  },
  setup_adjustment: {
    label: 'Setup/Adjustment',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'settings',
    description: 'Equipment being set up or adjusted before production',
    allowedTransitions: ['in_production', 'breakdown', 'scheduled_maintenance']
  },
  paused_by_operator: {
    label: 'Paused by Operator',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'yellow',
    icon: 'pause',
    description: 'Temporarily paused by operator',
    allowedTransitions: ['in_production', 'changeover', 'breakdown', 'offline']
  },
  changeover: {
    label: 'Changeover',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'refresh',
    description: 'Changing product series or configuration',
    allowedTransitions: ['setup_adjustment', 'in_production', 'breakdown']
  },
  
  // Maintenance States
  scheduled_maintenance: {
    label: 'Scheduled Maintenance',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'calendar',
    description: 'Preventive maintenance in progress',
    allowedTransitions: ['testing_after_repair', 'pending_validation', 'in_production', 'under_repair']
  },
  breakdown: {
    label: 'Breakdown',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'alert-triangle',
    description: 'Equipment has broken down',
    allowedTransitions: ['under_inspection', 'under_repair', 'in_workshop']
  },
  under_repair: {
    label: 'Under Repair',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'wrench',
    description: 'Equipment is being repaired',
    allowedTransitions: ['waiting_spare_parts', 'testing_after_repair', 'in_workshop', 'pending_validation']
  },
  in_workshop: {
    label: 'In Workshop',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'tool',
    description: 'Equipment moved to workshop for repair',
    allowedTransitions: ['under_repair', 'waiting_spare_parts', 'testing_after_repair', 'scrapped']
  },
  waiting_spare_parts: {
    label: 'Waiting Spare Parts',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'package',
    description: 'Waiting for spare parts to arrive',
    allowedTransitions: ['under_repair', 'in_workshop']
  },
  testing_after_repair: {
    label: 'Testing After Repair',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'check-circle',
    description: 'Testing equipment after repair',
    allowedTransitions: ['pending_validation', 'in_production', 'under_repair']
  },
  under_inspection: {
    label: 'Under Inspection',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'yellow',
    icon: 'search',
    description: 'Equipment being inspected or diagnosed',
    allowedTransitions: ['under_repair', 'in_workshop', 'scheduled_maintenance', 'in_production']
  },
  pending_validation: {
    label: 'Pending Validation',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'clipboard-check',
    description: 'Awaiting validation for maintenance completion',
    allowedTransitions: ['in_production', 'setup_adjustment', 'under_repair']
  },
  
  // Out of Service States
  stored: {
    label: 'Stored',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'archive',
    description: 'Equipment in storage/reserve',
    allowedTransitions: ['offline', 'setup_adjustment', 'under_inspection', 'scrapped']
  },
  offline: {
    label: 'Offline',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'power',
    description: 'Equipment temporarily not in use',
    allowedTransitions: ['stored', 'setup_adjustment', 'scheduled_maintenance', 'scrapped']
  },
  scrapped: {
    label: 'Scrapped',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'black',
    icon: 'trash',
    description: 'Equipment permanently decommissioned',
    allowedTransitions: [] // Terminal state
  }
};

const equipmentStatusHistorySchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  previousStatus: {
    type: String,
    enum: Object.values(EQUIPMENT_STATUSES),
    required: false
  },
  newStatus: {
    type: String,
    enum: Object.values(EQUIPMENT_STATUSES),
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
  duration: {
    type: Number, // Duration in minutes (calculated when status changes again)
    default: null
  },
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
equipmentStatusHistorySchema.index({ equipment: 1, timestamp: -1 });
equipmentStatusHistorySchema.index({ newStatus: 1, timestamp: -1 });
equipmentStatusHistorySchema.index({ changedBy: 1, timestamp: -1 });

// Virtual for status category
equipmentStatusHistorySchema.virtual('statusCategory').get(function() {
  return STATUS_METADATA[this.newStatus]?.category || 'unknown';
});

// Virtual for status metadata
equipmentStatusHistorySchema.virtual('statusMetadata').get(function() {
  return STATUS_METADATA[this.newStatus] || {};
});

const EquipmentStatusHistory = mongoose.model('EquipmentStatusHistory', equipmentStatusHistorySchema);

module.exports = {
  EquipmentStatusHistory,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_CATEGORIES,
  STATUS_METADATA
};