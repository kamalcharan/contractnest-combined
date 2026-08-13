// src/components/operations/finance/PaymentDeclarationsCard.tsx
// "Payments declared, awaiting your confirmation" — the tenant-side half of
// the public offline-UPI payment flow. A buyer on /contract-review paid the
// tenant's VPA/QR directly and declared a reference; nothing is recorded in
// the books until the tenant verifies the money actually arrived (bank/UPI
// app) and confirms here. Confirm records the payment and auto-activates a
// payment-gated contract once fully paid; Reject discards the claim.
//
// Renders nothing when there are no pending declarations — same convention
// as the Drafts panel beside it on /operations/finance.

import React, { useState } from 'react';
import { Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { vaniToast } from '@/components/common/toast';
import {
  usePaymentDeclarations,
  useConfirmPaymentDeclaration,
  type PaymentDeclaration,
} from '@/hooks/queries/usePaymentDeclarations';

const formatMoney = (value: number | null | undefined, currency: string = 'INR'): string => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PaymentDeclarationsCard: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const { data: declarations = [] } = usePaymentDeclarations('pending');
  const confirmMutation = useConfirmPaymentDeclaration();
  const [actioningId, setActioningId] = useState<string | null>(null);

  if (declarations.length === 0) return null;

  const handleAction = async (decl: PaymentDeclaration, confirm: boolean) => {
    if (actioningId) return;
    setActioningId(decl.id);
    try {
      await confirmMutation.mutateAsync({ id: decl.id, confirm });
      vaniToast.success(
        confirm
          ? `Payment of ${formatMoney(decl.amount, decl.currency)} recorded against ${decl.contract_number}`
          : 'Declaration rejected — nothing was recorded'
      );
    } catch (err: any) {
      vaniToast.error(err.message || 'Could not update the declaration');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Card style={{ borderColor: colors.brand.primary + '60' }}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
          <Smartphone className="h-4 w-4" style={{ color: colors.brand.primary }} />
          UPI payments declared, awaiting your confirmation
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: colors.brand.primary + '25', color: colors.brand.primary }}
          >
            {declarations.length}
          </span>
        </CardTitle>
        <p className="text-xs mt-1" style={{ color: colors.utility.secondaryText }}>
          A customer paid your UPI ID directly and entered this reference on the contract page.
          Check the money arrived in your bank/UPI app before confirming — confirming records
          the payment and activates the contract.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {declarations.map((decl) => (
          <div
            key={decl.id}
            className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
            style={{ borderColor: colors.utility.secondaryText + '20' }}
          >
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm font-semibold" style={{ color: colors.utility.primaryText }}>
                {formatMoney(decl.amount, decl.currency)} · {decl.contract_number}
                {decl.invoice_number ? ` · ${decl.invoice_number}` : ''}
              </p>
              <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                {decl.declarer_name || 'Customer'}
                {decl.declarer_contact ? ` (${decl.declarer_contact})` : ''} · declared {formatDate(decl.created_at)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: colors.utility.primaryText }}>
                UPI ref: <span className="font-mono font-semibold">{decl.reference}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction(decl, true)}
                disabled={actioningId === decl.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: colors.brand.primary, color: '#fff', opacity: actioningId === decl.id ? 0.6 : 1 }}
              >
                {actioningId === decl.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                Money received — confirm
              </button>
              <button
                onClick={() => handleAction(decl, false)}
                disabled={actioningId === decl.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ borderColor: colors.semantic.error + '50', color: colors.semantic.error }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PaymentDeclarationsCard;
