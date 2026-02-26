// src/types/relationships.ts
// Unified Relationships view — merges contacts + contracts into a single list model.
// The contact becomes the "Relationship" parent row, contracts nest underneath.

import type { Contact } from './contacts';
import type { Contract, ContractStatus, ContractPortfolioStats } from './contracts';

// =================================================================
// RELATIONSHIP ROW — one per contact (parent row in unified list)
// =================================================================

/** Aggregated contract stats per relationship (contact) */
export interface RelationshipContractSummary {
  contract_count: number;
  total_value: number;
  total_collected: number;
  outstanding: number;
  avg_health: number;
  overdue_events: number;
  by_status: Partial<Record<ContractStatus, number>>;
}

/** A single relationship row = contact + contract summary */
export interface Relationship {
  /** The underlying contact */
  contact: Contact;
  /** Aggregated contract stats (populated client-side from contracts data) */
  contractSummary: RelationshipContractSummary;
  /** Whether this relationship has been expanded to show contract sub-rows */
  _expanded?: boolean;
}

// =================================================================
// FILTER & SORT TYPES
// =================================================================

export type RelationshipSortOption =
  | 'name'
  | 'contract_count'
  | 'total_value'
  | 'health'
  | 'last_activity'
  | 'created_at';

export type RelationshipPerspective = 'revenue' | 'expense';

export interface RelationshipListFilters {
  perspective: RelationshipPerspective;
  status?: ContractStatus | null;       // Filter by contract status
  contactStatus?: 'active' | 'inactive' | 'archived'; // Filter by contact status
  search?: string;
  sortBy?: RelationshipSortOption;
  sortDirection?: 'asc' | 'desc';
  classification?: string;              // buyer, seller, vendor, partner
  page?: number;
  limit?: number;
}

// =================================================================
// RESPONSE TYPES (for the unified query hook)
// =================================================================

export interface RelationshipListResponse {
  relationships: Relationship[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Portfolio-level summary for the top strip */
export interface RelationshipPortfolioSummary {
  totalRelationships: number;
  totalContracts: number;
  totalValue: number;
  totalCollected: number;
  outstanding: number;
  avgHealth: number;
  overdueEvents: number;
  needsAttention: number;
  byContractStatus: Partial<Record<ContractStatus, number>>;
}
