// frontend/src/services/chatService.ts
// VaNi Chat Service - API calls for chat/search operations
// Pattern: Similar to groupsService.ts - axios wrapper for API calls

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';

/**
 * Chat Service - VaNi AI Chat API wrapper
 *
 * Handles:
 * - Session management
 * - Group activation via trigger phrases
 * - Intent-based search
 * - AI-powered search with caching
 *
 * Uses centralized endpoints from serviceURLs.ts
 */

// Types
export interface ChatSession {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  channel: string;
  group_id: string | null;
  group_name: string | null;
  intent_state: string;
  current_intent: string | null;
  pending_prompt: string | null;
  message_count: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatInitResponse {
  success: boolean;
  message: string;
  available_groups?: {
    group_id: string;
    group_name: string;
    trigger_phrase: string;
  }[];
  intents?: {
    id: string;
    label: string;
    prompt: string;
  }[];
}

export interface ChatSessionResponse {
  success: boolean;
  session?: ChatSession;
  error?: string;
}

export interface ChatActivateResponse {
  success: boolean;
  group_id?: string;
  group_name?: string;
  group_type?: string;
  chat_config?: any;
  message?: string;
  error?: string;
}

export interface ChatIntentResponse {
  success: boolean;
  session?: ChatSession;
  prompt?: string;
  error?: string;
}

export interface SearchResult {
  membership_id: string;
  tenant_id: string;
  business_name: string;
  business_category: string | null;
  city: string | null;
  business_phone: string | null;
  business_phone_code: string | null;
  business_email: string | null;
  website_url: string | null;
  ai_enhanced_description: string | null;
  similarity: number;
  cluster_boost: number;
}

export interface ChatSearchResponse {
  success: boolean;
  query?: string;
  results_count?: number;
  from_cache?: boolean;
  cache_hit_count?: number;
  results?: SearchResult[];
  error?: string;
}

export interface ChatEndResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Chat Service class
 * Uses API_ENDPOINTS.CHAT from serviceURLs.ts for endpoint definitions
 */
class ChatService {
  /**
   * Get VaNi intro message with available groups
   * POST /api/chat/init
   */
  async init(): Promise<ChatInitResponse> {
    try {
      console.log('💬 Chat Service: Initializing chat...');
      const response = await api.post(API_ENDPOINTS.CHAT.INIT, {});
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in init:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'Failed to initialize chat'
      };
    }
  }

  /**
   * Get or create chat session
   * POST /api/chat/session
   */
  async getSession(channel: string = 'web'): Promise<ChatSessionResponse> {
    try {
      console.log('💬 Chat Service: Getting/creating session...', { channel });
      const response = await api.post(API_ENDPOINTS.CHAT.SESSION, { channel });
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in getSession:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get session'
      };
    }
  }

  /**
   * Get session by ID
   * GET /api/chat/session/:sessionId
   */
  async getSessionById(sessionId: string): Promise<ChatSessionResponse> {
    try {
      console.log('💬 Chat Service: Getting session by ID...', { sessionId });
      const response = await api.get(API_ENDPOINTS.CHAT.SESSION_BY_ID(sessionId));
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in getSessionById:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get session'
      };
    }
  }

  /**
   * Activate group in chat session
   * POST /api/chat/activate
   */
  async activateGroup(request: {
    trigger_phrase?: string;
    group_id?: string;
    session_id?: string;
  }): Promise<ChatActivateResponse> {
    try {
      console.log('💬 Chat Service: Activating group...', request);
      const response = await api.post(API_ENDPOINTS.CHAT.ACTIVATE, request);
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in activateGroup:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to activate group'
      };
    }
  }

  /**
   * Set intent in chat session
   * POST /api/chat/intent
   */
  async setIntent(request: {
    session_id: string;
    intent: string;
    prompt?: string;
  }): Promise<ChatIntentResponse> {
    try {
      console.log('💬 Chat Service: Setting intent...', request);
      const response = await api.post(API_ENDPOINTS.CHAT.INTENT, request);
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in setIntent:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to set intent'
      };
    }
  }

  /**
   * AI-powered search with caching
   * POST /api/chat/search
   */
  async search(request: {
    group_id: string;
    query: string;
    session_id?: string;
    intent?: string;
    limit?: number;
    use_cache?: boolean;
    similarity_threshold?: number;
  }): Promise<ChatSearchResponse> {
    try {
      console.log('💬 Chat Service: Searching...', {
        group_id: request.group_id,
        query: request.query,
        use_cache: request.use_cache
      });

      const response = await api.post(API_ENDPOINTS.CHAT.SEARCH, request);
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in search:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Search failed'
      };
    }
  }

  /**
   * End chat session
   * POST /api/chat/end
   */
  async endSession(sessionId: string): Promise<ChatEndResponse> {
    try {
      console.log('💬 Chat Service: Ending session...', { sessionId });
      const response = await api.post(API_ENDPOINTS.CHAT.END, { session_id: sessionId });
      return response.data;
    } catch (error: any) {
      console.error('Chat Service error in endSession:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to end session'
      };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
