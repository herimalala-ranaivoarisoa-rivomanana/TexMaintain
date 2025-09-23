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

// Description: Seed equipment categories into the database
// Endpoint: POST /api/seed/equipment-categories
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, categories: Array } }
export const seedEquipmentCategories = async () => {
  try {
    const response = await api.post('/api/seed/equipment-categories');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Seed equipment into the database
// Endpoint: POST /api/seed/equipment
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, equipment: Array } }
export const seedEquipment = async () => {
  try {
    const response = await api.post('/api/seed/equipment');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Seed parts into the database
// Endpoint: POST /api/seed/parts
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, parts: Array } }
export const seedParts = async () => {
  try {
    const response = await api.post('/api/seed/parts');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};

// Description: Seed all data into the database
// Endpoint: POST /api/seed/all
// Request: {}
// Response: { success: boolean, message: string, results: object }
export const seedAll = async () => {
  try {
    const response = await api.post('/api/seed/all');
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error.message);
  }
};