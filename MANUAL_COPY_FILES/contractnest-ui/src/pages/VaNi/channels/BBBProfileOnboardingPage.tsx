// src/pages/VaNi/channels/BBBProfileOnboardingPage.tsx
// File 11/13 - BBB Profile Onboarding Main Flow

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import ProfileCard from '../../../components/VaNi/bbb/ProfileCard';
import ProfileEntryForm from '../../../components/VaNi/bbb/ProfileEntryForm';
import WebsiteScrapingForm from '../../../components/VaNi/bbb/WebsiteScrapingForm';
import AIEnhancementSection from '../../../components/VaNi/bbb/AIEnhancementSection';
import SemanticClustersDisplay from '../../../components/VaNi/bbb/SemanticClustersDisplay';
import SuccessModal from '../../../components/VaNi/bbb/SuccessModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import {
  mockSemanticClusters,
  simulateDelay
} from '../../../utils/fakejson/bbbMockData';
import {
  ProfileFormData,
  AIEnhancementResponse,
  WebsiteScrapingResponse,
  SemanticCluster,
  TenantProfile
} from '../../../types/bbb';
import toast from 'react-hot-toast';
import {
  useEnhanceProfile,
  useScrapeWebsite,
  useGroups,
  useCreateMembership
} from '../../../hooks/queries/useGroupQueries';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
import { Users, MessageCircle, Sparkles } from 'lucide-react';

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

  // Check membership status on page load
  useEffect(() => {
    const checkMembership = async () => {
      if (!bbbGroupId || !tenantProfileData?.tenant_id) {
        setIsCheckingMembership(false);
        return;
      }

      // For now, show the join dialog since we don't have a "check my membership" endpoint
      // In production, you'd call an API to check if tenant has membership
      // const membership = await groupsService.getMyMembership(bbbGroupId);

      // Show join dialog if no membership
      setShowJoinDialog(true);
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

      // If membership already exists, just close dialog and continue
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        setShowJoinDialog(false);
        toast.success('You\'re already a member! Let\'s update your profile.', {
          style: { background: colors.semantic.info, color: '#FFF' }
        });
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

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile_entry');
  const [originalDescription, setOriginalDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [generatedClusters, setGeneratedClusters] = useState<SemanticCluster[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Loading states
  const [isGeneratingClusters, setIsGeneratingClusters] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  // Generate semantic clusters
  const handleGenerateClusters = async () => {
    setIsGeneratingClusters(true);

    try {
      // Simulate cluster generation
      await simulateDelay(2000);

      // Use mock clusters based on category
      const relevantClusters = mockSemanticClusters.slice(0, 3);
      setGeneratedClusters(relevantClusters);

      toast.success('Semantic clusters generated!', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });

      // Auto-proceed to success after showing clusters
      setTimeout(() => {
        setCurrentStep('success');
      }, 1500);
    } catch (error) {
      toast.error('Cluster generation failed.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsGeneratingClusters(false);
    }
  };

  // Save profile (final step)
  const handleSaveProfile = async (description: string) => {
    setIsSavingProfile(true);

    try {
      // Simulate profile save
      await simulateDelay(1500);

      // Generate default keywords if not already set
      if (keywords.length === 0) {
        const defaultKeywords = [
          currentTenantProfile.business_category || 'Services',
          currentTenantProfile.city || 'Hyderabad',
          'Business',
          'Professional'
        ];
        setKeywords(defaultKeywords);
      }

      // Move to semantic clusters step
      setCurrentStep('semantic_clusters');

      toast.success('Profile saved! Generating semantic clusters...', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });

      // Auto-generate clusters
      setTimeout(() => {
        handleGenerateClusters();
      }, 500);
    } catch (error) {
      toast.error('Profile save failed. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
      setIsSavingProfile(false);
    }
  };

  // Restart - go back to profile entry
  const handleRestart = () => {
    setCurrentStep('profile_entry');
    setOriginalDescription('');
    setEnhancedDescription('');
    setWebsiteUrl('');
    setGeneratedClusters([]);
    setKeywords([]);
    setIsSavingProfile(false);
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
      {/* Join BBB Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}
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
            <DialogDescription className="text-center space-y-3 pt-2">
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
            </DialogDescription>
          </DialogHeader>

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

      {/* Profile Entry Form */}
      {currentStep === 'profile_entry' && (
        <ProfileEntryForm
          onSubmit={handleFormSubmit}
          onEnhanceWithAI={handleEnhanceWithAI}
          isEnhancing={enhanceProfileMutation.isPending}
          isSaving={scrapeWebsiteMutation.isPending}
        />
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

      {/* Semantic Clusters */}
      {currentStep === 'semantic_clusters' && (
        <SemanticClustersDisplay
          clusters={generatedClusters}
          businessCategory={currentTenantProfile.business_category}
          onGenerate={handleGenerateClusters}
          isGenerating={isGeneratingClusters}
          showGenerateButton={generatedClusters.length === 0}
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
