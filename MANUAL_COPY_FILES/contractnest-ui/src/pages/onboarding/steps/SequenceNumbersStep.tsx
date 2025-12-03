// src/pages/onboarding/steps/SequenceNumbersStep.tsx
// Onboarding step for setting up sequence number defaults
// Fetches preview data from API layer (single source of truth)

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Hash,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Receipt,
  Briefcase,
  ClipboardList,
  Ticket,
  CreditCard,
  Folder,
  CheckSquare,
  FileQuestion
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  TenantSeedService,
  SeedPreview,
  SeedPreviewItem,
  getSequenceColor
} from '@/services/TenantSeedService';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  updateTenantField: (field: string, value: any) => void;
}

// Icon mapping for sequence types
const ICON_MAP: Record<string, any> = {
  Users: Users,
  FileText: FileText,
  Receipt: Receipt,
  FileQuestion: FileQuestion,
  CreditCard: CreditCard,
  Folder: Folder,
  CheckSquare: CheckSquare,
  Ticket: Ticket,
  Briefcase: Briefcase,
  ClipboardList: ClipboardList,
  Hash: Hash,
};

const SequenceNumbersStep: React.FC = () => {
  const { onComplete, onSkip, isSubmitting } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isSeeded, setIsSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<{ seeded_count: number; sequences: string[] } | null>(null);
  const [preview, setPreview] = useState<SeedPreview | null>(null);

  // Fetch preview data from API on mount
  useEffect(() => {
    loadPreviewAndCheckStatus();
  }, []);

  const loadPreviewAndCheckStatus = async () => {
    try {
      setIsLoadingPreview(true);

      // Fetch preview data from API (single source of truth)
      const previewData = await TenantSeedService.getSequenceDefaults();
      setPreview(previewData);

      // Check if already seeded
      const alreadySeeded = await TenantSeedService.checkSequencesSeeded();
      if (alreadySeeded) {
        setIsSeeded(true);
        setSeedResult({
          seeded_count: previewData.itemCount,
          sequences: previewData.items.map(i => i.code)
        });
      }
    } catch (err) {
      console.log('[SequenceNumbersStep] Could not load preview:', err);
      // Use fallback data if API fails
      setPreview({
        category: 'sequences',
        displayName: 'Sequence Numbers',
        description: 'Auto-generated number formats',
        itemCount: 6,
        items: [
          { code: 'CONTACT', name: 'Contacts', preview: 'CT-1001' },
          { code: 'CONTRACT', name: 'Contracts', preview: 'CN-1001' },
          { code: 'INVOICE', name: 'Invoices', preview: 'INV-10001' },
          { code: 'QUOTATION', name: 'Quotations', preview: 'QT-1001' },
          { code: 'PROJECT', name: 'Projects', preview: 'PRJ-1001' },
          { code: 'TICKET', name: 'Support Tickets', preview: 'TKT-10001' },
        ]
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Handle seeding default sequences via API
   */
  const handleSeedDefaults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SequenceNumbersStep] Seeding default sequences via API...');

      // Call TenantSeedService which calls API layer
      const result = await TenantSeedService.seedSequences();

      console.log('[SequenceNumbersStep] Seed result:', result);

      if (result.success) {
        setIsSeeded(true);
        setSeedResult({
          seeded_count: result.inserted,
          sequences: result.items || []
        });
        toast.success(`${result.inserted} sequence configurations created!`, {
          duration: 3000,
          icon: '✓'
        });
        return true;
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to seed sequences');
      }
    } catch (err: any) {
      console.error('[SequenceNumbersStep] Error seeding:', err);
      setError(err.message || 'Failed to set up sequence numbers');
      toast.error('Failed to set up sequence numbers. You can configure them later in Settings.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle continue button click
   */
  const handleContinue = async () => {
    console.log('[SequenceNumbersStep] Continue clicked');

    setIsLoading(true);

    try {
      // If not seeded yet, seed first
      if (!isSeeded) {
        const success = await handleSeedDefaults();
        if (!success) {
          // Still allow continuing even if seeding failed
          await onComplete({ step: 'sequence-numbers', sequences_configured: false });
          return;
        }
      }

      const dataToSend = {
        step: 'sequence-numbers',
        sequences_configured: true,
        completed_at: new Date().toISOString()
      };

      console.log('[SequenceNumbersStep] Data being passed to onComplete:', dataToSend);

      await onComplete(dataToSend);

      console.log('[SequenceNumbersStep] Step completed successfully');
    } catch (error) {
      console.error('[SequenceNumbersStep] Error:', error);
      // Still allow continuing even if seeding failed
      await onComplete({ step: 'sequence-numbers', sequences_configured: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Get icon component for a sequence
  const getIconComponent = (iconName: string | undefined) => {
    return ICON_MAP[iconName || 'Hash'] || Hash;
  };

  const canContinue = !isSubmitting && !isLoading && !isLoadingPreview;

  // Loading state
  if (isLoadingPreview) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Loader2
          className="w-8 h-8 animate-spin mb-4"
          style={{ color: colors.brand.primary }}
        />
        <p style={{ color: colors.utility.secondaryText }}>
          Loading sequence configuration...
        </p>
      </div>
    );
  }

  // Already seeded view
  if (isSeeded && seedResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{
              backgroundColor: colors.semantic.success + '20',
              color: colors.semantic.success
            }}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: colors.utility.primaryText }}
          >
            Sequence Numbers Configured
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            {seedResult.seeded_count} sequence types have been set up for <strong>both Live and Test environments</strong>.
          </p>
          <p
            className="text-xs mb-6 px-4 py-2 rounded-lg inline-block"
            style={{
              backgroundColor: colors.semantic.warning + '10',
              color: colors.utility.secondaryText
            }}
          >
            💡 Need custom formats? Go to <strong style={{ color: colors.utility.primaryText }}>Settings → Configure → Sequence Numbers</strong> to personalize prefixes, starting numbers, and more.
          </p>

          {/* Show configured sequences */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 text-left"
            style={{ maxWidth: '500px', margin: '0 auto' }}
          >
            {seedResult.sequences.slice(0, 6).map((seq) => (
              <div
                key={seq}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              >
                <CheckCircle2 className="w-4 h-4" style={{ color: colors.semantic.success }} />
                {seq}
              </div>
            ))}
          </div>

          <button
            onClick={() => onComplete({ step: 'sequence-numbers', sequences_configured: true })}
            className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#FFFFFF'
            }}
          >
            Continue to Next Step
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // Main form view
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors"
              style={{
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary
              }}
            >
              <Hash className="w-8 h-8" />
            </div>
            <h2
              className="text-2xl font-bold mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Set Up Sequence Numbers
            </h2>
            <p
              className="text-sm max-w-2xl mx-auto transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              {preview?.description || 'We\'ll set up automatic numbering for your contacts, contracts, invoices, and more. Each record gets a unique, formatted identifier that you can customize later.'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg flex items-center gap-3"
              style={{
                backgroundColor: colors.semantic.error + '10',
                borderColor: colors.semantic.error + '30',
                color: colors.semantic.error
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Default sequences preview - fetched from API */}
          <div
            className="rounded-lg border p-6 mb-8"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: colors.utility.primaryText }}
            >
              Default Sequence Formats ({preview?.itemCount || 0} types)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preview?.items.map((item) => {
                const IconComponent = getIconComponent(
                  item.code === 'CONTACT' ? 'Users' :
                  item.code === 'CONTRACT' ? 'FileText' :
                  item.code === 'INVOICE' ? 'Receipt' :
                  item.code === 'QUOTATION' ? 'FileQuestion' :
                  item.code === 'RECEIPT' ? 'CreditCard' :
                  item.code === 'PROJECT' ? 'Folder' :
                  item.code === 'TASK' ? 'CheckSquare' :
                  item.code === 'TICKET' ? 'Ticket' : 'Hash'
                );
                const itemColor = getSequenceColor(item.code);

                return (
                  <div
                    key={item.code}
                    className="p-4 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderColor: colors.utility.primaryText + '15'
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: itemColor + '15',
                          color: itemColor
                        }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className="font-medium text-sm"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {item.name}
                        </div>
                        {item.preview && (
                          <div
                            className="font-mono text-xs px-2 py-0.5 rounded inline-block mt-1"
                            style={{
                              backgroundColor: itemColor + '10',
                              color: itemColor
                            }}
                          >
                            {item.preview}
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {item.code}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info box */}
          <div
            className="p-4 rounded-lg border mb-8"
            style={{
              backgroundColor: colors.brand.primary + '05',
              borderColor: colors.brand.primary + '20'
            }}
          >
            <h4
              className="font-medium text-sm mb-2"
              style={{ color: colors.brand.primary }}
            >
              What happens next?
            </h4>
            <ul
              className="text-sm space-y-1"
              style={{ color: colors.utility.secondaryText }}
            >
              <li>• Default sequences are created for <strong>both Live and Test environments</strong></li>
              <li>• Numbers auto-increment from the configured start value (default: 1)</li>
              <li>• Each new record automatically gets a unique, formatted identifier</li>
              <li>• Existing records won't be affected - only new records get numbers</li>
            </ul>
          </div>

          {/* Customization note */}
          <div
            className="p-4 rounded-lg border mb-8"
            style={{
              backgroundColor: colors.semantic.warning + '08',
              borderColor: colors.semantic.warning + '25'
            }}
          >
            <h4
              className="font-medium text-sm mb-2"
              style={{ color: colors.semantic.warning }}
            >
              Need custom sequence formats?
            </h4>
            <p
              className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              After onboarding, you can fully customize your sequence formats including prefixes,
              suffixes, starting numbers, and reset frequencies. Navigate to{' '}
              <strong style={{ color: colors.utility.primaryText }}>
                Settings → Configure → Sequence Numbers
              </strong>{' '}
              to personalize each sequence type.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#FFFFFF'
              }}
            >
              {isLoading || isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Set Up & Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              You can customize formats later in Settings → Sequence Numbers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceNumbersStep;
