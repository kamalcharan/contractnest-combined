// src/services/api.ts
// API Service with x-product header for FamilyKnows

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@FamilyKnows:auth_token',
  REFRESH_TOKEN: '@FamilyKnows:refresh_token',
  USER_DATA: '@FamilyKnows:user_data',
  USER_ID: '@FamilyKnows:user_id',
  TENANT_ID: '@FamilyKnows:tenant_id',
  CURRENT_TENANT: '@FamilyKnows:current_tenant',
  IS_LIVE: '@FamilyKnows:is_live_environment',
  LAST_ACTIVITY: '@FamilyKnows:last_activity',
  SESSION_TIMEOUT_MINUTES: '@FamilyKnows:session_timeout',
};

// API Configuration
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://contractnest-api-production.up.railway.app';
const X_PRODUCT = 'familyknows';

// Default timeout
const DEFAULT_TIMEOUT = 30000;

// Request interceptor type
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = API_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'x-product': X_PRODUCT,
    };
  }

  // Get auth headers from storage
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...this.defaultHeaders };

    try {
      const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const tenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }

      const isLive = await AsyncStorage.getItem(STORAGE_KEYS.IS_LIVE);
      headers['x-environment'] = isLive === 'true' ? 'live' : 'test';
    } catch (error) {
      console.error('Error getting auth headers:', error);
    }

    return headers;
  }

  // Update last activity timestamp
  private async updateLastActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  // Generic request method
  private async request<T>(endpoint: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    // Merge custom headers
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update activity on successful requests
      if (response.ok) {
        await this.updateLastActivity();
      }

      // Handle 401 - Unauthorized
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          return this.request<T>(endpoint, config);
        }
        // Refresh failed, clear auth
        await this.clearAuth();
        throw new Error('Session expired. Please login again.');
      }

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        const errorMessage = (data as any)?.message || (data as any)?.error || 'Request failed';
        throw new Error(errorMessage);
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  // Refresh token
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
      if (data.refresh_token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Clear auth data
  async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.TENANT_ID,
        STORAGE_KEYS.CURRENT_TENANT,
        STORAGE_KEYS.LAST_ACTIVITY,
      ]);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Export singleton instance
export const api = new ApiService();

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    SIGNOUT: '/api/auth/signout',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    USER: '/api/auth/user',
    RESET_PASSWORD: '/api/auth/reset-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
    VERIFY_PASSWORD: '/api/auth/verify-password',
    COMPLETE_REGISTRATION: '/api/auth/complete-registration',
    UPDATE_PREFERENCES: '/api/auth/preferences',
  },
  TENANTS: {
    LIST: '/api/tenants',
    CREATE: '/api/tenants',
    GET: (id: string) => `/api/tenants/${id}`,
  },
  ONBOARDING: {
    STATUS: '/api/onboarding/status',
    INITIALIZE: '/api/onboarding/initialize',
    COMPLETE: '/api/onboarding/complete',
    STEP_COMPLETE: '/api/onboarding/step/complete',
  },
  USER: {
    PROFILE: '/api/users/me',
    UPDATE: '/api/users/me',
  },
  OTP: {
    SEND: '/api/otp/send',
    VERIFY: '/api/otp/verify',
  },
};

export default api;
