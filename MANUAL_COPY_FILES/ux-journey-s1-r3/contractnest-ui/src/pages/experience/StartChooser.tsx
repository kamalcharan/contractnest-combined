import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, FilePlus2, FileInput, KeyRound, MessageSquareText, PenLine, X } from 'lucide-react';
import { startActions, type ExperiencePerspective, type StartAction } from './model';

interface Props {
  perspective: ExperiencePerspective;
  isLive: boolean;
  onAction: (action: StartAction) => void;
  onClose?: () => void;
}

export default function StartChooser({ perspective, isLive, onAction, onClose }: Props) {
  const [recordOpen, setRecordOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const recordHeading = useRef<HTMLHeadingElement>(null);
  const recordButton = useRef<HTMLButtonElement>(null);
  const revenue = perspective === 'revenue';
  useEffect(() => { if (onClose) heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (recordOpen) recordHeading.current?.focus(); }, [recordOpen]);
  const choices = {
    create: { icon: FilePlus2, title: revenue ? 'Create a service agreement' : 'Agree services with a vendor', detail: 'Bring your services, pricing, and schedule into one agreement.', hint: 'Use your catalogue or a template', label: 'Create agreement' },
    request: { icon: MessageSquareText, title: 'Find the right service provider', detail: 'Describe the work and invite vendors to quote.', hint: 'Request for quotation', label: 'Create a request' },
    record: { icon: FileInput, title: 'Record an existing agreement', detail: 'Bring agreed services and dates into your workspace.', hint: 'Manual entry', label: 'See entry options' },
    respond: { icon: MessageSquareText, title: 'Respond to a customer request', detail: 'Open the requests shared with you and prepare your response.', hint: 'Your received requests', label: 'View requests' },
    claim: { icon: KeyRound, title: 'Join a shared contract', detail: 'Have a ContractNest access key? Connect to that agreement.', hint: 'Use your access key', label: 'Claim contract' },
  };
  return <section className="xp-start" id="experience-start" aria-labelledby="start-heading">
    <div className="xp-start-intro">
      <div className="xp-start-topline"><span className="xp-eyebrow">START WITH THE WORK AT HAND</span>{onClose && <button className="xp-icon-button" aria-label="Close start options" onClick={onClose}><X size={18} /></button>}</div>
      <h2 ref={heading} tabIndex={-1} id="start-heading">What would you like<br className="xp-desktop-break" /> to make happen?</h2>
      <p>Start with an outcome. Your business setup and service catalogue are already here to help.</p>
      <div className="xp-start-context"><span className="xp-context-dot" />{isLive ? 'Live workspace' : 'Test workspace'}<span aria-hidden="true">/</span>{revenue ? 'Providing services' : 'Receiving services'}</div>
    </div>
    <div className="xp-choice-grid">
      {startActions(perspective).map((id, index) => {
        const choice = choices[id];
        const Icon = choice.icon;
        return <button key={id} ref={id === 'record' ? recordButton : undefined} className={`xp-choice ${index === 0 ? 'xp-choice-featured' : ''}`}
          aria-expanded={id === 'record' ? recordOpen : undefined} aria-controls={id === 'record' ? 'existing-entry' : undefined}
          onClick={() => { if (id === 'record') setRecordOpen(open => !open); else onAction(id); }}>
          <span className="xp-choice-top"><span className="xp-choice-icon"><Icon size={23} strokeWidth={1.6} /></span><span className="xp-choice-hint">{choice.hint}</span><ArrowUpRight className="xp-choice-arrow" size={18} /></span>
          <strong>{choice.title}</strong><span className="xp-choice-detail">{choice.detail}</span>
          <span className="xp-choice-cta">{choice.label}<ArrowRight size={15} /></span>
        </button>;
      })}
    </div>
    {recordOpen && <div className="xp-record-options" id="existing-entry">
      <div><h3 ref={recordHeading} tabIndex={-1}>Bring the agreed terms with you.</h3><p>Enter the agreement’s services, prices, and dates manually in the contract wizard. Document upload and automatic extraction are not available from this entry.</p></div>
      <div className="xp-actions"><button className="xp-button xp-button-brand" onClick={() => onAction('record')}>Enter agreed terms<ArrowRight size={16} /></button><button className="xp-text-link" onClick={() => onAction('claim')}>I have an access key<ArrowUpRight size={16} /></button><button className="xp-text-link" onClick={() => { setRecordOpen(false); recordButton.current?.focus(); }}>Back to choices</button></div>
    </div>}
    <div className="xp-start-footer"><PenLine size={16} /><span>Manual by default. You review the terms before sending.</span><span className="xp-start-footer-right">Your services. Your agreed terms.</span></div>
  </section>;
}
