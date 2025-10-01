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

// Description: Get equipment interventions history
// Endpoint: GET /api/equipment/:id/interventions
export const getEquipmentInterventions = async (id: string, params?: { page?: number; limit?: number; type?: string; status?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get(`/api/equipment/${id}/interventions`, { params });
  return response.data;
};

// Description: Get equipment associated parts
// Endpoint: GET /api/equipment/:id/parts
export const getEquipmentParts = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}/parts`);
  return response.data;
};

// Description: Assign equipment to production section
// Endpoint: POST /api/equipment/:id/assign-section
export const assignEquipmentToSection = async (id: string, sectionId: string) => {
  const response = await api.post(`/api/equipment/${id}/assign-section`, { sectionId });
  return response.data;
};

// Description: Associate part to equipment
// Endpoint: POST /api/equipment/:id/parts
export const associatePartToEquipment = async (id: string, data: { partId: string; quantity?: number; replacementFrequency?: number; notes?: string }) => {
  const response = await api.post(`/api/equipment/${id}/parts`, data);
  return response.data;
};

// Description: Change equipment status with business rules
// Endpoint: PATCH /api/equipment/:id/status
export const changeEquipmentStatus = async (id: string, data: { 
  newStatus: string; 
  reason?: string; 
  notes?: string; 
  interventionData?: {
    title?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    description?: string;
    assignedTo?: string;
  }
}) => {
  const response = await api.patch(`/api/equipment/${id}/status`, data);
  return response.data;
};

// Description: Get available statuses for equipment
// Endpoint: GET /api/equipment/:id/available-statuses
export const getAvailableStatuses = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}/available-statuses`);
  return response.data;
};

// Description: Get detailed equipment metrics
// Endpoint: GET /api/equipment/:id/metrics
export const getEquipmentMetrics = async (id: string) => {
  const response = await api.get(`/api/equipment/${id}/metrics`);
  return response.data.metrics;
};