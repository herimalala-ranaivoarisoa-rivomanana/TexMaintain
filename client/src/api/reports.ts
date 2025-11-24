import api from './api';

export interface ReportStats {
    equipmentCount: number;
    activeInterventions: number;
    lowStockParts: number;
    totalStockValue: number;
}

export interface MaintenanceMetrics {
    mtbf: number;
    mttr: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    monthlyData: Array<{
        name: string;
        interventions: number;
        cost: number;
    }>;
}

export interface InventoryMetrics {
    totalValue: number;
    byCategory: Array<{
        name: string;
        count: number;
        value: number;
    }>;
    lowStockItems: Array<{
        id: string;
        name: string;
        current: number;
        min: number;
        unitPrice: number;
    }>;
}

export const getReportStats = async (): Promise<ReportStats> => {
    const response = await api.get('/reports/stats');
    return response.data;
};

export const getMaintenanceMetrics = async (): Promise<MaintenanceMetrics> => {
    const response = await api.get('/reports/maintenance');
    return response.data;
};

export const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
    const response = await api.get('/reports/inventory');
    return response.data;
};
