import React, { lazy, Suspense, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, FileText, Layers, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTenantContext } from '@/contexts/TenantContext';
import LiteDashboard from '@/components/lite/LiteDashboard';
import { contractDestination, readableStatus, textOnBrand, type StartAction } from './model';
import { useExperience } from './useExperience';
import StartChooser from './StartChooser';
import TenantAccountNotice from './TenantAccountNotice';
import { measureStart } from './measurement';
import './experience.css';

const ContractWizard = lazy(() => import('@/components/contracts/ContractWizard'));

function WorkspaceContent() {
  const { currentTenant, perspective, isLive } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { profile, loading, error, fetchProfile } = useTenantContext();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const wizardTrigger = useRef<HTMLElement | null>(null);
  const query = useExperience(!loading && !error && !!profile);
  const revenue = perspective === 'revenue';
  const ready = !loading && !error && !!profile && query.isSuccess;
  const empty = ready && query.data.total === 0;
  const unavailable = !!error || query.isError;
  const refresh = () => { if (error || !profile) void fetchProfile(); else void query.refetch(); };
  const handleStart = (action: StartAction) => {
    measureStart(action, perspective, isLive);
    if (action === 'create' || action === 'record') { wizardTrigger.current = document.activeElement as HTMLElement; setWizardOpen(true); }
    else navigate(action === 'request' ? '/contracts/rfq/new' : action === 'respond' ? '/requests' : '/contracts/claim');
  };
  const closeWizard = () => { setWizardOpen(false); void query.refetch(); requestAnimationFrame(() => wizardTrigger.current?.focus()); };

  return <main id="experience-main" className="xp-main">
    <section className={`xp-heading ${empty ? 'xp-heading-start' : ''}`}>
      <div><p className="xp-eyebrow">YOUR WORKSPACE / {revenue ? 'DELIVER & COLLECT' : 'RECEIVE & PAY'}</p>
        <h1>Your work, in view.</h1>
        <p className="xp-muted">{currentTenant?.name} <span aria-hidden="true">·</span> {revenue ? 'The services you provide.' : 'The services you receive.'}</p>
      </div>
    </section>
    <StartChooser perspective={perspective} compact={!empty} onAction={handleStart} />
    <div className="xp-layout">
      <div className="xp-primary-column">
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
        <div className="xp-workspace-links" aria-label="Workspace shortcuts">
        <section className="xp-panel xp-foundation"><p className="xp-eyebrow">BUILT AROUND YOUR BUSINESS</p><h2>Your starting point</h2>
          <p className="xp-muted">Your existing setup shapes the work. No second setup to complete.</p>
          <Link className="xp-foundation-link" to="/settings/business-profile"><span className="xp-small-icon"><BriefcaseBusiness size={18} /></span><span><strong>Business profile</strong><small>Industries and service coverage</small></span><ArrowUpRight size={16} /></Link>
          {revenue && <Link className="xp-foundation-link" to="/catalog-studio/blocks"><span className="xp-small-icon"><Layers size={18} /></span><span><strong>Your service catalogue</strong><small>Services, pricing, and configuration</small></span><ArrowUpRight size={16} /></Link>}
          <div className="xp-note"><Check size={16} /><span>Names, scope, and prices come from your records. Each contract keeps its agreed terms.</span></div>
        </section>
        <section className="xp-panel xp-foundation"><p className="xp-eyebrow">KEEP GOING</p><h2>Open your workspace</h2>
          <Link className="xp-shortcut" to="/ops/cockpit"><span>Operations cockpit<small className="xp-shortcut-detail">Due events, acceptance, and execution</small></span><ArrowUpRight size={16} /></Link>
          <Link className="xp-shortcut" to="/ops/finance"><span>{revenue ? 'Money In' : 'Money Out'}</span><ArrowUpRight size={16} /></Link>
          <Link className="xp-shortcut" to="/requests"><span>{revenue ? 'Requests to respond to' : 'Your requests for quotation'}</span><ArrowUpRight size={16} /></Link>
        </section>
        </div>
      </div>
      <aside className="xp-secondary-column" aria-label="Workspace account">
        <TenantAccountNotice />
        <p className="xp-footnote">Change perspective or environment using the controls above. Your theme follows you throughout the product.</p>
      </aside>
    </div>
    {wizardOpen && createPortal(<Suspense fallback={<div role="status" className="fixed inset-0 z-50 grid place-items-center bg-black/40"><div className="rounded-xl p-6" style={{ background: colors.utility.secondaryBackground, color: colors.utility.primaryText }}>Opening contract wizard…</div></div>}><ContractWizard isOpen onClose={closeWizard} onComplete={closeWizard} contractType={revenue ? 'client' : 'vendor'} /></Suspense>, document.body)}
  </main>;
}

export default function ExperiencePage() {
  const { currentTheme, isDarkMode } = useTheme();
  const { hasCompletedOnboarding, liteTier, currentTenant, isLoading, isLive, perspective } = useAuth();
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
    {liteTier ? <main id="experience-main"><LiteDashboard flavor={liteTier} /></main> : <WorkspaceContent key={`${currentTenant?.id}:${isLive}:${perspective}`} />}
    <footer className="xp-release"><span>Home · Sprint 1.5</span><Link to="/ops/cockpit">Open operations cockpit<ArrowUpRight size={14} /></Link></footer>
  </div>;
}
