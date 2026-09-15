import React, { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ContractType } from '@/components/contracts/ContractWizard';
import type { Contract } from '@/types/contracts';
import { textOnBrand } from '@/pages/experience/model';
import { counterparty, listScopeKey, money, nextStep, PAGE_SIZE, relationshipScope, statusLabel, statuses, type Relationship } from './model';
import { useContractList, useDraftForList } from './useContractList';
import ContactClassificationBadge from './ContactClassificationBadge';
import './contracts-list.css';

const ContractWizard = lazy(() => import('@/components/contracts/ContractWizard'));

class WizardBoundary extends React.Component<{ children: React.ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="cnl-overlay" role="dialog" aria-modal="true" aria-label="Wizard unavailable"><div className="cnl-dialog"><h2>The wizard couldn’t open</h2><p>Close this window and try again, or use the existing Contracts page.</p><button className="cnl-button" onClick={this.props.onClose}>Close</button></div></div> : this.props.children;
  }
}

function ContractsListContent() {
  const { currentTenant, isLive, perspective } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const tenantId = currentTenant?.id || '';
  const revenue = perspective === 'revenue';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const scope = JSON.stringify(listScopeKey(tenantId, isLive, perspective));
  const restore = !location.state?.contractsListScope || location.state.contractsListScope === scope;
  const initialRelationship = params.get('relationship');
  const initialStatus = params.get('status');
  const initialSort = params.get('sort');
  const initialPage = Number(params.get('page'));
  const [relationship, setRelationship] = useState<Relationship>(restore && ['client', 'partner'].includes(initialRelationship) ? initialRelationship as Relationship : 'all');
  const [status, setStatus] = useState(restore && statuses.some(([key]) => key === initialStatus) ? initialStatus : '');
  const [searchInput, setSearchInput] = useState(restore ? (params.get('q') || '').slice(0, 200) : '');
  const [search, setSearch] = useState(searchInput.trim());
  const [sort, setSort] = useState(restore && ['created_at', 'total_value', 'health_score'].includes(initialSort) ? initialSort : 'created_at');
  const [page, setPage] = useState(restore && Number.isSafeInteger(initialPage) && initialPage > 0 ? initialPage : 1);
  const [wizardType, setWizardType] = useState<ContractType | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState('');
  const newMenu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const contractType = relationshipScope(perspective, relationship);
  const list = useContractList({ contract_type: contractType, status, search, page, limit: PAGE_SIZE, sort_by: sort, sort_direction: sort === 'health_score' ? 'asc' : 'desc' });
  // Exact server counts, not page-derived totals or mixed RFQ/contract stats.
  // These three shortcuts intentionally stay scoped to the relationship, not search.
  const draftCount = useContractList({ contract_type: contractType, status: 'draft', page: 1, limit: 1 });
  const waitingCount = useContractList({ contract_type: contractType, status: 'pending_acceptance', page: 1, limit: 1 });
  const activeCount = useContractList({ contract_type: contractType, status: 'active', page: 1, limit: 1 });
  const draft = useDraftForList(draftId);

  // URL state makes Back from the existing detail page restore this list.
  // History state carries scope without placing workspace identifiers in the URL.
  useEffect(() => {
    const next = new URLSearchParams();
    if (relationship !== 'all' && revenue) next.set('relationship', relationship);
    if (status) next.set('status', status);
    if (search) next.set('q', search);
    if (sort !== 'created_at') next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    if (next.toString() !== params.toString() || location.state?.contractsListScope !== scope) {
      setParams(next, { replace: true, state: { contractsListScope: scope } });
    }
  }, [relationship, revenue, status, search, sort, page, scope, setParams]);

  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!newMenu.current?.contains(event.target as Node) && newMenu.current) newMenu.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: listScopeKey(tenantId, isLive, perspective) });
  const closeWizard = () => {
    setWizardType(null); setDraftId(null); void refresh();
    requestAnimationFrame(() => trigger.current?.isConnected ? trigger.current.focus() : pageHeading.current?.focus());
  };
  const openNew = (type: ContractType) => {
    trigger.current = newMenu.current?.querySelector('summary') || document.activeElement as HTMLElement;
    if (newMenu.current) newMenu.current.open = false;
    navigate(`/contracts/experience/create?relationship=${type}`);
  };
  const openContract = (contract: Contract) => {
    if (contract.status === 'draft' && contract.tenant_id === tenantId) {
      trigger.current = document.activeElement as HTMLElement;
      setDraftId(contract.id);
    } else navigate(`/contracts/${encodeURIComponent(contract.id)}`);
  };
  const resetFilters = () => { setRelationship('all'); setStatus(''); setSearchInput(''); setSearch(''); setSort('created_at'); setPage(1); };
  const chooseStatus = (value: string) => { setStatus(value); setPage(1); };
  const chooseShortcut = (value: string) => { chooseStatus(value); setSearchInput(''); setSearch(''); };
  const filtered = !!status || !!searchInput || relationship !== 'all';
  const rows = list.data?.items || [];
  const total = list.data?.total_count ?? 0;
  const pages = Math.max(1, list.data?.page_info.total_pages ?? 1);
  const ready = list.isSuccess && searchInput.trim() === search;
  const loadedDraft = draftId && draft.isSuccess && !draft.isFetching ? draft.data : null;
  const savedType = loadedDraft?.metadata?.wizard_contract_type || loadedDraft?.contact_classification || loadedDraft?.contract_type;
  const resumeType: ContractType = ['client', 'partner', 'vendor'].includes(savedType) ? savedType : revenue ? 'client' : 'vendor';
  const palette = {
    '--cnl-bg': colors.utility.primaryBackground, '--cnl-surface': colors.utility.secondaryBackground,
    '--cnl-text': colors.utility.primaryText, '--cnl-muted': colors.utility.secondaryText,
    '--cnl-brand': colors.brand.primary, '--cnl-on-brand': textOnBrand(colors.brand.primary),
    '--cnl-error': colors.semantic.error, '--cnl-success': colors.semantic.success,
  } as CSSProperties;
  const shortcuts = [
    { key: 'draft', label: 'Pick up a draft', caption: 'Finish what you started', query: draftCount, icon: FileText },
    { key: 'pending_acceptance', label: 'Awaiting acceptance', caption: revenue ? 'Keep the agreement moving' : 'See what needs acceptance', query: waitingCount, icon: Clock3 },
    { key: 'active', label: 'Keep delivery on track', caption: revenue ? 'Follow your commitments' : 'Follow the services you receive', query: activeCount, icon: Check },
  ];

  return <main className="cnl-page" style={palette}>
    <div className="cnl-shell">
      <div className="cnl-topline"><span>{currentTenant?.name || 'Your workspace'} / Contracts</span><Link to="/contracts">Existing list <ArrowUpRight size={14} /></Link></div>
      <header className="cnl-header"><div><p className="cnl-eyebrow">{revenue ? 'AGREEMENTS YOU DELIVER' : 'AGREEMENTS YOU RECEIVE'}</p><h1 tabIndex={-1} ref={pageHeading}>Contracts, moving forward.</h1><p>Find an agreement. Know what’s next. Keep the work moving.</p></div>
        <details className="cnl-create" ref={newMenu} onKeyDown={event => { if (event.key === 'Escape' && newMenu.current) { newMenu.current.open = false; newMenu.current.querySelector('summary')?.focus(); } }}>
          <summary className="cnl-button cnl-primary"><Plus size={18} />New contract<ChevronDown size={16} /></summary>
          <div className="cnl-create-options"><p>Who is this agreement with?</p>{(revenue ? ['client', 'partner'] as const : ['vendor'] as const).map(type => <button key={type} onClick={() => openNew(type)}><strong>{type === 'client' ? 'Client contract' : type === 'partner' ? 'Partner contract' : 'Vendor contract'}</strong><small>{type === 'client' ? 'Services you provide to a customer' : type === 'partner' ? 'An agreement with a partner' : 'Services you receive from a provider'}</small><ArrowRight size={16} /></button>)}</div>
        </details>
      </header>
      <div className="cnl-shortcut-caption">{revenue ? relationship === 'all' ? 'Across your client and partner contracts' : `Across your ${relationship} contracts` : 'Across your vendor contracts'}</div>
      <section className="cnl-shortcuts" aria-label="Contract shortcuts">{shortcuts.map(({key, label, caption, query, icon: Icon}) => <button className="cnl-shortcut" key={key} aria-pressed={status === key} onClick={() => chooseShortcut(key)}>
        <span className="cnl-shortcut-top"><span className="cnl-icon"><Icon size={18} /></span><span className="cnl-count" aria-label={query.isError ? 'Count unavailable' : query.isPending ? 'Loading count' : `${query.data?.total_count} contracts`}>{query.isError ? '—' : query.isPending ? '…' : query.data?.total_count}</span></span>
        <strong>{label}</strong><span className="cnl-muted">{caption}<ArrowRight size={15} /></span>
      </button>)}</section>
      {[draftCount, waitingCount, activeCount].some(q => q.isError) && <p className="cnl-notice" role="status">Some shortcut counts are unavailable. <button onClick={() => void refresh()}>Retry counts</button></p>}
      <section className="cnl-workbench" aria-labelledby="cnl-list-title">
        <div className="cnl-section-heading"><h2 id="cnl-list-title">Your agreements</h2><span className="cnl-muted">{ready ? `${total} ${filtered ? 'matching' : ''} contract${total === 1 ? '' : 's'}` : ' '}</span></div>
        <div className="cnl-tools"><label className="cnl-search"><Search size={18} /><input aria-label="Search contracts" placeholder="Search name or contract number" value={searchInput} maxLength={200} onChange={event => setSearchInput(event.target.value)} />{searchInput && <button aria-label="Clear search" onClick={() => setSearchInput('')}><X size={16} /></button>}</label>
          <label className="cnl-sort"><span>Sort</span><select aria-label="Sort contracts" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="created_at">Newest first</option><option value="health_score">Lowest health first</option><option value="total_value">Highest value first</option></select></label>
          <button className="cnl-button cnl-refresh" aria-label="Refresh contracts" disabled={list.isFetching} onClick={() => void refresh()}><RefreshCw size={17} /></button>
        </div>
        <div className="cnl-filters"><label>Status<select aria-label="Filter by status" value={status} onChange={event => chooseStatus(event.target.value)}>{statuses.map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          {revenue && <div className="cnl-relationships" role="group" aria-label="Filter by relationship">{(['all', 'client', 'partner'] as const).map(type => <button key={type} aria-pressed={relationship === type} onClick={() => { setRelationship(type); setPage(1); }}>{type === 'all' ? 'All relationships' : type === 'client' ? 'Clients' : 'Partners'}</button>)}</div>}
          {filtered && <button className="cnl-text-button" onClick={resetFilters}>Clear filters<X size={14} /></button>}
        </div>
        {!tenantId ? <div className="cnl-state"><h3>Select a workspace to see your contracts.</h3></div>
          : list.isError ? <div className="cnl-state" role="alert"><FileText size={28} /><h3>We couldn’t load your contracts.</h3><p>Your agreements haven’t changed. Try loading them again.</p><button className="cnl-button" onClick={() => void refresh()}>Try again</button></div>
          : !ready ? <div className="cnl-state" role="status"><RefreshCw size={24} /><h3>Finding your agreements…</h3><p>Loading this workspace’s contracts.</p></div>
          : rows.length === 0 ? <div className="cnl-state"><span className="cnl-empty-icon"><FileText size={28} /></span><h3>{page > 1 ? 'There are no more contracts on this page.' : filtered ? 'No contracts match these filters.' : 'Your next agreement starts here.'}</h3><p>{filtered ? 'Try a different name, status, or relationship.' : 'Start with a client, partner, or provider. Services and payment events follow the contract.'}</p>{page > 1 ? <button className="cnl-button" onClick={() => setPage(1)}>Back to first page</button> : filtered ? <button className="cnl-button" onClick={resetFilters}>Show all contracts</button> : <button className="cnl-button cnl-primary" onClick={() => { if (newMenu.current) { newMenu.current.open = true; newMenu.current.querySelector('button')?.focus(); } }}>Create your first contract<ArrowRight size={16} /></button>}</div>
          : <div className="cnl-rows" aria-label="Contracts">{rows.map(contract => {
            const owned = contract.tenant_id === tenantId;
            const isDraft = contract.status === 'draft' && owned;
            const title = contract.title || contract.name || contract.contract_number || 'Untitled contract';
            const attention = contract.status === 'active' && (contract.events_overdue ?? 0) > 0;
            const party = counterparty(contract, tenantId);
            const progress = contract.events_total ? Math.min(100, Math.max(0, (contract.events_completed ?? 0) / contract.events_total * 100)) : 0;
            return <article className={`cnl-row ${attention ? 'cnl-row-attention' : ''}`} key={contract.id}>
              <div className="cnl-row-main"><span className="cnl-avatar" aria-hidden="true">{party.split(' ').slice(0,2).map(word => word[0]).join('')}</span><div className="cnl-contract-name"><button onClick={() => openContract(contract)}>{title}</button><p>{contract.contract_number}{contract.nomenclature_code ? ` · ${contract.nomenclature_code}` : ''}</p><span>{party}<ContactClassificationBadge contract={contract} /></span></div></div>
              <div className="cnl-next"><span className={`cnl-status cnl-status-${contract.status}`}>{statusLabel(contract.status)}</span><p className={attention ? 'cnl-overdue' : ''}>{nextStep(contract, owned)}</p>{contract.status === 'active' && (contract.events_total ?? 0) > 0 && <div className="cnl-progress" role="progressbar" aria-label="Contract events completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>}</div>
              <div className="cnl-value"><strong>{money(contract.grand_total ?? contract.total_value, contract.currency)}</strong><small>Contract value</small></div>
              <button className="cnl-row-action" aria-label={`${isDraft ? 'Continue draft' : 'Open contract'}: ${title}`} onClick={() => openContract(contract)}>{isDraft ? 'Continue draft' : 'Open contract'}<ArrowRight size={16} /></button>
            </article>;
          })}</div>}
        {ready && rows.length > 0 && <footer className="cnl-pagination"><span>{(page - 1) * PAGE_SIZE + 1}–{Math.min((page - 1) * PAGE_SIZE + rows.length, total)} of {total}</span><div><button className="cnl-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><span>Page {page} of {pages}</span><button className="cnl-button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></footer>}
      </section>
      <p className="cnl-footnote">One contract connects scope, services and payments. Open an agreement for the complete picture.</p>
      {handoffError && <p className="cnl-notice" role="alert">{handoffError} <Link to="/contracts">Open existing list</Link></p>}
    </div>
    {(wizardType || draftId) && createPortal(<div className="cnl-portal" style={palette}><WizardBoundary onClose={closeWizard}>
      {draftId && !loadedDraft ? <div className="cnl-overlay" role="dialog" aria-modal="true" aria-label="Opening draft"><div className="cnl-dialog"><h2>{draft.isError ? 'This draft couldn’t open' : 'Opening your draft…'}</h2><p>{draft.isError ? 'It may have changed or no longer be a draft. Close and refresh the list.' : 'Loading the saved details before continuing.'}</p><button autoFocus className="cnl-button" onClick={closeWizard}>Close</button></div></div> : <Suspense fallback={<div className="cnl-overlay" role="status"><div className="cnl-dialog">Opening your contract journey…<button className="cnl-button" onClick={closeWizard}>Cancel</button></div></div>}><ContractWizard presentation="experience" agreementOnly isOpen contractType={wizardType || resumeType} draftContractId={draftId} draftContractData={loadedDraft} onClose={closeWizard} onComplete={closeWizard} onAssignTemplate={async template => {
        try {
          const { buildTemplateSeed } = await import('@/components/contracts/vani/VaNiComposerLauncher');
          navigate('/contracts', { state: { assignSeed: buildTemplateSeed(template) } });
        } catch { closeWizard(); setHandoffError('Template handoff couldn’t open. Please try from the existing list.'); }
      }} /></Suspense>}
    </WizardBoundary></div>, document.body)}
  </main>;
}

export default function ContractsExperiencePage() {
  const { currentTenant, isLive, perspective } = useAuth();
  // Remount transient filters and draft state atomically on a context switch.
  return <ContractsListContent key={`${currentTenant?.id || ''}:${isLive}:${perspective}`} />;
}
