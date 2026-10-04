// src/lite/onboarding/TaxSetupStep.tsx
//
// Express screen for PROVIDERS (seller / both), between "Your business" and
// "What you service": the business currency and the taxes on their prices,
// set BEFORE VaNi builds the catalog so every seeded block carries them.
//
// Owner decisions (2026-10-04): a separate screen; nothing prefilled — the
// tenant creates their own rates; the tax master is the existing
// /settings/tax-settings data (same hooks, same API), unchanged. Which of the
// rates apply to the services being seeded is a choice for THIS seeding,
// handed to the seed call (utils/onboarding/taxChoice) — not a flag on the rate.
//
// Writes:
//   display mode  → useTaxDisplay.updateDisplayMode   (only when changed)
//   rates         → useTaxRates.actions.createTaxRate  (as the tenant adds them)
//   currency      → PUT /api/catalog-defaults/currency (only when changed)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { vaniToast } from '@/components/common/toast';
import { useTaxDisplay } from '@/hooks/useTaxDisplay';
import { useTaxRates } from '@/hooks/useTaxRates';
import { currencyOptions } from '@/utils/constants/currencies';
import { saveOnboardingTaxChoice, readOnboardingTaxChoice } from '@/utils/onboarding/taxChoice';

import ExpressShell from './ExpressShell';
import { normalisePersona } from './expressFlow';

type DisplayMode = 'excluding_tax' | 'including_tax' | 'no_tax';

const MODES: Array<{ id: DisplayMode; title: string; detail: string }> = [
  { id: 'excluding_tax', title: 'Tax is added on top', detail: 'Your prices are before tax; tax is added to the bill' },
  { id: 'including_tax', title: 'Prices include tax', detail: 'Your prices already contain the tax' },
  { id: 'no_tax', title: "I don't charge tax", detail: 'Not tax-registered — no tax on your bills' },
];

export const TaxSetupStep: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant } = useAuth();
  const persona = normalisePersona((location.state as { persona?: string } | null)?.persona) || 'seller';

  const display = useTaxDisplay();
  const rates = useTaxRates();

  const [mode, setMode] = useState<DisplayMode | null>(null);
  const [currency, setCurrency] = useState('');
  const [savedCurrency, setSavedCurrency] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const pendingName = useRef<string | null>(null);

  // TaxRate's re-export does not resolve for tsc here; read the rows loosely.
  const rateList: any[] = (rates.state.data as any[]) || [];

  // Display mode from the tax master (the tax page's own default is "excluding").
  useEffect(() => {
    if (mode === null && display.state.data?.display_mode) {
      setMode(display.state.data.display_mode as DisplayMode);
    }
  }, [display.state.data, mode]);

  // Business currency (Business Profile); a previous choice on this screen.
  useEffect(() => {
    let alive = true;
    api.get(API_ENDPOINTS.CATALOG_DEFAULTS.GET)
      .then((r) => {
        if (!alive) return;
        const c = r.data?.data?.currency || '';
        setCurrency(c);
        setSavedCurrency(c);
      })
      .catch(() => vaniToast.error('Could not load your currency', { message: 'Pick it below — it is saved when you continue.' }))
      .finally(() => alive && setLoadingCurrency(false));
    const previous = readOnboardingTaxChoice(currentTenant?.id);
    if (previous) setChosen(new Set(previous));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  // A rate the tenant just added applies to their services unless they untick it.
  useEffect(() => {
    if (!pendingName.current) return;
    const match = rateList.find((r: any) => r.name === pendingName.current);
    if (match) {
      setChosen((prev) => new Set(prev).add(match.id));
      pendingName.current = null;
    }
  }, [rateList]);

  // Drop choices for rates that no longer exist.
  const liveChosen = useMemo(
    () => rateList.filter((r: any) => chosen.has(r.id)).map((r: any) => r.id as string),
    [rateList, chosen]
  );
  const chosenTotal = rateList
    .filter((r: any) => chosen.has(r.id))
    .reduce((n: number, r: any) => n + (Number(r.rate) || 0), 0);

  const loading = display.state.loading || rates.state.loading || loadingCurrency;
  const charging = mode !== 'no_tax';
  const rateValue = Number(newRate);
  const canAdd = newName.trim().length >= 2 && newRate.trim() !== '' && rateValue > 0 && rateValue <= 100 && !adding;
  const canContinue = !!mode && /^[A-Z]{3}$/.test(currency) && !saving && !loading
    && (!charging || liveChosen.length > 0 || rateList.length === 0);

  const handleAdd = async () => {
    if (!canAdd) return;
    if (rateList.some((r: any) => r.name.trim().toLowerCase() === newName.trim().toLowerCase())) {
      vaniToast.warning('That tax already exists', { message: 'Tick it below instead of adding it again.' });
      return;
    }
    setAdding(true);
    pendingName.current = newName.trim();
    try {
      await rates.actions.createTaxRate({ name: newName.trim(), rate: rateValue, description: '', is_default: rateList.length === 0 });
      setNewName('');
      setNewRate('');
    } finally {
      setAdding(false);
    }
  };

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleContinue = async () => {
    if (!canContinue || !mode) return;
    setSaving(true);
    try {
      if (display.state.data?.display_mode !== mode) {
        await display.updateDisplayMode(mode);
      }
      if (currency !== savedCurrency) {
        await api.put(API_ENDPOINTS.CATALOG_DEFAULTS.CURRENCY, { currency });
        setSavedCurrency(currency);
      }
      const taxRateIds = charging ? liveChosen : [];
      saveOnboardingTaxChoice(currentTenant?.id, taxRateIds);
      navigate('/start/serve', { state: { ...(location.state as object || {}), persona, taxRateIds } });
    } catch (err: any) {
      vaniToast.error('Could not save', {
        message: err?.response?.data?.error?.message || err?.message || 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpressShell
      persona={persona}
      title="Your currency and taxes"
      subtitle="VaNi puts these on every service it builds for you. You can change them later in Settings → Tax settings."
      footer={
        <button type="button" className="cnx-link" onClick={() => navigate('/start/business')}>
          ← Back
        </button>
      }
    >
      {loading ? (
        <div className="cnx-loading"><Loader2 className="cnx-spin" size={18} /> Loading your settings…</div>
      ) : (
        <>
          <label className="cnx-field">
            <span className="cnx-label">Business currency</span>
            <select className="cnx-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {!currency && <option value="">Choose…</option>}
              {currencyOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <span className="cnx-hint">Your catalog is priced in this currency only.</span>
          </label>

          <div className="cnx-field">
            <span className="cnx-label">How do you charge tax?</span>
            <div className="cnx-choices">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="cnx-choice"
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                >
                  <span className="cnx-ct">{m.title}</span>
                  <span className="cnx-cd">{m.detail}</span>
                </button>
              ))}
            </div>
          </div>

          {charging && (
            <div className="cnx-field">
              <span className="cnx-label">Your taxes</span>
              {rateList.length === 0 && (
                <span className="cnx-hint">Add the taxes you charge — for example CGST 9 and SGST 9.</span>
              )}
              {rateList.length > 0 && (
                <div className="cnx-choices">
                  {rateList.map((r: any) => (
                    <button
                      key={r.id}
                      type="button"
                      className="cnx-choice"
                      aria-pressed={chosen.has(r.id)}
                      onClick={() => toggle(r.id)}
                    >
                      <span className="cnx-ct">{r.name} · {Number(r.rate)}%</span>
                      <span className="cnx-cd">{chosen.has(r.id) ? 'Applies to your services' : 'Not applied to your services'}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  className="cnx-input"
                  style={{ flex: 2 }}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tax name, e.g. CGST"
                  maxLength={50}
                />
                <input
                  className="cnx-input"
                  style={{ flex: 1 }}
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Rate %"
                  inputMode="decimal"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
                <button type="button" className="cnx-btn" disabled={!canAdd} onClick={handleAdd}>
                  {adding ? <Loader2 className="cnx-spin" size={14} /> : 'Add'}
                </button>
              </div>
              <span className="cnx-hint">
                {liveChosen.length > 0
                  ? `Your services will carry ${chosenTotal}% tax${mode === 'including_tax' ? ', included in the price' : ', added to the price'}.`
                  : rateList.length > 0
                    ? 'Tick the taxes that apply to your services.'
                    : 'No taxes yet — your services will be built without tax until you add one.'}
              </span>
            </div>
          )}

          <button type="button" className="cnx-btn cnx-primary" disabled={!canContinue} onClick={handleContinue}>
            {saving ? <Loader2 className="cnx-spin" size={16} /> : null}
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </>
      )}
    </ExpressShell>
  );
};

export default TaxSetupStep;
