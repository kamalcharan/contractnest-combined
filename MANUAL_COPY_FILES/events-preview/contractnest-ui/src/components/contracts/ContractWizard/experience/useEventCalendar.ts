import {useQuery} from '@tanstack/react-query';
import api from '@/services/api';
import {API_ENDPOINTS} from '@/services/serviceURLs';
import type {CadenceSettings} from '@/pages/settings/cadence/useCadenceSettings';
import {eventDay} from './eventsModel';

export function useEventCalendar(tenant:string|undefined,live:boolean,enabled:boolean) {
  return useQuery({queryKey:['experience-event-calendar',tenant,live],enabled:enabled&&!!tenant,retry:false,
    queryFn:async()=>{
      const r=await api.get(API_ENDPOINTS.CADENCE_SETTINGS.GET,{headers:{'x-tenant-id':tenant,'x-environment':live?'live':'test'}});
      const d=r.data?.data??r.data;
      if(!d||!Array.isArray(d.weekly_holidays)||d.weekly_holidays.some((n:unknown)=>!Number.isInteger(n)||Number(n)<0||Number(n)>6)||!['next','previous'].includes(d.default_shift)||!Array.isArray(d.holidays)||d.holidays.some((h:any)=>!h||typeof h.date!=='string'||eventDay(new Date(`${h.date}T12:00:00`))!==h.date||(h.label!==null&&typeof h.label!=='string'))||(d.tenant_id&&d.tenant_id!==tenant))throw new Error('The workspace holiday calendar could not be verified.');
      return {weekly_holidays:d.weekly_holidays,default_shift:d.default_shift,holidays:d.holidays} as CadenceSettings;
    }});
}
