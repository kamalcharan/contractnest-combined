import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BellRing } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenantContext as useTenantAccount } from '@/hooks/queries/useTenantContext';
import { accountSignals } from './accountSignals';

export default function TenantAccountNotice() {
  const { currentTenant } = useAuth();
  const query = useTenantAccount();
  const account = query.data;
  // Reject mismatched or unsuccessful payloads rather than showing another workspace's plan.
  const valid = account?.success && account.tenant_id === currentTenant?.id;
  const unavailable = query.isError || (!query.isPending && !valid);
  const signals = valid && !query.isError ? accountSignals(account) : [];
  // Consumption numbers (owner request, 2026-09-16). Advisory display only —
  // per the over_limit ruling, nothing here gates or disables creation.
  // Older API payloads may lack these blocks, so every value is checked and
  // the row is simply omitted rather than showing a fabricated zero.
  const num = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const fmt = (value: number) => value.toLocaleString('en-IN');
  const contractsUsed = valid && !query.isError ? num(account.usage?.contracts) : null;
  const contractsCap = valid && !query.isError ? (account.limits?.contracts === null ? Infinity : num(account.limits?.contracts)) : null;
  const whatsappCredits = valid && !query.isError ? num(account.credits?.whatsapp) : null;
  const showStats = contractsUsed !== null || whatsappCredits !== null;
  return <section className="xp-panel xp-account" aria-labelledby="account-heading">
    <div className="xp-account-heading"><div><p className="xp-eyebrow">WORKSPACE ACCOUNT</p><h2 id="account-heading">{valid && !query.isError ? account.subscription?.plan_name || 'Plan & credits' : 'Plan & credits'}</h2></div><BellRing size={19} aria-hidden="true" /></div>
    {query.isPending ? <p className="xp-account-copy" role="status">Checking account details…</p>
      : unavailable ? <p className="xp-account-copy">Account details are unavailable here. Open your subscription to check.</p>
      : <>
        {showStats && <dl className="xp-account-stats">
          {contractsUsed !== null && <div>
            <dt>Contracts</dt>
            <dd><strong>{fmt(contractsUsed)}</strong> used{contractsCap === Infinity ? ' · unlimited plan'
              : contractsCap !== null ? <> · <strong>{fmt(Math.max(0, contractsCap - contractsUsed))}</strong> open of {fmt(contractsCap)}</>
              : null}</dd>
          </div>}
          {whatsappCredits !== null && <div>
            <dt>WhatsApp credits</dt>
            <dd><strong>{fmt(whatsappCredits)}</strong> available</dd>
          </div>}
          <Link className="xp-text-link" to="/businessmodel/tenants/subscription">Top up<ArrowUpRight size={14} /></Link>
        </dl>}
        {signals.length ? <ul className="xp-account-signals">{signals.slice(0, 2).map(signal => <li key={signal.id}><strong>{signal.title}</strong><p>{signal.detail}</p><Link className="xp-text-link" to={signal.to}>{signal.action}<ArrowUpRight size={14} /></Link></li>)}</ul>
          : !showStats ? <p className="xp-account-copy">Your subscription and messaging balances, in one place.</p> : null}
      </>}
    <Link className="xp-shortcut" to="/businessmodel/tenants/subscription"><span>{signals.length > 2 ? `View account · ${signals.length - 2} more ${signals.length === 3 ? 'notice' : 'notices'}` : 'View plan & credits'}</span><ArrowUpRight size={16} /></Link>
    <p className="xp-account-scope">Shared across Revenue, Expense, Live, and Test. These are your real account details.</p>
  </section>;
}
