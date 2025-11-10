# User Invite - Complete User Flow

**Date:** 2025-11-10
**Feature:** User Invitation End-to-End Flow
**Current Status:** Fully functional in console mode (logs instead of sending)

---

## 🎬 Complete Flow: From "Invite" Click to User Acceptance

### **Visual Overview**

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ADMIN INVITES USER                                │
├──────────────────────────────────────────────────────────────────────┤
│  1. Click "Invite User" button                                       │
│  2. Fill invitation form                                             │
│  3. Submit form                                                      │
│  4. System creates invitation + sends email/WhatsApp (console mode)  │
│  5. Admin sees invitation in "Pending" list                          │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    USER RECEIVES INVITATION                          │
├──────────────────────────────────────────────────────────────────────┤
│  6. User receives email/WhatsApp with invitation link                │
│  7. User clicks link → Opens invitation page                         │
│  8. System validates invitation codes                                │
│  9. Shows invitation preview                                         │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    USER ACCEPTS INVITATION                           │
├──────────────────────────────────────────────────────────────────────┤
│  10a. NEW USER: Fills registration form → Creates account            │
│  10b. EXISTING USER: Clicks "Accept" → Adds to workspace             │
│  11. Invitation marked as "Accepted"                                 │
│  12. User redirected to workspace                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📱 STEP-BY-STEP FLOW

### **STEP 1: Admin Opens User Management**

**Location:** `/settings/users`
**File:** `contractnest-ui/src/pages/settings/users/index.tsx`

**What User Sees:**
```
┌────────────────────────────────────────────────────────────────┐
│  Settings > Users                                              │
├────────────────────────────────────────────────────────────────┤
│  [+ Invite User]  [↻ Refresh]                                  │
│                                                                │
│  Tabs: [All] [Active] [Pending]                                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Name         Email             Role        Status         │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ John Doe     john@email.com   Admin       Active         │ │
│  │ Jane Smith   jane@email.com   Member      Active         │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**When user clicks "Pending" tab:**
- Shows list of pending invitations
- Displays: email/mobile, method (📧/📱/💬), status, sent date
- Actions: Resend, Cancel

---

### **STEP 2: Admin Clicks "Invite User" Button**

**File:** `contractnest-ui/src/pages/settings/users/index.tsx:185`

```typescript
// Line 185
const handleInviteTeamMember = async (data: any) => {
  const invitation = await createInvitation(data);
  if (invitation) {
    setShowInviteModal(false);
    // Refresh the list
    await handleRefresh();
  }
};
```

**Action:**
- Sets `showInviteModal = true`
- Opens modal dialog with invitation form

---

### **STEP 3: Invitation Form Appears**

**File:** `contractnest-ui/src/components/users/InviteUserForm.tsx`

**What User Sees:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Invite Team Member                                         [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contact Information:                                           │
│  Enter email or mobile number. Invitation will be sent         │
│  automatically.                                                 │
│                                                                 │
│  Email address (optional)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ user@example.com                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Mobile number (optional)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ +91 9876543210                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Role                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Select a role                                      [▼] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Custom message (optional)                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Welcome to the team!                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                              [Send Invitation]        │
└─────────────────────────────────────────────────────────────────┘
```

**Current Behavior:**
- User enters **EITHER** email OR mobile (not both required)
- Role dropdown populated from available roles
- Optional custom message field

**Form Submission Logic (Lines 70-94):**
```typescript
const onFormSubmit = async (data: InviteFormData) => {
  const invitationData: CreateInvitationData = {
    invitation_method: data.email ? 'email' : 'sms'  // ⚠️ WhatsApp not exposed
  };

  if (data.email) invitationData.email = data.email;
  if (data.mobile_number) invitationData.mobile_number = data.mobile_number;
  if (data.role_id) invitationData.role_id = data.role_id;
  if (data.custom_message) invitationData.custom_message = data.custom_message;

  await onSubmit(invitationData);
};
```

**⚠️ Current Issue:**
- Hardcoded logic: email → 'email', mobile → 'sms'
- WhatsApp option exists in backend but NOT exposed in UI
- No way for user to choose between SMS vs WhatsApp

---

### **STEP 4: Form Submits → API Call**

**Flow:** UI → API Controller → Edge Function

#### **4.1: Frontend Hook**
**File:** `contractnest-ui/src/hooks/useInvitations.ts:124-149`

```typescript
const createInvitation = async (data: CreateInvitationData) => {
  try {
    setIsLoading(true);
    setError(null);

    // POST to API
    const response = await api.post(
      API_ENDPOINTS.USERS.INVITATIONS.BASE,
      data
    );

    if (response.data) {
      toast.success('Invitation sent successfully');
      return response.data;
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.error || 'Failed to send invitation';
    setError(errorMessage);
    toast.error(errorMessage);
    return null;
  } finally {
    setIsLoading(false);
  }
};
```

**API Endpoint:** `POST /api/users/invitations`

---

#### **4.2: API Controller**
**File:** `contractnest-api/src/controllers/invitationController.ts:125-202`

```typescript
export const createInvitation = async (req, res) => {
  try {
    const { email, mobile_number, invitation_method, role_id, custom_message } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Validation
    if (!email && !mobile_number) {
      return res.status(400).json({ error: 'Email or mobile number required' });
    }

    if (!['email', 'sms', 'whatsapp'].includes(invitation_method)) {
      return res.status(400).json({ error: 'Invalid invitation method' });
    }

    // Forward to Supabase Edge Function
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/user-invitations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${req.user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          email,
          mobile_number,
          invitation_method,
          role_id,
          custom_message
        })
      }
    );

    const data = await supabaseResponse.json();
    return res.status(201).json(data);
  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
};
```

**Action:**
- Validates input (email/mobile, method)
- Forwards request to Supabase Edge Function

---

#### **4.3: Edge Function - Create Invitation**
**File:** `contractnest-edge/supabase/functions/user-invitations/index.ts:308-516`

**Main Steps:**

**Step 4.3.1: Validate Input (Lines 312-318)**
```typescript
if (!email && !mobile_number) {
  return new Response(
    JSON.stringify({ error: 'Either email or mobile number is required' }),
    { status: 400 }
  );
}
```

**Step 4.3.2: Check if User Already Exists (Lines 320-344)**
```typescript
// Check if user with this email already exists
if (email) {
  const { data: existingUser } = await supabase
    .from('t_user_profiles')
    .select('id, user_id')
    .eq('email', email)
    .single();

  if (existingUser) {
    // Check if user already has access to this tenant
    const { data: existingAccess } = await supabase
      .from('t_user_tenants')
      .select('id')
      .eq('user_id', existingUser.user_id)
      .eq('tenant_id', tenantId)
      .single();

    if (existingAccess) {
      return new Response(
        JSON.stringify({ error: 'User already has access to this workspace' }),
        { status: 400 }
      );
    }
  }
}
```

**Step 4.3.3: Check for Existing Pending Invitation (Lines 346-366)**
```typescript
const { data: existingInvite } = await supabase
  .from('t_user_invitations')
  .select('id')
  .eq('tenant_id', tenantId)
  .in('status', ['pending', 'sent', 'resent'])
  .eq(email ? 'email' : 'mobile_number', email || mobile_number)
  .single();

if (existingInvite) {
  return new Response(
    JSON.stringify({ error: 'An invitation is already pending for this user' }),
    { status: 400 }
  );
}
```

**Step 4.3.4: Generate Invitation Codes (Lines 368-370)**
```typescript
const userCode = generateUserCode(8);      // e.g., "AB12CD34"
const secretCode = generateSecretCode(5);   // e.g., "XY789"
```

**Step 4.3.5: Create Invitation Record (Lines 372-396)**
```typescript
const invitationData = {
  tenant_id: tenantId,
  invited_by: userId,
  user_code: userCode,
  secret_code: secretCode,
  email: email || null,
  mobile_number: mobile_number || null,
  invitation_method: invitation_method || 'email',
  status: 'pending',
  created_by: userId,
  expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
  metadata: {
    intended_role: role_id ? { role_id } : null,
    custom_message: custom_message || null,
    invitation_url: generateInvitationLink(userCode, secretCode),
    delivery: {}
  }
};

const { data: invitation, error } = await supabase
  .from('t_user_invitations')
  .insert(invitationData)
  .select()
  .single();
```

**Database Insert:**
- Table: `t_user_invitations`
- Status: `'pending'`
- Expires: 48 hours from now

**Step 4.3.6: Log Audit Trail (Lines 404-407)**
```typescript
await logAuditTrail(supabase, invitation.id, 'created', userId, {
  invitation_method,
  recipient: email || mobile_number
});
```

**Database Insert:**
- Table: `t_invitation_audit_log`
- Action: `'created'`

**Step 4.3.7: Get Inviter & Tenant Details (Lines 409-421)**
```typescript
// Get inviter name
const { data: inviterProfile } = await supabase
  .from('t_user_profiles')
  .select('first_name, last_name')
  .eq('user_id', userId)
  .single();

// Get workspace name
const { data: tenant } = await supabase
  .from('t_tenants')
  .select('name, workspace_code')
  .eq('id', tenantId)
  .single();
```

**Step 4.3.8: Generate Invitation Link (Line 424)**
```typescript
const invitationLink = generateInvitationLink(userCode, secretCode);
// Returns: "https://yourapp.com/register/invitation?code=AB12CD34&secret=XY789"
```

**Step 4.3.9: Send Invitation (Lines 430-458)**
```typescript
let sendSuccess = false;
let sendError = null;

try {
  if (invitation_method === 'email' && email) {
    sendSuccess = await sendInvitationEmail({
      to: email,
      inviterName: `${inviterProfile?.first_name} ${inviterProfile?.last_name}`,
      workspaceName: tenant?.name,
      invitationLink,
      customMessage: custom_message
    });
  } else if (invitation_method === 'sms' && mobile_number) {
    sendSuccess = await sendInvitationSMS({...});
  } else if (invitation_method === 'whatsapp' && mobile_number) {
    sendSuccess = await sendInvitationWhatsApp({...});
  }
} catch (error) {
  console.error('Error sending invitation:', error);
  sendError = error.message;
}
```

---

### **STEP 5: Email/WhatsApp Sending (CONSOLE MODE)**

#### **5.1: Email Sending Function**
**File:** `contractnest-edge/supabase/functions/user-invitations/index.ts:518-589`

**Current Implementation:**
```typescript
async function sendInvitationEmail(data: {
  to: string;
  inviterName: string;
  workspaceName: string;
  invitationLink: string;
  customMessage?: string;
}): Promise<boolean> {
  try {
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'console';

    // ⚠️ CURRENT MODE: Console only (default)
    if (emailProvider === 'console') {
      console.log('=== EMAIL INVITATION (Console Mode) ===');
      console.log(`To: ${data.to}`);
      console.log(`From: noreply@contractnest.com`);
      console.log(`Subject: You're invited to ${data.workspaceName}`);
      console.log(`Body:`);
      console.log(generateEmailHTML(data));
      console.log('=======================================');
      return true;  // ✅ Returns success (but doesn't actually send)
    }

    // Has SendGrid code (not active)
    if (emailProvider === 'sendgrid') {
      // SendGrid integration code exists but not used
    }

    return false;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
```

**Email Template (Lines 670-698):**
```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff;">
    <!-- Header -->
    <div style="background: #4F46E5; color: white; padding: 30px; text-align: center;">
      <h1>You're Invited!</h1>
    </div>

    <!-- Body -->
    <div style="padding: 40px;">
      <p>Hi there,</p>
      <p><strong>John Doe</strong> has invited you to join <strong>ABC Company</strong>.</p>

      <!-- Custom Message (if provided) -->
      <div style="background: #EEF2FF; padding: 15px; margin: 20px 0;">
        <p>Welcome to the team!</p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://app.com/register/invitation?code=AB12CD34&secret=XY789"
           style="background: #4F46E5; color: white; padding: 14px 30px;
                  text-decoration: none; border-radius: 6px;">
          Accept Invitation
        </a>
      </div>

      <!-- Footer -->
      <p style="font-size: 14px; color: #666;">This invitation expires in 48 hours.</p>
      <p style="font-size: 14px; color: #666;">
        If you can't click the button, copy this link:
        https://app.com/register/invitation?code=AB12CD34&secret=XY789
      </p>
    </div>
  </div>
</body>
</html>
```

**⚠️ Current State:**
- Logs email to server console
- Does NOT actually send email
- User never receives invitation
- Returns `success: true` anyway

---

#### **5.2: WhatsApp Sending Function**
**File:** `contractnest-edge/supabase/functions/user-invitations/index.ts:642-667`

**Current Implementation:**
```typescript
async function sendInvitationWhatsApp(data: any): Promise<boolean> {
  const whatsappProvider = Deno.env.get('WHATSAPP_PROVIDER') || 'console';

  // ⚠️ CURRENT MODE: Console only (default)
  if (whatsappProvider === 'console') {
    console.log('=== WHATSAPP INVITATION (Console Mode) ===');
    console.log(`To: ${data.mobile_number}`);
    console.log(`Message: ${data.inviterName} invited you to ${data.workspaceName}`);
    console.log(`Link: ${data.invitationLink}`);
    console.log('==========================================');
    return true;  // ✅ Returns success (but doesn't actually send)
  }

  // TODO: Add WhatsApp Business API integration here
  throw new Error('WhatsApp provider not configured');
}
```

**⚠️ Current State:**
- Logs message to server console
- Does NOT actually send WhatsApp
- User never receives invitation
- Returns `success: true` anyway

---

### **STEP 6: Update Invitation Status**

**File:** `contractnest-edge/supabase/functions/user-invitations/index.ts:460-498`

```typescript
// Update invitation status based on send result
if (sendSuccess) {
  await supabase
    .from('t_user_invitations')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        ...invitation.metadata,
        delivery: {
          status: 'sent',
          method: invitation_method,
          sent_at: new Date().toISOString()
        }
      }
    })
    .eq('id', invitation.id);

  await logAuditTrail(supabase, invitation.id, 'sent', userId, {
    method: invitation_method,
    recipient: email || mobile_number
  });
} else {
  // Update metadata with send error
  await supabase
    .from('t_user_invitations')
    .update({
      metadata: {
        ...invitation.metadata,
        delivery: {
          status: 'failed',
          method: invitation_method,
          error: sendError,
          attempted_at: new Date().toISOString()
        }
      }
    })
    .eq('id', invitation.id);
}
```

**Database Updates:**
- Status: `'pending'` → `'sent'`
- `sent_at`: Current timestamp
- `metadata.delivery`: Delivery status info

---

### **STEP 7: Response Returns to UI**

**Response Format:**
```json
{
  "id": "inv_123456",
  "tenant_id": "tenant_abc",
  "email": "newuser@example.com",
  "invitation_method": "email",
  "status": "sent",
  "user_code": "AB12CD34",
  "secret_code": "XY789",
  "expires_at": "2025-11-12T10:30:00Z",
  "invitation_link": "https://app.com/register/invitation?code=AB12CD34&secret=XY789",
  "send_status": "sent",
  "send_error": null,
  "metadata": {
    "intended_role": { "role_id": "role_123" },
    "custom_message": "Welcome to the team!",
    "delivery": {
      "status": "sent",
      "method": "email",
      "sent_at": "2025-11-10T10:30:00Z"
    }
  }
}
```

**UI Response:**
- ✅ Success toast: "Invitation sent successfully"
- Modal closes
- Invitation list refreshes
- New invitation appears in "Pending" tab

---

### **STEP 8: Admin Views Pending Invitation**

**File:** `contractnest-ui/src/components/users/InvitationsList.tsx`

**What Admin Sees:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Pending Invitations (1)                                             │
├──────────────────────────────────────────────────────────────────────┤
│  Email/Mobile          Method    Status    Sent           Actions    │
├──────────────────────────────────────────────────────────────────────┤
│  📧 newuser@email.com  Email     Sent      2 min ago      [Resend]   │
│                                                           [Cancel]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Method Icons (Lines 74-81):**
```typescript
const getMethodIcon = (method: string) => {
  switch (method) {
    case 'email': return <Mail className="w-4 h-4" />;        // 📧
    case 'sms': return <Phone className="w-4 h-4" />;        // 📱
    case 'whatsapp': return <MessageCircle className="w-4 h-4" />; // 💬
    default: return <Mail className="w-4 h-4" />;
  }
};
```

---

## 👤 USER SIDE - INVITATION ACCEPTANCE

### **STEP 9: User Receives Invitation**

**⚠️ Current State:** User does NOT actually receive anything (console mode)

**Future State:** User receives email/WhatsApp with:

**Email Content:**
```
From: noreply@contractnest.com
To: newuser@example.com
Subject: You're invited to ABC Company

┌─────────────────────────────────────┐
│     You're Invited!                 │
├─────────────────────────────────────┤
│                                     │
│ Hi there,                           │
│                                     │
│ John Doe has invited you to join    │
│ ABC Company.                        │
│                                     │
│ Welcome to the team!                │
│                                     │
│     [Accept Invitation]             │
│                                     │
│ This invitation expires in 48 hours.│
└─────────────────────────────────────┘
```

**WhatsApp Content:**
```
💼 Invitation to join ABC Company

Hi! John Doe has invited you to join ABC Company.

👉 Accept invitation:
https://app.com/register/invitation?code=AB12CD34&secret=XY789

⏰ Expires in 48 hours
```

---

### **STEP 10: User Clicks Invitation Link**

**URL Format:**
```
https://yourapp.com/register/invitation?code=AB12CD34&secret=XY789
```

**Route:** `/register/invitation`
**File:** `contractnest-ui/src/pages/auth/InvitationRegisterPage.tsx`

---

### **STEP 11: System Validates Invitation**

**File:** `InvitationRegisterPage.tsx:67-140`

```typescript
useEffect(() => {
  validateInvitation();
}, [userCode, secretCode]);

const validateInvitation = async () => {
  if (!userCode || !secretCode) {
    toast.error('Invalid invitation link');
    navigate('/login');
    return;
  }

  try {
    // API Call: POST /api/users/invitations/validate
    const response = await api.post(API_ENDPOINTS.USERS.INVITATIONS.VALIDATE, {
      user_code: userCode,
      secret_code: secretCode
    });

    if (!response.data.valid) {
      throw new Error(response.data.error || 'Invalid invitation');
    }

    const inviteData = response.data.invitation;
    setInvitation(inviteData);

    // Check if user already exists
    if (inviteData.user_exists && inviteData.email) {
      // Existing user flow
      setExistingUser({ ...userDetails });
      setCurrentStep('preview');
    } else {
      // New user flow
      setCurrentStep('form');
    }

    setLoading(false);
  } catch (error) {
    toast.error(error.message);
    navigate('/login');
  }
};
```

**API Endpoint:** `POST /api/users/invitations/validate`

**Edge Function Validation (Lines 323-377):**
```typescript
async function validateInvitation(supabase: any, body: any) {
  const { user_code, secret_code } = body;

  // Get invitation
  const { data: invitation } = await supabase
    .from('t_user_invitations')
    .select('*, tenant:t_tenants(id, name, workspace_code)')
    .eq('user_code', user_code)
    .eq('secret_code', secret_code)
    .single();

  if (!invitation) {
    return { valid: false, error: 'Invalid invitation' };
  }

  // Check status
  if (!['pending', 'sent', 'resent'].includes(invitation.status)) {
    return { valid: false, error: 'Invitation already used or cancelled' };
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('t_user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);

    return { valid: false, error: 'Invitation has expired' };
  }

  // Check if user exists
  let userExists = false;
  if (invitation.email) {
    const { data: existingUser } = await supabase
      .from('t_user_profiles')
      .select('user_id')
      .eq('email', invitation.email)
      .single();

    userExists = !!existingUser;
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      mobile_number: invitation.mobile_number,
      tenant: invitation.tenant,
      user_exists: userExists
    }
  };
}
```

**Validation Checks:**
- ✅ Codes match
- ✅ Status is valid (pending/sent/resent)
- ✅ Not expired
- ✅ Check if user already exists

---

### **STEP 12a: NEW USER - Registration Form**

**File:** `InvitationRegisterPage.tsx:185-258`

**What User Sees:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Accept Invitation to ABC Company                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  John Doe has invited you to join ABC Company                   │
│                                                                 │
│  First Name                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ John                                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Last Name                                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Smith                                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Email (pre-filled)                                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ newuser@example.com                              [locked] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Password                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ••••••••                                              👁  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Confirm Password                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ••••••••                                              👁  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Mobile Number (optional)                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ +91 9876543210                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Cancel]                                 [Create Account]     │
└─────────────────────────────────────────────────────────────────┘
```

**Form Submission:**
```typescript
const handleNewUserSubmit = async (e) => {
  e.preventDefault();

  // Validate password
  if (formData.password !== formData.confirmPassword) {
    setErrors({ confirmPassword: 'Passwords do not match' });
    return;
  }

  try {
    setSubmitting(true);

    // API Call: POST /api/users/invitations/accept
    const response = await api.post(API_ENDPOINTS.USERS.INVITATIONS.ACCEPT, {
      user_code: userCode,
      secret_code: secretCode,
      user_data: {
        email: invitation.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        mobile_number: formData.mobileNumber
      }
    });

    if (response.data.success) {
      toast.success('Account created successfully!');
      navigate('/login');
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to accept invitation');
  } finally {
    setSubmitting(false);
  }
};
```

**Backend Processing (Edge Function Lines 382-441):**
```typescript
async function acceptInvitation(supabase: any, body: any) {
  const { user_code, secret_code, user_data } = body;

  // Validate invitation
  const validation = await validateInvitation(supabase, { user_code, secret_code });
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const invitation = validation.invitation;

  if (invitation.user_exists) {
    // EXISTING USER: Just add to tenant
    const { data: user } = await supabase
      .from('t_user_profiles')
      .select('user_id')
      .eq('email', invitation.email)
      .single();

    // Add user to tenant
    await supabase
      .from('t_user_tenants')
      .insert({
        user_id: user.user_id,
        tenant_id: invitation.tenant.id,
        role_id: invitation.metadata.intended_role?.role_id,
        status: 'active'
      });
  } else {
    // NEW USER: Create account first

    // 1. Create auth user (Supabase Auth)
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: user_data.email,
      password: user_data.password
    });

    if (authError) throw authError;

    // 2. Create user profile
    await supabase
      .from('t_user_profiles')
      .insert({
        user_id: authUser.user.id,
        email: user_data.email,
        first_name: user_data.first_name,
        last_name: user_data.last_name,
        mobile_number: user_data.mobile_number
      });

    // 3. Add to tenant
    await supabase
      .from('t_user_tenants')
      .insert({
        user_id: authUser.user.id,
        tenant_id: invitation.tenant.id,
        role_id: invitation.metadata.intended_role?.role_id,
        status: 'active'
      });
  }

  // Mark invitation as accepted
  await supabase
    .from('t_user_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', invitation.id);

  // Log audit
  await logAuditTrail(supabase, invitation.id, 'accepted', null, {
    accepted_by: user_data.email
  });

  return { success: true };
}
```

**Database Operations:**
1. Create user in `auth.users` (Supabase Auth)
2. Create profile in `t_user_profiles`
3. Add tenant access in `t_user_tenants`
4. Update invitation status: `'sent'` → `'accepted'`
5. Log audit trail

---

### **STEP 12b: EXISTING USER - Accept Invitation**

**File:** `InvitationRegisterPage.tsx:260-331`

**What User Sees:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Accept Invitation to ABC Company                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back, John Smith!                                      │
│                                                                 │
│  John Doe has invited you to join ABC Company                   │
│                                                                 │
│  You already have an account. Click below to accept the         │
│  invitation and get access to this workspace.                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Your Account                                           │   │
│  │  john.smith@example.com                                 │   │
│  │  Member since: Jan 2024                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Decline]                              [Accept Invitation]    │
└─────────────────────────────────────────────────────────────────┘
```

**Accept Action:**
```typescript
const handleExistingUserAccept = async () => {
  try {
    setSubmitting(true);

    // API Call: POST /api/users/invitations/accept
    const response = await api.post(API_ENDPOINTS.USERS.INVITATIONS.ACCEPT, {
      user_code: userCode,
      secret_code: secretCode
    });

    if (response.data.success) {
      toast.success(`You now have access to ${invitation.tenant.name}!`);
      navigate('/dashboard');
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to accept invitation');
  } finally {
    setSubmitting(false);
  }
};
```

**Backend Processing:**
- Skip user creation (already exists)
- Just add to `t_user_tenants`
- Mark invitation as accepted

---

### **STEP 13: Invitation Completed**

**Database State:**
- `t_user_invitations.status`: `'accepted'`
- `t_user_invitations.accepted_at`: Current timestamp
- `t_user_tenants`: New row with user access
- `t_invitation_audit_log`: New entry for 'accepted' action

**UI State:**
- User redirected to login (new user) or dashboard (existing user)
- Success message shown
- Admin sees invitation removed from "Pending" list

---

## 📊 Data Flow Summary

### **Database Tables Involved:**

1. **t_user_invitations**
   - Stores invitation records
   - Status progression: `pending → sent → accepted`

2. **t_user_profiles**
   - User account information
   - Created during new user registration

3. **t_user_tenants**
   - User-tenant relationships
   - Created when invitation accepted

4. **t_invitation_audit_log**
   - Tracks all invitation events
   - Actions: created, sent, resent, accepted, cancelled, expired

5. **auth.users** (Supabase Auth)
   - Authentication credentials
   - Created during new user registration

---

## ⚠️ Current Limitations

### **What Works:**
- ✅ Complete invitation flow end-to-end
- ✅ Database operations
- ✅ Invitation validation
- ✅ New user registration
- ✅ Existing user acceptance
- ✅ Expiry handling
- ✅ Duplicate checking
- ✅ Audit logging

### **What's Missing:**
- ❌ **Actual email sending** (console mode only)
- ❌ **Actual WhatsApp sending** (console mode only)
- ❌ **WhatsApp option in UI** (not exposed)
- ❌ **Real-time notifications** (when invitation accepted)
- ❌ **Delivery tracking** (email opened, link clicked)

---

## 🔄 Alternative Flows

### **Resend Invitation**

**Trigger:** Admin clicks "Resend" on pending invitation

**Flow:**
1. Edge function generates new codes
2. Updates expiry time (+48 hours)
3. Sends new email/WhatsApp (console mode)
4. Updates status to `'resent'`
5. Increments `resent_count`

**File:** `user-invitations/index.ts:716-788`

### **Cancel Invitation**

**Trigger:** Admin clicks "Cancel" on pending invitation

**Flow:**
1. Updates status to `'cancelled'`
2. Sets `cancelled_at` timestamp
3. Logs audit trail
4. Removes from pending list

### **Invitation Expiry**

**Automatic:** When user tries to use expired invitation

**Flow:**
1. Validation checks `expires_at`
2. If expired, updates status to `'expired'`
3. Shows error to user
4. Admin can resend if needed

---

## 📈 Success & Error Scenarios

### **✅ Success Path:**
```
Admin invites → Email sent (console) → User clicks → User registers →
User logs in → Invitation marked accepted → User has access
```

### **❌ Error Scenarios:**

| Error | When | Message | Recovery |
|-------|------|---------|----------|
| Invalid email format | Form submission | "Invalid email address" | Fix and resubmit |
| User already has access | Creating invitation | "User already has access to this workspace" | N/A |
| Pending invitation exists | Creating invitation | "An invitation is already pending for this user" | Resend existing |
| Invalid invitation codes | Clicking link | "Invalid invitation" | Request new invitation |
| Invitation expired | Clicking link | "Invitation has expired" | Request resend |
| Invitation already used | Clicking link | "Invitation already used or cancelled" | N/A |
| Passwords don't match | Registration | "Passwords do not match" | Fix and resubmit |

---

## 🎯 Next Steps to Make It Work

### **To enable actual email/WhatsApp sending:**

1. **Set environment variables:**
   ```bash
   EMAIL_PROVIDER=msg91
   WHATSAPP_PROVIDER=msg91
   MSG91_AUTH_KEY=xxx
   MSG91_SENDER_EMAIL=xxx
   MSG91_SENDER_NAME=xxx
   MSG91_WHATSAPP_NUMBER=xxx
   ```

2. **Implement MSG91 integration in edge functions:**
   - Replace console logging with MSG91 API calls
   - Use code from `contractnest-api/src/services/*.service.ts`
   - Adapt for Deno runtime

3. **Expose WhatsApp option in UI:**
   - Add radio buttons to form
   - Let user choose SMS vs WhatsApp when mobile entered

4. **Test end-to-end:**
   - Create invitation
   - Receive email/WhatsApp
   - Click link
   - Register/Accept
   - Verify access granted

---

**That's the complete user flow!** 🎉

Every step from clicking "Invite" to user acceptance is fully functional in console mode. Just need to connect real email/WhatsApp providers to make it live.
