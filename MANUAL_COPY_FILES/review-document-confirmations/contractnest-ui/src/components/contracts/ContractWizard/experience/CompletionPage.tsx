import React,{useState} from 'react';
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
 const section:React.CSSProperties={padding:20,border:`1px solid ${c.utility.border}`,borderRadius:12,marginTop:16,textAlign:'left'};
 return <div data-testid="contract-completion" style={{position:'fixed',inset:0,zIndex:70,overflowY:'auto',background:c.utility.primaryBackground,color:c.utility.primaryText,padding:'48px 20px'}}><main style={{maxWidth:620,margin:'auto'}}>
  <small>CONTRACT CONFIRMATION</small><h1 style={{fontSize:30,margin:'12px 0'}}>{result?.id?'Your agreement is recorded.':'Submission needs verification.'}</h1><p>{name}</p>
  <section style={section}><h2 style={{fontSize:18}}>Contract details</h2><dl><dt>Contract number</dt><dd>{result?.contract_number||'Not returned — open the contract to verify'}</dd><dt>Status</dt><dd data-testid="completion-status">{labels[status]||status||'Not returned — open the contract to verify'}</dd></dl>
   <h3>CNAK · Contract access key</h3>{cnak?<><p style={{fontSize:24,fontFamily:'monospace',overflowWrap:'anywhere'}} data-testid="completion-cnak">{cnak}</p><button onClick={()=>void copyCnak()}>{copy}</button></>:<p role="status">{status==='draft'?'This agreement is still a draft. CNAK has not been confirmed.':'The submission response did not include CNAK. Open the contract to check its latest details.'}</p>}
  </section>
  <section style={section}><h2 style={{fontSize:18}}>Acceptance</h2><p>{status==='active'?'The contract is active.':status==='pending_acceptance'?'The contract is awaiting the other party’s acceptance.':status==='draft'?'The contract remains a draft. Its final status transition was not confirmed.':`Recorded status: ${labels[status]||status||'unavailable'}.`}</p></section>
  <section style={section}><h2 style={{fontSize:18}}>Payment confirmation</h2>{receipt?<><p>Receipt: <strong>{receipt.receipt_number}</strong></p><p>Recorded amount: <strong>{new Intl.NumberFormat(undefined,{style:'currency',currency:receipt.currency}).format(receipt.amount)}</strong></p><p>Invoice balance: {receipt.balance}</p></>:<p>No payment receipt was returned by this action. Review Money in the contract for payment details.</p>}</section>
  <section style={section}><h2 style={{fontSize:18}}>Messages</h2><p>Message delivery is separate from contract creation. Check notification history in the contract for the delivery outcome.</p></section>
  <div style={{display:'flex',gap:16,marginTop:24,alignItems:'center',flexWrap:'wrap'}}>{result?.id&&<a href={`/contracts/${encodeURIComponent(result.id)}`} style={{background:c.brand.primary,color:textOnBrand(c.brand.primary),padding:'12px 20px',borderRadius:8,textDecoration:'none'}}>Open contract →</a>}<button onClick={onDone}>Done</button></div>
 </main></div>;
}
