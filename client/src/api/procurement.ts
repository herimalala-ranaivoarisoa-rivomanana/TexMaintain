import api from './api';

export interface ProcurementOrder {
    _id: string;
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    status: 'pending' | 'ordered' | 'in_transit' | 'received' | 'cancelled';
    orderDate: string;
    expectedDate?: string;
    supplier: string;
    orderNumber?: string;
    reference?: string;
    totalPrice: number;
}

export interface ProcurementStats {
    pendingRequests: number;
    activeOrders: number;
    overdueOrders: number;
    completedOrders: number;
    totalSuppliers: number;
}

export const getProcurementOrders = async (): Promise<ProcurementOrder[]> => {
    const response = await api.get('/api/procurement/orders');
    return response.data.orders;
};

export const getProcurementStats = async (): Promise<ProcurementStats> => {
    const response = await api.get('/api/procurement/stats');
    return response.data;
};

export const createProcurementOrder = async (data: {
    partId: string;
    quantity: number;
    supplier?: string;
    notes?: string;
    expectedDate?: string;
}) => {
    const response = await api.post('/api/procurement/orders', data);
    return response.data;
};

export const updateOrderStatus = async (id: string, partId: string, status: string, options?: { quantity?: number, reference?: string }) => {
    const response = await api.patch(`/api/procurement/orders/${id}/status`, { status, partId, ...options });
    return response.data;
};
