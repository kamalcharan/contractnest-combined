// src/config/VaNiN8NConfig.ts
// Centralized n8n webhook configuration for VaNi AI operations
// Single source of truth for all n8n webhook URLs

// =================================================================
// BASE CONFIGURATION
// =================================================================

/**
 * Base URL for n8n instance
 * Set via environment variable: N8N_WEBHOOK_URL
 */
const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.srv1096269.hstgr.cloud';

/**
 * Webhook path prefixes based on environment
 * - test: Uses /webhook-test/ prefix
 * - production: Uses /webhook/ prefix
 */
const WEBHOOK_PREFIX = {
  test: '/webhook-test',
  production: '/webhook',
} as const;

// =================================================================
// WEBHOOK PATHS
// =================================================================

/**
 * All n8n webhook paths (without prefix)
 * Add new paths here as workflows are created
 */
export const N8N_PATHS = {
  // Profile Processing
  PROCESS_PROFILE: '/process-profile',

  // Embedding Generation
  GENERATE_EMBEDDING: '/generate-embedding',

  // AI-powered Search (with caching and semantic boost)
  SEARCH: '/search',

  // Semantic Clusters
  GENERATE_CLUSTERS: '/generate-semantic-clusters',

  // Group Discovery - Deterministic intent-based API (replaces AI_AGENT)
  GROUP_DISCOVERY: '/group-discovery',

  // Future webhooks (add as needed)
  // SEND_NOTIFICATION: '/send-notification',
} as const;

// =================================================================
// TYPE DEFINITIONS
// =================================================================

export type N8NPathKey = keyof typeof N8N_PATHS;
export type N8NEnvironment = 'test' | 'production';

// =================================================================
// REQUEST/RESPONSE TYPES FOR n8n WEBHOOKS
// =================================================================

/**
 * Request body for process-profile webhook
 */
export interface N8NProcessProfileRequest {
  type: 'manual' | 'website';
  content?: string;        // For manual type
  websiteUrl?: string;     // For website type
  userId: string;
  groupId: string;
}

/**
 * Success response from process-profile webhook
 */
export interface N8NProcessProfileSuccessResponse {
  status: 'success';
  enhancedContent: string;
  originalContent: string;
  userId: string;
  groupId: string;
  sourceUrl: string;
}

/**
 * Error response from process-profile webhook
 */
export interface N8NProcessProfileErrorResponse {
  status: 'error';
  errorCode: 'WEBSITE_FETCH_FAILED' | 'AI_EXTRACT_FAILED' | 'AI_ENHANCE_FAILED';
  message: string;
  details: string;
  suggestion: string;
  recoverable: boolean;
}

/**
 * Combined response type
 */
export type N8NProcessProfileResponse =
  | N8NProcessProfileSuccessResponse
  | N8NProcessProfileErrorResponse;

// =================================================================
// GENERATE EMBEDDING TYPES
// =================================================================

/**
 * Request body for generate-embedding webhook
 */
export interface N8NGenerateEmbeddingRequest {
  textToEmbed: string;
  membershipId: string;
}

/**
 * Success response from generate-embedding webhook
 */
export interface N8NGenerateEmbeddingSuccessResponse {
  status: 'success';
  embedding: number[];
  dimensions: number;
  membershipId: string;
}

/**
 * Error response from generate-embedding webhook
 */
export interface N8NGenerateEmbeddingErrorResponse {
  status: 'error';
  message: string;
  error?: string;
}

/**
 * Combined embedding response type
 */
export type N8NGenerateEmbeddingResponse =
  | N8NGenerateEmbeddingSuccessResponse
  | N8NGenerateEmbeddingErrorResponse;

// =================================================================
// SEARCH TYPES
// =================================================================

/**
 * Search scope - where to search
 * - 'group': Search within a specific business group (default)
 * - 'tenant': Search across all groups for a tenant
 * - 'global': Search across all tenants (admin only, future)
 */
export type SearchScope = 'group' | 'tenant' | 'global';

/**
 * Request body for search webhook
 * Supports AI-powered search with caching and semantic boost
 */
export interface N8NSearchRequest {
  // Required
  query: string;                    // Search query text

  // Scope (at least one required)
  group_id?: string;                // Search within this group
  tenant_id?: string;               // Search within this tenant's groups
  scope?: SearchScope;              // Explicit scope (defaults to 'group' if group_id provided)

  // Optional parameters
  limit?: number;                   // Max results (default: 5)
  use_cache?: boolean;              // Whether to use query cache (default: true)
  similarity_threshold?: number;    // Min similarity score 0-1 (default: 0.7)

  // Session context (for chat flows)
  session_id?: string;              // Chat session ID
  intent?: string;                  // User intent (search_offering, search_segment, member_lookup)

  // Delivery channel context
  channel?: 'web' | 'mobile' | 'whatsapp' | 'chatbot' | 'api';
}

/**
 * Individual search result
 */
export interface N8NSearchResult {
  membership_id: string;
  tenant_id: string;
  business_name: string;
  business_email?: string;
  mobile_number?: string;
  city?: string;
  industry?: string;
  profile_snippet: string;
  ai_enhanced_description?: string;
  approved_keywords?: string[];
  similarity: number;
  similarity_original?: number;     // Original score before boost
  boost_applied?: string;           // e.g., 'cluster_match'
  match_type: string;               // 'vector', 'keyword', 'hybrid'
}

/**
 * Success response from search webhook
 */
export interface N8NSearchSuccessResponse {
  success: true;
  query: string;
  results_count: number;
  from_cache: boolean;
  cache_hit_count?: number;
  results: N8NSearchResult[];

  // Metadata
  search_scope?: SearchScope;
  group_id?: string;
  tenant_id?: string;
}

/**
 * Error response from search webhook
 */
export interface N8NSearchErrorResponse {
  success: false;
  error: string;
  details?: string;
  query?: string;
}

/**
 * Combined search response type
 */
export type N8NSearchResponse =
  | N8NSearchSuccessResponse
  | N8NSearchErrorResponse;

/**
 * Check if search response indicates success
 */
export function isSearchSuccess(response: N8NSearchResponse): response is N8NSearchSuccessResponse {
  return response.success === true;
}

/**
 * Check if search response indicates error
 */
export function isSearchError(response: N8NSearchResponse): response is N8NSearchErrorResponse {
  return response.success === false;
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Get the full n8n webhook URL for a given path and environment
 *
 * @param pathKey - Key from N8N_PATHS (e.g., 'PROCESS_PROFILE')
 * @param environment - 'test' or 'production' (derived from x-environment header)
 * @returns Full webhook URL
 *
 * @example
 * getN8NWebhookUrl('PROCESS_PROFILE', 'test')
 * // Returns: https://n8n.srv1096269.hstgr.cloud/webhook-test/process-profile
 *
 * getN8NWebhookUrl('PROCESS_PROFILE', 'production')
 * // Returns: https://n8n.srv1096269.hstgr.cloud/webhook/process-profile
 */
export function getN8NWebhookUrl(
  pathKey: N8NPathKey,
  environment: N8NEnvironment = 'production'
): string {
  const prefix = WEBHOOK_PREFIX[environment];
  const path = N8N_PATHS[pathKey];
  return `${N8N_BASE_URL}${prefix}${path}`;
}

/**
 * Convert x-environment header value to n8n environment
 *
 * @param xEnvironment - Value from x-environment header ('live' | 'test')
 * @returns N8NEnvironment ('production' | 'test')
 */
export function mapEnvironmentToN8N(xEnvironment?: string): N8NEnvironment {
  // 'live' maps to 'production', everything else maps to 'test'
  return xEnvironment === 'live' ? 'production' : 'test';
}

/**
 * Check if n8n response indicates success
 */
export function isN8NSuccess(response: N8NProcessProfileResponse): response is N8NProcessProfileSuccessResponse {
  return response.status === 'success';
}

/**
 * Check if n8n response indicates error
 */
export function isN8NError(response: N8NProcessProfileResponse): response is N8NProcessProfileErrorResponse {
  return response.status === 'error';
}

/**
 * Check if embedding response indicates success
 */
export function isEmbeddingSuccess(response: N8NGenerateEmbeddingResponse): response is N8NGenerateEmbeddingSuccessResponse {
  return response.status === 'success';
}

/**
 * Check if embedding response indicates error
 */
export function isEmbeddingError(response: N8NGenerateEmbeddingResponse): response is N8NGenerateEmbeddingErrorResponse {
  return response.status === 'error';
}

// =================================================================
// EXPORTS
// =================================================================

export const VaNiN8NConfig = {
  BASE_URL: N8N_BASE_URL,
  WEBHOOK_PREFIX,
  PATHS: N8N_PATHS,
  getWebhookUrl: getN8NWebhookUrl,
  mapEnvironment: mapEnvironmentToN8N,
  isSuccess: isN8NSuccess,
  isError: isN8NError,
  isEmbeddingSuccess,
  isEmbeddingError,
  isSearchSuccess,
  isSearchError,
};

// =================================================================
// GROUP DISCOVERY TYPES (Deterministic Intent-based API)
// =================================================================

/**
 * Available intents for Group Discovery
 */
export type GroupDiscoveryIntent =
  | 'welcome'
  | 'goodbye'
  | 'list_segments'
  | 'list_members'
  | 'search'
  | 'get_contact';

/**
 * Channel types for Group Discovery
 */
export type GroupDiscoveryChannel = 'chat' | 'whatsapp';

/**
 * Response types from Group Discovery
 */
export type GroupDiscoveryResponseType =
  | 'welcome'
  | 'goodbye'
  | 'segments_list'
  | 'search_results'
  | 'contact_details'
  | 'error';

/**
 * Detail levels for card rendering
 */
export type GroupDiscoveryDetailLevel = 'none' | 'list' | 'summary' | 'full';

/**
 * Action button in search results
 */
export interface GroupDiscoveryAction {
  type: 'call' | 'whatsapp' | 'email' | 'website' | 'booking' | 'card' | 'vcard' | 'details';
  label: string;
  value: string;
}

/**
 * Request body for Group Discovery webhook
 */
export interface GroupDiscoveryRequest {
  intent: GroupDiscoveryIntent;
  group_id: string;
  channel: GroupDiscoveryChannel;
  session_id?: string;
  // Intent-specific params
  query?: string;           // For 'search' intent
  segment?: string;         // For 'list_members' intent
  membership_id?: string;   // For 'get_contact' intent
  business_name?: string;   // For 'get_contact' intent (alternative)
  limit?: number;           // Optional limit for results
}

/**
 * Segment result (for segments_list response)
 */
export interface GroupDiscoverySegment {
  segment_name: string;
  member_count: number;
}

/**
 * Search result (for search_results and contact_details responses)
 */
export interface GroupDiscoveryResult {
  rank?: number;
  membership_id: string;
  business_name: string;
  logo_url?: string | null;
  short_description?: string | null;
  ai_enhanced_description?: string | null;
  industry?: string | null;
  chapter?: string | null;
  city?: string | null;
  full_address?: string | null;
  phone?: string | null;
  phone_country_code?: string;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  booking_url?: string | null;
  card_url?: string | null;
  vcard_url?: string | null;
  similarity?: number;
  semantic_clusters?: any[];
  actions?: GroupDiscoveryAction[];
}

/**
 * Response from Group Discovery webhook
 */
export interface GroupDiscoveryResponse {
  success: boolean;
  intent?: GroupDiscoveryIntent;
  response_type: GroupDiscoveryResponseType;
  detail_level: GroupDiscoveryDetailLevel;
  message: string;
  results: GroupDiscoveryResult[] | GroupDiscoverySegment[];
  results_count: number;
  session_id?: string;
  group_id?: string;
  group_name?: string;
  channel?: string;
  from_cache?: boolean;
  duration_ms?: number;
}

export default VaNiN8NConfig;
