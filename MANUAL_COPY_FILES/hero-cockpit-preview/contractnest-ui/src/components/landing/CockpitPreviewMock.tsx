// src/components/landing/CockpitPreviewMock.tsx
// Static mockup of OpsCockpit for the landing page hero section
// Light theme interior for contrast against dark hero background
// Shows hospital-themed demo data with Revenue/Expense toggle animation

import React, { useState, useEffect } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const darkColors = VikunaBlackTheme.darkMode.colors;
const lightColors = VikunaBlackTheme.colors;

// ─── Light theme palette for the app interior ────────────────────

const lt = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F4F1',
  border: '#E5E4E0',
  borderLight: '#EEEDE9',
  text: '#1A1D26',
  textSecondary: '#6B7280',
  brand: '#D4911E',
  brandBg: '#FEF7EC',
};

// ─── Demo Data ───────────────────────────────────────────────────

interface ServiceEvent {
  name: string;
  detail: string;
  date: string;
  amount: string;
  status: string;
  statusColor: string;
}

interface BucketData {
  label: string;
  count: number;
  serviceCount: number;
  billingAmount: string;
  color: string;
}

interface VaniAlert {
  icon: string;
  type: string;
  typeColor: string;
  message: string;
  time: string;
}

interface PerspectiveData {
  toggleLabel: string;
  toggleSublabel: string;
  subtitle: string;
  pendingAcceptance: number;
  drafts: number;
  overdueEvents: number;
  buckets: BucketData[];
  serviceEvents: ServiceEvent[];
  serviceEventsTotal: number;
  ctaButtons: { primary: string; secondary: string };
  vaniAlerts: VaniAlert[];
}

const revenueData: PerspectiveData = {
  toggleLabel: 'Revenue',
  toggleSublabel: 'Clients',
  subtitle: 'Revenue operations — what needs your attention today',
  pendingAcceptance: 3,
  drafts: 2,
  overdueEvents: 1,
  buckets: [
    { label: 'OVERDUE', count: 2, serviceCount: 2, billingAmount: '$ 45,000', color: '#EF4444' },
    { label: 'TODAY', count: 1, serviceCount: 1, billingAmount: '$ 12,000', color: '#3B82F6' },
    { label: 'THIS WEEK', count: 3, serviceCount: 3, billingAmount: '$ 78,000', color: '#06B6D4' },
  ],
  serviceEvents: [
    { name: 'Sunrise Medical Center', detail: 'MRI Calibration', date: 'Due: 15 Mar', amount: '₹21,000', status: 'On Track', statusColor: '#10B981' },
    { name: 'Pinnacle Tower', detail: 'HVAC Q1 Service', date: 'Due: 12 Mar', amount: '₹18,500', status: 'Pending', statusColor: '#F59E0B' },
    { name: 'Metro Heights', detail: 'Elevator AMC Q4', date: 'Due: 8 Mar', amount: '₹8,500', status: 'Overdue', statusColor: '#EF4444' },
  ],
  serviceEventsTotal: 6,
  ctaButtons: { primary: '+ New Contract', secondary: '+ Add Client' },
  vaniAlerts: [
    { icon: '🚨', type: 'SLA Breach', typeColor: '#EF4444', message: 'Sunrise Medical — MRI response SLA missed by 4hrs', time: '12 min ago' },
    { icon: '🔔', type: 'Renewal', typeColor: '#F59E0B', message: 'Metro Heights elevator AMC expires in 18 days', time: '1 hr ago' },
    { icon: '💰', type: 'Payment', typeColor: '#3B82F6', message: 'Pinnacle Tower — ₹18,500 invoice overdue by 5 days', time: '2 hrs ago' },
    { icon: '✅', type: 'Compliance', typeColor: '#10B981', message: 'All Q1 fire safety certs verified for 3 sites', time: '3 hrs ago' },
  ],
};

const expenseData: PerspectiveData = {
  toggleLabel: 'Expense',
  toggleSublabel: 'Vendors',
  subtitle: 'Expense operations — procurement & vendor management',
  pendingAcceptance: 2,
  drafts: 4,
  overdueEvents: 3,
  buckets: [
    { label: 'OVERDUE', count: 3, serviceCount: 2, billingAmount: '$ 62,000', color: '#EF4444' },
    { label: 'TODAY', count: 2, serviceCount: 1, billingAmount: '$ 28,000', color: '#3B82F6' },
    { label: 'THIS WEEK', count: 5, serviceCount: 4, billingAmount: '$ 1,15,000', color: '#06B6D4' },
  ],
  serviceEvents: [
    { name: 'NovaDiag Systems', detail: 'CT Scanner AMC', date: 'Due: 14 Mar', amount: '₹35,000', status: 'Pending', statusColor: '#F59E0B' },
    { name: 'ArcticBreeze HVAC', detail: 'AHU Servicing', date: 'Due: 10 Mar', amount: '₹22,000', status: 'Overdue', statusColor: '#EF4444' },
    { name: 'ShieldForce Security', detail: 'Patrol Contract Q1', date: 'Due: 16 Mar', amount: '₹14,500', status: 'On Track', statusColor: '#10B981' },
  ],
  serviceEventsTotal: 8,
  ctaButtons: { primary: '+ Vendor Contract', secondary: '+ Add Vendor' },
  vaniAlerts: [
    { icon: '🚨', type: 'SLA Breach', typeColor: '#EF4444', message: 'ArcticBreeze — AHU maintenance SLA missed by 2 days', time: '8 min ago' },
    { icon: '💰', type: 'Payment', typeColor: '#3B82F6', message: 'NovaDiag — ₹35,000 invoice pending approval since 5 Mar', time: '45 min ago' },
    { icon: '🔔', type: 'Renewal', typeColor: '#F59E0B', message: 'ShieldForce patrol contract up for renewal in 22 days', time: '1 hr ago' },
    { icon: '📋', type: 'Recommendation', typeColor: '#8B5CF6', message: 'Bundle AHU + Chiller AMC for 12% cost savings', time: '3 hrs ago' },
  ],
};

// ─── Sidebar Icons (dark sidebar) ────────────────────────────────

const SidebarIcon: React.FC<{ children: React.ReactNode; active?: boolean }> = ({
  children,
  active,
}) => (
  <div
    style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      color: active ? darkColors.brand.primary : darkColors.utility.secondaryText,
      background: active ? darkColors.brand.primary + '18' : 'transparent',
      cursor: 'default',
    }}
  >
    {children}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────

const CockpitPreviewMock: React.FC = () => {
  const [perspective, setPerspective] = useState<'revenue' | 'expense'>('revenue');
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseFlip, setPulseFlip] = useState(true);

  const data = perspective === 'revenue' ? revenueData : expenseData;

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseFlip((p) => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = (p: 'revenue' | 'expense') => {
    if (p === perspective) return;
    setIsAnimating(true);
    setTimeout(() => {
      setPerspective(p);
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {/* ═══ "LIVE" badge ═══ */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#1A1D26',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: darkColors.utility.secondaryText,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10B981',
              animation: 'cockpitMockPulse 2s ease infinite',
            }}
          />
          Live Operations Cockpit — Demo Data
        </div>
      </div>

      {/* ═══ Browser Frame ═══ */}
      <div
        style={{
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          background: lt.bg,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Browser chrome bar — stays dark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: '#2A2D35',
            borderBottom: '1px solid #3A3D45',
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 8,
              padding: '5px 14px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.68rem',
              color: '#9CA3AF',
              letterSpacing: '0.01em',
            }}
          >
            app.contractnest.com/cockpit
          </div>
        </div>

        {/* App content area */}
        <div style={{ display: 'flex', minHeight: 460 }}>
          {/* Left sidebar — stays dark */}
          <div
            style={{
              width: 46,
              background: '#1E2028',
              borderRight: '1px solid #2E3038',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: lt.brand,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.55rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              CN
            </div>
            <SidebarIcon active>⚡</SidebarIcon>
            <SidebarIcon>▦</SidebarIcon>
            <SidebarIcon>📋</SidebarIcon>
            <SidebarIcon>📄</SidebarIcon>
            <div style={{ flex: 1 }} />
            <SidebarIcon>✦</SidebarIcon>
            <SidebarIcon>⚙</SidebarIcon>
          </div>

          {/* Main content — LIGHT THEME */}
          <div style={{ flex: 1, padding: '0', overflow: 'hidden', minWidth: 0, background: lt.bg }}>

            {/* ═══ Top Navbar — Revenue/Expense toggle ═══ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                borderBottom: `1px solid ${lt.border}`,
                background: lt.surface,
              }}
            >
              {/* Left: perspective toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 8,
                  padding: 2,
                  background: lt.surfaceAlt,
                  gap: 2,
                  border: `1px solid ${lt.borderLight}`,
                }}
              >
                {(['revenue', 'expense'] as const).map((p) => {
                  const isActive = perspective === p;
                  const label = p === 'revenue' ? 'Revenue · Clients' : 'Expense · Vendors';
                  return (
                    <button
                      key={p}
                      onClick={() => handleToggle(p)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        color: isActive ? '#fff' : lt.textSecondary,
                        background: isActive ? lt.brand : 'transparent',
                        boxShadow: isActive ? `0 2px 8px ${lt.brand}40` : 'none',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Right: Live badge + notifications */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 9px',
                    borderRadius: 999,
                    border: '1px solid #10B98130',
                    background: '#10B98108',
                    fontSize: '0.55rem',
                    color: '#059669',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'cockpitMockPulse 2s ease infinite' }} />
                  Live
                </span>
                <span style={{ fontSize: '0.55rem', color: lt.textSecondary }}>🔔 2</span>
              </div>
            </div>

            {/* ═══ Page content area ═══ */}
            <div style={{ padding: '14px 16px' }}>
              {/* Page header + CTA buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  gap: 8,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: lt.text, margin: 0, lineHeight: 1.2 }}>
                    Operations Cockpit
                  </h3>
                  <p
                    style={{
                      fontSize: '0.58rem',
                      color: lt.textSecondary,
                      margin: '2px 0 0',
                      transition: 'opacity 0.2s',
                      opacity: isAnimating ? 0 : 1,
                    }}
                  >
                    {data.subtitle}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'opacity 0.2s',
                    opacity: isAnimating ? 0 : 1,
                  }}
                >
                  <button
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: `1px solid ${lt.brand}30`,
                      fontSize: '0.54rem',
                      fontWeight: 600,
                      background: lt.brandBg,
                      color: lt.brand,
                      cursor: 'default',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {data.ctaButtons.primary}
                  </button>
                  <button
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: 'none',
                      fontSize: '0.54rem',
                      fontWeight: 600,
                      background: lt.brand,
                      color: '#fff',
                      cursor: 'default',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {data.ctaButtons.secondary}
                  </button>
                </div>
              </div>

              {/* Animated content wrapper */}
              <div
                style={{
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  opacity: isAnimating ? 0 : 1,
                  transform: isAnimating ? 'translateY(6px)' : 'translateY(0)',
                }}
              >
                {/* Stat cards row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Pending Acceptance', value: data.pendingAcceptance, color: '#F59E0B', icon: '✉' },
                    { label: 'Drafts', value: data.drafts, color: '#6B7280', icon: '📝' },
                    { label: 'Overdue Events', value: data.overdueEvents, color: data.overdueEvents > 0 ? '#EF4444' : '#6B7280', icon: '⚠' },
                  ].map((card) => (
                    <div
                      key={card.label}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1px solid ${lt.border}`,
                        background: lt.surface,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.54rem', color: lt.textSecondary, marginBottom: 2 }}>{card.label}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: card.color }}>{card.value}</div>
                      </div>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: card.color + '12',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                        }}
                      >
                        {card.icon}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main grid: Event Schedule + Service Events + VaNi */}
                <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.8fr 1.1fr', gap: 8 }}>
                  {/* Event Schedule */}
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: `1px solid ${lt.border}`,
                      background: lt.surface,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.6rem' }}>🕐</span>
                      <span
                        style={{
                          fontSize: '0.56rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: lt.textSecondary,
                        }}
                      >
                        Event Schedule
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.5rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: lt.surfaceAlt,
                          color: lt.textSecondary,
                          border: `1px solid ${lt.borderLight}`,
                        }}
                      >
                        0{data.buckets.reduce((s, b) => s + b.count, 0)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {data.buckets.map((bucket) => (
                        <div
                          key={bucket.label}
                          style={{
                            padding: '8px 9px',
                            borderRadius: 8,
                            border: `1px solid ${lt.borderLight}`,
                            background: lt.surfaceAlt,
                            borderLeft: bucket.label === 'OVERDUE' ? `2.5px solid ${bucket.color}` : undefined,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.52rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: bucket.color,
                              marginBottom: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: bucket.color,
                              }}
                            />
                            {bucket.label}
                          </div>
                          <div style={{ fontSize: '0.52rem', color: lt.textSecondary, display: 'flex', gap: 6 }}>
                            <span>🔧 {bucket.serviceCount}</span>
                            <span>· {bucket.billingAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service Events */}
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: `1px solid ${lt.border}`,
                      background: lt.surface,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.6rem' }}>📅</span>
                      <span
                        style={{
                          fontSize: '0.56rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: lt.textSecondary,
                        }}
                      >
                        Service Events
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.5rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: lt.brandBg,
                          color: lt.brand,
                          border: `1px solid ${lt.brand}20`,
                        }}
                      >
                        0{data.serviceEventsTotal}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {data.serviceEvents.map((event, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: `1px solid ${lt.borderLight}`,
                            background: lt.surfaceAlt,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 3,
                            }}
                          >
                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: lt.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
                              {event.name} —{' '}
                              <span style={{ fontWeight: 400, color: lt.textSecondary }}>{event.detail}</span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.48rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: event.statusColor + '12',
                                color: event.statusColor,
                                border: `1px solid ${event.statusColor}25`,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {event.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.5rem', color: lt.textSecondary }}>
                            {event.date} · <span style={{ color: lt.brand, fontWeight: 600 }}>{event.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VaNi sidebar — with live dummy alerts */}
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: `1px solid ${lt.border}`,
                      background: lt.surface,
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: '#8B5CF610',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.55rem',
                        }}
                      >
                        ✦
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: lt.text }}>VaNi</div>
                        <div style={{ fontSize: '0.46rem', color: lt.textSecondary }}>AI Operations Assistant</div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.44rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#8B5CF610',
                          color: '#8B5CF6',
                          border: '1px solid #8B5CF620',
                        }}
                      >
                        {data.vaniAlerts.length} alerts
                      </span>
                    </div>

                    {/* Alert feed */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      {data.vaniAlerts.map((alert, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 7,
                            background: lt.surfaceAlt,
                            border: `1px solid ${lt.borderLight}`,
                            borderLeft: `2px solid ${alert.typeColor}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <span style={{ fontSize: '0.48rem' }}>{alert.icon}</span>
                            <span style={{ fontSize: '0.46rem', fontWeight: 700, color: alert.typeColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {alert.type}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.42rem', color: lt.textSecondary }}>{alert.time}</span>
                          </div>
                          <div style={{ fontSize: '0.48rem', color: lt.text, lineHeight: 1.35, opacity: 0.8 }}>
                            {alert.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar — dark to frame the light content */}
        <div
          style={{
            display: 'flex',
            borderTop: `1px solid ${lt.border}`,
            background: lt.surface,
          }}
        >
          <button
            onClick={() => handleToggle(perspective === 'revenue' ? 'expense' : 'revenue')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              border: 'none',
              borderRight: `1px solid ${lt.border}`,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = lt.surfaceAlt)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{
                fontSize: '0.85rem',
                transition: 'transform 0.4s ease',
                transform: pulseFlip ? 'rotate(0deg)' : 'rotate(180deg)',
                display: 'inline-block',
                color: lt.brand,
              }}
            >
              ⇄
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: lt.text }}>
                Revenue ↔ Expense
              </div>
              <div style={{ fontSize: '0.5rem', color: lt.textSecondary }}>Flip between both sides</div>
            </div>
          </button>

          <button
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'default',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#8B5CF6' }}>✦</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: lt.text }}>
                VaNi — AI Ops Assistant
              </div>
              <div style={{ fontSize: '0.5rem', color: lt.textSecondary }}>4 active alerts</div>
            </div>
          </button>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes cockpitMockPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default CockpitPreviewMock;
