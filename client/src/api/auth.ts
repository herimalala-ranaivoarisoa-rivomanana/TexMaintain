import api from './api';
import { AxiosError } from 'axios';
import { AxiosError } from 'axios';

// Description: Login user functionality
// Endpoint: POST /api/auth/login
// Request: { email: string, password: string }
// Response: { _id: string, email: string, role: string, accessToken: string, refreshToken: string, createdAt: string, lastLoginAt: string, isActive: boolean }
export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('https://texmaintain.onrender.com/api/auth/login', { email, password });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;
    console.error('Login error:', err);

    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Login failed'
    );
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;
    console.error('Login error:', err);

    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Login failed'
    );
  } 
};

// Description: Register user functionality
// Endpoint: POST /api/auth/register
// Request: { email: string, password: string, role?: string }
// Response: { _id: string, email: string, role: string, createdAt: string, lastLoginAt: string, isActive: boolean }
export const register = async (
  email: string,
  password: string,
  role?: string
) => {
export const register = async (
  email: string,
  password: string,
  role?: string
) => {
  try {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      role,
    });
    const response = await api.post('/api/auth/register', {
      email,
      password,
      role,
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;

    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Registration failed'
      'Registration failed'
    );
  }
};

// Description: Get current user information
// Endpoint: GET /api/auth/me
// Request: {}
// Response: { _id: string, email: string, role: string, createdAt: string, lastLoginAt: string, isActive: boolean }
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;

    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Unable to fetch user'
      'Unable to fetch user'
    );
  }
};

// Description: Logout
// Endpoint: POST /api/auth/logout
// Request: {}
// Response: { success: boolean, message: string }
export const logout = async () => {
  try {
    const response = await api.post('/api/auth/logout');
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError<{ message?: string }>;

    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Unable to logout'
    );
  }
};

