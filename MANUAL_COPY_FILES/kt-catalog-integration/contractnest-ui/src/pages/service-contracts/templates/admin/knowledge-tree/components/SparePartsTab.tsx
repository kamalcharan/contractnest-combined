// Spare Parts Tab — grouped by component_group, variant mapping, pricing display, CRUD
import React, { useState } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import VaNiBubble from './VaNiBubble';
import AddItemModal from './AddItemModal';
import type { KnowledgeTreeSummary } from '../types';

interface Props {
  summary: KnowledgeTreeSummary;
  variants: any[];
  partsByGroup: Record<string, any[]>;
  selectedVariantIds: Set<string>;
  onAddPart: (group: string, data: Record<string, string>) => void;
  onRemovePart: (group: string, partId: string, partName: string) => void;
  onEditPart: (group: string, partId: string, data: Record<string, string>) => void;
  onToggleMapping: (group: string, partId: string, variantId: string) => void;
  colors: any;
  expandedGroups: Set<string>;
  toggleGroup: (key: string) => void;
}

function formatPrice(value: number | null | undefined, currency?: string | null): string {
  if (value == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'AED' ? 'AED ' : currency === 'EUR' ? '€' : '₹';
  return `${sym}${value.toLocaleString('en-IN')}`;
}

const SparePartsTab: React.FC<Props> = ({
  summary, variants, partsByGroup, selectedVariantIds,
  onAddPart, onRemovePart, onEditPart, onToggleMapping,
  colors, expandedGroups, toggleGroup,
}) => {
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<{ group: string; part: any } | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const borderColor = colors.utility.secondaryText + '20';
  const borderLt = colors.utility.secondaryText + '12';
  const brandPrimary = colors.brand.primary;
  const totalParts = Object.values(partsByGroup).flat().length;
  const groups = Object.keys(partsByGroup).sort();
  const ktLayer = summary?.resource_template?.resource_type_id === 'asset' ? 'facility' : 'equipment';
  const partsLabel = ktLayer === 'facility' ? 'consumables' : 'spare parts';

  return (
    <div>
      <VaNiBubble colors={colors}>
        <p><strong style={{ color: colors.utility.primaryText }}>{totalParts} {partsLabel}</strong> across <strong style={{ color: colors.utility.primaryText }}>{groups.length}</strong> component groups. Toggle variant applicability per part. Use "Generate Pricing" in the header to auto-fill min/median/max.</p>
      </VaNiBubble>

      {groups.map((group) => {
        const parts = partsByGroup[group] || [];
        const isExpanded = expandedGroups.has(group);
        const hasPricing = parts.some((p: any) => p.price_min != null || p.price_median != null || p.price_max != null);

        return (
          <div key={group} style={{ marginBottom: '12px', border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: colors.utility.primaryBackground, border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
            >
              {isExpanded ? <ChevronDown style={{ width: '14px', height: '14px', color: colors.utility.secondaryText, flexShrink: 0 }} /> : <ChevronRight style={{ width: '14px', height: '14px', color: colors.utility.secondaryText, flexShrink: 0 }} />}
              <span style={{ fontSize: '13px', fontWeight: 700, color: colors.utility.primaryText, flex: 1, textTransform: 'capitalize' as const }}>
                {group.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>{parts.length} {partsLabel}</span>
              {hasPricing && (
                <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '8px', background: '#10b98115', color: '#10b981' }}>Priced</span>
              )}
            </button>

            {isExpanded && (
              <div style={{ borderTop: `1px solid ${borderLt}` }}>
                {parts.length === 0 ? (
                  <div style={{ padding: '20px', color: colors.utility.secondaryText, fontSize: '13px', textAlign: 'center' as const }}>No {partsLabel} in this group</div>
                ) : (
                  parts.map((part: any) => {
                    const isCustom = part.source === 'user_contributed';
                    const mappedVariantIds = new Set((part.variant_applicability || []).map((m: any) => m.variant_id));
                    const hasPricingData = part.price_min != null || part.price_median != null || part.price_max != null;
                    const currency = part.price_currency;

                    return (
                      <div key={part.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderLt}`, background: colors.utility.secondaryBackground }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.utility.primaryText }}>{part.name}</span>
                              {isCustom && <span style={{ fontSize: '8px', color: colors.semantic.success, fontWeight: 700 }}>NEW</span>}
                              {part.price_unit && (
                                <span style={{ fontSize: '9px', color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace" }}>{part.price_unit}</span>
                              )}
                            </div>
                            {part.description && (
                              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>{part.description}</div>
                            )}

                            {/* Pricing row */}
                            {hasPricingData && (
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                                  Min: <strong style={{ color: colors.semantic.success, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(part.price_min, currency)}</strong>
                                </span>
                                <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                                  Median: <strong style={{ color: colors.utility.primaryText, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(part.price_median, currency)}</strong>
                                </span>
                                <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                                  Max: <strong style={{ color: colors.semantic.error, fontFamily: "'IBM Plex Mono', monospace" }}>{formatPrice(part.price_max, currency)}</strong>
                                </span>
                                {part.price_geo && (
                                  <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: borderColor, color: colors.utility.secondaryText, fontFamily: "'IBM Plex Mono', monospace" }}>{part.price_geo}</span>
                                )}
                              </div>
                            )}

                            {/* Variant applicability chips */}
                            {variants.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {variants.map((v: any) => {
                                  const mapped = mappedVariantIds.has(v.id);
                                  const inScope = selectedVariantIds.has(v.id);
                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => onToggleMapping(group, part.id, v.id)}
                                      title={mapped ? 'Click to remove variant applicability' : 'Click to add variant applicability'}
                                      style={{
                                        fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${mapped ? brandPrimary + '60' : borderLt}`,
                                        background: mapped ? brandPrimary + '12' : colors.utility.primaryBackground,
                                        color: mapped ? brandPrimary : colors.utility.secondaryText + (inScope ? 'cc' : '60'),
                                        fontWeight: mapped ? 700 : 400, cursor: 'pointer', transition: 'all .12s',
                                        opacity: inScope ? 1 : 0.5,
                                      }}
                                    >
                                      {mapped ? '✓ ' : ''}{v.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => setEditingPart({ group, part })}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: brandPrimary + '10', color: brandPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit part"
                            >
                              <Pencil style={{ width: '12px', height: '12px' }} />
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => onRemovePart(group, part.id, part.name)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: colors.semantic.error + '10', color: colors.semantic.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove part"
                              >
                                <Trash2 style={{ width: '12px', height: '12px' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Add part to this group */}
                <div style={{ padding: '10px 16px', background: colors.utility.primaryBackground }}>
                  <button
                    onClick={() => setAddingToGroup(group)}
                    style={{ background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '11px', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus style={{ width: '11px', height: '11px' }} /> Add {partsLabel === 'consumables' ? 'Consumable' : 'Part'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add to new group */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name…"
          style={{ flex: 1, maxWidth: '220px', padding: '6px 10px', border: `1px solid ${borderColor}`, borderRadius: '7px', fontSize: '12px', background: colors.utility.primaryBackground, color: colors.utility.primaryText, fontFamily: 'inherit' }}
        />
        <button
          onClick={() => { if (newGroupName.trim()) { setAddingToGroup(newGroupName.trim()); setNewGroupName(''); } }}
          disabled={!newGroupName.trim()}
          style={{ background: brandPrimary + '08', color: brandPrimary, border: `1px dashed ${brandPrimary}30`, fontSize: '12px', padding: '6px 14px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: newGroupName.trim() ? 1 : 0.4 }}
        >
          <Plus style={{ width: '12px', height: '12px' }} /> Add Group
        </button>
      </div>

      {addingToGroup && (
        <AddItemModal
          title={`Add ${partsLabel === 'consumables' ? 'Consumable' : 'Spare Part'} to "${addingToGroup.replace(/_/g, ' ')}"`}
          fields={[
            { key: 'name', label: 'Part Name', type: 'text', placeholder: 'e.g. Drive Belt', required: true },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
          ]}
          onClose={() => setAddingToGroup(null)}
          onSave={(data) => { onAddPart(addingToGroup, data); setAddingToGroup(null); }}
          colors={colors}
        />
      )}

      {editingPart && (
        <AddItemModal
          title={`Edit "${editingPart.part.name}"`}
          fields={[
            { key: 'name', label: 'Part Name', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          initialData={{ name: editingPart.part.name, description: editingPart.part.description || '' }}
          onClose={() => setEditingPart(null)}
          onSave={(data) => { onEditPart(editingPart.group, editingPart.part.id, data); setEditingPart(null); }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default SparePartsTab;
