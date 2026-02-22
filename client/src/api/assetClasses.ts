import api from './api';

export interface AssetClass {
    _id: string;
    name: string;
    description?: string;
}

export const getAssetClasses = async (): Promise<AssetClass[]> => {
    const response = await api.get('/api/asset-classes');
    return response.data.assetClasses;
};

export const createAssetClass = async (data: Omit<AssetClass, '_id'>): Promise<AssetClass> => {
    const response = await api.post('/api/asset-classes', data);
    return response.data.assetClass;
};

export const updateAssetClass = async (id: string, data: Partial<AssetClass>): Promise<AssetClass> => {
    const response = await api.patch(`/api/asset-classes/${id}`, data);
    return response.data.assetClass;
};

export const deleteAssetClass = async (id: string): Promise<void> => {
    await api.delete(`/api/asset-classes/${id}`);
};
