import React, { useState } from 'react';
import { ArrowLeft, Check, FileText, Save, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { textOnBrand } from '@/pages/experience/model';
import type { ContractWizardState, ContractType } from '../logic/state';
import { serviceErrors, servicePriced } from './ServicesCatalog';
import { useAuth } from '@/context/AuthContext';
import { useServiceCatalog } from './useServiceCatalog';
import { catalogForCoverage, isAgreementTerms } from './serviceCatalogModel';
import './agreement.css';
import './approved-agreement.css';
import './services.css';

interface Props {
  state: ContractWizardState; relationship: ContractType; busy: boolean; saveStatus: string; error: string | null;
  children: React.ReactNode; onSave: () => Promise<boolean>; onBack: () => void; onClose: () => void;
}
export default function ServicesPage(p: Props) {
  const { currentTheme, isDarkMode } = useTheme();
  const c = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const s = p.state;
  const {currentTenant,isLive,perspective} = useAuth();
  const context = JSON.stringify([currentTenant?.id,isLive,perspective,s.buyerId]);
  const [initialContext] = useState(context);
  const contextChanged = context !== initialContext || !currentTenant?.id || !s.buyerId;
  const locked = p.busy || contextChanged;
  const catalogue = useServiceCatalog(!contextChanged);
  const snapshot = JSON.stringify(s);
  const errors = serviceErrors(s.selectedBlocks, s.currency, s.coverageTypes);
  if (!catalogue.ready || catalogue.error) errors.push('Catalogue and resource dependencies must load successfully before completing Services. You can still save an unfinished draft.');
  else {
    for (const block of s.selectedBlocks) {
      if (block.isFlyBy) continue;
      if (isAgreementTerms(block)) {
        if (!catalogue.raw.some((raw:any) => raw.id === block.id && raw.is_active !== false)) errors.push('The saved mandatory T&C is unavailable in this workspace environment. Review it in Catalog Studio.');
        continue;
      }
      try {
        const scope = s.coverageTypes.find(c => c.id === block.coverageTypeId) || null;
        const available = catalogForCoverage(catalogue.raw,scope,catalogue.resources,catalogue.templates,s.currency);
        if (!available.some(b => (scope ? `${b.id}__${scope.id}` : b.id) === block.id)) errors.push(`${block.name}: no longer eligible for this resource and currency. Review or remove this saved selection.`);
      } catch (error) { errors.push(error instanceof Error ? error.message : 'Resource dependencies could not be verified.'); }
    }
  }
  const total = s.selectedBlocks.reduce((n,b) => n + b.totalPrice, 0);
  const mixedCurrency = s.selectedBlocks.some(b => servicePriced(b) && b.currency !== s.currency);
  const save = async (complete: boolean) => {
    if (locked) return;
    setAttempted(complete); setSaved(null);
    if (complete && errors.length) return;
    const captured = snapshot;
    if (await p.onSave()) setSaved(complete ? captured : null);
  };
  const summary = <><span className="ag-eyebrow">YOUR AGREEMENT</span><h2>{s.contractName}</h2><span className={`ag-badge ag-${p.relationship}`}>{p.relationship} contract</span><dl><dt>With</dt><dd>{s.buyerName}</dd><dt>Term</dt><dd>{s.durationValue} {s.durationUnit}</dd><dt>Commitments</dt><dd>{s.selectedBlocks.length} selected</dd>{s.coverageTypes.map(scope => <React.Fragment key={scope.id}><dt>{scope.resource_name} × {scope.unit_count}</dt><dd>{s.selectedBlocks.filter(b => b.coverageTypeId === scope.id).length} commitments</dd></React.Fragment>)}</dl><div className="sv-total"><small>Selected lines total</small><strong>{!mixedCurrency && Number.isFinite(total) ? new Intl.NumberFormat(undefined,{style:'currency',currency:s.currency}).format(total) : 'Review line prices'}</strong><p>Uses each line’s configured tax. Final billing and payment terms come next.</p></div><div className="ag-assurance"><Check size={16}/>Manual creation · no VaNi credits</div></>;
  return <div className="ag-page sv-page" style={{'--ag-bg':c.utility.primaryBackground,'--ag-panel':c.utility.secondaryBackground,'--ag-text':c.utility.primaryText,'--ag-muted':c.utility.secondaryText,'--ag-line':`${c.utility.primaryText}22`,'--ag-brand':c.brand.primary,'--ag-onbrand':textOnBrand(c.brand.primary),'--ag-error':c.semantic.error} as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>Build your commitments</span></div><div><span role="status">Draft · {p.saveStatus === 'saving' ? 'Saving…' : p.saveStatus === 'failed' ? 'Save failed' : p.saveStatus === 'saved' ? 'Saved' : 'In progress'}</span><button aria-label="Close services" disabled={p.busy} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav className="ag-chapters" aria-label="Creation chapters">{['Agreement','Coverage & services','Money','Delivery & acceptance','Review'].map((name,i)=><span key={name} aria-current={i===1?'step':undefined}><b>{i+1}</b>{name}</span>)}</nav>
    <div className="ag-layout"><main><div className="ag-intro"><span className="ag-eyebrow">THE WORK BEHIND YOUR PROMISE</span><h1>Make every commitment clear.</h1><p>Choose what gets delivered. Shape the details without changing your catalogue.</p></div>
      {contextChanged && <p role="alert">Workspace, environment or contact changed. Close this draft and reopen it in the correct context before editing.</p>}
      <fieldset className="ag-fields" disabled={locked}>{p.children}</fieldset>
      {attempted && errors.length > 0 && <section className="ag-card" role="alert"><h2>A few details need attention</h2><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></section>}
      {p.error && <p className="ag-error" role="alert">{p.error}</p>}
      {saved === snapshot && <section className="ag-card sv-saved" role="status"><Check/><h2>Services saved.</h2><p>Your commitments are in this draft. Money is the next build. No contract has been sent and no invoice or appointment has been created.</p></section>}
      <details className="ag-mobile-summary"><summary>Your agreement so far</summary>{summary}</details></main><aside>{summary}</aside></div>
    <footer className="ag-footer"><button disabled={locked} onClick={p.onBack}><ArrowLeft size={17}/>Coverage</button><button disabled={locked} onClick={()=>void save(false)}><Save size={17}/>Save draft</button><button className="ag-primary" disabled={locked} onClick={()=>void save(true)}>Save services</button></footer>
  </div>;
}
