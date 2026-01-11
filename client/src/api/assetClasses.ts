import api from './api';

export interface AssetClass {
    _id: string;
    name: string;
    description?: string;
}

export const getAssetClasses = async (): Promise<AssetClass[]> => {
    const response = await api.get('/asset-classes');
    return response.data.assetClasses;
};

export const createAssetClass = async (data: Omit<AssetClass, '_id'>): Promise<AssetClass> => {
    const response = await api.post('/asset-classes', data);
    return response.data.assetClass;
};

export const updateAssetClass = async (id: string, data: Partial<AssetClass>): Promise<AssetClass> => {
    const response = await api.patch(`/asset-classes/${id}`, data);
    return response.data.assetClass;
};

export const deleteAssetClass = async (id: string): Promise<void> => {
    await api.delete(`/asset-classes/${id}`);
};
