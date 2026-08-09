// src/components/finance/AdHocInvoiceDialog.tsx
// Contact-less invoice creation — no contract required. Invoice + settling
// receipt are created together in one transaction (create_adhoc_invoice),
// always fully paid at creation. Right panel is styled as the same invoice
// document used at pages/contracts/invoice/index.tsx (header, Bill To,
// itemized table, totals) rather than a generic form, per design direction.
// Item picker reuses BlockLibraryMini/BlockCardSelectable — the same card
// Contract Wizard uses for catalog items (select cards) and FlyBy quick-add
// (ad-hoc, non-catalog items).
// Entry points:
//   - Group Sessions "Payments to confirm" panel — a guest-fee declaration
//     already carries a known item/amount (declared at check-in), so its
//     line item arrives pre-filled via `initialItems` rather than empty.
//   - Contacts Financials tab (AdHocServiceCard) — starts blank, items
//     added from the catalog picker or FlyBy.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useCreateAdhocInvoice } from '@/hooks/queries/useInvoiceQueries';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import BlockLibraryMini, { FlyByCategoryId } from '@/components/catalog-studio/BlockLibraryMini';
import { getDefaultCurrency } from '@/utils/constants/currencies';
import type { Block } from '@/types/catalogStudio';
import type { PaymentMethod } from '@/types/contracts';
import { Loader2, Plus, Building2, X } from 'lucide-react';

interface AdHocInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName?: string | null;
  /** When opened from a Group Session declaration, stamps that declaration
   * with the resulting invoice id so its row can switch from "Invoice" to
   * "Confirm". Omit when there's no declaration (e.g. Contacts Financials tab). */
  declarationId?: string | null;
  /** What's already known to be owed — e.g. a guest's check-in payment
   * declaration already names the service and amount, so the chair is
   * confirming a record, not composing one from scratch. Seeded into the
   * item list on open; still editable, not locked, in case it needs a
   * correction before the invoice is created. */
  initialItems?: Array<{ blockId?: string | null; name: string; qty?: number; unitPrice: number }>;
  onSuccess?: (invoiceNumber: string) => void;
}

interface LineItem {
  key: string;
  blockId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  isFlyBy: boolean;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const genKey = (() => {
  let n = 0;
  return () => `li_${++n}_${Math.random().toString(36).slice(2, 7)}`;
})();

/** Same resolution buildConfigurableBlock uses in the Contract Wizard, minus
 * the tax/cadence machinery this simpler always-settled flow doesn't need. */
const resolveBlockUnitPrice = (block: Block, currency: string): number => {
  const records = (block.meta?.pricingRecords || (block as any).config?.pricingRecords) as
    Array<{ currency: string; amount: number; is_active?: boolean }> | undefined;
  const match = records?.find((r) => r.currency === currency && r.is_active !== false);
  return match?.amount ?? block.price ?? 0;
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const AdHocInvoiceDialog: React.FC<AdHocInvoiceDialogProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  declarationId,
  initialItems,
  onSuccess,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const createAdhocInvoice = useCreateAdhocInvoice();
  const { profile: tenantProfile } = useTenantProfile();

  const currency = getDefaultCurrency().code;

  const [items, setItems] = useState<LineItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Seed from what's already known (e.g. a check-in declaration) each time
  // the dialog opens fresh — not on every prop change, so edits mid-session
  // aren't clobbered.
  useEffect(() => {
    if (!isOpen) return;
    if (initialItems && initialItems.length > 0) {
      setItems(
        initialItems.map((li) => ({
          key: genKey(),
          blockId: li.blockId ?? null,
          name: li.name,
          qty: li.qty ?? 1,
          unitPrice: li.unitPrice,
          isFlyBy: !li.blockId,
        }))
      );
    } else {
      setItems([]);
    }
    setShowPicker(false);
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber('');
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const total = useMemo(
    () => items.reduce((sum, li) => sum + li.qty * li.unitPrice, 0),
    [items]
  );
  const selectedBlockIds = useMemo(
    () => items.filter((li) => !li.isFlyBy && li.blockId).map((li) => li.blockId as string),
    [items]
  );

  const handleAddBlock = (block: Block) => {
    setItems((prev) => [
      ...prev,
      {
        key: genKey(),
        blockId: block.id,
        name: block.name,
        qty: 1,
        unitPrice: resolveBlockUnitPrice(block, currency),
        isFlyBy: false,
      },
    ]);
  };

  const handleAddFlyByBlock = (type: FlyByCategoryId) => {
    setItems((prev) => [
      ...prev,
      { key: genKey(), blockId: null, name: `New ${type}`, qty: 1, unitPrice: 0, isFlyBy: true },
    ]);
  };

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((li) => (li.key === key ? { ...li, ...patch } : li)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((li) => li.key !== key));
  };

  const handleClose = () => onClose();

  const handleSubmit = async () => {
    if (items.length === 0) {
      addToast({ type: 'error', title: 'No line items', message: 'Add at least one item before creating the invoice.' });
      return;
    }
    if (items.some((li) => !li.name.trim() || li.qty * li.unitPrice <= 0)) {
      addToast({ type: 'error', title: 'Incomplete line item', message: 'Every item needs a name and a positive amount.' });
      return;
    }

    try {
      const result = await createAdhocInvoice.mutateAsync({
        contact_id: contactId,
        currency,
        line_items: items.map((li) => ({
          block_id: li.blockId,
          name: li.name.trim(),
          qty: li.qty,
          unit_price: li.unitPrice,
          amount: li.qty * li.unitPrice,
        })),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        declaration_id: declarationId || null,
      });

      addToast({ type: 'success', title: 'Invoice created', message: `${result.invoice_number} · Receipt ${result.receipt_number}` });
      onSuccess?.(result.invoice_number);
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create invoice', message: err.message || 'An error occurred' });
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    border: `1px solid ${colors.utility.border}`,
    color: colors.utility.primaryText,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: colors.utility.secondaryText,
    fontSize: '0.625rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
    display: 'block',
  };

  const today = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        className="sm:max-w-5xl rounded-xl p-0 overflow-hidden"
        style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
      >
        <div className="grid" style={{ gridTemplateColumns: showPicker ? '260px 1fr' : '1fr', maxHeight: '85vh' }}>
          {/* Optional catalog/FlyBy picker — toggled, since the document
              layout below needs the room by default. */}
          {showPicker && (
            <div className="border-r p-3" style={{ borderColor: colors.utility.primaryText + '10', height: '85vh' }}>
              <BlockLibraryMini
                selectedBlockIds={selectedBlockIds}
                onAddBlock={handleAddBlock}
                maxHeight="calc(85vh - 24px)"
                currency={currency}
                flyByTypes={['service', 'spare', 'text', 'document']}
                onAddFlyByBlock={handleAddFlyByBlock}
              />
            </div>
          )}

          {/* Document panel — same visual language as pages/contracts/invoice/index.tsx */}
          <div className="overflow-y-auto" style={{ maxHeight: '85vh' }}>
            <div className="rounded-none" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.brand.secondary || colors.brand.primary}80)` }} />

              <div className="p-8">
                {/* Header: company + INVOICE meta */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    {tenantProfile?.logo_url ? (
                      <img src={tenantProfile.logo_url} alt={tenantProfile.business_name || 'Company'} className="h-10 mb-2 object-contain" crossOrigin="anonymous" />
                    ) : (
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-7 w-7" style={{ color: colors.brand.primary }} />
                        <span className="text-lg font-bold" style={{ color: colors.brand.primary }}>
                          {tenantProfile?.business_name || 'Company'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: colors.brand.primary }}>
                      NEW INVOICE
                    </h2>
                    <div className="text-sm text-gray-500">Date Issued: <span className="font-semibold text-gray-800">{formatDate(today)}</span></div>
                    <div className="text-sm text-gray-500">Status: <span className="font-semibold" style={{ color: colors.semantic.success }}>Will be marked Paid</span></div>
                  </div>
                </div>

                <hr className="border-gray-200 mb-6" />

                {/* Bill To */}
                <div className="mb-6">
                  <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-2">Bill To</h3>
                  <div className="text-sm font-bold text-gray-800">{contactName || '—'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">No membership contract — settled directly</div>
                </div>

                {/* Line items table */}
                <div className="mb-2 rounded-lg overflow-hidden border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: colors.brand.primary + '0D' }}>
                        <th className="text-left py-2.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>#</th>
                        <th className="text-left py-2.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>Item</th>
                        <th className="text-right py-2.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>Rate</th>
                        <th className="text-right py-2.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>Qty</th>
                        <th className="text-right py-2.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: colors.brand.primary }}>Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                            No items yet — use "Add item" below
                          </td>
                        </tr>
                      ) : (
                        items.map((li, index) => (
                          <tr key={li.key} className="border-t border-gray-50">
                            <td className="py-2.5 px-3 text-sm text-gray-400">{index + 1}</td>
                            <td className="py-2.5 px-3">
                              {li.isFlyBy ? (
                                <input
                                  type="text"
                                  value={li.name}
                                  onChange={(e) => updateItem(li.key, { name: e.target.value })}
                                  placeholder="Item name"
                                  className="text-sm font-semibold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-gray-500 w-full"
                                />
                              ) : (
                                <div className="text-sm font-semibold text-gray-800">{li.name}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={li.unitPrice}
                                onChange={(e) => updateItem(li.key, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                                className="text-sm text-gray-700 text-right bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-gray-500 w-20"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={1}
                                value={li.qty}
                                onChange={(e) => updateItem(li.key, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                className="text-sm text-gray-700 text-right bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-gray-500 w-14"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-sm font-bold text-gray-800 text-right">
                              {formatCurrency(li.qty * li.unitPrice, currency)}
                            </td>
                            <td className="py-2.5 px-1">
                              <button onClick={() => removeItem(li.key)} className="p-1 rounded hover:opacity-70">
                                <X className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold mb-6 px-2.5 py-1.5 rounded-lg border"
                  style={{ color: colors.brand.primary, borderColor: colors.brand.primary + '40' }}
                >
                  <Plus className="w-3.5 h-3.5" /> {showPicker ? 'Hide catalog' : 'Add item'}
                </button>

                {/* Summary */}
                <div className="flex justify-end mb-6">
                  <div className="w-72">
                    <div className="flex justify-between py-2">
                      <span className="text-base font-bold text-gray-800">Grand Total</span>
                      <span className="text-lg font-extrabold" style={{ color: colors.brand.primary }}>
                        {formatCurrency(total, currency)}
                      </span>
                    </div>
                    <div className="my-1 border-t border-gray-200" />
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-green-600 font-medium">Amount Paid (on creation)</span>
                      <span className="font-semibold text-green-600">{formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Settlement fields */}
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-3">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label style={labelStyle}>Payment Method</label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} style={inputStyle}>
                        {PAYMENT_METHOD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Payment Date</label>
                      <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label style={labelStyle}>Reference / Transaction ID (optional)</label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. UTR number, cheque no."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes..."
                      rows={2}
                      style={{ ...inputStyle, resize: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              className="flex justify-end gap-2 px-8 py-4 border-t"
              style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.primaryText + '10' }}
            >
              <button
                onClick={handleClose}
                disabled={createAdhocInvoice.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.border}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createAdhocInvoice.isPending || items.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: colors.semantic.success }}
              >
                {createAdhocInvoice.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create Invoice · {formatCurrency(total, currency)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdHocInvoiceDialog;
