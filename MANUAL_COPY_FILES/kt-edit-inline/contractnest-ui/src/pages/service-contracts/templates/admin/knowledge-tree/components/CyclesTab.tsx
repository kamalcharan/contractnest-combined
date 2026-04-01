// Service Cycles Tab — frequency dropdown, varies-by tags, editable alert, CRUD
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

const FREQ_OPTIONS = ['30 days', '45 days', '60 days', '90 days', '120 days', '180 days', '365 days', '500 hrs', '1000 hrs', '2000 hrs'];

interface Props {
  summary: KnowledgeTreeSummary;
  cycles: any[];
  onAdd: (data: Record<string, string>) => void;
  onRemove: (id: string, name: string) => void;
  onEditCycle: (id: string, data: Record<string, any>) => void;
  colors: any;
}

const CyclesTab: React.FC<Props> = ({ summary, cycles, onAdd, onRemove, onEditCycle, colors }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const borderColor = colors.utility.secondaryText + '20';
  const borderLt = colors.utility.secondaryText + '12';
  const brandPrimary = colors.brand.primary;

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>{cycles.length} service cycles</strong> for <span style={{ color: brandPrimary, fontWeight: 600 }}>{summary.resource_template.sub_category}</span>. Adjust frequencies and alert thresholds.</p>
      </VaNiBubble>

      {cycles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.utility.secondaryText, fontSize: '14px' }}>No service cycles defined</div>
      ) : (
        <>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 150px 1fr 28px', gap: '14px', alignItems: 'center', padding: '8px 18px', marginBottom: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.4px', color: colors.utility.secondaryText }}>
          <span>Checkpoint</span>
          <span>Frequency</span>
          <span>Varies By</span>
          <span>Alert (overdue)</span>
          <span />
        </div>
        {cycles.map((cy) => {
          const isCustom = cy.source === 'user_contributed';
          return (
            <div key={cy.id} style={{ background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '12px 18px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr 110px 150px 1fr 28px', gap: '14px', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText }}>
                  {cy.checkpoint_name || 'Custom Cycle'}
                  {isCustom && <span style={{ fontSize: '8px', marginLeft: '4px', color: colors.semantic.success, fontWeight: 700 }}>NEW</span>}
                </div>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>{cy.section_name}</div>
              </div>
              <select value={`${cy.frequency_value} ${cy.frequency_unit}`} onChange={(e) => {
                const parts = e.target.value.split(' ');
                const val = Number(parts[0]);
                const unit = parts[1] === 'hrs' ? 'hours' : parts[1];
                onEditCycle(cy.id, { frequency_value: val, frequency_unit: unit });
              }} style={{ width: '100%', padding: '5px 8px', border: `1px solid ${borderColor}`, borderRadius: '5px', fontFamily: 'inherit', fontSize: '12px', background: colors.utility.primaryBackground, color: colors.utility.primaryText, cursor: 'pointer' }}>
                <option value={`${cy.frequency_value} ${cy.frequency_unit}`}>{cy.frequency_value} {cy.frequency_unit}</option>
                {FREQ_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {(cy.varies_by || []).map((factor: string, i: number) => (
                  <span key={i} style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '3px', fontFamily: "'IBM Plex Mono', monospace", background: colors.utility.primaryBackground, border: `1px solid ${borderLt}`, color: colors.utility.secondaryText }}>{factor}</span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {cy.alert_overdue_days != null ? (
                  <>
                    <input type="number" value={cy.alert_overdue_days} onChange={(e) => onEditCycle(cy.id, { alert_overdue_days: e.target.value ? Number(e.target.value) : null })} style={{ width: '40px', padding: '2px 5px', border: `1px solid ${borderColor}`, borderRadius: '3px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', textAlign: 'center' as const, color: colors.utility.primaryText, background: colors.utility.primaryBackground }} />
                    <span>days</span>
                  </>
                ) : <span style={{ color: colors.utility.secondaryText + '60' }}>—</span>}
              </div>
              {isCustom ? (
                <button onClick={() => onRemove(cy.id, cy.checkpoint_name || 'Cycle')} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.semantic.error + '10', color: colors.semantic.error }} title="Remove">
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : <span />}
            </div>
          );
        })
        </>
      )}

      <button onClick={() => setShowAddModal(true)} style={{ background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '12px', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
        <Plus className="h-3.5 w-3.5" /> Add Cycle
      </button>

      {showAddModal && (
        <AddItemModal
          title="Add Service Cycle"
          fields={[
            { key: 'checkpoint_name', label: 'Checkpoint Name', type: 'text', placeholder: 'e.g. Coil Cleaning', required: true },
            { key: 'frequency_value', label: 'Frequency Value', type: 'number', placeholder: 'e.g. 90', required: true },
            { key: 'frequency_unit', label: 'Frequency Unit', type: 'select', required: true, options: [{ label: 'Days', value: 'days' }, { label: 'Hours', value: 'hours' }, { label: 'Visits', value: 'visits' }] },
            { key: 'alert_overdue_days', label: 'Alert After (days overdue)', type: 'number', placeholder: 'e.g. 7' },
            { key: 'section_name', label: 'Section', type: 'text', placeholder: 'e.g. Filter & Coils' },
          ]}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => { onAdd(data); setShowAddModal(false); }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default CyclesTab;
