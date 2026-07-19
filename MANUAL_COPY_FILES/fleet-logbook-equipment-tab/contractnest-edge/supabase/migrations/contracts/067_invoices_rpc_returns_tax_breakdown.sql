-- 067_invoices_rpc_returns_tax_breakdown.sql
-- Fleet Logbook Batch B (Financials tab) — get_contract_invoices now
-- returns each invoice's tax_breakdown (Sprint 4 snapshot, migration 062)
-- so the contract Financials tab can render the locked tax chain
-- (taxable -> CGST/SGST components -> total) per the design mock.
--
-- ADDITIVE ONLY: one field added to the invoice json. Everything else is
-- reproduced VERBATIM from the live definition (pulled via
-- pg_get_functiondef on 19 Jul 2026 — live is ground truth, not tracked
-- files). Applied live via MCP at the same time this file was written.

CREATE OR REPLACE FUNCTION public.get_contract_invoices(p_contract_id uuid, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invoices JSONB;
    v_summary JSONB;
    v_has_access BOOLEAN := false;
BEGIN
    -- STEP 0: Validate
    IF p_contract_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'contract_id and tenant_id are required'
        );
    END IF;

    -- STEP 1: Access check — owner OR accessor
    SELECT true INTO v_has_access
    FROM t_contracts c
    WHERE c.id = p_contract_id
      AND c.is_active = true
      AND (
          c.tenant_id = p_tenant_id
          OR EXISTS (
              SELECT 1 FROM t_contract_access ca
              WHERE ca.contract_id = p_contract_id
                AND ca.accessor_tenant_id = p_tenant_id
                AND ca.is_active = true
                AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
          )
      );

    IF v_has_access IS NULL OR v_has_access = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Access denied: not a party to this contract'
        );
    END IF;

    -- STEP 2: Fetch invoices with receipt details
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'invoice_number', i.invoice_number,
                'invoice_type', i.invoice_type,
                'amount', i.amount,
                'tax_amount', i.tax_amount,
                'tax_breakdown', i.tax_breakdown,
                'total_amount', i.total_amount,
                'currency', i.currency,
                'amount_paid', i.amount_paid,
                'balance', i.balance,
                'status', i.status,
                'payment_mode', i.payment_mode,
                'emi_sequence', i.emi_sequence,
                'emi_total', i.emi_total,
                'billing_cycle', i.billing_cycle,
                'block_ids', i.block_ids,
                'due_date', i.due_date,
                'issued_at', i.issued_at,
                'paid_at', i.paid_at,
                'notes', i.notes,
                'created_at', i.created_at,
                'receipts_count', (
                    SELECT COUNT(*)
                    FROM t_invoice_receipts r
                    WHERE r.invoice_id = i.id AND r.is_active = true
                ),
                'receipts', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', r.id,
                                'receipt_number', r.receipt_number,
                                'amount', r.amount,
                                'currency', r.currency,
                                'payment_date', r.payment_date,
                                'payment_method', r.payment_method,
                                'reference_number', r.reference_number,
                                'notes', r.notes,
                                'is_offline', r.is_offline,
                                'is_verified', r.is_verified,
                                'recorded_by', r.recorded_by,
                                'created_at', r.created_at
                            )
                            ORDER BY r.payment_date ASC, r.created_at ASC
                        )
                        FROM t_invoice_receipts r
                        WHERE r.invoice_id = i.id AND r.is_active = true
                    ),
                    '[]'::JSONB
                )
            )
            ORDER BY COALESCE(i.emi_sequence, 0), i.due_date ASC
        ),
        '[]'::JSONB
    )
    INTO v_invoices
    FROM t_invoices i
    WHERE i.contract_id = p_contract_id
      AND i.is_active = true;

    -- STEP 3: Build collection summary (includes bad_debt_count)
    SELECT jsonb_build_object(
        'total_invoiced', COALESCE(SUM(i.total_amount), 0),
        'total_paid', COALESCE(SUM(i.amount_paid), 0),
        'total_balance', COALESCE(SUM(i.balance), 0),
        'invoice_count', COUNT(*),
        'paid_count', COUNT(*) FILTER (WHERE i.status = 'paid'),
        'unpaid_count', COUNT(*) FILTER (WHERE i.status = 'unpaid'),
        'partial_count', COUNT(*) FILTER (WHERE i.status = 'partially_paid'),
        'overdue_count', COUNT(*) FILTER (WHERE i.status = 'overdue'),
        'cancelled_count', COUNT(*) FILTER (WHERE i.status = 'cancelled'),
        'bad_debt_count', COUNT(*) FILTER (WHERE i.status = 'bad_debt'),
        'collection_percentage', CASE
            WHEN COALESCE(SUM(i.total_amount), 0) > 0
            THEN ROUND((COALESCE(SUM(i.amount_paid), 0) / SUM(i.total_amount)) * 100, 1)
            ELSE 0
        END
    )
    INTO v_summary
    FROM t_invoices i
    WHERE i.contract_id = p_contract_id
      AND i.is_active = true;

    -- STEP 4: Return
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'invoices', v_invoices,
            'summary', v_summary
        ),
        'retrieved_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to fetch invoices',
        'details', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$function$;
