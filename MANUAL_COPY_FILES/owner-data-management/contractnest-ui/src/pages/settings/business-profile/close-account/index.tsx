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
  HelpCircle,
  FlaskConical,
  RotateCcw
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../services/api';
import { API_ENDPOINTS } from '../../../../services/serviceURLs';
import { TenantDataSummary, TenantListItem } from '../../../../types/tenantManagement';
import { DeleteConfirmationFlow } from '../../../../components/subscription/modals/DeleteConfirmationFlow';
import { AdminActionDialog, AdminActionType } from '../../../../components/subscription/modals/AdminActionDialog';
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

  // Action dialog state (for reset test/all data)
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionDialogAction, setActionDialogAction] = useState<AdminActionType | null>(null);

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

  // Load data on mount
  useEffect(() => {
    loadDataSummary();
  }, []);

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
    try {
      await api.post(API_ENDPOINTS.TENANT_ACCOUNT.CLOSE_ACCOUNT, { reason });
    } catch (error) {
      console.error('Failed to close account:', error);
      throw error;
    }

    // Redirect to login or landing page after account closure
    navigate('/login');
  };

  // Open action dialog for reset operations
  const handleResetTestData = () => {
    setActionDialogAction('reset-test-data');
    setActionDialogOpen(true);
  };

  const handleResetAllData = () => {
    setActionDialogAction('reset-all-data');
    setActionDialogOpen(true);
  };

  // Execute the action (called by AdminActionDialog)
  const executeAction = async (tenant: TenantListItem): Promise<any> => {
    const endpoints: Record<string, string> = {
      'reset-test-data': API_ENDPOINTS.TENANT_ACCOUNT.RESET_TEST_DATA,
      'reset-all-data': API_ENDPOINTS.TENANT_ACCOUNT.RESET_ALL_DATA,
      'close-account': API_ENDPOINTS.TENANT_ACCOUNT.CLOSE_ACCOUNT
    };

    const endpoint = endpoints[actionDialogAction!];
    const response = await api.post(endpoint);
    return response.data?.success ? response.data.data : response.data;
  };

  // Called when action completes
  const handleActionComplete = () => {
    setActionDialogOpen(false);
    loadDataSummary();
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
                      key={category.id}
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
                        <AnimatedCounter value={category.totalCount} />
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

        {/* Data Management Actions */}
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
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.02)',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
            }}
          >
            <Database size={20} style={{ color: colors.utility.secondaryText }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Data Management
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Reset Test Data */}
            <div
              className="p-4 rounded-xl flex items-center justify-between"
              style={{
                background: isDarkMode
                  ? 'rgba(251, 191, 36, 0.08)'
                  : 'rgba(251, 191, 36, 0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)'}`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(251, 191, 36, 0.15)' }}
                >
                  <FlaskConical size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                    Reset Test Data
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Remove sample/test records only. Live data stays intact.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetTestData}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: isDarkMode ? '#FCD34D' : '#D97706',
                  border: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)'}`
                }}
              >
                Reset Test Data
              </button>
            </div>

            {/* Reset All Data */}
            <div
              className="p-4 rounded-xl flex items-center justify-between"
              style={{
                background: isDarkMode
                  ? 'rgba(239, 68, 68, 0.06)'
                  : 'rgba(239, 68, 68, 0.03)',
                border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'}`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239, 68, 68, 0.12)' }}
                >
                  <RotateCcw size={20} style={{ color: '#EF4444' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.utility.primaryText }}>
                    Reset All Data
                  </p>
                  <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                    Delete all data but keep your account open.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetAllData}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`
                }}
              >
                Reset All Data
              </button>
            </div>
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
                  <li>• <strong>Reset Test Data</strong> removes only sample/test records</li>
                  <li>• <strong>Reset All Data</strong> deletes everything but keeps account active</li>
                  <li>• <strong>Close Account</strong> deletes all data and closes account permanently</li>
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
                Close Account
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

      {/* Delete Confirmation Modal (for Close Account) */}
      <DeleteConfirmationFlow
        tenant={currentTenantAsListItem}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirmDelete={handleConfirmDelete}
        dataSummary={dataSummary}
        isLoadingDataSummary={isLoadingData}
        mode="owner"
      />

      {/* Action Dialog (for Reset Test Data / Reset All Data) */}
      <AdminActionDialog
        isOpen={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        action={actionDialogAction}
        tenant={currentTenantAsListItem}
        onExecute={executeAction}
        onComplete={handleActionComplete}
      />
    </div>
  );
};

export default CloseAccountPage;
