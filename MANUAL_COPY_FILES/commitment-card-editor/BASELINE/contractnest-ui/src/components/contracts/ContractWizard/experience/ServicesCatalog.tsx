import React, { useState } from 'react';
import { FileText, Plus, Check, Wrench } from 'lucide-react';
import type { Block } from '@/types/catalogStudio';
import type { ConfigurableBlock } from '@/components/catalog-studio';
import type { FlyByCategoryId } from '@/components/catalog-studio/BlockLibraryMini';
import { categoryHasPricing } from '@/utils/catalog-studio/categories';
import type { CoverageTypeItem } from '../steps/AssetSelectionStep';
import { isAgreementTerms } from './serviceCatalogModel';

export interface ServicesCatalogProps {
  catalog: Block[]; selected: ConfigurableBlock[]; coverage: CoverageTypeItem[]; currency: string;
  scope: string | null; onScope: (id: string | null) => void;
  loading: boolean; error: boolean; errorMessage?: string; retry: () => void;
  sections: Array<{ key: string; title: string; chipLabel: string; cats: string[]; comingSoon?: boolean }>;
  flyByTypes: Array<{ type: FlyByCategoryId; label: string }>;
  preview: (b: Block) => ConfigurableBlock; instance: (b: Block) => ConfigurableBlock | undefined;
  add: (b: Block) => void; remove: (id: string) => void; addFlyBy: (type: FlyByCategoryId) => void;
  update: (id: string, patch: Partial<ConfigurableBlock>) => void;
  expanded: string | null; expand: (id: string) => void;
  editor: (instance: ConfigurableBlock, block?: Block) => React.ReactNode;
  mismatch: React.ReactNode;
}

// Billing lines carry catalogue fees even though their catalogue editor uses
// a payment step rather than the generic pricing step.
export const servicePriced = (b: ConfigurableBlock) => b.isFlyBy ? ['service', 'spare'].includes(b.flyByType || '') : b.categoryId === 'billing' || categoryHasPricing(b.categoryId || '');
export function serviceErrors(blocks: ConfigurableBlock[], currency: string, coverage: CoverageTypeItem[]) {
  const errors: string[] = [];
  if (!blocks.some(b => !isAgreementTerms(b))) errors.push('Choose at least one commitment.');
  if (!blocks.some(isAgreementTerms)) errors.push('Mandatory Terms & Conditions are missing. Set up the tenant T&C in Catalog Studio, then reload the draft.');
  for (const b of blocks) {
    if (isAgreementTerms(b)) {
      if (!String(b.config?.content || b.description || '').replace(/<[^>]*>/g,'').trim()) errors.push('Mandatory Terms & Conditions have no content. Review them in Catalog Studio.');
      continue;
    }
    const name = b.name?.trim() || 'Unnamed FlyBy entry';
    if (!b.name?.trim()) errors.push('Name each FlyBy entry.');
    if (coverage.length && !coverage.some(c => c.id === b.coverageTypeId)) errors.push(`${name}: review its coverage assignment.`);
    if (!Number.isFinite(b.quantity) || b.quantity <= 0) errors.push(`${name}: enter a valid quantity.`);
    if (!Number.isFinite(b.totalPrice) || b.totalPrice < 0) errors.push(`${name}: calculated price is invalid.`);
    if (servicePriced(b)) {
      const price = b.config?.customPrice ?? b.price;
      if (b.currency !== currency) errors.push(`${name}: price currency does not match ${currency}.`);
      if (!Number.isFinite(price) || price < 0 || (price === 0 && !b.config?.complimentary)) errors.push(`${name}: enter a price or explicitly mark it complimentary.`);
    }
  }
  return [...new Set(errors)];
}

export default function ServicesCatalog(p: ServicesCatalogProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [flyByMenu, setFlyByMenu] = useState(false);
  const terms = p.selected.filter(isAgreementTerms);
  const commitments = p.selected.filter(b => !isAgreementTerms(b));
  const selected = p.coverage.length ? commitments.filter(b => p.scope === '__unassigned' ? !p.coverage.some(c => c.id === b.coverageTypeId) : b.coverageTypeId === p.scope) : commitments;
  const known = new Set(p.catalog.map(b => p.instance(b)?.id).filter(Boolean));
  const scopeValid = !p.coverage.length || p.coverage.some(c => c.id === p.scope);
  const allowed = (category: string) => filter === 'all' || filter === 'selected' || p.sections.some(s => s.key === filter && s.cats.includes(category));
  const matches = (b: {name: string; description?: string}) => `${b.name} ${b.description || ''}`.toLowerCase().includes(search.toLowerCase());
  const rows = p.catalog.filter(b => p.sections.some(s => s.cats.includes(b.categoryId)) && allowed(b.categoryId) && matches(b) && (filter !== 'selected' || p.instance(b)));
  const extra = selected.filter(b => (b.isFlyBy || !known.has(b.id)) && allowed(b.categoryId || '') && matches(b));
  const money = (amount: number, currency: string) => Number.isFinite(amount) ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount) : 'Price unavailable';
  const row = (block?: Block, saved?: ConfigurableBlock) => {
    const instance = saved || (block ? p.instance(block) : undefined);
    const b = instance || p.preview(block!);
    const priced = servicePriced(b);
    const unavailable = p.sections.find(s => s.cats.includes(b.categoryId || ''))?.comingSoon;
    const currencyMismatch = priced && b.currency !== p.currency;
    const effectivePrice = b.config?.customPrice ?? b.price;
    const missingPrice = priced && (!Number.isFinite(effectivePrice) || (!effectivePrice && !b.config?.complimentary));
    const canAdd = scopeValid && !unavailable && !currencyMismatch && !missingPrice && !p.error;
    const label = b.name || 'Name this commitment';
    return <article className="sv-row" data-selected={!!instance} key={b.id}>
      <div className="sv-row-top"><div className="sv-icon">{['service', 'session'].includes(b.categoryId || '') ? <Wrench size={20}/> : <FileText size={20}/>}</div><div className="sv-row-title"><h3>{label}</h3><small>{b.isFlyBy ? 'FlyBy · this agreement only' : block ? 'From Catalog Studio' : 'Saved selection · no longer in loaded catalogue'}</small><span className="sv-type">{b.categoryName || b.categoryId}</span></div><div className="sv-price">{priced ? missingPrice ? 'Price needed' : money(instance ? b.totalPrice : b.price, b.currency) : 'Included'}<small>{priced ? instance ? 'Configured line total' : 'Catalogue rate' : 'No charge'}</small></div><button aria-label={`${instance ? 'Remove' : 'Add'} ${label}`} disabled={!instance && !canAdd} onClick={() => instance ? p.remove(instance.id) : p.add(block!)}>{instance ? <Check size={17}/> : <Plus size={17}/>}</button></div>
      {currencyMismatch && <p role="alert">No matching {p.currency} price. The saved/catalogue currency is {b.currency}; no conversion is assumed.</p>}
      {unavailable && !instance && <p>Not available for selection yet.</p>}
      {instance && <><div className="sv-line-summary"><span>{b.unlimited ? 'Ongoing support' : `${b.quantity} ${b.categoryId === 'session' ? 'sessions' : b.categoryId === 'service' ? 'visits' : 'items'}`}{b.serviceCycleDays ? ` · every ${b.serviceCycleDays} days` : ''}</span><span>{b.coverageTypeName || 'Whole agreement'}</span></div><button className="sv-adjust" aria-expanded={p.expanded === b.id} onClick={() => p.expand(b.id)}>{p.expanded === b.id ? 'Close adjustments' : 'Adjust this commitment'}</button>
        {p.expanded === b.id && <div className="sv-editor">{b.isFlyBy && <label>Commitment name *<input aria-label="Commitment name" value={b.name} onChange={e => p.update(b.id, { name: e.target.value })}/></label>}{p.editor(b, block)}{priced && <label className="sv-complimentary"><input type="checkbox" checked={!!b.config?.complimentary} onChange={e => p.update(b.id, { config: { ...b.config, complimentary: e.target.checked, ...(e.target.checked ? { customPrice: 0 } : {}) } })}/> This line is intentionally complimentary</label>}</div>}</>}
    </article>;
  };
  return <section className="ag-card sv-catalog"><div className="sv-heading"><h2>Choose what gets delivered</h2><span className="sv-type">{commitments.length} added</span></div><p>From your service catalogue. Adjust only what’s different for this agreement.</p>
    <section className="sv-terms" aria-label="Mandatory agreement terms"><strong>Terms & Conditions</strong><span className="sv-type">Mandatory · Whole agreement · No charge</span>{terms.length ? terms.map(t => <details key={t.id}><summary>View included terms</summary><p style={{whiteSpace:'pre-wrap'}}>{String(t.config?.content || t.description || '').replace(/<[^>]*>/g,' ')}</p></details>) : <p role="status">{p.loading ? 'Loading your mandatory terms…' : 'Mandatory T&C not available yet. They must be included before Services can be completed.'}</p>}</section>
    {!!p.coverage.length && <><small>Add services to:</small><div className="sv-tabs" aria-label="Service coverage">{p.coverage.map(c => <button key={c.id} aria-pressed={p.scope === c.id} onClick={() => p.onScope(c.id)}>{c.resource_name} × {c.unit_count} · {commitments.filter(b => b.coverageTypeId === c.id).length}</button>)}{commitments.some(b => !p.coverage.some(c => c.id === b.coverageTypeId)) && <button aria-pressed={p.scope === '__unassigned'} onClick={() => p.onScope('__unassigned')}>Unassigned selections</button>}</div></>}
    <p className="sv-note">Matching the selected resource dependencies and {p.currency} pricing in your current workspace environment.</p>
    <label className="sv-search">Find a service or inclusion<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services, spares, terms…"/></label>
    <div className="sv-tabs" aria-label="Catalogue filters">{[{key:'all',chipLabel:'All'},{key:'selected',chipLabel:'Selected'},...p.sections].map(s => <button key={s.key} aria-pressed={filter === s.key} onClick={() => setFilter(s.key)}>{s.chipLabel}</button>)}</div>
    {p.loading && <p role="status">Loading your catalogue…</p>}{p.error && <p role="alert">The catalogue could not load completely. Saved selections are retained. {p.errorMessage} <button onClick={p.retry}>Retry catalogue</button></p>}
    {!p.loading && scopeValid && rows.map(b => row(b))}{extra.map(b => row(undefined,b))}
    {!p.loading && !p.error && !rows.length && !extra.length && <p>No eligible blocks match this coverage, {p.currency} and filter. Review resource dependencies and pricing in Catalog Studio, or add a FlyBy entry for this coverage.</p>}
    {p.mismatch}
    <button className="sv-adjust" disabled={!scopeValid} aria-expanded={flyByMenu} onClick={() => setFlyByMenu(!flyByMenu)}>+ Add something not in the catalogue</button>
    {flyByMenu && <div className="sv-tabs" aria-label="FlyBy types">{p.flyByTypes.map(t => <button key={t.type} onClick={() => {setFilter('all');setSearch('');p.addFlyBy(t.type);setFlyByMenu(false);}}>{t.label}</button>)}</div>}
    <p className="sv-note">A FlyBy entry stays in this agreement. It does not change Catalog Studio. Fees and checklists can be selected from your catalogue.</p>
  </section>;
}
