// src/components/ops/LogCallSheet.tsx
//
// "Log a call" — the one modal of the Ops cockpit. Records a call against a
// payment job through jtd_log_payment_call: when, outcome, promised-by date
// (pauses the ladder until then), notes. Shared by every card kind that
// offers a call, in both views.

import React, { useState } from 'react';
import { PhoneCall, X } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { fmtMoney, fmtDate } from '@/utils/format';
import type { BoardCard, CallOutcome } from '@/hooks/queries/useCollectionsQueries';
import { clean } from './JobCard';

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface LogCallValues {
  calledAt: string;
  outcome: CallOutcome;
  notes?: string;
  promiseDate?: string | null;
}

const LogCallSheet: React.FC<{
  card: BoardCard;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: LogCallValues) => void;
}> = ({ card, busy, onClose, onSubmit }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const inputStyle: React.CSSProperties = {
    border: `1px solid ${brand}60`, borderRadius: 10, padding: '8px 10px', fontSize: 13,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 40,
  };
  const [outcome, setOutcome] = useState<CallOutcome>('reached');
  const [notes, setNotes] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [calledAt, setCalledAt] = useState(() => {
    const d = new Date(); d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const canSubmit = outcome !== 'promised' || !!promiseDate;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5" style={{ backgroundColor: colors.utility.primaryBackground }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={sub}>log a call</p>
            <h2 className="text-lg font-extrabold" style={ink}>{clean(card.buyer_name) || card.contract_number}</h2>
            <p className="text-xs" style={sub}>{fmtMoney(card.amount, card.currency)} · {card.contract_number}{card.due_date ? ` · due ${fmtDate(card.due_date)}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: colors.utility.secondaryText }}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-bold" style={sub}>When
            <input type="datetime-local" value={calledAt} onChange={(e) => setCalledAt(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <div>
            <p className="text-xs font-bold mb-1.5" style={sub}>Outcome</p>
            <div className="flex flex-wrap gap-2">
              {([['reached', 'Reached'], ['no_answer', 'No answer'], ['promised', 'Promised to pay'], ['disputed', 'Disputed'], ['other', 'Other']] as Array<[CallOutcome, string]>).map(([k, label]) => (
                <button key={k} onClick={() => setOutcome(k)} className="px-3 min-h-[40px] rounded-full text-xs font-bold border"
                  style={outcome === k ? { backgroundColor: brand, color: '#fff', borderColor: brand } : { color: brand, borderColor: `${brand}45`, backgroundColor: 'transparent' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {outcome === 'promised' && (
            <label className="block text-xs font-bold" style={sub}>Promised by
              <input type="date" value={promiseDate} min={todayISO()} onChange={(e) => setPromiseDate(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
              <span className="block font-normal mt-1" style={sub}>Reminders pause until this date.</span>
            </label>
          )}
          {outcome === 'disputed' && <p className="text-xs" style={sub}>Reminders pause until someone resumes them.</p>}
          <label className="block text-xs font-bold" style={sub}>Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What was said, what was agreed" style={{ ...inputStyle, width: '100%', marginTop: 4, resize: 'vertical' }} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 min-h-[44px] rounded-full text-xs font-bold border" style={{ color: colors.utility.primaryText, borderColor: `${colors.utility.secondaryText}45` }}>Cancel</button>
          <button onClick={() => onSubmit({ calledAt: new Date(calledAt).toISOString(), outcome, notes: notes.trim() || undefined, promiseDate: outcome === 'promised' ? promiseDate : null })}
            disabled={busy || !canSubmit} className="px-5 min-h-[44px] rounded-full text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: brand, color: '#fff' }}>
            {busy ? <LoadingSpinner size="sm" /> : <PhoneCall size={13} />} Save call
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogCallSheet;
