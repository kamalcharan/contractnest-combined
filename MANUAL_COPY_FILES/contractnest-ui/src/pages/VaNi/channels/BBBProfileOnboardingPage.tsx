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

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile_entry');
  const [originalDescription, setOriginalDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [generatedClusters, setGeneratedClusters] = useState<SemanticCluster[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // Loading states
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [isGeneratingClusters, setIsGeneratingClusters] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Simulate AI Enhancement
  const handleEnhanceWithAI = async (description: string) => {
    setIsEnhancing(true);
    setOriginalDescription(description);

    try {
      // Simulate API call
      await simulateDelay(2000);

      // Mock AI enhancement
      const enhanced = `We are ${currentTenantProfile.business_name}, a leading ${currentTenantProfile.business_category} provider in ${currentTenantProfile.city}. ${description} Our expert team delivers comprehensive solutions tailored to your business needs. With years of experience serving diverse clients, we transform challenges into opportunities. Contact us at ${currentTenantProfile.business_phone_code} ${currentTenantProfile.business_phone} or visit ${currentTenantProfile.website_url} to discover how we can help your business thrive and achieve sustainable growth.`;

      const mockKeywords = ['IT Services', 'Software Development', 'Cloud Solutions', 'Digital Transformation', 'Technology Consulting'];

      setEnhancedDescription(enhanced);
      setKeywords(mockKeywords);
      setCurrentStep('ai_enhanced');

      toast.success('AI enhancement complete!', {
        style: { background: colors.semantic.success, color: '#FFF' }
      });
    } catch (error) {
      toast.error('Enhancement failed. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: ProfileFormData) => {
    if (data.generation_method === 'website' && data.website_url) {
      // Website scraping flow
      setIsScrapingWebsite(true);
      setWebsiteUrl(data.website_url);

      try {
        // Simulate website scraping
        await simulateDelay(3000);

        const scrapedDescription = `${currentTenantProfile.business_name} is a premier ${currentTenantProfile.business_category} company specializing in innovative solutions for modern businesses. We offer comprehensive services including consulting, implementation, and ongoing support. Our team of experienced professionals is dedicated to delivering exceptional results that drive business growth. Based in ${currentTenantProfile.city}, we serve clients across various industries with customized solutions that meet their unique requirements. Visit our website at ${data.website_url} to learn more about our services and success stories.`;

        const mockKeywords = [
          currentTenantProfile.business_category || 'Services',
          'Consulting',
          'Solutions',
          'Innovation',
          'Business Growth'
        ];

        setEnhancedDescription(scrapedDescription);
        setKeywords(mockKeywords);
        setCurrentStep('website_scraped');

        toast.success('Website analyzed successfully!', {
          style: { background: colors.semantic.success, color: '#FFF' }
        });
      } catch (error) {
        toast.error('Website scraping failed. Please try manual entry.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      } finally {
        setIsScrapingWebsite(false);
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