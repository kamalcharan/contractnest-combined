// src/utils/auth/sessionActivity.ts
// ONE inactivity clock for the whole browser.
//
// The login lives in localStorage, so every tab on the browser shares it.
// The 15-minute idle limit is measured against the wall clock from the last
// activity in ANY tab — never by a setTimeout countdown, which browsers pause
// in background tabs and while the laptop sleeps (the cause of "it logs out on
// some pages but not others"). Every check compares Date.now() with this one
// timestamp; a stored login with no timestamp, or an old one, is stale.

export const SESSION_IDLE_MS = 15 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'cn_last_activity';

let lastWrite = 0;

export function readLastActivity(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

/** True when nobody has used the app on this browser for SESSION_IDLE_MS. */
export function isSessionStale(now: number = Date.now()): boolean {
  const last = readLastActivity();
  return !last || now - last > SESSION_IDLE_MS;
}

/** Record activity. Throttled to one write per 10 s unless forced. */
export function markActivity(force = false): void {
  const now = Date.now();
  if (!force && now - lastWrite < 10_000) return;
  lastWrite = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    /* storage unavailable — the in-memory session still ends on logout */
  }
}

export function clearActivity(): void {
  lastWrite = 0;
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
}
