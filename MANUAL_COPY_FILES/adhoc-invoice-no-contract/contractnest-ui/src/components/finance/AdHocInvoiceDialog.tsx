// src/components/finance/AdHocInvoiceDialog.tsx
// Contact-less invoice creation — no contract required. Invoice + settling
// receipt are created together in one transaction (create_adhoc_invoice),
// always fully paid at creation. Item picker reuses BlockLibraryMini/
// BlockCardSelectable — the same card Contract Wizard uses for catalog
// items (select cards) and FlyBy quick-add (ad-hoc, non-catalog items).
// Entry points: Group Sessions "Payments to confirm" panel, Contacts
// Financials tab (AdHocServiceCard).

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import { useCreateAdhocInvoice } from '@/hooks/queries/useInvoiceQueries';
import BlockLibraryMini, { FlyByCategoryId } from '@/components/catalog-studio/BlockLibraryMini';
import { getDefaultCurrency } from '@/utils/constants/currencies';
import type { Block } from '@/types/catalogStudio';
import type { PaymentMethod } from '@/types/contracts';
import { Loader2, Receipt, Trash2, Plus } from 'lucide-react';

interface AdHocInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName?: string | null;
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

const AdHocInvoiceDialog: React.FC<AdHocInvoiceDialogProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  onSuccess,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();
  const createAdhocInvoice = useCreateAdhocInvoice();

  const currency = getDefaultCurrency().code;

  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

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

  const resetAndClose = () => {
    setItems([]);
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber('');
    setNotes('');
    onClose();
  };

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
      });

      addToast({ type: 'success', title: 'Invoice created', message: `${result.invoice_number} · Receipt ${result.receipt_number}` });
      onSuccess?.(result.invoice_number);
      resetAndClose();
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

  const fmt = (n: number) => `${currency} ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
      <DialogContent
        className="sm:max-w-4xl rounded-xl"
        style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.utility.primaryText, fontSize: '0.875rem' }}>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" style={{ color: colors.brand.primary }} />
              Create Invoice{contactName ? ` — ${contactName}` : ''}
            </div>
          </DialogTitle>
          <DialogDescription style={{ color: colors.utility.secondaryText, fontSize: '0.6875rem' }}>
            No contract required. Invoice and receipt are created together, fully paid.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start mt-1">
          {/* Column 1: catalog + flyby picker — same card as Contract Wizard */}
          <div style={{ height: '420px' }}>
            <BlockLibraryMini
              selectedBlockIds={selectedBlockIds}
              onAddBlock={handleAddBlock}
              maxHeight="420px"
              currency={currency}
              flyByTypes={['service', 'spare', 'text', 'document']}
              onAddFlyByBlock={handleAddFlyByBlock}
            />
          </div>

          {/* Column 2: line items + settlement fields */}
          <div className="space-y-3" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {items.length === 0 ? (
              <div
                className="rounded-lg border border-dashed flex items-center justify-center text-xs py-8"
                style={{ borderColor: colors.utility.border, color: colors.utility.secondaryText }}
              >
                Add items from the library to build this invoice
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((li) => (
                  <div
                    key={li.key}
                    className="flex items-center gap-2 p-2 rounded-lg border"
                    style={{ borderColor: colors.utility.border, backgroundColor: colors.utility.secondaryBackground }}
                  >
                    {li.isFlyBy ? (
                      <input
                        type="text"
                        value={li.name}
                        onChange={(e) => updateItem(li.key, { name: e.target.value })}
                        placeholder="Item name"
                        style={{ ...inputStyle, flex: 2 }}
                      />
                    ) : (
                      <span className="flex-[2] text-xs font-medium truncate" style={{ color: colors.utility.primaryText }}>
                        {li.name}
                      </span>
                    )}
                    <input
                      type="number"
                      min={1}
                      value={li.qty}
                      onChange={(e) => updateItem(li.key, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      style={{ ...inputStyle, flex: '0 0 56px' }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.unitPrice}
                      onChange={(e) => updateItem(li.key, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                      style={{ ...inputStyle, flex: '0 0 90px' }}
                    />
                    <span className="text-xs font-semibold tabular-nums flex-[0_0_90px] text-right" style={{ color: colors.utility.primaryText }}>
                      {fmt(li.qty * li.unitPrice)}
                    </span>
                    <button onClick={() => removeItem(li.key)} className="flex-none p-1 rounded hover:opacity-70">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: colors.semantic.error }} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-1 pr-9">
                  <span className="text-sm font-bold" style={{ color: colors.utility.primaryText }}>
                    Total: {fmt(total)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
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
            <div>
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

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={resetAndClose}
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
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Invoice · {fmt(total)}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdHocInvoiceDialog;
