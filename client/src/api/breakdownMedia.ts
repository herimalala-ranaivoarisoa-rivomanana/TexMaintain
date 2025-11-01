import api from './api'

export const uploadBreakdownMedia = async (
  equipmentId: string,
  breakdownType: string,
  description: string,
  files: File[]
) => {
  const formData = new FormData()
  formData.append('equipmentId', equipmentId)
  formData.append('breakdownType', breakdownType)
  formData.append('description', description)
  
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await api.post('/api/breakdown-media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export const getBreakdownMediaByEquipment = async (equipmentId: string) => {
  const response = await api.get(`/api/breakdown-media/equipment/${equipmentId}`)
  return response.data
}

export const getBreakdownMedia = async (id: string) => {
  const response = await api.get(`/api/breakdown-media/${id}`)
  return response.data
}

export const deleteBreakdownMedia = async (id: string) => {
  const response = await api.delete(`/api/breakdown-media/${id}`)
  return response.data
}
