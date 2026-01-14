//src/components/misc/MiscPageWrapper.tsx
// src/components/misc/MiscPageWrapper.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { useSessionConflict } from '../../hooks/useSessionConflict';
import {
  NoInternetPage,
  MaintenancePage,
  SessionConflictPage
} from '../../pages/misc';

interface MiscPageWrapperProps {
  children: React.ReactNode;
}

const MiscPageWrapper: React.FC<MiscPageWrapperProps> = ({ children }) => {
  const { isOnline } = useNetworkStatus();
  const { isMaintenanceMode } = useMaintenanceMode();
  const { hasSessionConflict } = useSessionConflict();
  const location = useLocation();

  // Skip checks for misc pages themselves AND auth pages
  const isMiscPage = location.pathname.startsWith('/misc/');
  const isAuthPage = location.pathname.startsWith('/login') ||
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/forgot-password');

  if (isMiscPage || isAuthPage) {
    return <>{children}</>;
  }

  // Check for various conditions
  if (!isOnline) {
    return <NoInternetPage />;
  }

  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

  if (hasSessionConflict) {
    return <SessionConflictPage />;
  }

  // Browser check removed - now using soft warning banner instead
  // BrowserWarningBanner component handles the warning display

  return <>{children}</>;
};

export default MiscPageWrapper;
