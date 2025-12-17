// src/pages/onboarding/OnboardingPendingPage.tsx
// Page shown to non-owners when onboarding is not yet complete

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { onboardingService } from '@/services/onboarding.service';
import {
  Clock,
  Mail,
  RefreshCw,
  LogOut,
  Building2,
  User
} from 'lucide-react';

interface OwnerInfo {
  name: string;
  email: string;
}

const OnboardingPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, logout, user } = useAuth();

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Get owner info from location state or fetch it
  const [owner, setOwner] = useState<OwnerInfo | null>(
    (location.state as any)?.owner || null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Fetch owner info if not available
  useEffect(() => {
    if (!owner) {
      checkOnboardingStatus();
    }
  }, []);

  const checkOnboardingStatus = async () => {
    setIsChecking(true);
    try {
      const response = await onboardingService.getStatus();

      // If onboarding is now complete, redirect to dashboard
      if (response.onboarding?.is_completed || !response.needs_onboarding) {
        navigate('/dashboard');
        return;
      }

      // Update owner info
      if (response.owner) {
        setOwner(response.owner);
      }

      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getMailtoLink = () => {
    if (!owner?.email) return '#';
    const ownerName = owner.name || 'there';
    const userName = user?.first_name || '';
    const subject = 'ContractNest Onboarding Request';
    const body = `Hi ${ownerName},\n\nCould you please complete the workspace onboarding so I can start using ContractNest?\n\nThanks!\n${userName}`;
    return `mailto:${owner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      <div
        className="max-w-lg w-full rounded-2xl shadow-xl p-8 text-center"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.primaryText + '10',
          borderWidth: 1
        }}
      >
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{
            backgroundColor: colors.brand.primary + '15',
            color: colors.brand.primary
          }}
        >
          <Clock className="w-10 h-10" />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: colors.utility.primaryText }}
        >
          Workspace Setup In Progress
        </h1>

        {/* Description */}
        <p
          className="text-base mb-6"
          style={{ color: colors.utility.secondaryText }}
        >
          The workspace owner needs to complete the initial setup before you can start using ContractNest.
        </p>

        {/* Workspace Info Card */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderColor: colors.utility.primaryText + '10',
            borderWidth: 1
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Building2
              className="w-5 h-5"
              style={{ color: colors.brand.primary }}
            />
            <span
              className="font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              {currentTenant?.name || 'Workspace'}
            </span>
          </div>

          {owner && (
            <div
              className="flex items-center gap-3 pt-3"
              style={{ borderTop: `1px solid ${colors.utility.primaryText}15` }}
            >
              <User
                className="w-5 h-5"
                style={{ color: colors.utility.secondaryText }}
              />
              <div className="text-left">
                <p
                  className="text-sm font-medium"
                  style={{ color: colors.utility.primaryText }}
                >
                  {owner.name || 'Workspace Owner'}
                </p>
                <p
                  className="text-xs flex items-center gap-1"
                  style={{ color: colors.utility.secondaryText }}
                >
                  <Mail className="w-3 h-3" />
                  {owner.email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Owner Button */}
        {owner?.email && (
          <a
            href={getMailtoLink()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium mb-4 w-full transition-opacity hover:opacity-90"
            style={{
              backgroundColor: colors.brand.primary,
              color: '#ffffff'
            }}
          >
            <Mail className="w-4 h-4" />
            Contact Owner
          </a>
        )}

        {/* Check Again Button */}
        <button
          onClick={checkOnboardingStatus}
          disabled={isChecking}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium mb-4 w-full transition-all"
          style={{
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            borderColor: colors.utility.primaryText + '20',
            borderWidth: 1,
            opacity: isChecking ? 0.7 : 1
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Again'}
        </button>

        {/* Last Checked */}
        {lastChecked && (
          <p
            className="text-xs mb-4"
            style={{ color: colors.utility.secondaryText }}
          >
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}

        {/* Logout Link */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
          style={{ color: colors.utility.secondaryText }}
        >
          <LogOut className="w-4 h-4" />
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
};

export default OnboardingPendingPage;
