// supabase/functions/_shared/whatsapp/meteredSender.ts
// The ONE way a WhatsApp chat message (team assistant or customer chat) leaves
// ContractNest. Notifications keep their own metered path (n_jtd → jtd-worker).
//
//   reserve (wa_meter_reserve)  → hold 1 credit and log the message
//   send    (transport)         → the provider call, supplied by the caller
//   charge  (wa_meter_charge)   → provider accepted: the credit is spent
//   release (wa_meter_release)  → provider refused / threw: the credit returns
//
// At zero credits the database allows ONE free closing message per
// conversation until credits are added again; this module writes its text.
// The provider call is injected so the MSG91 session-message shape can be
// fixed in W4 (from a real inbound sample) without touching the metering.

// deno-lint-ignore no-explicit-any
type Db = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

export type Audience = 'team' | 'customer';

export interface OutboundMessage {
  tenantId: string;
  isLive: boolean;
  audience: Audience;
  phoneE164: string;
  userId?: string | null;
  contactId?: string | null;
  messageType?: string;            // text | list | buttons | flow | link …
  body?: string | null;            // what the person reads (logged)
  payload?: Record<string, unknown>; // provider-specific content (logged)
}

export interface TransportRequest {
  phoneE164: string;
  messageType: string;
  body: string | null;
  payload: Record<string, unknown>;
}

export interface TransportResult {
  ok: boolean;
  providerMessageId?: string | null;
  error?: string | null;
}

export type Transport = (req: TransportRequest) => Promise<TransportResult>;

export type SendOutcome =
  | { status: 'sent'; messageId: string; metered: boolean; providerMessageId?: string | null }
  | { status: 'failed'; messageId?: string; error: string }
  | { status: 'closing_sent'; messageId: string; text: string }
  | { status: 'closing_failed'; messageId: string; error: string }
  | { status: 'blocked_no_credits' }
  | { status: 'meter_error'; error: string };

export function closingText(
  audience: Audience,
  contactNumber?: string | null,
  storefrontKey?: string | null,
  appUrl: string | null = Deno.env.get('PUBLIC_APP_URL') ?? null,
): string {
  if (audience === 'team') {
    return 'Your workspace is out of WhatsApp credits. Ask your admin to top up.';
  }
  if (contactNumber) {
    return `Sorry, we can't reply here right now. Please connect with us directly on ${contactNumber}.`;
  }
  if (storefrontKey && appUrl) {
    return `Sorry, we can't reply here right now. You can reach us here: ${appUrl.replace(/\/+$/, '')}/p/${storefrontKey}`;
  }
  return "Sorry, we can't reply here right now. Please try again later.";
}

async function settle(db: Db, messageId: string, result: TransportResult, body: string | null) {
  if (result.ok) {
    const { data, error } = await db.rpc('wa_meter_charge', {
      p_message_id: messageId,
      p_provider_message_id: result.providerMessageId ?? null,
      p_body: body,
    });
    if (error || data?.success === false) {
      // The message went out; a failed charge is ours to reconcile, never the sender's problem.
      console.error('[wa-meter] charge failed', messageId, error?.message ?? data?.reason);
    }
    return;
  }
  const { error } = await db.rpc('wa_meter_release', {
    p_message_id: messageId,
    p_error: result.error ?? 'send failed',
  });
  if (error) console.error('[wa-meter] release failed', messageId, error.message);
}

async function callTransport(transport: Transport, req: TransportRequest): Promise<TransportResult> {
  try {
    return await transport(req);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendMeteredWhatsApp(db: Db, msg: OutboundMessage, transport: Transport): Promise<SendOutcome> {
  const messageType = msg.messageType ?? 'text';
  const payload = msg.payload ?? {};
  const body = msg.body ?? null;

  const { data: r, error } = await db.rpc('wa_meter_reserve', {
    p_tenant_id: msg.tenantId,
    p_is_live: msg.isLive,
    p_audience: msg.audience,
    p_phone: msg.phoneE164,
    p_user_id: msg.userId ?? null,
    p_contact_id: msg.contactId ?? null,
    p_message_type: messageType,
    p_body: body,
    p_payload: payload,
  });
  if (error) return { status: 'meter_error', error: error.message };

  if (r?.success && r.message_id) {
    const result = await callTransport(transport, { phoneE164: msg.phoneE164, messageType, body, payload });
    await settle(db, r.message_id, result, null);
    return result.ok
      ? { status: 'sent', messageId: r.message_id, metered: !!r.metered, providerMessageId: result.providerMessageId }
      : { status: 'failed', messageId: r.message_id, error: result.error ?? 'send failed' };
  }

  if (r?.reason === 'no_credits') {
    if (!r.send_closing || !r.message_id) return { status: 'blocked_no_credits' };
    const text = closingText(msg.audience, r.closing?.contact_number, r.closing?.storefront_key);
    const result = await callTransport(transport, {
      phoneE164: msg.phoneE164, messageType: 'text', body: text, payload: { closing: true },
    });
    await settle(db, r.message_id, result, text);
    return result.ok
      ? { status: 'closing_sent', messageId: r.message_id, text }
      : { status: 'closing_failed', messageId: r.message_id, error: result.error ?? 'send failed' };
  }

  return { status: 'meter_error', error: r?.error ?? r?.reason ?? 'unknown' };
}

/** Inbound messages are recorded for usage reporting and never charged. */
export async function logInboundWhatsApp(
  db: Db,
  msg: Omit<OutboundMessage, 'payload'> & { payload?: Record<string, unknown>; providerMessageId?: string | null },
) {
  const { data, error } = await db.rpc('wa_message_log_in', {
    p_tenant_id: msg.tenantId,
    p_is_live: msg.isLive,
    p_audience: msg.audience,
    p_phone: msg.phoneE164,
    p_user_id: msg.userId ?? null,
    p_contact_id: msg.contactId ?? null,
    p_message_type: msg.messageType ?? 'text',
    p_body: msg.body ?? null,
    p_payload: msg.payload ?? {},
    p_provider_message_id: msg.providerMessageId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; message_id?: string; duplicate?: boolean };
}
