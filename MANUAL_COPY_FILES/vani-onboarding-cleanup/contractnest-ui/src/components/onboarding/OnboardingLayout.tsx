// src/components/onboarding/OnboardingLayout.tsx
// Frame for the VaNi onboarding screens under /onboarding/* (Building → Your
// prices → Your terms → How you get paid → Your assets → Your team → Your
// tags → Workspace ready). The /start/* screens have their own ExpressShell.
//
// Header = CN badge, the current step's label and blurb, the shared
// JourneyRail (same model the express screens draw), a compact counter on
// narrow screens, and Exit. Every screen carries its own Back / Skip /
// Continue, so the header has none.
//
// The legacy header (11-step dots, its own Continue / Skip / Back, business
// profile data gathering for the legacy screens) was removed with those
// screens (batch vani-onboarding-cleanup).

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { useOnboarding } from '@/hooks/queries/useOnboarding';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import JourneyRail from './JourneyRail';
import { resolveJourney, normaliseJourneyPersona } from './journey';
import { readPendingSideActivation } from '@/utils/perspective/sideActivation';

const OnboardingLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, currentTheme } = useTheme();
  const { currentTenant, markOnboardingComplete } = useAuth();
  const { isLoading, isOnboardingComplete } = useOnboarding();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // The rail needs the persona to know whether this tenant sees a pricing
  // step or an assets step. With isOnboarding: true the profile hook skips
  // its own auto-fetch, so fetch once here — this layout is the parent route
  // and mounts once for the whole session.
  const { formData: tenantFormData, fetchProfile } = useTenantProfile({ isOnboarding: true });
  useEffect(() => {
    fetchProfile?.();
    // fetchProfile is stable in the existing hook; re-running would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  // A side-activation walk (perspective toggle → lite flow) shows the
  // ACTIVATED side's journey, not the stored persona's: persona is already
  // 'both' by then, and the 'both' rail promises steps an Expense activation
  // never visits.
  const activationSide = readPendingSideActivation();
  const personaSource = tenantFormData as { persona?: unknown; business_type_id?: unknown } | undefined;
  const journeyPersona =
    activationSide === 'expense' ? 'buyer' :
    activationSide === 'revenue' ? 'seller' :
    normaliseJourneyPersona(personaSource?.persona ?? personaSource?.business_type_id);
  const journey = resolveJourney(location.pathname, journeyPersona);

  // A finished tenant who lands on an onboarding screen goes to the app —
  // except during a side-activation walk (it runs AFTER onboarding finished
  // and walks these same screens) and on Workspace ready itself, which is
  // what marks onboarding finished.
  const isDonePage = location.pathname === '/onboarding/done';
  useEffect(() => {
    if (!isLoading && isOnboardingComplete && !activationSide && !isDonePage) {
      markOnboardingComplete();
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isOnboardingComplete, activationSide, isDonePage]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: colors.utility.primaryBackground }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.brand.primary }} />
          <p style={{ color: colors.utility.secondaryText }}>Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const current = journey ? journey.steps[journey.currentIndex] : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.utility.primaryBackground }}>
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b"
        style={{
          backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}
      >
        {/* Left: badge + current step */}
        <div className="flex items-center gap-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: colors.brand.primary }}
          >
            CN
          </div>
          <div>
            <h1 className="text-base font-semibold" style={{ color: colors.utility.primaryText }}>
              {current?.label || 'Setting up your workspace'}
            </h1>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              {current?.blurb || ''}
            </p>
          </div>
        </div>

        {/* Center: the journey rail */}
        {journey && (
          <div className="hidden md:flex items-center">
            <JourneyRail
              steps={journey.steps}
              currentIndex={journey.currentIndex}
              compact
              accent={colors.brand.primary}
              done={colors.semantic.success}
              muted={colors.utility.secondaryText}
              onAccent="#ffffff"
            />
          </div>
        )}

        {/* Right: counter on narrow screens (the rail is hidden there) + Exit */}
        <div className="flex items-center gap-2">
          {journey && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full md:hidden"
              style={{ backgroundColor: colors.brand.primary + '15', color: colors.brand.primary }}
            >
              {journey.currentIndex + 1} / {journey.steps.length}
            </span>
          )}
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            title="Exit onboarding — you'll pick up here next time"
            aria-label="Exit onboarding"
          >
            <X className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="h-full pb-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
