import api from './api';

export type SubAsset = {
  _id: string;
  equipment: string;
  name: string;
  code?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
};

export const listSubAssets = async (equipmentId: string) => {
  const res = await api.get('/api/sub-assets', { params: { equipment: equipmentId } });
  return res.data as { subAssets: SubAsset[] };
};

export const createSubAsset = async (payload: Omit<SubAsset, '_id'>) => {
  const res = await api.post('/api/sub-assets', payload);
  return res.data as { success: boolean; subAsset: SubAsset };
};

export const updateSubAsset = async (id: string, updates: Partial<Omit<SubAsset, '_id'>>) => {
  const res = await api.patch(`/api/sub-assets/${id}`, updates);
  return res.data as { success: boolean; subAsset: SubAsset };
};

export const deleteSubAsset = async (id: string) => {
  const res = await api.delete(`/api/sub-assets/${id}`);
  return res.data as { success: boolean };
};
