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
  return <section className="xp-panel xp-account" aria-labelledby="account-heading">
    <div className="xp-account-heading"><div><p className="xp-eyebrow">WORKSPACE ACCOUNT</p><h2 id="account-heading">{valid && !query.isError ? account.subscription?.plan_name || 'Plan & credits' : 'Plan & credits'}</h2></div><BellRing size={19} aria-hidden="true" /></div>
    {query.isPending ? <p className="xp-account-copy" role="status">Checking account details…</p>
      : unavailable ? <p className="xp-account-copy">Account details are unavailable here. Open your subscription to check.</p>
      : signals.length ? <ul className="xp-account-signals">{signals.slice(0, 2).map(signal => <li key={signal.id}><strong>{signal.title}</strong><p>{signal.detail}</p><Link className="xp-text-link" to={signal.to}>{signal.action}<ArrowUpRight size={14} /></Link></li>)}</ul>
      : <p className="xp-account-copy">Your subscription and messaging balances, in one place.</p>}
    <Link className="xp-shortcut" to="/businessmodel/tenants/subscription"><span>{signals.length > 2 ? `View account · ${signals.length - 2} more ${signals.length === 3 ? 'notice' : 'notices'}` : 'View plan & credits'}</span><ArrowUpRight size={16} /></Link>
    <p className="xp-account-scope">Shared across Revenue, Expense, Live, and Test. These are your real account details.</p>
  </section>;
}
