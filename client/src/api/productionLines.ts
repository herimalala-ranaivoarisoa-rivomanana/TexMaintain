import api from './api';

// Description: Get all process areas with pagination & filters
// Endpoint: GET /api/process-area
// Response: { productionLines: Array, page: number, total: number }
export const getProductionLines = async (params?: { page?: number; limit?: number; status?: string; q?: string; sort?: string; order?: 'asc' | 'desc' }) => {
  const response = await api.get('/api/process-area', { params });
  return response.data;
};

// Description: Get production line details by ID
// Endpoint: GET /api/process-area/:id
// Response: { productionLine: object }
export const getProductionLineById = async (id: string) => {
  const response = await api.get(`/api/process-area/${id}`);
  return response.data;
};

// Description: Get production line dashboard stats
// Endpoint: GET /api/process-area/:id/dashboard
export const getProductionLineDashboardStats = async (id: string) => {
  const response = await api.get(`/api/process-area/${id}/dashboard`);
  return response.data;
};

// Description: Create new production line (admin)
// Endpoint: POST /api/process-area
export const createProductionLine = async (data: { name: string; description?: string; status?: string }) => {
  const response = await api.post('/api/process-area', data);
  return response.data;
};

// Description: Update production line (admin)
// Endpoint: PATCH /api/process-area/:id
export const updateProductionLine = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/process-area/${id}`, updates);
  return response.data;
};

// Description: Update production line sections order (admin)
// Endpoint: PATCH /api/process-area/:id/sections
export const updateProductionLineSections = async (id: string, sections: Array<{ sectionId: string; order: number }>) => {
  const response = await api.patch(`/api/process-area/${id}/sections`, { sections });
  return response.data;
};

// Description: Delete production line (admin)
// Endpoint: DELETE /api/process-area/:id
export const deleteProductionLine = async (id: string) => {
  const response = await api.delete(`/api/process-area/${id}`);
  return response.data;
};