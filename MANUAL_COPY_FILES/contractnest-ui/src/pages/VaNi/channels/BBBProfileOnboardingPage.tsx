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
  mockTenantProfiles,
  mockSemanticClusters,
  simulateDelay
} from '../../../utils/fakejson/bbbMockData';
import {
  ProfileFormData,
  AIEnhancementResponse,
  WebsiteScrapingResponse,
  SemanticCluster
} from '../../../types/bbb';
import toast from 'react-hot-toast';
import { useEnhanceProfile, useScrapeWebsite } from '../../../hooks/queries/useGroupQueries';

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

  // Mock current user - in real app, get from auth context
  const currentTenantProfile = mockTenantProfiles[0]; // Vikuna Technologies

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
        membership_id: currentTenantProfile.id || 'temp-membership-id',
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
          membership_id: currentTenantProfile.id || 'temp-membership-id',
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

  return (
    <div className="min-h-screen p-6 space-y-8 max-w-5xl mx-auto">
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
      <ProfileCard profile={currentTenantProfile} showTitle={true} />

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
        <AIEnhancementSection
          originalDescription={originalDescription}
          enhancedDescription={enhancedDescription}
          onSave={handleSaveFromEnhancement}
          isSaving={isSavingProfile}
        />
      )}

      {/* Website Scraping Results */}
      {currentStep === 'website_scraped' && (
        <WebsiteScrapingForm
          websiteUrl={websiteUrl}
          generatedDescription={enhancedDescription}
          onSave={handleSaveFromEnhancement}
          isSaving={isSavingProfile}
        />
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