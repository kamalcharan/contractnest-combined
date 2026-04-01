// Right Panel — VaNi Intelligence, KT Stats, Context, Service Activities, Nomenclatures
import React from 'react';
import type { KnowledgeTreeSummary } from '../types';

const ALL_ACTIVITIES = ['pm', 'repair', 'inspection', 'install', 'decommission'];
const ACTIVITY_LABELS: Record<string, string> = {
  pm: 'Preventive Maintenance', repair: 'Breakdown / Repair', inspection: 'Inspection / Audit',
  install: 'Installation', decommission: 'Decommissioning',
};
const NOMENCLATURES = ['AMC', 'CMC', 'CAMC', 'PMC', 'BMC', 'FMC', 'O&M', 'SLA'];

interface Props {
  summary: KnowledgeTreeSummary;
  selectedVariantCount: number;
  colors: any;
}

const RightPanel: React.FC<Props> = ({ summary, selectedVariantCount, colors }) => {
  const s = summary.summary;
  const rt = summary.resource_template;
  const activeActivities = new Set(s.service_activities || []);

  const cardStyle: React.CSSProperties = {
    background: '#faf9f7', border: '1px solid #edeae4', borderRadius: '10px',
    padding: '14px 16px', marginBottom: '12px',
  };
  const headStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '.8px', color: '#8a847a', marginBottom: '8px',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px',
  };

  return (
    <div className="overflow-y-auto" style={{ position: 'sticky', top: 0, maxHeight: 'calc(100vh - 140px)' }}>
      {/* VaNi Intelligence */}
      <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1a1816, #2a2520)', borderColor: '#333' }}>
        <h4 style={{ ...headStyle, color: '#6a6460' }}>VaNi Intelligence</h4>
        <div style={{ fontSize: '11px', color: '#8a847a', lineHeight: 1.6 }}>
          AI-researched, context-aware. Customized for{' '}
          <strong style={{ color: '#f0ece6' }}>{rt.sub_category}</strong> context.
          <br /><br />
          <span style={{ color: '#ff6b2b' }}>You review and decide. Add your own at every step.</span>
        </div>
      </div>

      {/* Knowledge Tree Stats */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Knowledge Tree</h4>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>Equipment</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#ff6b2b' }}>{rt.name}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>Variants</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{selectedVariantCount}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>Spare Parts</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{s.spare_parts_count}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>Checkpoints</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{s.checkpoints_count}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>Service Cycles</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{s.cycles_count}</span></div>
      </div>

      {/* Context Applied */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Context Applied</h4>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>📍 Category</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>{rt.sub_category}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>🏢 Scope</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>{rt.scope === 'cross_industry' ? 'Cross-Industry' : 'Industry Specific'}</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>📊 Groups</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>{s.component_groups.length} part groups</span></div>
        <div style={rowStyle}><span style={{ color: '#8a847a' }}>📐 Sections</span><span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>{s.sections.length} checkpoint sections</span></div>
      </div>

      {/* Service Activities */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Service Activities</h4>
        <div style={{ fontSize: '11px', lineHeight: 1.9 }}>
          {ALL_ACTIVITIES.map((act) => (
            <div key={act} style={{ color: activeActivities.has(act) ? '#16a34a' : '#bab4a8' }}>
              {activeActivities.has(act) ? '✓' : '✗'} {ACTIVITY_LABELS[act]}
            </div>
          ))}
        </div>
      </div>

      {/* Nomenclatures */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Nomenclatures</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {NOMENCLATURES.map((n) => (
            <span key={n} style={{
              fontSize: '9px', padding: '3px 7px', borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
              background: 'rgba(255,107,43,.08)', color: '#ff6b2b',
              border: '1px solid rgba(255,107,43,.2)',
            }}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
