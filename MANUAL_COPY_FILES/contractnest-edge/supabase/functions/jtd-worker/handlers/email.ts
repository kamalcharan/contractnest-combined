// supabase/functions/jtd-worker/handlers/email.ts
// Email handler using MSG91

interface EmailRequest {
  to: string;
  subject: string;
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
const MSG91_SENDER_EMAIL = Deno.env.get('MSG91_SENDER_EMAIL') || 'noreply@contractnest.in';
const MSG91_SENDER_NAME = Deno.env.get('MSG91_SENDER_NAME') || 'ContractNest';

/**
 * Send email via MSG91
 * API: https://docs.msg91.com/reference/send-email
 */
export async function handleEmail(request: EmailRequest): Promise<ProcessResult> {
  const { to, subject, body, metadata } = request;

  if (!MSG91_AUTH_KEY) {
    console.error('MSG91_AUTH_KEY not configured');
    return {
      success: false,
      error: 'Email provider not configured'
    };
  }

  if (!to) {
    return {
      success: false,
      error: 'Recipient email is required'
    };
  }

  try {
    // MSG91 Email API endpoint
    const url = 'https://api.msg91.com/api/v5/email/send';

    const payload = {
      recipients: [
        {
          to: [{ email: to, name: metadata?.recipient_name || to.split('@')[0] }]
        }
      ],
      from: {
        email: MSG91_SENDER_EMAIL,
        name: MSG91_SENDER_NAME
      },
      domain: MSG91_SENDER_EMAIL.split('@')[1],
      subject: subject,
      body: body,
      // Optional: Add template_id if using MSG91 templates
      // template_id: metadata?.msg91_template_id
    };

    console.log(`Sending email to ${to}: ${subject}`);

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
      console.log(`Email sent successfully to ${to}, request_id: ${result.request_id}`);
      return {
        success: true,
        provider_message_id: result.request_id
      };
    } else {
      console.error('MSG91 email error:', result);
      return {
        success: false,
        error: result.message || `MSG91 error: ${response.status}`
      };
    }

  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

/**
 * Handle MSG91 email webhook callback
 * Called when email status updates (delivered, opened, bounced, etc.)
 */
export interface MSG91EmailWebhook {
  request_id: string;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'dropped' | 'spam';
  email: string;
  timestamp: string;
  description?: string;
}

export function mapMSG91EmailStatus(event: string): string {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'opened': 'read',
    'clicked': 'read',
    'bounced': 'failed',
    'dropped': 'failed',
    'spam': 'failed'
  };
  return statusMap[event] || event.toLowerCase();
}
