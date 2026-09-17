// src/components/ops/HistoryDrawer.tsx
//
// "History" on a cockpit card: the contract's activity timeline, read from
// the same reader the contract page's Audit tab uses (jtd_contract_activity),
// so what you see before nudging is exactly what the Audit tab will show.
// Newest first; every reminder with its delivery status, every call with its
// outcome, follow-ups, pauses, declarations, plus billing-event and
// service-execution audit rows. Never a balance or a total.

import React, { useState } from 'react';
import { ArrowUpRight, Mail, MessageCircle, PhoneCall, UserPlus, PauseCircle, PlayCircle, IndianRupee, Receipt, ClipboardList, Sparkles, X, CalendarClock } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import { fmtMoney } from '@/utils/format';
import { useContractActivity, type ActivityRow, type ActivitySource, type RenderedMessage } from '@/hooks/queries/useCollectionsQueries';
import { clean, fmtTime } from './JobCard';

const PAGE = 30;

/**
 * The message as it went: our template copy with the row's variables. Shared
 * by the History drawer and the contract page's Audit tab so both read the
 * same thing. `pre-wrap` keeps the template's line breaks.
 */
export const MessageBubble: React.FC<{ message: RenderedMessage; channel?: string; colors: any }> = ({ message, channel, colors }) => (
  <div className="mt-2 rounded-xl border px-3 py-2.5" style={{ borderColor: `${colors.utility.primaryText}14`, backgroundColor: colors.utility.secondaryBackground }}>
    {message.subject && <p className="text-[12px] font-bold mb-1" style={{ color: colors.utility.primaryText }}>{message.subject}</p>}
    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: colors.utility.primaryText }}>{message.body}</p>
    <p className="text-[10px] mt-2" style={{ color: colors.utility.secondaryText }}>
      Our copy of the {channel === 'whatsapp' ? 'WhatsApp' : channel || ''} template{message.provider_template_id ? ` (${message.provider_template_id})` : ''} with the values that were sent. The provider formats the final message.
    </p>
  </div>
);

/** "Show message" toggle + bubble — one component, used per row. */
export const MessageToggle: React.FC<{ message?: RenderedMessage; channel?: string; colors: any }> = ({ message, channel, colors }) => {
  const [open, setOpen] = useState(false);
  if (!message) return null;
  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-bold mt-1 min-h-[28px]" style={{ color: colors.brand.primary }} aria-expanded={open}>
        {open ? 'Hide message' : 'Show message'}
      </button>
      {open && <MessageBubble message={message} channel={channel} colors={colors} />}
    </>
  );
};

/** Icon + accent for a row, by kind first, then source. */
export const rowVisual = (r: ActivityRow, colors: any): { Icon: React.ElementType; color: string } => {
  const brand = colors.brand.primary, green = colors.semantic.success, red = colors.semantic.error, amber = colors.semantic.warning, muted = colors.utility.secondaryText;
  if (r.kind === 'payment_nudge_email' || r.channel === 'email') return { Icon: Mail, color: r.status === 'failed' ? red : brand };
  if (r.kind === 'payment_nudge_whatsapp' || r.channel === 'whatsapp') return { Icon: MessageCircle, color: r.status === 'failed' ? red : brand };
  if (r.kind === 'payment_call_logged') return { Icon: PhoneCall, color: brand };
  if (r.kind === 'payment_call_due') return { Icon: r.title.startsWith('Follow-up') ? CalendarClock : UserPlus, color: brand };
  if (r.kind === 'ladder_paused') return { Icon: PauseCircle, color: muted };
  if (r.kind === 'ladder_resumed') return { Icon: PlayCircle, color: green };
  if (r.kind === 'declaration') return { Icon: IndianRupee, color: amber };
  if (r.kind === 'declaration_confirmed') return { Icon: IndianRupee, color: green };
  if (r.kind === 'declaration_rejected') return { Icon: IndianRupee, color: red };
  if (r.source === 'billing') return { Icon: Receipt, color: amber };
  return { Icon: ClipboardList, color: muted };
};

export const statusColor = (status: string | undefined, colors: any): string =>
  status === 'failed' || status === 'rejected' ? colors.semantic.error
  : status === 'delivered' || status === 'read' || status === 'completed' || status === 'confirmed' ? colors.semantic.success
  : colors.utility.secondaryText;

const SOURCE_LABEL: Record<ActivitySource, string> = { collections: 'Collections', billing: 'Billing events', service: 'Service' };

const HistoryDrawer: React.FC<{
  contractId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onOpenContract: () => void;
}> = ({ contractId, title, subtitle, onClose, onOpenContract }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;
  const [source, setSource] = useState<ActivitySource | 'all'>('all');
  const [limit, setLimit] = useState(PAGE);
  const q = useContractActivity(contractId, { sources: source === 'all' ? [] : [source], limit });
  const data = q.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-lg h-full flex flex-col" style={{ backgroundColor: colors.utility.primaryBackground }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b" style={{ borderColor: hairline }}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...sub, ...mono }}>history</p>
            <h2 className="text-lg font-extrabold truncate" style={ink}>{title}</h2>
            {subtitle && <p className="text-xs truncate" style={sub}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="flex-none min-h-[40px] min-w-[40px] inline-flex items-center justify-center" style={{ color: colors.utility.secondaryText }}><X size={18} /></button>
        </div>

        <div className="px-5 py-2.5 flex items-center gap-1.5 flex-wrap border-b" style={{ borderColor: hairline }}>
          {(['all', 'collections', 'billing', 'service'] as const).map((s) => {
            const n = s === 'all' ? data?.counts.all : data?.counts[s];
            return (
              <button key={s} onClick={() => { setSource(s); setLimit(PAGE); }} aria-pressed={source === s}
                className="inline-flex items-center gap-1 px-2.5 min-h-[32px] rounded-full text-[11px] font-bold border"
                style={source === s ? { backgroundColor: brand, color: '#fff', borderColor: brand } : { color: brand, borderColor: `${brand}45`, backgroundColor: 'transparent' }}>
                {s === 'all' ? 'All' : SOURCE_LABEL[s]}{n != null ? <span className="tabular-nums opacity-80">{n}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {q.isPending && !data ? (
            <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
          ) : !data ? (
            <p className="text-sm py-10 text-center" style={sub}>Couldn't load the history.</p>
          ) : data.rows.length === 0 ? (
            <p className="text-[13px] py-10 text-center rounded-2xl border border-dashed" style={{ ...sub, borderColor: hairline }}>
              Nothing recorded yet{source !== 'all' ? ` under ${SOURCE_LABEL[source]}` : ''}.
            </p>
          ) : (
            <div className="relative">
              <span className="absolute left-[15px] top-2 bottom-2 w-px" style={{ backgroundColor: hairline }} />
              <div className="space-y-1">
                {data.rows.map((r) => {
                  const { Icon, color } = rowVisual(r, colors);
                  const who = r.actor_type === 'vani' ? 'VaNi' : clean(r.actor_name) || (r.actor_type === 'system' ? 'System' : 'Someone');
                  return (
                    <div key={r.id} className="relative pl-10 py-2">
                      <span className="absolute left-0 top-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
                        {r.actor_type === 'vani' ? <Sparkles size={14} style={{ color }} /> : <Icon size={14} style={{ color }} />}
                      </span>
                      <p className="text-[13px] font-semibold leading-snug" style={ink}>{r.title}</p>
                      {(r.from || r.to) && (
                        <p className="text-[11px] mt-0.5" style={sub}>{(r.from || '—').replace(/_/g, ' ')} → <b style={{ color }}>{(r.to || '—').replace(/_/g, ' ')}</b></p>
                      )}
                      {r.detail && <p className="text-[11.5px] mt-0.5" style={sub}>{r.detail}</p>}
                      <MessageToggle message={r.message} channel={r.channel} colors={colors} />
                      <p className="text-[10.5px] mt-1 flex items-center gap-2 flex-wrap" style={{ ...sub, ...mono }}>
                        <span>{who}</span>
                        <span>·</span>
                        <span>{fmtTime(r.at)}</span>
                        {r.status && <><span>·</span><span className="font-bold" style={{ color: statusColor(r.status, colors) }}>{r.status}</span></>}
                        {r.amount != null && r.source !== 'service' && <><span>·</span><span>{fmtMoney(r.amount, r.currency || 'INR')}</span></>}
                      </p>
                    </div>
                  );
                })}
              </div>
              {data.total > data.rows.length && (
                <button onClick={() => setLimit((l) => l + PAGE)} className="mt-3 w-full min-h-[40px] rounded-xl text-xs font-bold border border-dashed" style={{ color: brand, borderColor: `${brand}45` }}>
                  Show {Math.min(PAGE, data.total - data.rows.length)} more · {data.total - data.rows.length} left
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between gap-3" style={{ borderColor: hairline }}>
          <p className="text-[11px]" style={sub}>Same rows as the contract's Audit tab.</p>
          <button onClick={onOpenContract} className="inline-flex items-center gap-1 text-xs font-bold min-h-[40px]" style={{ color: brand }}>
            Open contract <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;
