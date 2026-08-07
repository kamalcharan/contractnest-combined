// src/hooks/useAllowanceWarning.ts
//
// Tells a tenant they are at or near a plan allowance — and then gets out of
// the way.
//
// Enforcement is SOFT by explicit decision. Nothing here disables a button,
// blocks a submit, or fails a request; the create still goes through and the
// meter still moves. What this fixes is the silence: a tenant could sit at 17
// contracts against a limit of 3 and never be told.
//
// It fires ONCE per mount, on open rather than on submit, so the warning
// arrives before six wizard steps are filled in rather than after. The upgrade
// path rides along as a toast action, because a warning without a way to act
// on it is just nagging.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useTenantContext } from '@/hooks/queries/useTenantContext';

type Allowance = 'contracts' | 'rfqs';

const LABEL: Record<Allowance, { one: string; many: string }> = {
  contracts: { one: 'contract', many: 'contracts' },
  rfqs: { one: 'RFQ', many: 'RFQs' },
};

/**
 * @param resource which allowance this surface consumes
 * @param enabled  pass false while the surface is closed, so reopening warns again
 */
export const useAllowanceWarning = (resource: Allowance, enabled: boolean = true) => {
  const navigate = useNavigate();
  const { addToast } = useVaNiToast();
  const { data: ctx } = useTenantContext();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Reopening the wizard is a new visit, so the warning is due again.
      firedRef.current = false;
      return;
    }
    if (firedRef.current || !ctx?.success) return;

    const limit = ctx.limits?.[resource] as number | null | undefined;
    const used = (ctx.usage?.[resource] as number) ?? 0;

    // null is unlimited — in practice only the exempt platform tenant.
    if (limit === null || limit === undefined) return;

    const over = limit === 0 ? used > 0 : used >= limit;
    const near = limit > 0 && !over && used >= limit * 0.8;
    if (!over && !near) return;

    firedRef.current = true;

    const label = LABEL[resource];
    const left = Math.max(limit - used, 0);

    addToast({
      // 'warning', not 'error'. Nothing has gone wrong and nothing is blocked.
      type: 'warning',
      title: over
        ? `You're past your ${label.one} allowance`
        : `${left} ${left === 1 ? label.one : label.many} left on your plan`,
      message: over
        ? `${used} of ${limit} used. You can carry on — this is a heads-up, not a block.`
        : `${used} of ${limit} used.`,
      duration: 8000,
      action: {
        label: 'See plans',
        onClick: () => navigate('/businessmodel/tenants/pricing-plans'),
      },
    });
  }, [enabled, ctx, resource, addToast, navigate]);
};

export default useAllowanceWarning;
