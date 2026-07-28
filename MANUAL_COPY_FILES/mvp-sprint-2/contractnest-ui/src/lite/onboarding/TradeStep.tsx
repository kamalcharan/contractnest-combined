// src/lite/onboarding/TradeStep.tsx
//
// Express screen 2 of 2. Served industries — the input the seeder actually
// needs to build a catalog.
//
// Replaces two screens of the long flow (engagement-model, theme-selection,
// industry-selection); theme and engagement model keep their defaults.
//
// It hands off to resource-pick rather than skipping it: that step picks the
// equipment/service TEMPLATES the seeder consumes, so bypassing it made the
// seeding run on empty arrays and produce no service blocks.
//
// If the visitor picked a trade on the public landing page, it is pre-selected
// here — that is the whole point of carrying it across, and it means the
// question is confirmed rather than answered.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

import ExpressShell from './ExpressShell';
import {
  EXPRESS_HANDOFF_PATH,
  clearLandingTrade,
  readLandingTrade,
  suggestIndustryIds,
} from './expressFlow';

interface IndustryRow {
  id?: string;
  name?: string;
}

export const TradeStep: React.FC = () => {
  const navigate = useNavigate();
  const { data: industriesResponse, isLoading } = useIndustries();
  const { addIndustries, isAdding } = useServedIndustriesManager();

  const [selected, setSelected] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [search, setSearch] = useState('');

  const industries = useMemo<IndustryRow[]>(() => {
    const raw = industriesResponse as unknown;
    if (Array.isArray(raw)) return raw as IndustryRow[];
    const data = (raw as { data?: unknown })?.data;
    return Array.isArray(data) ? (data as IndustryRow[]) : [];
  }, [industriesResponse]);

  // Pre-select from the landing page's trade, once the list has arrived.
  useEffect(() => {
    if (prefilled || industries.length === 0) return;
    const suggested = suggestIndustryIds(readLandingTrade(), industries);
    if (suggested.length > 0) setSelected(suggested);
    setPrefilled(true);
  }, [industries, prefilled]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return industries;
    return industries.filter((i) => (i.name || '').toLowerCase().includes(q));
  }, [industries, search]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleContinue = async () => {
    if (selected.length === 0 || isAdding) return;
    try {
      await addIndustries(selected);
      completeVaniStep('industry-selection', { industryIds: selected });
      clearLandingTrade();

      const industryNames = industries
        .filter((i) => i.id && selected.includes(i.id))
        .map((i) => i.name)
        .filter(Boolean);

      // Hand off to the existing chain at resource-pick, which chooses the
      // templates the seeder needs and then carries the tenant through
      // consent → seeding → pricing → terms → equipment → done, all untouched.
      navigate(EXPRESS_HANDOFF_PATH, { state: { industryNames, fromExpress: true } });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Could not save your industries — please try again';
      vaniToast.error(message);
    }
  };

  return (
    <ExpressShell
      current="trade"
      title="What's your line of work?"
      subtitle="We'll pre-build your catalog with real services and market-reference prices — so you never start from an empty product."
      footer={
        <button type="button" className="cnx-link" onClick={() => navigate('/start')}>
          ← Back
        </button>
      }
    >
      {isLoading ? (
        <div className="cnx-loading">
          <Loader2 className="cnx-spin" size={18} />
          Loading industries…
        </div>
      ) : (
        <>
          {industries.length > 8 && (
            <input
              className="cnx-input cnx-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search industries…"
            />
          )}

          <div className="cnx-chips" role="group" aria-label="Industries you serve">
            {visible.map((i) => (
              <button
                key={i.id}
                type="button"
                className="cnx-chip"
                aria-pressed={!!i.id && selected.includes(i.id)}
                onClick={() => i.id && toggle(i.id)}
              >
                {i.name}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p className="cnx-empty">
              No industries match “{search}”. Clear the search to see the full list — and if
              your trade genuinely isn&apos;t here, pick the closest one; every service and
              price is editable afterwards.
            </p>
          )}

          <span className="cnx-hint">
            Pick every industry you serve. We&apos;ll seed a catalog for each, set service
            cadences, and prepare your contract templates — you can edit or delete anything
            later.
          </span>
        </>
      )}

      <button
        type="button"
        className="cnx-btn cnx-primary"
        disabled={selected.length === 0 || isAdding}
        onClick={handleContinue}
      >
        {isAdding ? <Loader2 className="cnx-spin" size={16} /> : null}
        {isAdding ? 'Saving…' : 'Continue'}
      </button>
    </ExpressShell>
  );
};

export default TradeStep;
