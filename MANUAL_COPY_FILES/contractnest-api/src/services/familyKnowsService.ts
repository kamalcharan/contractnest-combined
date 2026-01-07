// backend/src/services/familyKnowsService.ts
// Service layer for FamilyKnows Edge Function proxying
// Proxies requests to FKauth and FKonboarding Supabase Edge Functions

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { captureException } from '../utils/sentry';

// ============================================
// Base Configuration
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || '';

const FKAUTH_BASE = `${SUPABASE_URL}/functions/v1/FKauth`;
const FKONBOARDING_BASE = `${SUPABASE_URL}/functions/v1/FKonboarding`;

// Headers to forward from original request
const FORWARDED_HEADERS = [
  'authorization',
  'x-tenant-id',
  'x-environment',
  'x-product',
  'x-user-id',
  'content-type',
];

interface ProxyRequestConfig {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Build headers for Supabase Edge Function call
 */
const buildHeaders = (originalHeaders: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };

  // Forward relevant headers from original request
  for (const headerName of FORWARDED_HEADERS) {
    const value = originalHeaders[headerName.toLowerCase()];
    if (value) {
      headers[headerName] = value;
    }
  }

  // Ensure x-product is set for FamilyKnows
  if (!headers['x-product']) {
    headers['x-product'] = 'familyknows';
  }

  return headers;
};

/**
 * Make proxy request to Supabase Edge Function
 */
const proxyRequest = async (baseUrl: string, config: ProxyRequestConfig): Promise<any> => {
  const url = config.path ? `${baseUrl}${config.path}` : baseUrl;

  // Build query string if present
  const queryString = config.query
    ? '?' + new URLSearchParams(config.query).toString()
    : '';

  const axiosConfig: AxiosRequestConfig = {
    method: config.method,
    url: `${url}${queryString}`,
    headers: buildHeaders(config.headers),
    data: config.body,
    timeout: 30000,
    validateStatus: () => true, // Don't throw on non-2xx status
  };

  console.log(`[FamilyKnows Proxy] ${config.method} ${axiosConfig.url}`);

  try {
    const response = await axios(axiosConfig);

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    console.error('[FamilyKnows Proxy] Request failed:', error);
    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        source: 'familyKnowsService',
        action: 'proxyRequest',
        url: axiosConfig.url,
      }
    });
    throw error;
  }
};

// ============================================
// Service Implementation
// ============================================
export const familyKnowsService = {

  // ============================================
  // FKauth Proxy Methods
  // ============================================

  /**
   * Proxy request to FKauth Edge Function
   */
  async proxyFKauth(config: ProxyRequestConfig): Promise<any> {
    return proxyRequest(FKAUTH_BASE, config);
  },

  /**
   * Login via FKauth
   */
  async login(email: string, password: string, headers: Record<string, string>): Promise<any> {
    return this.proxyFKauth({
      method: 'POST',
      path: '/login',
      headers,
      body: { email, password },
    });
  },

  /**
   * Register via FKauth
   */
  async register(data: any, headers: Record<string, string>): Promise<any> {
    return this.proxyFKauth({
      method: 'POST',
      path: '/register',
      headers,
      body: data,
    });
  },

  /**
   * Signout via FKauth
   */
  async signout(headers: Record<string, string>): Promise<any> {
    return this.proxyFKauth({
      method: 'POST',
      path: '/signout',
      headers,
    });
  },

  /**
   * Get user info via FKauth
   */
  async getUser(headers: Record<string, string>): Promise<any> {
    return this.proxyFKauth({
      method: 'GET',
      path: '/user',
      headers,
    });
  },

  /**
   * Refresh token via FKauth
   */
  async refreshToken(refreshToken: string, headers: Record<string, string>): Promise<any> {
    return this.proxyFKauth({
      method: 'POST',
      path: '/refresh-token',
      headers,
      body: { refresh_token: refreshToken },
    });
  },

  // ============================================
  // FKonboarding Proxy Methods
  // ============================================

  /**
   * Proxy request to FKonboarding Edge Function
   */
  async proxyFKonboarding(config: ProxyRequestConfig): Promise<any> {
    return proxyRequest(FKONBOARDING_BASE, config);
  },

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'GET',
      path: '/status',
      headers,
    });
  },

  /**
   * Get onboarding config
   */
  async getOnboardingConfig(headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'GET',
      path: '/config',
      headers,
    });
  },

  /**
   * Initialize onboarding
   */
  async initializeOnboarding(data: any, headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'POST',
      path: '/initialize',
      headers,
      body: data,
    });
  },

  /**
   * Complete onboarding step
   */
  async completeStep(data: any, headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'POST',
      path: '/complete-step',
      headers,
      body: data,
    });
  },

  /**
   * Skip onboarding step
   */
  async skipStep(stepId: string, headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'PUT',
      path: '/skip-step',
      headers,
      body: { step_id: stepId },
    });
  },

  /**
   * Complete all onboarding
   */
  async completeOnboarding(headers: Record<string, string>): Promise<any> {
    return this.proxyFKonboarding({
      method: 'POST',
      path: '/complete',
      headers,
    });
  },
};

export default familyKnowsService;
