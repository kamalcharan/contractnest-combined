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
  membership_id: string;
  tenant_id: string;
  business_name: string;
  business_category: string | null;
  city: string | null;
  chapter: string | null;
  business_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  ai_enhanced_description: string | null;
  similarity?: number;
}

export interface AIAgentRequest {
  message: string;
  channel: AIAgentChannel;
  group_id?: string;
  phone?: string; // Required for whatsapp channel
}

export interface AIAgentSuccessResponse {
  success: true;
  message: string;              // AI-generated response (normalized from N8N's 'response' field)
  results?: AIAgentSearchResult[];
  results_count?: number;
  session_id?: string;
  group_id?: string;            // Group context from N8N
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
