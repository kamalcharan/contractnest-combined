import {useQuery} from '@tanstack/react-query';
import api from '@/services/api';
import {API_ENDPOINTS} from '@/services/serviceURLs';
import type {TenantSelection} from '@/pages/settings/smart-forms/types';

type Channel = {channel_type:string; value:string; is_primary?:boolean};
type Recipient = {id:string; type?:string; contact_channels?:Channel[]; contact_persons?:{id:string; name:string; contact_channels?:Channel[]}[]};

// Read the same resources as the working wizard. Never turn a failed lookup into
// an empty form library, a different recipient, or an offline gateway decision.
export function useDeliveryData(tenant:string|undefined, live:boolean, buyer:string|null, formsNeeded:boolean, paymentNeeded:boolean, enabled:boolean) {
  const headers = {'x-tenant-id':tenant,'x-environment':live?'live':'test'};
  const forms = useQuery({queryKey:['experience-delivery-forms',tenant,live], enabled:enabled&&!!tenant&&formsNeeded, retry:false,
    queryFn:async()=>{
      const r = await api.get(API_ENDPOINTS.SMART_FORMS.SELECTIONS.LIST,{headers});
      const rows = r.data?.data;
      if (!Array.isArray(rows) || rows.some((x:TenantSelection)=>x.tenant_id!==tenant || typeof x.is_active!=='boolean')) throw new Error('The workspace form list could not be verified.');
      return rows as TenantSelection[];
    }});
  // What the buyer can pay with in THIS environment (GET /api/payments/options →
  // fn_tenant_payment_options): Razorpay and/or offline UPI. "Accept on payment"
  // needs at least one — otherwise the buyer would have nothing to pay with.
  const gateway = useQuery({queryKey:['experience-delivery-payment-options',tenant,live], enabled:enabled&&!!tenant&&paymentNeeded, retry:false,
    queryFn:async()=>{
      const r = await api.get(API_ENDPOINTS.PAYMENTS.OPTIONS,{headers});
      const d = r.data?.data;
      if (r.data?.success!==true || !d || typeof d.any!=='boolean') throw new Error('Payment setup could not be verified.');
      return {connected:!!d.gateway, upi:!!d.offline_upi, any:!!d.any};
    }});
  const contact = useQuery({queryKey:['experience-delivery-recipient',tenant,live,buyer],enabled:enabled&&!!tenant&&!!buyer,retry:false,
    queryFn:async()=>{
      const r = await api.get(`/api/contacts/${encodeURIComponent(buyer!)}`,{headers});
      const d = r.data?.data;
      if (r.data?.success!==true || !d || d.id!==buyer || (d.tenant_id&&d.tenant_id!==tenant)) throw new Error('The selected contact could not be verified.');
      return {id:d.id,type:d.type,contact_channels:d.contact_channels,contact_persons:d.contact_persons} as Recipient;
    }});
  return {forms,gateway,contact};
}
