// src/pages/VaNi/channels/BBBProfileOnboardingPage.tsx
// File 11/13 - BBB Profile Onboarding Main Flow

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import ProfileCard from '../../../components/VaNi/bbb/ProfileCard';
import ProfileEntryForm from '../../../components/VaNi/bbb/ProfileEntryForm';
import WebsiteScrapingForm from '../../../components/VaNi/bbb/WebsiteScrapingForm';
import AIEnhancementSection from '../../../components/VaNi/bbb/AIEnhancementSection';
import SemanticClustersForm from '../../../components/VaNi/bbb/SemanticClustersForm';
import SuccessModal from '../../../components/VaNi/bbb/SuccessModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import {
  ProfileFormData,
  AIEnhancementResponse,
  WebsiteScrapingResponse,
  TenantProfile
} from '../../../types/bbb';
import toast from 'react-hot-toast';
import {
  useEnhanceProfile,
  useScrapeWebsite,
  useGroups,
  useCreateMembership,
  useSaveProfile,
  useGenerateClusters,
  useSaveClusters,
  useClusters
} from '../../../hooks/queries/useGroupQueries';
import groupsService from '../../../services/groupsService';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
import { Users, MessageCircle, Sparkles, Pencil, Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { SemanticCluster } from '../../../components/VaNi/bbb/SemanticClustersForm';

type OnboardingStep =
  | 'profile_entry'
  | 'ai_enhanced'
  | 'website_scraped'
  | 'semantic_clusters'
  | 'success';

const BBBProfileOnboardingPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const location = useLocation();
  const branch = location.state?.branch || 'bagyanagar';

  // Get live tenant profile data
  const { profile: tenantProfileData, loading: isLoadingProfile } = useTenantProfile();

  // Get BBB groups to find the group_id
  const { data: bbbGroups, isLoading: isLoadingGroups } = useGroups('bbb_chapter');

  // Create membership mutation
  const createMembershipMutation = useCreateMembership();

  // Membership state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);

  // Edit mode - if profile exists, start in view mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingProfileData, setExistingProfileData] = useState<any>(null);
  const [membershipStatus, setMembershipStatus] = useState<string>('draft');

  // Map tenant profile data to the format expected by ProfileCard
  const currentTenantProfile: TenantProfile = {
    id: tenantProfileData?.id || '',
    tenant_id: tenantProfileData?.tenant_id || '',
    business_name: tenantProfileData?.business_name || 'Your Business',
    business_email: tenantProfileData?.business_email || undefined,
    business_phone: tenantProfileData?.business_phone || undefined,
    business_phone_code: tenantProfileData?.business_phone_country_code || '+91',
    website_url: tenantProfileData?.website_url || undefined,
    logo_url: tenantProfileData?.logo_url || undefined,
    industry_id: tenantProfileData?.industry_id || undefined,
    business_category: tenantProfileData?.industry_id || undefined,
    city: tenantProfileData?.city || undefined,
    address_line1: tenantProfileData?.address_line1 || undefined,
    address_line2: tenantProfileData?.address_line2 || undefined,
    postal_code: tenantProfileData?.postal_code || undefined,
    country_code: tenantProfileData?.country_code || 'IN',
    state_code: tenantProfileData?.state_code || undefined,
  };

  // Get the BBB group ID (first BBB chapter)
  const bbbGroupId = bbbGroups?.[0]?.id;

  // Check membership status on page load - query FIRST, then show dialog if not found
  useEffect(() => {
    const checkMembership = async () => {
      if (!bbbGroupId || !tenantProfileData?.tenant_id) {
        setIsCheckingMembership(false);
        return;
      }

      try {
        console.log('🤖 VaNi: Checking for existing membership...');

        // Query for existing membership FIRST
        const { memberships } = await groupsService.getGroupMemberships(bbbGroupId, { status: 'all' });
        console.log('🤖 VaNi: Found memberships:', memberships.length);

        const myMembership = memberships.find(
          (m: any) => m.tenant_id === tenantProfileData?.tenant_id
        );

        if (myMembership) {
          console.log('🤖 VaNi: Found existing membership:', myMembership.id);
          setMembershipId(myMembership.id);
          setMembershipStatus(myMembership.status || 'draft');
          setShowJoinDialog(false);

          // Check if profile_data exists with saved description (either AI enhanced or manual)
          const hasExistingProfile = myMembership.profile_data?.ai_enhanced_description ||
                                     myMembership.profile_data?.short_description;

          if (hasExistingProfile) {
            console.log('🤖 VaNi: Found existing profile data, showing readonly view');
            setExistingProfileData(myMembership.profile_data);
            setEnhancedDescription(myMembership.profile_data.ai_enhanced_description || myMembership.profile_data.short_description || '');
            setOriginalDescription(myMembership.profile_data.short_description || '');
            setKeywords(myMembership.profile_data.approved_keywords || []);
            setWebsiteUrl(myMembership.profile_data.website_url || '');
            setIsEditMode(false); // Start in readonly view mode
          } else {
            // No saved profile - user needs to create one
            setIsEditMode(true); // Start in edit mode to create profile
          }
        } else {
          // No membership found - show "Let me in" dialog
          console.log('🤖 VaNi: No membership found, showing dialog');
          setShowJoinDialog(true);
        }

      } catch (error: any) {
        console.error('🤖 VaNi: Error checking membership:', error);
        setShowJoinDialog(true);
      }

      setIsCheckingMembership(false);
    };

    if (!isLoadingProfile && !isLoadingGroups) {
      checkMembership();
    }
  }, [bbbGroupId, tenantProfileData?.tenant_id, isLoadingProfile, isLoadingGroups]);

  // Handle "Let me in" click - create membership
  const handleJoinBBB = async () => {
    if (!bbbGroupId) {
      toast.error('BBB group not found. Please contact admin.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    try {
      console.log('🤖 VaNi: Creating BBB membership...');

      const result = await createMembershipMutation.mutateAsync({
        group_id: bbbGroupId,
        profile_data: {
          mobile_number: tenantProfileData?.business_phone || '',
        }
      });

      console.log('🤖 VaNi: Membership created:', result);

      setMembershipId(result.id);
      setShowJoinDialog(false);

      toast.success('Welcome to BBB! Let\'s create your profile.', {
        style: { background: colors.semantic.success, color: '#FFF' },
        duration: 3000
      });
    } catch (error: any) {
      console.error('🤖 VaNi: Failed to create membership:', error);

      // If membership already exists, extract ID and continue
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        // Try to get membership_id from multiple sources
        const existingId =
          error.membership_id ||
          error.cause?.membership_id ||
          sessionStorage.getItem('bbb_existing_membership_id'); // Fallback from service

        console.log('🤖 VaNi: 409 - membership exists, extracted ID:', existingId);

        if (existingId) {
          setMembershipId(existingId);
          setShowJoinDialog(false);
          // Clear sessionStorage after use
          sessionStorage.removeItem('bbb_existing_membership_id');
          toast.success('Welcome back! Let\'s update your profile.', {
            style: { background: colors.semantic.success, color: '#FFF' }
          });
        } else {
          toast.error('Membership exists but could not retrieve ID. Please refresh.', {
            style: { background: colors.semantic.error, color: '#FFF' }
          });
        }
      } else {
        toast.error(error.message || 'Failed to join BBB. Please try again.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    }
  };

  // API hooks for AI operations
  const enhanceProfileMutation = useEnhanceProfile();
  const scrapeWebsiteMutation = useScrapeWebsite();
  const saveProfileMutation = useSaveProfile();
  const generateClustersMutation = useGenerateClusters();
  const saveClustersMutation = useSaveClusters();

  // Fetch existing clusters when membershipId is available
  const { data: existingClustersData } = useClusters(membershipId || '');

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile_entry');
  const [originalDescription, setOriginalDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [generatedClusters, setGeneratedClusters] = useState<SemanticCluster[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Update clusters from API when loaded
  useEffect(() => {
    if (existingClustersData?.clusters && existingClustersData.clusters.length > 0) {
      setGeneratedClusters(existingClustersData.clusters);
    }
  }, [existingClustersData]);

  // AI Enhancement via n8n
  const handleEnhanceWithAI = async (description: string) => {
    setOriginalDescription(description);

    try {
      console.log('🤖 VaNi: Calling AI enhancement API...');

      const result = await enhanceProfileMutation.mutateAsync({
        membership_id: membershipId || currentTenantProfile.id || 'temp-membership-id',
        short_description: description
      });

      console.log('🤖 VaNi: AI enhancement result:', result);

      setEnhancedDescription(result.ai_enhanced_description);
      setKeywords(result.suggested_keywords || []);
      setCurrentStep('ai_enhanced');

      toast.success('AI enhancement complete!', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error: any) {
      console.error('🤖 VaNi: AI enhancement failed:', error);
      toast.error(error.message || 'Enhancement failed. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: ProfileFormData) => {
    if (data.generation_method === 'website' && data.website_url) {
      // Website scraping flow via n8n
      setWebsiteUrl(data.website_url);

      try {
        console.log('🤖 VaNi: Calling website scraping API...');

        const result = await scrapeWebsiteMutation.mutateAsync({
          membership_id: membershipId || currentTenantProfile.id || 'temp-membership-id',
          website_url: data.website_url
        });

        console.log('🤖 VaNi: Website scraping result:', result);

        setEnhancedDescription(result.ai_enhanced_description);
        setKeywords(result.suggested_keywords || []);
        setCurrentStep('website_scraped');

        toast.success('Website analyzed successfully!', {
          style: { background: colors.semantic.success, color: '#FFF' }
        });
      } catch (error: any) {
        console.error('🤖 VaNi: Website scraping failed:', error);
        toast.error(error.message || 'Website scraping failed. Please try manual entry.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }
    } else if (data.generation_method === 'manual' && data.short_description) {
      // Direct save without enhancement (user didn't click Enhance)
      setOriginalDescription(data.short_description);
      await handleSaveProfile(data.short_description);
    }
  };

  // Save profile from AI enhancement or website scraping
  const handleSaveFromEnhancement = async (description: string) => {
    await handleSaveProfile(description);
  };

  // Generate semantic clusters via n8n
  const handleGenerateClusters = async (profileText: string, existingKeywords: string[]): Promise<SemanticCluster[]> => {
    if (!membershipId) {
      throw new Error('Membership ID required');
    }

    try {
      console.log('🤖 VaNi: Generating clusters via n8n...');

      const result = await generateClustersMutation.mutateAsync({
        membership_id: membershipId,
        profile_text: profileText,
        keywords: existingKeywords
      });

      console.log('🤖 VaNi: Clusters generated:', result);

      // Transform API response to SemanticCluster format
      const clusters: SemanticCluster[] = result.clusters.map(c => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score || 0.9,
        is_active: true
      }));

      setGeneratedClusters(clusters);
      return clusters;
    } catch (error: any) {
      console.error('🤖 VaNi: Cluster generation failed:', error);
      throw error;
    }
  };

  // Save clusters to database
  const handleSaveClusters = async (clusters: SemanticCluster[]): Promise<void> => {
    if (!membershipId) {
      throw new Error('Membership ID required');
    }

    try {
      console.log('🤖 VaNi: Saving clusters to database...');

      await saveClustersMutation.mutateAsync({
        membershipId,
        clusters: clusters.map(c => ({
          primary_term: c.primary_term,
          related_terms: c.related_terms,
          category: c.category,
          confidence_score: c.confidence_score || 1.0
        }))
      });

      console.log('🤖 VaNi: Clusters saved successfully');

      toast.success('Clusters saved! Your profile is now searchable.', {
        style: { background: colors.semantic.success, color: '#FFF' },
        duration: 3000
      });

      // Move to success step after saving clusters
      setTimeout(() => {
        setCurrentStep('success');
      }, 1000);
    } catch (error: any) {
      console.error('🤖 VaNi: Cluster save failed:', error);
      throw error;
    }
  };

  // Save profile (final step) - calls real API with embedding generation
  const handleSaveProfile = async (description: string) => {
    if (!membershipId) {
      toast.error('Please join BBB first before saving your profile.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      console.log('🤖 VaNi: Saving profile with embedding generation...');

      // Generate default keywords if not already set
      const finalKeywords = keywords.length > 0 ? keywords : [
        currentTenantProfile.business_category || 'Services',
        currentTenantProfile.city || 'Hyderabad',
        'Business',
        'Professional'
      ];
      setKeywords(finalKeywords);

      // Call the real save profile API with embedding generation
      const result = await saveProfileMutation.mutateAsync({
        membership_id: membershipId,
        profile_data: {
          generation_method: websiteUrl ? 'website' : 'manual',
          short_description: originalDescription || description,
          ai_enhanced_description: description,
          approved_keywords: finalKeywords,
          website_url: websiteUrl || undefined,
        },
        trigger_embedding: true, // Generate embedding via n8n
        business_context: {
          business_name: currentTenantProfile.business_name,
          industry: currentTenantProfile.business_category,
          city: currentTenantProfile.city,
        }
      });

      console.log('🤖 VaNi: Profile saved:', result);

      // Update existing profile data with new values
      const newProfileData = {
        generation_method: websiteUrl ? 'website' : 'manual',
        short_description: originalDescription || description,
        ai_enhanced_description: description,
        approved_keywords: keywords.length > 0 ? keywords : finalKeywords,
        website_url: websiteUrl || undefined,
      };
      setExistingProfileData(newProfileData);
      setEnhancedDescription(description); // Store for cluster generation
      setIsEditMode(false); // Exit edit mode after save

      // Move to semantic clusters step (user will manually generate clusters)
      setCurrentStep('semantic_clusters');

      const embeddingMsg = result.embedding_generated
        ? 'Profile saved! Now let\'s generate search clusters.'
        : 'Profile saved! Now let\'s generate search clusters.';

      toast.success(embeddingMsg, {
        style: { background: colors.semantic.success, color: '#FFF' }
      });

    } catch (error: any) {
      console.error('🤖 VaNi: Profile save failed:', error);
      toast.error(error.message || 'Profile save failed. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Enter edit mode - keep existing data but allow changes
  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setCurrentStep('profile_entry');
    // Keep existing description for editing
  };

  // Cancel edit mode - go back to readonly view
  const handleCancelEdit = () => {
    if (existingProfileData?.ai_enhanced_description || existingProfileData?.short_description) {
      // Restore original data
      setEnhancedDescription(existingProfileData.ai_enhanced_description || existingProfileData.short_description || '');
      setOriginalDescription(existingProfileData.short_description || '');
      setKeywords(existingProfileData.approved_keywords || []);
      setIsEditMode(false);
      setCurrentStep('profile_entry');
    }
  };

  // Restart - go back to profile entry (for edit mode)
  const handleRestart = () => {
    setCurrentStep('profile_entry');
    // If editing, keep existing data visible
    if (!isEditMode && existingProfileData) {
      setOriginalDescription(existingProfileData.short_description || '');
      setEnhancedDescription(existingProfileData.ai_enhanced_description || '');
    } else {
      setOriginalDescription('');
      setEnhancedDescription('');
    }
    setWebsiteUrl('');
    setGeneratedClusters([]);
    setIsSavingProfile(false);
  };

  // Get status badge info (4 statuses: draft, active, suspended, inactive)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle2, color: colors.semantic.success, label: 'Active', bgColor: `${colors.semantic.success}15` };
      case 'suspended':
        return { icon: AlertCircle, color: colors.semantic.warning, label: 'Suspended', bgColor: `${colors.semantic.warning}15` };
      case 'inactive':
        return { icon: AlertCircle, color: colors.semantic.error, label: 'Inactive', bgColor: `${colors.semantic.error}15` };
      default: // draft
        return { icon: Clock, color: colors.utility.secondaryText, label: 'Draft', bgColor: `${colors.utility.secondaryText}15` };
    }
  };

  // Show loading while checking membership
  if (isCheckingMembership || isLoadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading BBB Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8 max-w-5xl mx-auto">
      {/* Join BBB Dialog - Non-dismissable until membership created */}
      <Dialog open={showJoinDialog && !membershipId} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
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
              Welcome to BBB Directory!
            </DialogTitle>
          </DialogHeader>

          {/* Content outside DialogDescription to avoid p > div nesting */}
          <div className="text-center space-y-3 pt-2">
            <p style={{ color: colors.utility.secondaryText }}>
              I have received an invitation to join the
            </p>
            <p
              className="text-lg font-semibold"
              style={{ color: colors.brand.primary }}
            >
              BBB AI WhatsApp Group
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
              onClick={handleJoinBBB}
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

      {/* Page Header */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          BBB Profile Onboarding
        </h1>
        <p
          className="text-lg"
          style={{ color: colors.utility.secondaryText }}
        >
          Chapter: <strong style={{ color: colors.brand.primary }}>
            {branch.charAt(0).toUpperCase() + branch.slice(1)}
          </strong>
        </p>
      </div>

      {/* Existing Profile Card */}
      {isLoadingProfile ? (
        <div
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: colors.utility.secondaryBackground }}
        >
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.brand.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading your business profile...</p>
        </div>
      ) : (
        <ProfileCard profile={currentTenantProfile} showTitle={true} />
      )}

      {/* Readonly Profile View - when profile exists and not in edit mode */}
      {currentStep === 'profile_entry' && (existingProfileData?.ai_enhanced_description || existingProfileData?.short_description) && !isEditMode && (
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}15`
          }}
        >
          {/* Header with Status Badge and Edit Button */}
          <div
            className="p-6 flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div className="flex items-center space-x-3">
              <Eye className="w-6 h-6" style={{ color: colors.brand.primary }} />
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                  Your BBB Profile
                </h2>
                {/* Status Badge */}
                {(() => {
                  const badge = getStatusBadge(membershipStatus);
                  const StatusIcon = badge.icon;
                  return (
                    <div
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full mt-1"
                      style={{ backgroundColor: badge.bgColor }}
                    >
                      <StatusIcon className="w-3.5 h-3.5" style={{ color: badge.color }} />
                      <span className="text-xs font-medium" style={{ color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <button
              onClick={handleEnterEditMode}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#FFF'
              }}
            >
              <Pencil className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Readonly Description */}
          <div className="p-6 space-y-6">
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                AI-Enhanced Description
              </label>
              <div
                className="p-4 rounded-lg min-h-[120px]"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${colors.utility.primaryText}15`,
                  color: colors.utility.secondaryText
                }}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {existingProfileData.ai_enhanced_description}
                </p>
              </div>
            </div>

            {/* Original Description if different */}
            {existingProfileData.short_description &&
              existingProfileData.short_description !== existingProfileData.ai_enhanced_description && (
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Original Description
                </label>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}10`,
                    color: colors.utility.secondaryText
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {existingProfileData.short_description}
                  </p>
                </div>
              </div>
            )}

            {/* Keywords */}
            {existingProfileData.approved_keywords?.length > 0 && (
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2">
                  {existingProfileData.approved_keywords.map((keyword: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
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

            {/* Website URL if exists */}
            {existingProfileData.website_url && (
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Website
                </label>
                <a
                  href={existingProfileData.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: colors.brand.primary }}
                >
                  {existingProfileData.website_url}
                </a>
              </div>
            )}

            {/* Generation Method Badge */}
            <div className="pt-4 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: `${colors.semantic.info}15`,
                  color: colors.semantic.info
                }}
              >
                Generated via: {existingProfileData.generation_method === 'website' ? 'Website Scraping' : 'Manual Entry + AI'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Profile Entry Form - for new profiles or when in edit mode */}
      {currentStep === 'profile_entry' && (isEditMode || !existingProfileData?.ai_enhanced_description) && (
        <>
          {/* Cancel Edit button if editing existing profile */}
          {isEditMode && existingProfileData?.ai_enhanced_description && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCancelEdit}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.primaryText}20`
                }}
              >
                <span>Cancel Edit</span>
              </button>
            </div>
          )}
          <ProfileEntryForm
            onSubmit={handleFormSubmit}
            onEnhanceWithAI={handleEnhanceWithAI}
            isEnhancing={enhanceProfileMutation.isPending}
            isSaving={scrapeWebsiteMutation.isPending}
            isEditMode={isEditMode && !!existingProfileData?.ai_enhanced_description}
            initialDescription={existingProfileData?.ai_enhanced_description || existingProfileData?.short_description || ''}
            initialWebsiteUrl={existingProfileData?.website_url || ''}
            initialMethod={existingProfileData?.generation_method === 'website' ? 'website' : 'manual'}
          />
        </>
      )}

      {/* AI Enhancement Section */}
      {currentStep === 'ai_enhanced' && (
        <>
          <AIEnhancementSection
            originalDescription={originalDescription}
            enhancedDescription={enhancedDescription}
            onSave={handleSaveFromEnhancement}
            isSaving={isSavingProfile}
          />
          {/* Restart Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRestart}
              disabled={isSavingProfile}
              className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`
              }}
            >
              ← Start Over
            </button>
          </div>
        </>
      )}

      {/* Website Scraping Results */}
      {currentStep === 'website_scraped' && (
        <>
          <WebsiteScrapingForm
            websiteUrl={websiteUrl}
            generatedDescription={enhancedDescription}
            onSave={handleSaveFromEnhancement}
            isSaving={isSavingProfile}
          />
          {/* Restart Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRestart}
              disabled={isSavingProfile}
              className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`
              }}
            >
              ← Start Over
            </button>
          </div>
        </>
      )}

      {/* Semantic Clusters Form */}
      {currentStep === 'semantic_clusters' && membershipId && (
        <SemanticClustersForm
          membershipId={membershipId}
          profileText={enhancedDescription || existingProfileData?.ai_enhanced_description || ''}
          keywords={keywords}
          existingClusters={generatedClusters}
          onGenerateClusters={handleGenerateClusters}
          onSaveClusters={handleSaveClusters}
          isGenerating={generateClustersMutation.isPending}
          isSaving={saveClustersMutation.isPending}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={currentStep === 'success'}
        keywords={keywords}
        businessName={currentTenantProfile.business_name}
        autoNavigateDelay={3000}
      />
    </div>
  );
};

export default BBBProfileOnboardingPage;
