import type {ContractWizardState} from '../logic/state';
import {computeContractEvents,computeCadenceViolations,durationToDays} from '@/utils/service-contracts/contractEvents';
import {moneyPreview,moneyTotals,moneyErrors} from './moneyModel';
import {missingServiceSchedule,serviceScheduleErrors} from './serviceScheduleRules';

export function eventDay(d:Date):string {
  return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
}
// Preserve the engine's time-of-day. Parsing YYYY-MM-DD as UTC (or resetting
// it to midnight) can put a first-day payment outside Money's term boundary.
export function parseEventDay(value:string,original:Date):Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(NaN);
  const [y,m,d]=value.split('-').map(Number);
  const next=new Date(original);next.setFullYear(y,m-1,d);
  return eventDay(next)===value?next:new Date(NaN);
}
export function eventPreview(s:ContractWizardState) {
  const end=new Date(s.startDate);end.setDate(end.getDate()+durationToDays(s.durationValue,s.durationUnit));
  const validTerm=Number.isFinite(s.startDate.getTime())&&Number.isFinite(end.getTime())&&s.durationValue>0&&['days','months','years'].includes(s.durationUnit);
  // Never compute an unbounded damaged draft or pretend its preview is empty.
  const estimate=s.selectedBlocks.reduce((n,b)=>n+(b.unlimited?1:Math.max(1,b.quantity||1)),0)+durationToDays(s.durationValue,s.durationUnit);
  const manageable=Number.isFinite(estimate)&&estimate<=50000;
  const money=validTerm&&manageable?moneyPreview(s):{totals:moneyTotals(s),errors:[]};
  const scheduleErrors=serviceScheduleErrors(s.selectedBlocks);
  const errors=[...money.errors,...scheduleErrors,...computeCadenceViolations(s).map(v=>v.message)];
  if (!validTerm) errors.push('Review the agreement start date and term.');
  if (!manageable) errors.push('This schedule is too large for interactive preview. Review the quantities and term.');
  if (['grandTotal','baseSubtotal','taxTotal','discountTotal'].some(k=>Math.abs(Number(s[k as keyof ContractWizardState])-Number(money.totals[k as keyof typeof money.totals]))>0.011)) errors.push('Saved prices differ from this plan. Return to Money and save the current totals.');
  const canCompute=validTerm&&manageable&&moneyErrors(s).length===0;
  const incompleteServiceIds=new Set(s.selectedBlocks.filter(missingServiceSchedule).map(b=>b.id));
  // Billing remains visible, but an incomplete recurring service must never be
  // misrepresented as one visit. Services blocks the user until it is repaired.
  const computed=(canCompute?computeContractEvents({...s,...money.totals}):[]).filter(e=>e.event_type!=='service'||!incompleteServiceIds.has(e.block_id));
  const ids=new Set(computed.map(e=>e.id));
  const orphanOverrides=canCompute?Object.keys(s.eventOverrides).filter(id=>!ids.has(id)):[];
  if(orphanOverrides.length)errors.push('Some date adjustments no longer match the commitments. Remove the obsolete adjustments below.');
  const events=computed.map(e=>({...e,scheduled_date:s.eventOverrides[e.id]??e.scheduled_date})).sort((a,b)=>a.scheduled_date.getTime()-b.scheduled_date.getTime());
  const issues=events.filter(e=>!Number.isFinite(e.scheduled_date.getTime())||e.scheduled_date<s.startDate||e.scheduled_date>end).map(e=>({id:e.id,message:`${e.block_name}: choose a valid date within the schedule window.`}));
  if(issues.length)errors.push('Review the marked event dates; none has been moved automatically.');
  const invalidOverrides=Object.values(s.eventOverrides).some(d=>!Number.isFinite(d.getTime()));
  return {events,computed,end,errors:[...new Set(errors)],issues,orphanOverrides,invalidOverrides,total:money.totals.grandTotal};
}
// A compact UI review receipt, not a security/signature mechanism. All draft
// inputs except the receipt participate, so earlier edits require a new review.
export function eventsSignature(s:ContractWizardState,calendar:unknown):string {
  const {eventsReview,...inputs}=s;
  const text=JSON.stringify([inputs,calendar]);let a=2166136261,b=5381;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
  return `events-v1:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}:${text.length}`;
}
