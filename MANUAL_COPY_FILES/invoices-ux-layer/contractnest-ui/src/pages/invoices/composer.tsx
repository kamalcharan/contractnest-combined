// ============================================================================
// Invoices — composer (/invoices/new) · UX layer
// Replaces the AdHocInvoiceDialog modal experience. Decisions carried from the
// 2026-08-09 design session: document-first page (app chrome outside, branded
// frame inside), inline typeahead add-line grouped by category with a Browse
// catalog modal, Bill To in the right sidecard — not in the document header.
//
// ?prefill=guest demonstrates the group-sessions declaration hand-off; the
// wiring batch replaces it with ?from=declaration:<id> resolved server-side.
// Save actions toast in UX mode — creation wires to create_adhoc_invoice next.
// ============================================================================

import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, LayoutGrid, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import {
  fmtMoney, fmtDate, useInvoiceTheme, IncludedBadge, FreeReceiptsBadge, InvoiceDocumentFrame,
} from './ui';
import { SAMPLE_CATALOG, SAMPLE_CONTACTS, TODAY_ISO, canCreateAdhocInvoice } from './sampleData';
import type { CatalogLineOption } from './types';

interface DraftLine { key: number; name: string; rate: number; qty: number; tax_rate: number }
interface DraftPayment { method: string; date: string; reference: string }

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];

const InvoiceComposerPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentTenant } = useAuth();
  const { colors, ink, sub, card, hairline } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const keyRef = useRef(1);

  // Declaration hand-off demo (wiring: resolved from the declaration row)
  const prefillGuest = params.get('prefill') === 'guest';

  const [contactId, setContactId] = useState<string | null>(prefillGuest ? 'ct-1' : null);
  const [contactQuery, setContactQuery] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  const [lines, setLines] = useState<DraftLine[]>(
    prefillGuest ? [{ key: 0, name: 'Guest Participation Fee', rate: 600, qty: 1, tax_rate: 0 }] : []
  );
  const [addQuery, setAddQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  const [recordPayment, setRecordPayment] = useState(prefillGuest);
  const [payment, setPayment] = useState<DraftPayment>({
    method: prefillGuest ? 'UPI' : 'Cash',
    date: TODAY_ISO,
    reference: prefillGuest ? 'bappuditeju-2@okaxis' : '',
  });

  const contact = SAMPLE_CONTACTS.find((c) => c.id === contactId) || null;
  const subtotal = lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const tax = lines.reduce((s, l) => s + (l.rate * l.qty * l.tax_rate) / 100, 0);
  const total = subtotal + tax;

  const matchingCatalog = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    return SAMPLE_CATALOG.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 6);
  }, [addQuery]);

  const matchingContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    const base = q ? SAMPLE_CONTACTS.filter((c) => c.name.toLowerCase().includes(q)) : SAMPLE_CONTACTS;
    return base.slice(0, 6);
  }, [contactQuery]);

  const addFromCatalog = (opt: CatalogLineOption) => {
    setLines((ls) => [...ls, { key: keyRef.current++, name: opt.name, rate: opt.rate, qty: 1, tax_rate: opt.tax_rate }]);
    setAddQuery(''); setAddOpen(false); setBrowseOpen(false);
  };
  const addFreeText = () => {
    if (!addQuery.trim()) return;
    setLines((ls) => [...ls, { key: keyRef.current++, name: addQuery.trim(), rate: 0, qty: 1, tax_rate: 0 }]);
    setAddQuery(''); setAddOpen(false);
  };
  const patchLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const canSave = !!contact && lines.length > 0 && total > 0;
  const save = () => {
    if (!canSave) return;
    // Wiring batch: create_adhoc_invoice via useCreateAdhocInvoice, then
    // navigate to /invoices/:id of the created row.
    vaniToast.success('UX preview — saving wires to create_adhoc_invoice in the next batch.');
  };

  if (!canCreateAdhocInvoice) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-xl font-extrabold mb-2" style={ink}>Standalone invoices are a plan feature</h1>
        <p className="text-sm mb-5" style={sub}>
          Invoices without a contract are available on paid plans — pay-as-you-go, quarterly or yearly.
          Contract invoices remain unlimited on every plan.
        </p>
        <button className="px-5 py-2.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: brand }}
          onClick={() => navigate('/settings/businessmodel/pricing-plans')}>
          See plans
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { ...ink, borderColor: `${colors.utility.primaryText}25`, backgroundColor: 'transparent' };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* app chrome — outside the document */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-1.5 text-xs font-bold" style={sub}>
          <ArrowLeft size={14} /> All invoices
        </button>
        <div className="flex items-center gap-2">
          <IncludedBadge />
          <button onClick={save} disabled={!canSave}
            className="px-4 py-2 rounded-full text-xs font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: recordPayment ? colors.semantic.success : brand }}>
            {recordPayment ? `Save — ${fmtMoney(total)} received` : 'Save invoice'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px] items-start">
        {/* ── the document ── */}
        <InvoiceDocumentFrame
          businessName={currentTenant?.name || 'Your Business'}
          businessSub={null}
          metaRows={[
            { label: 'Invoice #', value: <span style={sub}>assigned on save</span> },
            { label: 'Date issued', value: fmtDate(TODAY_ISO) },
            { label: 'Status', value: recordPayment ? 'Paid on creation' : 'Awaiting payment' },
          ]}
          billToName={contact ? contact.name : <span style={sub}>Choose who this is for →</span>}
          billToSub={contact ? (contact.hasContract ? 'Member — has an active contract' : 'No membership contract — settled directly') : null}
        >
          {/* lines */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b" style={hairline}>
                  {['Item', 'Rate', 'Qty', 'Tax %', 'Total', ''].map((h, i) => (
                    <th key={i} className={`py-2 text-[10px] font-bold uppercase tracking-wider ${i > 0 && i < 5 ? 'text-right' : ''}`} style={sub}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b" style={hairline}>
                    <td className="py-2 pr-3">
                      <input value={l.name} onChange={(e) => patchLine(l.key, { name: e.target.value })}
                        className="w-full text-sm font-semibold bg-transparent border-b border-dashed py-0.5"
                        style={{ ...ink, borderColor: `${colors.utility.primaryText}30` }} />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" value={l.rate} min={0} onChange={(e) => patchLine(l.key, { rate: Number(e.target.value) || 0 })}
                        className="w-20 text-xs text-right bg-transparent border rounded-md px-1.5 py-1 tabular-nums" style={inputStyle} />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" value={l.qty} min={1} onChange={(e) => patchLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-14 text-xs text-right bg-transparent border rounded-md px-1.5 py-1 tabular-nums" style={inputStyle} />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" value={l.tax_rate} min={0} onChange={(e) => patchLine(l.key, { tax_rate: Number(e.target.value) || 0 })}
                        className="w-14 text-xs text-right bg-transparent border rounded-md px-1.5 py-1 tabular-nums" style={inputStyle} />
                    </td>
                    <td className="py-2 text-sm font-bold text-right tabular-nums" style={ink}>
                      {fmtMoney(l.rate * l.qty * (1 + l.tax_rate / 100))}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} title="Remove line" style={sub}><X size={14} /></button>
                    </td>
                  </tr>
                ))}

                {/* add-line row — typeahead over the catalog, free text allowed */}
                <tr>
                  <td colSpan={6} className="py-2">
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Plus size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: brand }} />
                        <input
                          value={addQuery}
                          onFocus={() => setAddOpen(true)}
                          onChange={(e) => { setAddQuery(e.target.value); setAddOpen(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (matchingCatalog[0] ? addFromCatalog(matchingCatalog[0]) : addFreeText()); }}
                          placeholder="Add line — type to search your catalog, or enter free text…"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs" style={inputStyle}
                        />
                        {addOpen && addQuery && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden"
                            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}20` }}>
                            {matchingCatalog.map((opt) => (
                              <button key={opt.id} onClick={() => addFromCatalog(opt)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:brightness-95"
                                style={{ backgroundColor: colors.utility.primaryBackground }}>
                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold truncate" style={ink}>{opt.name}</span>
                                  <span className="block text-[10px]" style={sub}>{opt.category}{opt.tax_rate ? ` · ${opt.tax_rate}% tax` : ''}</span>
                                </span>
                                <span className="text-xs font-bold tabular-nums flex-none" style={{ color: brand }}>{fmtMoney(opt.rate)}</span>
                              </button>
                            ))}
                            <button onClick={addFreeText} className="w-full px-3 py-2 text-left text-xs border-t" style={{ ...sub, ...hairline }}>
                              Add “<span className="font-semibold" style={ink}>{addQuery}</span>” as a custom line
                            </button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setBrowseOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold flex-none"
                        style={{ ...sub, borderColor: `${colors.utility.primaryText}25` }}>
                        <LayoutGrid size={13} /> Browse catalog
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="flex justify-end mt-4">
            <div className="w-full max-w-xs space-y-1.5">
              {tax > 0 && (
                <>
                  <div className="flex justify-between text-xs" style={sub}><span>Subtotal</span><span className="tabular-nums">{fmtMoney(subtotal)}</span></div>
                  <div className="flex justify-between text-xs" style={sub}><span>Tax</span><span className="tabular-nums">{fmtMoney(tax)}</span></div>
                </>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t" style={hairline}>
                <span className="text-sm font-bold" style={ink}>Grand total</span>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: brand }}>{fmtMoney(total)}</span>
              </div>
              {recordPayment && total > 0 && (
                <div className="flex justify-between text-xs" style={{ color: colors.semantic.success }}>
                  <span className="font-semibold">Received {payment.method.toLowerCase() === 'cash' ? 'in cash' : `via ${payment.method}`}</span>
                  <span className="tabular-nums font-bold">{fmtMoney(total)}</span>
                </div>
              )}
            </div>
          </div>
        </InvoiceDocumentFrame>

        {/* ── sidecard: Bill To + payment ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-4" style={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={sub}>Bill To</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={sub} />
              <input
                value={contact && !contactOpen ? contact.name : contactQuery}
                onFocus={() => { setContactOpen(true); setContactQuery(''); }}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder="Search contact…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs" style={inputStyle}
              />
              {contactOpen && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden"
                  style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}20` }}>
                  {matchingContacts.map((c) => (
                    <button key={c.id} onClick={() => { setContactId(c.id); setContactOpen(false); }}
                      className="w-full px-3 py-2 text-left hover:brightness-95"
                      style={{ backgroundColor: colors.utility.primaryBackground }}>
                      <span className="block text-xs font-semibold" style={ink}>{c.name}</span>
                      <span className="block text-[10px]" style={sub}>{c.hasContract ? 'Member · active contract' : 'No contract — ad-hoc invoice'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {contact && !contact.hasContract && (
              <p className="text-[11px] mt-2" style={sub}>
                No contract needed — this invoice stands on its own and settles directly.
              </p>
            )}
          </div>

          <div className="rounded-2xl border p-4" style={card}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={sub}>Payment</p>
              <FreeReceiptsBadge />
            </div>
            <label className="flex items-center gap-2 py-2 cursor-pointer">
              <input type="checkbox" checked={recordPayment} onChange={(e) => setRecordPayment(e.target.checked)} />
              <span className="text-xs font-semibold" style={ink}>Money already received — record it now</span>
            </label>
            {recordPayment && (
              <div className="space-y-2.5 mt-1">
                <select value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={inputStyle}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="date" value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={inputStyle} />
                <input value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Reference / UTR (optional)"
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={inputStyle} />
                <p className="text-[11px] flex items-center gap-1.5" style={{ color: colors.semantic.success }}>
                  <Wallet size={12} /> A receipt is attached on save — the invoice opens as paid.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Browse catalog modal — category accordion */}
      {browseOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,15,20,0.55)' }} onClick={() => setBrowseOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border p-4 max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: colors.utility.primaryBackground, borderColor: `${colors.utility.primaryText}20` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={ink}>Your catalog</p>
              <button onClick={() => setBrowseOpen(false)} style={sub}><X size={16} /></button>
            </div>
            {[...new Set(SAMPLE_CATALOG.map((c) => c.category))].map((cat) => {
              const open = openCats.has(cat);
              return (
                <div key={cat} className="mb-1">
                  <button
                    onClick={() => setOpenCats((s) => { const n = new Set(s); open ? n.delete(cat) : n.add(cat); return n; })}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold hover:brightness-95"
                    style={{ ...ink, backgroundColor: colors.utility.secondaryBackground }}>
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {cat}
                  </button>
                  {open && SAMPLE_CATALOG.filter((c) => c.category === cat).map((opt) => (
                    <button key={opt.id} onClick={() => addFromCatalog(opt)}
                      className="w-full flex items-center justify-between px-3 py-2 pl-8 text-left hover:brightness-95">
                      <span className="text-xs font-semibold" style={ink}>{opt.name}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: brand }}>{fmtMoney(opt.rate)}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceComposerPage;
