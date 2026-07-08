// src/components/contacts/forms/ContactIndustriesSection.tsx - Glass Morphism Theme
// Multi-select industries for a contact, reusing the same industry master data
// and drill-in (parent -> sub-industry) pattern as the business-profile
// Served Industries selector. Stores m_catalog_industries ids on the contact.
import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Factory, ChevronRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';

interface ContactIndustriesSectionProps {
  value: string[]; // m_catalog_industries ids
  onChange: (industryIds: string[]) => void;
  disabled?: boolean;
  maxIndustries?: number;
}

const ContactIndustriesSection: React.FC<ContactIndustriesSectionProps> = ({
  value,
  onChange,
  disabled = false,
  maxIndustries = 10
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [drillParentId, setDrillParentId] = useState<string | null>(null);

  const {
    data: industriesResponse,
    isLoading,
    error: loadError,
    refetch
  } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  const hasHierarchy = useMemo(
    () => allIndustries.some((i) => i.level !== undefined && i.level !== null),
    [allIndustries]
  );

  const parentIndustries = useMemo(
    () => (hasHierarchy ? allIndustries.filter((i) => i.level === 0) : allIndustries),
    [allIndustries, hasHierarchy]
  );

  const getSubSegments = (parentId: string) =>
    allIndustries.filter((i) => i.parent_id === parentId);

  const showingSubSegments = hasHierarchy && drillParentId !== null;
  const subSegments = drillParentId ? getSubSegments(drillParentId) : [];
  const currentList = showingSubSegments ? subSegments : parentIndustries;
  const drillParent = parentIndustries.find((p) => p.id === drillParentId);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const lower = searchTerm.toLowerCase();
    return currentList.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower))
    );
  }, [currentList, searchTerm]);

  // Resolve display label "Parent > Sub" for a selected industry id
  const getIndustryLabel = (id: string): string => {
    const industry = allIndustries.find((i) => i.id === id);
    if (!industry) return id;
    const parent = industry.parent_id
      ? allIndustries.find((i) => i.id === industry.parent_id)
      : null;
    return parent ? `${parent.name} > ${industry.name}` : industry.name;
  };

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Circle;
    return (LucideIcons as any)[iconName] || LucideIcons.Circle;
  };

  const toggleSelection = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (value.length >= maxIndustries) return;
      onChange([...value, id]);
    }
  };

  const handleCardClick = (industry: (typeof allIndustries)[0]) => {
    // Parents with children drill in; sub-industries (and childless parents
    // like "Other Industries") toggle selection
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

  const removeIndustry = (id: string) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== id));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchTerm('');
    setDrillParentId(null);
  };

  // Glass morphism styles (matches ContactTagsSection)
  const glassStyle: React.CSSProperties = {
    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
  };

  return (
    <div className="rounded-2xl shadow-sm border p-4" style={glassStyle}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
          <h3 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>Industries</h3>
          {value.length > 0 && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: colors.utility.secondaryText
              }}
            >
              {value.length}/{maxIndustries}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled || isLoading || value.length >= maxIndustries}
          className="flex items-center px-3 py-2 text-sm border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: colors.brand.primary,
            color: colors.brand.primary,
            backgroundColor: 'transparent'
          }}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Industry
        </button>
      </div>

      {/* Selected industry chips */}
      {value.length === 0 ? (
        <div className="text-center p-4 text-sm" style={{ color: colors.utility.secondaryText }}>
          No industries added yet. Industries describe what this contact's business does.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <div
              key={id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-colors"
              style={{
                borderColor: colors.brand.primary + '50',
                backgroundColor: colors.brand.primary + '10'
              }}
            >
              <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                {getIndustryLabel(id)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeIndustry(id)}
                  className="ml-1 rounded-full p-0.5 transition-colors"
                  title="Remove industry"
                >
                  <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load error */}
      {loadError && !isLoading && (
        <div
          className="mt-3 p-3 rounded-xl border"
          style={{
            backgroundColor: `${colors.semantic.error}10`,
            borderColor: `${colors.semantic.error}30`,
          }}
        >
          <p className="text-sm" style={{ color: colors.semantic.error }}>
            Failed to load industries.
            <button onClick={() => refetch()} className="ml-2 underline hover:no-underline">
              Try again
            </button>
          </p>
        </div>
      )}

      {/* Industry picker modal (drill-in multi-select) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />

          <div
            className="relative w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col mx-4"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: colors.utility.primaryText + '20' }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
                  Select Industries
                </h2>
                <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  Pick the sub-industries this contact's business belongs to
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:opacity-80 transition-colors"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              >
                <X size={18} style={{ color: colors.utility.secondaryText }} />
              </button>
            </div>

            {/* Back breadcrumb when drilled in */}
            {showingSubSegments && (
              <div className="flex items-center space-x-2 px-6 pt-4">
                <button
                  onClick={() => { setDrillParentId(null); setSearchTerm(''); }}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back
                </button>
                <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {drillParent?.name} — Select sub-industries
                </span>
              </div>
            )}

            {/* Search */}
            <div className="px-6 pt-4">
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Search size={18} />
                </div>
                <input
                  type="search"
                  placeholder={showingSubSegments ? 'Search sub-industries...' : 'Search industries...'}
                  className="pl-10 w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: colors.utility.secondaryText + '40',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                  } as React.CSSProperties}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {value.length > 0 && (
                <div className="mt-3 text-sm font-medium" style={{ color: colors.brand.primary }}>
                  {value.length} selected
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8" style={{ color: colors.utility.secondaryText }}>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading industries...
                </div>
              ) : loadError ? (
                <div
                  className="text-center p-6 border border-dashed rounded-lg"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: '#EF4444' + '40' }}
                >
                  <AlertCircle className="mx-auto mb-3" size={32} style={{ color: '#EF4444' }} />
                  <p className="mb-4" style={{ color: colors.utility.primaryText }}>Failed to load industries.</p>
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center px-4 py-2 rounded-md text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    Retry
                  </button>
                </div>
              ) : filteredList.length === 0 ? (
                <div
                  className="text-center p-6 border border-dashed rounded-lg"
                  style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.secondaryText + '30' }}
                >
                  <p style={{ color: colors.utility.secondaryText }}>
                    {showingSubSegments ? 'No sub-industries found.' : 'No industries match your search.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredList.map((industry) => {
                    const isSelected = value.includes(industry.id);
                    const IconComp = getIconComponent(industry.icon);
                    const isParentCard = hasHierarchy && !showingSubSegments;
                    const hasChildren = isParentCard && getSubSegments(industry.id).length > 0;

                    return (
                      <div
                        key={industry.id}
                        className="border rounded-lg p-3 cursor-pointer transition-all relative"
                        style={{
                          backgroundColor: colors.utility.secondaryBackground,
                          borderColor: isSelected
                            ? colors.brand.primary
                            : colors.utility.secondaryText + '20',
                          borderWidth: isSelected ? '2px' : '1px',
                        }}
                        onClick={() => handleCardClick(industry)}
                      >
                        {isSelected && (
                          <div
                            className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})` }}
                          >
                            ✓
                          </div>
                        )}
                        {hasChildren && !isSelected && (
                          <div className="absolute top-3 right-3" style={{ color: colors.utility.secondaryText }}>
                            <ChevronRight size={18} />
                          </div>
                        )}

                        <div className="flex items-center space-x-3 pr-10">
                          <div
                            className="p-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isSelected ? colors.brand.primary + '10' : colors.utility.secondaryText + '10' }}
                          >
                            <IconComp size={20} style={{ color: isSelected ? colors.brand.primary : colors.utility.secondaryText }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-medium text-sm truncate"
                              style={{ color: isSelected ? colors.brand.primary : colors.utility.primaryText }}
                            >
                              {industry.name}
                            </div>
                            {industry.description && (
                              <div className="text-xs truncate mt-0.5" style={{ color: colors.utility.secondaryText }}>
                                {industry.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: colors.utility.primaryText + '20' }}
            >
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors"
                style={{ backgroundColor: colors.brand.primary }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactIndustriesSection;
