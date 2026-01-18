// src/pages/settings/business-profile/close-account/index.tsx
// Standalone Close Account Page for Tenant Owners
// Full-page experience with feedback collection

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  AlertTriangle,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  Users,
  FileText,
  FolderOpen,
  Database,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import { TenantDataSummary, TenantListItem } from '../../../../types/tenantManagement';
import { DeleteConfirmationFlow } from '../../../../components/subscription/modals/DeleteConfirmationFlow';
import { AnimatedCounter } from '../../../../components/subscription/data-viz/AnimatedCounter';

// Feedback reasons
const feedbackReasons = [
  { id: 'too_expensive', label: 'Too expensive', icon: '💰' },
  { id: 'missing_features', label: 'Missing features I need', icon: '🔧' },
  { id: 'too_complex', label: 'Too complex to use', icon: '😵' },
  { id: 'switching', label: 'Switching to another solution', icon: '🔄' },
  { id: 'business_closed', label: 'Business is closing', icon: '🏢' },
  { id: 'not_using', label: 'Not using it enough', icon: '📉' },
  { id: 'other', label: 'Other reason', icon: '💭' }
];

// Mock data summary
const mockDataSummary: TenantDataSummary = {
  tenant_id: 'current',
  tenant_name: 'Your Organization',
  categories: [
    { category: 'contacts', label: 'Contacts', count: 156, icon: 'Users', deletable: true },
    { category: 'contracts', label: 'Contracts', count: 25, icon: 'FileText', deletable: true },
    { category: 'users', label: 'Team Members', count: 5, icon: 'Users', deletable: true },
    { category: 'files', label: 'Files & Documents', count: 89, icon: 'FolderOpen', deletable: true },
    { category: 'templates', label: 'Templates', count: 12, icon: 'FileText', deletable: true }
  ],
  totalRecords: 287,
  canDelete: true,
  blockingReasons: []
};

const CloseAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { currentTenant } = useAuth();

  // State
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataSummary, setDataSummary] = useState<TenantDataSummary | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Create pseudo tenant object
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
      total_users: dataSummary?.categories.find(c => c.category === 'users')?.count || 0,
      total_contacts: dataSummary?.categories.find(c => c.category === 'contacts')?.count || 0,
      total_contracts: dataSummary?.categories.find(c => c.category === 'contracts')?.count || 0,
      buyer_contacts: 0,
      seller_contacts: 0,
      storage_used_mb: 0,
      storage_limit_mb: 100,
      tenant_type: 'mixed'
    }
  } : null;

  // Load data on mount
  useEffect(() => {
    loadDataSummary();
  }, []);

  const loadDataSummary = async () => {
    setIsLoadingData(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setDataSummary(mockDataSummary);
    } catch (error) {
      console.error('Failed to load data summary:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSendFeedback = async () => {
    if (selectedReasons.length === 0 && !additionalFeedback.trim()) return;

    setIsSendingFeedback(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFeedbackSent(true);
    } catch (error) {
      console.error('Failed to send feedback:', error);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleConfirmDelete = async (tenantId: string, reason: string) => {
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Redirect to login or landing page after account closure
    navigate('/login');
  };

  const totalRecords = dataSummary?.totalRecords || 0;

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/settings/business-profile')}
        className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: colors.utility.secondaryText }}
      >
        <ArrowLeft size={18} />
        Back to Business Profile
      </button>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{
              background: isDarkMode
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(239, 68, 68, 0.1)'
            }}
          >
            <Heart size={36} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              We're Sorry to See You Go
            </h1>
            <p
              className="text-lg mt-2"
              style={{ color: colors.utility.secondaryText }}
            >
              Before you leave, please help us understand why
            </p>
          </div>
        </div>

        {/* Feedback Section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDarkMode
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{
              background: isDarkMode
                ? 'rgba(251, 191, 36, 0.1)'
                : 'rgba(251, 191, 36, 0.08)',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)'}`
            }}
          >
            <MessageSquare size={20} style={{ color: '#F59E0B' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: isDarkMode ? '#FCD34D' : '#D97706' }}
            >
              Share Your Feedback (Optional)
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {feedbackSent ? (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <CheckCircle size={32} style={{ color: '#10B981' }} />
                </div>
                <p
                  className="text-lg font-medium"
                  style={{ color: colors.utility.primaryText }}
                >
                  Thank you for your feedback!
                </p>
                <p
                  className="text-sm mt-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Your input helps us improve ContractNest for everyone.
                </p>
              </div>
            ) : (
              <>
                {/* Reason Selection */}
                <div>
                  <p
                    className="text-sm font-medium mb-3"
                    style={{ color: colors.utility.primaryText }}
                  >
                    What's your main reason for leaving? (Select all that apply)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {feedbackReasons.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => toggleReason(reason.id)}
                        className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: selectedReasons.includes(reason.id)
                            ? `${colors.brand.primary}20`
                            : isDarkMode
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                          border: `2px solid ${
                            selectedReasons.includes(reason.id)
                              ? colors.brand.primary
                              : 'transparent'
                          }`
                        }}
                      >
                        <span className="text-xl mb-1 block">{reason.icon}</span>
                        <span
                          className="text-sm"
                          style={{
                            color: selectedReasons.includes(reason.id)
                              ? colors.brand.primary
                              : colors.utility.primaryText
                          }}
                        >
                          {reason.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Feedback */}
                <div>
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Anything else you'd like to share?
                  </p>
                  <textarea
                    value={additionalFeedback}
                    onChange={(e) => setAdditionalFeedback(e.target.value)}
                    placeholder="Tell us more about your experience..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                    style={{
                      background: isDarkMode
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                      border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                      color: colors.utility.primaryText,
                      // @ts-ignore
                      '--tw-ring-color': colors.brand.primary
                    }}
                  />
                </div>

                {/* Send Feedback Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSendFeedback}
                    disabled={isSendingFeedback || (selectedReasons.length === 0 && !additionalFeedback.trim())}
                    className="px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    style={{
                      background: colors.brand.primary,
                      color: 'white'
                    }}
                  >
                    {isSendingFeedback ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Send Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data Summary Section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDarkMode
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
          }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{
              background: isDarkMode
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.02)',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
            }}
          >
            <div className="flex items-center gap-3">
              <Database size={20} style={{ color: colors.utility.secondaryText }} />
              <h2
                className="text-lg font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Data to be Deleted
              </h2>
            </div>
            {!isLoadingData && dataSummary && (
              <span
                className="text-sm px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444'
                }}
              >
                <AnimatedCounter value={totalRecords} /> records
              </span>
            )}
          </div>

          <div className="p-6">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: colors.brand.primary }}
                />
                <span
                  className="ml-3"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Loading your data summary...
                </span>
              </div>
            ) : dataSummary ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                      key={category.category}
                      className="p-4 rounded-xl text-center"
                      style={{
                        background: isDarkMode
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'rgba(239, 68, 68, 0.05)',
                        border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'}`
                      }}
                    >
                      <IconComponent
                        size={24}
                        style={{ color: '#EF4444' }}
                        className="mx-auto mb-2"
                      />
                      <div
                        className="text-2xl font-bold"
                        style={{ color: colors.utility.primaryText }}
                      >
                        <AnimatedCounter value={category.count} />
                      </div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {category.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Warning & Action Section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDarkMode
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`
          }}
        >
          <div className="p-6 space-y-6">
            {/* Warning */}
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
                  Permanent Action Warning
                </h3>
                <ul
                  className="text-sm mt-2 space-y-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <li>• All your data will be <strong>permanently deleted</strong></li>
                  <li>• This action <strong>cannot be undone</strong></li>
                  <li>• All team members will lose access immediately</li>
                  <li>• Your subscription will be cancelled</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={() => navigate('/settings/business-profile')}
                className="px-6 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: isDarkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                  color: colors.utility.primaryText
                }}
              >
                Cancel & Keep My Account
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                style={{
                  background: '#EF4444',
                  color: 'white'
                }}
              >
                <Trash2 size={18} />
                Proceed with Account Closure
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div
          className="rounded-xl p-4 flex items-center gap-4"
          style={{
            background: isDarkMode
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(59, 130, 246, 0.08)',
            border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`
          }}
        >
          <HelpCircle size={24} style={{ color: '#3B82F6' }} />
          <div className="flex-1">
            <p
              className="text-sm font-medium"
              style={{ color: isDarkMode ? '#93C5FD' : '#2563EB' }}
            >
              Need help or have questions?
            </p>
            <p
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              Contact our support team at support@contractnest.com before making this decision.
            </p>
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
    </div>
  );
};

export default CloseAccountPage;
