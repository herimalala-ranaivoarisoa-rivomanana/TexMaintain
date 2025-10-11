import api from './api';

// Description: Get all interventions with status and details
// Endpoint: GET /api/interventions
// Request: {}
// Response: { interventions: Array<{ _id: string, title: string, type: string, priority: string, status: string, equipment: string, assignedTo: string, createdDate: string, dueDate: string }> }
export const getInterventions = async (params?: { page?: number; limit?: number; status?: string; type?: string; priority?: string; q?: string; sort?: string; order?: 'asc'|'desc' }) => {
  const response = await api.get('/api/interventions', { params });
  return response.data;
};

// Description: Get a single intervention by ID
// Endpoint: GET /api/interventions/:id
// Response: { intervention: object }
export const getInterventionById = async (id: string) => {
  const response = await api.get(`/api/interventions/${id}`);
  return response.data;
};

// Description: Create a new intervention
// Endpoint: POST /api/interventions
// Request: { title: string, type: string, priority: string, equipment?: string, equipmentId?: string, description?: string, assignedTo?: string, dueDate?: string }
// Response: { success: boolean, message: string, intervention: object }
export const createIntervention = async (data: { 
  title: string; 
  type: string; 
  priority: string; 
  equipment?: string; 
  equipmentId?: string; 
  description?: string; 
  assignedTo?: string; 
  dueDate?: string;
  status?: string;
}) => {
  const response = await api.post('/api/interventions', data);
  return response.data;
};

// Update intervention
export const updateIntervention = async (id: string, updates: Record<string, any>) => {
  const response = await api.patch(`/api/interventions/${id}`, updates);
  return response.data;
};

// Delete intervention
export const deleteIntervention = async (id: string) => {
  const response = await api.delete(`/api/interventions/${id}`);
  return response.data;
};