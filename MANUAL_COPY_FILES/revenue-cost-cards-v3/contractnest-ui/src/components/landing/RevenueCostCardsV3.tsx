// src/components/landing/RevenueCoatCardsV3.tsx - Revenue & Cost dual cards from v3 reference
import React from 'react';
import { VikunaBlackTheme } from '../../config/theme/themes/vikunaBlack';

const colors = VikunaBlackTheme.darkMode.colors;
const green = '#2ECC71';
const amber = colors.brand.primary;
const surface = colors.utility.secondaryBackground;
const text = colors.utility.primaryText;
const muted = colors.utility.secondaryText;
const border = 'rgba(255,255,255,0.07)';
const border2 = 'rgba(255,255,255,0.12)';
const mono = "'DM Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

interface CardData {
  type: 'rev' | 'cost';
  tag: string;
  title: string;
  body: string;
  items: string[];
  accentColor: string;
  accentDim: string;
  accentBorder: string;
}

const cards: CardData[] = [
  {
    type: 'rev',
    tag: 'Revenue Side',
    title: 'Close Contracts. Get Paid.',
    body: 'Send professional contracts, track every service milestone, auto-generate invoices, and prove every commitment was met.',
    items: [
      'Digital contracts with e-signature',
      'SLA tracking with real-time alerts',
      'Evidence collection — photos, reports, certs',
      'Auto-invoice on milestone completion',
      'AR tracking — know who owes what',
    ],
    accentColor: green,
    accentDim: 'rgba(46,204,113,0.08)',
    accentBorder: 'rgba(46,204,113,0.2)',
  },
  {
    type: 'cost',
    tag: 'Cost Side',
    title: "Pay for What's Done.",
    body: "Manage every vendor contract from one place. Know what was scheduled, what was done, and what's overdue — before you pay.",
    items: [
      'Vendor portals — they log their own work',
      'Schedule adherence & visit tracking',
      'Work evidence required before payment',
      'AP tracking — never double-pay',
      'Compliance reports auto-generated',
    ],
    accentColor: amber,
    accentDim: 'rgba(245,166,35,0.08)',
    accentBorder: 'rgba(245,166,35,0.2)',
  },
];

const RevenueCostCardsV3: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '56px 56px',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.type}
          style={{
            background: surface,
            border: `1px solid ${border}`,
            padding: 36,
            borderRadius: 10,
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.25s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = border2)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
        >
          {/* Left accent bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 3,
              height: '100%',
              background: card.accentColor,
            }}
          />

          {/* Tag pill */}
          <div
            style={{
              display: 'inline-block',
              fontFamily: mono,
              fontSize: '0.63rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 4,
              marginBottom: 18,
              background: card.accentDim,
              color: card.accentColor,
              border: `1px solid ${card.accentBorder}`,
            }}
          >
            {card.tag}
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: bebas,
              fontSize: '1.9rem',
              letterSpacing: '0.04em',
              marginBottom: 10,
              color: text,
            }}
          >
            {card.title}
          </div>

          {/* Body */}
          <p
            style={{
              fontSize: '0.86rem',
              color: muted,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {card.body}
          </p>

          {/* List */}
          <ul
            style={{
              marginTop: 18,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 0,
            }}
          >
            {card.items.map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: '0.82rem',
                  color: muted,
                }}
              >
                <span style={{ color: card.accentColor, flexShrink: 0 }}>→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .${className || 'rev-cost-cards'} {
            grid-template-columns: 1fr !important;
            padding: 32px 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RevenueCostCardsV3;
