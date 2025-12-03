// src/pages/settings/sequencing/index.tsx
// Sequence Numbers Settings Page - Card-based UI design
// Similar to Contacts list layout

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
  CheckCircle,
  Users,
  FileText,
  Receipt,
  FileQuestion,
  CreditCard,
  Folder,
  CheckSquare,
  Ticket,
  MoreHorizontal,
  Eye,
  Grid3X3,
  List
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { analyticsService } from '@/services/analytics.service';
import { sequenceService } from '@/services/sequenceService';
import {
  TenantSeedService,
  ENTITY_DISPLAY_NAMES,
  RESET_FREQUENCY_OPTIONS,
  getSequenceColor,
  getSequenceIcon
} from '@/services/TenantSeedService';
import type { SequenceConfig, SequenceStatus } from '@/services/serviceURLs';

// Icon mapping for sequence types
const ENTITY_ICONS: Record<string, any> = {
  CONTACT: Users,
  CONTRACT: FileText,
  INVOICE: Receipt,
  QUOTATION: FileQuestion,
  RECEIPT: CreditCard,
  PROJECT: Folder,
  TASK: CheckSquare,
  TICKET: Ticket,
};

// Reset frequency display names
const RESET_FREQUENCY_LABELS: Record<string, string> = {
  never: 'Never',
  yearly: 'Yearly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  NEVER: 'Never',
  YEARLY: 'Yearly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
};

interface EditingState {
  id: string;
  prefix: string;
  suffix: string;
  padding: number;
  start_value: number;
  reset_frequency: 'never' | 'yearly' | 'monthly' | 'quarterly';
}

type ViewType = 'grid' | 'list';

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
  const [seeding, setSeeding] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EditingState | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('grid');

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
      prefix: config.prefix || '',
      suffix: config.suffix || '',
      padding: config.padding ?? 4,
      start_value: config.start_value ?? 1,
      reset_frequency: (config.reset_frequency?.toLowerCase() || 'never') as any,
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
        start_value: editingConfig.start_value,
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

  // Seed default sequences
  const handleSeedSequences = async () => {
    try {
      setSeeding(true);

      // Call the seed API through TenantSeedService
      const result = await TenantSeedService.seedSequences();

      toast({
        title: 'Sequences Seeded',
        description: `Successfully seeded ${result.seeded_count || 0} sequence types for both Live and Test environments.`,
      });

      await fetchData();
    } catch (err: any) {
      console.error('[SequencingSettings] Error seeding:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to seed sequences.',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
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
    return statuses.find(s => s.entity_type?.toUpperCase() === entityType?.toUpperCase());
  };

  // Get icon component for entity type
  const getEntityIcon = (entityType: string) => {
    return ENTITY_ICONS[entityType?.toUpperCase()] || Hash;
  };

  // Get display name for entity type
  const getEntityDisplayName = (entityType: string): string => {
    return ENTITY_DISPLAY_NAMES[entityType?.toUpperCase()] || entityType || 'Unknown';
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="transition-colors"
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
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div
            className="flex rounded-lg p-0.5"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          >
            <button
              onClick={() => setViewType('grid')}
              className="p-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'grid'
                  ? colors.utility.primaryBackground
                  : 'transparent',
                color: viewType === 'grid'
                  ? colors.utility.primaryText
                  : colors.utility.secondaryText
              }}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className="p-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: viewType === 'list'
                  ? colors.utility.primaryBackground
                  : 'transparent',
                color: viewType === 'list'
                  ? colors.utility.primaryText
                  : colors.utility.secondaryText
              }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="transition-colors"
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

      {/* Empty state */}
      {configs.length === 0 ? (
        <div
          className="rounded-lg shadow-sm border p-12 text-center transition-colors"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '20'
          }}
        >
          <Hash
            className="h-16 w-16 mx-auto mb-4"
            style={{ color: colors.utility.secondaryText }}
          />
          <h3
            className="text-lg font-medium mb-2 transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            No Sequences Configured
          </h3>
          <p
            className="mb-6 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Sequence numbers haven't been set up yet. Click the button below to initialize
            default sequences for both Live and Test environments.
          </p>
          <Button
            onClick={handleSeedSequences}
            disabled={seeding}
            className="transition-colors"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#FFFFFF'
            }}
          >
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Seeding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Initialize Default Sequences
              </>
            )}
          </Button>
          <p
            className="mt-4 text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            This will create sequence configurations for Contacts, Contracts, Invoices,
            Quotations, Receipts, Projects, Tasks, and Tickets.
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid/List View */}
          <div className={`
            ${viewType === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'space-y-3'
            }
          `}>
            {configs.map((config) => {
              const status = getStatusForEntity(config.entity_type || config.code);
              const isEditing = editingConfig?.id === config.id;
              const isResetting = resetConfirmId === (config.entity_type || config.code);
              const IconComponent = getEntityIcon(config.entity_type || config.code);
              const entityColor = config.hexcolor || getSequenceColor(config.entity_type || config.code);

              return viewType === 'grid' ? (
                // GRID VIEW - Card Layout
                <div
                  key={config.id}
                  className={`rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 flex flex-col ${
                    isEditing ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20',
                    '--tw-ring-color': colors.brand.primary,
                    minHeight: '280px'
                  } as React.CSSProperties}
                >
                  {/* Card Header */}
                  <div className="p-4 flex-none">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: entityColor + '20',
                          color: entityColor
                        }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: colors.semantic.success + '20',
                          color: colors.semantic.success
                        }}
                      >
                        Active
                      </span>
                    </div>

                    <h3
                      className="font-semibold text-lg transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {getEntityDisplayName(config.entity_type || config.code)}
                    </h3>
                    <p
                      className="text-sm mt-1"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {config.entity_type || config.code}
                    </p>
                  </div>

                  {/* Card Content */}
                  <div className="px-4 flex-grow">
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Prefix
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., CT-"
                            value={editingConfig.prefix}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              prefix: e.target.value
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.utility.primaryText + '30',
                              color: colors.utility.primaryText
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                              Padding
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editingConfig.padding}
                              onChange={(e) => setEditingConfig({
                                ...editingConfig,
                                padding: parseInt(e.target.value) || 4
                              })}
                              className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: colors.utility.primaryText + '30',
                                color: colors.utility.primaryText
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                              Suffix
                            </label>
                            <input
                              type="text"
                              placeholder="Optional"
                              value={editingConfig.suffix}
                              onChange={(e) => setEditingConfig({
                                ...editingConfig,
                                suffix: e.target.value
                              })}
                              className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: colors.utility.primaryText + '30',
                                color: colors.utility.primaryText
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                              Start Value
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editingConfig.start_value}
                              onChange={(e) => setEditingConfig({
                                ...editingConfig,
                                start_value: parseInt(e.target.value) || 1
                              })}
                              className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                              style={{
                                backgroundColor: colors.utility.primaryBackground,
                                borderColor: colors.utility.primaryText + '30',
                                color: colors.utility.primaryText
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                              Reset Frequency
                            </label>
                            <select
                              value={editingConfig.reset_frequency}
                              onChange={(e) => setEditingConfig({
                                ...editingConfig,
                                reset_frequency: e.target.value as any
                              })}
                              className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
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
                        </div>
                      </div>
                    </div>
                    ) : (
                      // View Mode
                      <div className="space-y-3">
                        {/* Preview */}
                        <div>
                          <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                            Next Number
                          </span>
                          <div
                            className="font-mono text-lg font-semibold px-3 py-2 rounded-lg mt-1"
                            style={{
                              backgroundColor: entityColor + '10',
                              color: entityColor
                            }}
                          >
                            {status?.next_formatted || generatePreview(config, (config.current_value ?? 0) + 1)}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4">
                          <div>
                            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                              Current
                            </span>
                            <p className="font-semibold" style={{ color: colors.utility.primaryText }}>
                              {(config.current_value ?? status?.current_value ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                              Reset
                            </span>
                            <p className="font-semibold" style={{ color: colors.utility.primaryText }}>
                              {RESET_FREQUENCY_LABELS[config.reset_frequency] || config.reset_frequency || 'Never'}
                            </p>
                          </div>
                        </div>

                        {/* Format Info */}
                        <div
                          className="text-sm font-mono px-2 py-1 rounded"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            color: colors.utility.secondaryText
                          }}
                        >
                          {config.prefix || '(no prefix)'}
                          [{config.padding ?? 4} digits]
                          {config.suffix || ''}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div
                    className="p-4 border-t flex-none"
                    style={{ borderColor: colors.utility.primaryText + '10' }}
                  >
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="flex-1"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1"
                          style={{
                            backgroundColor: colors.brand.primary,
                            color: '#FFFFFF'
                          }}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    ) : isResetting ? (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetConfirmId(null)}
                          className="flex-1"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReset(config.entity_type || config.code)}
                          disabled={saving}
                          className="flex-1"
                          style={{
                            backgroundColor: colors.semantic.error,
                            color: '#FFFFFF'
                          }}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : null}
                          Confirm Reset
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                              backgroundColor: colors.brand.primary,
                              color: '#FFFFFF'
                            }}
                            title="Edit configuration"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setResetConfirmId(config.entity_type || config.code)}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                              backgroundColor: colors.semantic.warning + '20',
                              color: colors.semantic.warning
                            }}
                            title="Reset counter"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          className="p-2 rounded-lg hover:opacity-80 transition-colors"
                          style={{ color: colors.utility.secondaryText }}
                          title="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // LIST VIEW
                <div
                  key={config.id}
                  className={`rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 p-4 ${
                    isEditing ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderColor: colors.utility.primaryText + '20',
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: entityColor + '20',
                        color: entityColor
                      }}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>

                    {/* Name & Code */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-semibold transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {getEntityDisplayName(config.entity_type || config.code)}
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {config.entity_type || config.code}
                      </p>
                    </div>

                    {/* Format */}
                    <div className="hidden md:block min-w-[150px]">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Format
                      </span>
                      <p
                        className="font-mono text-sm"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {config.prefix || ''}[{config.padding ?? 4}]{config.suffix || ''}
                      </p>
                    </div>

                    {/* Next Number */}
                    <div className="hidden lg:block min-w-[120px]">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Next Number
                      </span>
                      <p
                        className="font-mono font-semibold"
                        style={{ color: entityColor }}
                      >
                        {status?.next_formatted || generatePreview(config, (config.current_value ?? 0) + 1)}
                      </p>
                    </div>

                    {/* Current Value */}
                    <div className="hidden md:block min-w-[80px] text-right">
                      <span className="text-xs" style={{ color: colors.utility.secondaryText }}>
                        Current
                      </span>
                      <p
                        className="font-semibold"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {(config.current_value ?? status?.current_value ?? 0).toLocaleString()}
                      </p>
                    </div>

                    {/* Reset Frequency */}
                    <div className="hidden lg:block min-w-[80px]">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: colors.utility.secondaryText + '20',
                          color: colors.utility.secondaryText
                        }}
                      >
                        {RESET_FREQUENCY_LABELS[config.reset_frequency] || 'Never'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(config)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: colors.brand.primary,
                          color: '#FFFFFF'
                        }}
                        title="Edit configuration"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setResetConfirmId(config.entity_type || config.code)}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: colors.semantic.warning + '20',
                          color: colors.semantic.warning
                        }}
                        title="Reset counter"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Edit Mode for List View */}
                  {isEditing && (
                    <div
                      className="mt-4 pt-4 border-t"
                      style={{ borderColor: colors.utility.primaryText + '10' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Prefix
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., CT-"
                            value={editingConfig.prefix}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              prefix: e.target.value
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.utility.primaryText + '30',
                              color: colors.utility.primaryText
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Start Value
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingConfig.start_value}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              start_value: parseInt(e.target.value) || 1
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.utility.primaryText + '30',
                              color: colors.utility.primaryText
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Padding (digits)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editingConfig.padding}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              padding: parseInt(e.target.value) || 4
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.utility.primaryText + '30',
                              color: colors.utility.primaryText
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Suffix (optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={editingConfig.suffix}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              suffix: e.target.value
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
                            style={{
                              backgroundColor: colors.utility.primaryBackground,
                              borderColor: colors.utility.primaryText + '30',
                              color: colors.utility.primaryText
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                            Reset Frequency
                          </label>
                          <select
                            value={editingConfig.reset_frequency}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              reset_frequency: e.target.value as any
                            })}
                            className="w-full px-3 py-2 text-sm rounded-lg border mt-1"
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
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          style={{ color: colors.utility.secondaryText }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
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
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reset Confirmation for List View */}
                  {isResetting && (
                    <div
                      className="mt-4 pt-4 border-t flex items-center justify-between"
                      style={{ borderColor: colors.semantic.error + '30' }}
                    >
                      <span style={{ color: colors.semantic.error }}>
                        Are you sure you want to reset this sequence counter?
                      </span>
                      <div className="flex gap-2">
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
                          onClick={() => handleReset(config.entity_type || config.code)}
                          disabled={saving}
                          style={{
                            backgroundColor: colors.semantic.error,
                            color: '#FFFFFF'
                          }}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : null}
                          Confirm Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

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
          <li><strong>Prefix</strong>: Text that appears before the number (e.g., "CT-" for contacts).</li>
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
