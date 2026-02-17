// src/hooks/useContractRole.ts
// Dual-persona Role Hook — determines the current tenant's role on a contract
// Pure computation: no API calls, derives role from contract fields + auth context

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Contract, ContractStatus } from '@/types/contracts';

// =================================================================
// TYPES
// =================================================================

export type ContractRole = 'seller' | 'buyer' | 'viewer' | 'unknown';

export interface ContractRoleResult {
  /** Resolved role for the current tenant on this contract */
  role: ContractRole;

  /** Convenience booleans */
  isSeller: boolean;
  isBuyer: boolean;
  /** True when the current tenant owns the contract (seller_id or tenant_id match) */
  isOwner: boolean;

  /** Human-readable label: "Seller", "Buyer", "Viewer", "Unknown" */
  roleLabel: string;

  /** Permission flags derived from role + contract status */
  permissions: ContractPermissions;
}

export interface ContractPermissions {
  /** Can edit contract fields (title, description, blocks, etc.) */
  canEdit: boolean;
  /** Can soft-delete the contract */
  canDelete: boolean;
  /** Can transition contract status */
  canChangeStatus: boolean;
  /** Can send contract to counterparty */
  canSend: boolean;
  /** Can accept/sign off on the contract */
  canAccept: boolean;
  /** Can add/remove blocks */
  canManageBlocks: boolean;
  /** Can record payments / manage invoices */
  canManageInvoices: boolean;
}

// =================================================================
// CONSTANTS
// =================================================================

const ROLE_LABELS: Record<ContractRole, string> = {
  seller: 'Seller',
  buyer: 'Buyer',
  viewer: 'Viewer',
  unknown: 'Unknown',
};

/** Statuses where the seller can still edit the contract */
const SELLER_EDITABLE_STATUSES: Set<ContractStatus> = new Set([
  'draft',
  'pending_review',
]);

/** Statuses where the contract can be soft-deleted */
const DELETABLE_STATUSES: Set<ContractStatus> = new Set([
  'draft',
  'cancelled',
]);

/** Statuses where the contract can be sent to the buyer */
const SENDABLE_STATUSES: Set<ContractStatus> = new Set([
  'draft',
  'pending_review',
]);

/** Statuses where the buyer can accept */
const BUYER_ACCEPT_STATUSES: Set<ContractStatus> = new Set([
  'pending_acceptance',
]);

// =================================================================
// HOOK
// =================================================================

/**
 * Determines the current tenant's role on a given contract.
 *
 * Usage:
 * ```tsx
 * const { role, isSeller, permissions } = useContractRole(contract);
 * if (permissions.canEdit) { ... }
 * ```
 */
export function useContractRole(contract: Contract | null | undefined): ContractRoleResult {
  const { currentTenant } = useAuth();

  return useMemo<ContractRoleResult>(() => {
    // No contract or no tenant — unknown
    if (!contract || !currentTenant?.id) {
      return buildResult('unknown', null);
    }

    const tenantId = currentTenant.id;
    const sellerId = contract.seller_id || contract.tenant_id;
    const buyerTenantId = contract.buyer_tenant_id;

    // Resolve role
    let role: ContractRole;

    if (tenantId === sellerId) {
      role = 'seller';
    } else if (buyerTenantId && tenantId === buyerTenantId) {
      role = 'buyer';
    } else {
      // Tenant is neither seller nor buyer — they can view (e.g. via shared link)
      role = 'viewer';
    }

    return buildResult(role, contract);
  }, [contract, currentTenant?.id]);
}

// =================================================================
// HELPERS
// =================================================================

function buildResult(role: ContractRole, contract: Contract | null): ContractRoleResult {
  const permissions = derivePermissions(role, contract);

  return {
    role,
    isSeller: role === 'seller',
    isBuyer: role === 'buyer',
    isOwner: role === 'seller',
    roleLabel: ROLE_LABELS[role],
    permissions,
  };
}

function derivePermissions(role: ContractRole, contract: Contract | null): ContractPermissions {
  // No contract — no permissions
  if (!contract) {
    return {
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      canSend: false,
      canAccept: false,
      canManageBlocks: false,
      canManageInvoices: false,
    };
  }

  const status = contract.status;

  if (role === 'seller') {
    return {
      canEdit: SELLER_EDITABLE_STATUSES.has(status),
      canDelete: DELETABLE_STATUSES.has(status),
      canChangeStatus: true,
      canSend: SENDABLE_STATUSES.has(status),
      canAccept: false, // Sellers don't accept their own contracts
      canManageBlocks: SELLER_EDITABLE_STATUSES.has(status),
      canManageInvoices: status === 'active' || status === 'completed',
    };
  }

  if (role === 'buyer') {
    return {
      canEdit: false, // Buyers cannot edit seller's contract
      canDelete: false,
      canChangeStatus: false,
      canSend: false,
      canAccept: BUYER_ACCEPT_STATUSES.has(status),
      canManageBlocks: false,
      canManageInvoices: status === 'active' || status === 'completed',
    };
  }

  // Viewer / unknown — read-only
  return {
    canEdit: false,
    canDelete: false,
    canChangeStatus: false,
    canSend: false,
    canAccept: false,
    canManageBlocks: false,
    canManageInvoices: false,
  };
}

export default useContractRole;
