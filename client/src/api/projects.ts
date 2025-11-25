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
    const response = await api.get('/projects');
    return response.data.projects;
};

export const getProjectStats = async (): Promise<ProjectStats> => {
    const response = await api.get('/projects/stats');
    return response.data;
};

export const createProject = async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data.project;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data.project;
};
