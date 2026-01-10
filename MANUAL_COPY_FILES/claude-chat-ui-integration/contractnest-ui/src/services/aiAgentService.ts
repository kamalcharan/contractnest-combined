// frontend/src/services/aiAgentService.ts
// Group Discovery Service - Direct n8n webhook integration
// Calls n8n webhook directly for VaNi Chat functionality

/**
 * Group Discovery Service - VaNi Chat via n8n
 *
 * Features:
 * - Direct n8n webhook calls (no backend proxy)
 * - Session management with session_action
 * - Phone-based user identification
 * - Dynamic UI elements (available_intents, options, contact_actions)
 */

// =================================================================
// CONSTANTS
// =================================================================

const N8N_WEBHOOK_URL = 'https://n8n.srv1096269.hstgr.cloud/webhook/group-discovery-agent';

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

export type SessionAction = 'start' | 'continue' | 'end';

export type GroupDiscoveryResponseType =
  | 'welcome'
  | 'owner_welcome'
  | 'session_start'
  | 'session_end'
  | 'goodbye'
  | 'directory_welcome'
  | 'segments_list'
  | 'members_list'
  | 'search_results'
  | 'contact_details'
  | 'conversation'
  | 'access_denied'
  | 'error';

export type GroupDiscoveryDetailLevel = 'none' | 'list' | 'summary' | 'full';

// For backward compatibility with existing code
export type AIAgentResponseType = GroupDiscoveryResponseType;
export type AIAgentDetailLevel = GroupDiscoveryDetailLevel;
export type AIAgentChannel = GroupDiscoveryChannel;

export interface GroupDiscoveryAction {
  type: 'call' | 'whatsapp' | 'email' | 'website' | 'booking' | 'card' | 'vcard' | 'details';
  label: string;
  value: string;
}

// Request format per n8n integration doc
export interface ChatRequest {
  message: string;
  phone: string;
  group_id: string;
  channel: GroupDiscoveryChannel;
  session_action?: SessionAction;
  session_config?: {
    welcome_message?: string;
    goodbye_message?: string;
  };
  intent?: string;
  user_id?: string;
  params?: {
    membership_id?: string;
    segment?: string;
    query?: string;
    limit?: number;
    offset?: number;
  };
}

// Legacy request format (for backward compatibility)
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
  industry_id?: string;
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

// Dynamic UI element types from N8N
export interface AvailableIntent {
  id: GroupDiscoveryIntent | string;
  label: string;
  requires_input: boolean;
  input_placeholder?: string;
  whatsapp_type?: 'button' | 'list' | 'text_prompt';
}

export interface OptionsConfig {
  prompt: string;
  intent: GroupDiscoveryIntent | string;
  items: OptionItem[];
}

export interface OptionItem {
  label: string;
  value: string;
  subtitle?: string;
}

export interface ContactAction {
  type: 'call' | 'whatsapp' | 'email' | 'website' | 'vcard' | 'booking';
  label: string;
  value: string;
}

export interface AIAgentSuccessResponse {
  success: true;
  intent?: GroupDiscoveryIntent | string;
  message: string;
  response_type: AIAgentResponseType;
  detail_level: AIAgentDetailLevel;
  results?: AIAgentSearchResult[];
  segments?: AIAgentSegmentResult[];
  results_count?: number;
  total_count?: number;
  // Session info
  session_id?: string | null;
  is_new_session?: boolean;
  is_member?: boolean;
  // Group info
  group_id?: string;
  group_name?: string;
  channel?: string;
  // UI rendering helpers
  available_intents?: AvailableIntent[];
  options?: OptionsConfig;
  contact_actions?: ContactAction[];
  expects_input?: boolean;
  // Meta
  from_cache?: boolean;
  duration_ms?: number;
  intent_detected?: string;
}

export interface AIAgentErrorResponse {
  success: false;
  error?: string;
  error_code?: string;
  message: string;
  response_type: 'error' | 'access_denied';
  detail_level: 'none';
  results: [];
  results_count: 0;
  is_member?: boolean;
  available_intents?: AvailableIntent[];
}

export type AIAgentResponse = AIAgentSuccessResponse | AIAgentErrorResponse;

// =================================================================
// SESSION STORAGE HELPERS
// =================================================================

const SESSION_STORAGE_KEY = 'vani_chat_session';

interface StoredSession {
  session_id: string;
  group_id: string;
  phone: string;
  expires_at?: string;
}

function getStoredSession(groupId: string): StoredSession | null {
  try {
    const stored = sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${groupId}`);
    if (!stored) return null;
    const session = JSON.parse(stored) as StoredSession;
    // Check if session is expired (if expires_at is set)
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${groupId}`);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function storeSession(groupId: string, sessionId: string, phone: string, expiresAt?: string): void {
  try {
    const session: StoredSession = {
      session_id: sessionId,
      group_id: groupId,
      phone,
      expires_at: expiresAt
    };
    sessionStorage.setItem(`${SESSION_STORAGE_KEY}_${groupId}`, JSON.stringify(session));
  } catch {
    console.warn('Failed to store session in sessionStorage');
  }
}

function clearStoredSession(groupId: string): void {
  try {
    sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${groupId}`);
  } catch {
    // Ignore
  }
}

// =================================================================
// SERVICE CLASS
// =================================================================

class GroupDiscoveryService {
  /**
   * Send request directly to n8n webhook
   */
  async sendToN8N(request: ChatRequest): Promise<AIAgentResponse> {
    try {
      console.log('🔍 Group Discovery: Sending to n8n...', {
        message: request.message?.substring(0, 50),
        group_id: request.group_id,
        session_action: request.session_action,
        hasPhone: !!request.phone
      });

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();

      console.log('🔍 Group Discovery: Response received', {
        success: data.success,
        response_type: data.response_type,
        results_count: data.results_count,
        session_id: data.session_id
      });

      // Store session if returned
      if (data.session_id && request.group_id) {
        storeSession(request.group_id, data.session_id, request.phone);
      }

      return data;
    } catch (error: any) {
      console.error('Group Discovery Service error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to VaNi. Please try again.',
        response_type: 'error',
        detail_level: 'none',
        results: [],
        results_count: 0
      };
    }
  }

  /**
   * Start a new chat session
   */
  async startSession(groupId: string, phone: string): Promise<AIAgentResponse> {
    // Clear any existing session
    clearStoredSession(groupId);

    return this.sendToN8N({
      message: 'Hi',
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'start'
    });
  }

  /**
   * Send a chat message (auto-detects if session needs to start)
   */
  async chat(message: string, groupId: string, phone: string): Promise<AIAgentResponse> {
    if (!groupId || !phone) {
      return {
        success: false,
        message: 'group_id and phone are required',
        response_type: 'error',
        detail_level: 'none',
        results: [],
        results_count: 0
      };
    }

    // Check for stored session
    const storedSession = getStoredSession(groupId);
    const sessionAction: SessionAction = storedSession ? 'continue' : 'start';

    // Check if this is a goodbye message
    const isGoodbye = ['bye', 'exit', 'quit', 'goodbye', 'bye bbb'].some(
      w => message.toLowerCase() === w || message.toLowerCase().includes(w)
    );

    return this.sendToN8N({
      message,
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: isGoodbye ? 'end' : sessionAction
    });
  }

  /**
   * End the chat session
   */
  async endSession(groupId: string, phone: string): Promise<AIAgentResponse> {
    const response = await this.sendToN8N({
      message: 'bye',
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'end'
    });

    // Clear stored session
    clearStoredSession(groupId);

    return response;
  }

  /**
   * Send welcome intent
   */
  async welcome(groupId: string, phone: string): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: 'Hi BBB',
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'start'
    });
  }

  /**
   * Send goodbye intent
   */
  async goodbye(groupId: string, phone: string): Promise<AIAgentResponse> {
    return this.endSession(groupId, phone);
  }

  /**
   * List all segments/industries
   */
  async listSegments(groupId: string, phone: string): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: 'show industries',
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'continue',
      intent: 'list_segments'
    });
  }

  /**
   * List members in a segment
   */
  async listMembers(groupId: string, phone: string, segment: string): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: segment,
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'continue',
      intent: 'list_members',
      params: { segment }
    });
  }

  /**
   * Search for businesses
   */
  async search(groupId: string, phone: string, query: string): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: query,
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'continue',
      params: { query }
    });
  }

  /**
   * Get contact details by membership_id
   */
  async getContact(groupId: string, phone: string, membershipId: string): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: `get contact ${membershipId}`,
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'continue',
      intent: 'get_contact',
      params: { membership_id: membershipId }
    });
  }

  /**
   * Select an option from options list
   */
  async selectOption(
    groupId: string,
    phone: string,
    option: OptionItem,
    intent: string
  ): Promise<AIAgentResponse> {
    return this.sendToN8N({
      message: option.label,
      phone,
      group_id: groupId,
      channel: 'chat',
      session_action: 'continue',
      intent,
      params: {
        membership_id: intent === 'get_contact' ? option.value : undefined,
        segment: intent === 'list_members' ? option.label : undefined
      }
    });
  }

  /**
   * Get stored session for a group
   */
  getStoredSession(groupId: string): StoredSession | null {
    return getStoredSession(groupId);
  }

  /**
   * Clear stored session for a group
   */
  clearSession(groupId: string): void {
    clearStoredSession(groupId);
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

  // =================================================================
  // LEGACY METHODS (for backward compatibility)
  // =================================================================

  /**
   * @deprecated Use sendToN8N instead
   * Legacy method that wraps the new API
   */
  async sendRequest(request: GroupDiscoveryRequest): Promise<AIAgentResponse> {
    console.warn('aiAgentService.sendRequest is deprecated. Use chat() or sendToN8N() instead.');

    // This is a fallback - in reality, VaNiChatPage should be updated to use the new methods
    // For now, return an error to indicate the API has changed
    return {
      success: false,
      message: 'Please use the updated chat() method with phone parameter',
      response_type: 'error',
      detail_level: 'none',
      results: [],
      results_count: 0
    };
  }
}

// Export singleton instance
export const aiAgentService = new GroupDiscoveryService();
export default aiAgentService;
