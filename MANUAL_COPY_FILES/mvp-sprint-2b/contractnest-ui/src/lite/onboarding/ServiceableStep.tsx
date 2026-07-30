// src/lite/onboarding/ServiceableStep.tsx
//
// Express screen 2 of 2 — "What do you service?"
//
// This replaces the industry chips. A lift AMC company knows it services
// lifts; it does not know that its catalog lives under "Facility Management".
// So the screen asks the question the business can answer, and derives the
// served industry backwards from the answer (see expressFlow.deriveServedIndustries
// and useGlobalTemplates.ts for why the forward direction was actively wrong
// on this data).
//
// It then emits exactly the route-state payload ResourcePickStep emits, so
// the existing chain — vani-consent → vani-intelligence → vani-working →
// pricing-review → terms-conditions → equipment → done — runs completely
// unmodified with a real set of templates behind it.
//
// Replaces four screens of the long flow: engagement-model, theme-selection,
// industry-selection and resource-pick. Theme and engagement model keep their
// defaults.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, Sparkles } from 'lucide-react';

import api from '@/services/api';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { useServedIndustriesManager } from '@/hooks/queries/useServedIndustries';
import { useKnowledgeTreeCoverage, knowledgeTreeKeys } from '@/hooks/queries/useKnowledgeTree';
import { resourceTemplateKeys } from '@/hooks/queries/useResourceTemplates';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

import ExpressShell from './ExpressShell';
import { useGlobalResourceTemplates, type GlobalTemplate } from './useGlobalTemplates';
import {
  EXPRESS_HANDOFF_PATH,
  clearLandingTrade,
  deriveServedIndustries,
  normalisePersona,
  readLandingTrade,
  suggestTemplateIds,
  type PersonaId,
} from './expressFlow';

// The backend rejects more than 20 served industries. The reverse query
// produces a handful, but the cap is enforced here so a wide selection can
// never turn into a failed save at the last step.
const MAX_SERVED_INDUSTRIES = 20;

// Same type buckets the existing ResourcePickStep uses, so the payload it
// hands to VaniWorkingStep is sorted identically.
const isEquipmentType = (t: string) => t === 'equipment' || t === 'consumable';
const isFacilityType = (t: string) => t === 'asset';
const isServiceType = (t: string) => t === 'service';

interface IndustryRow {
  id?: string;
  name?: string;
}

type Bucket = { key: string; label: string; blurb: string; items: GlobalTemplate[] };

export const ServiceableStep: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { formData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  const { data: industriesResponse, isLoading: industriesLoading } = useIndustries();
  const { data: ktCoverage, isLoading: ktLoading } = useKnowledgeTreeCoverage();
  const { addIndustries } = useServedIndustriesManager();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prefilled, setPrefilled] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guards a double submit surviving a re-render, which state alone does not.
  const inflight = useRef(false);

  useEffect(() => {
    fetchProfile?.();
    // fetchProfile is stable in the existing hook; re-running would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const industries = useMemo<IndustryRow[]>(() => {
    const raw = industriesResponse as unknown;
    if (Array.isArray(raw)) return raw as IndustryRow[];
    const data = (raw as { data?: unknown })?.data;
    return Array.isArray(data) ? (data as IndustryRow[]) : [];
  }, [industriesResponse]);

  const industryIds = useMemo(
    () => industries.map((i) => i.id).filter((id): id is string => !!id),
    [industries]
  );

  const industryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    industries.forEach((i) => {
      if (i.id) map[i.id] = i.name || i.id;
    });
    return map;
  }, [industries]);

  const { data: templates, isLoading: templatesLoading, isError, refetch } =
    useGlobalResourceTemplates(industryIds);

  const isLoading = industriesLoading || templatesLoading || ktLoading;

  // persona is written by express screen 1; null while the profile resolves,
  // which keeps the KT gate off on the first render rather than wrongly
  // hiding a buyer's equipment.
  const personaId: PersonaId | null = normalisePersona(
    (formData as unknown as { persona?: string })?.persona || formData?.business_type_id
  );
  const isSeller = personaId === 'seller' || personaId === 'both';

  const hasKT = (t: GlobalTemplate) => (ktCoverage?.[t.id]?.variants_count ?? 0) > 0;

  // Sellers need a Knowledge Tree behind equipment — that is what becomes
  // catalog blocks with checkpoints and prices. Buyers register equipment as
  // assets, so no KT is required. Identical rule to ResourcePickStep.
  const selectable = (t: GlobalTemplate) =>
    !(isEquipmentType(t.resource_type_id) && isSeller) || hasKT(t);

  const pool = useMemo(() => {
    const all = templates || [];
    return all
      .filter(
        (t) =>
          isEquipmentType(t.resource_type_id) ||
          isFacilityType(t.resource_type_id) ||
          isServiceType(t.resource_type_id)
      )
      .filter(selectable)
      .sort((a, b) => {
        const kt = Number(hasKT(b)) - Number(hasKT(a));
        if (kt !== 0) return kt;
        const rec = Number(b.is_recommended) - Number(a.is_recommended);
        if (rec !== 0) return rec;
        const pop = b.popularity_score - a.popularity_score;
        if (pop !== 0) return pop;
        return a.name.localeCompare(b.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, ktCoverage, isSeller]);

  // What is shown by default: the templates that arrive with a Knowledge Tree,
  // i.e. the ones that produce a furnished catalog rather than an empty shell.
  // Everything else is one click away.
  // The coverage lookup is inlined rather than calling hasKT so the dependency
  // list is genuinely complete.
  const featured = useMemo(
    () => pool.filter((t) => (ktCoverage?.[t.id]?.variants_count ?? 0) > 0),
    [pool, ktCoverage]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return pool.filter((t) => t.name.toLowerCase().includes(q));
    if (showAll || featured.length === 0) return pool;
    return featured;
  }, [pool, featured, search, showAll]);

  // Pre-tick from the trade chosen on the landing page, once data has arrived.
  useEffect(() => {
    if (prefilled || pool.length === 0) return;
    const suggested = suggestTemplateIds(readLandingTrade(), pool);
    if (suggested.length > 0) setSelectedIds(new Set(suggested));
    setPrefilled(true);
  }, [pool, prefilled]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selected = useMemo(() => pool.filter((t) => selectedIds.has(t.id)), [pool, selectedIds]);

  const derivedIndustryIds = useMemo(() => deriveServedIndustries(selected), [selected]);
  const derivedIndustryNames = derivedIndustryIds
    .map((id) => industryNameById[id] || id)
    .sort((a, b) => a.localeCompare(b));

  const buckets: Bucket[] = useMemo(() => {
    const defs: Bucket[] = [
      {
        key: 'equipment',
        label: 'Equipment',
        blurb: 'Machines you maintain — each becomes a priced service block',
        items: visible.filter((t) => isEquipmentType(t.resource_type_id)),
      },
      {
        key: 'facilities',
        label: 'Facilities & areas',
        blurb: 'Spaces you service on a round',
        items: visible.filter((t) => isFacilityType(t.resource_type_id)),
      },
      {
        key: 'services',
        label: 'Standalone services',
        blurb: 'Work that is not tied to a specific machine',
        items: visible.filter((t) => isServiceType(t.resource_type_id)),
      },
    ];
    return defs.filter((b) => b.items.length > 0);
  }, [visible]);

  const handleContinue = async () => {
    if (selected.length === 0 || inflight.current) return;
    inflight.current = true;
    setSubmitting(true);

    const selEq = selected.filter((t) => isEquipmentType(t.resource_type_id));
    const selFac = selected.filter((t) => isFacilityType(t.resource_type_id));
    const selSvc = selected.filter((t) => isServiceType(t.resource_type_id));

    try {
      // 1. Served industries, derived backwards from the picks. Done FIRST
      //    because it is the only step that can legitimately fail in a way the
      //    tenant must see — everything after it is either best-effort or
      //    local. Skipped when the derivation is empty (every pick universal),
      //    which is fine: seeding runs off the template ids below, not off
      //    industries.
      if (derivedIndustryIds.length > 0) {
        await addIndustries(derivedIndustryIds.slice(0, MAX_SERVED_INDUSTRIES));
      }

      // 2. Persist the picks, exactly as ResourcePickStep does — same
      //    endpoint, same purpose mapping. Best-effort by design there too:
      //    the seeder retries from route state if this never landed.
      const isBuyer = personaId === 'buyer' || personaId === 'both';
      const selections: Array<{ resource_template_id: string; purpose: 'sell' | 'own' }> = [];
      if (isSeller) {
        selEq.forEach((t) => selections.push({ resource_template_id: t.id, purpose: 'sell' }));
        selSvc.forEach((t) => selections.push({ resource_template_id: t.id, purpose: 'sell' }));
      }
      if (isBuyer) {
        selEq.forEach((t) => selections.push({ resource_template_id: t.id, purpose: 'own' }));
        selFac.forEach((t) => selections.push({ resource_template_id: t.id, purpose: 'own' }));
      } else {
        selFac.forEach((t) => selections.push({ resource_template_id: t.id, purpose: 'sell' }));
      }
      if (selections.length > 0) {
        try {
          await api.post('/api/onboarding/selected-resources', {
            selections,
            source: 'onboarding',
          });
        } catch (err: unknown) {
          console.error(
            '[express] Failed to persist selections (seed will retry):',
            (err as { message?: string })?.message
          );
        }
      }

      // 3. Report both steps this screen stands in for, so the resume map and
      //    step_data match what the long flow would have written.
      completeVaniStep('industry-selection', { industryIds: derivedIndustryIds });
      completeVaniStep('resource-pick', {
        equipment_template_ids: selEq.map((t) => t.id),
        facility_template_ids: selFac.map((t) => t.id),
        service_template_ids: selSvc.map((t) => t.id),
        persona: personaId,
      });

      clearLandingTrade();

      // 4. Served industries just changed, and resource templates are scoped
      //    server-side by them with a 2 minute staleTime. Awaited so every
      //    later screen mounts against freshly scoped data instead of a list
      //    fetched before the tenant had any industry at all.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: resourceTemplateKeys.all }),
        queryClient.invalidateQueries({ queryKey: knowledgeTreeKeys.all }),
      ]);

      vaniToast.success(
        `Building your workspace from ${selected.length} ${selected.length === 1 ? 'item' : 'items'}…`
      );

      // 5. The exact payload ResourcePickStep hands to vani-consent.
      navigate(EXPRESS_HANDOFF_PATH, {
        state: {
          selectedEquipmentTemplates: selEq,
          selectedFacilityTemplates: selFac,
          selectedServiceTemplates: selSvc,
          personaId,
          fromExpress: true,
        },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Could not save your setup — please try again';
      vaniToast.error(message);
    } finally {
      inflight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <ExpressShell
      current="serve"
      title="What do you service?"
      subtitle="Pick what you work on. We'll work out your industry from that, then pre-build your catalog with real checkpoints and market-reference prices."
      footer={
        <button type="button" className="cnx-link" onClick={() => navigate('/start')}>
          ← Back
        </button>
      }
    >
      {isLoading ? (
        <div className="cnx-loading">
          <Loader2 className="cnx-spin" size={18} />
          Loading the catalog…
        </div>
      ) : isError ? (
        <div className="cnx-empty">
          <p>We couldn&apos;t load the catalog just now.</p>
          <button type="button" className="cnx-btn cnx-primary" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : pool.length === 0 ? (
        <p className="cnx-empty">
          Nothing in the catalog matches your setup yet. Continue with the full form and you
          can build your services by hand in Catalog Studio.
        </p>
      ) : (
        <>
          <input
            className="cnx-input cnx-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search — lift, HVAC, generator, transformer…"
          />

          {buckets.map((bucket) => (
            <div className="cnx-field" key={bucket.key}>
              <span className="cnx-label">
                {bucket.label}
                <span className="cnx-labelnote"> — {bucket.blurb}</span>
              </span>
              <div className="cnx-tiles" role="group" aria-label={bucket.label}>
                {bucket.items.map((t) => {
                  const on = selectedIds.has(t.id);
                  const ready = hasKT(t);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="cnx-tile"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                    >
                      <span className="cnx-tiletick" aria-hidden="true">
                        {on ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                      <span className="cnx-tiletext">
                        <span className="cnx-tilename">{t.name}</span>
                        {t.sub_category && <span className="cnx-tilesub">{t.sub_category}</span>}
                      </span>
                      {ready && (
                        <span className="cnx-tilebadge" title="Comes with checkpoints and prices">
                          <Sparkles size={11} />
                          Ready
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <p className="cnx-empty">
              Nothing matches “{search}”. Clear the search to see the list again — and if what
              you service genuinely isn&apos;t here, pick the closest thing; every service,
              checkpoint and price is editable afterwards.
            </p>
          )}

          {!search && featured.length > 0 && pool.length > featured.length && (
            <button type="button" className="cnx-link" onClick={() => setShowAll((v) => !v)}>
              {showAll
                ? `Show only the ${featured.length} ready-to-sell items`
                : `Show all ${pool.length} items`}
            </button>
          )}

          <span className="cnx-hint">
            {selected.length === 0
              ? 'Pick at least one. Everything here is editable later — this only decides what we build first.'
              : derivedIndustryNames.length > 0
                ? `${selected.length} selected. We'll set your workspace up for ${derivedIndustryNames.join(', ')}.`
                : `${selected.length} selected.`}
          </span>
        </>
      )}

      <button
        type="button"
        className="cnx-btn cnx-primary"
        disabled={selected.length === 0 || submitting}
        onClick={handleContinue}
      >
        {submitting ? <Loader2 className="cnx-spin" size={16} /> : null}
        {submitting ? 'Setting up…' : 'Build my workspace'}
      </button>
    </ExpressShell>
  );
};

export default ServiceableStep;
