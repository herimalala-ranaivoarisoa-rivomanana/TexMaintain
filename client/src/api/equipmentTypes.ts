import api from './api';

// Description: Get all equipment types, optionally filtered by category
// Endpoint: GET /api/equipment-types
// Response: { types: Array<{ _id: string, name: string, description?: string, category: { _id: string, name: string }, createdAt: string, updatedAt: string }> }
// Description: Get aggregated equipment stats by type for active factory
// Endpoint: GET /api/equipment-types/stats
export const getEquipmentTypeStats = async () => {
  const response = await api.get('/api/equipment-types/stats');
  return response.data; // returns { stats: [...] }
};

export const getEquipmentTypes = async (params?: { category?: string }) => {
  const response = await api.get('/api/equipment-types', { params });
  return response.data;
};

// Description: Create new equipment type (admin)
// Endpoint: POST /api/equipment-types
export const createEquipmentType = async (data: { name: string; description?: string; category: string }) => {
  const response = await api.post('/api/equipment-types', data);
  return response.data;
};

// Description: Update equipment type (admin)
// Endpoint: PATCH /api/equipment-types/:id
export const updateEquipmentType = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/equipment-types/${id}`, updates);
  return response.data;
};

// Description: Delete equipment type (admin)
// Endpoint: DELETE /api/equipment-types/:id
export const deleteEquipmentType = async (id: string) => {
  const response = await api.delete(`/api/equipment-types/${id}`);
  return response.data;
};