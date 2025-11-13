# MSG91 Troubleshooting Guide

## Step 1: Verify Supabase Secrets Are Set

Run this command to list all secrets (won't show values, just names):

```bash
cd contractnest-edge
supabase secrets list
```

**You should see:**
- EMAIL_PROVIDER
- MSG91_AUTH_KEY
- MSG91_SENDER_EMAIL
- MSG91_SENDER_NAME

**If any are missing, set them:**

```bash
supabase secrets set EMAIL_PROVIDER=msg91
supabase secrets set MSG91_AUTH_KEY=your_actual_key_here
supabase secrets set MSG91_SENDER_EMAIL=noreply@yourdomain.com
supabase secrets set MSG91_SENDER_NAME=YourCompanyName
```

---

## Step 2: Redeploy Edge Function

After setting secrets, you MUST redeploy:

```bash
supabase functions deploy user-invitations
```

---

## Step 3: Test and Check Logs

### Send a test invitation:
1. Go to Settings → Users
2. Click Invite Team Member
3. Enter your email
4. Send invitation

### Check Supabase logs:
```bash
supabase functions logs user-invitations --limit 10
```

**OR** in Supabase Dashboard:
1. Edge Functions → user-invitations → Logs

### What to look for in logs:

**✅ GOOD - MSG91 is configured:**
```
Email provider: msg91
Sending email via MSG91...
```

**❌ BAD - Still using console:**
```
Email provider: console
=== CONSOLE EMAIL ===
```

**❌ BAD - Missing credentials:**
```
MSG91 email configuration is incomplete
```

**✅ GOOD - Email sent:**
```
MSG91 response: { type: 'success', message: 'Email sent' }
```

**❌ BAD - MSG91 error:**
```
MSG91 response: { type: 'error', message: 'Authentication failed' }
```

---

## Step 4: Verify MSG91 Dashboard

1. Login to https://msg91.com/
2. Go to **Email** → **Logs**
3. Look for recent email attempts
4. Check status (Sent, Failed, Delivered, Bounced)

---

## Common Issues & Solutions

### Issue 1: Environment variables not loaded
**Symptom:** Logs show "console" instead of "msg91"
**Solution:**
```bash
supabase secrets set EMAIL_PROVIDER=msg91
supabase functions deploy user-invitations
```

### Issue 2: MSG91 configuration incomplete
**Symptom:** Error "MSG91 email configuration is incomplete"
**Solution:** Verify all 4 secrets are set:
```bash
supabase secrets list
```
Should show: EMAIL_PROVIDER, MSG91_AUTH_KEY, MSG91_SENDER_EMAIL, MSG91_SENDER_NAME

### Issue 3: Authentication failed
**Symptom:** MSG91 returns authentication error
**Solution:**
- Check MSG91 Auth Key in MSG91 Dashboard → Settings → API Keys
- Copy the exact key (no extra spaces)
- Reset the secret:
```bash
supabase secrets set MSG91_AUTH_KEY=correct_key_here
supabase functions deploy user-invitations
```

### Issue 4: Domain not verified
**Symptom:** MSG91 rejects sender email
**Solution:**
- Go to MSG91 Dashboard → Email → Settings
- Verify your sender domain (e.g., yourdomain.com)
- Follow MSG91's domain verification process
- Use the verified domain in MSG91_SENDER_EMAIL

### Issue 5: Email in spam
**Symptom:** Email sent but not in inbox
**Solution:**
- Check spam/junk folder
- Set up SPF/DKIM records for your domain in MSG91
- Check MSG91 Dashboard for delivery status

---

## Quick Test Script

Create a test in Supabase SQL Editor to verify secrets:

```sql
-- This won't work directly, but you can check edge function logs
-- After sending an invitation, check logs for:
SELECT * FROM edge_logs WHERE function_name = 'user-invitations' ORDER BY timestamp DESC LIMIT 5;
```

---

## Need More Help?

**Check these in order:**

1. ✅ Secrets are set: `supabase secrets list`
2. ✅ Function deployed: `supabase functions deploy user-invitations`
3. ✅ Logs show "msg91": Check Supabase Dashboard → Edge Functions → Logs
4. ✅ MSG91 dashboard shows attempt: MSG91 → Email → Logs
5. ✅ Domain verified: MSG91 → Email → Settings

**Still not working?**

Share the output of:
```bash
supabase functions logs user-invitations --limit 5
```

And check MSG91 Dashboard → Email → Logs for any error messages.
