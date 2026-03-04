// src/pages/equipment-registry/EquipmentCard.tsx
// Card component for a single equipment item in the grid view
// Supports optional selectable mode for use inside the Contract Wizard

import React from 'react';
import { Pencil, Trash2, MapPin, Shield, AlertTriangle, XCircle, CheckSquare, Square, User, Circle } from 'lucide-react';
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
  // Wizard selection mode
  selectable?: boolean;
  isSelected?: boolean;
  onToggle?: (asset: CardAsset) => void;
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
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

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
    if (selectable && onToggle) {
      onToggle(asset);
    } else if (onEdit) {
      onEdit(asset);
    }
  };

  return (
    <div
      className="rounded-lg border-2 transition-all duration-200 hover:shadow-lg cursor-pointer group relative"
      style={{
        backgroundColor: isSelected
          ? colors.brand.primary + '06'
          : colors.utility.secondaryBackground,
        borderColor: isSelected
          ? colors.brand.primary
          : colors.utility.primaryText + '15',
        opacity: asset.is_active ? 1 : 0.65,
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
            {selectable && (
              <div
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="flex items-center justify-center ml-1"
              >
                {isSelected ? (
                  <CheckSquare size={20} style={{ color: colors.brand.primary }} />
                ) : (
                  <Square size={20} style={{ color: colors.utility.secondaryText }} />
                )}
              </div>
            )}
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

        {/* Client Name */}
        {clientName && (
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
        )}
        {!clientName && <div className="mb-1.5" />}

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
