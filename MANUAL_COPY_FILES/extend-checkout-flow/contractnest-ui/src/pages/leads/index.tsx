// ============================================================================
// Leads (/leads) — contacts tagged 'lead' and what they wanted
// ============================================================================
// Owner's model (2026-09-29): a lead is a contact with tag 'Lead', in general
// or for a package; an RFQ we receive is also a lead, with a specification
// attached. Two tabs:
//   From your reach — storefront checkouts that stopped after the OTP, VaNi
//                     captures, leads added by hand; stage new → contacted →
//                     converted (a contract for the contact converts it) | lost
//   Asked you       — RFQs other tenants invited us to; the verb is "respond"
// Actions: Follow up (note + stage contacted) · Send contract (wizard with the
// buyer chosen) · Mark lost · Open contact · Respond with quote.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Search, Plus, Loader2, Phone, Mail, Building2, User, ExternalLink, FileText, X, Check, MessageSquare, Globe,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useCatTemplates } from '@/hooks/queries/useCatTemplates';
import { useLeads, useSetLeadStage, useCaptureLead, LeadRow, LeadInterest, LeadStage, AskedRow } from '@/hooks/queries/useLeads';
import MobileInput, { DEFAULT_MOBILE, MobileValue, mobileIsValid, mobileToE164 } from '@/components/common/MobileInput';
import EmptyState from '@/components/common/EmptyState';

type Tab = 'reach' | 'asked';

const STAGE_LABEL: Record<LeadStage, string> = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' };
const STAGE_TONE: Record<LeadStage, string> = {
  new: 'text-orange-600 bg-orange-500/10', contacted: 'text-sky-600 bg-sky-500/10',
  converted: 'text-emerald-600 bg-emerald-500/10', lost: 'text-slate-500 bg-slate-500/10',
};
const ASKED_TONE: Record<AskedRow['state'], string> = {
  open: 'text-orange-600 bg-orange-500/10', quoted: 'text-sky-600 bg-sky-500/10', awarded: 'text-emerald-600 bg-emerald-500/10',
  declined: 'text-slate-500 bg-slate-500/10', closed: 'text-slate-500 bg-slate-500/10',
};
const ASKED_LABEL: Record<AskedRow['state'], string> = { open: 'Quote due', quoted: 'Quoted', awarded: 'Awarded to you', declined: 'Declined', closed: 'Closed' };

const fmtWhen = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const fmtMoney = (n?: number | null, c?: string | null) => n == null ? '' :
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: c || 'INR', maximumFractionDigits: 0 }).format(n);
const sourceLabel = (i: LeadInterest) =>
  i.kind === 'vani' ? 'asked VaNi' : i.kind === 'manual' ? 'added by you' : i.channel === 'whatsapp' ? 'from WhatsApp' : i.channel === 'link' ? 'from your link' : 'from your website';
const SourceIcon = ({ i }: { i: LeadInterest }) => i.kind === 'vani' ? <Sparkles className="w-3 h-3" /> : i.kind === 'manual' ? <User className="w-3 h-3" /> : <Globe className="w-3 h-3" />;

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode: isDark } = useTheme();
  const { addToast } = useVaNiToast();
  const [tab, setTab] = useState<Tab>('reach');
  const [stage, setStage] = useState<LeadStage | 'all'>('all');
  const [q, setQ] = useState('');
  const [qLive, setQLive] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [followUp, setFollowUp] = useState<{ interestId: string; note: string } | null>(null);

  const { data, isLoading, isError, isFetching } = useLeads({ tab, stage, q: qLive });
  const setLeadStage = useSetLeadStage();
  const captureLead = useCaptureLead();
  const { data: templatesResponse } = useCatTemplates({ is_active: 'all', limit: 200 } as any);
  const publishedTemplates = useMemo(() => {
    const list: any[] = (templatesResponse as any)?.data?.templates || [];
    const byFamily = new Map<string, any>();
    for (const t of list) {
      if (t.is_active === false || t.settings?.lifecycle !== 'signed_off') continue;
      const fam = t.parent_template_id || t.id;
      const cur = byFamily.get(fam);
      if (!cur || (t.version || 0) > (cur.version || 0)) byFamily.set(fam, { ...t, family_id: fam });
    }
    return Array.from(byFamily.values());
  }, [templatesResponse]);

  const card = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const heading = isDark ? 'text-slate-100' : 'text-slate-900';
  const input = `px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`;
  const ghostBtn = `px-3 py-1.5 rounded-xl border text-xs font-semibold ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`;
  const chipCls = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border ${on ? 'bg-orange-500 border-orange-500 text-white' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`;

  const reach = data?.reach;
  const asked = data?.asked;

  const act = async (interestId: string, next: LeadStage, note?: string, done?: string) => {
    try {
      await setLeadStage.mutateAsync({ interestId, stage: next, note });
      addToast({ type: 'success', title: done || `Marked ${STAGE_LABEL[next].toLowerCase()}`, message: note ? 'Your note is on the lead.' : '' });
      setFollowUp(null);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not update the lead', message: e?.response?.data?.error?.message || 'Please try again.' });
    }
  };
  const sendContract = (row: LeadRow) =>
    navigate(`/contracts/create/client?contactId=${row.contact.id}&contactName=${encodeURIComponent(row.contact.name || '')}`);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-widest mb-1"><Sparkles className="w-4 h-4" /> Leads</div>
          <h1 className={`text-2xl font-bold tracking-tight ${heading}`}>People who showed interest</h1>
          <p className={`text-sm ${subtext}`}>A lead is a contact tagged Lead, with what they wanted. A contract for them converts it; the history stays.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add a lead
        </button>
      </div>

      {showAdd && (
        <AddLeadPanel isDark={isDark} templates={publishedTemplates} pending={captureLead.isPending} onCancel={() => setShowAdd(false)}
          onSave={async (v) => {
            try {
              const r = await captureLead.mutateAsync(v);
              setShowAdd(false);
              addToast({ type: 'success', title: r?.is_new_contact ? 'Lead added' : 'Interest added to an existing contact', message: r?.is_new_contact ? 'A new contact tagged Lead.' : 'Matched by mobile or email.' });
            } catch (e: any) {
              addToast({ type: 'error', title: 'Could not add the lead', message: e?.response?.data?.error?.message || 'Please try again.' });
            }
          }} />
      )}

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setTab('reach')} className={chipCls(tab === 'reach')}>From your reach{reach ? ` · ${reach.counts.all}` : ''}</button>
        <button onClick={() => setTab('asked')} className={chipCls(tab === 'asked')}>Asked you{asked ? ` · ${asked.counts.all}` : ''}</button>
        <div className="flex-1" />
        <div className={`flex items-center gap-2 px-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
          <Search className={`w-4 h-4 ${subtext}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setQLive(q.trim()); }} onBlur={() => setQLive(q.trim())}
            placeholder="Name, mobile, package…" className={`py-2 bg-transparent text-sm outline-none w-48 ${heading}`} />
          {q && <button onClick={() => { setQ(''); setQLive(''); }}><X className={`w-3.5 h-3.5 ${subtext}`} /></button>}
        </div>
      </div>

      {tab === 'reach' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(['all', 'new', 'contacted', 'converted', 'lost'] as const).map((s) => (
            <button key={s} onClick={() => setStage(s)} className={chipCls(stage === s)}>
              {s === 'all' ? 'All' : STAGE_LABEL[s]}{reach ? ` · ${reach.counts[s]}` : ''}
            </button>
          ))}
        </div>
      )}

      <div className={`rounded-2xl border ${card} ${isFetching ? 'opacity-80' : ''}`}>
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : isError ? (
          <div className={`p-8 text-sm ${subtext}`}>Could not load leads. Refresh to try again.</div>
        ) : tab === 'reach' ? (
          !reach || reach.rows.length === 0 ? (
            stage !== 'all' || qLive ? (
              <EmptyState icon={Search} title="Nothing matches" body="Try another name, mobile or package, or clear the stage filter." compact
                secondary={{ label: 'Clear filters', onClick: () => { setStage('all'); setQ(''); setQLive(''); } }} />
            ) : (
              <EmptyState icon={Sparkles} title="No leads yet"
                body="Leads arrive from your storefronts (a checkout that stopped after the OTP), from VaNi on your site, or you add one here. Each is a contact tagged Lead, with what they wanted."
                action={{ label: <><Plus className="w-4 h-4" /> Add a lead</>, onClick: () => setShowAdd(true) }}
                secondary={{ label: 'Set up a storefront', onClick: () => navigate('/extend') }} />
            )
          ) : (
            <ul className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {reach.rows.map((row) => {
                const open = row.interests.filter((i) => i.stage === 'new' || i.stage === 'contacted');
                const primary = open[0] || row.interests[0];
                const isClient = row.contact.classifications?.includes('client');
                return (
                  <li key={row.contact.id} className="px-4 sm:px-6 py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                        {(row.contact.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => navigate(`/contacts/${row.contact.id}`)} className={`text-sm font-semibold hover:underline ${heading}`}>{row.contact.name}</button>
                          {row.contact.person && <span className={`text-xs ${subtext}`}>· {row.contact.person}</span>}
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAGE_TONE[row.stage]}`}>{STAGE_LABEL[row.stage]}</span>
                          {isClient && <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full text-blue-600 bg-blue-500/10">client</span>}
                        </div>
                        <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs ${subtext}`}>
                          {row.contact.mobile && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{row.contact.mobile}</span>}
                          {row.contact.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{row.contact.email}</span>}
                          {row.contact.type === 'corporate' && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />company</span>}
                        </div>
                        <ul className="mt-2 grid gap-1.5">
                          {row.interests.map((i) => (
                            <li key={i.id} className={`text-xs rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <b className={heading}>{i.template_name || 'General interest'}</b>
                                <span className={`inline-flex items-center gap-1 ${subtext}`}><SourceIcon i={i} /> {sourceLabel(i)}</span>
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_TONE[i.stage]}`}>{STAGE_LABEL[i.stage]}</span>
                                {i.contract_number && <button onClick={() => navigate(`/contracts/${i.contract_id}`)} className="text-emerald-600 hover:underline inline-flex items-center gap-1"><FileText className="w-3 h-3" />{i.contract_number}</button>}
                                <span className={`ml-auto ${subtext}`}>{fmtWhen(i.last_activity_at)}</span>
                              </div>
                              {i.question && <div className={`mt-1 italic ${subtext}`}>“{i.question.split('\n').slice(-1)[0]}”</div>}
                              {i.note && <div className={`mt-1 whitespace-pre-line ${subtext}`}>{i.note.split('\n').slice(-2).join('\n')}</div>}
                            </li>
                          ))}
                        </ul>
                        {followUp?.interestId === primary?.id && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <input autoFocus value={followUp.note} onChange={(e) => setFollowUp({ ...followUp, note: e.target.value })} placeholder="What happened? (called, sent details, meeting on…)"
                              onKeyDown={(e) => { if (e.key === 'Enter') act(followUp.interestId, 'contacted', followUp.note, 'Follow-up noted'); }} className={`${input} flex-1 min-w-[220px]`} />
                            <button onClick={() => act(followUp.interestId, 'contacted', followUp.note, 'Follow-up noted')} className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-semibold"><Check className="w-3.5 h-3.5 inline -mt-0.5" /> Save</button>
                            <button onClick={() => setFollowUp(null)} className={ghostBtn}>Cancel</button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-start">
                        {primary && (primary.stage === 'new' || primary.stage === 'contacted') && (
                          <button onClick={() => setFollowUp({ interestId: primary.id, note: '' })} className={ghostBtn}><MessageSquare className="w-3.5 h-3.5 inline -mt-0.5" /> Follow up</button>
                        )}
                        <button onClick={() => sendContract(row)} className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold"><FileText className="w-3.5 h-3.5 inline -mt-0.5" /> Send contract</button>
                        {primary && (primary.stage === 'new' || primary.stage === 'contacted') && (
                          <button onClick={() => act(primary.id, 'lost', undefined, 'Marked lost')} className={ghostBtn}>Lost</button>
                        )}
                        <button onClick={() => navigate(`/contacts/${row.contact.id}`)} className={ghostBtn} title="Open contact"><ExternalLink className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          !asked || asked.rows.length === 0 ? (
            <EmptyState icon={FileText} title="No requests waiting" compact
              body="When a buyer invites your business number or email to a request for quote, it lands here. Nothing to respond to right now." />
          ) : (
            <ul className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {asked.rows.map((r) => (
                <li key={r.rfq_id} className="px-4 sm:px-6 py-4 flex flex-wrap items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}><FileText className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold ${heading}`}>{r.buyer_name}</span>
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${ASKED_TONE[r.state]}`}>{ASKED_LABEL[r.state]}</span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full text-slate-500 bg-slate-500/10">request</span>
                    </div>
                    <div className={`text-xs mt-0.5 ${subtext}`}>
                      {r.rfq_number ? `${r.rfq_number} · ` : ''}{r.title}{r.blocks_count ? ` · ${r.blocks_count} item${r.blocks_count > 1 ? 's' : ''}` : ''}{r.location ? ` · ${r.location}` : ''}
                    </div>
                    <div className={`text-xs mt-1 ${subtext}`}>
                      Asked {fmtWhen(r.asked_at)}{r.deadline ? ` · quote due ${new Date(r.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${r.deadline_time ? ` ${r.deadline_time}` : ''}` : ''}
                      {r.quoted_amount != null ? ` · you quoted ${fmtMoney(r.quoted_amount, r.quote_currency)}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.quote_path && (
                      <a href={r.quote_path} target="_blank" rel="noreferrer" className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-white ${r.state === 'open' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-slate-500 hover:bg-slate-400'}`}>
                        {r.state === 'open' ? 'Respond with quote' : 'Open request'} <ExternalLink className="w-3 h-3 inline -mt-0.5" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <p className={`text-[11px] mt-4 ${subtext}`}>
        From your reach: a checkout that stopped after the mobile OTP, a VaNi conversation that left a number, or a lead you added. Asked you: a request for quote is a lead with a specification attached — the verb is respond.
      </p>
    </div>
  );
};

const AddLeadPanel: React.FC<{
  isDark: boolean; templates: any[]; pending: boolean; onCancel: () => void;
  onSave: (v: { name: string; company?: string; phone?: string; country_code?: string; email?: string; template_family?: string; note?: string }) => void;
}> = ({ isDark, templates, pending, onCancel, onSave }) => {
  const [v, setV] = useState({ name: '', company: '', email: '', template_family: '', note: '' });
  const [mobile, setMobile] = useState<MobileValue>(DEFAULT_MOBILE);
  const heading = isDark ? 'text-slate-100' : 'text-slate-900';
  const input = `px-3 py-2 rounded-xl border text-sm w-full ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`;
  const hasMobile = mobile.number.length > 0;
  const ok = (v.name.trim() || v.company.trim()) && ((hasMobile && mobileIsValid(mobile)) || /\S+@\S+\.\S+/.test(v.email));
  return (
    <div className={`rounded-2xl border p-5 mb-4 grid gap-3 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`font-semibold ${heading}`}>Add a lead</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <input className={input} placeholder="Company (optional)" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />
        <MobileInput value={mobile} onChange={setMobile} className={input} label="Mobile" />
        <input className={input} placeholder="Email" inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        <select className={input} value={v.template_family} onChange={(e) => setV({ ...v, template_family: e.target.value })}>
          <option value="">Interested in… (general)</option>
          {templates.map((t) => <option key={t.family_id} value={t.family_id}>{t.display_name || t.name}</option>)}
        </select>
        <input className={input} placeholder="Note (how you met, what they asked)" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <button disabled={!ok || pending} onClick={() => onSave({ name: v.name.trim(), company: v.company.trim() || undefined, phone: hasMobile ? mobileToE164(mobile) : undefined, country_code: hasMobile ? mobile.countryCode : undefined, email: v.email.trim() || undefined, template_family: v.template_family || undefined, note: v.note.trim() || undefined })}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add lead
        </button>
        <button onClick={onCancel} className={`px-4 py-2 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'}`}>Cancel</button>
      </div>
    </div>
  );
};

export default LeadsPage;
