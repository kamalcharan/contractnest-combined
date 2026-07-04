// ============================================================================
// Onboarding Smart Profile autobuild (Piece 1)
// ============================================================================
// Builds the tenant's Smart Profile in the BACKGROUND during onboarding, from
// the website URL already captured at the branding step. Mirrors the proven
// Settings wizard sequence exactly:
//
//   scrape-website (n8n)  →  save profile  →  generate clusters (n8n)  →  save clusters
//
// So the tenant lands with a real ICP that powers the resource-seeding ranking
// (Piece 2) + smart chips + nomenclature from day one — without a blocking step.
//
// TWO HARD RULES:
//   • HONEST — if the scrape/AI returns no real content, persist NOTHING. No
//     fabricated description, no placeholder keywords. The tenant can still
//     build it by hand in Settings → Business Profile → Smart Profile.
//   • IDEMPOTENT — if the tenant already has a profile, skip (never clobber a
//     hand-authored one, never double-build on a re-submit).
//
// Best-effort: any failure logs and returns { built:false }. It never throws to
// the caller (the route already responded 202) and never blocks onboarding.
// ============================================================================

import { groupsService } from './groupsService';

export interface AutobuildParams {
  authHeader: string;
  tenantId: string;
  websiteUrl: string;
  environment?: string;
}

export interface AutobuildResult {
  built: boolean;
  reason?: string;
}

export async function autobuildSmartProfile(params: AutobuildParams): Promise<AutobuildResult> {
  const { authHeader, tenantId, environment = 'live' } = params;
  const url = (params.websiteUrl || '').trim();
  if (!url) return { built: false, reason: 'no_url' };

  // ── Idempotency: never rebuild over an existing profile ──────────────────
  try {
    const existing: any = await groupsService.getSmartProfile(authHeader, tenantId);
    const sp = existing?.smartprofile || existing?.data?.smartprofile || existing?.data || existing;
    if (sp && (sp.ai_enhanced_description || sp.id)) {
      return { built: false, reason: 'already_exists' };
    }
  } catch {
    // No profile yet (404 / empty) — proceed to build.
  }

  // ── 1) Scrape + AI-enhance the website (n8n) ─────────────────────────────
  let scraped: any;
  try {
    scraped = await groupsService.scrapeWebsiteForSmartProfile(authHeader, tenantId, url, environment);
  } catch (e: any) {
    console.warn('[SP autobuild] scrape failed — persisting nothing:', e?.message);
    return { built: false, reason: 'scrape_failed' };
  }

  const description = String(scraped?.ai_enhanced_description || '').trim();
  const keywords: string[] = Array.isArray(scraped?.suggested_keywords) ? scraped.suggested_keywords : [];

  // HONEST GUARD: no real AI content → do NOT fabricate anything.
  if (!description) {
    console.warn('[SP autobuild] scrape returned no description — persisting nothing');
    return { built: false, reason: 'no_description' };
  }

  // ── 2) Persist the profile ───────────────────────────────────────────────
  try {
    await groupsService.saveSmartProfile(authHeader, tenantId, {
      ai_enhanced_description: description,
      approved_keywords: keywords,
      website_url: url,
      generation_method: 'website',
      profile_type: 'business',
    });
  } catch (e: any) {
    console.warn('[SP autobuild] saveSmartProfile failed:', e?.message);
    return { built: false, reason: 'save_failed' };
  }

  // ── 3) Generate + 4) save semantic clusters (best-effort) ────────────────
  // The profile is already saved; clusters only enrich it, so a failure here
  // must not undo the profile — it just means fewer ranking signals.
  try {
    const gen: any = await groupsService.generateSmartProfileClusters(authHeader, tenantId, description, keywords, environment);
    const clusters = (gen?.clusters || [])
      .map((c: any) => ({
        primary_term: c.primary_term,
        related_terms: c.related_terms || [],
        category: c.category || '',
        confidence_score: c.confidence_score ?? 0.9,
        is_active: true,
      }))
      .filter((c: any) => c.primary_term && String(c.primary_term).trim());
    if (clusters.length > 0) {
      await groupsService.saveSmartProfileClusters(authHeader, tenantId, clusters);
    }
  } catch (e: any) {
    console.warn('[SP autobuild] clusters step failed (profile still saved):', e?.message);
  }

  return { built: true };
}

export default { autobuildSmartProfile };
