# How to Apply Submodule Patches

The parent repository references commits that don't exist remotely yet. Here's how to apply them:

## Option 1: Apply Patches (Recommended)

### For contractnest-api:
```bash
cd contractnest-api
git checkout -b claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
# Apply the changes manually or use the patch file
```

**Changes needed in `src/validators/invitation.ts`:**
Add this validation after the `country_code` validation:
```typescript
body('phone_code')
  .optional()
  .isString().withMessage('Phone code must be a string')
  .matches(/^\d{1,4}$/).withMessage('Phone code must be 1-4 digits'),
```

Then:
```bash
git add src/validators/invitation.ts
git commit -m "Add phone_code validator for invitation API"
git push -u origin claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
```

### For contractnest-edge:
```bash
cd contractnest-edge
git checkout -b claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
```

**Changes needed:**

1. **In `supabase/functions/user-invitations/index.ts`:**
   - Remove `COUNTRY_PHONE_CODES` constant (lines 13-26)
   - Remove `formatInternationalPhone()` function (lines 28-38)
   - Update `createInvitation` to accept `phone_code` parameter
   - Replace `formatInternationalPhone()` calls with: `const internationalPhone = phone_code ? `+${phone_code}${mobile_number}` : mobile_number;`

2. **In `supabase/migrations/20251110_add_country_code_to_invitations.sql`:**
   - Add phone_code column migration

Then:
```bash
git add .
git commit -m "Refactor: Remove transformation logic, add phone_code support"
git push -u origin claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
```

### For contractnest-ui:
The changes are already visible in your local file! Just commit and push:
```bash
cd contractnest-ui
git add src/components/users/InviteUserForm.tsx
git commit -m "Improve country code field visibility in Invite User form"
git push -u origin claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
```

## Option 2: Manual File Edits

See the detailed patch contents above for exact changes needed.

## After Applying Patches

Once all three submodules have their branches pushed:
```bash
cd /path/to/contractnest-combined
git pull origin claude/code-review-task-011CUvf7Ehm4N3BSjgFJEEGZ
git submodule update --init --recursive
```
