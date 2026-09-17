// src/components/ops/PaySheet.tsx
// The buyer pays or declares a payment from INSIDE the app (expense side,
// batch ops-expense-board). Nothing new is built for money: the review link's
// PublicPaymentSection already runs Razorpay + offline-UPI declaration for a
// CNAK, and the claimed grant's secret is available in-app through
// /api/contracts/my-access/:cnak — so this sheet resolves cnak (+ secret) and
// hands over. Used by the Ops board, the contract page (buyer view) and To Pay.
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { useAuth } from '@/context/AuthContext';
import { useInvoiceTheme } from '@/pages/invoices/ui';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PublicPaymentSection from '@/components/contracts/review/PublicPaymentSection';

export interface PaySheetProps {
  /** The contract's CNAK; when absent it is looked up from the contract. */
  cnak?: string | null;
  contractId?: string | null;
  sellerName: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  onClose: () => void;
  /** After a verified online payment (the section calls it) — refresh whatever listed the bill. */
  onDone: () => void;
}

const PaySheet: React.FC<PaySheetProps> = ({ cnak, contractId, sellerName, buyerName, buyerEmail, buyerPhone, onClose, onDone }) => {
  const { colors, ink, sub } = useInvoiceTheme();
  const { currentTenant, user } = useAuth() as any;
  const brand = colors.brand.primary;
  const hairline = `${colors.utility.primaryText}22`;
  const [secret, setSecret] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(cnak || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let k = cnak || null;
        if (!k && contractId) {
          const r = await api.get(API_ENDPOINTS.CONTRACTS.GET(contractId));
          const d = r.data?.data ?? r.data;
          k = d?.global_access_id || null;
        }
        if (!k) throw new Error('This bill has no access code to pay against yet.');
        const a = await api.get(API_ENDPOINTS.CONTRACTS.MY_ACCESS(k));
        const s = (a.data?.data ?? a.data)?.secret_code;
        if (!s) throw new Error('This contract is not claimed by your workspace yet — claim it first.');
        if (alive) { setKey(k); setSecret(s); }
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error?.message || e?.response?.data?.error || e?.message || 'Could not open the payment');
      }
    })();
    return () => { alive = false; };
  }, [cnak, contractId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Pay ${sellerName}`}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border px-5 py-5"
        style={{ backgroundColor: colors.utility.primaryBackground, borderColor: hairline, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ ...sub, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>pay · {sellerName}</p>
            <h2 className="text-lg font-extrabold" style={ink}>Pay or declare a payment</h2>
            <p className="text-xs mt-0.5" style={sub}>Online through {sellerName}'s gateway when they have one, or declare an offline payment with its reference — {sellerName} confirms it.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full" style={{ color: colors.utility.secondaryText }}><X size={18} /></button>
        </div>
        {error ? (
          <p className="text-sm rounded-xl px-3 py-2" style={{ color: colors.semantic.error, backgroundColor: `${colors.semantic.error}12` }}>{error}</p>
        ) : !secret || !key ? (
          <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : (
          <PublicPaymentSection
            cnak={key}
            secret={secret}
            tenantName={sellerName}
            buyerName={buyerName || currentTenant?.name || null}
            buyerEmail={buyerEmail || user?.email || null}
            buyerPhone={buyerPhone || null}
            brandPrimary={brand}
            paperBg={colors.utility.secondaryBackground}
            borderColor={hairline}
            inkText={String(ink.color)}
            inkSub={String(sub.color)}
            paperShadow="none"
            onPaid={() => { toast.success(`Payment to ${sellerName} verified`); onDone(); }}
          />
        )}
      </div>
    </div>
  );
};

export default PaySheet;
