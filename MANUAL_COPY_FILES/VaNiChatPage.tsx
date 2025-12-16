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
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '../../../services/chatService';
import { aiAgentService, type AIAgentSearchResult } from '../../../services/aiAgentService';

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
  cluster_boost?: number;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'results';
  content: string;
  timestamp: Date;
  results?: SearchResult[];
  fromCache?: boolean;
  cacheHitCount?: number;
}

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
      // Get or create session (for tracking purposes)
      const sessionResponse = await chatService.getSession();
      if (sessionResponse.success && sessionResponse.session) {
        setSession(sessionResponse.session);
      }

      // Show welcome message with clear instructions
      // N8N will handle the actual conversation once user sends "Hi BBB"
      addBotMessage(
        `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nHow can I help you today?\n\n- To start conversation: **'Hi BBB'**\n- To end conversation: **'Bye'**`
      );

      // Pre-fill input with "Hi BBB" for easy start
      setInputValue('Hi BBB');
      setGroupActivated(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Show welcome even on error
      addBotMessage(
        `Hi, I am **VaNi**, your AI assistant.\nWelcome to **BBB Bhagyanagar**!\n\nHow can I help you today?\n\n- To start conversation: **'Hi BBB'**\n- To end conversation: **'Bye'**`
      );
      setInputValue('Hi BBB');
      setGroupActivated(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const addBotMessage = (content: string, results?: SearchResult[], fromCache?: boolean, cacheHitCount?: number) => {
    const message: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: results ? 'results' : 'bot',
      content,
      timestamp: new Date(),
      results,
      fromCache,
      cacheHitCount
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
      addBotMessage(`BBB Bagyanagar is part of the Bagyanagar Business Network.\n\n• 45+ verified entrepreneurs\n• AI-powered member search\n• Semantic clustering for better discovery\n• WhatsApp integration with "Hi BBB"\n\nUse the search buttons above to find members!`);
      setCurrentIntent(null);
      return;
    }

    try {
      await chatService.setIntent({
        session_id: session.id,
        intent: intent.id,
        prompt: intent.prompt || undefined
      });

      addBotMessage(intent.prompt || 'What are you looking for?');
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
        // AI Agent returns a natural language message AND optional results
        const resultCount = response.results_count || 0;
        const fromCache = response.from_cache || false;

        if (resultCount > 0 && response.results) {
          // Map AI Agent results to SearchResult format
          const mappedResults: SearchResult[] = response.results.map(r => ({
            membership_id: r.membership_id,
            tenant_id: r.tenant_id,
            business_name: r.business_name,
            business_category: r.business_category,
            city: r.city,
            chapter: r.chapter,
            business_phone: r.business_phone,
            business_email: r.business_email,
            website_url: r.website_url,
            ai_enhanced_description: r.ai_enhanced_description,
            similarity: r.similarity
          }));

          addBotMessage(
            response.message || `Found ${resultCount} member${resultCount > 1 ? 's' : ''}:`,
            mappedResults,
            fromCache
          );
        } else {
          // Just show the AI message (no results)
          addBotMessage(response.message);
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
    addBotMessage('What would you like to search for?');
  };

  // Render search result card
  const renderResultCard = (result: SearchResult, index: number) => {
    // Calculate match percent if similarity is available
    const matchPercent = result.similarity
      ? Math.round((result.similarity + (result.cluster_boost || 0)) * 100)
      : null;

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
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.brand.primary}20` }}
            >
              <Building2 className="w-5 h-5" style={{ color: colors.brand.primary }} />
            </div>
            <div>
              <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                {result.business_name}
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.business_category && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${colors.semantic.success}20`,
                      color: colors.semantic.success
                    }}
                  >
                    {result.business_category}
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
                backgroundColor: `${colors.brand.primary}20`,
              color: colors.brand.primary
            }}
          >
            {matchPercent}% match
          </div>
          )}
        </div>

        {result.ai_enhanced_description && (
          <p
            className="text-sm mb-3 line-clamp-2"
            style={{ color: colors.utility.secondaryText }}
          >
            {result.ai_enhanced_description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          {result.city && (
            <div className="flex items-center space-x-1" style={{ color: colors.utility.secondaryText }}>
              <MapPin className="w-3 h-3" />
              <span>{result.city}</span>
            </div>
          )}
          {result.business_phone && (
            <a
              href={`tel:${result.business_phone}`}
              className="flex items-center space-x-1 hover:underline"
              style={{ color: colors.semantic.info }}
            >
              <Phone className="w-3 h-3" />
              <span>{result.business_phone}</span>
            </a>
          )}
          {result.business_email && (
            <a
              href={`mailto:${result.business_email}`}
              className="flex items-center space-x-1 hover:underline"
              style={{ color: colors.semantic.warning }}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </a>
          )}
          {result.website_url && (
            <a
              href={result.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:underline"
              style={{ color: colors.brand.secondary }}
            >
              <Globe className="w-3 h-3" />
              <span>Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
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

            {/* Search results */}
            {message.results && message.results.length > 0 && (
              <div className="mt-3 space-y-3">
                {message.results.map((result, idx) => renderResultCard(result, idx))}

                {/* Cache info */}
                {message.fromCache && (
                  <div
                    className="flex items-center space-x-2 text-xs px-3 py-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <Database className="w-3 h-3" />
                    <span>Results from cache (hit #{message.cacheHitCount})</span>
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

            {/* Intent Buttons - Hidden: N8N AI Agent shows its own menu after "Hi BBB" */}
            {/* To re-enable local intent buttons, uncomment below and set showIntentButtons state */}
            {/* {groupActivated && !currentIntent && !isLoading && showIntentButtons && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8" />
                  <div className="grid grid-cols-2 gap-3">
                    {INTENTS.map((intent) => {
                      const Icon = intent.icon;
                      return (
                        <button
                          key={intent.id}
                          onClick={() => handleIntentClick(intent)}
                          className="flex items-center space-x-2 px-4 py-3 rounded-lg text-left transition-all hover:shadow-md transform hover:scale-102"
                          style={{
                            backgroundColor: colors.utility.secondaryBackground,
                            border: `1px solid ${colors.brand.primary}30`,
                            color: colors.utility.primaryText
                          }}
                        >
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${colors.brand.primary}15` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: colors.brand.primary }} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{intent.label}</div>
                            <div
                              className="text-xs"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {intent.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )} */}

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
