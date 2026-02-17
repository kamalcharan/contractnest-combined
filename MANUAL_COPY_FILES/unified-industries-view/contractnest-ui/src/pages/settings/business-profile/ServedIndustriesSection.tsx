// src/pages/settings/business-profile/ServedIndustriesSection.tsx
// Unified Industries view: "Your Industry" (profile) + "Industries You Serve" (served list)
import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  Factory,
  Pencil,
  Building,
  Check,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import {
  useServedIndustriesManager,
  type ServedIndustry,
} from '@/hooks/queries/useServedIndustries';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { vaniToast } from '@/components/common/toast';
import { captureException } from '@/utils/sentry';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import type { Industry } from '@/services/serviceURLs';

// ════════════════════════════════════════════════════════════════════
// PROPS
// ════════════════════════════════════════════════════════════════════

interface ServedIndustriesSectionProps {
  profileIndustryId?: string | null;
  onIndustryChanged?: () => void;
}

// ════════════════════════════════════════════════════════════════════
// CHANGE YOUR INDUSTRY MODAL (single-select, saves to profile)
// ════════════════════════════════════════════════════════════════════

interface ChangeIndustryModalProps {
  open: boolean;
  onClose: () => void;
  currentIndustryId?: string | null;
  onSaved: () => void;
}

const ChangeIndustryModal: React.FC<ChangeIndustryModalProps> = ({
  open,
  onClose,
  currentIndustryId,
  onSaved,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drillParentId, setDrillParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const {
    data: industriesResponse,
    isLoading: industriesLoading,
    error: industriesError,
    refetch,
  } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

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

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Circle;
    return (LucideIcons as any)[iconName] || LucideIcons.Circle;
  };

  const handleCardClick = (industry: typeof allIndustries[0]) => {
    // If parent with children → drill in
    if (hasHierarchy && !showingSubSegments) {
      const children = getSubSegments(industry.id);
      if (children.length > 0) {
        setDrillParentId(industry.id);
        setSearchTerm('');
        return;
      }
    }
    // Select this industry (single selection)
    setSelectedId(industry.id === selectedId ? null : industry.id);
  };

  const handleSelectParent = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setSelectedId(parentId === selectedId ? null : parentId);
  };

  const handleBack = () => {
    setDrillParentId(null);
    setSearchTerm('');
  };

  const handleSave = async () => {
    if (!selectedId || saving || savingRef.current) return;
    if (selectedId === currentIndustryId) {
      onClose();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await api.put(API_ENDPOINTS.TENANTS.PROFILE, { industry_id: selectedId });
      vaniToast.success('Industry Updated', {
        message: 'Your business industry has been updated.',
        duration: 4000,
      });
      onSaved();
      handleClose();
    } catch (err: any) {
      captureException(err, {
        tags: { component: 'ChangeIndustryModal', action: 'updateIndustry' },
      });
      vaniToast.error('Update Failed', {
        message: err?.message || 'Failed to update your industry. Please try again.',
        duration: 5000,
      });
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    setSearchTerm('');
    setDrillParentId(null);
    onClose();
  };

  if (!open) return null;

  // Find parent name for selectedId to show in footer
  const selectedIndustry = selectedId ? allIndustries.find((i) => i.id === selectedId) : null;
  const selectedParent = selectedIndustry?.parent_id
    ? allIndustries.find((i) => i.id === selectedIndustry.parent_id)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-lg shadow-xl flex flex-col mx-4"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Change Your Industry
            </h2>
            <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
              Select the industry your business belongs to
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          >
            <X size={18} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Back button when drilled in */}
        {showingSubSegments && (
          <div className="flex items-center space-x-2 px-6 pt-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
            >
              <LucideIcons.ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {drillParent?.name} — Select a sub-segment
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
              placeholder={showingSubSegments ? 'Search sub-segments...' : 'Search industries...'}
              className="pl-10 w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary,
              } as React.CSSProperties}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {industriesLoading ? (
            <VaNiLoader size="md" message="Loading industries..." />
          ) : industriesError ? (
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
                <RefreshCw size={16} className="mr-2" />
                Retry
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div
              className="text-center p-6 border border-dashed rounded-lg"
              style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.secondaryText + '30' }}
            >
              <p style={{ color: colors.utility.secondaryText }}>
                {showingSubSegments ? 'No sub-segments found.' : 'No industries match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredList.map((industry) => {
                const isCurrent = industry.id === currentIndustryId;
                const isSelected = industry.id === selectedId;
                const IconComp = getIconComponent(industry.icon);
                const isParentCard = hasHierarchy && !showingSubSegments;
                const hasChildren = isParentCard && getSubSegments(industry.id).length > 0;

                return (
                  <div
                    key={industry.id}
                    className={cn(
                      'border rounded-lg p-3 cursor-pointer transition-all relative',
                    )}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : isCurrent
                        ? colors.brand.primary + '50'
                        : colors.utility.secondaryText + '20',
                      borderWidth: isSelected ? '2px' : isCurrent ? '2px' : '1px',
                    }}
                    onClick={() => handleCardClick(industry)}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isCurrent)
                        e.currentTarget.style.borderColor = colors.brand.primary + '60';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isCurrent)
                        e.currentTarget.style.borderColor = colors.utility.secondaryText + '20';
                    }}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div
                        className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})` }}
                      >
                        <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
                          <path d="M4.00001 6.58579L10.2929 0.292893C10.6834 -0.097631 11.3166 -0.097631 11.7071 0.292893C12.0976 0.683418 12.0976 1.31658 11.7071 1.70711L4.70711 8.70711C4.31658 9.09763 3.68342 9.09763 3.29289 8.70711L0.292893 5.70711C-0.097631 5.31658 -0.097631 4.68342 0.292893 4.29289C0.683418 3.90237 1.31658 3.90237 1.70711 4.29289L4.00001 6.58579Z" fill="currentColor" />
                        </svg>
                      </div>
                    )}

                    {/* Current industry badge */}
                    {isCurrent && !isSelected && (
                      <div
                        className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
                      >
                        Current
                      </div>
                    )}

                    {/* Drill-in chevron for parents */}
                    {hasChildren && !isSelected && !isCurrent && (
                      <div className="absolute top-3 right-3" style={{ color: colors.utility.secondaryText }}>
                        <LucideIcons.ChevronRight size={18} />
                      </div>
                    )}

                    <div className="flex items-center space-x-3 pr-14">
                      <div
                        className="p-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: (isSelected || isCurrent) ? colors.brand.primary + '10' : colors.utility.secondaryText + '10' }}
                      >
                        <IconComp size={20} style={{ color: (isSelected || isCurrent) ? colors.brand.primary : colors.utility.secondaryText }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-medium text-sm truncate"
                          style={{ color: (isSelected || isCurrent) ? colors.brand.primary : colors.utility.primaryText }}
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

                    {/* Select parent button for industries with sub-segments */}
                    {hasChildren && (
                      <div className="mt-2 ml-9">
                        <button
                          onClick={(e) => handleSelectParent(e, industry.id)}
                          className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                          style={{
                            borderColor: (isSelected || isCurrent) ? colors.brand.primary : colors.utility.secondaryText + '30',
                            color: (isSelected || isCurrent) ? colors.brand.primary : colors.utility.secondaryText,
                            backgroundColor: isSelected ? colors.brand.primary + '08' : 'transparent'
                          }}
                        >
                          {isCurrent ? 'Current selection' : isSelected ? 'Selected' : 'Select as your industry'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <div className="text-sm truncate mr-4" style={{ color: colors.utility.secondaryText }}>
            {selectedIndustry
              ? <>Switching to: <strong style={{ color: colors.brand.primary }}>
                  {selectedParent ? `${selectedParent.name} > ` : ''}{selectedIndustry.name}
                </strong></>
              : 'Select an industry to continue'}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-md border text-sm font-medium hover:opacity-80 transition-colors"
              style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.primaryText }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedId || selectedId === currentIndustryId || saving}
              className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              style={{ backgroundColor: colors.brand.primary }}
            >
              {saving ? (
                <><RefreshCw size={14} className="mr-2 animate-spin" />Saving...</>
              ) : (
                <><Check size={14} className="mr-2" />Save</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// ADD INDUSTRIES MODAL
// ════════════════════════════════════════════════════════════════════

interface AddIndustriesModalProps {
  open: boolean;
  onClose: () => void;
  alreadyServedIds: Set<string>;
  onAdd: (industryIds: string[]) => Promise<void>;
  isAdding: boolean;
}

const AddIndustriesModal: React.FC<AddIndustriesModalProps> = ({
  open,
  onClose,
  alreadyServedIds,
  onAdd,
  isAdding,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drillParentId, setDrillParentId] = useState<string | null>(null);

  const {
    data: industriesResponse,
    isLoading: industriesLoading,
    error: industriesError,
    refetch,
  } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Derive hierarchy
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

  // Current view: parents or sub-segments of drilled parent
  const showingSubSegments = hasHierarchy && drillParentId !== null;
  const subSegments = drillParentId ? getSubSegments(drillParentId) : [];
  const currentList = showingSubSegments ? subSegments : parentIndustries;
  const drillParent = parentIndustries.find((p) => p.id === drillParentId);

  // Filter by search
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
    const isAlreadyServed = alreadyServedIds.has(industry.id);
    if (isAlreadyServed) return;

    // If viewing parents and this parent has children → drill in
    if (hasHierarchy && !showingSubSegments) {
      const children = getSubSegments(industry.id);
      if (children.length > 0) {
        setDrillParentId(industry.id);
        setSearchTerm('');
        return;
      }
    }

    // Otherwise toggle selection (works for parents without children AND sub-segments)
    toggleSelection(industry.id);
  };

  const handleSelectParent = (e: React.MouseEvent, parentId: string) => {
    // Stop the click from triggering drill-in
    e.stopPropagation();
    if (!alreadyServedIds.has(parentId)) {
      toggleSelection(parentId);
    }
  };

  const handleBack = () => {
    setDrillParentId(null);
    setSearchTerm('');
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0 || isAdding) return;
    try {
      await onAdd(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSearchTerm('');
      setDrillParentId(null);
      onClose();
    } catch {
      // Error toast is shown by the mutation's onError handler.
      // Keep modal open so user can retry.
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchTerm('');
    setDrillParentId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-lg shadow-xl flex flex-col mx-4"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: colors.utility.primaryText + '20' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: colors.utility.primaryText }}>
              Add Industries You Serve
            </h2>
            <p className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
              Select industries your clients or customers come from
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          >
            <X size={18} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Back button + breadcrumb when drilled into sub-segments */}
        {showingSubSegments && (
          <div
            className="flex items-center space-x-2 px-6 pt-4"
          >
            <button
              onClick={handleBack}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.brand.primary + '10', color: colors.brand.primary }}
            >
              <LucideIcons.ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
              {drillParent?.name} — Select sub-segments
            </span>
          </div>
        )}

        {/* Search + selection count */}
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
              placeholder={showingSubSegments ? 'Search sub-segments...' : 'Search industries...'}
              className="pl-10 w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: colors.utility.secondaryText + '40',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                '--tw-ring-color': colors.brand.primary,
              } as React.CSSProperties}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="mt-3 text-sm font-medium" style={{ color: colors.brand.primary }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'industry' : 'industries'} selected
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {industriesLoading ? (
            <VaNiLoader size="md" message="Loading industries..." />
          ) : industriesError ? (
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
                <RefreshCw size={16} className="mr-2" />
                Retry
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div
              className="text-center p-6 border border-dashed rounded-lg"
              style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.secondaryText + '30' }}
            >
              <p style={{ color: colors.utility.secondaryText }}>
                {showingSubSegments ? 'No sub-segments found.' : 'No industries match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredList.map((industry) => {
                const isAlreadyServed = alreadyServedIds.has(industry.id);
                const isSelected = selectedIds.has(industry.id);
                const IconComp = getIconComponent(industry.icon);
                const isParentCard = hasHierarchy && !showingSubSegments;
                const hasChildren = isParentCard && getSubSegments(industry.id).length > 0;

                return (
                  <div
                    key={industry.id}
                    className={cn(
                      'border rounded-lg p-3 cursor-pointer transition-all relative',
                      isAlreadyServed && !hasChildren && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : isAlreadyServed && !hasChildren
                        ? colors.utility.secondaryText + '15'
                        : colors.utility.secondaryText + '20',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                    onClick={() => handleCardClick(industry)}
                    onMouseEnter={(e) => {
                      if (!(isAlreadyServed && !hasChildren) && !isSelected)
                        e.currentTarget.style.borderColor = colors.brand.primary + '60';
                    }}
                    onMouseLeave={(e) => {
                      if (!(isAlreadyServed && !hasChildren) && !isSelected)
                        e.currentTarget.style.borderColor = colors.utility.secondaryText + '20';
                    }}
                  >
                    {/* Checkmark for selected */}
                    {isSelected && (
                      <div
                        className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})` }}
                      >
                        <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
                          <path d="M4.00001 6.58579L10.2929 0.292893C10.6834 -0.097631 11.3166 -0.097631 11.7071 0.292893C12.0976 0.683418 12.0976 1.31658 11.7071 1.70711L4.70711 8.70711C4.31658 9.09763 3.68342 9.09763 3.29289 8.70711L0.292893 5.70711C-0.097631 5.31658 -0.097631 4.68342 0.292893 4.29289C0.683418 3.90237 1.31658 3.90237 1.70711 4.29289L4.00001 6.58579Z" fill="currentColor" />
                        </svg>
                      </div>
                    )}

                    {/* "Added" badge for already-served (no children) */}
                    {isAlreadyServed && !hasChildren && !isSelected && (
                      <div
                        className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.utility.secondaryText + '20', color: colors.utility.secondaryText }}
                      >
                        Added
                      </div>
                    )}

                    {/* Chevron for parents with children (drill-in indicator) */}
                    {hasChildren && !isSelected && (
                      <div className="absolute top-3 right-3" style={{ color: colors.utility.secondaryText }}>
                        <LucideIcons.ChevronRight size={18} />
                      </div>
                    )}

                    <div className="flex items-center space-x-3 pr-14">
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

                    {/* For parent cards with children: show a small "Select segment" button */}
                    {hasChildren && (
                      <div className="mt-2 ml-9">
                        <button
                          onClick={(e) => handleSelectParent(e, industry.id)}
                          disabled={isAlreadyServed}
                          className={cn(
                            "text-xs px-2 py-1 rounded border transition-colors hover:opacity-80",
                            isAlreadyServed && "opacity-50 cursor-not-allowed"
                          )}
                          style={{
                            borderColor: isSelected ? colors.brand.primary : colors.utility.secondaryText + '30',
                            color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                            backgroundColor: isSelected ? colors.brand.primary + '08' : 'transparent'
                          }}
                        >
                          {isAlreadyServed ? 'Already added' : isSelected ? 'Selected as segment' : 'Select entire segment'}
                        </button>
                      </div>
                    )}
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
            onClick={handleClose}
            className="px-4 py-2 rounded-md border text-sm font-medium hover:opacity-80 transition-colors"
            style={{ borderColor: colors.utility.secondaryText + '40', color: colors.utility.primaryText }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
            className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            style={{ backgroundColor: colors.brand.primary }}
          >
            {isAdding ? (
              <><RefreshCw size={14} className="mr-2 animate-spin" />Adding...</>
            ) : (
              <><Plus size={14} className="mr-2" />Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// UNIFIED INDUSTRIES SECTION
// Shows "Your Industry" (from profile) + "Industries You Serve" (served list)
// ════════════════════════════════════════════════════════════════════

const ServedIndustriesSection: React.FC<ServedIndustriesSectionProps> = ({
  profileIndustryId,
  onIndustryChanged,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Served industries data
  const {
    servedIndustries,
    count,
    isLoading,
    isError,
    error,
    isAdding,
    isMutating,
    addIndustries,
    removeIndustry,
    refetch,
  } = useServedIndustriesManager();

  // Full industry catalog (for resolving profile industry name + icons)
  const { data: industriesResponse } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Resolve the profile's own industry
  const profileIndustry = useMemo(() => {
    if (!profileIndustryId || allIndustries.length === 0) return null;
    // Exact match
    const exact = allIndustries.find((i) => i.id === profileIndustryId);
    if (exact) return exact;
    // Legacy slug fallback
    const baseSlug = profileIndustryId.replace(/_(general|other|default)$/, '');
    if (baseSlug !== profileIndustryId) {
      const byBase = allIndustries.find((i) => i.id === baseSlug);
      if (byBase) return byBase;
    }
    return null;
  }, [profileIndustryId, allIndustries]);

  // Find parent industry name for display (e.g. "Healthcare > Dental Clinics")
  const profileIndustryParent = useMemo(() => {
    if (!profileIndustry?.parent_id) return null;
    return allIndustries.find((i) => i.id === profileIndustry.parent_id) || null;
  }, [profileIndustry, allIndustries]);

  const alreadyServedIds = useMemo(
    () => new Set(servedIndustries.map((si) => si.industry_id)),
    [servedIndustries]
  );

  const handleRemove = async (industryId: string) => {
    if (removingId) return; // Guard: one remove at a time
    setRemovingId(industryId);
    try {
      await removeIndustry(industryId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAdd = async (industryIds: string[]) => {
    await addIndustries(industryIds);
  };

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Circle;
    return (LucideIcons as any)[iconName] || LucideIcons.Circle;
  };

  // Find parent name for a served industry card
  const getParentName = (industry: ServedIndustry['industry']): string | null => {
    if (!industry?.parent_id) return null;
    const parent = allIndustries.find((i) => i.id === industry.parent_id);
    return parent?.name || null;
  };

  return (
    <div className="space-y-8">
      {/* ═══ Section Title ═══ */}
      <div>
        <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
          Industries
        </h2>
        <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
          Your business identity and the industries your clients come from
        </p>
      </div>

      {/* ═══ YOUR INDUSTRY (from profile) ═══ */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <div
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}
          >
            Your Industry
          </div>
          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
            The industry your business belongs to
          </span>
        </div>

        {profileIndustryId ? (
          <div
            className="rounded-lg border shadow-sm p-4 flex items-center justify-between"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.brand.primary + '30',
              borderLeft: `4px solid ${colors.brand.primary}`,
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors.brand.primary + '10' }}
              >
                {profileIndustry ? (
                  React.createElement(
                    getIconComponent(profileIndustry.icon),
                    { size: 24, style: { color: colors.brand.primary } }
                  )
                ) : (
                  <Building size={24} style={{ color: colors.brand.primary }} />
                )}
              </div>
              <div>
                <div className="font-medium" style={{ color: colors.utility.primaryText }}>
                  {profileIndustry
                    ? profileIndustryParent
                      ? `${profileIndustryParent.name} > ${profileIndustry.name}`
                      : profileIndustry.name
                    : profileIndustryId}
                </div>
                {profileIndustry?.description && (
                  <div className="text-sm mt-0.5" style={{ color: colors.utility.secondaryText }}>
                    {profileIndustry.description}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowChangeModal(true)}
              className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-80 transition-colors flex-shrink-0 ml-4"
              style={{
                backgroundColor: colors.brand.primary + '10',
                color: colors.brand.primary,
              }}
            >
              <Pencil size={14} className="mr-1.5" />
              Change
            </button>
          </div>
        ) : (
          <div
            className="rounded-lg border border-dashed p-4 text-center"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.secondaryText + '30',
            }}
          >
            <p className="text-sm mb-2" style={{ color: colors.utility.secondaryText }}>
              No industry set yet. Select the industry your business belongs to.
            </p>
            <button
              onClick={() => setShowChangeModal(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Plus size={14} className="mr-1.5" />
              Select Industry
            </button>
          </div>
        )}
      </div>

      {/* ═══ DIVIDER ═══ */}
      <div
        className="border-t"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      />

      {/* ═══ INDUSTRIES YOU SERVE ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <div
                className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ backgroundColor: colors.utility.secondaryText + '12', color: colors.utility.secondaryText }}
              >
                Industries You Serve
              </div>
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Industries your clients or customers come from
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={isMutating}
            className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <VaNiLoader size="md" message="Loading served industries..." />
        ) : isError ? (
          <div
            className="rounded-lg shadow-sm border p-10 text-center"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: '#EF4444' + '30' }}
          >
            <AlertCircle className="mx-auto mb-3" size={40} style={{ color: '#EF4444' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              Failed to Load
            </h3>
            <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
              {(error as Error)?.message || 'Could not load your served industries.'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 rounded-md text-white hover:opacity-90 transition-colors"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <RefreshCw size={16} className="mr-2" />
              Retry
            </button>
          </div>
        ) : servedIndustries.length === 0 ? (
          <div
            className="rounded-lg shadow-sm border p-10 text-center"
            style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
            >
              <Factory size={32} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
              No Served Industries Yet
            </h3>
            <p className="mb-6 max-w-md mx-auto" style={{ color: colors.utility.secondaryText }}>
              Add the industries your clients come from to unlock industry-specific templates and improve your visibility in the marketplace.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-md hover:opacity-90 transition-colors text-white"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Plus size={16} className="inline mr-2 -mt-0.5" />
              Add Your First Industry
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium mb-4" style={{ color: colors.utility.secondaryText }}>
              {count} {count === 1 ? 'industry' : 'industries'} served
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {servedIndustries.map((si: ServedIndustry) => {
                const industry = si.industry;
                const IconComp = getIconComponent(industry?.icon);
                const isBeingRemoved = removingId === si.industry_id;
                const parentName = getParentName(industry);

                return (
                  <div
                    key={si.id}
                    className={cn(
                      'rounded-lg border shadow-sm p-4 transition-all group relative',
                      isBeingRemoved && 'opacity-50'
                    )}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: colors.utility.primaryText + '20',
                    }}
                  >
                    <button
                      onClick={() => handleRemove(si.industry_id)}
                      disabled={isMutating}
                      className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#EF4444' + '15', color: '#EF4444' }}
                      title="Remove industry"
                    >
                      {isBeingRemoved ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </button>
                    <div className="flex items-start space-x-3 pr-8">
                      <div
                        className="p-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors.brand.primary + '10' }}
                      >
                        <IconComp size={22} style={{ color: colors.brand.primary }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate" style={{ color: colors.utility.primaryText }}>
                          {parentName
                            ? <>{parentName} <span style={{ color: colors.utility.secondaryText }}>&gt;</span> {industry?.name}</>
                            : (industry?.name || 'Unknown Industry')
                          }
                        </h3>
                        {industry?.description && (
                          <p className="text-sm mt-1 line-clamp-2" style={{ color: colors.utility.secondaryText }}>
                            {industry.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Change Your Industry Modal */}
      <ChangeIndustryModal
        open={showChangeModal}
        onClose={() => setShowChangeModal(false)}
        currentIndustryId={profileIndustryId}
        onSaved={() => onIndustryChanged?.()}
      />

      {/* Add Served Industries Modal */}
      <AddIndustriesModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        alreadyServedIds={alreadyServedIds}
        onAdd={handleAdd}
        isAdding={isAdding}
      />
    </div>
  );
};

export default ServedIndustriesSection;
