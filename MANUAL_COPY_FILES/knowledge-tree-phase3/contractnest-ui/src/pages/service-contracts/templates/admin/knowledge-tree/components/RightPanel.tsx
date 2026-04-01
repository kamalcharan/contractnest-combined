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

  const borderColor = colors.utility.secondaryText + '15';
  const cardStyle: React.CSSProperties = {
    background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`,
    borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
  };
  const headStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '.8px', color: colors.utility.secondaryText, marginBottom: '8px',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px',
  };
  const labelStyle: React.CSSProperties = { color: colors.utility.secondaryText };
  const valueStyle: React.CSSProperties = { fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: colors.utility.primaryText };

  return (
    <div className="overflow-y-auto" style={{ position: 'sticky', top: 0, maxHeight: 'calc(100vh - 140px)' }}>
      {/* VaNi Intelligence — VaNi brand: intentionally dark, not theme-dependent */}
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
        <div style={rowStyle}><span style={labelStyle}>Equipment</span><span style={{ ...valueStyle, color: colors.brand.primary }}>{rt.name}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Variants</span><span style={valueStyle}>{selectedVariantCount}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Spare Parts</span><span style={valueStyle}>{s.spare_parts_count}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Checkpoints</span><span style={valueStyle}>{s.checkpoints_count}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Service Cycles</span><span style={valueStyle}>{s.cycles_count}</span></div>
      </div>

      {/* Context Applied */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Context Applied</h4>
        <div style={rowStyle}><span style={labelStyle}>📍 Category</span><span style={{ ...valueStyle, fontSize: '10px' }}>{rt.sub_category}</span></div>
        <div style={rowStyle}><span style={labelStyle}>🏢 Scope</span><span style={{ ...valueStyle, fontSize: '10px' }}>{rt.scope === 'cross_industry' ? 'Cross-Industry' : 'Industry Specific'}</span></div>
        <div style={rowStyle}><span style={labelStyle}>📊 Groups</span><span style={{ ...valueStyle, fontSize: '10px' }}>{s.component_groups.length} part groups</span></div>
        <div style={rowStyle}><span style={labelStyle}>📐 Sections</span><span style={{ ...valueStyle, fontSize: '10px' }}>{s.sections.length} checkpoint sections</span></div>
      </div>

      {/* Service Activities */}
      <div style={cardStyle}>
        <h4 style={headStyle}>Service Activities</h4>
        <div style={{ fontSize: '11px', lineHeight: 1.9 }}>
          {ALL_ACTIVITIES.map((act) => (
            <div key={act} style={{ color: activeActivities.has(act) ? colors.semantic.success : colors.utility.secondaryText + '60' }}>
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
              background: colors.brand.primary + '10', color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}25`,
            }}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
