// src/constants/entityTypeConfig.ts
// Built-in entity hierarchy types for the Facility Registry
// These are always available — no Settings > Resources configuration needed

import {
  Building2, Building, Layers, DoorOpen, SquareDashedBottomCode,
  Trees, ParkingCircle, Waves as PoolIcon, Landmark,
  type LucideIcon,
} from 'lucide-react';

// ── Entity Type Definition ──────────────────────────────────────────

export interface EntityTypeConfig {
  id: string;
  label: string;
  pluralLabel: string;
  icon: LucideIcon;
  color: string;
  /** 0 = root (Campus), 1 = Building, 2 = Floor, 3 = Room/Zone */
  hierarchyLevel: number;
  /** Which parent entity types are allowed */
  allowedParentTypes: string[];
  /** Whether this entity can have children */
  canHaveChildren: boolean;
  /** Default fields to show in the form */
  showAreaField: boolean;
  showCapacityField: boolean;
  showDimensionsField: boolean;
}

// ── Built-in Entity Types ───────────────────────────────────────────

export const ENTITY_TYPES: Record<string, EntityTypeConfig> = {
  campus: {
    id: 'campus',
    label: 'Campus',
    pluralLabel: 'Campuses',
    icon: Landmark,
    color: '#6366F1',
    hierarchyLevel: 0,
    allowedParentTypes: [],
    canHaveChildren: true,
    showAreaField: true,
    showCapacityField: false,
    showDimensionsField: false,
  },
  building: {
    id: 'building',
    label: 'Building',
    pluralLabel: 'Buildings',
    icon: Building2,
    color: '#3B82F6',
    hierarchyLevel: 1,
    allowedParentTypes: ['campus'],
    canHaveChildren: true,
    showAreaField: true,
    showCapacityField: true,
    showDimensionsField: false,
  },
  floor: {
    id: 'floor',
    label: 'Floor',
    pluralLabel: 'Floors',
    icon: Layers,
    color: '#0EA5E9',
    hierarchyLevel: 2,
    allowedParentTypes: ['building'],
    canHaveChildren: true,
    showAreaField: true,
    showCapacityField: false,
    showDimensionsField: false,
  },
  room: {
    id: 'room',
    label: 'Room',
    pluralLabel: 'Rooms',
    icon: DoorOpen,
    color: '#10B981',
    hierarchyLevel: 3,
    allowedParentTypes: ['floor'],
    canHaveChildren: false,
    showAreaField: true,
    showCapacityField: true,
    showDimensionsField: true,
  },
  zone: {
    id: 'zone',
    label: 'Zone',
    pluralLabel: 'Zones',
    icon: SquareDashedBottomCode,
    color: '#F59E0B',
    hierarchyLevel: 3,
    allowedParentTypes: ['floor', 'building'],
    canHaveChildren: false,
    showAreaField: true,
    showCapacityField: true,
    showDimensionsField: false,
  },
  garden: {
    id: 'garden',
    label: 'Garden',
    pluralLabel: 'Gardens',
    icon: Trees,
    color: '#22C55E',
    hierarchyLevel: 1,
    allowedParentTypes: ['campus', 'building'],
    canHaveChildren: false,
    showAreaField: true,
    showCapacityField: false,
    showDimensionsField: false,
  },
  parking: {
    id: 'parking',
    label: 'Parking',
    pluralLabel: 'Parking Areas',
    icon: ParkingCircle,
    color: '#64748B',
    hierarchyLevel: 1,
    allowedParentTypes: ['campus', 'building'],
    canHaveChildren: false,
    showAreaField: true,
    showCapacityField: true,
    showDimensionsField: false,
  },
  pool: {
    id: 'pool',
    label: 'Pool',
    pluralLabel: 'Pools',
    icon: PoolIcon,
    color: '#06B6D4',
    hierarchyLevel: 1,
    allowedParentTypes: ['campus', 'building'],
    canHaveChildren: false,
    showAreaField: true,
    showCapacityField: true,
    showDimensionsField: true,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Get all entity types as an ordered array (by hierarchy level, then alphabetically) */
export const getEntityTypeList = (): EntityTypeConfig[] =>
  Object.values(ENTITY_TYPES).sort((a, b) =>
    a.hierarchyLevel - b.hierarchyLevel || a.label.localeCompare(b.label)
  );

/** Get entity type config by ID, with fallback */
export const getEntityTypeConfig = (entityTypeId: string | null | undefined): EntityTypeConfig | null => {
  if (!entityTypeId) return null;
  return ENTITY_TYPES[entityTypeId.toLowerCase()] || null;
};

/** Get valid child entity types for a given parent entity type */
export const getValidChildTypes = (parentEntityTypeId: string): EntityTypeConfig[] =>
  Object.values(ENTITY_TYPES).filter((et) =>
    et.allowedParentTypes.includes(parentEntityTypeId.toLowerCase())
  );

/** Get entity types that can be root (no parent required) */
export const getRootEntityTypes = (): EntityTypeConfig[] =>
  Object.values(ENTITY_TYPES).filter((et) => et.allowedParentTypes.length === 0);

/**
 * Resolve entity type from an asset's specifications.entity_type field.
 * We store the entity type ID (e.g., 'campus', 'building') in specifications.entity_type.
 */
export const ENTITY_TYPE_SPEC_KEY = 'entity_type';
