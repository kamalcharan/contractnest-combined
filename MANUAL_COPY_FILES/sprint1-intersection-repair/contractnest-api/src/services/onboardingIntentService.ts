// src/services/onboardingIntentService.ts
// Sprint 1 (Tasks 2 + 3 / S8): durable onboarding intent + canonical industry resolution.
//
// - persistSelectedResources / getSelectedResources back the t_tenant_selected_resources
//   table (S8): the tenant's resource picks finally survive the React state they used
//   to die in. purpose='sell' drives the seller catalog seed; purpose='own' drives the
//   buyer registry seed. A 'both' tenant may hold one row per purpose for one template.
// - resolveIndustryTemplates wraps the resolve_industry_resource_templates RPC
//   (recursive parent_id walk + junction + universal templates). Coverage is defined
//   as ≥1 row matched via 'tagged' or 'junction' — universal templates apply to every
//   industry and therefore do NOT count as KT coverage for the no_coverage kill-switch.
//
// Race-condition handling: selections are upserted on the (tenant_id,
// resource_template_id, purpose) unique key, so a double-submitted onboarding
// step updates selected_at instead of erroring or duplicating.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SelectionPurpose = 'sell' | 'own';
export type SelectionSource = 'onboarding' | 'settings' | 'agent';

export interface ResourceSelection {
  resource_template_id: string;
  purpose: SelectionPurpose;
}

export interface ResolvedTemplate {
  resource_template_id: string;
  template_name: string;
  resource_type_id: string;
  matched_industry_id: string | null;
  via: 'tagged' | 'junction' | 'universal';
}

export interface IndustryResolution {
  templates: ResolvedTemplate[];
  /** true when at least one template matched via tagged/junction (universal excluded) */
  hasCoverage: boolean;
  industryIds: string[];
}

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error('onboardingIntentService: Missing SUPABASE_URL or SUPABASE_KEY');
    }
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export async function persistSelectedResources(
  tenantId: string,
  selections: ResourceSelection[],
  source: SelectionSource = 'onboarding',
  createdBy: string | null = null,
): Promise<{ persisted: number; errors: string[] }> {
  if (!selections.length) return { persisted: 0, errors: [] };

  const sb = getAdminClient();
  const rows = selections.map(s => ({
    tenant_id: tenantId,
    resource_template_id: s.resource_template_id,
    purpose: s.purpose,
    source,
    selected_at: new Date().toISOString(),
    created_by: createdBy,
  }));

  const { error } = await sb
    .from('t_tenant_selected_resources')
    .upsert(rows, { onConflict: 'tenant_id,resource_template_id,purpose' });

  if (error) {
    console.error('[onboardingIntent] persistSelectedResources failed:', error.message);
    return { persisted: 0, errors: [error.message] };
  }
  return { persisted: rows.length, errors: [] };
}

export async function getSelectedResources(
  tenantId: string,
  purpose?: SelectionPurpose,
): Promise<Array<{ resource_template_id: string; purpose: SelectionPurpose; source: string; selected_at: string }>> {
  const sb = getAdminClient();
  let query = sb
    .from('t_tenant_selected_resources')
    .select('resource_template_id, purpose, source, selected_at')
    .eq('tenant_id', tenantId);
  if (purpose) query = query.eq('purpose', purpose);

  const { data, error } = await query;
  if (error) {
    console.error('[onboardingIntent] getSelectedResources failed:', error.message);
    return [];
  }
  return data || [];
}

export async function resolveIndustryTemplates(industryIds: string[]): Promise<IndustryResolution> {
  const ids = [...new Set(industryIds.filter(Boolean))];
  if (!ids.length) return { templates: [], hasCoverage: false, industryIds: ids };

  const sb = getAdminClient();
  const { data, error } = await sb.rpc('resolve_industry_resource_templates', {
    p_industry_ids: ids,
  });

  if (error) {
    // Resolution failure must be loud — callers treat it as an error, never as empty success
    throw new Error(`resolve_industry_resource_templates failed: ${error.message}`);
  }

  const templates = (data || []) as ResolvedTemplate[];
  const hasCoverage = templates.some(t => t.via === 'tagged' || t.via === 'junction');
  return { templates, hasCoverage, industryIds: ids };
}
