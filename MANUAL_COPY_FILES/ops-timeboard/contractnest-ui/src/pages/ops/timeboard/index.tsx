// src/pages/ops/timeboard/index.tsx
//
// TIMEBOARD (batch ops-timeboard, POA batch 3, 2026-09-18) — every hour,
// every person, every commitment. The Plan tab lines the days up; this puts
// them on a clock: WEEK (a column per day), DAY (a column per person, then
// Unassigned, then VaNi) and AGENDA (the phone default). Same readers as the
// Plan tab — jtd_plan (023) for the rows, get_team_availability (024) for the
// hours, days off, leave and holidays that hatch the columns — and the SAME
// JobCard with the SAME verbs in the side panel. Nothing re-implemented.
//
// What is new here is the gesture: pick a service up and drop it on a time
// (and, in the Day view, on a person). The drop is never silent — a confirm
// bar says what will happen, shows the clash preview computed from the
// availability the page already holds, and offers "Propose to customer"
// (schedule, not confirmed) or "Confirm slot" / "Keep confirmed"; a drop on
// another person's column assigns first. "Find a slot" on a service lists
// the next free times for its technician (or for everyone, when unassigned)
// and lands on the same bar. Payments, reminders and follow-ups are shown
// where they fall but are not draggable — a follow-up's reschedule has no
// API route yet (jtd_item_reschedule exists; noted as pending).
//
// VaNi: the Day view's VaNi column carries the ladder's reminders at their
// time; "Plan this day" sits above the grid when VaNi is on, the greyed
// counterfactual when it is off — the plan is for everyone, the leverage is
// VaNi's (owner decision 2026-09-18).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search, X, Sparkles, CalendarRange, CalendarDays, List as ListIcon, ArrowUpRight, AlertTriangle, Users, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useConfirmDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { useConfirmPaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import {
  useOpsPlan, usePlanDay,
  useNudgePayment, useLogPaymentCall, useEscalatePaymentCall, usePauseDunning, useResumeDunning,
  useAssignVisit, useScheduleVisit, useConfirmVisitSlot, useStartVisit, useCompleteVisit, useAskVisitSlot,
  collectionsKeys,
  type BoardCard, type BoardLane, type PlanFilters,
} from '@/hooks/queries/useCollectionsQueries';
import { useTeamAvailability } from '@/hooks/queries/useAvailabilityQueries';
import JobCard, { clean, kindLabel, type JobCardActions, type PauseReason } from '@/components/ops/JobCard';
import LogCallSheet from '@/components/ops/LogCallSheet';
import HistoryDrawer from '@/components/ops/HistoryDrawer';
import Grid, { type GridColumn, type DropTarget } from '@/components/ops/timeboard/Grid';
import Agenda from '@/components/ops/timeboard/Agenda';
import {
  UNASSIGNED, VANI, isoDay, addDays, today0, dayOf, mondayOf, fmtClock, fmtDayShort, minToHHMM, gridRange, allCards, dayColumns,
  previewClashes, findSlots, isService, isDraggable, durationOf, columnOf, type FreeSlot,
} from '@/components/ops/timeboard/model';
import { useInvoiceTheme } from '../../invoices/ui';
import { useSendInvoice, sendRefusal } from '../../invoices/useInvoiceDetail';
import { fmtMoney, fmtDate } from '@/utils/format';

type View = 'week' | 'day' | 'agenda';
type Lane = 'all' | BoardLane;
type Who = 'team' | 'mine' | 'unassigned';
const VIEW_KEY = 'ops.timeboard.view';
const phone = () => typeof window !== 'undefined' && window.innerWidth < 768;
const readView = (): View => { try { const v = window.localStorage.getItem(VIEW_KEY); if (v === 'week' || v === 'day' || v === 'agenda') return v; } catch { /* ignore */ } return phone() ? 'agenda' : 'week'; };

const TimeboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { user, currentTenant, perspective } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary, green = colors.semantic.success, red = colors.semantic.error, amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;
  const selectStyle: React.CSSProperties = {
    border: `1px solid ${colors.utility.primaryText}30`, borderRadius: 999, padding: '0 12px', fontSize: 12, fontWeight: 700,
    backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 36,
  };

  // ── view · anchor day · filters ───────────────────────────────────────────
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => { setViewState(v); try { window.localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const [anchor, setAnchor] = useState<string>(() => { const d = params.get('day'); return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : isoDay(today0()); });
  const [lane, setLane] = useState<Lane>('all');
  const [who, setWho] = useState<Who>('team');
  const [personId, setPersonId] = useState<string>('');
  const [search, setSearch] = useState(() => params.get('q') || '');
  const [q, setQ] = useState(search);
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const p = new URLSearchParams(params); p.set('day', anchor); if (q) p.set('q', q); else p.delete('q'); setParams(p, { replace: true }); }, [anchor, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const window_ = useMemo(() => {
    const a = dayOf(anchor);
    if (view === 'week') { const m = mondayOf(a); return { from: isoDay(m), to: isoDay(addDays(m, 6)) }; }
    if (view === 'day') return { from: anchor, to: anchor };
    return { from: anchor, to: isoDay(addDays(a, 6)) };
  }, [view, anchor]);
  const step = (n: number) => setAnchor(isoDay(addDays(dayOf(anchor), view === 'week' || view === 'agenda' ? 7 * n : n)));

  const filters = useMemo<PlanFilters>(() => {
    const f: PlanFilters = { from: window_.from, to: window_.to };
    if (lane !== 'all') f.lanes = [lane];
    if (who !== 'team') f.who = who;
    if (q) f.q = q;
    return f;
  }, [window_, lane, who, q]);

  const enabled = perspective !== 'expense';
  const plan = useOpsPlan(filters, { enabled });
  const avail = useTeamAvailability(60, { enabled });
  const data = plan.data;
  const team = data?.team || [];
  const vaniOn = !!data?.vani_enabled;
  const fallbackMinutes = avail.data?.tenant?.default_visit_minutes || 60;
  const range = useMemo(() => gridRange(avail.data), [avail.data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all });

  /** the window's cards, then the optional person filter (a person's services + follow-ups, plus the unassigned/VaNi columns in the Day view) */
  const cards = useMemo(() => {
    const all = data ? allCards(data.days) : [];
    if (!personId) return all;
    return all.filter((c) => columnOf(c) === personId || columnOf(c) === UNASSIGNED || columnOf(c) === VANI);
  }, [data, personId]);
  const columns = useMemo<GridColumn[]>(() => {
    if (!data) return [];
    const todayIso = isoDay(today0());
    if (view === 'day') {
      const cols = dayColumns(team, cards, user?.id).filter((c) => !personId || c.id === personId || c.id === UNASSIGNED || c.id === VANI);
      return cols.map((c) => ({ key: c.id, day: anchor, personId: c.id, label: c.name, isToday: anchor === todayIso }));
    }
    return data.days.map((d) => ({ key: d.day, day: d.day, personId: UNASSIGNED, label: d.dow, sub: dayOf(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), isToday: d.day === todayIso }));
  }, [data, view, anchor, cards, team, personId, user?.id]);

  // ── tools: the same wiring as the board and the Plan tab ──────────────────
  const nudge = useNudgePayment();
  const logCall = useLogPaymentCall();
  const escalate = useEscalatePaymentCall();
  const pause = usePauseDunning();
  const resume = useResumeDunning();
  const assignVisit = useAssignVisit();
  const scheduleVisit = useScheduleVisit();
  const confirmSlot = useConfirmVisitSlot();
  const startVisit = useStartVisit();
  const completeVisit = useCompleteVisit();
  const askVisit = useAskVisitSlot();
  const sendInvoice = useSendInvoice();
  const confirmGs = useConfirmDeclaration();
  const confirmPay = useConfirmPaymentDeclaration();
  const planDay = usePlanDay();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<BoardCard | null>(null);
  const [historyFor, setHistoryFor] = useState<BoardCard | null>(null);
  const [selected, setSelected] = useState<BoardCard | null>(null);
  const [list, setList] = useState<{ title: string; cards: BoardCard[] } | null>(null);
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [pending, setPending] = useState<DropTarget | null>(null);
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // the selected card follows the data (a schedule moves it; a completion removes it)
  useEffect(() => {
    if (!selected || !data) return;
    const fresh = allCards(data.days).find((c) => c.id === selected.id) || data.carried.cards.find((c) => c.id === selected.id) || data.parked.cards.find((c) => c.id === selected.id);
    if (fresh) setSelected(fresh); else setSelected(null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (id: string, fn: () => Promise<unknown>) => {
    if (busyId || busyDay) return;
    setBusyId(id);
    try { await fn(); } catch { /* toasted by the hook */ } finally { setBusyId(null); }
  };
  const actions: JobCardActions = {
    onNudge: (c, ch) => { if (c.job_id) run(c.id, () => nudge.mutateAsync({ jobId: c.job_id!, channel: ch })); },
    onCall: (c) => { if (c.job_id) setCallFor(c); },
    onAssign: (c, userId, dueAt) => {
      if (!c.job_id) return;
      if (!userId) { toast.error('Pick a teammate first'); return; }
      return run(c.id, () => escalate.mutateAsync({ jobId: c.job_id!, assignTo: userId, dueAt: dueAt || null }));
    },
    onPause: (c, reason: PauseReason, until) => {
      if (!c.job_id) return;
      if (reason === 'promise' && !until) { toast.error('A promise needs a date'); return; }
      return run(c.id, () => pause.mutateAsync({ jobId: c.job_id!, reason, until }));
    },
    onResume: (c) => { if (c.job_id) run(c.id, () => resume.mutateAsync({ jobId: c.job_id! })); },
    onConfirm: (c) => {
      const d = c.declaration;
      if (!d) return;
      run(c.id, async () => {
        if (d.kind === 'session') await confirmGs.mutateAsync({ id: d.id, confirm: true });
        else await confirmPay.mutateAsync({ id: d.id, confirm: true } as any);
        toast.success(`Payment confirmed — ${fmtMoney(d.amount, c.currency)} from ${clean(c.buyer_name) || c.contract_number}`);
        refresh();
      });
    },
    onReview: (c) => navigate(c.declaration?.kind === 'session' ? '/group-sessions' : `/contracts/${c.contract_id}`),
    onOpen: (c) => navigate(`/contracts/${c.contract_id}`),
    onHistory: (c) => setHistoryFor(c),
    onViewInvoice: (c) => { if (c.invoice_id) navigate(c.contract_id ? `/contracts/${c.contract_id}/invoice/${c.invoice_id}` : `/invoices/${c.invoice_id}`); },
    onSendInvoice: (c, channel) => {
      if (!c.invoice_id) return;
      run(c.id, async () => {
        try { await sendInvoice.mutateAsync({ invoiceId: c.invoice_id!, channel }); refresh(); }
        catch (e) {
          const r = sendRefusal(e);
          if (r?.reason === 'rule_disabled') {
            toast.error((t) => (
              <span>Payment reminders are switched off under Automation Rules — the invoice was not sent.{' '}
                <button onClick={() => { toast.dismiss(t.id); navigate('/settings/configure/automation-rules'); }} className="font-bold underline">Open Automation Rules</button>
              </span>), { duration: 7000 });
          } else toast.error(r?.message || 'Could not send the invoice', { duration: 5000 });
        }
      });
    },
    onAssignVisit: (c, userId) => {
      if (!userId) { toast.error('Pick a technician first'); return; }
      return run(c.id, () => assignVisit.mutateAsync({ eventId: c.id, assignTo: userId }));
    },
    onSchedule: (c, scheduledAt, confirmed) => {
      if (!scheduledAt) { toast.error('Pick a date and time first'); return; }
      return run(c.id, () => scheduleVisit.mutateAsync({ eventId: c.id, scheduledAt, confirmed }));
    },
    onConfirmSlot: (c) => { run(c.id, () => confirmSlot.mutateAsync({ eventId: c.id })); },
    onStartVisit: (c) => { run(c.id, () => startVisit.mutateAsync({ eventId: c.id })); },
    onCompleteVisit: (c, notes) => run(c.id, () => completeVisit.mutateAsync({ eventId: c.id, notes: notes || undefined })),
    onAskCustomer: async (c, channel) => {
      if (busyId || busyDay) return;
      setBusyId(c.id);
      try { return await askVisit.mutateAsync({ eventId: c.id, channel }); }
      catch { return; }
      finally { setBusyId(null); }
    },
  };

  // ── the drop: assign (if another person) then schedule; never silent ──────
  const preview = useMemo(() => (pending ? previewClashes(avail.data, cards, pending.personId, pending.day, pending.start, durationOf(pending.card, fallbackMinutes), pending.card.id) : []), [pending, avail.data, cards, fallbackMinutes]);
  const personName = (id: string) => (id === UNASSIGNED ? 'nobody' : id === user?.id ? 'you' : team.find((t) => t.user_id === id)?.name || avail.data?.people.find((p) => p.user_id === id)?.name || 'a technician');
  const commitDrop = async (confirmed: boolean) => {
    if (!pending) return;
    const { card, day, personId: pid, start } = pending;
    const reassign = pid !== UNASSIGNED && pid !== VANI && pid !== (card.owner_id || UNASSIGNED);
    setPending(null);
    await run(card.id, async () => {
      if (reassign) await assignVisit.mutateAsync({ eventId: card.id, assignTo: pid });
      await scheduleVisit.mutateAsync({ eventId: card.id, scheduledAt: `${day}T${minToHHMM(start)}`, confirmed });
    });
  };
  const openSlots = (c: BoardCard) => {
    const found = findSlots({ avail: avail.data, cards, team, card: c, fromDay: isoDay(today0()), days: 14, minutes: durationOf(c, fallbackMinutes) });
    setSlots(found);
    if (!found.length) toast('No free slot in the next 14 days for this technician — widen the hours or pick someone else', { icon: '🗓' });
  };

  // ── chrome ────────────────────────────────────────────────────────────────
  const Seg: React.FC<{ on: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ on, onClick, title, children }) => (
    <button onClick={onClick} title={title} aria-pressed={on}
      className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-[11px] font-bold whitespace-nowrap"
      style={on ? { backgroundColor: brand, color: '#fff' } : { color: brand, backgroundColor: 'transparent' }}>
      {children}
    </button>
  );
  const Pill: React.FC<{ color: string; children: React.ReactNode; title?: string; onClick?: () => void }> = ({ color, children, title, onClick }) => (
    <button onClick={onClick} disabled={!onClick} title={title} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap disabled:cursor-default" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>{children}</button>
  );

  const totals = data?.totals;
  const dayCounts = view === 'day' ? data?.days.find((d) => d.day === anchor)?.counts : undefined;
  const windowLabel = view === 'day' ? dayOf(anchor).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${fmtDate(window_.from)} – ${fmtDate(window_.to)}`;
  const fetching = plan.isFetching || avail.isFetching;
  const openVani = () => navigate('/vani/landing');
  const runPlanDay = async () => { if (busyId || busyDay) return; setBusyDay(anchor); try { await planDay.mutateAsync({ day: anchor }); } catch { /* toasted */ } finally { setBusyDay(null); } };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 mx-auto max-w-[1400px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...sub, ...mono }}>
        ops · {currentTenant?.name || 'your business'} · timeboard
      </p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] leading-snug font-medium" style={ink}>Every hour, every person, every commitment.</h1>
          <p className="text-[13px] mt-1" style={sub}>The same cards as Ops and the Plan, on a clock. Pick a service up and drop it on a time — or on a person — and confirm what happens. Hatching is when someone is off or outside their hours.</p>
        </div>
        <button onClick={() => { plan.refetch(); avail.refetch(); }} title="Refresh" className="flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border mt-1" style={{ color: brand, borderColor: `${brand}45` }}>
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* controls */}
      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="View">
          <Seg on={view === 'week'} onClick={() => setView('week')}><CalendarRange size={12} /> Week</Seg>
          <Seg on={view === 'day'} onClick={() => setView('day')}><CalendarDays size={12} /> Day</Seg>
          <Seg on={view === 'agenda'} onClick={() => setView('agenda')}><ListIcon size={12} /> Agenda</Seg>
        </div>
        <div className="inline-flex items-center rounded-full border" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
          <button onClick={() => step(-1)} className="px-2 min-h-[36px]" aria-label="Earlier" style={{ color: brand }}><ChevronLeft size={15} /></button>
          <button onClick={() => setAnchor(isoDay(today0()))} className="px-2 min-h-[36px] text-[11px] font-bold" style={{ color: brand }}>Today</button>
          <button onClick={() => step(1)} className="px-2 min-h-[36px]" aria-label="Later" style={{ color: brand }}><ChevronRight size={15} /></button>
        </div>
        <input type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="Go to date" />
        <span className="text-[12.5px] font-bold" style={ink}>{windowLabel}</span>
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Lane">
          <Seg on={lane === 'all'} onClick={() => setLane('all')}>All</Seg>
          <Seg on={lane === 'services'} onClick={() => setLane('services')}>Services</Seg>
          <Seg on={lane === 'collections'} onClick={() => setLane('collections')}>Collections</Seg>
        </div>
        <select value={who} onChange={(e) => setWho(e.target.value as Who)} style={selectStyle} aria-label="Who">
          <option value="team">Whole team</option>
          <option value="mine">Mine</option>
          <option value="unassigned">Unassigned</option>
        </select>
        {team.length > 1 && (
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} style={selectStyle} aria-label="Person">
            <option value="">Everyone</option>
            {team.map((t) => <option key={t.user_id} value={t.user_id}>{t.user_id === user?.id ? `${t.name || 'You'} (you)` : t.name || 'Teammate'}</option>)}
          </select>
        )}
        <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[36px] w-52" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
          <Search size={13} style={sub} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="customer · contract" aria-label="Search" className="bg-transparent outline-none text-xs w-full" style={ink} />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
        </label>
      </div>

      {/* the strip: what needs attention in this window */}
      {data && totals && (
        <div className="mt-3 flex items-center gap-2 flex-wrap text-[12px]" style={sub}>
          {totals.needs_you > 0 && <Pill color={amber}>{totals.needs_you} need you</Pill>}
          {totals.clashes > 0 && <Pill color={red} title="Slots outside hours, on a day off or leave, or overlapping another service"><AlertTriangle size={11} /> {totals.clashes} clash{totals.clashes === 1 ? '' : 'es'}</Pill>}
          {totals.to_place > 0 && <Pill color={colors.utility.secondaryText} title="Services with no time yet — drag them onto the grid">{totals.to_place} to place</Pill>}
          {totals.asked > 0 && <Pill color={amber} title="Slots the customer has been asked to confirm">{totals.asked} awaiting customer</Pill>}
          {totals.unassigned_services > 0 && <Pill color={colors.utility.secondaryText} title="Services with no technician yet"><Users size={11} /> {totals.unassigned_services} unassigned</Pill>}
          {data.carried.counts.total > 0 && <Pill color={red} title="Anchored before this window and still open" onClick={() => setList({ title: `Carried over · ${data.carried.counts.total}`, cards: data.carried.cards })}>{data.carried.counts.total} carried over →</Pill>}
          {data.parked.counts.total > 0 && <Pill color={colors.utility.secondaryText} title="No date at all" onClick={() => setList({ title: `Parked · ${data.parked.counts.total}`, cards: data.parked.cards })}>{data.parked.counts.total} parked →</Pill>}
          {totals.total === 0 && <span>Nothing committed in this window.</span>}
          {data.truncated && <span style={{ color: amber }}>some rows were left out — narrow the window</span>}
          <span className="ml-auto inline-flex items-center gap-1" style={{ color: vaniOn ? green : colors.utility.secondaryText }}><Sparkles size={11} /> {vaniOn ? 'VaNi is on' : 'VaNi is off'}</span>
        </div>
      )}

      {/* the VaNi line for the Day view */}
      {view === 'day' && dayCounts && (dayCounts.to_place > 0 || dayCounts.reminders_due > 0) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11.5px]" style={sub}>
          <Sparkles size={12} style={{ color: vaniOn ? brand : colors.utility.secondaryText }} />
          {vaniOn ? (
            <>
              {dayCounts.to_place > 0 && anchor >= (data?.today || '') && (
                <button disabled={!!busyId || !!busyDay} onClick={runPlanDay} className="inline-flex items-center gap-1 px-3 min-h-[32px] rounded-full text-[11px] font-bold disabled:opacity-60" style={{ backgroundColor: brand, color: '#fff' }}
                  title="Propose a slot for every service on this day that has none — from the organisation's opening hour, one visit length apart per technician. Nobody is assigned; the customer is not asked yet.">
                  {busyDay === anchor ? <LoadingSpinner size="sm" /> : <Wand2 size={12} />} Plan this day · {dayCounts.to_place}
                </button>
              )}
              {dayCounts.reminders_due > 0 && <span>{dayCounts.reminders_due} reminder{dayCounts.reminders_due === 1 ? '' : 's'} {data?.ladder?.rule_enabled ? 'run by the ladder' : <>due · <button onClick={() => navigate('/settings/configure/automation-rules')} className="font-bold" style={{ color: brand }}>turn on Payment reminders</button></>}</span>}
            </>
          ) : (
            <>
              <span>VaNi would {[dayCounts.to_place ? `place ${dayCounts.to_place}` : '', dayCounts.reminders_due ? `send ${dayCounts.reminders_due} reminder${dayCounts.reminders_due === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')} on this day.</span>
              <button onClick={openVani} className="font-bold inline-flex items-center gap-0.5" style={{ color: brand }}>Open VaNi <ArrowUpRight size={11} /></button>
            </>
          )}
        </div>
      )}

      {/* the confirm bar for a drop */}
      {pending && (
        <div className="mt-3 rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap" style={{ borderColor: `${brand}70`, backgroundColor: `${brand}0d` }}>
          <span className="text-[12.5px]" style={ink}>
            Move <b>{pending.card.visit?.block_name || 'the service'}</b> · {pending.card.contract_number} ({clean(pending.card.buyer_name)}) to <b>{fmtDayShort(pending.day)}, {fmtClock(pending.start)}</b>
            {pending.personId !== UNASSIGNED && pending.personId !== VANI && pending.personId !== (pending.card.owner_id || UNASSIGNED) && <> and assign to <b>{personName(pending.personId)}</b></>}
            {pending.personId === UNASSIGNED && pending.card.owner_id && <span style={sub}> (stays with {personName(pending.card.owner_id)})</span>}
          </span>
          {preview.length > 0 && <span className="text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: red }}><AlertTriangle size={12} /> {preview.map((p) => p.detail).join(' · ')}</span>}
          <span className="ml-auto inline-flex items-center gap-2">
            <button onClick={() => commitDrop(false)} className="px-3 min-h-[34px] rounded-full text-[11px] font-bold" style={{ backgroundColor: brand, color: '#fff' }} title="Schedule as a proposal — the customer is asked to confirm from the card">Propose to customer</button>
            <button onClick={() => commitDrop(true)} className="px-3 min-h-[34px] rounded-full text-[11px] font-bold border" style={{ color: brand, borderColor: `${brand}55` }} title="Schedule as confirmed — the customer is notified">{pending.card.slot_state === 'confirmed' ? 'Keep confirmed' : 'Confirm slot'}</button>
            <button onClick={() => setPending(null)} className="px-3 min-h-[34px] rounded-full text-[11px] font-bold" style={sub}>Cancel</button>
          </span>
        </div>
      )}

      <div className="mt-3 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={fetching} style={{ backgroundColor: fetching ? `${brand}22` : 'transparent' }}>
        {fetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}
      </div>

      {!enabled ? (
        <p className="py-12 text-center text-[13px]" style={sub}>The Timeboard is a revenue-side view for now. Switch to Revenue to see the days ahead.</p>
      ) : plan.isPending && !data ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
      ) : plan.isError ? (
        <div className="py-12 text-center">
          <p className="text-sm mb-3" style={sub}>Couldn't load the timeboard.</p>
          <button onClick={() => plan.refetch()} className="text-xs font-bold px-4 py-2 rounded-full border" style={{ color: brand, borderColor: `${brand}45` }}>Retry</button>
        </div>
      ) : data ? (
        <div className="mt-3" style={{ opacity: plan.isFetching ? 0.75 : 1, transition: 'opacity .2s' }}>
          {view === 'agenda' ? (
            <Agenda days={data.days} fallbackMinutes={fallbackMinutes} selectedId={selected?.id} meId={user?.id} onSelect={(c) => { setSelected(c); setSlots(null); }} />
          ) : (
            <Grid mode={view} columns={columns} cards={cards} avail={avail.data} range={range} fallbackMinutes={fallbackMinutes}
              selectedId={selected?.id} busyId={busyId} vaniOn={vaniOn} dragging={dragging}
              onDragStart={setDragging} onSelect={(c) => { setSelected(c); setSlots(null); }} onOpenList={(title, cs) => setList({ title, cards: cs })}
              onDrop={(t) => { setDragging(null); setPending(t); }} onOpenVani={openVani} />
          )}
          <p className="mt-4 text-[11px] text-center" style={sub}>
            Drag a service onto a time to propose or confirm it{view === 'day' ? ', onto a person to assign it' : ''}. Payments, reminders and follow-ups show where they fall; open one to act on it. Same cards as <button onClick={() => navigate('/ops/cockpit')} className="font-bold" style={{ color: brand }}>Ops</button> and the <button onClick={() => navigate('/ops/services')} className="font-bold" style={{ color: brand }}>Plan</button>.
          </p>
        </div>
      ) : null}

      {/* side panel: one card with every verb, or a list */}
      {(selected || list) && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => { setSelected(null); setList(null); setSlots(null); }}>
          <div className="absolute inset-0" style={{ backgroundColor: `${colors.utility.primaryText}33` }} />
          <div ref={panelRef} onClick={(e) => e.stopPropagation()} className="relative h-full w-full sm:w-[440px] overflow-y-auto shadow-2xl px-4 py-4" style={{ backgroundColor: colors.utility.primaryBackground }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, ...sub }}>
                {list ? list.title : selected ? kindLabel(selected, user?.id) : ''}
              </p>
              <button onClick={() => { setSelected(null); setList(null); setSlots(null); }} aria-label="Close" style={sub}><X size={16} /></button>
            </div>
            {list && (
              <div className="space-y-2">
                {list.cards.map((c) => (
                  <JobCard key={c.id} card={c} compact busy={busyId === c.id} locked={!!busyId && busyId !== c.id} team={team} ladder={data?.ladder} meId={user?.id} actions={actions} askChannels={data?.ask_channels} />
                ))}
              </div>
            )}
            {selected && !list && (
              <>
                <JobCard card={selected} busy={busyId === selected.id} locked={!!busyId && busyId !== selected.id} team={team} ladder={data?.ladder} meId={user?.id} actions={actions} askChannels={data?.ask_channels} />
                {isService(selected) && isDraggable(selected) && (
                  <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: hairline, backgroundColor: colors.utility.secondaryBackground }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold" style={ink}>Find a slot</span>
                      <button onClick={() => openSlots(selected)} className="px-3 min-h-[32px] rounded-full text-[11px] font-bold border" style={{ color: brand, borderColor: `${brand}55` }}>
                        Next free times{selected.owner_id ? ` for ${personName(selected.owner_id)}` : ' for anyone'}
                      </button>
                    </div>
                    <p className="mt-1 text-[10.5px]" style={sub}>{durationOf(selected, fallbackMinutes)} min, inside working hours, skipping days off, leave, holidays and other timed services. Picking one opens the confirm bar.</p>
                    {slots && slots.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {slots.map((s) => (
                          <li key={`${s.day}-${s.start}-${s.personId}`}>
                            <button onClick={() => { setPending({ card: selected, day: s.day, personId: s.personId, start: s.start }); setSelected(null); setSlots(null); }}
                              className="w-full text-left px-3 py-2 rounded-xl border text-[12px] flex items-center gap-2" style={{ borderColor: hairline, backgroundColor: colors.utility.primaryBackground, ...ink }}>
                              <span className="font-bold tabular-nums" style={mono}>{fmtDayShort(s.day)} · {fmtClock(s.start)}</span>
                              {!selected.owner_id && <span style={sub}>· {s.personId === user?.id ? 'you' : s.personName}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {slots && slots.length === 0 && <p className="mt-2 text-[11.5px]" style={{ color: amber }}>No free slot in the next 14 days.</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {historyFor && (
        <HistoryDrawer
          contractId={historyFor.contract_id}
          title={clean(historyFor.buyer_name) || historyFor.contract_number}
          subtitle={historyFor.lane === 'services'
            ? `${historyFor.contract_number} · Service${historyFor.visit?.sequence ? ` ${historyFor.visit.sequence}${historyFor.visit.of ? `/${historyFor.visit.of}` : ''}` : ''}${historyFor.visit?.block_name ? ` · ${historyFor.visit.block_name}` : ''}${historyFor.due_date ? ` · ${fmtDate(historyFor.due_date)}` : ''}`
            : `${historyFor.contract_number}${historyFor.invoice_number ? ` · ${historyFor.invoice_number}` : ''}${historyFor.cycle_label ? ` · ${historyFor.cycle_label}` : ''}${historyFor.due_date ? ` · due ${fmtDate(historyFor.due_date)}` : ''}`}
          onClose={() => setHistoryFor(null)}
          onOpenContract={() => navigate(`/contracts/${historyFor.contract_id}`)}
        />
      )}
      {callFor && callFor.job_id && (
        <LogCallSheet
          card={callFor}
          busy={busyId === callFor.id}
          onClose={() => setCallFor(null)}
          onSubmit={(v) => run(callFor.id, async () => {
            await logCall.mutateAsync({ jobId: callFor.job_id!, calledAt: v.calledAt, outcome: v.outcome, notes: v.notes, promiseDate: v.promiseDate });
            setCallFor(null);
          })}
        />
      )}
    </div>
  );
};

export default TimeboardPage;
