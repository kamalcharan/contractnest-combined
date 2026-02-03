// src/components/subscription/modals/TenantDetailDrawer.tsx
// Glassmorphism side drawer for tenant details

import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  Mail,
  MapPin,
  Globe,
  Calendar,
  CreditCard,
  Users,
  FileText,
  Database,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FlaskConical,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { TenantListItem, TenantDataSummary, TenantDataCategory } from '../../../types/tenantManagement';
import { SubscriptionStatusBadge } from '../badges/SubscriptionStatusBadge';
import { TenantStatusBadge } from '../badges/TenantStatusBadge';
import { TenantTypeBadge } from '../badges/TenantTypeBadge';
import { DataCategoryCard } from '../data-viz/DataCategoryCard';
import { DataProgressBar } from '../data-viz/DataProgressBar';
import { useTheme } from '../../../contexts/ThemeContext';

interface TenantDetailDrawerProps {
  tenant: TenantListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onResetTestData: (tenant: TenantListItem) => void;
  onResetAllData: (tenant: TenantListItem) => void;
  onCloseAccount: (tenant: TenantListItem) => void;
  dataSummary?: TenantDataSummary | null;
  isLoadingDataSummary?: boolean;
}

export const TenantDetailDrawer: React.FC<TenantDetailDrawerProps> = ({
  tenant,
  isOpen,
  onClose,
  onResetTestData,
  onResetAllData,
  onCloseAccount,
  dataSummary,
  isLoadingDataSummary = false
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!tenant) return null;

  const { subscription, profile, stats } = tenant;

  // Create progress bar segments for subscription data
  const categorySegments = dataSummary?.categories.map(cat => ({
    label: cat.label.split(' ')[0], // First word only
    value: cat.totalCount,
    color: cat.color
  })) || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full z-50 overflow-y-auto
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          width: 'min(520px, 90vw)',
          background: isDarkMode
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{
            background: isDarkMode
              ? 'rgba(15, 23, 42, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.utility.primaryText }}
          >
            Tenant Details
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors hover:bg-opacity-80"
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          >
            <X size={20} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tenant Header Card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: isDarkMode
                ? `linear-gradient(135deg, ${colors.brand.primary}20 0%, ${colors.brand.secondary}15 100%)`
                : `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}08 100%)`,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                }}
              >
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={tenant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={28} style={{ color: colors.brand.primary }} />
                )}
              </div>

              <div className="flex-1">
                <h3
                  className="text-xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {profile?.business_name || tenant.name}
                </h3>
                <p
                  className="text-sm opacity-70 mb-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {tenant.workspace_code}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <TenantStatusBadge status={tenant.status} size="sm" />
                  <TenantTypeBadge type={stats.tenant_type} size="sm" />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {profile?.business_email && (
                <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  <Mail size={14} />
                  <span className="truncate">{profile.business_email}</span>
                </div>
              )}
              {profile?.city && (
                <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  <MapPin size={14} />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile?.industry_name && (
                <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                  <Globe size={14} />
                  <span>{profile.industry_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.utility.secondaryText }}>
                <Calendar size={14} />
                <span>Joined {new Date(tenant.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          {subscription && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={18} style={{ color: colors.brand.primary }} />
                <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                  Subscription
                </h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Status</span>
                  <SubscriptionStatusBadge status={subscription.status} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Product</span>
                  <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                    {subscription.product_code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.utility.secondaryText }}>Billing Cycle</span>
                  <span className="font-medium capitalize" style={{ color: colors.utility.primaryText }}>
                    {subscription.billing_cycle}
                  </span>
                </div>
                {subscription.next_billing_date && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: colors.utility.secondaryText }}>Next Billing</span>
                    <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                      {new Date(subscription.next_billing_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage Stats Card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} style={{ color: colors.brand.primary }} />
              <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                Usage Stats
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                <Users size={20} className="mx-auto mb-1" style={{ color: '#8B5CF6' }} />
                <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{stats.total_users}</p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Users</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                <Building2 size={20} className="mx-auto mb-1" style={{ color: '#3B82F6' }} />
                <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{stats.total_contacts}</p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Contacts</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                <FileText size={20} className="mx-auto mb-1" style={{ color: '#10B981' }} />
                <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>{stats.total_contracts}</p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Contracts</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                <Database size={20} className="mx-auto mb-1" style={{ color: '#F59E0B' }} />
                <p className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                  {stats.storage_used_mb}<span className="text-sm font-normal">MB</span>
                </p>
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Storage</p>
              </div>
            </div>

            {/* Contact Mix */}
            <div className="mt-4">
              <DataProgressBar
                segments={[
                  { label: 'Buyers', value: stats.buyer_contacts, color: '#3B82F6' },
                  { label: 'Sellers', value: stats.seller_contacts, color: '#A855F7' }
                ]}
                height={6}
              />
            </div>
          </div>

          {/* Data Summary Card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database size={18} style={{ color: colors.brand.primary }} />
                <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                  Data Summary
                </h4>
              </div>
              {dataSummary && (
                <span
                  className="text-sm font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                    color: '#6366F1'
                  }}
                >
                  {dataSummary.totalRecords.toLocaleString()} records
                </span>
              )}
            </div>

            {isLoadingDataSummary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin" style={{ color: colors.brand.primary }} />
              </div>
            ) : dataSummary ? (
              <div className="space-y-3">
                {dataSummary.categories.map((category, index) => (
                  <DataCategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    totalCategories={dataSummary.categories.length}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: colors.utility.secondaryText }}>
                Loading data summary...
              </p>
            )}
          </div>

          {/* Admin Actions */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} style={{ color: '#EF4444' }} />
              <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                Admin Actions
              </h4>
            </div>

            <p
              className="text-sm mb-4"
              style={{ color: colors.utility.secondaryText }}
            >
              These actions affect the tenant's account and data. Use with caution.
            </p>

            <div className="space-y-3">
              {/* Reset Test Data */}
              <button
                onClick={() => onResetTestData(tenant)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                  color: '#F59E0B',
                  border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`
                }}
              >
                <FlaskConical size={18} />
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">Reset Test Data</div>
                  <div className="text-xs opacity-70" style={{ color: colors.utility.secondaryText }}>
                    Delete records where is_live = false
                  </div>
                </div>
              </button>

              {/* Reset All Data */}
              <button
                onClick={() => onResetAllData(tenant)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                <RotateCcw size={18} />
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">Reset All Data</div>
                  <div className="text-xs opacity-70" style={{ color: colors.utility.secondaryText }}>
                    Delete all tenant data, keep account open
                  </div>
                </div>
              </button>

              {/* Close Account */}
              <button
                onClick={() => onCloseAccount(tenant)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: isDarkMode ? 'rgba(127, 29, 29, 0.3)' : 'rgba(127, 29, 29, 0.1)',
                  color: '#DC2626',
                  border: `1px solid ${isDarkMode ? 'rgba(220, 38, 38, 0.4)' : 'rgba(220, 38, 38, 0.25)'}`
                }}
              >
                <XCircle size={18} />
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">Close Account</div>
                  <div className="text-xs opacity-70" style={{ color: colors.utility.secondaryText }}>
                    Delete all data + close tenant permanently
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TenantDetailDrawer;
