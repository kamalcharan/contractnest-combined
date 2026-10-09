-- ============================================================================
-- jtd-nucleus/026 — a ₹0 payment line is SETTLED (batch zero-due-settled)
-- ============================================================================
-- Owner (2026-10-09): "0 is also money … the question is if it's settled or
-- not … a contract might have some services which have 0 amount and it's
-- perfectly fine."
--
-- The nudge tools already decide "settled = paid OR amount_settled >= amount"
-- (so a ₹0 line answered "already settled"), but the status never said so:
-- `paid` is written only by the payment RPCs and nobody records a ₹0 payment,
-- so the nightly scan moved ₹0 lines to overdue and the Ops board, Plan,
-- Money In and the register listed them as "₹0 overdue".
--
-- Rule, in one place per table: an open payment line whose amount is ₹0 or
-- empty is `paid`. No receipt, no amount_settled change (₹0 is ₹0).
--   · t_contract_events  billing rows          (V1 / twin path)
--   · n_jtd              payment jobs, no channel (V2 path; 54 have no event)
-- The twin mirrors (trg_zz_cutover_sync_*) carry the status across as usual.
-- Back-fill: 38 events (signia Test 36, signia Live 1, Trinity Live 1) and
-- 54 event-less jobs. Lines with an amount are never touched.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_fn_event_zero_due_settled()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.event_type = 'billing'
       AND COALESCE(NEW.amount, 0) <= 0
       AND NEW.status IN ('scheduled', 'due', 'overdue') THEN
        NEW.status := 'paid';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_event_zero_due_settled ON public.t_contract_events;
CREATE TRIGGER trg_a_event_zero_due_settled
    BEFORE INSERT OR UPDATE OF status, amount ON public.t_contract_events
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_event_zero_due_settled();

CREATE OR REPLACE FUNCTION public.trg_fn_jtd_zero_due_settled()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.event_type_code = 'payment'
       AND NEW.channel_code IS NULL
       AND COALESCE(NEW.amount, 0) <= 0
       AND NEW.status_code IN ('scheduled', 'due', 'overdue') THEN
        NEW.status_code  := 'paid';
        NEW.completed_at := COALESCE(NEW.completed_at, now());
    END IF;
    RETURN NEW;
END;
$$;

-- "trg_jtd_a…" sorts before trg_jtd_credit_gate / enqueue / status_change, so
-- the status-change log records the settled status.
DROP TRIGGER IF EXISTS trg_jtd_a_zero_due_settled ON public.n_jtd;
CREATE TRIGGER trg_jtd_a_zero_due_settled
    BEFORE INSERT OR UPDATE ON public.n_jtd
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_jtd_zero_due_settled();

-- Back-fill (each UPDATE fires the triggers above and the twin mirrors).
UPDATE public.t_contract_events
   SET status = 'paid'
 WHERE event_type = 'billing'
   AND COALESCE(amount, 0) <= 0
   AND status IN ('scheduled', 'due', 'overdue');

UPDATE public.n_jtd
   SET status_code = 'paid', completed_at = COALESCE(completed_at, now())
 WHERE event_type_code = 'payment'
   AND channel_code IS NULL
   AND COALESCE(amount, 0) <= 0
   AND status_code IN ('scheduled', 'due', 'overdue');
