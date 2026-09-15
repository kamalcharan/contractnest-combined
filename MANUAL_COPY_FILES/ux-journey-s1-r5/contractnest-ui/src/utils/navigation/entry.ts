export const HOME_PATH = '/experience';
const intentKey = 'contractnest_entry_intent';
const legacyKey = 'contractnest_auth_redirect';
const ttl = 30 * 60 * 1000;

/** Internal destinations only; never allow an OAuth/open redirect or an auth loop. */
export function safeDestination(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s\x00-\x1f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://contractnest.invalid');
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://contractnest.invalid' || /[\\\x00-\x20]/.test(pathname) || pathname.startsWith('//')) return null;
    if (/^\/(?:$|login(?:\/|$)|register(?:\/|$)|signup(?:\/|$)|auth(?:\/|$)|forgot-password(?:\/|$)|reset-password(?:\/|$)|select-tenant(?:\/|$)|create-tenant(?:\/|$)|onboarding(?:[-/]|$)|logout(?:\/|$)|start(?:\/|$))/.test(pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

export function rememberDestination(value: unknown) {
  const path = safeDestination(value);
  if (!path) return;
  try { sessionStorage.setItem(intentKey, JSON.stringify({path, at:Date.now()})); } catch { /* Storage restrictions must not block sign-in. */ }
}

export function consumeDestination(now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(intentKey);
    const legacy = sessionStorage.getItem(legacyKey);
    sessionStorage.removeItem(intentKey);
    sessionStorage.removeItem(legacyKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (typeof saved.at === 'number' && now >= saved.at && now - saved.at <= ttl) {
          const path = safeDestination(saved.path);
          if (path) return path;
        }
      } catch { /* Try the existing public-contract handoff. */ }
    }
    return safeDestination(legacy);
  } catch { return null; }
}

export function entryDestination(context: {completed:boolean; lite:boolean; owner:boolean}, intended?: unknown): string {
  if (!context.completed && !context.lite) return context.owner ? '/onboarding' : '/onboarding-pending';
  return safeDestination(intended) || (context.lite ? '/ops/cockpit' : HOME_PATH);
}
