// src/pages/VaNi/TenantProfilesPage.tsx
// NLP-based Tenant Profiles Dashboard with Intent Cards

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Search,
  Users,
  Building2,
  ArrowRight,
  Loader2,
  Sparkles,
  ShoppingCart,
  Store,
  Mail,
  MapPin,
  Tag,
  RefreshCw
} from 'lucide-react';
import { useGroups } from '../../hooks/queries/useGroupQueries';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface TenantStats {
  total_tenants: number;
  by_group: { group_id: string; group_name: string; count: number }[];
  by_industry: { industry_id: string; industry_name: string; count: number }[];
  by_profile_type: { buyers: number; sellers: number; both: number };
}

interface SearchResult {
  membership_id: string;
  tenant_id: string;
  group_id: string;
  group_name: string;
  business_name: string;
  business_email: string | null;
  mobile_number: string | null;
  city: string | null;
  industry: string | null;
  profile_snippet: string;
  ai_enhanced_description: string;
  approved_keywords: string[];
  similarity: number;
  logo_url?: string;
}

interface IntentCard {
  id: string;
  label: string;
  icon: React.ReactNode;
  query: string;
  color: string;
}

// ============================================
// COMPONENT
// ============================================

const TenantProfilesPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);

  // Get groups for context
  const { data: groups } = useGroups();
  const defaultGroupId = groups?.[0]?.id;

  // Intent cards (pre-defined NLP queries)
  const intentCards: IntentCard[] = [
    {
      id: 'all_tenants',
      label: 'All Tenants',
      icon: <Users className="w-5 h-5" />,
      query: 'Show all tenant profiles',
      color: colors.brand.primary
    },
    {
      id: 'by_group',
      label: 'By Group',
      icon: <Building2 className="w-5 h-5" />,
      query: 'Show tenants grouped by their business group',
      color: colors.semantic.info
    },
    {
      id: 'buyers',
      label: 'Find Buyers',
      icon: <ShoppingCart className="w-5 h-5" />,
      query: 'Show all buyer profiles',
      color: colors.semantic.success
    },
    {
      id: 'sellers',
      label: 'Find Sellers',
      icon: <Store className="w-5 h-5" />,
      query: 'Show all seller profiles',
      color: colors.semantic.warning
    }
  ];

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await api.post(API_ENDPOINTS.GROUPS.TENANTS_DASHBOARD.STATS, {
        group_id: defaultGroupId
      });

      if (response.data?.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle NLP search
  const handleSearch = async (query: string, intentCode?: string) => {
    if (!query.trim()) {
      toast.error('Please enter a search query', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setActiveIntent(intentCode || null);

    try {
      console.log('🔍 NLP Search:', query);

      const response = await api.post(API_ENDPOINTS.GROUPS.TENANTS_DASHBOARD.SEARCH, {
        query,
        group_id: defaultGroupId,
        intent_code: intentCode
      });

      const data = response.data;
      console.log('🔍 Search results:', data);

      if (data.success && data.results) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          toast('No results found. Try different keywords.', {
            icon: '🔍',
            style: { background: colors.utility.secondaryBackground, color: colors.utility.primaryText }
          });
        }
      } else {
        setSearchResults([]);
        if (data.error) {
          toast.error(data.error, {
            style: { background: colors.semantic.error, color: '#FFF' }
          });
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.error || error.message || 'Search failed', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle intent card click
  const handleIntentClick = (intent: IntentCard) => {
    setSearchQuery(intent.query);
    handleSearch(intent.query, intent.id);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Navigate to tenant detail
  const handleViewTenant = (result: SearchResult) => {
    navigate('/vani/channels/bbb/admin', {
      state: {
        highlightMembership: result.membership_id,
        fromSearch: true
      }
    });
  };

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
            Tenant Profiles
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            AI-powered tenant search with natural language queries
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-lg hover:bg-opacity-80 transition-all"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
        >
          <RefreshCw className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}
          onClick={() => handleIntentClick(intentCards[0])}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  Total Tenants
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                  {isLoadingStats ? '...' : stats?.total_tenants || 0}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.brand.primary}15` }}>
                <Users className="w-6 h-6" style={{ color: colors.brand.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}
          onClick={() => handleIntentClick(intentCards[1])}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  Groups
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                  {isLoadingStats ? '...' : stats?.by_group?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.semantic.info}15` }}>
                <Building2 className="w-6 h-6" style={{ color: colors.semantic.info }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buyers */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}
          onClick={() => handleIntentClick(intentCards[2])}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  Buyers
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                  {isLoadingStats ? '...' : stats?.by_profile_type?.buyers || 0}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.semantic.success}15` }}>
                <ShoppingCart className="w-6 h-6" style={{ color: colors.semantic.success }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sellers */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all"
          style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.utility.primaryText}15` }}
          onClick={() => handleIntentClick(intentCards[3])}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                  Sellers
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.utility.primaryText }}>
                  {isLoadingStats ? '...' : stats?.by_profile_type?.sellers || 0}
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: `${colors.semantic.warning}15` }}>
                <Store className="w-6 h-6" style={{ color: colors.semantic.warning }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Card */}
      <Card
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}15`
        }}
      >
        <CardHeader
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
            borderBottom: `1px solid ${colors.utility.primaryText}10`
          }}
        >
          <CardTitle style={{ color: colors.utility.primaryText }}>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" style={{ color: colors.brand.primary }} />
              <span>Natural Language Search</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Search Input */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you're looking for... (e.g., 'IT companies in Hyderabad')"
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText
                }}
              />
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-2"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>Search</span>
            </button>
          </div>

          {/* Intent Cards */}
          <div className="flex flex-wrap gap-2">
            {intentCards.map((intent) => (
              <button
                key={intent.id}
                onClick={() => handleIntentClick(intent)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80 ${
                  activeIntent === intent.id ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: `${intent.color}15`,
                  color: intent.color,
                  '--tw-ring-color': intent.color
                } as React.CSSProperties}
              >
                {intent.icon}
                <span>{intent.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Search Results
              {searchResults.length > 0 && (
                <span className="ml-2 text-sm font-normal" style={{ color: colors.utility.secondaryText }}>
                  ({searchResults.length} found)
                </span>
              )}
            </h2>
          </div>

          {isSearching ? (
            <div
              className="p-8 rounded-lg text-center"
              style={{ backgroundColor: colors.utility.secondaryBackground }}
            >
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: colors.brand.primary }} />
              <p style={{ color: colors.utility.secondaryText }}>Searching with AI...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div
              className="p-8 rounded-lg text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px dashed ${colors.utility.primaryText}20`
              }}
            >
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText }} />
              <p className="font-medium mb-1" style={{ color: colors.utility.primaryText }}>
                No profiles found
              </p>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Try different keywords or a broader search
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {searchResults.map((result) => (
                <TenantCard
                  key={result.membership_id}
                  result={result}
                  colors={colors}
                  onView={() => handleViewTenant(result)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// TENANT CARD COMPONENT
// ============================================

interface TenantCardProps {
  result: SearchResult;
  colors: any;
  onView: () => void;
}

const TenantCard: React.FC<TenantCardProps> = ({ result, colors, onView }) => {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}15`
      }}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Logo/Avatar */}
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.brand.primary}15` }}
          >
            {result.logo_url ? (
              <img
                src={result.logo_url}
                alt={result.business_name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Building2 className="w-6 h-6" style={{ color: colors.brand.primary }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                  {result.business_name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  {result.industry && (
                    <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {result.industry}
                    </span>
                  )}
                  {result.group_name && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                    >
                      {result.group_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Relevance Score */}
              <div
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
              >
                {Math.round(result.similarity * 100)}%
              </div>
            </div>

            {/* Description */}
            {result.ai_enhanced_description && (
              <p
                className="text-sm mt-2 line-clamp-2"
                style={{ color: colors.utility.secondaryText }}
              >
                {result.ai_enhanced_description}
              </p>
            )}

            {/* Keywords */}
            {result.approved_keywords && result.approved_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.approved_keywords.slice(0, 4).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-xs flex items-center space-x-1"
                    style={{ backgroundColor: `${colors.brand.primary}10`, color: colors.brand.primary }}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{keyword}</span>
                  </span>
                ))}
                {result.approved_keywords.length > 4 && (
                  <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    +{result.approved_keywords.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Contact Info */}
            <div className="flex items-center space-x-4 mt-3 text-xs" style={{ color: colors.utility.secondaryText }}>
              {result.city && (
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{result.city}</span>
                </span>
              )}
              {result.business_email && (
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{result.business_email}</span>
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantProfilesPage;
