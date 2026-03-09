// src/components/landing/TheProblemV3.tsx - Problem section from contractnest-v3 reference
import React, { useState } from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

interface TheProblemV3Props {
  onCtaClick?: () => void;
  className?: string;
}

const colors = VikunaBlackTheme.darkMode.colors;

// Colors from reference
const red = '#E74C3C';
const green = '#2ECC71';
const amber = colors.brand.primary;

const chaosItems = [
  { icon: '📱', title: 'WhatsApp is your contract system', desc: 'Agreements buried in chat threads. No signatures. No proof. "I never agreed to that."', tag: 'No record' },
  { icon: '📊', title: 'Excel tracks your SLAs', desc: "Manual updates. Always outdated. Vendor says they came — you have no way to verify.", tag: 'No proof' },
  { icon: '🕐', title: 'You find out about missed visits late', desc: "By the time you know the PM was skipped, it's already a compliance issue or a breakdown.", tag: 'Too late' },
  { icon: '💸', title: 'Invoices land before the work does', desc: 'No evidence, no milestone link. You pay anyway or get into a dispute nobody wins.', tag: 'Pay blind' },
  { icon: '📂', title: 'Compliance report takes 2 days', desc: "Chase 8 vendors on WhatsApp. Compile PDFs. Pray nothing's missing before the audit.", tag: 'Manual hell' },
];

const nestItems = [
  { icon: '✍️', title: 'Digital contracts with e-signature', desc: 'Both parties sign. Terms locked. Every clause visible to every stakeholder, always.', tag: 'Signed' },
  { icon: '📍', title: 'SLA clock starts automatically', desc: 'Every scheduled visit, every response window — tracked in real time. Alerts before breach.', tag: 'Live tracking' },
  { icon: '📸', title: 'Vendors log their own work', desc: 'Photos, reports, certs — uploaded at site. You see proof before approving anything.', tag: 'Evidence' },
  { icon: '⚡', title: 'Invoice generated on completion', desc: 'Work done → evidence uploaded → invoice auto-raised. No disputes, no delays, no chasing.', tag: 'Auto' },
  { icon: '📋', title: 'Compliance report in one click', desc: 'Every visit, every cert, every SLA result — compiled and ready. Audit-ready always.', tag: 'Instant' },
];

type ScenarioKey = 'elevator' | 'facility' | 'hospital' | 'it' | 'wellness';

const scenarioTabs: { key: ScenarioKey; label: string }[] = [
  { key: 'elevator', label: 'Elevator AMC' },
  { key: 'facility', label: 'Facility Mgmt' },
  { key: 'hospital', label: 'Hospital CMC' },
  { key: 'it', label: 'IT Support' },
  { key: 'wellness', label: 'Wellness' },
];

const scenarios: Record<ScenarioKey, { before: string; after: string }> = {
  elevator: {
    before: 'You have <strong>12 elevators</strong> across 3 buildings. The AMC vendor says they did the quarterly service — but did they? Your facility manager has a WhatsApp message that says "done ✓". That\'s it. No report. No photos. Last month\'s invoice was ₹45,000. You paid it. You don\'t actually know if all 12 were serviced.',
    after: 'Each elevator has its own maintenance schedule. The vendor\'s technician checks in at the site, uploads the service report and photos per unit. You get a notification: <strong>"Elevator #7 — Q2 service complete. Evidence attached."</strong> Invoice raised automatically. You approve after reviewing evidence. Done.',
  },
  facility: {
    before: 'You manage a <strong>tech park with 8 vendors</strong> — HVAC, housekeeping, security, pest control, landscaping, and more. Monthly report for your client takes <strong>2 full days</strong> of chasing vendors on WhatsApp, compiling PDFs, and hoping nothing\'s missing. Your client asks why the garden wasn\'t trimmed last Tuesday. You have no answer.',
    after: 'All 8 vendors have their own portal. They log every visit, upload every completion photo. Your dashboard shows <strong>HVAC: 3/4 visits done · Landscaping: MISSED Tuesday</strong>. Alert already sent to vendor. Monthly report? Auto-generated. One PDF. Client gets it automatically.',
  },
  hospital: {
    before: 'Apollo Hospital has <strong>₹7.6 crore in annual CMC contracts</strong> across 40+ devices. An MRI breaks down at 2 AM. You call the AMC vendor. They say they\'ll be there in 4 hours — the SLA. But did they meet it? Nobody\'s tracking. The biomedical team keeps a spreadsheet. It\'s 3 months out of date.',
    after: 'Breakdown logged → <strong>SLA clock starts automatically</strong>. Nearest certified technician gets auto-dispatch. They arrive, fix it, upload service report. SLA tracked: <strong>3 hrs 22 mins — within window</strong>. CFO opens dashboard: "99.2% uptime this quarter. 0 SLA breaches." Renewal? Automatic.',
  },
  it: {
    before: 'Your IT support contract says <strong>4-hour response, 8-hour resolution</strong>. A server goes down on Friday evening. You email support. They reply Saturday morning — 14 hours later. You have no written record of the SLA breach. When renewal comes, they quote the same price. You have no leverage. You pay it.',
    after: 'Every ticket logs against your contract\'s SLA terms automatically. Friday server down — <strong>SLA breach flagged at hour 5</strong>. Penalty clause triggered: 5% discount on next invoice. Vendor gets notified. You have a paper trail. At renewal, you walk in with <strong>3 SLA breach reports and full evidence.</strong>',
  },
  wellness: {
    before: 'You run a PCOD wellness program — <strong>3 months, ₹12,000 per client</strong>. 4 yoga sessions, 2 gynaec consults, 1 nutrition plan. You manage 30 clients. Scheduling is WhatsApp. Tracking is a notepad. Two clients say they didn\'t get their nutrition session. You\'re not sure if that\'s true. Renewals are a guessing game.',
    after: 'Every client has a live contract: <strong>4 yoga · 2 gynec · 1 nutrition</strong>. Each session logged when delivered. Client sees their own progress portal. You see every client\'s completion status at a glance. Renewal reminder sent automatically at week 10. <strong>Zero disputes. Zero memory required.</strong>',
  },
};

const TheProblemV3: React.FC<TheProblemV3Props> = ({ onCtaClick, className = '' }) => {
  const [activeTab, setActiveTab] = useState<ScenarioKey>('elevator');

  const bg = colors.utility.primaryBackground;
  const surface = colors.utility.secondaryBackground;
  const text = colors.utility.primaryText;
  const muted = colors.utility.secondaryText;
  const border = 'rgba(255,255,255,0.07)';
  const border2 = 'rgba(255,255,255,0.12)';
  const mono = "'DM Mono', monospace";
  const bebas = "'Bebas Neue', sans-serif";

  return (
    <section
      id="problem"
      className={className}
      style={{
        background: bg,
        position: 'relative',
        zIndex: 2,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 56px',
      }}
    >
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{ width: 32, height: 1, background: red }} />
        <span
          style={{
            fontFamily: mono,
            fontSize: '0.7rem',
            letterSpacing: '0.16em',
            color: red,
            textTransform: 'uppercase',
          }}
        >
          The Problem
        </span>
      </div>

      {/* Headline */}
      <h2
        style={{
          fontFamily: bebas,
          fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
          lineHeight: 0.95,
          letterSpacing: '0.02em',
          maxWidth: 700,
          marginBottom: 16,
          color: text,
        }}
      >
        YOUR BUSINESS RUNS ON COMMITMENTS.
        <br />
        <span style={{ opacity: 0.28 }}>RIGHT NOW, NONE OF THEM ARE TRACKABLE.</span>
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '1rem',
          color: muted,
          maxWidth: 520,
          lineHeight: 1.65,
          marginBottom: 56,
          fontWeight: 300,
        }}
      >
        You're managing AMCs, vendor visits, SLAs, invoices, and compliance — across WhatsApp,
        Excel sheets, email threads, and memory. Something always falls through.
      </p>

      {/* CHAOS vs CONTRACTNEST split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr',
          gap: 0,
          alignItems: 'start',
        }}
      >
        {/* LEFT: CHAOS */}
        <div
          style={{
            background: `${red}0A`,
            border: `1px solid ${red}26`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${red}26`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: `${red}0F`,
            }}
          >
            <span
              style={{
                fontFamily: mono,
                fontSize: '0.65rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: red,
              }}
            >
              Without ContractNest
            </span>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: red,
                opacity: 0.7,
                marginLeft: 'auto',
              }}
            />
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chaosItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: `${red}0D`,
                  border: `1px solid ${red}1A`,
                  borderRadius: 7,
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${red}40`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${red}1A`)}
              >
                <div style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1, opacity: 0.8 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: text, marginBottom: 3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: muted, lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    color: red,
                    background: `${red}1A`,
                    padding: '2px 7px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                    marginTop: 2,
                  }}
                >
                  {item.tag}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DIVIDER */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 48,
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: bebas,
              fontSize: '1.8rem',
              color: amber,
              lineHeight: 1,
            }}
          >
            →
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.58rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: amber,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            ContractNest
          </div>
        </div>

        {/* RIGHT: CONTRACTNEST */}
        <div
          style={{
            background: `${green}0A`,
            border: `1px solid ${green}26`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${green}26`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: `${green}0F`,
            }}
          >
            <span
              style={{
                fontFamily: mono,
                fontSize: '0.65rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: green,
              }}
            >
              With ContractNest
            </span>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: green,
                marginLeft: 'auto',
                animation: 'heroV3Pulse 2s ease-in-out infinite',
              }}
            />
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nestItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: `${green}0A`,
                  border: `1px solid ${green}1A`,
                  borderRadius: 7,
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${green}40`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${green}1A`)}
              >
                <div style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: text, marginBottom: 3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: muted, lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    color: green,
                    background: `${green}1A`,
                    padding: '2px 7px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                    marginTop: 2,
                  }}
                >
                  {item.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCENARIO TABS */}
      <div
        style={{
          marginTop: 64,
          border: `1px solid ${border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${border}`,
            background: surface,
            overflowX: 'auto',
          }}
        >
          {scenarioTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 22px',
                fontFamily: mono,
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: activeTab === tab.key ? amber : muted,
                cursor: 'pointer',
                borderRight: `1px solid ${border}`,
                borderBottom: `2px solid ${activeTab === tab.key ? amber : 'transparent'}`,
                background: activeTab === tab.key ? `${amber}1F` : 'transparent',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s, background 0.2s',
                border: 'none',
                borderRightStyle: 'solid',
                borderRightWidth: 1,
                borderRightColor: border,
                borderBottomStyle: 'solid',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? amber : 'transparent',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scenario content */}
        <div style={{ padding: '32px 36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Before */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: 8,
                background: `${red}0D`,
                border: `1px solid ${red}1F`,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '0.62rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  color: red,
                }}
              >
                Before
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: muted,
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}
                dangerouslySetInnerHTML={{
                  __html: scenarios[activeTab].before.replace(
                    /<strong>/g,
                    `<strong style="color:${text};font-style:normal;font-weight:500">`
                  ),
                }}
              />
            </div>

            {/* After */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: 8,
                background: `${green}0D`,
                border: `1px solid ${green}1F`,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '0.62rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  color: green,
                }}
              >
                With ContractNest
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: muted,
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}
                dangerouslySetInnerHTML={{
                  __html: scenarios[activeTab].after.replace(
                    /<strong>/g,
                    `<strong style="color:${text};font-style:normal;font-weight:500">`
                  ),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reuse animation from HeroV3 */}
      <style>{`
        @keyframes heroV3Pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }

        @media (max-width: 900px) {
          #problem {
            padding: 48px 24px !important;
          }
          #problem > div:nth-child(4) {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          #problem > div:nth-child(4) > div:nth-child(2) {
            flex-direction: row !important;
            padding-top: 0 !important;
            writing-mode: horizontal-tb !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default TheProblemV3;
