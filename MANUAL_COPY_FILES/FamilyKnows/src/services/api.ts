// src/services/api.ts
// API Service with x-product header for FamilyKnows
// UPDATED: Added in-memory token caching to fix race condition with AsyncStorage

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

// Auth endpoints that should NOT trigger session refresh logic on 401
// These endpoints return 401 for invalid credentials, not expired sessions
const AUTH_ENDPOINTS = [
  '/api/FKauth/login',
  '/api/FKauth/register',
  '/api/FKauth/reset-password',
  '/api/FKauth/verify-password',
];

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

  // IN-MEMORY CACHE - Fixes race condition with AsyncStorage
  // These are set immediately after login/register, before AsyncStorage completes
  private cachedAuthToken: string | null = null;
  private cachedTenantId: string | null = null;

  constructor() {
    this.baseUrl = API_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'x-product': X_PRODUCT,
    };
  }

  // NEW: Set auth token immediately (called from AuthContext after login/register)
  setAuthToken(token: string): void {
    console.log('api.setAuthToken: Setting token in memory');
    this.cachedAuthToken = token;
  }

  // NEW: Set tenant ID immediately (called from AuthContext after login/register)
  setTenantId(tenantId: string): void {
    console.log('api.setTenantId: Setting tenant ID in memory:', tenantId);
    this.cachedTenantId = tenantId;
  }

  // NEW: Get current auth state (for debugging)
  getAuthState(): { hasToken: boolean; hasTenant: boolean } {
    return {
      hasToken: !!this.cachedAuthToken,
      hasTenant: !!this.cachedTenantId,
    };
  }

  // Check if endpoint is an auth endpoint (should not trigger session refresh)
  private isAuthEndpoint(endpoint: string): boolean {
    return AUTH_ENDPOINTS.some(authEndpoint => endpoint.startsWith(authEndpoint));
  }

  // Get auth headers - NOW CHECKS IN-MEMORY CACHE FIRST
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...this.defaultHeaders };

    try {
      // PRIORITY 1: Use in-memory cached token (instant, no async delay)
      let authToken = this.cachedAuthToken;
      let tenantId = this.cachedTenantId;

      // PRIORITY 2: Fall back to AsyncStorage if in-memory is empty
      if (!authToken) {
        authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (authToken) {
          this.cachedAuthToken = authToken; // Cache it for next time
        }
      }

      if (!tenantId) {
        tenantId = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_ID);
        if (tenantId) {
          this.cachedTenantId = tenantId; // Cache it for next time
        }
      }

      console.log('=== AUTH HEADERS DEBUG ===');
      console.log('Auth token present:', !!authToken, authToken ? `(${authToken.substring(0, 20)}...)` : '');
      console.log('Tenant ID:', tenantId);
      console.log('Source: ', this.cachedAuthToken ? 'in-memory cache' : 'AsyncStorage');

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        console.warn('WARNING: No auth token found!');
      }

      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      } else {
        console.warn('WARNING: No tenant ID found!');
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
  private async request<T>(endpoint: string, config: RequestConfig, isRetry: boolean = false): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    // Merge custom headers
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    // Debug logging
    console.log('=== API REQUEST DEBUG ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Full URL:', url);
    console.log('Method:', config.method);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    if (config.body) {
      console.log('Body:', JSON.stringify(config.body, null, 2));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || DEFAULT_TIMEOUT);

    try {
      console.log('Initiating fetch...');
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });
      console.log('Fetch completed - Status:', response.status);

      clearTimeout(timeoutId);

      // Update activity on successful requests
      if (response.ok) {
        await this.updateLastActivity();
      }

      // Parse response body FIRST before handling status codes
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      // For auth endpoints (login, register, etc.), return the actual error message
      // Don't apply session refresh logic - 401 means invalid credentials
      if (this.isAuthEndpoint(endpoint)) {
        if (!response.ok) {
          const errorMessage = (data as any)?.message || (data as any)?.error || 'Request failed';
          throw new Error(errorMessage);
        }
        return {
          data,
          status: response.status,
          ok: response.ok,
        };
      }

      // For non-auth endpoints, handle 401 with session refresh logic
      if (response.status === 401 && !isRetry) {
        console.log('Got 401, checking if token is fresh...');

        // Check if token was just created (within last 30 seconds)
        const lastActivity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
        const tokenAge = lastActivity ? Date.now() - parseInt(lastActivity, 10) : Infinity;

        if (tokenAge < 30000) {
          // Token is fresh - don't clear auth, just throw error
          console.log('Token is fresh (age: ' + tokenAge + 'ms), not clearing auth');
          // Return the actual error from the server if available
          const errorMessage = (data as any)?.error || (data as any)?.message || 'Service temporarily unavailable. Please try again.';
          throw new Error(errorMessage);
        }

        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request (mark as retry to prevent infinite loop)
          return this.request<T>(endpoint, config, true);
        }
        // Refresh failed, clear auth
        await this.clearAuth();
        throw new Error('Session expired. Please login again.');
      }

      // If still 401 after retry, clear auth and throw
      if (response.status === 401 && isRetry) {
        await this.clearAuth();
        throw new Error('Session expired. Please login again.');
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
      console.log('=== API REQUEST ERROR ===');
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      console.log('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // Provide more helpful error message for network failures
      if (error.message === 'Network request failed') {
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
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

      const response = await fetch(`${this.baseUrl}/api/FKauth/refresh-token`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      // Update both AsyncStorage AND in-memory cache
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
      this.cachedAuthToken = data.access_token; // Update cache too!

      if (data.refresh_token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Clear auth data - NOW ALSO CLEARS IN-MEMORY CACHE
  async clearAuth(): Promise<void> {
    console.log('api.clearAuth: Clearing all auth data');

    // Clear in-memory cache first (immediate)
    this.cachedAuthToken = null;
    this.cachedTenantId = null;

    // Then clear AsyncStorage
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
// FamilyKnows uses FKauth Edge Function for authentication
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/FKauth/login',
    REGISTER: '/api/FKauth/register',
    SIGNOUT: '/api/FKauth/signout',
    REFRESH_TOKEN: '/api/FKauth/refresh-token',
    USER: '/api/FKauth/user',
    RESET_PASSWORD: '/api/FKauth/reset-password',
    CHANGE_PASSWORD: '/api/FKauth/change-password',
    VERIFY_PASSWORD: '/api/FKauth/verify-password',
    COMPLETE_REGISTRATION: '/api/FKauth/complete-registration',
    UPDATE_PREFERENCES: '/api/FKauth/preferences',
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
