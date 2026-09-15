import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, Save, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { textOnBrand } from '@/pages/experience/model';
import type { ContractType, ContractWizardState } from '../logic/state';
import type { StepConfig } from '../logic/stepConfig';
import { CREATION_CHAPTERS, DECISION_LABELS, chapterFor } from './chapters';
import './creation.css';

interface Props {
  state: ContractWizardState;
  relationship: ContractType;
  steps: StepConfig[];
  current: number;
  visited: number;
  skip: number;
  busy: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed';
  hasDraft: boolean;
  error: string | null;
  onJump: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

export default function CreationShell(p: Props) {
  const { currentTheme, isDarkMode } = useTheme();
  const c = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const step = p.steps[p.current];
  const chapterIndex = chapterFor(step.id);
  const chapter = CREATION_CHAPTERS[chapterIndex];
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const chapters = useRef<HTMLElement>(null);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 }); heading.current?.focus();
    chapters.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [p.current]);
  const last = step.id === 'review';
  const visible = p.steps.map((s, index) => ({ ...s, index })).filter(s => s.id !== 'path' && s.index !== p.skip);
  const decision = visible.findIndex(s => s.index === p.current) + 1;
  const status = p.saveStatus === 'failed' ? 'Save failed — keep this page open'
    : p.saveStatus === 'saving' ? 'Saving draft…'
    : p.saveStatus === 'saved' ? 'Draft saved'
    : p.hasDraft ? 'Draft started · edits save automatically' : 'Not saved yet';
  const summary = <>
    <div className="cn-create-kicker"><FileText size={16} /> Your agreement</div>
    <h2>{p.state.contractName.trim() || 'A new commitment'}</h2>
    <span className="cn-create-pill">{p.relationship === 'partner' ? 'Partner' : p.relationship === 'vendor' ? 'Vendor' : 'Client'} contract</span>
    <dl>
      <div><dt>With</dt><dd>{p.state.buyerName || 'Choose a contact'}</dd></div>
      <div><dt>Agreement label</dt><dd>{p.state.nomenclatureName || 'Not selected'}</dd></div>
      <div><dt>Term</dt><dd>{p.state.durationValue} {p.state.durationUnit}</dd></div>
      <div><dt>Coverage</dt><dd>{p.state.coverageTypes.length ? `${p.state.coverageTypes.length} coverage types` : 'No asset coverage selected'}</dd></div>
      <div><dt>Inclusions</dt><dd>{p.state.selectedBlocks.length} lines</dd></div>
      <div><dt>Acceptance</dt><dd>{p.state.acceptanceMethod === 'auto' ? 'Automatic' : p.state.acceptanceMethod === 'signoff' ? 'Sign-off' : p.state.acceptanceMethod === 'payment' ? 'Payment' : 'Not selected'}</dd></div>
    </dl>
    <p className="cn-create-note">Services and payment events will belong to this contract. Nothing is sent by saving a draft.</p>
    <p className="cn-create-note">Check the full price in Money and the dates in Events Preview before creating.</p>
  </>;
  return <div className="cn-create" style={{
    '--cc-bg': c.utility.primaryBackground, '--cc-panel': c.utility.secondaryBackground,
    '--cc-text': c.utility.primaryText, '--cc-muted': c.utility.secondaryText,
    '--cc-line': `${c.utility.primaryText}20`, '--cc-brand': c.brand.primary, '--cc-error': c.semantic.error,
    '--cc-brand-text': textOnBrand(c.brand.primary),
  } as React.CSSProperties}>
    <header className="cn-create-header">
      <div className="cn-create-brand"><FileText size={22} /><span>ContractNest <small>Create an agreement</small></span></div>
      <div className="cn-create-header-actions">
        <span role="status" className={p.saveStatus === 'failed' ? 'cn-create-error-text' : 'cn-create-save-status'}>{status}</span>
        <button disabled={p.busy} onClick={p.onClose} aria-label="Close contract creation"><X size={20} /></button>
      </div>
    </header>
    <nav ref={chapters} className="cn-create-chapters" aria-label="Contract chapters">
      {CREATION_CHAPTERS.map((item, i) => {
        const first = visible.find(s => item.steps.includes(s.id));
        const reachable = first && first.index <= p.visited;
        return <button key={item.title} disabled={!reachable || p.busy} aria-current={i === chapterIndex ? 'step' : undefined}
          onClick={() => first && p.onJump(first.index)}>
          <span className="cn-create-number">{i < chapterIndex ? <Check size={15} /> : i + 1}</span><span>{item.title}</span>
        </button>;
      })}
    </nav>
    <div className="cn-create-layout" ref={body}>
      <main className="cn-create-main">
        <div className="cn-create-intro"><div className="cn-create-kicker">Chapter {chapterIndex + 1} of 5 · {DECISION_LABELS[step.id]}</div>
          <h1 tabIndex={-1} ref={heading}>{chapter.title}</h1><p>{chapter.promise}</p>
        </div>
        <nav className="cn-create-decisions" aria-label={`${chapter.title} decisions`}>
          {visible.filter(s => chapter.steps.includes(s.id)).map(s => <button key={s.id}
            aria-current={s.index === p.current ? 'step' : undefined} disabled={s.index > p.visited || p.busy}
            onClick={() => p.onJump(s.index)}>{DECISION_LABELS[s.id]}</button>)}
        </nav>
        <div className="cn-create-editor" aria-busy={p.busy}>{p.children}</div>
        <details className="cn-create-mobile-summary"><summary>Your agreement so far</summary>{summary}</details>
      </main>
      <aside className="cn-create-summary">{summary}</aside>
    </div>
    <footer className="cn-create-footer">
      {p.error && <p role="alert" className="cn-create-error">{p.error}</p>}
      <div className="cn-create-footer-inner">
        <button className="cn-create-back" disabled={p.current <= 1 || p.busy} onClick={p.onBack}><ArrowLeft size={17} /><span>Back</span></button>
        <span className="cn-create-position">Decision {decision} of {visible.length}</span>
        <button className="cn-create-save" onClick={p.onSave} disabled={p.busy || !p.state.contractName.trim()} title={!p.state.contractName.trim() ? 'Name the agreement before saving' : 'Save without sending'}><Save size={16} /><span>Save draft</span></button>
        <button className="cn-create-primary" disabled={p.busy} onClick={p.onNext}>
          {p.busy ? <><Loader2 size={17} className="animate-spin" /> Working…</> : <>{last ? (p.state.acceptanceMethod === 'auto' ? 'Create contract' : 'Create & request acceptance') : 'Continue'}<ArrowRight size={17} /></>}
        </button>
      </div>
    </footer>
  </div>;
}
