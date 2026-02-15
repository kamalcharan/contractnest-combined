// src/pages/settings/Equipment/EquipmentCard.tsx
// Card component for a single equipment item in the grid view
// Supports 3 modes: edit (default), selectable (wizard picker), readOnly (contract detail)

import React from 'react';
import { Pencil, Trash2, MapPin, Shield, AlertTriangle, XCircle, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import type { TenantAsset } from '@/types/assetRegistry';
import type { ClientAsset } from '@/types/clientAssetRegistry';
import { CONDITION_CONFIG, getWarrantyStatus } from '@/types/assetRegistry';

// Accept both TenantAsset and ClientAsset — structurally compatible
type AssetData = TenantAsset | ClientAsset;

interface EquipmentCardBaseProps {
  asset: AssetData;
  disabled?: boolean;
}

interface EditModeProps extends EquipmentCardBaseProps {
  mode?: 'edit';
  onEdit: (asset: AssetData) => void;
  onDelete: (asset: AssetData) => void;
  selected?: never;
  onSelect?: never;
}

interface SelectableModeProps extends EquipmentCardBaseProps {
  mode: 'selectable';
  selected: boolean;
  onSelect: (asset: AssetData) => void;
  onEdit?: never;
  onDelete?: never;
}

interface ReadOnlyModeProps extends EquipmentCardBaseProps {
  mode: 'readOnly';
  onEdit?: never;
  onDelete?: never;
  selected?: never;
  onSelect?: never;
}

type EquipmentCardProps = EditModeProps | SelectableModeProps | ReadOnlyModeProps;

const EquipmentCard: React.FC<EquipmentCardProps> = (props) => {
  const { asset, disabled, mode = 'edit' } = props;
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const conditionCfg = CONDITION_CONFIG[asset.condition] || CONDITION_CONFIG.good;
  const warranty = getWarrantyStatus(asset.warranty_expiry);

  const WarrantyIcon = warranty.variant === 'active' ? Shield
    : warranty.variant === 'expiring' ? AlertTriangle
    : warranty.variant === 'expired' ? XCircle
    : null;

  const warrantyColor = warranty.variant === 'active' ? '#10b981'
    : warranty.variant === 'expiring' ? '#f59e0b'
    : warranty.variant === 'expired' ? '#ef4444'
    : colors.utility.secondaryText;

  const isSelectable = mode === 'selectable';
  const isSelected = isSelectable && (props as SelectableModeProps).selected;
  const isReadOnly = mode === 'readOnly';

  const handleClick = () => {
    if (isSelectable) {
      (props as SelectableModeProps).onSelect(asset);
    } else if (mode === 'edit') {
      (props as EditModeProps).onEdit(asset);
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${isReadOnly ? '' : 'hover:shadow-lg cursor-pointer'} group`}
      style={{
        backgroundColor: isSelected
          ? colors.brand.primary + '08'
          : colors.utility.secondaryBackground,
        borderColor: isSelected
          ? colors.brand.primary + '50'
          : colors.utility.primaryText + '15',
        borderWidth: isSelected ? '2px' : '1px',
        opacity: asset.is_active ? 1 : 0.65,
      }}
      onClick={handleClick}
    >
      <div className="p-5">
        {/* Top Row: Condition Badge + Selection Checkbox */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSelectable && (
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  borderColor: isSelected ? colors.brand.primary : colors.utility.primaryText + '30',
                  backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                }}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
            )}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: conditionCfg.bg }}
            >
              {asset.resource_type_id ? '🔧' : '🏢'}
            </div>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: conditionCfg.bg, color: conditionCfg.color }}
          >
            {conditionCfg.label}
          </span>
        </div>

        {/* Name + Model */}
        <h3
          className="text-sm font-bold mb-0.5 truncate"
          style={{ color: colors.utility.primaryText }}
        >
          {asset.name}
        </h3>
        <p
          className="text-xs mb-3 truncate"
          style={{ color: colors.utility.secondaryText }}
        >
          {[asset.make, asset.model].filter(Boolean).join(' \u00B7 ') || 'No make/model'}
        </p>

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

        {/* Actions (visible on hover) — only in edit mode */}
        {mode === 'edit' && (
          <div
            className="flex items-center gap-2 mt-3 pt-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ borderTop: `1px solid ${colors.utility.primaryText}15` }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => (props as EditModeProps).onEdit(asset)}
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
              onClick={() => (props as EditModeProps).onDelete(asset)}
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
