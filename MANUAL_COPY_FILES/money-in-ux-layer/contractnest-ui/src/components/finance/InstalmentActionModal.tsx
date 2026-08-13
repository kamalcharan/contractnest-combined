// ============================================================================
// InstalmentActionModal — the Dues-tab dialog, cloned as a shared component.
// ----------------------------------------------------------------------------
// Layout, styles and flow mirror the Group Sessions Dues markCell/markConfirm
// dialogs verbatim (owner: "use the logic and approach we have in Dues"):
//   · title + "month · contract" subtitle
//   · full-width green Record Payment (the EXISTING RecordPaymentDialog,
//     pre-ticked to these events) — hidden once nothing is still owed
//   · per instalment: amount · date, status pill, then tinted rounded-lg
//     transition chips offering ONLY what the tenant's state machine allows;
//     terminal statuses say "X is final — cannot be changed from here"
//   · bottom full-width Close
//   · a STACKED confirm dialog ("Mark as Waived?") with consequence copy and
//     the action button colored by the target status
// One deliberate logic addition: the receivables payload carries no event
// `version`, so this modal fetches the contract's events fresh on open —
// the same optimistic-concurrency rule Dues follows (version travels with
// the write; losing a race silently would be worse than a visible error).
// The Dues tab keeps its inline copy untouched; it can adopt this later.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RecordPaymentDialog from '@/components/contracts/RecordPaymentDialog';
import { useContractEvents, useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import type { ContractEvent } from '@/types/contractEvents';

const money = (n: number, currency = 'INR'): string =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Math.round(n).toLocaleString('en-IN')}`;
const fmtShort = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const monthLabelOf = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

interface InstalmentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractNumber?: string | null;
  buyerName?: string | null;
  /** Billing event ids this modal acts on (usually the clicked chip's id). */
  eventIds: string[];
  currency?: string;
  /** Fired after any successful write so the caller can refetch its lists. */
  onChanged: () => void;
}

const InstalmentActionModal: React.FC<InstalmentActionModalProps> = ({
  isOpen, onClose, contractId, contractNumber, buyerName, eventIds, currency = 'INR', onChanged,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const ink: React.CSSProperties = { color: colors.utility.primaryText };
  const sub: React.CSSProperties = { color: colors.utility.secondaryText };

  const billingStatusMap = useStatusMap('billing');
  const billingTransitions = useTransitionMap('billing');
  const { updateEvent, isUpdating } = useContractEventOperations();

  // Fresh events for THIS contract — source of version + current status.
  const eventsQuery = useContractEvents(
    { contract_id: contractId, event_type: 'billing', per_page: 100, sort_by: 'scheduled_date', sort_order: 'asc' },
    { enabled: isOpen && !!contractId }
  );

  const events: ContractEvent[] = useMemo(() => {
    const all = eventsQuery.data?.items || [];
    return all.filter((e) => eventIds.includes(e.id));
  }, [eventsQuery.data, eventIds]);

  const [markConfirm, setMarkConfirm] = useState<null | { event: ContractEvent; to: string }>(null);
  const [payOpen, setPayOpen] = useState(false);

  if (!isOpen) return null;

  const statusLabel = (code: string) => billingStatusMap[code]?.display_name || code.replace(/_/g, ' ');
  const statusColor = (code: string) => billingStatusMap[code]?.hex_color || colors.utility.secondaryText;
  const openEvents = events.filter((e) => (e.amount || 0) - (e.amount_settled || 0) > 0.001);
  const monthLabel = events.length === 1 ? monthLabelOf(events[0].scheduled_date) : null;

  const applyMark = async () => {
    if (!markConfirm) return;
    const { event, to } = markConfirm;
    try {
      // version travels with the write — another surface can be changing the
      // same instalment, and losing that race silently would be worse than
      // an error the user can see. (Dues-tab rule, kept.)
      await updateEvent({ eventId: event.id, updateData: { status: to, version: event.version } as any });
      setMarkConfirm(null);
      onChanged();
      eventsQuery.refetch();
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
          <p className="text-xs mb-4" style={sub}>
            {monthLabel ? `${monthLabel} · ` : ''}{contractNumber || contractId}
          </p>

          {eventsQuery.isLoading ? (
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
                        {money(ev.amount || 0, currency)}
                        <span className="font-normal" style={sub}> · {fmtShort(ev.scheduled_date)}</span>
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
          happen on a single stray tap. Same layering as the Dues tab. */}
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
              {monthLabelOf(markConfirm.event.scheduled_date) ? <> · {monthLabelOf(markConfirm.event.scheduled_date)}</> : null} ·{' '}
              <b style={ink}>{money(markConfirm.event.amount || 0, currency)}</b>
            </p>
            <p className="text-xs mb-4" style={sub}>
              {(billingStatusMap[markConfirm.to]?.is_terminal && markConfirm.to !== 'paid')
                ? 'This writes the amount off. It stops counting as arrears here and in Finance.'
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
            onChanged();
            eventsQuery.refetch();
          }}
        />
      )}
    </>
  );
};

export default InstalmentActionModal;
