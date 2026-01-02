// Equipment Status Types and Metadata

export const EQUIPMENT_STATUSES = {
  // Production States
  IN_PRODUCTION: 'in_production',
  SETUP_ADJUSTMENT: 'setup_adjustment',
  PAUSED_BY_OPERATOR: 'paused_by_operator',
  CHANGEOVER: 'changeover',
  OFFLINE: 'offline',

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

export type EquipmentStatus = typeof EQUIPMENT_STATUSES[keyof typeof EQUIPMENT_STATUSES];

export const EQUIPMENT_STATUS_CATEGORIES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
} as const;

export type EquipmentStatusCategory = typeof EQUIPMENT_STATUS_CATEGORIES[keyof typeof EQUIPMENT_STATUS_CATEGORIES];

export const STATUS_METADATA: Record<string, StatusMetadata> = {
  // Production States
  in_production: {
    label: 'In Production',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'green',
    icon: 'play',
    description: 'Equipment is actively producing',
    allowedTransitions: ['setup_adjustment', 'paused_by_operator', 'changeover', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as EquipmentStatus[]
  },
  setup_adjustment: {
    label: 'Setup/Adjustment',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'settings',
    description: 'Equipment being set up or adjusted before production',
    allowedTransitions: ['in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as EquipmentStatus[]
  },
  paused_by_operator: {
    label: 'Paused by Operator',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'yellow',
    icon: 'pause',
    description: 'Temporarily paused by operator',
    allowedTransitions: ['in_production', 'changeover', 'offline', 'stored'] as EquipmentStatus[]
  },
  changeover: {
    label: 'Changeover',
    category: EQUIPMENT_STATUS_CATEGORIES.PRODUCTION,
    color: 'blue',
    icon: 'refresh',
    description: 'Changing product series or configuration',
    allowedTransitions: ['setup_adjustment', 'in_production', 'breakdown', 'scheduled_maintenance', 'offline', 'stored'] as EquipmentStatus[]
  },

  // Maintenance States
  scheduled_maintenance: {
    label: 'Scheduled Maintenance',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'calendar',
    description: 'Preventive maintenance in progress',
    allowedTransitions: ['in_production', 'offline', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  breakdown: {
    label: 'Breakdown',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'alert-triangle',
    description: 'Equipment has broken down',
    allowedTransitions: ['under_inspection', 'under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  under_repair: {
    label: 'Under Repair',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'wrench',
    description: 'Equipment is being repaired',
    allowedTransitions: ['in_workshop', 'in_production', 'offline', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  in_workshop: {
    label: 'In Workshop',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'red',
    icon: 'tool',
    description: 'Equipment moved to workshop for repair',
    allowedTransitions: ['waiting_spare_parts', 'testing_after_repair', 'in_production', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  waiting_spare_parts: {
    label: 'Waiting Spare Parts',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'orange',
    icon: 'package',
    description: 'Waiting for spare parts to arrive',
    allowedTransitions: ['under_repair', 'in_workshop', 'in_production', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  testing_after_repair: {
    label: 'Testing After Repair',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'check-circle',
    description: 'Testing equipment after repair',
    allowedTransitions: ['pending_validation', 'in_production', 'under_repair', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  under_inspection: {
    label: 'Under Inspection',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'yellow',
    icon: 'search',
    description: 'Equipment being inspected or diagnosed',
    allowedTransitions: ['under_repair', 'in_workshop', 'scheduled_maintenance', 'in_production', 'stored', 'scrapped'] as EquipmentStatus[]
  },
  pending_validation: {
    label: 'Pending Validation',
    category: EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE,
    color: 'blue',
    icon: 'clipboard-check',
    description: 'Awaiting validation for maintenance completion',
    allowedTransitions: ['in_production', 'setup_adjustment', 'under_repair', 'stored', 'scrapped'] as EquipmentStatus[]
  },

  // Out of Service States
  stored: {
    label: 'Stored',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'archive',
    description: 'Equipment in storage/reserve',
    allowedTransitions: ['offline', 'setup_adjustment', 'under_inspection', 'scrapped'] as EquipmentStatus[]
  },
  offline: {
    label: 'Offline',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'gray',
    icon: 'power',
    description: 'Equipment temporarily not in use',
    allowedTransitions: ['in_production', 'stored', 'setup_adjustment', 'scheduled_maintenance', 'scrapped'] as EquipmentStatus[]
  },
  scrapped: {
    label: 'Scrapped',
    category: EQUIPMENT_STATUS_CATEGORIES.OUT_OF_SERVICE,
    color: 'black',
    icon: 'trash',
    description: 'Equipment permanently decommissioned',
    allowedTransitions: [] as EquipmentStatus[]
  }
};

export interface StatusMetadata {
  label: string;
  category: EquipmentStatusCategory;
  color: string;
  icon: string;
  description: string;
  allowedTransitions: EquipmentStatus[];
}

export interface EquipmentStatusHistory {
  _id: string;
  equipment: string;
  previousStatus?: EquipmentStatus;
  newStatus: EquipmentStatus;
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
  categoryBreakdown: Record<EquipmentStatusCategory, {
    count: number;
    totalDuration: number;
    percentage: number;
  }>;
  averageDuration: Record<string, number>;
  totalDuration: number;
}

export interface StatusTransition {
  status: EquipmentStatus;
  metadata: StatusMetadata;
}

export interface ChangeStatusRequest {
  status: EquipmentStatus;
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
  equipmentIds: string[];
  status: EquipmentStatus;
  reason?: string;
  notes?: string;
}

// Status color mapping for UI
export const getStatusColor = (status: EquipmentStatus): string => {
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
export const getStatusLabel = (status: EquipmentStatus): string => {
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
export const getCategoryColor = (category: EquipmentStatusCategory): string => {
  const colorMap: Record<EquipmentStatusCategory, string> = {
    production: 'bg-green-500',
    maintenance: 'bg-orange-500',
    out_of_service: 'bg-gray-500'
  };

  return colorMap[category] || 'bg-gray-500';
};

// Category label mapping
export const getCategoryLabel = (category: EquipmentStatusCategory): string => {
  const labelMap: Record<EquipmentStatusCategory, string> = {
    production: 'Production',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service'
  };

  return labelMap[category] || category;
};