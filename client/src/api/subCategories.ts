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
  return response.data.subCategories; // Backend returns 'subCategories'
};

export const getSubCategoryStatistics = async (): Promise<SubCategory[]> => {
  const response = await api.get('/api/asset-types/statistics');
  return response.data.subCategories;
};

export const createSubCategory = async (data: Partial<SubCategory> & { categoryId: string }): Promise<SubCategory> => {
  // Backend expects categoryId, not category
  const payload = { name: data.name, description: data.description, categoryId: data.categoryId };
  const response = await api.post('/api/asset-types', payload);
  return response.data;
};

export const updateSubCategory = async (id: string, data: Partial<SubCategory>): Promise<SubCategory> => {
  const response = await api.patch(`/api/asset-types/${id}`, data);
  return response.data;
};

export const deleteSubCategory = async (id: string): Promise<void> => {
  await api.delete(`/api/asset-types/${id}`);
};