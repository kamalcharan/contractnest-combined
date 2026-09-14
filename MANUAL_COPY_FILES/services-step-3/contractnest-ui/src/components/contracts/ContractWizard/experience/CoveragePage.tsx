import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Check, FileText, Plus, Save, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useCreateClientAsset } from '@/hooks/queries/useClientAssetRegistry';
import type { Resource } from '@/hooks/queries/useResources';
import type { ClientAsset } from '@/types/clientAssetRegistry';
import type { AssetFormData } from '@/types/assetRegistry';
import EquipmentFormDialog from '@/pages/equipment-registry/EquipmentFormDialog';
import { textOnBrand } from '@/pages/experience/model';
import type { ContractType, ContractWizardState } from '../logic/state';
import type { CoverageTypeItem, EquipmentDetailItem } from '../steps/AssetSelectionStep';
import { assetDetail, identified, reconcileCoverage } from './coverageModel';
import './agreement.css';
import './approved-agreement.css';
import './coverage.css';

interface Props {
  onContinue?: () => void;
  state: ContractWizardState; relationship: ContractType; busy: boolean; saveStatus: string; error: string | null;
  onChange: (patch: Partial<ContractWizardState>) => void;
  onSave: () => Promise<boolean>; onBack: () => void; onClose: () => void;
}

export default function CoveragePage(p: Props) {
  const { currentTenant, isLive, perspective } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const s = p.state;
  const tenant = currentTenant?.id;
  const scope = JSON.stringify([tenant, isLive, perspective, s.buyerId]);
  const [initialScope] = useState(scope);
  const scopeChanged = scope !== initialScope || !tenant || !s.buyerId;
  const role = perspective === 'revenue' ? 'seller' : perspective === 'expense' ? 'buyer' : null;
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [picker, setPicker] = useState<'registry' | 'new' | null>(null);
  const [registerType, setRegisterType] = useState<Resource | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [uncertainCreate, setUncertainCreate] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const registryDialog = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const create = useCreateClientAsset();
  const locked = p.busy || registrationBusy || !!scopeChanged || !role;
  const snapshot = JSON.stringify([s.coverageTypes, s.equipmentDetails, s.allowBuyerToAdd]);
  const real = identified(s.equipmentDetails);
  const total = s.coverageTypes.reduce((n, c) => n + (Number.isInteger(c.unit_count) ? c.unit_count! : 0), 0);
  const remaining = Math.max(0, total - real.length);
  const serviceBased = ['service_delivery', 'flexible_hybrid'].includes(s.nomenclatureGroup || '');
  const requiresCoverage = ['equipment_maintenance', 'facility_property'].includes(s.nomenclatureGroup || '');
  const relation = { client: 'Client', partner: 'Partner', vendor: 'Vendor' }[p.relationship];

  const resourcesQuery = useQuery({
    queryKey: ['experience-coverage-resources', tenant, isLive], enabled: !!tenant && !scopeChanged, retry: false,
    queryFn: async (): Promise<Resource[]> => {
      const response = await api.get(API_ENDPOINTS.RESOURCES.LIST);
      const body = response.data;
      const data = Array.isArray(body) ? body : body?.success === true ? body.data : null;
      if (!Array.isArray(data) || data.some(r => !r.id || !r.resource_type_id || !(r.display_name || r.name))) throw new Error('Coverage catalogue response is incomplete.');
      return data.filter(r => r.is_active && ['equipment', 'asset'].includes(r.resource_type_id));
    },
  });
  const ranking = useQuery({
    queryKey: ['experience-coverage-priority', tenant, isLive, perspective], enabled: !!tenant && !scopeChanged, retry: false,
    queryFn: async () => {
      const response = await api.get('/api/onboarding/resource-ranking');
      if (response.data?.success !== true || !response.data.data || typeof response.data.data !== 'object') throw new Error('Workspace recommendations unavailable.');
      return response.data.data as Record<string, { forYou?: boolean }>;
    },
  });
  const resources = resourcesQuery.data || [];
  const recommended = resources.filter(r => ranking.data?.[r.id]?.forYou === true);
  // Priority affects discovery only. It never selects a type or infers AMC/CMC.
  const visible = (showAll || !recommended.length ? resources : resources.filter(r => recommended.includes(r) || s.coverageTypes.some(c => c.resource_id === r.id)))
    .filter(r => `${r.display_name} ${r.name} ${r.sub_category || ''}`.toLowerCase().includes(search.toLowerCase()));
  const assetQuery = useQuery({
    queryKey: ['experience-coverage-registry', tenant, isLive, s.buyerId], enabled: picker === 'registry' && !scopeChanged, retry: false,
    queryFn: async (): Promise<ClientAsset[]> => {
      const all: ClientAsset[] = [];
      let offset = 0;
      for (let page = 0; page < 100; page++) {
        const url = API_ENDPOINTS.CLIENT_ASSET_REGISTRY.LIST_WITH_FILTERS({ contact_id: s.buyerId!, limit: 100, offset });
        const response = await api.get(`${url}&is_live=${isLive}`);
        const body = response.data;
        const result = body?.data && !Array.isArray(body.data) ? body.data : body;
        if (body?.success === false || !Array.isArray(result?.data) || typeof result.pagination?.has_more !== 'boolean') throw new Error('Registry response is incomplete. Retry before attaching.');
        const rows = result.data as ClientAsset[];
        if (rows.some(a => a.tenant_id !== tenant || a.owner_contact_id !== s.buyerId || a.is_live !== isLive)) throw new Error('Registry scope mismatch. No units have been offered.');
        all.push(...rows);
        if (!result.pagination.has_more) return all;
        if (!rows.length) throw new Error('Registry pagination did not advance.');
        offset += rows.length;
      }
      throw new Error('Registry is too large to load completely. No partial list is used.');
    },
  });
  useEffect(() => { if (picker && !registryDialog.current?.open) registryDialog.current?.showModal(); }, [picker]);
  const closePicker = () => { registryDialog.current?.close(); setPicker(null); };
  // Restore the live placeholder invariant after reopening or changing contact.
  // Missing counts/types remain explicit errors; no guessed defaults are added.
  useEffect(() => {
    if (locked || !tenant || !role || !resourcesQuery.isSuccess) return;
    try {
      const next = reconcileCoverage(s.coverageTypes, s.equipmentDetails, resources, tenant, role);
      if (JSON.stringify(next) !== JSON.stringify(s.equipmentDetails)) p.onChange({ equipmentDetails: next });
    } catch (e) { setNotice((e as Error).message); }
  }, [snapshot, resourcesQuery.data, locked, tenant, role]);

  const update = (coverage: CoverageTypeItem[], details = s.equipmentDetails, allow = s.allowBuyerToAdd) => {
    if (locked || !tenant || !role) return;
    try {
      const reconciled = reconcileCoverage(coverage, details, resources, tenant, role);
      p.onChange({ coverageTypes: coverage, equipmentDetails: reconciled, allowBuyerToAdd: allow });
      setNotice(null); setSavedSnapshot(null);
    } catch (e) { setNotice((e as Error).message); }
  };
  const toggle = (resource: Resource) => {
    const existing = s.coverageTypes.find(c => c.resource_id === resource.id);
    if (existing) {
      if (s.selectedBlocks.some(b => b.coverageTypeId === existing.id)) { setNotice('Services already use this coverage. Keep it until those services can be reviewed.'); return; }
      if (real.some(d => d.category_id === resource.id)) { setNotice('Detach the identified units before removing this coverage type.'); return; }
      update(s.coverageTypes.filter(c => c.id !== existing.id));
    } else update([...s.coverageTypes, { id: crypto.randomUUID(), resource_id: resource.id, resource_name: resource.display_name || resource.name, sub_category: resource.sub_category || 'Other', unit_count: 1 }]);
  };
  const count = (c: CoverageTypeItem, value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 999) { setNotice('Choose a whole-number unit count between 1 and 999.'); return; }
    update(s.coverageTypes.map(item => item.id === c.id ? { ...item, unit_count: value } : item));
  };
  const attach = (asset: ClientAsset) => {
    const resource = resources.find(r => r.id === asset.asset_type_id);
    const coverage = s.coverageTypes.find(c => c.resource_id === asset.asset_type_id);
    if (!resource || !coverage || !tenant || !role) { setNotice('This unit does not match the selected coverage.'); return; }
    if (real.some(d => d.asset_registry_id === asset.id)) update(s.coverageTypes, s.equipmentDetails.filter(d => d.asset_registry_id !== asset.id));
    else update(s.coverageTypes, [...s.equipmentDetails, assetDetail(asset, resource, tenant, role)]);
  };
  const submitNew = async (data: AssetFormData) => {
    if (locked || uncertainCreate || !registerType || !tenant || !role) return;
    const coverage = s.coverageTypes.find(c => c.resource_id === data.asset_type_id);
    if (data.asset_type_id !== registerType.id || !coverage || real.filter(d => d.category_id === registerType.id).length >= coverage.unit_count!) { setNotice('Choose a covered type with space for another unit.'); return; }
    setRegistrationBusy(true); setNotice(null);
    try {
      const asset = await create.mutateAsync({ ...data, owner_contact_id: s.buyerId!, resource_type_id: registerType.resource_type_id, is_live: isLive } as Parameters<typeof create.mutateAsync>[0]);
      if (!asset?.id || asset.owner_contact_id !== s.buyerId || asset.tenant_id !== tenant || asset.is_live !== isLive || asset.asset_type_id !== registerType.id) {
        setUncertainCreate(true); throw new Error('Registry returned an incomplete or mismatched result. Check the registry before creating again.');
      }
      const detail = assetDetail(asset, registerType, tenant, role);
      p.onChange({ equipmentDetails: reconcileCoverage(s.coverageTypes, [...s.equipmentDetails, detail], resources, tenant, role) });
      await queryClient.invalidateQueries({ queryKey: ['experience-coverage-registry', tenant, isLive, s.buyerId] });
      setRegisterType(null); setSavedSnapshot(null);
    } catch (e) {
      const error = e as Error & { status?: number };
      if (!error.status || error.status >= 500) { setUncertainCreate(true); setRegisterType(null); }
      setNotice(error.message || 'Registration failed. Your coverage is still here.');
    } finally { setRegistrationBusy(false); }
  };
  const save = async () => {
    if (locked) return;
    if (!s.coverageTypes.length && requiresCoverage) { setNotice('Choose at least one coverage type.'); return; }
    if (s.coverageTypes.some(c => !Number.isInteger(c.unit_count) || c.unit_count! < 1 || !resources.some(r => r.id === c.resource_id))) { setNotice('Review missing types or unit counts before saving.'); return; }
    try {
      const next = reconcileCoverage(s.coverageTypes, s.equipmentDetails, resources, tenant!, role!);
      if (JSON.stringify(next) !== JSON.stringify(s.equipmentDetails)) { p.onChange({ equipmentDetails: next }); setNotice('Coverage details reconciled. Review the counts and save again.'); return; }
    } catch (e) { setNotice((e as Error).message); return; }
    const captured = snapshot;
    if (await p.onSave()) { setSavedSnapshot(captured); setNotice(null); }
  };
  const summary = <><span className="ag-eyebrow">YOUR AGREEMENT</span><h2>{s.contractName}</h2><span className={`ag-badge ag-${p.relationship}`}>{relation} contract</span><dl><dt>With</dt><dd>{s.buyerName}</dd><dt>Agreement label</dt><dd>{s.nomenclatureName || 'Not selected · optional'}</dd><dt>Term</dt><dd>{s.durationValue} {s.durationUnit}</dd><dt>Coverage</dt><dd>{total} units · {s.coverageTypes.length} types</dd></dl>{s.coverageTypes.map(c => <p key={c.id}>{c.resource_name} × {c.unit_count ?? 'Count needed'}</p>)}<div className="ag-assurance"><Check size={16}/>{real.length} attached · {remaining} remaining</div><p>Manual, by design. No VaNi credits needed.</p></>;
  return <div className="ag-page cv-page" style={{ '--ag-bg': colors.utility.primaryBackground, '--ag-panel': colors.utility.secondaryBackground, '--ag-text': colors.utility.primaryText, '--ag-muted': colors.utility.secondaryText, '--ag-line': `${colors.utility.primaryText}22`, '--ag-brand': colors.brand.primary, '--ag-onbrand': textOnBrand(colors.brand.primary), '--ag-error': colors.semantic.error } as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>Shape your coverage</span></div><div><span role="status">Draft · {p.saveStatus === 'saving' ? 'Saving…' : p.saveStatus === 'failed' ? 'Save failed' : p.saveStatus === 'saved' ? 'Saved' : 'In progress'}</span><button aria-label="Close coverage" disabled={locked} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav className="ag-chapters" aria-label="Creation chapters">{['Agreement', 'Coverage & services', 'Money', 'Delivery & acceptance', 'Review'].map((chapter, i) => <span key={chapter} aria-current={i === 1 ? 'step' : undefined}><b>{i + 1}</b>{chapter}</span>)}</nav>
    <div className="ag-layout"><main><div className="ag-intro"><span className="ag-eyebrow">THE SCOPE OF YOUR PROMISE</span><h1>Make the coverage clear.</h1><p>Agree what’s covered now. Identify each real unit when you’re ready.</p></div>
      {scopeChanged && <p role="alert" className="ag-error">Workspace, environment or contact changed. Close this draft and reopen it in the intended context.</p>}
      <fieldset className="ag-fields" disabled={locked}>
      <section className="ag-card"><h2>What does this agreement cover?</h2><p>Select every type and its unit count. One agreement can cover several items.</p>
        {serviceBased && !s.coverageTypes.length && <div className="cv-note">This is a service-based agreement. No equipment or facility registry is required. Add coverage only if this agreement needs it.</div>}
        {!requiresCoverage && !serviceBased && !s.coverageTypes.length && <div className="cv-note">Coverage is optional for this agreement. Add equipment or facilities only if they need to be identified individually.</div>}
        <div className="cv-tools"><span>{recommended.length && !showAll ? 'Suggested from your workspace profile' : 'Your coverage catalogue'}</span>{!!recommended.length && <button onClick={() => setShowAll(!showAll)}>{showAll ? 'Show recommended' : 'Browse all types'}</button>}</div>
        <label className="cv-search">Find a coverage type<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment or facilities…"/></label>
        {resourcesQuery.isLoading && <p role="status">Loading coverage types…</p>}
        {resourcesQuery.isError && <p role="alert">Coverage types could not load. <button onClick={() => void resourcesQuery.refetch()}>Retry catalogue</button></p>}
        {ranking.isError && <p role="alert">Workspace recommendations could not load. All available types are shown. <button onClick={() => void ranking.refetch()}>Retry recommendations</button></p>}
        {!resourcesQuery.isLoading && !resourcesQuery.isError && !visible.length && <p>No matching types. {search ? 'Try another search.' : 'Add types to your workspace catalogue first.'}</p>}
        {['equipment', 'asset'].map(type => {
          const rows = visible.filter(r => r.resource_type_id === type);
          return rows.length ? <section key={type} className="cv-group"><h3>{type === 'equipment' ? 'Equipment' : 'Facilities & property'}</h3>{[...new Set(rows.map(r => r.sub_category || 'Other'))].map(category => <div key={category}><h4>{category}</h4><div className="cv-scope-grid">{rows.filter(r => (r.sub_category || 'Other') === category).map(r => {
            const selected = s.coverageTypes.find(c => c.resource_id === r.id);
            return <div key={r.id}><button className="cv-choice" aria-pressed={!!selected} onClick={() => toggle(r)}><Building2 size={21}/><span><strong>{r.display_name || r.name}</strong><small>{selected ? 'Included in this agreement' : 'Add to coverage'}</small></span><span className="cv-check">{selected ? '✓' : ''}</span></button>{selected && <div className="cv-counter"><span>Units</span><button aria-label={`Remove one ${selected.resource_name} unit`} disabled={locked || selected.unit_count === 1} onClick={() => count(selected, selected.unit_count! - 1)}>−</button><input aria-label={`${selected.resource_name} unit count`} type="number" min="1" max="999" step="1" value={selected.unit_count ?? ''} onChange={e => count(selected, Number(e.target.value))}/><button aria-label={`Add one ${selected.resource_name} unit`} disabled={locked || selected.unit_count === 999} onClick={() => count(selected, (selected.unit_count || 0) + 1)}>+</button></div>}</div>;
          })}</div></div>)}</section> : null;
        })}
        {s.coverageTypes.filter(c => !resources.some(r => r.id === c.resource_id)).map(c => <p key={c.id} role="alert">Saved coverage “{c.resource_name}” is not in the loaded catalogue. It has been retained. <button onClick={() => { if (real.some(d => d.category_id === c.resource_id) || s.selectedBlocks.some(b => b.coverageTypeId === c.id)) { setNotice('This saved type has attached units or services. Review those before removing it.'); return; } update(s.coverageTypes.filter(item => item.id !== c.id)); }}>Remove unavailable type</button></p>)}
        {!!s.coverageTypes.length && <><hr/><h3>How should these get attached?</h3><p>Keep the declared scope now. Identify each real unit when you’re ready.</p><div className="cv-attach-grid">
          <button className="cv-choice" aria-pressed={s.allowBuyerToAdd} onClick={() => update(s.coverageTypes, s.equipmentDetails, !s.allowBuyerToAdd)}><Users size={22}/><span><strong>{role === 'buyer' ? 'I’ll identify the units after acceptance' : `${s.buyerName} lists them after acceptance`}</strong><small>They complete the asset details. You can still propose the contract today.</small><em>No need to delay the agreement</em></span><span className="cv-check">{s.allowBuyerToAdd ? '✓' : ''}</span></button>
          <div className="cv-registered"><button className="cv-choice" aria-pressed={real.length > 0} onClick={() => setPicker('registry')}><Building2 size={22}/><span><strong>Pick from registered units</strong><small>Bring existing details and locations into this agreement.</small></span><span className="cv-check">{real.length > 0 ? '✓' : ''}</span></button>
            {real.length > 0 && <ul className="cv-attached-tags" aria-label="Attached units">{real.map(unit => <li key={unit.id} title={[unit.item_name, unit.serial_number, unit.location].filter(Boolean).join(' · ')}><Check size={13} aria-hidden="true"/><span>{unit.item_name}</span></li>)}</ul>}
          </div>
          <button className="cv-choice" disabled={locked || uncertainCreate || !remaining} onClick={() => setPicker('new')}><Plus size={22}/><span><strong>Add equipment or a facility now</strong><small>Register a specific unit without leaving this draft.</small></span></button>
        </div><div className="cv-counts"><span><b>{total}</b> covered</span><span><b>{real.length}</b> attached</span><span><b>{remaining}</b> remaining</span></div>
        {!!real.length && <button className="cv-link" onClick={() => setPicker('registry')}>Review attached units →</button>}
        {!!remaining && <div className="cv-note">Planning can proceed. Mandatory forms and visit closure need the real unit attached first.</div>}</>}
      </section></fieldset>
      {(notice || p.error) && <p role="alert" className="ag-error">{notice || p.error}</p>}
      {savedSnapshot === snapshot && <section className="ag-card cv-saved" role="status"><Check/><h2>Coverage saved.</h2><p>Your scope and attached units are in this draft. Next, choose what gets delivered. No proposal, appointment or invoice has been created.</p>{p.onContinue && <button className="ag-primary" onClick={p.onContinue}>Continue to services →</button>}</section>}
      <details className="ag-mobile-summary"><summary>Your agreement so far</summary>{summary}</details>
      </main><aside>{summary}</aside></div>
    <footer className="ag-footer"><button disabled={locked} onClick={p.onBack}><ArrowLeft size={17}/> Agreement</button><span>Coverage · 2 of 5</span><button className="ag-primary" disabled={locked || resourcesQuery.isLoading || resourcesQuery.isError} onClick={() => void save()}><Save size={17}/>{p.busy ? 'Saving…' : 'Save coverage'}</button></footer>
    <dialog ref={registryDialog} className="ag-family-modal cv-modal" aria-labelledby="cv-dialog-title" onClose={() => setPicker(null)} onCancel={() => setPicker(null)}><div className="ag-modal-heading"><h2 id="cv-dialog-title">{picker === 'new' ? 'Register a covered unit' : 'Identify the covered units'}</h2><button aria-label="Close unit picker" onClick={closePicker}><X/></button></div>
      <p>{picker === 'new' ? 'Choose its covered type. The existing registry form opens next and saves the unit to this contact’s registry.' : `Registered units for ${s.buyerName}. Declared counts stay unchanged; attach some now and leave the rest for later.`}</p>
      {picker && notice && <p role="alert" className="ag-error">{notice}</p>}
      {picker === 'registry' && assetQuery.isLoading && <p role="status">Loading registered units…</p>}
      {picker === 'registry' && assetQuery.isError && <p role="alert">{(assetQuery.error as Error).message} <button onClick={() => void assetQuery.refetch()}>Retry registry</button></p>}
      {picker === 'registry' && <label className="cv-registry-search">Find a registered unit<input value={registrySearch} onChange={e => setRegistrySearch(e.target.value)} placeholder="Name, serial number, make or location…"/></label>}
      {s.coverageTypes.map(c => <section key={c.id} className="cv-registry-group"><h3>{c.resource_name} · {c.unit_count ?? 'Count needed'} covered</h3>
        {picker === 'new' ? <button disabled={locked || real.filter(d => d.category_id === c.resource_id).length >= c.unit_count! || !resources.some(r => r.id === c.resource_id)} onClick={() => { const r = resources.find(r => r.id === c.resource_id); if (r) { closePicker(); setRegisterType(r); } }}>Register {c.resource_name}</button> : <>
          {real.filter(d => d.category_id === c.resource_id).map(d => <div className="cv-unit" key={d.id}><span><strong>{d.item_name}</strong><small>{[d.serial_number, d.location].filter(Boolean).join(' · ')}</small></span><button disabled={locked} onClick={() => update(s.coverageTypes, s.equipmentDetails.filter(item => item.id !== d.id))}>Detach</button></div>)}
          {(assetQuery.data || []).filter(a => a.asset_type_id === c.resource_id && !real.some(d => d.asset_registry_id === a.id) && [a.name, a.serial_number, a.make, a.model, a.location].filter(Boolean).join(' ').toLowerCase().includes(registrySearch.toLowerCase())).map(a => <button className="cv-choice" key={a.id} disabled={locked || real.filter(d => d.category_id === c.resource_id).length >= c.unit_count!} onClick={() => attach(a)}><Building2/><span><strong>{a.name}</strong><small>{[a.serial_number, a.make, a.model, a.location].filter(Boolean).join(' · ')}</small></span><Plus size={18}/></button>)}
          {assetQuery.isSuccess && !assetQuery.data.some(a => a.asset_type_id === c.resource_id) && <p>No registered units for this type. You can add one now or identify it later.</p>}
        </>}
      </section>)}<button className="ag-primary" onClick={closePicker}>Done</button>
    </dialog>
    {registerType && <EquipmentFormDialog isOpen mode="create" onClose={() => { if (!registrationBusy) setRegisterType(null); }} defaultAssetTypeId={registerType.id} defaultSubCategory={registerType.sub_category} resourceTypeId={registerType.resource_type_id} registryMode={registerType.resource_type_id === 'asset' ? 'entity' : 'equipment'} categories={[{ id: registerType.id, name: registerType.display_name || registerType.name, sub_category: registerType.sub_category, resource_type_id: registerType.resource_type_id }]} lockedContactId={s.buyerId!} lockedContactName={s.buyerName} onSubmit={submitNew} isSubmitting={registrationBusy || uncertainCreate}/>}
  </div>;
}
