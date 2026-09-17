import React, {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUp,ArrowDown,Check,FileText,Save,X,ShieldCheck,Upload,ClipboardList} from 'lucide-react';
import {useTheme} from '@/contexts/ThemeContext';
import {useAuth} from '@/context/AuthContext';
import {useVaNiToast} from '@/components/common/toast/VaNiToast';
import {InlineLoader} from '@/components/common/loaders/UnifiedLoader';
import {textOnBrand} from '@/pages/experience/model';
import type {ContractWizardState,ContractType} from '../logic/state';
import {useDeliveryData} from './useDeliveryData';
import './agreement.css';
import './approved-agreement.css';
import './money.css';
import './delivery.css';

interface Props {
  state:ContractWizardState; relationship:ContractType; busy:boolean; saveStatus:string; error:string|null;
  onChange:(patch:Partial<ContractWizardState>)=>void; onSave:()=>Promise<boolean>; onBack:()=>void; onClose:()=>void; onContinue:()=>void;
}
const proofChoices = [
  {id:'none',title:'No additional verification',description:'Your team marks the work complete.',icon:ShieldCheck},
  {id:'upload',title:'Photos or documents',description:'Capture proof when the service event is carried out.',icon:Upload},
  {id:'smart_form',title:'A structured completion form',description:'Use a checklist or completion report from your workspace.',icon:ClipboardList},
] as const;
const acceptanceChoices = [
  {id:'signoff',title:'After the other party accepts',description:'Request their acceptance before the agreement becomes active.'},
  {id:'payment',title:'After the acceptance payment',description:'Activation follows the required payment being recorded.'},
  {id:'auto',title:'Activate without requesting acceptance',description:'No acceptance request is required. Final review is still ahead.'},
] as const;
export default function DeliveryPage(p:Props) {
  const s = p.state;
  const chapterNav = useRef<HTMLElement>(null);
  useEffect(()=>{const nav=chapterNav.current;const active=nav?.querySelector<HTMLElement>('[aria-current]');if(nav&&active)nav.scrollLeft=Math.max(0,active.offsetLeft-nav.offsetLeft-24);},[]);
  const {currentTheme,isDarkMode} = useTheme();
  const c = isDarkMode?currentTheme.darkMode.colors:currentTheme.colors;
  const {currentTenant,isLive,perspective} = useAuth();
  const {addToast} = useVaNiToast();
  const context = JSON.stringify([currentTenant?.id,isLive,perspective,s.buyerId]);
  const [initialContext] = useState(context);
  const changedContext = context!==initialContext || !currentTenant?.id || !s.buyerId;
  const [saving,setSaving] = useState(false);
  const savingRef = useRef(false);
  const locked = p.busy || saving || changedContext;
  const [notice,setNotice] = useState('Unsaved changes');
  const [saveError,setSaveError] = useState('');
  const [attempted,setAttempted] = useState(false);
  const [saved,setSaved] = useState<string|null>(null);
  const snapshot = JSON.stringify(s);
  const {forms,gateway,contact} = useDeliveryData(currentTenant?.id,isLive,s.buyerId,s.evidencePolicyType==='smart_form',s.acceptanceMethod==='payment',!changedContext);
  const activeForms = (forms.data || []).filter(f=>f.is_active);
  const selected = s.evidenceSelectedForms;
  const validForm = (id:string,version:number) => activeForms.some(f=>f.form_template_id===id&&f.m_form_templates?.version===version);
  const errors:string[] = [];
  if (!proofChoices.some(o=>o.id===s.evidencePolicyType)) errors.push('Choose what proves the work is complete.');
  if (s.evidencePolicyType==='smart_form') {
    if (forms.isPending||forms.isFetching) errors.push('Wait for the workspace forms to finish loading.');
    else if (forms.isError) errors.push('Retry the workspace forms before completing this chapter.');
    else if (selected.some(f=>!validForm(f.form_template_id,f.version))) errors.push('A selected form or version is no longer available. Review the marked form; it has not been replaced.');
    if (!selected.length) errors.push('Select at least one completion form.');
  }
  if (!acceptanceChoices.some(o=>o.id===s.acceptanceMethod)) errors.push('Choose what makes this agreement active.');
  if (s.acceptanceMethod==='payment') {
    if (!Number.isFinite(s.grandTotal)||s.grandTotal<=0) errors.push('Acceptance by payment needs a positive contract total. Review Money.');
    if (gateway.isPending||gateway.isFetching) errors.push('Wait for payment gateway status to finish loading.');
    else if (gateway.isError) errors.push('Retry payment gateway status. A failed lookup is not an offline-payment choice.');
  }
  // The recipient is the contact person chosen in Agreement when there is
  // one; otherwise the contact itself (a corporate contact's own channels are
  // enough — owner decision 2026-09-17). Only a chosen person that has since
  // been removed blocks this chapter.
  const person = contact.data?.contact_persons?.find(x=>x.id===s.buyerContactPersonId);
  const needsPerson = contact.data?.type==='corporate'&&!!s.buyerContactPersonId;
  const recipientMissing = needsPerson&&!person;
  const channels = needsPerson ? person?.contact_channels : contact.data?.contact_channels;
  const emails = (channels || []).filter(x=>x.channel_type==='email');
  const email = emails.find(x=>x.is_primary)?.value || emails[0]?.value;
  if (s.acceptanceMethod&&s.acceptanceMethod!=='auto') {
    if (contact.isPending||contact.isFetching) errors.push('Wait for recipient details to finish loading.');
    else if (contact.isError) errors.push('Retry recipient details before completing this chapter.');
    else if (recipientMissing) errors.push('The contact person chosen in Agreement is no longer on this contact. Return to Agreement to choose the recipient.');
  }
  const patch = (value:Partial<ContractWizardState>) => {
    if (locked) return;
    setSaved(null);setNotice('Unsaved changes');setSaveError('');p.onChange(value);
  };
  const reorder = (index:number,delta:number) => {
    const next = [...selected]; [next[index],next[index+delta]]=[next[index+delta],next[index]];
    patch({evidenceSelectedForms:next.map((f,i)=>({...f,sort_order:i+1}))});
  };
  const save = async(complete:boolean) => {
    if (locked||savingRef.current) return;
    setAttempted(complete);setSaveError('');setSaved(null);
    if (complete&&errors.length) {setSaveError(`Not saved. ${errors[0]}`);document.getElementById('delivery-validation')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    savingRef.current=true;setSaving(true);setNotice('Saving your draft…');
    try {
      if (!(await p.onSave())) throw new Error('Save not confirmed');
      setSaved(complete?snapshot:null);setNotice('Saved to draft');
      if (complete) p.onContinue();
      addToast({type:'success',title:complete?'Delivery & acceptance saved':'Draft saved',message:'Nothing has been sent or activated.'});
    } catch {
      const message='Save was not confirmed. Your changes are still here. Retry or check Contracts before closing.';
      setSaveError(message);setNotice('Unsaved changes');addToast({type:'error',title:'Save not confirmed',message});
    } finally {savingRef.current=false;setSaving(false);}
  };
  const summary = <><span className="ag-eyebrow">YOUR AGREEMENT</span><h2>{s.contractName}</h2><span className={`ag-badge ag-${p.relationship}`}>{p.relationship} contract</span><dl><dt>With</dt><dd>{s.buyerName}</dd><dt>Completion proof</dt><dd>{proofChoices.find(o=>o.id===s.evidencePolicyType)?.title || 'Not selected'}</dd>{s.evidencePolicyType==='smart_form'&&<><dt>Forms in order</dt><dd>{selected.length?selected.map(f=>f.name).join(' → '):'Choose a form'}</dd></>}<dt>Becomes active</dt><dd>{acceptanceChoices.find(o=>o.id===s.acceptanceMethod)?.title || 'Not selected'}</dd></dl><div className="ag-assurance"><Check size={16}/>Manual creation · no VaNi credits</div></>;
  return <div className="ag-page mn-page dl-page" style={{'--ag-bg':c.utility.primaryBackground,'--ag-panel':c.utility.secondaryBackground,'--ag-text':c.utility.primaryText,'--ag-muted':c.utility.secondaryText,'--ag-line':`${c.utility.primaryText}22`,'--ag-brand':c.brand.primary,'--ag-onbrand':textOnBrand(c.brand.primary),'--ag-error':c.semantic.error} as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>Build your commitments</span></div><div><span>Draft · {saving?'Saving…':notice}</span><button aria-label="Close Delivery" disabled={p.busy||saving} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav ref={chapterNav} className="ag-chapters" aria-label="Creation chapters">{['Agreement','Coverage & services','Money','Delivery & acceptance','Events Preview','Final review'].map((name,i)=><span key={name} aria-current={i===3?'step':undefined}><b>{i+1}</b>{name}</span>)}</nav>
    <div className="ag-layout"><main><div className="ag-intro"><span className="ag-eyebrow">04 · DELIVERY & ACCEPTANCE</span><h1>Agree how the work comes to life.</h1><p>Clear proof. Clear acceptance. One shared understanding.</p></div>
      {changedContext&&<p role="alert" className="ag-error">Workspace, environment, perspective or contact changed. Reopen the draft in the correct context before editing.</p>}
      <fieldset className="ag-fields" disabled={locked}>
        <section className="ag-card"><h2>What counts as completed work?</h2><p>Choose the proof needed when a service event is carried out.</p>
          <div className="dl-choices" role="group" aria-label="Completion proof">{proofChoices.map(o=><button key={o.id} aria-pressed={s.evidencePolicyType===o.id} onClick={()=>patch({evidencePolicyType:o.id})}><o.icon size={23}/><span><strong>{o.title}</strong><small>{o.description}</small></span>{s.evidencePolicyType===o.id&&<Check size={20}/>}</button>)}</div>
          {s.evidencePolicyType==='upload'&&<p className="dl-note">Evidence is uploaded during service execution—not while creating this draft.</p>}
          {s.evidencePolicyType==='smart_form'&&<div className="dl-form-library"><h3>Completion forms from your workspace *</h3><p>Choose the forms and the order in which the team completes them.</p>
            {forms.isFetching?<InlineLoader text="Loading workspace forms…"/>:forms.isError?<div role="alert"><p>Workspace forms could not load. Saved selections are retained.</p><button onClick={()=>void forms.refetch()}>Retry forms</button></div>:<>{!activeForms.length&&<p>No active forms selected in this workspace. Add them in Settings → Smart Forms, then refresh.</p>}<button className="mn-link" onClick={()=>void forms.refetch()}>Refresh workspace forms</button><div className="dl-library">{activeForms.map(f=>{
              const t=f.m_form_templates;const usable=!!t?.name&&Number.isInteger(t.version)&&t.version>0;const picked=selected.some(x=>x.form_template_id===f.form_template_id);
              return <label key={f.id}><input type="checkbox" disabled={!usable} checked={picked} onChange={()=>patch({evidenceSelectedForms:picked?selected.filter(x=>x.form_template_id!==f.form_template_id).map((x,i)=>({...x,sort_order:i+1})):[...selected,{form_template_id:f.form_template_id,name:t!.name,version:t!.version,category:t!.category,sort_order:selected.length+1}]})}/><span><strong>{t?.name || 'Form details unavailable'}</strong><small>{usable?`Version ${t!.version} · ${t!.category}`:'This form cannot be selected until its details are repaired.'}</small></span></label>;
            })}</div></>}
            {!!selected.length&&<ol className="dl-selected">{selected.map((f,i)=><li key={f.form_template_id}><div><strong>{i+1}. {f.name}</strong><small>Version {f.version}</small>{forms.isSuccess&&!validForm(f.form_template_id,f.version)&&<p className="ag-error" role="alert">This form/version is unavailable. Remove it or explicitly choose the current version.</p>}</div><div className="dl-form-actions"><button aria-label={`Move ${f.name} up`} disabled={i===0} onClick={()=>reorder(i,-1)}><ArrowUp size={16}/></button><button aria-label={`Move ${f.name} down`} disabled={i===selected.length-1} onClick={()=>reorder(i,1)}><ArrowDown size={16}/></button><button aria-label={`Remove ${f.name}`} onClick={()=>patch({evidenceSelectedForms:selected.filter((_,n)=>n!==i).map((x,n)=>({...x,sort_order:n+1}))})}><X size={16}/></button></div></li>)}</ol>}
          </div>}
          {s.evidencePolicyType!=='smart_form'&&!!selected.length&&<p className="dl-note">Your {selected.length} form selections are retained if you switch back. They are not required under this proof policy.</p>}
        </section>
        <section className="ag-card"><h2>What makes this agreement active? *</h2><p>This sets the rule for final review. Saving this page does not activate the agreement.</p><div className="dl-choices" role="group" aria-label="Acceptance rule">{acceptanceChoices.map(o=><button key={o.id} aria-pressed={s.acceptanceMethod===o.id} onClick={()=>patch({acceptanceMethod:o.id})}><span><strong>{o.title}</strong><small>{o.description}</small></span>{s.acceptanceMethod===o.id&&<Check size={20}/>}</button>)}</div>
          {s.acceptanceMethod==='auto'?<p className="dl-note">No acceptance request will be made under this rule. Activation does not mean payment was received. Your contract remains a draft until final review.</p>:s.acceptanceMethod&&<div className="dl-recipient"><h3>Acceptance contact</h3>{contact.isFetching?<InlineLoader text="Loading recipient details…"/>:contact.isError?<div role="alert"><p>Recipient details could not load.</p><button onClick={()=>void contact.refetch()}>Retry recipient</button></div>:<><strong>{needsPerson?person?.name || 'Selected person unavailable':s.buyerName}</strong><p>{email || 'No email on this contact. Add one in Contacts before sending by email.'}</p><small>From the recipient chosen in Agreement. No separate copy of their contact details is created here.</small></>}</div>}
          {s.acceptanceMethod==='payment'&&<div className="dl-note">{gateway.isFetching?<InlineLoader text="Checking payment gateway…"/>:gateway.isError?<div role="alert"><p>Payment gateway status could not be checked. Offline payment has not been assumed.</p><button onClick={()=>void gateway.refetch()}>Retry gateway status</button></div>:gateway.data?<><strong>{gateway.data.connected?'Online payment gateway connected':'No connected payment gateway'}</strong><p>{gateway.data.connected?'The existing payment flow will handle acceptance payment after final review.':'The existing offline payment flow is available. Payment must be recorded through that flow before activation.'}</p></>:null}<small>No payment is taken when saving this draft.</small></div>}
        </section>
      </fieldset>
      {!!errors.length&&<section id="delivery-validation" className="ag-card" role={attempted?'alert':undefined}><h2>To complete Delivery & acceptance</h2><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></section>}
      {p.error&&<p className="ag-error" role="alert">{p.error}</p>}
      {saved===snapshot&&<section className="ag-card mn-saved" role="status"><Check/><h2>Delivery & acceptance saved.</h2><p>Your proof policy, form order and acceptance rule are in this draft. Nothing has been sent or activated.</p><p>Next: review the service and payment dates.</p></section>}
      <details className="ag-mobile-summary"><summary>Your agreement so far</summary>{summary}</details></main><aside>{summary}</aside></div>
    <footer className="ag-footer mn-save-footer"><div className="mn-save-notice" role={saveError?'alert':'status'} data-error={!!saveError}>{saveError||notice}</div><div className="mn-save-actions"><button disabled={locked} onClick={p.onBack}><ArrowLeft size={17}/>Money</button><button disabled={locked} onClick={()=>void save(false)}><Save size={17}/>Save draft</button><button className="ag-primary" disabled={locked} onClick={()=>void save(true)}>{saving||p.busy?<InlineLoader text="Saving…"/>:'Continue to Events Preview'}</button></div></footer>
  </div>;
}
