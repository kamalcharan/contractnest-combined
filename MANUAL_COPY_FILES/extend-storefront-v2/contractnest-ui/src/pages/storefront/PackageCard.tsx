// ============================================================================
// PackageCard — THE card. Widget frame, package page, configurator preview
// (and, later, VaNi's chat) all render this one component, so a style change
// on the Extend page changes it everywhere at once.
// ============================================================================
// Dependency-light on purpose: it renders inside a third-party page's iframe
// where nothing but this bundle exists. Inline styles, brand colour from the
// storefront's card_style, no toasts, no router.

import React from 'react';
import { CardStyle, StorefrontPackage, fmtMoney, termLabel, radiusFor, inkOn } from './api';

export interface PackageCardProps {
  pkg: StorefrontPackage;
  style: CardStyle;
  onBuy: (pkg: StorefrontPackage) => void;
  onExplore?: (pkg: StorefrontPackage) => void;
  onAsk?: (pkg: StorefrontPackage) => void;
  /** show fewer lines and a tighter layout (widget in a sidebar, catalog rows) */
  compact?: boolean;
  /** the card's own primary label; defaults to the storefront's card_style.label */
  primaryLabel?: string;
}

const INK = '#1a1816', SOFT = '#8a847a', LINE = '#f0ece6', EDGE = '#e5e1db';

export const CardButton: React.FC<{
  label: string; color: string; shape: CardStyle['shape']; ghost?: boolean; onClick?: () => void; size?: 'sm' | 'md';
}> = ({ label, color, shape, ghost, onClick, size = 'md' }) => (
  <button type="button" onClick={onClick} style={{
    borderRadius: radiusFor(shape),
    padding: size === 'sm' ? '8px 14px' : '11px 20px',
    fontSize: size === 'sm' ? 13 : 14, fontWeight: 600, cursor: 'pointer', lineHeight: 1.2,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
    border: ghost ? `1px solid ${EDGE}` : '1px solid transparent',
    background: ghost ? '#fff' : color, color: ghost ? INK : inkOn(color),
    boxShadow: ghost ? 'none' : '0 4px 14px rgba(0,0,0,0.12)',
  }}>{label}</button>
);

const PackageCard: React.FC<PackageCardProps> = ({ pkg, style, onBuy, onExplore, onAsk, compact, primaryLabel }) => {
  const term = termLabel(pkg.term);
  const isFree = !pkg.price || pkg.price <= 0;
  const lines = (pkg.lines || []).slice(0, compact ? 3 : 5);
  // a storefront whose button says "Explore" leads with the package page; no second Explore then
  const label = primaryLabel || style.label || 'Buy now';
  const primaryIsExplore = /^explore$/i.test(label.trim()) && !!onExplore;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${EDGE}`, borderRadius: 14, padding: compact ? '14px 16px' : '18px 20px',
      display: 'grid', gap: compact ? 8 : 10, color: INK, fontFamily: 'Outfit, "Segoe UI", system-ui, -apple-system, sans-serif',
      boxShadow: '0 1px 2px rgba(26,24,22,0.04)', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {pkg.cover_image && !compact && (
          <img src={pkg.cover_image} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flex: '0 0 auto' }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: compact ? 15 : 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{pkg.name}</div>
          <div style={{ fontSize: compact ? 14 : 16, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {isFree ? 'Free' : fmtMoney(pkg.price, pkg.currency)}
            {term && <span style={{ color: SOFT, fontWeight: 500 }}> / {term}</span>}
          </div>
        </div>
      </div>
      {lines.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
          {lines.map((l, i) => (
            <li key={i} style={{ fontSize: 13, color: '#4a463f', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ color: style.color, fontWeight: 700 }}>·</span>
              <span style={{ minWidth: 0 }}>{l.name}{l.quantity > 1 && <span style={{ color: SOFT }}> × {l.quantity}</span>}</span>
            </li>
          ))}
          {(pkg.lines?.length || 0) > lines.length && (
            <li style={{ fontSize: 12, color: SOFT }}>+ {(pkg.lines.length - lines.length)} more</li>
          )}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
        <CardButton label={label} color={style.color} shape={style.shape} onClick={() => (primaryIsExplore ? onExplore!(pkg) : onBuy(pkg))} size={compact ? 'sm' : 'md'} />
        {onExplore && !primaryIsExplore && <CardButton label="Explore" color={style.color} shape={style.shape} ghost onClick={() => onExplore(pkg)} size={compact ? 'sm' : 'md'} />}
        {onAsk && <CardButton label="Ask VaNi" color={style.color} shape={style.shape} ghost onClick={() => onAsk(pkg)} size={compact ? 'sm' : 'md'} />}
      </div>
    </div>
  );
};

export default PackageCard;
