// src/services/session.ts
// In-memory session snapshot + AsyncStorage persistence.
// The API client reads the in-memory copy synchronously; AuthContext hydrates it at startup.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './config';
import { AuthUser, Tenant } from '../types/api';

export interface Session {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  tenant: Tenant | null;
  tenants: Tenant[];
}

let current: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

export const getSession = () => current;

export const onSessionChange = (fn: (s: Session | null) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const notify = () => listeners.forEach((fn) => fn(current));

export async function persistSession(session: Session): Promise<void> {
  current = session;
  notify();
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.authToken, session.accessToken],
    [STORAGE_KEYS.refreshToken, session.refreshToken ?? ''],
    [STORAGE_KEYS.user, JSON.stringify(session.user)],
    [STORAGE_KEYS.tenantId, session.tenant?.id ?? ''],
    [STORAGE_KEYS.currentTenant, session.tenant ? JSON.stringify(session.tenant) : ''],
    [STORAGE_KEYS.tenants, JSON.stringify(session.tenants ?? [])],
  ]);
}

export async function loadSession(): Promise<Session | null> {
  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.user,
    STORAGE_KEYS.currentTenant,
    STORAGE_KEYS.tenants,
  ]);
  const map = Object.fromEntries(entries);
  const token = map[STORAGE_KEYS.authToken];
  const userRaw = map[STORAGE_KEYS.user];
  if (!token || !userRaw) return null;
  try {
    const session: Session = {
      accessToken: token,
      refreshToken: map[STORAGE_KEYS.refreshToken] || undefined,
      user: JSON.parse(userRaw),
      tenant: map[STORAGE_KEYS.currentTenant] ? JSON.parse(map[STORAGE_KEYS.currentTenant]!) : null,
      tenants: map[STORAGE_KEYS.tenants] ? JSON.parse(map[STORAGE_KEYS.tenants]!) : [],
    };
    current = session;
    notify();
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  current = null;
  notify();
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
