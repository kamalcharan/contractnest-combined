// src/controllers/publicController.ts
// Public (unauthenticated) endpoints that back flows which previously hit the
// Supabase Data API directly from the browser. Routing them through the API
// (service_role) lets us REVOKE anon/authenticated grants and close the
// PostgREST "Door B" without breaking lead capture / forgot-password /
// lock-screen auth-method detection.
//
// All DB access here uses the product's service_role client (bypasses RLS) —
// the API is the trusted gateway, protected by the API<->edge signing secret
// at the edge boundary and standard input validation here.

import { Request, Response } from 'express';
import { getSupabaseClientFromRequest } from '../utils/supabaseConfig';
import { captureException } from '../utils/sentry';

// Whitelisted columns we accept for a lead insert (prevents arbitrary writes)
const LEAD_INSERT_FIELDS = ['name', 'email', 'phone', 'industry', 'persona', 'completed_demo', 'source'] as const;

/**
 * POST /api/public/leads
 * Public lead capture (playground / landing / early-access forms).
 */
export const createLead = async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClientFromRequest(req);
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const body = req.body || {};
    if (!body.name || !body.email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const row: Record<string, any> = { completed_demo: false };
    for (const f of LEAD_INSERT_FIELDS) {
      if (body[f] !== undefined) row[f] = body[f];
    }

    const { data, error } = await supabase
      .from('leads_contractnest')
      .insert([row])
      .select()
      .single();

    if (error) {
      // Non-fatal for the UX: the demo flows continue even if persistence fails.
      captureException(error instanceof Error ? error : new Error(error.message), {
        tags: { source: 'api_public', action: 'createLead' }
      });
      return res.status(200).json({ success: false, lead: row });
    }

    return res.status(201).json({ success: true, lead: data });
  } catch (error: any) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_public', action: 'createLead' }
    });
    return res.status(500).json({ error: 'Failed to save lead' });
  }
};

/**
 * PATCH /api/public/leads/:id
 * Update a captured lead (e.g. mark the demo completed + attach contract_data).
 */
export const updateLead = async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClientFromRequest(req);
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'lead id is required' });

    const body = req.body || {};
    const patch: Record<string, any> = {};
    if (body.completed_demo !== undefined) patch.completed_demo = body.completed_demo;
    if (body.contract_data !== undefined) patch.contract_data = body.contract_data;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const { error } = await supabase
      .from('leads_contractnest')
      .update(patch)
      .eq('id', id);

    if (error) {
      captureException(error instanceof Error ? error : new Error(error.message), {
        tags: { source: 'api_public', action: 'updateLead' }
      });
      return res.status(200).json({ success: false });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_public', action: 'updateLead' }
    });
    return res.status(500).json({ error: 'Failed to update lead' });
  }
};

/**
 * GET /api/public/auth-methods
 * Returns a user's auth methods (auth_type, is_primary). Two modes:
 *   - Bearer token present  -> resolve by the token's user_id (lock screen)
 *   - ?identifier=<email>   -> resolve by auth_identifier (forgot-password, pre-login)
 * Only non-deleted methods are returned. Intentionally does not reveal whether an
 * email exists beyond what the prior direct-DB call already exposed.
 */
export const getAuthMethods = async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClientFromRequest(req);
    if (!supabase) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let query = supabase
      .from('t_user_auth_methods')
      .select('auth_type, is_primary, last_used_at')
      .eq('is_deleted', false);

    const authHeader = req.headers.authorization;
    const identifier = (req.query.identifier as string | undefined)?.toLowerCase();

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      query = query.eq('user_id', user.id);
    } else if (identifier) {
      query = query.eq('auth_identifier', identifier);
    } else {
      return res.status(400).json({ error: 'identifier query param or Bearer token required' });
    }

    const { data, error } = await query
      .order('is_primary', { ascending: false })
      .order('last_used_at', { ascending: false });

    if (error) {
      captureException(error instanceof Error ? error : new Error(error.message), {
        tags: { source: 'api_public', action: 'getAuthMethods' }
      });
      return res.status(500).json({ error: 'Failed to fetch auth methods' });
    }

    const methods = (data || []).map((m: any) => ({
      auth_type: m.auth_type,
      is_primary: m.is_primary
    }));

    return res.status(200).json({ methods });
  } catch (error: any) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source: 'api_public', action: 'getAuthMethods' }
    });
    return res.status(500).json({ error: 'Failed to fetch auth methods' });
  }
};
