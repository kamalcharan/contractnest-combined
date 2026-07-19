-- ============================================================================
-- Sprint 4 Acceptance — GST records + invoice tax snapshot
-- ============================================================================
-- Per CONTRACTNEST_SPRINT_SPEC.md program rule #3: "DB completeness is the
-- acceptance bar." Sprint 4 was re-scoped (2026-07-19) to GST records +
-- invoice tax snapshot only; buyer payments/verification/settle-action
-- fixes/reconciliation/per-asset lines moved to Sprint 7.
-- ============================================================================

-- 1. New invoices carry a tax_breakdown snapshot at generation time.
-- Expected: for any invoice created AFTER migration 062 was applied,
-- tax_breakdown is non-null, and (when tax_amount > 0) non-empty.
select id, invoice_number, tax_amount, tax_breakdown, created_at
from t_invoices
where created_at >= :migration_062_applied_at
  and is_active
order by created_at desc;
-- FAIL if any row here has tax_breakdown IS NULL, or has tax_amount > 0
-- but tax_breakdown = '[]'.

-- 2. Legacy backfill completeness (run after migration 063's UPDATE).
-- Expected: 0.
select count(*) as invoices_still_missing_tax_breakdown
from t_invoices
where is_active
  and (tax_breakdown is null or tax_breakdown = '[]'::jsonb)
  and tax_amount > 0;

-- 3. Backfill did not drift any other invoice field (spot-check against
-- the pre-backfill values you captured from migration 063 Step 1's
-- report SELECT). Re-run Step 1's report; total_amount/balance/
-- amount_paid/status for each invoice_id should be byte-identical to
-- what it showed before the UPDATE ran.

-- 4. get_tenant_tax_summary math matches a direct SUM for a known month
-- (:tenant_id, :is_live, :month e.g. '2026-07').
select
    (select sum(tax_amount) from t_invoices
     where tenant_id = :tenant_id and is_live = :is_live and is_active
       and issued_at is not null and to_char(issued_at, 'YYYY-MM') = :month
    ) as direct_sum_tax_invoiced,
    (
        select (m->>'tax_invoiced')::numeric
        from jsonb_array_elements(
            (get_tenant_tax_summary(:tenant_id, :is_live)->'data'->'months')
        ) as m
        where m->>'month' = :month
    ) as rpc_tax_invoiced;
-- FAIL if these two values differ.

-- 5. Basis check — invoices with issued_at IS NULL (unissued drafts, if
-- any exist by the time this runs) are excluded from every month bucket.
select count(*) as unissued_invoices_excluded_from_summary
from t_invoices
where tenant_id = :tenant_id and is_live = :is_live and is_active
  and issued_at is null;
-- Informational — confirms these rows are NOT double-counted once issued
-- (compare total invoice_count across get_tenant_tax_summary's months to
-- count(*) of issued invoices for the tenant).
