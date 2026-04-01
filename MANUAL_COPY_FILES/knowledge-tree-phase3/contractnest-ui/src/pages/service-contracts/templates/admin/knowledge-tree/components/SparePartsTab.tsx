// Spare Parts Tab — collapsible groups with variant toggle matrix (● / ○)
import React from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import type { KnowledgeTreeSummary } from '../types';

const GROUP_ICONS: Record<string, string> = {
  electrical: '⚡', mechanical: '⚙️', refrigerant: '🧊', filters: '🌀',
  water_side: '💧', controls: '🖥️', consumables: '🧴',
};

interface Props {
  summary: KnowledgeTreeSummary;
  selectedVariantIds: Set<string>;
  colors: any;
  expandedGroups: Set<string>;
  toggleGroup: (k: string) => void;
}

const SparePartsTab: React.FC<Props> = ({ summary, selectedVariantIds, colors, expandedGroups, toggleGroup }) => {
  const groups = Object.entries(summary.spare_parts_by_group);
  const selectedVariants = summary.variants.filter((v) => selectedVariantIds.has(v.id));

  // Build short variant labels (first 4 chars)
  const variantShortNames = selectedVariants.map((v) => {
    const words = v.name.split(/[\s/]+/);
    return words[0].substring(0, 4);
  });

  return (
    <div>
      <VaNiBubble>
        <p>Spare parts mapped across <strong>{selectedVariants.length} variants</strong>, grouped by component type. <span style={{ color: '#ff6b2b', fontWeight: 600 }}>●</span> = recommended for that variant. Toggle as needed.</p>
        <p>You can <strong>add your own parts</strong> to any group.</p>
      </VaNiBubble>

      {groups.map(([groupName, parts]) => {
        const isOpen = expandedGroups.has(groupName);
        return (
          <div key={groupName} style={{ background: '#fff', border: '1px solid #e5e1db', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
            {/* Group header */}
            <div
              onClick={() => toggleGroup(groupName)}
              style={{
                padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '9px',
                cursor: 'pointer', background: '#faf9f7', borderBottom: isOpen ? '1px solid #edeae4' : 'none',
              }}
            >
              <span style={{ fontSize: '16px' }}>{GROUP_ICONS[groupName] || '📦'}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: colors.utility.primaryText, textTransform: 'capitalize' as const }}>
                {groupName.replace(/_/g, ' ')}
              </span>
              <span style={{
                fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: '#8a847a',
                background: '#edeae4', padding: '2px 7px', borderRadius: '8px',
              }}>
                {parts.length}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: '#8a847a' }} /> : <ChevronDown className="h-4 w-4" style={{ color: '#8a847a' }} />}
            </div>

            {/* Group body — variant matrix */}
            {isOpen && (
              <div>
                {/* Column headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: `1fr repeat(${selectedVariants.length}, 30px)`,
                  padding: '8px 16px', gap: '3px', alignItems: 'center',
                  borderBottom: '1px solid #e5e1db', background: '#f7f5f2',
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.4px', color: '#8a847a',
                }}>
                  <span>Part Name</span>
                  {variantShortNames.map((name, i) => (
                    <span key={i} style={{ textAlign: 'center' }}>{name}</span>
                  ))}
                </div>

                {/* Part rows */}
                {parts.map((part: any) => (
                  <div
                    key={part.id}
                    style={{
                      display: 'grid', gridTemplateColumns: `1fr repeat(${selectedVariants.length}, 30px)`,
                      padding: '7px 16px', gap: '3px', alignItems: 'center',
                      borderBottom: '1px solid #edeae4', fontSize: '12px',
                    }}
                  >
                    <span style={{ color: colors.utility.primaryText }}>{part.name}</span>
                    {selectedVariants.map((variant) => {
                      const mapped = (part.variant_applicability || []).some(
                        (va: any) => va.variant_id === variant.id
                      );
                      return (
                        <button
                          key={variant.id}
                          style={{
                            width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', transition: '.15s',
                            background: mapped ? 'rgba(255,107,43,.08)' : 'transparent',
                            color: mapped ? '#ff6b2b' : '#e5e1db',
                          }}
                          title={`${part.name} → ${variant.name}`}
                        >
                          {mapped ? '●' : '○'}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Add part */}
                <div style={{ padding: '6px 16px' }}>
                  <button
                    onClick={() => alert(`Add custom part to ${groupName}`)}
                    style={{
                      background: '#fff8f4', color: '#ff6b2b',
                      border: '1px dashed rgba(255,107,43,.2)', fontSize: '10px', padding: '4px 10px',
                      borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <Plus className="h-3 w-3" /> Add Part
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SparePartsTab;
