import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Check,FileText,Save,X,CalendarDays,Wrench,CreditCard} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {useTheme} from '@/contexts/ThemeContext';
import {useVaNiToast} from '@/components/common/toast/VaNiToast';
import {InlineLoader} from '@/components/common/loaders/UnifiedLoader';
import EventScheduleAdjuster from '@/components/contracts/EventScheduleAdjuster';
import {findHolidayConflicts,isHolidayDate} from '@/utils/service-contracts/holidayResolver';
import type {ContractEvent} from '@/utils/service-contracts/contractEvents';
import {textOnBrand} from '@/pages/experience/model';
import type {ContractWizardState,ContractType} from '../logic/state';
import {serviceErrors} from './ServicesCatalog';
import {eventDay,parseEventDay,eventPreview,eventsSignature} from './eventsModel';
import {useEventCalendar} from './useEventCalendar';
import './agreement.css';
import './approved-agreement.css';
import './money.css';
import './events.css';

interface Props {
  state:ContractWizardState;relationship:ContractType;busy:boolean;error:string|null;
  onChange:(patch:Partial<ContractWizardState>)=>void;onSave:()=>Promise<boolean>;onContinue:()=>void;onBack:()=>void;onEditServices:()=>void;onClose:()=>void;
}
export default function EventsPage(p:Props) {
  const s=p.state;const {currentTheme,isDarkMode}=useTheme();const c=isDarkMode?currentTheme.darkMode.colors:currentTheme.colors;
  const {currentTenant,isLive,perspective}=useAuth();const {addToast}=useVaNiToast();
  const context=JSON.stringify([currentTenant?.id,isLive,perspective,s.buyerId]);const [initialContext]=useState(context);
  const changedContext=context!==initialContext||!currentTenant?.id||!s.buyerId;
  const [saving,setSaving]=useState(false);const savingRef=useRef(false);const locked=p.busy||saving||changedContext;
  const [notice,setNotice]=useState('Save your preview to this draft. Nothing will be sent.');const [saveError,setSaveError]=useState('');
  const [saved,setSaved]=useState<string|null>(null);const [attempted,setAttempted]=useState(false);
  const [filter,setFilter]=useState<'all'|'service'|'billing'>('all');const [visibleDays,setVisibleDays]=useState(25);
  const navRef=useRef<HTMLElement>(null);
  useEffect(()=>{const nav=navRef.current;if(!nav)return;const align=()=>{const active=nav.querySelector<HTMLElement>('[aria-current]');if(active)nav.scrollLeft=Math.max(0,active.offsetLeft-nav.offsetLeft-20);};align();const observer=new ResizeObserver(align);observer.observe(nav);return()=>observer.disconnect();},[]);
  const preview=useMemo(()=>eventPreview(s),[s]);
  const calendar=useEventCalendar(currentTenant?.id,isLive,!changedContext);
  const signature=eventsSignature(s,calendar.data);
  const reviewed=!!calendar.data&&s.eventsReview?.signature===signature;
  const kept=Array.isArray(s.eventsReview?.keptHolidayKeys)?s.eventsReview.keptHolidayKeys:[];
  const conflicts=useMemo(()=>findHolidayConflicts(preview.events,calendar.data),[preview.events,calendar.data]);
  const conflictKey=(id:string,date:Date)=>`${id}|${eventDay(date)}`;
  const activeConflicts=conflicts.filter(x=>!kept.includes(conflictKey(x.eventId,x.date)));
  const errors=[...new Set([...preview.errors,...serviceErrors(s.selectedBlocks,s.currency,s.coverageTypes)])];
  if(calendar.isFetching||calendar.isPending)errors.push('Wait for the workspace holiday check to finish.');
  else if(calendar.isError)errors.push('Retry the workspace holiday calendar. No calendar has been assumed.');
  if(activeConflicts.length)errors.push(`Review ${activeConflicts.length} holiday conflict${activeConflicts.length===1?'':'s'}: move the event or explicitly keep its date.`);
  const snapshot=JSON.stringify(s);
  const fmt=(d:Date)=>Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Date needs review';
  const money=(n:number)=>{if(!Number.isFinite(n))return 'Amount needs review';try{return new Intl.NumberFormat(undefined,{style:'currency',currency:s.currency}).format(n);}catch{return 'Currency required';}};
  const dirty=()=>{setSaved(null);setNotice('Unsaved changes');setSaveError('');};
  const changeOverrides=(values:Record<string,Date>)=>{
    if(locked)return;dirty();const normalized:Record<string,Date>={};
    for(const [id,date] of Object.entries(values)){const e=preview.computed.find(x=>x.id===id);normalized[id]=e?parseEventDay(eventDay(date),e.original_date):date;}
    p.onChange({eventOverrides:normalized,eventsReview:{keptHolidayKeys:kept}});
  };
  const reset=(id:string)=>{const next={...s.eventOverrides};delete next[id];changeOverrides(next);};
  const canShift=(d:Date)=>Number.isFinite(d.getTime())&&d>=s.startDate&&d<=preview.end&&!isHolidayDate(d,calendar.data);
  const shiftAll=()=>{
    if(!calendar.data||locked)return;
    const next={...s.eventOverrides};for(const h of activeConflicts){const d=calendar.data.default_shift==='previous'?h.prevDate:h.nextDate;if(!canShift(d))return;next[h.eventId]=d;}changeOverrides(next);
  };
  const save=async(complete:boolean)=>{
    if(locked||savingRef.current)return;setAttempted(complete);setSaveError('');setSaved(null);
    if(preview.invalidOverrides||(complete&&(errors.length||!reviewed))){setSaveError(`Not saved. ${preview.invalidOverrides?'Enter or reset the invalid date before saving.':errors[0]||'Confirm that you have checked the service and payment dates.'}`);return;}
    savingRef.current=true;setSaving(true);setNotice('Saving your draft…');
    try{if(!(await p.onSave()))throw new Error('Unconfirmed save');setSaved(complete?snapshot:null);setNotice('Saved to draft');addToast({type:'success',title:complete?'Events Preview saved':'Draft saved',message:'No appointments, invoices or payments have been created.'});if(complete)p.onContinue();}
    catch{const message='Save was not confirmed. Your changes are still here. Retry or check Contracts before closing.';setSaveError(message);setNotice('Unsaved changes');addToast({type:'error',title:'Save not confirmed',message});}
    finally{savingRef.current=false;setSaving(false);}
  };
  const shown=preview.events.filter(e=>filter==='all'||e.event_type===filter);
  const groups=new Map<string,ContractEvent[]>();for(const e of shown){const day=eventDay(e.scheduled_date);groups.set(day,[...(groups.get(day)||[]),e]);}
  const dates=[...groups.entries()];
  const card=(e:ContractEvent)=>{
    const block=s.selectedBlocks.find(b=>b.id===e.block_id);const issue=preview.issues.find(x=>x.id===e.id);const holiday=conflicts.find(h=>h.eventId===e.id);
    const holidayKept=holiday&&kept.includes(conflictKey(e.id,holiday.date));
    return <article key={e.id} className={`ev-card ev-${e.event_type}`} data-error={!!issue}>
      <span className="ev-kind">{e.event_type==='service'?<Wrench size={15}/>:<CreditCard size={15}/>} {e.event_type==='service'?'Service event':'Payment event'}</span>
      <h3>{e.block_name}</h3><p>{block?.coverageTypeName||(block?.coverageTypeId?'Coverage name unavailable':'Agreement-wide')}</p>
      <small>{e.sequence_number} of {e.total_occurrences}{e.billing_cycle_label?` · ${e.billing_cycle_label}`:''}</small>
      {e.event_type==='billing'&&<strong className="ev-amount">{money(e.amount!)}</strong>}
      <label htmlFor={`date-${e.id}`}>Scheduled date<input id={`date-${e.id}`} aria-label={`Date for ${e.block_name} ${e.event_type} ${e.sequence_number}`} type="date" min={eventDay(s.startDate)} max={eventDay(preview.end)} value={eventDay(e.scheduled_date)} aria-invalid={!!issue} onChange={x=>changeOverrides({...s.eventOverrides,[e.id]:parseEventDay(x.target.value,e.original_date)})}/></label>
      {!!s.eventOverrides[e.id]&&<div className="ev-adjusted"><span>Adjusted · originally {fmt(e.original_date)}</span><button onClick={()=>reset(e.id)} aria-label={`Reset ${e.block_name} ${e.event_type} ${e.sequence_number}`}>Reset</button></div>}
      {issue&&<p className="ag-error" role="alert">{issue.message}</p>}
      {holiday&&<div className="ev-holiday"><strong>{holiday.reason}{holidayKept?' · kept by you':''}</strong>{!holidayKept&&<><p>Move to a working day, or keep this date.</p><div className="ev-holiday-actions"><button disabled={!canShift(holiday.prevDate)} onClick={()=>changeOverrides({...s.eventOverrides,[e.id]:holiday.prevDate})}>Earlier · {fmt(holiday.prevDate)}</button><button disabled={!canShift(holiday.nextDate)} onClick={()=>changeOverrides({...s.eventOverrides,[e.id]:holiday.nextDate})}>Later · {fmt(holiday.nextDate)}</button><button onClick={()=>{if(locked)return;dirty();p.onChange({eventsReview:{keptHolidayKeys:[...kept,conflictKey(e.id,holiday.date)]}});}}>Keep this date</button></div></>}{holidayKept&&<button onClick={()=>{if(locked)return;dirty();p.onChange({eventsReview:{keptHolidayKeys:kept.filter(k=>k!==conflictKey(e.id,holiday.date))}});}}>Review holiday choice</button>}</div>}
    </article>;
  };
  return <div className="ag-page mn-page ev-page" style={{'--ag-bg':c.utility.primaryBackground,'--ag-panel':c.utility.secondaryBackground,'--ag-text':c.utility.primaryText,'--ag-muted':c.utility.secondaryText,'--ag-line':`${c.utility.primaryText}22`,'--ag-brand':c.brand.primary,'--ag-onbrand':textOnBrand(c.brand.primary),'--ag-error':c.semantic.error,'--ev-service':c.semantic.success,'--ev-payment':c.semantic.warning} as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>Build your commitments</span></div><div><span role="status">Draft · {saving?'Saving…':notice}</span><button aria-label="Close Events Preview" disabled={p.busy||saving} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav ref={navRef} className="ag-chapters" aria-label="Creation chapters">{['Agreement','Coverage & services','Money','Delivery & acceptance','Events Preview','Final review'].map((name,i)=><span key={name} aria-current={i===4?'step':undefined}><b>{i+1}</b>{name}</span>)}</nav>
    <main className="ev-main"><div className="ag-intro"><span className="ag-eyebrow">05 · EVENTS PREVIEW</span><h1>See the whole commitment unfold.</h1><p>Service days and payment days, together within this contract.</p></div>
      {changedContext&&<p role="alert" className="ag-error">Workspace, environment, perspective or contact changed. Reopen the draft in the correct context before editing.</p>}
      <fieldset className="ag-fields" disabled={locked}><section className="ag-card ev-shell"><div className="ev-heading"><div><h2>{s.contractName}</h2><p>{s.buyerName} · {p.relationship} contract</p><p>Schedule window: {fmt(s.startDate)} → {fmt(preview.end)} · {money(preview.total)}</p></div><span className="ag-badge">Contract event preview</span></div>
        <p className="ev-note">A service event is not an appointment; a payment event is not a collected payment. No execution actions are available during preparation.</p>
        <details className="ev-rules"><summary>How are these dates calculated?</summary><p className="mn-note">This preview uses the contract scheduling rules. Month-based terms use 30-day periods; year-based terms use 365 days. Each service and payment keeps its configured cycle. Adjustments below change dates, not prices or the agreement term.</p></details>
        <div className="ev-tabs" role="group" aria-label="Event filters">{(['all','service','billing'] as const).map(k=><button key={k} aria-pressed={filter===k} onClick={()=>{setFilter(k);setVisibleDays(25);}}>{k==='all'?'All events':k==='service'?'Services':'Payments'} · {preview.events.filter(e=>k==='all'||e.event_type===k).length}</button>)}</div>
        <div className="ev-calendar">{calendar.isFetching?<InlineLoader text="Checking workspace holidays…"/>:calendar.isError?<div role="alert"><p>The workspace holiday calendar could not load. No holiday defaults have been assumed.</p><button onClick={()=>void calendar.refetch()}>Retry holiday calendar</button></div>:<><span>{activeConflicts.length?`${activeConflicts.length} service dates need a holiday decision`:'Holiday check complete'}</span><button onClick={()=>void calendar.refetch()}>Refresh holiday calendar</button>{activeConflicts.length>0&&<button disabled={!calendar.data||activeConflicts.some(h=>!canShift(calendar.data!.default_shift==='previous'?h.prevDate:h.nextDate))} onClick={shiftAll}>Move all to {calendar.data?.default_shift==='previous'?'previous':'next'} working day</button>}</>}</div>
        {!!preview.computed.length&&<details className="ev-bulk"><summary>Adjust several dates</summary><p className="mn-note">Existing bulk controls. Changes stay in this draft; dates outside the schedule window must be corrected before completing the preview.</p><EventScheduleAdjuster events={preview.computed} eventOverrides={s.eventOverrides} onEventOverridesChange={changeOverrides}/></details>}
        {!!preview.orphanOverrides.length&&<div className="ag-error" role="alert"><strong>Obsolete date adjustments</strong><p>A commitment changed, so these saved adjustments no longer match an event.</p>{preview.orphanOverrides.map(id=><div className="ev-obsolete" key={id}><code>{id}</code><button onClick={()=>reset(id)}>Remove adjustment</button></div>)}</div>}
        <div className="ev-legend" aria-hidden="true"><span>Service & delivery</span><span>Date</span><span>Billing & payments</span></div>
        <div className="ev-timeline">{dates.slice(0,visibleDays).map(([day,items])=><section className="ev-group" key={day} aria-label={fmt(items[0].scheduled_date)}><div className="ev-lane ev-service-lane">{items.filter(e=>e.event_type==='service').map(card)}</div><time className="ev-date" dateTime={day||undefined}>{day?<><strong>{items[0].scheduled_date.getDate()}</strong><small>{items[0].scheduled_date.toLocaleDateString(undefined,{month:'short',year:'numeric'})}</small></>:'Review date'}</time><div className="ev-lane ev-payment-lane">{items.filter(e=>e.event_type==='billing').map(card)}</div></section>)}</div>
        {!shown.length&&<p className="ev-empty">{preview.errors.length?'The schedule needs attention. Review the issues below.':'No dated events match this filter. Ongoing and shared-session commitments remain in the agreement.'}</p>}
        {dates.length>visibleDays&&<button className="ev-more" onClick={()=>setVisibleDays(n=>n+25)}>Show more dates ({visibleDays} of {dates.length} shown)</button>}
        {s.selectedBlocks.filter(b=>b.unlimited||b.categoryId==='session').map(b=><div className="ev-ongoing" key={b.id}><strong>{b.name}</strong><p>{b.categoryId==='session'?'Group Session · occurrences belong to the shared session schedule, not duplicate service events in each contract.':'Ongoing commitment · no fixed service occurrences are generated. Any scheduled payments remain in the payment lane.'}</p></div>)}
        <div className="ev-end"><CalendarDays size={18}/>Schedule window ends {fmt(preview.end)}</div>
        <label className="ev-ack"><input type="checkbox" checked={reviewed} disabled={errors.length>0} onChange={e=>{dirty();p.onChange({eventsReview:{signature:e.target.checked?signature:undefined,keptHolidayKeys:kept}});}}/><span>I’ve checked the service and payment dates.<small>Changing this agreement or its dates requires a fresh review.</small></span></label>
      </section></fieldset>
      {!!errors.length&&<section className="ag-card" role={attempted?'alert':undefined}><h2>Before completing Events Preview</h2><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul>{errors.some(e=>e.includes('visits need a delivery interval'))&&<button onClick={p.onEditServices}>Fix service schedule in Services →</button>}</section>}
      {p.error&&<p role="alert" className="ag-error">{p.error}</p>}
      {saved===snapshot&&<section className="ag-card mn-saved" role="status"><Check/><h2>Events Preview saved.</h2><p>Your date adjustments and review confirmation are in this draft. Nothing has been sent or activated.</p></section>}
    </main><footer className="ag-footer mn-save-footer"><div className="mn-save-notice" role={saveError?'alert':'status'} data-error={!!saveError}>{saveError||notice}</div><div className="mn-save-actions"><button disabled={locked} onClick={p.onBack}><ArrowLeft size={17}/>Delivery</button><button disabled={locked} onClick={()=>void save(false)}><Save size={17}/>Save draft</button><button className="ag-primary" disabled={locked} onClick={()=>void save(true)}>{saving||p.busy?<InlineLoader text="Saving…"/>:'Continue to Final review'}</button></div></footer>
  </div>;
}
