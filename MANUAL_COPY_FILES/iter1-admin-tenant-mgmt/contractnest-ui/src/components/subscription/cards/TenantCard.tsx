// src/components/subscription/cards/TenantCard.tsx
// Glassmorphism tenant card with layered information

import React from 'react';
import {
  Building2,
  Mail,
  MapPin,
  Users,
  FileText,
  Database,
  ChevronRight,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { TenantListItem } from '../../../types/tenantManagement';
import { SubscriptionStatusBadge } from '../badges/SubscriptionStatusBadge';
import { TenantTypeBadge } from '../badges/TenantTypeBadge';
import { useTheme } from '../../../contexts/ThemeContext';

interface TenantCardProps {
  tenant: TenantListItem;
  onViewDetails: (tenant: TenantListItem) => void;
  onAction?: (tenant: TenantListItem, action: string) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onViewDetails,
  onAction
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { subscription, profile, stats } = tenant;

  // Calculate buyer/seller percentage
  const totalClassified = stats.buyer_contacts + stats.seller_contacts;
  const buyerPercent = totalClassified > 0
    ? Math.round((stats.buyer_contacts / totalClassified) * 100)
    : 0;
  const sellerPercent = totalClassified > 0
    ? Math.round((stats.seller_contacts / totalClassified) * 100)
    : 0;

  // Calculate days until trial expires
  const daysUntilExpiry = subscription?.trial_end_date
    ? Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : undefined;

  return (
    <div
      className="rounded-2xl border hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
      style={{
        background: isDarkMode
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: isDarkMode
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(255,255,255,0.5)',
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)',
        minHeight: '320px'
      }}
      onClick={() => onViewDetails(tenant)}
    >
      {/* Header Section */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-4">
          {/* Logo/Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: isDarkMode
                ? `linear-gradient(135deg, ${colors.brand.primary}30 0%, ${colors.brand.secondary}20 100%)`
                : `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`,
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
              <Building2 size={24} style={{ color: colors.brand.primary }} />
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-semibold truncate"
              style={{ color: colors.utility.primaryText }}
            >
              {profile?.business_name || tenant.name}
            </h3>
            <p
              className="text-sm opacity-70 truncate"
              style={{ color: colors.utility.secondaryText }}
            >
              {tenant.workspace_code}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {profile?.business_email && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Mail size={12} />
                  <span className="truncate max-w-[150px]">{profile.business_email}</span>
                </span>
              )}
              {profile?.city && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <MapPin size={12} />
                  {profile.city}
                </span>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          {onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(tenant, 'menu');
              }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <MoreVertical size={16} style={{ color: colors.utility.secondaryText }} />
            </button>
          )}
        </div>
      </div>

      {/* Status Badges Section */}
      <div
        className="px-5 py-3 flex flex-wrap gap-2"
        style={{
          background: isDarkMode
            ? 'rgba(0,0,0,0.2)'
            : 'rgba(0,0,0,0.02)',
          borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`
        }}
      >
        {/* Test / Live Account Badge */}
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{
            background: tenant.is_test
              ? (isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.15)')
              : (isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)'),
            color: tenant.is_test ? '#F59E0B' : '#10B981',
            border: `1px solid ${tenant.is_test ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
          }}
        >
          {tenant.is_test ? 'Test Account' : 'Live Account'}
        </span>
        {subscription && (
          <SubscriptionStatusBadge
            status={subscription.status}
            size="sm"
            daysUntilExpiry={daysUntilExpiry}
          />
        )}
        <TenantTypeBadge
          type={stats.tenant_type}
          size="sm"
          buyerPercent={buyerPercent}
        />
        {profile?.industry_name && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
              color: '#6366F1'
            }}
          >
            {profile.industry_name}
          </span>
        )}
      </div>

      {/* Stats Section */}
      <div className="px-5 py-4 flex-1">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
              style={{
                background: isDarkMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)'
              }}
            >
              <Users size={18} style={{ color: '#8B5CF6' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {stats.total_users}
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>users</p>
          </div>

          <div className="text-center">
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
              style={{
                background: isDarkMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)'
              }}
            >
              <Building2 size={18} style={{ color: '#3B82F6' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {stats.total_contacts}
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>contacts</p>
          </div>

          <div className="text-center">
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
              style={{
                background: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)'
              }}
            >
              <FileText size={18} style={{ color: '#10B981' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {stats.total_contracts}
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>contracts</p>
          </div>

          <div className="text-center">
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
              style={{
                background: isDarkMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)'
              }}
            >
              <Database size={18} style={{ color: '#F59E0B' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: colors.utility.primaryText }}>
              {stats.storage_used_mb}
            </p>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>MB used</p>
          </div>
        </div>

        {/* Contact Mix Progress Bar */}
        {totalClassified > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                Contact Mix
              </span>
              <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                {buyerPercent}% buyers • {sellerPercent}% sellers
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden flex"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${buyerPercent}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${sellerPercent}%`,
                  background: 'linear-gradient(90deg, #A855F7, #C084FC)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`
        }}
      >
        {subscription?.next_billing_date && (
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            <Calendar size={12} />
            Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
          </span>
        )}
        <button
          className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
          style={{ color: colors.brand.primary }}
        >
          View Details
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default TenantCard;
