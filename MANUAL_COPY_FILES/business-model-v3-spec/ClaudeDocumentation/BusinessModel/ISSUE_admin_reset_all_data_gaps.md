---
title: Issue — admin_reset_all_data leaves 60 tenant-scoped tables behind
project: ContractNest
date: 2026-08-05
status: Logged, not fixed. Separate from the business-model work.
---

## How this surfaced

The owner reset the Vikuna tenant expecting a clean slate, then still saw service
blocks in `/catalog-studio/configure`.

Three separate things were going on:

1. **The reset ran, the close did not.** `t_contracts` for Vikuna went 4 → 0 and
   `t_contacts` / `t_sequence_counters` are empty, so `admin_reset_all_data` ran.
   But `t_tenants.status` is still `active` with `updated_at = 2025-04-20`, and
   `admin_close_tenant_account` sets `status = 'closed'` as its first
   unconditional statement — so close-account never completed.
   **Fortunate**: closing the platform tenant would have set
   `flag_can_access = false` on the tenant the whole business model depends on.

2. **The reset does not clean catalog-studio** — the subject of this issue.

3. **The blocks on screen were a stale cache**, not stale data. See §3.

---

## 1. The gap

`admin_reset_all_data` issues `DELETE FROM` against **37 tables**. There are
**60 further tenant-scoped tables** it never touches.

### Should almost certainly be reset

**Catalog-studio** — the reported symptom:
```
m_cat_blocks              t_cat_templates
t_catalog_resources       t_category_resources_master
t_form_templates          t_tenant_selected_resources
```

**Operational data:**
```
t_equipment                    t_appointments
t_contract_attachments         t_contract_event_assets
t_contract_invoice             t_invoice_receipt_allocations
t_group_session_schedule       t_group_session_tokens
t_session_attendance           t_session_payment_declarations
t_checkin_devices              t_tenant_asset_registry
t_custom_checkpoints           t_custom_checkpoint_values
t_custom_variants              t_custom_spare_parts
t_cycle_overrides              m_form_submissions
m_form_attachments             t_ai_agent_sessions
t_chat_sessions                t_semantic_clusters
```

### Needs a decision — the business-model ledger

```
t_bm_credit_balance      t_bm_credit_transaction
t_bm_billing_event       t_bm_invoice
t_bm_subscription_usage  t_tenant_context
```

**Directly relevant to Sprint 3 testing:** a tenant that is "reset" keeps its
credit balances and its `t_tenant_context` row. During enforcement testing this
will look like a metering bug when it is actually this gap.

Argument for resetting: a clean tenant should have a clean ledger.
Argument against: the ledger is a financial audit trail, and deleting journal
rows for a tenant that has actually paid is not obviously right.

Suggested split: reset `t_tenant_context` and `t_bm_subscription_usage` (both are
derived//read-model), keep `t_bm_credit_transaction` and `t_bm_invoice`
(financial record), and decide `t_bm_credit_balance` alongside.

### Should NOT be reset — configuration, not data

```
t_category_master / t_category_details   ← LOV
t_role_permissions
t_tenant_cadence_settings                t_tenant_holiday_dates
t_tenant_regions                         t_tenant_domains
t_tax_settings                           t_vani_rules
```

The LOV case is decisive: `t_category_master` holds `sequence_numbers`, which
drives `CN-####` contract numbering, plus Roles, Tags and the
`notification_channels` list. Wiping it breaks contract creation outright.

---

## 2. The real question before fixing

**"Reset all data" and "reset to factory" are different operations**, and the
function currently sits between them. Extending it means choosing:

- **Reset data** — transactional records go, configuration stays. The tenant can
  keep working immediately.
- **Reset to factory** — everything but identity goes; the tenant re-onboards.

The LOV / config group is exactly where the two diverge. That decision should be
made deliberately rather than by adding table names to a list.

Note also that `t_sequence_counters` **is** already in the reset's 37. So today's
behaviour is inconsistent: numbering counters are wiped while the LOV that
defines them survives. After a reset, contract numbering restarts.

---

## 3. Separate bug — stale React Query cache (the visible symptom)

`contractnest-ui/src/hooks/queries/useCatBlocksTest.ts:21`

```js
queryKey: ['cat-blocks-test'],     // no tenant in the key
```

The backend is correct — `catalogStudioRoutes` requires `x-tenant-id` and filters
properly. But the block list is cached under a **tenant-agnostic key**, so a
tenant switch triggers no refetch and previously fetched blocks keep rendering.

This is a cross-tenant leak in the UI cache, not just a staleness annoyance:
switch from Tenant A to Tenant B and Tenant A's blocks show until something else
invalidates.

**Fix** — one line, `currentTenant` is already in scope on line 18:

```js
queryKey: ['cat-blocks-test', currentTenant?.id],
```

Worth grepping the other query hooks for the same shape.

---

## 4. Recommendation

Do not extend `admin_reset_all_data` as part of the business-model work. It needs
the reset-vs-factory decision first, and it touches every module.

Fix §3 now — it is one line and explains the reported symptom.

**Immediate awareness for Sprint 3:** the ledger and `t_tenant_context` survive a
tenant reset. Account for that when building enforcement test fixtures.
