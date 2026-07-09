// src/components/contracts/RecordPaymentDialog.tsx
// Reusable dialog for recording a payment receipt against an invoice.
// Supports both offline (manual) and online (gateway) payment modes.
// Self-contained: fetches invoice data internally when opened.
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
import { useContractInvoices, useRecordPayment } from '@/hooks/queries/useInvoiceQueries';
import { useContractEventsForContract } from '@/hooks/queries/useContractEventQueries';
import { useCreateOrder, useCreateLink } from '@/hooks/queries/usePaymentGatewayQueries';
import type { CreateOrderResponse, CreateLinkResponse } from '@/hooks/queries/usePaymentGatewayQueries';
import { useVaNiToast } from '@/components/common/toast/VaNiToast';
import type { PaymentMethod, RecordPaymentResponse } from '@/types/contracts';
import { Loader2, Receipt, CheckCircle2, AlertCircle, Globe, Wallet, Send, Monitor, Mail, MessageSquare, Link2, Copy, Check, ListChecks } from 'lucide-react';

// =================================================================
// TYPES
// =================================================================

type PaymentChannel = 'offline' | 'online';
type CollectionMode = 'terminal' | 'email_link' | 'whatsapp_link';

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receiptData: RecordPaymentResponse) => void;
  /** Called when an online order is created — parent handles Razorpay Checkout popup (T7) */
  onOrderCreated?: (orderData: CreateOrderResponse) => void;
  contractId: string;
  /** Whether tenant has an active payment gateway (controls online option visibility) */
  hasActiveGateway?: boolean;
  /** Fallback values used while invoice is loading */
  grandTotal?: number;
  currency?: string;
  paymentMode?: string;
  emiMonths?: number;
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

const COLLECTION_MODE_OPTIONS: { value: CollectionMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'terminal', label: 'Pay Now', icon: <Monitor className="w-3.5 h-3.5" />, description: 'Checkout on this device' },
  { value: 'email_link', label: 'Email Link', icon: <Mail className="w-3.5 h-3.5" />, description: 'Send payment link via email' },
  { value: 'whatsapp_link', label: 'WhatsApp Link', icon: <MessageSquare className="w-3.5 h-3.5" />, description: 'Send payment link via WhatsApp' },
];

// =================================================================
// COMPONENT
// =================================================================

const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOrderCreated,
  contractId,
  hasActiveGateway = false,
  grandTotal,
  currency: currencyProp,
  paymentMode: paymentModeProp,
  emiMonths,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const { addToast } = useVaNiToast();

  // ─── Fetch invoice data when dialog opens ────────────────────
  const { data: invoiceData, isLoading: isLoadingInvoice, isError: isInvoiceError } = useContractInvoices(
    contractId,
    { enabled: isOpen && !!contractId }
  );
  const invoice = invoiceData?.invoices?.[0];

  // ─── Resolve values: prefer invoice data, fall back to props ─
  const invoiceId = invoice?.id || '';
  const invoiceNumber = invoice?.invoice_number || '';
  const totalAmount = invoice?.total_amount ?? grandTotal ?? 0;
  const balance = invoice?.balance ?? totalAmount;
  const currency = invoice?.currency || currencyProp || 'INR';
  const paymentMode = invoice?.payment_mode || paymentModeProp;
  const emiTotal = invoice?.emi_total ?? (paymentMode === 'emi' ? emiMonths : null);
  const receiptsCount = invoice?.receipts_count ?? 0;

  // ─── Billing events for this contract (event-level settlement) ─
  const { data: eventsData } = useContractEventsForContract(contractId, {
    enabled: isOpen && !!contractId,
    per_page: 100,
  });
  const billingEvents = React.useMemo(() => {
    const items = eventsData?.items || [];
    return items
      .filter((e) => e.event_type === 'billing')
      // Only events linked to THIS invoice (single-invoice model); if the
      // event has no invoice_id yet, still show it (falls under this contract).
      .filter((e) => !invoiceId || !e.invoice_id || e.invoice_id === invoiceId);
  }, [eventsData, invoiceId]);

  // Open (unsettled) amount for an event
  const eventOpenAmount = (e: { amount?: number | null; amount_settled?: number | null }) =>
    Math.max(0, Math.round(((e.amount || 0) - (e.amount_settled || 0)) * 100) / 100);

  // ─── Mutations ─────────────────────────────────────────────
  const { mutateAsync: recordPayment, isPending: isRecordingPayment } = useRecordPayment(contractId);
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder(contractId);
  const { mutateAsync: createLink, isPending: isCreatingLink } = useCreateLink(contractId);

  const isPending = isRecordingPayment || isCreatingOrder || isCreatingLink;

  // ─── Form state ──────────────────────────────────────────────
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('offline');
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('terminal');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [emiSequence, setEmiSequence] = useState(1);
  // Event-level settlement: which billing events this receipt covers
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // ─── Online-specific state ─────────────────────────────────
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // ─── Success state ─────────────────────────────────────────
  const [receiptData, setReceiptData] = useState<RecordPaymentResponse | null>(null);
  const [linkData, setLinkData] = useState<CreateLinkResponse | null>(null);

  // ─── Derived ───────────────────────────────────────────────
  const isEmi = paymentMode === 'emi' && emiTotal != null && emiTotal > 0;
  const emiInstallmentAmount = isEmi
    ? Math.round((totalAmount / emiTotal!) * 100) / 100
    : 0;
  const isOnline = paymentChannel === 'online';
  const isLinkMode = isOnline && (collectionMode === 'email_link' || collectionMode === 'whatsapp_link');

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setReceiptData(null);
      setLinkData(null);
      setPaymentChannel(hasActiveGateway ? 'online' : 'offline');
      setCollectionMode('terminal');
      setAmount('');
      setPaymentMethod('bank_transfer');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber('');
      setNotes('');
      setEmiSequence(receiptsCount + 1);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSelectedEventIds(new Set());
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle a billing event in the settlement selection and sync the amount to
  // the sum of the selected events' open balances.
  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      const sum = billingEvents
        .filter((e) => next.has(e.id))
        .reduce((acc, e) => acc + eventOpenAmount(e), 0);
      setAmount(next.size > 0 ? (Math.round(sum * 100) / 100).toString() : '');
      return next;
    });
  };

  // Open (still-payable) billing events — used for the "select all" control.
  const openEvents = React.useMemo(
    () => billingEvents.filter((e) => eventOpenAmount(e) > 0.001),
    [billingEvents]
  );
  const allOpenSelected = openEvents.length > 0 && openEvents.every((e) => selectedEventIds.has(e.id));
  const selectedOpenSum = billingEvents
    .filter((e) => selectedEventIds.has(e.id))
    .reduce((acc, e) => acc + eventOpenAmount(e), 0);

  // Select / clear all open dues in one tap.
  const toggleSelectAll = () => {
    if (allOpenSelected) {
      setSelectedEventIds(new Set());
      setAmount('');
      return;
    }
    const next = new Set(openEvents.map((e) => e.id));
    const sum = openEvents.reduce((acc, e) => acc + eventOpenAmount(e), 0);
    setSelectedEventIds(next);
    setAmount((Math.round(sum * 100) / 100).toString());
  };

  // Pre-fill amount for EMI once invoice loads
  useEffect(() => {
    if (invoice && isEmi && !amount) {
      setAmount(emiInstallmentAmount.toString());
      setEmiSequence(receiptsCount + 1);
    }
  }, [invoice, isEmi]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Format currency ──────────────────────────────────────
  const fmt = (val: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(val);
    } catch {
      return `${currency} ${val.toLocaleString()}`;
    }
  };

  // ─── Submit: Offline Payment ──────────────────────────────
  const handleSubmitOffline = async () => {
    if (!invoiceId) {
      addToast({ type: 'error', title: 'Invoice not loaded', message: 'Please wait for invoice data to load.' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', message: 'Enter a positive payment amount.' });
      return;
    }
    if (numAmount > balance) {
      addToast({ type: 'error', title: 'Amount exceeds balance', message: `Maximum payable is ${fmt(balance)}.` });
      return;
    }

    // Event-level settlement: if the chair selected specific dues, allocate the
    // receipt to those events (amount = sum of their open balances).
    const event_allocations = selectedEventIds.size > 0
      ? billingEvents
          .filter((e) => selectedEventIds.has(e.id))
          .map((e) => ({ event_id: e.id, amount: eventOpenAmount(e) }))
      : undefined;
    const effectiveAmount = event_allocations
      ? Math.round(event_allocations.reduce((a, x) => a + x.amount, 0) * 100) / 100
      : numAmount;

    try {
      const result = await recordPayment({
        invoice_id: invoiceId,
        amount: effectiveAmount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        emi_sequence: isEmi ? emiSequence : undefined,
        event_allocations,
      });

      setReceiptData(result);
      addToast({ type: 'success', title: 'Payment recorded', message: `Receipt ${result.receipt_number}` });
      onSuccess?.(result);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to record payment', message: err.message || 'An error occurred' });
    }
  };

  // ─── Submit: Online - Terminal (Create Order) ─────────────
  const handleSubmitTerminal = async () => {
    if (!invoiceId) {
      addToast({ type: 'error', title: 'Invoice not loaded', message: 'Please wait for invoice data to load.' });
      return;
    }

    const numAmount = parseFloat(amount) || balance;
    if (numAmount <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', message: 'Enter a positive payment amount.' });
      return;
    }
    if (numAmount > balance) {
      addToast({ type: 'error', title: 'Amount exceeds balance', message: `Maximum payable is ${fmt(balance)}.` });
      return;
    }

    try {
      const orderData = await createOrder({
        invoice_id: invoiceId,
        amount: numAmount,
        currency,
      });

      addToast({ type: 'success', title: 'Order created', message: `Attempt #${orderData.attempt_number} — opening checkout...` });
      onOrderCreated?.(orderData);
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create order', message: err.message || 'An error occurred' });
    }
  };

  // ─── Submit: Online - Link (Email/WhatsApp) ───────────────
  const handleSubmitLink = async () => {
    if (!invoiceId) {
      addToast({ type: 'error', title: 'Invoice not loaded', message: 'Please wait for invoice data to load.' });
      return;
    }

    const numAmount = parseFloat(amount) || balance;
    if (numAmount <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', message: 'Enter a positive payment amount.' });
      return;
    }
    if (numAmount > balance) {
      addToast({ type: 'error', title: 'Amount exceeds balance', message: `Maximum payable is ${fmt(balance)}.` });
      return;
    }

    // Validate customer info for the selected mode
    if (collectionMode === 'email_link' && !customerEmail) {
      addToast({ type: 'error', title: 'Email required', message: 'Enter the buyer\'s email address.' });
      return;
    }
    if (collectionMode === 'whatsapp_link' && !customerPhone) {
      addToast({ type: 'error', title: 'Phone required', message: 'Enter the buyer\'s phone number.' });
      return;
    }

    try {
      const result = await createLink({
        invoice_id: invoiceId,
        amount: numAmount,
        currency,
        collection_mode: collectionMode as 'email_link' | 'whatsapp_link',
        customer: {
          name: customerName || undefined,
          email: customerEmail || undefined,
          contact: customerPhone || undefined,
        },
      });

      setLinkData(result);
      addToast({
        type: 'success',
        title: 'Payment link created',
        message: `Attempt #${result.attempt_number}`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create link', message: err.message || 'An error occurred' });
    }
  };

  // ─── Master submit handler ────────────────────────────────
  const handleSubmit = async () => {
    if (!isOnline) {
      return handleSubmitOffline();
    }
    if (collectionMode === 'terminal') {
      return handleSubmitTerminal();
    }
    return handleSubmitLink();
  };

  // ─── Copy link to clipboard ───────────────────────────────
  const handleCopyLink = () => {
    if (linkData?.gateway_short_url) {
      navigator.clipboard.writeText(linkData.gateway_short_url);
      addToast({ type: 'info', title: 'Copied', message: 'Payment link copied to clipboard' });
    }
  };

  // ─── Shared input style ───────────────────────────────────
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
  // RENDER: LINK SUCCESS STATE
  // ═══════════════════════════════════════════════════════════════
  if (linkData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
        >
          <div className="text-center py-4">
            <div className="mb-4 flex justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.semantic.success}15` }}
              >
                <Link2 className="w-7 h-7" style={{ color: colors.semantic.success }} />
              </div>
            </div>

            <h3 className="text-base font-semibold mb-1" style={{ color: colors.utility.primaryText }}>
              Payment Link Created
            </h3>
            <p className="text-[10px] mb-3" style={{ color: colors.utility.secondaryText }}>
              {linkData.collection_mode === 'email_link' ? 'Send this link to the buyer via email' : 'Send this link to the buyer via WhatsApp'}
            </p>

            <div
              className="rounded-lg p-3 text-left space-y-2"
              style={{ backgroundColor: `${colors.semantic.info}08`, border: `1px solid ${colors.semantic.info}20` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Amount</span>
                <span className="text-xs font-semibold" style={{ color: colors.utility.primaryText }}>{fmt(linkData.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Attempt</span>
                <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>#{linkData.attempt_number}</span>
              </div>
              {linkData.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Expires</span>
                  <span className="text-xs font-medium" style={{ color: colors.utility.primaryText }}>
                    {new Date(linkData.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="mt-2">
                <span className="text-[10px] block mb-1" style={{ color: colors.utility.secondaryText }}>Payment URL</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={linkData.gateway_short_url}
                    className="flex-1 text-[10px] font-mono truncate"
                    style={{ ...inputStyle, fontSize: '0.625rem', padding: '0.375rem 0.5rem' }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-md transition-all hover:opacity-80"
                    style={{ backgroundColor: colors.brand.primary }}
                    title="Copy link"
                  >
                    <Copy className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            </div>

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
  // RENDER: RECEIPT SUCCESS STATE
  // ═══════════════════════════════════════════════════════════════
  if (receiptData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
        >
          <div className="text-center py-4">
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

            <div
              className="rounded-lg p-3 mt-3 text-left space-y-2"
              style={{ backgroundColor: `${colors.semantic.success}08`, border: `1px solid ${colors.semantic.success}20` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: colors.utility.secondaryText }}>Receipt</span>
                <span className="text-xs font-mono font-bold" style={{ color: colors.semantic.success }}>
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
  // RENDER: LOADING INVOICE STATE
  // ═══════════════════════════════════════════════════════════════
  if (isLoadingInvoice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>Loading invoice details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ERROR STATE
  // ═══════════════════════════════════════════════════════════════
  if (isInvoiceError || (!isLoadingInvoice && !invoice)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md rounded-xl"
          style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertCircle className="w-6 h-6" style={{ color: colors.semantic.error }} />
            <p className="text-xs text-center" style={{ color: colors.utility.secondaryText }}>
              Could not load invoice data. The invoice may still be generating.
              <br />Please try recording the payment from the contract details page.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.border}`,
              }}
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PAYMENT FORM
  // ═══════════════════════════════════════════════════════════════

  // Landscape layout kicks in when there are billing dues to pick from
  // (offline settlement). Online / no-events falls back to the compact column.
  const hasEventPanel = !isOnline && billingEvents.length > 0;

  // ─── Left panel: outstanding dues checklist ───────────────
  const eventPanel = (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1.5">
        <label style={{ ...labelStyle, marginBottom: 0 }} className="flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" style={{ color: colors.brand.primary }} />
          Outstanding dues
        </label>
        {openEvents.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all hover:opacity-80"
            style={{ color: colors.brand.primary, backgroundColor: `${colors.brand.primary}12` }}
          >
            {allOpenSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>
      <div
        className="rounded-lg border overflow-y-auto flex-1"
        style={{ borderColor: colors.utility.border, minHeight: '12rem', maxHeight: '22rem' }}
      >
        {billingEvents.map((e) => {
          const open = eventOpenAmount(e);
          const settled = open <= 0.001 && (e.amount || 0) > 0;
          const checked = selectedEventIds.has(e.id);
          return (
            <button
              key={e.id}
              type="button"
              disabled={settled}
              onClick={() => toggleEvent(e.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b last:border-b-0 transition-colors"
              style={{
                borderColor: colors.utility.border,
                backgroundColor: checked ? `${colors.brand.primary}12` : 'transparent',
                opacity: settled ? 0.6 : 1,
                cursor: settled ? 'default' : 'pointer',
              }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  border: `2px solid ${
                    checked ? colors.brand.primary : settled ? colors.semantic.success : `${colors.utility.secondaryText}55`
                  }`,
                  backgroundColor: checked ? colors.brand.primary : settled ? colors.semantic.success : 'transparent',
                }}
              >
                {(checked || settled) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate" style={{ color: colors.utility.primaryText }}>
                  {e.billing_cycle_label || `Event ${e.sequence_number}`}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: colors.utility.secondaryText }}>
                  {new Date(e.scheduled_date).toLocaleDateString()}
                  {settled && ' · Settled'}
                </div>
              </div>
              <span
                className="text-xs font-bold flex-shrink-0"
                style={{ color: settled ? colors.semantic.success : colors.utility.primaryText }}
              >
                {fmt(e.amount || 0)}
              </span>
            </button>
          );
        })}
      </div>
      <div
        className="flex items-center justify-between mt-2 px-2.5 py-1.5 rounded-lg"
        style={{ backgroundColor: colors.utility.secondaryBackground }}
      >
        <span className="text-[10px] font-medium" style={{ color: colors.utility.secondaryText }}>
          {selectedEventIds.size} due{selectedEventIds.size === 1 ? '' : 's'} selected
        </span>
        <span className="text-sm font-bold" style={{ color: colors.brand.primary }}>
          {fmt(selectedOpenSum)}
        </span>
      </div>
      <p className="text-[9px] mt-1.5" style={{ color: colors.utility.secondaryText }}>
        Tick the dues this receipt covers — the amount fills in automatically. Leave all unticked to record a plain payment against the invoice.
      </p>
    </div>
  );

  // ─── Channel toggle (full width, above the columns) ───────
  const channelToggle = hasActiveGateway ? (
    <div>
      <label style={labelStyle}>Payment Channel</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setPaymentChannel('offline')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all"
          style={{
            backgroundColor: !isOnline ? `${colors.brand.primary}15` : colors.utility.secondaryBackground,
            border: `1.5px solid ${!isOnline ? colors.brand.primary : colors.utility.border}`,
            color: !isOnline ? colors.brand.primary : colors.utility.secondaryText,
          }}
        >
          <Wallet className="w-3.5 h-3.5" />
          Offline
        </button>
        <button
          type="button"
          onClick={() => setPaymentChannel('online')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all"
          style={{
            backgroundColor: isOnline ? `${colors.brand.primary}15` : colors.utility.secondaryBackground,
            border: `1.5px solid ${isOnline ? colors.brand.primary : colors.utility.border}`,
            color: isOnline ? colors.brand.primary : colors.utility.secondaryText,
          }}
        >
          <Globe className="w-3.5 h-3.5" />
          Online
        </button>
      </div>
    </div>
  ) : null;

  // ─── Right panel: payment fields ──────────────────────────
  const paymentFields = (
    <div className="space-y-3">
      {/* Collection Mode (online only) */}
      {isOnline && (
        <div>
          <label style={labelStyle}>Collection Mode</label>
          <div className="grid grid-cols-3 gap-1.5">
            {COLLECTION_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCollectionMode(opt.value)}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all"
                style={{
                  backgroundColor: collectionMode === opt.value ? `${colors.brand.primary}15` : colors.utility.secondaryBackground,
                  border: `1.5px solid ${collectionMode === opt.value ? colors.brand.primary : colors.utility.border}`,
                  color: collectionMode === opt.value ? colors.brand.primary : colors.utility.secondaryText,
                }}
              >
                {opt.icon}
                <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* EMI Installment Selector */}
      {isEmi && !isOnline && (
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
          {isEmi && !isOnline && (
            <span style={{ color: colors.utility.secondaryText, fontWeight: 400 }}>
              {' '}&middot; Per installment: {fmt(emiInstallmentAmount)}
            </span>
          )}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={balance.toString()}
          min="0"
          max={balance}
          step="0.01"
          style={inputStyle}
        />
      </div>

      {/* Offline Fields */}
      {!isOnline && (
        <>
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

          <div>
            <label style={labelStyle}>Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={inputStyle}
            />
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
        </>
      )}

      {/* Online Link Fields (customer info) */}
      {isLinkMode && (
        <>
          <div>
            <label style={labelStyle}>Buyer Name (optional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Buyer's name"
              style={inputStyle}
            />
          </div>

          {collectionMode === 'email_link' && (
            <div>
              <label style={labelStyle}>Buyer Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="buyer@example.com"
                style={inputStyle}
              />
            </div>
          )}

          {collectionMode === 'whatsapp_link' && (
            <div>
              <label style={labelStyle}>Buyer Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={inputStyle}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  // ─── Actions row ──────────────────────────────────────────
  const actions = (
    <div className="flex justify-end gap-2 mt-4">
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
        disabled={isPending || (!amount && !isOnline)}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
        style={{
          backgroundColor: isOnline ? colors.brand.primary : colors.semantic.success,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isCreatingOrder ? 'Creating Order...' : isCreatingLink ? 'Creating Link...' : 'Recording...'}
          </>
        ) : isOnline ? (
          <>
            {collectionMode === 'terminal' ? (
              <><Monitor className="w-3.5 h-3.5" /> Pay Now</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Create Link</>
            )}
          </>
        ) : (
          'Record Payment'
        )}
      </button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${hasEventPanel ? 'sm:max-w-3xl' : 'sm:max-w-md'} rounded-xl`}
        style={{ backgroundColor: colors.utility.primaryBackground, borderColor: colors.utility.border }}
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

        <div className="mt-1 space-y-3">
          {channelToggle}

          {hasEventPanel ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {eventPanel}
              {paymentFields}
            </div>
          ) : (
            paymentFields
          )}
        </div>

        {actions}
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
