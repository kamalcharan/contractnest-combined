// frontend/src/services/aiAgentService.ts
// Group Discovery Service - Deterministic Intent-based API
// Replaces AI Agent with predictable, intent-based requests

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';

/**
 * Group Discovery Service - Intent-based VaNi Chat
 *
 * Features:
 * - Deterministic responses (no AI interpretation)
 * - Intent detection from user text
 * - Predictable response format with results array
 * - Action buttons for call, email, website, etc.
 */

// =================================================================
// TYPES
// =================================================================

export type GroupDiscoveryIntent =
  | 'welcome'
  | 'goodbye'
  | 'list_segments'
  | 'list_members'
  | 'search'
  | 'get_contact';

export type GroupDiscoveryChannel = 'chat' | 'whatsapp';

export type GroupDiscoveryResponseType =
  | 'welcome'
  | 'goodbye'
  | 'segments_list'
  | 'search_results'
  | 'contact_details'
  | 'error';

export type GroupDiscoveryDetailLevel = 'none' | 'list' | 'summary' | 'full';

// For backward compatibility with existing code
export type AIAgentResponseType = GroupDiscoveryResponseType | 'conversation';
export type AIAgentDetailLevel = GroupDiscoveryDetailLevel;
export type AIAgentChannel = GroupDiscoveryChannel;

export interface GroupDiscoveryAction {
  type: 'call' | 'whatsapp' | 'email' | 'website' | 'booking' | 'card' | 'vcard' | 'details';
  label: string;
  value: string;
}

export interface GroupDiscoveryRequest {
  intent: GroupDiscoveryIntent;
  group_id: string;
  channel: GroupDiscoveryChannel;
  session_id?: string;
  query?: string;
  segment?: string;
  membership_id?: string;
  business_name?: string;
  limit?: number;
}

// Segment result (for segments_list response)
export interface AIAgentSegmentResult {
  segment_name: string;
  member_count: number;
}

// Search result (for search_results and contact_details)
export interface AIAgentSearchResult {
  rank?: number;
  membership_id: string;
  tenant_id?: string;
  business_name: string;
  logo_url?: string | null;
  short_description?: string | null;
  ai_enhanced_description?: string | null;
  industry?: string | null;
  business_category?: string | null;
  chapter?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  full_address?: string | null;
  phone?: string | null;
  phone_country_code?: string;
  business_phone?: string | null;
  whatsapp?: string | null;
  whatsapp_country_code?: string;
  business_whatsapp?: string | null;
  email?: string | null;
  business_email?: string | null;
  website?: string | null;
  website_url?: string | null;
  booking_url?: string | null;
  card_url?: string | null;
  vcard_url?: string | null;
  similarity?: number;
  cluster_boost?: number;
  semantic_clusters?: any[];
  actions?: GroupDiscoveryAction[];
}

export interface AIAgentSuccessResponse {
  success: true;
  intent?: GroupDiscoveryIntent;
  message: string;
  response_type: AIAgentResponseType;
  detail_level: AIAgentDetailLevel;
  results?: AIAgentSearchResult[];
  segments?: AIAgentSegmentResult[];
  results_count?: number;
  session_id?: string;
  is_new_session?: boolean;
  group_id?: string;
  group_name?: string;
  channel?: string;
  intent_detected?: string;
  from_cache?: boolean;
  duration_ms?: number;
}

export interface AIAgentErrorResponse {
  success: false;
  error?: string;
  message: string;
  response_type: 'error';
  detail_level: 'none';
  results: [];
  results_count: 0;
}

export type AIAgentResponse = AIAgentSuccessResponse | AIAgentErrorResponse;

// =================================================================
// INTENT DETECTION
// =================================================================

interface DetectedIntent {
  intent: GroupDiscoveryIntent;
  query?: string;
  segment?: string;
  membership_id?: string;
  business_name?: string;
}

/**
 * Detect intent from user message text
 * Based on N8N developer's guide
 */
function detectIntent(userMessage: string): DetectedIntent {
  const msg = userMessage.toLowerCase().trim();

  // Exit/Goodbye
  if (['bye', 'exit', 'quit', 'goodbye', 'bye bbb'].some(w => msg === w || msg.includes(w))) {
    return { intent: 'goodbye' };
  }

  // Welcome/Greeting
  if (['hi', 'hello', 'hey', 'hi bbb', 'hello bbb'].some(w => msg.startsWith(w) || msg === w)) {
    return { intent: 'welcome' };
  }

  // List segments/industries
  if (
    msg.includes('segment') ||
    msg.includes('industr') ||
    msg.includes('categories') ||
    msg === 'list industries' ||
    msg === 'show industries' ||
    msg === 'browse industries'
  ) {
    return { intent: 'list_segments' };
  }

  // "Who is into [segment]" pattern
  const whoMatch = msg.match(/who.*(is|are).*(into|in)\s+(.+)/i);
  if (whoMatch) {
    return { intent: 'list_members', segment: whoMatch[3].trim() };
  }

  // "Show [segment] companies/members" pattern
  const showMatch = msg.match(/(show|list)\s+(.+?)\s*(companies|businesses|members)/i);
  if (showMatch) {
    return { intent: 'list_members', segment: showMatch[2].trim() };
  }

  // "List members in [segment]" pattern
  const listInMatch = msg.match(/list\s+members\s+in\s+(.+)/i);
  if (listInMatch) {
    return { intent: 'list_members', segment: listInMatch[1].trim() };
  }

  // "Members in [segment]" pattern
  const membersInMatch = msg.match(/members\s+in\s+(.+)/i);
  if (membersInMatch) {
    return { intent: 'list_members', segment: membersInMatch[1].trim() };
  }

  // "List all members" - special case
  if (msg.includes('all members') || msg === 'list all' || msg === 'show all') {
    return { intent: 'search', query: 'all' };
  }

  // Get contact details - by UUID
  const uuidMatch = msg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch && (msg.includes('detail') || msg.includes('contact') || msg.includes('get'))) {
    return { intent: 'get_contact', membership_id: uuidMatch[0] };
  }

  // Get contact details - by business name
  if (msg.includes('detail') || msg.includes('contact') || msg.includes('more about')) {
    // Extract business name from common patterns
    const detailsMatch = msg.match(/(?:details?\s+(?:for|of|about)|contact\s+(?:for|of)|more\s+about)\s+(.+)/i);
    if (detailsMatch) {
      return { intent: 'get_contact', business_name: detailsMatch[1].trim() };
    }
  }

  // Default: Search
  return { intent: 'search', query: msg };
}

// =================================================================
// SERVICE CLASS
// =================================================================

class GroupDiscoveryService {
  /**
   * Send intent-based request to Group Discovery API
   */
  async sendRequest(request: GroupDiscoveryRequest): Promise<AIAgentResponse> {
    try {
      console.log('🔍 Group Discovery: Sending request...', {
        intent: request.intent,
        channel: request.channel,
        hasGroupId: !!request.group_id,
        hasQuery: !!request.query
      });

      const response = await api.post<AIAgentResponse>(
        API_ENDPOINTS.GROUPS.GROUP_DISCOVERY,
        request
      );

      console.log('🔍 Group Discovery: Response received', {
        success: response.data.success,
        responseType: (response.data as AIAgentSuccessResponse).response_type,
        resultsCount: (response.data as AIAgentSuccessResponse).results_count
      });

      return response.data;
    } catch (error: any) {
      console.error('Group Discovery Service error:', error);

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please log in to use the chat.',
          response_type: 'error',
          detail_level: 'none',
          results: [],
          results_count: 0
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: error.response?.data?.error,
          message: error.response?.data?.message || 'Invalid request',
          response_type: 'error',
          detail_level: 'none',
          results: [],
          results_count: 0
        };
      }

      return {
        success: false,
        error: error.message,
        message: 'Something went wrong. Please try again.',
        response_type: 'error',
        detail_level: 'none',
        results: [],
        results_count: 0
      };
    }
  }

  /**
   * Convenience method: Send message with auto-intent detection
   * This provides backward compatibility with the old chat() method
   */
  async chat(message: string, groupId?: string, sessionId?: string): Promise<AIAgentResponse> {
    if (!groupId) {
      return {
        success: false,
        message: 'group_id is required',
        response_type: 'error',
        detail_level: 'none',
        results: [],
        results_count: 0
      };
    }

    // Detect intent from message
    const detected = detectIntent(message);

    return this.sendRequest({
      intent: detected.intent,
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId,
      query: detected.query,
      segment: detected.segment,
      membership_id: detected.membership_id,
      business_name: detected.business_name
    });
  }

  /**
   * Send welcome intent
   */
  async welcome(groupId: string, sessionId?: string): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'welcome',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId
    });
  }

  /**
   * Send goodbye intent
   */
  async goodbye(groupId: string, sessionId?: string): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'goodbye',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId
    });
  }

  /**
   * List all segments/industries
   */
  async listSegments(groupId: string, sessionId?: string): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'list_segments',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId
    });
  }

  /**
   * List members in a segment
   */
  async listMembers(groupId: string, segment: string, sessionId?: string, limit?: number): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'list_members',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId,
      segment,
      limit
    });
  }

  /**
   * Search for businesses
   */
  async search(groupId: string, query: string, sessionId?: string, limit?: number): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'search',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId,
      query,
      limit
    });
  }

  /**
   * Get contact details by membership_id or business_name
   */
  async getContact(
    groupId: string,
    identifier: { membership_id?: string; business_name?: string },
    sessionId?: string
  ): Promise<AIAgentResponse> {
    return this.sendRequest({
      intent: 'get_contact',
      group_id: groupId,
      channel: 'chat',
      session_id: sessionId,
      membership_id: identifier.membership_id,
      business_name: identifier.business_name
    });
  }

  /**
   * Type guard for success response
   */
  isSuccess(response: AIAgentResponse): response is AIAgentSuccessResponse {
    return response.success === true;
  }

  /**
   * Type guard for error response
   */
  isError(response: AIAgentResponse): response is AIAgentErrorResponse {
    return response.success === false;
  }

  /**
   * Check if response has results (business cards)
   */
  hasResults(response: AIAgentResponse): boolean {
    if (!this.isSuccess(response)) return false;
    return Array.isArray(response.results) && response.results.length > 0;
  }

  /**
   * Check if response has segments (industry chips)
   */
  hasSegments(response: AIAgentResponse): boolean {
    if (!this.isSuccess(response)) return false;
    return Array.isArray(response.segments) && response.segments.length > 0;
  }
}

// Export singleton instance
export const aiAgentService = new GroupDiscoveryService();
export default aiAgentService;
