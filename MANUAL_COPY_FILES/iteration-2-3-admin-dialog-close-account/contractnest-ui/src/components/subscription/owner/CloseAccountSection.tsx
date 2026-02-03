// src/components/subscription/owner/CloseAccountSection.tsx
// Tenant Owner - Close Account Section for Business Profile
// Glassmorphism styling with empathetic UX

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Heart,
  MessageSquare,
  ChevronRight,
  Loader2,
  Database,
  Users,
  FileText,
  FolderOpen,
  Shield
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/serviceURLs';
import { TenantDataSummary, TenantListItem } from '../../../types/tenantManagement';
import { DeleteConfirmationFlow } from '../modals/DeleteConfirmationFlow';
import { AnimatedCounter } from '../data-viz/AnimatedCounter';

interface CloseAccountSectionProps {
  onAccountClosed?: () => void;
}

export const CloseAccountSection: React.FC<CloseAccountSectionProps> = ({
  onAccountClosed
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataSummary, setDataSummary] = useState<TenantDataSummary | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Create a pseudo tenant object for the delete flow
  const currentTenantAsListItem: TenantListItem | null = currentTenant ? {
    id: currentTenant.id,
    name: currentTenant.name || 'Your Organization',
    workspace_code: currentTenant.workspace_code || 'YOUR-ORG',
    status: 'active',
    is_admin: currentTenant.is_admin || false,
    created_at: currentTenant.created_at || new Date().toISOString(),
    subscription: {
      status: 'active',
      product_code: 'contractnest',
      billing_cycle: 'monthly'
    },
    profile: {
      business_name: currentTenant.name || 'Your Organization'
    },
    stats: {
      total_users: dataSummary?.categories.find(c => c.id === 'users')?.totalCount || 0,
      total_contacts: dataSummary?.categories.find(c => c.id === 'contacts')?.totalCount || 0,
      total_contracts: dataSummary?.categories.find(c => c.id === 'contracts')?.totalCount || 0,
      buyer_contacts: 0,
      seller_contacts: 0,
      storage_used_mb: 0,
      storage_limit_mb: 100,
      tenant_type: 'mixed'
    }
  } : null;

  // Load data summary when preview is shown
  useEffect(() => {
    if (showPreview && !dataSummary) {
      loadDataSummary();
    }
  }, [showPreview]);

  const loadDataSummary = async () => {
    setIsLoadingData(true);
    try {
      const response = await api.get(API_ENDPOINTS.TENANT_ACCOUNT.DATA_SUMMARY);
      const summaryData = response.data?.success ? response.data.data : response.data;
      setDataSummary(summaryData);
    } catch (error) {
      console.error('Failed to load data summary:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleConfirmDelete = async (tenantId: string, reason: string) => {
    try {
      await api.post(API_ENDPOINTS.TENANT_ACCOUNT.CLOSE_ACCOUNT, { reason });
    } catch (error) {
      console.error('Failed to close account:', error);
      throw error;
    }

    if (onAccountClosed) {
      onAccountClosed();
    }
  };

  const totalRecords = dataSummary?.totalRecords || 0;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isDarkMode
            ? 'rgba(239, 68, 68, 0.05)'
            : 'rgba(239, 68, 68, 0.03)',
          border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{
            background: isDarkMode
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(239, 68, 68, 0.05)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'}`
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
            >
              <AlertTriangle size={24} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h3
                className="text-lg font-semibold"
                style={{ color: '#EF4444' }}
              >
                Close Account & Delete Data
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                Permanently delete all your organization's data and close this account
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Empathetic Message */}
          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: isDarkMode
                ? 'rgba(251, 191, 36, 0.1)'
                : 'rgba(251, 191, 36, 0.08)',
              border: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)'}`
            }}
          >
            <Heart size={20} style={{ color: '#F59E0B' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: isDarkMode ? '#FCD34D' : '#D97706' }}
              >
                We're sorry to see you go
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: colors.utility.secondaryText }}
              >
                Before you leave, we'd love to understand how we can improve. Your feedback helps us serve our customers better.
              </p>
            </div>
          </div>

          {/* Data Preview Toggle */}
          {!showPreview ? (
            <button
              onClick={() => setShowPreview(true)}
              className="w-full p-4 rounded-xl flex items-center justify-between transition-all hover:scale-[1.01]"
              style={{
                background: isDarkMode
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.03)',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <div className="flex items-center gap-3">
                <Database size={20} style={{ color: colors.utility.secondaryText }} />
                <span style={{ color: colors.utility.primaryText }}>
                  Preview data that will be deleted
                </span>
              </div>
              <ChevronRight size={20} style={{ color: colors.utility.secondaryText }} />
            </button>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: isDarkMode
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  background: isDarkMode
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: colors.utility.primaryText }}
                >
                  Your Data Summary
                </span>
                {!isLoadingData && dataSummary && (
                  <span
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <AnimatedCounter value={totalRecords} /> total records
                  </span>
                )}
              </div>

              <div className="p-4">
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2
                      size={24}
                      className="animate-spin"
                      style={{ color: colors.brand.primary }}
                    />
                    <span
                      className="ml-2 text-sm"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Loading your data...
                    </span>
                  </div>
                ) : dataSummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dataSummary.categories.map((category) => {
                      const IconComponent = {
                        Users,
                        FileText,
                        FolderOpen,
                        Database,
                        Shield
                      }[category.icon] || Database;

                      return (
                        <div
                          key={category.id}
                          className="p-3 rounded-lg flex items-center gap-3"
                          style={{
                            background: isDarkMode
                              ? 'rgba(255, 255, 255, 0.03)'
                              : 'rgba(0, 0, 0, 0.02)'
                          }}
                        >
                          <IconComponent
                            size={18}
                            style={{ color: colors.utility.secondaryText }}
                          />
                          <div>
                            <div
                              className="text-lg font-semibold"
                              style={{ color: colors.utility.primaryText }}
                            >
                              <AnimatedCounter value={category.totalCount} />
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              {category.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: isDarkMode
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`
            }}
          >
            <div className="flex items-start gap-3">
              <Shield size={20} style={{ color: '#EF4444' }} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p
                  className="text-sm font-medium"
                  style={{ color: '#EF4444' }}
                >
                  This action cannot be undone
                </p>
                <ul
                  className="text-sm space-y-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <li>• All contacts, contracts, and files will be permanently deleted</li>
                  <li>• All team members will lose access immediately</li>
                  <li>• Your subscription will be cancelled</li>
                  <li>• Account history will be removed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] flex items-center gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white'
              }}
            >
              <Trash2 size={18} />
              Close Account & Delete All Data
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationFlow
        tenant={currentTenantAsListItem}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirmDelete={handleConfirmDelete}
        dataSummary={dataSummary}
        isLoadingDataSummary={isLoadingData}
        mode="owner"
      />
    </>
  );
};

export default CloseAccountSection;
