import api from './api';

// Description: Get all brands
// Endpoint: GET /api/brands
// Response: { brands: Array<{ _id: string, name: string, description?: string, createdAt: string, updatedAt: string }> }
export const getBrands = async () => {
  const response = await api.get('/api/brands');
  return response.data;
};

// Description: Create new brand (admin, maintenance_manager)
// Endpoint: POST /api/brands
export const createBrand = async (data: { name: string; description?: string }) => {
  const response = await api.post('/api/brands', data);
  return response.data;
};

// Description: Update brand (admin)
// Endpoint: PATCH /api/brands/:id
export const updateBrand = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/brands/${id}`, updates);
  return response.data;
};

// Description: Delete brand (admin)
// Endpoint: DELETE /api/brands/:id
export const deleteBrand = async (id: string) => {
  const response = await api.delete(`/api/brands/${id}`);
  return response.data;
};