// Variants Tab — toggle cards, add/remove variants
import React, { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  variants: any[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAdd: (data: Record<string, string>) => void;
  onRemove: (id: string, name: string) => void;
  onEdit: (id: string, data: Record<string, string>) => void;
  colors: any;
}

const VariantsTab: React.FC<Props> = ({ summary, variants, selectedIds, onToggle, onToggleAll, onAdd, onRemove, onEdit, colors }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const selCount = selectedIds.size;
  const borderColor = colors.utility.secondaryText + '20';
  const brandPrimary = colors.brand.primary;

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>I identified {variants.length} {summary.resource_template.name} variants</strong> for the knowledge tree.</p>
        <p>Select which to include. You can <strong style={{ color: colors.utility.primaryText }}>add your own</strong> or remove any.</p>
      </VaNiBubble>

      <div className="flex items-center gap-3 mb-4">
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.utility.primaryText }}>{summary.resource_template.name} Variants</h3>
        <span style={{ fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", padding: '2px 10px', borderRadius: '16px', background: brandPrimary + '10', color: brandPrimary, border: `1px solid ${brandPrimary}25` }}>
          {selCount}/{variants.length} selected
        </span>
        <button onClick={onToggleAll} style={{ fontSize: '12px', color: colors.utility.secondaryText, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Toggle All</button>
        <button onClick={() => setShowAddModal(true)} style={{ marginLeft: 'auto', background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '12px', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Plus className="h-3.5 w-3.5" /> Add Variant
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {variants.map((v) => {
          const sel = selectedIds.has(v.id);
          const isCustom = v.source === 'user_contributed';
          return (
            <div key={v.id} style={{ background: sel ? brandPrimary + '06' : colors.utility.secondaryBackground, border: `1px solid ${sel ? brandPrimary : borderColor}`, borderRadius: '10px', padding: '13px 16px', display: 'flex', gap: '10px', cursor: 'pointer', transition: '.2s', position: 'relative' }}>
              <div onClick={() => onToggle(v.id)} style={{ width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0, marginTop: '1px', border: sel ? 'none' : `2px solid ${borderColor}`, background: sel ? brandPrimary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: sel ? '#fff' : 'transparent', transition: '.15s' }}>✓</div>
              <div style={{ flex: 1 }} onClick={() => onToggle(v.id)}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText, marginBottom: '1px' }}>
                  {v.name}
                  {isCustom && <span style={{ fontSize: '9px', marginLeft: '6px', padding: '1px 5px', borderRadius: '3px', background: colors.semantic.success + '15', color: colors.semantic.success, fontWeight: 700 }}>CUSTOM</span>}
                </div>
                {v.description && <div style={{ fontSize: '11px', color: colors.utility.secondaryText, lineHeight: 1.4 }}>{v.description}</div>}
                {v.capacity_range && <div style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: colors.utility.secondaryText + '80', marginTop: '3px' }}>{v.capacity_range}</div>}
              </div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                <button onClick={(e) => { e.stopPropagation(); setEditingVariant(v); }} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: brandPrimary + '10', color: brandPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit variant">
                  <Pencil className="h-3 w-3" />
                </button>
                {isCustom && (
                  <button onClick={(e) => { e.stopPropagation(); onRemove(v.id, v.name); }} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: colors.semantic.error + '10', color: colors.semantic.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove variant">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <AddItemModal
          title="Add Variant"
          fields={[
            { key: 'name', label: 'Variant Name', type: 'text', placeholder: 'e.g. Split AC / Room AC', required: true },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this variant' },
            { key: 'capacity_range', label: 'Capacity Range', type: 'text', placeholder: 'e.g. 0.75–2.5 TR' },
          ]}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => { onAdd(data); setShowAddModal(false); }}
          colors={colors}
        />
      )}

      {editingVariant && (
        <AddItemModal
          title={`Edit "${editingVariant.name}"`}
          fields={[
            { key: 'name', label: 'Variant Name', type: 'text', placeholder: 'e.g. Split AC / Room AC', required: true },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this variant' },
            { key: 'capacity_range', label: 'Capacity Range', type: 'text', placeholder: 'e.g. 0.75–2.5 TR' },
          ]}
          initialData={{ name: editingVariant.name, description: editingVariant.description || '', capacity_range: editingVariant.capacity_range || '' }}
          onClose={() => setEditingVariant(null)}
          onSave={(data) => { onEdit(editingVariant.id, data); setEditingVariant(null); }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default VariantsTab;
