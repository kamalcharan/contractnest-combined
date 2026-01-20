// ============================================
// STANDARD IN-MEMORY CACHE FRAMEWORK
// ============================================
// TTL: Configurable (default 15 seconds)
// Usage: Import and use in all Edge functions for GET operations
//
// This framework provides:
// 1. getFromCache() - Get cached data if valid
// 2. setCache() - Store data with TTL
// 3. invalidateCache() - Remove specific cache entries
// 4. invalidateCacheByPrefix() - Remove multiple entries by prefix
// 5. clearAllCache() - Nuclear option - clear everything
//
// IMPORTANT: This cache is per-instance. In serverless environments,
// each instance has its own cache. This is acceptable for short TTLs.
// ============================================

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export interface CacheOptions {
  ttlSeconds?: number;  // Default: 15 seconds
}

const DEFAULT_TTL_SECONDS = 15;

// Global cache store (per Edge function instance)
const cache = new Map<string, CacheEntry>();

/**
 * Generate a cache key with consistent format
 *
 * @param prefix - Cache category (e.g., 'plans', 'resources')
 * @param tenantId - Tenant ID for isolation
 * @param parts - Additional key parts
 * @returns Formatted cache key
 *
 * @example
 * const key = getCacheKey('plans', tenantId, 'list', productCode);
 * // Returns: "plans:tenant-uuid:list:contractnest"
 */
export function getCacheKey(prefix: string, tenantId: string, ...parts: (string | undefined)[]): string {
  const validParts = parts.filter(Boolean);
  if (validParts.length > 0) {
    return `${prefix}:${tenantId}:${validParts.join(':')}`;
  }
  return `${prefix}:${tenantId}`;
}

/**
 * Get data from cache if valid (not expired)
 *
 * @param key - Cache key
 * @returns Cached data or null if not found/expired
 *
 * @example
 * const cachedData = getFromCache(cacheKey);
 * if (cachedData) {
 *   return new Response(JSON.stringify({ data: cachedData, cached: true }));
 * }
 */
export function getFromCache<T = any>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttlMs) {
    cache.delete(key);
    console.log(`[Cache] EXPIRED: ${key.substring(0, 50)}...`);
    return null;
  }

  console.log(`[Cache] HIT: ${key.substring(0, 50)}... (age: ${Math.round(age / 1000)}s)`);
  return entry.data as T;
}

/**
 * Store data in cache with TTL
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Optional TTL configuration
 *
 * @example
 * setCache(cacheKey, plansData, { ttlSeconds: 30 });
 */
export function setCache<T = any>(key: string, data: T, options: CacheOptions = {}): void {
  const ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
  const ttlMs = ttlSeconds * 1000;

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttlMs
  });

  console.log(`[Cache] SET: ${key.substring(0, 50)}... (TTL: ${ttlSeconds}s)`);
}

/**
 * Remove a specific cache entry
 *
 * @param key - Cache key to remove
 */
export function invalidateCache(key: string): void {
  if (cache.has(key)) {
    cache.delete(key);
    console.log(`[Cache] INVALIDATED: ${key.substring(0, 50)}...`);
  }
}

/**
 * Remove all cache entries matching a prefix
 * Useful for invalidating all tenant data after mutations
 *
 * @param prefix - Key prefix to match (e.g., 'plans:tenant-uuid')
 *
 * @example
 * // After creating/updating a plan, invalidate all plan caches for tenant
 * invalidateCacheByPrefix(`plans:${tenantId}`);
 */
export function invalidateCacheByPrefix(prefix: string): void {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    console.log(`[Cache] INVALIDATED ${count} entries with prefix: ${prefix.substring(0, 30)}...`);
  }
}

/**
 * Clear all cache entries
 * Use sparingly - only for debugging or complete reset scenarios
 */
export function clearAllCache(): void {
  const size = cache.size;
  cache.clear();
  console.log(`[Cache] CLEARED all ${size} entries`);
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}
