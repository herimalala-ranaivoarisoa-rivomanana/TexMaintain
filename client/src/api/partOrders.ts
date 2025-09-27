import api from './api';

// Description: Get all part orders with pagination & filters
// Endpoint: GET /api/part-orders
// Response: { orders: Array, page: number, total: number }
export const getPartOrders = async (params?: { page?: number; limit?: number; status?: string; equipment?: string; part?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/part-orders', { params });
  return response.data;
};

// Description: Get part order details by ID
// Endpoint: GET /api/part-orders/:id
// Response: { order: object }
export const getPartOrderById = async (id: string) => {
  const response = await api.get(`/api/part-orders/${id}`);
  return response.data;
};

// Description: Create new part order
// Endpoint: POST /api/part-orders
export const createPartOrder = async (data: { 
  part: string; 
  quantity: number; 
  supplier?: string; 
  unitPrice?: number; 
  expectedDelivery?: string; 
  equipment?: string; 
  notes?: string 
}) => {
  const response = await api.post('/api/part-orders', data);
  return response.data;
};

// Description: Update part order
// Endpoint: PATCH /api/part-orders/:id
export const updatePartOrder = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/part-orders/${id}`, updates);
  return response.data;
};

// Description: Delete part order
// Endpoint: DELETE /api/part-orders/:id
export const deletePartOrder = async (id: string) => {
  const response = await api.delete(`/api/part-orders/${id}`);
  return response.data;
};