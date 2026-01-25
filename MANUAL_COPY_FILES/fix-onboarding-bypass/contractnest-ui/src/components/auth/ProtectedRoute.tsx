// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean;
  requireOnboarding?: boolean; // New prop to check onboarding status
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireTenant = true,
  requireOnboarding = true // Default to requiring onboarding
}) => {
  const { isAuthenticated, isLoading, currentTenant, hasCompletedOnboarding } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If tenant is required but not selected, redirect to tenant selection
  if (requireTenant && !currentTenant) {
    return <Navigate to="/select-tenant" state={{ from: location }} replace />;
  }

  // SAFETY NET: Check onboarding status if required
  // Skip this check for onboarding-related paths to avoid redirect loops
  if (requireOnboarding && currentTenant) {
    const isOnboardingPath = location.pathname.startsWith('/onboarding');
    const isOnboardingPendingPath = location.pathname === '/onboarding-pending';

    // Don't redirect if already on onboarding paths
    if (!isOnboardingPath && !isOnboardingPendingPath && !hasCompletedOnboarding) {
      console.log('[ProtectedRoute] Onboarding not complete, redirecting...');

      // Check if user is owner
      if (currentTenant.is_owner) {
        console.log('[ProtectedRoute] Owner needs onboarding - redirecting to /onboarding');
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
      } else {
        console.log('[ProtectedRoute] Non-owner waiting for onboarding - redirecting to /onboarding-pending');
        return <Navigate to="/onboarding-pending" state={{ from: location }} replace />;
      }
    }
  }

  // If authenticated (and tenant selected if required), render children
  return <>{children}</>;
};

export default ProtectedRoute;
