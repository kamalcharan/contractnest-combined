// Only constructs an intent. Launch/return is never proof that money moved.
export function buildUpiPaymentIntent(input: {upiId:string;payeeName:string;amount:number;currency:string;reference:string;orgId?:string;mcc?:string}):string {
  const upiId=input.upiId.trim(),name=input.payeeName.trim();
  if(!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId)) throw new Error('The configured UPI ID is invalid. Please contact the organiser.');
  if(!name) throw new Error('The UPI payee name is missing. Please contact the organiser.');
  if(input.currency!=='INR') throw new Error('UPI supports INR payments only. Please contact the organiser.');
  if(!Number.isFinite(input.amount)||input.amount<=0||Math.round(input.amount*100)<=0) throw new Error('The payment amount must be greater than zero.');
  if(!/^[A-Za-z0-9]{1,35}$/.test(input.reference)) throw new Error('A valid payment reference is required. Please try again.');
  // Encode each value, including names containing spaces/&. orgId/mcc are
  // NEVER fabricated here — they only ever come from the tenant's own
  // configured PSP credentials (see gs_checkin_payment_config), decoded
  // directly off the bank's own printed QR for that VPA. A personal/P2P
  // VPA has neither set, and the intent below is built exactly as before
  // (no ver/orgid/mode/mc) for that case.
  const merchantFields = (input.orgId && input.mcc)
    ? {ver:'01',orgid:input.orgId,mode:'01'}
    : {};
  const fields={...merchantFields,pa:upiId,pn:name,...(input.orgId && input.mcc ? {mc:input.mcc} : {}),tr:input.reference,tn:'Group session payment',am:input.amount.toFixed(2),cu:'INR'};
  return 'upi://pay?'+Object.entries(fields).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
}

export async function copyUpiId(value:string,clipboard?:Pick<Clipboard,'writeText'>):Promise<boolean>{
  if(!clipboard)return false;
  try{await clipboard.writeText(value.trim());return true;}catch{return false;}
}
