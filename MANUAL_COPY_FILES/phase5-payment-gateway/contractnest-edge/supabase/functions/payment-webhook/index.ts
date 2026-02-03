// supabase/functions/payment-webhook/index.ts
// Public webhook receiver for payment gateways.
// URL pattern: /payment-webhook/{provider}/{tenant_id}
//
// This endpoint is PUBLIC — called directly by Razorpay/Stripe/etc.
// No internal HMAC verification. Signature is verified using
// the provider's own mechanism (e.g. x-razorpay-signature header).
//
// Flow:
//   1. Parse provider + tenant_id from URL
//   2. Read raw body (needed for signature verification)
//   3. Fetch + decrypt tenant's gateway credentials
//   4. Verify webhook signature (provider-specific)
//   5. Extract gateway-agnostic event data
//   6. Call process_payment_webhook RPC (idempotent)
//   7. Return 200 (gateways retry on non-2xx)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

// Provider imports
import * as razorpay from './providers/razorpay.ts';

// ─── Encryption (same as payment-gateway edge function) ────

async function decryptData(encryptedData: string, encryptionKey: string): Promise<any> {
  const encryptedBytes = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);

  const keyBytes = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    ciphertext
  );

  const jsonString = new TextDecoder().decode(decryptedContent);
  return JSON.parse(jsonString);
}

// ─── Response Helper ───────────────────────────────────────

function jsonResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN SERVE
// ═══════════════════════════════════════════════════════════

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only POST allowed (all gateways send POST webhooks)
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // ── Parse URL ────────────────────────────────────────
    // Supabase Edge URL: /functions/v1/payment-webhook/{provider}/{tenant_id}
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(s => s);

    // Find 'payment-webhook' in path and extract the next two segments
    const funcIndex = segments.indexOf('payment-webhook');
    const provider = funcIndex >= 0 ? segments[funcIndex + 1] : undefined;
    const tenantId = funcIndex >= 0 ? segments[funcIndex + 2] : undefined;

    if (!provider) {
      console.error('[PayWebhook] Missing provider in URL path');
      return jsonResponse({ error: 'Provider is required in URL path' }, 400);
    }

    if (!tenantId) {
      console.error('[PayWebhook] Missing tenant_id in URL path');
      return jsonResponse({ error: 'tenant_id is required in URL path' }, 400);
    }

    // Validate provider
    const SUPPORTED_PROVIDERS = ['razorpay'];
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      console.error(`[PayWebhook] Unsupported provider: ${provider}`);
      return jsonResponse({ error: `Unsupported provider: ${provider}` }, 400);
    }

    console.log(`[PayWebhook] Received webhook: provider=${provider}, tenant=${tenantId}`);

    // ── Read Raw Body ────────────────────────────────────
    // Must read as text (not JSON) — signature is computed on raw body
    const rawBody = await req.text();

    if (!rawBody) {
      console.error('[PayWebhook] Empty request body');
      return jsonResponse({ error: 'Empty request body' }, 400);
    }

    // ── Get Provider Signature ───────────────────────────
    let webhookSignature: string | null = null;

    if (provider === 'razorpay') {
      webhookSignature = req.headers.get('x-razorpay-signature');
    }
    // Future: else if (provider === 'stripe') { webhookSignature = req.headers.get('stripe-signature'); }

    if (!webhookSignature) {
      console.error(`[PayWebhook] Missing webhook signature for ${provider}`);
      // Return 401 — gateway should not retry without signature
      return jsonResponse({ error: 'Missing webhook signature' }, 401);
    }

    // ── Environment ──────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') || 'default-encryption-key-change-in-prod';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[PayWebhook] Missing required environment variables');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    // ── Supabase Client (service_role — no user auth for webhooks) ──
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Fetch Tenant Gateway Credentials ─────────────────
    const { data: credData, error: credError } = await supabase.rpc('get_tenant_gateway_credentials', {
      p_tenant_id: tenantId,
      p_provider: provider
    });

    if (credError) {
      console.error('[PayWebhook] RPC error fetching credentials:', credError);
      // Return 200 to prevent retries for misconfigured tenants
      return jsonResponse({ acknowledged: true, warning: 'Credentials fetch failed' });
    }

    if (!credData?.success) {
      console.error(`[PayWebhook] No active ${provider} gateway for tenant ${tenantId}`);
      // Return 200 — don't let gateway retry for deactivated tenant
      return jsonResponse({ acknowledged: true, warning: 'No active gateway for tenant' });
    }

    // ── Decrypt Credentials ──────────────────────────────
    let credentials: any;
    try {
      credentials = await decryptData(credData.data.credentials, encryptionKey);
    } catch (decryptErr) {
      console.error('[PayWebhook] Failed to decrypt credentials:', decryptErr);
      return jsonResponse({ acknowledged: true, warning: 'Credential decryption failed' });
    }

    // ── Verify Webhook Signature ─────────────────────────
    let isValid = false;

    if (provider === 'razorpay') {
      const webhookSecret = credentials.webhook_secret;
      if (!webhookSecret) {
        console.error('[PayWebhook] No webhook_secret in Razorpay credentials');
        return jsonResponse({ acknowledged: true, warning: 'Missing webhook_secret in credentials' });
      }
      isValid = await razorpay.verifyWebhookSignature(rawBody, webhookSignature, webhookSecret);
    }

    if (!isValid) {
      console.error(`[PayWebhook] Invalid ${provider} webhook signature for tenant ${tenantId}`);
      return jsonResponse({ error: 'Invalid webhook signature' }, 401);
    }

    console.log(`[PayWebhook] Signature verified for ${provider}, tenant ${tenantId}`);

    // ── Parse Payload ────────────────────────────────────
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[PayWebhook] Failed to parse webhook body as JSON:', parseErr);
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    // ── Extract Event Data (provider-specific → agnostic) ─
    let eventData: {
      eventId: string;
      eventType: string;
      paymentId: string | null;
      orderId: string | null;
      linkId: string | null;
      amount: number | null;
      currency: string | null;
    };

    if (provider === 'razorpay') {
      const eventType = payload?.event || '';

      // Only process payment-related events
      if (!razorpay.isPaymentEvent(eventType)) {
        console.log(`[PayWebhook] Ignoring non-payment event: ${eventType}`);
        return jsonResponse({ acknowledged: true, event: eventType, action: 'ignored' });
      }

      eventData = razorpay.extractEventData(payload);
    } else {
      // Should not reach here (provider validation above)
      return jsonResponse({ acknowledged: true, warning: 'Provider handler not implemented' });
    }

    console.log(`[PayWebhook] Processing event: type=${eventData.eventType}, payment=${eventData.paymentId}, order=${eventData.orderId}, link=${eventData.linkId}`);

    // ── Call process_payment_webhook RPC ──────────────────
    const { data: result, error: rpcError } = await supabase.rpc('process_payment_webhook', {
      p_payload: {
        gateway_provider: provider,
        gateway_event_id: eventData.eventId,
        gateway_payment_id: eventData.paymentId,
        gateway_order_id: eventData.orderId,
        gateway_link_id: eventData.linkId,
        gateway_signature: webhookSignature,
        event_type: eventData.eventType,
        event_data: payload,
        tenant_id: tenantId
      }
    });

    if (rpcError) {
      console.error('[PayWebhook] process_payment_webhook RPC error:', rpcError);
      // Return 500 — gateway should retry
      return jsonResponse({ error: 'Failed to process webhook event' }, 500);
    }

    console.log(`[PayWebhook] Event processed:`, JSON.stringify(result));

    // Always return 200 with result (gateway sees success)
    return jsonResponse({
      acknowledged: true,
      ...result
    });

  } catch (error) {
    console.error('[PayWebhook] Unhandled error:', error);
    // Return 500 — let gateway retry
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
});
