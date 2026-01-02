import api from './api';

export interface Electrician {
  _id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  fullName: string;
  specialization: string;
  certifications: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ElectricianFormData {
  matricule: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  certifications?: string[];
  isActive?: boolean;
}

export interface GetElectriciansParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  specialization?: string;
}

export interface GetElectriciansResponse {
  electricians: Electrician[];
  page: number;
  total: number;
  totalPages: number;
}

export const getElectricians = async (params?: GetElectriciansParams): Promise<GetElectriciansResponse> => {
  const response = await api.get('/api/electricians', { params });
  return response.data;
};

export const getElectrician = async (id: string): Promise<Electrician> => {
  const response = await api.get(`/api/electricians/${id}`);
  return response.data;
};

export const createElectrician = async (data: ElectricianFormData): Promise<Electrician> => {
  const response = await api.post('/api/electricians', data);
  return response.data;
};

export const updateElectrician = async (id: string, data: Partial<ElectricianFormData>): Promise<Electrician> => {
  const response = await api.put(`/api/electricians/${id}`, data);
  return response.data;
};

export const deleteElectrician = async (id: string): Promise<void> => {
  await api.delete(`/api/electricians/${id}`);
};
