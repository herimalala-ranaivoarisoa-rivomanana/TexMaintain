import api from './api';

// Description: Get all interventions with status and details
// Endpoint: GET /api/interventions
// Request: {}
// Response: { interventions: Array<{ _id: string, title: string, type: string, priority: string, status: string, equipment: string, assignedTo: string, createdDate: string, dueDate: string }> }
export const getInterventions = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        interventions: [
          {
            _id: "1",
            title: "Belt Replacement - Spinning Machine A1",
            type: "Corrective",
            priority: "High",
            status: "In Progress",
            equipment: "Spinning Machine A1",
            assignedTo: "John Smith",
            createdDate: "2024-01-20",
            dueDate: "2024-01-22"
          },
          {
            _id: "2",
            title: "Preventive Maintenance - Weaving Loom B2",
            type: "Preventive",
            priority: "Medium",
            status: "Pending",
            equipment: "Weaving Loom B2",
            assignedTo: "Sarah Johnson",
            createdDate: "2024-01-19",
            dueDate: "2024-01-25"
          },
          {
            _id: "3",
            title: "Emergency Repair - Dyeing Unit C1",
            type: "Emergency",
            priority: "Critical",
            status: "Completed",
            equipment: "Dyeing Unit C1",
            assignedTo: "Mike Wilson",
            createdDate: "2024-01-18",
            dueDate: "2024-01-19"
          }
        ]
      });
    }, 500);
  });
};

// Description: Create a new intervention
// Endpoint: POST /api/interventions
// Request: { title: string, type: string, priority: string, equipment: string, description: string }
// Response: { success: boolean, message: string, intervention: object }
export const createIntervention = (data: { title: string; type: string; priority: string; equipment: string; description: string }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Intervention created successfully',
        intervention: { _id: Date.now().toString(), ...data, status: 'Pending', createdDate: new Date().toISOString() }
      });
    }, 500);
  });
};