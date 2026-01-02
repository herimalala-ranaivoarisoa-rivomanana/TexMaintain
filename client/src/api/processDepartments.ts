import api from "./api"

export interface ProcessDepartment {
    _id: string
    name: string
    description?: string
    processArea: string
    equipment: Array<{
        equipmentId: any
        order: number
    }>
    order: number
}

export const getProcessDepartments = async () => {
    const response = await api.get('/api/process-departments')
    return response.data.processDepartments
}

export const createProcessDepartment = async (data: Partial<ProcessDepartment>) => {
    const response = await api.post('/api/process-departments', data)
    return response.data.processDepartment
}

export const updateProcessDepartment = async (id: string, data: Partial<ProcessDepartment>) => {
    const response = await api.patch(`/api/process-departments/${id}`, data)
    return response.data.processDepartment
}

export const deleteProcessDepartment = async (id: string) => {
    const response = await api.delete(`/api/process-departments/${id}`)
    return response.data
}

export const updateProcessDepartmentEquipment = async (id: string, equipment: Array<{ equipmentId: string, order: number }>) => {
    const response = await api.patch(`/api/process-departments/${id}/equipment`, { equipment })
    return response.data.processDepartment
}
