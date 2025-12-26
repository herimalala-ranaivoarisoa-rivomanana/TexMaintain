import api from './api';

export type Site = {
  _id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  businessUnit?: { _id: string; name: string; code: string } | string;
  isActive?: boolean;
};

export const listSites = async () => {
  const res = await api.get('/api/sites');
  return res.data as { sites: Site[] };
};

export const createSite = async (payload: Omit<Site, '_id'> & { businessUnit?: string }) => {
  const res = await api.post('/api/sites', payload);
  return res.data as { success: boolean; site: Site };
};

export const updateSite = async (id: string, updates: Partial<Omit<Site, '_id'>>) => {
  const res = await api.patch(`/api/sites/${id}`, updates);
  return res.data as { success: boolean; site: Site };
};

export const deleteSite = async (id: string) => {
  const res = await api.delete(`/api/sites/${id}`);
  return res.data as { success: boolean };
};
