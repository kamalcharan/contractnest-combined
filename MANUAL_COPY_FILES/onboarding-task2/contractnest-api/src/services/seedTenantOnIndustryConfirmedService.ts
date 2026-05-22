// src/services/seedTenantOnIndustryConfirmedService.ts
// Onboarding seed skill — runs once when a tenant confirms their industry.
//
// What it does (in order):
//   1. Idempotency guard — checks existing data, skips if already seeded
//   2. Clone KT (global m_cat_blocks) → tenant-scoped blocks (is_live=false, is_seed=true)
//   3. Buyer/both only: create placeholder facility hierarchy via client-asset-registry edge fn
//   4. Seed sequence numbers for both live + test environments (silent, non-fatal)
//
// Auth model:
//   The API server uses only the anon key (SUPABASE_KEY). The anon-key client
//   is sufficient for reads against permissive-SELECT tables. Writes to RLS-protected
//   tables use the client-asset-registry edge function, which has the service role key.

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { SEQUENCE_SEED_DATA } from '../seeds';

// Internal server-to-edge-function auth token.
// Supabase edge functions require a valid (non-expired) JWT.
// User session JWTs expire in ~1 hour and are not suitable for server-side calls.
// The anon key is a permanent JWT issued by Supabase — safe for internal API calls
// where tenant isolation is enforced via x-tenant-id header + service role DB client.
function getServiceAuthToken(): string {
  const anonKey = process.env.SUPABASE_KEY || '';
  return `Bearer ${anonKey}`;
}

const EDGE_BASE_URL = () =>
  `${process.env.SUPABASE_URL}/functions/v1/client-asset-registry`;

export interface SeedIndustryInput {
  tenantId: string;
  industryId: string;
  businessType: 'buyer' | 'seller' | 'both';
  authToken: string;
}

export interface SeedIndustryResult {
  success: boolean;
  alreadySeeded: boolean;
  catalogBlocksSeeded: number;
  facilityNodesSeeded: number;
  sequencesSeeded: boolean;
  errors: string[];
}

function buildSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('[seedTenantOnIndustryConfirmed] Missing SUPABASE_URL or Supabase key');
  }
  // Anon key is sufficient for reads against permissive-SELECT tables.
  // Writes use edge function proxies (clientAssetRegistryService) which have service role.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function seedTenantOnIndustryConfirmed(
  input: SeedIndustryInput
): Promise<SeedIndustryResult> {
  const { tenantId, industryId, businessType, authToken } = input;
  const supabase = buildSupabase();
  const errors: string[] = [];

  console.log('[seedTenantOnIndustryConfirmed] Starting', { tenantId, industryId, businessType });

  // ── Step 1: Application-level idempotency ────────────────────────────────
  // Check existing data rather than a separate idempotency key table.
  // This is safe because both checks below are inside the seed logic.
  let alreadySeeded = false;

  // ── Step 2: Clone global KT blocks for this industry ────────────────────
  let catalogBlocksSeeded = 0;
  const tagsFilter = JSON.stringify([industryId]);

  const { count: existingSeedCount } = await supabase
    .from('m_cat_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_seed', true)
    .filter('tags', 'cs', tagsFilter);

  if ((existingSeedCount ?? 0) > 0) {
    catalogBlocksSeeded = existingSeedCount ?? 0;
    console.log('[seedTenantOnIndustryConfirmed] KT blocks already cloned, skipping');
  } else {
    const { data: ktBlocks, error: fetchError } = await supabase
      .from('m_cat_blocks')
      .select('*')
      .is('tenant_id', null)
      .filter('tags', 'cs', tagsFilter);

    if (fetchError) {
      errors.push(`KT blocks fetch failed: ${fetchError.message}`);
    } else if (ktBlocks && ktBlocks.length > 0) {
      // Writes to m_cat_blocks require service role — uses direct insert.
      // Migration 003 added is_seed + tenant_id; RLS for m_cat_blocks allows
      // service_role writes. If this fails, catalogBlocksSeeded stays 0 (non-fatal
      // while KT content is being built by admin).
      const tenantBlocks = ktBlocks.map(
        ({ created_at, updated_at, created_by, updated_by, ...block }) => ({
          ...block,
          id: randomUUID(),
          tenant_id: tenantId,
          is_live: false,
          is_seed: true,
          is_active: true,
          created_by: null,
          updated_by: null,
        })
      );

      const { error: insertError } = await supabase.from('m_cat_blocks').insert(tenantBlocks);

      if (insertError) {
        // Non-fatal: KT may be empty or service role key not configured.
        // Facility and sequence seeding continues independently.
        console.warn('[seedTenantOnIndustryConfirmed] KT block clone skipped:', insertError.message);
      } else {
        catalogBlocksSeeded = tenantBlocks.length;
        console.log(`[seedTenantOnIndustryConfirmed] Cloned ${catalogBlocksSeeded} KT blocks`);
      }
    } else {
      console.log('[seedTenantOnIndustryConfirmed] No global KT blocks found for:', industryId);
    }
  }

  // ── Step 3: Facility placeholders (buyer/both only) ──────────────────────
  // Uses clientAssetRegistryService which proxies to the edge function.
  // The edge function has the service role key and handles RLS correctly.
  let facilityNodesSeeded = 0;
  let existingPlaceholderCount = 0;
  const isBuyer = businessType === 'buyer' || businessType === 'both';

  if (isBuyer) {
    const { count: placeholderCount } = await supabase
      .from('t_client_asset_registry')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('ownership_type', 'self')
      .filter('specifications->>is_placeholder', 'eq', 'true');

    existingPlaceholderCount = placeholderCount ?? 0;

    if (existingPlaceholderCount > 0) {
      facilityNodesSeeded = existingPlaceholderCount;
      console.log('[seedTenantOnIndustryConfirmed] Facility placeholders already exist, skipping');
    } else {
      const { data: templates, error: templateError } = await supabase
        .from('m_facility_hierarchy_templates')
        .select('*')
        .eq('industry_id', industryId)
        .eq('is_default', true)
        .order('level', { ascending: true });

      if (templateError) {
        errors.push(`Facility hierarchy fetch failed: ${templateError.message}`);
      } else if (templates && templates.length > 0) {
        const levelToId: Record<number, string> = {};

        for (const template of templates) {
          const nodeId = randomUUID();
          const parentId = template.level > 1 ? (levelToId[template.level - 1] ?? null) : null;

          try {
            // Use anon key as Bearer token — permanent JWT accepted by Supabase
            // infrastructure. Tenant context enforced via x-tenant-id header.
            await axios.post(
              EDGE_BASE_URL(),
              {
                id: nodeId,
                ownership_type: 'self',
                owner_contact_id: null,
                resource_type_id: 'asset',
                name: template.label,
                status: 'active',
                condition: 'good',
                criticality: 'low',
                parent_asset_id: parentId,
                is_live: false,
                specifications: {
                  entity_type: template.entity_type,
                  industry_id: industryId,
                  hierarchy_level: template.level,
                  is_placeholder: true,
                },
              },
              {
                headers: {
                  Authorization: getServiceAuthToken(),
                  'x-tenant-id': tenantId,
                  'Content-Type': 'application/json',
                },
                timeout: 15000,
              }
            );

            levelToId[template.level] = nodeId;
            facilityNodesSeeded++;
          } catch (nodeError: any) {
            const msg =
              nodeError.response?.data?.error ||
              nodeError.response?.data?.message ||
              nodeError.message;
            errors.push(`Facility node '${template.entity_type}' failed: ${msg}`);
          }
        }

        console.log(`[seedTenantOnIndustryConfirmed] Created ${facilityNodesSeeded} facility nodes`);
      } else {
        console.log('[seedTenantOnIndustryConfirmed] No hierarchy templates for industry:', industryId);
      }
    }
  }

  // Mark as already seeded if all application-level checks showed existing data
  if ((existingSeedCount ?? 0) > 0 && (!isBuyer || existingPlaceholderCount > 0)) {
    alreadySeeded = true;
  }

  // ── Step 4: Seed sequence numbers (both environments, non-fatal) ─────────
  let sequencesSeeded = false;
  try {
    for (const environment of ['live', 'test']) {
      await axios.post(
        `${process.env.SUPABASE_URL}/functions/v1/sequences/seed`,
        { seedData: SEQUENCE_SEED_DATA },
        {
          headers: {
            Authorization: authToken,
            'x-tenant-id': tenantId,
            'x-environment': environment,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    }
    sequencesSeeded = true;
    console.log('[seedTenantOnIndustryConfirmed] Sequences seeded for live + test');
  } catch (seqError: any) {
    console.warn(
      '[seedTenantOnIndustryConfirmed] Sequences seed skipped (non-fatal):',
      seqError.response?.data?.error || seqError.message
    );
  }

  const result: SeedIndustryResult = {
    success: errors.length === 0,
    alreadySeeded,
    catalogBlocksSeeded,
    facilityNodesSeeded,
    sequencesSeeded,
    errors,
  };

  console.log('[seedTenantOnIndustryConfirmed] Done', {
    success: result.success,
    catalogBlocksSeeded,
    facilityNodesSeeded,
    sequencesSeeded,
    errorCount: errors.length,
  });

  return result;
}
