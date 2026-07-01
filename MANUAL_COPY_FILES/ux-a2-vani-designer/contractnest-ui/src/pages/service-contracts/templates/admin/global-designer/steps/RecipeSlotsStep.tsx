// src/pages/service-contracts/templates/admin/global-designer/steps/RecipeSlotsStep.tsx
//
// Manual Recipe Slots editor (UX-A2 · slice c). Hand-author the SAME
// `recipeSlots` the VaNi panel produces, so manual / AI / copy all converge on
// one slot shape. A recipe references slots (activity + asset + cadence +
// compliance), NOT block_ids; slots hydrate to the tenant's catalog at seed time.

import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, CalendarClock, Layers } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { GlobalDesignerWizardState, RecipeSlot } from '../types';

interface Props {
  state: GlobalDesignerWizardState;
  onUpdate: (updates: Partial<GlobalDesignerWizardState>) => void;
  onOpenVaNi: () => void;
}

const ACTIVITIES: { value: RecipeSlot['activity']; label: string }[] = [
  { value: 'pm', label: 'Preventive Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair / Breakdown' },
  { value: 'install', label: 'Installation' },
  { value: 'decommission', label: 'Decommission' },
  { value: 'spare_pool', label: 'Spare / Consumable Pool' },
];

let seq = 0;
const newId = () => `slot_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const RecipeSlotsStep: React.FC<Props> = ({ state, onUpdate, onOpenVaNi }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const slots = state.recipeSlots;
  const currency = state.contractDetails.currency || 'INR';
  const assetName = state.selectedAssetTypeNames[0] || 'Any';
  const assetId = state.selectedAssetTypeIds[0] || null;

  // Local draft text for comma-separated fields (commit on blur to avoid
  // controlled-array input churn while typing).
  const [drafts, setDrafts] = useState<Record<string, { compliance?: string; variants?: string }>>({});

  const patchSlot = (id: string, patch: Partial<RecipeSlot>) =>
    onUpdate({ recipeSlots: slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const removeSlot = (id: string) =>
    onUpdate({ recipeSlots: slots.filter((s) => s.id !== id) });

  const addSlot = () => {
    const slot: RecipeSlot = {
      id: newId(),
      activity: 'pm',
      label: 'New service slot',
      assetTypeName: assetName,
      assetTypeId: assetId,
      cadenceDays: 90,
      checkpointCount: 5,
      complianceStandards: [],
      priceHintMin: null,
      priceHintMax: null,
      currency,
      variantScope: 'all',
      accepted: true,
    };
    onUpdate({ recipeSlots: [...slots, slot] });
  };

  const parseList = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const numOrNull = (v: string) => {
    const n = parseInt(v, 10);
    return v.trim() === '' || Number.isNaN(n) ? null : n;
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${colors.utility.secondaryText}25`,
    background: colors.utility.primaryBackground,
    color: colors.utility.primaryText,
  };

  return (
    <div className="min-h-[60vh] px-4 py-8" style={{ backgroundColor: colors.utility.primaryBackground }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>Recipe Slots</h2>
            <p className="text-sm max-w-xl" style={{ color: colors.utility.secondaryText }}>
              Define the service slots this recipe offers. Slots hydrate to each tenant's own catalog blocks at seed
              time — so set <strong>what & how often</strong>, not tenant prices. Add by hand, or let VaNi draft them.
            </p>
          </div>
          <button
            onClick={onOpenVaNi}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff6b2b, #ff8f5a)' }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Design with VaNi
          </button>
        </div>

        {/* Empty state */}
        {slots.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-10 text-center" style={{ borderColor: `${colors.utility.secondaryText}22` }}>
            <Sparkles className="w-7 h-7 mx-auto mb-3" style={{ color: '#ff6b2b' }} />
            <div className="text-sm font-semibold mb-1" style={{ color: colors.utility.primaryText }}>No slots yet</div>
            <p className="text-[12px] mb-4" style={{ color: colors.utility.secondaryText }}>Add a slot manually, or generate a full set with VaNi.</p>
            <button onClick={addSlot} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ border: `1px solid ${colors.brand.primary}`, color: colors.brand.primary }}>
              <Plus className="w-3.5 h-3.5" /> Add slot
            </button>
          </div>
        )}

        {/* Slot editors */}
        {slots.map((slot, idx) => {
          const isAll = !Array.isArray(slot.variantScope);
          const draft = drafts[slot.id] || {};
          return (
            <div key={slot.id} className="rounded-xl border p-4" style={{ borderColor: `${colors.utility.secondaryText}20`, background: colors.utility.secondaryBackground }}>
              {/* Row 1: label + activity + remove */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold w-5 shrink-0" style={{ color: colors.utility.secondaryText }}>{idx + 1}</span>
                <input
                  value={slot.label}
                  onChange={(e) => patchSlot(slot.id, { label: e.target.value })}
                  placeholder="Slot name (e.g. Quarterly Preventive Maintenance)"
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold outline-none"
                  style={inputStyle}
                />
                <select
                  value={slot.activity}
                  onChange={(e) => patchSlot(slot.id, { activity: e.target.value as RecipeSlot['activity'] })}
                  className="px-2 py-2 rounded-lg text-[12px] outline-none"
                  style={inputStyle}
                >
                  {ACTIVITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <button onClick={() => removeSlot(slot.id)} className="p-2 rounded-lg" style={{ color: colors.semantic?.error || '#dc2626' }} title="Remove slot">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Row 2: cadence + checkpoints + price band */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {/* Cadence */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Cadence</label>
                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                      <input type="checkbox" checked={slot.cadenceDays == null} onChange={(e) => patchSlot(slot.id, { cadenceDays: e.target.checked ? null : 90 })} />
                      on-demand
                    </label>
                  </div>
                  {slot.cadenceDays != null && (
                    <div className="flex items-center gap-1 mt-1">
                      <CalendarClock className="w-3 h-3" style={{ color: colors.utility.secondaryText }} />
                      <input type="number" min={1} value={slot.cadenceDays} onChange={(e) => patchSlot(slot.id, { cadenceDays: numOrNull(e.target.value) ?? 1 })} className="w-16 px-2 py-1 rounded text-[12px] outline-none" style={inputStyle} />
                      <span className="text-[11px]" style={{ color: colors.utility.secondaryText }}>days</span>
                    </div>
                  )}
                </div>
                {/* Checkpoints */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Checkpoints</label>
                  <input type="number" min={0} value={slot.checkpointCount} onChange={(e) => patchSlot(slot.id, { checkpointCount: numOrNull(e.target.value) ?? 0 })} className="w-full px-2 py-1.5 rounded text-[12px] outline-none" style={inputStyle} />
                </div>
                {/* Price band min */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Band min ({currency})</label>
                  <input type="number" min={0} value={slot.priceHintMin ?? ''} placeholder="—" onChange={(e) => patchSlot(slot.id, { priceHintMin: numOrNull(e.target.value) })} className="w-full px-2 py-1.5 rounded text-[12px] outline-none" style={inputStyle} />
                </div>
                {/* Price band max */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Band max ({currency})</label>
                  <input type="number" min={0} value={slot.priceHintMax ?? ''} placeholder="—" onChange={(e) => patchSlot(slot.id, { priceHintMax: numOrNull(e.target.value) })} className="w-full px-2 py-1.5 rounded text-[12px] outline-none" style={inputStyle} />
                </div>
              </div>

              {/* Row 3: compliance + variant scope */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>Compliance (comma-separated)</label>
                  <input
                    value={draft.compliance ?? slot.complianceStandards.join(', ')}
                    onChange={(e) => setDrafts((d) => ({ ...d, [slot.id]: { ...d[slot.id], compliance: e.target.value } }))}
                    onBlur={(e) => { patchSlot(slot.id, { complianceStandards: parseList(e.target.value) }); setDrafts((d) => ({ ...d, [slot.id]: { ...d[slot.id], compliance: undefined } })); }}
                    placeholder="e.g. GMP, Cleanroom"
                    className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.utility.secondaryText }}>
                    <Layers className="w-3 h-3" /> Variant scope
                  </label>
                  {slot.activity === 'spare_pool' ? (
                    <div className="text-[11px] py-2" style={{ color: colors.utility.secondaryText }}>Applies to all variants (on-demand pool)</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px]" style={{ color: colors.utility.secondaryText }}>
                        <input type="checkbox" checked={isAll} onChange={(e) => patchSlot(slot.id, { variantScope: e.target.checked ? 'all' : [] })} />
                        All variants
                      </label>
                      {!isAll && (
                        <input
                          value={draft.variants ?? (slot.variantScope as string[]).join(', ')}
                          onChange={(e) => setDrafts((d) => ({ ...d, [slot.id]: { ...d[slot.id], variants: e.target.value } }))}
                          onBlur={(e) => { const list = parseList(e.target.value); patchSlot(slot.id, { variantScope: list.length ? list : 'all' }); setDrafts((d) => ({ ...d, [slot.id]: { ...d[slot.id], variants: undefined } })); }}
                          placeholder="e.g. VRF / VRV System, Chiller (Water-Cooled)"
                          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none"
                          style={inputStyle}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add another */}
        {slots.length > 0 && (
          <button onClick={addSlot} className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold border-2 border-dashed" style={{ borderColor: `${colors.brand.primary}40`, color: colors.brand.primary }}>
            <Plus className="w-4 h-4" /> Add slot
          </button>
        )}
      </div>
    </div>
  );
};

export default RecipeSlotsStep;
