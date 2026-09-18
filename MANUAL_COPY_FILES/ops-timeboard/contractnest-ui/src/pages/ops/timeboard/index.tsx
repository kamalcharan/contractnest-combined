// src/pages/ops/timeboard/index.tsx
//
// TIMEBOARD (batch ops-timeboard, POA batch 3, 2026-09-18) — the playground
// (MANUAL_COPY_FILES/playground/timeboard-playground.html) made real, on the
// same readers as the Plan tab: jtd_plan (023) for the rows and
// get_team_availability (024) for hours, days off, leave and holidays.
//
// Shell = the playground's: a top bar (‹ Today › · range · Day/Week/Agenda ·
// View as · Find a slot), the strip, then three panes — RAIL (Who: everyone +
// each person with load and hours; the VaNi autonomy dial), BOARD (the "To
// place" tray of unslotted services above the grid), SIDE (the selected item
// with every verb — the board's own JobCard — and the confirm bar under it;
// otherwise "VaNi suggests" and "Your day").
//
// The gesture: drag a service from the tray or the grid onto a time (Day
// view: onto a person). Never silent — the confirm bar in the side panel
// states the move and the clash preview; a confirmed slot asks "Move & ask"
// or "Move, keep confirmed"; a drop on another person assigns first. A move
// toasts with Undo (puts the previous slot back through the same tool).
//
// VaNi: the dial is a client preference — Draft (suggestions only), Ask me
// (each suggestion is a button that lands on the confirm bar), Auto ("Plan
// this day" / "Ask everyone" run at once, 023, VaNi-gated). Real autonomy
// (VaNi acting on its own and reporting "What VaNi did") is POA batch 4.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search, X, Sparkles, AlertTriangle, Users, Wand2, CalendarSearch } from 'lucide-react';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useConfirmDeclaration } from '@/hooks/queries/useGroupSessionsDashboard';
import { useConfirmPaymentDeclaration } from '@/hooks/queries/usePaymentDeclarations';
import {
  useOpsPlan, usePlanDay, useAskDay,
  useNudgePayment, useLogPaymentCall, useEscalatePaymentCall, usePauseDunning, useResumeDunning,
  useAssignVisit, useScheduleVisit, useConfirmVisitSlot, useStartVisit, useCompleteVisit, useAskVisitSlot,
  collectionsKeys,
  type BoardCard, type PlanFilters,
} from '@/hooks/queries/useCollectionsQueries';
import { useTeamAvailability } from '@/hooks/queries/useAvailabilityQueries';
import JobCard, { clean, kindLabel, type JobCardActions, type PauseReason } from '@/components/ops/JobCard';
import LogCallSheet from '@/components/ops/LogCallSheet';
import HistoryDrawer from '@/components/ops/HistoryDrawer';
import Grid, { type GridColumn, type DropTarget } from '@/components/ops/timeboard/Grid';
import Agenda from '@/components/ops/timeboard/Agenda';
import {
  UNASSIGNED, VANI, isoDay, addDays, today0, dayOf, mondayOf, fmtClock, fmtDayShort, minToHHMM, gridRange, allCards, dayColumns,
  previewClashes, findSlots, availFor, busyFor, isService, isDraggable, isTimedService, timedAt, durationOf, columnOf, localDayOf, minutesOf, type FreeSlot,
} from '@/components/ops/timeboard/model';
import { useInvoiceTheme } from '../../invoices/ui';
import { useSendInvoice, sendRefusal } from '../../invoices/useInvoiceDetail';
import { fmtMoney, fmtDate } from '@/utils/format';

type View = 'day' | 'week' | 'agenda';
type Autonomy = 'draft' | 'ask' | 'auto';
const VIEW_KEY = 'ops.timeboard.view';
const DIAL_KEY = 'ops.timeboard.autonomy';
const phone = () => typeof window !== 'undefined' && window.innerWidth < 768;
const readView = (): View => { try { const v = window.localStorage.getItem(VIEW_KEY); if (v === 'week' || v === 'day' || v === 'agenda') return v; } catch { /* ignore */ } return phone() ? 'agenda' : 'day'; };
const readDial = (): Autonomy => { try { const v = window.localStorage.getItem(DIAL_KEY); if (v === 'draft' || v === 'ask' || v === 'auto') return v; } catch { /* ignore */ } return 'ask'; };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('') || '?';
const AVATAR = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed'];

const TimeboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { user, currentTenant, perspective } = useAuth() as any;
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary, green = colors.semantic.success, red = colors.semantic.error, amber = colors.semantic.warning;
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const hairline = `${colors.utility.primaryText}14`;
  const card: React.CSSProperties = { backgroundColor: colors.utility.secondaryBackground, border: `1px solid ${hairline}`, borderRadius: 16 };
  const selectStyle: React.CSSProperties = { border: `1px solid ${colors.utility.primaryText}30`, borderRadius: 999, padding: '0 12px', fontSize: 12, fontWeight: 700, backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText, minHeight: 34 };

  // ── view · anchor · view-as · search ──────────────────────────────────────
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => { setViewState(v); try { window.localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const [anchor, setAnchor] = useState<string>(() => { const d = params.get('day'); return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : isoDay(today0()); });
  const [viewAs, setViewAs] = useState<string>('');           // '' = everyone (owner view); a user id = that person's board
  const [search, setSearch] = useState(() => params.get('q') || '');
  const [q, setQ] = useState(search);
  const [dial, setDialState] = useState<Autonomy>(readDial);
  const setDial = (a: Autonomy) => { setDialState(a); try { window.localStorage.setItem(DIAL_KEY, a); } catch { /* ignore */ } };
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const p = new URLSearchParams(params); p.set('day', anchor); if (q) p.set('q', q); else p.delete('q'); setParams(p, { replace: true }); }, [anchor, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const window_ = useMemo(() => {
    const a = dayOf(anchor);
    if (view === 'week') { const m = mondayOf(a); return { from: isoDay(m), to: isoDay(addDays(m, 6)) }; }
    if (view === 'day') return { from: anchor, to: anchor };
    return { from: anchor, to: isoDay(addDays(a, 6)) };
  }, [view, anchor]);
  const step = (n: number) => setAnchor(isoDay(addDays(dayOf(anchor), view === 'day' ? n : 7 * n)));
  const filters = useMemo<PlanFilters>(() => ({ from: window_.from, to: window_.to, ...(q ? { q } : {}) }), [window_, q]);

  const enabled = perspective !== 'expense';
  const plan = useOpsPlan(filters, { enabled });
  const avail = useTeamAvailability(60, { enabled });
  const data = plan.data;
  const team = data?.team || [];
  const vaniOn = !!data?.vani_enabled;
  const askChannels = data?.ask_channels || [];
  const fallbackMinutes = avail.data?.tenant?.default_visit_minutes || 60;
  const range = useMemo(() => gridRange(avail.data), [avail.data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all });
  const todayIso = isoDay(today0());
  const meId: string | undefined = user?.id;

  /** the window's cards, the carried ones, then the View-as filter (a person's own services + follow-ups, plus Unassigned and VaNi) */
  const windowCards = useMemo(() => (data ? allCards(data.days) : []), [data]);
  const cards = useMemo(() => (viewAs ? windowCards.filter((c) => columnOf(c) === viewAs || columnOf(c) === UNASSIGNED || columnOf(c) === VANI) : windowCards), [windowCards, viewAs]);
  /** the tray: every service in the window (and carried over) with no slot yet */
  const tray = useMemo(() => [...(data?.carried.cards || []), ...cards].filter((c) => isService(c) && !isTimedService(c) && isDraggable(c) && (!viewAs || !c.owner_id || c.owner_id === viewAs)), [data, cards, viewAs]);
  const gridCards = useMemo(() => cards.filter((c) => !(isService(c) && !isTimedService(c))), [cards]);
  /** the tray grouped by contract + block, oldest due first — a backlog of 14 services on one contract is one chip until opened */
  const trayGroups = useMemo(() => {
    const m = new Map<string, { key: string; contract: string; block: string; oldest: string; cards: BoardCard[] }>();
    for (const c of tray) {
      const key = `${c.contract_id}|${c.visit?.block_name || ''}`;
      const due = c.due_date || localDayOf(c.anchor_at) || '9999-12-31';
      const g = m.get(key) || { key, contract: c.contract_number, block: c.visit?.block_name || c.contract_number, oldest: due, cards: [] };
      g.cards.push(c); if (due < g.oldest) g.oldest = due; m.set(key, g);
    }
    return Array.from(m.values()).map((g) => ({ ...g, cards: [...g.cards].sort((a, b) => ((a.due_date || a.anchor_at || '') < (b.due_date || b.anchor_at || '') ? -1 : 1)) })).sort((a, b) => (a.oldest < b.oldest ? -1 : a.oldest > b.oldest ? 1 : a.contract.localeCompare(b.contract)));
  }, [tray]);
  const trayOverdue = useMemo(() => tray.filter((c) => { const d = c.due_date || localDayOf(c.anchor_at); return !!d && d < isoDay(today0()); }).length, [tray]);
  const columns = useMemo<GridColumn[]>(() => {
    if (!data) return [];
    if (view === 'day') {
      return dayColumns(team, cards, meId).filter((c) => !viewAs || c.id === viewAs || c.id === UNASSIGNED || c.id === VANI)
        .map((c) => ({ key: c.id, day: anchor, personId: c.id, label: c.name, isToday: anchor === todayIso }));
    }
    return data.days.map((d) => ({ key: d.day, day: d.day, personId: UNASSIGNED, label: d.dow, sub: dayOf(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), isToday: d.day === todayIso }));
  }, [data, view, anchor, cards, team, viewAs, meId, todayIso]);

  // ── tools (the same wiring as Ops and the Plan tab) ───────────────────────
  const nudge = useNudgePayment(); const logCall = useLogPaymentCall(); const escalate = useEscalatePaymentCall();
  const pause = usePauseDunning(); const resume = useResumeDunning();
  const assignVisit = useAssignVisit(); const scheduleVisit = useScheduleVisit(); const confirmSlot = useConfirmVisitSlot();
  const startVisit = useStartVisit(); const completeVisit = useCompleteVisit(); const askVisit = useAskVisitSlot();
  const sendInvoice = useSendInvoice(); const confirmGs = useConfirmDeclaration(); const confirmPay = useConfirmPaymentDeclaration();
  const planDay = usePlanDay(); const askDay = useAskDay();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<BoardCard | null>(null);
  const [historyFor, setHistoryFor] = useState<BoardCard | null>(null);
  const [selected, setSelected] = useState<BoardCard | null>(null);
  const [list, setList] = useState<{ title: string; cards: BoardCard[] } | null>(null);
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [pending, setPending] = useState<DropTarget | null>(null);
  const [finder, setFinder] = useState<{ cardId: string; who: string; from: string; slots: FreeSlot[] | null } | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selected || !data) return;
    const fresh = [...allCards(data.days), ...data.carried.cards, ...data.parked.cards].find((c) => c.id === selected.id);
    setSelected(fresh || null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // One action in flight at a time. A "Saving…" toast stays up until the tool answers (the hook then toasts the result); the side panel shows a spinner.
  const run = async (id: string, fn: () => Promise<unknown>, label = 'Saving…') => {
    if (busyId || busyDay) return;
    setBusyId(id);
    const t = vaniToast.info(label, { duration: 0, dismissible: false });
    try { await fn(); } catch { /* toasted by the hook */ } finally { vaniToast.dismiss(t); setBusyId(null); }
  };
  const runDay = async (day: string, fn: () => Promise<unknown>) => {
    if (busyId || busyDay) return;
    setBusyDay(day);
    const t = vaniToast.info('VaNi is working on this day…', { duration: 0, dismissible: false });
    try { await fn(); } catch { /* toasted */ } finally { vaniToast.dismiss(t); setBusyDay(null); }
  };
  /** After a slot lands: if its day is off screen, show that day — the owner's first question was "is it saved?" */
  const landOn = (scheduledAt?: string | null) => {
    const day = localDayOf(scheduledAt);
    if (!day) return;
    if (day < window_.from || day > window_.to) {
      setAnchor(day);
      vaniToast.info(`Now showing ${fmtDayShort(day)}`, { message: 'The slot landed on a day that was off screen.', duration: 4000 });
    }
  };
  const actions: JobCardActions = {
    onNudge: (c, ch) => { if (c.job_id) run(c.id, () => nudge.mutateAsync({ jobId: c.job_id!, channel: ch })); },
    onCall: (c) => { if (c.job_id) setCallFor(c); },
    onAssign: (c, userId, dueAt) => { if (!c.job_id) return; if (!userId) { vaniToast.error('Pick a teammate first'); return; } return run(c.id, () => escalate.mutateAsync({ jobId: c.job_id!, assignTo: userId, dueAt: dueAt || null })); },
    onPause: (c, reason: PauseReason, until) => { if (!c.job_id) return; if (reason === 'promise' && !until) { vaniToast.error('A promise needs a date'); return; } return run(c.id, () => pause.mutateAsync({ jobId: c.job_id!, reason, until })); },
    onResume: (c) => { if (c.job_id) run(c.id, () => resume.mutateAsync({ jobId: c.job_id! })); },
    onConfirm: (c) => {
      const d = c.declaration; if (!d) return;
      run(c.id, async () => {
        if (d.kind === 'session') await confirmGs.mutateAsync({ id: d.id, confirm: true }); else await confirmPay.mutateAsync({ id: d.id, confirm: true } as any);
        vaniToast.success(`Payment confirmed — ${fmtMoney(d.amount, c.currency)} from ${clean(c.buyer_name) || c.contract_number}`); refresh();
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
          if (r?.reason === 'rule_disabled') vaniToast.error('The invoice was not sent', { message: 'Payment reminders are switched off under Automation Rules.', duration: 7000, action: { label: 'Open Automation Rules', onClick: () => navigate('/settings/configure/automation-rules') } });
          else vaniToast.error(r?.message || 'Could not send the invoice', { duration: 5000 });
        }
      });
    },
    onAssignVisit: (c, userId) => { if (!userId) { vaniToast.error('Pick a technician first'); return; } return run(c.id, () => assignVisit.mutateAsync({ eventId: c.id, assignTo: userId })); },
    onSchedule: (c, scheduledAt, confirmed) => { if (!scheduledAt) { vaniToast.error('Pick a date and time first'); return; } return run(c.id, async () => { const r = await scheduleVisit.mutateAsync({ eventId: c.id, scheduledAt, confirmed }); landOn(r.scheduled_at); }, 'Saving the slot…'); },
    onConfirmSlot: (c) => { run(c.id, () => confirmSlot.mutateAsync({ eventId: c.id })); },
    onStartVisit: (c) => { run(c.id, () => startVisit.mutateAsync({ eventId: c.id })); },
    onCompleteVisit: (c, notes) => run(c.id, () => completeVisit.mutateAsync({ eventId: c.id, notes: notes || undefined })),
    onAskCustomer: async (c, channel) => { if (busyId || busyDay) return; setBusyId(c.id); try { return await askVisit.mutateAsync({ eventId: c.id, channel }); } catch { return; } finally { setBusyId(null); } },
  };

  // ── the move: assign (if another person) → schedule; Undo puts the old slot back ──
  const personName = (id: string | undefined) => (!id || id === UNASSIGNED ? 'nobody' : id === meId ? 'you' : team.find((t) => t.user_id === id)?.name || avail.data?.people.find((p) => p.user_id === id)?.name || 'a technician');
  const preview = useMemo(() => (pending ? previewClashes(avail.data, windowCards, pending.personId, pending.day, pending.start, durationOf(pending.card, fallbackMinutes), pending.card.id) : []), [pending, avail.data, windowCards, fallbackMinutes]);
  const commitMove = async (confirmed: boolean) => {
    if (!pending) return;
    const { card: c, day, personId: pid, start } = pending;
    const reassign = pid !== UNASSIGNED && pid !== VANI && pid !== (c.owner_id || UNASSIGNED);
    const before = isTimedService(c) ? { at: timedAt(c)!, confirmed: c.slot_state === 'confirmed' } : null;
    setPending(null);
    await run(c.id, async () => {
      if (reassign) await assignVisit.mutateAsync({ eventId: c.id, assignTo: pid });
      const r = await scheduleVisit.mutateAsync({ eventId: c.id, scheduledAt: `${day}T${minToHHMM(start)}`, confirmed });
      landOn(r.scheduled_at);
      if (before) {
        const d = new Date(before.at); const back = `${isoDay(d)}T${minToHHMM(d.getHours() * 60 + d.getMinutes())}`;
        vaniToast.info(`Moved ${c.visit?.block_name || c.contract_number}`, { message: `Was ${fmtDayShort(isoDay(d))} ${fmtClock(d.getHours() * 60 + d.getMinutes())}`, duration: 8000, action: { label: 'Undo', onClick: () => { run(c.id, () => scheduleVisit.mutateAsync({ eventId: c.id, scheduledAt: back, confirmed: before.confirmed }), 'Putting the slot back…'); } } });
      }
    }, 'Saving the slot…');
  };
  const onDrop = (t: DropTarget) => { setDragging(null); setPending(t); setSelected(t.card); setList(null); };

  // ── find a slot ───────────────────────────────────────────────────────────
  /** the JobCard Schedule panel starts on the day on screen (Day view) or the window's first day, at the next full hour inside the organisation's hours */
  const defaultSlotAt = useMemo(() => {
    const day = view === 'day' ? anchor : window_.from;
    const a = availFor(avail.data, UNASSIGNED, day);
    let m = a.start ?? 9 * 60;
    if (day === todayIso) { const now = new Date(); m = Math.max(m, (now.getHours() + 1) * 60); }
    return `${day}T${minToHHMM(Math.min(m, 23 * 60))}`;
  }, [view, anchor, window_.from, avail.data, todayIso]);
  const openFinder = (c?: BoardCard) => {
    const first = c || tray[0];
    setFinder({ cardId: first?.id || '', who: first?.owner_id || 'any', from: todayIso, slots: null });
  };
  const finderCard = finder ? [...tray, ...windowCards].find((c) => c.id === finder.cardId) : undefined;
  const runFinder = () => {
    if (!finder || !finderCard) return;
    const probe = finder.who === 'any' ? { ...finderCard, owner_id: undefined } : { ...finderCard, owner_id: finder.who };
    const slots = findSlots({ avail: avail.data, cards: windowCards, team, card: probe, fromDay: finder.from, days: 14, minutes: durationOf(finderCard, fallbackMinutes), limit: 8 });
    setFinder({ ...finder, slots });
  };
  const pickSlot = (s: FreeSlot) => { if (!finderCard) return; setFinder(null); onDrop({ card: finderCard, day: s.day, personId: s.personId, start: s.start }); };

  // ── rail: load per person over the visible days ───────────────────────────
  const visibleDays = data ? data.days.map((d) => d.day) : [];
  const loadFor = (pid: string) => {
    let booked = 0, cap = 0, clashes = 0;
    for (const day of visibleDays) {
      const a = availFor(avail.data, pid, day);
      if (!a.off && a.start != null && a.end != null) cap += a.end - a.start;
      for (const b of busyFor(windowCards, pid, day, fallbackMinutes)) { booked += b.end - b.start; if (b.card.visit?.clashes?.length) clashes++; }
    }
    return { booked, cap, clashes };
  };
  const colorOf = (id: string) => AVATAR[Math.abs(Array.from(id).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0)) % AVATAR.length];

  // ── VaNi suggestions from the counts (client-side; real suggestions are batch 4) ──
  const dayCounts = view === 'day' ? data?.days.find((d) => d.day === anchor)?.counts : data?.totals;
  const suggestions = useMemo(() => {
    if (!data || !dayCounts) return [] as Array<{ key: string; text: string; run?: () => void; label?: string }>;
    const out: Array<{ key: string; text: string; run?: () => void; label?: string }> = [];
    const scope = view === 'day' ? `on ${fmtDayShort(anchor)}` : 'in this window';
    if (dayCounts.to_place > 0) {
      const first = tray[0];
      out.push({
        key: 'place', text: `${dayCounts.to_place} service${dayCounts.to_place === 1 ? '' : 's'} ${scope} ${dayCounts.to_place === 1 ? 'has' : 'have'} no time yet. ${view === 'day' ? 'Place them from the opening hour, one visit length apart per technician.' : 'Place them day by day, or find a slot for each.'}`,
        label: view === 'day' ? (dial === 'auto' ? `Plan this day · ${dayCounts.to_place}` : `Plan this day · ${dayCounts.to_place}`) : first ? `Find a slot for ${first.visit?.block_name || first.contract_number}` : undefined,
        run: view === 'day' ? () => runDay(anchor, () => planDay.mutateAsync({ day: anchor })) : first ? () => openFinder(first) : undefined,
      });
    }
    const backlog = (data.carried.cards || []).filter((c) => isService(c) && !isTimedService(c) && isDraggable(c));
    if (backlog.length > 0) {
      const oldest = backlog.reduce((m, c) => { const d = c.due_date || localDayOf(c.anchor_at) || ''; return d && (!m || d < m) ? d : m; }, '');
      const days = Math.max(1, Math.ceil(backlog.length / Math.max(1, Math.floor(8 * 60 / fallbackMinutes) * Math.max(1, team.length))));
      out.push({
        key: 'backlog', text: `${backlog.length} service${backlog.length === 1 ? ' is' : 's are'} overdue${oldest ? ` since ${dayOf(oldest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''} with no slot — about ${days} working day${days === 1 ? '' : 's'} of work${team.length > 1 ? ` across ${team.length} people` : ''}. Spread them over the coming days rather than today.`,
        label: `Find a slot for the oldest`, run: () => openFinder(backlog.sort((a, b) => ((a.due_date || a.anchor_at || '') < (b.due_date || b.anchor_at || '') ? -1 : 1))[0]),
      });
    }
    if (dayCounts.proposed > 0) out.push({
      key: 'ask', text: `${dayCounts.proposed} proposed slot${dayCounts.proposed === 1 ? '' : 's'} ${scope} ${dayCounts.proposed === 1 ? 'has' : 'have'} not been put to the customer.${askChannels.length ? '' : ' No send template is registered yet — Share from each card works today.'}`,
      label: view === 'day' && askChannels.length ? `Ask everyone ${askChannels[0] === 'whatsapp' ? 'on WhatsApp' : 'by email'} · ${dayCounts.proposed}` : undefined,
      run: view === 'day' && askChannels.length ? () => runDay(anchor, () => askDay.mutateAsync({ day: anchor, channel: askChannels[0]! })) : undefined,
    });
    if (dayCounts.reminders_due > 0) out.push({ key: 'rem', text: `${dayCounts.reminders_due} payment reminder${dayCounts.reminders_due === 1 ? '' : 's'} ${scope} ${data.ladder?.rule_enabled ? 'run by the ladder.' : 'wait — Payment reminders are switched off under Automation Rules.'}`, label: data.ladder?.rule_enabled ? undefined : 'Turn on Payment reminders', run: data.ladder?.rule_enabled ? undefined : () => navigate('/settings/configure/automation-rules') });
    if (dayCounts.clashes > 0) out.push({ key: 'clash', text: `${dayCounts.clashes} slot${dayCounts.clashes === 1 ? '' : 's'} ${scope} clash${dayCounts.clashes === 1 ? 'es' : ''} — outside hours, on a day off or leave, or overlapping. Drag ${dayCounts.clashes === 1 ? 'it' : 'them'} clear.` });
    return out;
  }, [data, dayCounts, view, anchor, tray, dial, askChannels, team.length, fallbackMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── chrome ────────────────────────────────────────────────────────────────
  const Seg: React.FC<{ on: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ on, onClick, title, children }) => (
    <button onClick={onClick} title={title} aria-pressed={on} className="inline-flex items-center gap-1 px-3 min-h-[34px] rounded-full text-[11px] font-bold whitespace-nowrap" style={on ? { backgroundColor: brand, color: '#fff' } : { color: brand, backgroundColor: 'transparent' }}>{children}</button>
  );
  const Pill: React.FC<{ color: string; children: React.ReactNode; title?: string; onClick?: () => void }> = ({ color, children, title, onClick }) => (
    <button onClick={onClick} disabled={!onClick} title={title} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap disabled:cursor-default" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>{children}</button>
  );
  const Btn: React.FC<{ onClick?: () => void; primary?: boolean; ghost?: boolean; disabled?: boolean; title?: string; children: React.ReactNode }> = ({ onClick, primary, ghost, disabled, title, children }) => (
    <button onClick={onClick} disabled={disabled} title={title} className="inline-flex items-center gap-1 px-3 min-h-[34px] rounded-full text-[11px] font-bold border disabled:opacity-60"
      style={primary ? { backgroundColor: brand, color: '#fff', borderColor: brand } : ghost ? { color: colors.utility.secondaryText, borderColor: 'transparent' } : { color: brand, borderColor: `${brand}55` }}>{children}</button>
  );

  const totals = data?.totals;
  const rangeLabel = view === 'day' ? dayOf(anchor).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : `${fmtDate(window_.from)} – ${fmtDate(window_.to)}`;
  const fetching = plan.isFetching || avail.isFetching;
  const openVani = () => navigate('/vani/landing');
  const select = (c: BoardCard) => { setSelected(c); setList(null); if (pending && pending.card.id !== c.id) setPending(null); };
  const myDay = windowCards.filter((c) => columnOf(c) === meId && localDayOf(isTimedService(c) ? timedAt(c) : c.anchor_at) === todayIso).sort((a, b) => (minutesOf(isTimedService(a) ? timedAt(a) : a.anchor_at) || 0) - (minutesOf(isTimedService(b) ? timedAt(b) : b.anchor_at) || 0));

  const confirmBar = pending && (
    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: `${brand}70`, backgroundColor: `${brand}0d` }}>
      <p className="text-[12.5px]" style={ink}>
        {pending.card.slot_state === 'confirmed' ? <>This slot was <b>confirmed with the customer</b>. Move to </> : 'Move to '}
        <b style={mono}>{fmtDayShort(pending.day)} {fmtClock(pending.start)}</b>
        {pending.personId !== UNASSIGNED && pending.personId !== VANI && pending.personId !== (pending.card.owner_id || UNASSIGNED) && <> · <b>{personName(pending.personId)}</b></>}
        {pending.card.slot_state === 'confirmed' ? ' and ask them again?' : '?'}
      </p>
      {preview.length > 0 && <p className="mt-1 text-[11.5px] font-bold inline-flex items-center gap-1" style={{ color: red }}><AlertTriangle size={12} /> {preview.map((p) => p.detail).join(' · ')}</p>}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Btn primary onClick={() => commitMove(false)} title="Schedule as a proposal — the customer confirms from the card">{pending.card.slot_state === 'confirmed' ? 'Move & ask' : 'Move'}</Btn>
        {pending.card.slot_state === 'confirmed' ? <Btn onClick={() => commitMove(true)}>Move, keep confirmed</Btn> : <Btn onClick={() => commitMove(true)} title="Schedule as confirmed — the customer is notified">Move & confirm</Btn>}
        <Btn ghost onClick={() => setPending(null)}>Keep as is</Btn>
      </div>
    </div>
  );

  if (!enabled) return <div className="px-6 py-12 text-center text-[13px]" style={sub}>The Timeboard is a revenue-side view for now. Switch to Revenue to see the days ahead.</div>;

  return (
    <div className="px-4 sm:px-5 py-4 mx-auto max-w-[1600px]">
      {/* top bar */}
      <header className="flex items-center gap-3 flex-wrap">
        <div className="mr-1"><b className="text-[15px]" style={ink}>Timeboard</b> <span className="text-[11px]" style={{ ...sub, ...mono }}>Ops · {currentTenant?.name || 'your business'} · IST</span></div>
        <div className="inline-flex items-center rounded-full border" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
          <button onClick={() => step(-1)} className="px-2 min-h-[34px]" aria-label="Earlier" style={{ color: brand }}><ChevronLeft size={15} /></button>
          <button onClick={() => setAnchor(todayIso)} className="px-2 min-h-[34px] text-[11px] font-bold" style={{ color: brand }}>Today</button>
          <button onClick={() => step(1)} className="px-2 min-h-[34px]" aria-label="Later" style={{ color: brand }}><ChevronRight size={15} /></button>
        </div>
        <h1 className="text-[16px] font-extrabold" style={ink}>{rangeLabel}</h1>
        <input type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} style={{ ...selectStyle, borderRadius: 10 }} aria-label="Go to date" />
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="View">
          <Seg on={view === 'day'} onClick={() => setView('day')}>Day</Seg><Seg on={view === 'week'} onClick={() => setView('week')}>Week</Seg><Seg on={view === 'agenda'} onClick={() => setView('agenda')}>Agenda</Seg>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={sub}>View as
          <select value={viewAs} onChange={(e) => setViewAs(e.target.value)} style={selectStyle} aria-label="View as">
            <option value="">Everyone · owner view</option>
            {team.map((t) => <option key={t.user_id} value={t.user_id}>{t.name || 'Teammate'}{t.user_id === meId ? ' · you' : ''}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border px-3 min-h-[34px] w-44" style={{ borderColor: `${colors.utility.primaryText}30`, backgroundColor: colors.utility.primaryBackground }}>
          <Search size={13} style={sub} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="customer · contract" aria-label="Search" className="bg-transparent outline-none text-xs w-full" style={ink} />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={sub}><X size={12} /></button>}
        </label>
        <span className="ml-auto inline-flex items-center gap-2">
          <Btn primary onClick={() => openFinder()} disabled={!tray.length && !selected} title="Working hours, leave and what is already on the board; proposes, never confirms"><CalendarSearch size={13} /> Find a slot</Btn>
          <button onClick={() => { plan.refetch(); avail.refetch(); }} title="Refresh" className="inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-full text-[11px] font-bold border" style={{ color: brand, borderColor: `${brand}45` }}><RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /></button>
        </span>
      </header>

      {/* strip */}
      {data && totals && (
        <div className="mt-3 flex items-center gap-2 flex-wrap text-[12px]" style={sub}>
          {totals.needs_you > 0 && <Pill color={amber}>{totals.needs_you} need you</Pill>}
          {totals.clashes > 0 && <Pill color={red}><AlertTriangle size={11} /> {totals.clashes} clash{totals.clashes === 1 ? '' : 'es'}</Pill>}
          {tray.length > 0 && <Pill color={colors.utility.secondaryText}>{tray.length} to place</Pill>}
          {totals.asked > 0 && <Pill color={amber} title="Slots the customer has been asked to confirm">{totals.asked} awaiting customer</Pill>}
          {totals.unassigned_services > 0 && <Pill color={colors.utility.secondaryText}><Users size={11} /> {totals.unassigned_services} unassigned</Pill>}
          {data.carried.counts.total > 0 && <Pill color={red} title="Anchored before this window and still open" onClick={() => { setSelected(null); setList({ title: `Carried over · ${data.carried.counts.total}`, cards: data.carried.cards }); }}>{data.carried.counts.total} carried over →</Pill>}
          {data.parked.counts.total > 0 && <Pill color={colors.utility.secondaryText} onClick={() => { setSelected(null); setList({ title: `Parked · ${data.parked.counts.total}`, cards: data.parked.cards }); }}>{data.parked.counts.total} parked →</Pill>}
          {totals.total === 0 && <span>Nothing committed in this window.</span>}
          {data.truncated && <span style={{ color: amber }}>some rows were left out — narrow the window</span>}
          <span className="ml-auto inline-flex items-center gap-1" style={{ color: vaniOn ? green : colors.utility.secondaryText }}><Sparkles size={11} /> {vaniOn ? 'VaNi is on' : 'VaNi is off'}</span>
        </div>
      )}
      <div className="mt-2 h-[3px] rounded-full overflow-hidden" role="progressbar" aria-busy={fetching} style={{ backgroundColor: fetching ? `${brand}22` : 'transparent' }}>{fetching && <div className="h-full w-1/3 rounded-full animate-pulse" style={{ backgroundColor: brand }} />}</div>

      {plan.isPending && !data ? <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
      : plan.isError ? <div className="py-12 text-center"><p className="text-sm mb-3" style={sub}>Couldn't load the timeboard.</p><Btn onClick={() => plan.refetch()}>Retry</Btn></div>
      : data ? (
        <div className="mt-2 grid gap-3 items-start" style={{ gridTemplateColumns: phone() ? '1fr' : '220px minmax(0,1fr) 400px', opacity: plan.isFetching ? 0.8 : 1, transition: 'opacity .2s' }}>
          {/* ── RAIL ── */}
          <aside className="space-y-3">
            <section style={card} className="p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ ...mono, ...sub }}>Who</h3>
              <button onClick={() => setViewAs('')} className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left" style={{ backgroundColor: !viewAs ? `${brand}12` : 'transparent' }}>
                <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: colors.utility.secondaryText }}>∗</span>
                <span><span className="block text-[12.5px] font-bold" style={ink}>Everyone</span><span className="block text-[10.5px]" style={sub}>{team.length} {team.length === 1 ? 'person' : 'people'} + VaNi</span></span>
              </button>
              {team.map((t) => {
                const { booked, cap, clashes } = loadFor(t.user_id);
                const pct = cap ? Math.min(100, Math.round((booked / cap) * 100)) : 0;
                const a = availFor(avail.data, t.user_id, view === 'day' ? anchor : todayIso);
                return (
                  <button key={t.user_id} onClick={() => setViewAs(viewAs === t.user_id ? '' : t.user_id)} className="w-full flex items-start gap-2 rounded-xl px-2 py-1.5 text-left" style={{ backgroundColor: viewAs === t.user_id ? `${brand}12` : 'transparent', opacity: a.off && view === 'day' ? 0.6 : 1 }}>
                    <span className="w-7 h-7 mt-0.5 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white flex-none" style={{ backgroundColor: colorOf(t.user_id) }}>{initials(t.name || '?')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold truncate" style={ink}>{t.name || 'Teammate'}{t.user_id === meId ? ' · you' : ''}</span>
                      <span className="block h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: `${colors.utility.primaryText}14` }}><i className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct > 85 ? red : brand }} /></span>
                      <span className="block text-[10.5px] mt-0.5" style={sub}>{(booked / 60).toFixed(1)}h of {(cap / 60).toFixed(0)}h · {a.off ? a.off.label : `${minToHHMM(a.start!)}–${minToHHMM(a.end!)}`}{clashes ? <span style={{ color: red }}> · {clashes} clash{clashes === 1 ? '' : 'es'}</span> : null}</span>
                    </span>
                  </button>
                );
              })}
            </section>
            <section style={card} className="p-3">
              <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: brand }}>V</span><b className="text-[12.5px]" style={ink}>VaNi</b>{!vaniOn && <span className="text-[10px] font-bold" style={{ color: colors.utility.secondaryText }}>off</span>}</div>
              <p className="text-[11px] mt-1" style={sub}>Runs the ladders and asks for slots. The dial sets how much it does on its own.</p>
              <div className="mt-2 inline-flex rounded-full border p-0.5" style={{ borderColor: `${brand}45`, backgroundColor: colors.utility.primaryBackground }} role="group" aria-label="Autonomy">
                {(['draft', 'ask', 'auto'] as Autonomy[]).map((a) => <Seg key={a} on={dial === a} onClick={() => setDial(a)}>{a === 'draft' ? 'Draft' : a === 'ask' ? 'Ask me' : 'Auto'}</Seg>)}
              </div>
              {!vaniOn && <button onClick={openVani} className="mt-2 text-[11px] font-bold" style={{ color: brand }}>Open VaNi →</button>}
            </section>
          </aside>

          {/* ── BOARD ── */}
          <section className="min-w-0">
            <div style={card} className="p-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] mr-1" style={{ ...mono, ...sub }}>To place</h3>
                {tray.length === 0 ? <span className="text-[11px]" style={sub}>Nothing waiting for a slot.</span> : (
                  <>
                    <span className="text-[11.5px]" style={ink}><b>{tray.length}</b> to place{trayOverdue > 0 && <span style={{ color: red }}> · <b>{trayOverdue}</b> overdue</span>} · {trayGroups.length} contract{trayGroups.length === 1 ? '' : 's'}</span>
                    <button onClick={() => setTrayOpen((v) => !v)} className="text-[11px] font-bold" style={{ color: brand }}>{trayOpen ? 'Collapse' : 'Show all'}</button>
                    <span className="text-[10.5px] ml-auto" style={sub}>Drag a service onto the grid to propose a slot{view === 'day' ? ' for that person' : ''}, or let VaNi place it.</span>
                  </>
                )}
              </div>
              {tray.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 overflow-y-auto" style={{ maxHeight: trayOpen ? 220 : 76 }}>
                  {trayGroups.map((g) => {
                    const open = trayOpen || openGroups.has(g.key);
                    const late = g.oldest < todayIso;
                    return (
                      <React.Fragment key={g.key}>
                        {!open ? (
                          <button onClick={() => setOpenGroups((x) => { const n = new Set(x); n.add(g.key); return n; })} title={`${g.cards.length} service${g.cards.length === 1 ? '' : 's'} on ${g.contract} — open the group to drag them one by one`}
                            className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border text-[11px] max-w-full" style={{ borderColor: late ? `${red}66` : hairline, backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}>
                            <span className="w-1 h-4 rounded-full" style={{ backgroundColor: late ? red : brand }} />
                            <span className="font-bold truncate">{g.block}</span>
                            <span style={sub}>{g.contract}</span>
                            {g.cards.length > 1 && <span className="px-1.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${late ? red : brand}18`, color: late ? red : brand }}>×{g.cards.length}</span>}
                            <span style={{ ...sub, color: late ? red : undefined }}>{late ? 'oldest due' : 'due'} {dayOf(g.oldest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            {g.cards.length === 1 && <span style={sub}>· drag</span>}
                          </button>
                        ) : g.cards.map((c) => {
                          const due = c.due_date || localDayOf(c.anchor_at);
                          const lateOne = !!due && due < todayIso;
                          return (
                            <button key={c.id} draggable={busyId !== c.id} onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => setDragging(c), 0); }} onDragEnd={() => setDragging(null)} onClick={() => select(c)}
                              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border text-[11px] cursor-grab active:cursor-grabbing max-w-full" style={{ borderColor: selected?.id === c.id ? brand : lateOne ? `${red}66` : hairline, backgroundColor: colors.utility.primaryBackground, color: colors.utility.primaryText }}
                              title={`${c.visit?.block_name || 'Service'} · ${c.contract_number} · ${clean(c.buyer_name)} · drag onto the grid`}>
                              <span className="w-1 h-4 rounded-full" style={{ backgroundColor: lateOne ? red : c.owner_id ? brand : colors.utility.secondaryText }} />
                              <span className="font-bold truncate">{c.visit?.block_name || c.contract_number}</span>
                              <span className="truncate" style={sub}>{c.contract_number}{c.visit?.sequence ? ` · #${c.visit.sequence}` : ''} · {durationOf(c, fallbackMinutes)}m{due ? ` · due ${dayOf(due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}{c.owner_id ? ` · ${personName(c.owner_id)}` : ''}</span>
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
            {view === 'agenda' ? (
              <Agenda days={data.days} fallbackMinutes={fallbackMinutes} selectedId={selected?.id} meId={meId} onSelect={select} />
            ) : (
              <Grid mode={view} columns={columns} cards={gridCards} avail={avail.data} range={range} fallbackMinutes={fallbackMinutes} selectedId={selected?.id} busyId={busyId} vaniOn={vaniOn} dragging={dragging}
                onDragStart={setDragging} onSelect={select} onOpenList={(title, cs) => { setSelected(null); setList({ title, cards: cs }); }} onDrop={onDrop} onOpenVani={openVani} />
            )}
          </section>

          {/* ── SIDE ── */}
          <aside className="space-y-3">
            {selected && (
              <section style={card} className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] inline-flex items-center gap-2" style={{ ...mono, ...sub }}>{kindLabel(selected, meId)}{busyId === selected.id && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-bold" style={{ color: brand }}><LoadingSpinner size="sm" /> Saving…</span>}</span>
                  <button onClick={() => { setSelected(null); setPending(null); }} aria-label="Close" style={sub}><X size={15} /></button>
                </div>
                <JobCard card={selected} compact busy={busyId === selected.id} locked={!!busyId && busyId !== selected.id} team={team} ladder={data.ladder} meId={meId} actions={actions} askChannels={askChannels} defaultSlotAt={defaultSlotAt} />
                {pending && pending.card.id === selected.id && confirmBar}
                {isService(selected) && isDraggable(selected) && !pending && <div className="mt-2"><Btn onClick={() => openFinder(selected)}><CalendarSearch size={12} /> Find a slot</Btn></div>}
              </section>
            )}
            {list && (
              <section style={card} className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, ...sub }}>{list.title}</span><button onClick={() => setList(null)} aria-label="Close" style={sub}><X size={15} /></button></div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">{list.cards.map((c) => <JobCard key={c.id} card={c} compact busy={busyId === c.id} locked={!!busyId && busyId !== c.id} team={team} ladder={data.ladder} meId={meId} actions={actions} askChannels={askChannels} />)}</div>
              </section>
            )}
            {!(viewAs && viewAs !== meId) && (
              <section style={card} className="p-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2 inline-flex items-center gap-1" style={{ ...mono, color: vaniOn ? brand : colors.utility.secondaryText }}><Sparkles size={11} /> VaNi suggests</h3>
                {suggestions.length === 0 ? <p className="text-[11.5px]" style={sub}>Nothing to suggest {view === 'day' ? 'for this day' : 'in this window'}.</p> : suggestions.map((s) => (
                  <div key={s.key} className="rounded-xl border p-2.5 mb-2" style={{ borderColor: hairline, backgroundColor: colors.utility.primaryBackground }}>
                    <p className="text-[12px]" style={ink}>{s.text}</p>
                    {s.run && s.label && dial !== 'draft' && (
                      vaniOn || s.key === 'rem' || s.key === 'backlog' || (s.key === 'place' && view !== 'day')
                        ? <div className="mt-2"><Btn primary disabled={!!busyId || !!busyDay} onClick={s.run}>{busyDay ? <LoadingSpinner size="sm" /> : <Wand2 size={12} />} {s.label}</Btn></div>
                        : <p className="mt-1.5 text-[11px]" style={sub}>VaNi would do this. <button onClick={openVani} className="font-bold" style={{ color: brand }}>Open VaNi →</button></p>
                    )}
                  </div>
                ))}
                <p className="text-[11px]" style={sub}>Autonomy: <b>{dial === 'draft' ? 'Draft only' : dial === 'ask' ? 'Ask me first' : 'Act, then tell me'}</b>. {dial === 'draft' ? 'Suggestions are shown, nothing runs.' : dial === 'ask' ? 'Each suggestion runs only when you press it.' : 'Batch actions run at once; VaNi acting on its own arrives with the next batch.'}</p>
              </section>
            )}
            {!selected && !list && (
              <section style={card} className="p-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ ...mono, ...sub }}>Your day</h3>
                {myDay.length === 0 ? <p className="text-[11.5px]" style={sub}>Nothing on your board today. Tap a block for the contact and the buttons; drag to move it — the office confirms with the customer.</p> : (
                  <ul className="space-y-1">{myDay.map((c) => { const m = minutesOf(isTimedService(c) ? timedAt(c) : c.anchor_at); return (
                    <li key={c.id}><button onClick={() => select(c)} className="w-full text-left flex items-center gap-2 text-[12px]" style={ink}><span className="w-12 flex-none font-bold" style={{ ...mono, color: brand }}>{m == null ? '—' : fmtClock(m)}</span><span className="truncate">{c.visit?.block_name || kindLabel(c, meId)} · {clean(c.buyer_name) || c.contract_number}</span></button></li>
                  ); })}</ul>
                )}
              </section>
            )}
          </aside>
        </div>
      ) : null}

      {/* find a slot */}
      {finder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: `${colors.utility.primaryText}44` }} onClick={() => setFinder(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-4" style={{ backgroundColor: colors.utility.primaryBackground }}>
            <h2 className="text-[16px] font-extrabold" style={ink}>Find a slot</h2>
            <p className="text-[11.5px] mt-0.5" style={sub}>Looks at working hours, leave, holidays and what is already on the board. Proposes, never confirms — the customer or the team does that.</p>
            <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="col-span-2 text-[10.5px] font-bold" style={sub}>What
                <select value={finder.cardId} onChange={(e) => { const c = [...tray, ...windowCards].find((x) => x.id === e.target.value); setFinder({ ...finder, cardId: e.target.value, who: c?.owner_id || 'any', slots: null }); }} style={{ ...selectStyle, borderRadius: 10, width: '100%', marginTop: 4 }}>
                  {!tray.some((c) => c.id === finder.cardId) && finderCard && <option value={finderCard.id}>{finderCard.visit?.block_name || 'Service'} · {finderCard.contract_number}</option>}
                  {tray.map((c) => <option key={c.id} value={c.id}>{c.visit?.block_name || 'Service'} · {c.contract_number} · {clean(c.buyer_name)}</option>)}
                </select>
              </label>
              <label className="text-[10.5px] font-bold" style={sub}>Who
                <select value={finder.who} onChange={(e) => setFinder({ ...finder, who: e.target.value, slots: null })} style={{ ...selectStyle, borderRadius: 10, width: '100%', marginTop: 4 }}>
                  <option value="any">Any technician</option>{team.map((t) => <option key={t.user_id} value={t.user_id}>{t.name || 'Teammate'}</option>)}
                </select>
              </label>
              <label className="text-[10.5px] font-bold" style={sub}>From<input type="date" value={finder.from} onChange={(e) => e.target.value && setFinder({ ...finder, from: e.target.value, slots: null })} style={{ ...selectStyle, borderRadius: 10, width: '100%', marginTop: 4 }} /></label>
            </div>
            <p className="text-[11px] mt-2" style={sub}>{finderCard ? `${durationOf(finderCard, fallbackMinutes)} min · next 14 days` : 'Nothing to place.'}</p>
            <div className="mt-2 flex items-center gap-2"><Btn primary disabled={!finderCard} onClick={runFinder}>Show free times</Btn><Btn ghost onClick={() => setFinder(null)}>Close</Btn></div>
            {finder.slots && (finder.slots.length === 0 ? <p className="mt-3 text-[11.5px]" style={{ color: amber }}>No free slot in the next 14 days — widen the hours or pick someone else.</p> : (
              <ul className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr' }}>{finder.slots.map((s) => (
                <li key={`${s.day}-${s.start}-${s.personId}`}><button onClick={() => pickSlot(s)} className="w-full text-left px-3 py-2 rounded-xl border text-[12px]" style={{ borderColor: hairline, ...ink }}><span className="font-bold" style={mono}>{fmtDayShort(s.day)} · {fmtClock(s.start)}</span><span className="block text-[10.5px]" style={sub}>{s.personId === meId ? 'you' : s.personName}</span></button></li>
              ))}</ul>
            ))}
          </div>
        </div>
      )}

      {historyFor && (
        <HistoryDrawer contractId={historyFor.contract_id} title={clean(historyFor.buyer_name) || historyFor.contract_number}
          subtitle={historyFor.lane === 'services' ? `${historyFor.contract_number} · Service${historyFor.visit?.sequence ? ` ${historyFor.visit.sequence}${historyFor.visit.of ? `/${historyFor.visit.of}` : ''}` : ''}${historyFor.visit?.block_name ? ` · ${historyFor.visit.block_name}` : ''}` : `${historyFor.contract_number}${historyFor.invoice_number ? ` · ${historyFor.invoice_number}` : ''}${historyFor.due_date ? ` · due ${fmtDate(historyFor.due_date)}` : ''}`}
          onClose={() => setHistoryFor(null)} onOpenContract={() => navigate(`/contracts/${historyFor.contract_id}`)} />
      )}
      {callFor && callFor.job_id && (
        <LogCallSheet card={callFor} busy={busyId === callFor.id} onClose={() => setCallFor(null)}
          onSubmit={(v) => run(callFor.id, async () => { await logCall.mutateAsync({ jobId: callFor.job_id!, calledAt: v.calledAt, outcome: v.outcome, notes: v.notes, promiseDate: v.promiseDate }); setCallFor(null); })} />
      )}
    </div>
  );
};

export default TimeboardPage;
