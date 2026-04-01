// Overlays Tab — context overlays grouped by type
import React from 'react';
import { MapPin } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  colors: any;
}

const OverlaysTab: React.FC<Props> = ({ summary, colors }) => {
  const groups = Object.entries(summary.overlays_by_type);
  const borderColor = colors.utility.secondaryText + '20';

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p>Context overlays adjust knowledge tree defaults based on <strong style={{ color: colors.utility.primaryText }}>climate, geography, and industry</strong>. These modify cycle frequencies, add checkpoints, or shift thresholds.</p>
      </VaNiBubble>

      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: colors.utility.secondaryText, opacity: 0.3 }} />
          <p style={{ fontSize: '13px', color: colors.utility.secondaryText }}>No context overlays defined for this equipment type</p>
        </div>
      ) : (
        groups.map(([contextType, overlays]) => (
          <div key={contextType} style={{
            background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px',
            padding: '18px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(0,0,0,.04)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: colors.utility.primaryText, textTransform: 'capitalize' as const }}>
              {contextType.replace(/_/g, ' ')} Overlays
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {overlays.map((o: any) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px',
                  borderRadius: '8px', background: colors.utility.primaryBackground,
                }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                    background: colors.semantic.error + '15', color: colors.semantic.error,
                    textTransform: 'capitalize' as const, whiteSpace: 'nowrap' as const,
                  }}>{o.context_value}</span>
                  <pre style={{
                    flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                    whiteSpace: 'pre-wrap' as const, color: colors.utility.primaryText, margin: 0,
                  }}>
                    {JSON.stringify(o.adjustments, null, 2)}
                  </pre>
                  <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: colors.utility.secondaryText }}>
                    P:{o.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OverlaysTab;
