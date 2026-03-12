// src/pages/entity-registry/components/EntityTreeNode.tsx
// Recursive tree node with lazy-load children on expand

import React, { useState, useCallback } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAssetChildren } from '@/hooks/queries/useAssetRegistry';
import { getEntityTypeConfig, ENTITY_TYPE_SPEC_KEY } from '@/constants/entityTypeConfig';
import { CONDITION_CONFIG } from '@/types/assetRegistry';
import type { TenantAsset } from '@/types/assetRegistry';
import { cn } from '@/lib/utils';

export interface EntityTreeNodeData {
  asset: TenantAsset;
  depth: number;
}

interface EntityTreeNodeProps {
  asset: TenantAsset;
  depth: number;
  selectedId: string | null;
  onSelect: (asset: TenantAsset) => void;
}

const EntityTreeNode: React.FC<EntityTreeNodeProps> = ({
  asset,
  depth,
  selectedId,
  onSelect,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [isExpanded, setIsExpanded] = useState(false);
  const [hasEverExpanded, setHasEverExpanded] = useState(false);

  // Lazy-load children — only enabled once expanded
  const {
    data: children = [],
    isLoading: childrenLoading,
  } = useAssetChildren(asset.id, { enabled: hasEverExpanded });

  const entityType = getEntityTypeConfig(asset.specifications?.[ENTITY_TYPE_SPEC_KEY]);
  const EntityIcon = entityType?.icon;
  const iconColor = entityType?.color || '#6B7280';
  const conditionCfg = CONDITION_CONFIG[asset.condition] || CONDITION_CONFIG.good;
  const isSelected = selectedId === asset.id;
  const canHaveChildren = entityType?.canHaveChildren !== false;

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canHaveChildren) return;
    if (!hasEverExpanded) setHasEverExpanded(true);
    setIsExpanded((prev) => !prev);
  }, [canHaveChildren, hasEverExpanded]);

  const handleSelect = useCallback(() => {
    onSelect(asset);
  }, [asset, onSelect]);

  // Indent based on depth
  const paddingLeft = 8 + depth * 20;

  return (
    <div className="tree-node">
      {/* Row */}
      <div
        className={cn(
          'flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-all',
          isSelected ? '' : 'hover:opacity-80'
        )}
        style={{
          paddingLeft: `${paddingLeft}px`,
          backgroundColor: isSelected ? iconColor + '12' : 'transparent',
        }}
        onClick={handleSelect}
      >
        {/* Expand arrow */}
        {canHaveChildren ? (
          <button
            className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0 transition-transform"
            onClick={handleToggleExpand}
            style={{ color: colors.utility.secondaryText }}
          >
            {childrenLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ChevronRight
                size={12}
                className="transition-transform"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            )}
          </button>
        ) : (
          <div className="w-5 h-5 flex-shrink-0" />
        )}

        {/* Entity icon */}
        {EntityIcon && (
          <EntityIcon
            size={14}
            className="flex-shrink-0"
            style={{ color: iconColor }}
          />
        )}

        {/* Name */}
        <span
          className="text-xs font-medium truncate flex-1"
          style={{
            color: isSelected ? iconColor : colors.utility.primaryText,
            fontWeight: isSelected ? 700 : 500,
          }}
        >
          {asset.name}
        </span>

        {/* Area badge */}
        {asset.area_sqft && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              backgroundColor: isSelected ? iconColor + '15' : colors.utility.primaryText + '06',
              color: isSelected ? iconColor : colors.utility.secondaryText,
            }}
          >
            {asset.area_sqft.toLocaleString()} sqft
          </span>
        )}

        {/* Condition dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: conditionCfg.color }}
          title={conditionCfg.label}
        />
      </div>

      {/* Children (lazy-loaded) */}
      {isExpanded && canHaveChildren && (
        <div className="tree-children">
          {childrenLoading && children.length === 0 ? (
            <div
              className="flex items-center gap-2 py-2 text-xs"
              style={{ paddingLeft: `${paddingLeft + 24}px`, color: colors.utility.secondaryText }}
            >
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </div>
          ) : children.length === 0 && hasEverExpanded ? (
            <div
              className="py-1.5 text-[11px]"
              style={{ paddingLeft: `${paddingLeft + 24}px`, color: colors.utility.secondaryText }}
            >
              No child facilities
            </div>
          ) : (
            children
              .filter((c) => c.is_active)
              .map((child) => (
                <EntityTreeNode
                  key={child.id}
                  asset={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
};

export default EntityTreeNode;
