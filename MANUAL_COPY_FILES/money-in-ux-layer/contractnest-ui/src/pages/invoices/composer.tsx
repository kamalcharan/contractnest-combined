// ============================================================================
// Invoices — composer (/invoices/new) · WIRED (A4)
// ----------------------------------------------------------------------------
// The document-first replacement for AdHocInvoiceDialog, now real:
//   · Bill To ← the EXISTING ContactPicker (real contact search)
//   · ?from=declaration:<id> seeds contact, line, amount and UPI reference
//     from a pending guest-fee declaration (Money In strip / Group Sessions)
//   · Save → useCreateAdhocInvoice → create_adhoc_invoice: invoice + receipt
//     in one transaction, declaration stamped so Payments-to-confirm flips
//     that row from "Invoice" to "Confirm"
// Backend constraint, surfaced honestly: create_adhoc_invoice always creates
// a FULLY PAID invoice (invoice + receipt together). So Save requires the
// payment block ON; unpaid standalone invoices are a later capability.
// The catalog typeahead still offers sample suggestions (free text is real).
// ============================================================================

import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, LayoutGrid, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import ContactPicker from '@/components/common/ContactPicker';
import { useContact } from '@/hooks/useContacts';
import { usePendingDeclarations } from '@/hooks/queries/useGroupSessionsDashboard';
import { useCreateAdhocInvoice } from '@/hooks/queries/useInvoiceQueries';
import {
  fmtMoney, fmtDate, useInvoiceTheme, IncludedBadge, FreeReceiptsBadge,
  InvoicePaper, DocTh, SideCard, paperInk, paperSub, paperFaint,
} from './ui';
import { SAMPLE_CATALOG, TODAY_ISO, canCreateAdhocInvoice } from './sampleData';
import type { CatalogLineOption } from './types';

interface DraftLine { key: number; name: string; category: string | null; description: string; rate: number; qty: number; tax_rate: number }
interface DraftPayment { method: string; date: string; reference: string }

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];

const cellInput = (extra?: React.CSSProperties): React.CSSProperties => ({
  color: paperInk,
  borderColor: '#d1d5db',
  backgroundColor: 'transparent',
  ...extra,
});

const InvoiceComposerPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentTenant, perspective } = useAuth();
  const { colors, ink, sub } = useInvoiceTheme();
  const brand = colors.brand.primary;
  const keyRef = useRef(1);

  // ── declaration hand-off: /invoices/new?from=declaration:<id> ────────────
  const fromParam = params.get('from') || '';
  const declarationId = fromParam.startsWith('declaration:') ? fromParam.slice('declaration:'.length) : null;
  const declarationsQuery = usePendingDeclarations({ enabled: !!declarationId });
  const seed = useMemo(
    () => (declarationId ? (declarationsQuery.data || []).find((d) => d.id === declarationId) || null : null),
    [declarationId, declarationsQuery.data]
  );

  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [recordPayment, setRecordPayment] = useState(true);
  const [payment, setPayment] = useState<DraftPayment>({ method: 'Cash', date: TODAY_ISO, reference: '' });

  // Apply the declaration seed once it arrives (query is async).
  if (seed && !seeded) {
    setSeeded(true);
    if (seed.member_contact_id) setContactId(seed.member_contact_id);
    setLines([{
      key: keyRef.current++,
      name: seed.label || seed.block_name || 'Guest Participation Fee',
      category: seed.block_name || null,
      description: seed.block_name ? `${seed.block_name}${seed.created_at ? `, ${fmtDate(seed.created_at)}` : ''}` : '',
      rate: seed.amount || 0, qty: 1, tax_rate: 0,
    }]);
    setRecordPayment(true);
    setPayment({
      method: seed.upi_reference ? 'UPI' : 'Cash',
      date: (seed.created_at || TODAY_ISO).slice(0, 10),
      reference: seed.upi_reference || '',
    });
  }

  // Selected contact (same hook ContactPicker itself uses) → paper Bill To.
  const { data: selectedContact } = useContact(contactId || '');
  const contactName = selectedContact
    ? ((selectedContact as any).company_name || (selectedContact as any).name || (selectedContact as any).displayName || 'Selected contact')
    : (seed?.member_name || null);

  const createAdhoc = useCreateAdhocInvoice();

  const subtotal = lines.reduce((s, l) => s + l.rate * l.qty, 0);
  const taxTotal = lines.reduce((s, l) => s + (l.rate * l.qty * l.tax_rate) / 100, 0);
  const total = subtotal + taxTotal;

  const matchingCatalog = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    return SAMPLE_CATALOG.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 6);
  }, [addQuery]);

  const addFromCatalog = (opt: CatalogLineOption) => {
    setLines((ls) => [...ls, { key: keyRef.current++, name: opt.name, category: opt.category, description: '', rate: opt.rate, qty: 1, tax_rate: opt.tax_rate }]);
    setAddQuery(''); setAddOpen(false); setBrowseOpen(false);
  };
  const addFreeText = () => {
    if (!addQuery.trim()) return;
    setLines((ls) => [...ls, { key: keyRef.current++, name: addQuery.trim(), category: null, description: '', rate: 0, qty: 1, tax_rate: 0 }]);
    setAddQuery(''); setAddOpen(false);
  };
  const patchLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // Backend creates invoice + receipt together (always fully paid), so a
  // payment is required — not a UI whim, the transaction's shape.
  const canSave = !!contactId && lines.length > 0 && total > 0 && recordPayment && !createAdhoc.isPending;

  const save = async () => {
    if (!canSave || !contactId) return;
    try {
      const result = await createAdhoc.mutateAsync({
        contact_id: contactId,
        currency: 'INR',
        line_items: lines.map((l) => ({
          name: l.name + (l.description ? ` — ${l.description}` : ''),
          qty: l.qty,
          unit_price: l.rate,
          amount: l.rate * l.qty,
        })),
        tax_amount: taxTotal > 0 ? taxTotal : undefined,
        payment_method: payment.method,
        payment_date: payment.date || null,
        reference_number: payment.reference || null,
        declaration_id: declarationId,
      });
      vaniToast.success(`${result.invoice_number} created — ${fmtMoney(result.total_amount)} received, receipt ${result.receipt_number} attached.`);
      navigate('/money-in');
    } catch (e: any) {
      vaniToast.error(e?.message || 'Could not create the invoice.');
    }
  };

  if (perspective === 'expense') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-lg font-extrabold mb-2" style={ink}>Invoices are created on the revenue side</h1>
        <button onClick={() => navigate('/to-pay')} className="text-sm font-bold" style={{ color: brand }}>Go to To Pay</button>
      </div>
    );
  }

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

  const sideInput: React.CSSProperties = { ...ink, borderColor: `${colors.utility.primaryText}25`, backgroundColor: 'transparent' };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* page bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/money-in')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
            style={{ ...sub, borderColor: `${colors.utility.primaryText}20` }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-lg font-extrabold leading-tight" style={ink}>New Invoice</h1>
            <p className="text-[11px]" style={sub}>
              Number assigned on save{contactName ? ` · ${contactName}` : ''}
              {seed ? ' · from a declared payment' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IncludedBadge />
          <button onClick={save} disabled={!canSave}
            title={!recordPayment ? 'Standalone invoices settle on creation — turn the payment block on.' : undefined}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: colors.semantic.success }}>
            {createAdhoc.isPending ? 'Saving…' : total > 0 ? `Save — ${fmtMoney(total)} received` : 'Save invoice'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* ═══════ LEFT: the document, editable in place ═══════ */}
        <InvoicePaper
          brand={brand}
          brandSecondary={colors.brand.secondary}
          businessName={currentTenant?.name || 'Your Business'}
          invoiceNumber={<span style={{ color: paperFaint }}>on save</span>}
          issuedDate={fmtDate(TODAY_ISO)}
          dueDate={fmtDate(payment.date || TODAY_ISO)}
          invoiceToName={contactName || <span style={{ color: paperFaint }}>Choose a contact →</span>}
          invoiceToLines={contactName && !seed ? [] : seed ? ['No membership contract — settled directly'] : []}
          billToRows={[
            { label: 'Total Due', value: <b>{fmtMoney(0)}</b> },
            { label: 'Payment', value: `${payment.method}${payment.date ? ` · ${fmtDate(payment.date)}` : ''}` },
          ]}
          table={
            <>
              <thead>
                <tr style={{ backgroundColor: `${brand}0D` }}>
                  <DocTh brand={brand}>#</DocTh>
                  <DocTh brand={brand}>Item</DocTh>
                  <DocTh brand={brand}>Description</DocTh>
                  <DocTh brand={brand} right>Rate</DocTh>
                  <DocTh brand={brand} right>Qty</DocTh>
                  <DocTh brand={brand} right>Total</DocTh>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.key} className="border-t align-top" style={{ borderColor: '#f9fafb' }}>
                    <td className="py-3 px-4 text-sm" style={{ color: paperFaint }}>{idx + 1}</td>
                    <td className="py-3 px-4">
                      <input value={l.name} onChange={(e) => patchLine(l.key, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full text-sm font-semibold bg-transparent border-b border-dashed py-0.5"
                        style={cellInput()} />
                      {l.category && <div className="text-[0.65rem] mt-0.5" style={{ color: paperFaint }}>{l.category}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <input value={l.description} onChange={(e) => patchLine(l.key, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full text-sm bg-transparent border-b border-dashed py-0.5"
                        style={cellInput({ color: paperSub })} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" value={l.rate} min={0} onChange={(e) => patchLine(l.key, { rate: Number(e.target.value) || 0 })}
                        className="w-20 text-sm text-right bg-transparent border rounded-md px-1.5 py-0.5 tabular-nums" style={cellInput()} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" value={l.qty} min={1} onChange={(e) => patchLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-14 text-sm text-right bg-transparent border rounded-md px-1.5 py-0.5 tabular-nums" style={cellInput()} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-bold tabular-nums" style={{ color: paperInk }}>
                          {fmtMoney(l.rate * l.qty * (1 + l.tax_rate / 100))}
                        </span>
                        <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} title="Remove line" style={{ color: paperFaint }}>
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr className="border-t" style={{ borderColor: '#f3f4f6' }}>
                  <td colSpan={6} className="py-3 px-4">
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Plus size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: brand }} />
                        <input
                          value={addQuery}
                          onFocus={() => setAddOpen(true)}
                          onChange={(e) => { setAddQuery(e.target.value); setAddOpen(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (matchingCatalog[0] ? addFromCatalog(matchingCatalog[0]) : addFreeText()); }}
                          placeholder="Add item — type a name and press Enter…"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm"
                          style={{ color: paperInk, borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
                        />
                        {addOpen && addQuery && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden bg-white" style={{ borderColor: '#e5e7eb' }}>
                            {matchingCatalog.map((opt) => (
                              <button key={opt.id} onClick={() => addFromCatalog(opt)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50">
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold truncate" style={{ color: paperInk }}>{opt.name}</span>
                                  <span className="block text-[10px]" style={{ color: paperFaint }}>{opt.category}{opt.tax_rate ? ` · ${opt.tax_rate}% tax` : ''}</span>
                                </span>
                                <span className="text-sm font-bold tabular-nums flex-none" style={{ color: brand }}>{fmtMoney(opt.rate)}</span>
                              </button>
                            ))}
                            <button onClick={addFreeText} className="w-full px-3 py-2 text-left text-xs border-t hover:bg-gray-50" style={{ color: paperSub, borderColor: '#f3f4f6' }}>
                              Add “<span className="font-semibold" style={{ color: paperInk }}>{addQuery}</span>” as a custom line
                            </button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setBrowseOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold flex-none hover:bg-gray-50"
                        style={{ color: paperSub, borderColor: '#e5e7eb' }}>
                        <LayoutGrid size={13} /> Browse catalog
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </>
          }
          subtotal={subtotal}
          taxRows={taxTotal > 0 ? [{ label: 'Tax', amount: taxTotal }] : []}
          grandTotal={total}
          amountPaid={recordPayment ? total : 0}
          balanceDue={recordPayment ? 0 : total}
          notes={null}
        />

        {/* ═══════ RIGHT: sidecar ═══════ */}
        <div className="space-y-4">
          <SideCard title="Bill To">
            <ContactPicker
              value={contactId}
              onChange={(id) => setContactId(id)}
              placeholder="Search contact…"
            />
            {contactId && (
              <p className="text-[11px] mt-2" style={sub}>
                No contract needed — this invoice stands on its own and settles directly.
              </p>
            )}
          </SideCard>

          <SideCard title="Payment" trailing={<FreeReceiptsBadge />}>
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={recordPayment} onChange={(e) => setRecordPayment(e.target.checked)} />
              <span className="text-xs font-semibold" style={ink}>Money already received — record it now</span>
            </label>
            {recordPayment ? (
              <div className="space-y-2.5 mt-1">
                <select value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={sideInput}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="date" value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={sideInput} />
                <input value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Reference / UTR (optional)"
                  className="w-full px-2.5 py-2 rounded-lg border text-xs" style={sideInput} />
                <p className="text-[11px] flex items-center gap-1.5" style={{ color: colors.semantic.success }}>
                  <Wallet size={12} /> A receipt is attached on save — the invoice opens as paid.
                </p>
              </div>
            ) : (
              <p className="text-[11px] mt-1" style={sub}>
                Standalone invoices settle on creation for now — an unpaid
                standalone invoice is a later capability. Turn this back on to save.
              </p>
            )}
          </SideCard>
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
