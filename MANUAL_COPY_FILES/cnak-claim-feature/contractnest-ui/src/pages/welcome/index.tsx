// src/pages/welcome/index.tsx
// Welcome Page - CNAK Claim Landing Page for post-signup flow
// User receives link: /welcome?cnak=CNAK-XXXXXX
// If authenticated: auto-claim the contract
// If not: show sign up / login options, redirect back after auth

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Shield,
  Sparkles,
  LogIn,
  UserPlus,
  Building,
  Gift,
  Clock
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { vaniToast } from '@/components/common/toast';
import { VaNiLoader } from '@/components/common/loaders';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/serviceURLs';

// Storage key for preserving CNAK across auth flow
const CNAK_STORAGE_KEY = 'contractnest_pending_cnak';
const AUTH_REDIRECT_KEY = 'contractnest_auth_redirect';

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

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode, currentTheme } = useTheme();
  const { isAuthenticated, isLoading: authLoading, currentTenant, user } = useAuth();

  // Get correct color structure based on dark mode
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get CNAK from URL or sessionStorage (for returning after auth)
  const urlCnak = searchParams.get('cnak') || searchParams.get('code') || '';
  const storedCnak = sessionStorage.getItem(CNAK_STORAGE_KEY) || '';
  const cnak = urlCnak || storedCnak;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null);
  const [hasAttemptedClaim, setHasAttemptedClaim] = useState(false);
  const claimInProgressRef = useRef(false);

  // Validate CNAK format
  const isValidCnak = (value: string): boolean => {
    return /^CNAK-[A-Z0-9]{6}$/i.test(value.trim());
  };

  // Store CNAK and set redirect for auth flow
  const handleAuthRedirect = (authPath: '/login' | '/signup') => {
    if (cnak) {
      // Store CNAK for after auth
      sessionStorage.setItem(CNAK_STORAGE_KEY, cnak);
      // Store redirect URL (this page with CNAK)
      sessionStorage.setItem(AUTH_REDIRECT_KEY, `/welcome?cnak=${cnak}`);
    }
    navigate(authPath);
  };

  // Auto-claim when user is authenticated and has a valid CNAK
  useEffect(() => {
    const autoClaim = async () => {
      // Skip if already in progress or already attempted
      if (claimInProgressRef.current || hasAttemptedClaim) return;

      // Skip if auth is still loading
      if (authLoading) return;

      // Skip if not authenticated or no tenant
      if (!isAuthenticated || !currentTenant?.id) return;

      // Skip if no valid CNAK
      if (!cnak || !isValidCnak(cnak)) return;

      try {
        claimInProgressRef.current = true;
        setIsSubmitting(true);
        setHasAttemptedClaim(true);

        const response = await api.post<ClaimResponse>(API_ENDPOINTS.CONTRACTS.CLAIM, {
          cnak: cnak.trim()
        });

        const result = response.data;
        setClaimResult(result);

        // Clear stored CNAK after claim attempt
        sessionStorage.removeItem(CNAK_STORAGE_KEY);

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
        console.error('[WelcomePage] Auto-claim error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to claim contract';
        vaniToast.error(errorMessage);
        setClaimResult({ success: false, error: errorMessage });
        sessionStorage.removeItem(CNAK_STORAGE_KEY);
      } finally {
        setIsSubmitting(false);
        claimInProgressRef.current = false;
      }
    };

    autoClaim();
  }, [isAuthenticated, authLoading, currentTenant?.id, cnak, hasAttemptedClaim, navigate]);

  const handleViewContract = () => {
    if (claimResult?.contract?.id) {
      navigate(`/contracts/${claimResult.contract.id}`);
    }
  };

  const handleViewContracts = () => {
    navigate('/contracts');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <VaNiLoader message="Checking authentication..." />
      </div>
    );
  }

  // Show loading while claiming
  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <VaNiLoader message="Claiming contract..." />
      </div>
    );
  }

  // No CNAK provided - show error state
  if (!cnak || !isValidCnak(cnak)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-md w-full">
          <div
            className="rounded-2xl border p-8 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.semantic.warning + '40'
            }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: colors.semantic.warning + '15' }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: colors.semantic.warning }} />
            </div>
            <h2
              className="text-2xl font-bold mb-3 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              Invalid or Missing CNAK Code
            </h2>
            <p
              className="text-sm mb-6 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              The link you followed doesn't contain a valid CNAK code. Please check your
              email for the correct link or contact the contract owner.
            </p>
            <div className="space-y-3">
              <Link
                to="/contracts/claim"
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  backgroundColor: colors.brand.primary,
                  color: '#ffffff'
                }}
              >
                <FileText className="w-4 h-4" />
                Enter CNAK Manually
              </Link>
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated - show claim result or success state
  if (isAuthenticated && currentTenant && claimResult) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="max-w-lg w-full">
          {/* Success State */}
          {claimResult.success && (
            <div
              className="rounded-2xl border-2 p-8 animate-in fade-in slide-in-from-bottom-4 transition-colors"
              style={{
                backgroundColor: colors.semantic.success + '08',
                borderColor: colors.semantic.success
              }}
            >
              <div className="text-center mb-6">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: colors.semantic.success + '20' }}
                >
                  <CheckCircle className="w-10 h-10" style={{ color: colors.semantic.success }} />
                </div>
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ color: colors.semantic.success }}
                >
                  {claimResult.already_claimed
                    ? 'Contract Already in Your Hub'
                    : 'Contract Claimed Successfully!'
                  }
                </h2>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {claimResult.message || (claimResult.already_claimed
                    ? 'This contract was previously claimed and is available in your ContractHub.'
                    : 'The contract has been added to your ContractHub.'
                  )}
                </p>
              </div>

              {claimResult.contract && (
                <div
                  className="p-5 rounded-xl mb-6 transition-colors"
                  style={{ backgroundColor: colors.utility.primaryBackground }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6" style={{ color: colors.brand.primary }} />
                    <span
                      className="font-bold text-lg transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {claimResult.contract.name}
                    </span>
                  </div>
                  <div
                    className="text-sm space-y-1 transition-colors"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <p>Contract #: {claimResult.contract.contract_number}</p>
                    <p>Type: {claimResult.contract.contract_type}</p>
                    {claimResult.contract.total_value > 0 && (
                      <p>Value: {claimResult.contract.currency} {claimResult.contract.total_value.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleViewContract}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#ffffff',
                    boxShadow: `0 4px 14px ${colors.brand.primary}40`
                  }}
                >
                  View Contract
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleViewContracts}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
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
          )}

          {/* Error State */}
          {!claimResult.success && (
            <div
              className="rounded-2xl border-2 p-8 animate-in fade-in slide-in-from-bottom-4 transition-colors"
              style={{
                backgroundColor: colors.semantic.error + '08',
                borderColor: colors.semantic.error
              }}
            >
              <div className="text-center mb-6">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: colors.semantic.error + '20' }}
                >
                  <AlertCircle className="w-10 h-10" style={{ color: colors.semantic.error }} />
                </div>
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ color: colors.semantic.error }}
                >
                  Unable to Claim Contract
                </h2>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {claimResult.error || 'An error occurred while claiming the contract. Please try again or contact support.'}
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to={`/contracts/claim?cnak=${cnak}`}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: '#ffffff'
                  }}
                >
                  Try Again
                </Link>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    border: `1px solid ${colors.utility.primaryText}20`
                  }}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User is NOT authenticated - show signup/login options
  return (
    <div
      className="min-h-screen transition-colors"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}20)`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground}, ${colors.brand.primary}10)`
      }}
    >
      {/* Background Pattern */}
      <div
        className={`absolute inset-0 transition-opacity ${isDarkMode ? 'opacity-10' : 'opacity-5'}`}
        style={{
          backgroundImage: `
            linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Value Proposition */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-12">
          <div className="max-w-md mx-auto lg:mx-0">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.brand.primary}, ${colors.brand.secondary})`
                }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  ContractNest
                </h1>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Contract Management Made Simple
                </p>
              </div>
            </div>

            {/* Welcome Message */}
            <div
              className="rounded-xl p-6 mb-8 border-2 transition-colors"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}10, ${colors.brand.primary}05)`,
                borderColor: colors.brand.primary + '30'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6" style={{ color: colors.brand.primary }} />
                <h2
                  className="text-lg font-bold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  A Contract Has Been Shared With You!
                </h2>
              </div>
              <p
                className="text-sm mb-3 transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                Someone has shared a contract with you via ContractNest. Create an account
                or sign in to claim it and manage it in your ContractHub.
              </p>
              <div
                className="flex items-center gap-2 text-sm font-mono"
                style={{ color: colors.brand.primary }}
              >
                <FileText className="w-4 h-4" />
                <span>Access Code: {cnak}</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                { icon: FileText, title: 'Track Your Contracts', desc: 'View contract details, events, and invoices in one place' },
                { icon: Clock, title: 'Never Miss a Deadline', desc: 'Get reminders for upcoming payments and renewals' },
                { icon: Building, title: 'Professional Management', desc: 'Organize all your business contracts efficiently' }
              ].map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${colors.brand.primary}15` }}
                  >
                    <benefit.icon className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  </div>
                  <div>
                    <h3
                      className="font-semibold transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      {benefit.title}
                    </h3>
                    <p
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Auth Options */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div
              className="backdrop-blur-xl border rounded-2xl shadow-xl p-8 transition-colors"
              style={{
                backgroundColor: `${colors.utility.secondaryBackground}90`,
                borderColor: `${colors.utility.primaryText}20`
              }}
            >
              {/* Free Trial Banner */}
              <div
                className="rounded-lg p-4 mb-6 border transition-colors"
                style={{
                  background: `linear-gradient(to right, ${colors.semantic.success}10, ${colors.semantic.success}05)`,
                  borderColor: `${colors.semantic.success}40`
                }}
              >
                <div
                  className="flex items-center justify-center space-x-2 transition-colors"
                  style={{ color: colors.semantic.success }}
                >
                  <Gift className="w-5 h-5" />
                  <span className="text-sm font-medium">Your first 3 contracts are free!</span>
                </div>
              </div>

              <div className="text-center mb-8">
                <h2
                  className="text-2xl font-bold mb-2 transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Claim Your Contract
                </h2>
                <p
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Create an account or sign in to access your shared contract
                </p>
              </div>

              {/* Auth Buttons */}
              <div className="space-y-4">
                {/* Sign Up Button */}
                <button
                  onClick={() => handleAuthRedirect('/signup')}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    color: '#ffffff',
                    boxShadow: `0 4px 14px ${colors.brand.primary}40`
                  }}
                >
                  <UserPlus className="w-5 h-5" />
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className="w-full border-t transition-colors"
                      style={{ borderColor: `${colors.utility.secondaryText}30` }}
                    />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className="px-3 transition-colors"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.secondaryText
                      }}
                    >
                      Already have an account?
                    </span>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  onClick={() => handleAuthRedirect('/login')}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    border: `2px solid ${colors.utility.primaryText}20`
                  }}
                >
                  <LogIn className="w-5 h-5" />
                  Sign In
                </button>
              </div>

              {/* Security Note */}
              <div className="mt-6 text-center">
                <p
                  className="text-xs flex items-center justify-center space-x-1 transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Shield className="w-3 h-3" />
                  <span>Your data is secured with enterprise-grade encryption</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
