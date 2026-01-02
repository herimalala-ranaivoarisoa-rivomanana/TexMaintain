import api from './api';

export interface Project {
    _id: string;
    title: string;
    description: string;
    status: 'Planned' | 'In Progress' | 'Completed' | 'On Hold';
    budget: number;
    startDate: string;
    endDate: string;
    progress: number;
    teamSize: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectStats {
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    totalTeamMembers: number;
}

export interface CreateProjectData {
    title: string;
    description: string;
    status: string;
    budget: number;
    startDate: string;
    endDate: string;
    teamSize: number;
}

export const getProjects = async (): Promise<Project[]> => {
    const response = await api.get('/api/projects');
    return response.data.projects;
};

export const getProjectStats = async (): Promise<ProjectStats> => {
    const response = await api.get('/api/projects/stats');
    return response.data;
};

export const createProject = async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post('/api/projects', data);
    return response.data.project;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await api.patch(`/api/projects/${id}`, data);
    return response.data.project;
};

export const deleteProject = async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`);
};

// --- Expenses ---

export interface ProjectExpense {
    _id: string;
    project: string;
    description: string;
    category: 'Material' | 'Labor' | 'Service' | 'Other';
    amount: number;
    date: string;
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: string;
}

export interface ProjectDetails {
    project: Project;
    totalSpent: number;
    expenseCount: number;
}

export interface CreateExpenseData {
    description: string;
    category: string;
    amount: number;
    date: string;
}

export const getProjectDetails = async (id: string): Promise<ProjectDetails> => {
    const response = await api.get(`/api/projects/${id}/details`);
    return response.data;
};

export const getProjectExpenses = async (id: string): Promise<ProjectExpense[]> => {
    const response = await api.get(`/api/projects/${id}/expenses`);
    return response.data.expenses;
};

export const createProjectExpense = async (id: string, data: CreateExpenseData): Promise<ProjectExpense> => {
    const response = await api.post(`/api/projects/${id}/expenses`, data);
    return response.data.expense;
};

export interface ConsumePartData {
    partId: string;
    quantity: number;
    date: string;
}

export const consumeProjectPart = async (id: string, data: ConsumePartData): Promise<{ expense: ProjectExpense, newStock: number }> => {
    const response = await api.post(`/api/projects/${id}/parts`, data);
    return response.data;
};
