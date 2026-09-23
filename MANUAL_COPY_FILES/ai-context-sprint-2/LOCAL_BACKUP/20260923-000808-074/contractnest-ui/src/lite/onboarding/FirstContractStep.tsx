// src/lite/onboarding/FirstContractStep.tsx
//
// The last thing onboarding does: create a real contract.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT CHANGED AFTER THE FIRST LIVE TEST
//
// A tenant onboarded for lifts AND HVAC got a "first contract" containing every
// block of both — roughly 166 rows, of which ~140 were spare parts including
// ₹35k rescue devices. That was this file pre-ticking everything shortlist()
// returned. A first contract has to look like an AMC, not an inventory.
//
// Four corrections, all from the owner's review:
//
//   1. ONE EQUIPMENT AT A TIME. VaniCandidate carries `equipment`, so the
//      screen groups by it and asks which one this contract is for.
//   2. SERVICES BY DEFAULT, PARTS OPT-IN. Within an equipment, only the
//      recurring service blocks are ticked; spare parts are listed separately
//      and start unticked.
//   3. THE VARIANT IS NAMED. A lift catalog covers 8 variants (Traction
//      Passenger Geared, and so on) and a quick contract can only be one of
//      them, so the screen says which.
//   4. REVIEW BEFORE IT EXISTS. The contract document and the event schedule
//      are shown before anything is written — see the reuse note below.
//
// ─────────────────────────────────────────────────────────────────────────────
// REUSE: VaNiReviewFinalize DOES THE ENTIRE SECOND HALF
//
// The review/confirm stage is NOT built here. VaNiReviewFinalize already
// renders ReviewSendStep (the contract document) and EventsPreviewStep (the
// service + billing timeline) as tabs, performs the submit itself, and shows
// the success state with the CNAK and a copy button. It takes exactly one
// input — a VaniComposeResult — which is precisely what assemble() returns.
//
// So this screen collects the answers, calls assemble(), and hands the result
// over. That deletes the duplicate submit() this file used to carry, and it
// means the express flow shows the same document, the same schedule and the
// same CNAK treatment as the composer, because it IS the same component.
//
// It also fixes something the previous version got wrong: submit() returns
// global_access_id, and this file used to discard it — the express flow minted
// a CNAK and never showed it to anyone.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY NOT THE COMPOSER OR THE WIZARD FOR THE WHOLE THING
// The composer wants a typed intent sentence and runs two LLM calls; the
// wizard is a multi-step form. Neither suits someone four minutes old. This
// screen is the short front door onto the same machinery — everyone else keeps
// what they have, and both remain untouched.
//
// TEST, NOT LIVE
// Onboarding seeds sample contacts into the test environment ONLY (zero live
// contacts on every onboarded tenant), so this must run in test or the client
// list is empty. api.ts reads localStorage['is_live_environment'] on every
// request and the interceptor overwrites per-request headers, so setting that
// key is necessary and sufficient. AuthContext is not touched.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, UserPlus, AlertTriangle, CalendarClock } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useContactList, invalidateContactsCache } from '@/hooks/useContacts';
import { useCatBlocks } from '@/hooks/queries/useCatBlocks';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import VaNiReviewFinalize from '@/components/contracts/vani/VaNiReviewFinalize';
import vaniComposerService, {
  type VaniCandidate,
  type VaniComposeResult,
  type VaniParsedIntent,
  type VaniSelectResult,
} from '@/services/vaniComposerService';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep } from '@/utils/onboarding/completeVaniStep';

import ExpressShell from './ExpressShell';
import { normalisePersona, type PersonaId } from './expressFlow';

const ENV_STORAGE_KEY = 'is_live_environment';

const TERMS = [
  { label: '6 months', value: 6 },
  { label: '1 year', value: 12 },
  { label: '2 years', value: 24 },
] as const;

const CYCLES = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annual' },
] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

const money = (n: number, currency: string) =>
  `${currency === 'INR' ? '₹' : ''}${Math.round(n).toLocaleString('en-IN')}`;

/**
 * A recurring service, as opposed to a spare part. Services carry a cadence;
 * parts are one-off catalog items. For an Elevator / Lift the split is about
 * 12 services to 70 parts, which is why parts must not be ticked by default.
 */
const isServiceBlock = (c: VaniCandidate) => Number(c.cycle_days) > 0;

const UNGROUPED = 'Other services';

interface VariantNote {
  count: number;
  firstName: string;
}

export const FirstContractStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });

  const personaId: PersonaId | null = normalisePersona(
    (formData as unknown as { persona?: string })?.persona || formData?.business_type_id
  );

  const { data: contacts, loading: contactsLoading, hardRefresh } = useContactList({
    status: 'active',
    limit: 25,
  });

  // Blocks carry variant_pricing; the composer's candidate payload does not,
  // so the variant note comes from here. Purely additive — if this query fails
  // the note is omitted and nothing else changes.
  const { data: catBlocksResponse } = useCatBlocks({ limit: 500 } as never);

  const [contactId, setContactId] = useState<string>('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [cycle, setCycle] = useState<string>('quarterly');
  const [startDate, setStartDate] = useState<string>(todayISO());

  const [candidates, setCandidates] = useState<VaniCandidate[]>([]);
  const [equipment, setEquipment] = useState<string>('');
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [assembling, setAssembling] = useState(false);
  const [composed, setComposed] = useState<VaniComposeResult | null>(null);

  const inflight = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(ENV_STORAGE_KEY, 'false');
    } catch {
      /* storage unavailable — the badge still tells the truth */
    }
    try {
      // useContacts keys its cache on AuthContext's isLive, which has not
      // re-read storage yet; without this the test contacts below would be
      // filed under a "live" key.
      invalidateContactsCache();
    } catch {
      /* best-effort */
    }
  }, []);

  const contactOptions = useMemo(() => {
    const rows = Array.isArray(contacts) ? contacts : [];
    return rows
      .map((contact) => {
        const c = contact as unknown as Record<string, unknown>;
        return {
          id: String(c.id || ''),
          name: String(c.name || c.display_name || c.company_name || 'Unnamed'),
        };
      })
      .filter((c) => !!c.id);
  }, [contacts]);

  useEffect(() => {
    if (!contactId && contactOptions.length > 0) setContactId(contactOptions[0].id);
  }, [contactOptions, contactId]);

  const buildIntent = useCallback(
    (buyerName: string, equipmentHint: string): VaniParsedIntent => ({
      contract_kind: 'service',
      nomenclature: '',
      buyer_text: buyerName,
      duration: { value: termMonths, unit: 'months' },
      start_date: startDate,
      grace_period_days: 0,
      // signoff, not auto: auto-accept would activate on creation and generate
      // invoices and billing events for what is a rehearsal.
      acceptance: 'signoff',
      billing: { mode: 'prepaid', emi_months: 0, cycle },
      equipment_hint: equipmentHint,
      activities: [],
      special_asks: [],
    }),
    [termMonths, startDate, cycle]
  );

  // Load the tenant's own blocks once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBlocks(true);
      setLoadError(null);
      try {
        const result = await vaniComposerService.shortlist(buildIntent('', ''));
        if (cancelled) return;
        setCandidates(result?.candidates || []);
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(
          (err as { message?: string })?.message || 'Could not load your services just now'
        );
      } finally {
        if (!cancelled) setLoadingBlocks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once per tenant: re-shortlisting on every term change would discard the
    // tenant's ticks mid-edit. Term and cycle are applied at assemble time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  /** Candidates grouped by the equipment they belong to. */
  const groups = useMemo(() => {
    const map = new Map<string, VaniCandidate[]>();
    candidates.forEach((c) => {
      const key = (c.equipment || '').trim() || UNGROUPED;
      const list = map.get(key);
      if (list) list.push(c);
      else map.set(key, [c]);
    });
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items,
      services: items.filter(isServiceBlock),
      parts: items.filter((c) => !isServiceBlock(c)),
    }));
  }, [candidates]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.name === equipment) || groups[0] || null,
    [groups, equipment]
  );

  // Default: the first equipment, its services only. This is the fix for the
  // lifts+HVAC+140-parts contract.
  useEffect(() => {
    if (groups.length === 0 || equipment) return;
    const first = groups[0];
    setEquipment(first.name);
    setPickedIds(new Set(first.services.map((c) => c.block_id)));
  }, [groups, equipment]);

  const chooseEquipment = (name: string) => {
    const group = groups.find((g) => g.name === name);
    setEquipment(name);
    setPickedIds(new Set((group?.services || []).map((c) => c.block_id)));
  };

  /**
   * How many variants the chosen equipment's catalog covers, and the first by
   * name. Read from the blocks' variant_pricing, because the composer's
   * candidate payload drops it.
   *
   * NOTE: only the NAME is used, never the variant price. The seeded variant
   * prices do not agree with the block base prices (a ₹1,500 inspection block
   * carries a first-variant price of 1, a ₹1,000 block carries 19) which reads
   * like a multiplier or bad seed data. Quoting those numbers could produce a
   * ₹20 annual AMC, so the contract stays on the block's own price and the
   * variant is mentioned, not priced.
   */
  const variantNote = useMemo<VariantNote | null>(() => {
    if (!activeGroup) return null;
    const raw = catBlocksResponse as unknown as { data?: { blocks?: unknown[] } } | undefined;
    const blocks = raw?.data?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;

    const idsInGroup = new Set(activeGroup.items.map((c) => c.block_id));
    for (const block of blocks) {
      const b = block as Record<string, unknown>;
      if (!idsInGroup.has(String(b.id))) continue;
      const vp = b.variant_pricing as { variants?: Array<{ name?: string }> } | undefined;
      const variants = vp?.variants;
      if (Array.isArray(variants) && variants.length > 0) {
        return {
          count: variants.length,
          firstName: String(variants[0]?.name || '').trim() || 'the first type',
        };
      }
    }
    return null;
  }, [activeGroup, catBlocksResponse]);

  const toggle = (blockId: string) =>
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });

  const picked = useMemo(
    () => (activeGroup?.items || []).filter((c) => pickedIds.has(c.block_id)),
    [activeGroup, pickedIds]
  );

  const currency = candidates[0]?.currency || 'INR';
  const runningTotal = useMemo(
    () => picked.reduce((sum, c) => sum + (Number(c.price) || 0), 0),
    [picked]
  );

  const canContinue = !!contactId && picked.length > 0 && !assembling && !inflight.current;

  /**
   * Assemble only. The write happens inside VaNiReviewFinalize, after the
   * tenant has seen the document and the schedule — nothing is created from
   * this screen.
   */
  const handleReview = async () => {
    if (!canContinue || inflight.current) return;
    inflight.current = true;
    setAssembling(true);

    const buyer = contactOptions.find((c) => c.id === contactId) || null;

    try {
      const intent = buildIntent(buyer?.name || '', activeGroup?.name || '');

      // The LLM selection step is skipped — the tenant ticked boxes, so the
      // selection is built locally in the shape assemble() expects.
      const selection: VaniSelectResult = {
        selections: picked.map((c) => ({
          block_id: c.block_id,
          quantity: 1,
          reason: 'Chosen during onboarding',
        })),
        gaps: [],
        summary: `${picked.length} service${picked.length === 1 ? '' : 's'} for ${activeGroup?.name || 'your equipment'}`,
        interactionId: '',
      };

      const result = await vaniComposerService.assemble(
        intent,
        buyer,
        activeGroup?.items || candidates,
        selection,
        currency
      );

      if (!result?.draft) throw new Error('Could not assemble the contract');
      setComposed(result);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Could not prepare the contract — please try again';
      vaniToast.error(message);
    } finally {
      inflight.current = false;
      setAssembling(false);
    }
  };

  const goToPlan = (contractCreated: boolean) => {
    completeVaniStep('done', {
      first_contract_created: contractCreated,
      first_contract_environment: 'test',
      first_contract_equipment: activeGroup?.name || null,
      block_count: picked.length,
    });
    navigate('/start/plan', { state: { fromExpress: true, contractCreated } });
  };

  const skip = () => {
    completeVaniStep('done', { first_contract_skipped: true });
    navigate('/start/plan', { state: { fromExpress: true } });
  };

  // ── REVIEW ──────────────────────────────────────────────────────────────
  // The contract document, the event schedule, the submit and the CNAK success
  // are all this component. Nothing about them is reimplemented here.
  if (composed) {
    return (
      <VaNiReviewFinalize
        result={composed}
        interactionIds={[]}
        onEdit={() => setComposed(null)}
        onBack={() => setComposed(null)}
        onDone={() => goToPlan(true)}
      />
    );
  }

  // ── FORM ────────────────────────────────────────────────────────────────
  return (
    <ExpressShell
      persona={personaId}
      title="Create your first contract"
      subtitle="A rehearsal, in test mode, with one of the sample clients we set up for you. You'll see the full contract and its schedule before anything is created."
      footer={
        <button type="button" className="cnx-link" onClick={skip}>
          Skip — I&apos;ll do this later
        </button>
      }
    >
      {/* Client */}
      <div className="cnx-field">
        <span className="cnx-label">Client</span>
        {contactsLoading ? (
          <div className="cnx-loading">
            <Loader2 className="cnx-spin" size={16} />
            Loading your contacts…
          </div>
        ) : contactOptions.length === 0 ? (
          <p className="cnx-empty">No contacts yet — add one to continue.</p>
        ) : (
          <select
            className="cnx-input"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            {contactOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="cnx-link" onClick={() => setShowAddContact(true)}>
          <UserPlus size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Add someone else
        </button>
      </div>

      {loadingBlocks ? (
        <div className="cnx-loading">
          <Loader2 className="cnx-spin" size={16} />
          Loading your services…
        </div>
      ) : loadError ? (
        <p className="cnx-empty">
          <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {loadError}. Skip this step and build a contract later from the Contracts page.
        </p>
      ) : groups.length === 0 ? (
        <p className="cnx-empty">
          No services in your catalog yet. Skip this step — you can add services in Catalog
          Studio whenever you&apos;re ready.
        </p>
      ) : (
        <>
          {/* Which equipment. Only shown when there is a choice to make. */}
          {groups.length > 1 && (
            <div className="cnx-field">
              <span className="cnx-label">
                This contract is for
                <span className="cnx-labelnote"> — one at a time; you can create more later</span>
              </span>
              <div className="cnx-chips" role="group" aria-label="Equipment">
                {groups.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    className="cnx-chip"
                    aria-pressed={activeGroup?.name === g.name}
                    onClick={() => chooseEquipment(g.name)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variantNote && variantNote.count > 1 && (
            <span className="cnx-hint">
              Your catalog covers <strong>{variantNote.count} types</strong> of{' '}
              {activeGroup?.name}. This quick contract uses{' '}
              <strong>{variantNote.firstName}</strong> — the full wizard lets you pick any of
              them per contract.
            </span>
          )}

          {/* Services — ticked by default */}
          {(activeGroup?.services.length ?? 0) > 0 && (
            <div className="cnx-field">
              <span className="cnx-label">
                Services
                <span className="cnx-labelnote"> — recurring work, on your KT cadence</span>
              </span>
              <div className="cnx-tiles" role="group" aria-label="Services">
                {activeGroup?.services.map((c) => (
                  <button
                    key={c.block_id}
                    type="button"
                    className="cnx-tile"
                    aria-pressed={pickedIds.has(c.block_id)}
                    onClick={() => toggle(c.block_id)}
                  >
                    <span className="cnx-tiletick" aria-hidden="true">
                      {pickedIds.has(c.block_id) ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <span className="cnx-tiletext">
                      <span className="cnx-tilename">{c.name}</span>
                      <span className="cnx-tilesub">
                        {money(Number(c.price) || 0, c.currency || currency)}
                        {c.cycle_days ? ` · every ${c.cycle_days} days` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spare parts — listed, NOT ticked. These are what made the first
              live test produce a 166-row contract. */}
          {(activeGroup?.parts.length ?? 0) > 0 && (
            <div className="cnx-field">
              <span className="cnx-label">
                Spare parts
                <span className="cnx-labelnote">
                  {' '}— charged when used, so normally left out of an AMC
                </span>
              </span>
              <div className="cnx-tiles" role="group" aria-label="Spare parts">
                {activeGroup?.parts.slice(0, 12).map((c) => (
                  <button
                    key={c.block_id}
                    type="button"
                    className="cnx-tile cnx-pending"
                    aria-pressed={pickedIds.has(c.block_id)}
                    onClick={() => toggle(c.block_id)}
                  >
                    <span className="cnx-tiletick" aria-hidden="true">
                      {pickedIds.has(c.block_id) ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <span className="cnx-tiletext">
                      <span className="cnx-tilename">{c.name}</span>
                      <span className="cnx-tilesub">
                        {money(Number(c.price) || 0, c.currency || currency)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {(activeGroup?.parts.length ?? 0) > 12 && (
                <span className="cnx-hint">
                  Showing 12 of {activeGroup?.parts.length} parts — the rest are in your catalog
                  and can be added to any contract later.
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Terms */}
      <div className="cnx-field">
        <span className="cnx-label">Term</span>
        <div className="cnx-chips" role="group" aria-label="Contract term">
          {TERMS.map((t) => (
            <button
              key={t.value}
              type="button"
              className="cnx-chip"
              aria-pressed={termMonths === t.value}
              onClick={() => setTermMonths(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cnx-field">
        <span className="cnx-label">Billing</span>
        <div className="cnx-chips" role="group" aria-label="Billing cycle">
          {CYCLES.map((c) => (
            <button
              key={c.value}
              type="button"
              className="cnx-chip"
              aria-pressed={cycle === c.value}
              onClick={() => setCycle(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="cnx-field">
        <span className="cnx-label">Starts on</span>
        <input
          className="cnx-input"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </label>

      <span className="cnx-hint">
        <CalendarClock size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
        Next you&apos;ll see the contract itself and its full schedule — every service visit and
        every invoice, dated. That is the point of doing this once: your delivery calendar and
        your receivables are planned from the day the contract starts.
      </span>

      <span className="cnx-hint">
        {picked.length === 0
          ? 'Pick at least one service to include.'
          : `${picked.length} item${picked.length === 1 ? '' : 's'} · ${money(runningTotal, currency)} per cycle before tax.`}
      </span>

      <button
        type="button"
        className="cnx-btn cnx-primary"
        disabled={!canContinue}
        onClick={handleReview}
      >
        {assembling ? <Loader2 className="cnx-spin" size={16} /> : null}
        {assembling ? 'Preparing…' : 'Review the contract →'}
      </button>

      {showAddContact && (
        <QuickAddContactDrawer
          isOpen={showAddContact}
          onClose={() => setShowAddContact(false)}
          onSuccess={(newContactId: string) => {
            setShowAddContact(false);
            if (newContactId) setContactId(newContactId);
            hardRefresh?.();
          }}
        />
      )}
    </ExpressShell>
  );
};

export default FirstContractStep;
