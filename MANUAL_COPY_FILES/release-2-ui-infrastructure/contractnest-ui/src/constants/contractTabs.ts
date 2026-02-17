// src/constants/contractTabs.ts
// Role-aware tab definitions for contract detail view
// SELLER_TABS: full access tabs for the contract owner
// BUYER_TABS: limited tabs visible to the buyer/counterparty

import {
  Calendar,
  DollarSign,
  Camera,
  MessageSquare,
  ScrollText,
  FileText,
} from 'lucide-react';

// =================================================================
// TAB ID TYPE
// =================================================================

export type ContractTabId =
  | 'operations'
  | 'financials'
  | 'evidence'
  | 'communication'
  | 'audit'
  | 'document';

// =================================================================
// TAB DEFINITION SHAPE
// =================================================================

export interface ContractTabDef {
  id: ContractTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// =================================================================
// SELLER TABS — full access (contract owner/creator)
// =================================================================

export const SELLER_TABS: ContractTabDef[] = [
  { id: 'operations', label: 'Ops Overview', icon: Calendar },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'evidence', label: 'Evidence', icon: Camera },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'document', label: 'Document', icon: FileText },
];

// =================================================================
// BUYER TABS — limited view (counterparty who accepted/claimed)
// =================================================================

export const BUYER_TABS: ContractTabDef[] = [
  { id: 'operations', label: 'Overview', icon: Calendar },
  { id: 'financials', label: 'Payments', icon: DollarSign },
  { id: 'evidence', label: 'Evidence', icon: Camera },
  { id: 'document', label: 'Contract', icon: FileText },
];

// =================================================================
// HELPER — get tabs for a given role
// =================================================================

export function getTabsForRole(role: 'seller' | 'buyer' | 'viewer' | 'unknown'): ContractTabDef[] {
  switch (role) {
    case 'seller':
      return SELLER_TABS;
    case 'buyer':
      return BUYER_TABS;
    case 'viewer':
      return BUYER_TABS; // Viewers see same limited tabs as buyers
    default:
      return SELLER_TABS; // Fallback to full tabs
  }
}
