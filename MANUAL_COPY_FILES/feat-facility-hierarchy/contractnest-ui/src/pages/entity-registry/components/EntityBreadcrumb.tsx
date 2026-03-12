// src/pages/entity-registry/components/EntityBreadcrumb.tsx
// Breadcrumb trail: Campus > Building > Floor > Room
// Uses parent_asset_id chain to build the path

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getEntityTypeConfig, ENTITY_TYPE_SPEC_KEY } from '@/constants/entityTypeConfig';
import type { TenantAsset } from '@/types/assetRegistry';

interface EntityBreadcrumbProps {
  /** The currently selected entity */
  selectedEntity: TenantAsset;
  /** All root-level entities + any loaded entities (flat map for path resolution) */
  entityMap: Map<string, TenantAsset>;
  onNavigate: (asset: TenantAsset) => void;
}

const EntityBreadcrumb: React.FC<EntityBreadcrumbProps> = ({
  selectedEntity,
  entityMap,
  onNavigate,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Build path from selected entity up to root
  const path: TenantAsset[] = [];
  let current: TenantAsset | undefined = selectedEntity;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break; // circular reference safety
    visited.add(current.id);
    path.unshift(current);
    current = current.parent_asset_id ? entityMap.get(current.parent_asset_id) : undefined;
  }

  return (
    <nav className="flex items-center gap-1 text-xs flex-wrap">
      <Home size={12} style={{ color: colors.utility.secondaryText }} />
      {path.map((entity, idx) => {
        const isLast = idx === path.length - 1;
        const entityType = getEntityTypeConfig(entity.specifications?.[ENTITY_TYPE_SPEC_KEY]);
        const EntityIcon = entityType?.icon;

        return (
          <React.Fragment key={entity.id}>
            <ChevronRight size={10} style={{ color: colors.utility.secondaryText }} />
            {isLast ? (
              <span
                className="font-semibold flex items-center gap-1"
                style={{ color: colors.utility.primaryText }}
              >
                {EntityIcon && <EntityIcon size={12} style={{ color: entityType?.color }} />}
                {entity.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(entity)}
                className="font-medium flex items-center gap-1 hover:underline transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {EntityIcon && <EntityIcon size={12} style={{ color: entityType?.color }} />}
                {entity.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default EntityBreadcrumb;
