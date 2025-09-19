import api from './api';

// Description: Get all spare parts inventory
// Endpoint: GET /api/inventory
// Request: {}
// Response: { parts: Array<{ _id: string, name: string, partNumber: string, category: string, currentStock: number, minStock: number, maxStock: number, unitPrice: number, supplier: string, location: string }> }
export const getInventory = async (params?: { page?: number; limit?: number; category?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/inventory', { params });
  return response.data;
};

// Description: Get a single part by ID
// Endpoint: GET /api/inventory/:id
// Response: { part: object }
export const getPartById = async (id: string) => {
  const response = await api.get(`/api/inventory/${id}`);
  return response.data;
};

// Description: Update stock levels for a part
// Endpoint: PUT /api/inventory/:id/stock
// Request: { quantity: number, type: 'in' | 'out', reason: string }
// Response: { success: boolean, message: string, newStock: number }
export const updateStock = async (id: string, data: { quantity: number; type: 'in' | 'out'; reason: string }) => {
  const response = await api.put(`/api/inventory/${id}/stock`, data);
  return response.data;
};

// Description: Create new part (admin)
// Endpoint: POST /api/inventory
export const createPart = async (data: { name: string; partNumber: string; category: string; [key: string]: any }) => {
  const response = await api.post('/api/inventory', data);
  return response.data;
};

// Description: Update part (admin, procurement_manager)
// Endpoint: PATCH /api/inventory/:id
export const updatePart = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/inventory/${id}`, updates);
  return response.data;
};

// Description: Delete part (admin)
// Endpoint: DELETE /api/inventory/:id
export const deletePart = async (id: string) => {
  const response = await api.delete(`/api/inventory/${id}`);
  return response.data;
};