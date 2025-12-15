import api from './api';
import type {
  EquipmentStatus,
  EquipmentStatusHistory,
  StatusStatistics,
  StatusTransition,
  ChangeStatusRequest,
  BulkChangeStatusRequest,
  StatusMetadata
} from '@/types/equipment';

// Description: Get all equipment with status and maintenance info
// Endpoint: GET /api/equipment
export const getEquipment = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc'
}) => {
  const response = await api.get('/api/equipment', { params });
  return response.data;
};

// Description: Get equipment details by ID
// Endpoint: GET /api/equipment/:id
export const getEquipmentById = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}`);
  return response.data;
};

// Description: Create new equipment (admin)
// Endpoint: POST /api/equipment
export const createEquipment = async (data: {
  category: string;
  type: string;
  status: string;
  location: string;
  breakdownType?: string;
  breakdownDescription?: string;
  media?: string[];
  [key: string]: any
}) => {
  const response = await api.post('/api/equipment', data);
  return response.data;
};

// Description: Update equipment (admin, maintenance_manager)
// Endpoint: PATCH /api/equipment/:id
export const updateEquipment = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/equipment/${id}`, updates);
  return response.data;
};

// Description: Delete equipment (admin)
// Endpoint: DELETE /api/equipment/:id
export const deleteEquipment = async (id: string) => {
  const response = await api.delete(`/api/equipment/${id}`);
  return response.data;
};

// Description: Get equipment interventions history
// Endpoint: GET /api/equipment/:id/interventions
export const getEquipmentInterventions = async (id: string, params?: { page?: number; limit?: number; type?: string; status?: string; q?: string; sort?: string; order?: 'asc' | 'desc' }) => {
  const response = await api.get(`/api/equipment/${id}/interventions`, { params });
  return response.data;
};

// Description: Get equipment associated parts
// Endpoint: GET /api/equipment/:id/parts
export const getEquipmentParts = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}/parts`);
  return response.data;
};

// ===== NEW STATUS MANAGEMENT ENDPOINTS =====

// Description: Change equipment status with tracking
// Endpoint: POST /api/equipment/:id/change-status
export const changeEquipmentStatus = async (
  id: string,
  data: ChangeStatusRequest
): Promise<{ success: boolean; equipment: any; historyEntry: EquipmentStatusHistory }> => {
  const response = await api.post(`/api/equipment/${id}/change-status`, data);
  return response.data;
};

// Description: Get status history for an equipment
// Endpoint: GET /api/equipment/:id/status-history
export const getEquipmentStatusHistory = async (
  id: string,
  params?: { limit?: number; page?: number; startDate?: string; endDate?: string }
): Promise<{ history: EquipmentStatusHistory[]; total: number; page: number; limit: number }> => {
  const response = await api.get(`/api/equipment/${id}/status-history`, { params });
  return response.data;
};

// Description: Get status statistics for an equipment
// Endpoint: GET /api/equipment/:id/status-statistics
export const getEquipmentStatusStatistics = async (
  id: string,
  params?: { startDate?: string; endDate?: string }
): Promise<{ success: boolean; statistics: StatusStatistics }> => {
  const response = await api.get(`/api/equipment/${id}/status-statistics`, { params });
  return response.data;
};

// Description: Get allowed status transitions for an equipment
// Endpoint: GET /api/equipment/:id/allowed-transitions
export const getAllowedTransitions = async (
  id: string
): Promise<{ success: boolean; transitions: StatusTransition[] }> => {
  const response = await api.get(`/api/equipment/${id}/allowed-transitions`);
  return response.data;
};

// Description: Get all equipment with a specific status
// Endpoint: GET /api/equipment/status/:status
export const getEquipmentByStatus = async (
  status: EquipmentStatus,
  params?: { limit?: number; page?: number }
) => {
  const response = await api.get(`/api/equipment/status/${status}`, { params });
  return response.data;
};

// Description: Get all equipment in a status category
// Endpoint: GET /api/equipment/category/:category
export const getEquipmentByCategory = async (
  category: string,
  params?: { limit?: number; page?: number }
) => {
  const response = await api.get(`/api/equipment/category/${category}`, { params });
  return response.data;
};

// Description: Bulk change status for multiple equipment
// Endpoint: POST /api/equipment/bulk-change-status
export const bulkChangeStatus = async (
  data: BulkChangeStatusRequest
): Promise<{ success: boolean; results: { successful: any[]; failed: any[] } }> => {
  const response = await api.post('/api/equipment/bulk-change-status', data);
  return response.data;
};

// Description: Get all available statuses with metadata
// Endpoint: GET /api/equipment/statuses/metadata
export const getStatusMetadata = async (): Promise<{
  success: boolean;
  statuses: Record<string, StatusMetadata>
}> => {
  const response = await api.get('/api/equipment/statuses/metadata');
  return response.data;
};