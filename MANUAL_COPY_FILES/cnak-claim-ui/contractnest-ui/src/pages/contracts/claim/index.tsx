// src/pages/contracts/claim/index.tsx
// CNAK Claim Contract Page - Allows buyers to claim contracts shared via CNAK

import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  FileText,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Link2,
  Shield,
  Users
} from 'lucide-react';
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

  // Get correct color structure based on dark mode
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

  const handleTryAgain = () => {
    setClaimResult(null);
    setCnak('');
  };

  // Loading state
  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <VaNiLoader message="Claiming contract..." />
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-120px)] p-6 transition-colors"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div className="max-w-4xl mx-auto">

        {/* Hero Section */}
        <div
          className="rounded-2xl p-8 mb-8 relative overflow-hidden transition-colors"
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.primary}05 100%)`,
            border: `1px solid ${colors.brand.primary}20`
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: colors.brand.primary }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10"
            style={{ backgroundColor: colors.brand.primary }}
          />

          <div className="relative z-10 flex items-start gap-6">
            {/* Icon */}
            <div
              className="p-4 rounded-2xl shrink-0"
              style={{
                backgroundColor: colors.brand.primary,
                boxShadow: `0 8px 32px ${colors.brand.primary}40`
              }}
            >
              <Download className="w-10 h-10 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h1
                className="text-3xl font-bold mb-2 transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                Claim Contract
              </h1>
              <p
                className="text-lg transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Enter your CNAK code to add a shared contract to your ContractHub.
                Once claimed, you'll have full access to view and manage this contract.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Main Form Card - Takes 3 columns */}
          <div className="lg:col-span-3">
            <div
              className="rounded-xl border p-6 h-full transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <form onSubmit={handleSubmit}>
                {/* CNAK Input */}
                <div className="mb-6">
                  <label
                    htmlFor="cnak-input"
                    className="block text-sm font-semibold mb-3 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    CNAK Code
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      <Link2 className="w-5 h-5" />
                    </div>
                    <input
                      id="cnak-input"
                      type="text"
                      value={cnak}
                      onChange={handleCnakChange}
                      placeholder="CNAK-XXXXXX"
                      className="w-full pl-12 pr-12 py-4 rounded-xl border-2 text-xl font-mono tracking-widest focus:outline-none transition-all"
                      style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderColor: cnak
                          ? (isValidCnak(cnak) ? colors.semantic.success : colors.semantic.warning)
                          : colors.utility.primaryText + '20',
                        color: colors.utility.primaryText,
                      }}
                      autoComplete="off"
                      autoFocus
                    />
                    {cnak && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isValidCnak(cnak) ? (
                          <CheckCircle className="w-6 h-6" style={{ color: colors.semantic.success }} />
                        ) : (
                          <AlertCircle className="w-6 h-6" style={{ color: colors.semantic.warning }} />
                        )}
                      </div>
                    )}
                  </div>
                  <p
                    className="text-sm mt-3 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    The CNAK code was shared with you via email or message from the contract owner.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isValidCnak(cnak) || isSubmitting}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    backgroundColor: isValidCnak(cnak) ? colors.brand.primary : (colors.utility.primaryText + '20'),
                    color: isValidCnak(cnak) ? '#ffffff' : colors.utility.secondaryText,
                    boxShadow: isValidCnak(cnak) ? `0 4px 14px ${colors.brand.primary}40` : 'none'
                  }}
                >
                  <Download className="w-5 h-5" />
                  Claim Contract
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              {/* Success Result */}
              {claimResult?.success && (
                <div
                  className="mt-6 rounded-xl border-2 p-6 animate-in fade-in slide-in-from-bottom-4 transition-colors"
                  style={{
                    backgroundColor: colors.semantic.success + '08',
                    borderColor: colors.semantic.success
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-full shrink-0"
                      style={{ backgroundColor: colors.semantic.success + '20' }}
                    >
                      <CheckCircle className="w-6 h-6" style={{ color: colors.semantic.success }} />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="font-bold text-lg mb-2"
                        style={{ color: colors.semantic.success }}
                      >
                        {claimResult.already_claimed
                          ? 'Contract Already in Your Hub'
                          : 'Contract Claimed Successfully!'
                        }
                      </h3>
                      <p
                        className="text-sm mb-3 transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {claimResult.message || (claimResult.already_claimed
                          ? 'This contract was previously claimed and is available in your ContractHub.'
                          : 'The contract has been added to your ContractHub.'
                        )}
                      </p>

                      {claimResult.contract && (
                        <div
                          className="p-4 rounded-lg mb-4 transition-colors"
                          style={{ backgroundColor: colors.utility.primaryBackground }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                            <span
                              className="font-semibold transition-colors"
                              style={{ color: colors.utility.primaryText }}
                            >
                              {claimResult.contract.name}
                            </span>
                          </div>
                          <div
                            className="text-sm grid grid-cols-2 gap-2 transition-colors"
                            style={{ color: colors.utility.secondaryText }}
                          >
                            <span>Contract #: {claimResult.contract.contract_number}</span>
                            <span>Type: {claimResult.contract.contract_type}</span>
                          </div>
                          {claimResult.seller && !claimResult.already_claimed && (
                            <div
                              className="flex items-center gap-2 mt-2 text-sm transition-colors"
                              style={{ color: colors.utility.secondaryText }}
                            >
                              <Users className="w-4 h-4" />
                              <span>Seller: {claimResult.seller.name}</span>
                              {claimResult.seller.is_new_contact && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: colors.brand.primary + '20',
                                    color: colors.brand.primary
                                  }}
                                >
                                  New Contact Added
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={handleViewContract}
                          className="flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                          style={{
                            backgroundColor: colors.brand.primary,
                            color: '#ffffff'
                          }}
                        >
                          View Contract
                        </button>
                        <button
                          onClick={handleViewContracts}
                          className="flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                          style={{
                            backgroundColor: colors.utility.primaryBackground,
                            color: colors.utility.primaryText,
                            border: `1px solid ${colors.utility.primaryText}20`
                          }}
                        >
                          View All Contracts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Result */}
              {claimResult && !claimResult.success && (
                <div
                  className="mt-6 rounded-xl border-2 p-6 animate-in fade-in slide-in-from-bottom-4 transition-colors"
                  style={{
                    backgroundColor: colors.semantic.error + '08',
                    borderColor: colors.semantic.error
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-full shrink-0"
                      style={{ backgroundColor: colors.semantic.error + '20' }}
                    >
                      <AlertCircle className="w-6 h-6" style={{ color: colors.semantic.error }} />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="font-bold text-lg mb-2"
                        style={{ color: colors.semantic.error }}
                      >
                        Unable to Claim Contract
                      </h3>
                      <p
                        className="text-sm mb-4 transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {claimResult.error || 'An unknown error occurred. Please check the CNAK code and try again.'}
                      </p>

                      <button
                        onClick={handleTryAgain}
                        className="px-4 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                        style={{
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText,
                          border: `1px solid ${colors.utility.primaryText}20`
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Sidebar - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* What is CNAK */}
            <div
              className="rounded-xl border p-5 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.semantic.info + '15' }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: colors.semantic.info }} />
                </div>
                <h4
                  className="font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  What is CNAK?
                </h4>
              </div>
              <p
                className="text-sm leading-relaxed transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <strong>CNAK</strong> (ContractNest Access Key) is a unique code that allows
                secure contract sharing between businesses. When someone shares a contract
                with you, they'll send a CNAK code in format <code
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: colors.utility.primaryBackground }}
                >CNAK-XXXXXX</code>.
              </p>
            </div>

            {/* How it works */}
            <div
              className="rounded-xl border p-5 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.brand.primary + '15' }}
                >
                  <FileText className="w-5 h-5" style={{ color: colors.brand.primary }} />
                </div>
                <h4
                  className="font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  How it Works
                </h4>
              </div>
              <ol
                className="text-sm space-y-2 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                <li className="flex gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                  >1</span>
                  <span>Receive CNAK code via email</span>
                </li>
                <li className="flex gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                  >2</span>
                  <span>Enter the code above</span>
                </li>
                <li className="flex gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                  >3</span>
                  <span>Contract appears in your hub</span>
                </li>
              </ol>
            </div>

            {/* Security */}
            <div
              className="rounded-xl border p-5 transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.semantic.success + '15' }}
                >
                  <Shield className="w-5 h-5" style={{ color: colors.semantic.success }} />
                </div>
                <h4
                  className="font-semibold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Secure & Private
                </h4>
              </div>
              <p
                className="text-sm leading-relaxed transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                CNAK codes are encrypted and can only be used once per workspace.
                Your contract data remains secure and private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimContractPage;
