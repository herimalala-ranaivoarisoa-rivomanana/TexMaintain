import api from './api';

// Description: Get all equipment with status and maintenance info
// Endpoint: GET /api/equipment
// Request: {}
// Response: { equipment: Array<{ _id: string, name: string, category: string, type: string, status: string, location: string, lastMaintenance: string, nextMaintenance: string, mtbf: number, mttr: number }> }
export const getEquipment = async (params?: { page?: number; limit?: number; status?: string; category?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/equipment', { params });
  return response.data;
};

// Description: Get equipment details by ID
// Endpoint: GET /api/equipment/:id
// Request: { id: string }
// Response: { equipment: { _id: string, name: string, category: string, type: string, status: string, specifications: object, maintenanceHistory: Array, documents: Array } }
export const getEquipmentById = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}`);
  return response.data;
};

// Description: Create new equipment (admin)
// Endpoint: POST /api/equipment
export const createEquipment = async (data: { category: string; type: string; status: string; location: string; [key: string]: any }) => {
  const response = await api.post('/api/equipment', data);
  return response.data;
};

// Description: Update equipment (admin, maintenance_manager)
// Endpoint: PATCH /api/equipment/:id
export const updateEquipment = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/equipment/${id}` , updates);
  return response.data;
};

// Description: Delete equipment (admin)
// Endpoint: DELETE /api/equipment/:id
export const deleteEquipment = async (id: string) => {
  const response = await api.delete(`/api/equipment/${id}`);
  return response.data;
};