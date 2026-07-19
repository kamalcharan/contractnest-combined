// src/components/contracts/fleet/fleetTypes.ts
// Fleet Logbook (Batch B) — shared types + client-side join between
// contract equipment details and the Sprint 3 per-asset event rows.
// No backend change: everything is derived from data the tab already
// has access to (equipment_details prop + the two contract-event queries).

import type { ContractEquipmentDetail } from '@/types/contracts';
import type { ContractEvent } from '@/types/contractEvents';
import type { ContractEventAssetRow } from '@/hooks/queries/useContractEventQueries';

// =================================================================
// TYPES
// =================================================================

/** One machine visit — a per-asset row joined to its parent event, OR a
 * visit synthesized from a service event alone when no per-asset rows
 * exist yet (contracts created before Sprint 3 seeding, or fresh
 * contracts whose per-asset grain hasn't been generated). */
export interface MachineVisit {
  /** Stable React key: row id when present, otherwise the event id */
  key: string;
  /** Per-asset row; null when the visit is derived from the event only */
  row: ContractEventAssetRow | null;
  /** Parent event (null if the event list didn't include it) */
  event: ContractEvent | null;
  /** ISO date key (yyyy-mm-dd) from the event's scheduled_date; '' when unknown */
  dateKey: string;
  isProven: boolean;
  /** Not proven AND the parent event is overdue / past-date (and not closed) */
  isOverdue: boolean;
  isLocked: boolean;
}

/** Aggregated service state for a single machine (equipment detail) */
export interface MachineServiceState {
  /** ContractEquipmentDetail.id */
  machineId: string;
  /** All joined rows, sorted chronologically by event date */
  visits: MachineVisit[];
  provenCount: number;
  totalVisits: number;
  overdueCount: number;
  /** Earliest non-proven event date >= today (ISO date key), null if none */
  nextDueDate: string | null;
  /** Most recent proven visit info, null if nothing proven yet */
  lastProven: { dateKey: string | null; assignee: string | null } | null;
}

// =================================================================
// HELPERS
// =================================================================

/** Local-timezone ISO date key (yyyy-mm-dd) for "today" */
export function localTodayKey(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** "24 Jul" / "24 Jul '27" (year shown only when it differs from the current year) */
export function formatShortDate(dateKey: string | null | undefined): string {
  if (!dateKey) return '—';
  const d = new Date(dateKey + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = `${d.getDate()} ${months[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} '${String(d.getFullYear()).slice(2)}`;
}

/** Event statuses that mean "this visit is closed, don't flag it overdue" */
const CLOSED_EVENT_STATUSES = new Set(['completed', 'cancelled', 'skipped']);

// =================================================================
// JOIN — equipment details × event-asset rows × events
// =================================================================

/**
 * Build the per-machine service map.
 *
 * asset_ref on a row stores EITHER the equipment_details entry id OR the
 * asset registry id — both are matched (a row is attributed to the first
 * detail that claims it, deduped by row id).
 *
 * Service events with NO per-asset row for a machine still produce a
 * visit (synthesized from the event alone) — the fleet view must render
 * the full service story even before Sprint 3 per-asset rows exist.
 */
export function buildFleetServiceMap(
  details: ContractEquipmentDetail[],
  events: ContractEvent[],
  assetRowsByEvent: Record<string, ContractEventAssetRow[]>,
): Map<string, MachineServiceState> {
  const eventById = new Map<string, ContractEvent>();
  for (const e of events) eventById.set(e.id, e);
  const serviceEvents = events.filter((e) => e.event_type === 'service');

  // Index rows by asset_ref for O(1) lookup per machine.
  // DEFENSIVE: the event-assets endpoint has no backend handler today, so
  // the "record of arrays" the hook's type promises may actually be any
  // JSON object — only iterate values that really are arrays.
  const rowsByRef = new Map<string, ContractEventAssetRow[]>();
  const buckets = assetRowsByEvent && typeof assetRowsByEvent === 'object' ? Object.values(assetRowsByEvent) : [];
  for (const rows of buckets) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (!r?.asset_ref) continue;
      const bucket = rowsByRef.get(r.asset_ref);
      if (bucket) bucket.push(r);
      else rowsByRef.set(r.asset_ref, [r]);
    }
  }

  const todayKey = localTodayKey();
  const map = new Map<string, MachineServiceState>();

  for (const detail of details) {
    const candidates: ContractEventAssetRow[] = [];
    const seen = new Set<string>();
    const byDetailId = rowsByRef.get(detail.id) || [];
    const byRegistryId = detail.asset_registry_id ? rowsByRef.get(detail.asset_registry_id) || [] : [];
    for (const r of [...byDetailId, ...byRegistryId]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      candidates.push(r);
    }

    const visits: MachineVisit[] = candidates.map((row) => {
      const event = eventById.get(row.event_id) || null;
      const dateKey = event?.scheduled_date ? event.scheduled_date.split('T')[0] : '';
      const isProven = row.status === 'proven';
      const isLocked = row.status === 'blocked_placeholder';
      const isOverdue =
        !isProven &&
        !isLocked &&
        !!event &&
        (event.status === 'overdue' ||
          (!!dateKey && dateKey < todayKey && !CLOSED_EVENT_STATUSES.has(event.status)));
      return { key: row.id, row, event, dateKey, isProven, isOverdue, isLocked };
    });

    // Synthesize visits for service events this machine has no row for —
    // the event itself is the visit until per-asset grain exists.
    const coveredEventIds = new Set(visits.map((v) => v.row?.event_id).filter(Boolean));
    for (const event of serviceEvents) {
      if (coveredEventIds.has(event.id)) continue;
      const dateKey = event.scheduled_date ? event.scheduled_date.split('T')[0] : '';
      const isProven = event.status === 'completed';
      const isOverdue =
        !isProven &&
        (event.status === 'overdue' ||
          (!!dateKey && dateKey < todayKey && !CLOSED_EVENT_STATUSES.has(event.status)));
      visits.push({
        key: `evt-${event.id}`,
        row: null,
        event,
        dateKey,
        isProven,
        isOverdue,
        isLocked: false,
      });
    }

    // Chronological (unknown dates last)
    visits.sort((a, b) => {
      if (!a.dateKey && !b.dateKey) return 0;
      if (!a.dateKey) return 1;
      if (!b.dateKey) return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });

    const provenCount = visits.filter((v) => v.isProven).length;
    const overdueCount = visits.filter((v) => v.isOverdue).length;

    let nextDueDate: string | null = null;
    for (const v of visits) {
      if (!v.isProven && v.dateKey && v.dateKey >= todayKey) {
        nextDueDate = v.dateKey;
        break; // visits are sorted asc — first hit is the earliest
      }
    }

    let lastProven: MachineServiceState['lastProven'] = null;
    for (const v of visits) {
      if (!v.isProven) continue;
      // visits sorted asc — keep overwriting to end at the most recent
      lastProven = {
        dateKey: v.row?.proven_at ? v.row.proven_at.split('T')[0] : v.dateKey || null,
        assignee: v.row?.assignee || v.event?.assigned_to_name || null,
      };
    }

    map.set(detail.id, {
      machineId: detail.id,
      visits,
      provenCount,
      totalVisits: visits.length,
      overdueCount,
      nextDueDate,
      lastProven,
    });
  }

  return map;
}
