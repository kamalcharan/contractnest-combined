// ============================================================================
// storefront/api — public, storefront-key-gated client + shared types
// ============================================================================
// Used by the package page (/p/:key), the checkout (/buy/:key) and the widget
// frame (/w/:key). Bare axios, no auth interceptors: the visitor is not logged
// in. The opaque storefront key in the URL is the grant (migration
// business-model-v2/038); the API resolves seller + packages from it.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://contractnest-api-production.up.railway.app';
const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
const unwrap = (res: any) => res?.data?.data ?? res?.data;

export type CardView = 'button' | 'card' | 'catalog' | 'bubble';
export type CardShape = 'pill' | 'rounded' | 'square';
export type CardOpen = 'overlay' | 'tab';

export interface CardStyle {
  view: CardView;
  label: string;
  color: string;
  shape: CardShape;
  open: CardOpen;
}

export interface PackageLine {
  name: string; quantity: number; unit_price: number; total_price: number;
  billing_cycle: string | null; category: string | null;
}

export interface StorefrontPackage {
  id: string;            // the version being sold today
  family_id: string;     // stable id — what a storefront stores and a checkout sends
  name: string;
  description: string | null;
  cover_image: string | null;
  currency: string;
  price: number;
  term: { value: number | null; unit: string | null };
  lines: PackageLine[];
}

export interface FaqRow { q: string; a: string }

export interface StorefrontPublic {
  key: string;
  name: string;
  seller: { name: string; logo_url: string | null; primary_color: string | null; secondary_color: string | null; city: string | null };
  card_style: CardStyle;
  faq: FaqRow[];
  packages: StorefrontPackage[];
  vani_enabled: boolean;
}

export interface OtpIssued { otp_id: string; expires_in: number; delivered: boolean; dev_code?: string; delivery_note?: string }
export interface OtpVerified { phone: string; verify_token: string }
export interface PurchaseResult {
  contract_id: string; contract_number: string; contact_id: string;
  cnak: string | null; secret: string | null; review_path: string | null;
}

export const storefrontApi = {
  async resolve(key: string, preview = false): Promise<StorefrontPublic> {
    const res = await publicClient.get(`/api/storefront/${encodeURIComponent(key)}${preview ? '?preview=1' : ''}`);
    const sf = unwrap(res)?.storefront;
    if (!sf?.packages) throw new Error('This link is not available');
    return sf as StorefrontPublic;
  },
  start(key: string) {
    return publicClient.post(`/api/storefront/${encodeURIComponent(key)}/start`).catch(() => undefined);
  },
  async otpIssue(key: string, phone: string): Promise<OtpIssued> {
    return unwrap(await publicClient.post(`/api/storefront/${encodeURIComponent(key)}/otp`, { phone })) as OtpIssued;
  },
  async otpVerify(key: string, otpId: string, code: string): Promise<OtpVerified> {
    return unwrap(await publicClient.post(`/api/storefront/${encodeURIComponent(key)}/otp/verify`, { otp_id: otpId, code })) as OtpVerified;
  },
  /** After OTP: the buyer is a lead now, whether or not they finish (fire and forget). */
  identify(key: string, body: { name: string; phone: string; otp_token: string; template_id?: string; email?: string; company?: string; channel?: string }) {
    return publicClient.post(`/api/storefront/${encodeURIComponent(key)}/identify`, body).catch(() => undefined);
  },
  async purchase(key: string, body: { name: string; phone: string; otp_token: string; template_id?: string; email?: string; company?: string }): Promise<PurchaseResult> {
    return unwrap(await publicClient.post(`/api/storefront/${encodeURIComponent(key)}/purchase`, body)) as PurchaseResult;
  },
};

/** VaNi on the tenant's site (migration 040): key = vn-… (site) or sf-… (storefront). */
export const vaniSiteApi = {
  async resolve(key: string, storefrontKey: string | null): Promise<any> {
    const res = await publicClient.get(`/api/vani-site/${encodeURIComponent(key)}${storefrontKey ? `?storefront=${encodeURIComponent(storefrontKey)}` : ''}`);
    return unwrap(res);
  },
  async chat(key: string, body: { message: string; session_id?: string | null; storefront_key?: string; page_url?: string; history?: Array<{ role: 'user' | 'assistant'; text: string }> }): Promise<any> {
    return unwrap(await publicClient.post(`/api/vani-site/${encodeURIComponent(key)}/chat`, body));
  },
  async lead(key: string, body: { session_id?: string | null; name: string; phone: string; email?: string; company?: string }): Promise<any> {
    return unwrap(await publicClient.post(`/api/vani-site/${encodeURIComponent(key)}/lead`, body));
  },
};

/** The API's error envelope carries the human message; surface it as-is. */
export const errorText = (e: any, fallback: string): string =>
  e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || fallback;

export const fmtMoney = (n: number, currency?: string | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const termLabel = (t?: { value: number | null; unit: string | null } | null) =>
  t?.value && t?.unit ? `${t.value} ${t.value === 1 ? String(t.unit).replace(/s$/, '') : t.unit}` : null;

export const radiusFor = (shape?: CardShape | string | null) =>
  ({ pill: '999px', rounded: '10px', square: '3px' } as Record<string, string>)[shape || 'pill'] || '999px';

/** Text on a coloured button: white on dark colours, ink on light ones. */
export const inkOn = (hex?: string | null): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72 ? '#1a1816' : '#ffffff';
};

export const DEFAULT_CARD_STYLE: CardStyle = { view: 'button', label: 'Buy now', color: '#4F46E5', shape: 'pill', open: 'overlay' };

/** Merge a partial style (query string, patch) over a base. Unknown values are ignored. */
export const mergeCardStyle = (base: Partial<CardStyle> | null | undefined, patch: Partial<Record<keyof CardStyle, string | null | undefined>>): CardStyle => {
  const out: CardStyle = { ...DEFAULT_CARD_STYLE, ...(base || {}) } as CardStyle;
  if (patch.view && ['button', 'card', 'catalog', 'bubble'].includes(patch.view)) out.view = patch.view as CardView;
  if (patch.label && patch.label.trim()) out.label = patch.label.trim().slice(0, 40);
  if (patch.color && /^#[0-9a-f]{6}$/i.test(patch.color)) out.color = patch.color;
  if (patch.shape && ['pill', 'rounded', 'square'].includes(patch.shape)) out.shape = patch.shape as CardShape;
  if (patch.open && ['overlay', 'tab'].includes(patch.open)) out.open = patch.open as CardOpen;
  return out;
};

/** Public URLs for a storefront on this origin. */
export const storefrontUrls = (key: string, origin = window.location.origin) => ({
  page: `${origin}/p/${key}`,
  buy: `${origin}/buy/${key}`,
  widget: `${origin}/w/${key}`,
  chat: `${origin}/vani-chat/${key}`,
  embed: `${origin}/embed.js`,
});
