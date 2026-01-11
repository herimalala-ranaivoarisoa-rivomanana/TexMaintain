import api from './api';

// Description: Get dashboard KPIs and metrics
// Endpoint: GET /api/dashboard/kpis
// Request: {}
// Response: { kpis: { mttr: number, mtbf: number, oee: number, availability: number, totalAsset: number, activeInterventions: number, criticalParts: number, pendingOrders: number } }
export const getDashboardKPIs = async () => {
  const response = await api.get('/api/dashboard/kpis');
  return response.data;
};

// Description: Get recent activities for dashboard
// Endpoint: GET /api/dashboard/activities
// Request: {}
// Response: { activities: Array<{ _id: string, type: string, description: string, timestamp: string, priority: string }> }
export const getRecentActivities = async () => {
  const response = await api.get('/api/dashboard/activities');
  return response.data;
};