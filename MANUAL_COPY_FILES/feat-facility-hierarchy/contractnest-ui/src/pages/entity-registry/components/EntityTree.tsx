// src/pages/entity-registry/components/EntityTree.tsx
// Left panel: hierarchy tree with search, add button, and lazy-load nodes

import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Landmark } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import type { TenantAsset } from '@/types/assetRegistry';
import EntityTreeNode from './EntityTreeNode';

interface EntityTreeProps {
  /** Root-level entities (parent_asset_id is null) */
  rootEntities: TenantAsset[];
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (asset: TenantAsset) => void;
  onAddEntity: () => void;
  /** Label for perspective context */
  perspectiveLabel: string;
}

const EntityTree: React.FC<EntityTreeProps> = ({
  rootEntities,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onAddEntity,
  perspectiveLabel,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filter root entities by search (name only at root level)
  const filteredRoots = useMemo(() => {
    if (!searchQuery.trim()) return rootEntities;
    const q = searchQuery.toLowerCase();
    return rootEntities.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q)
    );
  }, [rootEntities, searchQuery]);

  return (
    <div
      className="w-[340px] min-w-[340px] border-r flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: colors.utility.primaryText + '15',
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <div
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: colors.utility.secondaryText }}
        >
          {perspectiveLabel}
        </div>
        <h3
          className="text-sm font-extrabold tracking-tight"
          style={{ color: colors.utility.primaryText }}
        >
          Facility Hierarchy
        </h3>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: colors.utility.primaryText + '10' }}
      >
        <button
          onClick={onAddEntity}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary})`,
            color: '#FFFFFF',
          }}
        >
          <Plus size={14} />
          Add Facility
        </button>
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: colors.utility.secondaryText }}
          />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-xs h-8"
            style={{
              borderColor: colors.utility.primaryText + '20',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3" style={{ color: colors.utility.secondaryText }} />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <VaNiLoader size="sm" message="Loading hierarchy..." />
          </div>
        ) : isError ? (
          <div
            className="text-center py-8 text-xs"
            style={{ color: colors.utility.secondaryText }}
          >
            Failed to load facility data.
          </div>
        ) : filteredRoots.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + '12' }}
              >
                <Landmark size={22} style={{ color: colors.brand.primary, opacity: 0.6 }} />
              </div>
            </div>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: colors.utility.primaryText }}
            >
              {searchQuery ? 'No matching facilities' : 'No facilities yet'}
            </p>
            <p
              className="text-[11px] mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              {searchQuery
                ? 'Try a different search term.'
                : 'Add your first campus or building to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onAddEntity}
                className="text-xs font-semibold transition-colors hover:underline"
                style={{ color: colors.brand.primary }}
              >
                + Add Facility
              </button>
            )}
          </div>
        ) : (
          filteredRoots.map((entity) => (
            <EntityTreeNode
              key={entity.id}
              asset={entity}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      {/* Footer summary */}
      {!isLoading && !isError && rootEntities.length > 0 && (
        <div
          className="px-4 py-2.5 border-t text-[10px] font-medium"
          style={{
            borderColor: colors.utility.primaryText + '10',
            color: colors.utility.secondaryText,
          }}
        >
          {rootEntities.length} root {rootEntities.length === 1 ? 'facility' : 'facilities'}
        </div>
      )}
    </div>
  );
};

export default EntityTree;
