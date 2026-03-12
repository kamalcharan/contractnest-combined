// src/pages/entity-registry/components/EntityDetailPanel.tsx
// Right panel: shows selected entity details + child summary

import React, { useMemo } from 'react';
import {
  Pencil, Trash2, MapPin, Ruler, Users, Hash,
  Calendar, AlertCircle, Landmark,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useAssetChildren } from '@/hooks/queries/useAssetRegistry';
import {
  getEntityTypeConfig,
  getValidChildTypes,
  ENTITY_TYPE_SPEC_KEY,
} from '@/constants/entityTypeConfig';
import {
  CONDITION_CONFIG,
  STATUS_CONFIG,
  CRITICALITY_CONFIG,
} from '@/types/assetRegistry';
import type { TenantAsset } from '@/types/assetRegistry';
import EntityBreadcrumb from './EntityBreadcrumb';

interface EntityDetailPanelProps {
  entity: TenantAsset | null;
  entityMap: Map<string, TenantAsset>;
  onNavigate: (asset: TenantAsset) => void;
  onEdit: (asset: TenantAsset) => void;
  onDelete: (asset: TenantAsset) => void;
  onAddChild: (parentAsset: TenantAsset) => void;
  isMutating: boolean;
  clientName?: string;
}

const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
  entity,
  entityMap,
  onNavigate,
  onEdit,
  onDelete,
  onAddChild,
  isMutating,
  clientName,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Load children for the detail view child summary
  const { data: children = [], isLoading: childrenLoading } = useAssetChildren(
    entity?.id || '',
    { enabled: !!entity }
  );

  const activeChildren = useMemo(
    () => children.filter((c) => c.is_active),
    [children]
  );

  // Empty state — no entity selected
  if (!entity) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: colors.brand.primary + '10' }}
            >
              <Landmark size={28} style={{ color: colors.brand.primary, opacity: 0.5 }} />
            </div>
          </div>
          <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
            Select a facility
          </p>
          <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
            Click on a facility in the tree to view its details.
          </p>
        </div>
      </div>
    );
  }

  const entityType = getEntityTypeConfig(entity.specifications?.[ENTITY_TYPE_SPEC_KEY]);
  const EntityIcon = entityType?.icon || Landmark;
  const iconColor = entityType?.color || colors.brand.primary;
  const conditionCfg = CONDITION_CONFIG[entity.condition] || CONDITION_CONFIG.good;
  const statusCfg = STATUS_CONFIG[entity.status] || STATUS_CONFIG.active;
  const criticalityCfg = CRITICALITY_CONFIG[entity.criticality] || CRITICALITY_CONFIG.medium;
  const validChildTypes = entityType ? getValidChildTypes(entityType.id) : [];

  // Condition score (for the ring) — good=90, fair=65, poor=35, critical=15
  const conditionScoreMap: Record<string, number> = { good: 90, fair: 65, poor: 35, critical: 15 };
  const conditionScore = conditionScoreMap[entity.condition] || 50;
  const circumference = 2 * Math.PI * 30;
  const strokeOffset = circumference - (conditionScore / 100) * circumference;

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: colors.utility.primaryBackground }}>
      <div className="px-8 py-6 max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-5">
          <EntityBreadcrumb
            selectedEntity={entity}
            entityMap={entityMap}
            onNavigate={onNavigate}
          />
        </div>

        {/* Entity Header */}
        <div className="flex items-start gap-5 mb-6">
          {/* Condition Ring */}
          <div className="relative w-[72px] h-[72px] flex-shrink-0">
            <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke={colors.utility.primaryText + '10'} strokeWidth="5" />
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                stroke={conditionCfg.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold" style={{ color: colors.utility.primaryText }}>
                {conditionScore}
              </span>
              <span className="text-[8px] font-medium" style={{ color: colors.utility.secondaryText }}>
                Score
              </span>
            </div>
          </div>

          {/* Title + Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <EntityIcon size={18} style={{ color: iconColor }} />
              <span
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: iconColor }}
              >
                {entityType?.label || 'Facility'}
              </span>
            </div>
            <h1
              className="text-lg font-extrabold tracking-tight mb-1.5"
              style={{ color: colors.utility.primaryText }}
            >
              {entity.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
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
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: criticalityCfg.bg, color: criticalityCfg.color }}
              >
                {criticalityCfg.label} criticality
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(entity)}
              disabled={isMutating}
              className="text-xs"
              style={{
                borderColor: colors.brand.primary + '40',
                color: colors.brand.primary,
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(entity)}
              disabled={isMutating}
              className="text-xs"
              style={{
                borderColor: colors.semantic.error + '40',
                color: colors.semantic.error,
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Details Card */}
        <div
          className="rounded-lg border p-5 mb-5"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.primaryText + '12',
          }}
        >
          <h3
            className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {entity.code && (
              <DetailItem
                icon={Hash}
                label="Code"
                value={entity.code}
                colors={colors}
              />
            )}
            {entity.location && (
              <DetailItem
                icon={MapPin}
                label="Location"
                value={entity.location}
                colors={colors}
              />
            )}
            {entity.area_sqft && (
              <DetailItem
                icon={Ruler}
                label="Area"
                value={`${entity.area_sqft.toLocaleString()} sqft`}
                colors={colors}
              />
            )}
            {entity.capacity && (
              <DetailItem
                icon={Users}
                label="Capacity"
                value={`${entity.capacity}`}
                colors={colors}
              />
            )}
            {clientName && (
              <DetailItem
                icon={Users}
                label="Client"
                value={clientName}
                colors={colors}
              />
            )}
            <DetailItem
              icon={Calendar}
              label="Created"
              value={new Date(entity.created_at).toLocaleDateString()}
              colors={colors}
            />
            {entity.description && (
              <div className="col-span-2">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Description
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.utility.primaryText }}>
                  {entity.description}
                </p>
              </div>
            )}
          </div>

          {/* Dimensions */}
          {entity.dimensions && (entity.dimensions.length || entity.dimensions.width) && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.utility.primaryText}08` }}>
              <div
                className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Dimensions
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: colors.utility.primaryText }}>
                {entity.dimensions.length && (
                  <span>L: {entity.dimensions.length} {entity.dimensions.unit || 'ft'}</span>
                )}
                {entity.dimensions.width && (
                  <span>W: {entity.dimensions.width} {entity.dimensions.unit || 'ft'}</span>
                )}
                {entity.dimensions.height && (
                  <span>H: {entity.dimensions.height} {entity.dimensions.unit || 'ft'}</span>
                )}
              </div>
            </div>
          )}

          {/* Specifications */}
          {entity.specifications && Object.keys(entity.specifications).filter(k => k !== ENTITY_TYPE_SPEC_KEY).length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.utility.primaryText}08` }}>
              <div
                className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Specifications
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(entity.specifications)
                  .filter(([k]) => k !== ENTITY_TYPE_SPEC_KEY)
                  .map(([key, value]) => (
                    <div key={key}>
                      <div className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
                        {key}
                      </div>
                      <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                        {String(value)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Child Entities Summary */}
        {entityType?.canHaveChildren !== false && (
          <div
            className="rounded-lg border p-5"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '12',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: colors.utility.secondaryText }}
              >
                Child Facilities
                {!childrenLoading && (
                  <span className="ml-2 text-[10px] font-medium normal-case">
                    ({activeChildren.length})
                  </span>
                )}
              </h3>
              {validChildTypes.length > 0 && (
                <button
                  onClick={() => onAddChild(entity)}
                  className="text-xs font-semibold flex items-center gap-1 transition-colors hover:underline"
                  style={{ color: colors.brand.primary }}
                >
                  + Add Child Facility
                </button>
              )}
            </div>

            {childrenLoading ? (
              <div className="text-xs py-3" style={{ color: colors.utility.secondaryText }}>
                Loading children...
              </div>
            ) : activeChildren.length === 0 ? (
              <div
                className="text-center py-6 rounded-lg border border-dashed"
                style={{ borderColor: colors.utility.primaryText + '15' }}
              >
                <AlertCircle size={18} className="mx-auto mb-2" style={{ color: colors.utility.secondaryText, opacity: 0.5 }} />
                <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                  No child facilities.
                  {validChildTypes.length > 0 && (
                    <> Add a {validChildTypes.map(t => t.label.toLowerCase()).join(' or ')}.</>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeChildren.map((child) => {
                  const childType = getEntityTypeConfig(child.specifications?.[ENTITY_TYPE_SPEC_KEY]);
                  const ChildIcon = childType?.icon || Landmark;
                  const childColor = childType?.color || '#6B7280';
                  const childCondition = CONDITION_CONFIG[child.condition] || CONDITION_CONFIG.good;

                  return (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:opacity-80 text-left"
                      style={{ backgroundColor: colors.utility.primaryText + '04' }}
                    >
                      <ChildIcon size={14} style={{ color: childColor }} />
                      <span
                        className="text-xs font-medium truncate flex-1"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {child.name}
                      </span>
                      {child.area_sqft && (
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          {child.area_sqft.toLocaleString()} sqft
                        </span>
                      )}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: childCondition.color }}
                        title={childCondition.label}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Detail Item helper ──────────────────────────────────────────────

const DetailItem: React.FC<{
  icon: React.FC<any>;
  label: string;
  value: string;
  colors: any;
}> = ({ icon: Icon, label, value, colors }) => (
  <div className="flex items-start gap-2">
    <Icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: colors.utility.secondaryText }} />
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.utility.secondaryText }}>
        {label}
      </div>
      <div className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
        {value}
      </div>
    </div>
  </div>
);

export default EntityDetailPanel;
