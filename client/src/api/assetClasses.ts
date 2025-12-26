import api from './api';

export type AssetClass = {
  _id: string;
  name: string;
  code: 'PRD' | 'UTL' | 'FAC' | 'INF' | 'SAF' | 'MHE';
  description?: string;
  isActive?: boolean;
};

export const listAssetClasses = async () => {
  const res = await api.get('/api/asset-classes');
  return res.data as { assetClasses: AssetClass[] };
};

export const createAssetClass = async (payload: Omit<AssetClass, '_id'>) => {
  const res = await api.post('/api/asset-classes', payload);
  return res.data as { success: boolean; assetClass: AssetClass };
};

export const updateAssetClass = async (id: string, updates: Partial<Omit<AssetClass, '_id'>>) => {
  const res = await api.patch(`/api/asset-classes/${id}`, updates);
  return res.data as { success: boolean; assetClass: AssetClass };
};

export const deleteAssetClass = async (id: string) => {
  const res = await api.delete(`/api/asset-classes/${id}`);
  return res.data as { success: boolean };
};
