// supabase/functions/jtd-worker/handlers/whatsapp.ts
// WhatsApp handler using MSG91 - matches working n8n workflow format

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

// MSG91 WhatsApp Configuration
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY');
const MSG91_WHATSAPP_NUMBER = Deno.env.get('MSG91_WHATSAPP_NUMBER');
const MSG91_COUNTRY_CODE = Deno.env.get('MSG91_COUNTRY_CODE') || '91';

/**
 * Format mobile number
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
 * Format matches working n8n workflow (BBBWhatsApp)
 */
export async function handleWhatsApp(request: WhatsAppRequest): Promise<ProcessResult> {
  const { to, templateName, templateData, mediaUrl, metadata } = request;

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
    const formattedMobile = formatMobile(to);

    // MSG91 WhatsApp API endpoint - use api.msg91.com (same as working n8n workflow)
    const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

    // Build template object
    const template: Record<string, any> = {
      name: templateName,
      language: {
        code: 'en',
        policy: 'deterministic'
      }
    };

    // Add variables if provided
    // IMPORTANT: MSG91 WhatsApp templates use positional placeholders {{1}}, {{2}}, etc.
    // We must send parameters in the EXACT order the template expects.
    if (templateData && Object.keys(templateData).length > 0) {
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

      template.components = [
        {
          type: 'body',
          parameters: orderedValues.map(value => ({
            type: 'text',
            text: value
          }))
        }
      ];
    }

    // Add media if provided
    if (mediaUrl) {
      template.components = template.components || [];
      template.components.push({
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

    // Build payload - FLAT structure matching working n8n workflow
    // NOT nested payload structure
    const payload: Record<string, any> = {
      integrated_number: MSG91_WHATSAPP_NUMBER,
      recipient_number: formattedMobile,  // NOT payload.to
      content_type: 'template',
      type: 'template',
      template: template                   // NOT payload.template
    };

    console.log(`[JTD WhatsApp] Sending to ${formattedMobile}, template: ${templateName}`);
    console.log(`[JTD WhatsApp] Payload:`, JSON.stringify(payload));

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
