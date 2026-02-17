// src/pages/onboarding/steps/ServedIndustriesStep.tsx
// Onboarding step: "Industries You Serve" — multi-select with parent→child drill-in
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import {
  useServedIndustriesManager,
} from '@/hooks/queries/useServedIndustries';
import * as LucideIcons from 'lucide-react';
import {
  Globe,
  Search,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const ServedIndustriesStep: React.FC = () => {
  const { onComplete, isSubmitting } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Industries catalog
  const {
    data: industriesResponse,
    isLoading: industriesLoading,
  } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Served industries manager
  const {
    servedIndustries,
    isLoading: servedLoading,
    addIndustries,
    isAdding,
  } = useServedIndustriesManager();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drillParentId, setDrillParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Already-served IDs
  const alreadyServedIds = useMemo(
    () => new Set(servedIndustries.map((si) => si.industry_id)),
    [servedIndustries]
  );

  // Check if user already has served industries (already completed)
  const isAlreadyCompleted = servedIndustries.length > 0;

  // Hierarchy detection
  const hasHierarchy = useMemo(
    () => allIndustries.some((i) => i.level !== undefined && i.level !== null),
    [allIndustries]
  );

  const parentIndustries = useMemo(
    () => hasHierarchy ? allIndustries.filter((i) => i.level === 0) : allIndustries,
    [allIndustries, hasHierarchy]
  );

  const getSubSegments = (parentId: string) =>
    allIndustries.filter((i) => i.parent_id === parentId);

  // Current drill state
  const showingSubSegments = hasHierarchy && drillParentId !== null;
  const subSegments = drillParentId ? getSubSegments(drillParentId) : [];
  const currentList = showingSubSegments ? subSegments : parentIndustries;
  const drillParent = parentIndustries.find((p) => p.id === drillParentId);

  // Filtered list
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const lower = searchTerm.toLowerCase();
    return currentList.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower))
    );
  }, [currentList, searchTerm]);

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Circle;
    return (LucideIcons as any)[iconName] || LucideIcons.Circle;
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCardClick = (industry: typeof allIndustries[0]) => {
    if (alreadyServedIds.has(industry.id)) return;

    // If viewing parents and this parent has children → drill in
    if (hasHierarchy && !showingSubSegments) {
      const children = getSubSegments(industry.id);
      if (children.length > 0) {
        setDrillParentId(industry.id);
        setSearchTerm('');
        return;
      }
    }

    toggleSelection(industry.id);
  };

  const handleSelectParent = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    if (!alreadyServedIds.has(parentId)) {
      toggleSelection(parentId);
    }
  };

  const handleBack = () => {
    setDrillParentId(null);
    setSearchTerm('');
  };

  // Save selected and move to next step
  const handleContinue = async () => {
    if (isSaving || isAdding) return;

    setIsSaving(true);
    try {
      if (selectedIds.size > 0) {
        await addIndustries(Array.from(selectedIds));
      }
      onComplete({ served_industries_count: selectedIds.size });
    } catch (error) {
      console.error('Error saving served industries:', error);
      toast.error('Failed to save industries. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Skip for already-completed view
  const handleSkipCompleted = () => {
    onComplete({});
  };

  const isLoading = industriesLoading || servedLoading;
  const canContinue = (selectedIds.size > 0 || isAlreadyCompleted) && !isSaving && !isAdding && !isSubmitting;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>Loading industries...</p>
        </div>
      </div>
    );
  }

  // Already completed view
  if (isAlreadyCompleted && selectedIds.size === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: colors.semantic.success + '20', color: colors.semantic.success }}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            Industries Already Configured
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.utility.secondaryText }}>
            You've selected {servedIndustries.length} {servedIndustries.length === 1 ? 'industry' : 'industries'} you serve.
          </p>

          {/* Show current selections */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {servedIndustries.slice(0, 8).map((si) => {
              const catalogEntry = allIndustries.find((i) => i.id === si.industry_id);
              const IconComp = getIconComponent(catalogEntry?.icon || si.industry?.icon);
              return (
                <div
                  key={si.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: colors.brand.primary + '15',
                    color: colors.brand.primary,
                  }}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  {catalogEntry?.name || si.industry?.name || 'Unknown'}
                </div>
              );
            })}
            {servedIndustries.length > 8 && (
              <span className="text-xs px-3 py-1.5" style={{ color: colors.utility.secondaryText }}>
                +{servedIndustries.length - 8} more
              </span>
            )}
          </div>

          <button
            onClick={handleSkipCompleted}
            className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
          >
            Continue to Next Step
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <p className="text-xs mt-4" style={{ color: colors.utility.secondaryText }}>
            To edit served industries, go to Settings &rarr; Business Profile after completing onboarding
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
            >
              <Globe className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
              Industries You Serve
            </h2>
            <p className="text-sm max-w-2xl mx-auto" style={{ color: colors.utility.secondaryText }}>
              Select the industries your clients or customers come from. This helps us tailor
              contract templates, compliance suggestions, and benchmarking to your business.
            </p>
          </div>

          {/* Selected count badge */}
          {selectedIds.size > 0 && (
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: colors.semantic.success + '15',
                  color: colors.semantic.success,
                }}
              >
                <Check className="w-4 h-4" />
                {selectedIds.size} {selectedIds.size === 1 ? 'industry' : 'industries'} selected
              </div>
            </div>
          )}

          {/* Back breadcrumb when drilled */}
          {showingSubSegments && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
              >
                <ArrowLeft size={16} className="mr-1" />
                Back
              </button>
              {drillParent && (
                <span className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                  {drillParent.name}
                  <span style={{ color: colors.utility.secondaryText }}> &mdash; Sub-segments</span>
                </span>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-6 max-w-md mx-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: colors.utility.secondaryText }}
            />
            <input
              type="text"
              placeholder={showingSubSegments ? 'Search sub-segments...' : 'Search industries...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20',
                color: colors.utility.primaryText,
              }}
            />
          </div>

          {/* Industry cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredList.map((industry) => {
              const IconComp = getIconComponent(industry.icon);
              const isSelected = selectedIds.has(industry.id);
              const isServed = alreadyServedIds.has(industry.id);
              const childCount = hasHierarchy && !showingSubSegments
                ? getSubSegments(industry.id).length
                : 0;

              return (
                <div
                  key={industry.id}
                  onClick={() => handleCardClick(industry)}
                  className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isServed ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:scale-[1.02]'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? colors.brand.primary + '08'
                      : colors.utility.secondaryBackground,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : isServed
                        ? colors.semantic.success + '40'
                        : colors.utility.primaryText + '15',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected
                        ? colors.brand.primary + '20'
                        : colors.utility.primaryText + '08',
                      color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                    }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {industry.name}
                      </span>
                      {isServed && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors.semantic.success + '20', color: colors.semantic.success }}
                        >
                          Added
                        </span>
                      )}
                    </div>
                    {industry.description && (
                      <p className="text-xs truncate mt-0.5" style={{ color: colors.utility.secondaryText }}>
                        {industry.description}
                      </p>
                    )}
                  </div>

                  {/* Right action */}
                  {childCount > 0 && !isServed ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Allow selecting the parent itself */}
                      <button
                        onClick={(e) => handleSelectParent(e, industry.id)}
                        className="p-1 rounded-md transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: selectedIds.has(industry.id)
                            ? colors.brand.primary + '20'
                            : colors.utility.primaryText + '08',
                        }}
                        title="Select this industry"
                      >
                        {selectedIds.has(industry.id) ? (
                          <Check className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        ) : (
                          <LucideIcons.Plus className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                        )}
                      </button>
                      <ChevronRight className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
                    </div>
                  ) : isSelected ? (
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {filteredList.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 mx-auto mb-2" style={{ color: colors.utility.secondaryText + '60' }} />
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                No industries found matching "{searchTerm}"
              </p>
            </div>
          )}

          {/* Benefits info (appears after selecting) */}
          {selectedIds.size > 0 && (
            <div
              className="mt-8 p-6 rounded-lg border"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20',
              }}
            >
              <h3
                className="font-semibold mb-4 flex items-center"
                style={{ color: colors.utility.primaryText }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                What This Unlocks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm">
                  <div className="font-medium mb-1" style={{ color: colors.brand.primary }}>
                    Industry Templates
                  </div>
                  <p style={{ color: colors.utility.secondaryText }}>
                    Access contract templates tailored to the industries you serve
                  </p>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1" style={{ color: colors.brand.primary }}>
                    Compliance Insights
                  </div>
                  <p style={{ color: colors.utility.secondaryText }}>
                    Receive regulatory guidance specific to your client industries
                  </p>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1" style={{ color: colors.brand.primary }}>
                    Smart Matching
                  </div>
                  <p style={{ color: colors.utility.secondaryText }}>
                    Get matched with relevant partners and opportunities
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Continue button */}
          {selectedIds.size > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
              >
                {isSaving || isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Branding
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              You can add or remove served industries later from Settings &rarr; Business Profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServedIndustriesStep;
