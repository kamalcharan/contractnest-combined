// src/components/subscription/modals/DeleteConfirmationFlow.tsx
// Multi-step delete confirmation modal with glassmorphism

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Building2
} from 'lucide-react';
import { TenantListItem, TenantDataSummary } from '../../../types/tenantManagement';
import { DataCategoryCard } from '../data-viz/DataCategoryCard';
import { AnimatedCounter } from '../data-viz/AnimatedCounter';
import { useTheme } from '../../../contexts/ThemeContext';

interface DeleteConfirmationFlowProps {
  tenant: TenantListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (tenantId: string, reason: string) => Promise<void>;
  dataSummary?: TenantDataSummary | null;
  isLoadingDataSummary?: boolean;
  mode: 'admin' | 'owner';
}

type Step = 'review' | 'preview' | 'confirm';

export const DeleteConfirmationFlow: React.FC<DeleteConfirmationFlowProps> = ({
  tenant,
  isOpen,
  onClose,
  onConfirmDelete,
  dataSummary,
  isLoadingDataSummary = false,
  mode
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [currentStep, setCurrentStep] = useState<Step>('review');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('review');
      setReason('');
      setConfirmText('');
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !tenant) return null;

  const steps: { id: Step; label: string }[] = [
    { id: 'review', label: 'Review' },
    { id: 'preview', label: 'Preview' },
    { id: 'confirm', label: 'Confirm' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const expectedConfirmText = `DELETE ${tenant.workspace_code}`;
  const canConfirm = confirmText.toUpperCase() === expectedConfirmText.toUpperCase();

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleDelete = async () => {
    if (!canConfirm) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirmDelete(tenant.id, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant data');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl"
        style={{
          background: isDarkMode
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: isDarkMode
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(239, 68, 68, 0.05)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              <Trash2 size={20} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: colors.utility.primaryText }}
              >
                Delete Tenant Data
              </h2>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                {mode === 'admin' ? 'Admin action' : 'Close your account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            <X size={20} style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        transition-all duration-300
                      `}
                      style={{
                        background: isCompleted
                          ? '#10B981'
                          : isActive
                            ? colors.brand.primary
                            : isDarkMode
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.05)',
                        color: isCompleted || isActive ? '#fff' : colors.utility.secondaryText
                      }}
                    >
                      {isCompleted ? <Check size={16} /> : index + 1}
                    </div>
                    <span
                      className="text-sm font-medium hidden sm:block"
                      style={{
                        color: isActive ? colors.utility.primaryText : colors.utility.secondaryText
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-4"
                      style={{
                        background: index < currentStepIndex
                          ? '#10B981'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)'
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div
          className="px-6 py-4 overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 280px)' }}
        >
          {/* Step 1: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Tenant Info Card */}
              <div
                className="rounded-2xl p-5 text-center"
                style={{
                  background: isDarkMode
                    ? `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`
                    : `linear-gradient(135deg, ${colors.brand.primary}08 0%, ${colors.brand.secondary}05 100%)`,
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{
                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'
                  }}
                >
                  <Building2 size={32} style={{ color: colors.brand.primary }} />
                </div>
                <h3
                  className="text-xl font-bold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {tenant.profile?.business_name || tenant.name}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {tenant.workspace_code}
                </p>
              </div>

              {/* Total Records */}
              {dataSummary && (
                <div
                  className="rounded-2xl p-6 text-center"
                  style={{
                    background: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`
                  }}
                >
                  <AnimatedCounter
                    value={dataSummary.totalRecords}
                    className="text-5xl"
                    highlightColor="#EF4444"
                  />
                  <p
                    className="mt-2 text-lg"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    records will be permanently deleted
                  </p>
                </div>
              )}

              {/* Warning */}
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                  border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)'}`
                }}
              >
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} className="flex-shrink-0 mt-0.5" />
                <div className="text-sm" style={{ color: colors.utility.primaryText }}>
                  <p className="font-medium mb-1">This action is irreversible</p>
                  <p style={{ color: colors.utility.secondaryText }}>
                    All data will be permanently deleted. The tenant record will be kept
                    with status 'closed' for audit purposes.
                  </p>
                </div>
              </div>

              {/* Admin Reason */}
              {mode === 'admin' && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Reason for deletion (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., User requested account deletion"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none"
                    style={{
                      background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                      color: colors.utility.primaryText,
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              <p
                className="text-sm mb-4"
                style={{ color: colors.utility.secondaryText }}
              >
                The following data will be deleted:
              </p>

              {isLoadingDataSummary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin" style={{ color: colors.brand.primary }} />
                </div>
              ) : dataSummary ? (
                <div className="space-y-3">
                  {dataSummary.categories.map((category, index) => (
                    <DataCategoryCard
                      key={category.id}
                      category={category}
                      index={index}
                      totalCategories={dataSummary.categories.length}
                      expanded={index === 0}
                    />
                  ))}

                  {/* Total Summary */}
                  <div
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{
                      background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`
                    }}
                  >
                    <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                      Total Records
                    </span>
                    <span className="text-2xl font-bold" style={{ color: '#EF4444' }}>
                      {dataSummary.totalRecords.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8" style={{ color: colors.utility.secondaryText }}>
                  No data summary available
                </p>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              {/* Final Warning */}
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                  border: `2px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                <AlertTriangle size={48} style={{ color: '#EF4444' }} className="mx-auto mb-4" />
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  This action is PERMANENT
                </h3>
                <ul className="text-left text-sm space-y-2 max-w-sm mx-auto" style={{ color: colors.utility.secondaryText }}>
                  <li className="flex items-start gap-2">
                    <span style={{ color: '#EF4444' }}>•</span>
                    All {dataSummary?.totalRecords.toLocaleString() || 0} records will be deleted
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: '#EF4444' }}>•</span>
                    The tenant status will be set to 'closed'
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: '#EF4444' }}>•</span>
                    Storage files will be removed
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: '#EF4444' }}>•</span>
                    This cannot be undone
                  </li>
                </ul>
              </div>

              {/* Confirmation Input */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  To confirm, type <code className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-mono">{expectedConfirmText}</code>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={expectedConfirmText}
                  className="w-full px-4 py-3 rounded-xl outline-none transition-colors font-mono"
                  style={{
                    background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                    color: colors.utility.primaryText,
                    border: `1px solid ${canConfirm ? '#10B981' : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          <button
            onClick={currentStep === 'review' ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors"
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: colors.utility.secondaryText
            }}
          >
            {currentStep === 'review' ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft size={16} />
                Back
              </>
            )}
          </button>

          {currentStep !== 'confirm' ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
                color: '#fff'
              }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={!canConfirm || isDeleting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{
                background: canConfirm
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)',
                color: canConfirm ? '#fff' : colors.utility.secondaryText
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete All Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationFlow;
