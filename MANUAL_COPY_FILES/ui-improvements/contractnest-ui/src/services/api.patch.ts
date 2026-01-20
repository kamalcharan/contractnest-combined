// ============================================================================
// API.TS PATCH - Add these functions after putWithIdempotency
// Insert this code at line ~391 (after putWithIdempotency function)
// ============================================================================

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
export const getVersionConflictDetails = (error: any): { message: string } | null => {
  if (!isVersionConflictError(error)) return null;
  return {
    message: error?.response?.data?.error?.message ||
      'This item was modified by another user. Please refresh and try again.'
  };
};
