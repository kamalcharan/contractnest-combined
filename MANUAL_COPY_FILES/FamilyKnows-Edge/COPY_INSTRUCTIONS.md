# FamilyKnows Edge Functions - Copy Instructions

## Files to Copy

```
═══════════════════════════════════════════════════
FILES TO COPY
═══════════════════════════════════════════════════

FKauth/index.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/index.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/index.ts

FKauth/utils/supabase.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/utils/supabase.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/utils/supabase.ts

FKauth/utils/cors.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/utils/cors.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/utils/cors.ts

FKauth/utils/helpers.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/utils/helpers.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/utils/helpers.ts

FKauth/utils/validation.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/utils/validation.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/utils/validation.ts

FKauth/types/index.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/types/index.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/types/index.ts

FKauth/handlers/registration.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/registration.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/registration.ts

FKauth/handlers/authentication.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/authentication.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/authentication.ts

FKauth/handlers/password.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/password.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/password.ts

FKauth/handlers/profile.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/profile.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/profile.ts

FKauth/handlers/preferences.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/preferences.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/preferences.ts

FKauth/handlers/roles.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKauth/handlers/roles.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKauth/handlers/roles.ts

FKonboarding/index.ts
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/functions/FKonboarding/index.ts
  TO:   FamilyKnows-Edge/supabase/functions/FKonboarding/index.ts

001_familyknows_user_profile_columns.sql
  FROM: MANUAL_COPY_FILES/FamilyKnows-Edge/supabase/migrations/001_familyknows_user_profile_columns.sql
  TO:   FamilyKnows-Edge/supabase/migrations/001_familyknows_user_profile_columns.sql

═══════════════════════════════════════════════════
```

## Edge Functions Created

### FKauth - FamilyKnows Authentication
Complete authentication system for FamilyKnows with these routes:
- `POST /FKauth/register` - New user registration
- `POST /FKauth/register-with-invitation` - Register via family invite
- `POST /FKauth/complete-registration` - Complete registration flow
- `POST /FKauth/login` - User login
- `POST /FKauth/signout` - Sign out
- `POST /FKauth/refresh-token` - Refresh access token
- `POST /FKauth/reset-password` - Request password reset
- `POST /FKauth/change-password` - Change password
- `POST /FKauth/verify-password` - Verify current password
- `GET /FKauth/user` - Get user profile
- `PUT /FKauth/preferences` - Update user preferences

### FKonboarding - FamilyKnows Onboarding
Onboarding flow management with these routes:
- `GET /FKonboarding/status` - Get onboarding status
- `GET /FKonboarding/config` - Get step configuration
- `POST /FKonboarding/initialize` - Initialize onboarding
- `POST /FKonboarding/complete-step` - Complete a step
- `PUT /FKonboarding/skip-step` - Skip an optional step
- `PUT /FKonboarding/update-progress` - Update progress
- `POST /FKonboarding/complete` - Mark onboarding complete

## FamilyKnows Onboarding Steps

| Seq | Step ID | Required | Default |
|-----|---------|----------|---------|
| 1 | `personal-profile` | Yes | - |
| 2 | `theme` | Yes | `light` |
| 3 | `language` | Yes | `en` |
| 4 | `family-space` | Yes | - |
| 5 | `storage` | No | - |
| 6 | `family-invite` | No | - |

## SQL Migration

Run in **BOTH** ContractNest and FamilyKnows Supabase:

```sql
ALTER TABLE "public"."t_user_profiles" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "public"."t_user_profiles" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);
```
