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
  const gateway = useQuery({queryKey:['experience-delivery-gateway',tenant,live], enabled:enabled&&!!tenant&&paymentNeeded, retry:false,
    queryFn:async()=>{
      const r = await api.get(API_ENDPOINTS.INTEGRATIONS.LIST,{params:{type:'payment_gateway',isLive:live},headers});
      if (!Array.isArray(r.data)) throw new Error('Payment gateway status could not be verified.');
      if (r.data.some((x:any)=>(x.tenant_id&&x.tenant_id!==tenant)||(typeof x.is_live==='boolean'&&x.is_live!==live))) throw new Error('Payment gateway context does not match this draft.');
      // Do not retain credentials in this page's query result.
      return {connected:r.data.some((x:any)=>x.is_configured===true&&x.is_active===true&&x.connection_status==='Connected')};
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
