// frontend/src/services/aiAgentService.ts
// AI Agent Service - Conversational Group Discovery via N8N
// Pattern: Similar to chatService.ts - axios wrapper for API calls

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';

/**
 * AI Agent Service - Conversational AI for VaNi Chat
 *
 * Handles:
 * - Sending messages to AI Agent via backend API
 * - Receiving AI-generated responses with search results
 * - Support for chat, whatsapp, and web channels
 *
 * Uses centralized endpoints from serviceURLs.ts
 */

// Types
export type AIAgentChannel = 'chat' | 'whatsapp' | 'web';

export interface AIAgentSearchResult {
  // Core identifiers
  membership_id: string;
  tenant_id?: string;
  rank?: number;

  // Business info
  business_name: string;
  logo_url?: string | null;
  short_description?: string | null;
  ai_enhanced_description?: string | null;  // For contact details

  // Industry/Category (support both old and new field names)
  industry?: string | null;
  business_category?: string | null;

  // Location
  city?: string | null;
  state?: string | null;
  address?: string | null;
  full_address?: string | null;
  chapter?: string | null;

  // Contact info (support both old and new field names)
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

  // Card URLs (for contact details)
  card_url?: string | null;
  vcard_url?: string | null;

  // Match scoring (0-100 scale from API)
  similarity?: number;
  cluster_boost?: number;
}

// Segment/Industry list result
export interface AIAgentSegmentResult {
  segment_id: string;
  segment_name: string;
  member_count: number;
}

export interface AIAgentRequest {
  message: string;
  channel: AIAgentChannel;
  group_id?: string;
  phone?: string; // Required for whatsapp channel
}

// Response types from N8N
export type AIAgentResponseType =
  | 'welcome'
  | 'goodbye'
  | 'search_results'
  | 'contact_details'
  | 'segments_list'
  | 'conversation';

// Detail levels from N8N
export type AIAgentDetailLevel = 'none' | 'summary' | 'full' | 'list';

export interface AIAgentSuccessResponse {
  success: true;
  message: string;              // AI-generated response (normalized from N8N's 'response' field)
  response_type?: AIAgentResponseType;  // NEW: Type of response for UI rendering
  detail_level?: AIAgentDetailLevel;    // NEW: Level of detail for cards
  results?: AIAgentSearchResult[];
  segments?: AIAgentSegmentResult[];  // For industry/segment list responses
  results_count?: number;
  session_id?: string;
  is_new_session?: boolean;     // NEW: Indicates if this is a new session
  group_id?: string;            // Group context from N8N
  group_name?: string;          // Group name
  channel?: string;             // Channel type
  intent_detected?: string;
  from_cache?: boolean;
  duration_ms?: number;         // Processing time in milliseconds
}

export interface AIAgentErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: string;
}

export type AIAgentResponse = AIAgentSuccessResponse | AIAgentErrorResponse;

/**
 * AI Agent Service class
 * Uses API_ENDPOINTS.AI_AGENT from serviceURLs.ts for endpoint definitions
 */
class AIAgentService {
  /**
   * Send a message to the AI Agent
   * POST /api/ai-agent/message
   *
   * @param request - Message request containing message, channel, and optional group_id
   * @returns AI Agent response with message and optional search results
   */
  async sendMessage(request: AIAgentRequest): Promise<AIAgentResponse> {
    try {
      console.log('🤖 AI Agent Service: Sending message...', {
        channel: request.channel,
        messageLength: request.message.length,
        hasGroupId: !!request.group_id
      });

      const response = await api.post<AIAgentResponse>(
        API_ENDPOINTS.AI_AGENT.MESSAGE,
        request
      );

      console.log('🤖 AI Agent Service: Response received', {
        success: response.data.success,
        hasResults: !!(response.data as AIAgentSuccessResponse).results
      });

      return response.data;
    } catch (error: any) {
      console.error('AI Agent Service error in sendMessage:', error);

      // Handle specific error cases
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          message: 'Please log in to use the AI assistant.'
        };
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: error.response?.data?.error || 'Invalid request',
          message: error.response?.data?.message || 'Please check your input and try again.'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send message',
        message: 'Something went wrong. Please try again.'
      };
    }
  }

  /**
   * Convenience method for chat channel
   */
  async chat(message: string, groupId?: string): Promise<AIAgentResponse> {
    return this.sendMessage({
      message,
      channel: 'chat',
      group_id: groupId
    });
  }

  /**
   * Convenience method for web channel
   */
  async web(message: string, groupId?: string): Promise<AIAgentResponse> {
    return this.sendMessage({
      message,
      channel: 'web',
      group_id: groupId
    });
  }

  /**
   * Convenience method for whatsapp channel
   */
  async whatsapp(message: string, phone: string, groupId?: string): Promise<AIAgentResponse> {
    return this.sendMessage({
      message,
      channel: 'whatsapp',
      phone,
      group_id: groupId
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
}

// Export singleton instance
export const aiAgentService = new AIAgentService();
export default aiAgentService;
