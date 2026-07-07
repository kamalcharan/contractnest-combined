// ============================================================================
// VaNi → Briefing — vani-trial-and-briefing batch
// The virtual employee's standup: what ran automatically (real scanner/JTD
// actions only — honesty rule), what needs the owner's decision, deep-linked
// into the Operations pages where the work lives. No LLM, no mock data.
// Gated by /api/vani/entitlement (trial via the landing page CTA).
// ============================================================================

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BellRing,
  FileText,
  CalendarClock,
  Wrench,
  RefreshCw,
  AlertTriangle,
  Inbox,
  ArrowRight,
  Lock,
  MessageSquare,
  IndianRupee,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useVaniEntitlement,
  useVaniBriefing,
  type VaniFeedEntry,
} from '@/hooks/queries/useVaniDeskQueries';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

const formatMoney = (value: number | undefined | null): string => {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
};

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const FEED_ICONS: Record<VaniFeedEntry['kind'], React.ReactNode> = {
  reminder: <BellRing size={15} />,
  invoice_drafted: <FileText size={15} />,
  appointment_requested: <CalendarClock size={15} />,
};

const BriefingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const entitlementQuery = useVaniEntitlement();
  const entitled = entitlementQuery.data?.entitled === true;

  const briefingQuery = useVaniBriefing({ enabled: entitled });
  const briefing = briefingQuery.data;

  const needsGroups = useMemo(() => {
    if (!briefing) return [];
    const n = briefing.needs_you;
    return [
      {
        key: 'draft_invoices',
        title: 'Draft invoices to approve',
        icon: <FileText size={16} />,
        count: n.draft_invoices?.count ?? 0,
        action: { label: 'Open Finance', path: '/ops/finance' },
        rows: (n.draft_invoices?.items ?? []).map((i) => ({
          id: i.id,
          primary: i.invoice_number || 'Draft invoice',
          secondary: `Due ${formatDate(i.due_date)}`,
          value: formatMoney(i.total_amount),
        })),
      },
      {
        key: 'overdue_invoices',
        title: 'Overdue receivables',
        icon: <IndianRupee size={16} />,
        count: n.overdue_invoices?.count ?? 0,
        action: { label: 'Open Finance', path: '/ops/finance' },
        rows: (n.overdue_invoices?.items ?? []).map((i) => ({
          id: i.id,
          primary: i.invoice_number || 'Invoice',
          secondary: `${i.days_overdue ?? 0} days overdue`,
          value: formatMoney(i.balance),
        })),
      },
      {
        key: 'appointments_requested',
        title: 'Appointments awaiting confirmation',
        icon: <CalendarClock size={16} />,
        count: n.appointments_requested?.count ?? 0,
        action: { label: 'Open Appointments', path: '/ops/appointments' },
        rows: (n.appointments_requested?.items ?? []).map((a) => ({
          id: a.id,
          primary: a.block_name || a.assigned_to_name || 'Service visit',
          secondary: `Requested ${formatDate(a.created_at)}`,
          value: a.scheduled_at
            ? formatDateTime(a.scheduled_at)
            : a.event_date
              ? `due ${formatDate(a.event_date)}`
              : 'no slot yet',
        })),
      },
      {
        key: 'unticketed_service_events',
        title: 'Due services without a ticket',
        icon: <Wrench size={16} />,
        count: n.unticketed_service_events?.count ?? 0,
        action: { label: 'Open Service Schedule', path: '/ops/services' },
        rows: (n.unticketed_service_events?.items ?? []).map((e) => ({
          id: e.id,
          primary: e.block_name || 'Service event',
          secondary: e.status === 'overdue' ? 'Overdue' : 'Due',
          value: formatDate(e.scheduled_date),
        })),
      },
    ];
  }, [briefing]);

  const totalNeeds = needsGroups.reduce((sum, g) => sum + g.count, 0);

  // ── Entitlement loading ──────────────────────────────────────────────────
  if (entitlementQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Locked (no trial / expired) ──────────────────────────────────────────
  if (!entitled) {
    return (
      <div style={{ maxWidth: 560, margin: '64px auto', padding: '0 16px' }}>
        <Card>
          <CardContent style={{ padding: 32, textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: `${colors.brand.primary}15`,
                color: colors.brand.primary,
              }}
            >
              <Lock size={22} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.utility.primaryText, marginBottom: 8 }}>
              The Briefing is part of VaNi
            </h2>
            <p style={{ fontSize: 14, color: colors.utility.secondaryText, lineHeight: 1.6, marginBottom: 20 }}>
              {entitlementQuery.data?.has_subscription
                ? 'Your VaNi trial has ended. Subscribe to keep your virtual employee reporting for work.'
                : 'Start the free 1-week trial to see what VaNi handles for you every day.'}
            </p>
            <button
              onClick={() => navigate('/vani/landing')}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                color: '#fff',
                backgroundColor: colors.brand.primary,
              }}
            >
              {entitlementQuery.data?.has_subscription ? 'See VaNi plans' : 'Start your 1-week trial'}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Briefing loading / error ─────────────────────────────────────────────
  if (briefingQuery.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 12 }}>
        <LoadingSpinner size="lg" />
        <span style={{ fontSize: 13, color: colors.utility.secondaryText }}>Preparing your briefing…</span>
      </div>
    );
  }

  if (briefingQuery.isError || !briefing) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center' }}>
        <AlertTriangle size={28} style={{ color: colors.semantic.error, marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: colors.utility.secondaryText, marginBottom: 16 }}>
          The briefing could not be loaded.
        </p>
        <button
          onClick={() => briefingQuery.refetch()}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: `1px solid ${colors.utility.secondaryText}40`,
            background: 'transparent',
            color: colors.utility.primaryText,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const header = briefing.header;
  const trialEnds = entitlementQuery.data?.trial_active ? entitlementQuery.data?.trial_ends : null;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Standup banner ── */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: `${colors.brand.primary}15`,
              color: colors.brand.primary,
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: colors.utility.primaryText, marginBottom: 4 }}>
              {greeting()} — here's your briefing
            </h1>
            <p style={{ fontSize: 13.5, color: colors.utility.secondaryText, lineHeight: 1.5 }}>
              In the last 7 days VaNi sent <b>{header.reminders_7d}</b> reminder
              {header.reminders_7d === 1 ? '' : 's'}
              {header.invoices_drafted_7d > 0 && (
                <> and drafted <b>{header.invoices_drafted_7d}</b> invoice{header.invoices_drafted_7d === 1 ? '' : 's'}</>
              )}
              {header.appointments_requested_7d > 0 && (
                <>, raising <b>{header.appointments_requested_7d}</b> appointment request
                  {header.appointments_requested_7d === 1 ? '' : 's'}</>
              )}
              . <b>{totalNeeds}</b> thing{totalNeeds === 1 ? '' : 's'} need{totalNeeds === 1 ? 's' : ''} your eye.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {trialEnds && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  backgroundColor: `${colors.semantic.warning}18`,
                  color: colors.semantic.warning,
                }}
              >
                Trial ends {formatDate(trialEnds)}
              </span>
            )}
            <button
              onClick={() => navigate('/settings/automation-rules')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.utility.secondaryText}30`,
                background: 'transparent',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Tune rules →
            </button>
            <button
              onClick={() => briefingQuery.refetch()}
              disabled={briefingQuery.isFetching}
              title="Refresh"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: `1px solid ${colors.utility.secondaryText}30`,
                background: 'transparent',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <RefreshCw size={15} className={briefingQuery.isFetching ? 'animate-spin' : undefined} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI strip ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Reminders · 24h', value: header.reminders_24h, icon: <BellRing size={15} /> },
          { label: 'Reminders · 7 days', value: header.reminders_7d, icon: <MessageSquare size={15} /> },
          { label: 'Invoices drafted · 7 days', value: header.invoices_drafted_7d, icon: <FileText size={15} /> },
          { label: 'Appointments requested · 7 days', value: header.appointments_requested_7d, icon: <CalendarClock size={15} /> },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.utility.secondaryText, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {kpi.icon} {kpi.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 750, color: colors.utility.primaryText, marginTop: 6 }}>
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Two columns: Needs you · What VaNi did ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Needs you */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.utility.primaryText }}>Needs you</h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                minWidth: 22,
                textAlign: 'center',
                padding: '2px 7px',
                borderRadius: 12,
                backgroundColor: totalNeeds > 0 ? `${colors.semantic.warning}20` : `${colors.semantic.success}18`,
                color: totalNeeds > 0 ? colors.semantic.warning : colors.semantic.success,
              }}
            >
              {totalNeeds}
            </span>
          </div>

          {totalNeeds === 0 ? (
            <Card>
              <CardContent style={{ padding: 28, textAlign: 'center' }}>
                <Inbox size={22} style={{ color: colors.semantic.success, marginBottom: 8 }} />
                <p style={{ fontSize: 13.5, color: colors.utility.secondaryText }}>
                  Nothing needs your decision right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            needsGroups
              .filter((g) => g.count > 0)
              .map((group) => (
                <Card key={group.key} style={{ marginBottom: 12 }}>
                  <CardContent style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ color: colors.brand.primary }}>{group.icon}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.utility.primaryText, flex: 1 }}>
                        {group.title}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          backgroundColor: `${colors.semantic.warning}18`,
                          color: colors.semantic.warning,
                        }}
                      >
                        {group.count}
                      </span>
                    </div>

                    {group.rows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '7px 0',
                          borderTop: `1px solid ${colors.utility.secondaryText}15`,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: colors.utility.primaryText, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.primary}
                          </div>
                          <div style={{ color: colors.utility.secondaryText, fontSize: 12 }}>{row.secondary}</div>
                        </div>
                        <div style={{ color: colors.utility.primaryText, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {row.value}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => navigate(group.action.path)}
                      style={{
                        marginTop: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 650,
                        color: '#fff',
                        backgroundColor: colors.brand.primary,
                      }}
                    >
                      {group.action.label} <ArrowRight size={13} />
                    </button>
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* What VaNi did */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.utility.primaryText }}>What VaNi did</h2>
            <span style={{ fontSize: 12, color: colors.utility.secondaryText }}>
              last 7 days · real actions only
            </span>
          </div>

          <Card>
            <CardContent style={{ padding: 16 }}>
              {briefing.feed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Inbox size={20} style={{ color: colors.utility.secondaryText, marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: colors.utility.secondaryText }}>
                    No automatic actions in the last 7 days.
                  </p>
                </div>
              ) : (
                briefing.feed.map((entry, idx) => (
                  <div
                    key={`${entry.kind}-${entry.id || entry.ref || idx}`}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '9px 0',
                      borderTop: idx === 0 ? 'none' : `1px solid ${colors.utility.secondaryText}15`,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: `${colors.brand.primary}12`,
                        color: colors.brand.primary,
                      }}
                    >
                      {FEED_ICONS[entry.kind] ?? <Sparkles size={15} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 650, color: colors.utility.primaryText }}>
                        {entry.title}
                      </div>
                      <div style={{ fontSize: 12, color: colors.utility.secondaryText, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {entry.detail && <span>{entry.detail}</span>}
                        {entry.channel && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: 10,
                              backgroundColor: `${colors.brand.primary}12`,
                              color: colors.brand.primary,
                              textTransform: 'uppercase',
                            }}
                          >
                            {entry.channel}
                          </span>
                        )}
                        {entry.status && (
                          <span style={{ fontSize: 11, color: colors.utility.secondaryText }}>{entry.status}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.at)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BriefingPage;
