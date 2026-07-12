// src/contexts/AuthContext.tsx
// Session lifecycle: restore on launch, login, workspace selection, logout.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, AuthUser, Tenant } from '../types/api';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/apiClient';
import { clearSession, loadSession, persistSession, Session } from '../services/session';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface LoginResult {
  ok: boolean;
  /** Registration exists but workspace onboarding is incomplete — must finish on the web */
  needsWorkspaceSetup?: boolean;
  error?: string;
}

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  tenant: Tenant | null;
  tenants: Tenant[];
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pickDefaultTenant = (tenants: Tenant[]): Tenant | null =>
  tenants.find((t) => t.is_default) ?? tenants[0] ?? null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setStatus('signedOut');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored) {
        setStatus('signedOut');
        return;
      }
      // Show the app immediately with the cached session, then validate in the background.
      setSession(stored);
      setStatus('signedIn');
      try {
        const freshUser = await authService.getUser();
        if (cancelled) return;
        if (freshUser?.id) {
          const updated = { ...stored, user: { ...stored.user, ...freshUser } };
          setSession(updated);
          await persistSession(updated);
        }
      } catch (err) {
        // 401 is handled by the unauthorized handler; network errors keep the cached session (offline-friendly)
        if (err instanceof ApiError && err.status === 401 && !cancelled) {
          await clearSession();
          setSession(null);
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authService.login(email.trim().toLowerCase(), password);
      if (!response?.access_token) {
        return { ok: false, error: 'Unexpected response from server. Please try again.' };
      }
      const tenants = response.tenants ?? [];
      if (response.needs_workspace_setup || tenants.length === 0) {
        return { ok: false, needsWorkspaceSetup: true };
      }
      const next: Session = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
        tenant: pickDefaultTenant(tenants),
        tenants,
      };
      await persistSession(next);
      setSession(next);
      setStatus('signedIn');
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return { ok: false, error: 'Invalid email or password.' };
        return { ok: false, error: err.message };
      }
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.signout();
    } catch {
      // best-effort — clear locally regardless (same as web)
    }
    await clearSession();
    setSession(null);
    setStatus('signedOut');
  }, []);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      if (!session) return;
      const tenant = session.tenants.find((t) => t.id === tenantId);
      if (!tenant || tenant.id === session.tenant?.id) return;
      const next = { ...session, tenant };
      setSession(next);
      await persistSession(next);
    },
    [session]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      status,
      user: session?.user ?? null,
      tenant: session?.tenant ?? null,
      tenants: session?.tenants ?? [],
      login,
      logout,
      switchTenant,
    }),
    [status, session, login, logout, switchTenant]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
