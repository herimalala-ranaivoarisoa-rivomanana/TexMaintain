import api from './api';

export interface Mechanic {
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

export interface MechanicFormData {
  matricule: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  certifications?: string[];
  isActive?: boolean;
}

export interface GetMechanicsParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  specialization?: string;
}

export interface GetMechanicsResponse {
  mechanics: Mechanic[];
  page: number;
  total: number;
  totalPages: number;
}

export const getMechanics = async (params?: GetMechanicsParams): Promise<GetMechanicsResponse> => {
  const response = await api.get('/api/mechanics', { params });
  return response.data;
};

export const getMechanic = async (id: string): Promise<Mechanic> => {
  const response = await api.get(`/api/mechanics/${id}`);
  return response.data;
};

export const createMechanic = async (data: MechanicFormData): Promise<Mechanic> => {
  const response = await api.post('/api/mechanics', data);
  return response.data;
};

export const updateMechanic = async (id: string, data: Partial<MechanicFormData>): Promise<Mechanic> => {
  const response = await api.put(`/api/mechanics/${id}`, data);
  return response.data;
};

export const deleteMechanic = async (id: string): Promise<void> => {
  await api.delete(`/api/mechanics/${id}`);
};
