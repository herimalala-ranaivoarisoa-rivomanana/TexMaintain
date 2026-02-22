import api from './api';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  assetClass?: string;
  statistics?: CategoryStatistics;
}

export interface CategoryStatistics {
  _id: string;
  name: string;
  totalAssets: number;
  inProduction: number;
  maintenance: number;
  breakdown: number;
  avgAvailability: number;
  avgMtbf: number;
  avgMttr: number;
}

export const getCategories = async () => {
  const response = await api.get('/api/asset-categories');
  return response.data;
};

export const getCategoryStatistics = async () => {
  const response = await api.get('/api/asset-categories/statistics');
  return response.data;
};

export const createCategory = async (data: Partial<Category>) => {
  const response = await api.post('/api/asset-categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: Partial<Category>) => {
  const response = await api.patch(`/api/asset-categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/api/asset-categories/${id}`);
  return response.data;
};