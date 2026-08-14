// ============================================================================
// InstalmentActionModal — THE instalment dialog. One copy, two callers.
// ----------------------------------------------------------------------------
// Originally cloned from the Group Sessions Dues tab (owner: "use the logic and
// approach we have in Dues"). In Part 2 the Dues tab was moved onto this
// component, so the markup now exists once instead of twice:
//   · title + subtitle ("month · contract")
//   · full-width green Record Payment (the EXISTING RecordPaymentDialog,
//     pre-ticked to these events) — hidden once nothing is still owed
//   · per instalment: amount · date, status pill, then tinted rounded-lg
//     transition chips offering ONLY what the tenant's state machine allows;
//     terminal statuses say "X is final — cannot be changed from here"
//   · bottom full-width Close
//   · a STACKED confirm dialog ("Mark as Waived?") with consequence copy and
//     the action button colored by the target status
//
// TWO WAYS TO SUPPLY THE INSTALMENTS, and the difference matters:
//   · `events` given  — the caller already holds them WITH their `version`
//     (Dues: gs_dues_matrix returns it per cell). No network call at all.
//   · `events` absent — the receivables payload carries no `version`, so this
//     component fetches the contract's billing events itself (Money In).
// Either way the version travels with the write: another surface can be
// changing the same instalment, and losing that race silently would be worse
// than an error the user can see.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RecordPaymentDialog from '@/components/contracts/RecordPaymentDialog';
import { useContractEvents, useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import { fmtMoney, fmtDateShort, fmtMonth } from '@/utils/format';
import type { ContractEvent } from '@/types/contractEvents';

/**
 * The minimum an instalment needs to be actionable here. Deliberately narrower
 * than ContractEvent so callers holding a different row shape (GsDuesCellEvent)
 * can pass theirs straight through — the two differ only in field names.
 */
export interface InstalmentRow {
  id: string;
  /** Optimistic-concurrency token — PATCH /api/contract-events/:id needs it. */
  version: number;
  /** Real status code, matching m_event_status_config. */
  status: string;
  amount: number;
  settled: number;
  date: string | null;
}

const fromContractEvent = (e: ContractEvent): InstalmentRow => ({
  id: e.id,
  version: (e as any).version,
  status: e.status,
  amount: e.amount || 0,
  settled: (e as any).amount_settled || 0,
  date: e.scheduled_date ?? null,
});

interface InstalmentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractNumber?: string | null;
  buyerName?: string | null;
  /** Billing event ids this modal acts on (usually the clicked chip's id). */
  eventIds: string[];
  /**
   * Pre-loaded instalments, when the caller already has them with versions.
   * Supplying these skips the fetch entirely — and `eventIds` is then only a
   * fallback, since these rows already say exactly what to act on.
   */
  events?: InstalmentRow[];
  currency?: string;
  /** Overrides the derived "month · contract" line under the title. */
  subtitle?: React.ReactNode;
  /**
   * Consequence sentence shown when confirming a move to a terminal status
   * other than paid. Defaults to the Finance wording; Group Sessions passes a
   * version that also names the member's check-in page.
   */
  terminalConsequence?: string;
  /** Fired after any successful write so the caller can refetch its lists. */
  onChanged: () => void;
}

const InstalmentActionModal: React.FC<InstalmentActionModalProps> = ({
  isOpen, onClose, contractId, contractNumber, buyerName, eventIds,
  events: suppliedEvents, currency = 'INR', subtitle, terminalConsequence, onChanged,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const ink: React.CSSProperties = { color: colors.utility.primaryText };
  const sub: React.CSSProperties = { color: colors.utility.secondaryText };

  const billingStatusMap = useStatusMap('billing');
  const billingTransitions = useTransitionMap('billing');
  const { updateEvent, isUpdating } = useContractEventOperations();

  // Fetched ONLY when the caller has nothing to give us.
  const needsFetch = !suppliedEvents;
  const eventsQuery = useContractEvents(
    { contract_id: contractId, event_type: 'billing', per_page: 100, sort_by: 'scheduled_date', sort_order: 'asc' },
    { enabled: isOpen && needsFetch && !!contractId }
  );

  const events: InstalmentRow[] = useMemo(() => {
    if (suppliedEvents) return suppliedEvents;
    return (eventsQuery.data?.items || [])
      .filter((e) => eventIds.includes(e.id))
      .map(fromContractEvent);
  }, [suppliedEvents, eventsQuery.data, eventIds]);

  const [markConfirm, setMarkConfirm] = useState<null | { event: InstalmentRow; to: string }>(null);
  const [payOpen, setPayOpen] = useState(false);

  if (!isOpen) return null;

  const statusLabel = (code: string) => billingStatusMap[code]?.display_name || code.replace(/_/g, ' ');
  const statusColor = (code: string) => billingStatusMap[code]?.hex_color || colors.utility.secondaryText;
  const openEvents = events.filter((e) => e.amount - e.settled > 0.001);
  const derivedSubtitle = subtitle ?? (
    <>{events.length === 1 && fmtMonth(events[0].date) ? `${fmtMonth(events[0].date)} · ` : ''}{contractNumber || contractId}</>
  );

  // After a write the instalment's status AND version have both moved on.
  // When we fetched the rows ourselves we can just refetch and stay open.
  // When the CALLER supplied them, what we hold is a snapshot it cannot update
  // — leaving the dialog open would show a stale status and offer transitions
  // that would fail on the dead version. So we close and let the caller's own
  // refetch redraw. (This is exactly what the Dues tab did before it adopted
  // this component: mark → both dialogs close → grid refetches.)
  const afterWrite = () => {
    onChanged();
    if (needsFetch) eventsQuery.refetch();
    else onClose();
  };

  const applyMark = async () => {
    if (!markConfirm) return;
    const { event, to } = markConfirm;
    try {
      await updateEvent({ eventId: event.id, updateData: { status: to, version: event.version } as any });
      setMarkConfirm(null);
      afterWrite();
    } catch {
      // useContractEventOperations already surfaces a toast on failure.
      setMarkConfirm(null);
    }
  };

  return (
    <>
      <div
        role="dialog" aria-modal="true" aria-label="Change instalment status"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15,15,20,0.55)' }}
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '18' }}>
          <p className="text-sm font-bold" style={ink}>{buyerName || 'Instalment'}</p>
          <p className="text-xs mb-4" style={sub}>{derivedSubtitle}</p>

          {needsFetch && eventsQuery.isLoading ? (
            <div className="py-8 flex justify-center"><LoadingSpinner size="md" /></div>
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-sm" style={sub}>
              These instalments aren't loadable right now — refresh and try again.
            </p>
          ) : (
            <>
              {/* A real receipt, distinct from the status chips below —
                  this creates a real receipt and settles the invoice.
                  Hidden once nothing here is still owed. */}
              {openEvents.length > 0 && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="w-full mb-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: colors.semantic.success, color: '#fff' }}
                >
                  <Wallet size={13} /> Record Payment
                </button>
              )}

              {events.map((ev) => {
                const allowed = billingTransitions[ev.status] || [];
                return (
                  <div key={ev.id} className="mb-3 pb-3 border-b last:border-b-0 last:mb-0 last:pb-0"
                    style={{ borderColor: colors.utility.primaryText + '10' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold tabular-nums" style={ink}>
                        {fmtMoney(ev.amount, currency)}
                        <span className="font-normal" style={sub}> · {fmtDateShort(ev.date)}</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: `${statusColor(ev.status)}1c`, color: statusColor(ev.status), border: `1px solid ${statusColor(ev.status)}45` }}>
                        {statusLabel(ev.status)}
                      </span>
                    </div>
                    {allowed.length === 0 ? (
                      <p className="text-[11px]" style={sub}>
                        {statusLabel(ev.status)} is final — this instalment cannot be changed from here.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allowed.map((to) => (
                          <button key={to}
                            onClick={() => setMarkConfirm({ event: ev, to })}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                            style={{ backgroundColor: statusColor(to) + '18', borderColor: statusColor(to) + '45', color: statusColor(to) }}
                          >
                            {statusLabel(to)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <button onClick={onClose}
            className="w-full mt-4 py-2 rounded-lg border text-xs font-semibold"
            style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}>
            Close
          </button>
        </div>
      </div>

      {/* Stacked confirm — a status change relabels money and must never
          happen on a single stray tap. */}
      {markConfirm && (
        <div
          role="dialog" aria-modal="true" aria-label="Confirm status change"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,15,20,0.65)' }}
          onClick={() => !isUpdating && setMarkConfirm(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border p-5"
            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '18' }}>
            <p className="text-sm font-bold mb-2" style={ink}>
              Mark as {statusLabel(markConfirm.to)}?
            </p>
            <p className="text-xs mb-1" style={sub}>
              <b style={ink}>{buyerName || contractNumber}</b>
              {fmtMonth(markConfirm.event.date) ? <> · {fmtMonth(markConfirm.event.date)}</> : null} ·{' '}
              <b style={ink}>{fmtMoney(markConfirm.event.amount, currency)}</b>
            </p>
            <p className="text-xs mb-4" style={sub}>
              {(billingStatusMap[markConfirm.to]?.is_terminal && markConfirm.to !== 'paid')
                ? (terminalConsequence
                  || 'This writes the amount off. It stops counting as arrears here and in Finance.')
                : 'This changes what the buyer is shown as owing.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setMarkConfirm(null)} disabled={isUpdating}
                className="flex-1 py-2 rounded-lg border text-xs font-semibold disabled:opacity-40"
                style={{ borderColor: colors.utility.secondaryText + '30', ...ink }}>
                Cancel
              </button>
              <button onClick={applyMark} disabled={isUpdating}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: statusColor(markConfirm.to) }}>
                {isUpdating ? 'Saving…' : `Mark ${statusLabel(markConfirm.to)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {payOpen && (
        <RecordPaymentDialog
          isOpen={payOpen}
          onClose={() => setPayOpen(false)}
          contractId={contractId}
          preselectedEventIds={openEvents.map((e) => e.id)}
          onSuccess={() => {
            setPayOpen(false);
            afterWrite();
          }}
        />
      )}
    </>
  );
};

export default InstalmentActionModal;
