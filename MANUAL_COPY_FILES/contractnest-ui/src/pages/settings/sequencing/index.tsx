// src/pages/settings/sequencing/index.tsx
// Sequence Numbers Settings Page - Configure auto-generated sequence formats
// Follows the same pattern as TaxSettings

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Hash,
  Edit2,
  RotateCcw,
  Save,
  X,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { sequenceService } from '@/services/sequenceService';
import type { SequenceConfig, SequenceStatus } from '@/services/serviceURLs';

// Entity type display names
const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  CONTACT: 'Contacts',
  CONTRACT: 'Contracts',
  INVOICE: 'Invoices',
  QUOTATION: 'Quotations',
  RECEIPT: 'Receipts',
  PROJECT: 'Projects',
  TASK: 'Tasks',
  TICKET: 'Support Tickets',
};

// Reset frequency display names
const RESET_FREQUENCY_LABELS: Record<string, string> = {
  never: 'Never',
  yearly: 'Yearly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

interface EditingState {
  id: string;
  prefix: string;
  suffix: string;
  padding: number;
  reset_frequency: 'never' | 'yearly' | 'monthly' | 'quarterly';
}

const SequencingSettingsPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const { toast } = useToast();

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // State
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<SequenceConfig[]>([]);
  const [statuses, setStatuses] = useState<SequenceStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EditingState | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SequencingSettings] Fetching sequence data...');

      // Fetch both configs and status in parallel
      const [configsData, statusData] = await Promise.all([
        sequenceService.getConfigs(),
        sequenceService.getStatus()
      ]);

      console.log('[SequencingSettings] Configs:', configsData);
      console.log('[SequencingSettings] Status:', statusData);

      setConfigs(configsData);
      setStatuses(statusData);
    } catch (err: any) {
      console.error('[SequencingSettings] Error fetching data:', err);
      setError(err.message || 'Failed to load sequence configurations');

      toast({
        title: 'Error',
        description: 'Failed to load sequence settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track page view
  useEffect(() => {
    try {
      analyticsService.trackPageView('settings/sequencing', 'Sequence Numbers Settings');
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, []);

  // Handle navigation back
  const handleGoBack = () => {
    navigate('/settings/configure');
  };

  // Start editing a config
  const handleEdit = (config: SequenceConfig) => {
    setEditingConfig({
      id: config.id,
      prefix: config.prefix,
      suffix: config.suffix || '',
      padding: config.padding,
      reset_frequency: config.reset_frequency,
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingConfig(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!editingConfig) return;

    try {
      setSaving(true);

      await sequenceService.updateConfig(editingConfig.id, {
        prefix: editingConfig.prefix,
        suffix: editingConfig.suffix || undefined,
        padding: editingConfig.padding,
        reset_frequency: editingConfig.reset_frequency,
      });

      toast({
        title: 'Success',
        description: 'Sequence configuration updated successfully.',
      });

      setEditingConfig(null);
      await fetchData();
    } catch (err: any) {
      console.error('[SequencingSettings] Error saving:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save changes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset a sequence
  const handleReset = async (entityType: string) => {
    try {
      setSaving(true);

      const result = await sequenceService.resetSequence(entityType);

      toast({
        title: 'Sequence Reset',
        description: `Reset from ${result.old_value} to ${result.new_value}`,
      });

      setResetConfirmId(null);
      await fetchData();
    } catch (err: any) {
      console.error('[SequencingSettings] Error resetting:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset sequence.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Generate preview of formatted sequence
  const generatePreview = (config: SequenceConfig | EditingState, currentValue: number = 1): string => {
    const padding = config.padding ?? 4;
    const prefix = config.prefix ?? '';
    const suffix = config.suffix || '';
    const paddedNumber = String(currentValue).padStart(padding, '0');
    return `${prefix}${paddedNumber}${suffix}`;
  };

  // Get status for an entity type
  const getStatusForEntity = (entityType: string): SequenceStatus | undefined => {
    return statuses.find(s => s.entity_type === entityType);
  };

  // Show loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px] transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <Loader2
          className="h-8 w-8 animate-spin transition-colors"
          style={{ color: colors.brand.primary }}
        />
      </div>
    );
  }

  return (
    <div
      className="p-6 transition-colors duration-200 min-h-screen"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoBack}
          className="mr-4 transition-colors"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText
          }}
        >
          <ArrowLeft
            className="h-5 w-5 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          />
        </Button>
        <div>
          <h1
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Sequence Numbers
          </h1>
          <p
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Configure auto-generated number formats for contacts, invoices, and more
          </p>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="ml-auto transition-colors"
          style={{
            borderColor: colors.utility.secondaryText + '40',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText
          }}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 p-4 border rounded-lg flex items-center gap-3"
          style={{
            backgroundColor: colors.semantic.error + '10',
            borderColor: colors.semantic.error + '30',
            color: colors.semantic.error
          }}
        >
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="ml-auto"
            style={{ borderColor: colors.semantic.error + '50' }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main content - Sequence configurations list */}
      <div
        className="rounded-lg border shadow-sm overflow-hidden"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-medium border-b"
          style={{
            backgroundColor: colors.utility.primaryBackground + '50',
            borderColor: colors.utility.primaryText + '20',
            color: colors.utility.secondaryText
          }}
        >
          <div className="col-span-2">Entity Type</div>
          <div className="col-span-2">Format</div>
          <div className="col-span-2">Preview</div>
          <div className="col-span-2">Current Value</div>
          <div className="col-span-2">Reset Frequency</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Sequence rows */}
        {configs.length === 0 ? (
          <div
            className="px-6 py-12 text-center"
            style={{ color: colors.utility.secondaryText }}
          >
            <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Sequences Configured</p>
            <p className="text-sm">Sequence configurations will appear here once set up.</p>
          </div>
        ) : (
          configs.map((config) => {
            const status = getStatusForEntity(config.entity_type);
            const isEditing = editingConfig?.id === config.id;
            const isResetting = resetConfirmId === config.entity_type;

            return (
              <div
                key={config.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b last:border-b-0 transition-colors"
                style={{
                  borderColor: colors.utility.primaryText + '10',
                  backgroundColor: isEditing ? colors.brand.primary + '05' : 'transparent'
                }}
              >
                {/* Entity Type */}
                <div className="col-span-2">
                  <div
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {ENTITY_DISPLAY_NAMES[config.entity_type] || config.entity_type}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    {config.entity_type}
                  </div>
                </div>

                {/* Format - Editable */}
                <div className="col-span-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Prefix"
                        value={editingConfig.prefix}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          prefix: e.target.value
                        })}
                        className="w-full px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          borderColor: colors.utility.primaryText + '30',
                          color: colors.utility.primaryText
                        }}
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          placeholder="Pad"
                          value={editingConfig.padding}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            padding: parseInt(e.target.value) || 4
                          })}
                          className="w-16 px-2 py-1 text-sm rounded border"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: colors.utility.primaryText + '30',
                            color: colors.utility.primaryText
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Suffix"
                          value={editingConfig.suffix}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            suffix: e.target.value
                          })}
                          className="flex-1 px-2 py-1 text-sm rounded border"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            borderColor: colors.utility.primaryText + '30',
                            color: colors.utility.primaryText
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm font-mono"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {config.prefix ?? ''}[{config.padding ?? 4} digits]{config.suffix || ''}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="col-span-2">
                  <div
                    className="font-mono text-sm px-2 py-1 rounded inline-block"
                    style={{
                      backgroundColor: colors.brand.primary + '10',
                      color: colors.brand.primary
                    }}
                  >
                    {isEditing
                      ? generatePreview(editingConfig, status?.current_value || 1)
                      : status?.next_formatted || generatePreview(config, (config.current_value ?? 0) + 1)
                    }
                  </div>
                </div>

                {/* Current Value */}
                <div className="col-span-2">
                  <div
                    className="font-mono text-sm"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {(config.current_value ?? 0).toLocaleString()}
                  </div>
                  {status?.last_reset_at && (
                    <div
                      className="text-xs mt-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      Last reset: {new Date(status.last_reset_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Reset Frequency - Editable */}
                <div className="col-span-2">
                  {isEditing ? (
                    <select
                      value={editingConfig.reset_frequency}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        reset_frequency: e.target.value as any
                      })}
                      className="w-full px-2 py-1 text-sm rounded border"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: colors.utility.primaryText + '30',
                        color: colors.utility.primaryText
                      }}
                    >
                      <option value="never">Never</option>
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  ) : (
                    <span
                      className="text-sm"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {RESET_FREQUENCY_LABELS[config.reset_frequency] || config.reset_frequency}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          backgroundColor: colors.brand.primary,
                          color: '#FFFFFF'
                        }}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : isResetting ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetConfirmId(null)}
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReset(config.entity_type)}
                        disabled={saving}
                        style={{
                          backgroundColor: colors.semantic.error,
                          color: '#FFFFFF'
                        }}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Confirm Reset'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                        title="Edit configuration"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetConfirmId(config.entity_type)}
                        title="Reset to start value"
                        style={{ color: colors.semantic.warning }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Help section */}
      <div
        className="mt-8 p-4 rounded-lg border"
        style={{
          backgroundColor: colors.utility.primaryBackground + '50',
          borderColor: colors.utility.primaryText + '20'
        }}
      >
        <h3
          className="font-medium mb-2"
          style={{ color: colors.utility.primaryText }}
        >
          About Sequence Numbers
        </h3>
        <ul
          className="text-sm space-y-1"
          style={{ color: colors.utility.secondaryText }}
        >
          <li>Sequence numbers are automatically generated when creating new records.</li>
          <li><strong>Prefix</strong>: Text that appears before the number (e.g., "CON-" for contacts).</li>
          <li><strong>Padding</strong>: Number of digits to pad with zeros (e.g., 4 digits = 0001, 0002...).</li>
          <li><strong>Suffix</strong>: Optional text that appears after the number.</li>
          <li><strong>Reset Frequency</strong>: When to restart the counter (yearly resets on Jan 1st).</li>
          <li><strong>Reset</strong>: Manually resets the counter back to the start value.</li>
        </ul>
      </div>

      {/* Status indicator */}
      {configs.length > 0 && (
        <div
          className="mt-4 flex items-center gap-2 text-sm"
          style={{ color: colors.utility.secondaryText }}
        >
          <CheckCircle className="h-4 w-4" style={{ color: colors.semantic.success }} />
          <span>{configs.length} sequence configurations active</span>
        </div>
      )}
    </div>
  );
};

export default SequencingSettingsPage;
