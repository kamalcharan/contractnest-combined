// src/services/apiClient.ts
// Thin fetch wrapper matching the web app's axios setup:
// Authorization bearer, x-tenant-id, x-product, x-environment on every request.
import { API_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError } from '../types/api';
import { getSession, clearSession } from './session';

// Endpoints that must not carry auth headers (mirrors web api.ts public list)
const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-with-invitation',
  '/api/auth/reset-password',
  '/api/users/invitations/validate',
  '/api/users/invitations/accept',
  '/api/system/health',
  '/health',
];

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function parseBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const isPublic = PUBLIC_ENDPOINTS.some((p) => path.startsWith(p));
  const session = getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-product': 'contractnest',
    'x-environment': 'live',
  };
  if (!isPublic && session) {
    headers.Authorization = `Bearer ${session.accessToken}`;
    if (session.tenant?.id) headers['x-tenant-id'] = session.tenant.id;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out. Check your connection and try again.', 0, 'TIMEOUT');
    }
    throw new ApiError('Network error. Check your connection and try again.', 0, 'NETWORK');
  }
  clearTimeout(timer);

  const data = await parseBody(response);

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      `Request failed (${response.status})`;
    const code = data && typeof data === 'object' ? data.code : undefined;

    // Expired/invalid token on a protected endpoint → force sign-out (same as web)
    if (response.status === 401 && !isPublic && !path.startsWith('/api/auth/')) {
      await clearSession();
      onUnauthorized?.();
    }
    throw new ApiError(String(message), response.status, code, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
};
