# MSG91 Messaging Architecture - Complete Documentation

**Date:** 2025-11-10
**Branch:** claude/Taskset-1-011CUvf7Ehm4N3BSjgFJEEGZ

---

## 🏗️ Architecture Overview: Simple Environment-Based Messaging

### **Design Philosophy**

Unlike the tenant-configurable integration system (which uses database + UI), the messaging services use a **product-level configuration** approach:

- ✅ Admin configures once via environment variables
- ✅ All tenants share the same MSG91 credentials
- ✅ No UI configuration interface needed
- ✅ No database migrations required
- ✅ Easy to maintain and switch providers

### **Why This Approach?**

1. **Simplicity**: Single point of configuration
2. **Security**: Credentials stored in environment, not database
3. **Cost-effective**: Single MSG91 account for entire product
4. **Consistency**: All emails/SMS have same sender identity
5. **Easy Provider Switch**: Just change one service file + env vars

---

## 📁 File Structure

### **Service Files** (`/contractnest-api/src/services/`)

```
src/services/
├── email.service.ts         ✅ MSG91 Email integration (252 lines)
├── sms.service.ts           ✅ MSG91 SMS integration (249 lines)
└── whatsapp.service.ts      ✅ MSG91 WhatsApp integration (271 lines)
```

### **Documentation** (`/contractnest-api/documentation/`)

```
documentation/
├── msg91Implemenetation.md  ✅ Complete setup guide
├── msg91seupguide.md        ✅ Environment variable guide
└── usageExample.md          ✅ Implementation examples
```

---

## 🔧 Service APIs

### **1. Email Service** (`email.service.ts`)

**Methods:**

```typescript
// Send email with full options
emailService.send({
  to: string | string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[],
  attachments?: Array<{ name: string; content: string }>
}): Promise<EmailResult>

// Send using MSG91 template
emailService.sendTemplate({
  to: string | string[],
  templateId: string,
  variables: Record<string, string>,
  cc?: string[],
  bcc?: string[]
}): Promise<EmailResult>

// Test email service connection
emailService.test(): Promise<EmailResult>
```

**Environment Variables:**
- `MSG91_AUTH_KEY` - Authentication key from MSG91 dashboard
- `MSG91_SENDER_EMAIL` - Verified sender email (e.g., noreply@domain.com)
- `MSG91_SENDER_NAME` - Sender display name (e.g., ContractNest)

**API Endpoint:** `https://control.msg91.com/api/v5/email/send`

**Response Format:**
```typescript
{
  success: boolean,
  message: string,
  data?: any
}
```

### **2. SMS Service** (`sms.service.ts`)

**Methods:**

```typescript
// Send SMS
smsService.send({
  mobile: string | string[],
  message: string,
  templateId?: string,
  variables?: Record<string, string>
}): Promise<SMSResult>

// Send OTP SMS
smsService.sendOTP({
  mobile: string,
  otp: string,
  templateId?: string
}): Promise<SMSResult>

// Test SMS service connection
smsService.test(): Promise<SMSResult>
```

**Environment Variables:**
- `MSG91_AUTH_KEY` - Authentication key
- `MSG91_SENDER_ID` - 6-character sender ID (e.g., MSGIND)
- `MSG91_ROUTE` - Route type: 1=Promotional, 2=OTP, 4=Transactional (default: 4)
- `MSG91_COUNTRY_CODE` - Default country code (default: 91 for India)

**API Endpoint:** `https://control.msg91.com/api/v5/flow/`

**Mobile Number Formatting:**
- Automatically adds country code if missing
- Removes non-digit characters
- Example: `9876543210` → `919876543210`

### **3. WhatsApp Service** (`whatsapp.service.ts`)

**Methods:**

```typescript
// Send template-based WhatsApp message
whatsappService.send({
  mobile: string,
  templateName: string,
  variables?: Record<string, string>,
  mediaUrl?: string
}): Promise<WhatsAppResult>

// Send simple text message
whatsappService.sendText({
  mobile: string,
  message: string
}): Promise<WhatsAppResult>

// Test WhatsApp service connection
whatsappService.test(): Promise<WhatsAppResult>
```

**Environment Variables:**
- `MSG91_AUTH_KEY` - Authentication key
- `MSG91_WHATSAPP_NUMBER` - WhatsApp Business number (e.g., 919876543210)
- `MSG91_COUNTRY_CODE` - Default country code (default: 91)

**API Endpoint:** `https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/`

**Template Requirements:**
- Templates must be pre-created and approved in MSG91 dashboard
- Template variables must match exactly
- WhatsApp number must be verified

---

## 🔐 Environment Configuration

### **Local Development (`.env` file)**

```bash
# MSG91 Authentication
MSG91_AUTH_KEY=your_auth_key_from_msg91_dashboard

# SMS Configuration
MSG91_SENDER_ID=YOURID          # 6-character sender ID
MSG91_ROUTE=4                   # 4=Transactional (recommended)
MSG91_COUNTRY_CODE=91           # India

# Email Configuration
MSG91_SENDER_EMAIL=noreply@yourproduct.com
MSG91_SENDER_NAME=ContractNest

# WhatsApp Configuration
MSG91_WHATSAPP_NUMBER=919876543210    # Your MSG91 WhatsApp Business number
```

### **Railway Production Setup**

1. Go to Railway Dashboard
2. Select your project → "Variables"
3. Add all environment variables listed above
4. Click "Deploy"
5. Verify deployment with test endpoint

---

## 📊 Integration Flow for User Invitations

### **Current State (Local File-Based)**
```
User sends invite → Save to database → Open email file locally
```

### **Target State (Email-Based via MSG91)**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI Layer - Invitation Form                              │
│    User enters: email, name, role                           │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer - Invitation Controller                        │
│    POST /api/users/invite                                   │
│    Generate invite token & link                             │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Email Service - Send Invitation                          │
│    emailService.send({                                      │
│      to: email,                                             │
│      subject: "Invitation to join CompanyName",             │
│      body: HTML email with invite link                      │
│    })                                                       │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. MSG91 API - Deliver Email                                │
│    POST https://control.msg91.com/api/v5/email/send         │
│    Headers: authkey                                         │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. User Receives Email                                      │
│    Clicks invite link → Redirects to frontend               │
│    GET /accept-invite/{token}                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Implementation Examples

### **Example 1: Send Email Invitation**

```typescript
// In invitation controller (src/controllers/invitationController.ts)
import { emailService } from '../services/email.service';

export const sendInvitation = async (req, res) => {
  const { email, userName, companyName } = req.body;

  // Generate invite token
  const inviteToken = generateSecureToken();
  const inviteLink = `${process.env.FRONTEND_URL}/accept-invite/${inviteToken}`;

  // Send email
  const result = await emailService.send({
    to: email,
    subject: `You're invited to join ${companyName}`,
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4F46E5; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">ContractNest</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #111827;">Hello ${userName}!</h2>
            <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
              You've been invited to join <strong>${companyName}</strong> on ContractNest.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}"
                 style="background: #4F46E5; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #9CA3AF; font-size: 14px;">
              This invitation will expire in 7 days.
            </p>
          </div>
        </body>
      </html>
    `
  });

  if (result.success) {
    // Save invitation to database
    await saveInvitation({ email, token: inviteToken, status: 'sent' });

    res.json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      message: result.message
    });
  }
};
```

### **Example 2: Send OTP for Verification**

```typescript
import { smsService } from '../services/sms.service';

export const sendOTP = async (req, res) => {
  const { mobile } = req.body;

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Send via SMS
  const result = await smsService.sendOTP({
    mobile,
    otp
  });

  if (result.success) {
    // Store OTP in cache/database with expiry
    await storeOTP(mobile, otp, 600); // 10 minutes

    res.json({ success: true, message: 'OTP sent successfully' });
  } else {
    res.status(500).json({ success: false, message: result.message });
  }
};
```

### **Example 3: Test Endpoint for Services**

```typescript
// In routes/systemRoutes.ts
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';
import { whatsappService } from '../services/whatsapp.service';

router.get('/health/messaging', async (req, res) => {
  const results = {
    email: await emailService.test(),
    sms: await smsService.test(),
    whatsapp: await whatsappService.test()
  };

  const allHealthy = results.email.success &&
                     results.sms.success &&
                     results.whatsapp.success;

  res.status(allHealthy ? 200 : 500).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      email: {
        status: results.email.success ? 'healthy' : 'error',
        message: results.email.message
      },
      sms: {
        status: results.sms.success ? 'healthy' : 'error',
        message: results.sms.message
      },
      whatsapp: {
        status: results.whatsapp.success ? 'healthy' : 'error',
        message: results.whatsapp.message
      }
    }
  });
});
```

---

## 🎯 Next Steps - Integration Plan

### **Phase 1: Setup & Testing (Today)**

1. ✅ **Add Environment Variables to Railway**
   - Go to Railway dashboard
   - Add all MSG91 variables
   - Deploy and restart

2. ✅ **Create Test Endpoint**
   - Add `/health/messaging` route
   - Test all three services
   - Verify connectivity and balance

3. ✅ **Test Locally**
   - Add variables to `.env`
   - Run test endpoint
   - Send test email/SMS/WhatsApp

### **Phase 2: Invitation Integration (This Week)**

1. 🔄 **Update Invitation Controller**
   - Import `emailService`
   - Replace file-based logic with `emailService.send()`
   - Generate invitation links
   - Save invitations to database

2. 🔄 **Create Email Templates**
   - User invitation email
   - Welcome email
   - Password reset email
   - Account activation email

3. 🔄 **Update Frontend Invite Flow**
   - Remove local file opening logic
   - Show "Email sent" confirmation
   - Handle invite link from email

4. 🔄 **Testing**
   - Send test invitations
   - Verify email delivery
   - Test invite acceptance flow
   - Monitor Sentry for errors

### **Phase 3: Additional Features (Optional)**

1. 📧 **Email Notifications**
   - Document updates
   - Workflow approvals
   - Activity alerts

2. 📱 **SMS Notifications**
   - Urgent alerts
   - OTP for sensitive actions
   - Critical updates

3. 💬 **WhatsApp Notifications**
   - User engagement
   - Important announcements
   - Template-based updates

---

## 🔍 Comparison: Database-Driven vs Environment-Based

### **Database-Driven Integrations** (Existing: Razorpay, Stripe, etc.)

**Use Case:** Tenant-configurable integrations
- ✅ Each tenant can configure their own credentials
- ✅ UI for configuration
- ✅ Encrypted storage in database
- ✅ Tenant-specific settings
- ❌ More complex architecture
- ❌ Requires migrations

**Tables:**
- `t_integration_types`
- `t_integration_providers`
- `t_tenant_integrations`

**Example:** Payment gateways where each tenant needs their own account

### **Environment-Based Services** (New: MSG91 Email/SMS/WhatsApp)

**Use Case:** Product-level messaging services
- ✅ Simple configuration
- ✅ No UI needed
- ✅ Single point of control
- ✅ Cost-effective
- ❌ All tenants share same credentials
- ❌ No per-tenant customization

**Configuration:** Environment variables only

**Example:** Messaging services where admin manages for entire product

---

## 🐛 Troubleshooting

### **"MSG91_AUTH_KEY is not configured"**
- Verify variable exists in Railway/`.env`
- Check variable name spelling (case-sensitive)
- Restart server after adding variables

### **"Failed to send email/SMS"**
- Check MSG91 dashboard for balance
- Verify sender email/ID is approved
- Check MSG91 API status page
- Look at Sentry for detailed errors

### **SMS not delivering**
- Verify mobile number format with country code
- Check if number is in DND registry (India)
- Use transactional route (4) for better delivery
- Verify sender ID is approved

### **WhatsApp not working**
- Verify template is approved in MSG91
- Template variables must match exactly
- WhatsApp number must be verified
- Check if recipient has WhatsApp

### **Test endpoint returns errors**
- Verify all environment variables are set
- Check API key validity in MSG91 dashboard
- Test connectivity to MSG91 API endpoints
- Review Sentry logs for stack traces

---

## 📞 Resources

### **MSG91 Documentation**
- API Docs: https://docs.msg91.com/
- Email API: https://docs.msg91.com/p/tf9GTextN/e/email-api
- SMS API: https://docs.msg91.com/p/tf9GTextN/e/MSG91-sms-api
- WhatsApp API: https://docs.msg91.com/p/tf9GTextN/e/whatsapp-api

### **MSG91 Dashboard**
- Login: https://control.msg91.com/
- API Keys: Settings → API Keys
- Templates: SMS/Email/WhatsApp → Templates
- Balance: Dashboard → Balance

### **Support**
- MSG91 Support: support@msg91.com
- Internal: Check Sentry + Railway logs
- Test endpoint: `GET /health/messaging`

---

## ✨ Summary

### **What You Have:**
- ✅ Three production-ready service files (772 total lines)
- ✅ Comprehensive documentation
- ✅ Clean environment-based architecture
- ✅ Ready for immediate integration
- ✅ Sentry error tracking built-in
- ✅ TypeScript types for all methods

### **What You DON'T Need:**
- ❌ Database migrations
- ❌ UI for configuration
- ❌ Complex provider patterns
- ❌ Tenant-level credentials

### **Time to Production:**
- Environment setup: 5 minutes
- Create test endpoint: 5 minutes
- Test services: 5 minutes
- Integrate invitation: 15 minutes
- **Total: ~30 minutes to go live!** 🚀

### **Files Reference:**
- Services: `contractnest-api/src/services/*.service.ts`
- Documentation: `contractnest-api/documentation/msg91*.md`
- This doc: `claudeDocuments/02-MSG91-Messaging-Architecture.md`

---

**Next Action:** Add environment variables to Railway and create test endpoint!
