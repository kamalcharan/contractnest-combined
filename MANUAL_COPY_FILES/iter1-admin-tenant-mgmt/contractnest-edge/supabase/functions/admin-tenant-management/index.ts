// supabase/functions/admin-tenant-management/index.ts
// Admin Tenant Management Edge Function
// Provides: tenant list, platform stats for admin subscription dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  corsHeaders,
  generateOperationId,
  extractRequestContext,
  createSuccessResponse,
  createErrorResponse,
  validateRequestSignature
} from '../_shared/edgeUtils.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const operationId = generateOperationId('admin-tenant');
  const startTime = Date.now();

  try {
    // ── Environment ──────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const signingSecret = Deno.env.get('INTERNAL_SIGNING_SECRET') ?? '';

    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!authHeader || !token) {
      return createErrorResponse('Authorization required', 'UNAUTHORIZED', 401, operationId);
    }

    // ── Signature validation ─────────────────────────────────────
    const requestBody = req.method !== 'GET' ? await req.clone().text() : '';
    if (signingSecret) {
      const sigError = await validateRequestSignature(req, requestBody, signingSecret, operationId);
      if (sigError) return sigError;
    }

    // ── Supabase client ──────────────────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ── Verify user ──────────────────────────────────────────────
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse('Invalid or expired token', 'UNAUTHORIZED', 401, operationId);
    }

    // ── Context ──────────────────────────────────────────────────
    const context = extractRequestContext(req, operationId, startTime);
    if (!context) {
      return createErrorResponse('x-tenant-id header is required', 'BAD_REQUEST', 400, operationId);
    }

    // ── Admin check ──────────────────────────────────────────────
    if (!context.isAdmin) {
      return createErrorResponse('Admin access required', 'FORBIDDEN', 403, operationId);
    }

    // ── Routing ──────────────────────────────────────────────────
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // pathSegments: ["admin-tenant-management", "stats"] or ["admin-tenant-management", "tenants"]
    const action = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : '';

    // ── GET /stats ───────────────────────────────────────────────
    if (req.method === 'GET' && action === 'stats') {
      const { data, error } = await supabase.rpc('get_admin_platform_stats');

      if (error) {
        console.error(`[${operationId}] Stats RPC error:`, error);
        return createErrorResponse('Failed to load platform stats', 'DB_ERROR', 500, operationId);
      }

      return createSuccessResponse(data, operationId, startTime);
    }

    // ── GET /tenants ─────────────────────────────────────────────
    if (req.method === 'GET' && action === 'tenants') {
      const params = url.searchParams;

      const { data, error } = await supabase.rpc('get_admin_tenant_list', {
        p_page: parseInt(params.get('page') || '1'),
        p_limit: Math.min(parseInt(params.get('limit') || '20'), 100),
        p_status: params.get('status') || null,
        p_subscription_status: params.get('subscription_status') || null,
        p_search: params.get('search') || null,
        p_sort_by: params.get('sort_by') || 'created_at',
        p_sort_direction: params.get('sort_direction') || 'desc'
      });

      if (error) {
        console.error(`[${operationId}] Tenant list RPC error:`, error);
        return createErrorResponse('Failed to load tenant list', 'DB_ERROR', 500, operationId);
      }

      // RPC returns { tenants, pagination }
      return new Response(
        JSON.stringify({
          success: true,
          data: data.tenants,
          pagination: data.pagination,
          metadata: {
            request_id: operationId,
            duration_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 404 ──────────────────────────────────────────────────────
    return createErrorResponse(
      `Unknown route: ${req.method} ${action}`,
      'NOT_FOUND',
      404,
      operationId
    );

  } catch (error: any) {
    console.error(`[${operationId}] Unexpected error:`, error);
    return createErrorResponse(
      error.message || 'Internal server error',
      'INTERNAL_ERROR',
      500,
      operationId
    );
  }
});
