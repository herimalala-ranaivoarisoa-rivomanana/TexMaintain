import api from './api';

// Description: Get all spare parts inventory
// Endpoint: GET /api/inventory
// Request: {}
// Response: { parts: Array<{ _id: string, name: string, partNumber: string, category: string, currentStock: number, minStock: number, maxStock: number, unitPrice: number, supplier: string, location: string }> }
export const getInventory = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        parts: [
          {
            _id: "1",
            name: "V-Belt Type A",
            partNumber: "VB-A-001",
            category: "Belts",
            currentStock: 15,
            minStock: 10,
            maxStock: 50,
            unitPrice: 25.50,
            supplier: "Industrial Parts Co.",
            location: "Warehouse A-1"
          },
          {
            _id: "2",
            name: "Bearing 6205",
            partNumber: "BR-6205",
            category: "Bearings",
            currentStock: 5,
            minStock: 8,
            maxStock: 30,
            unitPrice: 12.75,
            supplier: "Bearing Solutions Ltd.",
            location: "Warehouse A-2"
          },
          {
            _id: "3",
            name: "Motor Oil SAE 30",
            partNumber: "OIL-SAE30",
            category: "Lubricants",
            currentStock: 25,
            minStock: 15,
            maxStock: 100,
            unitPrice: 8.90,
            supplier: "Lubricant Express",
            location: "Warehouse B-1"
          }
        ]
      });
    }, 500);
  });
};

// Description: Update stock levels for a part
// Endpoint: PUT /api/inventory/:id/stock
// Request: { quantity: number, type: 'in' | 'out', reason: string }
// Response: { success: boolean, message: string, newStock: number }
export const updateStock = (id: string, data: { quantity: number; type: 'in' | 'out'; reason: string }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Stock updated successfully',
        newStock: data.type === 'in' ? 20 : 10
      });
    }, 500);
  });
};