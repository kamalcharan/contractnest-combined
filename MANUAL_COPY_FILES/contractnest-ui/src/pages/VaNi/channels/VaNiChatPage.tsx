  // src/pages/VaNi/channels/VaNiChatPage.tsx
// VaNi AI Chat - BBB Directory Search with Caching
// Route: /vani/channels/chat

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { aiAgentService, type AIAgentSearchResult, type AIAgentSegmentResult, type AIAgentSuccessResponse, type AIAgentResponseType, type AIAgentDetailLevel } from '../../../services/aiAgentService';

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
  segment_id: string;
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

// BBB Group ID (hardcoded for now - will be dynamic later)
const BBB_GROUP_ID = '550e8400-e29b-41d4-a716-446655440001'; // Replace with actual BBB group ID

const VaNiChatPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

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
      // Step 1: Check if session exists and is active
      console.log('🔄 Checking session status...');
      const sessionResponse = await chatService.getSession('chat');

      if (sessionResponse.success && sessionResponse.session) {
        const existingSession = sessionResponse.session;
        setSession(existingSession);

        console.log('✅ Session found:', {
          session_id: existingSession.id,
          group_id: existingSession.group_id,
          intent_state: existingSession.intent_state
        });

        // Session exists and is active - show welcome back message
        addBotMessage(
          `Hi, I am **VaNi**, your AI assistant.\nWelcome back to **${existingSession.group_name || 'BBB Bhagyanagar'}**!\n\nYour session is active. How can I help you today?`,
          { responseType: 'welcome' }
        );
        setGroupActivated(true);
      } else {
        // No active session - show intro and ask user to say "Hi BBB"
        console.log('📋 No active session, prompting user to start...');
        addBotMessage(
          `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nTo start our conversation, please type **"Hi BBB"** below.\n\n- To start conversation: **'Hi BBB'**\n- To end conversation: **'Bye'**`,
          { responseType: 'welcome' }
        );
        // Pre-fill input with "Hi BBB" for easy start
        setInputValue('Hi BBB');
        // Don't set groupActivated - wait for user to send "Hi BBB"
      }
    } catch (error) {
      console.error('Error checking session:', error);
      // Show welcome on error - let user try "Hi BBB"
      addBotMessage(
        `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nTo start our conversation, please type **"Hi BBB"** below.`,
        { responseType: 'welcome' }
      );
      setInputValue('Hi BBB');
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
      fromCache: options?.fromCache
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
      // Use AI Agent for conversational search
      const response = await aiAgentService.chat(query, session?.group_id || undefined);

      if (aiAgentService.isSuccess(response)) {
        // Check if this is a "Hi BBB" activation response
        const isHiBBB = query.toLowerCase().includes('hi bbb');
        const isNewSession = response.is_new_session;

        // Update session info if returned from N8N
        if (response.session_id) {
          setSession(prev => ({
            id: response.session_id!,
            group_id: response.group_id || prev?.group_id || null,
            group_name: response.group_name || prev?.group_name || 'BBB Bhagyanagar',
            intent_state: 'active',
            current_intent: null,
            expires_at: prev?.expires_at || ''
          }));
        }

        // Activate group if this was a "Hi BBB" trigger
        if (isHiBBB && !groupActivated) {
          setGroupActivated(true);
          console.log('✅ Group activated via "Hi BBB"');
        }

        // Use N8N's response_type directly
        const responseType = response.response_type || 'conversation';
        const detailLevel = response.detail_level || 'none';
        const fromCache = response.from_cache || false;

        // Map results if present
        const mappedResults = response.results?.map(mapApiResult);

        // Add bot message with appropriate data based on response_type
        addBotMessage(response.message || 'How can I help you?', {
          results: mappedResults,
          segments: response.segments,
          responseType,
          detailLevel,
          fromCache
        });
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
    addUserMessage(`Get details for ${result.business_name}`);
    setIsLoading(true);

    try {
      // Pass membership_id in the message for N8N to parse
      const response = await aiAgentService.chat(
        `get details for ${result.membership_id}`,
        session?.group_id || undefined
      );

      if (aiAgentService.isSuccess(response)) {
        const mappedResults = response.results?.map(mapApiResult);

        addBotMessage(response.message || `Here are the details for ${result.business_name}:`, {
          results: mappedResults,
          responseType: response.response_type || 'contact_details',
          detailLevel: response.detail_level || 'full',
          fromCache: response.from_cache
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
    const query = `list members in ${segment.segment_name}`;
    setInputValue('');
    addUserMessage(query);
    setIsLoading(true);

    aiAgentService.chat(query, session?.group_id || undefined)
      .then(response => {
        if (aiAgentService.isSuccess(response)) {
          const mappedResults = response.results?.map(mapApiResult);
          addBotMessage(response.message || `Members in ${segment.segment_name}:`, {
            results: mappedResults,
            responseType: response.response_type || 'search_results',
            detailLevel: response.detail_level || 'summary',
            fromCache: response.from_cache
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

  // Render segment/industry list card
  const renderSegmentListCard = (segment: SegmentResult, index: number) => {
    return (
      <div
        key={segment.segment_id || index}
        className="flex items-center justify-between p-4 rounded-lg transition-all hover:shadow-md"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}15`
        }}
      >
        <div>
          <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
            {segment.segment_name}
          </h4>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            {segment.member_count} member{segment.member_count !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => handleViewMembers(segment)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: `${colors.brand.primary}15`,
            color: colors.brand.primary,
            border: `1px solid ${colors.brand.primary}30`
          }}
        >
          <Users className="w-4 h-4" />
          <span>View Members</span>
        </button>
      </div>
    );
  };

  // Render Intent Buttons panel
  const renderIntentButtons = () => {
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
                  addUserMessage('list industries');
                  setIsLoading(true);
                  aiAgentService.chat('list industries', session?.group_id || undefined)
                    .then(response => {
                      if (aiAgentService.isSuccess(response)) {
                        addBotMessage(response.message || 'Here are the available industries:', {
                          segments: response.segments,
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
                  addUserMessage('list all members');
                  setIsLoading(true);
                  aiAgentService.chat('list all members', session?.group_id || undefined)
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
            {/* Show cards if response_type is 'search_results' OR if response_type is missing but results exist (fallback) */}
            {(responseType === 'search_results' || (!responseType && hasResults)) && hasResults && (
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
