// src/components/lite/LiteRouteGate.tsx
//
// Route-level gate for lite tenants. Wraps MainLayout's <Outlet/> — when the
// tenant is lite (AuthContext.liteTier) and the current path is restricted
// for their flavor (liteAccess.ts), it renders the problem-led restricted
// page INSTEAD of the real feature. Deep links and sidebar clicks therefore
// behave identically, with zero per-route wiring.
//
// Full tenants (liteTier === null) pass through untouched — this component
// costs one prefix scan per navigation and nothing else.

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLiteRestriction, getLiteCrossSellCopy } from '../../utils/constants/liteAccess';
import LiteRestrictedPage from './LiteRestrictedPage';

const LiteRouteGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { liteTier } = useAuth();
  const location = useLocation();

  if (liteTier) {
    const copyKey = getLiteRestriction(liteTier, location.pathname);
    if (copyKey) {
      return <LiteRestrictedPage copy={getLiteCrossSellCopy(liteTier, copyKey)} />;
    }
  }

  return <>{children}</>;
};

export default LiteRouteGate;
