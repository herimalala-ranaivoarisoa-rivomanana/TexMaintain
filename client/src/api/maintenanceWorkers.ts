import api from './api';

export interface MaintenanceWorker {
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

export interface MaintenanceWorkerFormData {
  matricule: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  certifications?: string[];
  isActive?: boolean;
}

export interface GetMaintenanceWorkersParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  specialization?: string;
}

export interface GetMaintenanceWorkersResponse {
  workers: MaintenanceWorker[];
  page: number;
  total: number;
  totalPages: number;
}

export const getMaintenanceWorkers = async (params?: GetMaintenanceWorkersParams): Promise<GetMaintenanceWorkersResponse> => {
  const response = await api.get('/api/maintenance-workers', { params });
  return response.data;
};

export const getMaintenanceWorker = async (id: string): Promise<MaintenanceWorker> => {
  const response = await api.get(`/api/maintenance-workers/${id}`);
  return response.data;
};

export const createMaintenanceWorker = async (data: MaintenanceWorkerFormData): Promise<MaintenanceWorker> => {
  const response = await api.post('/api/maintenance-workers', data);
  return response.data;
};

export const updateMaintenanceWorker = async (id: string, data: Partial<MaintenanceWorkerFormData>): Promise<MaintenanceWorker> => {
  const response = await api.put(`/api/maintenance-workers/${id}`, data);
  return response.data;
};

export const deleteMaintenanceWorker = async (id: string): Promise<void> => {
  await api.delete(`/api/maintenance-workers/${id}`);
};
