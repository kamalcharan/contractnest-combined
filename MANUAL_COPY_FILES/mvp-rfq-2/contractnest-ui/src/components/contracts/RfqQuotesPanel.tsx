// ============================================================================
// RfqQuotesPanel — compare vendor quotes on an RFQ, and award one
// ============================================================================
// Drops into the contract detail page for record_type 'rfq'. The read side was
// already there (VendorsCard rendered name, status and quoted_amount); what
// was missing was ordering by price, the per-line breakdown, and the act of
// choosing. This replaces VendorsCard for RFQs and leaves it untouched for
// contracts, which still list vendors without any of this.
//
// AWARDING DOES NOT CREATE A CONTRACT. The product's model is that the vendor
// initiates the contract, so awarding marks the winner, declines the rest and
// moves the RFQ to 'awarded'. The copy on the confirm step says exactly that,
// because a buyer clicking "Award" will otherwise assume a contract now exists.

import React, { useMemo, useState } from 'react';
import { Users, Check, Clock, X, Trophy, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';

interface QuoteBreakdownRow {
  block_id?: string;
  block_name?: string;
  unit_price?: number;
  quantity?: number;
  total_price?: number;
}

export interface RfqVendorRow {
  id?: string;
  vendor_id: string;
  vendor_name?: string | null;
  vendor_company?: string | null;
  vendor_email?: string | null;
  response_status?: 'pending' | 'quoted' | 'declined' | 'accepted' | null;
  quoted_amount?: number | null;
  quote_notes?: string | null;
  quote_breakdown?: QuoteBreakdownRow[] | null;
  quote_valid_until?: string | null;
  decline_reason?: string | null;
  responded_at?: string | null;
  viewed_at?: string | null;
}

interface RfqQuotesPanelProps {
  contractId: string;
  vendors: RfqVendorRow[];
  currency?: string | null;
  rfqStatus?: string | null;
  colors: any;
  formatCurrency: (n: number, c?: string) => string;
  /** Called after a successful award so the page can refetch. */
  onAwarded?: () => void;
}

const STATUS_META: Record<string, { label: string; tone: 'ok' | 'warn' | 'muted' | 'err' }> = {
  pending:  { label: 'Not answered yet', tone: 'muted' },
  quoted:   { label: 'Quoted',           tone: 'warn'  },
  accepted: { label: 'Awarded',          tone: 'ok'    },
  declined: { label: 'Declined',         tone: 'err'   },
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const RfqQuotesPanel: React.FC<RfqQuotesPanelProps> = ({
  contractId, vendors, currency, rfqStatus, colors, formatCurrency, onAwarded,
}) => {
  const { addToast } = useVaNiToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<RfqVendorRow | null>(null);
  const [awarding, setAwarding] = useState(false);

  // Cheapest quote first, then everyone who hasn't answered, then declines.
  // An already-accepted vendor always leads regardless of price.
  const ordered = useMemo(() => {
    const rank = (v: RfqVendorRow) => {
      switch (v.response_status) {
        case 'accepted': return 0;
        case 'quoted':   return 1;
        case 'pending':  return 2;
        default:         return 3;
      }
    };
    return [...vendors].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      if (a.response_status === 'quoted' && b.response_status === 'quoted') {
        return Number(a.quoted_amount || 0) - Number(b.quoted_amount || 0);
      }
      return (a.vendor_name || '').localeCompare(b.vendor_name || '');
    });
  }, [vendors]);

  const quoted = ordered.filter((v) => v.response_status === 'quoted');
  const lowest = quoted.length > 0 ? Number(quoted[0].quoted_amount || 0) : null;
  const isClosed = rfqStatus === 'awarded' || rfqStatus === 'converted_to_contract' || rfqStatus === 'cancelled';

  const award = async () => {
    if (!confirming || awarding) return;
    setAwarding(true);
    try {
      await api.post(`/api/rfq/${contractId}/award`, { vendor_id: confirming.vendor_id });
      addToast({
        type: 'success',
        title: 'Quote awarded',
        message: `${confirming.vendor_company || confirming.vendor_name} has been told. The other vendors were declined.`,
      });
      setConfirming(null);
      onAwarded?.();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not award',
        message: err?.response?.data?.error?.message || err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setAwarding(false);
    }
  };

  if (!vendors || vendors.length === 0) return null;

  const toneColor = (tone: string) =>
    tone === 'ok' ? colors.semantic.success
      : tone === 'warn' ? colors.semantic.warning
      : tone === 'err' ? colors.semantic.error
      : colors.utility.secondaryText;

  return (
    <div
      className="rounded-xl shadow-md border overflow-hidden"
      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '15' }}
    >
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.utility.primaryText + '10' }}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: colors.brand.primary }} />
          <h3 className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
            Quotes ({quoted.length} of {vendors.length})
          </h3>
        </div>
        {lowest !== null && quoted.length > 1 && (
          <span className="text-[0.65rem] font-medium" style={{ color: colors.utility.secondaryText }}>
            Lowest {formatCurrency(lowest, currency || 'INR')}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2.5">
        {ordered.map((v, i) => {
          const status = v.response_status || 'pending';
          const meta = STATUS_META[status] || STATUS_META.pending;
          const isQuoted = status === 'quoted';
          const isWinner = status === 'accepted';
          const isBest = isQuoted && lowest !== null && Number(v.quoted_amount || 0) === lowest && quoted.length > 1;
          const hasBreakdown = Array.isArray(v.quote_breakdown) && v.quote_breakdown.length > 0;
          const key = v.id || v.vendor_id || String(i);
          const open = expanded === key;

          return (
            <div
              key={key}
              className="rounded-lg border overflow-hidden"
              style={{
                borderColor: isWinner ? colors.semantic.success + '55' : colors.utility.primaryText + '12',
                backgroundColor: isWinner ? colors.semantic.success + '08' : colors.utility.primaryText + '03',
              }}
            >
              <div className="flex items-center gap-3 p-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isWinner ? colors.semantic.success + '20' : colors.brand.primary + '18',
                    color: isWinner ? colors.semantic.success : colors.brand.primary,
                  }}
                >
                  {isWinner ? <Trophy className="w-4 h-4" />
                    : status === 'declined' ? <X className="w-4 h-4" />
                    : status === 'pending' ? <Clock className="w-4 h-4" />
                    : <Check className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: colors.utility.primaryText }}>
                    {v.vendor_company || v.vendor_name || 'Unknown vendor'}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[0.65rem] font-medium" style={{ color: toneColor(meta.tone) }}>
                      {meta.label}
                    </span>
                    {isBest && (
                      <span
                        className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.semantic.success + '18', color: colors.semantic.success }}
                      >
                        lowest
                      </span>
                    )}
                    {v.responded_at && (
                      <span className="text-[0.6rem]" style={{ color: colors.utility.secondaryText }}>
                        · {fmtDate(v.responded_at)}
                      </span>
                    )}
                    {status === 'pending' && v.viewed_at && (
                      <span className="text-[0.6rem]" style={{ color: colors.utility.secondaryText }}>
                        · opened the link
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {(isQuoted || isWinner) && (
                    <div className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                      {formatCurrency(Number(v.quoted_amount || 0), currency || 'INR')}
                    </div>
                  )}
                  {isQuoted && !isClosed && (
                    <button
                      onClick={() => setConfirming(v)}
                      className="mt-1 text-[0.65rem] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                      style={{ backgroundColor: colors.brand.primary, color: '#FFFFFF' }}
                    >
                      Award
                    </button>
                  )}
                </div>
              </div>

              {(v.quote_notes || hasBreakdown || v.decline_reason || v.quote_valid_until) && (
                <div className="px-3 pb-3">
                  {v.decline_reason && (
                    <div className="text-xs italic" style={{ color: colors.utility.secondaryText }}>
                      “{v.decline_reason}”
                    </div>
                  )}
                  {v.quote_notes && (
                    <div className="text-xs leading-relaxed" style={{ color: colors.utility.secondaryText }}>
                      {v.quote_notes}
                    </div>
                  )}
                  {v.quote_valid_until && (
                    <div className="text-[0.65rem] mt-1" style={{ color: colors.utility.secondaryText }}>
                      Valid until {fmtDate(v.quote_valid_until)}
                    </div>
                  )}
                  {hasBreakdown && (
                    <>
                      <button
                        onClick={() => setExpanded(open ? null : key)}
                        className="mt-1.5 flex items-center gap-1 text-[0.65rem] font-medium"
                        style={{ color: colors.brand.primary }}
                      >
                        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {open ? 'Hide' : 'Show'} the {v.quote_breakdown!.length} priced lines
                      </button>
                      {open && (
                        <div className="mt-2 rounded-md overflow-hidden" style={{ border: `1px solid ${colors.utility.primaryText}12` }}>
                          {v.quote_breakdown!.map((r, ri) => (
                            <div
                              key={r.block_id || ri}
                              className="flex items-center justify-between px-2.5 py-1.5 text-[0.7rem]"
                              style={{
                                borderTop: ri === 0 ? 'none' : `1px solid ${colors.utility.primaryText}0A`,
                                color: colors.utility.secondaryText,
                              }}
                            >
                              <span className="truncate pr-2">
                                {r.block_name}
                                {Number(r.quantity || 1) > 1 && ` × ${r.quantity}`}
                              </span>
                              <span className="font-semibold flex-shrink-0" style={{ color: colors.utility.primaryText }}>
                                {formatCurrency(Number(r.total_price || 0), currency || 'INR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── confirm ── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div
            className="w-full max-w-md rounded-xl shadow-xl p-5"
            style={{ backgroundColor: colors.utility.secondaryBackground }}
          >
            <h4 className="text-base font-bold mb-2" style={{ color: colors.utility.primaryText }}>
              Award to {confirming.vendor_company || confirming.vendor_name}?
            </h4>
            <p className="text-sm leading-relaxed mb-3" style={{ color: colors.utility.secondaryText }}>
              Their quote of{' '}
              <strong style={{ color: colors.utility.primaryText }}>
                {formatCurrency(Number(confirming.quoted_amount || 0), currency || 'INR')}
              </strong>{' '}
              is accepted, and the other {vendors.length - 1} vendor
              {vendors.length - 1 === 1 ? '' : 's'} on this request are declined.
            </p>
            <div
              className="text-xs leading-relaxed rounded-lg p-3 mb-4"
              style={{ backgroundColor: colors.brand.primary + '0D', color: colors.utility.secondaryText }}
            >
              This does <strong style={{ color: colors.utility.primaryText }}>not</strong> create a contract.
              The vendor raises the contract from their side, and it will carry the figure
              you just agreed. You will see it arrive on this request.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(null)}
                disabled={awarding}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.utility.primaryText + '0D', color: colors.utility.primaryText }}
              >
                Cancel
              </button>
              <button
                onClick={award}
                disabled={awarding}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2"
                style={{ backgroundColor: colors.brand.primary, opacity: awarding ? 0.6 : 1 }}
              >
                {awarding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {awarding ? 'Awarding…' : 'Award this quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfqQuotesPanel;
