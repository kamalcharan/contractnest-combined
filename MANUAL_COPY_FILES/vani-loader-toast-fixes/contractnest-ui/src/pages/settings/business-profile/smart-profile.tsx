// src/pages/settings/business-profile/smart-profile.tsx
// SmartProfile - AI-enhanced tenant profile with 65:35 split view
// Updated with VaNiLoader & VaNiToast

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Tag,
  Brain,
  Zap,
  Clock,
  Info,
  FileText,
  Globe,
  Pencil,
  Eye,
  Save,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search,
  Building2
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  useSmartProfile,
  useSaveSmartProfile,
  useEnhanceSmartProfile,
  useScrapeWebsiteForSmartProfile,
  useGenerateSmartProfileClusters,
  useSaveSmartProfileClusters,
  smartProfileQueryKeys
} from '../../../hooks/queries/useGroupQueries';
import { useQueryClient } from '@tanstack/react-query';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { VaNiLoader, InlineLoader } from '@/components/common/loaders/UnifiedLoader';
import { analyticsService } from '@/services/analytics.service';

// Types
interface SmartProfileCluster {
  id?: string;
  tenant_id?: string;
  primary_term: string;
  related_terms: string[];
  category: string;
  confidence_score: number;
  is_active?: boolean;
  isNew?: boolean;
  isEditing?: boolean;
}

// Category options for clusters
const CATEGORY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Services',
  'Manufacturing',
  'Trading',
  'Education',
  'Finance',
  'Real Estate',
  'Retail',
  'Hospitality',
  'Consulting',
  'Other'
];

const SmartProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const queryClient = useQueryClient();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get tenant profile data for pre-filling
  const { profile: tenantProfileData, loading: isLoadingTenantProfile } = useTenantProfile();

  // Get existing SmartProfile
  const { data: smartProfileData, isLoading: isLoadingSmartProfile } = useSmartProfile(currentTenant?.id || '');

  // Mutations
  const saveSmartProfileMutation = useSaveSmartProfile();
  const enhanceSmartProfileMutation = useEnhanceSmartProfile();
  const scrapeWebsiteMutation = useScrapeWebsiteForSmartProfile();
  const generateClustersMutation = useGenerateSmartProfileClusters();
  const saveClustersMutation = useSaveSmartProfileClusters();

  // State
  const [isEditMode, setIsEditMode] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<'manual' | 'website'>('manual');
  const [shortDescription, setShortDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [clusters, setClusters] = useState<SmartProfileCluster[]>([]);
  const [hasClusterChanges, setHasClusterChanges] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [editingCluster, setEditingCluster] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SmartProfileCluster | null>(null);
  const [newTermInput, setNewTermInput] = useState('');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<'entry' | 'enhanced' | 'clusters' | 'success'>('entry');

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView('settings/business-profile/smart-profile', 'Smart Profile');
  }, []);

  // Initialize from existing profile
  useEffect(() => {
    if (smartProfileData?.profile) {
      const profile = smartProfileData.profile;
      setEnhancedDescription(profile.ai_enhanced_description || '');
      setShortDescription(profile.short_description || '');
      setKeywords(profile.approved_keywords || []);
      setWebsiteUrl(profile.website_url || '');
      setGenerationMethod(profile.generation_method || 'manual');
      setClusters(smartProfileData.clusters || []);
      setIsEditMode(false);
      setShowCreateWizard(false);
    } else if (!isLoadingSmartProfile) {
      setShowCreateWizard(true);
    }
  }, [smartProfileData, isLoadingSmartProfile]);

  // Pre-fill from tenant profile if creating new
  useEffect(() => {
    if (!smartProfileData?.profile && tenantProfileData && !shortDescription) {
      const parts = [
        tenantProfileData.business_name,
        tenantProfileData.description
      ].filter(Boolean);

      if (parts.length > 0) {
        setShortDescription(parts.join(' - '));
      }

      if (tenantProfileData.website_url) {
        setWebsiteUrl(tenantProfileData.website_url);
      }
    }
  }, [tenantProfileData, smartProfileData, shortDescription]);

  const loading = isLoadingSmartProfile || isLoadingTenantProfile;
  const existingProfile = smartProfileData?.profile;

  // Handle back navigation
  const handleBack = () => {
    navigate('/settings/business-profile');
  };

  // Enter edit mode
  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setShowCreateWizard(true);
    setWizardStep('entry');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (existingProfile) {
      setEnhancedDescription(existingProfile.ai_enhanced_description || '');
      setShortDescription(existingProfile.short_description || '');
      setKeywords(existingProfile.approved_keywords || []);
      setWebsiteUrl(existingProfile.website_url || '');
      setIsEditMode(false);
      setShowCreateWizard(false);
      setWizardStep('entry');
    }
  };

  // Helper: Extract keywords from text (fallback when AI unavailable)
  const extractKeywordsFromText = (text: string): string[] => {
    if (!text) return [];
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
      'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'our', 'your', 'their', 'my', 'into', 'onto', 'upon'
    ]);
    const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word));
    const unique = [...new Set(words)];
    return unique.slice(0, 8).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  };

  // Helper: Generate basic enhanced description (fallback when AI unavailable)
  const generateFallbackDescription = (text: string): string => {
    return `${text}\n\nWe are a professional organization committed to delivering high-quality services and solutions to our clients. Our team brings expertise, innovation, and dedication to every project we undertake.`;
  };

  // Handle AI enhancement
  const handleEnhanceWithAI = async () => {
    if (!currentTenant?.id || !shortDescription.trim()) return;

    try {
      const result = await enhanceSmartProfileMutation.mutateAsync({
        tenant_id: currentTenant.id,
        short_description: shortDescription
      });

      // Use returned values or fallback if null/empty
      const enhanced = result.ai_enhanced_description || generateFallbackDescription(shortDescription);
      const kws = (result.suggested_keywords && result.suggested_keywords.length > 0)
        ? result.suggested_keywords
        : extractKeywordsFromText(shortDescription);

      setEnhancedDescription(enhanced);
      setKeywords(kws);
      setWizardStep('enhanced');

      vaniToast.success('AI enhancement complete!');
    } catch (error: any) {
      // Fallback: Use basic enhancement when AI is unavailable
      console.warn('AI enhancement failed, using fallback:', error.message);
      const fallbackDesc = generateFallbackDescription(shortDescription);
      const fallbackKeywords = extractKeywordsFromText(shortDescription);

      setEnhancedDescription(fallbackDesc);
      setKeywords(fallbackKeywords);
      setWizardStep('enhanced');

      vaniToast.success('Profile prepared (AI temporarily unavailable)');
    }
  };

  // Handle website scraping
  const handleScrapeWebsite = async () => {
    if (!currentTenant?.id || !websiteUrl.trim()) return;

    try {
      const result = await scrapeWebsiteMutation.mutateAsync({
        tenant_id: currentTenant.id,
        website_url: websiteUrl
      });

      // Use returned values or fallback if null/empty
      const enhanced = result.ai_enhanced_description || generateFallbackDescription(`Business with online presence at ${websiteUrl}`);
      const kws = (result.suggested_keywords && result.suggested_keywords.length > 0)
        ? result.suggested_keywords
        : ['Professional', 'Services', 'Quality', 'Solutions'];

      setEnhancedDescription(enhanced);
      setKeywords(kws);
      setWizardStep('enhanced');

      vaniToast.success('Website analyzed successfully!');
    } catch (error: any) {
      // Fallback: Use basic enhancement when website scraping is unavailable
      console.warn('Website scraping failed, using fallback:', error.message);
      const fallbackDesc = generateFallbackDescription(`Business with online presence at ${websiteUrl}`);
      const fallbackKeywords = ['Professional', 'Services', 'Quality', 'Solutions'];

      setEnhancedDescription(fallbackDesc);
      setKeywords(fallbackKeywords);
      setWizardStep('enhanced');

      vaniToast.success('Profile prepared (website analysis temporarily unavailable)');
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!currentTenant?.id) return;

    try {
      await saveSmartProfileMutation.mutateAsync({
        tenant_id: currentTenant.id,
        short_description: shortDescription,
        ai_enhanced_description: enhancedDescription,
        approved_keywords: keywords,
        website_url: websiteUrl || undefined,
        generation_method: generationMethod,
        profile_type: 'business'
      });

      queryClient.invalidateQueries({
        queryKey: smartProfileQueryKeys.profile(currentTenant.id)
      });

      setIsEditMode(false);
      setShowCreateWizard(false);
      setWizardStep('entry');

      vaniToast.success('Profile saved successfully!');
    } catch (error: any) {
      vaniToast.error(error.message || 'Failed to save profile');
    }
  };

  // Generate clusters
  const handleGenerateClusters = async () => {
    if (!currentTenant?.id || !enhancedDescription) return;

    try {
      const result = await generateClustersMutation.mutateAsync({
        tenant_id: currentTenant.id,
        profile_text: enhancedDescription,
        keywords: keywords
      });

      const newClusters: SmartProfileCluster[] = result.clusters.map(c => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score || 0.9,
        is_active: true
      }));

      const manualClusters = clusters.filter(c => c.isNew);
      setClusters([...newClusters, ...manualClusters]);
      setHasClusterChanges(true);

      vaniToast.success(`Generated ${result.clusters_generated} clusters!`);
    } catch (error: any) {
      vaniToast.error(error.message || 'Cluster generation failed');
    }
  };

  // Save clusters
  const handleSaveClusters = async () => {
    if (!currentTenant?.id || clusters.length === 0) return;

    const invalidClusters = clusters.filter(c => !c.primary_term.trim());
    if (invalidClusters.length > 0) {
      vaniToast.error('All clusters must have a primary term');
      return;
    }

    try {
      const clustersToSave = clusters.map(c => ({
        primary_term: c.primary_term.trim(),
        related_terms: c.related_terms,
        category: c.category,
        confidence_score: c.confidence_score || 1.0
      }));

      await saveClustersMutation.mutateAsync({
        tenantId: currentTenant.id,
        clusters: clustersToSave
      });

      setHasClusterChanges(false);
      setClusters(clusters.map(c => ({ ...c, isNew: false })));

      vaniToast.success('Clusters saved successfully!');
    } catch (error: any) {
      vaniToast.error(error.message || 'Failed to save clusters');
    }
  };

  // Add manual cluster
  const handleAddManualCluster = () => {
    const newCluster: SmartProfileCluster = {
      primary_term: '',
      related_terms: [],
      category: 'Services',
      confidence_score: 1.0,
      isNew: true,
      isEditing: true
    };

    setClusters([...clusters, newCluster]);
    setEditingCluster(clusters.length);
    setEditForm(newCluster);
    setExpandedCluster(clusters.length);
    setHasClusterChanges(true);
  };

  // Edit cluster
  const handleEditCluster = (index: number) => {
    setEditingCluster(index);
    setEditForm({ ...clusters[index] });
    setExpandedCluster(index);
  };

  // Save cluster edit
  const handleSaveClusterEdit = (index: number) => {
    if (!editForm || !editForm.primary_term.trim()) {
      vaniToast.error('Primary term is required');
      return;
    }

    const updatedClusters = [...clusters];
    updatedClusters[index] = { ...editForm, isEditing: false };
    setClusters(updatedClusters);
    setEditingCluster(null);
    setEditForm(null);
    setHasClusterChanges(true);
  };

  // Cancel cluster edit
  const handleCancelClusterEdit = (index: number) => {
    if (clusters[index].isNew && !clusters[index].primary_term.trim()) {
      setClusters(clusters.filter((_, i) => i !== index));
    }
    setEditingCluster(null);
    setEditForm(null);
  };

  // Delete cluster
  const handleDeleteCluster = (index: number) => {
    setClusters(clusters.filter((_, i) => i !== index));
    setHasClusterChanges(true);
    if (editingCluster === index) {
      setEditingCluster(null);
      setEditForm(null);
    }
  };

  // Add related term
  const handleAddRelatedTerm = () => {
    if (!editForm || !newTermInput.trim()) return;

    const term = newTermInput.trim().toLowerCase();
    if (editForm.related_terms.includes(term)) {
      vaniToast.error('Term already exists');
      return;
    }

    setEditForm({
      ...editForm,
      related_terms: [...editForm.related_terms, term]
    });
    setNewTermInput('');
  };

  // Remove related term
  const handleRemoveRelatedTerm = (termIndex: number) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      related_terms: editForm.related_terms.filter((_, i) => i !== termIndex)
    });
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

  // Loading state
  if (loading) {
    return (
      <div className="p-6 min-h-screen">
        <VaNiLoader size="lg" message="Loading Smart Profile..." fullScreen />
      </div>
    );
  }

  // ========================================
  // CREATE WIZARD (No existing profile OR Edit mode)
  // ========================================
  if (showCreateWizard || !existingProfile) {
    return (
      <div
        className="p-6 min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.secondaryText + '10' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={isEditMode ? handleCancelEdit : handleBack}
              className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
              style={{ backgroundColor: colors.utility.secondaryText + '20' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
            </button>
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: colors.utility.primaryText }}
              >
                <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
                {isEditMode ? 'Edit Smart Profile' : 'Create Smart Profile'}
              </h1>
              <p style={{ color: colors.utility.secondaryText }}>
                AI-powered enhancement for better discoverability
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Step 1: Profile Entry */}
          {wizardStep === 'entry' && (
            <Card style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}20` }}>
              <CardHeader style={{ background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)` }}>
                <CardTitle className="flex items-center space-x-2" style={{ color: colors.utility.primaryText }}>
                  <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  <span>Business Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Generation Method */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                    How would you like to create your profile?
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${generationMethod === 'manual' ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: generationMethod === 'manual' ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                        borderColor: generationMethod === 'manual' ? colors.brand.primary : `${colors.utility.primaryText}20`
                      }}
                      onClick={() => setGenerationMethod('manual')}
                    >
                      <FileText className="w-6 h-6 mb-2" style={{ color: colors.brand.primary }} />
                      <p className="font-semibold" style={{ color: colors.utility.primaryText }}>Manual Entry</p>
                      <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Enter description & AI enhances</p>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${generationMethod === 'website' ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: generationMethod === 'website' ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                        borderColor: generationMethod === 'website' ? colors.brand.primary : `${colors.utility.primaryText}20`
                      }}
                      onClick={() => setGenerationMethod('website')}
                    >
                      <Globe className="w-6 h-6 mb-2" style={{ color: colors.brand.secondary }} />
                      <p className="font-semibold" style={{ color: colors.utility.primaryText }}>Website Analysis</p>
                      <p className="text-sm" style={{ color: colors.utility.secondaryText }}>AI scrapes & generates profile</p>
                    </div>
                  </div>
                </div>

                {/* Input Field */}
                {generationMethod === 'manual' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                      Business Description *
                    </label>
                    <textarea
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Describe your business, services, expertise, and what makes you unique..."
                      rows={6}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                      style={{
                        borderColor: `${colors.utility.secondaryText}40`,
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                      {shortDescription.length}/2000 characters
                    </p>

                    <button
                      onClick={handleEnhanceWithAI}
                      disabled={!shortDescription.trim() || enhanceSmartProfileMutation.isPending}
                      className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: colors.semantic.success, color: '#FFF' }}
                    >
                      {enhanceSmartProfileMutation.isPending ? (
                        <InlineLoader size="sm" text="Enhancing..." />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Enhance with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                      Website URL *
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://www.yourcompany.com"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                      style={{
                        borderColor: `${colors.utility.secondaryText}40`,
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />

                    <button
                      onClick={handleScrapeWebsite}
                      disabled={!websiteUrl.trim() || scrapeWebsiteMutation.isPending}
                      className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`, color: '#FFF' }}
                    >
                      {scrapeWebsiteMutation.isPending ? (
                        <InlineLoader size="sm" text="Analyzing..." />
                      ) : (
                        <>
                          <Globe className="w-5 h-5" />
                          <span>Analyze Website</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Enhanced Preview */}
          {wizardStep === 'enhanced' && (
            <Card style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: `${colors.semantic.success}30` }}>
              <CardHeader style={{ background: `linear-gradient(135deg, ${colors.semantic.success}10 0%, ${colors.brand.primary}10 100%)` }}>
                <CardTitle className="flex items-center space-x-2" style={{ color: colors.utility.primaryText }}>
                  <CheckCircle className="w-5 h-5" style={{ color: colors.semantic.success }} />
                  <span>AI-Enhanced Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: colors.utility.primaryBackground, border: `1px solid ${colors.utility.primaryText}15` }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                    {enhancedDescription}
                  </p>
                </div>

                {keywords.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.utility.primaryText }}>
                      Suggested Keywords
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-full text-sm font-medium"
                          style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saveSmartProfileMutation.isPending}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})` }}
                  >
                    {saveSmartProfileMutation.isPending ? (
                      <InlineLoader size="sm" text="Saving..." />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setWizardStep('entry')}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.secondaryText, border: `1px solid ${colors.utility.primaryText}20` }}
                  >
                    Edit
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ========================================
  // 65:35 SPLIT VIEW (Existing profile)
  // ========================================
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
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: colors.utility.primaryText }}
            >
              <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
              Smart Profile
            </h1>
            <p style={{ color: colors.utility.secondaryText }}>
              AI-enhanced profile for better discoverability
            </p>
          </div>
        </div>
      </div>

      {/* 65:35 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - 65% (Profile Details) */}
        <div className="lg:col-span-8">
          <Card
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
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})` }}
                    >
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{tenantProfileData?.business_name || 'Your Business'}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="w-4 h-4" style={{ color: colors.semantic.success }} />
                        <span className="text-sm" style={{ color: colors.semantic.success }}>
                          Active & Searchable
                        </span>
                        {existingProfile.embedding && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                            style={{ backgroundColor: colors.semantic.success + '20', color: colors.semantic.success }}
                          >
                            <Zap className="w-3 h-3" />
                            Vector Indexed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleEnterEditMode}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: colors.brand.primary, color: '#FFF' }}
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* AI Enhanced Description */}
              {existingProfile.ai_enhanced_description && (
                <div>
                  <label
                    className="block text-sm font-semibold mb-2 flex items-center gap-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    AI-Enhanced Description
                  </label>
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${colors.utility.primaryText}15`
                    }}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      {existingProfile.ai_enhanced_description}
                    </p>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {existingProfile.approved_keywords && existingProfile.approved_keywords.length > 0 && (
                <div>
                  <label
                    className="block text-sm font-semibold mb-2 flex items-center gap-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Tag className="w-4 h-4" style={{ color: colors.brand.primary }} />
                    Keywords
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {existingProfile.approved_keywords.map((keyword: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${colors.brand.primary}15`, color: colors.brand.primary }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-sm" style={{ color: colors.utility.secondaryText }}>Profile Type:</span>
                  <span className="text-sm font-medium capitalize" style={{ color: colors.utility.primaryText }}>
                    {existingProfile.profile_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                  <span className="text-sm" style={{ color: colors.utility.secondaryText }}>Last Updated:</span>
                  <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                    {formatDate(existingProfile.updated_at)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 35% (Semantic Clusters) */}
        <div className="lg:col-span-4">
          <Card
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}15`
            }}
          >
            <CardHeader
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary}08 0%, ${colors.brand.secondary}08 100%)`,
                borderBottom: `1px solid ${colors.utility.primaryText}10`
              }}
            >
              <CardTitle style={{ color: colors.utility.primaryText }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    <span>Semantic Clusters</span>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                  >
                    {clusters.length} clusters
                  </span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleGenerateClusters}
                  disabled={generateClustersMutation.isPending}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`, color: '#FFF' }}
                >
                  {generateClustersMutation.isPending ? (
                    <InlineLoader size="sm" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{clusters.length > 0 ? 'Regenerate' : 'Generate'}</span>
                </button>

                <button
                  onClick={handleAddManualCluster}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}20` }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Clusters List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {clusters.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-lg"
                    style={{ backgroundColor: colors.utility.primaryBackground }}
                  >
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: colors.utility.secondaryText }} />
                    <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>No clusters yet</p>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Generate with AI or add manually</p>
                  </div>
                ) : (
                  clusters.map((cluster, index) => (
                    <div
                      key={index}
                      className="rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${editingCluster === index ? colors.brand.primary : colors.utility.primaryText}20`
                      }}
                    >
                      {/* Cluster Header */}
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer"
                        onClick={() => editingCluster !== index && setExpandedCluster(expandedCluster === index ? null : index)}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Tag className="w-4 h-4 flex-shrink-0" style={{ color: cluster.isNew ? colors.semantic.info : colors.brand.primary }} />

                          {editingCluster === index ? (
                            <input
                              type="text"
                              value={editForm?.primary_term || ''}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, primary_term: e.target.value } : null)}
                              placeholder="Primary term"
                              className="flex-1 px-2 py-1 rounded text-sm font-medium"
                              style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.brand.primary}40` }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium text-sm truncate" style={{ color: colors.utility.primaryText }}>
                              {cluster.primary_term || 'New Cluster'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {editingCluster === index ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSaveClusterEdit(index); }}
                                className="p-1.5 rounded transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelClusterEdit(index); }}
                                className="p-1.5 rounded transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditCluster(index); }}
                                className="p-1.5 rounded transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCluster(index); }}
                                className="p-1.5 rounded transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              {expandedCluster === index ? (
                                <ChevronUp className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                              ) : (
                                <ChevronDown className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {(expandedCluster === index || editingCluster === index) && (
                        <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}>
                          {/* Category */}
                          {editingCluster === index && (
                            <div className="pt-2">
                              <select
                                value={editForm?.category || 'Services'}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, category: e.target.value } : null)}
                                className="w-full px-2 py-1.5 rounded text-sm"
                                style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}20` }}
                              >
                                {CATEGORY_OPTIONS.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Related Terms */}
                          <div className="pt-2">
                            <p className="text-xs font-medium mb-1" style={{ color: colors.utility.secondaryText }}>
                              Related ({(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.map((term, termIndex) => (
                                <span
                                  key={termIndex}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                                  style={{ backgroundColor: `${colors.brand.primary}10`, color: colors.brand.primary }}
                                >
                                  {term}
                                  {editingCluster === index && (
                                    <button onClick={() => handleRemoveRelatedTerm(termIndex)} className="ml-1 hover:opacity-70">
                                      <X className="w-2 h-2" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>

                            {/* Add Term Input */}
                            {editingCluster === index && (
                              <div className="mt-2 flex space-x-1">
                                <input
                                  type="text"
                                  value={newTermInput}
                                  onChange={(e) => setNewTermInput(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddRelatedTerm()}
                                  placeholder="Add term..."
                                  className="flex-1 px-2 py-1 rounded text-xs"
                                  style={{ backgroundColor: colors.utility.secondaryBackground, color: colors.utility.primaryText, border: `1px solid ${colors.utility.primaryText}20` }}
                                />
                                <button
                                  onClick={handleAddRelatedTerm}
                                  disabled={!newTermInput.trim()}
                                  className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                                  style={{ backgroundColor: colors.brand.primary, color: '#FFF' }}
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Save Clusters Button */}
              {clusters.length > 0 && hasClusterChanges && (
                <button
                  onClick={handleSaveClusters}
                  disabled={saveClustersMutation.isPending || editingCluster !== null}
                  className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: `linear-gradient(to right, ${colors.semantic.success}, ${colors.brand.primary})`, color: '#FFF' }}
                >
                  {saveClustersMutation.isPending ? (
                    <InlineLoader size="sm" text="Saving..." />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Clusters</span>
                    </>
                  )}
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{ backgroundColor: colors.brand.primary + '08', border: `1px solid ${colors.brand.primary}20` }}
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.brand.primary }} />
          <div>
            <h4 className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
              How Smart Profiles Work
            </h4>
            <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
              Your Smart Profile is AI-enhanced for better discoverability. Semantic clusters help our search understand your business,
              improving your visibility when other businesses search for services like yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartProfilePage;
