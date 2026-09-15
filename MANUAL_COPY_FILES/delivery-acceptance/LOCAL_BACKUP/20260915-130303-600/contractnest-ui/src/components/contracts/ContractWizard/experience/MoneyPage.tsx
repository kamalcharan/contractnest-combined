import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Check, FileText, Save, X, CalendarDays, CreditCard, Layers} from 'lucide-react';
import {useTheme} from '@/contexts/ThemeContext';
import {useAuth} from '@/context/AuthContext';
import {textOnBrand} from '@/pages/experience/model';
import type {ContractWizardState, ContractType} from '../logic/state';
import {cadenceTermMath, getCadenceCycle} from '@/utils/catalog-studio/cadencePricing';
import {allowedCycles, changeCycle, cycleNames, lineMoney, moneyPreview, moneyTotals, priced, termMonths} from './moneyModel';
import {serviceErrors} from './ServicesCatalog';
import './agreement.css';
import './approved-agreement.css';
import './money.css';

interface Props {
  state:ContractWizardState; relationship:ContractType; busy:boolean; saveStatus:string; error:string|null;
  onChange:(patch:Partial<ContractWizardState>)=>void; onSave:()=>Promise<boolean>; onBack:()=>void; onClose:()=>void;
}
export default function MoneyPage(p:Props) {
  const s = p.state;
  const {currentTheme,isDarkMode} = useTheme();
  const c = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const {currentTenant,isLive,perspective} = useAuth();
  const context = JSON.stringify([currentTenant?.id,isLive,perspective,s.buyerId]);
  const [initialContext] = useState(context);
  const changedContext = context !== initialContext || !currentTenant?.id || !s.buyerId;
  const [saving,setSaving] = useState(false);
  const savingRef = useRef(false);
  const [notice,setNotice] = useState<{error:boolean;text:string}|null>(null);
  const locked = p.busy || saving || changedContext;
  const [attempted,setAttempted] = useState(false);
  const [saved,setSaved] = useState<string|null>(null);
  const [localError,setLocalError] = useState('');
  const result = moneyPreview(s);
  const {totals,events} = result;
  const rounding = Math.round((totals.grandTotal - (totals.baseSubtotal - totals.discountTotal + totals.taxTotal)) * 100) / 100;
  const errors = [...new Set([...result.errors,...serviceErrors(s.selectedBlocks,s.currency,s.coverageTypes)])];
  const lines = s.selectedBlocks.filter(priced);
  const snapshot = JSON.stringify(s);
  const totalsKey = JSON.stringify(totals);
  const totalsReady = Object.entries(totals).every(([k,v])=>JSON.stringify(s[k as keyof ContractWizardState]) === JSON.stringify(v));
  const safeTotals = [totals.baseSubtotal,totals.taxTotal,totals.discountTotal,totals.grandTotal].every(n=>Number.isFinite(n)&&n>=0);
  useEffect(()=>{if (!changedContext && safeTotals && !totalsReady) p.onChange(totals);},[totalsKey,changedContext,safeTotals,totalsReady]);
  const patch = (update:Partial<ContractWizardState>) => {
    if (locked) return;
    setSaved(null); setLocalError(''); setNotice({error:false,text:'Changes not saved yet.'});
    const next = {...s,...update};
    if (update.selectedBlocks) update = {...update,totalValue:update.selectedBlocks.reduce((n,b)=>n+b.totalPrice,0)};
    const calculated = moneyTotals(next);
    p.onChange({...update,...([calculated.baseSubtotal,calculated.taxTotal,calculated.grandTotal,calculated.discountTotal].every(n=>Number.isFinite(n)&&n>=0) ? calculated : {})});
  };
  const format = (n:number) => {
    try {return Number.isFinite(n) && n >= 0 && s.currency ? new Intl.NumberFormat(undefined,{style:'currency',currency:s.currency}).format(n) : 'Needs review';} catch {return 'Currency required';}
  };
  const save = async(complete:boolean) => {
    if (locked || savingRef.current) return;
    setAttempted(complete);setSaved(null);
    if (!safeTotals || (complete && errors.length)) {
      setNotice({error:true,text:`Not saved. ${errors[0] || 'Review the price and discount values.'}`});
      const first = result.itemIssues[0];
      if (first) document.getElementById(`money-item-${first.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if (!totalsReady) { setNotice({error:true,text:'Not saved yet. Totals are updating; please try Save again.'}); return; }
    savingRef.current = true; setSaving(true);
    setNotice({error:false,text:'Saving your draft… Please keep this page open.'});
    try {
      if (await p.onSave()) {
        setSaved(complete ? snapshot : null);
        setNotice({error:false,text:complete?'Money saved to your draft. Nothing has been sent.':'Draft saved. You can close and reopen it; unfinished payment choices are retained.'});
      } else setNotice({error:true,text:'Save was not confirmed. Your changes are still here. Please retry or check Contracts before closing.'});
    } catch {
      setNotice({error:true,text:'Save was not confirmed. Your changes are still here. Please retry or check Contracts before closing.'});
    } finally { savingRef.current = false; setSaving(false); }
  };
  const updateCycle = (cycle:string,id?:string) => {
    try { patch({selectedBlocks:s.selectedBlocks.map(b=>priced(b)&&(!id||id===b.id)?changeCycle(b,cycle,s):b)}); }
    catch(e){setLocalError(e instanceof Error ? e.message : 'The cycle could not be changed.');}
  };
  const cadence = lines.some(b=>b.config?.cadencePricing);
  const upfrontAllowed = s.billingCycleType === 'unified' && lines.every(b=>b.cycle === 'prepaid');
  const emiAllowed = !cadence && termMonths(s)>=2 && (s.billingCycleType === 'mixed' || (s.billingCycleType === 'unified' && lines.every(b=>b.cycle === 'postpaid')));
  const common = lines.length ? allowedCycles(lines[0],s).filter(cycle=>lines.every(b=>allowedCycles(b,s).includes(cycle))) : [];
  const commonValue = new Set(lines.map(b=>b.cycle)).size === 1 ? lines[0]?.cycle : '';
  const selectedPlan = [{id:'defined',title:'Follow the agreed schedule',description:'Keep each commitment’s payment frequency.',icon:CalendarDays,allowed:true},
    {id:'prepaid',title:'One payment upfront',description:upfrontAllowed?'One amount at the start of this agreement.':'Available when all lines share a prepaid cycle.',icon:CreditCard,allowed:upfrontAllowed},
    {id:'emi',title:'Equal monthly instalments',description:cadence?'Your catalogue rate card already defines the payments.':emiAllowed?'Split the contract total across monthly payments.':'Requires individual cycles, or shared postpaid lines, and a term of at least 2 months.',icon:Layers,allowed:emiAllowed}];
  const summary = <><span className="ag-eyebrow">YOUR AGREEMENT</span><h2>{s.contractName}</h2><span className={`ag-badge ag-${p.relationship}`}>{p.relationship} contract</span><dl><dt>With</dt><dd>{s.buyerName}</dd><dt>Term</dt><dd>{s.durationValue} {s.durationUnit}</dd><dt>Priced commitments</dt><dd>{lines.length}</dd></dl><div className="mn-summary-total"><small>Contract total</small><strong>{format(totals.grandTotal)}</strong><p>{errors.length?'Payment plan needs review':`${events.length} payment events in this agreement`}</p></div><div className="ag-assurance"><Check size={16}/>Manual creation · no VaNi credits</div></>;
  return <div className="ag-page mn-page" style={{'--ag-bg':c.utility.primaryBackground,'--ag-panel':c.utility.secondaryBackground,'--ag-text':c.utility.primaryText,'--ag-muted':c.utility.secondaryText,'--ag-line':`${c.utility.primaryText}22`,'--ag-brand':c.brand.primary,'--ag-onbrand':textOnBrand(c.brand.primary),'--ag-error':c.semantic.error} as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>Build your commitments</span></div><div><span role="status">Draft · {p.saveStatus==='saving'?'Saving…':p.saveStatus==='failed'?'Save failed':p.saveStatus==='saved'?'Saved':'In progress'}</span><button aria-label="Close Money" disabled={p.busy} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav className="ag-chapters" aria-label="Creation chapters">{['Agreement','Coverage & services','Money','Delivery & acceptance','Review'].map((name,i)=><span key={name} aria-current={i===2?'step':undefined}><b>{i+1}</b>{name}</span>)}</nav>
    <div className="ag-layout"><main><div className="ag-intro"><span className="ag-eyebrow">03 · MONEY</span><h1>Make the money clear.</h1><p>The agreed price. The payment plan. No surprises for either side.</p></div>
      {changedContext && <p role="alert">Workspace, environment, perspective or contact changed. Close and reopen the draft in the correct context before editing.</p>}
      <fieldset className="ag-fields" disabled={locked}>
        <section className="ag-card"><div className="mn-heading"><h2>The price, without surprises</h2><span className="ag-badge">{s.currency || 'Currency missing'}</span></div><p>Carried from your commitments. Catalogue prices, FlyBy entries and configured taxes stay together.</p>
          <div className="mn-lines">{lines.map(b=><article className="mn-line" key={b.id}><div><strong>{b.name}</strong><p>{b.coverageTypeName || 'Agreement-wide'} · {b.isFlyBy?'FlyBy':'Catalogue'}</p><small>{b.config?.cadencePricing?`${format(lineMoney(b,s).rate)} · ${cycleNames[b.cycle]}`:b.unlimited?`${format(lineMoney(b,s).rate)} agreed flat amount · unlimited delivery`:`${b.quantity} × ${format(lineMoney(b,s).rate)}`} · {b.taxRate ? `${b.taxRate}% tax ${b.taxInclusion==='inclusive'?'included':'extra'}`:'No tax configured'}</small></div><strong>{format(b.totalPrice)}</strong></article>)}</div>
          {!lines.length && <p>No priced commitments selected. Return to Services if this agreement should carry charges.</p>}
          <button className="mn-link" onClick={p.onBack}>Edit commitments, prices or tax details →</button>
          <div className="mn-discount"><label>Agreement discount<select aria-label="Discount type" value={s.discountType || ''} onChange={e=>patch({discountType:(e.target.value || null) as typeof s.discountType,discountValue:0})}><option value="">No discount</option><option value="percent">Percentage</option><option value="amount">Fixed amount ({s.currency})</option></select></label>{s.discountType && <label>{s.discountType==='percent'?'Discount (%)':'Discount amount'}<input aria-label="Discount value" type="number" min="0" step="0.01" max={s.discountType==='percent'?100:totals.baseSubtotal} value={Number.isFinite(s.discountValue)?s.discountValue:''} onChange={e=>patch({discountValue:e.target.value===''?NaN:Number(e.target.value)})}/></label>}</div>
          <p className="mn-note">Discount applies proportionally before tax. It does not change your catalogue or line prices.</p>
          <dl className="mn-totals"><div><dt>Subtotal before tax</dt><dd>{format(totals.baseSubtotal)}</dd></div><div><dt>Agreement discount</dt><dd>− {format(totals.discountTotal)}</dd></div><div><dt>Tax after discount</dt><dd>{format(totals.taxTotal)}</dd></div>{totals.taxBreakdown.map(t=><div className="mn-tax" key={`${t.tax_rate_id}:${t.name}:${t.rate}`}><dt>{t.name} · {t.rate}%</dt><dd>{format(t.amount)}</dd></div>)}{Number.isFinite(rounding)&&rounding!==0&&<div><dt>Line rounding adjustment</dt><dd>{rounding<0?'− ':'+ '}{format(Math.abs(rounding))}</dd></div>}<div className="mn-grand"><dt>Contract total</dt><dd>{format(totals.grandTotal)}</dd></div></dl>
        </section>
        <section className="ag-card"><h2>When does the money move?</h2><p>{perspective==='expense'?'How will you pay your provider?':'How should your customer or partner pay?'}</p>
          <div className="mn-cycle-options" role="group" aria-label="Billing organisation">{[{id:'mixed',title:'Each line has its own cycle'},{id:'unified',title:'Use one cycle for all priced lines'}].map(o=><button key={o.id} aria-pressed={s.billingCycleType===o.id} onClick={()=>patch({billingCycleType:o.id as 'mixed'|'unified'})}>{o.title}{s.billingCycleType===o.id&&<Check size={16}/>}</button>)}</div>
          {s.billingCycleType==='unified'&&!!lines.length&&<label>Shared billing cycle<select aria-label="Shared billing cycle" value={commonValue} onChange={e=>updateCycle(e.target.value)}><option value="" disabled>Choose a shared cycle</option>{common.map(id=><option key={id} value={id}>{cycleNames[id]}</option>)}</select>{common.length===0&&<small>These catalogue rate cards have no common cycle. Keep individual cycles.</small>}</label>}
          <div className="mn-plans" role="group" aria-label="Payment plan">{selectedPlan.map(o=><button key={o.id} disabled={!o.allowed} aria-pressed={s.paymentMode===o.id} onClick={()=>patch({paymentMode:o.id as typeof s.paymentMode})}><o.icon size={20}/><strong>{o.title}</strong><span>{o.description}</span>{s.paymentMode===o.id&&o.allowed&&<Check className="mn-tick" size={17}/>}</button>)}</div>
          {s.paymentMode==='emi'&&<label>Number of monthly instalments *<input aria-label="Number of monthly instalments" type="number" min="2" max={Math.floor(termMonths(s))} step="1" value={Number.isFinite(s.emiMonths)?s.emiMonths:''} onChange={e=>patch({emiMonths:e.target.value===''?NaN:Number(e.target.value)})}/><small>The final instalment absorbs rounding. The total stays {format(totals.grandTotal)}.</small></label>}
          {s.paymentMode==='defined'&&<div className="mn-schedules">{lines.map(b=>{
            const cad = b.config?.cadencePricing && getCadenceCycle(b.cycle);
            const math = cad ? cadenceTermMath(lineMoney(b,s).rate,termMonths(s),cad.monthsPerPeriod,b.config?.cadenceFinalPayment) : null;
            const issue = result.itemIssues.find(i=>i.id===b.id);
            return <article id={`money-item-${b.id}`} className="mn-schedule" data-error={!!issue} key={b.id}><div className="mn-heading"><div><strong>{b.name}</strong><p>{b.coverageTypeName || 'Agreement-wide'}</p></div><span>{format(b.totalPrice)}<small>before agreement discount</small></span></div>
              {issue&&<div className="mn-item-error" role="alert"><strong>Payment schedule needs attention</strong><dl><div><dt>Expected after discount & tax</dt><dd>{format(issue.expected)}</dd></div><div><dt>Scheduled payments</dt><dd>{format(issue.scheduled)}</dd></div><div><dt>{issue.difference>=0?'Not yet scheduled':'Scheduled above the agreed amount'}</dt><dd>{format(Math.abs(issue.difference))}</dd></div></dl><p>{issue.payments<issue.expectedPayments?`Only ${issue.payments} of ${issue.expectedPayments} payments fit the contract term. `:''}Review this item’s billing cycle below, or its quantity and delivery frequency in Services. The amount has not been changed automatically.</p><button className="mn-link" onClick={p.onBack}>Review commitment in Services →</button></div>}
              {s.billingCycleType!=='unified'&&<label>Billing cycle<select aria-label={`Billing cycle for ${b.name}`} value={b.cycle} onChange={e=>updateCycle(e.target.value,b.id)}><option value="" disabled>Choose cycle</option>{allowedCycles(b,s).map(id=><option key={id} value={id}>{cycleNames[id]}</option>)}</select></label>}
              {b.cycle==='custom'&&<label>Days between payments *<input aria-label={`Custom cycle for ${b.name}`} type="number" min="1" step="1" value={b.customCycleDays ?? ''} onChange={e=>patch({selectedBlocks:s.selectedBlocks.map(x=>x.id===b.id?{...x,customCycleDays:e.target.value===''?undefined:Number(e.target.value)}:x)})}/></label>}
              {!['prepaid','postpaid'].includes(b.cycle)&&!cad&&<label>Payment timing *<select aria-label={`Payment timing for ${b.name}`} value={s.perBlockPaymentType[b.id] || ''} onChange={e=>patch({perBlockPaymentType:{...s.perBlockPaymentType,[b.id]:e.target.value as 'prepaid'|'postpaid'}})}><option value="" disabled>Choose payment timing</option><option value="prepaid">At the start of each period</option><option value="postpaid">At the end of each period</option></select></label>}
              {math&&<p className="mn-note">Catalogue rate card · {math.fullPayments} full payments{math.remMonths?` + a final payment covering ${math.remMonths} remaining months`:''}. No second instalment plan is added.</p>}
              {!!math?.remMonths&&<label>Final payment before tax ({s.currency})<input aria-label={`Final payment for ${b.name}`} type="number" min="0" step="0.01" value={math.finalPayment} onChange={e=>{const updated={...b,config:{...b.config,cadenceFinalPayment:e.target.value===''?NaN:Number(e.target.value)}};patch({selectedBlocks:s.selectedBlocks.map(x=>x.id===b.id?{...updated,totalPrice:lineMoney(updated,s).total}:x)});}}/><small>Suggested by the existing rate card: {format(math.suggestedFinal)}. You can adjust this agreement’s final payment.</small></label>}
            </article>;
          })}</div>}
        </section>
        <section className="ag-card"><div className="mn-heading"><h2>Your payment preview</h2>{errors.length===0&&<span className="ag-badge">{events.length} events</span>}</div><p>Payment events within this contract—not invoices issued now. Dates follow the existing contract scheduling rules. The final payment absorbs any cent-rounding remainder.</p>
          {errors.length>0?<p className="mn-note">Complete the payment choices below before a reliable preview can be shown.</p>:<><div className="mn-preview">{events.map(e=><div key={e.id}><time>{e.scheduled_date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</time><div><strong>{e.block_name}</strong><small>{e.billing_cycle_label}</small></div><strong>{format(e.amount!)}</strong></div>)}</div><div className="mn-reconciled"><Check size={17}/>Payments add up to {format(totals.grandTotal)}</div></>}
        </section>
      </fieldset>
      {errors.length>0&&<section className="ag-card" aria-live="polite" role={attempted?'alert':undefined}><h2>To complete Money</h2><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></section>}
      {(p.error||localError)&&<p className="ag-error" role="alert">{p.error||localError}</p>}
      {saved===snapshot&&<section className="ag-card mn-saved" role="status"><Check/><h2>Money saved.</h2><p>Your prices, discount and payment plan are in this draft. Delivery & acceptance is next. No proposal has been sent, invoice issued or payment collected.</p></section>}
      <details className="ag-mobile-summary"><summary>Your agreement so far</summary>{summary}</details></main><aside>{summary}</aside></div>
    <footer className="ag-footer mn-save-footer"><div className="mn-save-notice" role={notice?.error||changedContext?'alert':'status'} aria-live="polite" data-error={notice?.error||changedContext}>{changedContext?'Not saved in this context. Reopen the draft in the correct workspace and environment.':notice?.text || (p.busy?'Saving your draft…':'Save your progress as a draft. Nothing will be sent.')}</div><div className="mn-save-actions"><button disabled={locked} onClick={p.onBack}><ArrowLeft size={17}/>Services</button><button disabled={locked} onClick={()=>void save(false)}><Save size={17}/>Save draft</button><button className="ag-primary" disabled={locked} onClick={()=>void save(true)}>{saving||p.busy?'Saving…':'Save Money'}</button></div></footer>
  </div>;
}
