// supabase/functions/jtd-worker/handlers/sms.ts
// SMS handler using MSG91

interface SMSRequest {
  to: string;
  body: string;
  metadata?: Record<string, any>;
}

interface ProcessResult {
  success: boolean;
  provider_message_id?: string;
  error?: string;
}

// MSG91 Configuration
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY');
const MSG91_SENDER_ID = Deno.env.get('MSG91_SENDER_ID') || 'CNEST';
const MSG91_ROUTE = Deno.env.get('MSG91_SMS_ROUTE') || '4'; // Transactional

/**
 * Send SMS via MSG91
 * API: https://docs.msg91.com/reference/send-sms
 */
export async function handleSMS(request: SMSRequest): Promise<ProcessResult> {
  const { to, body, metadata } = request;

  if (!MSG91_AUTH_KEY) {
    console.error('MSG91_AUTH_KEY not configured');
    return {
      success: false,
      error: 'SMS provider not configured'
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

    // MSG91 SMS API endpoint
    const url = 'https://api.msg91.com/api/v5/flow/';

    // For transactional SMS, use flow API with template
    const payload = {
      template_id: metadata?.msg91_template_id,
      sender: MSG91_SENDER_ID,
      mobiles: mobile,
      // Variables in template
      VAR1: body,
      // Add more variables as needed from metadata
      ...metadata?.template_vars
    };

    console.log(`Sending SMS to ${mobile}`);

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
      console.log(`SMS sent successfully to ${mobile}, request_id: ${result.request_id}`);
      return {
        success: true,
        provider_message_id: result.request_id
      };
    } else {
      console.error('MSG91 SMS error:', result);
      return {
        success: false,
        error: result.message || `MSG91 error: ${response.status}`
      };
    }

  } catch (error) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending SMS'
    };
  }
}

/**
 * Handle MSG91 SMS delivery webhook
 */
export interface MSG91SMSWebhook {
  request_id: string;
  status: 'DELIVRD' | 'FAILED' | 'EXPIRED' | 'UNDELIV' | 'REJECTD';
  mobile: string;
  timestamp: string;
  description?: string;
}

export function mapMSG91SMSStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'DELIVRD': 'delivered',
    'FAILED': 'failed',
    'EXPIRED': 'failed',
    'UNDELIV': 'failed',
    'REJECTD': 'failed'
  };
  return statusMap[status] || status.toLowerCase();
}
