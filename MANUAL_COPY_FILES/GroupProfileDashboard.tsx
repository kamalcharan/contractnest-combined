// src/pages/settings/customer-channels/GroupProfileDashboard.tsx
// 65:35 Profile Dashboard - View/Edit profile and semantic clusters

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  CheckCircle,
  Globe,
  Brain,
  Sparkles,
  RefreshCw,
  Building2,
  FileText,
  AlertCircle,
  Loader2,
  Users,
  MessageCircle
} from 'lucide-react';
import {
  useGroup,
  useMembership,
  useClusters,
  useEnhanceProfile,
  useSaveProfile,
  useGenerateClusters,
  useSaveClusters,
  useScrapeWebsite,
  useCreateMembership,
  useGroupMemberships
} from '../../../hooks/queries/useGroupQueries';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
import groupsService from '../../../services/groupsService';
import ProfileEntryForm from '../../../components/VaNi/bbb/ProfileEntryForm';
import AIEnhancementSection from '../../../components/VaNi/bbb/AIEnhancementSection';
import SemanticClustersForm, { SemanticCluster } from '../../../components/VaNi/bbb/SemanticClustersForm';
import toast from 'react-hot-toast';

// Profile Details Card Component (Left 65%)
interface ProfileDetailsCardProps {
  membership: any;
  onEdit: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (data: any) => void;
  isSaving: boolean;
  isEnhancing: boolean;
  onEnhanceWithAI: (description: string) => void;
}

const ProfileDetailsCard: React.FC<ProfileDetailsCardProps> = ({
  membership,
  onEdit,
  isEditing,
  onCancelEdit,
  onSaveEdit,
  isSaving,
  isEnhancing,
  onEnhanceWithAI
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
            onEnhanceWithAI={onEnhanceWithAI}
            isEnhancing={isEnhancing}
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
  const { currentTenant } = useAuth();

  // Get tenant profile data
  const { profile: tenantProfileData, loading: isLoadingTenantProfile } = useTenantProfile();

  // Get membership ID from URL params (if provided)
  const urlMembershipId = searchParams.get('membership') || '';

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [membershipId, setMembershipId] = useState<string | null>(urlMembershipId || null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [profileJustCreated, setProfileJustCreated] = useState(false); // Track successful profile creation

  // Profile creation state
  const [createStep, setCreateStep] = useState<'profile' | 'enhanced' | 'clusters' | 'success'>('profile');
  const [profileFormData, setProfileFormData] = useState<any>(null);
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  // Fetch data
  const { data: group, isLoading: isLoadingGroup } = useGroup(groupId || '');
  const { data: membershipsData } = useGroupMemberships(groupId || '', { status: 'all' });

  // Mutations
  const createMembershipMutation = useCreateMembership();
  const saveProfileMutation = useSaveProfile();
  const enhanceProfileMutation = useEnhanceProfile();
  const scrapeWebsiteMutation = useScrapeWebsite();
  const generateClustersMutation = useGenerateClusters();
  const saveClustersMutation = useSaveClusters();

  // Check for existing membership on load
  useEffect(() => {
    const checkMembership = async () => {
      if (!groupId || !currentTenant?.id || isLoadingTenantProfile) {
        return;
      }

      // If we have a membershipId from URL, use it
      if (urlMembershipId) {
        setMembershipId(urlMembershipId);
        setIsCheckingMembership(false);
        return;
      }

      try {
        console.log('🔍 Checking for existing membership...');

        // Find membership for current tenant
        const myMembership = membershipsData?.memberships?.find(
          (m: any) => m.tenant_id === currentTenant.id
        );

        if (myMembership) {
          console.log('✅ Found existing membership:', myMembership.id);
          setMembershipId(myMembership.id);

          // Check if profile exists
          const hasProfile = myMembership.profile_data?.ai_enhanced_description ||
                            myMembership.profile_data?.short_description;

          if (!hasProfile) {
            setShowCreateFlow(true);
          }
        } else {
          // No membership - show "Let me in" dialog
          console.log('❌ No membership found, showing join dialog');
          setShowJoinDialog(true);
        }
      } catch (error) {
        console.error('Error checking membership:', error);
        setShowJoinDialog(true);
      }

      setIsCheckingMembership(false);
    };

    if (!isLoadingGroup && membershipsData) {
      checkMembership();
    }
  }, [groupId, currentTenant?.id, urlMembershipId, isLoadingGroup, membershipsData, isLoadingTenantProfile]);

  // Fetch membership data once we have membershipId
  const { data: membership, isLoading: isLoadingMembership, refetch: refetchMembership } = useMembership(membershipId || '');
  const { data: clustersData, refetch: refetchClusters } = useClusters(membershipId || '');

  // Check if profile exists (or was just created)
  const hasProfile = profileJustCreated ||
                     membership?.profile_data?.ai_enhanced_description ||
                     membership?.profile_data?.short_description;

  // Handle "Let me in" click - create membership
  const handleJoinGroup = async () => {
    if (!groupId || !currentTenant?.id) {
      toast.error('Group not found. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    try {
      console.log('🚀 Creating membership...');

      const result = await createMembershipMutation.mutateAsync({
        group_id: groupId,
        profile_data: {
          mobile_number: tenantProfileData?.business_phone || '',
        }
      });

      console.log('✅ Membership created:', result);

      setMembershipId(result.id);
      setShowJoinDialog(false);
      setShowCreateFlow(true);

      toast.success('Welcome! Let\'s create your profile.', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error: any) {
      console.error('❌ Failed to create membership:', error);

      // Handle "already exists"
      if (error.message?.includes('already exists') || error.membership_id) {
        const existingId = error.membership_id;
        if (existingId) {
          setMembershipId(existingId);
          setShowJoinDialog(false);
          toast.success('Welcome back! Let\'s update your profile.', {
            style: { background: colors.semantic.success, color: '#FFF' }
          });
        }
      } else {
        toast.error(error.message || 'Failed to join group. Please try again.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/settings/configure/customer-channels/groups');
  };

  // Handle AI enhancement - returns enhanced description for edit mode
  const handleEnhanceWithAI = async (description: string): Promise<string | undefined> => {
    setOriginalDescription(description);

    try {
      const result = await enhanceProfileMutation.mutateAsync({
        membership_id: membershipId || '',
        short_description: description
      });

      setEnhancedDescription(result.ai_enhanced_description);
      setKeywords(result.suggested_keywords || []);
      setCreateStep('enhanced');

      toast.success('AI enhancement complete!', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });

      // Return enhanced description for edit mode form update
      return result.ai_enhanced_description;
    } catch (error: any) {
      toast.error(error.message || 'Enhancement failed', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return undefined;
    }
  };

  // Handle profile form submit (for website scraping)
  const handleProfileFormSubmit = async (data: any) => {
    setProfileFormData(data);

    if (data.generation_method === 'website' && data.website_url) {
      try {
        const result = await scrapeWebsiteMutation.mutateAsync({
          membership_id: membershipId || '',
          website_url: data.website_url
        });

        setEnhancedDescription(result.ai_enhanced_description);
        setKeywords(result.suggested_keywords || []);
        setCreateStep('enhanced');

        toast.success('Website analyzed successfully!', {
          style: { background: colors.semantic.success, color: '#FFF' }
        });
      } catch (error: any) {
        toast.error(error.message || 'Website scraping failed', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    }
  };

  // Handle save from enhancement
  const handleSaveEnhanced = async (description: string) => {
    try {
      await saveProfileMutation.mutateAsync({
        membership_id: membershipId || '',
        profile_data: {
          generation_method: profileFormData?.generation_method || 'manual',
          short_description: originalDescription || description,
          ai_enhanced_description: description,
          approved_keywords: keywords,
          website_url: profileFormData?.website_url,
        },
        trigger_embedding: true
      });

      setCreateStep('clusters');

      toast.success('Profile saved! Now let\'s generate search clusters.', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle cluster generation
  const handleGenerateClusters = async (profileText: string, existingKeywords: string[]): Promise<SemanticCluster[]> => {
    const result = await generateClustersMutation.mutateAsync({
      membership_id: membershipId || '',
      profile_text: profileText,
      keywords: existingKeywords
    });

    return result.clusters?.map((c: any) => ({
      ...c,
      is_active: true,
      confidence_score: c.confidence_score || 0.9
    })) || [];
  };

  // Handle save clusters
  const handleSaveClusters = async (clusters: SemanticCluster[]) => {
    await saveClustersMutation.mutateAsync({
      membershipId: membershipId || '',
      clusters: clusters.map(c => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score
      }))
    });

    setCreateStep('success');

    toast.success('Clusters saved! Your profile is now searchable.', {
      style: { background: colors.semantic.success, color: '#FFF' }
    });

    // Mark profile as just created to show dashboard immediately
    setProfileJustCreated(true);

    // Refresh and show dashboard after success
    setTimeout(async () => {
      setShowCreateFlow(false);
      // Refetch data in the background
      await Promise.all([refetchMembership(), refetchClusters()]);
    }, 2000);
  };

  // Handle profile edit save
  const handleSaveEdit = async (data: any) => {
    try {
      await saveProfileMutation.mutateAsync({
        membership_id: membershipId || '',
        profile_data: {
          ...membership?.profile_data,
          short_description: data.short_description,
          generation_method: data.generation_method,
          website_url: data.website_url
        },
        trigger_embedding: true
      });

      setIsEditing(false);
      refetchMembership();

      toast.success('Profile updated!', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Loading state
  if (isLoadingGroup || isCheckingMembership || isLoadingTenantProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }}
          />
          <p style={{ color: colors.utility.secondaryText }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      {/* Join Group Dialog - "Let me in!" */}
      <Dialog open={showJoinDialog && !membershipId} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div
                className="p-4 rounded-full"
                style={{ backgroundColor: `${colors.brand.primary}15` }}
              >
                <MessageCircle className="w-10 h-10" style={{ color: colors.brand.primary }} />
              </div>
            </div>
            <DialogTitle
              className="text-center text-xl"
              style={{ color: colors.utility.primaryText }}
            >
              Welcome to {group?.name}!
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-3 pt-2">
            <p style={{ color: colors.utility.secondaryText }}>
              You've been authenticated to join this group.
            </p>
            <div
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg mt-4"
              style={{ backgroundColor: `${colors.semantic.success}10` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: colors.semantic.success }} />
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Powered by VaNi AI Assistant
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleJoinGroup}
              disabled={createMembershipMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {createMembershipMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  <span>Let me in!</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
              {showCreateFlow ? 'Create your profile' : 'Manage your profile and semantic clusters'}
            </p>
          </div>
        </div>

        {!showCreateFlow && (
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
        )}
      </div>

      {/* Profile Creation Flow */}
      {showCreateFlow && membershipId && (
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {['profile', 'enhanced', 'clusters', 'success'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        createStep === s ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: ['profile', 'enhanced', 'clusters', 'success'].indexOf(createStep) >= i
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}20`,
                        color: ['profile', 'enhanced', 'clusters', 'success'].indexOf(createStep) >= i
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
                        color: createStep === s ? colors.utility.primaryText : colors.utility.secondaryText
                      }}
                    >
                      {s === 'profile' ? 'Profile' : s === 'enhanced' ? 'Enhance' : s === 'clusters' ? 'Clusters' : 'Done'}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className="w-12 h-0.5"
                      style={{
                        backgroundColor: ['profile', 'enhanced', 'clusters', 'success'].indexOf(createStep) > i
                          ? colors.brand.primary
                          : `${colors.utility.primaryText}20`
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {createStep === 'profile' && (
            <ProfileEntryForm
              onSubmit={handleProfileFormSubmit}
              onEnhanceWithAI={handleEnhanceWithAI}
              isEnhancing={enhanceProfileMutation.isPending || scrapeWebsiteMutation.isPending}
              isSaving={false}
            />
          )}

          {createStep === 'enhanced' && (
            <AIEnhancementSection
              originalDescription={originalDescription}
              enhancedDescription={enhancedDescription}
              onSave={handleSaveEnhanced}
              isSaving={saveProfileMutation.isPending}
            />
          )}

          {createStep === 'clusters' && (
            <SemanticClustersForm
              membershipId={membershipId}
              profileText={enhancedDescription}
              keywords={keywords}
              existingClusters={[]}
              onGenerateClusters={handleGenerateClusters}
              onSaveClusters={handleSaveClusters}
              isGenerating={generateClustersMutation.isPending}
              isSaving={saveClustersMutation.isPending}
            />
          )}

          {createStep === 'success' && (
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
      )}

      {/* 65:35 Dashboard Layout - Only show when profile exists and not in create flow */}
      {!showCreateFlow && membershipId && hasProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Profile Details (65%) */}
          <div className="lg:col-span-7">
            <ProfileDetailsCard
              membership={membership}
              onEdit={() => setIsEditing(true)}
              isEditing={isEditing}
              onCancelEdit={() => setIsEditing(false)}
              onSaveEdit={handleSaveEdit}
              isSaving={saveProfileMutation.isPending}
              isEnhancing={enhanceProfileMutation.isPending}
              onEnhanceWithAI={handleEnhanceWithAI}
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
      )}

      {/* Show create flow prompt if no profile yet */}
      {!showCreateFlow && membershipId && !hasProfile && !isLoadingMembership && (
        <Card
          className="max-w-2xl mx-auto"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.brand.primary}30`
          }}
        >
          <CardContent className="p-8">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${colors.brand.primary}15` }}
              >
                <Sparkles className="w-10 h-10" style={{ color: colors.brand.primary }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                Let's Create Your Profile
              </h2>
              <p className="mb-2" style={{ color: colors.utility.secondaryText }}>
                You're a member of <strong style={{ color: colors.brand.primary }}>{group?.name}</strong> but haven't created your profile yet.
              </p>
              <p className="text-sm mb-6" style={{ color: colors.utility.secondaryText }}>
                Create your profile to be discoverable by other group members via WhatsApp bot and web search.
              </p>
              <button
                onClick={() => setShowCreateFlow(true)}
                className="px-8 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Create My Profile</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupProfileDashboard;
