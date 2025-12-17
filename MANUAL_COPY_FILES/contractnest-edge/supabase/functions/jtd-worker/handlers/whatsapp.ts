// supabase/functions/jtd-worker/handlers/whatsapp.ts
// WhatsApp handler using MSG91 (via Gupshup/WhatsApp Business API)

interface WhatsAppRequest {
  to: string;
  templateName: string;
  templateData: Record<string, any>;
  metadata?: Record<string, any>;
}

interface ProcessResult {
  success: boolean;
  provider_message_id?: string;
  error?: string;
}

// MSG91 WhatsApp Configuration
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY');
const MSG91_INTEGRATED_NUMBER = Deno.env.get('MSG91_WHATSAPP_NUMBER');

/**
 * Send WhatsApp message via MSG91
 * API: https://docs.msg91.com/reference/send-whatsapp-message
 */
export async function handleWhatsApp(request: WhatsAppRequest): Promise<ProcessResult> {
  const { to, templateName, templateData, metadata } = request;

  if (!MSG91_AUTH_KEY) {
    console.error('MSG91_AUTH_KEY not configured');
    return {
      success: false,
      error: 'WhatsApp provider not configured'
    };
  }

  if (!to) {
    return {
      success: false,
      error: 'Recipient mobile number is required'
    };
  }

  try {
    // Normalize mobile number (ensure country code)
    const mobile = to.startsWith('91') ? to : `91${to.replace(/^0+/, '')}`;

    // MSG91 WhatsApp API endpoint
    const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

    // Build template parameters from templateData
    const templateParams = Object.values(templateData).map(value => ({
      type: 'text',
      text: String(value)
    }));

    const payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      content_type: 'template',
      payload: {
        to: mobile,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
            policy: 'deterministic'
          },
          components: [
            {
              type: 'body',
              parameters: templateParams
            }
          ]
        }
      }
    };

    console.log(`Sending WhatsApp to ${mobile}, template: ${templateName}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': MSG91_AUTH_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.type === 'success') {
      console.log(`WhatsApp sent successfully to ${mobile}, message_id: ${result.data?.id}`);
      return {
        success: true,
        provider_message_id: result.data?.id || result.request_id
      };
    } else {
      console.error('MSG91 WhatsApp error:', result);
      return {
        success: false,
        error: result.message || `MSG91 error: ${response.status}`
      };
    }

  } catch (error) {
    console.error('WhatsApp send error:', error);
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
