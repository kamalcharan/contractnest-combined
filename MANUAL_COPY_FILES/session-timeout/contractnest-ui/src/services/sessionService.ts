// src/services/sessionService.ts
import { v4 as uuidv4 } from 'uuid';

// Old keys written by the retired per-tab conflict check. Removed on every
// clear so a browser that ran the old code carries nothing stale.
const LEGACY_PREFIXES = ['active_session_', 'session_timestamp_', 'session_conflict_'];

export function clearLegacySessionKeys(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && LEGACY_PREFIXES.some(p => key.startsWith(p))) stale.push(key);
    }
    stale.forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem('session_conflict');
  } catch {
    /* storage unavailable */
  }
}

export const sessionService = {
  /** A per-tab id (sent to the API as a header). No longer claims the user. */
  initializeSession(): string {
    let sessionId = sessionStorage.getItem('session_id');

    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('session_id', sessionId);
      sessionStorage.setItem('session_created_at', Date.now().toString());
    }

    return sessionId;
  },

  clearSession(): void {
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem('session_created_at');
    clearLegacySessionKeys();
  },

  /** Retired: tabs on one browser share one session. */
  checkForConflict(_userId: string): boolean {
    return false;
  },

  getSessionAge(): number {
    const createdAt = sessionStorage.getItem('session_created_at');
    if (!createdAt) return 0;
    return Date.now() - parseInt(createdAt, 10);
  },

  isInGracePeriod(): boolean {
    return this.getSessionAge() < 2000;
  },

  /** Retired: nothing to take over. */
  forceSessionTakeover(_userId: string): void {
    clearLegacySessionKeys();
  }
};
