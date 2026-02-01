// src/components/contracts/RecordPaymentDialog.tsx
// Reusable dialog for recording a payment receipt against an invoice.
// Used in: ContractWizard success screen (auto-accept) + contract detail page.

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useRecordPayment } from '@/hooks/queries/useInvoiceQueries';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import type { PaymentMethod, RecordPaymentResponse } from '@/types/contracts';
import { Loader2, Receipt, CheckCircle2 } from 'lucide-react';

// =================================================================
// TYPES
// =================================================================

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receiptData: RecordPaymentResponse) => void;
  contractId: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  balance: number;
  currency: string;
  paymentMode?: string;
  emiTotal?: number | null;
  receiptsCount?: number;
}

// =================================================================
// CONSTANTS
// =================================================================

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

// =================================================================
// COMPONENT
// =================================================================

const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  contractId,
  invoiceId,
  invoiceNumber,
  totalAmount,
  balance,
  currency,
  paymentMode,
  emiTotal,
  receiptsCount = 0,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  const { mutateAsync: recordPayment, isPending } = useRecordPayment(contractId);

  // ─── Form state ──────────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [emiSequence, setEmiSequence] = useState(receiptsCount + 1);

  // ─── Success state ───────────────────────────────────────────
  const [receiptData, setReceiptData] = useState<RecordPaymentResponse | null>(null);

  // ─── Derived ─────────────────────────────────────────────────
  const isEmi = paymentMode === 'emi' && emiTotal != null && emiTotal > 0;
  const emiInstallmentAmount = isEmi
    ? Math.round((totalAmount / emiTotal!) * 100) / 100
    : 0;

  // Pre-fill amount for EMI (per-installment)
  useEffect(() => {
    if (isEmi && !amount) {
      setAmount(emiInstallmentAmount.toString());
    }
  }, [isEmi, emiInstallmentAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setReceiptData(null);
      setAmount(isEmi ? emiInstallmentAmount.toString() : '');
      setPaymentMethod('bank_transfer');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber('');
      setNotes('');
      setEmiSequence(receiptsCount + 1);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Format currency ────────────────────────────────────────
  const fmt = (val: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(val);
    } catch {
      return `${currency} ${val.toLocaleString()}`;
    }
  };

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', message: 'Enter a positive payment amount.' });
      return;
    }
    if (numAmount > balance) {
      addToast({
        type: 'error',
        title: 'Amount exceeds balance',
        message: `Maximum payable is ${fmt(balance)}.`,
      });
      return;
    }

    try {
      const result = await recordPayment({
        invoice_id: invoiceId,
        amount: numAmount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        emi_sequence: isEmi ? emiSequence : undefined,
      });

      setReceiptData(result);
      addToast({
        type: 'success',
        title: 'Payment recorded',
        message: `Receipt ${result.receipt_number}`,
      });
      onSuccess?.(result);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to record payment',
        message: err.message || 'An error occurred',
      });
    }
  };

  // ─── Shared input style ─────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SUCCESS STATE
  // ═══════════════════════════════════════════════════════════════
  if (receiptData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: colors.utility.border,
          }}
        >
          <div className="text-center py-4">
            {/* Success icon */}
            <div className="mb-4 flex justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.semantic.success}15` }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: colors.semantic.success }} />
              </div>
            </div>

            <h3 className="text-base font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
              Payment Recorded
            </h3>

            {/* Receipt details card */}
            <div
              className="rounded-lg p-3 mt-3 text-left space-y-2"
              style={{
                backgroundColor: `${colors.semantic.success}08`,
                border: `1px solid ${colors.semantic.success}20`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Receipt</span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: colors.semantic.success }}
                >
                  {receiptData.receipt_number}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Amount</span>
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>
                  {fmt(receiptData.amount)}
                  {receiptData.emi_sequence && emiTotal
                    ? ` (${receiptData.emi_sequence} of ${emiTotal})`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Invoice Balance</span>
                <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                  {fmt(receiptData.balance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Status</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: receiptData.invoice_status === 'paid'
                      ? `${colors.semantic.success}15`
                      : `${colors.semantic.warning}15`,
                    color: receiptData.invoice_status === 'paid'
                      ? colors.semantic.success
                      : colors.semantic.warning,
                  }}
                >
                  {receiptData.invoice_status === 'paid' ? 'Fully Paid' : 'Partially Paid'}
                </span>
              </div>
            </div>

            {/* Done button */}
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: colors.brand.primary }}
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PAYMENT FORM
  // ═══════════════════════════════════════════════════════════════
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md rounded-xl"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: colors.utility.border,
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.utility.primaryText, fontSize: '0.875rem' }}>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" style={{ color: colors.brand.primary }} />
              Record Payment
            </div>
          </DialogTitle>
          <DialogDescription style={{ color: colors.utility.secondaryText, fontSize: '0.6875rem' }}>
            Invoice {invoiceNumber} &middot; Balance: {fmt(balance)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* EMI Installment Selector */}
          {isEmi && (
            <div>
              <label style={labelStyle}>Installment</label>
              <select
                value={emiSequence}
                onChange={(e) => setEmiSequence(parseInt(e.target.value, 10))}
                style={inputStyle}
              >
                {Array.from({ length: emiTotal! }, (_, i) => {
                  const seq = i + 1;
                  const isPaid = seq <= receiptsCount;
                  return (
                    <option key={seq} value={seq} disabled={isPaid}>
                      Installment {seq} of {emiTotal}
                      {isPaid ? ' (Paid)' : seq === receiptsCount + 1 ? ' (Next)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label style={labelStyle}>
              Amount ({currency})
              {isEmi && (
                <span style={{ color: colors.utility.secondaryText, fontWeight: 400 }}>
                  {' '}&middot; Per installment: {fmt(emiInstallmentAmount)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              max={balance}
              step="0.01"
              style={inputStyle}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              style={inputStyle}
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label style={labelStyle}>Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Reference Number */}
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

          {/* Notes */}
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

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            disabled={isPending}
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
            disabled={isPending || !amount}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{
              backgroundColor: colors.semantic.success,
              opacity: isPending || !amount ? 0.6 : 1,
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Payment'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
