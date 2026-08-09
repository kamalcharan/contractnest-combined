-- ============================================================================
-- Link a Group Session declaration to the adhoc invoice that settles it
-- ============================================================================
-- Source-of-record copy of what was applied LIVE via Supabase MCP this
-- session (2026-08-09) — DO NOT RE-RUN. Follows 001_adhoc_invoice_no_contract.sql.
--
-- Found during testing: the Payments-to-confirm panel's "Invoice" button was
-- showing on EVERY declaration row, including ones that already have a real
-- contract-linked invoice (billing_event_id set). That's a real gap — it let
-- a chair create a second, contact-less invoice for dues that already had
-- one via the normal contract flow. Also, clicking the pre-existing
-- "Confirm" button on a guest-fee row (billing_event_id NULL) was
-- discovered live to silently no-op — gs_confirm_declaration has no branch
-- for a null billing event, so it just flips the row to 'confirmed' with no
-- ledger action (see CLAUDE.md's "guest session payments have nowhere to
-- post"). That's exactly this feature's job to fix, but "Confirm" showing
-- at all before an invoice exists was misleading.
--
-- Fix: a declaration now knows whether it's already been invoiced.
--   - Guest fee (is_guest_fee = billing_event_id IS NULL), no invoice yet
--     -> only "Invoice" shown (+ Reject).
--   - Once create_adhoc_invoice stamps adhoc_invoice_id -> "Confirm"
--     reappears (this is a status-only flip at that point — the money was
--     already recorded by the invoice's own receipt), Reject is hidden
--     (rejecting real recorded money would be a worse gap than not
--     offering it).
--   - Contract-linked rows (billing_event_id set) are untouched — always
--     Confirm/Reject, "Invoice" never shows, since a real invoice already
--     exists via the contract.
-- ============================================================================

ALTER TABLE t_session_payment_declarations
  ADD COLUMN IF NOT EXISTS adhoc_invoice_id uuid REFERENCES t_invoices(id);

-- create_adhoc_invoice: accepts an optional declaration_id. When present,
-- validates the declaration exists / belongs to this tenant+contact / is
-- still pending / has no invoice yet (STEP 0c) BEFORE creating anything,
-- then stamps adhoc_invoice_id in the SAME transaction as the invoice +
-- receipt (STEP 4b) — a double-click or concurrent request on the same
-- declaration fails cleanly (checked live: second call returns
-- {success:false, error:"Declaration not found, already processed, or
-- already invoiced"}) rather than creating two invoices for one due.
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
    v_declaration_id UUID;

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
    v_declaration_id := (p_payload->>'declaration_id')::UUID;

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

    -- STEP 0c: if a declaration is named, it must exist, belong to this
    -- tenant/contact, still be pending, and not already have an invoice —
    -- guards against a double-click creating two invoices for one declaration.
    IF v_declaration_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM t_session_payment_declarations
            WHERE id = v_declaration_id
              AND tenant_id = v_tenant_id
              AND member_contact_id = v_contact_id
              AND status = 'pending'
              AND adhoc_invoice_id IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Declaration not found, already processed, or already invoiced');
        END IF;
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
    -- STEP 4b: stamp the source declaration, if one was named, so the
    -- Payments-to-confirm panel can switch that row from "Invoice" to
    -- "Confirm". Same transaction as the invoice/receipt above — any
    -- failure here rolls back both rather than leaving them orphaned
    -- from their declaration.
    -- ═══════════════════════════════════════════
    IF v_declaration_id IS NOT NULL THEN
        UPDATE t_session_payment_declarations
        SET adhoc_invoice_id = v_invoice_id
        WHERE id = v_declaration_id
          AND tenant_id = v_tenant_id
          AND status = 'pending'
          AND adhoc_invoice_id IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Declaration % was already invoiced or processed by another request', v_declaration_id;
        END IF;
    END IF;

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
            'status', 'paid',
            'declaration_id', v_declaration_id
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

-- gs_pending_declarations: surfaces adhoc_invoice_id + the invoice number
-- (via a new LEFT JOIN t_invoices) so the frontend can gate the
-- Invoice-vs-Confirm buttons without a second round trip.
CREATE OR REPLACE FUNCTION public.gs_pending_declarations(p_tenant uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_out jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'member_contact_id', d.member_contact_id, 'member_name', ct.name, 'member_salutation', ct.salutation,
      'billing_event_id', d.billing_event_id, 'label', coalesce(e.billing_cycle_label, e.block_name, d.description, cb.name),
      'due_date', e.scheduled_date::date, 'amount', d.amount, 'currency', d.currency,
      'upi_reference', d.upi_reference, 'event_status', e.status, 'created_at', d.created_at,
      'block_id', b.id, 'block_name', coalesce(b.name, d.description, 'Group Session'),
      'is_guest_fee', (d.billing_event_id IS NULL),
      'adhoc_invoice_id', d.adhoc_invoice_id, 'adhoc_invoice_number', inv.invoice_number)
      ORDER BY d.created_at ASC), '[]'::jsonb)
    INTO v_out
    FROM public.t_session_payment_declarations d
    LEFT JOIN public.t_contacts ct ON ct.id = d.member_contact_id
    LEFT JOIN public.t_contract_events e ON e.id = d.billing_event_id
    LEFT JOIN public.t_group_session_schedule s ON s.id = d.occurrence_event_id
    LEFT JOIN public.m_cat_blocks b ON b.id = s.source_block_id
    LEFT JOIN public.m_cat_blocks cb ON cb.id = d.cat_block_id
    LEFT JOIN public.t_invoices inv ON inv.id = d.adhoc_invoice_id
   WHERE d.tenant_id = p_tenant AND d.status = 'pending';
  RETURN jsonb_build_object('ok', true, 'declarations', v_out);
END;
$function$;
