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

export type EquipmentStatus = typeof EQUIPMENT_STATUSES[keyof typeof EQUIPMENT_STATUSES];

export const EQUIPMENT_STATUS_CATEGORIES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
} as const;

export type EquipmentStatusCategory = typeof EQUIPMENT_STATUS_CATEGORIES[keyof typeof EQUIPMENT_STATUS_CATEGORIES];

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