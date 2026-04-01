// Checkpoints Tab — condition values with severity, reading thresholds (editable inputs)
import React from 'react';
import { Plus } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import type { KnowledgeTreeSummary } from '../types';

const severityDot: Record<string, string> = { ok: '#16a34a', attention: '#d97706', critical: '#dc2626' };

interface Props {
  summary: KnowledgeTreeSummary;
  colors: any;
}

const CheckpointsTab: React.FC<Props> = ({ summary, colors }) => {
  const allCheckpoints = Object.values(summary.checkpoints_by_section).flat();
  const condCount = allCheckpoints.filter((c: any) => c.checkpoint_type === 'condition').length;
  const readCount = allCheckpoints.filter((c: any) => c.checkpoint_type === 'reading').length;

  return (
    <div>
      <VaNiBubble>
        <p><strong>{allCheckpoints.length} checkpoints</strong> — what the technician checks and records. Two types:{' '}
          <span style={{ background: '#fffbeb', color: '#d97706', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>CONDITION</span> (qualitative) and{' '}
          <span style={{ background: '#f0f4ff', color: '#2563eb', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>READING</span> (quantitative).</p>
        <p>Thresholds adjusted for <span style={{ color: '#ff6b2b', fontWeight: 600 }}>{summary.resource_template.sub_category}</span> context. Add your own checkpoints or values.</p>
      </VaNiBubble>

      {allCheckpoints.map((cp: any) => (
        <div key={cp.id} style={{
          background: '#fff', border: '1px solid #e5e1db', borderRadius: '10px',
          padding: '14px 18px', marginBottom: '10px',
          boxShadow: '0 2px 12px rgba(0,0,0,.04)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: colors.utility.primaryText }}>{cp.name}</span>
            <span style={{
              fontSize: '9px', fontWeight: 700, padding: '3px 9px', borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '.5px',
              background: cp.checkpoint_type === 'condition' ? '#fffbeb' : '#f0f4ff',
              color: cp.checkpoint_type === 'condition' ? '#d97706' : '#2563eb',
            }}>
              {cp.checkpoint_type}
            </span>
          </div>

          {/* Condition type: dropdown values */}
          {cp.checkpoint_type === 'condition' && (
            <>
              <div style={{ fontSize: '11px', color: '#8a847a', marginBottom: '4px' }}>
                Valid values (🟢 OK · 🟡 Attention · 🔴 Critical):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                {(cp.values || []).map((v: any) => (
                  <span key={v.id} style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: '5px',
                    border: '1px solid #e5e1db', background: '#faf9f7', color: '#4a4540',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: severityDot[v.severity] || '#999',
                    }} />
                    {v.label}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '6px' }}>
                <button onClick={() => alert(`Add custom value to: ${cp.name}`)} style={{
                  background: '#fff8f4', color: '#ff6b2b',
                  border: '1px dashed rgba(255,107,43,.2)', fontSize: '10px', padding: '4px 10px',
                  borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <Plus className="h-3 w-3" /> Add Value
                </button>
              </div>
            </>
          )}

          {/* Reading type: thresholds */}
          {cp.checkpoint_type === 'reading' && (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8a847a' }}>
                  <span style={{ fontWeight: 600, color: '#4a4540' }}>Unit:</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2563eb', fontWeight: 600 }}>{cp.unit || '—'}</span>
                </div>
                {cp.normal_min != null && cp.normal_max != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8a847a' }}>
                    <span style={{ fontWeight: 600, color: '#4a4540' }}>Normal:</span>
                    <input defaultValue={cp.normal_min} style={inputStyle} />
                    <span>–</span>
                    <input defaultValue={cp.normal_max} style={inputStyle} />
                    <span style={unitStyle}>{cp.unit}</span>
                  </div>
                )}
                {cp.amber_threshold != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 600, color: '#d97706' }}>⚠</span>
                    <input defaultValue={cp.amber_threshold} style={{ ...inputStyle, borderColor: '#d97706' }} />
                    <span style={unitStyle}>{cp.unit}</span>
                  </div>
                )}
                {cp.red_threshold != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>🔴</span>
                    <input defaultValue={cp.red_threshold} style={{ ...inputStyle, borderColor: '#dc2626' }} />
                    <span style={unitStyle}>{cp.unit}</span>
                  </div>
                )}
              </div>
              {cp.threshold_note && (
                <div style={{ fontSize: '10px', color: '#8a847a', marginTop: '4px', fontStyle: 'italic' }}>{cp.threshold_note}</div>
              )}
            </>
          )}
        </div>
      ))}

      {/* Add Checkpoint */}
      <button onClick={() => alert('Add custom checkpoint\n\nFields: Name, Type (Condition/Reading), Values or Unit+Thresholds')} style={{
        background: '#fff8f4', color: '#ff6b2b',
        border: '1px dashed rgba(255,107,43,.2)', fontSize: '12px', padding: '7px 16px',
        borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px',
      }}>
        <Plus className="h-3.5 w-3.5" /> Add Checkpoint
      </button>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '60px', padding: '3px 6px', border: '1px solid #e5e1db', borderRadius: '4px',
  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', textAlign: 'center' as const,
};

const unitStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#bab4a8',
};

export default CheckpointsTab;
