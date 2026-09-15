import type { ConfigurableBlock } from '@/components/catalog-studio/BlockCardConfigurable';
import type { ContractWizardState } from '../logic/state';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import { cadenceTermMath, fittingCadences, getCadenceCycle } from '@/utils/catalog-studio/cadencePricing';
import { computeContractEvents, durationToDays } from '@/utils/service-contracts/contractEvents';

export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const priced = (b: ConfigurableBlock) => b.categoryId === 'billing' || categoryHasPricing(b.categoryId || '');
export const termMonths = (s: ContractWizardState) => s.durationUnit === 'years' ? s.durationValue * 12 : s.durationUnit === 'days' ? Math.ceil(s.durationValue / 30) : s.durationValue;
export const cycleNames: Record<string, string> = {prepaid:'One payment at the start',postpaid:'One payment at the end',monthly:'Monthly',fortnightly:'Every 14 days',quarterly:'Quarterly',halfyearly:'Every 6 months',annual:'Annually',custom:'Custom cycle'};
export function allowedCycles(b: ConfigurableBlock, s: ContractWizardState): string[] {
  return b.config?.cadencePricing ? fittingCadences(b.config.cadencePricing, termMonths(s)).map(r => r.id) : ['prepaid','postpaid','monthly','fortnightly','quarterly','custom'];
}
export function lineMoney(b: ConfigurableBlock, s: ContractWizardState) {
  const rate = b.config?.customPrice ?? b.price;
  const cadence = b.config?.cadencePricing && getCadenceCycle(b.cycle);
  const amount = cadence ? cadenceTermMath(rate, termMonths(s), cadence.monthsPerPeriod, b.config?.cadenceFinalPayment).termTotal : rate * (b.unlimited ? 1 : b.quantity);
  const taxRate = b.taxRate ?? 0;
  const base = b.taxInclusion === 'inclusive' ? amount / (1 + taxRate / 100) : amount;
  const tax = base * taxRate / 100;
  return {base, tax, total:cents(base + tax), rate};
}
export function moneyTotals(s: ContractWizardState) {
  const lines = s.selectedBlocks.filter(priced);
  const gross = lines.map(b => ({b,...lineMoney(b,s)}));
  const base = gross.reduce((n,b) => n + b.base,0);
  const discount = s.discountType === 'percent' ? base * s.discountValue / 100 : s.discountType === 'amount' ? s.discountValue : 0;
  const factor = base > 0 ? (base - discount) / base : 1;
  const taxes = new Map<string,{tax_rate_id:string;name:string;rate:number;amount:number}>();
  for (const line of gross) for (const t of line.b.taxes || []) {
    const key = t.id || `${t.name}:${t.rate}`;
    const prev = taxes.get(key);
    taxes.set(key,{tax_rate_id:t.id || '',name:t.name,rate:Number(t.rate),amount:(prev?.amount || 0) + line.base * Number(t.rate) / 100 * factor});
  }
  return {baseSubtotal:cents(base),discountTotal:cents(discount),taxTotal:cents(gross.reduce((n,b)=>n+b.tax,0)*factor),
    grandTotal:cents(gross.reduce((n,b)=>n+b.total,0)*factor),taxBreakdown:[...taxes.values()].map(t=>({...t,amount:cents(t.amount)}))};
}
export function changeCycle(b: ConfigurableBlock, cycle: string, s: ContractWizardState): ConfigurableBlock {
  if (!allowedCycles(b,s).includes(cycle)) throw new Error(`${b.name}: this cycle is not offered by the catalogue.`);
  let updated = {...b,cycle,config:{...b.config}};
  if (b.config?.cadencePricing) {
    const rate = b.config.cadencePricing.rates.find(r => r.cycle === cycle && r.enabled);
    if (!rate) throw new Error(`${b.name}: catalogue rate is unavailable.`);
    const overrides = {...b.config.cadenceOverrides};
    if (b.config.customPrice !== undefined) overrides[b.cycle] = b.config.customPrice;
    else delete overrides[b.cycle];
    updated = {...updated,price:rate.amount,listPrice:rate.amount,config:{...updated.config,cadenceOverrides:overrides,customPrice:overrides[cycle],cadenceFinalPayment:undefined}};
  }
  return {...updated,totalPrice:lineMoney(updated,s).total};
}
export function moneyErrors(s: ContractWizardState): string[] {
  const errors:string[] = [];
  const lines = s.selectedBlocks.filter(priced);
  try { if (!s.currency) throw new Error(); new Intl.NumberFormat(undefined,{style:'currency',currency:s.currency}); } catch { errors.push('Choose a valid agreement currency in Agreement.'); }
  if (!s.startDate || !Number.isFinite(new Date(s.startDate).getTime()) || !(s.durationValue > 0)) errors.push('Review the start date and term in Agreement.');
  if (!['mixed','unified'].includes(s.billingCycleType || '')) errors.push('Choose whether each line follows its own cycle or all lines share one.');
  if (!['prepaid','defined','emi'].includes(s.paymentMode)) errors.push('Choose when the money moves.');
  for (const b of lines) {
    const m = lineMoney(b,s);
    if ((b.taxRate ?? 0) > 0 && !['inclusive','exclusive'].includes(b.taxInclusion || '')) errors.push(`${b.name}: tax inclusion is missing. Review Services.`);
    if (b.taxes?.length && (b.taxes.some(t=>!Number.isFinite(Number(t.rate)) || Number(t.rate)<0) || Math.abs(b.taxes.reduce((n,t)=>n+Number(t.rate),0)-(b.taxRate ?? 0))>0.0001)) errors.push(`${b.name}: tax details do not match its tax rate. Review Services.`);
    if (b.currency !== s.currency) errors.push(`${b.name}: currency differs from the agreement. Review Services.`);
    if (![m.base,m.tax,m.total,b.totalPrice].every(Number.isFinite) || m.base < 0 || m.tax < 0) errors.push(`${b.name}: price or tax is invalid. Review Services.`);
    if (Math.abs(m.total - b.totalPrice) > 0.011) errors.push(`${b.name}: the saved total does not match its price, tax and term. Review Services.`);
    if (!allowedCycles(b,s).includes(b.cycle)) errors.push(`${b.name}: choose a supported billing cycle.`);
    if (b.cycle === 'custom' && (!Number.isInteger(b.customCycleDays) || !(b.customCycleDays! > 0))) errors.push(`${b.name}: enter the custom cycle in days.`);
    if (b.config?.cadenceFinalPayment !== undefined && (!Number.isFinite(b.config.cadenceFinalPayment) || b.config.cadenceFinalPayment < 0)) errors.push(`${b.name}: final payment must be zero or more.`);
    if (!b.unlimited && (!Number.isInteger(b.quantity) || b.quantity < 1)) errors.push(`${b.name}: review its quantity in Services.`);
    if (s.paymentMode === 'defined' && !['prepaid','postpaid'].includes(b.cycle) && !b.config?.cadencePricing && !s.perBlockPaymentType[b.id]) errors.push(`${b.name}: choose payment at the start or end of each period.`);
  }
  const base = moneyTotals({...s,discountType:null,discountValue:0}).baseSubtotal;
  if (s.discountType !== null && !['percent','amount'].includes(s.discountType)) errors.push('Choose a supported discount type.');
  if (!Number.isFinite(s.discountValue) || s.discountValue < 0 || (s.discountType === 'percent' && s.discountValue > 100) || (s.discountType === 'amount' && s.discountValue > base)) errors.push('Discount must be between zero and the subtotal (or 0–100%).');
  if (s.billingCycleType === 'unified' && new Set(lines.map(b=>`${b.cycle}:${b.cycle === 'custom' ? b.customCycleDays : ''}`)).size > 1) errors.push('A shared cycle requires every priced line to use the same frequency. Choose a shared cycle or keep individual cycles.');
  if (s.paymentMode === 'prepaid' && lines.length && (s.billingCycleType !== 'unified' || !lines.every(b=>b.cycle === 'prepaid'))) errors.push('One upfront payment requires a shared, prepaid cycle for all priced lines.');
  if (s.paymentMode === 'emi') {
    if (lines.some(b=>b.config?.cadencePricing)) errors.push('The catalogue rate card already defines periodic pricing. Use the agreed schedule instead of adding instalments.');
    if (s.billingCycleType === 'unified' && !lines.every(b=>b.cycle === 'postpaid')) errors.push('Shared-cycle instalments require postpaid lines.');
    if (!Number.isInteger(s.emiMonths) || s.emiMonths < 2 || s.emiMonths > Math.floor(termMonths(s))) errors.push('Choose at least 2 monthly instalments, within the agreement term.');
  }
  return [...new Set(errors)];
}
export function moneyPreview(s: ContractWizardState) {
  const totals = moneyTotals(s);
  const errors = moneyErrors(s);
  const itemIssues:Array<{id:string;name:string;expected:number;scheduled:number;difference:number;payments:number;expectedPayments:number}> = [];
  if (errors.length) return {totals,errors,events:[],itemIssues};
  const events = computeContractEvents({...s,...totals}).filter(e=>e.event_type === 'billing').map(e=>({
    ...e,scheduled_date:s.eventOverrides?.[e.id] ? new Date(s.eventOverrides[e.id]) : e.scheduled_date,
  })).sort((a,b)=>a.scheduled_date.getTime()-b.scheduled_date.getTime());
  const total = cents(events.reduce((n,e)=>n+(e.amount ?? 0),0));
  if (s.paymentMode === 'defined') {
    const lines = s.selectedBlocks.filter(priced);
    const factor = totals.baseSubtotal > 0 ? (totals.baseSubtotal-totals.discountTotal)/totals.baseSubtotal : 1;
    // The engine can allocate a bounded rounding remainder to the last line.
    // Do not mislabel that valid adjustment as a broken commitment.
    const roundingLimit = lines.length * 0.01 + 0.000001;
    for (const b of lines) {
      const payments = events.filter(e=>e.block_id===b.id);
      const expected = cents(b.totalPrice*factor);
      const scheduled = cents(payments.reduce((n,e)=>n+(e.amount ?? 0),0));
      const expectedPayments = Math.max(1,...payments.map(e=>e.total_occurrences));
      const difference = cents(expected-scheduled);
      if (Math.abs(difference)>roundingLimit || payments.length<expectedPayments) itemIssues.push({id:b.id,name:b.name,expected,scheduled,difference,payments:payments.length,expectedPayments});
    }
  }
  if (Math.abs(total - totals.grandTotal) > 0.001) errors.push(`The payment schedule does not add up to the contract total. ${itemIssues.length ? `Review the highlighted item: ${itemIssues[0].name}${itemIssues.length>1?` and ${itemIssues.length-1} more`:''}.` : 'Review the quantity, cycles and term before saving Money.'}`);
  else if (itemIssues.length) errors.push(`Some payment occurrences are missing. Review the highlighted item: ${itemIssues[0].name}.`);
  const end = new Date(s.startDate); end.setDate(end.getDate()+durationToDays(s.durationValue,s.durationUnit));
  if (events.some(e=>!Number.isFinite(e.amount) || !Number.isFinite(e.scheduled_date.getTime()) || e.amount! < 0 || e.scheduled_date < s.startDate || e.scheduled_date > end)) errors.push('A payment is invalid or falls outside the contract term. Review the payment plan.');
  return {totals,errors,events,itemIssues};
}
