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

  return (
    <div>
      <VaNiBubble>
        <p>Context overlays adjust knowledge tree defaults based on <strong>climate, geography, and industry</strong>. These modify cycle frequencies, add checkpoints, or shift thresholds for specific contexts.</p>
      </VaNiBubble>

      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: '#bab4a8', opacity: 0.4 }} />
          <p style={{ fontSize: '13px', color: '#8a847a' }}>No context overlays defined for this equipment type</p>
        </div>
      ) : (
        groups.map(([contextType, overlays]) => (
          <div key={contextType} style={{
            background: '#fff', border: '1px solid #e5e1db', borderRadius: '10px',
            padding: '18px', marginBottom: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,.04)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: colors.utility.primaryText, textTransform: 'capitalize' as const }}>
              {contextType.replace(/_/g, ' ')} Overlays
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {overlays.map((o: any) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: '#f7f5f2' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                    background: '#dc262615', color: '#dc2626', textTransform: 'capitalize' as const,
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {o.context_value}
                  </span>
                  <pre style={{
                    flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                    whiteSpace: 'pre-wrap' as const, color: '#4a4540', margin: 0,
                  }}>
                    {JSON.stringify(o.adjustments, null, 2)}
                  </pre>
                  <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: '#bab4a8' }}>
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
