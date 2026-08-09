-- ============================================================================
-- Adhoc (contact-less) invoicing — no t_contracts row required
-- ============================================================================
-- Source-of-record copy of what was applied LIVE via Supabase MCP this
-- session (2026-08-08) — DO NOT RE-RUN. Kept here for history/rollback
-- reference, same convention as bbb-foundation/*.
--
-- Context: every invoice/receipt in the system was tied to a real contract
-- (t_invoices.contract_id / t_invoice_receipts.contract_id both NOT NULL).
-- This blocked recording a payment for someone with no membership contract
-- (e.g. a Group Session guest fee) — CLAUDE.md's "guest session payments
-- have nowhere to post" gap. This migration adds a genuinely contact-less
-- path: create_adhoc_invoice creates an invoice + settling receipt in one
-- transaction, always fully paid at creation (no partial/unpaid state for
-- this invoice type — see chk_invoice_identity below).
-- ============================================================================

-- ── STEP 1: schema — relax NOT NULL, add contact identity + line-item snapshot ──

ALTER TABLE t_invoices ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE t_invoices ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES t_contacts(id);
ALTER TABLE t_invoices ADD COLUMN IF NOT EXISTS line_items jsonb;
ALTER TABLE t_invoices DROP CONSTRAINT IF EXISTS chk_invoice_identity;
ALTER TABLE t_invoices ADD CONSTRAINT chk_invoice_identity CHECK (contract_id IS NOT NULL OR contact_id IS NOT NULL);

ALTER TABLE t_invoice_receipts ALTER COLUMN contract_id DROP NOT NULL;

-- ── STEP 2: create_adhoc_invoice — invoice + receipt, one transaction ──
-- Mirrors record_invoice_payment's number-generation and receipt-insert
-- shape almost line-for-line (that RPC already null-guards its one
-- contract-dependent branch — this is genuinely the same pattern with
-- contract_id NULL throughout).

CREATE OR REPLACE FUNCTION public.create_adhoc_invoice(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id      UUID;
    v_contact_id     UUID;
    v_created_by     UUID;
    v_is_live        BOOLEAN;
    v_currency       VARCHAR(10);
    v_payment_method VARCHAR(30);
    v_payment_date   DATE;
    v_reference_number TEXT;
    v_notes          TEXT;

    v_line_items     JSONB;
    v_amount         NUMERIC := 0;
    v_tax_amount     NUMERIC := 0;
    v_total_amount   NUMERIC := 0;

    v_contact_exists BOOLEAN;

    v_seq_result     JSONB;
    v_invoice_number VARCHAR(30);
    v_receipt_number VARCHAR(30);
    v_invoice_id     UUID;
    v_receipt_id     UUID;
    v_healing_attempt INTEGER;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Extract and validate inputs
    -- ═══════════════════════════════════════════
    v_tenant_id  := (p_payload->>'tenant_id')::UUID;
    v_contact_id := (p_payload->>'contact_id')::UUID;
    v_created_by := (p_payload->>'created_by')::UUID;
    v_is_live    := COALESCE((p_payload->>'is_live')::BOOLEAN, true);
    v_currency   := COALESCE(p_payload->>'currency', 'INR');

    v_payment_method    := COALESCE(p_payload->>'payment_method', 'cash');
    v_payment_date      := COALESCE((p_payload->>'payment_date')::DATE, (now() at time zone 'Asia/Kolkata')::date);
    v_reference_number  := p_payload->>'reference_number';
    v_notes              := p_payload->>'notes';

    v_line_items := COALESCE(p_payload->'line_items', '[]'::jsonb);

    IF v_tenant_id IS NULL OR v_contact_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id and contact_id are required');
    END IF;

    IF jsonb_array_length(v_line_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'At least one line item is required');
    END IF;

    -- STEP 0b: contact must belong to this tenant
    SELECT true INTO v_contact_exists
    FROM t_contacts
    WHERE id = v_contact_id AND tenant_id = v_tenant_id AND is_active = true;

    IF v_contact_exists IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contact not found for this tenant');
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Total the line items (server-side, never trust client totals)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(SUM((li->>'amount')::NUMERIC), 0)
    INTO v_amount
    FROM jsonb_array_elements(v_line_items) li;

    IF v_amount IS NULL OR v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Line items must total a positive amount');
    END IF;

    v_tax_amount := COALESCE((p_payload->>'tax_amount')::NUMERIC, 0);
    v_total_amount := v_amount + v_tax_amount;

    -- ═══════════════════════════════════════════
    -- STEP 2: Generate invoice number (self-healing, same pattern as the
    -- contract-event scanner and record_invoice_payment)
    -- ═══════════════════════════════════════════
    FOR v_healing_attempt IN 1..1000 LOOP
        v_seq_result := get_next_formatted_sequence('INVOICE', v_tenant_id, v_is_live);
        v_invoice_number := v_seq_result->>'formatted';
        IF v_invoice_number IS NULL THEN
            RAISE EXCEPTION 'INVOICE sequence returned no number: %', v_seq_result;
        END IF;
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM t_invoices
            WHERE tenant_id = v_tenant_id AND invoice_number = v_invoice_number AND is_active = true
        );
        IF v_healing_attempt = 1000 THEN
            RAISE EXCEPTION 'Unable to generate a unique invoice number after 1000 attempts';
        END IF;
    END LOOP;

    -- ═══════════════════════════════════════════
    -- STEP 3: Create the invoice — always settled at creation (no contract)
    -- ═══════════════════════════════════════════
    INSERT INTO t_invoices (
        contract_id, contact_id, tenant_id, invoice_number, invoice_type,
        amount, tax_amount, total_amount, currency,
        amount_paid, balance, status,
        line_items, block_ids,
        due_date, issued_at, paid_at, notes,
        is_live, created_by
    ) VALUES (
        NULL, v_contact_id, v_tenant_id, v_invoice_number, 'receivable',
        v_amount, v_tax_amount, v_total_amount, v_currency,
        v_total_amount, 0, 'paid',
        v_line_items,
        COALESCE((SELECT jsonb_agg(li->>'block_id') FROM jsonb_array_elements(v_line_items) li WHERE li->>'block_id' IS NOT NULL), '[]'::jsonb),
        v_payment_date, now(), now(), v_notes,
        v_is_live, v_created_by
    )
    RETURNING id INTO v_invoice_id;

    -- ═══════════════════════════════════════════
    -- STEP 4: Generate receipt number and create the receipt — same shape
    -- as record_invoice_payment's STEP 2/3, contract_id NULL
    -- ═══════════════════════════════════════════
    FOR v_healing_attempt IN 1..1000 LOOP
        v_seq_result := get_next_formatted_sequence('RECEIPT', v_tenant_id, v_is_live);
        v_receipt_number := v_seq_result->>'formatted';
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM t_invoice_receipts
            WHERE tenant_id = v_tenant_id AND receipt_number = v_receipt_number AND is_active = true
        );
        IF v_healing_attempt = 1000 THEN
            RAISE EXCEPTION 'Unable to generate a unique receipt number after 1000 attempts';
        END IF;
    END LOOP;

    INSERT INTO t_invoice_receipts (
        invoice_id, contract_id, tenant_id, receipt_number,
        amount, currency, payment_date, payment_method,
        reference_number, notes, is_offline, recorded_by
    ) VALUES (
        v_invoice_id, NULL, v_tenant_id, v_receipt_number,
        v_total_amount, v_currency, v_payment_date, v_payment_method,
        v_reference_number, v_notes, true, v_created_by
    )
    RETURNING id INTO v_receipt_id;

    -- ═══════════════════════════════════════════
    -- STEP 5: Return
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'invoice_id', v_invoice_id,
            'invoice_number', v_invoice_number,
            'receipt_id', v_receipt_id,
            'receipt_number', v_receipt_number,
            'contact_id', v_contact_id,
            'amount', v_amount,
            'tax_amount', v_tax_amount,
            'total_amount', v_total_amount,
            'currency', v_currency,
            'status', 'paid'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to create invoice',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$function$;

-- ── STEP 3: get_tenant_receivables — surface adhoc invoices in Finance ──
-- Only the collected_total sub-query (v_summary) and the final invoice list
-- (v_invoices) LEFT JOIN t_contracts instead of INNER JOIN — those are the
-- only two places an always-status='paid'/balance=0 adhoc invoice can ever
-- affect (everything else in this function is scoped to open/unpaid
-- invoices, which adhoc invoices are never in). by_buyer and events stay on
-- INNER JOIN deliberately — see inline comment in the function body.
-- Regression-verified live against BBB's 49-contract receivables output
-- (collected_total unchanged at 313500, invoice_count unchanged at 49)
-- before and after.

CREATE OR REPLACE FUNCTION public.get_tenant_receivables(p_tenant_id uuid, p_is_live boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_summary  JSONB;
    v_by_buyer JSONB;
    v_invoices JSONB;
    v_events   JSONB;
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    -- NOTE: this first `inv` CTE deliberately LEFT JOINs t_contracts (was an
    -- INNER JOIN) so contact-less adhoc invoices (contract_id IS NULL, see
    -- create_adhoc_invoice) are counted in collected_total below. They are
    -- always status='paid'/balance=0 at creation, so they never enter
    -- open_inv (filtered to unpaid/partially_paid) and cannot affect the
    -- ageing/overdue/upcoming buckets that follow — safe to widen here.
    WITH inv AS (
        SELECT i.id, i.invoice_number, i.status, i.amount, i.tax_amount, i.total_amount,
               i.amount_paid, i.balance, i.currency, i.due_date, i.issued_at, i.paid_at,
               i.emi_sequence, i.emi_total, i.billing_cycle, i.payment_mode,
               i.contract_event_id, i.last_reminder_at, i.created_at,
               c.id AS contract_id, c.contract_number, c.name AS contract_name,
               c.buyer_id, c.buyer_name, c.buyer_company
        FROM t_invoices i
        LEFT JOIN t_contracts c ON c.id = i.contract_id
        WHERE i.tenant_id = p_tenant_id
          AND i.invoice_type = 'receivable'
          AND i.is_active = true
          AND COALESCE(i.is_live, true) = p_is_live
    ),
    open_inv AS (
        SELECT * FROM inv WHERE status IN ('unpaid','partially_paid')
    ),
    ev_base AS (
        SELECT e.id, e.contract_id, e.scheduled_date::date AS due_on,
               (e.amount - COALESCE(e.amount_settled, 0)) AS unsettled
        FROM t_contract_events e
        WHERE e.tenant_id = p_tenant_id
          AND e.event_type = 'billing'
          AND e.is_active = true
          AND COALESCE(e.is_live, true) = p_is_live
          AND COALESCE(e.status, '') NOT IN ('cancelled','skipped','waived')
          AND (e.amount - COALESCE(e.amount_settled, 0)) > 0
          AND e.contract_id IN (SELECT contract_id FROM open_inv)
    ),
    contract_unalloc AS (
        SELECT oi.contract_id,
               GREATEST(0,
                   SUM(oi.amount_paid)
                   - COALESCE((
                       SELECT SUM(COALESCE(e2.amount_settled, 0))
                       FROM t_contract_events e2
                       WHERE e2.contract_id = oi.contract_id
                         AND e2.event_type = 'billing'
                         AND e2.is_active = true
                         AND COALESCE(e2.is_live, true) = p_is_live
                         AND COALESCE(e2.status, '') NOT IN ('cancelled','skipped','waived')
                   ), 0)
               ) AS unallocated
        FROM (SELECT contract_id, amount_paid FROM inv WHERE status <> 'draft') oi
        GROUP BY oi.contract_id
    ),
    ev_fifo AS (
        SELECT eb.*,
               COALESCE(SUM(eb.unsettled) OVER (
                   PARTITION BY eb.contract_id ORDER BY eb.due_on, eb.id
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_before
        FROM ev_base eb
    ),
    ev AS (
        SELECT f.contract_id, f.due_on,
               GREATEST(0, f.unsettled - GREATEST(0, cu.unallocated - f.cum_before)) AS open_amount,
               CASE WHEN f.due_on < (now() at time zone 'Asia/Kolkata')::date THEN (now() at time zone 'Asia/Kolkata')::date - f.due_on ELSE 0 END AS days_overdue
        FROM ev_fifo f
        JOIN contract_unalloc cu ON cu.contract_id = f.contract_id
        WHERE GREATEST(0, f.unsettled - GREATEST(0, cu.unallocated - f.cum_before)) > 0

        UNION ALL

        SELECT oi.contract_id, oi.due_date AS due_on, oi.balance AS open_amount,
               CASE WHEN oi.due_date IS NOT NULL AND oi.due_date < (now() at time zone 'Asia/Kolkata')::date
                    THEN (now() at time zone 'Asia/Kolkata')::date - oi.due_date ELSE 0 END AS days_overdue
        FROM open_inv oi
        WHERE oi.balance > 0
          AND NOT EXISTS (
              SELECT 1 FROM t_contract_events e3
              WHERE e3.contract_id = oi.contract_id
                AND e3.event_type = 'billing'
                AND e3.is_active = true
                AND COALESCE(e3.is_live, true) = p_is_live
                AND COALESCE(e3.status, '') NOT IN ('cancelled','skipped','waived')
          )
    )
    SELECT jsonb_build_object(
        'total_outstanding',  COALESCE((SELECT SUM(balance) FROM open_inv), 0),
        'outstanding_count',  (SELECT COUNT(*) FROM open_inv),
        'overdue_total',      COALESCE((SELECT SUM(open_amount) FROM ev WHERE days_overdue > 0), 0),
        'overdue_count',      (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE days_overdue > 0),
        'upcoming_7_total',   COALESCE((SELECT SUM(open_amount) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 7), 0),
        'upcoming_7_count',   (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 7),
        'upcoming_15_total',  COALESCE((SELECT SUM(open_amount) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 15), 0),
        'upcoming_15_count',  (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 15),
        'upcoming_30_total',  COALESCE((SELECT SUM(open_amount) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 30), 0),
        'upcoming_30_count',  (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE due_on >= (now() at time zone 'Asia/Kolkata')::date AND due_on <= (now() at time zone 'Asia/Kolkata')::date + 30),
        'draft_total',        COALESCE((SELECT SUM(total_amount) FROM inv WHERE status = 'draft'), 0),
        'draft_count',        (SELECT COUNT(*) FROM inv WHERE status = 'draft'),
        'collected_total',    COALESCE((SELECT SUM(amount_paid) FROM inv), 0),
        'collected_this_month', COALESCE((
            SELECT SUM(r.amount)
            FROM t_invoice_receipts r
            JOIN t_invoices ri ON ri.id = r.invoice_id
            WHERE r.tenant_id = p_tenant_id
              AND COALESCE(r.is_active, true) = true
              AND COALESCE(ri.is_live, true) = p_is_live
              AND r.payment_date >= date_trunc('month', (now() at time zone 'Asia/Kolkata')::date)::date
        ), 0),
        'ageing', jsonb_build_object(
            'b_1_7',   jsonb_build_object(
                'total', COALESCE((SELECT SUM(open_amount) FROM ev WHERE days_overdue BETWEEN 1 AND 7), 0),
                'count', (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE days_overdue BETWEEN 1 AND 7)),
            'b_8_15',  jsonb_build_object(
                'total', COALESCE((SELECT SUM(open_amount) FROM ev WHERE days_overdue BETWEEN 8 AND 15), 0),
                'count', (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE days_overdue BETWEEN 8 AND 15)),
            'b_16_30', jsonb_build_object(
                'total', COALESCE((SELECT SUM(open_amount) FROM ev WHERE days_overdue BETWEEN 16 AND 30), 0),
                'count', (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE days_overdue BETWEEN 16 AND 30)),
            'b_30_plus', jsonb_build_object(
                'total', COALESCE((SELECT SUM(open_amount) FROM ev WHERE days_overdue > 30), 0),
                'count', (SELECT COUNT(DISTINCT contract_id) FROM ev WHERE days_overdue > 30))
        )
    )
    INTO v_summary;

    -- by_buyer and events blocks are deliberately UNCHANGED (still INNER JOIN
    -- t_contracts): both are scoped to open_inv (status IN unpaid/partially_paid)
    -- and adhoc invoices are always created status='paid', so they can never
    -- appear here regardless of JOIN type — no behavioural difference, and
    -- narrowing the edit keeps this already-complex function's blast radius
    -- as small as possible.
    WITH inv AS (
        SELECT i.id, i.status, i.amount_paid, i.balance, i.due_date,
               c.id AS contract_id, c.buyer_id, c.buyer_name, c.buyer_company
        FROM t_invoices i
        JOIN t_contracts c ON c.id = i.contract_id
        WHERE i.tenant_id = p_tenant_id
          AND i.invoice_type = 'receivable'
          AND i.is_active = true
          AND COALESCE(i.is_live, true) = p_is_live
    ),
    open_inv AS (
        SELECT * FROM inv WHERE status IN ('unpaid','partially_paid')
    ),
    ev_base AS (
        SELECT e.id, e.contract_id, e.scheduled_date::date AS due_on,
               (e.amount - COALESCE(e.amount_settled, 0)) AS unsettled
        FROM t_contract_events e
        WHERE e.tenant_id = p_tenant_id
          AND e.event_type = 'billing'
          AND e.is_active = true
          AND COALESCE(e.is_live, true) = p_is_live
          AND COALESCE(e.status, '') NOT IN ('cancelled','skipped','waived')
          AND (e.amount - COALESCE(e.amount_settled, 0)) > 0
          AND e.contract_id IN (SELECT contract_id FROM open_inv)
    ),
    contract_unalloc AS (
        SELECT oi.contract_id,
               GREATEST(0,
                   SUM(oi.amount_paid)
                   - COALESCE((
                       SELECT SUM(COALESCE(e2.amount_settled, 0))
                       FROM t_contract_events e2
                       WHERE e2.contract_id = oi.contract_id
                         AND e2.event_type = 'billing'
                         AND e2.is_active = true
                         AND COALESCE(e2.is_live, true) = p_is_live
                         AND COALESCE(e2.status, '') NOT IN ('cancelled','skipped','waived')
                   ), 0)
               ) AS unallocated
        FROM (SELECT contract_id, amount_paid FROM inv WHERE status <> 'draft') oi
        GROUP BY oi.contract_id
    ),
    ev_fifo AS (
        SELECT eb.*,
               COALESCE(SUM(eb.unsettled) OVER (
                   PARTITION BY eb.contract_id ORDER BY eb.due_on, eb.id
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_before
        FROM ev_base eb
    ),
    ev AS (
        SELECT f.contract_id, f.due_on,
               GREATEST(0, f.unsettled - GREATEST(0, cu.unallocated - f.cum_before)) AS open_amount,
               CASE WHEN f.due_on < (now() at time zone 'Asia/Kolkata')::date THEN (now() at time zone 'Asia/Kolkata')::date - f.due_on ELSE 0 END AS days_overdue
        FROM ev_fifo f
        JOIN contract_unalloc cu ON cu.contract_id = f.contract_id
        WHERE GREATEST(0, f.unsettled - GREATEST(0, cu.unallocated - f.cum_before)) > 0

        UNION ALL

        SELECT oi.contract_id, oi.due_date AS due_on, oi.balance AS open_amount,
               CASE WHEN oi.due_date IS NOT NULL AND oi.due_date < (now() at time zone 'Asia/Kolkata')::date
                    THEN (now() at time zone 'Asia/Kolkata')::date - oi.due_date ELSE 0 END AS days_overdue
        FROM open_inv oi
        WHERE oi.balance > 0
          AND NOT EXISTS (
              SELECT 1 FROM t_contract_events e3
              WHERE e3.contract_id = oi.contract_id
                AND e3.event_type = 'billing'
                AND e3.is_active = true
                AND COALESCE(e3.is_live, true) = p_is_live
                AND COALESCE(e3.status, '') NOT IN ('cancelled','skipped','waived')
          )
    ),
    ev_by_contract AS (
        SELECT contract_id,
               SUM(open_amount) FILTER (WHERE days_overdue > 0) AS overdue_total,
               MIN(due_on) AS oldest_due_date,
               MAX(days_overdue) AS max_days_overdue
        FROM ev
        GROUP BY contract_id
    )
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'overdue_total')::NUMERIC DESC NULLS LAST, (row_data->>'outstanding')::NUMERIC DESC), '[]'::jsonb)
    INTO v_by_buyer
    FROM (
        SELECT jsonb_build_object(
            'buyer_id',        o.buyer_id,
            'buyer_name',      COALESCE(MAX(o.buyer_company), MAX(o.buyer_name), 'Unknown'),
            'outstanding',     SUM(o.balance),
            'overdue_total',   SUM(COALESCE(ec.overdue_total, 0)),
            'invoice_count',   COUNT(*),
            'oldest_due_date', MIN(ec.oldest_due_date),
            'max_days_overdue', COALESCE(MAX(ec.max_days_overdue), 0)
        ) AS row_data
        FROM open_inv o
        LEFT JOIN ev_by_contract ec ON ec.contract_id = o.contract_id
        GROUP BY o.buyer_id
    ) g;

    WITH inv AS (
        SELECT i.id, i.invoice_number, i.status, i.amount_paid, i.balance,
               i.total_amount, i.due_date, i.created_at,
               c.id AS contract_id, c.contract_number, c.name AS contract_name,
               c.buyer_id, c.buyer_name, c.buyer_company
        FROM t_invoices i
        JOIN t_contracts c ON c.id = i.contract_id
        WHERE i.tenant_id = p_tenant_id
          AND i.invoice_type = 'receivable'
          AND i.is_active = true
          AND COALESCE(i.is_live, true) = p_is_live
    ),
    open_inv AS (
        SELECT * FROM inv WHERE status IN ('unpaid','partially_paid')
    ),
    first_open_inv AS (
        SELECT DISTINCT ON (contract_id) contract_id, id AS invoice_id, invoice_number,
               contract_number, contract_name, buyer_id, buyer_name, buyer_company
        FROM open_inv
        ORDER BY contract_id, created_at ASC
    ),
    ev_all AS (
        SELECT e.id, e.contract_id, e.scheduled_date::date AS due_on,
               e.amount, COALESCE(e.amount_settled, 0) AS amount_settled,
               GREATEST(e.amount - COALESCE(e.amount_settled, 0), 0) AS unsettled,
               e.block_name, e.sequence_number, e.total_occurrences,
               e.billing_cycle_label, e.status
        FROM t_contract_events e
        WHERE e.tenant_id = p_tenant_id
          AND e.event_type = 'billing'
          AND e.is_active = true
          AND COALESCE(e.is_live, true) = p_is_live
          AND COALESCE(e.status, '') NOT IN ('cancelled','skipped','waived')
          AND e.contract_id IN (SELECT contract_id FROM open_inv)
    ),
    contract_unalloc AS (
        SELECT oi.contract_id,
               GREATEST(0,
                   SUM(oi.amount_paid)
                   - COALESCE((
                       SELECT SUM(COALESCE(e2.amount_settled, 0))
                       FROM t_contract_events e2
                       WHERE e2.contract_id = oi.contract_id
                         AND e2.event_type = 'billing'
                         AND e2.is_active = true
                         AND COALESCE(e2.is_live, true) = p_is_live
                         AND COALESCE(e2.status, '') NOT IN ('cancelled','skipped','waived')
                   ), 0)
               ) AS unallocated
        FROM (SELECT contract_id, amount_paid FROM inv WHERE status <> 'draft') oi
        GROUP BY oi.contract_id
    ),
    ev_fifo AS (
        SELECT ea.*,
               COALESCE(SUM(ea.unsettled) OVER (
                   PARTITION BY ea.contract_id ORDER BY ea.due_on, ea.id
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_before
        FROM ev_all ea
    ),
    ev_open AS (
        SELECT f.id, f.contract_id, f.due_on, f.amount, f.block_name,
               f.sequence_number, f.total_occurrences, f.billing_cycle_label, f.status,
               GREATEST(0, f.unsettled - GREATEST(0, cu.unallocated - f.cum_before)) AS open_amount
        FROM ev_fifo f
        JOIN contract_unalloc cu ON cu.contract_id = f.contract_id

        UNION ALL

        SELECT NULL::uuid, oi.contract_id, oi.due_date, oi.balance, 'Invoice'::text,
               NULL::int, NULL::int, NULL::text, oi.status,
               oi.balance
        FROM open_inv oi
        WHERE oi.balance > 0
          AND NOT EXISTS (
              SELECT 1 FROM t_contract_events e3
              WHERE e3.contract_id = oi.contract_id
                AND e3.event_type = 'billing'
                AND e3.is_active = true
                AND COALESCE(e3.is_live, true) = p_is_live
                AND COALESCE(e3.status, '') NOT IN ('cancelled','skipped','waived')
          )
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',                 x.id,
        'contract_id',        x.contract_id,
        'contract_number',    fo.contract_number,
        'contract_name',      fo.contract_name,
        'buyer_id',           fo.buyer_id,
        'buyer_name',         fo.buyer_name,
        'buyer_company',      fo.buyer_company,
        'invoice_id',         fo.invoice_id,
        'invoice_number',     fo.invoice_number,
        'block_name',         x.block_name,
        'is_group_session',   EXISTS (SELECT 1 FROM t_contract_blocks gcb
                                         WHERE gcb.contract_id = x.contract_id
                                           AND gcb.custom_fields->'config'->>'audience' = 'group'),
        'sequence_number',    x.sequence_number,
        'total_occurrences',  x.total_occurrences,
        'billing_cycle_label', x.billing_cycle_label,
        'event_status',       x.status,
        'due_on',             x.due_on,
        'amount',             x.amount,
        'open_amount',        x.open_amount,
        'settled',            (x.open_amount <= 0),
        'days_overdue',       CASE WHEN x.open_amount > 0 AND x.due_on IS NOT NULL AND x.due_on < (now() at time zone 'Asia/Kolkata')::date
                                   THEN (now() at time zone 'Asia/Kolkata')::date - x.due_on ELSE 0 END
    ) ORDER BY x.due_on ASC NULLS LAST, x.id), '[]'::jsonb)
    INTO v_events
    FROM (SELECT * FROM ev_open ORDER BY due_on ASC NULLS LAST LIMIT 1000) x
    JOIN first_open_inv fo ON fo.contract_id = x.contract_id;

    -- Final invoice list shown in Finance -> Receivables. LEFT JOIN t_contracts
    -- plus a LEFT JOIN to t_contacts so adhoc (contact-only) invoices from
    -- create_adhoc_invoice show up here too, per the "accumulate in
    -- Receivables" requirement. buyer_name/buyer_company fall back to the
    -- contact's own name/company when there is no contract to source them
    -- from. is_adhoc flags rows with no contract for the frontend.
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY
               (x.status = 'draft') DESC, x.days_overdue DESC, x.due_date ASC NULLS LAST, x.created_at DESC), '[]'::jsonb)
    INTO v_invoices
    FROM (
        SELECT i.id, i.invoice_number, i.status, i.amount, i.tax_amount, i.total_amount,
               i.amount_paid, i.balance, i.currency, i.due_date, i.issued_at, i.paid_at,
               i.emi_sequence, i.emi_total, i.billing_cycle, i.payment_mode,
               i.contract_event_id, i.last_reminder_at, i.created_at,
               c.id AS contract_id, c.contract_number, c.name AS contract_name,
               COALESCE(c.buyer_id, i.contact_id) AS buyer_id,
               COALESCE(c.buyer_company, c.buyer_name, ct.company_name, ct.name) AS buyer_name,
               COALESCE(c.buyer_company, ct.company_name) AS buyer_company,
               (c.id IS NULL) AS is_adhoc,
               CASE WHEN i.status IN ('unpaid','partially_paid') AND i.due_date IS NOT NULL
                    THEN GREATEST(0, (now() at time zone 'Asia/Kolkata')::date - i.due_date)
                    ELSE 0 END AS days_overdue
        FROM t_invoices i
        LEFT JOIN t_contracts c ON c.id = i.contract_id
        LEFT JOIN t_contacts ct ON ct.id = i.contact_id
        WHERE i.tenant_id = p_tenant_id
          AND i.invoice_type = 'receivable'
          AND i.is_active = true
          AND COALESCE(i.is_live, true) = p_is_live
        LIMIT 500
    ) x;

    RETURN jsonb_build_object(
        'success', true,
        'as_of', now(),
        'summary', v_summary,
        'by_buyer', v_by_buyer,
        'events', v_events,
        'invoices', v_invoices
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to load receivables',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$function$;

-- ── STEP 4: get_contact_cockpit_summary — same, for the per-contact Financials tab ──
-- STEP 7 (invoice list) and STEP 8 (payment pattern) UNION in invoices where
-- contract_id IS NULL AND contact_id = p_contact_id — these can't be reached
-- through the existing buyer_id/accessor-on-contract JOIN chain since they
-- have no contract at all. STEP 6 (outstanding) is untouched — adhoc
-- invoices are always paid/zero-balance so they never contribute there.
-- Regression-verified live against a real contract-linked contact (BBB,
-- total_paid 248500 unchanged) before and after.

CREATE OR REPLACE FUNCTION public.get_contact_cockpit_summary(p_contact_id uuid, p_tenant_id uuid, p_is_live boolean DEFAULT true, p_days_ahead integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_contracts_summary     JSONB;
    v_events_summary        JSONB;
    v_overdue_events        JSONB;
    v_upcoming_events       JSONB;
    v_invoices              JSONB;
    v_ltv                   NUMERIC;
    v_outstanding           NUMERIC;
    v_health_score          NUMERIC;
    v_revenue_score         NUMERIC;
    v_delivery_score        NUMERIC;
    v_urgency_score         NUMERIC;
    v_urgency_level         TEXT;
    v_total_events          INT;
    v_completed_events      INT;
    v_overdue_count         INT;
    v_overdue_invoice_count INT;
    v_today_event_count     INT;
    v_soon_event_count      INT;
    v_total_invoiced        NUMERIC;
    v_total_paid            NUMERIC;
    v_invoice_count         INT;
    v_paid_on_time_count    INT;
    -- Behavioral scoring: only events due by now
    v_billing_due_count     INT;
    v_billing_met_count     INT;
    v_billing_due_amount    NUMERIC;
    v_billing_collected     NUMERIC;
    v_service_due_count     INT;
    v_service_met_count     INT;
BEGIN
    -- ═══════════════════════════════════════════
    -- STEP 0: Input validation
    -- ═══════════════════════════════════════════
    IF p_contact_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'contact_id is required');
    END IF;
    IF p_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'tenant_id is required');
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 1: Contracts Summary (Multi-Role)
    --   Finds contracts where:
    --   a) buyer_id = contact_id (I created contract for this contact)
    --   b) t_contract_access.accessor_contact_id = contact_id (CNAK connected)
    --   Deduplicates by contract ID.
    -- ═══════════════════════════════════════════
    SELECT jsonb_build_object(
        'total', (
            SELECT COUNT(*) FROM (
                SELECT c2.id
                FROM t_contracts c2
                WHERE c2.buyer_id = p_contact_id
                  AND c2.tenant_id = p_tenant_id
                  AND c2.is_live = p_is_live
                  AND c2.is_active = true
                  AND c2.record_type = 'contract'
                UNION
                SELECT c2.id
                FROM t_contracts c2
                JOIN t_contract_access ca2 ON ca2.contract_id = c2.id
                WHERE ca2.accessor_contact_id = p_contact_id
                  AND c2.tenant_id = p_tenant_id
                  AND c2.is_live = p_is_live
                  AND c2.is_active = true
                  AND c2.record_type = 'contract'
                  AND ca2.is_active = true
            ) total_count
        ),
        'by_status', COALESCE((
            SELECT jsonb_object_agg(status, cnt)
            FROM (
                SELECT status, COUNT(*) as cnt
                FROM (
                    -- Contracts where contact is buyer
                    SELECT c.id, c.status
                    FROM t_contracts c
                    WHERE c.buyer_id = p_contact_id
                      AND c.tenant_id = p_tenant_id
                      AND c.is_live = p_is_live
                      AND c.is_active = true
                      AND c.record_type = 'contract'

                    UNION

                    -- Contracts where contact is CNAK accessor
                    SELECT c.id, c.status
                    FROM t_contracts c
                    JOIN t_contract_access ca ON ca.contract_id = c.id
                    WHERE ca.accessor_contact_id = p_contact_id
                      AND c.tenant_id = p_tenant_id
                      AND c.is_live = p_is_live
                      AND c.is_active = true
                      AND c.record_type = 'contract'
                      AND ca.is_active = true
                ) deduped
                GROUP BY status
            ) s
        ), '{}'::JSONB),
        'by_role', COALESCE((
            SELECT jsonb_object_agg(contact_role, cnt)
            FROM (
                SELECT contact_role, COUNT(*) as cnt
                FROM (
                    SELECT c.id,
                        CASE WHEN c.buyer_id = p_contact_id THEN
                            CASE c.contract_type
                                WHEN 'vendor' THEN 'as_vendor'
                                WHEN 'partner' THEN 'as_partner'
                                ELSE 'as_client'
                            END
                        ELSE COALESCE('as_' || ca.accessor_role, 'as_client')
                        END as contact_role
                    FROM t_contracts c
                    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
                        AND ca.accessor_contact_id = p_contact_id
                        AND ca.is_active = true
                    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
                      AND c.tenant_id = p_tenant_id
                      AND c.is_live = p_is_live
                      AND c.is_active = true
                      AND c.record_type = 'contract'
                ) deduped
                GROUP BY contact_role
            ) s
        ), '{}'::JSONB),
        'contracts', COALESCE((
            SELECT jsonb_agg(contract_data ORDER BY created_at DESC)
            FROM (
                SELECT DISTINCT ON (c.id)
                    c.id,
                    c.created_at,
                    jsonb_build_object(
                        'id', c.id,
                        'contract_number', c.contract_number,
                        'name', c.name,
                        'status', c.status,
                        'contract_type', c.contract_type,
                        'grand_total', c.grand_total,
                        'currency', c.currency,
                        'created_at', c.created_at,
                        'acceptance_method', c.acceptance_method,
                        'duration_value', c.duration_value,
                        'duration_unit', c.duration_unit,
                        -- Contact role in this contract
                        'contact_role', CASE
                            WHEN c.buyer_id = p_contact_id THEN
                                CASE c.contract_type
                                    WHEN 'vendor' THEN 'as_vendor'
                                    WHEN 'partner' THEN 'as_partner'
                                    ELSE 'as_client'
                                END
                            ELSE COALESCE('as_' || ca.accessor_role, 'as_client')
                        END,
                        -- CNAK data
                        'global_access_id', c.global_access_id,
                        'cnak_status', COALESCE(ca.status,
                            CASE WHEN c.global_access_id IS NOT NULL THEN 'not_connected' ELSE NULL END
                        )
                    ) as contract_data
                FROM t_contracts c
                LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
                    AND ca.is_active = true
                    AND (ca.accessor_contact_id = p_contact_id OR c.buyer_id = p_contact_id)
                WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
                  AND c.tenant_id = p_tenant_id
                  AND c.is_live = p_is_live
                  AND c.is_active = true
                  AND c.record_type = 'contract'
                ORDER BY c.id, c.created_at DESC
            ) sub
        ), '[]'::JSONB)
    )
    INTO v_contracts_summary;

    -- Handle NULL case (no contracts)
    IF v_contracts_summary IS NULL THEN
        v_contracts_summary := jsonb_build_object(
            'total', 0,
            'by_status', '{}'::JSONB,
            'by_role', '{}'::JSONB,
            'contracts', '[]'::JSONB
        );
    END IF;

    -- ═══════════════════════════════════════════
    -- STEP 2: Events Summary
    --   Aggregates events from ALL contracts for this contact
    --   (multi-role: buyer + accessor)
    -- ═══════════════════════════════════════════
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE ce.status = 'completed'),
        COUNT(*) FILTER (WHERE ce.status NOT IN ('completed', 'cancelled') AND ce.scheduled_date < NOW()),
        COUNT(*) FILTER (WHERE ce.status NOT IN ('completed', 'cancelled') AND DATE(ce.scheduled_date) = (now() at time zone 'Asia/Kolkata')::date),
        COUNT(*) FILTER (WHERE ce.status NOT IN ('completed', 'cancelled') AND ce.scheduled_date > NOW() AND ce.scheduled_date <= NOW() + INTERVAL '3 days')
    INTO v_total_events, v_completed_events, v_overdue_count, v_today_event_count, v_soon_event_count
    FROM t_contract_events ce
    JOIN t_contracts c ON ce.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND ce.tenant_id = p_tenant_id
      AND ce.is_live = p_is_live
      AND ce.is_active = true;

    SELECT jsonb_build_object(
        'total', COALESCE(v_total_events, 0),
        'completed', COALESCE(v_completed_events, 0),
        'overdue', COALESCE(v_overdue_count, 0),
        'by_status', COALESCE((
            SELECT jsonb_object_agg(status, cnt)
            FROM (
                SELECT ce.status, COUNT(*) as cnt
                FROM t_contract_events ce
                JOIN t_contracts c ON ce.contract_id = c.id
                LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
                    AND ca.accessor_contact_id = p_contact_id
                    AND ca.is_active = true
                WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
                  AND ce.tenant_id = p_tenant_id
                  AND ce.is_live = p_is_live
                  AND ce.is_active = true
                GROUP BY ce.status
            ) s
        ), '{}'::JSONB),
        'by_type', COALESCE((
            SELECT jsonb_object_agg(event_type, cnt)
            FROM (
                SELECT ce.event_type, COUNT(*) as cnt
                FROM t_contract_events ce
                JOIN t_contracts c ON ce.contract_id = c.id
                LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
                    AND ca.accessor_contact_id = p_contact_id
                    AND ca.is_active = true
                WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
                  AND ce.tenant_id = p_tenant_id
                  AND ce.is_live = p_is_live
                  AND ce.is_active = true
                GROUP BY ce.event_type
            ) s
        ), '{}'::JSONB)
    )
    INTO v_events_summary;

    -- ═══════════════════════════════════════════
    -- STEP 3: Overdue Events (detailed list)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ce.id,
            'contract_id', ce.contract_id,
            'contract_number', c.contract_number,
            'contract_name', c.name,
            'event_type', ce.event_type,
            'block_name', ce.block_name,
            'scheduled_date', ce.scheduled_date,
            'days_overdue', EXTRACT(DAY FROM NOW() - ce.scheduled_date)::INT,
            'status', ce.status,
            'amount', ce.amount,
            'currency', ce.currency,
            'assigned_to', ce.assigned_to,
            'assigned_to_name', ce.assigned_to_name,
            'sequence_number', ce.sequence_number,
            'total_occurrences', ce.total_occurrences
        ) ORDER BY ce.scheduled_date ASC
    ), '[]'::JSONB)
    INTO v_overdue_events
    FROM t_contract_events ce
    JOIN t_contracts c ON ce.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND ce.tenant_id = p_tenant_id
      AND ce.is_live = p_is_live
      AND ce.is_active = true
      AND ce.status NOT IN ('completed', 'cancelled')
      AND ce.scheduled_date < NOW();

    -- ═══════════════════════════════════════════
    -- STEP 4: Upcoming Events (next N days)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ce.id,
            'contract_id', ce.contract_id,
            'contract_number', c.contract_number,
            'contract_name', c.name,
            'event_type', ce.event_type,
            'block_name', ce.block_name,
            'scheduled_date', ce.scheduled_date,
            'days_until', EXTRACT(DAY FROM ce.scheduled_date - NOW())::INT,
            'is_today', DATE(ce.scheduled_date) = (now() at time zone 'Asia/Kolkata')::date,
            'status', ce.status,
            'amount', ce.amount,
            'currency', ce.currency,
            'assigned_to', ce.assigned_to,
            'assigned_to_name', ce.assigned_to_name,
            'sequence_number', ce.sequence_number,
            'total_occurrences', ce.total_occurrences
        ) ORDER BY ce.scheduled_date ASC
    ), '[]'::JSONB)
    INTO v_upcoming_events
    FROM t_contract_events ce
    JOIN t_contracts c ON ce.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND ce.tenant_id = p_tenant_id
      AND ce.is_live = p_is_live
      AND ce.is_active = true
      AND ce.status NOT IN ('completed', 'cancelled')
      AND ce.scheduled_date >= NOW()
      AND ce.scheduled_date <= NOW() + (p_days_ahead || ' days')::INTERVAL;

    -- ═══════════════════════════════════════════
    -- STEP 5: Calculate LTV (Lifetime Value)
    --   Sum of grand_total from all contracts (multi-role)
    -- ═══════════════════════════════════════════
    SELECT COALESCE(SUM(DISTINCT c.grand_total), 0)
    INTO v_ltv
    FROM t_contracts c
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.is_active = true
      AND c.record_type = 'contract';

    -- ═══════════════════════════════════════════
    -- STEP 6: Outstanding from t_invoices
    --   Sum of balance from unpaid/partially_paid/overdue invoices
    --   (adhoc/contact-only invoices are always created status='paid', so
    --   they never contribute here — no change needed for them)
    -- ═══════════════════════════════════════════
    SELECT
        COALESCE(SUM(inv.balance), 0),
        COUNT(*) FILTER (WHERE inv.status = 'overdue')
    INTO v_outstanding, v_overdue_invoice_count
    FROM t_invoices inv
    JOIN t_contracts c ON inv.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND c.tenant_id = p_tenant_id
      AND c.is_live = p_is_live
      AND c.is_active = true
      AND inv.is_active = true
      AND inv.status IN ('unpaid', 'partially_paid', 'overdue');

    -- ═══════════════════════════════════════════
    -- STEP 7: Invoice list (recent, for Financials column)
    --   UNIONs in adhoc invoices (contract_id IS NULL, contact_id = this
    --   contact) created via create_adhoc_invoice — those can't be reached
    --   through the buyer_id/accessor-on-contract chain above since they
    --   have no contract at all.
    -- ═══════════════════════════════════════════
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', y.id,
            'invoice_number', y.invoice_number,
            'contract_id', y.contract_id,
            'contract_number', y.contract_number,
            'contract_name', y.contract_name,
            'invoice_type', y.invoice_type,
            'total_amount', y.total_amount,
            'amount_paid', y.amount_paid,
            'balance', y.balance,
            'status', y.status,
            'due_date', y.due_date,
            'currency', y.currency,
            'payment_mode', y.payment_mode,
            'issued_at', y.issued_at,
            'paid_at', y.paid_at,
            'is_adhoc', y.is_adhoc
        ) ORDER BY y.issued_at DESC
    ), '[]'::JSONB)
    INTO v_invoices
    FROM (
        SELECT inv.id, inv.invoice_number, inv.contract_id, c.contract_number, c.name AS contract_name,
               inv.invoice_type, inv.total_amount, inv.amount_paid, inv.balance, inv.status,
               inv.due_date, inv.currency, inv.payment_mode, inv.issued_at, inv.paid_at,
               false AS is_adhoc
        FROM t_invoices inv
        JOIN t_contracts c ON inv.contract_id = c.id
        LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
            AND ca.accessor_contact_id = p_contact_id
            AND ca.is_active = true
        WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
          AND c.tenant_id = p_tenant_id
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND inv.is_active = true

        UNION ALL

        SELECT inv.id, inv.invoice_number, inv.contract_id, NULL::varchar, NULL::varchar,
               inv.invoice_type, inv.total_amount, inv.amount_paid, inv.balance, inv.status,
               inv.due_date, inv.currency, inv.payment_mode, inv.issued_at, inv.paid_at,
               true AS is_adhoc
        FROM t_invoices inv
        WHERE inv.contract_id IS NULL
          AND inv.contact_id = p_contact_id
          AND inv.tenant_id = p_tenant_id
          AND COALESCE(inv.is_live, true) = p_is_live
          AND inv.is_active = true
    ) y;

    -- ═══════════════════════════════════════════
    -- STEP 8: Payment Pattern (from invoices)
    --   Same UNION as STEP 7, so adhoc invoices count toward lifetime
    --   totals/collection-rate for this contact.
    -- ═══════════════════════════════════════════
    SELECT
        COALESCE(SUM(y.total_amount), 0),
        COALESCE(SUM(y.amount_paid), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE y.status = 'paid' AND (y.paid_at IS NULL OR y.paid_at <= y.due_date + INTERVAL '1 day'))
    INTO v_total_invoiced, v_total_paid, v_invoice_count, v_paid_on_time_count
    FROM (
        SELECT inv.total_amount, inv.amount_paid, inv.status, inv.paid_at, inv.due_date
        FROM t_invoices inv
        JOIN t_contracts c ON inv.contract_id = c.id
        LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
            AND ca.accessor_contact_id = p_contact_id
            AND ca.is_active = true
        WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
          AND c.tenant_id = p_tenant_id
          AND c.is_live = p_is_live
          AND c.is_active = true
          AND inv.is_active = true

        UNION ALL

        SELECT inv.total_amount, inv.amount_paid, inv.status, inv.paid_at, inv.due_date
        FROM t_invoices inv
        WHERE inv.contract_id IS NULL
          AND inv.contact_id = p_contact_id
          AND inv.tenant_id = p_tenant_id
          AND COALESCE(inv.is_live, true) = p_is_live
          AND inv.is_active = true
    ) y;

    -- ═══════════════════════════════════════════
    -- STEP 9: Behavioral Health Score
    --   Only evaluates events that were DUE BY NOW.
    --   Future events are planned, not actionable.
    --
    --   Revenue Score: Of billing $ due by now, how much collected?
    --   Delivery Score: Of service events due by now, how many completed?
    --   Health: Weighted composite (50/50 when both exist)
    -- ═══════════════════════════════════════════

    -- 9a: Revenue behavior (billing events due by now, multi-role)
    --   Billing terminal statuses: paid, waived (NOT 'completed')
    SELECT
        COUNT(*) FILTER (WHERE ce.status NOT IN ('cancelled', 'waived')),
        COUNT(*) FILTER (WHERE ce.status IN ('paid', 'waived')),
        COALESCE(SUM(ce.amount) FILTER (WHERE ce.status NOT IN ('cancelled', 'waived')), 0),
        COALESCE(SUM(ce.amount) FILTER (WHERE ce.status IN ('paid', 'waived')), 0)
    INTO v_billing_due_count, v_billing_met_count, v_billing_due_amount, v_billing_collected
    FROM t_contract_events ce
    JOIN t_contracts c ON ce.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND ce.tenant_id = p_tenant_id
      AND ce.is_live = p_is_live
      AND ce.is_active = true
      AND ce.event_type = 'billing'
      AND ce.scheduled_date < NOW();

    -- Revenue score: amount-weighted when amounts exist, count-based otherwise
    IF v_billing_due_amount > 0 THEN
        v_revenue_score := (v_billing_collected / v_billing_due_amount) * 100;
    ELSIF v_billing_due_count > 0 THEN
        v_revenue_score := (v_billing_met_count::NUMERIC / v_billing_due_count) * 100;
    ELSE
        v_revenue_score := NULL; -- No billing due yet
    END IF;

    -- 9b: Delivery behavior (service + spare_part events due by now, multi-role)
    --   Service terminal: completed | Spare_part terminal: installed
    SELECT
        COUNT(*) FILTER (WHERE ce.status != 'cancelled'),
        COUNT(*) FILTER (WHERE ce.status IN ('completed', 'installed'))
    INTO v_service_due_count, v_service_met_count
    FROM t_contract_events ce
    JOIN t_contracts c ON ce.contract_id = c.id
    LEFT JOIN t_contract_access ca ON ca.contract_id = c.id
        AND ca.accessor_contact_id = p_contact_id
        AND ca.is_active = true
    WHERE (c.buyer_id = p_contact_id OR ca.accessor_contact_id = p_contact_id)
      AND ce.tenant_id = p_tenant_id
      AND ce.is_live = p_is_live
      AND ce.is_active = true
      AND ce.event_type IN ('service', 'spare_part')
      AND ce.scheduled_date < NOW();

    IF v_service_due_count > 0 THEN
        v_delivery_score := (v_service_met_count::NUMERIC / v_service_due_count) * 100;
    ELSE
        v_delivery_score := NULL; -- No service due yet
    END IF;

    -- 9c: Composite health score
    IF v_revenue_score IS NOT NULL AND v_delivery_score IS NOT NULL THEN
        v_health_score := (v_revenue_score * 0.5) + (v_delivery_score * 0.5);
    ELSIF v_revenue_score IS NOT NULL THEN
        v_health_score := v_revenue_score;
    ELSIF v_delivery_score IS NOT NULL THEN
        v_health_score := v_delivery_score;
    ELSE
        v_health_score := 100; -- Nothing due yet
    END IF;

    -- Clamp all scores to 0-100
    v_health_score   := GREATEST(0, LEAST(100, v_health_score));
    v_revenue_score  := GREATEST(0, LEAST(100, COALESCE(v_revenue_score, 100)));
    v_delivery_score := GREATEST(0, LEAST(100, COALESCE(v_delivery_score, 100)));

    -- ═══════════════════════════════════════════
    -- STEP 10: Calculate Urgency Score
    --   Formula:
    --   (overdue_events * 15) + (overdue_invoices * 20) +
    --   (today_events * 10) + (events_in_3_days * 5)
    --   Level: 0-25 low, 26-50 medium, 51-75 high, 76+ critical
    -- ═══════════════════════════════════════════
    v_urgency_score := LEAST(100,
        (COALESCE(v_overdue_count, 0) * 15) +
        (COALESCE(v_overdue_invoice_count, 0) * 20) +
        (COALESCE(v_today_event_count, 0) * 10) +
        (COALESCE(v_soon_event_count, 0) * 5)
    );

    v_urgency_level := CASE
        WHEN v_urgency_score >= 76 THEN 'critical'
        WHEN v_urgency_score >= 51 THEN 'high'
        WHEN v_urgency_score >= 26 THEN 'medium'
        ELSE 'low'
    END;

    -- ═══════════════════════════════════════════
    -- STEP 11: Build and return response
    -- ═══════════════════════════════════════════
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'contact_id', p_contact_id,
            'contracts', v_contracts_summary,
            'events', v_events_summary,
            'overdue_events', v_overdue_events,
            'upcoming_events', v_upcoming_events,
            'invoices', v_invoices,
            'ltv', v_ltv,
            'outstanding', v_outstanding,
            'health_score', ROUND(v_health_score, 1),
            'revenue_score', ROUND(v_revenue_score, 1),
            'delivery_score', ROUND(v_delivery_score, 1),
            'urgency_score', v_urgency_score,
            'urgency_level', v_urgency_level,
            'payment_pattern', jsonb_build_object(
                'total_invoiced', v_total_invoiced,
                'total_paid', v_total_paid,
                'invoice_count', v_invoice_count,
                'paid_on_time', v_paid_on_time_count,
                'collection_rate', CASE WHEN v_total_invoiced > 0
                    THEN ROUND((v_total_paid / v_total_invoiced * 100), 1)
                    ELSE 0
                END,
                'on_time_rate', CASE WHEN v_invoice_count > 0
                    THEN ROUND((v_paid_on_time_count::NUMERIC / v_invoice_count * 100), 1)
                    ELSE 0
                END
            ),
            'days_ahead', p_days_ahead
        ),
        'generated_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to generate cockpit summary',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$function$;
