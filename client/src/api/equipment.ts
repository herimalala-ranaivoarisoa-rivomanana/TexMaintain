import api from './api';

// Description: Get all equipment with status and maintenance info
// Endpoint: GET /api/equipment
// Request: {}
// Response: { equipment: Array<{ _id: string, name: string, type: string, status: string, location: string, lastMaintenance: string, nextMaintenance: string, mtbf: number, mttr: number }> }
export const getEquipment = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        equipment: [
          {
            _id: "1",
            name: "Spinning Machine A1",
            type: "Spinning",
            status: "operational",
            location: "Workshop A - Line 1",
            lastMaintenance: "2024-01-15",
            nextMaintenance: "2024-02-15",
            mtbf: 720,
            mttr: 4.5
          },
          {
            _id: "2",
            name: "Weaving Loom B2",
            type: "Weaving",
            status: "maintenance",
            location: "Workshop B - Line 2",
            lastMaintenance: "2024-01-10",
            nextMaintenance: "2024-02-10",
            mtbf: 680,
            mttr: 6.2
          },
          {
            _id: "3",
            name: "Dyeing Unit C1",
            type: "Dyeing",
            status: "breakdown",
            location: "Workshop C - Line 1",
            lastMaintenance: "2024-01-05",
            nextMaintenance: "2024-02-05",
            mtbf: 540,
            mttr: 8.1
          }
        ]
      });
    }, 500);
  });
};

// Description: Get equipment details by ID
// Endpoint: GET /api/equipment/:id
// Request: { id: string }
// Response: { equipment: { _id: string, name: string, type: string, status: string, specifications: object, maintenanceHistory: Array, documents: Array } }
export const getEquipmentById = (id: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        equipment: {
          _id: id,
          name: "Spinning Machine A1",
          type: "Spinning",
          status: "operational",
          specifications: {
            model: "SP-2000X",
            manufacturer: "TextileTech",
            year: 2020,
            capacity: "500 kg/hour"
          },
          maintenanceHistory: [
            { date: "2024-01-15", type: "Preventive", description: "Regular maintenance check" },
            { date: "2023-12-15", type: "Corrective", description: "Belt replacement" }
          ],
          documents: [
            { name: "Manual.pdf", type: "Manual", uploadDate: "2024-01-01" },
            { name: "Warranty.pdf", type: "Warranty", uploadDate: "2024-01-01" }
          ]
        }
      });
    }, 500);
  });
};