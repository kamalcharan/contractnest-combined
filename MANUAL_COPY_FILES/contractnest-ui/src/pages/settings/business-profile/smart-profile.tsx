// src/pages/settings/business-profile/smart-profile.tsx
// SmartProfile - AI-enhanced tenant profile page with Create/View/Edit wizard flow
// Follows BBB membership profile pattern but for tenant-level profiles

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
  Search
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '../../../hooks/useTenantProfile';
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
import toast from 'react-hot-toast';
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

type WizardStep =
  | 'profile_entry'
  | 'ai_enhanced'
  | 'website_scraped'
  | 'semantic_clusters'
  | 'success';

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
  const [currentStep, setCurrentStep] = useState<WizardStep>('profile_entry');
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
  const [showLearnMore, setShowLearnMore] = useState(false);

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
      setIsEditMode(false); // Start in view mode if profile exists
    } else {
      setIsEditMode(true); // Start in edit mode if no profile
    }
  }, [smartProfileData]);

  // Pre-fill from tenant profile if creating new
  useEffect(() => {
    if (!smartProfileData?.profile && tenantProfileData && !shortDescription) {
      // Build initial description from tenant profile
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
    setCurrentStep('profile_entry');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (existingProfile) {
      setEnhancedDescription(existingProfile.ai_enhanced_description || '');
      setShortDescription(existingProfile.short_description || '');
      setKeywords(existingProfile.approved_keywords || []);
      setWebsiteUrl(existingProfile.website_url || '');
      setIsEditMode(false);
      setCurrentStep('profile_entry');
    }
  };

  // Handle AI enhancement
  const handleEnhanceWithAI = async () => {
    if (!currentTenant?.id || !shortDescription.trim()) return;

    try {
      const result = await enhanceSmartProfileMutation.mutateAsync({
        tenant_id: currentTenant.id,
        short_description: shortDescription
      });

      setEnhancedDescription(result.ai_enhanced_description);
      setKeywords(result.suggested_keywords || []);
      setCurrentStep('ai_enhanced');

      toast.success('AI enhancement complete!');
    } catch (error: any) {
      toast.error(error.message || 'Enhancement failed');
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

      setEnhancedDescription(result.ai_enhanced_description);
      setKeywords(result.suggested_keywords || []);
      setCurrentStep('website_scraped');

      toast.success('Website analyzed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Website scraping failed');
    }
  };

  // Save profile and move to clusters
  const handleSaveProfile = async () => {
    if (!currentTenant?.id) return;

    // Debug: log what we're saving
    console.log('🔍 handleSaveProfile called with state:', {
      enhancedDescription: enhancedDescription?.substring(0, 100),
      shortDescription: shortDescription?.substring(0, 50),
      keywords: keywords?.length,
      websiteUrl,
      generationMethod
    });

    try {
      await saveSmartProfileMutation.mutateAsync({
        tenant_id: currentTenant.id,
        short_description: shortDescription,
        ai_enhanced_description: enhancedDescription,  // Read from state directly - no closure issues
        approved_keywords: keywords,
        website_url: websiteUrl || undefined,
        generation_method: generationMethod,
        profile_type: 'business'
      });

      // Refetch profile
      queryClient.invalidateQueries({
        queryKey: smartProfileQueryKeys.profile(currentTenant.id)
      });

      setIsEditMode(false);
      setCurrentStep('semantic_clusters');

      toast.success('Profile saved! Now let\'s generate search clusters.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
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

      // Keep manually added clusters
      const manualClusters = clusters.filter(c => c.isNew);
      setClusters([...newClusters, ...manualClusters]);
      setHasClusterChanges(true);

      toast.success(`Generated ${result.clusters_generated} clusters!`);
    } catch (error: any) {
      toast.error(error.message || 'Cluster generation failed');
    }
  };

  // Save clusters
  const handleSaveClusters = async () => {
    if (!currentTenant?.id || clusters.length === 0) return;

    // Validate all clusters have primary terms
    const invalidClusters = clusters.filter(c => !c.primary_term.trim());
    if (invalidClusters.length > 0) {
      toast.error('All clusters must have a primary term');
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

      toast.success('Clusters saved! Your profile is now searchable.');
      setCurrentStep('success');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save clusters');
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
      toast.error('Primary term is required');
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
      toast.error('Term already exists');
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

  // Restart wizard
  const handleRestart = () => {
    setCurrentStep('profile_entry');
    setIsEditMode(true);
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
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ========================================== */}
          {/* READONLY VIEW - When profile exists and not editing */}
          {/* ========================================== */}
          {currentStep === 'profile_entry' && existingProfile && !isEditMode && (
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}15`
              }}
            >
              {/* Header with Edit Button */}
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
                      Your Smart Profile
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4" style={{ color: colors.semantic.success }} />
                      <span className="text-sm" style={{ color: colors.semantic.success }}>
                        Active & Searchable
                      </span>
                      {existingProfile.embedding && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: colors.semantic.success + '20',
                            color: colors.semantic.success
                          }}
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
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#FFF'
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Profile Content */}
              <div className="p-6 space-y-6">
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
                      className="p-4 rounded-lg min-h-[100px]"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${colors.utility.primaryText}15`,
                        color: colors.utility.secondaryText
                      }}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
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
                          style={{
                            backgroundColor: `${colors.brand.primary}15`,
                            color: colors.brand.primary
                          }}
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
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Profile Type:
                    </span>
                    <span className="text-sm font-medium capitalize" style={{ color: colors.utility.primaryText }}>
                      {existingProfile.profile_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Last Updated:
                    </span>
                    <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                      {formatDate(existingProfile.updated_at)}
                    </span>
                  </div>
                </div>

                {/* View/Edit Clusters Button */}
                <div className="pt-4">
                  <button
                    onClick={() => setCurrentStep('semantic_clusters')}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      border: `1px solid ${colors.utility.primaryText}20`
                    }}
                  >
                    <Brain className="w-4 h-4" />
                    <span>View/Edit Semantic Clusters ({clusters.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PROFILE ENTRY FORM - When creating or editing */}
          {/* ========================================== */}
          {currentStep === 'profile_entry' && (!existingProfile || isEditMode) && (
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`
              }}
            >
              {/* Header */}
              <div
                className="p-6"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
                  borderBottom: `1px solid ${colors.utility.primaryText}15`
                }}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${colors.brand.primary}20` }}
                  >
                    {isEditMode && existingProfile ? (
                      <Pencil className="w-6 h-6" style={{ color: colors.brand.primary }} />
                    ) : (
                      <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                      {isEditMode && existingProfile ? 'Edit Your Smart Profile' : 'Create Your Smart Profile'}
                    </h3>
                    <p
                      className="text-sm font-normal mt-1 leading-relaxed"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {isEditMode && existingProfile
                        ? 'Update your business description below. You can edit the text directly or re-enhance with AI.'
                        : 'I will help you create an AI-enhanced profile that makes your business more discoverable in searches.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                {/* Cancel Edit button */}
                {isEditMode && existingProfile && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.secondaryText,
                        border: `1px solid ${colors.utility.primaryText}20`
                      }}
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel Edit</span>
                    </button>
                  </div>
                )}

                {/* Generation Method Selection */}
                <div className="space-y-4">
                  <label
                    className="block text-sm font-semibold mb-3"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {isEditMode && existingProfile ? 'Update method:' : 'How would you like to create your profile?'}
                  </label>

                  {/* Manual Entry Option */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${generationMethod === 'manual' ? 'ring-2' : ''}`}
                    style={{
                      backgroundColor: generationMethod === 'manual' ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                      borderColor: generationMethod === 'manual' ? colors.brand.primary : `${colors.utility.primaryText}20`
                    }}
                    onClick={() => setGenerationMethod('manual')}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="manual"
                        name="generation_method"
                        value="manual"
                        checked={generationMethod === 'manual'}
                        onChange={() => setGenerationMethod('manual')}
                        className="mt-1"
                        style={{ accentColor: colors.brand.primary }}
                      />
                      <div className="flex-1">
                        <label htmlFor="manual" className="flex items-center space-x-2 cursor-pointer">
                          <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                          <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                            Enter description manually
                          </span>
                        </label>
                        <p className="text-sm mt-1 ml-7" style={{ color: colors.utility.secondaryText }}>
                          Provide a brief description and AI will enhance it
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Website Scraping Option */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${generationMethod === 'website' ? 'ring-2' : ''}`}
                    style={{
                      backgroundColor: generationMethod === 'website' ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
                      borderColor: generationMethod === 'website' ? colors.brand.primary : `${colors.utility.primaryText}20`
                    }}
                    onClick={() => setGenerationMethod('website')}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id="website"
                        name="generation_method"
                        value="website"
                        checked={generationMethod === 'website'}
                        onChange={() => setGenerationMethod('website')}
                        className="mt-1"
                        style={{ accentColor: colors.brand.primary }}
                      />
                      <div className="flex-1">
                        <label htmlFor="website" className="flex items-center space-x-2 cursor-pointer">
                          <Globe className="w-5 h-5" style={{ color: colors.brand.secondary }} />
                          <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                            Use my website to generate profile
                          </span>
                        </label>
                        <p className="text-sm mt-1 ml-7" style={{ color: colors.utility.secondaryText }}>
                          AI will analyze your website and create your profile automatically
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Form Fields */}
                {generationMethod === 'manual' ? (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="short_description"
                        className="block text-sm font-medium mb-2"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {isEditMode && existingProfile ? "Edit Your Description *" : "Short Description *"}
                      </label>
                      <textarea
                        id="short_description"
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        placeholder="Describe your business - what you do, your services, expertise, and what makes you unique..."
                        rows={6}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                        style={{
                          borderColor: `${colors.utility.secondaryText}40`,
                          backgroundColor: colors.utility.secondaryBackground,
                          color: colors.utility.primaryText
                        }}
                        disabled={enhanceSmartProfileMutation.isPending}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                          {shortDescription.length}/2000 characters
                        </span>
                        {shortDescription.length > 0 && shortDescription.length < 50 && (
                          <div className="flex items-center space-x-1" style={{ color: colors.semantic.warning }}>
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-xs">Too short. Provide more details for better AI enhancement.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhance with AI Button */}
                    <button
                      type="button"
                      onClick={handleEnhanceWithAI}
                      disabled={!shortDescription.trim() || enhanceSmartProfileMutation.isPending}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: colors.semantic.success,
                        color: '#FFFFFF'
                      }}
                    >
                      {enhanceSmartProfileMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Enhancing with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>{isEditMode && existingProfile ? 'Re-enhance with AI' : 'Enhance with AI'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="website_url"
                      className="block text-sm font-medium mb-2"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Website URL *
                    </label>
                    <input
                      type="url"
                      id="website_url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://www.yourcompany.com"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                      style={{
                        borderColor: `${colors.utility.secondaryText}40`,
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText
                      }}
                      disabled={scrapeWebsiteMutation.isPending}
                    />
                    <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
                      AI will scrape your website and generate a profile based on your content
                    </p>

                    {/* Scrape Website Button */}
                    <button
                      type="button"
                      onClick={handleScrapeWebsite}
                      disabled={!websiteUrl.trim() || scrapeWebsiteMutation.isPending}
                      className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                        color: '#FFFFFF'
                      }}
                    >
                      {scrapeWebsiteMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Analyzing website...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-5 h-5" />
                          <span>Analyze Website</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Info Box */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: `${colors.semantic.info}15`,
                    border: `1px solid ${colors.semantic.info}40`
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.semantic.info }} />
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
                        {generationMethod === 'manual' ? 'AI Enhancement Available' : 'Automatic Profile Generation'}
                      </p>
                      <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        {generationMethod === 'manual'
                          ? 'Click "Enhance with AI" to expand your description into a professional profile with semantic keywords for better searchability.'
                          : 'AI will analyze your website content and automatically create a comprehensive business profile including services and keywords.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* AI ENHANCED VIEW */}
          {/* ========================================== */}
          {(currentStep === 'ai_enhanced' || currentStep === 'website_scraped') && (
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}15`
              }}
            >
              {/* Header */}
              <div
                className="p-6"
                style={{
                  background: `linear-gradient(135deg, ${colors.semantic.success}10 0%, ${colors.brand.primary}10 100%)`,
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${colors.semantic.success}20` }}
                  >
                    <Sparkles className="w-6 h-6" style={{ color: colors.semantic.success }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
                      {currentStep === 'ai_enhanced' ? 'AI-Enhanced Description' : 'Website Analysis Complete'}
                    </h3>
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Review and save your enhanced profile
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Enhanced Description */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Enhanced Description
                  </label>
                  <div
                    className="p-4 rounded-lg min-h-[150px]"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${colors.utility.primaryText}15`,
                      color: colors.utility.secondaryText
                    }}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{enhancedDescription}</p>
                  </div>
                </div>

                {/* Original Description */}
                {shortDescription && shortDescription !== enhancedDescription && (
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
                      <p className="text-sm whitespace-pre-wrap">{shortDescription}</p>
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {keywords.length > 0 && (
                  <div>
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Suggested Keywords
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, idx) => (
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

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saveSmartProfileMutation.isPending}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                    }}
                  >
                    {saveSmartProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save & Continue to Clusters</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRestart}
                    disabled={saveSmartProfileMutation.isPending}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.secondaryText,
                      border: `1px solid ${colors.utility.primaryText}20`
                    }}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SEMANTIC CLUSTERS */}
          {/* ========================================== */}
          {currentStep === 'semantic_clusters' && (
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}15`
              }}
            >
              {/* Header */}
              <div
                className="p-6"
                style={{
                  background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Brain className="w-6 h-6" style={{ color: colors.brand.primary }} />
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                        Semantic Clusters
                      </h2>
                      <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                        AI-powered search optimization for your profile
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {clusters.length > 0 && (
                      <div
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${colors.semantic.success}15`,
                          color: colors.semantic.success
                        }}
                      >
                        {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    <button
                      onClick={() => setShowLearnMore(!showLearnMore)}
                      className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: `${colors.semantic.info}15`,
                        color: colors.semantic.info
                      }}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Learn More</span>
                    </button>
                  </div>
                </div>

                {/* Learn More Section */}
                {showLearnMore && (
                  <div
                    className="mt-4 p-5 rounded-xl space-y-4"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${colors.semantic.info}30`
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <Brain className="w-5 h-5 flex-shrink-0" style={{ color: colors.semantic.info }} />
                      <div>
                        <h3 className="font-semibold text-base mb-1" style={{ color: colors.utility.primaryText }}>
                          What are Semantic Clusters?
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                          Semantic clusters are groups of related terms that help our AI understand your business better.
                          Each cluster contains a <strong>primary term</strong> and multiple <strong>related terms</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Search className="w-5 h-5 flex-shrink-0" style={{ color: colors.brand.primary }} />
                      <div>
                        <h3 className="font-semibold text-base mb-1" style={{ color: colors.utility.primaryText }}>
                          How do they improve search?
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                          When customers search, they use various terms. Clusters ensure your profile appears in
                          relevant searches even when exact keywords don't match.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-b" style={{ borderColor: `${colors.utility.primaryText}10` }}>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleGenerateClusters}
                    disabled={generateClustersMutation.isPending || !enhancedDescription}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                      color: '#FFF'
                    }}
                  >
                    {generateClustersMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>{clusters.length > 0 ? 'Regenerate Clusters' : 'Generate Clusters with AI'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleAddManualCluster}
                    disabled={generateClustersMutation.isPending}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      border: `1px solid ${colors.utility.primaryText}20`
                    }}
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Custom Cluster</span>
                  </button>

                  <button
                    onClick={() => setCurrentStep('profile_entry')}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.secondaryText
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Profile</span>
                  </button>
                </div>

                {!enhancedDescription && (
                  <div
                    className="mt-3 flex items-center space-x-2 text-sm"
                    style={{ color: colors.semantic.warning }}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Save your profile first to generate clusters</span>
                  </div>
                )}
              </div>

              {/* Clusters List */}
              <div className="p-6 space-y-4">
                {clusters.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-lg"
                    style={{ backgroundColor: colors.utility.primaryBackground }}
                  >
                    <Brain
                      className="w-16 h-16 mx-auto mb-4 opacity-30"
                      style={{ color: colors.utility.secondaryText }}
                    />
                    <p className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                      No clusters yet
                    </p>
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Generate clusters with AI or add them manually
                    </p>
                  </div>
                ) : (
                  clusters.map((cluster, index) => (
                    <div
                      key={index}
                      className="rounded-xl overflow-hidden transition-all"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${editingCluster === index ? colors.brand.primary : colors.utility.primaryText}20`
                      }}
                    >
                      {/* Cluster Header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => editingCluster !== index && setExpandedCluster(expandedCluster === index ? null : index)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Tag
                            className="w-5 h-5"
                            style={{ color: cluster.isNew ? colors.semantic.info : colors.brand.primary }}
                          />

                          {editingCluster === index ? (
                            <input
                              type="text"
                              value={editForm?.primary_term || ''}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, primary_term: e.target.value } : null)}
                              placeholder="Primary term (e.g., 'accounting')"
                              className="flex-1 px-3 py-1.5 rounded-lg text-base font-medium"
                              style={{
                                backgroundColor: colors.utility.secondaryBackground,
                                color: colors.utility.primaryText,
                                border: `1px solid ${colors.brand.primary}40`
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                              {cluster.primary_term || 'New Cluster'}
                            </span>
                          )}

                          {cluster.isNew && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${colors.semantic.info}15`,
                                color: colors.semantic.info
                              }}
                            >
                              Custom
                            </span>
                          )}

                          {cluster.confidence_score && !cluster.isNew && (
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${colors.semantic.success}15`,
                                color: colors.semantic.success
                              }}
                            >
                              {Math.round(cluster.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {editingCluster !== index && cluster.category && (
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${colors.brand.secondary}15`,
                                color: colors.brand.secondary
                              }}
                            >
                              {cluster.category}
                            </span>
                          )}

                          {editingCluster === index ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSaveClusterEdit(index); }}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.success}15`, color: colors.semantic.success }}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelClusterEdit(index); }}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditCluster(index); }}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.info}15`, color: colors.semantic.info }}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCluster(index); }}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: `${colors.semantic.error}15`, color: colors.semantic.error }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {expandedCluster === index ? (
                                <ChevronUp className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                              ) : (
                                <ChevronDown className="w-5 h-5" style={{ color: colors.utility.secondaryText }} />
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {(expandedCluster === index || editingCluster === index) && (
                        <div
                          className="px-4 pb-4 pt-0 space-y-4"
                          style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}
                        >
                          {/* Category Selector (in edit mode) */}
                          {editingCluster === index && (
                            <div className="pt-4">
                              <label
                                className="block text-sm font-medium mb-2"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                Category
                              </label>
                              <select
                                value={editForm?.category || 'Services'}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, category: e.target.value } : null)}
                                className="w-full px-3 py-2 rounded-lg"
                                style={{
                                  backgroundColor: colors.utility.secondaryBackground,
                                  color: colors.utility.primaryText,
                                  border: `1px solid ${colors.utility.primaryText}20`
                                }}
                              >
                                {CATEGORY_OPTIONS.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Related Terms */}
                          <div className="pt-2">
                            <label
                              className="block text-sm font-medium mb-2"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              Related Terms ({editingCluster === index ? editForm?.related_terms.length : cluster.related_terms.length})
                            </label>

                            <div className="flex flex-wrap gap-2">
                              {(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.map((term, termIndex) => (
                                <span
                                  key={termIndex}
                                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
                                  style={{
                                    backgroundColor: `${colors.brand.primary}10`,
                                    color: colors.brand.primary
                                  }}
                                >
                                  {term}
                                  {editingCluster === index && (
                                    <button
                                      onClick={() => handleRemoveRelatedTerm(termIndex)}
                                      className="ml-2 hover:opacity-70"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}

                              {(editingCluster === index ? editForm?.related_terms : cluster.related_terms)?.length === 0 && (
                                <span
                                  className="text-sm italic"
                                  style={{ color: colors.utility.secondaryText }}
                                >
                                  No related terms yet
                                </span>
                              )}
                            </div>

                            {/* Add Term Input (in edit mode) */}
                            {editingCluster === index && (
                              <div className="mt-3 flex space-x-2">
                                <input
                                  type="text"
                                  value={newTermInput}
                                  onChange={(e) => setNewTermInput(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddRelatedTerm()}
                                  placeholder="Add related term..."
                                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                                  style={{
                                    backgroundColor: colors.utility.secondaryBackground,
                                    color: colors.utility.primaryText,
                                    border: `1px solid ${colors.utility.primaryText}20`
                                  }}
                                />
                                <button
                                  onClick={handleAddRelatedTerm}
                                  disabled={!newTermInput.trim()}
                                  className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
                                  style={{
                                    backgroundColor: colors.brand.primary,
                                    color: '#FFF'
                                  }}
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
              {clusters.length > 0 && (
                <div
                  className="p-6 flex items-center justify-between"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderTop: `1px solid ${colors.utility.primaryText}10`
                  }}
                >
                  <div className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    {hasClusterChanges ? (
                      <span className="flex items-center space-x-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.semantic.warning }}
                        />
                        <span>Unsaved changes</span>
                      </span>
                    ) : (
                      <span>All changes saved</span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveClusters}
                    disabled={saveClustersMutation.isPending || !hasClusterChanges || editingCluster !== null}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: hasClusterChanges
                        ? `linear-gradient(to right, ${colors.semantic.success}, ${colors.brand.primary})`
                        : colors.utility.secondaryBackground,
                      color: hasClusterChanges ? '#FFF' : colors.utility.secondaryText,
                      border: hasClusterChanges ? 'none' : `1px solid ${colors.utility.primaryText}20`
                    }}
                  >
                    {saveClustersMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save Clusters</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* SUCCESS */}
          {/* ========================================== */}
          {currentStep === 'success' && (
            <div
              className="rounded-2xl overflow-hidden shadow-lg text-center py-12"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.semantic.success}30`
              }}
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${colors.semantic.success}15` }}
              >
                <CheckCircle className="w-10 h-10" style={{ color: colors.semantic.success }} />
              </div>

              <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
                Smart Profile Complete!
              </h2>

              <p className="text-lg mb-6" style={{ color: colors.utility.secondaryText }}>
                Your profile is now AI-enhanced and searchable
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setCurrentStep('profile_entry')}
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#FFF'
                  }}
                >
                  <Eye className="w-5 h-5" />
                  <span>View Profile</span>
                </button>

                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    border: `1px solid ${colors.utility.primaryText}20`
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          {currentStep === 'profile_entry' && (
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
          )}
        </div>
      )}
    </div>
  );
};

export default SmartProfilePage;
