import api from "./api"

export interface ProcessSection {
    _id: string
    name: string
    description?: string
    processArea: string
    asset: Array<{
        assetId: any
        order: number
    }>
    order: number
}

export const getProcessSections = async () => {
    const response = await api.get('/api/process-sections')
    return response.data.processSections
}

export const createProcessSection = async (data: Partial<ProcessSection>) => {
    const response = await api.post('/api/process-sections', data)
    return response.data.processSection
}

export const updateProcessSection = async (id: string, data: Partial<ProcessSection>) => {
    const response = await api.patch(`/api/process-sections/${id}`, data)
    return response.data.processSection
}

export const deleteProcessSection = async (id: string) => {
    const response = await api.delete(`/api/process-sections/${id}`)
    return response.data
}

export const updateProcessSectionAsset = async (id: string, asset: Array<{ assetId: string, order: number }>) => {
    const response = await api.patch(`/api/process-sections/${id}/asset`, { asset })
    return response.data.processSection
}
