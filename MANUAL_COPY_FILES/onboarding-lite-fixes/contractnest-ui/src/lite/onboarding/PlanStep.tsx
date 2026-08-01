// src/lite/onboarding/PlanStep.tsx
//
// "Choose your plan" — the last screen of onboarding.
//
// NOTHING IS DESIGNED HERE. It renders the SAME PlanCard component that
// /businessmodel/tenants/pricing-plans renders, from the same data. This file
// is a wrapper, not a pricing page.
//
// WHY THE EXISTING PAGE COULD NOT SIMPLY BE ROUTED IN
// PricingPlansPage's three actions all navigate OUT of onboarding:
//   line 71  → /businessmodel/tenants/pricing-plans/{planId}/subscribe
//   line 76  → /businessmodel/tenants/pricing-plans/{planId}/trial
//   line 81  → /businessmodel/tenants/subscription
// Mid-onboarding that abandons the flow. Worse, two of those three routes DO
// NOT EXIST — App.tsx registers only an `index` child under
// /businessmodel/tenants/pricing-plans, so "Subscribe" lands on NotFoundPage
// for any tenant who clicks it today. That is a live bug in its own right and
// is reported separately; this screen simply does not depend on it.
//
// WHY IT COMES AFTER THE CONTRACT
// A commercial ask lands better once the tenant has seen the product do
// something. They arrive here with a furnished catalog and a contract that
// exists, which is the moment a price means anything.
//
// WHAT IT WRITES
// completeVaniStep('done', { selected_plan_id }) — into step_data only.
// t_bm_tenant_subscription is deliberately NOT written: PlanCard is fed from
// fakePricingPlans (a JSON fixture), and a subscription row pointing at a
// fixture id would be worse than no row. When the 8 real plans in
// t_bm_pricing_plan are wired to this component, this is the one line to
// change — and that same row becomes the pre-MVP/MVP signal for revealAll.

import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import PlanCard from '@/components/businessmodel/tenants/pricing/PlanCard';
import { fakePricingPlans } from '@/utils/fakejson/PricingPlans';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { vaniToast } from '@/components/common/toast';
import { completeVaniStep, markOnboardingComplete } from '@/utils/onboarding/completeVaniStep';

import ExpressShell from './ExpressShell';
import { normalisePersona, type PersonaId } from './expressFlow';

/** Where onboarding hands over to the product. */
const COCKPIT_PATH = '/ops/cockpit';

export const PlanStep: React.FC = () => {
  const location = useLocation();
  const { formData } = useTenantProfile({ isOnboarding: true });
  const [leaving, setLeaving] = useState(false);

  const personaId: PersonaId | null = normalisePersona(
    (formData as unknown as { persona?: string })?.persona || formData?.business_type_id
  );

  // VaNiReviewFinalize owns the contract success state now — it shows the
  // document, the schedule and the CNAK. By the time the tenant reaches this
  // screen they have already seen all of that, so this only needs to
  // acknowledge it happened, not repeat it.
  const routeState = (location.state || {}) as { contractCreated?: boolean };

  const plans = useMemo(
    () =>
      // Same filter the existing pricing page applies (pricing-plans/index.tsx).
      (fakePricingPlans || []).filter((p) => p.isVisible && !p.isArchived),
    []
  );

  /**
   * Leaving onboarding is a HARD navigation, not a router push.
   *
   * FirstContractStep put the session into the test environment by writing
   * localStorage['is_live_environment'] — which api.ts reads on every request,
   * but which AuthContext only reads when it initialises (AuthContext.tsx:169).
   * A router push would leave the header badge saying "Live" while every
   * request went to test. A full load re-seeds AuthContext from the same key,
   * so the badge tells the truth and the tenant can switch to live themselves.
   */
  const leaveOnboarding = async (planId: string | null) => {
    if (leaving) return;
    setLeaving(true);
    if (planId) vaniToast.success('Noted — we will confirm your plan with you.');

    // AWAIT the completion writes before the hard navigation. The old
    // fire-and-forget + 250ms timeout cancelled the in-flight POST on most
    // networks (UI → API → edge → DB is two hops), so t_tenant_onboarding
    // was never marked complete and every next login forced onboarding
    // again. Both writes go out together and the whole wait is bounded at
    // 4s so a dead network can never trap the tenant on this screen —
    // markOnboardingComplete is the unconditional is_completed flip, the
    // 'done' step write keeps step_data/completed_steps truthful.
    try {
      await Promise.race([
        Promise.allSettled([
          completeVaniStep('done', { selected_plan_id: planId }),
          markOnboardingComplete(),
        ]),
        new Promise((resolve) => window.setTimeout(resolve, 4000)),
      ]);
    } finally {
      window.location.assign(COCKPIT_PATH);
    }
  };

  return (
    <ExpressShell
      persona={personaId}
      title="Last thing — which plan suits you?"
      subtitle="Nothing is charged today. Pick what looks right and we'll confirm it with you; you can change it any time from Settings."
      footer={
        <button type="button" className="cnx-link" onClick={() => leaveOnboarding(null)}>
          Skip — decide later
        </button>
      }
    >
      {routeState.contractCreated && (
        <div className="cnx-aside" style={{ boxShadow: 'none' }}>
          <span className="cnx-asideicon" aria-hidden="true">
            <CheckCircle2 size={17} />
          </span>
          <span className="cnx-asidetitle">Your first contract is live in test</span>
          <p className="cnx-asidebody">
            Nothing has reached a real customer. Open it from Contracts whenever you want to
            send it for real.
          </p>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="cnx-empty">
          No plans to show right now — that&apos;s fine, nothing is blocked. We&apos;ll be in
          touch about pricing.
        </p>
      ) : (
        <div className="cnx-plans">
          {plans.map((plan) => (
            <PlanCard
              key={String(plan.id)}
              // PlanCard declares its own local PricingPlan interface, structurally
              // compatible with the fixture but not the same nominal type.
              plan={plan as never}
              currency="INR"
              isActive={false}
              onSubscribe={() => leaveOnboarding(String(plan.id))}
              onStartTrial={() => leaveOnboarding(String(plan.id))}
              onManagePlan={() => leaveOnboarding(String(plan.id))}
            />
          ))}
        </div>
      )}

      <span className="cnx-hint">
        These are indicative. Nothing is charged and no card is collected during onboarding —
        we confirm pricing with you directly.
      </span>
    </ExpressShell>
  );
};

export default PlanStep;
