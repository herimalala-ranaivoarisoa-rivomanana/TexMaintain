import api from './api';
import { AxiosError } from 'axios';

// Description: Seed admin user into the database
// Endpoint: POST /api/seed/admin
// Request: {}
// Response: { success: boolean, message: string, data: { user: object, credentials?: { email: string, password: string } } }
export const seedAdminUser = async () => {
  try {
    const response = await api.post('/api/seed/admin');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed admin user';
    throw new Error(message);
  }
};

// Description: Seed asset types into the database
// Endpoint: POST /api/seed/asset-types
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, asset: Array } }
export const seedSubCategorys = async () => {
  try {
    const response = await api.post('/api/seed/asset-types');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed asset types';
    throw new Error(message);
  }
};

// Description: Seed asset categories into the database
// Endpoint: POST /api/seed/asset-categories
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, categories: Array } }
export const seedAssetCategories = async () => {
  try {
    const response = await api.post('/api/seed/asset-categories');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed asset categories';
    throw new Error(message);
  }
};

// Description: Seed asset into the database
// Endpoint: POST /api/seed/asset
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, asset: Array } }
export const seedAsset = async () => {
  try {
    const response = await api.post('/api/seed/asset');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed assets';
    throw new Error(message);
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
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed parts';
    throw new Error(message);
  }
};

// Description: Seed brands into the database
// Endpoint: POST /api/seed/brands
// Request: {}
// Response: { success: boolean, message: string, data: { created: number, skipped: number, brands: Array } }
export const seedBrands = async () => {
  try {
    const response = await api.post('/api/seed/brands');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed brands';
    throw new Error(message);
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
    const axiosError = error as AxiosError<{ message?: string }>;
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Failed to seed all data';
    throw new Error(message);
  }
};