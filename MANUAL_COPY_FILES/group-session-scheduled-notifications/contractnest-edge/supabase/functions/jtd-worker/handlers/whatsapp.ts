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
    // THIS ACCOUNT USES POSITIONAL PARAMETERS EXCLUSIVELY.
    //
    // MSG91's template editor for this account rejects named placeholders
    // outright: "Variables parameters must be whole numbers with two sets of
    // curly brackets, i.e., {{1}} or {{2}}." Every template registered here is
    // therefore positional, and the send must match: components key "body_1",
    // "body_2", ..., value shape {type:'text', value:'...'}.
    //
    // HISTORY — do not re-introduce named parameters. An earlier change
    // switched the group-session templates to Meta's NAMED parameter style
    // (components key "body_<name>" plus a parameter_name field), on the
    // theory that this WABA namespace enforced named-only and that this
    // explained why attendance_ack and payment_thankyou showed status='sent'
    // but never arrived. That diagnosis was wrong — MSG91 will not even accept
    // a named placeholder at template-creation time, so no named template
    // could ever have existed here. Sending named parameters against a
    // positional template is what actually guaranteed non-delivery.
    //
    // Note also that status='sent' proves nothing on this stack: it reflects
    // MSG91 accepting the request, not WhatsApp delivering it. No JTD row has
    // ever reached 'delivered' or 'read' because the delivery webhook does not
    // update status. Confirm delivery on a real handset, not in the DB.
    const components: Record<string, { type: string; value: string; sub_type?: string }> = {};

    if (templateData && Object.keys(templateData).length > 0) {
      let orderedValues: string[];

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
            value: String(templateData.review_link_suffix)
          };
        }

        console.log(`[JTD WhatsApp] contract_signoff body:`, orderedValues, 'button_suffix:', templateData.review_link_suffix);
      } else if (templateName === 'group_session_attendance_ack') {
        // Hi {{1}}, your attendance for {{2}} on {{3}} has been recorded. Thank you!
        orderedValues = [
          String(templateData.member_name || ''),
          String(templateData.session_name || ''),
          String(templateData.occurrence_date || '')
        ];
      } else if (templateName === 'group_session_payment_thankyou') {
        // Hi {{1}}, we've received your payment of {{2}} for {{3}}. Thank you!
        orderedValues = [
          String(templateData.member_name || ''),
          String(templateData.amount || ''),
          String(templateData.session_name || '')
        ];
      } else if (templateName === 'group_session_looking_forward') {
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

      // Convert to MSG91 format: body_1, body_2, etc.
      orderedValues.forEach((value, index) => {
        components[`body_${index + 1}`] = {
          type: 'text',
          value: value
        };
      });
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
