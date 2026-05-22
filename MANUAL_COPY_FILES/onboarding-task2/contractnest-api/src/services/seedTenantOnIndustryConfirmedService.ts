// src/services/seedTenantOnIndustryConfirmedService.ts
// Onboarding seed skill — runs once when a tenant confirms their industry.
//
// What it does (in order):
//   1. Idempotency guard — returns cached result if already run for this tenant+industry
//   2. Clone KT (global m_cat_blocks) → tenant-scoped blocks (is_live=false, is_seed=true)
//   3. Buyer/both only: create placeholder facility hierarchy in t_client_asset_registry
//   4. Seed sequence numbers for both live + test environments (silent, non-fatal)
//   5. Store idempotency key so re-runs are no-ops

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { SEQUENCE_SEED_DATA } from '../seeds';

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

const IDEMPOTENCY_ENDPOINT = 'seed/tenant/industry-confirmed';

function buildSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallbackKey = process.env.SUPABASE_KEY;
  const key = serviceRoleKey || fallbackKey;

  if (!url || !key) {
    throw new Error('[seedTenantOnIndustryConfirmed] Missing SUPABASE_URL or service role key');
  }

  // Warn loudly if falling back to anon key — RLS will block writes
  if (!serviceRoleKey) {
    console.warn(
      '[seedTenantOnIndustryConfirmed] WARNING: SUPABASE_SERVICE_ROLE_KEY not set. ' +
      'Falling back to SUPABASE_KEY (anon). RLS policies may block inserts. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your .env file.'
    );
  }

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function seedTenantOnIndustryConfirmed(
  input: SeedIndustryInput
): Promise<SeedIndustryResult> {
  const { tenantId, industryId, businessType, authToken } = input;
  const supabase = buildSupabase();
  const errors: string[] = [];

  console.log('[seedTenantOnIndustryConfirmed] Starting', { tenantId, industryId, businessType });

  // ── Step 1: Idempotency guard ────────────────────────────────────────────
  const idempotencyKey = `seed-industry-confirmed-${industryId}`;
  const { data: existingRecord } = await supabase
    .from('t_idempotency_keys')
    .select('response_body')
    .eq('idempotency_key', idempotencyKey)
    .eq('tenant_id', tenantId)
    .eq('endpoint', IDEMPOTENCY_ENDPOINT)
    .maybeSingle();

  if (existingRecord) {
    console.log('[seedTenantOnIndustryConfirmed] Already seeded, returning cached result');
    return { ...existingRecord.response_body, alreadySeeded: true };
  }

  // ── Step 2: Clone global KT blocks for this industry ────────────────────
  let catalogBlocksSeeded = 0;

  // Only clone if this tenant has no seed blocks yet for this industry
  // Use .filter() with explicit JSON string — .contains() serializes incorrectly for JSONB columns
  const tagsFilter = JSON.stringify([industryId]);

  const { count: existingSeedCount } = await supabase
    .from('m_cat_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_seed', true)
    .filter('tags', 'cs', tagsFilter);

  if ((existingSeedCount ?? 0) === 0) {
    const { data: ktBlocks, error: fetchError } = await supabase
      .from('m_cat_blocks')
      .select('*')
      .is('tenant_id', null)
      .filter('tags', 'cs', tagsFilter);

    if (fetchError) {
      errors.push(`KT blocks fetch failed: ${fetchError.message}`);
    } else if (ktBlocks && ktBlocks.length > 0) {
      const tenantBlocks = ktBlocks.map(({ created_at, updated_at, created_by, updated_by, ...block }) => ({
        ...block,
        id: randomUUID(),
        tenant_id: tenantId,
        is_live: false,
        is_seed: true,
        is_active: true,
        created_by: null,
        updated_by: null,
      }));

      const { error: insertError } = await supabase
        .from('m_cat_blocks')
        .insert(tenantBlocks);

      if (insertError) {
        errors.push(`Catalog block cloning failed: ${insertError.message}`);
      } else {
        catalogBlocksSeeded = tenantBlocks.length;
        console.log(`[seedTenantOnIndustryConfirmed] Cloned ${catalogBlocksSeeded} KT blocks`);
      }
    } else {
      console.log('[seedTenantOnIndustryConfirmed] No KT blocks found for industry:', industryId);
    }
  } else {
    catalogBlocksSeeded = existingSeedCount ?? 0;
    console.log('[seedTenantOnIndustryConfirmed] Seed blocks already exist, skipping clone');
  }

  // ── Step 3: Facility placeholders (buyer/both only) ──────────────────────
  let facilityNodesSeeded = 0;
  const isBuyer = businessType === 'buyer' || businessType === 'both';

  if (isBuyer) {
    // Only create if no placeholders exist for this tenant yet
    const { count: existingPlaceholderCount } = await supabase
      .from('t_client_asset_registry')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('ownership_type', 'self')
      .filter('specifications->>is_placeholder', 'eq', 'true');

    if ((existingPlaceholderCount ?? 0) === 0) {
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

          const { error: nodeError } = await supabase
            .from('t_client_asset_registry')
            .insert({
              id: nodeId,
              tenant_id: tenantId,
              owner_contact_id: null,
              ownership_type: 'self',
              resource_type_id: 'asset',
              name: template.label,
              status: 'active',
              condition: 'good',
              criticality: 'low',
              parent_asset_id: parentId,
              is_live: false,
              is_active: true,
              specifications: {
                entity_type: template.entity_type,
                industry_id: industryId,
                hierarchy_level: template.level,
                is_placeholder: true,
              },
            });

          if (nodeError) {
            errors.push(`Facility node '${template.entity_type}' failed: ${nodeError.message}`);
          } else {
            levelToId[template.level] = nodeId;
            facilityNodesSeeded++;
          }
        }

        console.log(`[seedTenantOnIndustryConfirmed] Created ${facilityNodesSeeded} facility nodes`);
      } else {
        console.log('[seedTenantOnIndustryConfirmed] No hierarchy templates found for industry:', industryId);
      }
    } else {
      facilityNodesSeeded = existingPlaceholderCount ?? 0;
      console.log('[seedTenantOnIndustryConfirmed] Facility placeholders already exist, skipping');
    }
  }

  // ── Step 4: Seed sequence numbers (both environments, non-fatal) ─────────
  let sequencesSeeded = false;
  const supabaseUrl = process.env.SUPABASE_URL!;

  try {
    for (const environment of ['live', 'test']) {
      await axios.post(
        `${supabaseUrl}/functions/v1/sequences/seed`,
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
    // Non-fatal: sequences may already be seeded from a prior onboarding step
    console.warn(
      '[seedTenantOnIndustryConfirmed] Sequences seed skipped (non-fatal):',
      seqError.response?.data?.error || seqError.message
    );
  }

  // ── Step 5: Store idempotency record ─────────────────────────────────────
  const result: SeedIndustryResult = {
    success: errors.length === 0,
    alreadySeeded: false,
    catalogBlocksSeeded,
    facilityNodesSeeded,
    sequencesSeeded,
    errors,
  };

  if (result.success) {
    const { error: idempotencyError } = await supabase
      .from('t_idempotency_keys')
      .insert({
        idempotency_key: idempotencyKey,
        tenant_id: tenantId,
        endpoint: IDEMPOTENCY_ENDPOINT,
        method: 'POST',
        response_status: 200,
        response_body: result,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      });

    if (idempotencyError) {
      // Non-fatal: idempotency record is a guard, not a hard requirement
      console.warn('[seedTenantOnIndustryConfirmed] Could not store idempotency record:', idempotencyError.message);
    }
  }

  console.log('[seedTenantOnIndustryConfirmed] Done', {
    success: result.success,
    catalogBlocksSeeded,
    facilityNodesSeeded,
    sequencesSeeded,
    errorCount: errors.length,
  });

  return result;
}
