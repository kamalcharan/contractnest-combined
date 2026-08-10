// ============================================================================
// Extend — customer touchpoints (/extend)
// ============================================================================
// "Extend your business to your customer touchpoints — website, WhatsApp,
// email." A tenant takes any PUBLISHED template and turns it into a public
// buy link (a storefront). Every sale lands as a contract in their book via
// the hosted checkout at /buy/:storefrontKey.
//
// Entitlement: each route is unlocked by an addon flag on tenant context
// (addon_extend_website / _whatsapp / _email), granted by buying the
// touchpoint product on the pricing page (authored in catalog-studio by the
// platform owner — never seeded from code). The platform tenant is always
// entitled. Locked cards deep-link to the pricing page.
//
// Deliberately product-led: the page sells the feature to the tenant the same
// way the tenant will sell to their customers.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, MessageCircle, Mail, Lock, Check, Copy, ExternalLink, Loader2,
  Sparkles, ArrowRight, Pause, Play, Eye, ShoppingBag, Link2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useTenantContext } from '@/hooks/queries/useTenantContext';
import { useCatTemplates } from '@/hooks/queries/useCatTemplates';
import {
  useTouchpoints, useCreateTouchpoint, useSetTouchpointActive,
  Touchpoint, TouchpointType,
} from '@/hooks/queries/useTouchpoints';

const ROUTES: Array<{
  type: TouchpointType;
  label: string;
  price: string;
  icon: React.ElementType;
  accent: string;
  pitch: string;
}> = [
  {
    type: 'website', label: 'Website', price: '₹700/yr', icon: Globe, accent: '#6366F1',
    pitch: 'A buy link and button for your own site. Visitors purchase without ever emailing you.',
  },
  {
    type: 'whatsapp', label: 'WhatsApp', price: '₹700/yr', icon: MessageCircle, accent: '#22C55E',
    pitch: 'Share an offer straight into chats and groups. One tap from message to purchase.',
  },
  {
    type: 'email', label: 'Email', price: 'Free', icon: Mail, accent: '#F59E0B',
    pitch: 'Drop a buy link into any mail you send. Quotes become one-click orders.',
  },
];

const ExtendPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { isDarkMode } = useTheme();
  const { addToast } = useVaNiToast();

  const { data: ctx } = useTenantContext();
  const { data: touchpoints = [], isLoading: tpLoading } = useTouchpoints();
  const { data: templatesResponse } = useCatTemplates({ is_active: 'all', limit: 200 } as any);
  const createTouchpoint = useCreateTouchpoint();
  const setActive = useSetTouchpointActive();

  const [selTemplate, setSelTemplate] = useState('');
  const [selRoute, setSelRoute] = useState<TouchpointType>('website');

  const isPlatform = currentTenant?.is_admin === true;
  const entitled = (type: TouchpointType): boolean =>
    isPlatform || (ctx as any)?.addons?.[`addon_extend_${type}`] === true;

  const publishedTemplates = useMemo(() => {
    const list = (templatesResponse as any)?.data?.templates || [];
    return list.filter((t: any) =>
      t.is_active !== false && (t.settings as any)?.lifecycle === 'signed_off'
    );
  }, [templatesResponse]);

  const totals = useMemo(() => ({
    storefronts: touchpoints.filter((t) => t.is_active).length,
    views: touchpoints.reduce((s, t) => s + (t.views_count || 0), 0),
    sales: touchpoints.reduce((s, t) => s + (t.purchases_count || 0), 0),
  }), [touchpoints]);

  const buyUrl = (key: string) => `${window.location.origin}/buy/${key}`;

  const copyLink = async (key: string) => {
    await navigator.clipboard.writeText(buyUrl(key));
    addToast({ type: 'success', title: 'Link copied', message: 'Paste it anywhere your customers are.' });
  };

  const copyEmbed = async (tp: Touchpoint) => {
    const snippet =
      `<script src="${window.location.origin}/embed.js" ` +
      `data-storefront="${tp.storefront_key}" ` +
      `data-label="Get ${tp.template_name}" async></script>`;
    await navigator.clipboard.writeText(snippet);
    addToast({
      type: 'success',
      title: 'Embed code copied',
      message: 'Paste it into any website — HTML, WordPress, React, anything.',
    });
  };

  const shareHref = (tp: Touchpoint): string => {
    const url = buyUrl(tp.storefront_key);
    const text = `Here's our ${tp.template_name} — you can view and get it here: ${url}`;
    if (tp.touchpoint_type === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (tp.touchpoint_type === 'email')
      return `mailto:?subject=${encodeURIComponent(tp.template_name)}&body=${encodeURIComponent(text)}`;
    return url;
  };

  const handlePublish = async () => {
    if (!selTemplate) return;
    try {
      const tp = await createTouchpoint.mutateAsync({ template_id: selTemplate, touchpoint_type: selRoute });
      addToast({
        type: 'success',
        title: 'Storefront is live',
        message: 'Your buy link is ready — copy it and share.',
      });
      if (tp?.storefront_key) await navigator.clipboard.writeText(buyUrl(tp.storefront_key)).catch(() => {});
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Could not create the storefront',
        message: e?.response?.data?.error?.message || 'Please try again.',
      });
    }
  };

  const handleToggle = async (tp: Touchpoint) => {
    try {
      await setActive.mutateAsync({ id: tp.id, is_active: !tp.is_active });
      addToast({
        type: 'success',
        title: tp.is_active ? 'Storefront paused' : 'Storefront resumed',
        message: tp.is_active ? 'The link now shows "not available".' : 'The link is live again.',
      });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update failed', message: e?.response?.data?.error?.message || 'Please try again.' });
    }
  };

  const isDark = isDarkMode;
  const card = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const heading = isDark ? 'text-slate-100' : 'text-slate-900';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* ── hero ── */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 sm:p-10 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="flex items-center gap-2 text-indigo-100 text-xs font-semibold uppercase tracking-widest mb-3">
          <Sparkles className="w-4 h-4" /> Extend
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Sell where your customers already are.
        </h1>
        <p className="text-indigo-100 max-w-2xl">
          Turn any published template into a buy link for your website, WhatsApp or email.
          Every sale lands in ContractNest as a real contract — automatically.
        </p>
        {(totals.storefronts > 0 || totals.views > 0) && (
          <div className="flex gap-6 mt-6 text-sm">
            <div><span className="text-2xl font-bold">{totals.storefronts}</span> <span className="text-indigo-200">live</span></div>
            <div><span className="text-2xl font-bold">{totals.views}</span> <span className="text-indigo-200">views</span></div>
            <div><span className="text-2xl font-bold">{totals.sales}</span> <span className="text-indigo-200">sales</span></div>
          </div>
        )}
      </div>

      {/* ── route cards ── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {ROUTES.map((r) => {
          const on = entitled(r.type);
          const Icon = r.icon;
          return (
            <div key={r.type} className={`relative rounded-2xl border p-5 ${card}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: `${r.accent}1A`, color: r.accent }}>
                  <Icon className="w-5 h-5" />
                </div>
                {on ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" /> {isPlatform ? 'Included' : 'Active'}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'}`}>
                    <Lock className="w-3 h-3" /> {r.price}
                  </span>
                )}
              </div>
              <div className={`font-semibold mb-1 ${heading}`}>{r.label}</div>
              <p className={`text-sm leading-relaxed ${subtext}`}>{r.pitch}</p>
              {!on && (
                <button
                  onClick={() => navigate('/businessmodel/tenants/pricing-plans')}
                  className="mt-4 w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: r.accent }}
                >
                  Unlock {r.label} {r.price !== 'Free' && `— ${r.price}`}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── publish composer ── */}
      <div className={`rounded-2xl border p-5 sm:p-6 mb-8 ${card}`}>
        <div className={`font-semibold mb-1 ${heading}`}>Put a template out there</div>
        <p className={`text-sm mb-4 ${subtext}`}>
          Pick a published template and a route — you get a link your customers can buy from.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selTemplate}
            onChange={(e) => setSelTemplate(e.target.value)}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="">Choose a template…</option>
            {publishedTemplates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.display_name || t.name}</option>
            ))}
          </select>
          <select
            value={selRoute}
            onChange={(e) => setSelRoute(e.target.value as TouchpointType)}
            className={`sm:w-44 px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            {ROUTES.map((r) => (
              <option key={r.type} value={r.type} disabled={!entitled(r.type)}>
                {r.label}{!entitled(r.type) ? ' (locked)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handlePublish}
            disabled={!selTemplate || !entitled(selRoute) || createTouchpoint.isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            {createTouchpoint.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Create link
          </button>
        </div>
        {publishedTemplates.length === 0 && (
          <p className={`text-xs mt-3 ${subtext}`}>
            No published templates yet — sign one off in Catalog Studio → Templates first.
          </p>
        )}
      </div>

      {/* ── storefront list ── */}
      <div className={`rounded-2xl border ${card}`}>
        <div className={`px-5 sm:px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} font-semibold ${heading}`}>
          Your storefronts
        </div>
        {tpLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : touchpoints.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag className={`w-8 h-8 mx-auto mb-3 ${subtext}`} />
            <p className={`text-sm ${subtext}`}>Nothing published yet. Create your first link above — it takes ten seconds.</p>
          </div>
        ) : (
          <ul className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {touchpoints.map((tp) => {
              const route = ROUTES.find((r) => r.type === tp.touchpoint_type);
              const Icon = route?.icon || Globe;
              return (
                <li key={tp.id} className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                       style={{ backgroundColor: `${route?.accent}1A`, color: route?.accent }}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className={`text-sm font-medium ${heading} ${!tp.is_active ? 'opacity-50' : ''}`}>
                      {tp.template_name}
                    </div>
                    <div className={`text-[11px] ${subtext}`}>
                      {route?.label} · <Eye className="inline w-3 h-3 -mt-0.5" /> {tp.views_count} views ·{' '}
                      <ShoppingBag className="inline w-3 h-3 -mt-0.5" /> {tp.purchases_count} sales
                      {!tp.is_active && ' · paused'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button title="Copy buy link" onClick={() => copyLink(tp.storefront_key)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <Copy className="w-4 h-4" />
                    </button>
                    {tp.touchpoint_type === 'website' && (
                      <button title="Copy embed code for your website" onClick={() => copyEmbed(tp)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                        <Globe className="w-4 h-4" />
                      </button>
                    )}
                    <a title={tp.touchpoint_type === 'website' ? 'Open buy page' : 'Share'}
                       href={shareHref(tp)} target="_blank" rel="noreferrer"
                       className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button title={tp.is_active ? 'Pause' : 'Resume'} onClick={() => handleToggle(tp)}
                      disabled={setActive.isPending}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      {tp.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className={`text-[11px] mt-6 text-center ${subtext}`}>
        Buyers land on a hosted checkout and finish in your standard contract review flow.
        Viewing is always free — a sale creates a contract in your book.
      </p>
    </div>
  );
};

export default ExtendPage;
