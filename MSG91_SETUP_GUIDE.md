# MSG91 Setup Guide for User Invitations

This guide will help you set up MSG91 for real email and WhatsApp invitations in ContractNest.

## 📋 Prerequisites

1. MSG91 Account - Sign up at https://msg91.com/
2. Access to your MSG91 Dashboard
3. Railway account for deploying edge functions (or Supabase CLI for local testing)

## 🔑 Step 1: Get MSG91 Credentials

### 1.1 Get Auth Key
1. Log in to MSG91 Dashboard
2. Go to **Settings** → **API Keys**
3. Copy your **Auth Key**
4. Save it securely (you'll need this for `MSG91_AUTH_KEY`)

### 1.2 Set up Email Service
1. In MSG91 Dashboard, go to **Email** → **Settings**
2. Verify your sender email domain (e.g., `noreply@yourcompany.com`)
3. Note your **Sender Email** and **Sender Name**

### 1.3 Set up SMS Service (Optional)
1. Go to **SMS** → **Settings**
2. Get your **Sender ID** (6-character alphanumeric ID)
3. Choose your **Route** (usually `4` for Transactional SMS)

### 1.4 Set up WhatsApp Business (Optional)
1. Go to **WhatsApp** → **Settings**
2. Connect your WhatsApp Business Account
3. Note your **WhatsApp Number** (with country code, e.g., `919876543210`)
4. Create an invitation template:
   - Go to **WhatsApp** → **Templates**
   - Create a new template named `user_invitation`
   - Template content:
     ```
     You're invited to join {{1}} by {{2}}!

     Click here to accept: {{3}}
     ```
   - Get it approved by Meta (takes 24-48 hours)

## 🚀 Step 2: Set Environment Variables

### For Local Development (Supabase Functions)

Create/update `.env` file in `contractnest-edge`:

```bash
# Email Configuration
EMAIL_PROVIDER=msg91
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_EMAIL=noreply@yourcompany.com
MSG91_SENDER_NAME=YourCompany

# SMS Configuration (Optional)
SMS_PROVIDER=msg91
MSG91_SENDER_ID=YOURID
MSG91_ROUTE=4
MSG91_COUNTRY_CODE=91

# WhatsApp Configuration (Optional)
WHATSAPP_PROVIDER=msg91
MSG91_WHATSAPP_NUMBER=919876543210
MSG91_WHATSAPP_INVITE_TEMPLATE=user_invitation
```

### For Railway Deployment

1. Go to Railway Dashboard
2. Select your `contractnest-edge` service
3. Go to **Variables** tab
4. Add these environment variables:

```
EMAIL_PROVIDER=msg91
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_EMAIL=noreply@yourcompany.com
MSG91_SENDER_NAME=YourCompany
SMS_PROVIDER=msg91
MSG91_SENDER_ID=YOURID
MSG91_ROUTE=4
WHATSAPP_PROVIDER=msg91
MSG91_WHATSAPP_NUMBER=919876543210
MSG91_WHATSAPP_INVITE_TEMPLATE=user_invitation
```

5. Click **Deploy** to apply changes

## 🧪 Step 3: Test Locally (Before Deploying)

### 3.1 Test with Console First

Start with console mode to verify the flow works:

```bash
# In .env
EMAIL_PROVIDER=console
SMS_PROVIDER=console
WHATSAPP_PROVIDER=console
```

Run Supabase locally:
```bash
cd contractnest-edge
supabase functions serve user-invitations
```

Test creating an invitation - you should see output in the console.

### 3.2 Test with MSG91

Once console test works, switch to MSG91:

```bash
# In .env
EMAIL_PROVIDER=msg91
SMS_PROVIDER=msg91
WHATSAPP_PROVIDER=msg91
```

**Test Email Invitation:**
1. Create a new invitation with your email
2. Check your inbox for the invitation email
3. Verify the invitation link works

**Test SMS Invitation (if configured):**
1. Create invitation with mobile number
2. Check your phone for SMS
3. Verify the link in SMS works

**Test WhatsApp Invitation (if configured):**
1. Ensure template is approved in MSG91
2. Create invitation with mobile number
3. Check WhatsApp for the message
4. Verify the link works

## 📊 Step 4: Monitor in MSG91 Dashboard

### Email Logs
1. Go to **Email** → **Logs**
2. You should see your sent emails
3. Check delivery status

### SMS Logs
1. Go to **SMS** → **Reports**
2. View sent SMS messages
3. Check delivery status

### WhatsApp Logs
1. Go to **WhatsApp** → **Logs**
2. View sent WhatsApp messages
3. Check delivery status

## 🐛 Troubleshooting

### Email Not Sending

**Check:**
- ✅ `MSG91_AUTH_KEY` is correct
- ✅ Sender email domain is verified in MSG91
- ✅ Email logs in MSG91 dashboard show the request
- ✅ Check spam folder

**Common Issues:**
- **Authentication failed**: Wrong auth key
- **Domain not verified**: Verify sender domain in MSG91
- **Rate limit exceeded**: Check your MSG91 plan limits

### WhatsApp Not Sending

**Check:**
- ✅ WhatsApp Business Account is connected
- ✅ Template `user_invitation` is approved by Meta
- ✅ Template name matches exactly (case-sensitive)
- ✅ Mobile number includes country code

**Common Issues:**
- **Template not found**: Template name mismatch or not approved
- **Invalid phone number**: Must include country code (e.g., `919876543210`)
- **24-hour window**: WhatsApp requires opt-in or 24-hour window for templates

### SMS Not Sending

**Check:**
- ✅ Sender ID is approved
- ✅ Route is correct (usually `4` for transactional)
- ✅ Mobile number format is correct

## 💰 Pricing

- **Email**: Check MSG91 pricing at https://msg91.com/pricing
- **SMS**: Varies by country
- **WhatsApp**: Conversation-based pricing

**Recommendation**: Start with a small prepaid balance and test thoroughly before production.

## 🔒 Security Best Practices

1. **Never commit credentials** to Git
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** (every 3-6 months)
4. **Monitor usage** to detect anomalies
5. **Set up alerts** in MSG91 for high usage

## ✅ Verification Checklist

Before going to production:

- [ ] MSG91 account created and verified
- [ ] Sender email domain verified
- [ ] Auth key added to environment variables
- [ ] Test email sent successfully
- [ ] Test email received in inbox (not spam)
- [ ] Invitation link works correctly
- [ ] WhatsApp template approved (if using)
- [ ] Test WhatsApp message sent (if using)
- [ ] Logs visible in MSG91 dashboard
- [ ] Railway/production environment variables set
- [ ] Billing/credits set up in MSG91

## 📞 Support

- **MSG91 Support**: support@msg91.com
- **MSG91 Docs**: https://docs.msg91.com/
- **WhatsApp Template Guide**: https://docs.msg91.com/p/waba-template-registration

---

**Next Steps After Setup:**
1. Test all invitation flows (email, SMS, WhatsApp)
2. Monitor deliverability rates
3. Adjust templates based on feedback
4. Set up billing alerts in MSG91
5. Document any custom templates created
