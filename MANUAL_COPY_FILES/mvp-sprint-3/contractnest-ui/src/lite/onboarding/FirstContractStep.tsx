// src/lite/onboarding/FirstContractStep.tsx
//
// The last thing onboarding does: create a real contract.
//
// A tenant used to finish onboarding with a furnished catalog, three sample
// contacts and a dashboard — a to-do list, not an outcome. This turns the end
// of onboarding into a contract that exists.
//
// EVERYTHING HERE IS AN EXISTING ENDPOINT. No template, no LLM, no new API.
//
//   vaniComposerService.shortlist(intent)    the tenant's own blocks, already
//                                            carrying activity, cycle_days and
//                                            price — the grouping m_cat_blocks
//                                            does not store is resolved here
//   vaniComposerService.assemble(...)        STEP 5, deterministic. The LLM
//                                            step (selectBlocks) is SKIPPED —
//                                            the tenant ticks boxes, so the
//                                            selection is built locally and
//                                            handed straight to assemble
//   useContractSubmission.submit(draft)      the same path the wizard and the
//                                            VaNi composer both finalize through
//
// WHY NOT THE COMPOSER OR THE WIZARD
// Both already exist and both stay untouched. The composer wants an intent
// sentence and runs two LLM calls; the wizard is a multi-step form. Neither is
// right for someone who has existed for four minutes. This is a narrow front
// door, not a replacement — everyone else keeps what they have.
//
// TEST, NOT LIVE
// The contract is created in the test environment, deliberately: this is a
// rehearsal with sample contacts, and it must not land in a real ledger.
// api.ts reads localStorage['is_live_environment'] on EVERY request
// (getCurrentEnvironment, api.ts:75) and the interceptor overwrites any
// per-request header, so flipping that key is both necessary and sufficient —
// no change to AuthContext, which stays untouched. The header badge reads
// AuthContext state rather than storage, so the final exit from onboarding is
// a hard navigation, which re-initialises AuthContext (AuthContext.tsx:169
// seeds isLive from this same key) and leaves the badge honestly showing Test.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, UserPlus, AlertTriangle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useContactList, invalidateContactsCache } from '@/hooks/useContacts';
import { useContractSubmission } from '@/hooks/useContractSubmission';
import QuickAddContactDrawer from '@/components/contacts/QuickAddContactDrawer';
import vaniComposerService, {
  type VaniCandidate,
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

export const FirstContractStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { formData } = useTenantProfile({ isOnboarding: true });
  const { submit, isSubmitting } = useContractSubmission();

  const personaId: PersonaId | null = normalisePersona(
    (formData as unknown as { persona?: string })?.persona || formData?.business_type_id
  );

  // Sample contacts seeded during onboarding, plus anything just added.
  const { data: contacts, loading: contactsLoading, hardRefresh } = useContactList({
    status: 'active',
    limit: 25,
  });

  const [contactId, setContactId] = useState<string>('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [cycle, setCycle] = useState<string>('quarterly');
  const [startDate, setStartDate] = useState<string>(todayISO());

  const [candidates, setCandidates] = useState<VaniCandidate[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const inflight = useRef(false);

  // Put the whole screen in test before anything is fetched or written.
  //
  // The contacts cache is cleared at the same time. useContacts keys its cache
  // on AuthContext's isLive (useContacts.ts:26,37), and AuthContext has not
  // re-read storage yet — so without this the test contacts fetched below
  // would be filed under a "live" cache key. Harmless in practice, because the
  // only exit from onboarding is a hard reload that re-seeds AuthContext and
  // changes the key, but a cache entry that lies about which environment it
  // holds is not something to leave lying around.
  useEffect(() => {
    try {
      localStorage.setItem(ENV_STORAGE_KEY, 'false');
    } catch {
      /* storage unavailable — the contract lands in live; the badge still tells the truth */
    }
    try {
      invalidateContactsCache();
    } catch {
      /* cache helper is best-effort — never block the screen on it */
    }
  }, []);

  const contactOptions = useMemo(() => {
    const rows = Array.isArray(contacts) ? contacts : [];
    return rows
      .map((contact) => {
        // Contact carries several name-ish fields depending on type
        // (individual vs corporate); take the first that is populated.
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
    (buyerName: string): VaniParsedIntent => ({
      contract_kind: 'service',
      nomenclature: '',
      buyer_text: buyerName,
      duration: { value: termMonths, unit: 'months' },
      start_date: startDate,
      grace_period_days: 0,
      // signoff, not auto: activating on creation would generate invoices and
      // billing events for a rehearsal. The tenant sends it when ready.
      acceptance: 'signoff',
      billing: { mode: 'prepaid', emi_months: 0, cycle },
      equipment_hint: '',
      activities: [],
      special_asks: [],
    }),
    [termMonths, startDate, cycle]
  );

  // Load the tenant's own blocks once. Everything is pre-ticked: a first
  // contract that covers what they just told us they service is a better
  // default than an empty one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBlocks(true);
      setLoadError(null);
      try {
        const result = await vaniComposerService.shortlist(buildIntent(''));
        if (cancelled) return;
        const rows = result?.candidates || [];
        setCandidates(rows);
        setPickedIds(new Set(rows.map((c) => c.block_id)));
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
    // Deliberately once: re-shortlisting on every term/cycle change would
    // reset the tenant's ticks mid-edit. Term and cycle are applied at
    // assemble time, which is where they actually matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  const picked = useMemo(
    () => candidates.filter((c) => pickedIds.has(c.block_id)),
    [candidates, pickedIds]
  );

  const currency = candidates[0]?.currency || 'INR';
  const runningTotal = useMemo(
    () => picked.reduce((sum, c) => sum + (Number(c.price) || 0), 0),
    [picked]
  );

  const toggle = (blockId: string) =>
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });

  const canCreate = !!contactId && picked.length > 0 && !isSubmitting && !inflight.current;

  const handleCreate = async () => {
    if (!canCreate || inflight.current) return;
    inflight.current = true;

    const buyer = contactOptions.find((c) => c.id === contactId) || null;

    try {
      const intent = buildIntent(buyer?.name || '');

      // The LLM selection step is skipped: the tenant already chose, so the
      // selection is built locally in the exact shape assemble() expects.
      const selection: VaniSelectResult = {
        selections: picked.map((c) => ({
          block_id: c.block_id,
          quantity: 1,
          reason: 'Chosen during onboarding',
        })),
        gaps: [],
        summary: `${picked.length} service${picked.length === 1 ? '' : 's'} selected during onboarding`,
        interactionId: '',
      };

      const composed = await vaniComposerService.assemble(
        intent,
        buyer,
        candidates,
        selection,
        currency
      );

      if (!composed?.draft) throw new Error('Could not assemble the contract');

      // Same cast the VaNi composer uses at VaNiReviewFinalize.tsx:108 —
      // VaniComposeResult['draft'] is wizard-state-SHAPED but not typed as
      // ContractWizardState (paymentMode carries 'defined', for one), and
      // submit() fills the gaps from createInitialWizardState. Matching the
      // established seam rather than inventing a second one.
      const result = await submit(composed.draft as never, 'client');

      completeVaniStep('done', {
        first_contract_id: result?.id || null,
        first_contract_number: result?.contract_number || null,
        first_contract_environment: 'test',
        block_count: picked.length,
      });

      vaniToast.success('Your first contract is ready — created in test mode.');
      navigate('/start/plan', {
        state: {
          contractId: result?.id || null,
          contractNumber: result?.contract_number || null,
          fromExpress: true,
        },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Could not create the contract — please try again';
      vaniToast.error(message);
    } finally {
      inflight.current = false;
    }
  };

  const skip = () => {
    completeVaniStep('done', { first_contract_skipped: true });
    navigate('/start/plan', { state: { fromExpress: true } });
  };

  return (
    <ExpressShell
      persona={personaId}
      title="Create your first contract"
      subtitle="A rehearsal, in test mode — with one of the sample clients we set up for you. Nothing here reaches a real customer, and you can delete it afterwards."
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
          <p className="cnx-empty">
            No contacts yet. Add one to continue — it only needs a name.
          </p>
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

      {/* Services */}
      <div className="cnx-field">
        <span className="cnx-label">
          What&apos;s included
          <span className="cnx-labelnote"> — from the catalog we just built you</span>
        </span>

        {loadingBlocks ? (
          <div className="cnx-loading">
            <Loader2 className="cnx-spin" size={16} />
            Loading your services…
          </div>
        ) : loadError ? (
          <p className="cnx-empty">
            <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {loadError}. You can skip this and build a contract later from the Contracts page.
          </p>
        ) : candidates.length === 0 ? (
          <p className="cnx-empty">
            No services in your catalog yet. Skip this step — you can add services in Catalog
            Studio and create a contract whenever you&apos;re ready.
          </p>
        ) : (
          <div className="cnx-tiles" role="group" aria-label="Services to include">
            {candidates.map((c) => {
              const on = pickedIds.has(c.block_id);
              return (
                <button
                  key={c.block_id}
                  type="button"
                  className="cnx-tile"
                  aria-pressed={on}
                  onClick={() => toggle(c.block_id)}
                >
                  <span className="cnx-tiletick" aria-hidden="true">
                    {on ? <Check size={13} strokeWidth={3} /> : null}
                  </span>
                  <span className="cnx-tiletext">
                    <span className="cnx-tilename">{c.name}</span>
                    <span className="cnx-tilesub">
                      {money(Number(c.price) || 0, c.currency || currency)}
                      {c.cycle_days ? ` · every ${c.cycle_days} days` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
        {picked.length === 0
          ? 'Pick at least one service to include.'
          : `${picked.length} service${picked.length === 1 ? '' : 's'} · ${money(runningTotal, currency)} per cycle before tax. Everything is editable after it is created.`}
      </span>

      <button
        type="button"
        className="cnx-btn cnx-primary"
        disabled={!canCreate}
        onClick={handleCreate}
      >
        {isSubmitting ? <Loader2 className="cnx-spin" size={16} /> : null}
        {isSubmitting ? 'Creating…' : 'Create in test mode'}
      </button>

      {showAddContact && (
        <QuickAddContactDrawer
          isOpen={showAddContact}
          onClose={() => setShowAddContact(false)}
          onSuccess={(newContactId: string) => {
            setShowAddContact(false);
            // Select what they just created — they added it to use it.
            if (newContactId) setContactId(newContactId);
            hardRefresh?.();
          }}
        />
      )}
    </ExpressShell>
  );
};

export default FirstContractStep;
