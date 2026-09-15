import React, { useState, type CSSProperties } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, FileText, Layers, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import Header from '@/components/layout/Header';
import LiteDashboard from '@/components/lite/LiteDashboard';
import { contractDestination, readableStatus, textOnBrand } from './model';
import { useExperience } from './useExperience';
import './experience.css';

function WorkspaceContent() {
  const { currentTenant, perspective, isLive } = useAuth();
  const { profile, loading, error, fetchProfile } = useTenantContext();
  const query = useExperience(!loading && !error && !!profile);
  const revenue = perspective === 'revenue';
  const ready = !loading && !error && !!profile && query.isSuccess;
  const empty = ready && query.data.total === 0;
  const unavailable = !!error || query.isError;
  const primaryPath = revenue ? '/contracts' : '/requests';
  const refresh = () => { if (error || !profile) void fetchProfile(); else void query.refetch(); };

  return <main id="experience-main" className="xp-main">
    <section className="xp-heading">
      <div><p className="xp-eyebrow">YOUR WORKSPACE / {revenue ? 'DELIVER & COLLECT' : 'RECEIVE & PAY'}</p>
        <h1>Your work, in view.</h1>
        <p className="xp-muted">{currentTenant?.name} <span aria-hidden="true">·</span> {revenue ? 'The services you provide.' : 'The services you receive.'}</p>
      </div>
      <div className="xp-context"><span className="xp-environment">{isLive ? 'Live' : 'Test'} environment</span><span>{revenue ? 'Revenue' : 'Expense'} perspective</span></div>
    </section>
    <div className="xp-layout">
      <div className="xp-primary-column">
        <section className="xp-hero">
          <div className="xp-hero-mark" aria-hidden="true"><BriefcaseBusiness size={26} /></div>
          <p className="xp-eyebrow">{empty ? 'YOUR NEXT CHAPTER' : 'PICK UP WHERE YOU LEFT OFF'}</p>
          <h2>{empty ? (revenue ? 'Make your first agreement.' : 'Bring your service needs together.') : (revenue ? 'Keep your agreements moving.' : 'Stay close to your service commitments.')}</h2>
          <p>{empty
            ? (revenue ? 'Use your service catalogue and the existing contract wizard to agree the scope, price, and schedule with a customer.' : 'Request quotations from vendors, create a vendor agreement in Contracts, or claim a contract shared with you.')
            : 'Start with an agreement, then follow its services, appointments, and payments in your existing workspace.'}</p>
          <div className="xp-actions"><Link className="xp-button xp-button-brand" to={primaryPath}>{revenue ? 'Open contracts' : 'Open requests'}<ArrowRight size={17} /></Link>
            <Link className="xp-text-link" to={revenue ? '/catalog-studio/blocks' : '/contracts/claim'}>{revenue ? 'Explore your catalogue' : 'Claim a shared contract'}<ArrowUpRight size={16} /></Link></div>
          <div className="xp-hero-footer"><ShieldCheck size={15} /> Manual actions, with you in control.</div>
        </section>
        <section className="xp-panel" aria-labelledby="recent-contracts">
          <div className="xp-section-heading"><div><p className="xp-eyebrow">CONTINUE YOUR WORK</p><h2 id="recent-contracts">Recent agreements</h2></div>
            <button className="xp-icon-button" aria-label="Refresh agreements" disabled={query.isFetching || loading} onClick={refresh}><RefreshCw size={17} className={query.isFetching ? 'xp-spinning' : ''} /></button></div>
          {loading || (!!profile && !error && query.isPending) ? <div className="xp-state" role="status"><span className="xp-loading" />Loading your {revenue ? 'revenue' : 'expense'} agreements…</div>
            : unavailable ? <div className="xp-state" role="alert"><h3>We couldn’t load your workspace.</h3><p>Your records haven’t changed. Refresh to try again.</p><button className="xp-button" onClick={refresh}>Try again</button></div>
            : !profile ? <div className="xp-state"><h3>Start with your business profile.</h3><p>Add your business context so this workspace can reflect the services you provide and receive.</p><Link className="xp-button" to="/settings/business-profile">Open business profile<ArrowRight size={16} /></Link></div>
            : empty ? <div className="xp-state"><FileText size={30} aria-hidden="true" /><h3>No {revenue ? 'revenue' : 'expense'} agreements here yet.</h3><p>This is your {isLive ? 'Live' : 'Test'} workspace. Agreements on your other perspective or environment are separate.</p><Link className="xp-button" to="/contracts">Open contracts<ArrowRight size={16} /></Link></div>
            : ready ? <><p className="xp-list-caption">{query.data.items.length} most recently updated of {query.data.total} agreements in this view</p>
              <div className="xp-contract-list">{query.data.items.map(contract => <Link className="xp-contract" key={contract.id} to={contractDestination(contract)}>
                <span className="xp-contract-icon"><FileText size={19} /></span>
                <span className="xp-contract-copy"><strong>{contract.title || contract.name || contract.contract_number}</strong><span>{contract.contract_number}{contract.nomenclature_name ? ` · ${contract.nomenclature_name}` : ''}</span></span>
                <span className="xp-status">{readableStatus(contract.status)}</span><ArrowUpRight size={17} aria-hidden="true" />
              </Link>)}</div>
              <div className="xp-panel-footer"><span>Drafts open in Contracts, where you can resume the wizard.</span><Link className="xp-text-link" to="/contracts">View all<ArrowRight size={15} /></Link></div></> : null}
        </section>
      </div>
      <aside className="xp-secondary-column" aria-label="Workspace shortcuts">
        <section className="xp-panel xp-foundation"><p className="xp-eyebrow">BUILT AROUND YOUR BUSINESS</p><h2>Your starting point</h2>
          <p className="xp-muted">Your existing setup shapes the work. No second setup to complete.</p>
          <Link className="xp-foundation-link" to="/settings/business-profile"><span className="xp-small-icon"><BriefcaseBusiness size={18} /></span><span><strong>Business profile</strong><small>Industries and service coverage</small></span><ArrowUpRight size={16} /></Link>
          {revenue && <Link className="xp-foundation-link" to="/catalog-studio/blocks"><span className="xp-small-icon"><Layers size={18} /></span><span><strong>Your service catalogue</strong><small>Services, pricing, and configuration</small></span><ArrowUpRight size={16} /></Link>}
          <div className="xp-note"><Check size={16} /><span>Names, scope, and prices come from your records. Each contract keeps its agreed terms.</span></div>
        </section>
        <section className="xp-panel xp-foundation"><p className="xp-eyebrow">KEEP GOING</p><h2>Open your workspace</h2>
          <Link className="xp-shortcut" to="/ops/cockpit"><span>Operations cockpit</span><ArrowUpRight size={16} /></Link>
          <Link className="xp-shortcut" to="/ops/finance"><span>{revenue ? 'Money In' : 'Money Out'}</span><ArrowUpRight size={16} /></Link>
          <Link className="xp-shortcut" to="/requests"><span>{revenue ? 'Requests to respond to' : 'Your requests for quotation'}</span><ArrowUpRight size={16} /></Link>
        </section>
        <p className="xp-footnote">Change perspective or environment using the controls above. Your theme follows you throughout the product.</p>
      </aside>
    </div>
  </main>;
}

export default function ExperiencePage() {
  const { currentTheme, isDarkMode } = useTheme();
  const { hasCompletedOnboarding, liteTier, currentTenant, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const style = {
    '--xp-bg': colors.utility.primaryBackground, '--xp-surface': colors.utility.secondaryBackground,
    '--xp-text': colors.utility.primaryText, '--xp-muted': colors.utility.secondaryText,
    '--xp-brand': colors.brand.primary, '--xp-on-brand': textOnBrand(colors.brand.primary),
    '--xp-success': colors.semantic.success,
  } as CSSProperties;
  if (isLoading) return <div role="status">Loading workspace…</div>;
  if (!hasCompletedOnboarding && !liteTier) return <Navigate replace to={currentTenant?.is_owner ? '/onboarding' : '/onboarding-pending'} />;

  return <div className="xp-root" style={style}>
    <a className="xp-skip" href="#experience-main">Skip to workspace</a>
    <div className="xp-header"><Header onToggleSidebar={() => setMenuOpen(open => !open)} /></div>
    {menuOpen && <nav className="xp-menu" aria-label="Workspace navigation"><Link to="/experience" onClick={() => setMenuOpen(false)}>Workspace</Link><Link to="/ops/cockpit">Existing cockpit</Link><Link to="/contracts">Contracts</Link><Link to="/settings/business-profile">Business profile</Link><button onClick={() => setMenuOpen(false)}>Close menu</button></nav>}
    {liteTier ? <main id="experience-main"><LiteDashboard flavor={liteTier} /></main> : <WorkspaceContent />}
    <footer className="xp-release"><span>Workspace experience · Sprint 1</span><Link to="/ops/cockpit">Return to existing cockpit<ArrowUpRight size={14} /></Link></footer>
  </div>;
}
