//src/components/misc/MiscPageWrapper.tsx
// src/components/misc/MiscPageWrapper.tsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { useSessionConflict } from '../../hooks/useSessionConflict';
import { isBrowserSupported } from '../../utils/browserDetection';
import {
  NoInternetPage,
  MaintenancePage,
  SessionConflictPage,
  BrowserNotSupportedPage
} from '../../pages/misc';

interface MiscPageWrapperProps {
  children: React.ReactNode;
}

const MiscPageWrapper: React.FC<MiscPageWrapperProps> = ({ children }) => {
  const { isOnline } = useNetworkStatus();
  const { isMaintenanceMode } = useMaintenanceMode();
  const { hasSessionConflict } = useSessionConflict();
  const location = useLocation();

  // Browser support check
  const [browserSupported, setBrowserSupported] = useState<boolean>(true);

  useEffect(() => {
    // Check browser support on mount
    const supported = isBrowserSupported();
    setBrowserSupported(supported);

    if (!supported) {
      console.log('Browser not supported. Please use Chrome or Edge.');
    }
  }, []);

  // Skip checks for misc pages themselves AND auth pages
  const isMiscPage = location.pathname.startsWith('/misc/');
  const isAuthPage = location.pathname.startsWith('/login') ||
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/forgot-password');

  if (isMiscPage || isAuthPage) {
    return <>{children}</>;
  }

  // Check for browser support first
  if (!browserSupported) {
    return <BrowserNotSupportedPage />;
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

  return <>{children}</>;
};

export default MiscPageWrapper;
