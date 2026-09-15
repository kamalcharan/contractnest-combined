import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,CheckCircle2,Save,Send} from 'lucide-react';
import {useTheme} from '@/contexts/ThemeContext';
import {InlineLoader} from '@/components/common/loaders/UnifiedLoader';
import type {ContractWizardState,ContractType} from '../logic/state';
import ReviewSendStep from '../steps/ReviewSendStep';
import {textOnBrand} from '@/pages/experience/model';
import './agreement.css';
import './approved-agreement.css';
import './review.css';

interface Props{state:ContractWizardState;relationship:ContractType;busy:boolean;error:string|null;onSave:()=>Promise<boolean>;onSubmit:()=>Promise<void>;onBack:()=>void;onEdit:(step:'agreement'|'services'|'money'|'delivery'|'events')=>void;onClose:()=>void;}

export default function ReviewPage(p:Props){
 const s=p.state;const {currentTheme,isDarkMode}=useTheme();const c=isDarkMode?currentTheme.darkMode.colors:currentTheme.colors;
 const [ack,setAck]=useState(false);const [saving,setSaving]=useState(false);const [attempted,setAttempted]=useState(false);const navRef=useRef<HTMLElement>(null);
 useEffect(()=>{const nav=navRef.current;if(!nav)return;const active=nav.querySelector<HTMLElement>('[aria-current]');if(active)nav.scrollLeft=Math.max(0,active.offsetLeft-nav.offsetLeft-20);},[]);
 const proposal=s.acceptanceMethod!=='auto';
 const save=async()=>{if(p.busy||saving)return;setSaving(true);try{await p.onSave();}finally{setSaving(false);}};
 const submit=async()=>{setAttempted(true);if(!ack||p.busy)return;await p.onSubmit();};
 return <div className="ag-page" style={{'--ag-brand':c.brand.primary,'--ag-on-brand':textOnBrand(c.brand.primary),'--ag-bg':c.utility.secondaryBackground,'--ag-card':c.utility.primaryBackground,'--ag-text':c.utility.primaryText,'--ag-muted':c.utility.secondaryText,'--ag-border':c.utility.border} as React.CSSProperties}>
  <header className="ag-top"><button className="ag-exit" onClick={p.onClose}>Exit</button><span>ContractNest</span><small>Manual creation · Final review</small></header>
  <nav ref={navRef} className="ag-chapters" aria-label="Creation chapters">{['Agreement','Coverage & services','Money','Delivery & acceptance','Events Preview','Final review'].map((name,i)=><span key={name} aria-current={i===5?'step':undefined}><b>{i+1}</b>{name}</span>)}</nav>
  <main className="rv-main"><div className="ag-intro"><span className="ag-eyebrow">06 · FINAL REVIEW</span><h1>One agreement. Everything connected.</h1><p>Review the document, scope, money and events before changing its status.</p></div>
   <section className="rv-source"><span>Draft</span><b>→</b><strong>{proposal?'Proposal · awaiting response':'Confirmed · no acceptance request'}</strong><small>This action does not record a payment or complete a service.</small></section>
   <section className="rv-document"><ReviewSendStep contractName={s.contractName} contractStatus={s.status} startDate={s.startDate} description={s.description} durationValue={s.durationValue} durationUnit={s.durationUnit} buyerId={s.buyerId} buyerName={s.buyerName} contractType={p.relationship} acceptanceMethod={s.acceptanceMethod} billingCycleType={s.billingCycleType} currency={s.currency} selectedBlocks={s.selectedBlocks} paymentMode={s.paymentMode} emiMonths={s.emiMonths} perBlockPaymentType={s.perBlockPaymentType} selectedTaxRateIds={s.selectedTaxRateIds} nomenclatureName={s.nomenclatureName}/></section>
   <section className="ag-card rv-change"><div><h2>Need to change something?</h2><p>Return to the exact decision. Your saved draft stays intact.</p></div><div>{[['agreement','Agreement'],['services','Services'],['money','Money'],['delivery','Acceptance'],['events','Events']].map(([step,label])=><button key={step} onClick={()=>p.onEdit(step as any)}>{label}</button>)}</div></section>
   <label className="rv-ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/><span><strong>I've reviewed the document, scope, money and events.</strong><small>{proposal?'Create a proposal awaiting the other party\'s response.':'Confirm without requesting acceptance.'}</small></span></label>
   {attempted&&!ack&&<p className="ag-error" role="alert">Confirm that you have reviewed this agreement before continuing.</p>}{p.error&&<p className="ag-error" role="alert">{p.error}</p>}
  </main>
  <footer className="ag-footer mn-save-footer"><div className="mn-save-notice" role="status">Nothing is sent until you use the explicit final action.</div><div className="mn-save-actions"><button disabled={p.busy||saving} onClick={p.onBack}><ArrowLeft size={17}/>Events</button><button disabled={p.busy||saving} onClick={()=>void save()}><Save size={17}/>Save draft</button><button className="ag-primary" disabled={p.busy||saving} onClick={()=>void submit()}>{p.busy?<InlineLoader text={proposal?'Creating proposal…':'Confirming…'}/>:<><span>{proposal?'Create proposal':'Confirm agreement'}</span>{proposal?<Send size={17}/>:<CheckCircle2 size={17}/>}</>}</button></div></footer>
 </div>;
}
