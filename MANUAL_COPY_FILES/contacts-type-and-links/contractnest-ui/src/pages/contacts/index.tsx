// src/pages/contacts/index.tsx
// Contacts directory — single-list redesign (owner-approved playground, 2026-09-16).
// The Billing Queue / Services Management tabs were hollow scaffolding (hardcoded
// count:0 chips driving no query) and are removed: money lives in Money In,
// services under Operations. This page is only the directory.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Users,
  Plus,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  Eye,
  DollarSign,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trash2,
  X,
  Tag,
  UserPlus,
  ShoppingCart,
  Package,
  Handshake,
  SlidersHorizontal,
  LucideIcon
} from 'lucide-react';

import { captureException } from '@/utils/sentry';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';

// API hooks
import { useContactList, useContactStats, invalidateContactsCache } from '../../hooks/useContacts';
import { useMasterDataOptions } from '../../hooks/useMasterData';
import { ContactFilters } from '../../types/contact';

// Constants
import {
  CONTACT_STATUS_LABELS,
  getClassificationConfig,
  CONTACT_SORT_OPTIONS,
  UI_CONFIG,
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors,
  getClassificationThemeColor
} from '@/utils/constants/contacts';

// Lucide icon mapping for classification icons (matches constants)
const CLASSIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users
};

const getClassificationIcon = (classificationId: string): LucideIcon => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === classificationId);
  if (config?.lucideIcon && CLASSIFICATION_ICON_MAP[config.lucideIcon]) {
    return CLASSIFICATION_ICON_MAP[config.lucideIcon];
  }
  return Tag;
};

const MINIMUM_SEARCH_LENGTH = 3;

type UserStatusFilter = 'all' | 'user' | 'not_user';

interface AdvancedFilters {
  tags: string[];
  contactStatus: string;       // 'all' | 'active' | 'inactive' | 'archived'
  userStatus: UserStatusFilter;
  showDuplicates: boolean;
}

const DEFAULT_ADVANCED: AdvancedFilters = {
  tags: [],
  contactStatus: 'active',
  userStatus: 'all',
  showDuplicates: false
};

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, isLive } = useAuth();

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const line = colors.utility.primaryText + '20';
  const infoHue = colors.semantic?.info || '#3573E8';

  // UI State
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showVideoHelp, setShowVideoHelp] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED);

  const itemsPerPage = UI_CONFIG.ITEMS_PER_PAGE;
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= MINIMUM_SEARCH_LENGTH) {
        setDebouncedSearchTerm(searchTerm);
      } else {
        setDebouncedSearchTerm('');
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  const buildApiFilters = (): ContactFilters => ({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm.trim() || undefined,
    status: advancedFilters.contactStatus !== 'all' ? (advancedFilters.contactStatus as any) : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(activeFilter !== 'all' && { classifications: [activeFilter] }),
    ...(advancedFilters.tags.length > 0 && { tags: advancedFilters.tags }),
    ...(advancedFilters.userStatus !== 'all' && { user_status: advancedFilters.userStatus }),
    ...(advancedFilters.showDuplicates && { show_duplicates: true })
  });

  // API Hooks
  const {
    data: contacts,
    loading,
    error,
    pagination,
    refetch,
    updateFilters
  } = useContactList(buildApiFilters());

  const { data: stats } = useContactStats();

  // Tags LOV for the tag filter chips (same source as the contact forms)
  const { options: tagLovOptions } = useMasterDataOptions('Tags', {
    valueField: 'SubCatName',
    labelField: 'DisplayName',
    includeInactive: false,
    sortBy: 'Sequence_no',
    sortOrder: 'asc'
  });

  // Track page views
  useEffect(() => {
    analyticsService.trackPageView('contacts-list', 'Contacts List Page');
  }, []);

  // Update filters when UI state changes
  useEffect(() => {
    updateFilters(buildApiFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, debouncedSearchTerm, currentPage, sortBy, sortOrder, advancedFilters, updateFilters]);

  const resetToFirstPage = () => {
    setCurrentPage(1);
    setSelectedContacts(new Set());
  };

  const handleFilterChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    resetToFirstPage();
  };

  const toggleTagFilter = (tagValue: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagValue)
        ? prev.tags.filter(t => t !== tagValue)
        : [...prev.tags, tagValue]
    }));
    resetToFirstPage();
  };

  const patchAdvanced = (patch: Partial<AdvancedFilters>) => {
    setAdvancedFilters(prev => ({ ...prev, ...patch }));
    resetToFirstPage();
  };

  const clearAllFilters = () => {
    setActiveFilter('all');
    setAdvancedFilters(DEFAULT_ADVANCED);
    setSearchTerm('');
    resetToFirstPage();
  };

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) resetToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  // Bulk selection
  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const handleSelectContact = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) newSelection.delete(contactId);
    else newSelection.add(contactId);
    setSelectedContacts(newSelection);
  };

  const handleBulkDelete = async () => {
    try {
      vaniToast.loading('Deleting contacts...');
      vaniToast.success(`${selectedContacts.size} contacts deleted successfully`);
      setSelectedContacts(new Set());
      refetch();
    } catch (error) {
      captureException(error, { tags: { component: 'ContactsPage', action: 'bulkDelete' } });
      vaniToast.error('Failed to delete contacts');
    }
  };

  const handleQuickAddSuccess = useCallback((_contactId: string) => {
    vaniToast.success('Contact created successfully');
    if (currentTenant?.id) invalidateContactsCache(currentTenant.id, isLive);
    refetch(true);
  }, [refetch, currentTenant?.id, isLive]);

  // Channels for the row's second line: phone value and email value,
  // each prefixed by its icon (owner decision — no action-button cluster).
  const getRowChannels = (contact: any) => {
    const channels: any[] = contact.contact_channels || [];
    const phone = channels.find(ch => ch.channel_type === 'mobile' || ch.channel_type === 'phone' || ch.channel_type === 'whatsapp');
    const email = channels.find(ch => ch.channel_type === 'email');
    return { phone: phone?.value as string | undefined, email: email?.value as string | undefined };
  };

  // Classification filter chips — fixed product colors + product icons
  const classificationFilters = [
    { id: 'all', label: 'All', count: stats?.total || 0, colorKey: 'default' },
    ...CONTACT_CLASSIFICATION_CONFIG.map(cls => ({
      id: cls.id,
      label: cls.labelPlural,
      count: stats?.by_classification?.[cls.id] ?? 0,
      colorKey: cls.colorKey
    }))
  ];

  // Tag filter chips: tenant's Tags LOV plus any free-text tags found on
  // contacts (from imports), with per-tag counts from stats
  const tagFilterChips = React.useMemo(() => {
    const byTag: Record<string, number> = stats?.by_tag || {};
    const seen = new Set<string>();
    const chips: Array<{ value: string; label: string; color?: string; count: number }> = [];
    tagLovOptions.forEach(opt => {
      seen.add(opt.value.toLowerCase());
      chips.push({ value: opt.value, label: opt.label, color: opt.color || undefined, count: byTag[opt.value] ?? 0 });
    });
    Object.entries(byTag).forEach(([tagValue, count]) => {
      if (!seen.has(tagValue.toLowerCase())) {
        chips.push({ value: tagValue, label: tagValue, count });
      }
    });
    return chips;
  }, [stats, tagLovOptions]);

  const getFilterColor = (colorKey: string, isActive: boolean) =>
    getClassificationColors(colorKey, colors, 'filter', isActive);

  // Non-default advanced filters (drives the pip on the Filters button and
  // the removable chips row)
  const advancedActive: Array<{ key: string; label: string; clear: () => void }> = [];
  if (advancedFilters.contactStatus !== 'active') {
    advancedActive.push({
      key: 'status',
      label: advancedFilters.contactStatus === 'all' ? 'All statuses'
        : advancedFilters.contactStatus === 'inactive' ? 'Inactive' : 'Archived',
      clear: () => patchAdvanced({ contactStatus: 'active' })
    });
  }
  if (advancedFilters.userStatus !== 'all') {
    advancedActive.push({
      key: 'user',
      label: advancedFilters.userStatus === 'user' ? 'Registered users' : 'Not registered',
      clear: () => patchAdvanced({ userStatus: 'all' })
    });
  }
  if (advancedFilters.showDuplicates) {
    advancedActive.push({
      key: 'dupes',
      label: 'Possible duplicates',
      clear: () => patchAdvanced({ showDuplicates: false })
    });
  }

  const anyFilterActive =
    activeFilter !== 'all' || advancedFilters.tags.length > 0 ||
    advancedActive.length > 0 || debouncedSearchTerm.trim().length >= MINIMUM_SEARCH_LENGTH;

  const shouldShowSearchHint = () =>
    searchTerm.length > 0 && searchTerm.length < MINIMUM_SEARCH_LENGTH;

  const ContactLoader = () => (
    <VaNiLoader
      size="md"
      message="VaNi is Loading Contacts..."
      showSkeleton={true}
      skeletonVariant="list"
      skeletonCount={8}
    />
  );

  return (
    <div
      className="p-4 md:p-6 min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Heading band — same gradient language as /experience */}
      <div
        className="rounded-2xl border p-6 md:p-7 mb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        style={{
          borderColor: line,
          background: `linear-gradient(120deg, ${colors.brand.primary}21, ${colors.utility.secondaryBackground} 46%, ${infoHue}1A)`
        }}
      >
        <div>
          <p
            className="text-[10px] font-bold tracking-[0.16em] mb-2"
            style={{ color: colors.brand.primary }}
          >
            YOUR NETWORK
          </p>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2"
            style={{ color: colors.utility.primaryText }}
          >
            Contacts
            <button
              onClick={() => setShowVideoHelp(true)}
              className="p-1 rounded-full hover:opacity-80 transition-colors"
              title="Help & tutorials"
            >
              <HelpCircle className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
            </button>
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.utility.secondaryText }}>
            {stats?.total != null
              ? `${stats.total} people and businesses in this workspace`
              : 'People and businesses in this workspace'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/contacts/import')}
            className="flex items-center px-6 py-2.5 rounded-full hover:scale-105 transition-transform font-bold border-2"
            style={{
              borderColor: colors.brand.primary,
              color: colors.brand.primary,
              backgroundColor: colors.brand.primary + '10'
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center px-6 py-2.5 rounded-full hover:scale-105 transition-transform font-bold shadow-lg"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff',
              boxShadow: `0 10px 25px -5px ${colors.brand.primary}40`
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* One filter system */}
      <div
        className="rounded-2xl shadow-sm border mb-5 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: line
        }}
      >
        <div className="p-4 space-y-3">
          {/* Classification chips */}
          <div className="flex flex-wrap gap-2">
            <span
              className="text-xs font-bold uppercase tracking-widest flex items-center mr-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Filter by:
            </span>
            {classificationFilters.map((filter) => {
              const isActive = activeFilter === filter.id;
              const filterColor = getFilterColor(filter.colorKey || 'default', isActive);
              const IconComponent = filter.id === 'all' ? Users : getClassificationIcon(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 inline-flex items-center gap-1.5"
                  style={{
                    backgroundColor: filterColor.bg,
                    color: filterColor.text,
                    borderColor: filterColor.border
                  }}
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  {filter.label} ({filter.count || 0})
                </button>
              );
            })}
          </div>

          {/* Tag chips */}
          {tagFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span
                className="text-xs font-bold uppercase tracking-widest flex items-center mr-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Tags:
              </span>
              {tagFilterChips.map((tag) => {
                const isActive = advancedFilters.tags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    onClick={() => toggleTagFilter(tag.value)}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5"
                    style={{
                      backgroundColor: isActive
                        ? (tag.color ? `${tag.color}25` : colors.brand.primary + '20')
                        : 'transparent',
                      borderColor: isActive
                        ? (tag.color || colors.brand.primary)
                        : colors.utility.primaryText + '25',
                      color: isActive ? colors.utility.primaryText : colors.utility.secondaryText
                    }}
                  >
                    {tag.color && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.label} ({tag.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Search + controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                placeholder={`Search name, phone, email, CT number… (min ${MINIMUM_SEARCH_LENGTH} characters)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.primaryText + '40',
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary + '40'
                } as React.CSSProperties}
              />
              {loading && debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.utility.secondaryText }} />
                </div>
              )}
            </div>

            {/* Filters (advanced) toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              aria-expanded={showAdvanced}
              className="relative flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-semibold hover:opacity-80 transition-colors"
              style={{
                borderColor: advancedActive.length > 0 ? colors.brand.primary : colors.utility.primaryText + '40',
                backgroundColor: advancedActive.length > 0 ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
                color: colors.utility.primaryText
              }}
            >
              <SlidersHorizontal className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />
              Filters
              {advancedActive.length > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] min-h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
                >
                  {advancedActive.length}
                </span>
              )}
            </button>

            {/* Sort — now actually applied server-side (API fix in this batch) */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const value = e.target.value;
                const lastUnderscoreIndex = value.lastIndexOf('_');
                setSortBy(value.substring(0, lastUnderscoreIndex));
                setSortOrder(value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc');
                resetToFirstPage();
              }}
              className="px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderColor: colors.utility.primaryText + '40',
                color: colors.utility.primaryText
              }}
              aria-label="Sort contacts"
            >
              {CONTACT_SORT_OPTIONS.map(option => (
                <React.Fragment key={option.value}>
                  <option value={`${option.value}_desc`}>{option.label} ({option.descLabel})</option>
                  <option value={`${option.value}_asc`}>{option.label} ({option.ascLabel})</option>
                </React.Fragment>
              ))}
            </select>

            <span
              className="text-sm whitespace-nowrap transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {pagination?.total || 0} results
            </span>
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border p-4"
              style={{ borderColor: line, backgroundColor: colors.utility.primaryBackground }}
            >
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: colors.utility.secondaryText }}>
                  STATUS
                </p>
                {[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'archived', label: 'Archived' },
                  { value: 'all', label: 'All statuses' }
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="f-status"
                      value={opt.value}
                      checked={advancedFilters.contactStatus === opt.value}
                      onChange={() => patchAdvanced({ contactStatus: opt.value })}
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: colors.utility.secondaryText }}>
                  APP USER
                </p>
                {[
                  { value: 'all', label: 'Everyone' },
                  { value: 'user', label: 'Registered users' },
                  { value: 'not_user', label: 'Not registered' }
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="f-user"
                      value={opt.value}
                      checked={advancedFilters.userStatus === opt.value}
                      onChange={() => patchAdvanced({ userStatus: opt.value as UserStatusFilter })}
                      style={{ accentColor: colors.brand.primary }}
                    />
                    <span className="text-sm" style={{ color: colors.utility.primaryText }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: colors.utility.secondaryText }}>
                  DATA QUALITY
                </p>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={advancedFilters.showDuplicates}
                    onChange={(e) => patchAdvanced({ showDuplicates: e.target.checked })}
                    style={{ accentColor: colors.brand.primary }}
                  />
                  <span className="text-sm" style={{ color: colors.utility.primaryText }}>
                    Possible duplicates only
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Search hint */}
          {shouldShowSearchHint() && (
            <div
              className="text-sm p-2 rounded transition-colors"
              style={{
                color: colors.utility.secondaryText,
                backgroundColor: colors.utility.secondaryText + '10'
              }}
            >
              Type at least {MINIMUM_SEARCH_LENGTH} characters to search contacts
            </div>
          )}

          {/* Active filters — removable chips */}
          {(advancedFilters.tags.length > 0 || advancedActive.length > 0 || debouncedSearchTerm) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Active filters:
              </span>
              {advancedFilters.tags.map(tagValue => (
                <span
                  key={tagValue}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: colors.brand.primary + '15',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '40'
                  }}
                >
                  {tagValue}
                  <button onClick={() => toggleTagFilter(tagValue)} className="ml-0.5 hover:opacity-70" aria-label={`Remove tag filter ${tagValue}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {advancedActive.map(f => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: colors.brand.primary + '15',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '40'
                  }}
                >
                  {f.label}
                  <button onClick={f.clear} className="ml-0.5 hover:opacity-70" aria-label={`Remove filter ${f.label}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {debouncedSearchTerm && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: colors.brand.primary + '15',
                    color: colors.brand.primary,
                    borderColor: colors.brand.primary + '40'
                  }}
                >
                  “{debouncedSearchTerm}”
                  <button onClick={() => setSearchTerm('')} className="ml-0.5 hover:opacity-70" aria-label="Clear search">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold underline hover:no-underline"
                style={{ color: colors.utility.secondaryText }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Bulk actions bar */}
          {selectedContacts.size > 0 && (
            <div
              className="flex items-center justify-between p-3 rounded-lg border transition-colors"
              style={{
                backgroundColor: colors.brand.primary + '20',
                borderColor: colors.brand.primary + '40'
              }}
            >
              <span className="text-sm font-medium" style={{ color: colors.brand.primary }}>
                {selectedContacts.size} {selectedContacts.size !== 1 ? 'contacts' : 'contact'} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="px-3 py-1.5 text-sm rounded-md hover:opacity-90 transition-colors"
                  style={{ backgroundColor: colors.semantic.error, color: '#ffffff' }}
                >
                  <Trash2 className="h-4 w-4 mr-2 inline" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedContacts(new Set())}
                  className="px-3 py-1.5 text-sm rounded-md border hover:opacity-80 transition-colors"
                  style={{
                    borderColor: colors.utility.primaryText + '40',
                    color: colors.utility.primaryText,
                    backgroundColor: 'transparent'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg border transition-colors"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderColor: colors.semantic.error + '40'
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: colors.semantic.error }} />
            <div>
              <h3 className="font-medium" style={{ color: colors.semantic.error }}>
                Error loading contacts
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.semantic.error }}>{error}</p>
              <button
                onClick={refetch}
                className="text-sm mt-2 underline hover:no-underline"
                style={{ color: colors.semantic.error }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <ContactLoader />}

      {/* Directory list */}
      {!loading && !error && (
        <div>
          {contacts.length === 0 ? (
            <div
              className="rounded-2xl shadow-sm border p-12 text-center transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: line
              }}
            >
              <Users className="h-16 w-16 mx-auto mb-4" style={{ color: colors.utility.secondaryText }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                No contacts found
              </h3>
              <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
                {anyFilterActive
                  ? 'No contacts match these filters. Try removing a filter, or create the contact if they’re genuinely new.'
                  : "You haven't added any contacts yet. Create your first contact to get started."}
              </p>
              {anyFilterActive ? (
                <button
                  onClick={clearAllFilters}
                  className="text-sm font-bold underline hover:no-underline"
                  style={{ color: colors.brand.primary }}
                >
                  Clear all filters
                </button>
              ) : (
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="flex items-center px-6 py-2.5 rounded-full hover:scale-105 transition-transform font-bold shadow-lg mx-auto"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#ffffff',
                    boxShadow: `0 10px 25px -5px ${colors.brand.primary}40`
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </button>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl shadow-sm border overflow-hidden transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: line
              }}
            >
              {/* List caption */}
              <div
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] flex-wrap"
                style={{ color: colors.utility.secondaryText }}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedContacts.size === contacts.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded cursor-pointer"
                    style={{ accentColor: colors.brand.primary }}
                    aria-label="Select all on this page"
                  />
                  {pagination
                    ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} contacts`
                    : `${contacts.length} contacts`}
                </label>
                <span>
                  {CONTACT_SORT_OPTIONS.find(o => o.value === sortBy)?.label
                    ? `Sorted by ${CONTACT_SORT_OPTIONS.find(o => o.value === sortBy)!.label.toLowerCase()}`
                    : ''}
                </span>
              </div>

              {/* Rows */}
              {contacts.map((contact) => {
                const isSelected = selectedContacts.has(contact.id);
                const primaryCls = contact.classifications?.[0];
                const clsConfig = primaryCls ? getClassificationConfig(primaryCls) : null;
                const { themeColor: clsHex } = getClassificationThemeColor(clsConfig?.colorKey || 'default');
                const { phone, email } = getRowChannels(contact);
                const rowTags: any[] = Array.isArray(contact.tags) ? contact.tags : [];
                const AvatarIcon = primaryCls ? getClassificationIcon(primaryCls) : User;

                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-4 py-3 border-t cursor-pointer transition-colors flex-wrap hover:opacity-95"
                    style={{
                      borderColor: line,
                      backgroundColor: isSelected ? colors.brand.primary + '0C' : 'transparent'
                    }}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    {/* Select */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectContact(contact.id)}
                        className="h-4 w-4 rounded cursor-pointer"
                        style={{ accentColor: colors.brand.primary }}
                        aria-label={`Select ${contact.displayName}`}
                      />
                    </div>

                    {/* Avatar — tinted by primary classification (fixed product colors) */}
                    <div
                      className="w-10 h-10 rounded-xl flex-none flex items-center justify-center border"
                      style={{
                        backgroundColor: clsHex + '20',
                        color: clsHex,
                        borderColor: clsHex + '40'
                      }}
                    >
                      <AvatarIcon className="h-[18px] w-[18px]" />
                    </div>

                    {/* Identity + channels */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className="text-sm font-semibold truncate max-w-[320px]"
                          style={{ color: colors.utility.primaryText }}
                          title={contact.displayName}
                        >
                          {contact.displayName}
                        </p>
                        {/* Type is said, not hinted (owner, 2026-09-17): a labelled chip, not a bare icon */}
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap"
                          style={{
                            color: colors.utility.secondaryText,
                            borderColor: colors.utility.primaryText + '20',
                            backgroundColor: colors.utility.secondaryBackground
                          }}
                        >
                          {contact.type === 'corporate' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {contact.type === 'corporate' ? 'Company' : 'Individual'}
                        </span>
                        {contact.contact_number && (
                          <span className="text-[10px] font-mono" style={{ color: colors.utility.secondaryText }}>
                            {contact.contact_number}
                          </span>
                        )}
                        {contact.status !== 'active' && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap"
                            style={{
                              backgroundColor: (contact.status === 'inactive' ? colors.semantic.warning : colors.utility.secondaryText) + '20',
                              borderColor: (contact.status === 'inactive' ? colors.semantic.warning : colors.utility.secondaryText) + '40',
                              color: contact.status === 'inactive' ? colors.semantic.warning : colors.utility.secondaryText
                            }}
                          >
                            {CONTACT_STATUS_LABELS[contact.status as keyof typeof CONTACT_STATUS_LABELS] || contact.status}
                          </span>
                        )}
                      </div>
                      {/* icon + value, per owner direction — no action buttons */}
                      <div
                        className="flex items-center gap-3 flex-wrap text-xs mt-1"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {phone && (
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate" title={phone}>{phone}</span>
                          </span>
                        )}
                        {email && (
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[220px]" title={email}>{email}</span>
                          </span>
                        )}
                        {!phone && !email && <span>No contact channel</span>}
                      </div>
                      {/* A person linked under a company (parent_contact_ids) says so; the name opens the company */}
                      {Array.isArray(contact.parent_links) && contact.parent_links.length > 0 && (
                        <div
                          className="flex items-center gap-1.5 flex-wrap text-xs mt-1"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span>Linked to</span>
                          {contact.parent_links.map((parent, idx) => (
                            <React.Fragment key={parent.id}>
                              {idx > 0 && <span>·</span>}
                              <button
                                type="button"
                                className="font-medium hover:underline"
                                style={{ color: colors.brand.primary }}
                                title={`Open ${parent.name}`}
                                onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${parent.id}`); }}
                              >
                                {parent.name}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tag dots */}
                    {rowTags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {rowTags.slice(0, 4).map((tag: any, idx: number) => (
                          <span
                            key={`${tag.tag_value || idx}`}
                            className="w-2.5 h-2.5 rounded-full border"
                            style={{
                              backgroundColor: tag.tag_color || colors.utility.secondaryText,
                              borderColor: colors.utility.primaryText + '30'
                            }}
                            title={tag.tag_label || tag.tag_value}
                          />
                        ))}
                        {rowTags.length > 4 && (
                          <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                            +{rowTags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Classification badges */}
                    <div className="flex flex-wrap gap-1 justify-end">
                      {contact.classifications?.slice(0, 2).map((cls) => {
                        const config = getClassificationConfig(cls);
                        const badgeColors = getClassificationColors(config?.colorKey || 'default', colors, 'badge');
                        const IconComponent = getClassificationIcon(cls);
                        return (
                          <span
                            key={cls}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap"
                            style={{
                              backgroundColor: badgeColors.bg,
                              borderColor: badgeColors.border,
                              color: badgeColors.text
                            }}
                            title={config?.label}
                          >
                            <IconComponent className="h-3 w-3" />
                            {config?.label}
                          </span>
                        );
                      })}
                      {contact.classifications && contact.classifications.length > 2 && (
                        <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>
                          +{contact.classifications.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Open */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg border hover:opacity-80"
                        style={{ borderColor: colors.utility.secondaryText + '30', color: colors.utility.primaryText }}
                        title="View contact details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination — windowed pager (first · window around current · last) */}
          {pagination && pagination.totalPages > 1 && (
            <div
              className="mt-6 rounded-lg shadow-sm border p-4 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: line
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-md border hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: colors.utility.primaryText + '40',
                      color: colors.utility.primaryText,
                      backgroundColor: 'transparent'
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = pagination.totalPages;
                      const current = pagination.page;
                      const pages: (number | '…')[] = [];
                      const window = [current - 1, current, current + 1].filter(
                        (p) => p >= 1 && p <= totalPages
                      );
                      if (!window.includes(1)) {
                        pages.push(1);
                        if (window[0] > 2) pages.push('…');
                      }
                      pages.push(...window);
                      if (!window.includes(totalPages)) {
                        if (window[window.length - 1] < totalPages - 1) pages.push('…');
                        pages.push(totalPages);
                      }
                      return pages;
                    })().map((page, idx) => {
                      if (page === '…') {
                        return (
                          <span key={`gap-${idx}`} className="px-1 text-sm" style={{ color: colors.utility.secondaryText }}>
                            …
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: pagination.page === page ? colors.brand.primary : 'transparent',
                            color: pagination.page === page ? '#ffffff' : colors.utility.primaryText
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-md border hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: colors.utility.primaryText + '40',
                      color: colors.utility.primaryText,
                      backgroundColor: 'transparent'
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Help Modal */}
      {showVideoHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden transition-colors"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <div className="p-6 border-b transition-colors" style={{ borderColor: line }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ color: colors.utility.primaryText }}>
                  Contacts Help
                </h2>
                <button
                  onClick={() => setShowVideoHelp(false)}
                  className="p-2 hover:opacity-80 rounded-md transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.utility.secondaryText + '10' }}>
                  <h3 className="font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                    Getting Started with Contacts
                  </h3>
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    Learn how to add, organize, and manage your business contacts effectively.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.utility.secondaryText + '10' }}>
                  <h3 className="font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                    Contact Classifications & Filtering
                  </h3>
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    Understanding how to categorize contacts and use classification, tag, and advanced filters.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.utility.secondaryText + '10' }}>
                  <h3 className="font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                    Search & Discovery
                  </h3>
                  <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                    Master the search functionality to quickly find the contacts you need.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Delete Contacts"
        description={`Are you sure you want to delete ${selectedContacts.size} ${selectedContacts.size !== 1 ? 'contacts' : 'contact'}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        icon={<Trash2 className="h-6 w-6" />}
      />

      {/* Quick Add Contact Drawer (already runs the duplicate check on save) */}
      <QuickAddContactDrawer
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </div>
  );
};

export default ContactsPage;
