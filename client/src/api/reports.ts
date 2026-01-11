import api from './api';

export interface ReportStats {
    assetCount: number;
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

export interface FinancialMetrics {
    topCostlyAsset: Array<{
        _id: string;
        name: string;
        tco: number;
        purchasePrice: number;
        totalMaintenanceCost: number;
    }>;
    tcoByCategory: Array<{
        name: string;
        value: number;
    }>;
}

export const getReportStats = async (): Promise<ReportStats & { totalTCO?: number, totalAssetValue?: number }> => {
    const response = await api.get('/api/reports/stats');
    return response.data;
};

export const getMaintenanceMetrics = async (): Promise<MaintenanceMetrics> => {
    const response = await api.get('/api/reports/maintenance');
    return response.data;
};

export const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
    const response = await api.get('/api/reports/inventory');
    return response.data;
};

export const getFinancialMetrics = async (): Promise<FinancialMetrics> => {
    const response = await api.get('/api/reports/financials');
    return response.data;
};
