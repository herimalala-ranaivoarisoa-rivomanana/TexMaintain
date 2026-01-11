// Asset Status Types and Metadata
// Migrated from Asset to Asset

export const ASSET_STATUSES = {
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
} as const;

export const BREAKDOWN_TYPES = [
  { value: 'mechanical', label: 'Panne Mécanique', suggestedPersonnel: 'mechanic' },
  { value: 'electrical', label: 'Panne Électrique', suggestedPersonnel: 'electrician' },
  { value: 'hydraulic', label: 'Panne Hydraulique', suggestedPersonnel: 'mechanic' },
  { value: 'pneumatic', label: 'Panne Pneumatique', suggestedPersonnel: 'mechanic' },
  { value: 'electronic', label: 'Panne Électronique', suggestedPersonnel: 'electrician' },
  { value: 'software', label: 'Panne Logicielle', suggestedPersonnel: 'electrician' },
  { value: 'structural', label: 'Panne Structurelle', suggestedPersonnel: 'worker' },
  { value: 'other', label: 'Autre', suggestedPersonnel: null }
] as const;

export type AssetStatus = typeof ASSET_STATUSES[keyof typeof ASSET_STATUSES];

export const ASSET_STATUS_CATEGORIES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
} as const;

export type AssetStatusCategory = typeof ASSET_STATUS_CATEGORIES[keyof typeof ASSET_STATUS_CATEGORIES];

export const STATUS_METADATA: Record<string, StatusMetadata> = {
  // Production States
  in_production: {
    label: 'In Production',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'green',
    icon: 'play',
    description: 'Asset is actively producing',
    allowedTransitions: ['setup_adjustment', 'paused_by_operator', 'changeover', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as AssetStatus[]
  },
  setup_adjustment: {
    label: 'Setup/Adjustment',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'settings',
    description: 'Asset being set up or adjusted before production',
    allowedTransitions: ['in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as AssetStatus[]
  },
  paused_by_operator: {
    label: 'Paused by Operator',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'yellow',
    icon: 'pause',
    description: 'Temporarily paused by operator',
    allowedTransitions: ['in_production', 'changeover', 'offline', 'stored'] as AssetStatus[]
  },
  changeover: {
    label: 'Changeover',
    category: ASSET_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'refresh',
    description: 'Changing product series or configuration',
    allowedTransitions: ['setup_adjustment', 'in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as AssetStatus[]
  },

  // Maintenance States
  scheduled_maintenance: {
    label: 'Scheduled Maintenance',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'calendar',
    description: 'Preventive maintenance in progress',
    allowedTransitions: ['in_production', 'offline', 'stored', 'scrapped'] as AssetStatus[]
  },
  breakdown: {
    label: 'Breakdown',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'alert-triangle',
    description: 'Asset has broken down',
    allowedTransitions: ['under_inspection', 'under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped'] as AssetStatus[]
  },
  under_repair: {
    label: 'Under Repair',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'wrench',
    description: 'Asset is being repaired',
    allowedTransitions: ['in_workshop', 'in_production', 'offline', 'stored', 'scrapped'] as AssetStatus[]
  },
  in_workshop: {
    label: 'In Workshop',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'tool',
    description: 'Asset moved to workshop for repair',
    allowedTransitions: ['waiting_spare_parts', 'testing_after_repair', 'in_production', 'stored', 'scrapped'] as AssetStatus[]
  },
  waiting_spare_parts: {
    label: 'Waiting Spare Parts',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'package',
    description: 'Waiting for spare parts to arrive',
    allowedTransitions: ['under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped'] as AssetStatus[]
  },
  testing_after_repair: {
    label: 'Testing After Repair',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'check-circle',
    description: 'Testing asset after repair',
    allowedTransitions: ['pending_validation', 'in_production', 'under_repair', 'stored', 'scrapped'] as AssetStatus[]
  },
  under_inspection: {
    label: 'Under Inspection',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'yellow',
    icon: 'search',
    description: 'Asset being inspected or diagnosed',
    allowedTransitions: ['under_repair', 'in_workshop', 'scheduled_maintenance', 'in_production', 'stored', 'scrapped'] as AssetStatus[]
  },
  pending_validation: {
    label: 'Pending Validation',
    category: ASSET_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'clipboard-check',
    description: 'Awaiting validation for maintenance completion',
    allowedTransitions: ['in_production', 'setup_adjustment', 'under_repair', 'stored', 'scrapped'] as AssetStatus[]
  },

  // Out of Service States
  stored: {
    label: 'Stored',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'archive',
    description: 'Asset in storage/reserve',
    allowedTransitions: ['offline', 'setup_adjustment', 'under_inspection', 'scrapped'] as AssetStatus[]
  },
  offline: {
    label: 'Offline',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'power',
    description: 'Asset temporarily not in use',
    allowedTransitions: ['in_production', 'stored', 'setup_adjustment', 'scheduled_maintenance', 'scrapped'] as AssetStatus[]
  },
  scrapped: {
    label: 'Scrapped',
    category: ASSET_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'black',
    icon: 'trash',
    description: 'Asset permanently decommissioned',
    allowedTransitions: [] as AssetStatus[]
  }
};

export interface StatusMetadata {
  label: string;
  category: AssetStatusCategory;
  color: string;
  icon: string;
  description: string;
  allowedTransitions: AssetStatus[];
}

export interface AssetStatusHistory {
  _id: string;
  asset: string; // Still named asset for backward compatibility, but references Asset
  previousStatus?: AssetStatus;
  newStatus: AssetStatus;
  changedBy: {
    _id: string;
    email: string;
    role: string;
  };
  reason?: string;
  notes?: string;
  intervention?: {
    _id: string;
    title: string;
    type: string;
    status: string;
  };
  duration?: number; // in minutes
  metadata?: Record<string, any>;
  timestamp: string;
  statusMetadata?: StatusMetadata;
  previousStatusMetadata?: StatusMetadata;
}

export interface StatusStatistics {
  totalChanges: number;
  statusBreakdown: Record<string, {
    count: number;
    totalDuration: number;
    label: string;
    color: string;
    percentage: number;
  }>;
  categoryBreakdown: Record<AssetStatusCategory, {
    count: number;
    totalDuration: number;
    percentage: number;
  }>;
  averageDuration: Record<string, number>;
  totalDuration: number;
}

export interface StatusTransition {
  status: AssetStatus;
  metadata: StatusMetadata;
}

export interface ChangeStatusRequest {
  status: AssetStatus;
  reason?: string;
  notes?: string;
  interventionId?: string;
  machinistId?: string;
  mechanicId?: string;
  electricianId?: string;
  maintenanceWorkerId?: string;
  breakdownType?: string;
  breakdownDescription?: string;
  media?: string[];
}

export interface BulkChangeStatusRequest {
  assetIds: string[]; // Changed from assetIds
  status: AssetStatus;
  reason?: string;
  notes?: string;
}

// Status color mapping for UI
export const getStatusColor = (status: AssetStatus): string => {
  const colorMap: Record<string, string> = {
    // Production - Green/Blue tones
    in_production: 'bg-green-500',
    setup_adjustment: 'bg-blue-500',
    paused_by_operator: 'bg-yellow-500',
    changeover: 'bg-blue-400',

    // Maintenance - Orange/Red tones
    scheduled_maintenance: 'bg-orange-500',
    breakdown: 'bg-red-600',
    under_repair: 'bg-red-500',
    in_workshop: 'bg-red-400',
    waiting_spare_parts: 'bg-orange-400',
    testing_after_repair: 'bg-blue-400',
    under_inspection: 'bg-yellow-400',
    pending_validation: 'bg-blue-300',

    // Out of Service - Gray/Black tones
    stored: 'bg-gray-500',
    offline: 'bg-gray-600',
    scrapped: 'bg-black'
  };

  return colorMap[status] || 'bg-gray-500';
};

// Status label mapping for UI
export const getStatusLabel = (status: AssetStatus): string => {
  const labelMap: Record<string, string> = {
    in_production: 'In Production',
    setup_adjustment: 'Setup/Adjustment',
    paused_by_operator: 'Paused by Operator',
    changeover: 'Changeover',
    scheduled_maintenance: 'Scheduled Maintenance',
    breakdown: 'Breakdown',
    under_repair: 'Under Repair',
    in_workshop: 'In Workshop',
    waiting_spare_parts: 'Waiting Spare Parts',
    testing_after_repair: 'Testing After Repair',
    under_inspection: 'Under Inspection',
    pending_validation: 'Pending Validation',
    stored: 'Stored',
    offline: 'Offline',
    scrapped: 'Scrapped'
  };

  return labelMap[status] || status;
};

// Category color mapping
export const getCategoryColor = (category: AssetStatusCategory): string => {
  const colorMap: Record<AssetStatusCategory, string> = {
    production: 'bg-green-500',
    maintenance: 'bg-orange-500',
    out_of_service: 'bg-gray-500'
  };

  return colorMap[category] || 'bg-gray-500';
};

// Category label mapping
export const getCategoryLabel = (category: AssetStatusCategory): string => {
  const labelMap: Record<AssetStatusCategory, string> = {
    production: 'Production',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service'
  };

  return labelMap[category] || category;
};
