// ============================================
// STANDARD IDEMPOTENCY FRAMEWORK
// ============================================
// Table: t_idempotency_cache
// TTL: Configurable (default 15 minutes)
// Usage: Import and use in all Edge functions for POST/PUT/PATCH/DELETE operations
//
// This framework provides:
// 1. checkIdempotency() - Check if request was already processed
// 2. saveIdempotency() - Save response for future duplicate requests
// 3. clearIdempotency() - Manual cleanup if needed
// 4. IdempotencyResult interface for type safety
//
// Table Schema (t_idempotency_cache):
// - idempotency_key: VARCHAR(255) - Unique key from client
// - tenant_id: UUID - Tenant context
// - response_data: JSONB - Cached response
// - created_at: TIMESTAMPTZ - When created
// - expires_at: TIMESTAMPTZ - When to expire
// - UNIQUE(idempotency_key, tenant_id)
// ============================================

export interface IdempotencyResult {
  exists: boolean;
  response?: any;
  wasExpired?: boolean;
}

export interface IdempotencyOptions {
  ttlMinutes?: number;  // Default: 15 minutes
  tableName?: string;   // Default: 't_idempotency_cache'
}

const DEFAULT_TTL_MINUTES = 15;
const DEFAULT_TABLE = 't_idempotency_cache';

/**
 * Check if an idempotency key already exists and has a cached response
 *
 * @param supabase - Supabase client instance
 * @param idempotencyKey - The idempotency key from the client (x-idempotency-key header)
 * @param tenantId - The tenant ID for multi-tenant isolation
 * @param options - Optional configuration
 * @returns IdempotencyResult with exists flag and cached response if available
 *
 * @example
 * const idempotencyKey = req.headers.get('x-idempotency-key');
 * if (idempotencyKey) {
 *   const result = await checkIdempotency(supabase, idempotencyKey, tenantId);
 *   if (result.exists) {
 *     return new Response(JSON.stringify(result.response), { status: 200 });
 *   }
 * }
 */
export async function checkIdempotency(
  supabase: any,
  idempotencyKey: string,
  tenantId: string,
  options: IdempotencyOptions = {}
): Promise<IdempotencyResult> {
  // Early return if missing required params
  if (!idempotencyKey || !tenantId) {
    return { exists: false };
  }

  const tableName = options.tableName || DEFAULT_TABLE;

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('response_data, expires_at')
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    // Check if entry is still valid (using expires_at field)
    const expiresAt = new Date(data.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Expired - delete the stale entry and return not exists
      await supabase
        .from(tableName)
        .delete()
        .eq('idempotency_key', idempotencyKey)
        .eq('tenant_id', tenantId);

      console.log(`[Idempotency] Key expired and cleaned: ${idempotencyKey.substring(0, 8)}...`);
      return { exists: false, wasExpired: true };
    }

    console.log(`[Idempotency] Cache HIT for key: ${idempotencyKey.substring(0, 8)}...`);
    return { exists: true, response: data.response_data };

  } catch (error: any) {
    // Table might not exist yet - fail silently and allow request to proceed
    console.warn('[Idempotency] Check skipped (table may not exist):', error.message);
    return { exists: false };
  }
}

/**
 * Save idempotency response for future duplicate requests
 *
 * @param supabase - Supabase client instance
 * @param idempotencyKey - The idempotency key from the client
 * @param tenantId - The tenant ID for multi-tenant isolation
 * @param responseData - The response data to cache
 * @param options - Optional configuration including TTL
 *
 * @example
 * // After successful operation
 * if (idempotencyKey) {
 *   await saveIdempotency(supabase, idempotencyKey, tenantId, responseData);
 * }
 */
export async function saveIdempotency(
  supabase: any,
  idempotencyKey: string,
  tenantId: string,
  responseData: any,
  options: IdempotencyOptions = {}
): Promise<void> {
  // Early return if missing required params
  if (!idempotencyKey || !tenantId) {
    return;
  }

  const tableName = options.tableName || DEFAULT_TABLE;
  const ttlMinutes = options.ttlMinutes || DEFAULT_TTL_MINUTES;

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

    await supabase
      .from(tableName)
      .upsert({
        idempotency_key: idempotencyKey,
        tenant_id: tenantId,
        response_data: responseData,
        created_at: now.toISOString(),
        expires_at: expiresAt
      }, {
        onConflict: 'idempotency_key,tenant_id'
      });

    console.log(`[Idempotency] Saved key: ${idempotencyKey.substring(0, 8)}... (TTL: ${ttlMinutes}min)`);

  } catch (error: any) {
    // Table might not exist yet - fail silently
    console.warn('[Idempotency] Save skipped (table may not exist):', error.message);
  }
}

/**
 * Manually clear an idempotency key (useful for retry scenarios)
 *
 * @param supabase - Supabase client instance
 * @param idempotencyKey - The idempotency key to clear
 * @param tenantId - The tenant ID
 * @param options - Optional configuration
 */
export async function clearIdempotency(
  supabase: any,
  idempotencyKey: string,
  tenantId: string,
  options: IdempotencyOptions = {}
): Promise<void> {
  if (!idempotencyKey || !tenantId) {
    return;
  }

  const tableName = options.tableName || DEFAULT_TABLE;

  try {
    await supabase
      .from(tableName)
      .delete()
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', tenantId);

    console.log(`[Idempotency] Cleared key: ${idempotencyKey.substring(0, 8)}...`);

  } catch (error: any) {
    console.warn('[Idempotency] Clear failed:', error.message);
  }
}

/**
 * Helper to extract idempotency key from request headers
 * Supports both 'x-idempotency-key' and 'idempotency-key' headers
 *
 * @param req - The incoming Request object
 * @returns The idempotency key or null if not provided
 */
export function getIdempotencyKeyFromRequest(req: Request): string | null {
  return req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key');
}

/**
 * Standard CORS headers that include idempotency-key
 * Use this to ensure consistent CORS across all Edge functions
 */
export const idempotencyCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-user-id, x-product, x-idempotency-key, idempotency-key',
};
