// src/pages/admin/subscription-management/index.tsx
// Admin Subscription Management Dashboard with Glassmorphism

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle,
  Timer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Store,
  ArrowLeftRight,
  RefreshCw,
  LayoutGrid,
  List,
  Loader2,
  Building2
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';

// Types
import {
  TenantListItem,
  AdminSubscriptionStats,
  AdminTenantFilters,
  QuickFilterType,
  TenantDataSummary
} from '../../../types/tenantManagement';

// Components
import { StatCard } from '../../../components/subscription/cards/StatCard';
import { TenantCard } from '../../../components/subscription/cards/TenantCard';
import { TenantFilters } from '../../../components/subscription/filters/TenantFilters';
import { TenantDetailDrawer } from '../../../components/subscription/modals/TenantDetailDrawer';
import { DeleteConfirmationFlow } from '../../../components/subscription/modals/DeleteConfirmationFlow';

// Mock data for development - replace with actual API calls
const mockStats: AdminSubscriptionStats = {
  total_tenants: 156,
  active_tenants: 120,
  trial_tenants: 25,
  expiring_soon: 8,
  churned_this_month: 3,
  new_this_month: 12,
  by_status: { active: 120, inactive: 15, suspended: 8, closed: 13 },
  by_subscription: { active: 98, trial: 25, grace_period: 5, suspended: 8, cancelled: 10, expired: 10 },
  by_tenant_type: { buyers: 89, sellers: 45, mixed: 22, unknown: 0 },
  by_industry: [
    { industry_id: '1', industry_name: 'IT & Software', count: 45 },
    { industry_id: '2', industry_name: 'Consulting', count: 32 },
    { industry_id: '3', industry_name: 'Manufacturing', count: 28 },
    { industry_id: '4', industry_name: 'Healthcare', count: 20 }
  ]
};

const mockTenants: TenantListItem[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    workspace_code: 'ACME-001',
    status: 'active',
    is_admin: false,
    created_at: '2024-01-15T10:00:00Z',
    subscription: {
      status: 'active',
      product_code: 'contractnest',
      billing_cycle: 'monthly',
      next_billing_date: '2025-02-15'
    },
    profile: {
      business_name: 'Acme Corporation',
      business_email: 'contact@acme.com',
      industry_name: 'IT & Software',
      city: 'Hyderabad'
    },
    stats: {
      total_users: 5,
      total_contacts: 156,
      total_contracts: 25,
      buyer_contacts: 89,
      seller_contacts: 45,
      storage_used_mb: 32,
      storage_limit_mb: 100,
      tenant_type: 'buyer'
    }
  },
  {
    id: '2',
    name: 'TechStart Solutions',
    workspace_code: 'TECH-002',
    status: 'active',
    is_admin: false,
    created_at: '2024-06-20T10:00:00Z',
    subscription: {
      status: 'trial',
      product_code: 'contractnest',
      billing_cycle: 'monthly',
      trial_end_date: '2025-01-25T00:00:00Z',
      days_until_expiry: 5
    },
    profile: {
      business_name: 'TechStart Solutions',
      business_email: 'hello@techstart.com',
      industry_name: 'Consulting',
      city: 'Bangalore'
    },
    stats: {
      total_users: 2,
      total_contacts: 23,
      total_contracts: 3,
      buyer_contacts: 8,
      seller_contacts: 12,
      storage_used_mb: 5,
      storage_limit_mb: 40,
      tenant_type: 'seller'
    }
  },
  {
    id: '3',
    name: 'Global Traders Ltd',
    workspace_code: 'GLB-003',
    status: 'suspended',
    is_admin: false,
    created_at: '2023-11-10T10:00:00Z',
    subscription: {
      status: 'suspended',
      product_code: 'contractnest',
      billing_cycle: 'quarterly'
    },
    profile: {
      business_name: 'Global Traders Ltd',
      business_email: 'info@globaltraders.com',
      industry_name: 'Manufacturing',
      city: 'Mumbai'
    },
    stats: {
      total_users: 8,
      total_contacts: 245,
      total_contracts: 67,
      buyer_contacts: 120,
      seller_contacts: 100,
      storage_used_mb: 78,
      storage_limit_mb: 200,
      tenant_type: 'mixed'
    }
  }
];

const mockDataSummary: TenantDataSummary = {
  tenant_id: '1',
  tenant_name: 'Acme Corporation',
  workspace_code: 'ACME-001',
  categories: [
    {
      id: 'contacts',
      label: 'Contacts & Relationships',
      icon: 'Users',
      color: '#3B82F6',
      description: 'Business contacts, addresses, and communication channels',
      totalCount: 479,
      items: [
        { label: 'Contacts', count: 156, table: 't_contacts' },
        { label: 'Addresses', count: 89, table: 't_contact_addresses' },
        { label: 'Channels', count: 234, table: 't_contact_channels' }
      ]
    },
    {
      id: 'users',
      label: 'Users & Team',
      icon: 'UserPlus',
      color: '#8B5CF6',
      description: 'Team members, roles, and pending invitations',
      totalCount: 8,
      items: [
        { label: 'Team Members', count: 5, table: 't_user_tenants' },
        { label: 'Invitations', count: 3, table: 't_user_invitations' }
      ]
    },
    {
      id: 'contracts',
      label: 'Contracts & Documents',
      icon: 'FileText',
      color: '#10B981',
      description: 'Service contracts, templates, and uploaded files',
      totalCount: 47,
      items: [
        { label: 'Contracts', count: 25, table: 't_service_contracts' },
        { label: 'Files', count: 22, table: 't_tenant_files' }
      ]
    },
    {
      id: 'catalog',
      label: 'Catalog & Services',
      icon: 'Package',
      color: '#F59E0B',
      description: 'Products, services, categories, and pricing',
      totalCount: 89,
      items: [
        { label: 'Catalog Items', count: 45, table: 't_catalog_items' },
        { label: 'Resources', count: 32, table: 't_catalog_resources' },
        { label: 'Categories', count: 12, table: 't_catalog_categories' }
      ]
    },
    {
      id: 'settings',
      label: 'Settings & Configuration',
      icon: 'Settings',
      color: '#6366F1',
      description: 'Business settings and preferences',
      totalCount: 12,
      items: [
        { label: 'Business Profile', count: 1, table: 't_tenant_profiles' },
        { label: 'Tax Settings', count: 3, table: 't_tax_settings' },
        { label: 'Tax Rates', count: 8, table: 't_tax_rates' }
      ]
    },
    {
      id: 'subscription',
      label: 'Subscription & Billing',
      icon: 'CreditCard',
      color: '#EC4899',
      description: 'Subscription plan and billing records',
      totalCount: 15,
      items: [
        { label: 'Subscription', count: 1, table: 't_bm_tenant_subscription' },
        { label: 'Usage Records', count: 14, table: 't_bm_subscription_usage' }
      ]
    }
  ],
  totalRecords: 650,
  canDelete: true,
  blockingReasons: []
};

const SubscriptionManagementPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { userSession } = useAuth();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminSubscriptionStats | null>(null);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [totalTenants, setTotalTenants] = useState(0);

  const [filters, setFilters] = useState<AdminTenantFilters>({
    page: 1,
    limit: 20
  });
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drawer state
  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dataSummary, setDataSummary] = useState<TenantDataSummary | null>(null);
  const [isLoadingDataSummary, setIsLoadingDataSummary] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantListItem | null>(null);

  // Check admin access
  const isAdmin = userSession?.user?.user_metadata?.isAdmin || false;

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const statsResponse = await api.get(API_ENDPOINTS.ADMIN.SUBSCRIPTION_MANAGEMENT.STATS);
      // const tenantsResponse = await api.get(API_ENDPOINTS.ADMIN.SUBSCRIPTION_MANAGEMENT.TENANTS_WITH_FILTERS(filters));

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats(mockStats);
      setTenants(mockTenants);
      setTotalTenants(mockStats.total_tenants);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle quick filter change
  const handleQuickFilterChange = (filter: QuickFilterType) => {
    setQuickFilter(filter);

    // Map quick filter to actual filters
    const filterMap: Record<QuickFilterType, Partial<AdminTenantFilters>> = {
      all: {},
      active: { subscription_status: 'active' },
      trial: { subscription_status: 'trial' },
      expiring: { subscription_status: 'trial' }, // Would need additional logic for expiring
      suspended: { status: 'suspended' }
    };

    setFilters(prev => ({
      ...prev,
      ...filterMap[filter],
      page: 1
    }));
  };

  // Handle tenant card click
  const handleViewDetails = async (tenant: TenantListItem) => {
    setSelectedTenant(tenant);
    setIsDrawerOpen(true);
    setIsLoadingDataSummary(true);

    try {
      // TODO: Replace with actual API call
      // const response = await api.get(API_ENDPOINTS.ADMIN.SUBSCRIPTION_MANAGEMENT.DATA_SUMMARY(tenant.id));

      await new Promise(resolve => setTimeout(resolve, 500));
      setDataSummary(mockDataSummary);
    } catch (error) {
      console.error('Failed to load data summary:', error);
    } finally {
      setIsLoadingDataSummary(false);
    }
  };

  // Handle status change
  const handleChangeStatus = (tenant: TenantListItem) => {
    // TODO: Implement status change modal
    console.log('Change status for:', tenant.id);
  };

  // Handle delete data
  const handleDeleteData = (tenant: TenantListItem) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
    setIsDrawerOpen(false);
  };

  // Confirm delete
  const handleConfirmDelete = async (tenantId: string, reason: string) => {
    // TODO: Replace with actual API call
    // await api.delete(API_ENDPOINTS.ADMIN.SUBSCRIPTION_MANAGEMENT.DELETE_DATA(tenantId), { data: { confirmed: true, reason } });

    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Deleted tenant data:', tenantId, reason);

    // Refresh data
    loadData();
  };

  // Access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="max-w-md text-center p-8 rounded-2xl"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          <AlertTriangle size={48} style={{ color: '#F59E0B' }} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
            Access Denied
          </h2>
          <p style={{ color: colors.utility.secondaryText }}>
            You don't have permission to access this page. Only administrators can manage subscriptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: colors.utility.primaryText }}
          >
            Subscription Management
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: colors.utility.secondaryText }}
          >
            Manage all tenant subscriptions and accounts
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2.5 rounded-xl transition-all hover:scale-105"
          style={{
            background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw
            size={20}
            className={isLoading ? 'animate-spin' : ''}
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
      </div>

      {/* Platform Pulse - Stats */}
      {stats && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: isDarkMode
              ? 'rgba(30, 41, 59, 0.6)'
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            Platform Pulse
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard
              label="Total"
              value={stats.total_tenants}
              icon={Users}
              iconColor="#6366F1"
              onClick={() => handleQuickFilterChange('all')}
              isActive={quickFilter === 'all'}
              size="sm"
            />
            <StatCard
              label="Active"
              value={stats.active_tenants}
              icon={CheckCircle}
              iconColor="#10B981"
              onClick={() => handleQuickFilterChange('active')}
              isActive={quickFilter === 'active'}
              size="sm"
            />
            <StatCard
              label="Trial"
              value={stats.trial_tenants}
              icon={Timer}
              iconColor="#F59E0B"
              onClick={() => handleQuickFilterChange('trial')}
              isActive={quickFilter === 'trial'}
              size="sm"
            />
            <StatCard
              label="Expiring"
              value={stats.expiring_soon}
              icon={AlertTriangle}
              iconColor="#EF4444"
              onClick={() => handleQuickFilterChange('expiring')}
              isActive={quickFilter === 'expiring'}
              size="sm"
            />
            <StatCard
              label="Buyers"
              value={stats.by_tenant_type.buyers}
              icon={ShoppingCart}
              iconColor="#3B82F6"
              size="sm"
            />
            <StatCard
              label="Sellers"
              value={stats.by_tenant_type.sellers}
              icon={Store}
              iconColor="#A855F7"
              size="sm"
            />
            <StatCard
              label="Mixed"
              value={stats.by_tenant_type.mixed}
              icon={ArrowLeftRight}
              iconColor="#14B8A6"
              size="sm"
            />
          </div>

          {/* Trend indicators */}
          <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}` }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: '#10B981' }} />
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                <span className="font-medium" style={{ color: '#10B981' }}>+{stats.new_this_month}</span> new this month
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} style={{ color: '#EF4444' }} />
              <span className="text-sm" style={{ color: colors.utility.secondaryText }}>
                <span className="font-medium" style={{ color: '#EF4444' }}>-{stats.churned_this_month}</span> churned
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <TenantFilters
        filters={filters}
        onFiltersChange={setFilters}
        quickFilter={quickFilter}
        onQuickFilterChange={handleQuickFilterChange}
        industries={stats?.by_industry.map(i => ({ id: i.industry_id, name: i.industry_name })) || []}
        totalResults={totalTenants}
      />

      {/* View Toggle & Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
          Showing <span className="font-medium" style={{ color: colors.utility.primaryText }}>{tenants.length}</span> of{' '}
          <span className="font-medium" style={{ color: colors.utility.primaryText }}>{totalTenants}</span> tenants
        </p>
        <div
          className="flex items-center rounded-lg p-1"
          style={{
            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-opacity-100' : 'bg-opacity-0 hover:bg-opacity-50'}`}
            style={{
              background: viewMode === 'grid' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent'
            }}
          >
            <LayoutGrid size={18} style={{ color: viewMode === 'grid' ? colors.brand.primary : colors.utility.secondaryText }} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors`}
            style={{
              background: viewMode === 'list' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent'
            }}
          >
            <List size={18} style={{ color: viewMode === 'list' ? colors.brand.primary : colors.utility.secondaryText }} />
          </button>
        </div>
      </div>

      {/* Tenant Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
            <p style={{ color: colors.utility.secondaryText }}>Loading tenants...</p>
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            border: `1px dashed ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`
          }}
        >
          <Building2 size={48} className="mx-auto mb-4" style={{ color: colors.utility.secondaryText }} />
          <p className="text-lg font-medium mb-1" style={{ color: colors.utility.primaryText }}>
            No tenants found
          </p>
          <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
            Try adjusting your filters or search criteria
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Tenant Detail Drawer */}
      <TenantDetailDrawer
        tenant={selectedTenant}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTenant(null);
        }}
        onChangeStatus={handleChangeStatus}
        onDeleteData={handleDeleteData}
        dataSummary={dataSummary}
        isLoadingDataSummary={isLoadingDataSummary}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationFlow
        tenant={tenantToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTenantToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        dataSummary={mockDataSummary}
        isLoadingDataSummary={false}
        mode="admin"
      />
    </div>
  );
};

export default SubscriptionManagementPage;
