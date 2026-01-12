# HANDOVER DOCUMENT - ContractNest Contacts Module
## Date: 2026-01-12
## Session: claude/init-submodules-contacts-L7ex6

---

## EXECUTIVE SUMMARY

Working on fixing data persistence issues in the Contacts/Entities module. Multiple bugs were identified and fixes were provided, but **contact persons linking to corporate entities is still NOT working** despite RPC being deployed.

---

## CURRENT STATE: BROKEN

| Feature | Status | Notes |
|---------|--------|-------|
| Contact Channels | ✅ WORKING | Was working before, still works |
| Tags | ⚠️ UNKNOWN | Fix provided, needs verification |
| Addresses | ⚠️ UNKNOWN | Fix provided, needs verification |
| Compliance Numbers | ⚠️ UNKNOWN | Fix provided, needs verification |
| Contact Persons | ❌ BROKEN | Creates person but does NOT link to corporate (parent_contact_ids empty) |

---

## BUGS IDENTIFIED & FIXES PROVIDED

### Bug 1: Address DELETE Bug
**Location**: RPC `update_contact_transaction`
**Problem**: DELETE statement ran after INSERT. When all addresses had temp IDs, the subquery returned empty set, causing `id NOT IN (empty)` = TRUE for all rows, deleting everything including just-inserted addresses.
**Fix Applied**: Added `IF EXISTS(valid IDs)` check before DELETE
**File**: `MANUAL_COPY_FILES/contacts-comprehensive-fix/contractnest-edge/supabase/RPC/contacts/rpc`

### Bug 2: Contact Persons Archive Bug
**Location**: RPC `update_contact_transaction`
**Problem**: Archive UPDATE ran when all incoming persons were new (had temp IDs), archiving ALL existing persons.
**Fix Applied**: Added `array_length > 0` check before UPDATE
**File**: `MANUAL_COPY_FILES/contacts-comprehensive-fix/contractnest-edge/supabase/RPC/contacts/rpc`

### Bug 3: Tags Fetch Mismatch
**Location**: `contactService.ts` `getContactById()`
**Problem**: Code read from `t_contact_tags` table which is EMPTY. Data is stored in `t_contacts.tags` JSONB column.
**Fix Applied**: Read from `contact.tags` directly
**File**: `MANUAL_COPY_FILES/contacts-comprehensive-fix/contractnest-edge/supabase/functions/_shared/contacts/contactService.ts`

### Bug 4: Compliance Numbers Fetch Mismatch
**Location**: `contactService.ts` `getContactById()`
**Problem**: Same as tags - code read from `t_contact_compliance_numbers` table instead of JSONB column.
**Fix Applied**: Read from `contact.compliance_numbers` directly
**File**: Same as above

### Bug 5: Contact Persons NOT Linking to Corporate - STILL BROKEN
**Location**: RPC `update_contact_transaction` - INSERT for new persons
**Symptom**: Contact person IS created, but `parent_contact_ids` is NOT set to link to corporate
**Current Code** (line 571 in fixed RPC):
```sql
parent_contact_ids,
...
jsonb_build_array(p_contact_id),  -- Should set parent to corporate ID
```
**Status**: Fix was provided but user reports it's STILL NOT WORKING even after deploying RPC

---

## ARCHITECTURE NOTES

### Data Storage Pattern
| Data Type | Storage Location | Notes |
|-----------|------------------|-------|
| Contact basic info | `t_contacts` table | Direct columns |
| Tags | `t_contacts.tags` | JSONB column (NOT separate table) |
| Compliance Numbers | `t_contacts.compliance_numbers` | JSONB column (NOT separate table) |
| Classifications | `t_contacts.classifications` | JSONB array column |
| Contact Channels | `t_contact_channels` table | Foreign key to contact_id |
| Addresses | `t_contact_addresses` table | Foreign key to contact_id |
| Contact Persons | `t_contacts` table | Linked via `parent_contact_ids` JSONB array |

### Contact Persons Linking
- Contact persons are stored as separate `t_contacts` records with `type = 'individual'`
- They link to corporate via `parent_contact_ids` JSONB array containing the corporate's UUID
- Query to find persons: `.filter('parent_contact_ids', 'ov', [contactId])` (overlap operator)

---

## FILES MODIFIED/CREATED

### In MANUAL_COPY_FILES/contacts-comprehensive-fix/

1. **contractnest-edge/supabase/RPC/contacts/rpc**
   - Full RPC file with all transaction functions
   - Contains fixes for bugs 1, 2, and attempted fix for bug 5

2. **contractnest-edge/supabase/functions/_shared/contacts/contactService.ts**
   - Full service file
   - Contains fixes for bugs 3 and 4

3. **COPY_INSTRUCTIONS.txt**
   - Copy commands and deployment instructions

---

## WHAT NEEDS INVESTIGATION

### Priority 1: Contact Persons NOT Linking
The RPC code appears correct:
```sql
INSERT INTO t_contacts (
  ...
  parent_contact_ids,
  ...
)
VALUES (
  ...
  jsonb_build_array(p_contact_id),  -- This SHOULD work
  ...
)
```

**Possible causes to investigate**:
1. Is `p_contact_id` actually populated when the INSERT runs?
2. Is there a trigger or constraint modifying `parent_contact_ids` after INSERT?
3. Is the frontend sending contact_persons data correctly?
4. Is a different code path being executed?

**Debug approach**:
```sql
-- Check if contact persons have parent_contact_ids set
SELECT id, name, parent_contact_ids, type, created_at
FROM t_contacts
WHERE type = 'individual'
ORDER BY created_at DESC
LIMIT 10;

-- Check function definition currently in database
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'update_contact_transaction';
```

### Priority 2: Verify Other Fixes
After fixing contact persons, verify:
- Tags save and display
- Addresses save and display
- Compliance numbers save and display

---

## GIT STATUS

**Branch**: `claude/init-submodules-contacts-L7ex6`
**Last Commit**: `58e42ba fix(contacts): comprehensive fix for all data save issues`
**Remote**: Pushed and up to date

---

## PREVIOUS SESSION CONTEXT (from handover)

The previous session completed:
- Frontend caching implementation
- VaNi loader component
- Classification selector theme fix
- Mobile validation
- React hooks order fix

Known issues carried forward:
- 500 error on contact update (was empty array handling - partially fixed)
- Slow first load
- Data not showing after edit (this session's focus)

---

## USER FRUSTRATIONS EXPRESSED

1. "this is frankly a mess of cycles.....it does not work"
2. "how do even say.....this is a transaction?" - questioning why success is returned but data doesn't save
3. "why are you focusing only on address......tags, contacts, compliance..even they are not saved"
4. "i am tiered of telling you repeatedly about RPC being run"

The user has been patient through multiple debugging cycles. The core issue of data not persisting has NOT been fully resolved.

---

## RECOMMENDED NEXT STEPS

1. **Debug contact persons linking**:
   - Add RAISE NOTICE statements to RPC to log `p_contact_id` value
   - Check if INSERT is even being reached
   - Verify frontend is sending `contact_persons` array correctly

2. **Check if old RPC is cached**:
   - Supabase might be caching the old function
   - Try: `DROP FUNCTION update_contact_transaction(uuid, jsonb, jsonb, jsonb, jsonb);` then recreate

3. **Direct database test**:
   ```sql
   -- Test the RPC directly
   SELECT update_contact_transaction(
     'corporate-uuid-here'::uuid,
     '{"name": "Test Corp", "is_live": true}'::jsonb,
     '[]'::jsonb,  -- channels
     '[]'::jsonb,  -- addresses
     '[{"name": "Test Person", "designation": "Manager"}]'::jsonb  -- persons
   );
   ```

4. **Check Edge function deployment**:
   - Ensure Edge function is redeployed after contactService.ts change
   - `cd contractnest-edge && supabase functions deploy contacts`

---

## CONTACT FOR QUESTIONS

This handover was prepared after session timeout. The next assistant should:
1. NOT assume RPC deployment is the issue (user confirmed it's deployed)
2. Focus on WHY parent_contact_ids is not being set despite correct code
3. Consider adding debug logging to trace the actual execution path

---

END OF HANDOVER
