// src/components/landing/CockpitPreviewMock.tsx
// Static mockup of OpsCockpit for the landing page hero section
// Shows hospital-themed demo data with Revenue/Expense toggle animation

import React, { useState, useEffect } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const colors = VikunaBlackTheme.darkMode.colors;

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
    { name: 'Apollo Hospital', detail: 'MRI Calibration', date: 'Due: 15 Mar', amount: '₹21,000', status: 'On Track', statusColor: '#10B981' },
    { name: 'Prestige Tech Park', detail: 'HVAC Q1', date: 'Due: 12 Mar', amount: '₹18,500', status: 'Pending', statusColor: '#F59E0B' },
    { name: 'Indiabulls Centre', detail: 'Elevator Q4', date: 'Due: 8 Mar', amount: '₹8,500', status: 'Overdue', statusColor: '#EF4444' },
  ],
  serviceEventsTotal: 6,
  ctaButtons: { primary: '+ New Contract', secondary: '+ Add Client' },
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
    { name: 'MedTech Solutions', detail: 'CT Scanner AMC', date: 'Due: 14 Mar', amount: '₹35,000', status: 'Pending', statusColor: '#F59E0B' },
    { name: 'CoolAir Systems', detail: 'AHU Servicing', date: 'Due: 10 Mar', amount: '₹22,000', status: 'Overdue', statusColor: '#EF4444' },
    { name: 'SecureGuard Inc.', detail: 'Security Patrol Q1', date: 'Due: 16 Mar', amount: '₹14,500', status: 'On Track', statusColor: '#10B981' },
  ],
  serviceEventsTotal: 8,
  ctaButtons: { primary: '+ Vendor Contract', secondary: '+ Add Vendor' },
};

// ─── VaNi Capabilities (shown in sidebar) ────────────────────────

const vaniCapabilities = [
  { icon: '⚡', label: 'SLA Breach Alerts' },
  { icon: '🔔', label: 'Renewal Reminders' },
  { icon: '💳', label: 'Payment Nudges' },
  { icon: '🛡️', label: 'Compliance Flags' },
];

// ─── Sidebar Icons ───────────────────────────────────────────────

const SidebarIcon: React.FC<{ children: React.ReactNode; color?: string; active?: boolean }> = ({
  children,
  color = colors.utility.secondaryText,
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
      color: active ? colors.brand.primary : color,
      background: active ? colors.brand.primary + '18' : 'transparent',
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

  // Pulse animation for the flip button to attract attention
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

  const cardBg = '#1A1D26';
  const cardBorder = 'rgba(255,255,255,0.08)';
  const mutedText = colors.utility.secondaryText;
  const primaryText = colors.utility.primaryText;

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
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: mutedText,
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
          border: `1px solid ${cardBorder}`,
          overflow: 'hidden',
          background: '#0F1117',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Browser chrome bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: '#16181F',
            borderBottom: `1px solid ${cardBorder}`,
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
              background: 'rgba(255,255,255,0.06)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.68rem',
              color: mutedText,
              letterSpacing: '0.01em',
            }}
          >
            app.contractnest.com/cockpit
          </div>
        </div>

        {/* App content area */}
        <div style={{ display: 'flex', minHeight: 420 }}>
          {/* Left sidebar */}
          <div
            style={{
              width: 46,
              background: '#13151B',
              borderRight: `1px solid ${cardBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: colors.brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.55rem',
                fontWeight: 800,
                color: '#0D0F14',
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

          {/* Main content */}
          <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden' }}>
            {/* Top bar: user info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  🏥
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: primaryText }}>
                    vikuna <span style={{ color: colors.brand.primary, fontSize: '0.6rem' }}>★</span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: mutedText }}>vi4203</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.58rem', color: mutedText }}>System Admin</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #10B98140',
                    fontSize: '0.55rem',
                    color: '#10B981',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                  Live
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.55rem',
                    color: mutedText,
                  }}
                >
                  🔔 2
                </span>
              </div>
            </div>

            {/* Page header + perspective switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: primaryText, margin: 0, lineHeight: 1.2 }}>
                  Operations Cockpit
                </h3>
                <p
                  style={{
                    fontSize: '0.58rem',
                    color: mutedText,
                    margin: '2px 0 0',
                    transition: 'opacity 0.2s',
                    opacity: isAnimating ? 0 : 1,
                  }}
                >
                  {data.subtitle}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Perspective toggle */}
                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: 8,
                    padding: 2,
                    background: 'rgba(255,255,255,0.06)',
                    gap: 2,
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
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: '0.58rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          color: isActive ? '#fff' : mutedText,
                          background: isActive ? colors.brand.primary : 'transparent',
                          boxShadow: isActive ? `0 2px 8px ${colors.brand.primary}40` : 'none',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* CTA buttons */}
                <button
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: '0.54rem',
                    fontWeight: 600,
                    background: colors.brand.primary + '1A',
                    color: colors.brand.primary,
                    cursor: 'default',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'opacity 0.2s',
                    opacity: isAnimating ? 0 : 1,
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
                    background: colors.brand.primary,
                    color: '#0D0F14',
                    cursor: 'default',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'opacity 0.2s',
                    opacity: isAnimating ? 0 : 1,
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
                      border: `1px solid ${cardBorder}`,
                      background: cardBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.54rem', color: mutedText, marginBottom: 2 }}>{card.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: card.color }}>{card.value}</div>
                    </div>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: card.color + '15',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 8 }}>
                {/* Event Schedule */}
                <div
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
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
                        color: mutedText,
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
                        background: 'rgba(255,255,255,0.06)',
                        color: mutedText,
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
                          border: `1px solid ${cardBorder}`,
                          background: '#0F1117',
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
                        <div style={{ fontSize: '0.52rem', color: mutedText, display: 'flex', gap: 6 }}>
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
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
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
                        color: mutedText,
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
                        background: colors.brand.primary + '15',
                        color: colors.brand.primary,
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
                          border: `1px solid ${cardBorder}`,
                          background: '#0F1117',
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
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: primaryText }}>
                            {event.name} —{' '}
                            <span style={{ fontWeight: 400, color: mutedText }}>{event.detail}</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.48rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: event.statusColor + '18',
                              color: event.statusColor,
                              border: `1px solid ${event.statusColor}30`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {event.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.5rem', color: mutedText }}>
                          {event.date} · <span style={{ color: colors.brand.primary }}>{event.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VaNi sidebar */}
                <div
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: '#8B5CF620',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.55rem',
                      }}
                    >
                      ✦
                    </div>
                    <div>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: primaryText }}>VaNi</div>
                      <div style={{ fontSize: '0.46rem', color: mutedText }}>AI Operations Assistant</div>
                    </div>
                  </div>

                  {/* Coming soon placeholder */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '14px 6px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        background: '#8B5CF615',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 6px',
                        fontSize: '0.8rem',
                      }}
                    >
                      ✦
                    </div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: primaryText }}>Coming Soon</div>
                    <div style={{ fontSize: '0.46rem', color: mutedText, marginTop: 2, lineHeight: 1.4 }}>
                      VaNi will proactively surface alerts and recommendations here
                    </div>
                  </div>

                  {/* Capability list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {vaniCapabilities.map((cap) => (
                      <div
                        key={cap.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 7px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <span style={{ fontSize: '0.52rem', opacity: 0.7 }}>{cap.icon}</span>
                        <span style={{ fontSize: '0.52rem', fontWeight: 500, color: primaryText }}>
                          {cap.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          style={{
            display: 'flex',
            borderTop: `1px solid ${cardBorder}`,
            background: '#13151B',
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
              borderRight: `1px solid ${cardBorder}`,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{
                fontSize: '0.85rem',
                transition: 'transform 0.4s ease',
                transform: pulseFlip ? 'rotate(0deg)' : 'rotate(180deg)',
                display: 'inline-block',
                color: colors.brand.primary,
              }}
            >
              ⇄
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: primaryText }}>
                Revenue ↔ Expense
              </div>
              <div style={{ fontSize: '0.5rem', color: mutedText }}>Flip between both sides</div>
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
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: primaryText }}>
                VaNi — Coming Soon
              </div>
              <div style={{ fontSize: '0.5rem', color: mutedText }}>AI ops assistant</div>
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
