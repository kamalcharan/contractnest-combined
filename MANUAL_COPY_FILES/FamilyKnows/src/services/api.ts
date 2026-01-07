// src/services/api.ts
// FamilyKnows Mobile API Service
// Handles all API requests with proper authentication and tenant headers

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for auth data
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@FamilyKnows:authToken',
  REFRESH_TOKEN: '@FamilyKnows:refreshToken',
  USER_DATA: '@FamilyKnows:userData',
  USER_ID: '@FamilyKnows:userId',
  TENANT_ID: '@FamilyKnows:tenantId',
  CURRENT_TENANT: '@FamilyKnows:currentTenant',
  LAST_ACTIVITY: '@FamilyKnows:lastActivity',
  TOKEN_TIMESTAMP: '@FamilyKnows:tokenTimestamp',
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/FKauth/login',
    REGISTER: '/api/FKauth/register',
    SIGNOUT: '/api/FKauth/signout',
    REFRESH: '/api/FKauth/refresh-token',
    USER: '/api/FKauth/user',
    RESET_PASSWORD: '/api/FKauth/reset-password',
    CHANGE_PASSWORD: '/api/FKauth/change-password',
  },
  USER: {
    UPDATE: '/api/FKauth/preferences',
    PROFILE: '/api/FKauth/user',
  },
  ONBOARDING: {
    STATUS: '/api/FKonboarding/status',
    COMPLETE_STEP: '/api/FKonboarding/complete-step',
    SKIP_STEP: '/api/FKonboarding/skip-step',
  },
};

// Get base URL from environment or use default
const getBaseURL = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL ||
              process.env.REACT_APP_API_URL ||
              'https://your-supabase-project.supabase.co/functions/v1';
  console.log('API Base URL:', url);
  return url;
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token storage for immediate access (faster than AsyncStorage)
let authToken: string | null = null;
let tenantId: string | null = null;
let tokenTimestamp: number | null = null;

// Request interceptor - adds auth headers to every request
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log('=== API REQUEST ===');
    console.log('URL:', config.url);
    console.log('Method:', config.method?.toUpperCase());

    // Try in-memory token first (fastest)
    let token = authToken;
    let tenant = tenantId;

    // Fallback to AsyncStorage if in-memory is empty
    if (!token) {
      try {
        token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          authToken = token; // Cache it
          console.log('Token loaded from AsyncStorage');
        }
      } catch (e) {
        console.error('Error reading token from AsyncStorage:', e);
      }
    }

    if (!tenant) {
      try {
        tenant = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
        if (tenant) {
          tenantId = tenant; // Cache it
          console.log('Tenant ID loaded from AsyncStorage');
        }
      } catch (e) {
        console.error('Error reading tenant ID from AsyncStorage:', e);
      }
    }

    // Set headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header set');
    } else {
      console.log('WARNING: No auth token available');
    }

    if (tenant) {
      config.headers['x-tenant-id'] = tenant;
      console.log('x-tenant-id header set:', tenant);
    } else {
      console.log('WARNING: No tenant ID available');
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors and token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('=== API RESPONSE SUCCESS ===');
    console.log('Status:', response.status);
    return response;
  },
  async (error: AxiosError) => {
    console.log('=== API REQUEST ERROR ===');

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data));

      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        console.log('Got 401, checking if token is fresh...');

        // Check if token is recent (less than 5 minutes old)
        const now = Date.now();
        const tokenAge = tokenTimestamp ? now - tokenTimestamp : Infinity;

        if (tokenAge < 5 * 60 * 1000) {
          // Token is fresh but still got 401 - likely a permission issue, not token expiry
          console.log(`Token is fresh (age: ${tokenAge}ms), not clearing auth`);

          // Extract error message from response
          const errorData = error.response.data as any;
          const errorMessage = errorData?.error || errorData?.message || 'Service temporarily unavailable. Please try again.';

          return Promise.reject(new Error(errorMessage));
        }

        // Token is old, try to refresh
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          console.log('Attempting token refresh...');

          try {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const refreshResponse = await axios.post(
                `${getBaseURL()}${API_ENDPOINTS.AUTH.REFRESH}`,
                { refresh_token: refreshToken }
              );

              const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

              // Update tokens
              await AsyncStorage.multiSet([
                [STORAGE_KEYS.AUTH_TOKEN, access_token],
                [STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken],
              ]);

              // Update in-memory cache
              authToken = access_token;
              tokenTimestamp = Date.now();

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear auth on refresh failure
            await api.clearAuth();
          }
        }

        return Promise.reject(new Error('Session expired. Please login again.'));
      }

      // Handle other errors
      const errorData = error.response.data as any;
      const errorMessage = errorData?.error || errorData?.message || `Request failed with status ${error.response.status}`;
      return Promise.reject(new Error(errorMessage));
    }

    // Network error
    if (error.request) {
      console.log('Network error - no response received');
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

// API object with helper methods
export const api = {
  // HTTP methods
  get: <T = any>(url: string, config?: any) => axiosInstance.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: any) => axiosInstance.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: any) => axiosInstance.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: any) => axiosInstance.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: any) => axiosInstance.delete<T>(url, config),

  // Set auth token (call after login/register)
  setAuthToken: (token: string) => {
    console.log('api.setAuthToken called');
    authToken = token;
    tokenTimestamp = Date.now();
    // Also set on axios defaults as backup
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  // Set tenant ID (call after login/register or when switching tenants)
  setTenantId: (id: string) => {
    console.log('api.setTenantId called:', id);
    tenantId = id;
    // Also set on axios defaults as backup
    axiosInstance.defaults.headers.common['x-tenant-id'] = id;
  },

  // Clear all auth data (call on logout)
  clearAuth: async () => {
    console.log('api.clearAuth called');

    // Clear in-memory cache
    authToken = null;
    tenantId = null;
    tokenTimestamp = null;

    // Clear axios defaults
    delete axiosInstance.defaults.headers.common['Authorization'];
    delete axiosInstance.defaults.headers.common['x-tenant-id'];

    // Clear AsyncStorage
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.TENANT_ID,
        STORAGE_KEYS.CURRENT_TENANT,
        STORAGE_KEYS.LAST_ACTIVITY,
        STORAGE_KEYS.TOKEN_TIMESTAMP,
      ]);
      console.log('Auth data cleared from AsyncStorage');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  // Get current auth state
  getAuthState: () => ({
    hasToken: !!authToken,
    hasTenant: !!tenantId,
    tokenAge: tokenTimestamp ? Date.now() - tokenTimestamp : null,
  }),
};

export default api;
