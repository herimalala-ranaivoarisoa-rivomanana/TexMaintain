import axios, {
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from 'axios';
import axios, {
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from 'axios';
import JSONbig from 'json-bigint';

/* =========================
   Axios instances
========================= */

const BASE_URL = process.env.VITE_API_URL || 'https://texmaintain.onrender.com';

/**
 * API principale (avec interceptors)
 */
const apiInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  transformResponse: [
    (data) => {
      if (!data || typeof data !== 'string') return data;
      if (!data || typeof data !== 'string') return data;
      try {
        return JSONbig.parse(data);
      } catch {
      } catch {
        return data;
      }
    },
  ],
});

/**
 * API dédiée au refresh token (SANS interceptors)
 */
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* =========================
   Utils
========================= */
    },
  ],
});

/**
 * API dédiée au refresh token (SANS interceptors)
 */
const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* =========================
   Utils
========================= */

let accessToken: string | null = null;

const normalizeUrl = (url: string): string => {
  if (!url.startsWith('/')) return `/${url}`;
  return url;
};

const isRefreshTokenEndpoint = (url: string): boolean =>
  url.includes('/api/auth/refresh');

/* =========================
   Interceptors
========================= */

const setupInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Normalise URL
      if (config.url) {
        config.url = normalizeUrl(config.url);
      }

      // Skip auth header for refresh endpoint
const normalizeUrl = (url: string): string => {
  if (!url.startsWith('/')) return `/${url}`;
  return url;
};

const isRefreshTokenEndpoint = (url: string): boolean =>
  url.includes('/api/auth/refresh');

/* =========================
   Interceptors
========================= */

const setupInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Normalise URL
      if (config.url) {
        config.url = normalizeUrl(config.url);
      }

      // Skip auth header for refresh endpoint
      if (config.url && isRefreshTokenEndpoint(config.url)) {
        return config;
      }

      // Access token

      // Access token
      if (!accessToken) {
        accessToken = localStorage.getItem('accessToken');
      }

      if (accessToken) {

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Factory context
      // Factory context
      const activeFactoryId = localStorage.getItem('activeFactoryId');
      const isAuthRequest =
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/me');
      const isAuthRequest =
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/me');

      if (activeFactoryId && !isAuthRequest) {
      if (activeFactoryId && !isAuthRequest) {
        config.headers['x-factory-id'] = activeFactoryId;
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error)
    (error: AxiosError) => Promise.reject(error)
  );

  instance.interceptors.response.use(
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest =
        error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    async (error: AxiosError) => {
      const originalRequest =
        error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (
        error.response?.status &&
        [401, 403].includes(error.response.status) &&
      if (
        error.response?.status &&
        [401, 403].includes(error.response.status) &&
        !originalRequest._retry &&
        originalRequest.url &&
        !isRefreshTokenEndpoint(originalRequest.url)
      ) {
        originalRequest.url &&
        !isRefreshTokenEndpoint(originalRequest.url)
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token');
            throw new Error('No refresh token');
          }

          const response = await refreshApi.post('/api/auth/refresh', {
          const response = await refreshApi.post('/api/auth/refresh', {
            refreshToken,
          });

          const newAccessToken = response.data?.data?.accessToken;
          const newRefreshToken = response.data?.data?.refreshToken;

          if (!newAccessToken || !newRefreshToken) {
            throw new Error('Invalid refresh response');
          }
          const newAccessToken = response.data?.data?.accessToken;
          const newRefreshToken = response.data?.data?.refreshToken;

          if (!newAccessToken || !newRefreshToken) {
            throw new Error('Invalid refresh response');
          }

          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          accessToken = newAccessToken;
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          accessToken = newAccessToken;

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          return apiInstance(originalRequest);
          return apiInstance(originalRequest);
        } catch (err) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          accessToken = null;
          window.location.href = '/login';
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );
};

setupInterceptors(apiInstance);
setupInterceptors(apiInstance);

/* =========================
   API wrapper
========================= */
/* =========================
   API wrapper
========================= */

const api = {
  request: (config: AxiosRequestConfig) => {
    if (config.url) {
      config.url = normalizeUrl(config.url);
    }
    if (config.url) {
      config.url = normalizeUrl(config.url);
    }
    return apiInstance(config);
  },

  get: (url: string, config?: AxiosRequestConfig) =>
    apiInstance.get(normalizeUrl(url), config),

  post: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.post(normalizeUrl(url), data, config),

  put: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.put(normalizeUrl(url), data, config),

  patch: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.patch(normalizeUrl(url), data, config),

  delete: (url: string, config?: AxiosRequestConfig) =>
    apiInstance.delete(normalizeUrl(url), config),

  get: (url: string, config?: AxiosRequestConfig) =>
    apiInstance.get(normalizeUrl(url), config),

  post: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.post(normalizeUrl(url), data, config),

  put: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.put(normalizeUrl(url), data, config),

  patch: (url: string, data?: any, config?: AxiosRequestConfig) =>
    apiInstance.patch(normalizeUrl(url), data, config),

  delete: (url: string, config?: AxiosRequestConfig) =>
    apiInstance.delete(normalizeUrl(url), config),
};

export default api;
