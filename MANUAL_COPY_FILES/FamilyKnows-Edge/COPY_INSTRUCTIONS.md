# FamilyKnows Edge Functions - Copy Instructions

## Overview

This folder contains FamilyKnows-specific Edge Functions and SQL migrations that should be deployed to the **FamilyKnows Supabase instance** (not ContractNest).

## Files Included

```
FamilyKnows-Edge/
├── supabase/
│   ├── functions/
│   │   ├── FKonboarding/
│   │   │   └── index.ts          # FamilyKnows onboarding Edge Function
│   │   └── auth/
│   │       └── handlers/
│   │           └── registration.ts  # FK registration with onboarding init
│   └── migrations/
│       └── 001_familyknows_user_profile_columns.sql
└── COPY_INSTRUCTIONS.md
```

## Deployment Steps

### Step 1: Run SQL Migration (Both Supabase Instances)

Run this SQL in **BOTH** ContractNest and FamilyKnows Supabase SQL Editor to keep schemas in sync:

```sql
-- Add date_of_birth column to t_user_profiles
ALTER TABLE "public"."t_user_profiles"
ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;

-- Add gender column to t_user_profiles
ALTER TABLE "public"."t_user_profiles"
ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);
```

### Step 2: Deploy FKonboarding Edge Function (FamilyKnows Supabase Only)

1. Copy `supabase/functions/FKonboarding/` to your FamilyKnows Edge Functions directory
2. Deploy using Supabase CLI:

```bash
cd /path/to/familyknows-edge
supabase functions deploy FKonboarding
```

### Step 3: Update Auth Edge Function (FamilyKnows Supabase Only)

Replace the registration handler in your FamilyKnows auth Edge Function:

1. Copy `supabase/functions/auth/handlers/registration.ts` to your FamilyKnows auth function
2. Redeploy the auth function:

```bash
supabase functions deploy auth
```

### Step 4: (Optional) Handle ContractNest Trigger

**For FamilyKnows Supabase:**

The ContractNest trigger `after_tenant_created` may exist and create ContractNest-style onboarding steps. You have two options:

**Option A (Recommended):** Don't create the trigger in FamilyKnows Supabase at all. The FK registration handler creates onboarding records directly.

**Option B:** If the trigger already exists, you can drop it:

```sql
-- Only run in FamilyKnows Supabase if trigger exists
DROP TRIGGER IF EXISTS "after_tenant_created" ON "public"."t_tenants";
```

**For ContractNest Supabase:**

Keep the existing trigger. ContractNest continues to work as before.

## FamilyKnows Onboarding Steps

The FKonboarding function creates these steps:

| Seq | Step ID | Required | Default Value |
|-----|---------|----------|---------------|
| 1 | `personal-profile` | Yes | - |
| 2 | `theme` | Yes | `light` |
| 3 | `language` | Yes | `en` |
| 4 | `family-space` | Yes | - |
| 5 | `storage` | No | - |
| 6 | `family-invite` | No | - |

## API Endpoints

### FKonboarding Edge Function

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/FKonboarding/status` | Get onboarding status |
| GET | `/FKonboarding/config` | Get step configuration |
| POST | `/FKonboarding/initialize` | Initialize onboarding |
| POST | `/FKonboarding/complete-step` | Complete a step |
| PUT | `/FKonboarding/skip-step` | Skip an optional step |
| PUT | `/FKonboarding/update-progress` | Update progress |
| POST | `/FKonboarding/complete` | Mark onboarding complete |

### Headers Required

```
Authorization: Bearer <access_token>
x-tenant-id: <family_space_id>
Content-Type: application/json
```

### Example: Complete Personal Profile Step

```bash
curl -X POST \
  'https://your-fk-supabase.co/functions/v1/FKonboarding/complete-step' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'x-tenant-id: YOUR_TENANT_ID' \
  -H 'Content-Type: application/json' \
  -d '{
    "stepId": "personal-profile",
    "data": {
      "user_id": "user-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-01-15",
      "gender": "male",
      "country_code": "+1",
      "mobile_number": "5551234567"
    }
  }'
```

## Step Data Mapping

When completing steps, the Edge Function automatically updates the appropriate tables:

| Step | Table Updated | Fields |
|------|---------------|--------|
| `personal-profile` | `t_user_profiles` | first_name, last_name, date_of_birth, gender, country_code, mobile_number |
| `theme` | `t_user_profiles` | preferred_theme, is_dark_mode |
| `language` | `t_user_profiles` | preferred_language |
| `family-space` | `t_tenants` | name |
| `storage` | - | Placeholder for future implementation |
| `family-invite` | - | Handled via invitation system |

## Testing

1. Register a new user through the FamilyKnows app
2. Check `t_tenant_onboarding` table for `onboarding_type = 'family'`
3. Check `t_onboarding_step_status` for FamilyKnows step IDs
4. Test each step completion through the mobile app

## Troubleshooting

### "Onboarding not initialized" Error

The registration handler should auto-initialize. If you see this error:
1. Check if registration.ts was properly deployed
2. Check Supabase Edge Function logs for errors

### Steps Not Being Created

If step records are missing:
1. Verify the `t_onboarding_step_status` table exists
2. Check RLS policies allow inserts
3. Review Edge Function logs

### ContractNest Steps Appearing

If you see ContractNest step IDs (`user-profile`, `business-profile`, etc.):
1. The ContractNest trigger is firing
2. Drop the trigger in FamilyKnows Supabase (see Step 4 above)
