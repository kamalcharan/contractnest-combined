// Checkpoints Tab — condition values with severity, reading thresholds, service_name badge, CRUD
import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Tag } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

const ACTIVITY_META: Record<string, { label: string; color: string; bg: string }> = {
  pm:           { label: 'PM',      color: '#16a34a', bg: '#16a34a15' },
  repair:       { label: 'Repair',  color: '#ea580c', bg: '#ea580c15' },
  inspection:   { label: 'Inspect', color: '#2563eb', bg: '#2563eb15' },
  install:      { label: 'Install', color: '#7c3aed', bg: '#7c3aed15' },
  decommission: { label: 'Decomm',  color: '#dc2626', bg: '#dc262615' },
};

const UNIT_OPTIONS = ['PSI', '°C', '°F', 'V', 'Amps', 'kW', 'Hz', 'RPM', 'Pa', 'bar', 'kPa', 'pH', 'mm', 'L/min', 'CFM', 'dB', '%', 'cmH2O', 'mGy'];

interface Props {
  summary: KnowledgeTreeSummary;
  checkpointsBySection: Record<string, any[]>;
  onAddCheckpoint: (data: Record<string, string>) => void;
  onAddValue: (checkpointId: string, sectionName: string, data: Record<string, string>) => void;
  onEditCheckpoint: (sectionName: string, checkpointId: string, data: Record<string, string>) => void;
  colors: any;
}

const CheckpointsTab: React.FC<Props> = ({ summary, checkpointsBySection, onAddCheckpoint, onAddValue, onEditCheckpoint, colors }) => {
  const [showAddCpModal, setShowAddCpModal] = useState(false);
  const [addValueTarget, setAddValueTarget] = useState<{ cpId: string; section: string; cpName: string } | null>(null);
  const [editingCheckpoint, setEditingCheckpoint] = useState<{ section: string; cp: any } | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const allCheckpoints = Object.values(checkpointsBySection).flat();
  const brandPrimary = colors.brand.primary;
  const borderColor = colors.utility.secondaryText + '20';

  const availableActivities = useMemo(() => {
    const acts = [...new Set(allCheckpoints.map((cp: any) => cp.service_activity).filter(Boolean))];
    return acts.sort();
  }, [allCheckpoints]);

  const filteredBySection = useMemo(() => {
    if (activityFilter === 'all') return checkpointsBySection;
    const result: Record<string, any[]> = {};
    Object.entries(checkpointsBySection).forEach(([section, cps]) => {
      const filtered = cps.filter((cp: any) => cp.service_activity === activityFilter);
      if (filtered.length > 0) result[section] = filtered;
    });
    return result;
  }, [checkpointsBySection, activityFilter]);

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
          <span style={{ background: (colors.semantic.info || '#2563eb') + '15', color: colors.semantic.info || '#2563eb', padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>READING</span>. Use "Generate Service Names" in the header to assign catalog-facing names per section.</p>
      </VaNiBubble>

      {/* Activity filter strip — only shown when multiple activities exist */}
      {availableActivities.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            onClick={() => setActivityFilter('all')}
            style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${activityFilter === 'all' ? brandPrimary : borderColor}`, background: activityFilter === 'all' ? brandPrimary + '15' : 'transparent', color: activityFilter === 'all' ? brandPrimary : colors.utility.secondaryText, fontWeight: activityFilter === 'all' ? 700 : 500, cursor: 'pointer', transition: 'all .15s' }}
          >
            All ({allCheckpoints.length})
          </button>
          {availableActivities.map((act) => {
            const meta = ACTIVITY_META[act] || { label: act, color: brandPrimary, bg: brandPrimary + '15' };
            const count = allCheckpoints.filter((cp: any) => cp.service_activity === act).length;
            const isActive = activityFilter === act;
            return (
              <button key={act}
                onClick={() => setActivityFilter(act)}
                style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${isActive ? meta.color : borderColor}`, background: isActive ? meta.bg : 'transparent', color: isActive ? meta.color : colors.utility.secondaryText, fontWeight: isActive ? 700 : 500, cursor: 'pointer', transition: 'all .15s' }}
              >
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {Object.entries(filteredBySection).map(([sectionName, checkpoints]) => {
        // service_name is the same for all checkpoints in a section — take from first
        const sectionServiceName = (checkpoints[0] as any)?.service_name;

        return (
          <div key={sectionName}>
            <div style={{ margin: '20px 0 10px', padding: '10px 16px', borderRadius: '8px', background: colors.utility.primaryBackground, borderLeft: `4px solid ${brandPrimary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: colors.utility.primaryText, textTransform: 'uppercase' as const, letterSpacing: '.5px', margin: 0 }}>{sectionName}</h4>
                {sectionServiceName && (
                  <span
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}
                    title="Catalog service name for this section"
                  >
                    <Tag style={{ width: '9px', height: '9px' }} />
                    {sectionServiceName}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>{checkpoints.length} checkpoints · {checkpoints.filter((c: any) => c.checkpoint_type === 'condition').length} condition · {checkpoints.filter((c: any) => c.checkpoint_type === 'reading').length} reading</span>
            </div>
            {checkpoints.map((cp: any) => (
              <div key={cp.id} style={{ background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '10px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: colors.utility.primaryText }}>{cp.name}</span>
                  <button onClick={() => setEditingCheckpoint({ section: sectionName, cp })} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: brandPrimary + '10', color: brandPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Edit checkpoint">
                    <Pencil className="h-3 w-3" />
                  </button>
                  {/* Activity badge — only shown when multiple activities exist */}
                  {availableActivities.length > 1 && cp.service_activity && (() => {
                    const meta = ACTIVITY_META[cp.service_activity] || { label: cp.service_activity, color: brandPrimary, bg: brandPrimary + '15' };
                    return <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace", background: meta.bg, color: meta.color }}>{meta.label}</span>;
                  })()}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.primaryText }}>Unit:</span>
                      <span style={{ padding: '4px 8px', border: `1px solid ${borderColor}`, borderRadius: '5px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 700, background: colors.utility.primaryBackground, color: colors.utility.primaryText }}>{cp.unit || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
                      {cp.normal_min != null && cp.normal_max != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.utility.secondaryText }}>
                          <span style={{ fontWeight: 600, color: colors.utility.primaryText }}>Normal:</span>
                          <input type="number" value={cp.normal_min} onChange={(e) => onEditCheckpoint(sectionName, cp.id, { normal_min: e.target.value })} style={inputStyle} /><span>–</span><input type="number" value={cp.normal_max} onChange={(e) => onEditCheckpoint(sectionName, cp.id, { normal_max: e.target.value })} style={inputStyle} /><span style={unitStyle}>{cp.unit}</span>
                        </div>
                      )}
                      {cp.amber_threshold != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 600, color: colors.semantic.warning }}>⚠</span>
                          <input type="number" value={cp.amber_threshold} onChange={(e) => onEditCheckpoint(sectionName, cp.id, { amber_threshold: e.target.value })} style={{ ...inputStyle, borderColor: colors.semantic.warning }} /><span style={unitStyle}>{cp.unit}</span>
                        </div>
                      )}
                      {cp.red_threshold != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 600, color: colors.semantic.error }}>🔴</span>
                          <input type="number" value={cp.red_threshold} onChange={(e) => onEditCheckpoint(sectionName, cp.id, { red_threshold: e.target.value })} style={{ ...inputStyle, borderColor: colors.semantic.error }} /><span style={unitStyle}>{cp.unit}</span>
                        </div>
                      )}
                    </div>
                    {cp.threshold_note && <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px', fontStyle: 'italic' }}>{cp.threshold_note}</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}

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
            { key: 'unit', label: 'Unit', type: 'select', showWhen: { field: 'checkpoint_type', value: 'reading' }, required: true, options: UNIT_OPTIONS.map((u) => ({ label: u, value: u })) },
            { key: 'normal_min', label: 'Normal Min', type: 'number', placeholder: 'e.g. 55', showWhen: { field: 'checkpoint_type', value: 'reading' } },
            { key: 'normal_max', label: 'Normal Max', type: 'number', placeholder: 'e.g. 130', showWhen: { field: 'checkpoint_type', value: 'reading' } },
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

      {editingCheckpoint && (
        <AddItemModal
          title={`Edit "${editingCheckpoint.cp.name}"`}
          fields={[
            { key: 'name', label: 'Checkpoint Name', type: 'text', required: true },
            { key: 'section_name', label: 'Section', type: 'text' },
            { key: 'service_name', label: 'Service Name (catalog)', type: 'text', placeholder: 'e.g. Filter & Coil Servicing' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'threshold_note', label: 'Threshold Note', type: 'textarea', placeholder: 'e.g. Compare with nameplate rating' },
          ]}
          initialData={{
            name: editingCheckpoint.cp.name,
            section_name: editingCheckpoint.section,
            service_name: editingCheckpoint.cp.service_name || '',
            description: editingCheckpoint.cp.description || '',
            threshold_note: editingCheckpoint.cp.threshold_note || '',
          }}
          onClose={() => setEditingCheckpoint(null)}
          onSave={(data) => { onEditCheckpoint(editingCheckpoint.section, editingCheckpoint.cp.id, data); setEditingCheckpoint(null); }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default CheckpointsTab;
