import api from './api';

// Description: Get dashboard KPIs and metrics
// Endpoint: GET /api/dashboard/kpis
// Request: {}
// Response: { kpis: { mttr: number, mtbf: number, oee: number, availability: number, totalEquipment: number, activeInterventions: number, criticalParts: number, pendingOrders: number } }
export const getDashboardKPIs = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        kpis: {
          mttr: 4.2,
          mtbf: 680,
          oee: 85.5,
          availability: 92.3,
          totalEquipment: 156,
          activeInterventions: 12,
          criticalParts: 8,
          pendingOrders: 5
        }
      });
    }, 500);
  });
};

// Description: Get recent activities for dashboard
// Endpoint: GET /api/dashboard/activities
// Request: {}
// Response: { activities: Array<{ _id: string, type: string, description: string, timestamp: string, priority: string }> }
export const getRecentActivities = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        activities: [
          {
            _id: "1",
            type: "intervention",
            description: "Emergency repair completed on Dyeing Unit C1",
            timestamp: "2024-01-20T10:30:00Z",
            priority: "high"
          },
          {
            _id: "2",
            type: "inventory",
            description: "Low stock alert: Bearing 6205 below minimum level",
            timestamp: "2024-01-20T09:15:00Z",
            priority: "medium"
          },
          {
            _id: "3",
            type: "equipment",
            description: "Preventive maintenance scheduled for Spinning Machine A1",
            timestamp: "2024-01-20T08:45:00Z",
            priority: "low"
          }
        ]
      });
    }, 500);
  });
};