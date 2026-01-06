import api from './api';

// Description: Get all equipment categories
// Endpoint: GET /api/equipment-categories
// Response: { categories: Array<{ _id: string, name: string, description?: string, createdAt: string, updatedAt: string }> }
export const getEquipmentCategories = async () => {
  const response = await api.get('/api/equipment-categories');
  return response.data;
};

// Description: Get equipment category statistics
// Endpoint: GET /api/equipment-categories/statistics
export const getEquipmentCategoryStatistics = async () => {
  const response = await api.get('/api/equipment-categories/statistics');
  return response.data;
};

// Description: Create new equipment category (admin)
// Endpoint: POST /api/equipment-categories
export const createEquipmentCategory = async (data: { name: string; description?: string }) => {
  const response = await api.post('/api/equipment-categories', data);
  return response.data;
};

// Description: Update equipment category (admin)
// Endpoint: PATCH /api/equipment-categories/:id
export const updateEquipmentCategory = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/equipment-categories/${id}`, updates);
  return response.data;
};

// Description: Delete equipment category (admin)
// Endpoint: DELETE /api/equipment-categories/:id
export const deleteEquipmentCategory = async (id: string) => {
  const response = await api.delete(`/api/equipment-categories/${id}`);
  return response.data;
};