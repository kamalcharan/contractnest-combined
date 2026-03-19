// src/pages/equipment-registry/EquipmentCard.tsx
// Card component for a single equipment item in the grid view
// Supports optional selectable mode for use inside the Contract Wizard

import React, { useState } from 'react';
import { Pencil, Trash2, MapPin, Shield, AlertTriangle, XCircle, Check, Plus, User, Circle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import type { TenantAsset, AssetCondition, AssetStatus, AssetCriticality } from '@/types/assetRegistry';
import { CONDITION_CONFIG, STATUS_CONFIG, CRITICALITY_CONFIG, getWarrantyStatus } from '@/types/assetRegistry';
import type { ClientAsset } from '@/types/clientAssetRegistry';

// Union type — both share the same fields used by this card
export type CardAsset = TenantAsset | ClientAsset;

interface EquipmentCardProps {
  asset: CardAsset;
  clientName?: string;
  onEdit?: (asset: CardAsset) => void;
  onDelete?: (asset: CardAsset) => void;
  disabled?: boolean;
  // Picker mode: Add / Added / Remove flow (like /settings/configure/resources)
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: (asset: CardAsset) => void;
  /** When true, shows "Adding..." or "Removing..." on the action button */
  isMutating?: boolean;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  asset,
  clientName,
  onEdit,
  onDelete,
  disabled,
  selectable = false,
  isSelected = false,
  onToggle,
  isMutating = false,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [confirmRemove, setConfirmRemove] = useState(false);

  const conditionCfg = CONDITION_CONFIG[asset.condition as AssetCondition] || CONDITION_CONFIG.good;
  const statusCfg = STATUS_CONFIG[(asset.status as AssetStatus) || 'active'] || STATUS_CONFIG.active;
  const criticalityCfg = asset.criticality
    ? CRITICALITY_CONFIG[asset.criticality as AssetCriticality]
    : null;
  const warranty = getWarrantyStatus(asset.warranty_expiry);

  const WarrantyIcon = warranty.variant === 'active' ? Shield
    : warranty.variant === 'expiring' ? AlertTriangle
    : warranty.variant === 'expired' ? XCircle
    : null;

  const warrantyColor = warranty.variant === 'active' ? '#10b981'
    : warranty.variant === 'expiring' ? '#f59e0b'
    : warranty.variant === 'expired' ? '#ef4444'
    : colors.utility.secondaryText;

  const handleClick = () => {
    if (selectable) {
      // In selectable mode, card click does nothing — use footer buttons instead
      return;
    } else if (onEdit) {
      onEdit(asset);
    }
  };

  return (
    <div
      className="rounded-lg border-2 transition-all duration-200 hover:shadow-lg group relative"
      style={{
        backgroundColor: isSelected
          ? colors.brand.primary + '06'
          : colors.utility.secondaryBackground,
        borderColor: isSelected
          ? colors.brand.primary
          : colors.utility.primaryText + '15',
        opacity: asset.is_active ? 1 : 0.65,
        cursor: selectable ? 'default' : 'pointer',
      }}
      onClick={handleClick}
    >
      <div className="p-5">
        {/* Top Row: Icon + Condition + Status Badges / Checkbox */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: conditionCfg.bg }}
          >
            {(asset.resource_type_id || '').toLowerCase() === 'asset' ? '🏢' : '🔧'}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: conditionCfg.bg, color: conditionCfg.color }}
            >
              {conditionCfg.label}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Name + Model */}
        <h3
          className="text-sm font-bold mb-0.5 truncate"
          style={{ color: colors.utility.primaryText }}
        >
          {asset.name}
        </h3>
        <p
          className="text-xs mb-1.5 truncate"
          style={{ color: colors.utility.secondaryText }}
        >
          {[asset.make, asset.model].filter(Boolean).join(' \u00B7 ') || 'No make/model'}
        </p>

        {/* Owner Name */}
        {clientName ? (
          <div
            className="flex items-center gap-1.5 mb-3"
          >
            <User className="h-3 w-3 flex-shrink-0" style={{ color: colors.brand.primary }} />
            <span
              className="text-xs font-medium truncate"
              style={{ color: colors.brand.primary }}
            >
              {clientName}
            </span>
          </div>
        ) : ('ownership_type' in asset && (asset as any).ownership_type === 'self') ? (
          <div className="flex items-center gap-1.5 mb-3">
            <Circle className="h-3 w-3 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
            <span
              className="text-xs font-medium truncate"
              style={{ color: colors.utility.secondaryText }}
            >
              Self (My Equipment)
            </span>
          </div>
        ) : (
          <div className="mb-1.5" />
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {asset.serial_number && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Serial
              </div>
              <div className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                {asset.serial_number}
              </div>
            </div>
          )}
          {asset.code && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Code
              </div>
              <div className="text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                {asset.code}
              </div>
            </div>
          )}
          {asset.location && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Location
              </div>
              <div className="text-xs font-medium truncate flex items-center gap-1" style={{ color: colors.utility.primaryText }}>
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {asset.location}
              </div>
            </div>
          )}
          {criticalityCfg && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
                Criticality
              </div>
              <div className="text-xs font-medium truncate flex items-center gap-1" style={{ color: criticalityCfg.color }}>
                <Circle className="h-2.5 w-2.5 flex-shrink-0 fill-current" />
                {criticalityCfg.label}
              </div>
            </div>
          )}
        </div>

        {/* Warranty Badge */}
        {warranty.variant !== 'none' && (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md w-fit"
            style={{
              backgroundColor: warrantyColor + '15',
              color: warrantyColor,
            }}
          >
            {WarrantyIcon && <WarrantyIcon className="h-3 w-3" />}
            {warranty.label}
          </div>
        )}

        {/* ── Selectable mode: Add / Added+Remove footer (like /settings/configure/resources) ── */}
        {selectable && onToggle && (
          <div
            className="flex items-center justify-end gap-2 mt-3 pt-3"
            style={{ borderTop: `1px solid ${colors.utility.primaryText}08` }}
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

        {/* Actions (visible on hover) — hidden in selectable mode */}
        {!selectable && onEdit && onDelete && (
          <div
            className="flex items-center gap-2 mt-3 pt-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ borderTop: `1px solid ${colors.utility.primaryText}15` }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(asset)}
              disabled={disabled}
              className="flex-1 text-xs transition-colors hover:opacity-80"
              style={{
                borderColor: colors.brand.primary + '40',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(asset)}
              disabled={disabled}
              className="text-xs transition-colors hover:opacity-80"
              style={{
                borderColor: colors.semantic.error + '40',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentCard;
