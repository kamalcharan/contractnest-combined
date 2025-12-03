// src/pages/onboarding/steps/SequenceNumbersStep.tsx
// Onboarding step for setting up sequence number defaults
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
  Ticket
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sequenceService } from '@/services/sequenceService';

interface OnboardingStepContext {
  onComplete: (data?: Record<string, any>) => void;
  onSkip: () => void;
  isSubmitting: boolean;
  updateTenantField: (field: string, value: any) => void;
}

// Default sequence configurations that will be seeded
const DEFAULT_SEQUENCES = [
  {
    code: 'CONTACT',
    name: 'Contacts',
    prefix: 'CT-',
    example: 'CT-0001',
    icon: Users,
    description: 'Customer and vendor contacts'
  },
  {
    code: 'CONTRACT',
    name: 'Contracts',
    prefix: 'CON-',
    example: 'CON-0001',
    icon: FileText,
    description: 'Service contracts and agreements'
  },
  {
    code: 'INVOICE',
    name: 'Invoices',
    prefix: 'INV-',
    example: 'INV-0001',
    icon: Receipt,
    description: 'Customer invoices'
  },
  {
    code: 'QUOTATION',
    name: 'Quotations',
    prefix: 'QT-',
    example: 'QT-0001',
    icon: ClipboardList,
    description: 'Price quotations and estimates'
  },
  {
    code: 'PROJECT',
    name: 'Projects',
    prefix: 'PRJ-',
    example: 'PRJ-0001',
    icon: Briefcase,
    description: 'Project tracking'
  },
  {
    code: 'TICKET',
    name: 'Support Tickets',
    prefix: 'TKT-',
    example: 'TKT-0001',
    icon: Ticket,
    description: 'Customer support tickets'
  },
];

const SequenceNumbersStep: React.FC = () => {
  const { onComplete, onSkip, isSubmitting } = useOutletContext<OnboardingStepContext>();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isLoading, setIsLoading] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<{ seeded_count: number; sequences: string[] } | null>(null);

  // Check if sequences already exist on mount
  useEffect(() => {
    checkExistingSequences();
  }, []);

  const checkExistingSequences = async () => {
    try {
      const configs = await sequenceService.getConfigs();
      if (configs && configs.length > 0) {
        setIsSeeded(true);
        setSeedResult({ seeded_count: configs.length, sequences: configs.map(c => c.entity_type) });
      }
    } catch (err) {
      // If error, assume not seeded yet
      console.log('[SequenceNumbersStep] Could not check existing sequences:', err);
    }
  };

  /**
   * Handle seeding default sequences
   */
  const handleSeedDefaults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SequenceNumbersStep] Seeding default sequences...');
      const result = await sequenceService.seedDefaults();

      console.log('[SequenceNumbersStep] Seed result:', result);

      if (result.success) {
        setIsSeeded(true);
        setSeedResult({ seeded_count: result.seeded_count, sequences: result.sequences });
        toast.success(`${result.seeded_count} sequence configurations created!`, {
          duration: 3000,
          icon: '✓'
        });
      } else {
        throw new Error('Failed to seed sequences');
      }
    } catch (err: any) {
      console.error('[SequenceNumbersStep] Error seeding:', err);
      setError(err.message || 'Failed to set up sequence numbers');
      toast.error('Failed to set up sequence numbers. You can configure them later in Settings.');
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
        await handleSeedDefaults();
      }

      const dataToSend = {
        step: 'sequence-numbers',
        sequences_configured: isSeeded || seedResult !== null,
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

  /**
   * Handle skip
   */
  const handleSkip = () => {
    console.log('[SequenceNumbersStep] Skipping step');
    onSkip();
  };

  const canContinue = !isSubmitting && !isLoading;

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
            className="text-sm mb-6"
            style={{ color: colors.utility.secondaryText }}
          >
            {seedResult.seeded_count} sequence types have been set up for your account.
            You can customize formats later in Settings → Sequence Numbers.
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
              We'll set up automatic numbering for your contacts, contracts, invoices, and more.
              Each record gets a unique, formatted identifier that you can customize later.
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

          {/* Default sequences preview */}
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
              Default Sequence Formats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_SEQUENCES.map((seq) => {
                const IconComponent = seq.icon;
                return (
                  <div
                    key={seq.code}
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
                          backgroundColor: colors.brand.primary + '15',
                          color: colors.brand.primary
                        }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className="font-medium text-sm"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {seq.name}
                        </div>
                        <div
                          className="font-mono text-xs px-2 py-0.5 rounded inline-block mt-1"
                          style={{
                            backgroundColor: colors.brand.primary + '10',
                            color: colors.brand.primary
                          }}
                        >
                          {seq.example}
                        </div>
                      </div>
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {seq.description}
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
              <li>• These sequences will be created with default settings</li>
              <li>• Numbers start at 0001 and auto-increment</li>
              <li>• You can customize prefixes, padding, and reset frequency in Settings</li>
              <li>• Existing records won't be affected - only new records get numbers</li>
            </ul>
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

            <button
              onClick={handleSkip}
              disabled={!canContinue}
              className="text-sm px-4 py-2 rounded-lg transition-colors hover:opacity-80"
              style={{ color: colors.utility.secondaryText }}
            >
              Skip for now
            </button>
          </div>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p
              className="text-xs transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              You can always set this up later in Settings → Sequence Numbers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceNumbersStep;
