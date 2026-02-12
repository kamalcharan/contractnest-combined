// src/components/tenantprofile/IndustrySelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { cn } from '@/lib/utils';
import { Search, RefreshCw, AlertCircle, ArrowLeft, ChevronRight, Info } from 'lucide-react';
import type { Industry } from '@/services/serviceURLs';

interface IndustrySelectorProps {
  value: string;
  onChange: (industryId: string) => void;
  disabled?: boolean;
}

const IndustrySelector: React.FC<IndustrySelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [initialResolveDone, setInitialResolveDone] = useState(false);

  // Single API call: fetch ALL industries
  const {
    data: industriesResponse,
    isLoading,
    error,
    refetch
  } = useIndustries({ limit: 200 });
  const allIndustries = industriesResponse?.data || [];

  // Derive hierarchy client-side
  const hasHierarchy = useMemo(
    () => allIndustries.some((i) => i.level !== undefined && i.level !== null),
    [allIndustries]
  );

  const parentIndustries = useMemo(
    () =>
      hasHierarchy
        ? allIndustries.filter((i) => i.level === 0)
        : allIndustries,
    [allIndustries, hasHierarchy]
  );

  const getSubSegments = (parentId: string): Industry[] =>
    allIndustries.filter((i) => i.parent_id === parentId);

  // On mount, resolve saved value to its parent (for sub-segment values)
  useEffect(() => {
    if (!value || allIndustries.length === 0 || initialResolveDone) return;

    if (!hasHierarchy) {
      // Flat mode — nothing to resolve
      setInitialResolveDone(true);
      return;
    }

    // Check if the saved value is a parent
    const isParent = parentIndustries.find((p) => p.id === value);
    if (isParent) {
      setSelectedParentId(value);
      setInitialResolveDone(true);
      return;
    }

    // Saved value is a sub-segment — find its parent
    const savedIndustry = allIndustries.find((i) => i.id === value);
    if (savedIndustry?.parent_id) {
      setSelectedParentId(savedIndustry.parent_id);
    }

    setInitialResolveDone(true);
  }, [value, allIndustries, hasHierarchy, parentIndustries, initialResolveDone]);

  // Get icon component from name
  const getIconComponent = (iconName: string | undefined, isSelected: boolean) => {
    if (!iconName) {
      const IconComponent = LucideIcons.Circle;
      return <IconComponent size={24} style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }} />;
    }
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Circle;
    const iconColor = isSelected ? colors.brand.primary : colors.utility.secondaryText;
    return <IconComponent size={24} style={{ color: iconColor }} />;
  };

  // Determine which list to show
  const showingSubSegments = hasHierarchy && selectedParentId !== null;
  const subSegments = selectedParentId ? getSubSegments(selectedParentId) : [];
  const currentList = showingSubSegments ? subSegments : parentIndustries;
  const selectedParent = parentIndustries.find((p) => p.id === selectedParentId);

  // Detect legacy selection: value is a parent ID, user needs to pick a sub-segment
  const needsSubSegmentUpdate =
    showingSubSegments && value === selectedParentId && subSegments.length > 0;

  // Filter based on search term
  const filteredList = currentList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCardClick = (industry: Industry) => {
    if (disabled) return;

    if (hasHierarchy && !showingSubSegments) {
      // Check if this parent has sub-segments
      const children = getSubSegments(industry.id);
      if (children.length > 0) {
        // Drill into sub-segments
        setSelectedParentId(industry.id);
        setSearchTerm('');
        return;
      }
      // Parent with no children — select it directly
      onChange(industry.id);
    } else {
      // Flat mode or sub-segment click — select it
      onChange(industry.id);
    }
  };

  const handleBack = () => {
    setSelectedParentId(null);
    setSearchTerm('');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div
          className="h-10 rounded-md animate-pulse"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ backgroundColor: colors.utility.secondaryText + '20' }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="text-center p-6 border border-dashed rounded-lg"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: '#EF4444' + '40'
        }}
      >
        <AlertCircle
          className="mx-auto mb-3"
          size={32}
          style={{ color: '#EF4444' }}
        />
        <p
          className="mb-4"
          style={{ color: colors.utility.primaryText }}
        >
          Failed to load industries. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 rounded-md text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + breadcrumb when showing sub-segments */}
      {showingSubSegments && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBack}
            disabled={disabled}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: colors.brand.primary + '10',
              color: colors.brand.primary
            }}
          >
            <ArrowLeft size={16} className="mr-1" />
            Back
          </button>
          <span
            className="text-sm"
            style={{ color: colors.utility.secondaryText }}
          >
            {selectedParent?.name} — Select a sub-segment
          </span>
        </div>
      )}

      {/* Prompt to update selection when existing value is a parent */}
      {needsSubSegmentUpdate && (
        <div
          className="flex items-start space-x-3 p-3 rounded-lg border"
          style={{
            backgroundColor: colors.brand.primary + '08',
            borderColor: colors.brand.primary + '30'
          }}
        >
          <Info size={18} className="mt-0.5 flex-shrink-0" style={{ color: colors.brand.primary }} />
          <p className="text-sm" style={{ color: colors.utility.primaryText }}>
            Your industry now has sub-segments. Please select one below to update your profile.
          </p>
        </div>
      )}

      {/* Current selection indicator */}
      {value && showingSubSegments && (() => {
        const selectedIndustry = allIndustries.find((i) => i.id === value);
        if (selectedIndustry && value !== selectedParentId) {
          return (
            <div
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm"
              style={{
                backgroundColor: colors.brand.primary + '10',
                color: colors.brand.primary
              }}
            >
              <LucideIcons.CheckCircle size={16} />
              <span>Currently selected: <strong>{selectedIndustry.name}</strong></span>
            </div>
          );
        }
        return null;
      })()}

      {/* Search input */}
      <div className="relative">
        <div
          className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
          style={{ color: colors.utility.secondaryText }}
        >
          <Search size={18} />
        </div>
        <input
          type="search"
          placeholder={showingSubSegments ? 'Search sub-segments...' : 'Search industries...'}
          className="pl-10 w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            '--tw-ring-color': colors.brand.primary
          } as React.CSSProperties}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Industry / Sub-segment grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((industry) => {
          const isSelected = value === industry.id;
          const isParentCard = hasHierarchy && !showingSubSegments;
          const hasChildren = isParentCard && getSubSegments(industry.id).length > 0;

          return (
            <div
              key={industry.id}
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all relative shadow-sm",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: isSelected ? colors.brand.primary : colors.utility.secondaryText + '20',
                borderWidth: isSelected ? '2px' : '1px'
              }}
              onClick={() => handleCardClick(industry)}
              onMouseEnter={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = colors.brand.primary + '60';
                  e.currentTarget.style.boxShadow = `0 4px 6px -1px ${colors.utility.secondaryText}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = colors.utility.secondaryText + '20';
                  e.currentTarget.style.boxShadow = `0 1px 3px 0 ${colors.utility.secondaryText}10`;
                }
              }}
            >
              {/* Checkmark for selected item (not on parent cards that drill down) */}
              {isSelected && !hasChildren && (
                <div
                  className="absolute top-4 right-4 h-6 w-6 rounded-full flex items-center justify-center text-white transition-colors"
                  style={{
                    background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                  }}
                >
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.00001 6.58579L10.2929 0.292893C10.6834 -0.097631 11.3166 -0.097631 11.7071 0.292893C12.0976 0.683418 12.0976 1.31658 11.7071 1.70711L4.70711 8.70711C4.31658 9.09763 3.68342 9.09763 3.29289 8.70711L0.292893 5.70711C-0.097631 5.31658 -0.097631 4.68342 0.292893 4.29289C0.683418 3.90237 1.31658 3.90237 1.70711 4.29289L4.00001 6.58579Z" fill="currentColor"/>
                  </svg>
                </div>
              )}

              {/* Chevron for parent cards with children (drill-in indicator) */}
              {hasChildren && (
                <div
                  className="absolute top-4 right-4"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <ChevronRight size={18} />
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div
                  className="p-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? colors.brand.primary + '10'
                      : colors.utility.secondaryText + '10'
                  }}
                >
                  {getIconComponent(industry.icon, isSelected)}
                </div>

                <div className="flex-1 pr-6">
                  <h3
                    className="font-medium transition-colors"
                    style={{
                      color: isSelected ? colors.brand.primary : colors.utility.primaryText
                    }}
                  >
                    {industry.name}
                  </h3>
                  {industry.description && (
                    <p
                      className="text-sm mt-1 line-clamp-2 transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {industry.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredList.length === 0 && (
        <div
          className="text-center p-6 border border-dashed rounded-lg transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '30'
          }}
        >
          <p
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {showingSubSegments
              ? 'No sub-segments found for this industry.'
              : 'No industries match your search.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default IndustrySelector;
