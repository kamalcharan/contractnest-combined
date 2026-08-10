// ============================================================================
// BuyPage — public hosted checkout for a storefront key (/buy/:storefrontKey)
// ============================================================================
// The "Extend" feature's Layer 0. A published template exposed on a touchpoint
// resolves here: product page → 30-second identity form → contract raised in
// the seller's book → buyer lands in the EXISTING public review/accept flow
// (/contracts/review?cnak=…&secret=…). No parallel checkout machinery.
//
// Public page: bare axios, no auth interceptors, no MainLayout — same posture
// as the session check-in page. Deliberately conversion-first: one column,
// product before form, one CTA, price stated plainly.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck, Check, Loader2, ArrowRight, Building2, AlertCircle, Sparkles,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';
const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

interface StorefrontLine {
  name: string; quantity: number; unit_price: number; total_price: number;
  billing_cycle: string | null; category: string | null;
}
interface StorefrontData {
  seller_name: string;
  touchpoint_type: string;
  template: {
    name: string; description: string | null; currency: string; price: number;
    term: { value: number | null; unit: string | null };
    lines: StorefrontLine[];
  };
}

const fmtMoney = (n: number, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(n);

const termLabel = (t: { value: number | null; unit: string | null }) =>
  t?.value && t?.unit ? `${t.value} ${t.value === 1 ? String(t.unit).replace(/s$/, '') : t.unit}` : null;

const BuyPage: React.FC = () => {
  const { storefrontKey } = useParams<{ storefrontKey: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<StorefrontData | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [forCompany, setForCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await publicClient.get(`/api/storefront/${storefrontKey}`);
        const sf = res?.data?.data?.storefront ?? res?.data?.storefront;
        if (!cancelled) {
          if (sf?.template) setData(sf);
          else setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storefrontKey]);

  const canSubmit = useMemo(
    () => name.trim().length > 1 && (email.trim().length > 3 || phone.trim().length > 6) && !submitting,
    [name, email, phone, submitting]
  );

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await publicClient.post(`/api/storefront/${storefrontKey}/purchase`, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: forCompany ? company.trim() || undefined : undefined,
      });
      const out = res?.data?.data ?? res?.data;
      if (out?.review_path) {
        // Same-origin SPA route — the existing public review/accept flow.
        navigate(out.review_path);
      } else {
        setSubmitError('Your order was created but the confirmation page could not be opened. Please contact the seller.');
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-200 mb-2">This link isn't available</h1>
          <p className="text-sm text-slate-400">
            The offer may have been paused or removed. Please check with whoever shared it with you.
          </p>
        </div>
      </div>
    );
  }

  const { template, seller_name } = data;
  const isFree = !template.price || template.price <= 0;
  const term = termLabel(template.term);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ambient gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-5 py-10 sm:py-14">
        {/* seller strip */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold">
            {seller_name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">{seller_name}</div>
            <div className="text-[11px] text-slate-500">Verified seller · Powered by ContractNest</div>
          </div>
        </div>

        {/* product */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{template.name}</h1>
        {template.description && (
          <p className="text-slate-400 leading-relaxed mb-6">{template.description}</p>
        )}

        {/* price block */}
        <div className="flex items-end gap-3 mb-8">
          <div className="text-4xl font-bold">
            {isFree ? 'Free' : fmtMoney(template.price, template.currency)}
          </div>
          {term && <div className="text-slate-400 pb-1.5">for {term}</div>}
          {!isFree && <div className="text-[11px] text-slate-500 pb-2">+ GST as applicable</div>}
        </div>

        {/* what's included */}
        {template.lines?.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 mb-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              What you get
            </div>
            <ul className="space-y-2.5">
              {template.lines.map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="flex-1 text-sm text-slate-300">
                    {line.name}
                    {line.quantity > 1 && <span className="text-slate-500"> × {line.quantity}</span>}
                  </div>
                  {line.total_price > 0 && (
                    <div className="text-sm text-slate-400">{fmtMoney(line.total_price, template.currency)}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* form */}
        <form onSubmit={handleBuy} className="rounded-2xl border border-indigo-500/25 bg-slate-900/80 backdrop-blur p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div className="text-sm font-semibold">Get started in 30 seconds</div>
          </div>

          <div className="space-y-3">
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm placeholder:text-slate-500"
            />
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email" autoComplete="email" inputMode="email"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm placeholder:text-slate-500"
            />
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (WhatsApp preferred)"
              type="tel" autoComplete="tel" inputMode="tel"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm placeholder:text-slate-500"
            />

            {!forCompany ? (
              <button
                type="button"
                onClick={() => setForCompany(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" /> Buying for a company?
              </button>
            ) : (
              <input
                value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                autoComplete="organization"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm placeholder:text-slate-500"
              />
            )}
          </div>

          {submitError && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white flex items-center justify-center gap-2 transition-colors"
          >
            {submitting
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <>
                  {isFree ? 'Get it free' : `Continue — ${fmtMoney(template.price, template.currency)}`}
                  <ArrowRight className="w-4 h-4" />
                </>}
          </button>

          <p className="mt-3 text-[11px] text-center text-slate-500">
            Nothing is charged yet — you'll review the full agreement and confirm on the next page.
          </p>
        </form>

        {/* trust footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure checkout · Your details go only to {seller_name}
        </div>
      </div>
    </div>
  );
};

export default BuyPage;
