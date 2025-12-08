// src/pages/VaNi/TenantProfilesPage.tsx
// Phase 1: Simple tenant search with intent-based queries

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Search,
  Users,
  Building2,
  ArrowRight,
  Loader2,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import groupsService from '../../../services/groupsService';
import { useGroups } from '../../../hooks/queries/useGroupQueries';
import toast from 'react-hot-toast';

interface SearchResult {
  membership_id: string;
  tenant_id: string;
  business_name: string;
  business_category?: string;
  city?: string;
  similarity_score: number;
  profile_data?: {
    ai_enhanced_description?: string;
    approved_keywords?: string[];
  };
}

const TenantProfilesPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Get BBB group for search context
  const { data: bbbGroups } = useGroups('bbb_chapter');
  const bbbGroupId = bbbGroups?.[0]?.id;

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    if (!bbbGroupId) {
      toast.error('No group found for search', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      console.log('🔍 Searching with query:', searchQuery);

      const response = await groupsService.search({
        group_id: bbbGroupId,
        query: searchQuery,
        limit: 20
      });

      console.log('🔍 Search results:', response);

      if (response.success && response.results) {
        setSearchResults(response.results);

        if (response.results.length === 0) {
          toast('No results found. Try different keywords.', {
            icon: '🔍',
            style: { background: colors.utility.secondaryBackground, color: colors.utility.primaryText }
          });
        }
      } else {
        setSearchResults([]);
      }

    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Search failed', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle key press (Enter to search)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Navigate to BBB Admin with selected tenant
  const handleViewTenant = (result: SearchResult) => {
    // Navigate to BBB Admin Dashboard
    navigate('/vani/channels/bbb/admin', {
      state: {
        highlightMembership: result.membership_id,
        fromSearch: true
      }
    });
  };

  // Example intents for users
  const exampleIntents = [
    'Find IT companies in Hyderabad',
    'Who provides digital marketing services?',
    'Looking for legal consultants',
    'Healthcare providers near me'
  ];

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Tenant Profiles
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: colors.utility.secondaryText }}
          >
            Search and manage tenant profiles using intent-based queries
          </p>
        </div>
        <div
          className="p-3 rounded-full"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
        >
          <Users className="w-6 h-6" style={{ color: colors.brand.primary }} />
        </div>
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
              <span>Intent-Based Search</span>
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
                placeholder="Describe what you're looking for..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              />
            </div>
            <button
              onClick={handleSearch}
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

          {/* Example Intents */}
          {!hasSearched && (
            <div>
              <p
                className="text-xs font-medium mb-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Try these example queries:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleIntents.map((intent, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchQuery(intent)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: `${colors.brand.primary}15`,
                      color: colors.brand.primary
                    }}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Search Results
              {searchResults.length > 0 && (
                <span
                  className="ml-2 text-sm font-normal"
                  style={{ color: colors.utility.secondaryText }}
                >
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
              <Loader2
                className="w-8 h-8 animate-spin mx-auto mb-3"
                style={{ color: colors.brand.primary }}
              />
              <p style={{ color: colors.utility.secondaryText }}>
                Searching profiles...
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div
              className="p-8 rounded-lg text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px dashed ${colors.utility.primaryText}20`
              }}
            >
              <MessageSquare
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: colors.utility.secondaryText }}
              />
              <p
                className="font-medium mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                No profiles found
              </p>
              <p
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                Try different keywords or a broader search
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((result) => (
                <Card
                  key={result.membership_id}
                  className="cursor-pointer transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: `${colors.utility.primaryText}15`
                  }}
                  onClick={() => handleViewTenant(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${colors.brand.primary}15` }}
                        >
                          <Building2
                            className="w-5 h-5"
                            style={{ color: colors.brand.primary }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold truncate"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {result.business_name}
                          </h3>
                          {result.business_category && (
                            <p
                              className="text-sm truncate"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {result.business_category}
                            </p>
                          )}
                          {result.city && (
                            <p
                              className="text-xs mt-1"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {result.city}
                            </p>
                          )}

                          {/* Relevance Score */}
                          <div className="flex items-center space-x-2 mt-2">
                            <div
                              className="h-1.5 rounded-full flex-1"
                              style={{ backgroundColor: `${colors.utility.primaryText}15` }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(result.similarity_score * 100, 100)}%`,
                                  backgroundColor: colors.semantic.success
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-medium"
                              style={{ color: colors.semantic.success }}
                            >
                              {Math.round(result.similarity_score * 100)}%
                            </span>
                          </div>

                          {/* Keywords */}
                          {result.profile_data?.approved_keywords && result.profile_data.approved_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.profile_data.approved_keywords.slice(0, 3).map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: `${colors.semantic.info}15`,
                                    color: colors.semantic.info
                                  }}
                                >
                                  {keyword}
                                </span>
                              ))}
                              {result.profile_data.approved_keywords.length > 3 && (
                                <span
                                  className="text-xs"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  +{result.profile_data.approved_keywords.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: colors.utility.secondaryText }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}15`
        }}
      >
        <CardHeader>
          <CardTitle style={{ color: colors.utility.primaryText }}>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/vani/channels/bbb/admin')}
              className="p-4 rounded-lg border transition-all hover:shadow-md text-left"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: `${colors.utility.primaryText}15`
              }}
            >
              <Users className="w-5 h-5 mb-2" style={{ color: colors.brand.primary }} />
              <p
                className="font-medium text-sm"
                style={{ color: colors.utility.primaryText }}
              >
                View All Members
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                BBB Directory Dashboard
              </p>
            </button>

            <button
              onClick={() => navigate('/vani/channels/bbb/onboarding')}
              className="p-4 rounded-lg border transition-all hover:shadow-md text-left"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: `${colors.utility.primaryText}15`
              }}
            >
              <Sparkles className="w-5 h-5 mb-2" style={{ color: colors.semantic.success }} />
              <p
                className="font-medium text-sm"
                style={{ color: colors.utility.primaryText }}
              >
                Profile Onboarding
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                Create/Edit your profile
              </p>
            </button>

            <button
              onClick={() => navigate('/vani/chat')}
              className="p-4 rounded-lg border transition-all hover:shadow-md text-left"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: `${colors.utility.primaryText}15`
              }}
            >
              <MessageSquare className="w-5 h-5 mb-2" style={{ color: colors.semantic.info }} />
              <p
                className="font-medium text-sm"
                style={{ color: colors.utility.primaryText }}
              >
                VaNi Chat
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                AI-powered search chat
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantProfilesPage;
