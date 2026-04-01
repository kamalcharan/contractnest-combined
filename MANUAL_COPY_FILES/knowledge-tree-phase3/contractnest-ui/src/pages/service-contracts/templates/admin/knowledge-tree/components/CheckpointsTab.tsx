// Checkpoints Tab — condition values with severity, reading thresholds, CRUD
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  checkpointsBySection: Record<string, any[]>;
  onAddCheckpoint: (data: Record<string, string>) => void;
  onAddValue: (checkpointId: string, sectionName: string, data: Record<string, string>) => void;
  colors: any;
}

const CheckpointsTab: React.FC<Props> = ({ summary, checkpointsBySection, onAddCheckpoint, onAddValue, colors }) => {
  const [showAddCpModal, setShowAddCpModal] = useState(false);
  const [addValueTarget, setAddValueTarget] = useState<{ cpId: string; section: string; cpName: string } | null>(null);

  const allCheckpoints = Object.values(checkpointsBySection).flat();
  const brandPrimary = colors.brand.primary;
  const borderColor = colors.utility.secondaryText + '20';

  const inputStyle: React.CSSProperties = {
    width: '60px', padding: '3px 6px', border: `1px solid ${borderColor}`, borderRadius: '4px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', textAlign: 'center' as const,
    color: colors.utility.primaryText, background: colors.utility.primaryBackground,
  };
  const unitStyle: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: colors.utility.secondaryText + '80' };

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>{allCheckpoints.length} checkpoints</strong> — two types:{' '}
          <span style={{ background: colors.semantic.warning + '15', color: colors.semantic.warning, padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>CONDITION</span> and{' '}
          <span style={{ background: (colors.semantic.info || '#2563eb') + '15', color: colors.semantic.info || '#2563eb', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>READING</span>.</p>
      </VaNiBubble>

      {Object.entries(checkpointsBySection).map(([sectionName, checkpoints]) => (
        <div key={sectionName}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: colors.utility.secondaryText, textTransform: 'uppercase' as const, letterSpacing: '.5px', margin: '16px 0 8px', paddingLeft: '2px' }}>{sectionName}</h4>
          {checkpoints.map((cp: any) => (
            <div key={cp.id} style={{ background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '10px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: colors.utility.primaryText }}>{cp.name}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 9px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '.5px', background: cp.checkpoint_type === 'condition' ? colors.semantic.warning + '15' : (colors.semantic.info || '#2563eb') + '15', color: cp.checkpoint_type === 'condition' ? colors.semantic.warning : (colors.semantic.info || '#2563eb') }}>
                  {cp.checkpoint_type}
                </span>
              </div>

              {cp.checkpoint_type === 'condition' && (
                <>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>Valid values (🟢 OK · 🟡 Attention · 🔴 Critical):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                    {(cp.values || []).map((v: any) => {
                      const dotColor = v.severity === 'ok' ? colors.semantic.success : v.severity === 'attention' ? colors.semantic.warning : colors.semantic.error;
                      return (
                        <span key={v.id} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', border: `1px solid ${borderColor}`, background: colors.utility.primaryBackground, color: colors.utility.primaryText, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
                          {v.label}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <button onClick={() => setAddValueTarget({ cpId: cp.id, section: sectionName, cpName: cp.name })} style={{ background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '10px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Plus className="h-3 w-3" /> Add Value
                    </button>
                  </div>
                </>
              )}

              {cp.checkpoint_type === 'reading' && (
                <>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.utility.secondaryText }}>
                      <span style={{ fontWeight: 600, color: colors.utility.primaryText }}>Unit:</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: colors.semantic.info || '#2563eb', fontWeight: 600 }}>{cp.unit || '—'}</span>
                    </div>
                    {cp.normal_min != null && cp.normal_max != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.utility.secondaryText }}>
                        <span style={{ fontWeight: 600, color: colors.utility.primaryText }}>Normal:</span>
                        <input defaultValue={cp.normal_min} style={inputStyle} /><span>–</span><input defaultValue={cp.normal_max} style={inputStyle} /><span style={unitStyle}>{cp.unit}</span>
                      </div>
                    )}
                    {cp.amber_threshold != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 600, color: colors.semantic.warning }}>⚠</span>
                        <input defaultValue={cp.amber_threshold} style={{ ...inputStyle, borderColor: colors.semantic.warning }} /><span style={unitStyle}>{cp.unit}</span>
                      </div>
                    )}
                    {cp.red_threshold != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 600, color: colors.semantic.error }}>🔴</span>
                        <input defaultValue={cp.red_threshold} style={{ ...inputStyle, borderColor: colors.semantic.error }} /><span style={unitStyle}>{cp.unit}</span>
                      </div>
                    )}
                  </div>
                  {cp.threshold_note && <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px', fontStyle: 'italic' }}>{cp.threshold_note}</div>}
                </>
              )}
            </div>
          ))}
        </div>
      ))}

      <button onClick={() => setShowAddCpModal(true)} style={{ background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '12px', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
        <Plus className="h-3.5 w-3.5" /> Add Checkpoint
      </button>

      {showAddCpModal && (
        <AddItemModal
          title="Add Checkpoint"
          fields={[
            { key: 'name', label: 'Checkpoint Name', type: 'text', placeholder: 'e.g. Belt Condition', required: true },
            { key: 'checkpoint_type', label: 'Type', type: 'select', required: true, options: [{ label: 'Condition (qualitative)', value: 'condition' }, { label: 'Reading (quantitative)', value: 'reading' }] },
            { key: 'section_name', label: 'Section', type: 'text', placeholder: 'e.g. Mechanical Checks' },
            { key: 'service_activity', label: 'Service Activity', type: 'select', options: [{ label: 'PM', value: 'pm' }, { label: 'Repair', value: 'repair' }, { label: 'Inspection', value: 'inspection' }, { label: 'Install', value: 'install' }, { label: 'Decommission', value: 'decommission' }] },
            { key: 'unit', label: 'Unit (readings only)', type: 'text', placeholder: 'e.g. °C, PSI, Amps' },
          ]}
          onClose={() => setShowAddCpModal(false)}
          onSave={(data) => { onAddCheckpoint(data); setShowAddCpModal(false); }}
          colors={colors}
        />
      )}

      {addValueTarget && (
        <AddItemModal
          title={`Add Value to "${addValueTarget.cpName}"`}
          fields={[
            { key: 'label', label: 'Value Label', type: 'text', placeholder: 'e.g. Clean, Damaged — replaced', required: true },
            { key: 'severity', label: 'Severity', type: 'select', required: true, options: [{ label: '🟢 OK', value: 'ok' }, { label: '🟡 Attention', value: 'attention' }, { label: '🔴 Critical', value: 'critical' }] },
          ]}
          onClose={() => setAddValueTarget(null)}
          onSave={(data) => { onAddValue(addValueTarget.cpId, addValueTarget.section, data); setAddValueTarget(null); }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default CheckpointsTab;
