import api from './api';
import { Category } from './categories';

export interface SubCategoryStatistics {
  totalAssets: number;
  avgMtbf: number;
  avgMttr: number;
  avgAvailability: number;
  statusBreakdown: {
    in_production: number;
    offline: number;
    maintenance: number;
    breakdown: number;
    other: number;
  };
}

export interface SubCategory {
  _id: string;
  name: string;
  description?: string;
  category: Category;
  statistics?: SubCategoryStatistics;
}

export const getSubCategories = async (categoryId?: string): Promise<SubCategory[]> => {
  const params = categoryId ? { category: categoryId } : {};
  const response = await api.get('/api/asset-types', { params });
  return response.data.types; // Backend returns 'types' for asset-types
};

export const getSubCategoryStatistics = async (): Promise<SubCategory[]> => {
  const response = await api.get('/api/asset-types/statistics');
  return response.data;
};

export const createSubCategory = async (data: Partial<SubCategory> & { categoryId: string }): Promise<SubCategory> => {
  // Map categoryId to category for backend if needed, or backend handles it
  const payload = { ...data, category: data.categoryId };
  const response = await api.post('/api/asset-types', payload);
  return response.data;
};

export const updateSubCategory = async (id: string, data: Partial<SubCategory>): Promise<SubCategory> => {
  const response = await api.put(`/api/asset-types/${id}`, data);
  return response.data;
};

export const deleteSubCategory = async (id: string): Promise<void> => {
  await api.delete(`/api/asset-types/${id}`);
};