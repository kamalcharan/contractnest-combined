// ============================================================================
// HeroEmptyState — the Requests page's first-use presentation, as a component
// ============================================================================
// The owner asked for one empty-state design everywhere (2026-09-29: "same
// design approach for leads in the same design we have for RFQ"). The
// Requests page owns the design (pages/contracts/hub/RequestsEmptyState.tsx +
// requests-empty-state.css): eyebrow · headline with a brand em · lead · one
// primary action · reassurance line · optional underlined secondary · an
// "ILLUSTRATION" document on the right · three numbered steps underneath.
// This component renders that same markup and stylesheet from props, so
// Leads, RFQ, Extend and any later page read exactly like Requests. The hub
// keeps its own component untouched.

import React from 'react';
import { ArrowRight, Check, FileText, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import '@/pages/contracts/hub/requests-empty-state.css';

export interface HeroRow { icon: LucideIcon; title: string; detail: string }
export interface HeroStep { title: string; body: string }

export interface HeroEmptyStateProps {
  eyebrow: string;
  /** the headline; put the brand-coloured tail in `em` */
  title: React.ReactNode;
  em?: React.ReactNode;
  lead: React.ReactNode;
  action: { label: React.ReactNode; onClick: () => void; busy?: boolean };
  /** the small check line under the button */
  reassurance?: React.ReactNode;
  /** the underlined link under it */
  secondary?: { label: React.ReactNode; onClick: () => void };
  /** the illustration card on the right */
  preview: { badge?: string; icon?: LucideIcon; title: string; subtitle: string; rows: HeroRow[]; note?: string };
  steps: HeroStep[];
  ariaLabel?: string;
}

const HeroEmptyState: React.FC<HeroEmptyStateProps> = ({ eyebrow, title, em, lead, action, reassurance, secondary, preview, steps, ariaLabel }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const styles = {
    '--rq-ink': colors.utility.primaryText, '--rq-muted': colors.utility.secondaryText, '--rq-brand': colors.brand.primary,
    '--rq-bg': colors.utility.secondaryBackground, '--rq-line': colors.utility.primaryText + '20',
  } as React.CSSProperties;
  const PreviewIcon = preview.icon || FileText;
  return (
    <section className="rq-state" style={styles} aria-label={ariaLabel}>
      <div className="rq-hero">
        <div className="rq-copy">
          <span className="rq-eyebrow">{eyebrow}</span>
          <h2>{title}{em ? <> <em>{em}</em></> : null}</h2>
          <p>{lead}</p>
          <button type="button" className="rq-action rq-primary" onClick={action.onClick} disabled={action.busy}>
            {action.label}<ArrowRight size={16} aria-hidden="true" />
          </button>
          {reassurance && <div className="rq-reassurance"><Check size={15} aria-hidden="true" />{reassurance}</div>}
          {secondary && <button className="rq-secondary" type="button" onClick={secondary.onClick}>{secondary.label} <ArrowRight size={14} aria-hidden="true" /></button>}
        </div>
        <div className="rq-preview" aria-label="Illustration, not a real record">
          <div className="rq-document">
            <div className="rq-doc-top">
              <span className="rq-symbol"><PreviewIcon size={25} aria-hidden="true" /></span>
              <span className="rq-example-badge">{preview.badge || 'ILLUSTRATION'}</span>
            </div>
            <h3>{preview.title}</h3>
            <p>{preview.subtitle}</p>
            {preview.rows.map((r) => (
              <div className="rq-doc-row" key={r.title}><r.icon size={18} aria-hidden="true" /><div><strong>{r.title}</strong><small>{r.detail}</small></div></div>
            ))}
          </div>
          <small className="rq-example-note">{preview.note || 'Illustrative preview · nothing is created'}</small>
        </div>
      </div>
      {steps.length > 0 && (
        <div className="rq-steps">
          {steps.map((s, i) => <article key={s.title}><span>0{i + 1}</span><div><h3>{s.title}</h3><p>{s.body}</p></div></article>)}
        </div>
      )}
    </section>
  );
};

export default HeroEmptyState;
