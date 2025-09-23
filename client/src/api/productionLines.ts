import api from './api';

// Description: Get all production lines with pagination & filters
// Endpoint: GET /api/production-lines
// Response: { productionLines: Array, page: number, total: number }
export const getProductionLines = async (params?: { page?: number; limit?: number; status?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/production-lines', { params });
  return response.data;
};

// Description: Get production line details by ID
// Endpoint: GET /api/production-lines/:id
// Response: { productionLine: object }
export const getProductionLineById = async (id: string) => {
  const response = await api.get(`/api/production-lines/${id}`);
  return response.data;
};

// Description: Create new production line (admin)
// Endpoint: POST /api/production-lines
export const createProductionLine = async (data: { name: string; description?: string; status?: string }) => {
  const response = await api.post('/api/production-lines', data);
  return response.data;
};

// Description: Update production line (admin)
// Endpoint: PATCH /api/production-lines/:id
export const updateProductionLine = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/production-lines/${id}`, updates);
  return response.data;
};

// Description: Update production line sections order (admin)
// Endpoint: PATCH /api/production-lines/:id/sections
export const updateProductionLineSections = async (id: string, sections: Array<{ sectionId: string; order: number }>) => {
  const response = await api.patch(`/api/production-lines/${id}/sections`, { sections });
  return response.data;
};

// Description: Delete production line (admin)
// Endpoint: DELETE /api/production-lines/:id
export const deleteProductionLine = async (id: string) => {
  const response = await api.delete(`/api/production-lines/${id}`);
  return response.data;
};