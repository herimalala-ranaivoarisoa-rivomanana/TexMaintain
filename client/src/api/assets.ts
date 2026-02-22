import api from './api';
import { Category } from './categories';
import { SubCategory } from './subCategories';
import { AssetClass } from './assetClasses';

// Re-export constants if needed by components
export const ASSET_STATUSES = {
  STORED: 'stored',
  IN_PRODUCTION: 'in_production',
  SCHEDULED_MAINTENANCE: 'scheduled_maintenance',
  UNDER_REPAIR: 'under_repair',
  BREAKDOWN: 'breakdown',
  OFFLINE: 'offline',
  SCRAPPED: 'scrapped',
  WAITING_SPARE_PARTS: 'waiting_spare_parts',
  TESTING_AFTER_REPAIR: 'testing_after_repair',
  UNDER_INSPECTION: 'under_inspection',
  SETUP_ADJUSTMENT: 'setup_adjustment',
  CHANGEOVER: 'changeover',
  PAUSED_BY_OPERATOR: 'paused_by_operator',
  NO_WORK_ORDER: 'no_work_order',
  PENDING_VALIDATION: 'pending_validation'
} as const;

export interface Asset {
  _id: string;
  name: string;
  code?: string;
  factory?: string;
  assetClass: AssetClass;
  category: Category;
  subCategory: SubCategory;
  status: string;
  statusCategory: 'production' | 'maintenance' | 'out_of_service';
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  brand?: { _id: string; name: string };
  productionLine?: { _id: string; name: string };
  productionSection?: { _id: string; name: string };
  mtbf: number;
  mttr: number;
  availability: number;
  downtime: number;
  purchasePrice: number;
  usefulLifeYears: number;
  salvageValue: number;
  currentValue: number;
  totalMaintenanceCost: number;
  tco: number;
  processArea?: { _id: string; name: string };
  processSection?: { _id: string; name: string };
  timeSinceAcquisition?: number;
  operatingTime?: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  statusMedia?: any[];
  machinistId?: string;
  mechanicId?: string;
  electricianId?: string;
  maintenanceWorkerId?: string;
  lastBreakdownType?: string;
  lastBreakdownDescription?: string;
}

export interface CreateAssetData {
  name: string;
  code?: string;
  category: string;
  subCategory: string; // Was type
  assetClass?: string;
  status: string;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  brand?: string;
  purchasePrice?: number;
  usefulLifeYears?: number;
  salvageValue?: number;
}

export interface AssetQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subCategory?: string;
  assetClass?: string;
  search?: string;
}

export interface AssetsResponse {
  assets: Asset[];
  totalPages: number;
  currentPage: number;
  totalAssets: number;
}

export const getAssets = async (query: AssetQuery): Promise<AssetsResponse> => {
  const { page, limit, status, category, subCategory, assetClass, search } = query;
  const params: any = { page, limit };
  if (status) params.status = status;
  if (category) params.category = category;
  if (subCategory) params.subCategory = subCategory;
  if (assetClass) params.assetClass = assetClass;
  if (search) params.search = search;

  const response = await api.get('/api/assets', { params });
  return response.data;
};

export const getAsset = async (id: string): Promise<Asset> => {
  const response = await api.get(`/api/assets/${id}`);
  return response.data.asset || response.data; // Backend returns { asset: ... }
};

export const createAsset = async (data: CreateAssetData): Promise<{ success: boolean; asset: Asset; duplicatedPartsCount?: number; message?: string }> => {
  const response = await api.post('/api/assets', data);
  return response.data; // Backend returns { success, asset, duplicatedPartsCount, message }
};

export const updateAsset = async (id: string, data: Partial<CreateAssetData>): Promise<{ success: boolean; asset: Asset }> => {
  const response = await api.patch(`/api/assets/${id}`, data); // Backend uses PATCH, not PUT
  return response.data; // Backend returns { success, asset }
};

export const deleteAsset = async (id: string): Promise<void> => {
  await api.delete(`/api/assets/${id}`);
};

export const changeAssetStatus = async (id: string, data: any): Promise<any> => {
  const formData = new FormData();

  // Append fields
  Object.keys(data).forEach(key => {
    if (key === 'mediaFiles' && Array.isArray(data[key])) {
      data[key].forEach((file: File) => {
        formData.append('media', file);
      });
    } else if (key === 'personnel' || key === 'userLocation') {
      formData.append(key, JSON.stringify(data[key]));
    } else if (data[key] !== undefined && data[key] !== null && key !== 'mediaFiles') {
      formData.append(key, data[key]);
    }
  });

  const response = await api.post(`/api/assets/${id}/change-status`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Description: Get asset interventions history
// Endpoint: GET /api/assets/:id/interventions
export const getAssetInterventions = async (id: string, params?: { page?: number; limit?: number; type?: string; status?: string; q?: string; sort?: string; order?: 'asc' | 'desc' }) => {
  const response = await api.get(`/api/assets/${id}/interventions`, { params });
  return response.data;
};

// Description: Get asset associated parts
// Endpoint: GET /api/assets/:id/parts
export const getAssetParts = async (id: string) => {
  const response = await api.get(`/api/assets/${id}/parts`);
  return response.data;
};

// ===== STATUS MANAGEMENT ENDPOINTS =====

// Description: Get status history for an asset
// Endpoint: GET /api/assets/:id/status-history
export const getAssetStatusHistory = async (
  id: string,
  params?: { limit?: number; page?: number; startDate?: string; endDate?: string }
): Promise<{ history: any[]; total: number; page: number; limit: number }> => {
  const response = await api.get(`/api/assets/${id}/status-history`, { params });
  return response.data;
};

// Description: Get status statistics for an asset
// Endpoint: GET /api/assets/:id/status-statistics
export const getAssetStatusStatistics = async (
  id: string,
  params?: { startDate?: string; endDate?: string }
): Promise<{ success: boolean; statistics: any }> => {
  const response = await api.get(`/api/assets/${id}/status-statistics`, { params });
  return response.data;
};

// Description: Get allowed status transitions for an asset
// Endpoint: GET /api/assets/:id/allowed-transitions
export const getAllowedTransitions = async (
  id: string
): Promise<{ success: boolean; transitions: any[] }> => {
  const response = await api.get(`/api/assets/${id}/allowed-transitions`);
  return response.data;
};

// Description: Get all assets with a specific status
// Endpoint: GET /api/assets/status/:status
export const getAssetsByStatus = async (
  status: string,
  params?: { limit?: number; page?: number }
) => {
  const response = await api.get(`/api/assets/status/${status}`, { params });
  return response.data;
};

// Description: Get all assets in a status category
// Endpoint: GET /api/assets/category/:category
export const getAssetsByCategory = async (
  category: string,
  params?: { limit?: number; page?: number }
) => {
  const response = await api.get(`/api/assets/category/${category}`, { params });
  return response.data;
};

// Description: Bulk change status for multiple assets
// Endpoint: POST /api/assets/bulk-change-status
export const bulkChangeStatus = async (
  data: { assetIds?: string[]; status: string; reason?: string; notes?: string }
): Promise<{ success: boolean; results: { successful: any[]; failed: any[] } }> => {
  const response = await api.post('/api/assets/bulk-change-status', data);
  return response.data;
};

// Description: Get all available statuses with metadata
// Endpoint: GET /api/assets/statuses/metadata
export const getStatusMetadata = async (): Promise<{
  success: boolean;
  statuses: Record<string, any>
}> => {
  const response = await api.get('/api/assets/statuses/metadata');
  return response.data;
};