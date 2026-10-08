import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, FilePlus2, FileInput, KeyRound, MessageSquareText, PenLine, Sparkles } from 'lucide-react';
import { startActions, type ExperiencePerspective, type StartAction } from './model';
import { createOptions, VANI_DRAFT_PATH } from '@/pages/contracts/experience/createOptions';

interface Props {
  perspective: ExperiencePerspective;
  compact?: boolean;
  onAction: (action: StartAction) => void;
  /** Start a contract: same choices as the Contracts page's "New contract". */
  onCreate: (to: string) => void;
  /** Show "Draft with VaNi" (tenant has VaNi). */
  vaniEntitled?: boolean;
}

export default function StartChooser({ perspective, compact = false, onAction, onCreate, vaniEntitled = false }: Props) {
  const [open, setOpen] = useState<'record' | 'create' | null>(null);
  const recordOpen = open === 'record';
  const createOpen = open === 'create';
  const recordHeading = useRef<HTMLHeadingElement>(null);
  const createHeading = useRef<HTMLHeadingElement>(null);
  const recordButton = useRef<HTMLButtonElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const revenue = perspective === 'revenue';
  useEffect(() => { if (recordOpen) recordHeading.current?.focus(); }, [recordOpen]);
  useEffect(() => { if (createOpen) createHeading.current?.focus(); }, [createOpen]);
  const toggle = (id: 'record' | 'create') => setOpen(current => current === id ? null : id);
  const choices = {
    create: { icon: FilePlus2, title: revenue ? 'Create a service agreement' : 'Agree services with a vendor', detail: 'Bring your services, pricing, and schedule into one agreement.', hint: 'Use your catalogue or a template', label: 'Create agreement' },
    request: { icon: MessageSquareText, title: 'Find the right service provider', detail: 'Describe the work and invite vendors to quote.', hint: 'Request for quotation', label: 'Create a request' },
    record: { icon: FileInput, title: 'Record an existing agreement', detail: 'Bring agreed services and dates into your workspace.', hint: 'Manual entry', label: 'See entry options' },
    respond: { icon: MessageSquareText, title: 'Respond to a customer request', detail: 'Open the requests shared with you and prepare your response.', hint: 'Your received requests', label: 'View requests' },
    claim: { icon: KeyRound, title: 'Join a shared contract', detail: 'Have a ContractNest access key? Connect to that agreement.', hint: 'Use your access key', label: 'Claim contract' },
  };
  return <section className={`xp-start ${compact ? 'xp-start-compact' : ''}`} id="experience-start" aria-labelledby="start-heading">
    <div className="xp-start-intro">
      {!compact && <div className="xp-start-topline"><span className="xp-eyebrow">START WITH THE WORK AT HAND</span></div>}
      <h2 id="start-heading">{compact ? 'Start something new' : <>What would you like<br className="xp-desktop-break" /> to make happen?</>}</h2>
      <p>{compact ? 'Your next move, one click away.' : 'Choose an outcome. Use your business profile, catalogue, and templates as you go.'}</p>
      {!compact && <div className="xp-start-context"><span className="xp-context-dot" />{revenue ? 'Providing services' : 'Receiving services'}</div>}
    </div>
    <div className="xp-choice-grid">
      {startActions(perspective).map((id, index) => {
        const choice = choices[id];
        const Icon = choice.icon;
        const panel = id === 'record' || id === 'create';
        return <button key={id} ref={id === 'record' ? recordButton : id === 'create' ? createButton : undefined} className={`xp-choice xp-choice-${id} ${index === 0 ? 'xp-choice-featured' : ''}`}
          aria-expanded={panel ? open === id : undefined} aria-controls={id === 'record' ? 'existing-entry' : id === 'create' ? 'create-entry' : undefined}
          onClick={() => { if (panel) toggle(id as 'record' | 'create'); else onAction(id); }}>
          <span className="xp-choice-top"><span className="xp-choice-icon"><Icon size={23} strokeWidth={1.6} /></span><span className="xp-choice-hint">{choice.hint}</span><ArrowUpRight className="xp-choice-arrow" size={18} /></span>
          <strong>{choice.title}</strong>{!compact && <><span className="xp-choice-detail">{choice.detail}</span><span className="xp-choice-cta">{choice.label}<ArrowRight size={15} /></span></>}
        </button>;
      })}
    </div>
    {createOpen && <div className="xp-record-options" id="create-entry">
      <div><h3 ref={createHeading} tabIndex={-1}>{revenue ? 'What are you agreeing?' : 'Agree services with a vendor.'}</h3><p>Start a new agreement from your catalogue, or from a published template.</p></div>
      <div className="xp-create-options">
        {createOptions(revenue).map(option => <button key={option.key} className="xp-create-option" onClick={() => onCreate(option.to)}>
          <strong>{option.title}</strong><small>{option.caption}</small><ArrowRight size={16} />
        </button>)}
        {vaniEntitled && <button className="xp-create-option xp-create-option-vani" onClick={() => onCreate(VANI_DRAFT_PATH)}>
          <strong><Sparkles size={14} /> Draft with VaNi</strong><small>Describe the agreement and VaNi drafts it for you to review</small><ArrowRight size={16} />
        </button>}
      </div>
      <div className="xp-actions"><button className="xp-text-link" onClick={() => { setOpen(null); createButton.current?.focus(); }}>Back to choices</button></div>
    </div>}
    {recordOpen && <div className="xp-record-options" id="existing-entry">
      <div><h3 ref={recordHeading} tabIndex={-1}>Bring the agreed terms with you.</h3><p>Enter the agreement’s services, prices, and dates manually in the contract wizard. Document upload and automatic extraction are not available from this entry.</p></div>
      <div className="xp-actions"><button className="xp-button xp-button-brand" onClick={() => onAction('record')}>Enter agreed terms<ArrowRight size={16} /></button><button className="xp-text-link" onClick={() => onAction('claim')}>I have an access key<ArrowUpRight size={16} /></button><button className="xp-text-link" onClick={() => { setOpen(null); recordButton.current?.focus(); }}>Back to choices</button></div>
    </div>}
    <div className="xp-start-footer"><PenLine size={16} /><span>Manual by default. You review the terms before sending.</span><span className="xp-start-footer-right">Your services. Your agreed terms.</span></div>
  </section>;
}
