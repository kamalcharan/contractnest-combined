// src/pages/settings/customer-channels/GroupProfileDashboard.tsx
// 65:35 Profile Dashboard - View/Edit profile and semantic clusters

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  CheckCircle,
  Globe,
  Tag,
  Brain,
  Sparkles,
  RefreshCw,
  Building2,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  useGroup,
  useMembership,
  useClusters,
  useEnhanceProfile,
  useSaveProfile,
  useGenerateClusters,
  useSaveClusters,
  useScrapeWebsite
} from '../../../hooks/queries/useGroupQueries';
import ProfileEntryForm from '../../../components/VaNi/bbb/ProfileEntryForm';
import AIEnhancementSection from '../../../components/VaNi/bbb/AIEnhancementSection';
import SemanticClustersForm, { SemanticCluster } from '../../../components/VaNi/bbb/SemanticClustersForm';
import toast from 'react-hot-toast';

// Profile Creation Modal Component
interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string;
  groupId: string;
  onSuccess: () => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  membershipId,
  groupId,
  onSuccess
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Wizard steps
  const [step, setStep] = useState<'profile' | 'enhanced' | 'clusters' | 'success'>('profile');
  const [profileData, setProfileData] = useState<any>(null);
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([]);
  const [approvedKeywords, setApprovedKeywords] = useState<string[]>([]);
  const [generatedClusters, setGeneratedClusters] = useState<SemanticCluster[]>([]);

  // Mutations
  const enhanceProfileMutation = useEnhanceProfile();
  const scrapeWebsiteMutation = useScrapeWebsite();
  const saveProfileMutation = useSaveProfile();
  const generateClustersMutation = useGenerateClusters();
  const saveClustersMutation = useSaveClusters();

  // Handle profile form submission
  const handleProfileSubmit = async (data: any) => {
    setProfileData(data);

    if (data.generation_method === 'website' && data.website_url) {
      // Scrape website
      try {
        const result = await scrapeWebsiteMutation.mutateAsync({
          website_url: data.website_url
        });

        if (result.business_description) {
          setEnhancedDescription(result.business_description);
          setGeneratedKeywords(result.keywords || []);
          setApprovedKeywords(result.keywords || []);
          setStep('enhanced');
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to scrape website', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    }
  };

  // Handle AI enhancement
  const handleEnhanceWithAI = async (description: string) => {
    try {
      const result = await enhanceProfileMutation.mutateAsync({
        short_description: description,
        generation_method: 'manual'
      });

      if (result?.profile_data?.ai_enhanced_description) {
        setEnhancedDescription(result.profile_data.ai_enhanced_description);
        setGeneratedKeywords(result.profile_data.suggested_keywords || []);
        setApprovedKeywords(result.profile_data.suggested_keywords || []);
        setStep('enhanced');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to enhance profile', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle saving enhanced description and moving to clusters
  const handleSaveEnhanced = async () => {
    try {
      await saveProfileMutation.mutateAsync({
        membership_id: membershipId,
        group_id: groupId,
        profile_data: {
          short_description: profileData?.short_description || '',
          ai_enhanced_description: enhancedDescription,
          approved_keywords: approvedKeywords,
          generation_method: profileData?.generation_method || 'manual',
          website_url: profileData?.website_url
        },
        trigger_embedding: true
      });

      setStep('clusters');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle cluster generation
  const handleGenerateClusters = async (profileText: string, keywords: string[]): Promise<SemanticCluster[]> => {
    const result = await generateClustersMutation.mutateAsync({
      membership_id: membershipId,
      profile_text: profileText,
      keywords
    });

    const clusters = result.clusters?.map((c: any) => ({
      ...c,
      is_active: true,
      confidence_score: c.confidence_score || 0.9
    })) || [];

    setGeneratedClusters(clusters);
    return clusters;
  };

  // Handle saving clusters
  const handleSaveClusters = async (clusters: SemanticCluster[]) => {
    await saveClustersMutation.mutateAsync({
      membershipId,
      clusters: clusters.map(c => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score
      }))
    });

    setStep('success');
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  // Handle keyword toggle
  const handleKeywordToggle = (keyword: string) => {
    if (approvedKeywords.includes(keyword)) {
      setApprovedKeywords(approvedKeywords.filter(k => k !== keyword));
    } else {
      setApprovedKeywords([...approvedKeywords, keyword]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:opacity-80 z-10"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.secondaryText
            }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Steps */}
          <div
            className="p-4 border-b"
            style={{ borderColor: `${colors.utility.primaryText}10` }}
          >
            <div className="flex items-center justify-center space-x-4">
              {['profile', 'enhanced', 'clusters', 'success'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === s ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: ['profile', 'enhanced', 'clusters', 'success'].indexOf(step) >= i
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}20`,
                        color: ['profile', 'enhanced', 'clusters', 'success'].indexOf(step) >= i
                          ? '#FFF'
                          : colors.utility.secondaryText,
                        '--tw-ring-color': colors.brand.primary
                      } as React.CSSProperties}
                    >
                      {i + 1}
                    </div>
                    <span
                      className="text-sm hidden sm:inline"
                      style={{
                        color: step === s ? colors.utility.primaryText : colors.utility.secondaryText
                      }}
                    >
                      {s === 'profile' ? 'Profile' : s === 'enhanced' ? 'Enhance' : s === 'clusters' ? 'Clusters' : 'Done'}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className="w-12 h-0.5"
                      style={{
                        backgroundColor: ['profile', 'enhanced', 'clusters', 'success'].indexOf(step) > i
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}20`
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'profile' && (
              <ProfileEntryForm
                onSubmit={handleProfileSubmit}
                onEnhanceWithAI={handleEnhanceWithAI}
                isEnhancing={enhanceProfileMutation.isPending || scrapeWebsiteMutation.isPending}
                isSaving={false}
              />
            )}

            {step === 'enhanced' && (
              <AIEnhancementSection
                enhancedDescription={enhancedDescription}
                onConfirm={handleSaveEnhanced}
                onEdit={() => {
                  setStep('profile');
                }}
                isSaving={saveProfileMutation.isPending}
                generatedKeywords={generatedKeywords}
                semanticClusters={[]}
                onKeywordToggle={handleKeywordToggle}
                approvedKeywords={approvedKeywords}
              />
            )}

            {step === 'clusters' && (
              <SemanticClustersForm
                membershipId={membershipId}
                profileText={enhancedDescription}
                keywords={approvedKeywords}
                existingClusters={generatedClusters}
                onGenerateClusters={handleGenerateClusters}
                onSaveClusters={handleSaveClusters}
                isGenerating={generateClustersMutation.isPending}
                isSaving={saveClustersMutation.isPending}
              />
            )}

            {step === 'success' && (
              <div className="text-center py-12">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${colors.semantic.success}15` }}
                >
                  <CheckCircle className="w-10 h-10" style={{ color: colors.semantic.success }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                  Profile Created Successfully!
                </h2>
                <p style={{ color: colors.utility.secondaryText }}>
                  Your profile is now active and searchable by other members.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Profile Details Card Component (Left 65%)
interface ProfileDetailsCardProps {
  membership: any;
  onEdit: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (data: any) => void;
  isSaving: boolean;
}

const ProfileDetailsCard: React.FC<ProfileDetailsCardProps> = ({
  membership,
  onEdit,
  isEditing,
  onCancelEdit,
  onSaveEdit,
  isSaving
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const profileData = membership?.profile_data || {};
  const tenantProfile = membership?.tenant_profile || {};

  if (isEditing) {
    return (
      <Card
        className="h-full"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.brand.primary}40`
        }}
      >
        <CardHeader
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
            borderBottom: `1px solid ${colors.utility.primaryText}10`
          }}
        >
          <CardTitle style={{ color: colors.utility.primaryText }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5" style={{ color: colors.brand.primary }} />
                <span>Edit Profile</span>
              </div>
              <button
                onClick={onCancelEdit}
                className="p-2 rounded-lg transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${colors.semantic.error}15`,
                  color: colors.semantic.error
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ProfileEntryForm
            onSubmit={onSaveEdit}
            onEnhanceWithAI={(desc) => onSaveEdit({ short_description: desc, enhance: true })}
            isEnhancing={false}
            isSaving={isSaving}
            isEditMode={true}
            initialDescription={profileData.ai_enhanced_description || profileData.short_description || ''}
            initialWebsiteUrl={profileData.website_url || ''}
            initialMethod={profileData.generation_method || 'manual'}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="h-full"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}15`
      }}
    >
      <CardHeader
        style={{
          background: `linear-gradient(135deg, ${colors.semantic.success}08 0%, ${colors.brand.primary}08 100%)`,
          borderBottom: `1px solid ${colors.utility.primaryText}10`
        }}
      >
        <CardTitle style={{ color: colors.utility.primaryText }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {tenantProfile.logo_url ? (
                <img
                  src={tenantProfile.logo_url}
                  alt={tenantProfile.business_name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${colors.brand.primary}15` }}
                >
                  <Building2 className="w-6 h-6" style={{ color: colors.brand.primary }} />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">{tenantProfile.business_name || 'Your Business'}</h3>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${colors.semantic.success}15`,
                    color: colors.semantic.success
                  }}
                >
                  Active Profile
                </span>
              </div>
            </div>
            <button
              onClick={onEdit}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: `${colors.brand.primary}15`,
                color: colors.brand.primary
              }}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* AI Enhanced Description */}
        {profileData.ai_enhanced_description && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: colors.brand.primary }} />
              <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                AI-Enhanced Description
              </span>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}10`
              }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: colors.utility.secondaryText }}
              >
                {profileData.ai_enhanced_description}
              </p>
            </div>
          </div>
        )}

        {/* Original Description (if different) */}
        {profileData.short_description &&
         profileData.short_description !== profileData.ai_enhanced_description && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
              <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Original Description
              </span>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px dashed ${colors.utility.primaryText}15`
              }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: colors.utility.secondaryText }}
              >
                {profileData.short_description}
              </p>
            </div>
          </div>
        )}

        {/* Website URL */}
        {profileData.website_url && (
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" style={{ color: colors.semantic.info }} />
            <a
              href={profileData.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: colors.semantic.info }}
            >
              {profileData.website_url}
            </a>
          </div>
        )}

        {/* Keywords */}
        {profileData.approved_keywords && profileData.approved_keywords.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Tag className="w-4 h-4" style={{ color: colors.semantic.success }} />
              <span className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                Keywords
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileData.approved_keywords.map((keyword: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${colors.semantic.success}15`,
                    color: colors.semantic.success
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generation Method Badge */}
        <div className="pt-4 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
          <span
            className="inline-flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: `${colors.semantic.info}10`,
              color: colors.semantic.info
            }}
          >
            <FileText className="w-3 h-3" />
            <span>
              Generated via: {profileData.generation_method === 'website' ? 'Website Scraping' : 'Manual Entry + AI'}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
const GroupProfileDashboard: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get membership ID from URL params
  const membershipId = searchParams.get('membership') || '';
  const action = searchParams.get('action');

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(action === 'create');

  // Fetch data
  const { data: group, isLoading: isLoadingGroup } = useGroup(groupId || '');
  const { data: membership, isLoading: isLoadingMembership, refetch: refetchMembership } = useMembership(membershipId);
  const { data: clustersData, isLoading: isLoadingClusters, refetch: refetchClusters } = useClusters(membershipId);

  // Mutations
  const saveProfileMutation = useSaveProfile();
  const enhanceProfileMutation = useEnhanceProfile();
  const generateClustersMutation = useGenerateClusters();
  const saveClustersMutation = useSaveClusters();

  // Check if profile exists
  const hasProfile = membership?.profile_data?.ai_enhanced_description ||
                     membership?.profile_data?.short_description;

  // Open create modal if action=create and no profile
  useEffect(() => {
    if (action === 'create' && !hasProfile) {
      setShowCreateModal(true);
    }
  }, [action, hasProfile]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/settings/configure/customer-channels/groups');
  };

  // Handle profile edit save
  const handleSaveEdit = async (data: any) => {
    if (data.enhance) {
      // Enhance with AI first
      try {
        const result = await enhanceProfileMutation.mutateAsync({
          short_description: data.short_description,
          generation_method: 'manual'
        });

        if (result?.profile_data?.ai_enhanced_description) {
          await saveProfileMutation.mutateAsync({
            membership_id: membershipId,
            group_id: groupId || '',
            profile_data: {
              short_description: data.short_description,
              ai_enhanced_description: result.profile_data.ai_enhanced_description,
              approved_keywords: result.profile_data.suggested_keywords || [],
              generation_method: 'manual'
            },
            trigger_embedding: true
          });
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to enhance and save profile', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
        return;
      }
    } else {
      // Direct save
      try {
        await saveProfileMutation.mutateAsync({
          membership_id: membershipId,
          group_id: groupId || '',
          profile_data: {
            ...membership?.profile_data,
            short_description: data.short_description,
            generation_method: data.generation_method,
            website_url: data.website_url
          },
          trigger_embedding: true
        });
      } catch (error: any) {
        toast.error(error.message || 'Failed to save profile', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
        return;
      }
    }

    setIsEditing(false);
    refetchMembership();
  };

  // Handle cluster generation
  const handleGenerateClusters = async (profileText: string, keywords: string[]): Promise<SemanticCluster[]> => {
    const result = await generateClustersMutation.mutateAsync({
      membership_id: membershipId,
      profile_text: profileText,
      keywords
    });

    return result.clusters?.map((c: any) => ({
      ...c,
      is_active: true,
      confidence_score: c.confidence_score || 0.9
    })) || [];
  };

  // Handle saving clusters
  const handleSaveClusters = async (clusters: SemanticCluster[]) => {
    await saveClustersMutation.mutateAsync({
      membershipId,
      clusters: clusters.map(c => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score
      }))
    });

    refetchClusters();
  };

  // Loading state
  if (isLoadingGroup || isLoadingMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}
          />
          <p style={{ color: colors.utility.secondaryText }}>Loading Profile...</p>
        </div>
      </div>
    );
  }

  // No membership found
  if (!membership) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card
          className="max-w-md w-full p-8 text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.semantic.warning}40`
          }}
        >
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.semantic.warning }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            Membership Not Found
          </h2>
          <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
            You don't have access to this group. Please authenticate first.
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            Back to Groups
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}15`
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: colors.utility.primaryText }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
              {group?.name || 'Group Profile'}
            </h1>
            <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
              Manage your profile and semantic clusters
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            refetchMembership();
            refetchClusters();
          }}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: `${colors.brand.primary}15` }}
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" style={{ color: colors.brand.primary }} />
        </button>
      </div>

      {/* 65:35 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Profile Details (65%) */}
        <div className="lg:col-span-7">
          <ProfileDetailsCard
            membership={membership}
            onEdit={() => setIsEditing(true)}
            isEditing={isEditing}
            onCancelEdit={() => setIsEditing(false)}
            onSaveEdit={handleSaveEdit}
            isSaving={saveProfileMutation.isPending || enhanceProfileMutation.isPending}
          />
        </div>

        {/* Right Column - Semantic Clusters (35%) */}
        <div className="lg:col-span-5">
          <SemanticClustersForm
            membershipId={membershipId}
            profileText={membership?.profile_data?.ai_enhanced_description || membership?.profile_data?.short_description || ''}
            keywords={membership?.profile_data?.approved_keywords || []}
            existingClusters={clustersData?.clusters || []}
            onGenerateClusters={handleGenerateClusters}
            onSaveClusters={handleSaveClusters}
            isGenerating={generateClustersMutation.isPending}
            isSaving={saveClustersMutation.isPending}
          />
        </div>
      </div>

      {/* Create Profile Modal */}
      <CreateProfileModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          // Remove action param from URL
          navigate(`/settings/configure/customer-channels/groups/${groupId}?membership=${membershipId}`, { replace: true });
        }}
        membershipId={membershipId}
        groupId={groupId || ''}
        onSuccess={() => {
          refetchMembership();
          refetchClusters();
        }}
      />
    </div>
  );
};

export default GroupProfileDashboard;
