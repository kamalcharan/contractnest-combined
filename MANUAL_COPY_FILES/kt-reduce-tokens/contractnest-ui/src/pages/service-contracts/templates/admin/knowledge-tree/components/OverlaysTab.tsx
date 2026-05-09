// components/OverlaysTab.tsx
import React from 'react';
import { MapPin, Plus, Loader2, RefreshCw, Thermometer, Globe, Building2 } from 'lucide-react';
import { useKnowledgeTreeOverlays } from '@/hooks/queries/useKnowledgeTree';
import type { KnowledgeTreeSummary } from '../types';

interface OverlaysTabProps {
  resourceTemplateId: string;
  summary: KnowledgeTreeSummary;
  colors: any;
  onGenerate: () => void;
  isGenerating: boolean;
}

const CONTEXT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  climate:        { label: 'Climate',        icon: <Thermometer className="h-3.5 w-3.5" />, color: '#f59e0b' },
  geography:      { label: 'Geography',      icon: <Globe className="h-3.5 w-3.5" />,       color: '#3b82f6' },
  industry_served:{ label: 'Industry',       icon: <Building2 className="h-3.5 w-3.5" />,   color: '#8b5cf6' },
};

const CONTEXT_VALUE_LABELS: Record<string, string> = {
  hot_humid:            'Hot & Humid',
  cold_dry:             'Cold & Dry',
  tropical:             'Tropical',
  arid:                 'Arid',
  monsoon:              'Monsoon',
  hot_humid_monsoon:    'Hot Humid Monsoon',
  coastal_salt_air:     'Coastal / Salt Air',
  dusty_industrial:     'Dusty Industrial',
  high_altitude:        'High Altitude',
  seismic_zone:         'Seismic Zone',
  pharma_cleanroom:     'Pharma Cleanroom',
  data_center:          'Data Center',
  healthcare_hospital:  'Healthcare / Hospital',
  food_processing:      'Food Processing',
};

const OverlaysTab: React.FC<OverlaysTabProps> = ({
  resourceTemplateId,
  summary,
  colors,
  onGenerate,
  isGenerating,
}) => {
  const { data: overlaysData, isLoading, refetch } = useKnowledgeTreeOverlays(resourceTemplateId);

  const overlays = overlaysData?.overlays ?? [];
  const borderColor = colors.utility.secondaryText + '15';
  const cardBg = colors.utility.secondaryBackground;

  const byType = overlays.reduce<Record<string, any[]>>((acc, o) => {
    const key = o.context_type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.utility.secondaryText }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            Context Overlays
            {overlays.length > 0 && (
              <span className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
                {overlays.length}
              </span>
            )}
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
            Frequency multipliers and additional actions for specific deployment environments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overlays.length > 0 && (
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-80"
              style={{ color: colors.utility.secondaryText, border: `1px solid ${borderColor}` }}
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: '#8b5cf610', color: '#8b5cf6', border: '1px solid #8b5cf630' }}
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {isGenerating ? 'Generating...' : overlays.length > 0 ? 'Regenerate Overlays' : 'Generate Overlays'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {overlays.length === 0 && !isGenerating && (
        <div
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-16 text-center"
          style={{ borderColor: '#8b5cf630' }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#8b5cf610' }}>
            <MapPin className="h-6 w-6" style={{ color: '#8b5cf6' }} />
          </div>
          <h4 className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
            No context overlays yet
          </h4>
          <p className="text-[12px] mb-4 max-w-xs" style={{ color: colors.utility.secondaryText }}>
            Generate overlays to define how service frequency and actions change for specific climates, geographies, and industries.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: '#8b5cf6', color: '#fff' }}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate Context Overlays'}
          </button>
        </div>
      )}

      {/* Overlays grouped by context_type */}
      {overlays.length > 0 && Object.entries(byType).map(([contextType, typeOverlays]) => {
        const config = CONTEXT_TYPE_CONFIG[contextType] || { label: contextType, icon: <MapPin className="h-3.5 w-3.5" />, color: '#6b7280' };
        return (
          <div key={contextType}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: config.color + '15', color: config.color }}>
                {config.icon}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
                {config.label} ({typeOverlays.length})
              </span>
            </div>

            {/* Cards */}
            <div className="grid gap-3">
              {typeOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: cardBg, borderColor }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: config.color + '15', color: config.color }}
                      >
                        {CONTEXT_VALUE_LABELS[overlay.context_value] || overlay.context_value}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                      style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}
                    >
                      ×{overlay.adjustments?.frequency_multiplier?.toFixed(1) ?? '—'}
                    </span>
                  </div>

                  {overlay.adjustments?.notes && (
                    <p className="text-[12px] mb-3 leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      {overlay.adjustments.notes}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {overlay.adjustments?.affected_checkpoints?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.utility.secondaryText }}>
                          Affected Checkpoints
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {overlay.adjustments.affected_checkpoints.map((cp: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, border: `1px solid ${borderColor}` }}
                            >
                              {cp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {overlay.adjustments?.additional_actions?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.utility.secondaryText }}>
                          Additional Actions
                        </p>
                        <ul className="space-y-0.5">
                          {overlay.adjustments.additional_actions.map((action: string, i: number) => (
                            <li key={i} className="text-[11px] flex gap-1.5 items-start" style={{ color: colors.utility.primaryText }}>
                              <span style={{ color: config.color, flexShrink: 0 }}>•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OverlaysTab;
