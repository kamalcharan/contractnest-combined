// Variants Tab — toggle cards, selection counter, add variant
import React from 'react';
import { Plus } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  colors: any;
}

const VariantsTab: React.FC<Props> = ({ summary, selectedIds, onToggle, onToggleAll, colors }) => {
  const variants = summary.variants;
  const selCount = selectedIds.size;

  return (
    <div>
      <VaNiBubble>
        <p>I identified <strong>{variants.length} {summary.resource_template.name} variants</strong> for the knowledge tree.</p>
        <p>Select which variants to include. You can also <strong>add your own</strong> if something is missing.</p>
      </VaNiBubble>

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4">
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.utility.primaryText }}>
          {summary.resource_template.name} Variants
        </h3>
        <span style={{
          fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace",
          padding: '2px 10px', borderRadius: '16px',
          background: 'rgba(255,107,43,.08)', color: '#ff6b2b',
          border: '1px solid rgba(255,107,43,.2)',
        }}>
          {selCount}/{variants.length} selected
        </span>
        <button
          onClick={onToggleAll}
          style={{ fontSize: '12px', color: '#8a847a', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Toggle All
        </button>
        <button
          style={{
            marginLeft: 'auto', background: '#fff8f4', color: '#ff6b2b',
            border: '1px dashed rgba(255,107,43,.2)', fontSize: '12px', padding: '7px 16px',
            borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}
          onClick={() => alert('Add custom variant\n\nFields: Name, Description, Capacity Range')}
        >
          <Plus className="h-3.5 w-3.5" /> Add Variant
        </button>
      </div>

      {/* Variant grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {variants.map((v) => {
          const sel = selectedIds.has(v.id);
          return (
            <div
              key={v.id}
              onClick={() => onToggle(v.id)}
              style={{
                background: sel ? '#fff8f4' : '#fff',
                border: `1px solid ${sel ? '#ff6b2b' : '#e5e1db'}`,
                borderRadius: '10px', padding: '13px 16px',
                display: 'flex', gap: '10px', cursor: 'pointer',
                transition: '.2s',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0, marginTop: '1px',
                border: sel ? 'none' : '2px solid #e5e1db',
                background: sel ? '#ff6b2b' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: sel ? '#fff' : 'transparent',
                transition: '.15s',
              }}>
                ✓
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText, marginBottom: '1px' }}>{v.name}</div>
                {v.description && <div style={{ fontSize: '11px', color: '#8a847a', lineHeight: 1.4 }}>{v.description}</div>}
                {v.capacity_range && (
                  <div style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: '#bab4a8', marginTop: '3px' }}>
                    {v.capacity_range}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariantsTab;
