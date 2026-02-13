// src/components/assets/ClientAssetCard.tsx
// Compact card for displaying a single client asset in a grid or list

import React from 'react';
import {
  Wrench, MoreVertical, Edit, Trash2,
  MapPin, Shield, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClientAsset } from '@/types/clientAssetRegistry';
import { STATUS_CONFIG, CONDITION_CONFIG, CRITICALITY_CONFIG, getWarrantyStatus } from '@/types/clientAssetRegistry';

interface ClientAssetCardProps {
  asset: ClientAsset;
  onEdit: (asset: ClientAsset) => void;
  onDelete: (asset: ClientAsset) => void;
  disabled?: boolean;
}

const ClientAssetCard: React.FC<ClientAssetCardProps> = ({ asset, onEdit, onDelete, disabled }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const statusCfg = STATUS_CONFIG[asset.status];
  const conditionCfg = CONDITION_CONFIG[asset.condition];
  const criticalityCfg = CRITICALITY_CONFIG[asset.criticality];
  const warranty = asset.warranty_expiry ? getWarrantyStatus(asset.warranty_expiry) : null;

  const isEquipment = ['equipment', 'consumable'].includes(asset.resource_type_id);

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:shadow-md"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        borderColor: colors.utility.primaryText + '12',
      }}
    >
      {/* Top Row: Name + Menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.brand.primary + '12' }}
          >
            <Wrench className="h-4 w-4" style={{ color: colors.brand.primary }} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate" style={{ color: colors.utility.primaryText }}>
              {asset.name}
            </h4>
            {asset.code && (
              <p className="text-[11px] font-mono" style={{ color: colors.utility.secondaryText }}>
                {asset.code}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={disabled}
              className="p-1 rounded-md hover:opacity-80 flex-shrink-0"
              style={{ color: colors.utility.secondaryText }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(asset)}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(asset)} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
          style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
          style={{ backgroundColor: conditionCfg.bg, color: conditionCfg.color }}
        >
          {conditionCfg.label}
        </span>
        {asset.criticality !== 'medium' && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-0.5"
            style={{ backgroundColor: criticalityCfg.bg, color: criticalityCfg.color }}
          >
            {asset.criticality === 'critical' && <AlertTriangle className="h-2.5 w-2.5" />}
            {criticalityCfg.label}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs" style={{ color: colors.utility.secondaryText }}>
        {isEquipment && asset.make && (
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{asset.make}{asset.model ? ` ${asset.model}` : ''}</span>
          </div>
        )}
        {!isEquipment && asset.area_sqft && (
          <div className="flex items-center gap-1.5">
            <span>{asset.area_sqft} sqft</span>
            {asset.capacity && <span>| Cap: {asset.capacity}</span>}
          </div>
        )}
        {asset.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{asset.location}</span>
          </div>
        )}
        {warranty && warranty.variant !== 'none' && (
          <div className="flex items-center gap-1.5">
            <span
              className="font-semibold"
              style={{
                color: warranty.variant === 'expired' ? '#ef4444' :
                       warranty.variant === 'expiring' ? '#f59e0b' : '#10b981'
              }}
            >
              {warranty.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAssetCard;
