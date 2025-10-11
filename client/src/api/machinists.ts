import api from './api';

export interface Machinist {
  _id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MachinistFormData {
  matricule: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

export interface GetMachinistsParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
}

export interface GetMachinistsResponse {
  machinists: Machinist[];
  page: number;
  total: number;
  totalPages: number;
}

export const getMachinists = async (params?: GetMachinistsParams): Promise<GetMachinistsResponse> => {
  const response = await api.get('/machinists', { params });
  return response.data;
};

export const getMachinist = async (id: string): Promise<Machinist> => {
  const response = await api.get(`/machinists/${id}`);
  return response.data;
};

export const createMachinist = async (data: MachinistFormData): Promise<Machinist> => {
  const response = await api.post('/machinists', data);
  return response.data;
};

export const updateMachinist = async (id: string, data: Partial<MachinistFormData>): Promise<Machinist> => {
  const response = await api.put(`/machinists/${id}`, data);
  return response.data;
};

export const deleteMachinist = async (id: string): Promise<void> => {
  await api.delete(`/machinists/${id}`);
};
