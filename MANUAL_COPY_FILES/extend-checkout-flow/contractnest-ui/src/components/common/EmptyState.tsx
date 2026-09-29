// ============================================================================
// EmptyState — the one empty state (lifted from the Contracts hub / Requests)
// ============================================================================
// The hub's "No requests waiting" block is the pattern the owner pointed at:
// a 72px brand-tinted icon tile, an 18px title, a short explanation and at
// most one primary action. This is that block as a component so Extend and
// Leads (and any later page) read the same way. The hub keeps its own copy
// untouched — no refactor there.

import React from 'react';
import { FileText, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: React.ReactNode;
  /** primary action (brand button) */
  action?: { label: React.ReactNode; onClick: () => void };
  /** secondary, quieter action (outline button) */
  secondary?: { label: React.ReactNode; onClick: () => void };
  /** a caption under the buttons ("Sign a template off first") */
  hint?: React.ReactNode;
  /** tighter padding for a block inside a card */
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = FileText, title, body, action, secondary, hint, compact }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brand = colors.brand.primary;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: compact ? '48px 24px' : '80px 40px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: brand + '14', marginBottom: 20 }}>
        <Icon size={32} style={{ color: brand, opacity: 0.6 }} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.utility.primaryText, marginBottom: 8 }}>{title}</h3>
      {body && (
        <p style={{ fontSize: 13.5, color: colors.utility.secondaryText, marginBottom: action || secondary ? 20 : 0, maxWidth: 400, lineHeight: 1.6 }}>{body}</p>
      )}
      {(action || secondary) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button onClick={action.onClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: brand, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              {action.label}
            </button>
          )}
          {secondary && (
            <button onClick={secondary.onClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: `1px solid ${colors.utility.primaryText}25`, background: 'transparent', color: colors.utility.primaryText, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              {secondary.label}
            </button>
          )}
        </div>
      )}
      {hint && <p style={{ fontSize: 12, color: colors.utility.secondaryText, marginTop: 14, maxWidth: 400 }}>{hint}</p>}
    </div>
  );
};

export default EmptyState;
