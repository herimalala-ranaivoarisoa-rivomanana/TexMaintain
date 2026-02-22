import api from './api';

// Description: Get all production departments with filters
// Endpoint: GET /api/production-departments
// Response: { departments: Array }
export const getProductionDepartments = async (params?: { productionLine?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/production-departments', { params });
  return response.data;
};

// Description: Get production department details by ID
// Endpoint: GET /api/production-departments/:id
// Response: { department: object }
export const getProductionDepartmentById = async (id: string) => {
  const response = await api.get(`/api/production-departments/${id}`);
  return response.data;
};

// Description: Create new production department (admin)
// Endpoint: POST /api/production-departments
export const createProductionDepartment = async (data: { name: string; description?: string; productionLine: string; order?: number }) => {
  const response = await api.post('/api/production-departments', data);
  return response.data;
};

// Description: Update production department (admin)
// Endpoint: PATCH /api/production-departments/:id
export const updateProductionDepartment = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/production-departments/${id}`, updates);
  return response.data;
};

// Description: Update production department asset order (admin)
// Endpoint: PATCH /api/production-departments/:id/asset
export const updateProductionDepartmentAsset = async (id: string, asset: Array<{ assetId: string; order: number }>) => {
  const response = await api.patch(`/api/production-departments/${id}/asset`, { asset });
  return response.data;
};

// Description: Delete production department (admin)
// Endpoint: DELETE /api/production-departments/:id
export const deleteProductionDepartment = async (id: string) => {
  const response = await api.delete(`/api/production-departments/${id}`);
  return response.data;
};