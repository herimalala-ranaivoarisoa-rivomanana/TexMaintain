import api from './api'

export interface UploadMediaResponse {
    success: boolean
    urls: string[]
}

export const uploadMedia = async (files: File[]): Promise<UploadMediaResponse> => {
    const formData = new FormData()

    files.forEach((file) => {
        formData.append('media', file)
    })

    const response = await api.post('/api/media', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}
