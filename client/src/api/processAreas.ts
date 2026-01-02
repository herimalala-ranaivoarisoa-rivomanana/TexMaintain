import api from "./api"

export interface ProcessArea {
  _id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'maintenance'
  type?: 'production' | 'utility' | 'facility' | 'warehouse' | 'office' | 'other'
  departments: Array<{
    departmentId: {
      _id: string
      name: string
      description?: string
      equipment: Array<{
        equipmentId: {
          _id: string
          category: { name: string }
          type: { name: string }
          status: string
          location: string
          model?: string
          brand?: string | { _id: string, name: string }
        }
        order: number
      }>
    }
    order: number
  }>
  stats?: {
    targetOutput: number
    actualOutput: number
    defectCount: number
    shiftDuration: number
    plannedDowntime: number
    lastUpdated: string
  }
  createdAt: string
  updatedAt: string
}

export const getProcessAreas = async () => {
  const response = await api.get('/api/process-areas')
  return response.data.processAreas
}

export const getProcessAreaById = async (id: string) => {
  const response = await api.get(`/api/process-areas/${id}`)
  return response.data.processArea
}

export const getProcessAreaDashboardStats = async (id: string) => {
  const response = await api.get(`/api/process-areas/${id}/dashboard`)
  return response.data
}

export const createProcessArea = async (data: Partial<ProcessArea>) => {
  const response = await api.post('/api/process-areas', data)
  return response.data.processArea
}

export const updateProcessArea = async (id: string, data: Partial<ProcessArea>) => {
  const response = await api.patch(`/api/process-areas/${id}`, data)
  return response.data.processArea
}

export const updateProcessAreaDepartments = async (id: string, departments: Array<{ departmentId: string, order: number }>) => {
  const response = await api.patch(`/api/process-areas/${id}/departments`, { departments })
  return response.data.processArea
}

export const deleteProcessArea = async (id: string) => {
  const response = await api.delete(`/api/process-areas/${id}`)
  return response.data
}