// src/components/TaxSettings/TaxDisplayPanel.tsx
// UPDATED: Using VaNiLoader and vaniToast for consistent UI

import { useState, useEffect } from 'react';
import { Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader, InlineLoader } from '@/components/common/loaders/UnifiedLoader';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

// Import types
import type {
  UseTaxDisplayReturn,
  TaxDisplayFormData,
  DISPLAY_MODE_OPTIONS
} from '@/types/taxSettings';

interface TaxDisplayPanelProps {
  hook: UseTaxDisplayReturn;
  onError?: (error: string) => void;
}

const TaxDisplayPanel = ({ hook, onError }: TaxDisplayPanelProps) => {
  const { state, updateDisplayMode, resetChanges } = hook;
  const { isDarkMode, currentTheme } = useTheme();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Local form state
  const [selectedMode, setSelectedMode] = useState<'including_tax' | 'excluding_tax'>('excluding_tax');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Display mode options (matching your reference UI)
  const displayModeOptions = [
    {
      value: 'excluding_tax' as const,
      label: 'Excluding tax',
      description: 'Show prices without tax included'
    },
    {
      value: 'including_tax' as const,
      label: 'Including tax',
      description: 'Show prices with tax included'
    }
  ];

  // Sync form state with hook data
  useEffect(() => {
    if (state.data) {
      setSelectedMode(state.data.display_mode);
      setHasLocalChanges(false);
    }
  }, [state.data]);

  // Handle mode change
  const handleModeChange = (mode: 'including_tax' | 'excluding_tax') => {
    setSelectedMode(mode);
    setHasLocalChanges(state.data?.display_mode !== mode);
  };

  // Handle save
  const handleSave = async () => {
    if (!hasLocalChanges) {
      vaniToast.info('No Changes', {
        message: 'No changes to save',
        duration: 2000
      });
      return;
    }

    try {
      await updateDisplayMode(selectedMode);

      // Success toast handled in hook
      setHasLocalChanges(false);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save tax display settings';
      onError?.(errorMessage);

      // Error toast
      vaniToast.error('Save Failed', {
        message: errorMessage,
        duration: 4000
      });
    }
  };

  // Handle reset
  const handleReset = () => {
    if (state.data) {
      setSelectedMode(state.data.display_mode);
      setHasLocalChanges(false);
      resetChanges();
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await hook.refresh();
      setHasLocalChanges(false);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh tax display settings';
      onError?.(errorMessage);
    }
  };

  // LOADING STATE - Using VaNiLoader
  if (state.loading) {
    return (
      <div
        className="rounded-lg shadow-sm border p-6 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <VaNiLoader
          size="sm"
          message="LOADING TAX DISPLAY SETTINGS"
        />
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        className="rounded-lg shadow-sm border p-6 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="text-center py-8">
          <div
            className="font-medium mb-2 transition-colors"
            style={{ color: colors.semantic.error }}
          >
            Failed to load tax display settings
          </div>
          <div
            className="text-sm mb-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            {state.error}
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={state.loading}
            className="transition-all duration-200 hover:opacity-80"
            style={{
              borderColor: `${colors.utility.primaryText}40`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText
            }}
          >
            {state.loading ? (
              <InlineLoader size="sm" text="Loading..." />
            ) : (
              'Try Again'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panel Title - LOADING INDICATOR ADDED */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Tax Display
          </h2>
          <p
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            How prices are displayed on the proposal pricing page
          </p>
        </div>

        {/* LOADING INDICATOR - Using InlineLoader */}
        {state.saving && (
          <div
            className="flex items-center space-x-2 text-sm transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            <InlineLoader size="sm" text="Saving..." />
          </div>
        )}
      </div>

      {/* Main Settings Card */}
      <div
        className="rounded-lg shadow-sm border p-6 transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: `${colors.utility.primaryText}20`
        }}
      >
        <div className="space-y-6">
          {/* Sales Tax Display Section */}
          <div>
            <Label
              className="text-base font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Sales tax display
            </Label>
            <p
              className="text-sm mt-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Show prices with or without tax
            </p>
          </div>

          {/* Display Mode Options */}
          <div className="space-y-3">
            {displayModeOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                  state.saving && "opacity-60 cursor-not-allowed"
                )}
                style={{
                  borderColor: selectedMode === option.value
                    ? colors.brand.primary
                    : `${colors.utility.primaryText}20`,
                  backgroundColor: selectedMode === option.value
                    ? `${colors.brand.primary}05`
                    : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (selectedMode !== option.value && !state.saving) {
                    e.currentTarget.style.borderColor = `${colors.brand.primary}50`;
                    e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMode !== option.value && !state.saving) {
                    e.currentTarget.style.borderColor = `${colors.utility.primaryText}20`;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                onClick={() => !state.saving && handleModeChange(option.value)}
              >
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full border-2 mt-0.5 transition-colors"
                  style={{
                    borderColor: selectedMode === option.value
                      ? colors.brand.primary
                      : colors.utility.secondaryText,
                    backgroundColor: selectedMode === option.value
                      ? colors.brand.primary
                      : 'transparent',
                    color: selectedMode === option.value ? 'white' : 'transparent'
                  }}
                >
                  {selectedMode === option.value && (
                    state.saving ? (
                      <InlineLoader size="sm" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className="font-medium transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {option.label}
                  </div>
                  <div
                    className="text-sm transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {option.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div
            className="flex items-start space-x-3 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: `${colors.brand.primary}10`,
              borderColor: `${colors.brand.primary}40`
            }}
          >
            <Info
              className="w-5 h-5 mt-0.5 shrink-0"
              style={{ color: colors.brand.primary }}
            />
            <div className="text-sm">
              <div
                className="font-medium mb-1 transition-colors"
                style={{ color: colors.brand.primary }}
              >
                Display Mode Information
              </div>
              <div
                className="transition-colors"
                style={{ color: colors.brand.primary }}
              >
                This setting affects how prices appear throughout your proposals and invoices.
                You can change this setting at any time.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center justify-between pt-4 border-t transition-colors"
            style={{ borderColor: `${colors.utility.primaryText}20` }}
          >
            <div className="flex items-center space-x-2">
              {hasLocalChanges && (
                <div
                  className="flex items-center text-sm transition-colors"
                  style={{ color: colors.semantic.warning }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: colors.semantic.warning }}
                  />
                  You have unsaved changes
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {hasLocalChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={state.saving}
                  className="transition-all duration-200 hover:opacity-80"
                  style={{
                    borderColor: `${colors.utility.primaryText}40`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText
                  }}
                >
                  Reset
                </Button>
              )}

              <Button
                onClick={handleSave}
                disabled={!hasLocalChanges || state.saving}
                className="text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                style={{
                  background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                {state.saving ? (
                  <InlineLoader size="sm" text="Saving..." />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Configuration Summary */}
      {state.data && (
        <div
          className="rounded-lg p-4 transition-colors"
          style={{ backgroundColor: `${colors.utility.primaryText}10` }}
        >
          <div
            className="text-sm font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Current Configuration
          </div>
          <div
            className="text-sm transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            <div>Display Mode: <span
              className="font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {state.data.display_mode === 'including_tax' ? 'Including tax' : 'Excluding tax'}
            </span></div>
            {state.data.default_tax_rate_id && (
              <div>Default Tax Rate: <span
                className="font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                {state.data.default_tax_rate_id}
              </span></div>
            )}
            <div>Last Updated: <span
              className="font-medium transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {new Date(state.data.updated_at).toLocaleString()}
            </span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxDisplayPanel;
