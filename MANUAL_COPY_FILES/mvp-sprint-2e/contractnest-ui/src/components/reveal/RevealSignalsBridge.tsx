// src/components/reveal/RevealSignalsBridge.tsx
//
// The missing half. RevealProvider holds signals but deliberately does not
// fetch; without something pushing real numbers in, every signal stays
// undefined, every rule fails open, and the whole module is inert. This is
// what makes it live.
//
// It renders nothing. Mount it once, inside the provider, above the app shell.
//
// COST, STATED PLAINLY
// The original design note said "adds no queries". That could not survive
// contact with the fact that no screen holds these numbers globally — the
// sidebar renders on every page and needs the answer before the dashboard has
// fetched anything. So this does query, using the SAME hooks the rest of the
// app already uses, which means React Query dedupes and caches rather than
// duplicating work:
//
//   useContractStats()   shared with the dashboard's existing call
//   useGroupSessions()   shared with the group-sessions dashboard
//
// TWO cached reads per session, not per page — the contract stats response
// already carries by_contract_type (contracts.ts:616), so the expense-side
// count comes out of the same payload as the total rather than a second call.
// That is the honest price of the sidebar knowing anything at all.
//
// SAFETY
// Every push is guarded on the query having actually succeeded. While a query
// is loading or errored the signal stays undefined, which fails open, which
// shows the surface. A slow or broken API can therefore never blank out a
// tenant's navigation — it can only fail to hide something.

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useContractStats } from '@/hooks/queries/useContractQueries';
import { useGroupSessions } from '@/hooks/queries/useGroupSessionsDashboard';
import { useRevealSignals } from './useReveal';

/**
 * Production carries exactly two contract_type values: 'client' (the revenue
 * side) and 'partner' (everything else). Any 'partner' contract means the
 * expense side is real for this tenant.
 */
const EXPENSE_CONTRACT_TYPE = 'partner';

const countOf = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return undefined;
};

export const RevealSignalsBridge: React.FC = () => {
  const { currentTenant } = useAuth();
  const { setSignals } = useRevealSignals();

  const enabled = !!currentTenant?.id;

  const allStats = useContractStats(undefined, { enabled });
  const groupSessions = useGroupSessions({ enabled });

  // contractCount → catalog-studio
  // vendorContractCount → perspective (and, transitively, payables)
  useEffect(() => {
    if (!allStats.isSuccess) return;
    const data = allStats.data as
      | { total?: unknown; by_contract_type?: Record<string, unknown> }
      | undefined;

    const next: { contractCount?: number; vendorContractCount?: number } = {};

    const total = countOf(data?.total);
    if (total !== undefined) next.contractCount = total;

    // by_contract_type is only meaningful once we know the breakdown exists;
    // an absent key legitimately means zero of that type, but an absent MAP
    // means we do not know, and not-knowing must fail open.
    const breakdown = data?.by_contract_type;
    if (breakdown && typeof breakdown === 'object') {
      next.vendorContractCount = countOf(breakdown[EXPENSE_CONTRACT_TYPE]) ?? 0;
    }

    if (Object.keys(next).length > 0) setSignals(next);
  }, [allStats.isSuccess, allStats.data, setSignals]);

  // usesGroupSessions → group-sessions nav
  useEffect(() => {
    if (!groupSessions.isSuccess) return;
    const raw = groupSessions.data as unknown;
    const rows = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
    const count = countOf(rows);
    if (count !== undefined) setSignals({ usesGroupSessions: count > 0 });
  }, [groupSessions.isSuccess, groupSessions.data, setSignals]);

  return null;
};

export default RevealSignalsBridge;
