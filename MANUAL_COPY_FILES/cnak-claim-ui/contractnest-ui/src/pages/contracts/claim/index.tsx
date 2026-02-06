// src/pages/contracts/claim/index.tsx
// CNAK Claim Contract Page - Allows buyers to claim contracts shared via CNAK

import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, FileText, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

interface ClaimResponse {
  success: boolean;
  message?: string;
  error?: string;
  already_claimed?: boolean;
  contract?: {
    id: string;
    name: string;
    contract_number: string;
    contract_type: string;
    status: string;
    total_value: number;
    currency: string;
  };
  seller?: {
    contact_id: string;
    name: string;
    is_new_contact: boolean;
  };
  claimed_at?: string;
}

const ClaimContractPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get CNAK from URL if provided (e.g., /contracts/claim?code=CNAK-XXXXXX)
  const initialCnak = searchParams.get('code') || searchParams.get('cnak') || '';

  const [cnak, setCnak] = useState(initialCnak);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null);
  const submissionInProgressRef = useRef(false);

  // Validate CNAK format
  const isValidCnak = (value: string): boolean => {
    return /^CNAK-[A-Z0-9]{6}$/i.test(value.trim());
  };

  // Format CNAK input (auto-uppercase, auto-prefix)
  const formatCnakInput = (value: string): string => {
    let formatted = value.toUpperCase().trim();

    // If user types just the code part, add prefix
    if (/^[A-Z0-9]{1,6}$/.test(formatted) && !formatted.startsWith('CNAK-')) {
      formatted = `CNAK-${formatted}`;
    }

    // Limit length
    if (formatted.length > 11) {
      formatted = formatted.substring(0, 11);
    }

    return formatted;
  };

  const handleCnakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnakInput(e.target.value);
    setCnak(formatted);
    // Clear previous result when user types
    if (claimResult) {
      setClaimResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (submissionInProgressRef.current || isSubmitting) {
      vaniToast.warning('Claim already in progress...');
      return;
    }

    // Validate CNAK
    const trimmedCnak = cnak.trim();
    if (!trimmedCnak) {
      vaniToast.error('Please enter a CNAK code');
      return;
    }

    if (!isValidCnak(trimmedCnak)) {
      vaniToast.error('Invalid CNAK format. Expected: CNAK-XXXXXX');
      return;
    }

    if (!currentTenant?.id) {
      vaniToast.error('No workspace selected. Please select a workspace first.');
      return;
    }

    try {
      submissionInProgressRef.current = true;
      setIsSubmitting(true);

      const response = await api.post<ClaimResponse>(API_ENDPOINTS.CONTRACTS.CLAIM, {
        cnak: trimmedCnak
      });

      const result = response.data;
      setClaimResult(result);

      if (result.success) {
        if (result.already_claimed) {
          vaniToast.info('This contract is already in your ContractHub', {
            duration: 4000,
            action: {
              label: 'View Contracts',
              onClick: () => navigate('/contracts')
            }
          });
        } else {
          vaniToast.success(`Contract "${result.contract?.name}" claimed successfully!`, {
            duration: 5000,
            action: {
              label: 'View Contract',
              onClick: () => navigate(`/contracts/${result.contract?.id}`)
            }
          });
        }
      } else {
        vaniToast.error(result.error || 'Failed to claim contract');
      }
    } catch (error: any) {
      console.error('[ClaimContractPage] Claim error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to claim contract';
      vaniToast.error(errorMessage);
      setClaimResult({ success: false, error: errorMessage });
    } finally {
      setIsSubmitting(false);
      submissionInProgressRef.current = false;
    }
  };

  const handleViewContracts = () => {
    navigate('/contracts');
  };

  const handleViewContract = () => {
    if (claimResult?.contract?.id) {
      navigate(`/contracts/${claimResult.contract.id}`);
    }
  };

  // Loading state
  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <VaNiLoader message="Claiming contract..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <Download className="w-6 h-6" style={{ color: colors.primary }} />
          </div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: colors.text }}
          >
            Claim Contract
          </h1>
        </div>
        <p
          className="text-sm ml-11"
          style={{ color: colors.textSecondary }}
        >
          Enter a CNAK code to add a shared contract to your ContractHub
        </p>
      </div>

      {/* Claim Form Card */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* CNAK Input */}
          <div className="mb-6">
            <label
              htmlFor="cnak-input"
              className="block text-sm font-medium mb-2"
              style={{ color: colors.text }}
            >
              CNAK Code
            </label>
            <div className="relative">
              <input
                id="cnak-input"
                type="text"
                value={cnak}
                onChange={handleCnakChange}
                placeholder="CNAK-XXXXXX"
                className="w-full px-4 py-3 rounded-lg border text-lg font-mono tracking-wider focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.background,
                  borderColor: isValidCnak(cnak) ? colors.success : colors.border,
                  color: colors.text,
                  // @ts-ignore
                  '--tw-ring-color': colors.primary
                }}
                autoComplete="off"
                autoFocus
              />
              {cnak && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidCnak(cnak) ? (
                    <CheckCircle className="w-5 h-5" style={{ color: colors.success }} />
                  ) : (
                    <AlertCircle className="w-5 h-5" style={{ color: colors.warning }} />
                  )}
                </div>
              )}
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: colors.textSecondary }}
            >
              The CNAK code was shared with you by the contract owner (e.g., via email)
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValidCnak(cnak) || isSubmitting}
            className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isValidCnak(cnak) ? colors.primary : colors.border,
              color: isValidCnak(cnak) ? '#fff' : colors.textSecondary
            }}
          >
            <Download className="w-5 h-5" />
            Claim Contract
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Success Result Card */}
      {claimResult?.success && (
        <div
          className="rounded-xl border p-6 animate-in fade-in slide-in-from-bottom-4"
          style={{
            backgroundColor: `${colors.success}10`,
            borderColor: colors.success
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: `${colors.success}20` }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: colors.success }} />
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold mb-1"
                style={{ color: colors.text }}
              >
                {claimResult.already_claimed
                  ? 'Contract Already in Your Hub'
                  : 'Contract Claimed Successfully!'
                }
              </h3>

              {claimResult.contract && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.text }}>
                      {claimResult.contract.name}
                    </span>
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    Contract #: {claimResult.contract.contract_number}
                  </div>
                  {claimResult.seller && !claimResult.already_claimed && (
                    <div
                      className="text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      Seller: {claimResult.seller.name}
                      {claimResult.seller.is_new_contact && (
                        <span
                          className="ml-2 px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `${colors.primary}20`,
                            color: colors.primary
                          }}
                        >
                          New Contact
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleViewContract}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{
                    backgroundColor: colors.primary,
                    color: '#fff'
                  }}
                >
                  View Contract
                </button>
                <button
                  onClick={handleViewContracts}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  View All Contracts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Result Card */}
      {claimResult && !claimResult.success && (
        <div
          className="rounded-xl border p-6 animate-in fade-in slide-in-from-bottom-4"
          style={{
            backgroundColor: `${colors.error}10`,
            borderColor: colors.error
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: `${colors.error}20` }}
            >
              <AlertCircle className="w-6 h-6" style={{ color: colors.error }} />
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold mb-1"
                style={{ color: colors.text }}
              >
                Unable to Claim Contract
              </h3>
              <p
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                {claimResult.error || 'An unknown error occurred'}
              </p>

              <div className="mt-4">
                <button
                  onClick={() => {
                    setClaimResult(null);
                    setCnak('');
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div
        className="mt-8 p-4 rounded-lg"
        style={{ backgroundColor: `${colors.info}10` }}
      >
        <h4
          className="font-medium mb-2 text-sm"
          style={{ color: colors.text }}
        >
          What is a CNAK code?
        </h4>
        <p
          className="text-sm"
          style={{ color: colors.textSecondary }}
        >
          CNAK (ContractNest Access Key) is a unique code that allows you to access and claim
          contracts shared with you. When someone shares a contract with you, they'll send
          you a CNAK code (format: CNAK-XXXXXX). Enter it above to add the contract to your
          ContractHub.
        </p>
      </div>
    </div>
  );
};

export default ClaimContractPage;
