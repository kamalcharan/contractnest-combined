// src/pages/settings/business-profile/smart-profile.tsx
// SmartProfile - AI-enhanced tenant profile page
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Tag,
  Brain,
  Zap,
  Clock,
  Info
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { analyticsService } from '@/services/analytics.service';

interface SmartProfile {
  tenant_id: string;
  profile_type: string;
  short_description: string | null;
  ai_enhanced_description: string | null;
  approved_keywords: string[] | null;
  embedding: boolean; // Whether embedding exists
  status: string;
  is_active: boolean;
  last_embedding_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SemanticCluster {
  id: string;
  primary_term: string;
  related_terms: string[];
  category: string;
  confidence_score: number;
}

const SmartProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [smartProfile, setSmartProfile] = useState<SmartProfile | null>(null);
  const [clusters, setClusters] = useState<SemanticCluster[]>([]);

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('settings/business-profile/smart-profile', 'Smart Profile');
  }, []);

  // Fetch smart profile
  const fetchSmartProfile = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      const response = await api.get(API_ENDPOINTS.GROUPS.SMARTPROFILES.GET(currentTenant.id));
      if (response.data?.success && response.data?.data) {
        setSmartProfile(response.data.data.profile || null);
        setClusters(response.data.data.clusters || []);
      }
    } catch (error: any) {
      // 404 means no profile yet - that's fine
      if (error.response?.status !== 404) {
        console.error('Failed to fetch smart profile:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchSmartProfile();
  }, [fetchSmartProfile]);

  // Generate profile
  const handleGenerateProfile = async () => {
    if (!currentTenant?.id) return;

    setGenerating(true);
    try {
      const response = await api.post(API_ENDPOINTS.GROUPS.SMARTPROFILES.GENERATE, {
        tenant_id: currentTenant.id
      });

      if (response.data?.success) {
        toast.success('Smart Profile generation started!');
        // Refetch after a delay to allow n8n to process
        setTimeout(() => {
          fetchSmartProfile();
        }, 3000);
      } else {
        throw new Error(response.data?.error || 'Generation failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate Smart Profile');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    navigate('/settings/business-profile');
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="p-6 min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.secondaryText + '10' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>
          <div>
            <h1
              className="text-2xl font-bold flex items-center gap-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
              Smart Profile
            </h1>
            <p style={{ color: colors.utility.secondaryText }}>
              AI-powered enhancement of your business profile for better discoverability
            </p>
          </div>
        </div>

        {/* Generate/Regenerate Button in Header */}
        {smartProfile && (
          <button
            onClick={handleGenerateProfile}
            disabled={generating}
            className="flex items-center px-4 py-2 rounded-md text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {smartProfile ? (
            <>
              {/* Profile Status Card */}
              <div
                className="rounded-lg border shadow-sm p-6 transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.brand.primary + '30'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary + '20' }}
                    >
                      <Brain className="w-6 h-6" style={{ color: colors.brand.primary }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
                        Profile Status
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="w-4 h-4" style={{ color: colors.semantic.success }} />
                        <span className="text-sm" style={{ color: colors.semantic.success }}>
                          Active & Searchable
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Embedding Status */}
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: smartProfile.embedding
                        ? colors.semantic.success + '20'
                        : colors.semantic.warning + '20',
                      color: smartProfile.embedding
                        ? colors.semantic.success
                        : colors.semantic.warning
                    }}
                  >
                    <Zap className="w-3 h-3" />
                    {smartProfile.embedding ? 'Vector Indexed' : 'Pending Indexing'}
                  </div>
                </div>

                {/* Profile Info Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Profile Type:
                    </span>
                    <span
                      className="text-sm font-medium capitalize"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {smartProfile.profile_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Last Updated:
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {formatDate(smartProfile.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI-Enhanced Description */}
              {smartProfile.ai_enhanced_description && (
                <div
                  className="rounded-lg border shadow-sm p-6 transition-colors"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <h3
                    className="text-lg font-semibold mb-3 flex items-center gap-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    AI-Enhanced Description
                  </h3>
                  <p
                    className="leading-relaxed"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {smartProfile.ai_enhanced_description}
                  </p>
                </div>
              )}

              {/* Approved Keywords */}
              {smartProfile.approved_keywords && smartProfile.approved_keywords.length > 0 && (
                <div
                  className="rounded-lg border shadow-sm p-6 transition-colors"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <h3
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Tag className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    Approved Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {smartProfile.approved_keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: colors.brand.primary + '15',
                          color: colors.brand.primary
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Semantic Clusters */}
              {clusters.length > 0 && (
                <div
                  className="rounded-lg border shadow-sm p-6 transition-colors"
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20'
                  }}
                >
                  <h3
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Brain className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    Semantic Clusters
                    <span
                      className="text-xs font-normal px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.utility.secondaryText + '20',
                        color: colors.utility.secondaryText
                      }}
                    >
                      {clusters.length} clusters
                    </span>
                  </h3>

                  <div className="space-y-4">
                    {clusters.map((cluster, idx) => (
                      <div
                        key={cluster.id || idx}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: colors.utility.secondaryText + '05',
                          borderColor: colors.utility.primaryText + '10'
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="font-semibold capitalize"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {cluster.primary_term}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: colors.brand.secondary + '20',
                                color: colors.brand.secondary
                              }}
                            >
                              {cluster.category}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {Math.round(cluster.confidence_score * 100)}% confidence
                            </span>
                          </div>
                        </div>
                        {cluster.related_terms && cluster.related_terms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cluster.related_terms.map((term, termIdx) => (
                              <span
                                key={termIdx}
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: colors.utility.secondaryText + '15',
                                  color: colors.utility.secondaryText
                                }}
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div
                className="rounded-lg border p-4 flex items-start gap-3"
                style={{
                  backgroundColor: colors.brand.primary + '08',
                  borderColor: colors.brand.primary + '20'
                }}
              >
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.brand.primary }} />
                <div>
                  <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                    <strong>How Smart Profiles Work:</strong> Your profile is analyzed by AI to generate semantic keywords
                    and clusters that help other businesses find you when searching. The more detailed your business profile,
                    the better your discoverability in group and product-wide searches.
                  </p>
                </div>
              </div>
            </>
          ) : (
            // No Smart Profile yet
            <div
              className="rounded-lg border-2 border-dashed shadow-sm p-10 text-center"
              style={{
                backgroundColor: colors.utility.secondaryBackground + '50',
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + '15' }}
              >
                <Brain className="w-8 h-8" style={{ color: colors.brand.primary }} />
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                No Smart Profile Yet
              </h3>
              <p
                className="mb-6 max-w-md mx-auto"
                style={{ color: colors.utility.secondaryText }}
              >
                Generate an AI-powered profile to enhance your business presence with intelligent descriptions
                and semantic keywords that improve your discoverability in searches.
              </p>
              <button
                onClick={handleGenerateProfile}
                disabled={generating}
                className="px-6 py-2.5 rounded-md text-white transition-all hover:opacity-90 disabled:opacity-50 inline-flex items-center"
                style={{ backgroundColor: colors.brand.primary }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Smart Profile
                  </>
                )}
              </button>

              {/* Prerequisites Info */}
              <div
                className="mt-8 p-4 rounded-lg text-left max-w-md mx-auto"
                style={{ backgroundColor: colors.utility.secondaryText + '10' }}
              >
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Prerequisites for best results:
                </p>
                <ul className="text-sm space-y-1" style={{ color: colors.utility.secondaryText }}>
                  <li>- Complete your Business Profile with description</li>
                  <li>- Add your industry and business type</li>
                  <li>- Include contact information and website</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartProfilePage;
