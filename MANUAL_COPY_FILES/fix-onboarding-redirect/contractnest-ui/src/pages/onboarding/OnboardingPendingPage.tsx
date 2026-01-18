// src/pages/onboarding/OnboardingPendingPage.tsx
// Page shown to non-owners when onboarding is not yet complete

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { onboardingService } from '@/services/onboarding.service';
import Lottie from 'lottie-react';
import {
  Mail,
  RefreshCw,
  LogOut,
  Building2,
  User,
  FileText
} from 'lucide-react';

// Inline Lottie animation data for "Setting up workspace"
// This creates a nice gear/settings animation
const settingUpAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: "Setting Up",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Gear 1",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sr",
              sy: 1,
              d: 1,
              pt: { a: 0, k: 8 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: 25 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 45 },
              os: { a: 0, k: 0 },
              ix: 1,
              nm: "Gear"
            },
            {
              ty: "st",
              c: { a: 0, k: [0.31, 0.27, 0.9, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 6 },
              lc: 2,
              lj: 2,
              nm: "Stroke"
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ],
          nm: "Gear Group"
        },
        {
          ty: "gr",
          it: [
            {
              ty: "el",
              d: 1,
              s: { a: 0, k: [20, 20] },
              p: { a: 0, k: [0, 0] },
              nm: "Center"
            },
            {
              ty: "st",
              c: { a: 0, k: [0.31, 0.27, 0.9, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 4 },
              lc: 2,
              lj: 2,
              nm: "Center Stroke"
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ],
          nm: "Center Group"
        }
      ]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Document",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [50], e: [100] }, { t: 30, s: [100], e: [50] }, { t: 60, s: [50] }] },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [100, 110], e: [100, 90] }, { t: 30, s: [100, 90], e: [100, 110] }, { t: 60, s: [100, 110] }] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [60, 60] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "rc",
              d: 1,
              s: { a: 0, k: [40, 50] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 4 },
              nm: "Doc"
            },
            {
              ty: "st",
              c: { a: 0, k: [0.4, 0.35, 0.95, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 3 },
              lc: 2,
              lj: 2,
              nm: "Doc Stroke"
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ],
          nm: "Doc Group"
        }
      ]
    }
  ]
};

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

  // Auto-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkOnboardingStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
    const ownerName = owner.name || 'Admin';
    const userName = user?.first_name || '';
    const workspaceName = currentTenant?.name || 'the workspace';
    const subject = `ContractNest - ${workspaceName} Setup Request`;
    const body = `Hi ${ownerName},\n\nI've joined ${workspaceName} on ContractNest and I'm waiting for the workspace setup to be completed.\n\nCould you please complete the initial onboarding so I can start using the platform?\n\nThanks!\n${userName}`;
    return `mailto:${owner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: colors.utility.primaryBackground,
        background: isDarkMode
          ? `linear-gradient(135deg, ${colors.utility.primaryBackground} 0%, ${colors.brand.primary}10 100%)`
          : `linear-gradient(135deg, ${colors.utility.primaryBackground} 0%, ${colors.brand.primary}08 100%)`
      }}
    >
      <div
        className="max-w-md w-full rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.brand.primary + '20',
          borderWidth: 1
        }}
      >
        {/* Decorative background circles */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: colors.brand.primary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: colors.brand.secondary }}
        />

        {/* ContractNest Logo/Brand */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <FileText
            className="w-6 h-6"
            style={{ color: colors.brand.primary }}
          />
          <span
            className="font-bold text-lg"
            style={{ color: colors.brand.primary }}
          >
            ContractNest
          </span>
        </div>

        {/* Lottie Animation */}
        <div className="relative z-10 mb-2">
          <Lottie
            animationData={settingUpAnimation}
            loop={true}
            style={{
              width: 140,
              height: 140,
              margin: '0 auto',
              filter: isDarkMode ? 'brightness(1.2)' : 'none'
            }}
          />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold mb-2 relative z-10"
          style={{ color: colors.utility.primaryText }}
        >
          Setting Up Workspace
        </h1>

        {/* Subtitle with workspace name */}
        <p
          className="text-lg font-medium mb-4"
          style={{ color: colors.brand.primary }}
        >
          {currentTenant?.name || 'Your Workspace'}
        </p>

        {/* Description */}
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: colors.utility.secondaryText }}
        >
          The workspace administrator is configuring the initial settings.
          You'll be able to access ContractNest once the setup is complete.
        </p>

        {/* Admin Info Card */}
        {owner && (
          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: colors.brand.primary + '15',
              borderWidth: 1
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.utility.secondaryText }}
            >
              Contact Administrator
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + '15' }}
              >
                <User
                  className="w-5 h-5"
                  style={{ color: colors.brand.primary }}
                />
              </div>
              <div>
                <p
                  className="font-semibold"
                  style={{ color: colors.utility.primaryText }}
                >
                  {owner.name || 'Workspace Admin'}
                </p>
                <p
                  className="text-sm flex items-center gap-1"
                  style={{ color: colors.brand.primary }}
                >
                  <Mail className="w-3 h-3" />
                  {owner.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Admin Button */}
        {owner?.email && (
          <a
            href={getMailtoLink()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold mb-3 w-full transition-all hover:opacity-90 hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
              color: '#ffffff'
            }}
          >
            <Mail className="w-5 h-5" />
            Contact Admin
          </a>
        )}

        {/* Check Status Button */}
        <button
          onClick={checkOnboardingStatus}
          disabled={isChecking}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium mb-4 w-full transition-all hover:opacity-80"
          style={{
            backgroundColor: 'transparent',
            color: colors.utility.primaryText,
            borderColor: colors.utility.primaryText + '25',
            borderWidth: 1,
            opacity: isChecking ? 0.7 : 1
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking Status...' : 'Check If Ready'}
        </button>

        {/* Auto-check notice */}
        <p
          className="text-xs mb-4"
          style={{ color: colors.utility.secondaryText }}
        >
          {lastChecked
            ? `Last checked: ${lastChecked.toLocaleTimeString()} • Auto-checking every 30 seconds`
            : 'Auto-checking status every 30 seconds'
          }
        </p>

        {/* Divider */}
        <div
          className="h-px w-full mb-4"
          style={{ backgroundColor: colors.utility.primaryText + '10' }}
        />

        {/* Logout Link */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-70"
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
