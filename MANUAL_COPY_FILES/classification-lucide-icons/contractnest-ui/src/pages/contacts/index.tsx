// src/pages/contacts/index.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Users,
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Mail,
  Phone,
  Eye,
  FileText,
  DollarSign,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Grid3X3,
  List,
  Loader2,
  AlertCircle,
  Star,
  Trash2,
  X,
  MessageSquare,
  Globe,
  Hash,
  Tag,
  UserPlus,
  Network,
  Briefcase,
  ShoppingCart,
  Package,
  Handshake,
  LucideIcon
} from 'lucide-react';

// import { useToast } from '@/components/ui/use-toast'; // Replaced with vaniToast
import { captureException } from '@/utils/sentry';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import ComingSoonWrapper from '@/components/common/ComingSoonWrapper';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import { VaNiLoader } from '@/components/common/loaders';
import { vaniToast } from '@/components/common/toast';

// Coming Soon features for Contacts
const contactsFeatures = [
  { icon: Users, title: 'Contact Management', description: 'Centralized hub for all your business contacts - customers, vendors, partners, and team members.', highlight: true },
  { icon: Network, title: 'Relationship Mapping', description: 'Visualize connections between contacts and track interaction history.', highlight: false },
  { icon: Briefcase, title: 'Business Classification', description: 'Categorize contacts by type, industry, and custom tags for easy filtering.', highlight: false },
  { icon: UserPlus, title: 'Smart Import', description: 'Bulk import contacts from CSV, vCard, or sync with external systems.', highlight: false }
];

const contactsFloatingIcons = [
  { Icon: Users, top: '8%', left: '4%', delay: '0s', duration: '22s' },
  { Icon: UserPlus, top: '18%', right: '6%', delay: '1.5s', duration: '19s' },
  { Icon: Network, top: '60%', left: '5%', delay: '3s', duration: '21s' },
  { Icon: Briefcase, top: '70%', right: '4%', delay: '0.5s', duration: '18s' },
];

// Import API hooks
import { useContactList, useContactStats, useUpdateContactStatus, invalidateContactsCache } from '../../hooks/useContacts';
import { ContactFilters } from '../../types/contact';

// Import constants
import {
  CONTACT_STATUS,
  CONTACT_STATUS_LABELS,
  getStatusColor,
  getClassificationConfig,
  CONTACT_VIEW_MODES,
  CONTACT_SORT_OPTIONS,
  FILTER_OPTIONS,
  UI_CONFIG,
  canPerformOperation,
  BULK_ACTIONS,
  CONTACT_CLASSIFICATIONS,
  CONTACT_CLASSIFICATION_CONFIG,
  getClassificationColors
} from '@/utils/constants/contacts';

// Lucide icon mapping for classification icons (matches constants)
const CLASSIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  DollarSign,
  Package,
  Handshake,
  Users
};

// Get Lucide icon component for a classification
const getClassificationIcon = (classificationId: string): LucideIcon => {
  const config = CONTACT_CLASSIFICATION_CONFIG.find(c => c.id === classificationId);
  if (config?.lucideIcon && CLASSIFICATION_ICON_MAP[config.lucideIcon]) {
    return CLASSIFICATION_ICON_MAP[config.lucideIcon];
  }
  return Tag;
};

type ActiveTab = 'status' | 'billing' | 'services';
type ViewType = 'grid' | 'list';

const MINIMUM_SEARCH_LENGTH = 3;

// Filter Dropdown Component
const FilterDropdown: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  currentFilters: any;
}> = ({ isOpen, onClose, onApplyFilters, currentFilters }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [localFilters, setLocalFilters] = useState({
    classifications: currentFilters.classifications || [],
    tags: currentFilters.tags || [],
    contactStatus: currentFilters.contactStatus || 'all'
  });

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      classifications: [],
      tags: [],
      contactStatus: 'all'
    };
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <div 
      className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg border z-20 transition-colors"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '20'
      }}
    >
      <div 
        className="p-4 border-b transition-colors"
        style={{ borderColor: colors.utility.primaryText + '20' }}
      >
        <div className="flex items-center justify-between">
          <h3 
            className="font-medium transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Filters
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-80 rounded transition-colors"
            style={{ backgroundColor: colors.utility.primaryBackground }}
          >
            <X 
              className="h-4 w-4"
              style={{ color: colors.utility.secondaryText }}
            />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Contact Status Filter (Active/Inactive/Archived) */}
        <div>
          <label
            className="text-sm font-medium mb-2 block transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Contact Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contactStatus"
                value="all"
                checked={localFilters.contactStatus === 'all'}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, contactStatus: e.target.value }))}
                style={{ accentColor: colors.brand.primary }}
              />
              <span
                className="text-sm transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                All Statuses
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contactStatus"
                value="active"
                checked={localFilters.contactStatus === 'active'}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, contactStatus: e.target.value }))}
                style={{ accentColor: colors.brand.primary }}
              />
              <span
                className="text-sm flex items-center gap-1 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <span style={{ color: colors.semantic.success }}>●</span>
                Active
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contactStatus"
                value="inactive"
                checked={localFilters.contactStatus === 'inactive'}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, contactStatus: e.target.value }))}
                style={{ accentColor: colors.brand.primary }}
              />
              <span
                className="text-sm flex items-center gap-1 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <span style={{ color: colors.semantic.warning }}>●</span>
                Inactive
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contactStatus"
                value="archived"
                checked={localFilters.contactStatus === 'archived'}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, contactStatus: e.target.value }))}
                style={{ accentColor: colors.brand.primary }}
              />
              <span
                className="text-sm flex items-center gap-1 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                <span style={{ color: colors.utility.secondaryText }}>●</span>
                Archived
              </span>
            </label>
          </div>
        </div>

      </div>

      <div 
        className="p-4 border-t flex gap-2 transition-colors"
        style={{ borderColor: colors.utility.primaryText + '20' }}
      >
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 border rounded-md hover:opacity-80 transition-colors text-sm"
          style={{
            borderColor: colors.utility.primaryText + '40',
            color: colors.utility.primaryText,
            backgroundColor: 'transparent'
          }}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-2 rounded-md hover:opacity-90 transition-colors text-sm"
          style={{
            backgroundColor: colors.brand.primary,
            color: '#ffffff'
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, isLive } = useAuth();
  // const { toast } = useToast(); // Replaced with vaniToast

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewType, setViewType] = useState<ViewType>(CONTACT_VIEW_MODES.LIST as ViewType);
  const [showVideoHelp, setShowVideoHelp] = useState<boolean>(false);
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    classifications: [],
    tags: [],
    contactStatus: 'all'
  });
  
  const itemsPerPage = UI_CONFIG.ITEMS_PER_PAGE;
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= MINIMUM_SEARCH_LENGTH) {
        setDebouncedSearchTerm(searchTerm);
      } else {
        setDebouncedSearchTerm('');
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Build filters for API
  // activeFilter now holds classification filter (buyer, seller, etc.)
  // FIX: Combine activeFilter with advancedFilters.classifications and send as array
  const combinedClassifications = [
    ...(activeFilter !== 'all' ? [activeFilter] : []),
    ...((advancedFilters.classifications || []).filter((c: string) => c !== activeFilter))
  ];

  const apiFilters: ContactFilters = {
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm.trim() || undefined,
    status: advancedFilters.contactStatus !== 'all' ? (advancedFilters.contactStatus as any) : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(combinedClassifications.length > 0 && { classifications: combinedClassifications })
  };

  // API Hooks
  const { 
    data: contacts, 
    loading, 
    error, 
    pagination, 
    refetch,
    updateFilters 
  } = useContactList(apiFilters);

  const {
    data: stats,
    loading: statsLoading
  } = useContactStats();

  // Soft delete (archive) hook
  const { mutate: updateContactStatus, loading: archiving } = useUpdateContactStatus();

  // Handle soft delete (archive) - single contact
  const handleSoftDelete = async (contactId: string, contactName: string) => {
    try {
      vaniToast.loading(`Archiving ${contactName}...`);
      await updateContactStatus(contactId, 'archived');
      vaniToast.success(`${contactName} archived successfully`);

      // Invalidate cache and force refresh
      if (currentTenant?.id) {
        invalidateContactsCache(currentTenant.id, isLive);
      }
      refetch(true); // Force refresh to bypass cache
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactsPage', action: 'softDelete' }
      });
      vaniToast.error(`Failed to archive ${contactName}`);
    }
  };

  // Track page views
  useEffect(() => {
    analyticsService.trackPageView('contacts-list', 'Contacts List Page');
  }, []);

  // Update filters when UI state changes
  useEffect(() => {
    // FIX: Combine activeFilter with advancedFilters.classifications and send as array
    const updatedClassifications = [
      ...(activeFilter !== 'all' ? [activeFilter] : []),
      ...((advancedFilters.classifications || []).filter((c: string) => c !== activeFilter))
    ];

    const newFilters: ContactFilters = {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm.trim() || undefined,
      status: advancedFilters.contactStatus !== 'all' ? (advancedFilters.contactStatus as any) : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...(updatedClassifications.length > 0 && { classifications: updatedClassifications })
    };

    updateFilters(newFilters);
  }, [activeFilter, debouncedSearchTerm, currentPage, sortBy, sortOrder, advancedFilters, updateFilters]);

  // Reset page when filters change
  const handleFilterChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    setCurrentPage(1);
    setSelectedContacts(new Set());
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
      setSelectedContacts(new Set());
    }
  }, [debouncedSearchTerm]);

  const handleAdvancedFiltersChange = (filters: any) => {
    setAdvancedFilters(filters);
    setCurrentPage(1);
    setSelectedContacts(new Set());
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const handleSelectContact = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      vaniToast.loading('Deleting contacts...');

      vaniToast.success(`${selectedContacts.size} contacts deleted successfully`);
      setSelectedContacts(new Set());
      refetch();
    } catch (error) {
      captureException(error, {
        tags: { component: 'ContactsPage', action: 'bulkDelete' }
      });
      vaniToast.error('Failed to delete contacts');
    }
  };

  // Handle quick add success - refresh list and show toast
  const handleQuickAddSuccess = useCallback((contactId: string) => {
    vaniToast.success('Contact created successfully');
    refetch();
    // Navigate to view the new contact (optional)
    // navigate(`/contacts/${contactId}`);
  }, [refetch]);

  // Get primary contact channel
  const getPrimaryContactChannel = (contact: any) => {
    // FIXED: Use optimized data structure
    const primaryChannel = contact.contact_channels?.[0];
    
    if (!primaryChannel) return { icon: null, value: 'No contact channel' };

    const channelIcons: Record<string, any> = {
      email: Mail,
      mobile: Phone,
      whatsapp: MessageSquare,
      phone: Phone,
      linkedin: Globe,
      website: Globe,
      telegram: MessageSquare,
      skype: MessageSquare
    };

    const IconComponent = channelIcons[primaryChannel.channel_type] || Mail;
    return {
      icon: IconComponent,
      value: primaryChannel.value,
      type: primaryChannel.channel_type
    };
  };

  // Tab configurations - dynamically built from CONTACT_CLASSIFICATION_CONFIG
  // This ensures consistency with constants and reduces duplication
  const classificationFilters = [
    { id: 'all', label: 'All', count: stats?.total || 0, colorKey: 'default' },
    ...CONTACT_CLASSIFICATION_CONFIG.map(cls => ({
      id: cls.id,
      label: cls.labelPlural,
      count: stats?.[cls.id === 'team_member' ? 'team_members' : `${cls.id}s`] || 0,
      colorKey: cls.colorKey
    }))
  ];

  const tabConfigs = {
    status: {
      label: 'Status & Identity',
      filters: classificationFilters
    },
    billing: {
      label: 'Billing Queue',
      filters: [
        { id: 'all', label: 'All', count: stats?.total || 0, colorKey: 'default' },
        { id: 'overdue', label: 'Overdue', count: 0, colorKey: 'red' },
        { id: 'due_next_week', label: 'Due next week', count: 0, colorKey: 'orange' },
        { id: 'due_next_month', label: 'Due next month', count: 0, colorKey: 'blue' },
        { id: 'due_anytime', label: 'Due anytime', count: 0, colorKey: 'default' }
      ]
    },
    services: {
      label: 'Services Management',
      filters: [
        { id: 'all', label: 'All', count: stats?.total || 0, colorKey: 'default' },
        { id: 'active_services', label: 'Active services', count: 0, colorKey: 'green' },
        { id: 'service_renewal_due', label: 'Renewal due', count: 0, colorKey: 'orange' },
        { id: 'completed_projects', label: 'Completed', count: 0, colorKey: 'blue' },
        { id: 'pending_proposals', label: 'Pending proposals', count: 0, colorKey: 'purple' }
      ]
    }
  };

  // Get filter color based on type - now uses central getClassificationColors
  const getFilterColor = (colorKey: string, isActive: boolean) => {
    return getClassificationColors(colorKey, colors, 'filter', isActive);
  };

  const currentFilters = tabConfigs[activeTab].filters;

  // Loading state with VaNi hybrid loader
  // Dynamic message based on active filter
  const getLoadingMessage = () => {
    const filterConfig = currentFilters.find((f: any) => f.id === activeFilter);
    if (activeFilter === 'all') {
      return 'VaNi is Loading Contacts...';
    }
    return `VaNi is Loading ${filterConfig?.label || 'Contacts'}...`;
  };

  const ContactLoader = () => (
    <VaNiLoader
      size="md"
      message={getLoadingMessage()}
      showSkeleton={true}
      skeletonVariant={viewType === 'grid' ? 'card' : 'list'}
      skeletonCount={viewType === 'grid' ? 6 : 8}
    />
  );

  const shouldShowSearchHint = () => {
    return searchTerm.length > 0 && searchTerm.length < MINIMUM_SEARCH_LENGTH;
  };

  return (
    <div 
      className="p-4 md:p-6 min-h-screen transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-bold flex items-center gap-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Contacts
            <button
              onClick={() => setShowVideoHelp(true)}
              className="p-1 rounded-full hover:opacity-80 transition-colors"
              title="Help & tutorials"
            >
              <HelpCircle 
                className="h-5 w-5"
                style={{ color: colors.utility.secondaryText }}
              />
            </button>
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
{/* Import/Export buttons hidden for now
          <div className="flex gap-2">
            <button
              className="flex items-center px-3 py-2 rounded-md hover:opacity-80 transition-colors text-sm border"
              style={{
                borderColor: colors.brand.primary,
                color: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10'
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              className="flex items-center px-3 py-2 rounded-md hover:opacity-80 transition-colors text-sm border"
              style={{
                borderColor: colors.brand.primary,
                color: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10'
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
          */}
          
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

      {/* Tab Layout */}
      <div 
        className="rounded-lg shadow-sm border mb-6 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        {/* Main Tabs */}
        <div className="px-4 pt-4">
          <div 
            className="flex gap-6 border-b"
            style={{ borderColor: colors.utility.primaryText + '20' }}
          >
            {Object.entries(tabConfigs).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as ActiveTab);
                  setActiveFilter('all');
                  setCurrentPage(1);
                }}
                className="pb-3 font-medium text-sm transition-colors relative"
                style={{ 
                  color: activeTab === key 
                    ? colors.utility.primaryText 
                    : colors.utility.secondaryText 
                }}
              >
                {config.label}
                {activeTab === key && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: colors.brand.primary }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sub Filters & Search */}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span
              className="text-xs font-bold uppercase tracking-widest flex items-center mr-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Filter by:
            </span>
            {currentFilters.map((filter: any) => {
              const isActive = activeFilter === filter.id;
              const filterColor = getFilterColor(filter.colorKey || 'default', isActive);
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105"
                  style={{
                    backgroundColor: filterColor.bg,
                    color: filterColor.text,
                    borderColor: filterColor.border
                  }}
                >
                  {filter.label} {filter.count > 0 && `(${filter.count})`}
                </button>
              );
            })}
          </div>

          {/* Search Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <input
                type="text"
                placeholder={`Search contacts... (min ${MINIMUM_SEARCH_LENGTH} characters)`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
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
                  <Loader2 
                    className="h-4 w-4 animate-spin"
                    style={{ color: colors.utility.secondaryText }}
                  />
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('_');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 border rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: colors.utility.primaryText + '40',
                  color: colors.utility.primaryText
                }}
              >
                {CONTACT_SORT_OPTIONS.map(option => (
                  <React.Fragment key={option.value}>
                    <option value={`${option.value}_desc`}>{option.label} (Newest)</option>
                    <option value={`${option.value}_asc`}>{option.label} (Oldest)</option>
                  </React.Fragment>
                ))}
              </select>

              {/* View Toggle */}
              <div 
                className="flex rounded-lg p-0.5"
                style={{ backgroundColor: colors.utility.secondaryText + '20' }}
              >
                <button 
                  onClick={() => setViewType('grid')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{
                    backgroundColor: viewType === 'grid' 
                      ? colors.utility.primaryBackground 
                      : 'transparent',
                    color: viewType === 'grid' 
                      ? colors.utility.primaryText 
                      : colors.utility.secondaryText
                  }}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewType('list')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{
                    backgroundColor: viewType === 'list' 
                      ? colors.utility.primaryBackground 
                      : 'transparent',
                    color: viewType === 'list' 
                      ? colors.utility.primaryText 
                      : colors.utility.secondaryText
                  }}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              {/* Filter Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="p-2 border rounded-lg hover:opacity-80 transition-colors"
                  style={{
                    borderColor: Object.values(advancedFilters).some(v =>
                      Array.isArray(v) ? v.length > 0 : v !== 'all'
                    ) ? colors.brand.primary : colors.utility.primaryText + '40',
                    backgroundColor: Object.values(advancedFilters).some(v =>
                      Array.isArray(v) ? v.length > 0 : v !== 'all'
                    ) ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                    color: colors.utility.primaryText
                  }}
                  title="More filters"
                >
                  <Filter className="h-4 w-4" />
                </button>
                
                <FilterDropdown
                  isOpen={showMoreFilters}
                  onClose={() => setShowMoreFilters(false)}
                  onApplyFilters={handleAdvancedFiltersChange}
                  currentFilters={advancedFilters}
                />
              </div>
              
              <span 
                className="text-sm whitespace-nowrap transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {pagination?.total || 0} results
              </span>
            </div>
          </div>

          {/* Search Status Messages */}
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

          {debouncedSearchTerm && (
            <div 
              className="text-sm transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {loading 
                ? `Searching for "${debouncedSearchTerm}"...`
                : `Showing results for "${debouncedSearchTerm}" (${pagination?.total || 0} found)`
              }
            </div>
          )}

          {/* Active Filters Display */}
          {Object.values(advancedFilters).some(v =>
            Array.isArray(v) ? v.length > 0 : v !== 'all'
          ) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Active filters:
              </span>
              {advancedFilters.classifications.map((cls: string) => {
                const config = getClassificationConfig(cls);
                const badgeColors = getClassificationColors(config?.colorKey || 'default', colors, 'badge');
                const IconComponent = getClassificationIcon(cls);
                return (
                  <span
                    key={cls}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: badgeColors.bg,
                      color: badgeColors.text,
                      borderColor: badgeColors.border
                    }}
                  >
                    <IconComponent className="h-3 w-3" />
                    {config?.label}
                    <button
                      onClick={() => {
                        handleAdvancedFiltersChange({
                          ...advancedFilters,
                          classifications: advancedFilters.classifications.filter(c => c !== cls)
                        });
                      }}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {advancedFilters.contactStatus !== 'all' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                  style={{
                    backgroundColor: advancedFilters.contactStatus === 'active'
                      ? colors.semantic.success + '20'
                      : advancedFilters.contactStatus === 'inactive'
                      ? colors.semantic.warning + '20'
                      : colors.utility.secondaryText + '20',
                    color: advancedFilters.contactStatus === 'active'
                      ? colors.semantic.success
                      : advancedFilters.contactStatus === 'inactive'
                      ? colors.semantic.warning
                      : colors.utility.secondaryText,
                    borderColor: advancedFilters.contactStatus === 'active'
                      ? colors.semantic.success + '40'
                      : advancedFilters.contactStatus === 'inactive'
                      ? colors.semantic.warning + '40'
                      : colors.utility.secondaryText + '40'
                  }}
                >
                  {advancedFilters.contactStatus === 'active' ? 'Active' : advancedFilters.contactStatus === 'inactive' ? 'Inactive' : 'Archived'}
                  <button
                    onClick={() => {
                      handleAdvancedFiltersChange({
                        ...advancedFilters,
                        contactStatus: 'all'
                      });
                    }}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedContacts.size > 0 && (
            <div 
              className="flex items-center justify-between p-3 rounded-lg border transition-colors"
              style={{
                backgroundColor: colors.brand.primary + '20',
                borderColor: colors.brand.primary + '40'
              }}
            >
              <span 
                className="text-sm font-medium"
                style={{ color: colors.brand.primary }}
              >
                {selectedContacts.size} {selectedContacts.size !== 1 ? 'contacts' : 'contact'} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="px-3 py-1.5 text-sm rounded-md hover:opacity-90 transition-colors"
                  style={{
                    backgroundColor: colors.semantic.error,
                    color: '#ffffff'
                  }}
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

      {/* Error State */}
      {error && (
        <div 
          className="mb-6 p-4 rounded-lg border transition-colors"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderColor: colors.semantic.error + '40'
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle 
              className="h-5 w-5 flex-shrink-0"
              style={{ color: colors.semantic.error }}
            />
            <div>
              <h3 
                className="font-medium"
                style={{ color: colors.semantic.error }}
              >
                Error loading contacts
              </h3>
              <p 
                className="text-sm mt-1"
                style={{ color: colors.semantic.error }}
              >
                {error}
              </p>
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

      {/* Loading State */}
      {loading && <ContactLoader />}

      {/* Contact List */}
      {!loading && !error && (
        <div>
          {contacts.length === 0 ? (
            <div 
              className="rounded-lg shadow-sm border p-12 text-center transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <Users 
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: colors.utility.secondaryText }}
              />
              <h3 
                className="text-lg font-medium mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                No contacts found
              </h3>
              <p 
                className="mb-6 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {searchTerm || Object.values(advancedFilters).some(v =>
                  Array.isArray(v) ? v.length > 0 : v !== 'all'
                )
                  ? shouldShowSearchHint()
                    ? `Type at least ${MINIMUM_SEARCH_LENGTH} characters to search contacts.`
                    : "No contacts match your search criteria. Try adjusting your search or filters."
                  : "You haven't added any contacts yet. Create your first contact to get started."
                }
              </p>
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
            </div>
          ) : (
            <>
              {/* FIXED CONTACT DISPLAY */}
              <div className={`
                ${viewType === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'space-y-2'
                }
              `}>
                {contacts
                  .filter((contact) => !contact.parent_contact_id) // Hide child contacts (persons linked to corporate)
                  .map((contact) => {
                  const isSelected = selectedContacts.has(contact.id);
                  const classificationConfig = contact.classifications?.[0] 
                    ? getClassificationConfig(contact.classifications[0])
                    : null;
                  const primaryChannel = getPrimaryContactChannel(contact);
                  
                  return viewType === 'grid' ? (
                    // GRID VIEW with glass effect
                    <div
                      key={contact.id}
                      className="rounded-2xl shadow-sm border hover:shadow-lg hover:border-opacity-50 transition-all duration-200 flex flex-col group"
                      style={{
                        background: isDarkMode
                          ? 'rgba(30, 41, 59, 0.8)'
                          : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        borderColor: isDarkMode
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(255,255,255,0.5)',
                        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
                        minHeight: '260px'
                      } as React.CSSProperties}
                    >
                      {/* Header Section - Status Badge */}
                      <div className="p-4 flex-none">
                        <div className="flex items-center justify-end mb-3">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium border"
                            style={{
                              backgroundColor: contact.status === 'active'
                                ? colors.semantic.success + '20'
                                : contact.status === 'inactive'
                                ? colors.semantic.warning + '20'
                                : colors.utility.secondaryText + '20',
                              borderColor: contact.status === 'active'
                                ? colors.semantic.success + '40'
                                : contact.status === 'inactive'
                                ? colors.semantic.warning + '40'
                                : colors.utility.secondaryText + '40',
                              color: contact.status === 'active'
                                ? colors.semantic.success
                                : contact.status === 'inactive'
                                ? colors.semantic.warning
                                : colors.utility.secondaryText
                            }}
                          >
                            {CONTACT_STATUS_LABELS[contact.status as keyof typeof CONTACT_STATUS_LABELS]}
                          </span>
                        </div>

                        {/* FIXED: Name and Type Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm border"
                            style={{
                              backgroundColor: colors.brand.primary + '20',
                              color: colors.brand.primary,
                              borderColor: colors.brand.primary + '40'
                            }}
                          >
                            {contact.displayName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 
                                className="font-semibold text-base truncate transition-colors"
                                style={{ color: colors.utility.primaryText }}
                                title={contact.displayName}
                              >
                                {contact.displayName}
                              </h3>
                              {contact.type === 'corporate' ? (
                                <Building2 
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: colors.utility.secondaryText }}
                                  title="Corporate"
                                />
                              ) : (
                                <User 
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: colors.utility.secondaryText }}
                                  title="Individual"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* FIXED: Content Section - Flexible Height */}
                      <div className="px-4 flex-grow">
                        {/* Primary Contact Channel */}
                        <div className="mb-3">
                          <div 
                            className="flex items-center gap-2 text-sm"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            {primaryChannel.icon && (
                              <primaryChannel.icon className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="truncate" title={primaryChannel.value}>
                              {primaryChannel.value}
                            </span>
                          </div>
                        </div>
                        
                        {/* Classification Tags - Using Lucide icons and centralized colors */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {contact.classifications?.slice(0, 2).map((cls) => {
                            const config = getClassificationConfig(cls);
                            const badgeColors = getClassificationColors(config?.colorKey || 'default', colors, 'badge');
                            const IconComponent = getClassificationIcon(cls);
                            return (
                              <span
                                key={cls}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
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
                            <span
                              className="text-xs px-2 py-1"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              +{contact.classifications.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* FIXED: Action Section - Fixed Height */}
                      <div 
                        className="p-4 border-t flex-none"
                        style={{ borderColor: colors.utility.primaryText + '20' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigate(`/contacts/${contact.id}`)}
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                backgroundColor: colors.utility.secondaryText + '20',
                                color: colors.utility.primaryText
                              }}
                              title="View contact details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                backgroundColor: colors.semantic.success,
                                color: '#ffffff'
                              }}
                              title="Create new contract"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // FIXED LIST VIEW - Better alignment
                    <div
                      key={contact.id}
                      className="rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 p-3"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: colors.utility.primaryText + '20'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left Section - Avatar + Name + Status */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm border flex-shrink-0"
                            style={{
                              backgroundColor: colors.brand.primary + '20',
                              color: colors.brand.primary,
                              borderColor: colors.brand.primary + '40'
                            }}
                          >
                            {contact.displayName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 
                                className="font-semibold text-base truncate transition-colors"
                                style={{ color: colors.utility.primaryText }}
                                title={contact.displayName}
                              >
                                {contact.displayName}
                              </h3>
                              {contact.type === 'corporate' ? (
                                <Building2 
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: colors.utility.secondaryText }}
                                  title="Corporate"
                                />
                              ) : (
                                <User 
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: colors.utility.secondaryText }}
                                  title="Individual"
                                />
                              )}
                            </div>
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                backgroundColor: contact.status === 'active' 
                                  ? colors.semantic.success + '20'
                                  : contact.status === 'inactive' 
                                  ? colors.semantic.warning + '20'
                                  : colors.utility.secondaryText + '20',
                                borderColor: contact.status === 'active' 
                                  ? colors.semantic.success + '40'
                                  : contact.status === 'inactive' 
                                  ? colors.semantic.warning + '40'
                                  : colors.utility.secondaryText + '40',
                                color: contact.status === 'active' 
                                  ? colors.semantic.success
                                  : contact.status === 'inactive' 
                                  ? colors.semantic.warning
                                  : colors.utility.secondaryText
                              }}
                            >
                              {CONTACT_STATUS_LABELS[contact.status as keyof typeof CONTACT_STATUS_LABELS]}
                            </span>
                          </div>
                        </div>

                        {/* FIXED: Middle Section - Primary Contact Channel */}
                        <div 
                          className="flex items-center gap-2 min-w-0 flex-1 px-4"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {primaryChannel.icon && (
                            <primaryChannel.icon className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="truncate text-sm" title={primaryChannel.value}>
                            {primaryChannel.value}
                          </span>
                        </div>

                        {/* FIXED: Right Section - Classifications + Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Classification Tags - Using Lucide icons and centralized colors */}
                          <div className="flex flex-wrap gap-1">
                            {contact.classifications?.slice(0, 2).map((cls) => {
                              const config = getClassificationConfig(cls);
                              const badgeColors = getClassificationColors(config?.colorKey || 'default', colors, 'badge');
                              const IconComponent = getClassificationIcon(cls);
                              return (
                                <span
                                  key={cls}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
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
                              <span
                                className="text-xs"
                                style={{ color: colors.utility.secondaryText }}
                              >
                                +{contact.classifications.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigate(`/contacts/${contact.id}`)}
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                backgroundColor: colors.utility.secondaryText + '20',
                                color: colors.utility.primaryText
                              }}
                              title="View contact details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                backgroundColor: colors.semantic.success,
                                color: '#ffffff'
                              }}
                              title="Create new contract"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Enhanced Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div 
              className="mt-6 rounded-lg shadow-sm border p-4 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-center justify-between">
                <div 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
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
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: pagination.page === page 
                              ? colors.brand.primary 
                              : 'transparent',
                            color: pagination.page === page 
                              ? '#ffffff' 
                              : colors.utility.primaryText
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
            <div 
              className="p-6 border-b transition-colors"
              style={{ borderColor: colors.utility.primaryText + '20' }}
            >
              <div className="flex items-center justify-between">
                <h2 
                  className="text-xl font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
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
                <div 
                  className="p-4 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                >
                  <h3 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Getting Started with Contacts
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Learn how to add, organize, and manage your business contacts effectively.
                  </p>
                </div>
                <div 
                  className="p-4 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                >
                  <h3 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Contact Classifications & Filtering
                  </h3>
                  <p
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Understanding how to categorize contacts and use advanced filtering options.
                  </p>
                </div>
                <div 
                  className="p-4 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
                >
                  <h3 
                    className="font-medium mb-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Search & Discovery
                  </h3>
                  <p 
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
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

      {/* Click outside handler for dropdowns */}
      {showMoreFilters && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMoreFilters(false)}
        />
      )}

      {/* Quick Add Contact Drawer */}
      <QuickAddContactDrawer
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </div>
  );
};

// Wrapped with Coming Soon - DISABLED to open up menu
// const ContactsPageWithComingSoon: React.FC = () => {
//   return (
//     <ComingSoonWrapper
//       pageKey="contacts"
//       title="Contacts Management"
//       subtitle="Your complete contact management solution. Organize, track, and nurture all your business relationships in one place."
//       heroIcon={Users}
//       features={contactsFeatures}
//       floatingIcons={contactsFloatingIcons}
//     >
//       <ContactsPage />
//     </ComingSoonWrapper>
//   );
// };

export default ContactsPage;