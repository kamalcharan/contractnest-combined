import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { consumeDestination, entryDestination } from './entry';

/** Mounted only after auth and tenant resolution; consume intent once, after onboarding. */
export default function EntryRedirect() {
  const {hasCompletedOnboarding, liteTier, currentTenant} = useAuth();
  const navigate = useNavigate();
  const dispatched = useRef(false);
  useEffect(() => {
    if (dispatched.current) return;
    dispatched.current = true;
    const allowed = hasCompletedOnboarding || !!liteTier;
    navigate(entryDestination({completed:hasCompletedOnboarding,lite:!!liteTier,owner:!!currentTenant?.is_owner}, allowed ? consumeDestination() : null), {replace:true});
  }, [hasCompletedOnboarding, liteTier, currentTenant?.is_owner, navigate]);
  return <div role="status" className="p-6">Opening your workspace…</div>;
}
