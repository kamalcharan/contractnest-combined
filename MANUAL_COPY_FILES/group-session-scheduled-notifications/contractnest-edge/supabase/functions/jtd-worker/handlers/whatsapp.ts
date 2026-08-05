// supabase/functions/jtd-worker/handlers/whatsapp.ts
// WhatsApp handler using MSG91 - based on MSG91 official documentation

interface WhatsAppRequest {
  to: string;
  countryCode?: string;
  templateName: string;
  templateData: Record<string, any>;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

interface ProcessResult {
  success: boolean;
  provider_message_id?: string;
  error?: string;
}

// MSG91 WhatsApp Configuration
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY');
const MSG91_WHATSAPP_NUMBER = Deno.env.get('MSG91_WHATSAPP_NUMBER');
const MSG91_COUNTRY_CODE = Deno.env.get('MSG91_COUNTRY_CODE') || '91';

/**
 * Format mobile number using the recipient's country code when available,
 * falling back to MSG91_COUNTRY_CODE env var (default '91').
 */
function formatMobile(num: string, countryCode?: string): string {
  const cleaned = num.replace(/\D/g, '');
  const code = countryCode?.replace(/\D/g, '') || MSG91_COUNTRY_CODE;
  if (cleaned.startsWith(code)) {
    return cleaned;
  }
  return `${code}${cleaned}`;
}

/**
 * Sanitise a value before it becomes a WhatsApp template parameter.
 *
 * WhatsApp rejects line breaks inside body parameters outright — MSG91 returns
 * `"next line(\n) is not supported for body value"` and the whole message is
 * dropped. This is not hypothetical: on 5 Aug 2026 three BBB members missed
 * their reminder because their CONTACT NAMES contain embedded CRLFs, e.g.
 * "JAGANNADHA SHASTRY SOMANCHI\r\n (BHUSHANA MEMBER)". Left unhandled it would
 * have blocked every future message to them — reminders, check-in
 * acknowledgements, payment thank-yous alike.
 *
 * Applied centrally to EVERY parameter of EVERY template rather than cleaning
 * the three offending names, because the data will keep producing these:
 * names are free text, pasted from spreadsheets and imports.
 *
 * Collapses all whitespace runs (CR, LF, tab, repeated spaces) to one space
 * and trims. Deliberately does not otherwise alter the value.
 */
function cleanParam(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Send WhatsApp message via MSG91
 * Based on MSG91 documentation: https://docs.msg91.com/reference/send-whatsapp-message
 */
export async function handleWhatsApp(request: WhatsAppRequest): Promise<ProcessResult> {
  const { to, countryCode, templateName, templateData, mediaUrl, metadata } = request;

  // Validation
  if (!MSG91_AUTH_KEY) {
    console.error('MSG91_AUTH_KEY is not configured');
    return {
      success: false,
      error: 'MSG91_AUTH_KEY is not configured'
    };
  }

  if (!MSG91_WHATSAPP_NUMBER) {
    console.error('MSG91_WHATSAPP_NUMBER is not configured');
    return {
      success: false,
      error: 'MSG91_WHATSAPP_NUMBER is not configured'
    };
  }

  if (!to) {
    return {
      success: false,
      error: 'Mobile number is required'
    };
  }

  try {
    const formattedMobile = formatMobile(to, countryCode);

    // MSG91 WhatsApp API endpoint (bulk endpoint for templates)
    const url = 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

    // Build components object based on template variables.
    //
    // ⚠️ THIS ACCOUNT CONTAINS BOTH PARAMETER STYLES. Each template branch
    // below MUST match the style its own template was registered with. There
    // is no account-wide rule — do not "simplify" this to one style.
    //
    //   NAMED      ({{member_name}}): components key "body_<name>", value
    //              shape {type:'text', value:'...', parameter_name:'<name>'}.
    //              Used by the templates registered BEFORE Aug 2026:
    //              group_session_attendance_ack, group_session_payment_thankyou.
    //
    //   POSITIONAL ({{1}}, {{2}}):    components key "body_1", "body_2", value
    //              shape {type:'text', value:'...'}.
    //              Used by everything registered from Aug 2026 onward, because
    //              MSG91's template editor now refuses named placeholders:
    //              "Variables parameters must be whole numbers with two sets of
    //              curly brackets, i.e., {{1}} or {{2}}."
    //              Also user_invitation and contract_signoff.
    //
    // Established empirically by a handset test on 4 Aug 2026 (all five
    // group-session templates sent positional to one number): looking_forward
    // and noshow_regret arrived; attendance_ack and payment_thankyou were
    // rejected by WhatsApp with "Parameter name is missing or empty", which is
    // the signature of sending positional against a NAMED template. Sending
    // named against a POSITIONAL template fails the same silent way.
    //
    // The failure mode is why this is easy to get wrong: MSG91 ACCEPTS the
    // request either way and returns success + a request_id, so the JTD row
    // reads status='sent'. WhatsApp rejects it later, on delivery. No JTD row
    // has ever reached 'delivered' or 'read' because the delivery webhook does
    // not update status. Confirm on a real handset, never in the DB.
    const components: Record<string, { type: string; value: string; sub_type?: string; parameter_name?: string }> = {};

    if (templateData && Object.keys(templateData).length > 0) {
      // Exactly one of these is set per template branch, according to how that
      // template is registered. The emit block after the if-chain reads
      // whichever was set.
      let orderedValues: string[] | null = null;
      let namedParams: Array<{ name: string; value: string }> | null = null;

      if (templateName === 'user_invitation') {
        // {{1}}=recipient_name, {{2}}=inviter_name, {{3}}=workspace_name, {{4}}=invitation_link
        orderedValues = [
          String(templateData.recipient_name || ''),
          String(templateData.inviter_name || ''),
          String(templateData.workspace_name || ''),
          String(templateData.invitation_link || '')
        ];
        console.log(`[JTD WhatsApp] user_invitation variables:`, orderedValues);
      } else if (templateName === 'contract_signoff') {
        // 3 body vars + CTA button URL suffix.
        // {{1}}=recipient_name, {{2}}=sender_name, {{3}}=contract_info
        orderedValues = [
          String(templateData.recipient_name || ''),
          String(templateData.sender_name || ''),
          String(templateData.contract_info || '')
        ];

        // CTA button: pass the dynamic URL suffix for "Review Contract" button
        if (templateData.review_link_suffix) {
          components['button_1'] = {
            type: 'text',
            sub_type: 'url',
            value: cleanParam(templateData.review_link_suffix)
          };
        }

        console.log(`[JTD WhatsApp] contract_signoff body:`, orderedValues, 'button_suffix:', templateData.review_link_suffix);
      } else if (templateName === 'group_session_attendance_ack') {
        // NAMED — registered before Aug 2026.
        // Hi {{member_name}}, your attendance for {{session_name}} on {{occurrence_date}} has been recorded. Thank you!
        namedParams = [
          { name: 'member_name',     value: String(templateData.member_name || '') },
          { name: 'session_name',    value: String(templateData.session_name || '') },
          { name: 'occurrence_date', value: String(templateData.occurrence_date || '') }
        ];
      } else if (templateName === 'group_session_payment_thankyou') {
        // NAMED — registered before Aug 2026.
        // Hi {{member_name}}, we've received your payment of {{amount}} for {{session_name}}. Thank you!
        namedParams = [
          { name: 'member_name',  value: String(templateData.member_name || '') },
          { name: 'amount',       value: String(templateData.amount || '') },
          { name: 'session_name', value: String(templateData.session_name || '') }
        ];
      } else if (templateName === 'group_session_looking_forward') {
        // POSITIONAL — registered Aug 2026. Verified arriving 4 Aug 2026.
        // Hi {{1}}, looking forward to seeing you at {{2}} on {{3}} at {{4}}. See you there!
        orderedValues = [
          String(templateData.member_name || ''),
          String(templateData.session_name || ''),
          String(templateData.occurrence_date || ''),
          String(templateData.start_time || '')
        ];
      } else if (templateName === 'group_session_noshow_regret') {
        // Hi {{1}}, we missed you at {{2}} on {{3}}. Hope to see you at the next one!
        orderedValues = [
          String(templateData.member_name || ''),
          String(templateData.session_name || ''),
          String(templateData.occurrence_date || '')
        ];
      } else if (templateName === 'group_session_absentee_reminder') {
        // Hi {{1}}, we have missed you at the last couple of {{2}} sessions.
        // The next one is on {{3}} at {{4}}. Hope to see you there!
        orderedValues = [
          String(templateData.member_name || ''),
          String(templateData.session_name || ''),
          String(templateData.occurrence_date || ''),
          String(templateData.start_time || '')
        ];
      } else {
        // For other templates, use Object.values. NOTE: templateData round-trips
        // through a jsonb column (n_jtd.template_variables) — Postgres jsonb does
        // NOT preserve key insertion order, so this fallback's variable order is
        // NOT reliable. Any new template needs its own explicit branch above —
        // don't rely on this path for a new template without checking key order.
        orderedValues = Object.values(templateData).map(v => String(v));
      }

      if (namedParams) {
        // Named: key becomes body_<param_name>, value carries parameter_name too.
        namedParams.forEach(({ name, value }) => {
          components[`body_${name}`] = {
            type: 'text',
            value: cleanParam(value),
            parameter_name: name
          };
        });
      } else if (orderedValues) {
        // Positional: keys become body_1, body_2, ...
        orderedValues.forEach((value, index) => {
          components[`body_${index + 1}`] = {
            type: 'text',
            value: cleanParam(value)
          };
        });
      }
    }

    // Add header component if media URL provided
    if (mediaUrl) {
      components['header_1'] = {
        type: 'image',
        value: mediaUrl
      };
    }

    // Build payload per MSG91 documentation
    const payload = {
      integrated_number: MSG91_WHATSAPP_NUMBER,
      content_type: 'template',
      payload: {
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
            policy: 'deterministic'
          },
          to_and_components: [
            {
              to: [formattedMobile],
              components: components
            }
          ]
        },
        messaging_product: 'whatsapp'  // REQUIRED by MSG91/WhatsApp
      }
    };

    console.log(`[JTD WhatsApp] Sending to ${formattedMobile}, template: ${templateName}`);
    console.log(`[JTD WhatsApp] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    console.log(`[JTD WhatsApp] MSG91 Response:`, JSON.stringify(result));

    if (result && (result.type === 'success' || result.status === 'success')) {
      console.log(`[JTD WhatsApp] Sent successfully to ${formattedMobile}`);
      return {
        success: true,
        provider_message_id: result.data?.id || result.request_id || result.message_id
      };
    }

    console.error('[JTD WhatsApp] MSG91 error:', JSON.stringify(result));
    return {
      success: false,
      error: `MSG91: ${JSON.stringify(result)}`
    };

  } catch (error) {
    console.error('[JTD WhatsApp] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending WhatsApp'
    };
  }
}

/**
 * Handle MSG91 WhatsApp webhook callback
 */
export interface MSG91WhatsAppWebhook {
  message_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  mobile: string;
  timestamp: string;
  error_code?: string;
  error_message?: string;
}

export function mapMSG91WhatsAppStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  };
  return statusMap[status] || status.toLowerCase();
}
