// src/pages/equipment-registry/EquipmentCard.tsx
// Card component for a single equipment item in the grid view.
// R7 (registry hardening): restyled to the contract view's MachineCard visual
// language (components/contracts/fleet/MachineCard.tsx) so registry and
// contract cards read as one family:
//   name + SN/location/make line          | status pill
//   condition · criticality · client (compact meta)
//   warranty line (when known) + contract chips
//   "Last serviced <date>" / "Not serviced yet"  | Edit · deactivate / Reactivate
// Supports optional selectable mode for use inside the Contract Wizard and the
// contract Equipment tab picker (Add / Added+Remove footer) — unchanged contract.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Check, Plus, Archive, RotateCcw, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { TenantAsset, AssetCondition, AssetStatus, AssetCriticality } from '@/types/assetRegistry';
import { CONDITION_CONFIG, STATUS_CONFIG, CRITICALITY_CONFIG, getWarrantyStatus } from '@/types/assetRegistry';
import type { ClientAsset } from '@/types/clientAssetRegistry';

// Union type — both share the same fields used by this card
export type CardAsset = TenantAsset | ClientAsset;

interface EquipmentCardProps {
  asset: CardAsset;
  clientName?: string;
  /** Resolved category/type display name (e.g. "HVAC Systems") — sub-line fallback */
  categoryName?: string;
  onEdit?: (asset: CardAsset) => void;
  onDelete?: (asset: CardAsset) => void;
  /** Shown on inactive assets (Inactive filter) instead of Edit/Deactivate */
  onReactivate?: (asset: CardAsset) => void;
  disabled?: boolean;
  // Picker mode: Add / Added / Remove flow (like /settings/configure/resources)
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: (asset: CardAsset) => void;
  /** When true, shows "Adding..." or "Removing..." on the action button */
  isMutating?: boolean;
}

const formatShortDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  asset,
  clientName,
  categoryName,
  onEdit,
  onDelete,
  onReactivate,
  disabled,
  selectable = false,
  isSelected = false,
  onToggle,
  isMutating = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Live contracts referencing this asset — present only when the list was
  // fetched with with_contracts=true (registry page)
  const contractRefs = (asset as any).contracts as { id: string; contract_number: string }[] | undefined;

  const conditionCfg = CONDITION_CONFIG[asset.condition as AssetCondition] || CONDITION_CONFIG.good;
  const statusCfg = STATUS_CONFIG[(asset.status as AssetStatus) || 'active'] || STATUS_CONFIG.active;
  const criticalityCfg = asset.criticality
    ? CRITICALITY_CONFIG[asset.criticality as AssetCriticality]
    : null;
  const warranty = getWarrantyStatus(asset.warranty_expiry);

  const warrantyColor = warranty.variant === 'active' ? '#10b981'
    : warranty.variant === 'expiring' ? '#f59e0b'
    : warranty.variant === 'expired' ? '#ef4444'
    : colors.utility.secondaryText;

  // Sub line: SN · location · make/model — fall back to category (MachineCard pattern)
  const subParts = [
    asset.serial_number ? `SN ${asset.serial_number}` : null,
    asset.location || null,
    [asset.make, asset.model].filter(Boolean).join(' ') || null,
  ].filter(Boolean) as string[];
  if (subParts.length === 0 && categoryName) subParts.push(categoryName);

  const metaParts = [
    conditionCfg.label,
    criticalityCfg ? `${criticalityCfg.label} criticality` : null,
    clientName || (('ownership_type' in asset && (asset as any).ownership_type === 'self') ? 'Self (My Equipment)' : null),
  ].filter(Boolean) as string[];

  const lastServiced = formatShortDate((asset as any).last_service_date);
  const footerText = lastServiced ? `Last serviced ${lastServiced}` : 'Not serviced yet';

  const smallBtn = (bg: string, fg: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: fg,
    border: 'none',
  });

  const handleClick = () => {
    if (selectable) {
      // In selectable mode, card click does nothing — use footer buttons instead
      return;
    } else if (onEdit && asset.is_active) {
      onEdit(asset);
    }
  };

  return (
    <div
      className="rounded-xl border p-4 transition-shadow hover:shadow-sm h-full flex flex-col"
      style={{
        backgroundColor: isSelected
          ? colors.brand.primary + '06'
          : colors.utility.secondaryBackground,
        borderColor: isSelected
          ? colors.brand.primary
          : colors.utility.primaryText + '14',
        opacity: asset.is_active ? 1 : 0.65,
        cursor: selectable || !asset.is_active ? 'default' : 'pointer',
      }}
      onClick={handleClick}
    >
      {/* Top row: identity + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: colors.utility.primaryText }}>
            {asset.name}
          </div>
          {subParts.length > 0 && (
            <div className="text-[11px] mt-0.5 truncate" style={{ color: colors.utility.secondaryText }}>
              {subParts.join(' · ')}
            </div>
          )}
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={
            !asset.is_active
              ? { backgroundColor: colors.utility.secondaryText + '18', color: colors.utility.secondaryText }
              : { backgroundColor: statusCfg.color + '15', color: statusCfg.color }
          }
        >
          {!asset.is_active ? 'Inactive' : statusCfg.label}
        </span>
      </div>

      {/* Compact meta line — condition / criticality / owner */}
      {metaParts.length > 0 && (
        <div className="text-[10.5px] mt-1 truncate" style={{ color: colors.utility.secondaryText + 'cc' }}>
          {metaParts.join(' · ')}
        </div>
      )}

      {/* Warranty line (only when a warranty date is known) */}
      {warranty.variant !== 'none' && (
        <div className="flex items-center justify-between gap-2 mt-3 text-[11.5px]">
          <span style={{ color: warrantyColor, fontWeight: warranty.variant === 'active' ? 500 : 700 }}>
            {warranty.label}
          </span>
        </div>
      )}

      {/* R4: live contracts this asset is attached to (present only when the
          list was fetched with with_contracts=true, i.e. the registry page) */}
      {contractRefs && contractRefs.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {contractRefs.slice(0, 3).map((c) => (
            <button
              key={c.id}
              onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.brand.primary + '12', color: colors.brand.primary }}
              title={`Open contract ${c.contract_number}`}
            >
              <FileText className="h-2.5 w-2.5" />
              {c.contract_number}
            </button>
          ))}
          {contractRefs.length > 3 && (
            <span className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
              +{contractRefs.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* ── Selectable mode: Add / Added+Remove footer (like /settings/configure/resources) ── */}
      {selectable && onToggle && (
        <div
          className="flex items-center justify-end gap-2 mt-auto pt-3 border-t"
          style={{ borderColor: colors.utility.primaryText + '0a', marginTop: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isSelected ? (
            confirmRemove ? (
              /* 2-step confirm: "Remove?" + "Yes, Remove" / "Cancel" */
              <>
                <span className="text-xs font-medium mr-auto" style={{ color: colors.semantic.error }}>
                  Remove?
                </span>
                <button
                  onClick={() => { setConfirmRemove(false); onToggle(asset); }}
                  disabled={disabled || isMutating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 8, border: 'none',
                    fontSize: 12, fontWeight: 600,
                    cursor: disabled || isMutating ? 'not-allowed' : 'pointer',
                    backgroundColor: colors.semantic.error,
                    color: '#fff',
                    opacity: disabled || isMutating ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {isMutating ? 'Removing...' : <><Trash2 size={12} /> Yes, Remove</>}
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  disabled={isMutating}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, border: 'none',
                    cursor: 'pointer',
                    backgroundColor: colors.utility.primaryText + '10',
                    color: colors.utility.secondaryText,
                    transition: 'all 0.15s',
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              /* Added badge + Remove button */
              <>
                <span
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600,
                    color: colors.semantic?.success || '#16a34a',
                    padding: '5px 14px', borderRadius: 8,
                    backgroundColor: (colors.semantic?.success || '#16a34a') + '12',
                  }}
                >
                  <Check size={14} /> Added
                </span>
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={disabled || isMutating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, border: 'none',
                    cursor: disabled || isMutating ? 'not-allowed' : 'pointer',
                    backgroundColor: colors.semantic.error + '12',
                    color: colors.semantic.error,
                    opacity: disabled || isMutating ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!disabled && !isMutating) (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Trash2 size={12} /> Remove
                </button>
              </>
            )
          ) : (
            /* Not added — show "Add" button */
            <button
              onClick={() => onToggle(asset)}
              disabled={disabled || isMutating}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 14px', borderRadius: 8, border: 'none',
                fontSize: 12, fontWeight: 600,
                cursor: disabled || isMutating ? 'not-allowed' : 'pointer',
                backgroundColor: colors.brand.primary,
                color: '#fff',
                opacity: disabled || isMutating ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!disabled && !isMutating) (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
            >
              {isMutating ? 'Adding...' : <><Plus size={13} /> Add</>}
            </button>
          )}
        </div>
      )}

      {/* Registry footer (MachineCard-style): last-serviced note + actions.
          Inactive assets get a Reactivate action; active ones Edit + Deactivate.
          Equipment is never hard-deleted — Deactivate soft-hides it (is_active=false). */}
      {!selectable && !asset.is_active && onReactivate && (
        <div
          className="flex items-center justify-between gap-2 mt-auto pt-3 border-t"
          style={{ borderColor: colors.utility.primaryText + '0a', marginTop: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10.5px] truncate" style={{ color: colors.utility.secondaryText }}>
            {footerText}
          </span>
          <button
            onClick={() => onReactivate(asset)}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90 disabled:opacity-40 flex-shrink-0"
            style={smallBtn((colors.semantic?.success || '#16a34a') + '12', colors.semantic?.success || '#16a34a')}
          >
            <RotateCcw className="h-3 w-3" />
            Reactivate
          </button>
        </div>
      )}
      {!selectable && asset.is_active && onEdit && onDelete && (
        <div
          className="flex items-center justify-between gap-2 mt-auto pt-3 border-t"
          style={{ borderColor: colors.utility.primaryText + '0a', marginTop: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10.5px] truncate" style={{ color: colors.utility.secondaryText }}>
            {footerText}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onEdit(asset)}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90 disabled:opacity-40"
              style={smallBtn(colors.brand.primary + '12', colors.brand.primary)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => onDelete(asset)}
              disabled={disabled}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ color: colors.semantic.error, backgroundColor: colors.semantic.error + '10' }}
              aria-label="Deactivate"
              title="Deactivate"
            >
              <Archive className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentCard;
