import api from './api';

export type BusinessUnit = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
};

export const listBusinessUnits = async () => {
  const res = await api.get('/api/business-units');
  return res.data as { businessUnits: BusinessUnit[] };
};

export const createBusinessUnit = async (payload: Omit<BusinessUnit, '_id'>) => {
  const res = await api.post('/api/business-units', payload);
  return res.data as { success: boolean; businessUnit: BusinessUnit };
};

export const updateBusinessUnit = async (id: string, updates: Partial<Omit<BusinessUnit, '_id'>>) => {
  const res = await api.patch(`/api/business-units/${id}`, updates);
  return res.data as { success: boolean; businessUnit: BusinessUnit };
};

export const deleteBusinessUnit = async (id: string) => {
  const res = await api.delete(`/api/business-units/${id}`);
  return res.data as { success: boolean };
};
