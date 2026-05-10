// Service Cycles Tab — frequency, catalog_name, pricing (min/median/max), varies-by tags, CRUD
import React, { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

const FREQ_OPTIONS = ['30 days', '45 days', '60 days', '90 days', '120 days', '180 days', '365 days', '500 hrs', '1000 hrs', '2000 hrs'];

const ACTIVITY_META: Record<string, { label: string; color: string; bg: string }> = {
  pm:           { label: 'PM',      color: '#16a34a', bg: '#16a34a15' },
  repair:       { label: 'Repair',  color: '#ea580c', bg: '#ea580c15' },
  inspection:   { label: 'Inspect', color: '#2563eb', bg: '#2563eb15' },
  install:      { label: 'Install', color: '#7c3aed', bg: '#7c3aed15' },
  decommission: { label: 'Decomm',  color: '#dc2626', bg: '#dc262615' },
};

function formatPrice(value: number | null | undefined, currency?: string | null): string {
  if (value == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'AED' ? 'AED ' : currency === 'EUR' ? '€' : '₹';
  return `${sym}${value.toLocaleString('en-IN')}`;
}

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
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const borderColor = colors.utility.secondaryText + '20';
  const borderLt = colors.utility.secondaryText + '12';
  const brandPrimary = colors.brand.primary;

  const availableActivities = useMemo(() => {
    const acts = [...new Set(cycles.map((cy: any) => cy.service_activity).filter(Boolean))];
    return acts.sort();
  }, [cycles]);

  const filteredCycles = useMemo(() => {
    if (activityFilter === 'all') return cycles;
    return cycles.filter((cy: any) => cy.service_activity === activityFilter);
  }, [cycles, activityFilter]);

  const hasPricingOnAny = cycles.some((cy: any) => cy.price_min != null || cy.price_median != null || cy.price_max != null);

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>{cycles.length} service cycles</strong> for <span style={{ color: brandPrimary, fontWeight: 600 }}>{summary.resource_template.sub_category}</span>. Use "Generate Pricing" in the header to auto-fill min/median/max pricing per cycle.</p>
      </VaNiBubble>

      {/* Activity filter strip */}
      {availableActivities.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            onClick={() => setActivityFilter('all')}
            style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${activityFilter === 'all' ? brandPrimary : borderColor}`, background: activityFilter === 'all' ? brandPrimary + '15' : 'transparent', color: activityFilter === 'all' ? brandPrimary : colors.utility.secondaryText, fontWeight: activityFilter === 'all' ? 700 : 500, cursor: 'pointer', transition: 'all .15s' }}
          >
            All ({cycles.length})
          </button>
          {availableActivities.map((act) => {
            const meta = ACTIVITY_META[act] || { label: act, color: brandPrimary, bg: brandPrimary + '15' };
            const count = cycles.filter((cy: any) => cy.service_activity === act).length;
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

      {filteredCycles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.utility.secondaryText, fontSize: '14px' }}>No service cycles defined</div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: hasPricingOnAny ? '1fr 110px 1fr 120px 100px 28px' : '1fr 110px 150px 1fr 28px',
            gap: '12px', alignItems: 'center', padding: '8px 18px', marginBottom: '6px',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.4px', color: colors.utility.secondaryText,
          }}>
            <span>Checkpoint / Catalog Name</span>
            <span>Frequency</span>
            {!hasPricingOnAny && <span>Varies By</span>}
            {hasPricingOnAny && <span>Varies By</span>}
            {hasPricingOnAny && <span>Pricing (min/med/max)</span>}
            <span>Alert (overdue)</span>
            <span />
          </div>

          {filteredCycles.map((cy) => {
            const isCustom = cy.source === 'user_contributed';
            const hasPricing = cy.price_min != null || cy.price_median != null || cy.price_max != null;
            const currency = cy.price_currency;

            return (
              <div key={cy.id} style={{
                background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px',
                padding: '12px 18px', marginBottom: '8px', boxShadow: '0 2px 12px rgba(0,0,0,.04)',
                display: 'grid',
                gridTemplateColumns: hasPricingOnAny ? '1fr 110px 1fr 120px 100px 28px' : '1fr 110px 150px 1fr 28px',
                gap: '12px', alignItems: 'center',
              }}>
                {/* Checkpoint + catalog name */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {cy.checkpoint_name || 'Custom Cycle'}
                    {isCustom && <span style={{ fontSize: '8px', color: colors.semantic.success, fontWeight: 700 }}>NEW</span>}
                    {availableActivities.length > 1 && cy.service_activity && (() => {
                      const meta = ACTIVITY_META[cy.service_activity] || { label: cy.service_activity, color: brandPrimary, bg: brandPrimary + '15' };
                      return <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', fontFamily: "'IBM Plex Mono', monospace", background: meta.bg, color: meta.color }}>{meta.label}</span>;
                    })()}
                  </div>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>{cy.section_name}</div>
                  {cy.catalog_name && (
                    <div style={{ fontSize: '10px', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#ec489912', color: '#ec4899', fontWeight: 600 }}>
                      🏷 {cy.catalog_name}
                    </div>
                  )}
                </div>

                {/* Frequency */}
                <select value={`${cy.frequency_value} ${cy.frequency_unit}`} onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  const val = Number(parts[0]);
                  const unit = parts[1] === 'hrs' ? 'hours' : parts[1];
                  onEditCycle(cy.id, { frequency_value: val, frequency_unit: unit });
                }} style={{ width: '100%', padding: '5px 8px', border: `1px solid ${borderColor}`, borderRadius: '5px', fontFamily: 'inherit', fontSize: '12px', background: colors.utility.primaryBackground, color: colors.utility.primaryText, cursor: 'pointer' }}>
                  <option value={`${cy.frequency_value} ${cy.frequency_unit}`}>{cy.frequency_value} {cy.frequency_unit}</option>
                  {FREQ_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                {/* Varies By */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {(cy.varies_by || []).map((factor: string, i: number) => (
                    <span key={i} style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '3px', fontFamily: "'IBM Plex Mono', monospace", background: colors.utility.primaryBackground, border: `1px solid ${borderLt}`, color: colors.utility.secondaryText }}>{factor}</span>
                  ))}
                </div>

                {/* Pricing (only shown when any cycle has pricing) */}
                {hasPricingOnAny && (
                  <div style={{ fontSize: '10px' }}>
                    {hasPricing ? (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1px' }}>
                        <span><span style={{ color: colors.utility.secondaryText }}>Min: </span><strong style={{ color: colors.semantic.success, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(cy.price_min, currency)}</strong></span>
                        <span><span style={{ color: colors.utility.secondaryText }}>Med: </span><strong style={{ color: colors.utility.primaryText, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(cy.price_median, currency)}</strong></span>
                        <span><span style={{ color: colors.utility.secondaryText }}>Max: </span><strong style={{ color: colors.semantic.error, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(cy.price_max, currency)}</strong></span>
                      </div>
                    ) : (
                      <span style={{ color: colors.utility.secondaryText + '60' }}>—</span>
                    )}
                  </div>
                )}

                {/* Alert overdue */}
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
          })}
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
