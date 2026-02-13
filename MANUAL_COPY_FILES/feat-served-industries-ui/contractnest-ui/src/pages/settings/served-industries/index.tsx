// src/pages/settings/served-industries/index.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  X,
  Search,
  Building2,
  RefreshCw,
  AlertCircle,
  Factory,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { analyticsService } from '@/services/analytics.service';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import {
  useServedIndustriesManager,
  type ServedIndustry,
} from '@/hooks/queries/useServedIndustries';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';

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

  const {
    data: industriesResponse,
    isLoading: industriesLoading,
    error: industriesError,
    refetch,
  } = useIndustries();
  const allIndustries = industriesResponse?.data || [];

  // Show only leaf-level industries (or all if flat hierarchy)
  const selectableIndustries = useMemo(() => {
    const hasHierarchy = allIndustries.some((i) => i.level !== undefined && i.level !== null);
    if (!hasHierarchy) return allIndustries;

    // Show sub-segments (level > 0) or parents with no children
    const parentIds = new Set(allIndustries.filter((i) => i.parent_id).map((i) => i.parent_id!));
    return allIndustries.filter(
      (i) => (i.level && i.level > 0) || !parentIds.has(i.id)
    );
  }, [allIndustries]);

  const filteredIndustries = useMemo(() => {
    if (!searchTerm.trim()) return selectableIndustries;
    const lower = searchTerm.toLowerCase();
    return selectableIndustries.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        (i.description && i.description.toLowerCase().includes(lower))
    );
  }, [selectableIndustries, searchTerm]);

  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return null;
    return allIndustries.find((i) => i.id === parentId)?.name || null;
  };

  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return LucideIcons.Circle;
    return (LucideIcons as any)[iconName] || LucideIcons.Circle;
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    await onAdd(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearchTerm('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchTerm('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
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
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Add Industries You Serve
            </h2>
            <p
              className="text-sm mt-0.5"
              style={{ color: colors.utility.secondaryText }}
            >
              Select the industries your business operates in
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
              placeholder="Search industries..."
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
            <div
              className="mt-3 text-sm font-medium"
              style={{ color: colors.brand.primary }}
            >
              {selectedIds.size} {selectedIds.size === 1 ? 'industry' : 'industries'} selected
            </div>
          )}
        </div>

        {/* Industry Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {industriesLoading ? (
            <VaNiLoader size="md" message="Loading industries..." />
          ) : industriesError ? (
            <div
              className="text-center p-6 border border-dashed rounded-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: '#EF4444' + '40',
              }}
            >
              <AlertCircle className="mx-auto mb-3" size={32} style={{ color: '#EF4444' }} />
              <p className="mb-4" style={{ color: colors.utility.primaryText }}>
                Failed to load industries.
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
          ) : filteredIndustries.length === 0 ? (
            <div
              className="text-center p-6 border border-dashed rounded-lg"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '30',
              }}
            >
              <p style={{ color: colors.utility.secondaryText }}>
                No industries match your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredIndustries.map((industry) => {
                const isAlreadyServed = alreadyServedIds.has(industry.id);
                const isSelected = selectedIds.has(industry.id);
                const IconComp = getIconComponent(industry.icon);
                const parentName = getParentName(industry.parent_id);

                return (
                  <div
                    key={industry.id}
                    className={cn(
                      'border rounded-lg p-3 cursor-pointer transition-all relative',
                      isAlreadyServed && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderColor: isSelected
                        ? colors.brand.primary
                        : isAlreadyServed
                        ? colors.utility.secondaryText + '15'
                        : colors.utility.secondaryText + '20',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                    onClick={() => {
                      if (!isAlreadyServed) toggleSelection(industry.id);
                    }}
                    onMouseEnter={(e) => {
                      if (!isAlreadyServed && !isSelected) {
                        e.currentTarget.style.borderColor = colors.brand.primary + '60';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAlreadyServed && !isSelected) {
                        e.currentTarget.style.borderColor = colors.utility.secondaryText + '20';
                      }
                    }}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div
                        className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white"
                        style={{
                          background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                        }}
                      >
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 12 9"
                          fill="none"
                        >
                          <path
                            d="M4.00001 6.58579L10.2929 0.292893C10.6834 -0.097631 11.3166 -0.097631 11.7071 0.292893C12.0976 0.683418 12.0976 1.31658 11.7071 1.70711L4.70711 8.70711C4.31658 9.09763 3.68342 9.09763 3.29289 8.70711L0.292893 5.70711C-0.097631 5.31658 -0.097631 4.68342 0.292893 4.29289C0.683418 3.90237 1.31658 3.90237 1.70711 4.29289L4.00001 6.58579Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Already served badge */}
                    {isAlreadyServed && (
                      <div
                        className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: colors.utility.secondaryText + '20',
                          color: colors.utility.secondaryText,
                        }}
                      >
                        Added
                      </div>
                    )}

                    <div className="flex items-center space-x-3 pr-14">
                      <div
                        className="p-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? colors.brand.primary + '10'
                            : colors.utility.secondaryText + '10',
                        }}
                      >
                        <IconComp
                          size={20}
                          style={{
                            color: isSelected
                              ? colors.brand.primary
                              : colors.utility.secondaryText,
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-medium text-sm truncate"
                          style={{
                            color: isSelected
                              ? colors.brand.primary
                              : colors.utility.primaryText,
                          }}
                        >
                          {industry.name}
                        </div>
                        {parentName && (
                          <div
                            className="text-xs truncate"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {parentName}
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
            onClick={handleClose}
            className="px-4 py-2 rounded-md border text-sm font-medium hover:opacity-80 transition-colors"
            style={{
              borderColor: colors.utility.secondaryText + '40',
              color: colors.utility.primaryText,
            }}
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
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={14} className="mr-2" />
                Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════

const ServedIndustriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Track page view
  React.useEffect(() => {
    analyticsService.trackPageView('settings/served-industries', 'Served Industries');
  }, []);

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

  // Set of already-served industry IDs for the add modal
  const alreadyServedIds = useMemo(
    () => new Set(servedIndustries.map((si) => si.industry_id)),
    [servedIndustries]
  );

  const handleRemove = async (industryId: string) => {
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

  return (
    <div
      className="p-6 transition-colors"
      style={{ backgroundColor: colors.utility.secondaryText + '10' }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/settings')}
            className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
          </button>
          <div>
            <h1
              className="text-2xl font-bold transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Served Industries
            </h1>
            <p className="transition-colors" style={{ color: colors.utility.secondaryText }}>
              Manage the industries your business serves
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={isMutating}
          className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
          style={{ backgroundColor: colors.brand.primary }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Industries
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <VaNiLoader size="md" message="Loading served industries..." />
        ) : isError ? (
          <div
            className="rounded-lg shadow-sm border p-10 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: '#EF4444' + '30',
            }}
          >
            <AlertCircle className="mx-auto mb-3" size={40} style={{ color: '#EF4444' }} />
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: colors.utility.primaryText }}
            >
              Failed to Load
            </h3>
            <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
              {(error as Error)?.message || 'Could not load your served industries. Please try again.'}
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
          /* Empty State */
          <div
            className="rounded-lg shadow-sm border p-10 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary,
              }}
            >
              <Factory size={32} />
            </div>
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: colors.utility.primaryText }}
            >
              No Served Industries Yet
            </h3>
            <p className="mb-6 max-w-md mx-auto" style={{ color: colors.utility.secondaryText }}>
              Add the industries your business serves to unlock industry-specific templates and
              improve your visibility in the marketplace.
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
          /* Industry Cards */
          <div>
            <div
              className="text-sm font-medium mb-4"
              style={{ color: colors.utility.secondaryText }}
            >
              {count} {count === 1 ? 'industry' : 'industries'} served
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {servedIndustries.map((si: ServedIndustry) => {
                const industry = si.industry;
                const IconComp = getIconComponent(industry?.icon);
                const isBeingRemoved = removingId === si.industry_id;

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
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(si.industry_id)}
                      disabled={isMutating}
                      className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: '#EF4444' + '15',
                        color: '#EF4444',
                      }}
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
                        style={{
                          backgroundColor: colors.brand.primary + '10',
                        }}
                      >
                        <IconComp
                          size={22}
                          style={{ color: colors.brand.primary }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="font-medium truncate"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {industry?.name || 'Unknown Industry'}
                        </h3>
                        {industry?.description && (
                          <p
                            className="text-sm mt-1 line-clamp-2"
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
          </div>
        )}
      </div>

      {/* Add Modal */}
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

export default ServedIndustriesPage;
