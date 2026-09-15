import React, { useState } from 'react';
import { ArrowRight, Check, FileText, Save, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useGlobalMasterData } from '@/hooks/queries/useProductMasterdata';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { currencyOptions } from '@/utils/constants/currencies';
import { CONTRACT_TITLE_MAX_LENGTH, CONTRACT_DESCRIPTION_MAX_LENGTH } from '@/utils/constants/contracts';
import { textOnBrand } from '@/pages/experience/model';
import type { ContractWizardState, ContractType } from '../logic/state';
import AgreementLabels from './AgreementLabels';
import './agreement.css';

interface Props {
  state: ContractWizardState;
  relationship: ContractType;
  contactPicker: React.ReactNode;
  onChange: (patch: Partial<ContractWizardState>) => void;
  onLabel: (id: string | null, name: string | null, group?: string | null) => void;
  onSave: () => Promise<boolean>;
  onClose: () => void;
  busy: boolean;
  saveStatus: string;
  hasDraft: boolean;
  error: string | null;
}

const dateInput = (date: Date) => Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Match the current details editor's duration-based preview. The server remains
// authoritative; this page never writes an independently calculated end_date.
export function agreementEnd(start: Date, amount: number, unit: string) {
  const end = new Date(start);
  if (unit === 'days') end.setDate(end.getDate() + amount);
  else if (unit === 'months') end.setMonth(end.getMonth() + amount);
  else if (unit === 'years') end.setFullYear(end.getFullYear() + amount);
  return end;
}

export default function AgreementPage(p: Props) {
  const { currentTheme, isDarkMode } = useTheme();
  const c = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { data, isLoading, error: labelsError } = useGlobalMasterData('cat_contract_nomenclature', true);
  const [editingContact, setEditingContact] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const s = p.state;
  const snapshot = JSON.stringify(s);
  const ready = savedSnapshot === snapshot;
  const relation = { client: 'Client', partner: 'Partner', vendor: 'Vendor' }[p.relationship];
  const items = (data?.data || []) as Array<{ id: string; display_name: string; detail_name: string; form_settings?: { group?: string; group_label?: string; short_name?: string } }>;
  const defaultCurrency = currencyOptions.find(item => item.isDefault)?.code;
  const fieldError = (invalid: boolean, message: string) => attempted && invalid ? <span className="ag-field-error" role="alert">{message}</span> : null;
  const termValid = Number.isFinite(s.durationValue) && s.durationValue > 0 && Number.isInteger(s.durationValue) && ['days', 'months', 'years'].includes(s.durationUnit);
  const currencyValid = currencyOptions.some(item => item.code === s.currency);
  const dateValid = !Number.isNaN(new Date(s.startDate).getTime());
  const graceValid = Number.isInteger(s.gracePeriodValue) && s.gracePeriodValue >= 0 && ['days', 'months', 'years'].includes(s.gracePeriodUnit);
  const valid = !!s.buyerId && !!s.contractName.trim() && termValid && currencyValid && dateValid && graceValid;
  const end = termValid && dateValid ? agreementEnd(new Date(s.startDate), s.durationValue, s.durationUnit) : null;
  const save = async (complete: boolean) => {
    setAttempted(true);
    if (!valid) { document.getElementById('agreement-errors')?.focus(); return; }
    const captured = snapshot;
    if (await p.onSave()) setSavedSnapshot(complete ? captured : null);
  };
  const summary = <><span className="ag-eyebrow">YOUR AGREEMENT</span><h2>{s.contractName.trim() || 'A new commitment'}</h2><span className={`ag-badge ag-${p.relationship}`}>{relation} contract</span><dl><dt>With</dt><dd>{s.buyerName || 'Choose a contact'}</dd><dt>Agreement label</dt><dd>{s.nomenclatureName || 'Not selected · optional'}</dd><dt>Term</dt><dd>{termValid ? `${s.durationValue} ${s.durationUnit}` : 'Choose a duration'}</dd><dt>Currency</dt><dd>{s.currency || 'Choose a currency'}</dd></dl><p>First, agree the essentials. Services, price and acceptance come next.</p><div className="ag-assurance"><Check size={16}/> Nothing is sent when you save.</div></>;
  return <div className="ag-page" style={{ '--ag-bg': c.utility.primaryBackground, '--ag-panel': c.utility.secondaryBackground, '--ag-text': c.utility.primaryText, '--ag-muted': c.utility.secondaryText, '--ag-line': `${c.utility.primaryText}22`, '--ag-brand': c.brand.primary, '--ag-onbrand': textOnBrand(c.brand.primary), '--ag-error': c.semantic.error } as React.CSSProperties}>
    <header className="ag-header"><div><FileText size={22}/><strong>ContractNest</strong><span>{p.hasDraft ? 'Edit draft agreement' : 'Create an agreement'}</span></div><div><span role="status">{p.saveStatus === 'saving' ? 'Draft · Saving…' : p.saveStatus === 'failed' ? 'Draft · Save failed' : p.saveStatus === 'saved' ? 'Draft · Saved' : p.hasDraft ? 'Draft · Autosave on' : 'Draft · Not saved'}</span><button type="button" aria-label="Close agreement" disabled={p.busy} onClick={p.onClose}><X size={20}/></button></div></header>
    <nav className="ag-chapters" aria-label="Creation chapters">{['Agreement', 'Coverage & services', 'Money', 'Delivery & acceptance', 'Review'].map((chapter, i) => <span key={chapter} aria-current={i === 0 ? 'step' : undefined}><b>{i + 1}</b>{chapter}</span>)}</nav>
    <div className="ag-layout"><main><div className="ag-intro"><span className="ag-eyebrow">LET’S MAKE IT OFFICIAL</span><h1>Every commitment starts<br/>with an agreement.</h1><p>Who it’s with. What you’re agreeing to. The rest follows.</p></div>
      <p className="ag-required-note">* Required fields. Labels, description and grace period are optional.</p><fieldset disabled={p.busy} className="ag-fields">
      <section className="ag-card"><div className="ag-card-heading"><div><span className="ag-eyebrow">01 · THE RELATIONSHIP</span><h2>Who is this agreement with? <span aria-label="required">*</span></h2></div><span className={`ag-badge ag-${p.relationship}`}>{relation}</span></div>
        {fieldError(!s.buyerId, 'Select a contact to continue.')}<p>Your contacts are filtered to {relation.toLowerCase()}s. This relationship applies to this agreement.</p>
        {s.buyerId && !editingContact ? <><div className="ag-contact"><div className="ag-avatar">{s.buyerName.slice(0, 2).toUpperCase()}</div><div><strong>{s.buyerName}</strong><small>{s.buyerContactPersonName || (s.useCompanyContact ? 'Company contact selected' : 'Contact selected')}</small></div><button type="button" onClick={() => setEditingContact(true)}>Change</button></div><details><summary>Contact person & delivery details</summary>{p.contactPicker}</details></> : <div className="ag-picker">{p.contactPicker}{s.buyerId && <button type="button" className="ag-secondary" onClick={() => setEditingContact(false)}>Use this contact <Check size={16}/></button>}</div>}
      </section>
      <section className="ag-card"><span className="ag-eyebrow">02 · THE ESSENTIALS</span><h2>Give the agreement its shape.</h2><p>Just the essentials. Fine-tune the rest when you need to.</p>
        <label>Agreement name *<input aria-label="Agreement name" aria-required="true" aria-invalid={attempted && !s.contractName.trim()} value={s.contractName} maxLength={CONTRACT_TITLE_MAX_LENGTH} placeholder="Give this commitment a clear name" onChange={e => p.onChange({ contractName: e.target.value })}/>{fieldError(!s.contractName.trim(), 'Enter an agreement name.')}</label>
        <label>Starts on *<input aria-required="true" aria-invalid={attempted && !dateValid} type="date" value={dateInput(new Date(s.startDate))} onChange={e => p.onChange({ startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : new Date(NaN) })}/>{fieldError(!dateValid, 'Choose a valid start date.')}</label>
        {isLoading ? <p role="status">Loading agreement labels…</p> : <AgreementLabels items={items} selectedId={s.nomenclatureId} selectedName={s.nomenclatureName} onSelect={p.onLabel}/>}

        {labelsError && <p role="alert" className="ag-error">Agreement labels could not load. No label has been chosen for you. Reload to retry, or leave this optional field unset.</p>}
        <div className="ag-grid"><label>Runs for *<div className="ag-duration"><input aria-label="Duration" aria-required="true" aria-invalid={attempted && !termValid} type="number" min="1" step="1" value={s.durationValue || ''} onChange={e => p.onChange({ durationValue: Number(e.target.value) })}/><select aria-label="Duration unit" value={s.durationUnit} onChange={e => p.onChange({ durationUnit: e.target.value })}>{['days', 'months', 'years'].map(unit => <option key={unit}>{unit}</option>)}</select></div>{fieldError(!termValid, 'Enter a whole-number duration greater than zero.')}</label><label>Currency *<select aria-required="true" aria-invalid={attempted && !currencyValid} aria-label="Currency" value={s.currency} onChange={e => p.onChange({ currency: e.target.value })}><option value="">Choose currency</option>{currencyOptions.map(currency => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}{currency.code === defaultCurrency ? ' · Default' : ''}</option>)}</select>{fieldError(!currencyValid, 'Choose a currency.')}</label></div>
        <div className="ag-presets"><span>Common terms</span><button type="button" onClick={() => p.onChange({ durationValue: 6, durationUnit: 'months' })}>6 months</button><button type="button" onClick={() => p.onChange({ durationValue: 1, durationUnit: 'years' })}>1 year</button></div>
        {end && <div className="ag-dates"><span>{new Date(s.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span><ArrowRight size={18}/><span>{end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span><small>Estimated term · final dates confirmed on creation</small></div>}
        <details><summary>Description & grace period · Optional</summary><RichTextEditor value={s.description} onChange={description => p.onChange({ description })} label="Scope note · optional" maxLength={CONTRACT_DESCRIPTION_MAX_LENGTH}/><label>Grace period<div className="ag-duration"><input aria-label="Grace period" type="number" min="0" step="1" value={s.gracePeriodValue} onChange={e => p.onChange({ gracePeriodValue: Number(e.target.value) })}/><select aria-label="Grace unit" value={s.gracePeriodUnit} onChange={e => p.onChange({ gracePeriodUnit: e.target.value })}>{['days', 'months', 'years'].map(unit => <option key={unit}>{unit}</option>)}</select></div></label><p>New agreements remain drafts. Acceptance is decided after scope and price.</p></details>
      </section></fieldset>
      <div id="agreement-errors" tabIndex={-1}>{attempted && !valid && <p role="alert" className="ag-error">{!s.buyerId ? 'Select a contact. ' : ''}{!s.contractName.trim() ? 'Name the agreement. ' : ''}{!termValid ? 'Enter a whole-number duration greater than zero. ' : ''}{!dateValid ? 'Choose a start date. ' : ''}{!currencyValid ? 'Choose a currency. ' : ''}{!graceValid ? 'Check the grace period. ' : ''}</p>}{p.error && <p role="alert" className="ag-error">{p.error}</p>}</div>
      {ready && <section className="ag-card ag-ready" role="status"><Check size={24}/><h2>Agreement saved.</h2><p>Your essentials are safely in a draft. Coverage & services is the next build; this review release ends here. No acceptance request has been sent.</p><button type="button" onClick={() => setSavedSnapshot(null)}>Keep refining</button></section>}
      <details className="ag-mobile-summary"><summary>Your agreement so far</summary>{summary}</details>
    </main><aside>{summary}</aside></div>
    <footer className="ag-footer"><span>Agreement · 1 of 5</span><button type="button" disabled={p.busy} onClick={() => void save(false)}><Save size={17}/> Save draft</button><button type="button" className="ag-primary" disabled={p.busy} onClick={() => void save(true)}>{p.busy ? 'Saving…' : p.hasDraft ? 'Save changes' : 'Save agreement'}<ArrowRight size={18}/></button></footer>
  </div>;
}
