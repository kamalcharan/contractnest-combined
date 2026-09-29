// ============================================================================
// Extend — storefronts, package-first (/extend)
// ============================================================================
// "Sell your packages where your customers already are." A storefront is one
// or more PUBLISHED packages (templates) with a card style and an FAQ. The
// channels are ways to share it, not separate things:
//   · Website  — a widget (button / card / catalog) from one script tag
//   · Link     — the package page /p/:key (also as a QR, or in an email)
//   · WhatsApp — share the page into a chat (mock for now: no bot, no
//                interactive template — owner decision, more to come)
//   · VaNi     — answers questions and captures leads (own batch)
// Every sale lands as a contract in the tenant's book via the OTP-verified
// checkout at /buy/:key.
//
// Entitlement: Website / WhatsApp are addon flags on tenant context
// (addon_extend_website / _whatsapp), read server-side by list_storefronts.
// The platform tenant is always entitled. With neither on, the page is the
// pitch (product-led: it sells the feature the way the tenant will sell).
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, MessageCircle, Mail, Check, Copy, ExternalLink, Loader2, Sparkles, ArrowRight,
  Pause, Play, Link2, Code2, QrCode as QrIcon, Plus, X, ChevronDown, ChevronUp, Package, Layers,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useTenantContext } from '@/hooks/queries/useTenantContext';
import { useCatTemplates } from '@/hooks/queries/useCatTemplates';
import { useStorefronts, useCreateStorefront, useUpdateStorefront, Storefront } from '@/hooks/queries/useStorefronts';
import { QrCode } from '@/utils/qrcodegen';
import PackageCard from '@/pages/storefront/PackageCard';
import {
  CardStyle, CardView, CardShape, CardOpen, StorefrontPackage, FaqRow,
  mergeCardStyle, storefrontUrls, fmtMoney, termLabel,
} from '@/pages/storefront/api';

const PRESETS = ['#ff6b2b', '#16a34a', '#0f766e', '#1a1816', '#4F46E5'];
const LABELS = ['Buy now', 'Explore', 'Get a quote'];
const VIEWS: Array<{ v: CardView; label: string }> = [
  { v: 'button', label: 'Buy button' }, { v: 'card', label: 'Package card' }, { v: 'catalog', label: 'Catalog' }, { v: 'bubble', label: 'Ask VaNi bubble' },
];
const SHAPES: Array<{ v: CardShape; label: string }> = [{ v: 'pill', label: 'Pill' }, { v: 'rounded', label: 'Rounded' }, { v: 'square', label: 'Square' }];
const OPENS: Array<{ v: CardOpen; label: string }> = [{ v: 'overlay', label: 'Overlay on their page' }, { v: 'tab', label: 'New tab' }];

const SAMPLE_PACKAGE: StorefrontPackage = {
  id: 'sample', family_id: 'sample', name: 'Annual maintenance package', description: null, cover_image: null,
  currency: 'INR', price: 24000, term: { value: 1, unit: 'years' },
  lines: [
    { name: 'Preventive maintenance visit', quantity: 4, unit_price: 4000, total_price: 16000, billing_cycle: null, category: null },
    { name: 'Filter replacement', quantity: 2, unit_price: 2000, total_price: 4000, billing_cycle: null, category: null },
    { name: 'Breakdown response within 24 h', quantity: 1, unit_price: 0, total_price: 0, billing_cycle: null, category: null },
  ],
};

const snippetFor = (key: string, s: CardStyle, origin: string) => {
  const attrs = [
    `data-storefront="${key}"`, `data-view="${s.view === 'bubble' ? 'button' : s.view}"`, `data-label="${s.label}"`,
    `data-color="${s.color}"`, `data-shape="${s.shape}"`, s.open === 'tab' ? 'data-mode="link"' : null,
  ].filter(Boolean);
  return `<script src="${origin}/embed.js"\n  ${attrs.join('\n  ')} async></script>`;
};

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch { return false; }
  }
}

function downloadQr(url: string, fileName: string) {
  const svg = QrCode.encodeText(url, 'MEDIUM').toSvgString(2, '#111827', '#ffffff');
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = `${fileName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'storefront'}-qr.svg`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────

const ExtendPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode: isDark } = useTheme();
  const { addToast } = useVaNiToast();
  const { data: ctx } = useTenantContext();
  const { data, isLoading, isError } = useStorefronts();
  const { data: templatesResponse } = useCatTemplates({ is_active: 'all', limit: 200 } as any);
  const createStorefront = useCreateStorefront();
  const updateStorefront = useUpdateStorefront();

  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const storefronts = data?.storefronts ?? [];
  const channels = data?.channels ?? { website: false, whatsapp: false };
  const vaniOn = !!data?.vani_enabled;
  const anyChannel = channels.website || channels.whatsapp;

  const brandColor = useMemo(() => {
    const c = (ctx as any)?.profile?.primary_color;
    return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null;
  }, [ctx]);

  // one entry per template FAMILY: latest signed-off version
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

  const samplePackage: StorefrontPackage = useMemo(() => {
    const t = publishedTemplates[0];
    if (!t) return SAMPLE_PACKAGE;
    return {
      id: t.id, family_id: t.family_id, name: t.display_name || t.name, description: t.description || null, cover_image: t.cover_image || null,
      currency: t.currency || 'INR', price: t.total || 0,
      term: { value: t.settings?.defaults?.duration_value ?? null, unit: t.settings?.defaults?.duration_unit ?? null },
      lines: (t.blocks || []).slice(0, 3).map((b: any) => ({
        name: b.config_overrides?.name || 'Service', quantity: b.config_overrides?.quantity || 1,
        unit_price: b.config_overrides?.unit_price || 0, total_price: b.config_overrides?.total_price || 0, billing_cycle: null, category: null,
      })),
    };
  }, [publishedTemplates]);

  const totals = useMemo(() => storefronts.reduce((a, s) => ({
    chats: a.chats + (s.counters?.chats || 0), leads: a.leads + (s.counters?.leads || 0), views: a.views + (s.counters?.views || 0),
  }), { chats: 0, leads: 0, views: 0 }), [storefronts]);

  const card = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const heading = isDark ? 'text-slate-100' : 'text-slate-900';
  const chip = (on: boolean, tone: 'on' | 'vani' | 'off' = on ? 'on' : 'off') =>
    `inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
      tone === 'vani' ? 'text-orange-600 bg-orange-500/10' : tone === 'on' ? 'text-emerald-600 bg-emerald-500/10' : isDark ? 'text-slate-500 bg-slate-800' : 'text-slate-500 bg-slate-100'}`;

  const toastCopied = (title: string, message: string) => addToast({ type: 'success', title, message });

  const togglePause = async (sf: Storefront) => {
    try {
      await updateStorefront.mutateAsync({ id: sf.id, patch: { is_active: !sf.is_active } });
      addToast({ type: 'success', title: sf.is_active ? 'Storefront paused' : 'Storefront resumed',
        message: sf.is_active ? 'The link, widget and page now say "not available".' : 'The link is live again.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update failed', message: e?.response?.data?.error?.message || 'Please try again.' });
    }
  };

  // ── loading / error ──
  if (isLoading && !data) {
    return <div className="p-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }
  if (isError) {
    return <div className={`max-w-3xl mx-auto p-8 text-sm ${subtext}`}>Could not load your storefronts. Refresh to try again.</div>;
  }

  // ── OFF: the pitch ──
  if (!anyChannel) {
    const previewStyle = mergeCardStyle(null, { color: brandColor });
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className={`rounded-3xl border p-6 sm:p-10 grid lg:grid-cols-[1fr_320px] gap-8 items-center ${card}`}>
          <div>
            <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-widest mb-3"><Sparkles className="w-4 h-4" /> Extend</div>
            <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-3 ${heading}`}>Sell your packages where your customers already are</h1>
            <p className={`max-w-2xl leading-relaxed ${subtext}`}>
              Take any published package and put it on your website, in a WhatsApp chat, or behind a link. The customer reads it, asks VaNi a question,
              pays, and a contract lands in your book. You do nothing by hand.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              {[
                { icon: Globe, color: '#4f5b8f', title: 'Website', body: 'A button or a package card on your own site. One line to paste, no developer needed. Opens a checkout on your branding.', price: '₹700 / yr' },
                { icon: MessageCircle, color: '#25d366', title: 'WhatsApp', body: 'Share a package into any chat or group with Buy and Explore buttons. With VaNi on, she answers replies and captures leads.', price: '₹700 / yr' },
                { icon: Sparkles, color: '#ff6b2b', title: 'VaNi on both', body: 'Answers questions from the package itself, offers the right package, and hands warm leads to you.', price: 'with VaNi' },
              ].map((w) => (
                <div key={w.title} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3" style={{ background: w.color }}><w.icon className="w-4 h-4" /></div>
                  <div className={`font-semibold mb-1 ${heading}`}>{w.title}</div>
                  <p className={`text-xs leading-relaxed ${subtext}`}>{w.body}</p>
                  <div className={`text-xs font-semibold mt-3 ${heading}`}>{w.price}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <button onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold flex items-center gap-2">
                Turn on Website · ₹700/yr <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                className={`px-5 py-2.5 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
                Turn on WhatsApp · ₹700/yr
              </button>
            </div>
          </div>
          <div className={`rounded-[28px] border-[6px] p-3 ${isDark ? 'border-slate-800 bg-[#f7f5f2]' : 'border-slate-900 bg-[#f7f5f2]'}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2 px-1">What your customer sees</div>
            <PackageCard pkg={samplePackage} style={previewStyle} onBuy={() => {}} onExplore={() => {}} compact />
            <p className="text-[11px] text-[#8a847a] mt-2 px-1">On their site, in a chat, or from a link. Same card.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── ON: storefronts ──
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-widest mb-1"><Sparkles className="w-4 h-4" /> Extend</div>
          <h1 className={`text-2xl font-bold tracking-tight ${heading}`}>Your storefronts</h1>
          <p className={`text-sm ${subtext}`}>One storefront per package or set of packages. Website, WhatsApp and the link are ways to share it.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New storefront
        </button>
      </div>

      {showNew && (
        <NewStorefrontPanel
          isDark={isDark} templates={publishedTemplates} pending={createStorefront.isPending}
          onCancel={() => setShowNew(false)}
          onCreate={async (ids, name) => {
            try {
              const sf = await createStorefront.mutateAsync({ template_ids: ids, name: name || undefined, card_style: brandColor ? { color: brandColor } : undefined });
              setShowNew(false);
              if (sf?.storefront_key) {
                await copyText(storefrontUrls(sf.storefront_key).page);
                setOpenId(sf.id);
              }
              addToast({ type: 'success', title: 'Storefront is live', message: 'Link copied. Set the card style below, then paste the snippet on your site.' });
            } catch (e: any) {
              addToast({ type: 'error', title: 'Could not create the storefront', message: e?.response?.data?.error?.message || 'Please try again.' });
            }
          }}
        />
      )}

      <div className={`rounded-2xl border ${card}`}>
        {storefronts.length === 0 ? (
          <div className="p-10 text-center">
            <Package className={`w-8 h-8 mx-auto mb-3 ${subtext}`} />
            <p className={`text-sm ${subtext}`}>No storefronts yet. Create one from a published package — it takes ten seconds.</p>
            {publishedTemplates.length === 0 && (
              <p className={`text-xs mt-2 ${subtext}`}>Sign a template off in Catalog Studio → Templates first.</p>
            )}
          </div>
        ) : (
          <ul className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {storefronts.map((sf) => {
              const urls = storefrontUrls(sf.storefront_key);
              const isOpen = openId === sf.id;
              const shareText = `Here's our ${sf.name} — you can view and get it here: ${urls.page}`;
              return (
                <li key={sf.id} className="px-4 sm:px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {sf.packages.length > 1 ? <Layers className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className={`text-sm font-semibold ${heading} ${!sf.is_active ? 'opacity-50' : ''}`}>{sf.name}{!sf.is_active && <span className={`ml-2 text-[11px] font-medium ${subtext}`}>paused</span>}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={chip(channels.website)}>Website{channels.website ? '' : ' off'}</span>
                        <span className={chip(channels.whatsapp)}>WhatsApp{channels.whatsapp ? '' : ' off'}</span>
                        {vaniOn && <span className={chip(true, 'vani')}>VaNi answering</span>}
                        {sf.packages.length > 1 && <span className={chip(false)}>catalog · {sf.packages.length} packages</span>}
                        {sf.packages.length === 0 && <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full text-red-600 bg-red-500/10">no published package</span>}
                      </div>
                      <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] ${subtext}`}>
                        <span><b className={heading}>{sf.counters.views}</b> views</span>
                        <span><b className={heading}>{sf.counters.chats}</b> chats</span>
                        <span><b className={heading}>{sf.counters.leads}</b> leads</span>
                        <span><b className={heading}>{sf.counters.starts}</b> started</span>
                        <span><b className={heading}>{sf.counters.purchases}</b> bought</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconBtn isDark={isDark} title="Copy link" onClick={async () => { await copyText(urls.page); toastCopied('Link copied', 'Paste it anywhere your customers are.'); }}><Link2 className="w-4 h-4" /></IconBtn>
                      <IconBtn isDark={isDark} title="Widget for your site" active={isOpen} onClick={() => setOpenId(isOpen ? null : sf.id)} disabled={!channels.website}><Code2 className="w-4 h-4" /></IconBtn>
                      <a title={channels.whatsapp ? 'Share on WhatsApp' : 'Turn on WhatsApp to share'} aria-disabled={!channels.whatsapp}
                        href={channels.whatsapp ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined} target="_blank" rel="noreferrer"
                        className={`p-2 rounded-lg ${!channels.whatsapp ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'}`}>
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <IconBtn isDark={isDark} title="QR for print" onClick={() => { downloadQr(urls.page, sf.name); toastCopied('QR downloaded', 'An SVG that prints sharp at any size.'); }}><QrIcon className="w-4 h-4" /></IconBtn>
                      <IconBtn isDark={isDark} title="Send by email" onClick={async () => {
                        await copyText(shareText);
                        window.location.href = `mailto:?subject=${encodeURIComponent(sf.name)}&body=${encodeURIComponent(shareText)}`;
                        toastCopied('Mail block copied', 'Your mail app opens with the link; the text is on your clipboard too.');
                      }}><Mail className="w-4 h-4" /></IconBtn>
                      <a title="Open the package page" href={urls.page} target="_blank" rel="noreferrer" className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><ExternalLink className="w-4 h-4" /></a>
                      <IconBtn isDark={isDark} title={sf.is_active ? 'Pause' : 'Resume'} onClick={() => togglePause(sf)} disabled={updateStorefront.isPending}>
                        {sf.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </IconBtn>
                    </div>
                  </div>
                  {isOpen && (
                    <Configurator
                      sf={sf} isDark={isDark} brandColor={brandColor} vaniOn={vaniOn} templates={publishedTemplates}
                      onClose={() => setOpenId(null)}
                      onSave={async (patch) => {
                        try { await updateStorefront.mutateAsync({ id: sf.id, patch }); return true; }
                        catch (e: any) { addToast({ type: 'error', title: 'Could not save', message: e?.response?.data?.error?.message || 'Please try again.' }); return false; }
                      }}
                      toast={toastCopied}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* VaNi row: the leverage. Counterfactual when off. */}
      <div className={`rounded-2xl border p-4 mt-4 flex flex-wrap items-center justify-between gap-3 ${vaniOn ? card : isDark ? 'border-dashed border-slate-700 bg-slate-900/40' : 'border-dashed border-slate-300 bg-slate-50'}`}>
        {vaniOn ? (
          <div className={`text-sm ${subtext}`}><b className="text-orange-500">VaNi is answering</b> on your storefronts. {totals.chats} questions, {totals.leads} leads captured so far.</div>
        ) : (
          <div className={`text-sm ${subtext}`}><b className={heading}>VaNi would answer questions and capture leads</b> on these storefronts{totals.views > 0 ? ` — ${totals.views} people have looked` : ''}. Right now questions go unanswered after hours.</div>
        )}
        <button onClick={() => navigate(vaniOn ? '/leads' : '/vani/landing')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${vaniOn ? (isDark ? 'border border-slate-700 text-slate-200' : 'border border-slate-300 text-slate-700') : 'bg-orange-500 hover:bg-orange-400 text-white'}`}>
          {vaniOn ? 'See leads' : 'Open VaNi'}
        </button>
      </div>

      <p className={`text-[11px] mt-4 ${subtext}`}>
        Viewing is always free. A sale creates a contract in your book. Counters: <b>views</b> of the page, <b>chats</b> with VaNi, <b>leads</b> captured, <b>started</b> checkouts, <b>bought</b>.
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const IconBtn: React.FC<{ isDark: boolean; title: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }> =
  ({ isDark, title, onClick, disabled, active, children }) => (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${active ? 'bg-orange-500/15 text-orange-500' : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
      {children}
    </button>
  );

const Seg: React.FC<{ isDark: boolean; options: Array<{ v: string; label: string; disabled?: boolean; title?: string }>; value: string; onChange: (v: string) => void }> =
  ({ isDark, options, value, onChange }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => !o.disabled && onChange(o.v)} title={o.title} disabled={o.disabled}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 ${
            value === o.v ? 'bg-orange-500 border-orange-500 text-white' : isDark ? 'border-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-300 text-slate-700 hover:border-slate-400'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

const Field: React.FC<{ isDark: boolean; label: string; children: React.ReactNode }> = ({ isDark, label, children }) => (
  <div>
    <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{label}</div>
    {children}
  </div>
);

const NewStorefrontPanel: React.FC<{
  isDark: boolean; templates: any[]; pending: boolean;
  onCancel: () => void; onCreate: (ids: string[], name: string) => void;
}> = ({ isDark, templates, pending, onCancel, onCreate }) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');
  const heading = isDark ? 'text-slate-100' : 'text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  return (
    <div className={`rounded-2xl border p-5 mb-4 grid gap-4 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`font-semibold ${heading}`}>New storefront</div>
      <Field isDark={isDark} label="Packages to include">
        {templates.length === 0 ? (
          <p className={`text-sm ${subtext}`}>No published templates yet — sign one off in Catalog Studio → Templates first.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => {
              const on = picked.includes(t.family_id);
              return (
                <button key={t.family_id} type="button" onClick={() => toggle(t.family_id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${on ? 'bg-orange-500 border-orange-500 text-white' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}>
                  {on && <Check className="w-3 h-3" />}{t.display_name || t.name}{t.total > 0 && <span className={on ? 'text-orange-100' : subtext}> · {fmtMoney(t.total, t.currency)}</span>}
                </button>
              );
            })}
          </div>
        )}
        <p className={`text-xs mt-2 ${subtext}`}>Two or more packages make a catalog. The customer picks, then explores or buys.</p>
      </Field>
      <Field isDark={isDark} label="Name (optional)">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={picked.length > 1 ? 'Maintenance packages' : 'Defaults to the package name'}
          className={`w-full max-w-md px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`} />
      </Field>
      <div className="flex gap-2">
        <button onClick={() => onCreate(picked, name.trim())} disabled={picked.length === 0 || pending}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Create storefront
        </button>
        <button onClick={onCancel} className={`px-4 py-2 rounded-xl border text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'}`}>Cancel</button>
      </div>
    </div>
  );
};

// ── the configurator: card style (auto-saved), snippet, preview, FAQ ─────────

const Configurator: React.FC<{
  sf: Storefront; isDark: boolean; brandColor: string | null; vaniOn: boolean; templates: any[];
  onClose: () => void;
  onSave: (patch: { name?: string; card_style?: Partial<CardStyle>; faq?: FaqRow[]; template_ids?: string[] }) => Promise<boolean>;
  toast: (title: string, message: string) => void;
}> = ({ sf, isDark, brandColor, vaniOn, onClose, onSave, toast }) => {
  const [style, setStyle] = useState<CardStyle>(() => mergeCardStyle(sf.card_style, {}));
  const [faq, setFaq] = useState<FaqRow[]>(() => (sf.faq || []).map((r) => ({ q: r.q, a: r.a })));
  const [name, setName] = useState(sf.name);
  const [saving, setSaving] = useState<'style' | 'faq' | 'name' | null>(null);
  const [saved, setSaved] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState(style.label);
  const firstRender = useRef(true);
  const origin = window.location.origin;
  const urls = storefrontUrls(sf.storefront_key);

  const heading = isDark ? 'text-slate-100' : 'text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`;
  const ghostBtn = `px-3 py-1.5 rounded-xl border text-xs font-semibold ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`;

  // style auto-saves (debounced) — the playground promise: change it here, it changes everywhere
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = setTimeout(async () => {
      setSaving('style');
      const ok = await onSave({ card_style: style });
      setSaving(null);
      if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // label typed freely, applied after a pause
  useEffect(() => {
    const t = setTimeout(() => { if (labelDraft.trim() && labelDraft.trim() !== style.label) setStyle((s) => ({ ...s, label: labelDraft.trim().slice(0, 40) })); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelDraft]);

  const swatches = useMemo(() => {
    const list = [...(brandColor ? [brandColor] : []), ...PRESETS];
    return Array.from(new Set(list.map((c) => c.toLowerCase()))).slice(0, 6);
  }, [brandColor]);
  const isPreset = swatches.includes(style.color.toLowerCase());

  const previewView = style.view === 'bubble' ? 'button' : style.view;
  const previewSrc = `${urls.widget}?preview=1&view=${previewView}&label=${encodeURIComponent(style.label)}&color=${encodeURIComponent(style.color)}&shape=${style.shape}`;
  const snippet = snippetFor(sf.storefront_key, style, origin);

  const saveFaq = async () => {
    setSaving('faq');
    const ok = await onSave({ faq: faq.filter((r) => r.q.trim() && r.a.trim()) });
    setSaving(null);
    if (ok) toast('FAQ saved', 'It shows on the package page and VaNi answers from it first.');
  };
  const saveName = async () => {
    if (!name.trim() || name.trim() === sf.name) return;
    setSaving('name'); await onSave({ name: name.trim() }); setSaving(null);
  };

  return (
    <div className={`mt-4 rounded-2xl border p-4 sm:p-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] gap-5 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="grid gap-4 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">Card style · applies everywhere</div>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className={`mt-1 text-base font-semibold bg-transparent border-b border-transparent hover:border-slate-400 focus:border-orange-500 focus:outline-none w-full max-w-md ${heading}`} title="Click to rename" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] ${subtext}`}>{saving ? 'Saving…' : saved ? '✓ Saved' : ''}</span>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`} title="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <Field isDark={isDark} label="Show as">
          <Seg isDark={isDark} value={style.view} onChange={(v) => setStyle((s) => ({ ...s, view: v as CardView }))}
            options={VIEWS.map((o) => ({ v: o.v, label: o.label, disabled: o.v === 'bubble' && !vaniOn, title: o.v === 'bubble' && !vaniOn ? 'The bubble needs VaNi' : undefined }))} />
          {style.view === 'bubble' && <p className={`text-xs mt-1.5 ${subtext}`}>The floating VaNi bubble ships with "VaNi on your site". Until then the snippet places a button.</p>}
          {style.view === 'catalog' && sf.packages.length < 2 && <p className={`text-xs mt-1.5 ${subtext}`}>A catalog shows every package on this storefront — add a second one to see the difference.</p>}
        </Field>

        <Field isDark={isDark} label="Button text">
          <div className="flex flex-wrap items-center gap-1.5">
            <Seg isDark={isDark} value={LABELS.includes(style.label) ? style.label : ''} onChange={(v) => { setLabelDraft(v); setStyle((s) => ({ ...s, label: v })); }} options={LABELS.map((l) => ({ v: l, label: l }))} />
            <input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} maxLength={40} placeholder="Or your own words" className={`${input} w-44`} />
          </div>
        </Field>

        <Field isDark={isDark} label="Colour · your brand colour first, then presets, or any colour">
          <div className="flex items-center gap-2 flex-wrap">
            {swatches.map((c, i) => (
              <button key={c} type="button" onClick={() => setStyle((s) => ({ ...s, color: c }))} title={i === 0 && brandColor ? 'Your brand colour' : c}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${style.color.toLowerCase() === c ? 'border-orange-500 scale-110' : 'border-transparent'}`} style={{ background: c }} aria-label={c} />
            ))}
            <label title="Any colour" className={`w-8 h-8 rounded-full border-2 grid place-items-center cursor-pointer overflow-hidden ${!isPreset ? 'border-orange-500 scale-110' : isDark ? 'border-slate-600' : 'border-slate-300'}`}
              style={{ background: !isPreset ? style.color : 'conic-gradient(#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)' }}>
              <input type="color" value={style.color} onChange={(e) => setStyle((s) => ({ ...s, color: e.target.value }))} className="opacity-0 w-0 h-0" aria-label="Pick any colour" />
            </label>
            <span className={`text-xs font-mono ${subtext}`}>{style.color}</span>
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field isDark={isDark} label="Shape"><Seg isDark={isDark} value={style.shape} onChange={(v) => setStyle((s) => ({ ...s, shape: v as CardShape }))} options={SHAPES} /></Field>
          <Field isDark={isDark} label="A click opens"><Seg isDark={isDark} value={style.open} onChange={(v) => setStyle((s) => ({ ...s, open: v as CardOpen }))} options={OPENS} /></Field>
        </div>

        <Field isDark={isDark} label="Paste this once on your site">
          <pre className={`text-[12px] leading-relaxed rounded-xl p-3 overflow-x-auto whitespace-pre ${isDark ? 'bg-slate-900 text-slate-200 border border-slate-800' : 'bg-white text-slate-800 border border-slate-200'}`}>{snippet}</pre>
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={async () => { await copyText(snippet); toast('Snippet copied', 'Paste it into any website — HTML, WordPress, React, anything.'); }}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy snippet</button>
            <button onClick={async () => { await copyText(urls.page); toast('Link copied', 'The package page. Works in a bio, a signature, a QR.'); }} className={ghostBtn}>Copy link</button>
            <button onClick={async () => { await copyText(`Here's our ${sf.name} — you can view and get it here: ${urls.page}`); toast('Mail block copied', 'Paste it into any email.'); }} className={ghostBtn}>Mail block</button>
            <button onClick={() => { downloadQr(urls.page, sf.name); toast('QR downloaded', 'An SVG that prints sharp at any size.'); }} className={ghostBtn}>QR</button>
          </div>
        </Field>

        <div>
          <button onClick={() => setDevOpen((v) => !v)} className={`text-xs font-semibold flex items-center gap-1 ${subtext}`}>
            {devOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} For developers
          </button>
          {devOpen && (
            <div className="mt-2">
              <p className={`text-xs mb-2 ${subtext}`}>Attach our checkout to your own button, or mount the card into an element you choose. Nothing else is exposed.</p>
              <pre className={`text-[12px] leading-relaxed rounded-xl p-3 overflow-x-auto ${isDark ? 'bg-slate-900 text-slate-200 border border-slate-800' : 'bg-white text-slate-800 border border-slate-200'}`}>{`ContractNest.open('${sf.storefront_key}')\nContractNest.mount(el, { storefront: '${sf.storefront_key}', view: 'card' })`}</pre>
            </div>
          )}
        </div>

        <Field isDark={isDark} label="Questions people ask · shown on the package page, VaNi answers from it first">
          <div className="grid gap-2">
            {faq.map((row, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                <input value={row.q} maxLength={300} placeholder="Question" onChange={(e) => setFaq((f) => f.map((r, j) => j === i ? { ...r, q: e.target.value } : r))} className={input} />
                <input value={row.a} maxLength={300} placeholder="Answer" onChange={(e) => setFaq((f) => f.map((r, j) => j === i ? { ...r, a: e.target.value } : r))} className={input} />
                <button onClick={() => setFaq((f) => f.filter((_, j) => j !== i))} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`} title="Remove"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => faq.length < 20 && setFaq((f) => [...f, { q: '', a: '' }])} className={ghostBtn}><Plus className="w-3.5 h-3.5 inline -mt-0.5" /> Add a question</button>
              <button onClick={saveFaq} disabled={saving === 'faq'} className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-xs font-semibold">
                {saving === 'faq' ? 'Saving…' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </Field>
      </div>

      {/* live preview: the same code as the real widget */}
      <div className="min-w-0">
        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${subtext}`}>Live preview · your customer's site</div>
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
          <div className={`flex items-center gap-1.5 px-3 py-2 text-[11px] ${isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-200 text-slate-500'}`}>
            <i className="w-2 h-2 rounded-full bg-red-400" /><i className="w-2 h-2 rounded-full bg-amber-400" /><i className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2">yourwebsite.com / packages</span>
          </div>
          <div className="bg-white p-4 grid gap-3">
            <div className="h-3 w-2/3 rounded bg-slate-200" /><div className="h-2 w-full rounded bg-slate-100" /><div className="h-2 w-5/6 rounded bg-slate-100" />
            <iframe key={previewSrc} src={previewSrc} title="Widget preview" className="w-full border-0" style={{ height: previewView === 'button' ? 64 : previewView === 'catalog' ? 380 : 300 }} />
            <div className="h-2 w-4/6 rounded bg-slate-100" />
          </div>
        </div>
        <p className={`text-xs mt-2 ${subtext}`}>The preview and the real widget are the same code. A style change here changes it on their site, on the package page and in VaNi's chat.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={urls.page} target="_blank" rel="noreferrer" className={ghostBtn}>Open package page <ExternalLink className="w-3 h-3 inline -mt-0.5" /></a>
          <a href={urls.buy} target="_blank" rel="noreferrer" className={ghostBtn}>Try the checkout <ExternalLink className="w-3 h-3 inline -mt-0.5" /></a>
        </div>
        <div className={`mt-4 text-xs ${subtext}`}>
          Packages on this storefront: {sf.packages.map((p) => `${p.name}${termLabel(p.term) ? ` (${termLabel(p.term)})` : ''}`).join(' · ') || 'none published'}
        </div>
      </div>
    </div>
  );
};

export default ExtendPage;
