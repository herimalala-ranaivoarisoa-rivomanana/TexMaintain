import api from './api';

// Description: Seed admin user into the database
// Endpoint: POST /api/seed/admin
// Request: {}
// Response: { success: boolean, message: string, data: { user: object, credentials?: { email: string, password: string } } }
export const seedAdminUser = async () => {
  try {
    const response = await api.post('/api/seed/admin');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Seed equipment types into the database
// Endpoint: POST /api/seed/equipment-types
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, equipment: Array } }
export const seedEquipmentTypes = async () => {
  try {
    const response = await api.post('/api/seed/equipment-types');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};