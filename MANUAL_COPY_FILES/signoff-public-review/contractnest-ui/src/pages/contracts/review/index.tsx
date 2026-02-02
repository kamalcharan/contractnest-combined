// src/pages/contracts/review/index.tsx
// Public Contract Review Page — sign-off workflow
// Accessible via: /contract-review?cnak=CNAK-XXXXXX&secret=abc123
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Layers,
  Building,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
} from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface ContractAccessData {
  id: string;
  status: string;
  accessor_role: string;
  accessor_name: string;
  accessor_email: string;
}

interface ServiceBlock {
  id: string;
  block_name: string;
  block_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  billing_cycle: string;
  category_name: string;
}

interface TaxBreakdownItem {
  tax_rate_id: string;
  name: string;
  rate: number;
  amount: number;
}

interface ContractData {
  id: string;
  name: string;
  contract_number: string;
  record_type: string;
  contract_type: string;
  status: string;
  description: string;
  total_value: number;
  grand_total: number;
  tax_total: number;
  tax_breakdown: TaxBreakdownItem[];
  currency: string;
  acceptance_method: string;
  duration_value: number;
  duration_unit: string;
  billing_cycle_type: string;
  payment_mode: string;
  buyer_name: string;
  buyer_email: string;
  service_blocks: ServiceBlock[];
}

interface TenantData {
  id: string;
  name: string;
}

interface ValidateResponse {
  valid: boolean;
  error?: string;
  status?: string;
  access?: ContractAccessData;
  contract?: ContractData;
  tenant?: TenantData;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

const formatCurrency = (amount: number, currency?: string) => {
  const curr = currency || 'INR';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDuration = (value: number, unit: string) => {
  if (!value) return '—';
  const unitLabel = value === 1 ? unit : `${unit}s`;
  return `${value} ${unitLabel}`;
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

  // ── Renders ──

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        color: colors.text,
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: colors.primary }} />
          <p style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>Verifying access...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !contractData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        color: colors.text,
      }}>
        <div style={{
          maxWidth: 480,
          padding: 40,
          textAlign: 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
        }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Access Error</h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              color: colors.text,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
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
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        color: colors.text,
      }}>
        <div style={{
          maxWidth: 520,
          padding: 48,
          textAlign: 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
        }}>
          {isAccepted ? (
            <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 20 }} />
          ) : (
            <XCircle size={56} style={{ color: '#ef4444', marginBottom: 20 }} />
          )}
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Contract {isAccepted ? 'Accepted' : 'Rejected'}
          </h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
            {contractData?.contract?.name} ({contractData?.contract?.contract_number})
          </p>
          <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 32 }}>
            {isAccepted
              ? 'The contract has been accepted and is now active. The issuing party has been notified.'
              : 'The contract has been rejected. The issuing party has been notified.'}
          </p>
          <p style={{ fontSize: 12, color: colors.textSecondary }}>
            You may close this window.
          </p>
        </div>
      </div>
    );
  }

  // Main review view
  const contract = contractData?.contract;
  const access = contractData?.access;
  const tenant = contractData?.tenant;

  if (!contract) return null;

  const blocks = contract.service_blocks || [];
  const taxBreakdown = contract.tax_breakdown || [];
  const subtotal = contract.total_value || 0;
  const grandTotal = contract.grand_total || subtotal;
  const taxTotal = contract.tax_total || 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      color: colors.text,
    }}>
      {/* ── Header bar ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building size={20} style={{ color: colors.primary }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{tenant?.name || 'ContractNest'}</div>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Contract Review</div>
          </div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: '#fef3c7',
          color: '#92400e',
        }}>
          Pending Review
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          margin: '16px 24px 0',
          padding: '12px 16px',
          borderRadius: 8,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Contract Content ── */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 120px' }}>

        {/* Contract Title Card */}
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          padding: 24,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              backgroundColor: `${colors.primary}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={24} style={{ color: colors.primary }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {contract.name}
              </h1>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: colors.textSecondary }}>
                <span>{contract.contract_number}</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span style={{ textTransform: 'capitalize' }}>{contract.contract_type}</span>
                {contract.record_type && (
                  <>
                    <span style={{ opacity: 0.4 }}>|</span>
                    <span style={{ textTransform: 'uppercase' }}>{contract.record_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {contract.description && (
            <p style={{
              marginTop: 16,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 1.6,
            }}>
              {contract.description}
            </p>
          )}
        </div>

        {/* Summary Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}>
          {/* Grand Total */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <DollarSign size={16} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>Grand Total</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(grandTotal, contract.currency)}</div>
          </div>

          {/* Subtotal */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Layers size={16} style={{ color: colors.primary }} />
              <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>Subtotal</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(subtotal, contract.currency)}</div>
          </div>

          {/* Tax */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <DollarSign size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>Tax</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(taxTotal, contract.currency)}</div>
          </div>

          {/* Duration */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Calendar size={16} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 500 }}>Duration</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {formatDuration(contract.duration_value, contract.duration_unit)}
            </div>
          </div>
        </div>

        {/* Service Blocks */}
        {blocks.length > 0 && (
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Layers size={16} style={{ color: colors.primary }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Service Blocks</span>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                backgroundColor: `${colors.primary}15`,
                color: colors.primary,
                fontWeight: 500,
              }}>{blocks.length}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: `${colors.primary}08` }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>Service</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>Billing</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block, idx) => (
                    <tr key={block.id} style={{
                      borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
                    }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{block.block_name}</div>
                        {block.block_description && (
                          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                            {block.block_description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{block.quantity}</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{block.billing_cycle || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {formatCurrency(block.unit_price, contract.currency)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(block.total_price, contract.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tax Breakdown */}
        {taxBreakdown.length > 0 && (
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tax Breakdown</div>
            {taxBreakdown.map((tax, idx) => (
              <div key={tax.tax_rate_id || idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
                fontSize: 13,
              }}>
                <span style={{ color: colors.textSecondary }}>{tax.name} ({tax.rate}%)</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(tax.amount, contract.currency)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0 0',
              borderTop: `2px solid ${colors.border}`,
              marginTop: 8,
              fontSize: 14,
              fontWeight: 600,
            }}>
              <span>Grand Total</span>
              <span style={{ color: colors.primary }}>{formatCurrency(grandTotal, contract.currency)}</span>
            </div>
          </div>
        )}

        {/* Payment Details */}
        {(contract.payment_mode || contract.billing_cycle_type) && (
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Payment Details</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              {contract.payment_mode && (
                <div>
                  <div style={{ color: colors.textSecondary, marginBottom: 4 }}>Payment Mode</div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{contract.payment_mode.replace(/_/g, ' ')}</div>
                </div>
              )}
              {contract.billing_cycle_type && (
                <div>
                  <div style={{ color: colors.textSecondary, marginBottom: 4 }}>Billing Cycle</div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{contract.billing_cycle_type.replace(/_/g, ' ')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accessor Info */}
        {access && (
          <div style={{
            backgroundColor: `${colors.primary}08`,
            borderRadius: 12,
            border: `1px solid ${colors.primary}30`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
              Reviewing as
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {access.accessor_name || access.accessor_email || 'External Party'}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }}>
              Role: {access.accessor_role}
            </div>
          </div>
        )}
      </main>

      {/* ── Reject Dialog (overlay) ── */}
      {showRejectDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 24,
            maxWidth: 480,
            width: '90%',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Reject Contract</h3>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
              Please provide a reason for rejecting this contract.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.background,
                color: colors.text,
                fontSize: 13,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespond('reject')}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ThumbsDown size={14} />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Action Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        backgroundColor: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
      }}>
        <button
          onClick={() => setShowRejectDialog(true)}
          disabled={submitting}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            border: '2px solid #ef4444',
            backgroundColor: 'transparent',
            color: '#ef4444',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <ThumbsDown size={18} />
          Reject
        </button>
        <button
          onClick={() => handleRespond('accept')}
          disabled={submitting}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            border: 'none',
            backgroundColor: '#22c55e',
            color: '#ffffff',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <ThumbsUp size={18} />
          )}
          Accept Contract
        </button>
      </div>
    </div>
  );
};

export default ContractReviewPage;
