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
  const variantShortNames = selectedVariants.map((v) => v.name.split(/[\s/]+/)[0].substring(0, 4));

  const borderColor = colors.utility.secondaryText + '20';
  const borderLt = colors.utility.secondaryText + '12';
  const brandPrimary = colors.brand.primary;

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p>Spare parts mapped across <strong style={{ color: colors.utility.primaryText }}>{selectedVariants.length} variants</strong>, grouped by component type. <span style={{ color: brandPrimary, fontWeight: 600 }}>●</span> = recommended for that variant. Toggle as needed.</p>
        <p>You can <strong style={{ color: colors.utility.primaryText }}>add your own parts</strong> to any group.</p>
      </VaNiBubble>

      {groups.map(([groupName, parts]) => {
        const isOpen = expandedGroups.has(groupName);
        return (
          <div key={groupName} style={{ background: colors.utility.secondaryBackground, border: `1px solid ${borderColor}`, borderRadius: '10px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
            {/* Group header */}
            <div
              onClick={() => toggleGroup(groupName)}
              style={{
                padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '9px',
                cursor: 'pointer', background: colors.utility.primaryBackground,
                borderBottom: isOpen ? `1px solid ${borderLt}` : 'none',
              }}
            >
              <span style={{ fontSize: '16px' }}>{GROUP_ICONS[groupName] || '📦'}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: colors.utility.primaryText, textTransform: 'capitalize' as const }}>
                {groupName.replace(/_/g, ' ')}
              </span>
              <span style={{
                fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: colors.utility.secondaryText,
                background: borderLt, padding: '2px 7px', borderRadius: '8px',
              }}>
                {parts.length}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: colors.utility.secondaryText }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.utility.secondaryText }} />}
            </div>

            {/* Group body — variant matrix */}
            {isOpen && (
              <div>
                {/* Column headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: `1fr repeat(${selectedVariants.length}, 30px)`,
                  padding: '8px 16px', gap: '3px', alignItems: 'center',
                  borderBottom: `1px solid ${borderColor}`, background: colors.utility.primaryBackground,
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.4px', color: colors.utility.secondaryText,
                }}>
                  <span>Part Name</span>
                  {variantShortNames.map((name, i) => <span key={i} style={{ textAlign: 'center' }}>{name}</span>)}
                </div>

                {/* Part rows */}
                {parts.map((part: any) => (
                  <div key={part.id} style={{
                    display: 'grid', gridTemplateColumns: `1fr repeat(${selectedVariants.length}, 30px)`,
                    padding: '7px 16px', gap: '3px', alignItems: 'center',
                    borderBottom: `1px solid ${borderLt}`, fontSize: '12px',
                  }}>
                    <span style={{ color: colors.utility.primaryText }}>{part.name}</span>
                    {selectedVariants.map((variant) => {
                      const mapped = (part.variant_applicability || []).some((va: any) => va.variant_id === variant.id);
                      return (
                        <button key={variant.id} style={{
                          width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', transition: '.15s',
                          background: mapped ? brandPrimary + '10' : 'transparent',
                          color: mapped ? brandPrimary : borderColor,
                        }} title={`${part.name} → ${variant.name}`}>
                          {mapped ? '●' : '○'}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Add part */}
                <div style={{ padding: '6px 16px' }}>
                  <button style={{
                    background: brandPrimary + '08', color: brandPrimary,
                    border: `1px dashed ${brandPrimary}30`, fontSize: '10px', padding: '4px 10px',
                    borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
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
