// ============================================================================
// InstalmentActionModal — the Dues-tab action methodology, shared.
// ----------------------------------------------------------------------------
// Opened from an instalment chip (Money In; later any surface). Offers, for
// the selected billing event(s) of ONE contract:
//   · Record Payment — the EXISTING RecordPaymentDialog (same write path as
//     Contract Detail and the Dues tab), pre-ticked to these events
//   · Status corrections — ONLY the transitions the tenant's own state
//     machine allows (useTransitionMap), applied through
//     useContractEventOperations.updateEvent WITH the event's version so a
//     concurrent edit fails loudly instead of silently losing the race.
//
// The receivables payload doesn't carry event versions, so this modal fetches
// the contract's events fresh on open — that supplies both the version and
// the current status, protecting against a stale list behind the click.
// Deliberately mirrors the group-sessions Dues markCell behavior WITHOUT
// refactoring that page — Dues can adopt this component later, on purpose.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RecordPaymentDialog from '@/components/contracts/RecordPaymentDialog';
import { useContractEvents, useContractEventOperations } from '@/hooks/queries/useContractEventQueries';
import { useStatusMap, useTransitionMap } from '@/hooks/queries/useEventStatusConfigQueries';
import type { ContractEvent } from '@/types/contractEvents';

const fmtMoney = (n: number, currency = 'INR'): string =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Math.round(n).toLocaleString('en-IN')}`;
const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

  const statusMap = useStatusMap('billing');
  const transitionMap = useTransitionMap('billing');
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

  const [confirm, setConfirm] = useState<null | { event: ContractEvent; to: string }>(null);
  const [payOpen, setPayOpen] = useState(false);

  if (!isOpen) return null;

  const statusLabel = (code: string) => statusMap[code]?.display_name || code.replace(/_/g, ' ');
  const statusColor = (code: string) => statusMap[code]?.hex_color || colors.utility.secondaryText;
  const openEvents = events.filter((e) => (e.amount || 0) - (e.amount_settled || 0) > 0.001);

  const applyTransition = async () => {
    if (!confirm) return;
    try {
      // version travels with the write — losing a concurrent edit silently
      // would be worse than an error the user can see (Dues-tab rule).
      await updateEvent({ eventId: confirm.event.id, updateData: { status: confirm.to, version: confirm.event.version } as any });
      setConfirm(null);
      onChanged();
      eventsQuery.refetch();
    } catch {
      // useContractEventOperations already toasts the failure.
      setConfirm(null);
    }
  };

  return (
    <>
      <div role="dialog" aria-modal="true" aria-label="Instalment actions"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15,15,20,0.55)' }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border p-5"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}18` }}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <p className="text-sm font-bold" style={ink}>{buyerName || 'Instalment'}</p>
              <p className="text-xs" style={sub}>{contractNumber || contractId}</p>
            </div>
            <button onClick={onClose} style={sub}><X size={16} /></button>
          </div>

          {eventsQuery.isLoading ? (
            <div className="py-8 flex justify-center"><LoadingSpinner size="md" /></div>
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-sm" style={sub}>
              These instalments aren't loadable right now — refresh and try again.
            </p>
          ) : (
            <>
              {/* A real receipt, distinct from the status chips below — this
                  creates a receipt and settles the invoice. Hidden once
                  nothing here is still owed. (Same rule as the Dues tab.) */}
              {openEvents.length > 0 && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="w-full my-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-white"
                  style={{ backgroundColor: colors.semantic.success }}
                >
                  <Wallet size={13} /> Record Payment
                </button>
              )}

              {events.map((ev) => {
                const allowed = transitionMap[ev.status] || [];
                const open = (ev.amount || 0) - (ev.amount_settled || 0);
                return (
                  <div key={ev.id} className="mb-3 pb-3 border-b last:border-b-0 last:mb-0 last:pb-0"
                    style={{ borderColor: `${colors.utility.primaryText}10` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold tabular-nums" style={ink}>
                        {fmtMoney(ev.amount || 0, currency)}
                        <span className="font-normal" style={sub}> · {fmtDate(ev.scheduled_date)}</span>
                        {open > 0.001 && (ev.amount_settled || 0) > 0 && (
                          <span className="font-normal" style={{ color: colors.semantic.success }}> · {fmtMoney(ev.amount_settled || 0, currency)} received</span>
                        )}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: `${statusColor(ev.status)}1c`, color: statusColor(ev.status), border: `1px solid ${statusColor(ev.status)}45` }}>
                        {statusLabel(ev.status)}
                      </span>
                    </div>
                    {allowed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {allowed.map((to) => (
                          <button key={to} onClick={() => setConfirm({ event: ev, to })}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-full border text-[11px] font-semibold disabled:opacity-50"
                            style={{ color: statusColor(to), borderColor: `${statusColor(to)}50` }}>
                            {statusLabel(to)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* two-step confirm — a status change relabels money; it should
                  never happen on a single stray tap */}
              {confirm && (
                <div className="mt-3 rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3"
                  style={{ borderColor: `${colors.semantic.warning}55`, backgroundColor: `${colors.semantic.warning}10` }}>
                  <p className="text-xs" style={ink}>
                    Mark {fmtMoney(confirm.event.amount || 0, currency)} · {fmtDate(confirm.event.scheduled_date)} as{' '}
                    <b style={{ color: statusColor(confirm.to) }}>{statusLabel(confirm.to)}</b>?
                  </p>
                  <div className="flex gap-1.5 flex-none">
                    <button onClick={applyTransition} disabled={isUpdating}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50"
                      style={{ backgroundColor: colors.semantic.warning }}>
                      {isUpdating ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirm(null)} className="px-2 py-1.5 text-[11px] font-semibold" style={sub}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
