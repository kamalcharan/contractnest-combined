// supabase/functions/jtd-worker/handlers/whatsapp.ts
// WhatsApp handler using MSG91 - matches contractnest-api/src/services/whatsapp.service.ts

interface WhatsAppRequest {
  to: string;
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

// MSG91 WhatsApp Configuration (same as whatsapp.service.ts)
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY');
const MSG91_WHATSAPP_NUMBER = Deno.env.get('MSG91_WHATSAPP_NUMBER');
const MSG91_COUNTRY_CODE = Deno.env.get('MSG91_COUNTRY_CODE') || '91';

/**
 * Format mobile number (same as whatsapp.service.ts)
 */
function formatMobile(num: string): string {
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.startsWith(MSG91_COUNTRY_CODE)) {
    return cleaned;
  }
  return `${MSG91_COUNTRY_CODE}${cleaned}`;
}

/**
 * Send WhatsApp message via MSG91
 * Matches: contractnest-api/src/services/whatsapp.service.ts
 */
export async function handleWhatsApp(request: WhatsAppRequest): Promise<ProcessResult> {
  const { to, templateName, templateData, mediaUrl, metadata } = request;

  // Validation (same as whatsapp.service.ts)
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
    const formattedMobile = formatMobile(to);

    // MSG91 WhatsApp API endpoint (same as whatsapp.service.ts)
    const url = 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

    // Build payload (same as whatsapp.service.ts)
    const payload: Record<string, any> = {
      integrated_number: MSG91_WHATSAPP_NUMBER,
      content_type: 'template',
      payload: {
        to: formattedMobile,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
            policy: 'deterministic'
          }
        }
      }
    };

    // Add variables if provided
    // IMPORTANT: MSG91 WhatsApp templates use positional placeholders {{1}}, {{2}}, etc.
    // We must send parameters in the EXACT order the template expects.
    if (templateData && Object.keys(templateData).length > 0) {
      // For user_invitation template, order is: {{1}}=recipient_name, {{2}}=inviter_name, {{3}}=workspace_name, {{4}}=invitation_link
      // Build ordered array based on template name
      let orderedValues: string[];

      if (templateName === 'user_invitation') {
        // Extract values in the correct order for user_invitation template
        orderedValues = [
          String(templateData.recipient_name || ''),      // {{1}}
          String(templateData.inviter_name || ''),        // {{2}}
          String(templateData.workspace_name || ''),      // {{3}}
          String(templateData.invitation_link || '')      // {{4}}
        ];
        console.log(`[JTD WhatsApp] user_invitation template variables in order:`, orderedValues);
      } else {
        // For other templates, use Object.values (may need template-specific ordering)
        orderedValues = Object.values(templateData).map(v => String(v));
      }

      payload.payload.template.components = [
        {
          type: 'body',
          parameters: orderedValues.map(value => ({
            type: 'text',
            text: value
          }))
        }
      ];
    }

    // Add media if provided (same as whatsapp.service.ts)
    if (mediaUrl) {
      payload.payload.template.components = payload.payload.template.components || [];
      payload.payload.template.components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              link: mediaUrl
            }
          }
        ]
      });
    }

    console.log(`[JTD WhatsApp] Sending to ${formattedMobile}, template: ${templateName}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result && result.type === 'success') {
      console.log(`[JTD WhatsApp] Sent successfully to ${formattedMobile}`);
      return {
        success: true,
        provider_message_id: result.data?.id || result.request_id
      };
    }

    console.error('[JTD WhatsApp] MSG91 error:', result);
    return {
      success: false,
      error: result.message || 'Failed to send WhatsApp message'
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
