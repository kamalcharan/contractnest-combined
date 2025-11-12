# User Invitation System - Session Handover

**Date:** November 12, 2025
**Branch:** `claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ`
**Previous Session:** Code Review Task 011CUvf7Ehm4N3BSjgFJEEGZ

---

## 🎯 Your Mission

Continue work on the ContractNest user invitation system. The previous session completed core functionality fixes. Your task is to:

1. **Merge latest main branch** into feature branch
2. **Integrate and test MSG91** for email/WhatsApp/SMS flows
3. **Replace dots menu with icon buttons** (like services page)
4. **Fix pending tab count display issue**

---

## 📚 Context: What Was Done

### Previous Session Completed:

1. ✅ **Country Code Support** - Added country code selector with `country_code` and `phone_code` fields
2. ✅ **ConfirmationDialog** - Replaced browser `confirm()` with themed dialog component
3. ✅ **Removed Export Button** - From user view page
4. ✅ **Removed Activity Tab** - From user profile view
5. ✅ **Removed Security Information Section** - From overview tab
6. ✅ **Email Validation Fix** - Fixed false positive "already have account" error
7. ✅ **Invitation URL Fix** - Changed from `/accept-invitation` to `/register-invitation`
8. ✅ **Pending Count Update** - Attempts to update immediately after creating invitation

### Key Files Modified:

**UI Submodule (contractnest-ui):**
- `src/components/users/InviteUserForm.tsx` - Country code selector
- `src/components/users/InvitationsList.tsx` - ConfirmationDialog for cancel
- `src/hooks/useInvitations.ts` - Added country_code, phone_code to interface
- `src/pages/settings/users/index.tsx` - Pending count fix attempt
- `src/pages/settings/users/userView.tsx` - Removed export/activity/security, added dialogs

**Edge Submodule (contractnest-edge):**
- `supabase/functions/invitation-management/index.ts` - Email validation, URL fix, country_code support

### Current State:
- All code changes pushed to GitHub
- UI changes applied by user and working
- Ready for next phase of work

---

## 🚀 TASK 1: Merge Main Branch

**Priority:** HIGH
**Time Estimate:** 30 minutes

### Why This Is Needed:
Ensure feature branch has latest changes from main branch before continuing work.

### Steps:

```bash
# 1. Navigate to parent repo
cd /home/user/contractnest-combined

# 2. Fetch latest main
git checkout main
git pull origin main

# 3. Check each submodule
cd contractnest-ui
git checkout main
git pull origin main

cd ../contractnest-edge
git checkout main
git pull origin main

cd ../contractnest-api
git checkout main
git pull origin main

# 4. Switch back to feature branch and merge
cd ..
git checkout claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
git merge main

# 5. Merge main in each submodule
cd contractnest-ui
git checkout claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
git merge main

cd ../contractnest-edge
git checkout claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
git merge main

cd ../contractnest-api
git checkout claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
git merge main

# 6. If conflicts, resolve them, then:
cd /home/user/contractnest-combined
git add .
git commit -m "Merge main branch into feature branch"
git push origin claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
```

### Expected Outcome:
- Feature branch has all main branch changes
- No merge conflicts (or resolved if any)
- All tests still pass

---

## 🚀 TASK 2: MSG91 Integration Testing

**Priority:** HIGH
**Time Estimate:** 2-3 hours

### Why This Is Needed:
Verify email, WhatsApp, and SMS invitation flows work correctly with MSG91 service. Ensure `country_code` and `phone_code` fields are properly saved.

### Background:

**Email Sending:**
- Edge function: `contractnest-edge/supabase/functions/invitation-management/index.ts`
- Uses MSG91 API for email delivery
- Invitation URL format: `${FRONTEND_URL}/register-invitation?code=${code}&secret=${secret}`

**WhatsApp/SMS Sending:**
- Same edge function handles all methods
- Uses `invitation_method` field: 'email' | 'sms' | 'whatsapp'
- Requires `country_code` and `phone_code` for mobile numbers

### Sub-Tasks:

#### 2.1 Verify MSG91 Configuration

**File to check:** `contractnest-edge/supabase/functions/invitation-management/index.ts`

```bash
# Read the edge function
Read contractnest-edge/supabase/functions/invitation-management/index.ts
```

**Look for:**
- MSG91 API key configuration
- Email template ID
- SMS template ID
- WhatsApp template ID
- Error handling for MSG91 responses

**Environment variables needed:**
```
MSG91_API_KEY
MSG91_SENDER_ID
MSG91_TEMPLATE_ID_EMAIL
MSG91_TEMPLATE_ID_SMS
MSG91_TEMPLATE_ID_WHATSAPP
FRONTEND_URL
```

#### 2.2 Test Email Flow

**Steps:**
1. Start local dev environment
2. Go to Users page → Invite User
3. Enter email address
4. Click "Send Invitation"
5. Check database:
```sql
SELECT
  id,
  email,
  country_code,
  phone_code,
  invitation_method,
  invitation_code,
  email_opened_at,
  link_clicked_at,
  created_at
FROM t_user_invitations
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ Invitation record created with `invitation_method = 'email'`
- ✅ Email sent via MSG91
- ✅ Invitation URL format: `/register-invitation?code=XXXXX&secret=XXXXX`
- ✅ User receives email
- ✅ Link works and opens registration page
- ⚠️ `email_opened_at` and `link_clicked_at` will be NULL (tracking not implemented)

#### 2.3 Test WhatsApp Flow

**Steps:**
1. Go to Users page → Invite User
2. Select country code (e.g., India +91)
3. Enter mobile number (e.g., 9876543210)
4. Select "WhatsApp" as invitation method (if UI supports it, otherwise check backend)
5. Click "Send Invitation"
6. Check database

**Expected Results:**
- ✅ Invitation record created with `invitation_method = 'whatsapp'`
- ✅ `country_code = 'IN'`
- ✅ `phone_code = '91'`
- ✅ `mobile_number = '9876543210'` (without country code)
- ✅ WhatsApp message sent via MSG91
- ✅ Link in message works

**If WhatsApp fails:**
- Check MSG91 API response in edge function logs
- Verify WhatsApp template approved by MSG91
- Check phone number format sent to MSG91

#### 2.4 Test SMS Flow

Same as WhatsApp but with SMS method.

#### 2.5 Test Multiple Country Codes

Test invitations with different countries:
- 🇮🇳 India (+91)
- 🇺🇸 United States (+1)
- 🇬🇧 United Kingdom (+44)
- 🇦🇪 UAE (+971)
- 🇸🇬 Singapore (+65)

Verify `country_code` and `phone_code` saved correctly for each.

### Known Issues to Watch For:

1. **Email tracking not implemented** - `email_opened_at` and `link_clicked_at` remain NULL
2. **MSG91 rate limits** - Test with real accounts, not dummy emails
3. **Phone number format** - Edge function should receive number WITHOUT country code prefix

### Deliverables:

- [ ] All invitation methods tested (email, WhatsApp, SMS)
- [ ] Database fields populated correctly
- [ ] MSG91 API responses logged and successful
- [ ] Links work and open registration page
- [ ] Multiple country codes tested
- [ ] Document any issues found

---

## 🚀 TASK 3: Replace Dots Menu with Icons

**Priority:** MEDIUM
**Time Estimate:** 2-3 hours

### Why This Is Needed:
User requested consistent UI pattern. Services page uses individual icon buttons instead of dropdown menu. Apply same pattern to user invitation lists.

### Background:

**Current State (BEFORE):**
- Uses `MoreVertical` (three dots) menu with dropdown
- Actions hidden until user clicks dots

**Desired State (AFTER):**
- Individual icon buttons visible at all times
- Same pattern as Services page
- Icons: Edit, Suspend/Activate, Reset Password, Delete, View, Resend, Cancel

### Reference Implementation:

**Services page pattern:**
```tsx
// Example from services page (find actual implementation)
<div className="flex items-center gap-2">
  <button
    onClick={handleEdit}
    className="p-2 rounded-md hover:opacity-80 transition-colors"
    title="Edit"
    style={{ color: colors.brand.primary }}
  >
    <Edit size={16} />
  </button>

  <button
    onClick={handleDelete}
    className="p-2 rounded-md hover:opacity-80 transition-colors"
    title="Delete"
    style={{ color: colors.semantic.error }}
  >
    <Trash2 size={16} />
  </button>
</div>
```

### Sub-Tasks:

#### 3.1 Update User View Page Actions

**File:** `contractnest-ui/src/pages/settings/users/userView.tsx`

**Current actions (dropdown menu):**
- Edit
- Suspend (or Activate if suspended)
- Reset Password
- Delete (if exists)

**Changes needed:**

1. Read the file:
```bash
Read contractnest-ui/src/pages/settings/users/userView.tsx
```

2. Find the action buttons section (likely around line 220-280)

3. Replace dropdown menu with icon buttons:

```tsx
{/* Action Buttons - Replace dropdown menu */}
<div className="flex items-center gap-2">
  <button
    onClick={handleEdit}
    className="p-2 rounded-md hover:opacity-80 transition-colors"
    title="Edit User"
    style={{ color: colors.brand.primary }}
  >
    <Edit size={16} />
  </button>

  {user?.status === 'active' ? (
    <button
      onClick={handleSuspend}
      className="p-2 rounded-md hover:opacity-80 transition-colors"
      title="Suspend User"
      style={{ color: colors.semantic.warning || '#f59e0b' }}
    >
      <UserX size={16} />
    </button>
  ) : (
    <button
      onClick={handleActivate}
      className="p-2 rounded-md hover:opacity-80 transition-colors"
      title="Activate User"
      style={{ color: colors.semantic.success }}
    >
      <UserCheck size={16} />
    </button>
  )}

  <button
    onClick={handleResetPassword}
    className="p-2 rounded-md hover:opacity-80 transition-colors"
    title="Reset Password"
    style={{ color: colors.brand.tertiary || colors.brand.primary }}
  >
    <Key size={16} />
  </button>
</div>
```

4. Remove imports for `MoreVertical` and dropdown-related components

5. Add imports if missing:
```tsx
import { Edit, UserX, UserCheck, Key, Trash2 } from 'lucide-react';
```

#### 3.2 Update Invitations List Actions

**File:** `contractnest-ui/src/components/users/InvitationsList.tsx`

**Current actions (dropdown menu):**
- View Details
- Resend
- Cancel

**Changes needed:**

1. Read the file:
```bash
Read contractnest-ui/src/components/users/InvitationsList.tsx
```

2. Find the actions section for each invitation (likely in the map function around line 300-420)

3. Replace dropdown menu with icon buttons:

```tsx
{/* Action Buttons for each invitation */}
<div className="flex items-center gap-2">
  <button
    onClick={() => onViewDetails(invitation.id)}
    className="p-2 rounded-md hover:opacity-80 transition-colors"
    title="View Details"
    style={{ color: colors.brand.primary }}
    disabled={processingIds.has(invitation.id)}
  >
    <Eye size={16} />
  </button>

  {canResend && (
    <button
      onClick={() => handleResend(invitation.id)}
      className="p-2 rounded-md hover:opacity-80 transition-colors"
      title="Resend Invitation"
      style={{ color: colors.brand.tertiary || colors.brand.primary }}
      disabled={processingIds.has(invitation.id)}
    >
      <RefreshCw size={16} className={processingIds.has(invitation.id) ? 'animate-spin' : ''} />
    </button>
  )}

  {canCancel && (
    <button
      onClick={() => handleCancelClick(invitation.id)}
      className="p-2 rounded-md hover:opacity-80 transition-colors"
      title="Cancel Invitation"
      style={{ color: colors.semantic.error }}
      disabled={processingIds.has(invitation.id)}
    >
      <XCircle size={16} />
    </button>
  )}
</div>
```

4. Remove `MoreVertical` dropdown code completely

5. Keep `ConfirmationDialog` for cancel action (already implemented in previous session)

#### 3.3 Responsive Design

**Important:** Icon buttons should be responsive:
- Desktop: Show all icons
- Mobile: Consider keeping dropdown menu OR stack icons vertically

Test on different screen sizes:
```tsx
{/* Mobile: Stack vertically or use dropdown */}
<div className="hidden md:flex items-center gap-2">
  {/* Icon buttons for desktop */}
</div>

<div className="md:hidden">
  {/* Dropdown menu for mobile OR stacked icons */}
</div>
```

### Styling Consistency:

Use theme colors from `useTheme()`:
- **Primary action** (Edit, View): `colors.brand.primary`
- **Secondary action** (Resend): `colors.brand.tertiary || colors.brand.primary`
- **Warning action** (Suspend): `colors.semantic.warning || '#f59e0b'`
- **Danger action** (Cancel, Delete): `colors.semantic.error`
- **Success action** (Activate): `colors.semantic.success`

### Testing:

- [ ] Icons visible without clicking menu
- [ ] Hover effects work (opacity-80)
- [ ] Tooltips show on hover (title attribute)
- [ ] Colors match theme (light/dark mode)
- [ ] Icon size consistent (16px)
- [ ] Spacing between icons consistent (gap-2)
- [ ] Disabled state works correctly
- [ ] Loading spinner shows for resend action
- [ ] ConfirmationDialog still works for cancel

### Deliverables:

- [ ] User view page updated with icon buttons
- [ ] Invitations list updated with icon buttons
- [ ] Dropdown menus removed
- [ ] Responsive design tested
- [ ] Theme colors applied correctly
- [ ] All actions still functional

---

## 🚀 TASK 4: Fix Pending Tab Count Display

**Priority:** MEDIUM
**Time Estimate:** 1-2 hours

### Why This Is Needed:
User reports: "Pending tab does not show count unless it clicked"

### Problem Description:

When user creates a new invitation:
1. Invitation is created successfully
2. User stays on "All Users" tab
3. "Pending (X)" count in tab label doesn't update immediately
4. Count only updates after clicking "Pending" tab

### Current Implementation (From Previous Session):

**File:** `contractnest-ui/src/pages/settings/users/index.tsx`

Previous session added:
```tsx
const handleInviteSubmit = async (data: CreateInvitationData) => {
  const invitation = await createInvitation(data);
  if (invitation) {
    setShowInviteModal(false);

    // Always fetch invitations to update the pending count immediately
    await fetchInvitations(1, 'pending');

    // Reset loaded state to force refresh
    setDataLoaded(prev => ({ ...prev, all: false, pending: false }));

    // Refresh current tab
    if (activeTab === 'pending' || activeTab === 'all') {
      await handleRefresh();
    }
  }
};
```

**This attempt didn't fully solve the issue.**

### Investigation Steps:

#### 4.1 Read Current Implementation

```bash
Read contractnest-ui/src/pages/settings/users/index.tsx
```

**Focus on:**
- How tab counts are displayed
- State variables used for counts
- `fetchInvitations()` function
- `invitationsData` state structure
- How tabs render their count labels

#### 4.2 Understand Data Flow

**Typical structure:**
```tsx
// State
const [invitationsData, setInvitationsData] = useState({
  invitations: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10
  }
});

// Tab rendering
<button onClick={() => setActiveTab('pending')}>
  Pending ({pendingCount})
</button>
```

**Questions to answer:**
1. Where does `pendingCount` come from?
2. Is it from `invitationsData.pagination.total`?
3. Is there separate state for each tab's count?
4. Does `fetchInvitations(1, 'pending')` update the displayed count?

#### 4.3 Root Cause Analysis

**Possible causes:**

**A. State Not Updating:**
```tsx
// fetchInvitations updates invitationsData for current tab only
// But tab count reads from separate state
```

**B. Stale Closure:**
```tsx
// Tab count calculated once, not reactive to state changes
```

**C. Missing State Update:**
```tsx
// fetchInvitations updates data but doesn't trigger re-render
```

**D. Wrong Data Source:**
```tsx
// Tab count reads from cached value instead of fresh data
```

### Solutions to Try:

#### Solution A: Fetch All Tab Counts After Creation

**Most reliable - fetch counts for all tabs:**

```tsx
const handleInviteSubmit = async (data: CreateInvitationData) => {
  const invitation = await createInvitation(data);
  if (invitation) {
    setShowInviteModal(false);

    // Fetch ALL tabs to update all counts
    await Promise.all([
      fetchInvitations(1, 'all'),
      fetchInvitations(1, 'pending'),
      fetchInvitations(1, 'accepted'),
      fetchInvitations(1, 'expired')
    ]);

    // Refresh current tab display
    if (activeTab !== 'all') {
      await handleRefresh();
    }
  }
};
```

**Pros:** Guaranteed to update all counts
**Cons:** Multiple API calls (but acceptable for user action)

#### Solution B: Store Counts Separately

**Add dedicated state for tab counts:**

```tsx
const [tabCounts, setTabCounts] = useState({
  all: 0,
  pending: 0,
  accepted: 0,
  expired: 0
});

// After fetchInvitations for any tab:
setTabCounts(prev => ({
  ...prev,
  [tab]: data.pagination.total
}));

// In tab rendering:
<button onClick={() => setActiveTab('pending')}>
  Pending ({tabCounts.pending})
</button>
```

**Pros:** Explicit count management
**Cons:** More state to manage

#### Solution C: Manual Count Increment

**Quick fix - increment count directly:**

```tsx
const handleInviteSubmit = async (data: CreateInvitationData) => {
  const invitation = await createInvitation(data);
  if (invitation) {
    setShowInviteModal(false);

    // Manually increment pending count
    setInvitationsData(prev => {
      // If current tab is 'pending' or 'all', increment total
      if (activeTab === 'pending' || activeTab === 'all') {
        return {
          ...prev,
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1
          }
        };
      }
      return prev;
    });

    // Also update separate pending count if exists
    setPendingCount(prev => prev + 1);

    // Refresh to show new invitation in list
    await handleRefresh();
  }
};
```

**Pros:** Instant UI update, no extra API calls
**Cons:** Manual bookkeeping, can get out of sync

### Recommended Approach:

**Try Solution A first** (fetch all tabs). It's the most reliable.

If performance is a concern, implement Solution B with separate count state.

### Implementation Steps:

1. **Read the file and understand current structure:**
```bash
Read contractnest-ui/src/pages/settings/users/index.tsx
```

2. **Identify where tab counts are displayed**
   - Search for tab rendering code
   - Find where count numbers come from

3. **Implement Solution A:**
   - Modify `handleInviteSubmit` to fetch all tab counts
   - Test that all tab labels update immediately

4. **If Solution A doesn't work, try Solution B:**
   - Add `tabCounts` state
   - Update after each fetch
   - Use in tab labels

5. **Test thoroughly:**
   - Create invitation from "All Users" tab → Check "Pending (X)" updates
   - Create invitation from "Active" tab → Check "Pending (X)" updates
   - Create invitation from "Pending" tab → Check count updates
   - Cancel invitation → Check count decrements
   - Accept invitation → Check counts update correctly

### Deliverables:

- [ ] Pending count updates immediately after creating invitation
- [ ] Works from any active tab
- [ ] All tab counts accurate
- [ ] No performance degradation
- [ ] Cancel/Accept actions also update counts correctly

---

## 📁 Quick File Reference

### Key Files You'll Work With:

**UI Files:**
```
contractnest-ui/src/pages/settings/users/index.tsx          - Main users page, tab management
contractnest-ui/src/components/users/InvitationsList.tsx    - Invitation list with actions
contractnest-ui/src/pages/settings/users/userView.tsx       - User detail view with actions
contractnest-ui/src/components/users/InviteUserForm.tsx     - Invitation form (already updated)
contractnest-ui/src/hooks/useInvitations.ts                 - Invitation API hooks
```

**Edge Function:**
```
contractnest-edge/supabase/functions/invitation-management/index.ts  - Invitation backend logic
```

### Important Interfaces:

```typescript
// From useInvitations.ts
export interface CreateInvitationData {
  email?: string;
  mobile_number?: string;
  country_code?: string;
  phone_code?: string;
  invitation_method: 'email' | 'sms' | 'whatsapp';
  role_id?: string;
  custom_message?: string;
}

export interface Invitation {
  id: string;
  email?: string;
  mobile_number?: string;
  country_code?: string;
  phone_code?: string;
  invitation_method: string;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  email_opened_at?: string;
  link_clicked_at?: string;
  resent_count: number;
  last_resent_by?: string;
}
```

---

## 🧪 Testing Checklist

After completing each task:

### Task 1: Main Branch Merge
- [ ] Feature branch has latest main changes
- [ ] No merge conflicts
- [ ] All imports still resolve
- [ ] App builds successfully: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`

### Task 2: MSG91 Integration
- [ ] Email invitations sent successfully
- [ ] WhatsApp invitations sent successfully
- [ ] SMS invitations sent successfully
- [ ] Database fields populated: country_code, phone_code
- [ ] Invitation links work and open registration page
- [ ] Tested multiple country codes

### Task 3: Icon Buttons
- [ ] User view page shows icon buttons (no dropdown)
- [ ] Invitations list shows icon buttons (no dropdown)
- [ ] All actions still work (edit, suspend, reset, cancel, resend, view)
- [ ] Icons have proper colors (theme-aware)
- [ ] Hover effects work
- [ ] Tooltips show on hover
- [ ] Responsive design works on mobile
- [ ] Dark mode colors correct

### Task 4: Pending Count
- [ ] Count updates immediately after creating invitation
- [ ] Works from any active tab
- [ ] Cancel action decrements count
- [ ] Accept action updates both pending and accepted counts
- [ ] Count accurate after page refresh

---

## 🔧 Environment Info

**Branch:** `claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ`

**Working Directory:** `/home/user/contractnest-combined`

**Submodules:**
- `contractnest-ui` - React + TypeScript frontend
- `contractnest-edge` - Supabase Edge Functions
- `contractnest-api` - Backend API (may not need changes)

**Tech Stack:**
- React 18 with TypeScript
- React Hook Form + Zod validation
- Supabase (Auth, Database, Edge Functions)
- TailwindCSS
- Lucide React icons
- Custom theme system with dark mode

**Key Commands:**
```bash
# Build UI
cd contractnest-ui && npm run build

# Run dev server
npm run dev

# Type check
npm run type-check

# Test edge functions locally
cd contractnest-edge
supabase functions serve
```

---

## ⚠️ Important Notes

1. **Git Workflow:**
   - Always commit to feature branch: `claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ`
   - Push submodules first, then parent repo
   - Use descriptive commit messages

2. **Theme System:**
   - Always use `useTheme()` hook for colors
   - Colors available: `colors.brand.primary`, `colors.semantic.error`, etc.
   - Support both light and dark modes

3. **ConfirmationDialog:**
   - Already implemented for cancel, suspend, reset password
   - Use same pattern for any destructive actions
   - Located at: `contractnest-ui/src/components/ui/ConfirmationDialog.tsx`

4. **Country Code:**
   - Use ISO codes (IN, US, GB), not phone codes (+91, +1, +44)
   - Phone code automatically derived from country code
   - Popular countries already defined in InviteUserForm.tsx

5. **Email Tracking:**
   - `email_opened_at` and `link_clicked_at` not implemented yet
   - Fields exist in database but remain NULL
   - Not required for current tasks

---

## 🎯 Success Criteria

**Your session is complete when:**

✅ All 4 tasks completed
✅ All tests pass
✅ Changes committed and pushed to GitHub
✅ No TypeScript errors
✅ UI works in both light and dark mode
✅ User can create invitations via email/WhatsApp/SMS
✅ Icons replace dropdown menus
✅ Pending count updates immediately

---

## 🆘 If You Get Stuck

**Common Issues:**

1. **MSG91 API errors:**
   - Check environment variables are set
   - Verify API key is valid
   - Check MSG91 dashboard for logs
   - Read edge function response in browser console

2. **TypeScript errors:**
   - Check interface definitions in `useInvitations.ts`
   - Ensure all props are typed correctly
   - Use type assertions if needed: `as TabType`

3. **State not updating:**
   - Verify state setter is called: `setState(newValue)`
   - Check if component re-renders
   - Use React DevTools to inspect state
   - Add console.log to track state changes

4. **Theme colors not working:**
   - Ensure `useTheme()` is called in component
   - Check `isDarkMode` and `currentTheme` are used
   - Verify color path: `colors.brand.primary` not `theme.brand.primary`

---

**Good luck! You have all the context you need to start immediately. Begin with Task 1 (merge main branch) and work through sequentially.**

---
