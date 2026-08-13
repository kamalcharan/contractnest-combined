-- =============================================================================
-- 038_plan_succession_and_billing_overview.sql
--
-- Backs the approved plan/billing design. Two things:
--
--   1. PLAN SUCCESSION — real, bidirectional, indexed.
--      Today the only link between a contract and the one it replaced is
--      metadata->>'switched_from_contract_id': a JSONB key with no foreign
--      key, no index, and NO REVERSE POINTER. Reading the chain backwards
--      works; reading it forwards requires scanning every contract in the
--      table. Verified live — Trinity's real chain is
--      CN-1001 -> CN-1012 -> CN-1013 -> CN-1039, and it is already severed
--      before CN-1043 because that row's link is NULL.
--      It is also named for SWITCHING, so a plain renewal (same plan, next
--      term) records nothing at all.
--
--   2. get_tenant_billing_overview — one read that powers both the
--      Subscription page and the new Billing page: current plan and whether
--      it is actually running, the instalment rhythm, what is outstanding,
--      payment attempts, purchase history, and the succession chain.
--
-- Depends on 037 (get_subscription_billing_rhythm, can_collect_payment).
-- IDEMPOTENT. Safe to re-run. Read-only apart from the columns in step 1.
-- =============================================================================


-- =============================================================================
-- 1. Succession columns
--
-- Both directions are stored. `succeeded_by_contract_id` is the one that does
-- not exist today, and it is the one every commercial question needs:
-- renewal rate, churn and lifetime value all walk the chain FORWARDS.
--
-- succession_reason exists because "one ended and another began" is not the
-- same fact as "renewed". Reporting has to tell them apart.
-- =============================================================================

ALTER TABLE t_contracts
  ADD COLUMN IF NOT EXISTS succeeds_contract_id     UUID REFERENCES t_contracts(id),
  ADD COLUMN IF NOT EXISTS succeeded_by_contract_id UUID REFERENCES t_contracts(id),
  ADD COLUMN IF NOT EXISTS succession_reason        TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_contract_succession_reason'
  ) THEN
    ALTER TABLE t_contracts ADD CONSTRAINT chk_contract_succession_reason
      CHECK (succession_reason IS NULL OR succession_reason IN
             ('renewal','switch','upgrade','downgrade','reinstatement'));
  END IF;
END $$;

-- Forward walks are the whole point of this migration, so both directions
-- are indexed. Partial: the vast majority of contracts are not in a chain.
CREATE INDEX IF NOT EXISTS ix_contracts_succeeds
  ON t_contracts (succeeds_contract_id) WHERE succeeds_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_contracts_succeeded_by
  ON t_contracts (succeeded_by_contract_id) WHERE succeeded_by_contract_id IS NOT NULL;

-- A contract cannot succeed itself.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contract_no_self_succession') THEN
    ALTER TABLE t_contracts ADD CONSTRAINT chk_contract_no_self_succession
      CHECK (succeeds_contract_id IS DISTINCT FROM id
             AND succeeded_by_contract_id IS DISTINCT FROM id);
  END IF;
END $$;


-- ── Backfill from the JSONB link that exists today ──────────────────────
-- Only fills what is still NULL, so re-running never overwrites a real value.
UPDATE t_contracts c
SET succeeds_contract_id = (c.metadata->>'switched_from_contract_id')::UUID,
    succession_reason    = COALESCE(c.succession_reason, 'switch')
WHERE c.succeeds_contract_id IS NULL
  AND c.metadata->>'switched_from_contract_id' IS NOT NULL
  AND EXISTS (SELECT 1 FROM t_contracts p
              WHERE p.id = (c.metadata->>'switched_from_contract_id')::UUID);

-- Mirror it forwards. This is the half that has never existed.
UPDATE t_contracts p
SET succeeded_by_contract_id = c.id
FROM t_contracts c
WHERE c.succeeds_contract_id = p.id
  AND p.succeeded_by_contract_id IS NULL;


-- ── Keep both sides in step from now on ─────────────────────────────────
-- Writing one direction and forgetting the other is how this data rots. The
-- trigger means a caller only ever has to set succeeds_contract_id.
CREATE OR REPLACE FUNCTION fn_mirror_contract_succession()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.succeeds_contract_id IS NOT NULL
       AND NEW.succeeds_contract_id IS DISTINCT FROM OLD.succeeds_contract_id THEN
        UPDATE t_contracts
        SET succeeded_by_contract_id = NEW.id
        WHERE id = NEW.succeeds_contract_id
          AND COALESCE(succeeded_by_contract_id, '00000000-0000-0000-0000-000000000000'::UUID)
              IS DISTINCT FROM NEW.id;
    END IF;

    -- A predecessor that is un-linked must not keep a dangling forward pointer.
    IF OLD.succeeds_contract_id IS NOT NULL
       AND NEW.succeeds_contract_id IS DISTINCT FROM OLD.succeeds_contract_id THEN
        UPDATE t_contracts
        SET succeeded_by_contract_id = NULL
        WHERE id = OLD.succeeds_contract_id
          AND succeeded_by_contract_id = NEW.id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_contract_succession ON t_contracts;
CREATE TRIGGER trg_mirror_contract_succession
    AFTER INSERT OR UPDATE OF succeeds_contract_id ON t_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_mirror_contract_succession();


-- =============================================================================
-- 2. get_tenant_billing_overview
--
-- ONE call behind both pages, deliberately. The Subscription page and the
-- Billing page disagreeing about whether you owe money would be worse than
-- either being slightly slower, and every field here comes off the same
-- snapshot.
--
-- p_tenant_id is the SUBSCRIBER (the tenant looking at their own account).
-- Plan contracts live under the PLATFORM tenant and are found through the
-- contact's source_tenant_id — the same link subscribe_tenant_to_plan and
-- /plans use, so all three can never disagree about who is on what.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_tenant_billing_overview(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_platform    UUID;
    v_contact     UUID;
    v_plan        RECORD;
    v_next        RECORD;
    v_rhythm      JSONB;
    v_outstanding JSONB := '[]'::JSONB;
    v_out_total   NUMERIC := 0;
    v_attempts    JSONB := '[]'::JSONB;
    v_history     JSONB := '[]'::JSONB;
    v_chain       JSONB := '[]'::JSONB;
    v_today       DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    SELECT id INTO v_platform FROM t_tenants WHERE is_admin = TRUE LIMIT 1;
    IF v_platform IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No platform tenant configured');
    END IF;

    SELECT id INTO v_contact
    FROM t_contacts
    WHERE tenant_id = v_platform AND is_live = TRUE AND source_tenant_id = p_tenant_id
    LIMIT 1;

    -- Never subscribed to anything: a real, ordinary state, not a failure.
    IF v_contact IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'has_account', false,
            'plan', NULL, 'outstanding', jsonb_build_object('total', 0, 'invoices', '[]'::JSONB),
            'attempts', '[]'::JSONB, 'history', '[]'::JSONB, 'continuity', '[]'::JSONB,
            'seller', can_collect_payment(v_platform::TEXT)
        );
    END IF;

    -- ── the plan in force (or awaiting its first payment) ──────────────
    SELECT c.id, c.contract_number, c.name, c.status, c.currency,
           c.grand_total, c.start_date, c.end_date,
           c.metadata->>'plan_template_id' AS template_id,
           c.succeeds_contract_id, c.succeeded_by_contract_id
      INTO v_plan
    FROM t_contracts c
    WHERE c.tenant_id = v_platform AND c.is_live = TRUE AND c.record_type = 'contract'
      AND c.buyer_id = v_contact
      AND COALESCE(c.metadata->>'source','') = 'plan_subscription'
      AND c.status IN ('active','pending_acceptance')
    ORDER BY CASE c.status WHEN 'active' THEN 0 ELSE 1 END, c.created_at DESC
    LIMIT 1;

    IF v_plan.id IS NOT NULL THEN
        v_rhythm := get_subscription_billing_rhythm(v_plan.id);
    END IF;

    -- ── a plan queued to start when the current one ends ───────────────
    -- Nothing creates one of these yet; reading for it now means the page
    -- renders the handover the day the capability lands, with no UI change.
    -- NOT wrapped in IF: a plpgsql RECORD that is never assigned raises on
    -- field access, so v_next.id below would error for a tenant with no plan.
    -- SELECT INTO always assigns, even when it matches nothing.
    SELECT c.id, c.contract_number, c.name, c.status, c.grand_total,
           c.start_date, c.end_date
      INTO v_next
    FROM t_contracts c
    WHERE v_plan.id IS NOT NULL
      AND c.succeeds_contract_id = v_plan.id
      AND c.status IN ('active','pending_acceptance')
      AND c.start_date::DATE > v_today
    ORDER BY c.start_date ASC
    LIMIT 1;

    -- ── what is owed right now ─────────────────────────────────────────
    SELECT COALESCE(SUM(COALESCE(i.balance, i.total_amount - COALESCE(i.amount_paid,0))), 0),
           COALESCE(jsonb_agg(jsonb_build_object(
               'invoice_id',      i.id,
               'invoice_number',  i.invoice_number,
               'contract_id',     i.contract_id,
               'contract_number', c.contract_number,
               'label',           COALESCE(c.name, 'Invoice'),
               'total',           i.total_amount,
               'balance',         COALESCE(i.balance, i.total_amount - COALESCE(i.amount_paid,0)),
               'currency',        COALESCE(i.currency,'INR'),
               'due_date',        i.due_date,
               'issued_at',       i.issued_at,
               'is_overdue',      (i.due_date IS NOT NULL AND i.due_date < v_today)
           ) ORDER BY i.created_at DESC), '[]'::JSONB)
      INTO v_out_total, v_outstanding
    FROM t_invoices i
    JOIN t_contracts c ON c.id = i.contract_id
    WHERE c.tenant_id = v_platform AND c.buyer_id = v_contact
      AND i.is_active = TRUE
      AND i.status NOT IN ('paid','cancelled')
      -- Cancelling a contract does NOT cancel its invoices today (a known
      -- open leak). Without this the tenant is billed for a contract that
      -- no longer exists — seen live: a cancelled wallet top-up kept a
      -- Rs.1,000 invoice and inflated the total to Rs.24,996.
      AND c.status <> 'cancelled'
      AND COALESCE(i.balance, i.total_amount - COALESCE(i.amount_paid,0)) > 0;

    -- ── payment attempts ───────────────────────────────────────────────
    -- An abandoned checkout and a declined card both end in "nothing
    -- happened" for the tenant. Naming which one occurred is the difference
    -- between someone who retries and someone who raises a ticket.
    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'at' DESC), '[]'::JSONB) INTO v_attempts
    FROM (
        SELECT jsonb_build_object(
                   'request_id',  pr.id,
                   'invoice_id',  pr.invoice_id,
                   'at',          pr.created_at,
                   'amount',      pr.amount,
                   'currency',    COALESCE(pr.currency,'INR'),
                   'provider',    pr.gateway_provider,
                   'mode',        pr.collection_mode,
                   'status',      pr.status,
                   'paid_at',     pr.paid_at
               ) AS x
        FROM t_contract_payment_requests pr
        JOIN t_contracts c ON c.id = pr.contract_id
        WHERE c.tenant_id = v_platform AND c.buyer_id = v_contact
        ORDER BY pr.created_at DESC
        LIMIT 25
    ) s;

    -- ── purchase history: every charge and every receipt ───────────────
    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'at' DESC), '[]'::JSONB) INTO v_history
    FROM (
        SELECT jsonb_build_object(
                   'kind',            'invoice',
                   'at',              i.created_at,
                   'invoice_id',      i.id,
                   'reference',       i.invoice_number,
                   'contract_id',     c.id,
                   'contract_number', c.contract_number,
                   'label',           COALESCE(c.name,'Invoice'),
                   'sublabel',        CASE COALESCE(c.metadata->>'source','')
                                        WHEN 'plan_subscription' THEN 'plan subscription'
                                        WHEN 'topup_purchase'    THEN 'pay-as-you-go'
                                        ELSE 'purchase' END,
                   'amount',          i.total_amount,
                   'balance',         COALESCE(i.balance, i.total_amount - COALESCE(i.amount_paid,0)),
                   'currency',        COALESCE(i.currency,'INR'),
                   -- A zero-value invoice was never a bill; calling it
                   -- "unpaid" makes a free plan look like a debt.
                   'status',          CASE
                                        WHEN i.status = 'paid' THEN 'paid'
                                        WHEN i.status = 'cancelled' THEN 'cancelled'
                                        WHEN COALESCE(i.total_amount,0) = 0 THEN 'activated'
                                        ELSE 'unpaid' END,
                   'paid_at',         i.paid_at
               ) AS x
        FROM t_invoices i
        JOIN t_contracts c ON c.id = i.contract_id
        WHERE c.tenant_id = v_platform AND c.buyer_id = v_contact AND i.is_active = TRUE
        ORDER BY i.created_at DESC
        LIMIT 50
    ) s;

    -- ── the succession chain, walked from the current term ─────────────
    -- Backwards through succeeds_contract_id, forwards through
    -- succeeded_by_contract_id. Depth-capped: a cycle in this data must
    -- degrade to a short list, never hang the page.
    IF v_plan.id IS NOT NULL THEN
        WITH RECURSIVE back AS (
            SELECT c.*, 0 AS depth FROM t_contracts c WHERE c.id = v_plan.id
            UNION ALL
            SELECT p.*, b.depth + 1
            FROM t_contracts p JOIN back b ON p.id = b.succeeds_contract_id
            WHERE b.depth < 20
        ),
        fwd AS (
            SELECT c.*, 0 AS depth FROM t_contracts c WHERE c.id = v_plan.id
            UNION ALL
            SELECT n.*, f.depth + 1
            FROM t_contracts n JOIN fwd f ON n.id = f.succeeded_by_contract_id
            WHERE f.depth < 20
        ),
        -- DISTINCT ON id, not UNION: the current contract appears in both
        -- walks, and a plain UNION would only dedupe it when the depth
        -- column happened to match too — so it would list twice.
        -- Named chain_rows, NOT `both`: BOTH is a reserved word in Postgres
        -- (TRIM(BOTH ...)) and fails as a bare CTE name. Caught on apply.
        -- DISTINCT ON id, not UNION: the current contract appears in both
        -- walks, and a plain UNION would only dedupe it when the depth
        -- column matched too — so it would list twice.
        chain_rows AS (
            SELECT DISTINCT ON (u.id) u.*
            FROM (SELECT * FROM back UNION ALL SELECT * FROM fwd) u
            ORDER BY u.id, u.depth
        )
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'contract_id',      b.id,
                   'contract_number',  b.contract_number,
                   'name',             b.name,
                   'status',           b.status,
                   'amount',           b.grand_total,
                   'start_date',       b.start_date,
                   'end_date',         b.end_date,
                   'succeeds',         b.succeeds_contract_id,
                   'succeeded_by',     b.succeeded_by_contract_id,
                   'reason',           b.succession_reason,
                   'is_current',       (b.id = v_plan.id)
               ) ORDER BY b.created_at), '[]'::JSONB)
          INTO v_chain
        FROM chain_rows b;
    END IF;

    RETURN jsonb_build_object(
        'success',     true,
        'has_account', true,
        'today',       v_today,
        'plan', CASE WHEN v_plan.id IS NULL THEN NULL ELSE jsonb_build_object(
            'contract_id',      v_plan.id,
            'contract_number',  v_plan.contract_number,
            'name',             v_plan.name,
            'status',           v_plan.status,
            'template_id',      v_plan.template_id,
            'amount',           v_plan.grand_total,
            'currency',         COALESCE(v_plan.currency,'INR'),
            'period_start',     v_plan.start_date,
            'period_end',       v_plan.end_date,
            -- The single most important flag on this payload. An unpaid plan
            -- is NOT a running plan, whatever its term dates say.
            'is_running',       (v_plan.status = 'active'),
            'awaiting_payment', (v_plan.status = 'pending_acceptance'),
            'days_remaining',   CASE WHEN v_plan.status = 'active' AND v_plan.end_date IS NOT NULL
                                     THEN GREATEST((v_plan.end_date::DATE - v_today), 0) END
        ) END,
        'rhythm', COALESCE(v_rhythm, jsonb_build_object('source','none','total_installments',0)),
        'next_plan', CASE WHEN v_next.id IS NULL THEN NULL ELSE jsonb_build_object(
            'contract_id',     v_next.id,
            'contract_number', v_next.contract_number,
            'name',            v_next.name,
            'status',          v_next.status,
            'amount',          v_next.grand_total,
            'starts_on',       v_next.start_date,
            'ends_on',         v_next.end_date
        ) END,
        'outstanding', jsonb_build_object('total', v_out_total, 'invoices', v_outstanding),
        'attempts',    v_attempts,
        'history',     v_history,
        'continuity',  v_chain,
        'seller',      can_collect_payment(v_platform::TEXT)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_billing_overview(UUID) TO authenticated, service_role;


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- -- The chain should read CN-1001 -> CN-1012 -> CN-1013 -> CN-1039, and now
-- -- also resolve FORWARDS, which was impossible before this migration:
-- SELECT c.contract_number,
--        p.contract_number AS succeeds,
--        n.contract_number AS succeeded_by
-- FROM t_contracts c
-- LEFT JOIN t_contracts p ON p.id = c.succeeds_contract_id
-- LEFT JOIN t_contracts n ON n.id = c.succeeded_by_contract_id
-- WHERE c.succeeds_contract_id IS NOT NULL OR c.succeeded_by_contract_id IS NOT NULL
-- ORDER BY c.created_at;
--
-- SELECT jsonb_pretty(get_tenant_billing_overview(
--   (SELECT id FROM t_tenants WHERE name = 'Trinity Tecnitions')));
-- =============================================================================
