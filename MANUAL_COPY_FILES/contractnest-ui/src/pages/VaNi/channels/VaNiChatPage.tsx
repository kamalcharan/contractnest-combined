  // src/pages/VaNi/channels/VaNiChatPage.tsx
// VaNi AI Chat - BBB Directory Search with Caching
// Route: /vani/channels/chat

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Bot,
  Search,
  Users,
  Building2,
  Info,
  Send,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
  Clock,
  Database,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Calendar,
  Share2,
  Download,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '../../../services/chatService';
import { aiAgentService, type AIAgentSearchResult, type AIAgentSegmentResult, type AIAgentSuccessResponse, type AIAgentResponseType, type AIAgentDetailLevel, type AvailableIntent, type OptionsConfig, type ContactAction, type OptionItem } from '../../../services/aiAgentService';

// Simple markdown renderer for N8N responses
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by lines and process
  const lines = text.split('\n');

  return lines.map((line, i) => {
    // Process bold text: **text** → <strong>text</strong>
    let processed: React.ReactNode = line;

    // Handle bold
    const boldPattern = /\*\*(.*?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${i}-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (parts.length > 0) {
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      processed = <>{parts}</>;
    }

    // Handle list items: - item
    if (line.trim().startsWith('- ')) {
      const content = line.trim().substring(2);
      // Re-process bold in list item
      const listContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <div key={i} className="flex items-start space-x-2 ml-2">
          <span>•</span>
          <span dangerouslySetInnerHTML={{ __html: listContent }} />
        </div>
      );
    }

    // Regular line
    return (
      <React.Fragment key={i}>
        {processed}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

// Types
interface ChatSession {
  id: string;
  group_id: string | null;
  group_name: string | null;
  intent_state: string;
  current_intent: string | null;
  expires_at: string;
}

interface SearchResult {
  // Core identifiers
  membership_id: string;
  tenant_id?: string;
  rank?: number;

  // Business info
  business_name: string;
  logo_url?: string | null;
  short_description?: string | null;
  ai_enhanced_description?: string | null;

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

interface SegmentResult {
  segment_name: string;
  member_count: number;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  results?: SearchResult[];
  segments?: SegmentResult[];
  responseType?: AIAgentResponseType;  // Use N8N response_type directly
  detailLevel?: AIAgentDetailLevel;    // Use N8N detail_level directly
  fromCache?: boolean;
  // Dynamic UI elements from N8N
  availableIntents?: AvailableIntent[];
  options?: OptionsConfig;
  contactActions?: ContactAction[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize WhatsApp number to international format
 * Handles: 9876543210, 919876543210, +91 98765 43210
 */
const normalizeWhatsApp = (num: string | null | undefined): string => {
  if (!num) return '';
  const digits = num.replace(/[^0-9]/g, '');
  // If 10 digits, assume India (+91)
  return digits.length === 10 ? `91${digits}` : digits;
};

/**
 * Get logo URL with UI Avatars fallback
 */
const getLogoUrl = (result: SearchResult): string => {
  if (result.logo_url) return result.logo_url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(result.business_name)}&size=120&background=667eea&color=fff&bold=true`;
};

/**
 * Get match percentage color based on similarity score
 */
const getMatchColor = (similarity: number | undefined): string => {
  if (!similarity) return '#9ca3af';  // Gray
  if (similarity >= 80) return '#22c55e';  // Green
  if (similarity >= 60) return '#eab308';  // Yellow
  return '#9ca3af';  // Gray
};


/**
 * Map API result to SearchResult with backward compatibility
 */
const mapApiResult = (r: AIAgentSearchResult): SearchResult => ({
  membership_id: r.membership_id,
  tenant_id: r.tenant_id,
  rank: r.rank,
  business_name: r.business_name,
  logo_url: r.logo_url,
  short_description: r.short_description || r.ai_enhanced_description,
  ai_enhanced_description: r.ai_enhanced_description,
  industry: r.industry || r.business_category,
  business_category: r.business_category || r.industry,
  city: r.city,
  state: r.state,
  address: r.address,
  full_address: r.full_address,
  chapter: r.chapter,
  phone: r.phone || r.business_phone,
  phone_country_code: r.phone_country_code,
  business_phone: r.business_phone || r.phone,
  whatsapp: r.whatsapp || r.business_whatsapp,
  whatsapp_country_code: r.whatsapp_country_code,
  email: r.email || r.business_email,
  business_email: r.business_email || r.email,
  website: r.website || r.website_url,
  website_url: r.website_url || r.website,
  booking_url: r.booking_url,
  card_url: r.card_url,
  vcard_url: r.vcard_url,
  similarity: r.similarity,
  cluster_boost: r.cluster_boost,
});

// Intent button definitions
const INTENTS = [
  {
    id: 'WHO_IS_INTO',
    label: 'Who is into?',
    icon: Search,
    prompt: 'What service or product are you looking for?',
    description: 'Find members by service/product'
  },
  {
    id: 'FIND_BY_SEGMENT',
    label: 'Find by segment',
    icon: Users,
    prompt: 'Which industry or segment are you interested in?',
    description: 'Browse by industry category'
  },
  {
    id: 'MEMBER_LOOKUP',
    label: 'Member lookup',
    icon: Building2,
    prompt: 'Enter the business or person name',
    description: 'Search by name'
  },
  {
    id: 'ABOUT_GROUP',
    label: 'About group',
    icon: Info,
    prompt: null,
    description: 'Learn about BBB Bagyanagar'
  }
];

const VaNiChatPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Get groupId from URL query param (passed from GroupsListPage)
  const urlGroupId = searchParams.get('groupId');

  // State
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [groupActivated, setGroupActivated] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat on mount
  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    // Prevent double initialization (React StrictMode)
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setIsInitializing(true);
    try {
      // Step 1: Get or create session (this ensures we always have group_id)
      console.log('🔄 Getting/creating session...');
      const sessionResponse = await chatService.getSession('chat');

      // ALWAYS set session if returned (needed for group_id in all API calls)
      if (sessionResponse.success && sessionResponse.session) {
        setSession(sessionResponse.session);
        console.log('✅ Session obtained:', {
          session_id: sessionResponse.session.id,
          group_id: sessionResponse.session.group_id,
          intent_state: sessionResponse.session.intent_state
        });
      }

      // Step 2: Check if session is active (has ongoing conversation)
      const isSessionActive = sessionResponse.success &&
        sessionResponse.session &&
        sessionResponse.session.intent_state === 'active';

      if (isSessionActive) {
        // Step 2: Session IS active - show welcome back message
        const groupName = sessionResponse.session?.group_name || 'BBB Bhagyanagar';
        addBotMessage(
          `Welcome back! Your session with **${groupName}** is still active.\n\nHow can I help you today?`,
          { responseType: 'welcome' }
        );
        setGroupActivated(true);
      } else {
        // Step 3: No active session - show VaNi intro and ask for "Hi BBB"
        console.log('📋 No active session, showing intro...');
        addBotMessage(
          `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nHow can I help you today?\n\n- To start conversation: **'Hi BBB'**\n- To end conversation: **'Bye'**`,
          { responseType: 'welcome' }
        );
        // Pre-fill input with "Hi BBB" for easy start
        setInputValue('Hi BBB');
        // Enable input so user can type and send "Hi BBB"
        setGroupActivated(true);
      }
    } catch (error) {
      console.error('Error getting session:', error);
      // Show VaNi intro on error - let user try "Hi BBB"
      addBotMessage(
        `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nHow can I help you today?\n\n- To start conversation: **'Hi BBB'**\n- To end conversation: **'Bye'**`,
        { responseType: 'welcome' }
      );
      setInputValue('Hi BBB');
      // Enable input so user can type
      setGroupActivated(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const addBotMessage = (
    content: string,
    options?: {
      results?: SearchResult[];
      segments?: SegmentResult[];
      responseType?: AIAgentResponseType;
      detailLevel?: AIAgentDetailLevel;
      fromCache?: boolean;
      availableIntents?: AvailableIntent[];
      options?: OptionsConfig;
      contactActions?: ContactAction[];
    }
  ) => {
    const message: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content,
      timestamp: new Date(),
      results: options?.results,
      segments: options?.segments,
      responseType: options?.responseType,
      detailLevel: options?.detailLevel,
      fromCache: options?.fromCache,
      availableIntents: options?.availableIntents,
      options: options?.options,
      contactActions: options?.contactActions
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleIntentClick = async (intent: typeof INTENTS[0]) => {
    if (!session) return;

    setCurrentIntent(intent.id);

    if (intent.id === 'ABOUT_GROUP') {
      // Show group info directly
      addBotMessage(`BBB Bagyanagar is part of the Bagyanagar Business Network.\n\n• 45+ verified entrepreneurs\n• AI-powered member search\n• Semantic clustering for better discovery\n• WhatsApp integration with "Hi BBB"\n\nUse the search buttons above to find members!`, { responseType: 'conversation' });
      setCurrentIntent(null);
      return;
    }

    try {
      await chatService.setIntent({
        session_id: session.id,
        intent: intent.id,
        prompt: intent.prompt || undefined
      });

      addBotMessage(intent.prompt || 'What are you looking for?', { responseType: 'conversation' });
    } catch (error) {
      console.error('Error setting intent:', error);
      toast.error('Failed to set intent');
    }
  };

  const handleSearch = async () => {
    if (!inputValue.trim()) return;

    const query = inputValue.trim();
    setInputValue('');
    addUserMessage(query);
    setIsLoading(true);

    try {
      // Use Group Discovery API with intent detection
      // Use session group_id, fallback to URL groupId param
      const groupId = session?.group_id || urlGroupId || undefined;
      const response = await aiAgentService.chat(query, groupId, session?.id);

      if (aiAgentService.isSuccess(response)) {
        // Check if this is a "Hi BBB" activation or "Bye" goodbye
        const isHiBBB = query.toLowerCase().includes('hi bbb');
        const isBye = query.toLowerCase() === 'bye' || query.toLowerCase().includes('bye bbb');

        // Update session info if returned from N8N
        if (response.session_id) {
          setSession(prev => ({
            id: response.session_id!,
            group_id: response.group_id || prev?.group_id || null,
            group_name: response.group_name || prev?.group_name || 'BBB Bhagyanagar',
            intent_state: isBye ? 'inactive' : 'active',
            current_intent: null,
            expires_at: prev?.expires_at || ''
          }));
        }

        // Step 4: Activate group if this was a "Hi BBB" trigger
        if (isHiBBB && !groupActivated) {
          setGroupActivated(true);
          console.log('✅ Group activated via "Hi BBB"');
        }

        // Step 5: Handle "Bye" - thank user but keep input enabled for new session
        if (isBye) {
          console.log('👋 Session ended via "Bye" - input remains enabled for new session');
          // Show N8N's goodbye message with available_intents for restart
          addBotMessage(
            response.message || 'Thank you for using VaNi! Goodbye and have a great day. Type **"Hi BBB"** to start a new conversation.',
            {
              responseType: response.response_type || 'goodbye',
              availableIntents: response.available_intents,
              options: response.options,
              contactActions: response.contact_actions
            }
          );
        } else {
          // Use N8N's response_type directly
          const responseType = response.response_type || 'conversation';
          const detailLevel = response.detail_level || 'none';
          const fromCache = response.from_cache || false;

          // Map results if present
          const mappedResults = response.results?.map(mapApiResult);

          // For segments_list, use results directly if options not provided
          let segments = response.segments;
          if (responseType === 'segments_list' && !segments && response.results) {
            segments = response.results as unknown as AIAgentSegmentResult[];
          }

          // Add bot message with appropriate data based on response_type
          addBotMessage(response.message || 'How can I help you?', {
            results: mappedResults,
            segments,
            responseType,
            detailLevel,
            fromCache,
            availableIntents: response.available_intents,
            options: response.options,
            contactActions: response.contact_actions
          });
        }
      } else {
        // Error response
        addBotMessage(response.message || 'Sorry, I couldn\'t process your request. Please try again.');
      }
    } catch (error) {
      console.error('Error with AI Agent:', error);
      addBotMessage('Something went wrong. Please try again.');
      toast.error('Request failed');
    } finally {
      setIsLoading(false);
      setCurrentIntent(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleNewSearch = () => {
    setCurrentIntent(null);
    addBotMessage('What would you like to search for?', { responseType: 'conversation' });
  };

  /**
   * Handle "Get Details" button click - sends membership_id to API
   */
  const handleGetDetails = async (result: SearchResult) => {
    const groupId = session?.group_id || urlGroupId;
    if (!groupId) {
      toast.error('Group ID is required');
      return;
    }

    addUserMessage(`Get details for ${result.business_name}`);
    setIsLoading(true);

    try {
      // Use getContact method with membership_id
      const response = await aiAgentService.getContact(
        groupId,
        { membership_id: result.membership_id },
        session?.id
      );

      if (aiAgentService.isSuccess(response)) {
        const mappedResults = response.results?.map(mapApiResult);

        addBotMessage(response.message || `Here are the details for ${result.business_name}:`, {
          results: mappedResults,
          responseType: response.response_type || 'contact_details',
          detailLevel: response.detail_level || 'full',
          fromCache: response.from_cache,
          availableIntents: response.available_intents,
          options: response.options,
          contactActions: response.contact_actions
        });
      } else {
        addBotMessage(response.message || 'Failed to get contact details. Please try again.');
      }
    } catch (error) {
      console.error('Error getting details:', error);
      addBotMessage('Something went wrong. Please try again.');
      toast.error('Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle quick action button clicks (call, whatsapp, email, etc.)
   */
  const handleQuickAction = (type: string, result: SearchResult) => {
    switch (type) {
      case 'call': {
        const phone = result.phone || result.business_phone;
        if (phone) window.open(`tel:${phone}`, '_self');
        break;
      }

      case 'whatsapp': {
        const waNumber = normalizeWhatsApp(result.whatsapp || result.phone || result.business_phone);
        if (waNumber) window.open(`https://wa.me/${waNumber}`, '_blank');
        break;
      }

      case 'email': {
        const email = result.email || result.business_email;
        if (email) window.open(`mailto:${email}`, '_self');
        break;
      }

      case 'website': {
        const url = result.website || result.website_url;
        if (url) {
          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
          window.open(fullUrl, '_blank');
        }
        break;
      }

      case 'book':
        if (result.booking_url) window.open(result.booking_url, '_blank');
        break;

      case 'location': {
        const address = result.full_address || result.address || result.city;
        if (address) window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
        break;
      }

      case 'view_card':
        if (result.card_url) window.open(result.card_url, '_blank');
        break;

      case 'save_contact':
        if (result.vcard_url) window.location.href = result.vcard_url;
        break;

      case 'share':
        if (navigator.share && result.card_url) {
          navigator.share({
            title: result.business_name,
            text: result.short_description || result.ai_enhanced_description || '',
            url: result.card_url
          }).catch(() => {
            // Fallback to clipboard
            navigator.clipboard.writeText(result.card_url || '');
            toast.success('Link copied to clipboard!');
          });
        } else if (result.card_url) {
          navigator.clipboard.writeText(result.card_url);
          toast.success('Link copied to clipboard!');
        }
        break;
    }
  };

  /**
   * Handle "View Members" click from segment list
   */
  const handleViewMembers = (segment: SegmentResult) => {
    const groupId = session?.group_id || urlGroupId;
    if (!groupId) {
      toast.error('Group ID is required');
      return;
    }

    addUserMessage(`Show members in ${segment.segment_name}`);
    setIsLoading(true);

    // Use listMembers method with segment name
    aiAgentService.listMembers(groupId, segment.segment_name, session?.id)
      .then(response => {
        if (aiAgentService.isSuccess(response)) {
          const mappedResults = response.results?.map(mapApiResult);
          addBotMessage(response.message || `Members in ${segment.segment_name}:`, {
            results: mappedResults,
            responseType: response.response_type || 'search_results',
            detailLevel: response.detail_level || 'summary',
            fromCache: response.from_cache,
            availableIntents: response.available_intents,
            options: response.options,
            contactActions: response.contact_actions
          });
        } else {
          addBotMessage(response.message || 'No members found in this segment.');
        }
      })
      .catch(error => {
        console.error('Error fetching members:', error);
        addBotMessage('Failed to load members. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Render search result card
  const renderResultCard = (result: SearchResult, index: number) => {
    // Similarity is now 0-100 from API, no need to multiply
    const matchPercent = result.similarity ? Math.round(result.similarity) : null;
    const matchColor = getMatchColor(result.similarity);

    // Get values with backward compatibility
    const industry = result.industry || result.business_category;
    const phone = result.phone || result.business_phone;
    const email = result.email || result.business_email;
    const website = result.website || result.website_url;
    const description = result.short_description || result.ai_enhanced_description;
    const whatsapp = result.whatsapp;

    return (
      <div
        key={result.membership_id || index}
        className="p-4 rounded-lg transition-all hover:shadow-md"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            {/* Logo with fallback */}
            <img
              src={getLogoUrl(result)}
              alt={result.business_name}
              className="w-10 h-10 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.business_name)}&background=667eea&color=fff`;
              }}
            />
            <div>
              <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                {result.business_name}
              </h4>
              <div className="flex flex-wrap gap-1">
                {industry && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${colors.semantic.success}20`,
                      color: colors.semantic.success
                    }}
                  >
                    {industry}
                  </span>
                )}
                {result.chapter && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${colors.semantic.info}20`,
                      color: colors.semantic.info
                    }}
                  >
                    {result.chapter}
                  </span>
                )}
              </div>
            </div>
          </div>
          {matchPercent !== null && (
            <div
              className="text-sm font-bold px-2 py-1 rounded"
              style={{
                backgroundColor: `${matchColor}20`,
                color: matchColor
              }}
            >
              {matchPercent}% match
            </div>
          )}
        </div>

        {description && (
          <p
            className="text-sm mb-3 line-clamp-2"
            style={{ color: colors.utility.secondaryText }}
          >
            {description}
          </p>
        )}

        {/* Contact Info Row */}
        <div className="flex flex-wrap gap-3 text-sm mb-3">
          {result.city && (
            <div className="flex items-center space-x-1" style={{ color: colors.utility.secondaryText }}>
              <MapPin className="w-3 h-3" />
              <span>{result.city}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center space-x-1" style={{ color: colors.utility.secondaryText }}>
              <Phone className="w-3 h-3" />
              <span>{phone}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
          {phone && (
            <button
              onClick={() => handleQuickAction('call', result)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: `${colors.semantic.success}15`,
                color: colors.semantic.success,
                border: `1px solid ${colors.semantic.success}30`
              }}
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </button>
          )}
          {whatsapp && (
            <button
              onClick={() => handleQuickAction('whatsapp', result)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: '#25d36615',
                color: '#25d366',
                border: '1px solid #25d36630'
              }}
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          )}
          {email && (
            <button
              onClick={() => handleQuickAction('email', result)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: `${colors.semantic.warning}15`,
                color: colors.semantic.warning,
                border: `1px solid ${colors.semantic.warning}30`
              }}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
          )}
          {website && (
            <button
              onClick={() => handleQuickAction('website', result)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: `${colors.semantic.info}15`,
                color: colors.semantic.info,
                border: `1px solid ${colors.semantic.info}30`
              }}
            >
              <Globe className="w-3 h-3" />
              <span>Website</span>
            </button>
          )}
          {result.booking_url && (
            <button
              onClick={() => handleQuickAction('book', result)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: '#3b82f615',
                color: '#3b82f6',
                border: '1px solid #3b82f630'
              }}
            >
              <Calendar className="w-3 h-3" />
              <span>Book</span>
            </button>
          )}
        </div>

        {/* Get Full Details Button - Fixed to use membership_id */}
        <button
          onClick={() => handleGetDetails(result)}
          className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`,
            color: '#FFF'
          }}
        >
          <Phone className="w-4 h-4" />
          <span>Get Full Details</span>
        </button>
      </div>
    );
  };

  // Render contact detail card (full details view)
  const renderContactDetailCard = (result: SearchResult) => {
    const phone = result.phone || result.business_phone;
    const email = result.email || result.business_email;
    const website = result.website || result.website_url;
    const description = result.ai_enhanced_description || result.short_description;
    const industry = result.industry || result.business_category;
    const address = result.full_address || result.address;

    return (
      <div
        key={result.membership_id}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        {/* Header with Logo */}
        <div
          className="p-6 text-center"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`
          }}
        >
          <img
            src={getLogoUrl(result)}
            alt={result.business_name}
            className="w-20 h-20 rounded-xl object-cover mx-auto mb-3"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.business_name)}&size=120&background=667eea&color=fff`;
            }}
          />
          <h3 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
            {result.business_name}
          </h3>
          {industry && (
            <span
              className="inline-block mt-2 text-xs px-3 py-1 rounded-full"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.secondaryText
              }}
            >
              {industry}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="px-6 py-4 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {description}
            </p>
          </div>
        )}

        {/* Contact Details List */}
        <div className="divide-y" style={{ borderColor: `${colors.utility.primaryText}10` }}>
          {phone && (
            <button
              onClick={() => handleQuickAction('call', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5" style={{ color: colors.semantic.success }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Phone</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {result.phone_country_code || '+91'} {phone}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}

          {result.whatsapp && (
            <button
              onClick={() => handleQuickAction('whatsapp', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5" style={{ color: '#25d366' }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>WhatsApp</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {result.whatsapp_country_code || '+91'} {result.whatsapp}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}

          {email && (
            <button
              onClick={() => handleQuickAction('email', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5" style={{ color: colors.semantic.warning }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Email</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>{email}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}

          {website && (
            <button
              onClick={() => handleQuickAction('website', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5" style={{ color: colors.semantic.info }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Website</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {website.replace(/^https?:\/\//, '')}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}

          {result.booking_url && (
            <button
              onClick={() => handleQuickAction('book', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5" style={{ color: '#3b82f6' }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Book Meeting</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>Schedule Now</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}

          {(address || result.city) && (
            <button
              onClick={() => handleQuickAction('location', result)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5" style={{ color: colors.brand.primary }} />
                <div className="text-left">
                  <div className="text-xs" style={{ color: colors.utility.secondaryText }}>Location</div>
                  <div className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {address || result.city}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {(result.card_url || result.vcard_url) && (
          <div className="p-4 flex flex-wrap gap-2 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
            {result.card_url && (
              <button
                onClick={() => handleQuickAction('view_card', result)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${colors.brand.primary}15`,
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}30`
                }}
              >
                <CreditCard className="w-4 h-4" />
                <span>View Card</span>
              </button>
            )}
            {result.vcard_url && (
              <button
                onClick={() => handleQuickAction('save_contact', result)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${colors.semantic.success}15`,
                  color: colors.semantic.success,
                  border: `1px solid ${colors.semantic.success}30`
                }}
              >
                <Download className="w-4 h-4" />
                <span>Save Contact</span>
              </button>
            )}
            {result.card_url && (
              <button
                onClick={() => handleQuickAction('share', result)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${colors.semantic.info}15`,
                  color: colors.semantic.info,
                  border: `1px solid ${colors.semantic.info}30`
                }}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render segment/industry list card (chip style)
  const renderSegmentListCard = (segment: SegmentResult, index: number) => {
    return (
      <button
        key={segment.segment_name || index}
        onClick={() => handleViewMembers(segment)}
        className="flex items-center justify-between p-4 rounded-lg transition-all hover:shadow-md cursor-pointer"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <div className="text-left">
          <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
            {segment.segment_name}
          </h4>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {segment.member_count} member{segment.member_count !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: `${colors.brand.primary}15`,
            color: colors.brand.primary,
          }}
        >
          <Users className="w-4 h-4" />
          <span>View</span>
        </div>
      </button>
    );
  };

  // Handle dynamic intent button click
  const handleDynamicIntent = async (intent: AvailableIntent) => {
    const groupId = session?.group_id || urlGroupId;
    if (!groupId) {
      toast.error('Group ID is required');
      return;
    }

    if (intent.requires_input) {
      // Show input prompt
      setInputValue('');
      addBotMessage(intent.input_placeholder || 'What are you looking for?', { responseType: 'conversation' });
      // Focus input field
      return;
    }

    // Direct action - send intent
    addUserMessage(intent.label);
    setIsLoading(true);

    try {
      const response = await aiAgentService.sendRequest({
        intent: intent.id as any,
        group_id: groupId,
        channel: 'chat',
        session_id: session?.id
      });

      if (aiAgentService.isSuccess(response)) {
        const mappedResults = response.results?.map(mapApiResult);
        let segments = response.segments;
        if (response.response_type === 'segments_list' && !segments && response.results) {
          segments = response.results as unknown as AIAgentSegmentResult[];
        }

        addBotMessage(response.message || 'Here you go:', {
          results: mappedResults,
          segments,
          responseType: response.response_type,
          detailLevel: response.detail_level,
          fromCache: response.from_cache,
          availableIntents: response.available_intents,
          options: response.options,
          contactActions: response.contact_actions
        });
      } else {
        addBotMessage(response.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Error with dynamic intent:', error);
      addBotMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle option item click (from options.items)
  const handleOptionClick = async (options: OptionsConfig, item: OptionItem) => {
    const groupId = session?.group_id || urlGroupId;
    if (!groupId) {
      toast.error('Group ID is required');
      return;
    }

    addUserMessage(item.label);
    setIsLoading(true);

    try {
      const response = await aiAgentService.sendRequest({
        intent: options.intent as any,
        group_id: groupId,
        channel: 'chat',
        session_id: session?.id,
        segment: item.value,
        membership_id: item.value
      });

      if (aiAgentService.isSuccess(response)) {
        const mappedResults = response.results?.map(mapApiResult);
        addBotMessage(response.message || `Here are the results for ${item.label}:`, {
          results: mappedResults,
          responseType: response.response_type,
          detailLevel: response.detail_level,
          fromCache: response.from_cache,
          availableIntents: response.available_intents,
          options: response.options,
          contactActions: response.contact_actions
        });
      } else {
        addBotMessage(response.message || 'No results found.');
      }
    } catch (error) {
      console.error('Error with option click:', error);
      addBotMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle contact action click
  const handleContactAction = (action: ContactAction) => {
    switch (action.type) {
      case 'call':
        window.location.href = `tel:${action.value}`;
        break;
      case 'whatsapp':
        window.open(`https://wa.me/${action.value.replace(/[^0-9]/g, '')}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:${action.value}`;
        break;
      case 'website':
        window.open(action.value.startsWith('http') ? action.value : `https://${action.value}`, '_blank');
        break;
      case 'vcard':
        window.location.href = action.value;
        break;
      case 'booking':
        window.open(action.value, '_blank');
        break;
    }
  };

  // Render dynamic available_intents buttons
  const renderAvailableIntents = (intents: AvailableIntent[]) => {
    if (!intents || intents.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {intents.map((intent, idx) => (
          <button
            key={intent.id || idx}
            onClick={() => handleDynamicIntent(intent)}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.brand.primary}30`,
              color: colors.utility.primaryText
            }}
          >
            <span>{intent.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Render dynamic options (industry/member pills)
  const renderOptions = (options: OptionsConfig) => {
    if (!options || !options.items || options.items.length === 0) return null;

    return (
      <div className="mt-3">
        {options.prompt && (
          <p className="text-sm mb-2" style={{ color: colors.utility.secondaryText }}>
            {options.prompt}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.items.map((item, idx) => (
            <button
              key={item.value || idx}
              onClick={() => handleOptionClick(options, item)}
              disabled={isLoading}
              className="flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}15`
              }}
            >
              <div className="text-left">
                <h4 className="font-medium" style={{ color: colors.utility.primaryText }}>
                  {item.label}
                </h4>
                {item.subtitle && (
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    {item.subtitle}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render dynamic contact actions
  const renderContactActions = (actions: ContactAction[]) => {
    if (!actions || actions.length === 0) return null;

    const getActionIcon = (type: string) => {
      switch (type) {
        case 'call': return <Phone className="w-4 h-4" />;
        case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
        case 'email': return <Mail className="w-4 h-4" />;
        case 'website': return <Globe className="w-4 h-4" />;
        case 'vcard': return <Download className="w-4 h-4" />;
        case 'booking': return <Calendar className="w-4 h-4" />;
        default: return <ExternalLink className="w-4 h-4" />;
      }
    };

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {actions.map((action, idx) => (
          <button
            key={`${action.type}-${idx}`}
            onClick={() => handleContactAction(action)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
            style={{
              backgroundColor: `${colors.brand.primary}15`,
              color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}30`
            }}
          >
            {getActionIcon(action.type)}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Render Intent Buttons panel (fallback when no dynamic intents)
  const renderIntentButtons = () => {
    const groupId = session?.group_id || urlGroupId;

    return (
      <div className="flex justify-start mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8" />
          <div className="space-y-2">
            <p className="text-sm mb-2" style={{ color: colors.utility.secondaryText }}>
              What would you like to do?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setInputValue('');
                  addBotMessage('What are you looking for?', { responseType: 'conversation' });
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.brand.primary}30`,
                  color: colors.utility.primaryText
                }}
              >
                <Search className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span>Search Businesses</span>
              </button>
              <button
                onClick={() => {
                  if (!groupId) {
                    toast.error('Group ID is required');
                    return;
                  }
                  addUserMessage('Browse Industries');
                  setIsLoading(true);
                  // Use listSegments method
                  aiAgentService.listSegments(groupId, session?.id)
                    .then(response => {
                      if (aiAgentService.isSuccess(response)) {
                        // Segments come directly from response.results for segments_list type
                        const segments = response.response_type === 'segments_list'
                          ? response.results as unknown as SegmentResult[]
                          : response.segments;
                        addBotMessage(response.message || 'Here are the available industries:', {
                          segments: segments,
                          responseType: response.response_type || 'segments_list',
                          detailLevel: response.detail_level || 'list'
                        });
                      } else {
                        addBotMessage(response.message || 'No industries found.');
                      }
                    })
                    .finally(() => setIsLoading(false));
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.brand.primary}30`,
                  color: colors.utility.primaryText
                }}
              >
                <Users className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span>Browse Industries</span>
              </button>
              <button
                onClick={() => {
                  if (!groupId) {
                    toast.error('Group ID is required');
                    return;
                  }
                  addUserMessage('View All Members');
                  setIsLoading(true);
                  // Use search method with 'all' query
                  aiAgentService.search(groupId, 'all', session?.id)
                    .then(response => {
                      if (aiAgentService.isSuccess(response)) {
                        const mappedResults = response.results?.map(mapApiResult);
                        addBotMessage(response.message || 'Here are all members:', {
                          results: mappedResults,
                          responseType: response.response_type || 'search_results',
                          detailLevel: response.detail_level || 'summary',
                          fromCache: response.from_cache
                        });
                      } else {
                        addBotMessage(response.message || 'No members found.');
                      }
                    })
                    .finally(() => setIsLoading(false));
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.brand.primary}30`,
                  color: colors.utility.primaryText
                }}
              >
                <Building2 className="w-4 h-4" style={{ color: colors.brand.primary }} />
                <span>View All Members</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render message
  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <div key={message.id} className="flex justify-end mb-4">
          <div
            className="max-w-md px-4 py-2 rounded-lg rounded-br-none"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#FFF'
            }}
          >
            {message.content}
          </div>
        </div>
      );
    }

    // Bot message - render based on response_type from N8N
    const responseType = message.responseType;
    const hasResults = message.results && message.results.length > 0;
    const hasSegments = message.segments && message.segments.length > 0;

    return (
      <div key={message.id} className="flex justify-start mb-4">
        <div className="flex items-start space-x-3 max-w-2xl">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}20` }}
          >
            <Bot className="w-4 h-4" style={{ color: colors.brand.primary }} />
          </div>
          <div className="flex-1">
            {/* Message bubble - always show for welcome/goodbye/conversation, or when there's content */}
            {(responseType === 'welcome' || responseType === 'goodbye' || responseType === 'conversation' || message.content) && (
              <div
                className="px-4 py-2 rounded-lg rounded-bl-none"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}15`
                }}
              >
                {renderMarkdown(message.content)}
              </div>
            )}

            {/* Search Results - Multiple mini cards */}
            {/* Show cards whenever results exist */}
            {hasResults && (
              <div className="mt-3 space-y-3">
                {message.results!.map((result, idx) => renderResultCard(result, idx))}

                {/* Cache info */}
                {message.fromCache && (
                  <div
                    className="flex items-center space-x-2 text-xs px-3 py-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Database className="w-3 h-3" />
                    <span>Results from cache</span>
                  </div>
                )}

                {/* Search again button */}
                <button
                  onClick={handleNewSearch}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{
                    backgroundColor: `${colors.brand.primary}15`,
                    color: colors.brand.primary,
                    border: `1px solid ${colors.brand.primary}30`
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Search again</span>
                </button>
              </div>
            )}

            {/* Contact Details - Full card for single result */}
            {responseType === 'contact_details' && hasResults && (
              <div className="mt-3">
                {renderContactDetailCard(message.results![0])}
              </div>
            )}

            {/* Segments List - Chips/cards for industries */}
            {responseType === 'segments_list' && hasSegments && (
              <div className="mt-3 space-y-2">
                {message.segments!.map((segment, idx) => renderSegmentListCard(segment, idx))}
              </div>
            )}

            {/* Dynamic Options from N8N (alternative to segments) */}
            {message.options && renderOptions(message.options)}

            {/* Dynamic Contact Actions from N8N */}
            {message.contactActions && renderContactActions(message.contactActions)}

            {/* Dynamic Available Intents from N8N */}
            {message.availableIntents && renderAvailableIntents(message.availableIntents)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.utility.primaryBackground }}>
      {/* Centered Chat Container */}
      <div className="max-w-2xl mx-auto w-full flex flex-col min-h-screen">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
        >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/settings/configure/customer-channels/groups')}
            className="flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors hover:opacity-80"
            style={{
              borderColor: `${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                VaNi Chat
              </h1>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {session?.group_name || 'BBB Bagyanagar'} • AI-Powered Search
              </p>
            </div>
          </div>
        </div>

        {session && (
          <div
            className="flex items-center space-x-2 text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            <Clock className="w-4 h-4" />
            <span>Session active</span>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isInitializing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2
                className="w-12 h-12 mx-auto mb-4 animate-spin"
                style={{ color: colors.brand.primary }}
              />
              <p style={{ color: colors.utility.secondaryText }}>
                Connecting to VaNi...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            {messages.map(renderMessage)}

            {/* Intent Buttons - Show after welcome message when not loading */}
            {groupActivated && !isLoading && messages.length <= 2 && renderIntentButtons()}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${colors.brand.primary}20` }}
                  >
                    <Bot className="w-4 h-4" style={{ color: colors.brand.primary }} />
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg flex items-center space-x-2"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      border: `1px solid ${colors.utility.primaryText}15`
                    }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.brand.primary }} />
                    <span style={{ color: colors.utility.secondaryText }}>VaNi is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div
        className="p-4 border-t"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || isInitializing || !groupActivated}
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              borderColor: `${colors.utility.secondaryText}40`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              // @ts-ignore
              '--tw-ring-color': colors.brand.primary
            }}
          />
          <button
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading || isInitializing || !groupActivated}
            className="p-3 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Intent indicator - Hidden: N8N handles intents internally */}
        {/* {currentIntent && (
          <div
            className="mt-2 text-sm flex items-center space-x-2"
            style={{ color: colors.utility.secondaryText }}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              Intent: {INTENTS.find(i => i.id === currentIntent)?.label}
            </span>
            <button
              onClick={() => setCurrentIntent(null)}
              className="text-xs underline hover:opacity-80"
              style={{ color: colors.brand.primary }}
            >
              Clear
            </button>
          </div>
        )} */}
      </div>
      </div> {/* End Centered Chat Container */}
    </div>
  );
};

export default VaNiChatPage;
