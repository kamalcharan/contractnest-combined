// src/pages/contracts/review/index.tsx
// Public Contract Review Page — paper-style sign-off workflow
// Accessible via: /contract-review?cnak=CNAK-XXXXXX&secret=abc123
// Matches the paper view from ReviewSendStep (wizard step 9)
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Building2,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Package,
  CreditCard,
  CheckSquare,
  Paperclip,
  Video,
  Image as ImageIcon,
  LogIn,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';
import { getCurrencySymbol } from '@/utils/constants/currencies';
import { getCategoryById, categoryHasPricing } from '@/utils/catalog-studio/categories';

// ═══════════════════════════════════════════════════
// TYPES (full contract from get_contract_by_id)
// ═══════════════════════════════════════════════════

interface ContractAccessData {
  id: string;
  status: string;
  accessor_role: string;
  accessor_name: string;
  accessor_email: string;
}

interface ContractBlock {
  id: string;
  position: number;
  source_type: string;
  source_block_id: string | null;
  block_name: string;
  block_description: string;
  category_id: string;
  category_name: string;
  unit_price: number;
  quantity: number;
  billing_cycle: string;
  total_price: number;
  flyby_type: string | null;
  custom_fields: any;
  created_at: string;
}

interface TaxBreakdownItem {
  tax_rate_id: string;
  name: string;
  rate: number;
  amount: number;
}

interface FullContractData {
  id: string;
  tenant_id: string;
  contract_number: string;
  rfq_number: string | null;
  record_type: string;
  contract_type: string;
  name: string;
  description: string;
  status: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_company: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_contact_person_name: string | null;
  global_access_id: string;
  acceptance_method: string;
  duration_value: number;
  duration_unit: string;
  grace_period_value: number | null;
  grace_period_unit: string | null;
  currency: string;
  billing_cycle_type: string;
  payment_mode: string;
  emi_months: number | null;
  per_block_payment_type: Record<string, string> | null;
  total_value: number;
  tax_total: number;
  grand_total: number;
  selected_tax_rate_ids: string[] | null;
  tax_breakdown: TaxBreakdownItem[];
  blocks: ContractBlock[];
  vendors: any[];
  attachments: any[];
  history: any[];
  blocks_count: number;
  created_at: string;
  updated_at: string;
}

interface TenantProfile {
  business_name: string | null;
  business_email: string | null;
  business_phone_country_code: string | null;
  business_phone: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  website_url: string | null;
}

interface TenantData {
  id: string;
  name: string;
  profile: TenantProfile | null;
}

interface ValidateResponse {
  valid: boolean;
  error?: string;
  status?: string;
  access?: ContractAccessData;
  contract?: FullContractData;
  tenant?: TenantData;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const formatCurrency = (amount: number, currency: string = 'INR') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDuration = (value: number, unit: string): string => {
  if (!value) return '—';
  if (unit === 'months') return `${value} month${value !== 1 ? 's' : ''}`;
  if (unit === 'years') return `${value} year${value !== 1 ? 's' : ''}`;
  return `${value} day${value !== 1 ? 's' : ''}`;
};

const getDurationInMonths = (value: number, unit: string): number => {
  if (unit === 'months') return value;
  if (unit === 'years') return value * 12;
  return Math.ceil(value / 30);
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

const getPaymentPlanLabel = (paymentMode: string, billingCycleType: string, emiMonths: number | null): string => {
  if (billingCycleType === 'mixed') return 'Mixed Billing';
  if (paymentMode === 'emi') return `EMI \u00B7 ${emiMonths || 0} months`;
  if (paymentMode === 'defined') return 'As Defined';
  return '100% Upfront';
};

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  service: Briefcase,
  spare: Package,
  billing: CreditCard,
  text: FileText,
  video: Video,
  image: ImageIcon,
  checklist: CheckSquare,
  document: Paperclip,
};

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

const ContractReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const cnak = searchParams.get('cnak');
  const secret = searchParams.get('secret');

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractData, setContractData] = useState<ValidateResponse | null>(null);
  const [responseState, setResponseState] = useState<'idle' | 'accepted' | 'rejected'>('idle');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [cnakCopied, setCnakCopied] = useState(false);

  const paperRef = useRef<HTMLDivElement>(null);

  // ── Validate on mount ──
  useEffect(() => {
    if (!cnak || !secret) {
      setError('Invalid contract review link. Missing access code.');
      setLoading(false);
      return;
    }
    validateAccess();
  }, [cnak, secret]);

  const validateAccess = async () => {
    try {
      setLoading(true);
      const response = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_VALIDATE, {
        cnak,
        secret_code: secret,
      });

      const data = response.data;
      if (!data.valid) {
        setError(data.error || 'Invalid access link');
        return;
      }

      setContractData(data);
    } catch (err: any) {
      console.error('Error validating contract access:', err);
      setError(err.response?.data?.error || 'Failed to validate contract access');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle accept / reject ──
  const handleRespond = async (action: 'accept' | 'reject') => {
    if (!cnak || !secret) return;

    try {
      setSubmitting(true);
      const response = await api.post(API_ENDPOINTS.CONTRACTS.PUBLIC_RESPOND, {
        cnak,
        secret_code: secret,
        action,
        responder_name: contractData?.access?.accessor_name || null,
        responder_email: contractData?.access?.accessor_email || null,
        rejection_reason: action === 'reject' ? rejectionReason : null,
      });

      const data = response.data;
      if (data.success) {
        setResponseState(action === 'accept' ? 'accepted' : 'rejected');
        setShowRejectDialog(false);
      } else {
        setError(data.error || `Failed to ${action} contract`);
      }
    } catch (err: any) {
      console.error(`Error ${action}ing contract:`, err);
      setError(err.response?.data?.error || `Failed to ${action} contract`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── PDF download ──
  const handleDownloadPdf = useCallback(async () => {
    if (!paperRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(paperRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const contractName = contractData?.contract?.name || 'Contract';
      pdf.save(`${contractName}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGeneratingPdf(false);
    }
  }, [contractData]);

  // ── Copy CNAK ──
  const handleCopyCnak = useCallback(async () => {
    const cnakCode = contractData?.contract?.global_access_id || cnak || '';
    try {
      await navigator.clipboard.writeText(cnakCode);
      setCnakCopied(true);
      setTimeout(() => setCnakCopied(false), 2000);
    } catch { /* ignore */ }
  }, [contractData, cnak]);

  // ── Derived data ──
  const contract = contractData?.contract;
  const access = contractData?.access;
  const tenant = contractData?.tenant;
  const profile = tenant?.profile;

  const brandPrimary = profile?.primary_color || '#F59E0B';
  const brandSecondary = profile?.secondary_color || '#10B981';

  const canvasBg = isDarkMode ? '#1a1a2e' : '#F1F5F9';
  const paperBg = isDarkMode ? '#1e1e30' : '#FFFFFF';
  const paperShadow = isDarkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0';

  // Group blocks by category
  const blockGroups = useMemo(() => {
    if (!contract?.blocks?.length) return [];
    const groups: Record<string, ContractBlock[]> = {};
    contract.blocks.forEach((block) => {
      const catId = block.category_id || 'service';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(block);
    });
    const order = ['service', 'spare', 'billing', 'text', 'checklist', 'document', 'video', 'image'];
    return Object.entries(groups).sort(
      ([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
    );
  }, [contract?.blocks]);

  // Financial totals
  const totals = useMemo(() => {
    if (!contract) return { subtotal: 0, taxTotal: 0, grandTotal: 0, billableCount: 0 };
    const blocks = contract.blocks || [];
    const billable = blocks.filter((b) => categoryHasPricing(b.category_id || ''));
    return {
      subtotal: contract.total_value || 0,
      taxTotal: contract.tax_total || 0,
      grandTotal: contract.grand_total || contract.total_value || 0,
      billableCount: billable.length,
    };
  }, [contract]);

  // Duration timeline
  const startDate = useMemo(() => {
    if (!contract?.created_at) return new Date();
    return new Date(contract.created_at);
  }, [contract?.created_at]);

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    const months = getDurationInMonths(contract?.duration_value || 0, contract?.duration_unit || 'months');
    d.setMonth(d.getMonth() + months);
    return d;
  }, [startDate, contract?.duration_value, contract?.duration_unit]);

  // Seller address
  const sellerAddress = useMemo(() => {
    if (!profile) return null;
    const parts = [profile.address_line1, profile.address_line2, profile.city, profile.state_code, profile.postal_code].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [profile]);

  // Tax breakdown from contract
  const taxBreakdown = contract?.tax_breakdown || [];

  // ═══════════════════════════════════════════════════
  // RENDERS
  // ═══════════════════════════════════════════════════

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: canvasBg, color: colors.text }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: brandPrimary }} />
          <p style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>Verifying access...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !contractData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: canvasBg, color: colors.text }}>
        <div style={{ maxWidth: 480, padding: 40, textAlign: 'center', backgroundColor: paperBg, borderRadius: 12, border: `1px solid ${borderColor}`, boxShadow: paperShadow }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Access Error</h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>{error}</p>
          <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${borderColor}`, backgroundColor: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Success response state (accepted / rejected)
  if (responseState !== 'idle') {
    const isAccepted = responseState === 'accepted';
    const displayCnak = contract?.global_access_id || cnak || '';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: canvasBg, color: colors.text }}>
        <div style={{ maxWidth: 560, padding: 48, textAlign: 'center', backgroundColor: paperBg, borderRadius: 16, border: `1px solid ${borderColor}`, boxShadow: paperShadow }}>
          {isAccepted ? (
            <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 20 }} />
          ) : (
            <XCircle size={56} style={{ color: '#ef4444', marginBottom: 20 }} />
          )}
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Contract {isAccepted ? 'Accepted' : 'Rejected'}
          </h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
            {contract?.name} ({contract?.contract_number})
          </p>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>
            {isAccepted
              ? 'The contract has been accepted and is now active. The issuing party has been notified.'
              : 'The contract has been rejected. The issuing party has been notified.'}
          </p>

          {/* CNAK Reference */}
          <div style={{ backgroundColor: `${brandPrimary}08`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, border: `1px solid ${brandPrimary}20` }}>
            <p style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your Contract Access Code</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: brandPrimary }}>{displayCnak}</span>
              <button onClick={handleCopyCnak} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: colors.textSecondary }}>
                {cnakCopied ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
              Save this code — you can always access this contract on ContractNest.
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: `1px solid ${borderColor}`, backgroundColor: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              <LogIn size={16} />
              Already have an account? Log in
            </button>
            <button
              onClick={() => navigate(`/signup?ref=${displayCnak}`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', backgroundColor: brandPrimary, color: '#FFFFFF', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              <UserPlus size={16} />
              Create a free account to track contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const displayCnak = contract.global_access_id || cnak || '';
  const paymentLabel = getPaymentPlanLabel(contract.payment_mode, contract.billing_cycle_type, contract.emi_months);

  // ═══════════════════════════════════════════════════
  // MAIN PAPER VIEW
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', backgroundColor: canvasBg, color: colors.text }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Controls above paper ── */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: CNAK badge + login link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, backgroundColor: paperBg, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: colors.textSecondary }}>CNAK:</span>
            <span style={{ fontFamily: 'monospace', color: brandPrimary }}>{displayCnak}</span>
            <button onClick={handleCopyCnak} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: colors.textSecondary, display: 'flex' }}>
              {cnakCopied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
            </button>
          </div>
          <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 20, backgroundColor: paperBg, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: colors.textSecondary }}>
            <LogIn size={12} />
            Log in
          </button>
        </div>

        {/* Right: PDF + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, backgroundColor: paperBg, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: 'none', cursor: generatingPdf ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, color: colors.text, opacity: generatingPdf ? 0.6 : 1 }}
          >
            {generatingPdf ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
            {generatingPdf ? 'Generating...' : 'PDF'}
          </button>
          <span style={{ fontSize: 11, padding: '6px 14px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', backgroundColor: paperBg, color: brandPrimary, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            Pending Review
          </span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ maxWidth: 820, margin: '12px auto 0', padding: '12px 16px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ═══ THE PAPER ═══ */}
      <div style={{ maxWidth: 820, margin: '16px auto', padding: '0 16px 140px' }}>
        <div ref={paperRef} style={{ backgroundColor: paperBg, borderRadius: 12, boxShadow: paperShadow }}>

          {/* ── Branded gradient header ── */}
          <div style={{ borderRadius: '12px 12px 0 0', padding: '32px 48px', background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt={profile.business_name || 'Company'} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  <Building2 size={24} color="#FFFFFF" />
                </div>
              )}
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {profile?.business_name || tenant?.name || 'Company'}
                </p>
                <p style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                  Service Agreement
                </p>
              </div>
            </div>
          </div>

          {/* ── Paper body ── */}
          <div style={{ padding: '40px 48px' }}>

            {/* Contract title */}
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500, marginBottom: 12, color: colors.text }}>
              {contract.name}
            </h1>

            {/* Status + ref + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase', backgroundColor: `${brandPrimary}12`, color: brandPrimary }}>
                {contract.status}
              </span>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>
                Ref: {contract.contract_number}
              </span>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>
                · Created {formatDate(startDate)}
              </span>
            </div>

            {/* ── Meta Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 40px', padding: '24px 0', borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, marginBottom: 32 }}>
              {/* Provider */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textSecondary, display: 'block', marginBottom: 8 }}>Provider</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{profile?.business_name || tenant?.name || '—'}</p>
                {profile?.business_email && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} /> {profile.business_email}
                  </p>
                )}
                {profile?.business_phone && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} /> {profile.business_phone_country_code || ''} {profile.business_phone}
                  </p>
                )}
                {sellerAddress && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{sellerAddress}</span>
                  </p>
                )}
              </div>

              {/* Customer */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textSecondary, display: 'block', marginBottom: 8 }}>Customer</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{contract.buyer_company || contract.buyer_name || '—'}</p>
                {contract.buyer_name && contract.buyer_company && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{contract.buyer_contact_person_name || contract.buyer_name}</p>
                )}
                {contract.buyer_email && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} /> {contract.buyer_email}
                  </p>
                )}
                {contract.buyer_phone && (
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} /> {contract.buyer_phone}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textSecondary, display: 'block', marginBottom: 8 }}>Contract Duration</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{formatDuration(contract.duration_value, contract.duration_unit)}</p>
                <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </p>
              </div>

              {/* Payment */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textSecondary, display: 'block', marginBottom: 8 }}>Payment</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{paymentLabel}</p>
                <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }}>
                  {contract.acceptance_method === 'digital_signature' ? 'Signoff Required'
                    : contract.acceptance_method === 'manual' ? 'Payment Acceptance'
                    : contract.acceptance_method === 'auto' ? 'Auto Accept' : contract.acceptance_method || '—'}
                </p>
              </div>
            </div>

            {/* ── Description ── */}
            {contract.description && (
              <p style={{ fontSize: 14, lineHeight: 1.7, color: colors.textSecondary, marginBottom: 40 }}>
                {contract.description}
              </p>
            )}

            {/* ── Block Sections ── */}
            {blockGroups.map(([categoryId, blocks]) => {
              const category = getCategoryById(categoryId);
              const catColor = category?.color || '#6B7280';
              const catName = category?.name || blocks[0]?.category_name || categoryId;
              const CatIcon = CATEGORY_ICONS[categoryId] || FileText;
              const hasPricing = categoryHasPricing(categoryId);

              return (
                <div key={categoryId} style={{ marginBottom: 32 }}>
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${catColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CatIcon size={16} style={{ color: catColor }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{catName}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: `${catColor}10`, color: catColor, fontWeight: 500 }}>{blocks.length}</span>
                  </div>

                  {/* Block items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {blocks.map((block) => (
                      <div key={block.id} style={{ display: 'flex', gap: 16, padding: 16, borderRadius: 12, border: `1px solid ${borderColor}`, backgroundColor: `${catColor}03` }}>
                        {/* Icon */}
                        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${catColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CatIcon size={20} style={{ color: catColor }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {block.block_name || 'Untitled'}
                          </h4>

                          {hasPricing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 500, backgroundColor: `${colors.text}08`, color: colors.textSecondary }}>
                                Qty: {block.quantity}
                              </span>
                              {block.billing_cycle && (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 500, backgroundColor: `${brandPrimary}10`, color: brandPrimary, textTransform: 'capitalize' }}>
                                  {block.billing_cycle}
                                </span>
                              )}
                            </div>
                          )}

                          {block.block_description && (
                            <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
                              {block.block_description}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        {hasPricing && (
                          <div style={{ textAlign: 'right', flexShrink: 0, alignSelf: 'center' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: catColor }}>
                              {formatCurrency(block.total_price, contract.currency)}
                            </p>
                            <p style={{ fontSize: 10, color: colors.textSecondary }}>
                              {formatCurrency(block.unit_price, contract.currency)}/ea
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── Financial Summary ── */}
            {totals.billableCount > 0 && (
              <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${borderColor}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: colors.text }}>Financial Summary</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: colors.textSecondary }}>Subtotal ({totals.billableCount} item{totals.billableCount !== 1 ? 's' : ''})</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{formatCurrency(totals.subtotal, contract.currency)}</span>
                  </div>

                  {taxBreakdown.map((tax, idx) => (
                    <div key={tax.tax_rate_id || idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: colors.textSecondary }}>{tax.name} ({tax.rate}%)</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{formatCurrency(tax.amount, contract.currency)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: `1px solid ${borderColor}`, marginBottom: 8 }} />

                {/* Grand Total */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, backgroundColor: `${brandPrimary}08` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Grand Total</span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: brandPrimary }}>{formatCurrency(totals.grandTotal, contract.currency)}</span>
                </div>

                {/* EMI note */}
                {contract.payment_mode === 'emi' && contract.emi_months && contract.billing_cycle_type !== 'mixed' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: `${colors.text}04` }}>
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>{contract.emi_months} monthly installments</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: brandPrimary }}>{formatCurrency(totals.grandTotal / contract.emi_months, contract.currency)} /mo</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Reviewing As ── */}
            {access && (
              <div style={{ marginTop: 32, padding: 20, borderRadius: 12, backgroundColor: `${brandPrimary}06`, border: `1px solid ${brandPrimary}20` }}>
                <p style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reviewing as</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{access.accessor_name || access.accessor_email || 'External Party'}</p>
                <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }}>Role: {access.accessor_role}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reject Dialog ── */}
      {showRejectDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: paperBg, borderRadius: 12, padding: 24, maxWidth: 480, width: '90%', border: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Reject Contract</h3>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Please provide a reason for rejecting this contract.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, backgroundColor: canvasBg, color: colors.text, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowRejectDialog(false)} disabled={submitting} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${borderColor}`, backgroundColor: 'transparent', color: colors.text, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button
                onClick={() => handleRespond('reject')}
                disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#ef4444', color: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsDown size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Action Bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, backgroundColor: paperBg, borderTop: `1px solid ${borderColor}`, padding: '16px 24px', display: 'flex', justifyContent: 'center', gap: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <button
          onClick={() => setShowRejectDialog(true)}
          disabled={submitting}
          style={{ padding: '12px 32px', borderRadius: 10, border: '2px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? 0.6 : 1 }}
        >
          <ThumbsDown size={18} />
          Reject
        </button>
        <button
          onClick={() => handleRespond('accept')}
          disabled={submitting}
          style={{ padding: '12px 32px', borderRadius: 10, border: 'none', backgroundColor: '#22c55e', color: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsUp size={18} />}
          Accept Contract
        </button>
      </div>
    </div>
  );
};

export default ContractReviewPage;
