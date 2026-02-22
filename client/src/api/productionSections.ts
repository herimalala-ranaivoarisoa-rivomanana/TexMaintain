import api from './api';

// Description: Get all production sections with filters
// Endpoint: GET /api/production-sections
// Response: { sections: Array }
export const getProductionSections = async (params?: { productionLine?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/production-sections', { params });
  return response.data;
};

// Description: Get production section details by ID
// Endpoint: GET /api/production-sections/:id
// Response: { section: object }
export const getProductionSectionById = async (id: string) => {
  const response = await api.get(`/api/production-sections/${id}`);
  return response.data;
};

// Description: Create new production section (admin)
// Endpoint: POST /api/production-sections
export const createProductionSection = async (data: { name: string; description?: string; productionLine: string; order?: number }) => {
  const response = await api.post('/api/production-sections', data);
  return response.data;
};

// Description: Update production section (admin)
// Endpoint: PATCH /api/production-sections/:id
export const updateProductionSection = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/production-sections/${id}`, updates);
  return response.data;
};

// Description: Update production section asset order (admin)
// Endpoint: PATCH /api/production-sections/:id/asset
export const updateProductionSectionAsset = async (id: string, asset: Array<{ assetId: string; order: number }>) => {
  const response = await api.patch(`/api/production-sections/${id}/asset`, { asset });
  return response.data;
};

// Description: Delete production section (admin)
// Endpoint: DELETE /api/production-sections/:id
export const deleteProductionSection = async (id: string) => {
  const response = await api.delete(`/api/production-sections/${id}`);
  return response.data;
};