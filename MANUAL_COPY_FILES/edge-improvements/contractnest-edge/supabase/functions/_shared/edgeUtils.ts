// supabase/functions/_shared/edgeUtils.ts
// Shared utilities for Edge Functions
// Includes: Signature validation, Idempotency, Pagination, Response helpers

// ============================================================================
// TYPES
// ============================================================================

export interface EdgeContext {
  operationId: string;
  startTime: number;
  tenantId: string;
  isAdmin: boolean;
  isLive: boolean;
  idempotencyKey?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface IdempotencyResult {
  found: boolean;
  response?: Response;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;
export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
export const IDEMPOTENCY_TTL_HOURS = 24;

// ============================================================================
// CORS HEADERS
// ============================================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-internal-signature, x-timestamp, x-is-admin, x-environment, x-idempotency-key, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
};

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

// In-memory replay protection cache
const replayCache = new Set<string>();
const REPLAY_CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Start cleanup interval
let cleanupStarted = false;
function startReplayCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    replayCache.clear();
    console.log('[edgeUtils] Replay cache cleared');
  }, REPLAY_CACHE_CLEANUP_INTERVAL);
}

/**
 * Verify HMAC signature from API with replay protection
 */
export async function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
  enableReplayProtection: boolean = true
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Start cleanup if not started
    if (enableReplayProtection) {
      startReplayCleanup();
    }

    // Check timestamp is within tolerance
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > SIGNATURE_TOLERANCE_MS) {
      return {
        isValid: false,
        error: `Request timestamp expired. Diff: ${timeDiff}ms, Tolerance: ${SIGNATURE_TOLERANCE_MS}ms`
      };
    }

    // Check for replay attack
    if (enableReplayProtection) {
      const requestId = `${signature}-${timestamp}`;
      if (replayCache.has(requestId)) {
        return {
          isValid: false,
          error: 'Potential replay attack detected - duplicate request signature'
        };
      }
      replayCache.add(requestId);
    }

    // Generate expected signature
    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    if (signature !== expectedSignature) {
      return {
        isValid: false,
        error: 'Invalid signature'
      };
    }

    return { isValid: true };
  } catch (error: any) {
    console.error('[edgeUtils] Signature verification error:', error);
    return {
      isValid: false,
      error: `Signature verification failed: ${error.message}`
    };
  }
}

/**
 * Validate request signature and return error response if invalid
 */
export async function validateRequestSignature(
  req: Request,
  requestBody: string,
  secret: string,
  operationId: string
): Promise<Response | null> {
  const signature = req.headers.get('x-internal-signature');
  const timestamp = req.headers.get('x-timestamp');

  // Check headers exist
  if (!signature || !timestamp) {
    return createErrorResponse(
      'Direct access to edge functions is not allowed. Requests must come through the API layer.',
      'FORBIDDEN',
      403,
      operationId
    );
  }

  // Verify signature
  const result = await verifySignature(requestBody, signature, timestamp, secret);
  if (!result.isValid) {
    console.warn(`[edgeUtils] Signature validation failed: ${result.error}`);
    return createErrorResponse(
      result.error || 'Invalid internal signature',
      'INVALID_SIGNATURE',
      403,
      operationId
    );
  }

  return null; // Valid signature
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Parse pagination parameters from URL search params
 * Backward compatible - if no params, returns null (use old behavior)
 */
export function parsePaginationParams(params: URLSearchParams): PaginationParams | null {
  const pageParam = params.get('page');
  const limitParam = params.get('limit');

  // If neither param provided, return null for backward compatibility
  if (!pageParam && !limitParam) {
    return null;
  }

  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = Math.min(Math.max(1, parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10)), MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Apply pagination to Supabase query
 */
export function applyPagination(query: any, pagination: PaginationParams | null, maxUnpaginated: number = MAX_PAGE_SIZE): any {
  if (pagination) {
    return query.range(pagination.offset, pagination.offset + pagination.limit - 1);
  }
  // Even without pagination, limit results
  return query.limit(maxUnpaginated);
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationParams | null,
  total: number
): { items: T[]; pagination?: { page: number; limit: number; total: number; has_more: boolean } } {
  if (pagination) {
    return {
      items: data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        has_more: pagination.offset + pagination.limit < total
      }
    };
  }
  return { items: data };
}

// ============================================================================
// IDEMPOTENCY
// ============================================================================

/**
 * Check for existing idempotent response
 */
export async function checkIdempotency(
  supabase: any,
  idempotencyKey: string | null,
  tenantId: string,
  endpoint: string,
  operationId: string,
  startTime: number
): Promise<IdempotencyResult> {
  if (!idempotencyKey) {
    return { found: false };
  }

  try {
    const { data, error } = await supabase.rpc('check_idempotency', {
      p_idempotency_key: idempotencyKey,
      p_tenant_id: tenantId,
      p_endpoint: endpoint
    });

    if (error) {
      console.warn('[edgeUtils] Idempotency check error:', error);
      return { found: false };
    }

    if (data && data.length > 0 && data[0].found) {
      console.log(`[edgeUtils] Idempotency hit for key: ${idempotencyKey}`);
      // Return cached response
      const cachedResponse = new Response(
        JSON.stringify({
          ...data[0].response_body,
          metadata: {
            ...data[0].response_body.metadata,
            request_id: operationId,
            duration_ms: Date.now() - startTime,
            idempotency_hit: true
          }
        }),
        {
          status: data[0].response_status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      return { found: true, response: cachedResponse };
    }

    return { found: false };
  } catch (error) {
    console.warn('[edgeUtils] Idempotency check exception:', error);
    return { found: false };
  }
}

/**
 * Store idempotent response
 */
export async function storeIdempotency(
  supabase: any,
  idempotencyKey: string | null,
  tenantId: string,
  endpoint: string,
  method: string,
  requestBody: string,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  try {
    // Generate request hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(requestBody));
    const requestHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await supabase.rpc('store_idempotency', {
      p_idempotency_key: idempotencyKey,
      p_tenant_id: tenantId,
      p_endpoint: endpoint,
      p_method: method,
      p_request_hash: requestHash,
      p_response_status: responseStatus,
      p_response_body: responseBody,
      p_ttl_hours: IDEMPOTENCY_TTL_HOURS
    });

    console.log(`[edgeUtils] Stored idempotency for key: ${idempotencyKey}`);
  } catch (error) {
    console.warn('[edgeUtils] Failed to store idempotency:', error);
    // Don't fail the request if idempotency storage fails
  }
}

// ============================================================================
// OPTIMISTIC LOCKING
// ============================================================================

/**
 * Check for version conflict after update
 * Returns error response if no rows were updated (version mismatch)
 */
export function checkVersionConflict(
  data: any,
  error: any,
  resourceName: string,
  operationId: string
): Response | null {
  if (error) {
    return null; // Let caller handle DB errors
  }

  if (!data) {
    return createErrorResponse(
      `${resourceName} was modified by another user. Please refresh and try again.`,
      'VERSION_CONFLICT',
      409,
      operationId
    );
  }

  return null; // No conflict
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create success response
 */
export function createSuccessResponse(
  data: any,
  operationId: string,
  startTime: number,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      metadata: {
        request_id: operationId,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number,
  operationId: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
      metadata: {
        request_id: operationId,
        timestamp: new Date().toISOString()
      }
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generate operation ID
 */
export function generateOperationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// REQUEST CONTEXT EXTRACTOR
// ============================================================================

/**
 * Extract common context from request headers
 */
export function extractRequestContext(req: Request, operationId: string, startTime: number): EdgeContext | null {
  const tenantId = req.headers.get('x-tenant-id');
  const isAdminHeader = req.headers.get('x-is-admin');
  const environmentHeader = req.headers.get('x-environment') || 'live';
  const idempotencyKey = req.headers.get('x-idempotency-key') || undefined;

  if (!tenantId) {
    return null;
  }

  return {
    operationId,
    startTime,
    tenantId,
    isAdmin: isAdminHeader === 'true',
    isLive: environmentHeader === 'live',
    idempotencyKey
  };
}
