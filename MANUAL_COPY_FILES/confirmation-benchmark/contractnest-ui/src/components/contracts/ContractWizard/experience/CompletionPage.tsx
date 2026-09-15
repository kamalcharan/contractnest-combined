import React,{useState} from 'react';
import {CheckCircle2, Clock3, AlertCircle, KeyRound, Copy, ArrowRight, CreditCard, Bell} from 'lucide-react';
import './completion.css';
import {useTheme} from '@/contexts/ThemeContext';
import type {RecordPaymentResponse} from '@/types/contracts';
import {textOnBrand} from '@/pages/experience/model';
interface Props{result:Record<string,any>|null;receipt:RecordPaymentResponse|null;name:string;onDone:()=>void;}
export default function CompletionPage({result,receipt,name,onDone}:Props){
 const {currentTheme,isDarkMode}=useTheme();const c=isDarkMode?currentTheme.darkMode.colors:currentTheme.colors;
 const [copy,setCopy]=useState('Copy CNAK');
 const cnak=typeof result?.global_access_id==='string'?result.global_access_id:'';
 const status=typeof result?.status==='string'?result.status:'';
 const labels:Record<string,string>={draft:'Draft',pending_acceptance:'Awaiting acceptance',active:'Active',accepted:'Accepted',pending_review:'Pending review',cancelled:'Cancelled'};
 const copyCnak=async()=>{try{await navigator.clipboard.writeText(cnak);setCopy('Copied');}catch{setCopy('Copy failed — select the CNAK above');}};
 const active=status==='active'||status==='accepted';
 const warning=!result?.id||!status||status==='draft'||status==='cancelled';
 const tone=active?c.semantic.success:warning?c.semantic.warning:c.brand.primary;
 const section:React.CSSProperties={background:c.utility.surface,border:`1px solid ${c.utility.border}`,borderRadius:16,textAlign:'left'};
 return <div className="cn-completion" data-testid="contract-completion" style={{'--cc-accent':c.brand.primary,'--cc-muted':c.utility.secondaryText,'--cc-border':c.utility.border,position:'fixed',inset:0,zIndex:70,overflowY:'auto',background:c.utility.primaryBackground,color:c.utility.primaryText} as React.CSSProperties}><main>
  <div className="cc-seal" style={{color:tone,borderColor:tone,background:`${tone}12`}}>{active?<CheckCircle2 size={42}/>:warning?<AlertCircle size={42}/>:<Clock3 size={42}/>}</div>
  <small className="cc-eyebrow">CONTRACT CONFIRMATION</small><h1>{active?'Your contract is active!':warning?'Let’s verify your agreement.':'Your agreement is created!'}</h1><p className="cc-subtitle">{name}</p>
  <section className="cc-identity" style={section}><div className="cc-card-heading"><h2>Contract details</h2><span className="cc-status" style={{color:tone,background:`${tone}12`,borderColor:tone}} data-testid="completion-status">{labels[status]||status||'Status not confirmed'}</span></div><div className="cc-number">{result?.contract_number||'Contract number not returned — open the contract to verify'}</div>
   <div className="cc-key"><h3><KeyRound size={16}/> CNAK · Contract access key</h3>{cnak?<div className="cc-key-row"><strong data-testid="completion-cnak">{cnak}</strong><button onClick={()=>void copyCnak()}><Copy size={15}/>{copy}</button></div>:<p role="status">{status==='draft'?'This agreement is still a draft. CNAK has not been confirmed.':'The submission response did not include CNAK. Open the contract to check its latest details.'}</p>}</div>
  </section>
  <section className="cc-outcome" style={{...section,borderColor:tone}}><CheckCircle2 size={22} style={{color:tone}}/><div><h2>Acceptance</h2><p>{status==='active'?'The contract is active.':status==='pending_acceptance'?'The contract is awaiting the other party’s acceptance.':status==='draft'?'The contract remains a draft. Its final status transition was not confirmed.':`Recorded status: ${labels[status]||status||'unavailable'}.`}</p></div></section>
  <section className="cc-outcome" style={section}><CreditCard size={22}/><div><h2>{receipt?'Payment recorded':'Payment details'}</h2>{receipt?<><p>Receipt: <strong>{receipt.receipt_number}</strong></p><p>Recorded amount: <strong>{new Intl.NumberFormat(undefined,{style:'currency',currency:receipt.currency}).format(receipt.amount)}</strong></p><p>Invoice balance: {new Intl.NumberFormat(undefined,{style:'currency',currency:receipt.currency}).format(receipt.balance)}</p></>:<p>No receipt returned with this submission. View payment details in your contract.</p>}</div></section>
  <details className="cc-messages"><summary><Bell size={16}/> Notification delivery</summary><p>Check the contract’s notification history to verify message delivery.</p></details>
  <div className="cc-actions">{result?.id&&<a href={`/contracts/${encodeURIComponent(result.id)}`} style={{background:c.brand.primary,color:textOnBrand(c.brand.primary)}}>Open contract <ArrowRight size={18}/></a>}<button onClick={onDone}>Done</button></div>
 </main></div>;
}
