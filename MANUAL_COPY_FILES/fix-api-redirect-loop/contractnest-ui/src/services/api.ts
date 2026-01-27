//src/services/api.ts - UPDATED with Dynamic Headers Support
// Adds: x-product dynamic header, x-idempotency-key support, patchWithIdempotency, version conflict handling

import axios, { AxiosRequestConfig } from 'axios';

// Use Vite's import.meta.env directly for build-time injection
const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';

// Debug logging to see what's happening
console.log('API Configuration:', {
  'import.meta.env.VITE_API_URL': import.meta.env.VITE_API_URL,
  'Final API_URL': API_URL,
  'Is using fallback': !import.meta.env.VITE_API_URL
});

// Debug logging (only in development when enabled)
if (import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.VITE_LOG_API_CALLS === 'true') {
  console.log(`[API] Configured with base URL: ${API_URL}`);
}

// ===== API Health Detection Constants =====
const API_HEALTH_CHECK_ENABLED = import.meta.env.VITE_ENABLE_API_HEALTH_CHECK === 'true';
const API_DOWN_SESSION_KEY = 'api_server_down_detected';
const API_DOWN_REDIRECT_KEY = 'api_down_redirect_done';

console.log('API Health Check Status:', {
  enabled: API_HEALTH_CHECK_ENABLED,
  env_var: import.meta.env.VITE_ENABLE_API_HEALTH_CHECK
});

// ===== NEW: Product Context Storage Key =====
const PRODUCT_CONTEXT_KEY = 'current_product_context';
const DEFAULT_PRODUCT = 'contractnest';

// ===== NEW: Get/Set Current Product Context =====
export const getCurrentProduct = (): string => {
  // Check sessionStorage first (per-session context)
  const sessionProduct = sessionStorage.getItem(PRODUCT_CONTEXT_KEY);
  if (sessionProduct) return sessionProduct;

  // Check localStorage (persistent context)
  const storedProduct = localStorage.getItem(PRODUCT_CONTEXT_KEY);
  if (storedProduct) return storedProduct;

  // Detect from URL path
  const path = window.location.pathname.toLowerCase();
  if (path.includes('familyknows')) return 'familyknows';

  return DEFAULT_PRODUCT;
};

export const setCurrentProduct = (product: string, persist: boolean = false): void => {
  sessionStorage.setItem(PRODUCT_CONTEXT_KEY, product);
  if (persist) {
    localStorage.setItem(PRODUCT_CONTEXT_KEY, product);
  }
  console.log(`[API] Product context set to: ${product}`);
};

export const clearProductContext = (): void => {
  sessionStorage.removeItem(PRODUCT_CONTEXT_KEY);
  localStorage.removeItem(PRODUCT_CONTEXT_KEY);
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    // x-product is now set dynamically in the interceptor
  },
  timeout: 30000, // 30 seconds
});

// Helper function to get current environment from storage
const getCurrentEnvironment = (): 'live' | 'test' => {
  const isLive = localStorage.getItem('is_live_environment');
  if (isLive === null || isLive === 'true') {
    return 'live';
  }
  return 'test';
};

// ===== API Health Detection Helper Functions =====
const isApiServerDown = (error: any): boolean => {
  return (
    !error.response &&
    (error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network') ||
      error.message?.includes('fetch'))
  );
};

const handleApiServerDown = (error: any) => {
  sessionStorage.setItem(API_DOWN_SESSION_KEY, 'true');
  sessionStorage.setItem(API_DOWN_REDIRECT_KEY, 'true');
  sessionStorage.setItem('api_down_timestamp', new Date().toISOString());
  sessionStorage.setItem('api_down_error', JSON.stringify({
    message: error.message,
    code: error.code,
    url: error.config?.url
  }));

  console.log('[API] API Server Down detected - error logged but NOT redirecting (redirect disabled to prevent loops)');

  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/misc/api-server-down') {
    sessionStorage.setItem('api_down_return_path', currentPath);
  }

  // DISABLED: window.location.href redirects cause infinite loops when CORS fails
  // The actual error will be displayed in the component that made the request
  // window.location.href = '/misc/api-server-down';
};

const shouldRedirectToApiDown = (): boolean => {
  if (!API_HEALTH_CHECK_ENABLED) return false;
  if (sessionStorage.getItem(API_DOWN_REDIRECT_KEY) === 'true') return false;
  if (window.location.pathname === '/misc/api-server-down') return false;
  return true;
};

// Request interceptor to add auth token, tenant ID, session ID, environment, and product headers
api.interceptors.request.use(
  (config) => {
    // Define public endpoints that don't need authentication
    const publicEndpoints = [
      '/api/users/invitations/validate',
      '/api/users/invitations/accept',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/register-with-invitation',
      '/api/auth/reset-password',
      '/api/system/health',
      '/api/system/maintenance/status',
      '/health'
    ];

    // Check if current request is to a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      config.url?.includes(endpoint)
    );

    // Debug logging for API calls
    if (import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.VITE_LOG_API_CALLS === 'true') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        isPublicEndpoint,
        headers: config.headers
      });
    }

    // ===== NEW: Set x-product header dynamically =====
    // Allow per-request override via config.headers, otherwise use context
    if (!config.headers['x-product']) {
      config.headers['x-product'] = getCurrentProduct();
    }

    // Only add auth headers for non-public endpoints
    if (!isPublicEndpoint) {
      // Get auth token from storage
      const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }

      // Get tenant ID from storage
      const tenantId = localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id');
      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      }

      // Add session ID for tracking
      const sessionId = sessionStorage.getItem('session_id');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }

      // Add environment header
      const currentEnvironment = getCurrentEnvironment();
      config.headers['x-environment'] = currentEnvironment;

      // Debug log environment header
      if (import.meta.env.VITE_DEBUG_MODE === 'true') {
        console.log(`[API] Headers set - environment: ${currentEnvironment}, product: ${config.headers['x-product']}`);
      }
    }

    return config;
  },
  (error) => {
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.error('[API] Request error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor to handle maintenance mode, session conflicts, API down, and errors
api.interceptors.response.use(
  (response) => {
    // Debug logging for successful responses
    if (import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.VITE_LOG_API_CALLS === 'true') {
      console.log(`[API] Response from ${response.config.url}:`, {
        status: response.status,
        data: response.data,
        environment: response.config.headers['x-environment']
      });
    }

    // Clear API down flags on successful response
    if (API_HEALTH_CHECK_ENABLED) {
      const wasDown = sessionStorage.getItem(API_DOWN_SESSION_KEY) === 'true';
      if (wasDown) {
        console.log('[API] API Server recovered - clearing down flags');
      }

      sessionStorage.removeItem(API_DOWN_SESSION_KEY);
      sessionStorage.removeItem(API_DOWN_REDIRECT_KEY);
      sessionStorage.removeItem('api_down_timestamp');
      sessionStorage.removeItem('api_down_error');
    }

    // Check for maintenance mode header
    if (response.headers['x-maintenance-mode'] === 'true') {
      const maintenanceInfo = {
        isInMaintenance: true,
        estimatedEndTime: response.headers['x-maintenance-end-time'] || import.meta.env.VITE_MAINTENANCE_END_TIME || null,
        message: response.headers['x-maintenance-message'] || import.meta.env.VITE_MAINTENANCE_MESSAGE || 'System maintenance in progress'
      };
      sessionStorage.setItem('maintenance_info', JSON.stringify(maintenanceInfo));
      console.warn('[API] Maintenance mode detected - redirect disabled to prevent loops');
      // DISABLED: Redirect causes potential loops
      // window.location.href = '/misc/maintenance';
      return Promise.reject(new Error('System is in maintenance mode'));
    }

    // Check for session conflict header
    if (response.headers['x-session-conflict'] === 'true') {
      sessionStorage.setItem('session_conflict', 'true');
      console.warn('[API] Session conflict detected - redirect disabled to prevent loops');
      // DISABLED: Redirect causes potential loops
      // window.location.href = '/misc/session-conflict';
      return Promise.reject(new Error('Session conflict detected'));
    }

    return response;
  },
  (error) => {
    // Debug logging for errors
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.error('[API] Response error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        environment: error.config?.headers?.['x-environment']
      });
    }

    // API Server Down Detection
    if (API_HEALTH_CHECK_ENABLED && isApiServerDown(error) && shouldRedirectToApiDown()) {
      handleApiServerDown(error);
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
      const isAuthPath = error.config?.url?.includes('/auth/user') ||
        error.config?.url?.includes('/tenants') ||
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register');

      if (isAuthPath) {
        return Promise.reject(error);
      }

      if (!API_HEALTH_CHECK_ENABLED) {
        sessionStorage.setItem('server_error', JSON.stringify({
          type: 'server_unavailable',
          message: 'Server is currently unavailable. Please contact system administrator.',
          timestamp: new Date().toISOString()
        }));
        console.warn('[API] Server unavailable - redirect disabled to prevent loops');
        // DISABLED: Redirect causes potential loops
        // window.location.href = '/misc/error';
      }

      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable
    if (error.response?.status === 503) {
      const maintenanceInfo = {
        isInMaintenance: true,
        estimatedEndTime: error.response.headers['x-maintenance-end-time'] ||
          import.meta.env.VITE_MAINTENANCE_END_TIME || null,
        message: error.response.data?.message ||
          import.meta.env.VITE_MAINTENANCE_MESSAGE ||
          'System maintenance in progress'
      };
      sessionStorage.setItem('maintenance_info', JSON.stringify(maintenanceInfo));
      console.warn('[API] 503 Service Unavailable - redirect disabled to prevent loops');
      // DISABLED: Redirect causes potential loops
      // window.location.href = '/misc/maintenance';
      return Promise.reject(error);
    }

    // Handle 401 with session conflict
    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_CONFLICT') {
      sessionStorage.setItem('session_conflict', 'true');
      console.warn('[API] Session conflict (401) - redirect disabled to prevent loops');
      // DISABLED: Redirect causes potential loops
      // window.location.href = '/misc/session-conflict';
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('[API] 403 Forbidden - redirect disabled to prevent loops');
      // DISABLED: Redirect causes potential loops
      // window.location.href = '/misc/unauthorized';
      return Promise.reject(error);
    }

    // Handle regular 401
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login') &&
          !currentPath.startsWith('/register') &&
          !currentPath.startsWith('/forgot-password')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('tenant_id');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('tenant_id');
          sessionStorage.removeItem('session_id');

          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

// ===== API Request Helpers with Idempotency Support =====

/**
 * Generate a UUID v4 idempotency key
 */
export const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Make a POST request with idempotency key
 */
export const postWithIdempotency = async <T = any>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const headers: Record<string, string> = {};

  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey();
  headers['x-idempotency-key'] = key;

  const response = await api.post(url, data, {
    ...config,
    headers: {
      ...config?.headers,
      ...headers
    }
  });

  return response.data;
};

/**
 * Make a PUT request with idempotency key
 */
export const putWithIdempotency = async <T = any>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const headers: Record<string, string> = {};

  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey();
  headers['x-idempotency-key'] = key;

  const response = await api.put(url, data, {
    ...config,
    headers: {
      ...config?.headers,
      ...headers
    }
  });

  return response.data;
};

/**
 * Make a PATCH request with idempotency key
 * Required for CatalogStudio update operations
 */
export const patchWithIdempotency = async <T = any>(
  url: string,
  data?: any,
  idempotencyKey?: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const headers: Record<string, string> = {};

  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey();
  headers['x-idempotency-key'] = key;

  const response = await api.patch(url, data, {
    ...config,
    headers: {
      ...config?.headers,
      ...headers
    }
  });

  return response.data;
};

// ===== Version Conflict Helpers (for Optimistic Locking) =====

/**
 * Check if error is a version conflict (409)
 */
export const isVersionConflictError = (error: any): boolean => {
  return error?.response?.status === 409 &&
    error?.response?.data?.error?.code === 'VERSION_CONFLICT';
};

/**
 * Get version conflict details from error
 */
export const getVersionConflictDetails = (error: any): { message: string; currentVersion?: number } | null => {
  if (!isVersionConflictError(error)) return null;

  const errorData = error?.response?.data?.error;
  return {
    message: errorData?.message ||
      'This item was modified by another user. Please refresh and try again.',
    currentVersion: errorData?.details?.current_version
  };
};

/**
 * Make a request with custom product header
 */
export const requestWithProduct = async <T = any>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  product: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const headers: Record<string, string> = {
    'x-product': product
  };

  const response = await api.request({
    method,
    url,
    data,
    ...config,
    headers: {
      ...config?.headers,
      ...headers
    }
  });

  return response.data;
};

// Export the instance for direct use
export default api;

// Export the API URL for components that need it
export { API_URL };

// Export environment helper
export { getCurrentEnvironment };

// Helper function to check API health
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    console.log('[API] Checking API health at:', `${API_URL}/health`);
    const response = await fetch(`${API_URL}/health`);
    console.log('[API] Health check response:', response.status);
    return response.ok;
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return false;
  }
};

// Helper to get maintenance status
export const getMaintenanceStatus = async (): Promise<any> => {
  try {
    const response = await api.get('/api/system/maintenance/status');
    return response.data;
  } catch (error) {
    return { isInMaintenance: false };
  }
};

// ===== API Health Management Functions =====

export const clearApiDownState = () => {
  sessionStorage.removeItem(API_DOWN_SESSION_KEY);
  sessionStorage.removeItem(API_DOWN_REDIRECT_KEY);
  sessionStorage.removeItem('api_down_timestamp');
  sessionStorage.removeItem('api_down_error');
  sessionStorage.removeItem('api_down_return_path');
  console.log('[API] API down state cleared manually');
};

export const isApiMarkedAsDown = (): boolean => {
  return sessionStorage.getItem(API_DOWN_SESSION_KEY) === 'true';
};

export const getApiDownInfo = () => {
  const timestamp = sessionStorage.getItem('api_down_timestamp');
  const error = sessionStorage.getItem('api_down_error');
  const returnPath = sessionStorage.getItem('api_down_return_path');

  return {
    isDown: isApiMarkedAsDown(),
    timestamp: timestamp ? new Date(timestamp) : null,
    error: error ? JSON.parse(error) : null,
    returnPath: returnPath || '/dashboard'
  };
};

export const forceApiDown = () => {
  if (import.meta.env.VITE_DEBUG_MODE === 'true') {
    sessionStorage.setItem(API_DOWN_SESSION_KEY, 'true');
    sessionStorage.setItem('api_down_timestamp', new Date().toISOString());
    console.log('[API] API forced down for testing');
  }
};
