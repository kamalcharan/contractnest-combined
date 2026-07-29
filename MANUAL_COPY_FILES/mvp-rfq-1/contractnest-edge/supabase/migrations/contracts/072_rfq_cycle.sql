-- ═══════════════════════════════════════════════════════════════════════════
-- 072_rfq_cycle.sql — the RFQ cycle, server side
--
-- CONTEXT, AND A CORRECTION TO MY OWN EARLIER ANALYSIS
--
-- RFQ-GAP-ANALYSIS.md said "stage 3 persists nothing" and "stages 4-6 do not
-- exist". That was wrong. It was written from a grep of contractnest-api/src
-- and contractnest-edge/supabase/functions, and the entire RFQ implementation
-- lives in Postgres functions, which are not in the repo source tree.
--
-- What is ALREADY live and working:
--   * create_contract_transaction STEP 6 inserts t_contract_vendors for rfq
--   * update_contract_transaction STEP 6 replaces them
--   * get_contract_by_id STEP 4 returns them, quotes and all
--   * update_contract_status has a full RFQ state machine:
--         draft -> sent -> quotes_received -> awarded -> converted_to_contract
--   * t_contract_vendors.response_status CHECK: pending|quoted|declined|accepted
--   * update_contract_status STEP 2.5 mints the CNAK on draft -> sent
--   * ContractWizard index.tsx:783 already fires that transition for RFQs
--   * mapper.ts:117 already builds the vendors[] array
--   * detail/index.tsx VendorsCard already renders each vendor's status + quote
--
-- So the cycle is not missing. It is a designed, shipped machine with four
-- specific breaks in it. This migration closes the ones on the server.
--
--   BREAK 1  Vendors are unaddressable. mapper.ts sends vendor_id + vendor_name
--            only, so vendor_email and vendor_company are always NULL. Nothing
--            can be delivered to a vendor who has no address on the row.
--
--   BREAK 2  Only ONE vendor can ever be granted access. The unique index
--            idx_contract_access_unique_grant is on
--              (contract_id, accessor_role, COALESCE(accessor_tenant_id, 0-uuid))
--            Every RFQ vendor has role 'vendor' and a NULL accessor_tenant_id,
--            so the second grant collides with the first. Additionally
--            update_contract_status only ever creates a grant for buyer_id,
--            which an RFQ does not have.
--
--   BREAK 3  Nothing can write a quote. The columns exist; no function sets
--            them, and a vendor is not a tenant so they cannot use the
--            authenticated contract routes.
--
--   BREAK 4  Editing an RFQ destroys quotes. update_contract_transaction
--            STEP 6 does DELETE-ALL then re-insert with response_status
--            'pending'. Harmless today only because no quote has ever existed.
--            It must be fixed BEFORE the first quote is written, not after.
--
-- Per-block quoting: the owner's answer was "usually single, however it is
-- left to users". quoted_amount stays the headline figure and remains the only
-- thing the comparison sorts on; quote_breakdown carries the optional per-block
-- detail. A vendor who quotes per block gets quoted_amount computed as the sum,
-- so a mixed set of responses still compares on one axis.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Columns for the response
--    t_contract_vendors currently ends at quote_notes.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE t_contract_vendors
  ADD COLUMN IF NOT EXISTS quote_breakdown   JSONB,
  ADD COLUMN IF NOT EXISTS quote_currency    VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS quote_valid_until DATE,
  ADD COLUMN IF NOT EXISTS decline_reason    TEXT,
  ADD COLUMN IF NOT EXISTS access_secret     VARCHAR(32),
  ADD COLUMN IF NOT EXISTS viewed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN t_contract_vendors.quote_breakdown IS
  'Optional per-block pricing: [{block_id, block_name, unit_price, quantity, total_price}]. '
  'NULL means the vendor quoted a single figure. quoted_amount is authoritative either way.';
COMMENT ON COLUMN t_contract_vendors.access_secret IS
  'Per-vendor secret. The RFQ CNAK is shared by all invited vendors; this is what '
  'distinguishes them, so one vendor cannot respond as another.';

-- One row per vendor per RFQ. Required for the non-destructive upsert in (5).
-- t_contract_vendors is empty in production, so this cannot fail on existing data.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_vendors_contract_vendor
  ON t_contract_vendors (contract_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_contract_vendors_secret
  ON t_contract_vendors (access_secret) WHERE access_secret IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. BREAK 2 — let more than one vendor hold a grant on the same RFQ
--
--    Adding accessor_contact_id to the key only LOOSENS the constraint, so no
--    currently-valid row can be invalidated. Existing contract grants keep
--    their uniqueness because a contract has exactly one accessor_contact_id
--    per role anyway.
-- ───────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_contract_access_unique_grant;

CREATE UNIQUE INDEX idx_contract_access_unique_grant
  ON t_contract_access (
    contract_id,
    accessor_role,
    COALESCE(accessor_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(accessor_contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );


-- ───────────────────────────────────────────────────────────────────────────
-- 3. BREAK 1 — fill the vendor's address from the contact record
--
--    Done as a BEFORE INSERT/UPDATE trigger rather than by editing
--    create_contract_transaction, for two reasons: the 13.5k-character function
--    does not have to be retyped (and so cannot be mistyped), and every future
--    writer of this table inherits the enrichment.
--
--    t_contacts holds name and company_name; email lives in t_contact_channels
--    (channel_type 'email'), preferring the primary.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enrich_contract_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_name    TEXT;
    v_company TEXT;
    v_email   TEXT;
BEGIN
    IF NEW.vendor_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.vendor_name IS NULL OR NEW.vendor_company IS NULL OR NEW.vendor_email IS NULL THEN
        SELECT c.name, c.company_name
          INTO v_name, v_company
          FROM t_contacts c
         WHERE c.id = NEW.vendor_id
           AND c.tenant_id = NEW.tenant_id;

        SELECT ch.value
          INTO v_email
          FROM t_contact_channels ch
         WHERE ch.contact_id = NEW.vendor_id
           AND lower(ch.channel_type) = 'email'
           AND ch.value IS NOT NULL
           AND TRIM(ch.value) <> ''
         ORDER BY ch.is_primary DESC NULLS LAST, ch.created_at ASC
         LIMIT 1;

        NEW.vendor_name    := COALESCE(NULLIF(TRIM(NEW.vendor_name), ''), v_name);
        NEW.vendor_company := COALESCE(NULLIF(TRIM(NEW.vendor_company), ''), v_company);
        NEW.vendor_email   := COALESCE(NULLIF(TRIM(NEW.vendor_email), ''), v_email);
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrich_contract_vendor ON t_contract_vendors;
CREATE TRIGGER trg_enrich_contract_vendor
  BEFORE INSERT OR UPDATE ON t_contract_vendors
  FOR EACH ROW EXECUTE FUNCTION enrich_contract_vendor();


-- ───────────────────────────────────────────────────────────────────────────
-- 4. BREAK 2 (second half) — mint a per-vendor grant when the RFQ is sent
--
--    update_contract_status already mints the CNAK on draft -> sent and then
--    creates a t_contract_access row ONLY IF buyer_id IS NOT NULL. An RFQ has
--    no buyer_id, so today it mints a CNAK that nobody can use.
--
--    Rather than editing that function, this is an AFTER UPDATE trigger on
--    t_contracts that fires on exactly one transition: an rfq leaving draft.
--    Every invited vendor gets a grant against the RFQ's single CNAK, each with
--    its own secret_code — that pair is what identifies who is answering.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rfq_grant_vendor_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_vendor RECORD;
    v_secret VARCHAR(32);
BEGIN
    IF NEW.record_type <> 'rfq' THEN RETURN NEW; END IF;
    IF NEW.status <> 'sent' OR OLD.status = 'sent' THEN RETURN NEW; END IF;
    IF NEW.global_access_id IS NULL THEN RETURN NEW; END IF;

    FOR v_vendor IN
        SELECT * FROM t_contract_vendors
         WHERE contract_id = NEW.id
    LOOP
        v_secret := COALESCE(
            v_vendor.access_secret,
            md5(random()::text || clock_timestamp()::text || v_vendor.id::text)
        );

        UPDATE t_contract_vendors
           SET access_secret = v_secret
         WHERE id = v_vendor.id;

        INSERT INTO t_contract_access (
            contract_id, global_access_id, secret_code,
            tenant_id, creator_tenant_id, accessor_tenant_id,
            accessor_role, accessor_contact_id,
            accessor_email, accessor_name,
            status, is_active, created_by
        )
        VALUES (
            NEW.id, NEW.global_access_id, v_secret,
            NEW.tenant_id, NEW.tenant_id, NULL,
            'vendor', v_vendor.vendor_id,
            v_vendor.vendor_email, v_vendor.vendor_name,
            'pending', true, NEW.updated_by
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rfq_grant_vendor_access ON t_contracts;
CREATE TRIGGER trg_rfq_grant_vendor_access
  AFTER UPDATE OF status ON t_contracts
  FOR EACH ROW EXECUTE FUNCTION rfq_grant_vendor_access();


-- ───────────────────────────────────────────────────────────────────────────
-- 5. BREAK 4 — stop RFQ edits from destroying quotes
--
--    The live definition of update_contract_transaction is pulled and the
--    STEP 6 body substituted in place. Nothing is retyped, so nothing else in
--    those 18,816 characters can drift. If the expected text is not found the
--    migration ABORTS rather than silently leaving the destructive version.
--
--    New behaviour: a vendor who has already responded is never removed, a
--    vendor still in the new list keeps their quote, and only pending vendors
--    dropped from the list are deleted.
-- ───────────────────────────────────────────────────────────────────────────
DO $migration$
DECLARE
    v_def     TEXT;
    v_old     TEXT;
    v_new     TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid)
      INTO v_def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'update_contract_transaction';

    IF v_def IS NULL THEN
        RAISE EXCEPTION '072_rfq_cycle: update_contract_transaction not found';
    END IF;

    v_old :=
'    IF p_payload ? ''vendors'' AND v_current.record_type = ''rfq'' THEN
        DELETE FROM t_contract_vendors
        WHERE contract_id = p_contract_id;

        v_vendors := p_payload->''vendors'';

        FOR v_vendor IN SELECT * FROM jsonb_array_elements(v_vendors)
        LOOP
            INSERT INTO t_contract_vendors (
                contract_id, tenant_id,
                vendor_id, vendor_name, vendor_company, vendor_email,
                response_status
            )
            VALUES (
                p_contract_id, v_tenant_id,
                (v_vendor->>''vendor_id'')::UUID,
                v_vendor->>''vendor_name'',
                v_vendor->>''vendor_company'',
                v_vendor->>''vendor_email'',
                ''pending''
            );
        END LOOP;';

    v_new :=
'    IF p_payload ? ''vendors'' AND v_current.record_type = ''rfq'' THEN
        v_vendors := p_payload->''vendors'';

        -- 072_rfq_cycle: non-destructive. A vendor that has already responded
        -- is never removed; a vendor still on the list keeps their quote.
        DELETE FROM t_contract_vendors cv
        WHERE cv.contract_id = p_contract_id
          AND cv.response_status = ''pending''
          AND NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(v_vendors) nv
               WHERE (nv->>''vendor_id'')::UUID = cv.vendor_id
          );

        FOR v_vendor IN SELECT * FROM jsonb_array_elements(v_vendors)
        LOOP
            INSERT INTO t_contract_vendors (
                contract_id, tenant_id,
                vendor_id, vendor_name, vendor_company, vendor_email,
                response_status
            )
            VALUES (
                p_contract_id, v_tenant_id,
                (v_vendor->>''vendor_id'')::UUID,
                v_vendor->>''vendor_name'',
                v_vendor->>''vendor_company'',
                v_vendor->>''vendor_email'',
                ''pending''
            )
            ON CONFLICT (contract_id, vendor_id) DO UPDATE
               SET vendor_name    = COALESCE(EXCLUDED.vendor_name,    t_contract_vendors.vendor_name),
                   vendor_company = COALESCE(EXCLUDED.vendor_company, t_contract_vendors.vendor_company),
                   vendor_email   = COALESCE(EXCLUDED.vendor_email,   t_contract_vendors.vendor_email);
            -- response_status, quoted_amount, quote_notes, quote_breakdown
            -- are deliberately NOT in the DO UPDATE list.
        END LOOP;';

    IF position(v_old IN v_def) = 0 THEN
        RAISE EXCEPTION '072_rfq_cycle: STEP 6 of update_contract_transaction does not match '
                        'the expected text. It has been changed since this migration was '
                        'written — re-derive the patch instead of forcing it.';
    END IF;

    v_def := replace(v_def, v_old, v_new);
    EXECUTE v_def;
END
$migration$;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. BREAK 3 — the vendor reads the request
--
--    Mirror of claim_contract_by_cnak, but for a party who is NOT a tenant and
--    never will be. Identified by (cnak, secret) exactly as the public contract
--    view is. Returns the RFQ, its blocks, and this vendor's own row — never
--    another vendor's quote, and never the list of who else was invited.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rfq_resolve_for_vendor(
    p_cnak   TEXT,
    p_secret TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_vendor   RECORD;
    v_contract RECORD;
    v_blocks   JSONB;
BEGIN
    IF p_cnak IS NULL OR p_secret IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Link is incomplete',
                                  'error_code', 'MISSING_CREDENTIALS');
    END IF;

    SELECT cv.*, c.id AS c_id
      INTO v_vendor
      FROM t_contract_vendors cv
      JOIN t_contracts c ON c.id = cv.contract_id
     WHERE c.global_access_id = UPPER(TRIM(p_cnak))
       AND cv.access_secret = p_secret
       AND c.record_type = 'rfq'
       AND c.is_active = true
     LIMIT 1;

    IF v_vendor IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This request link is not valid',
                                  'error_code', 'INVALID_LINK');
    END IF;

    SELECT * INTO v_contract FROM t_contracts WHERE id = v_vendor.contract_id;

    IF v_contract.status IN ('cancelled', 'awarded', 'converted_to_contract')
       AND v_vendor.response_status <> 'accepted' THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'This request is closed',
                                  'error_code', 'RFQ_CLOSED',
                                  'status', v_contract.status);
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id',            b.id,
               'position',      b.position,
               'block_name',    b.block_name,
               'block_description', b.block_description,
               'category_name', b.category_name,
               'quantity',      b.quantity,
               'billing_cycle', b.billing_cycle
           ) ORDER BY b.position), '[]'::JSONB)
      INTO v_blocks
      FROM t_contract_blocks b
     WHERE b.contract_id = v_contract.id;

    -- Buyer's own prices are NOT exposed. The vendor is quoting, not matching.

    UPDATE t_contract_vendors
       SET viewed_at = COALESCE(viewed_at, NOW())
     WHERE id = v_vendor.id;

    UPDATE t_contract_access
       SET link_clicked_at = COALESCE(link_clicked_at, NOW())
     WHERE contract_id = v_contract.id
       AND secret_code = p_secret;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'rfq', jsonb_build_object(
                'id',                v_contract.id,
                'rfq_number',        v_contract.rfq_number,
                'name',              v_contract.name,
                'description',       v_contract.description,
                'status',            v_contract.status,
                'currency',          v_contract.currency,
                'start_date',        v_contract.start_date,
                'duration_value',    v_contract.duration_value,
                'duration_unit',     v_contract.duration_unit,
                'nomenclature_code', v_contract.nomenclature_code,
                'nomenclature_name', v_contract.nomenclature_name,
                'equipment_details', COALESCE(v_contract.equipment_details, '[]'::JSONB)
            ),
            'buyer', jsonb_build_object(
                'tenant_id', v_contract.tenant_id
            ),
            'blocks', v_blocks,
            'me', jsonb_build_object(
                'vendor_id',        v_vendor.vendor_id,
                'vendor_name',      v_vendor.vendor_name,
                'vendor_company',   v_vendor.vendor_company,
                'response_status',  v_vendor.response_status,
                'quoted_amount',    v_vendor.quoted_amount,
                'quote_currency',   v_vendor.quote_currency,
                'quote_notes',      v_vendor.quote_notes,
                'quote_breakdown',  v_vendor.quote_breakdown,
                'quote_valid_until',v_vendor.quote_valid_until,
                'responded_at',     v_vendor.responded_at
            )
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to open request',
                              'details', SQLERRM, 'error_code', SQLSTATE);
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 7. BREAK 3 — the vendor answers
--
--    Single figure or per-block, the owner's call per vendor. If a breakdown is
--    supplied and no headline figure is, the headline is the sum — so the
--    comparison always has one number to sort on regardless of how each vendor
--    chose to answer.
--
--    Re-quoting is allowed while the RFQ is open (vendors revise). Once the
--    buyer has awarded, nothing further is accepted.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rfq_submit_quote(
    p_cnak         TEXT,
    p_secret       TEXT,
    p_quoted_amount NUMERIC   DEFAULT NULL,
    p_quote_notes  TEXT       DEFAULT NULL,
    p_breakdown    JSONB      DEFAULT NULL,
    p_valid_until  DATE       DEFAULT NULL,
    p_decline      BOOLEAN    DEFAULT false,
    p_decline_reason TEXT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_vendor        RECORD;
    v_contract      RECORD;
    v_amount        NUMERIC;
    v_quoted_count  INT;
BEGIN
    IF p_cnak IS NULL OR p_secret IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Link is incomplete',
                                  'error_code', 'MISSING_CREDENTIALS');
    END IF;

    -- Lock the vendor row so two submits from the same phone cannot interleave
    SELECT cv.* INTO v_vendor
      FROM t_contract_vendors cv
      JOIN t_contracts c ON c.id = cv.contract_id
     WHERE c.global_access_id = UPPER(TRIM(p_cnak))
       AND cv.access_secret = p_secret
       AND c.record_type = 'rfq'
       AND c.is_active = true
     FOR UPDATE OF cv
     LIMIT 1;

    IF v_vendor IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This request link is not valid',
                                  'error_code', 'INVALID_LINK');
    END IF;

    SELECT * INTO v_contract FROM t_contracts WHERE id = v_vendor.contract_id FOR UPDATE;

    IF v_contract.status NOT IN ('sent', 'quotes_received') THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'This request is no longer open for quotes',
                                  'error_code', 'RFQ_CLOSED',
                                  'status', v_contract.status);
    END IF;

    -- ── Decline ────────────────────────────────────────────────────────────
    IF p_decline THEN
        UPDATE t_contract_vendors
           SET response_status = 'declined',
               decline_reason  = NULLIF(TRIM(COALESCE(p_decline_reason, '')), ''),
               responded_at    = NOW()
         WHERE id = v_vendor.id;

        INSERT INTO t_contract_history (
            contract_id, tenant_id, action, from_status, to_status,
            performed_by_type, performed_by_name, note
        ) VALUES (
            v_contract.id, v_contract.tenant_id, 'rfq_declined', NULL, NULL,
            'vendor', v_vendor.vendor_name,
            COALESCE(NULLIF(TRIM(COALESCE(p_decline_reason, '')), ''), 'Vendor declined to quote')
        );

        RETURN jsonb_build_object('success', true,
                                  'data', jsonb_build_object('response_status', 'declined'));
    END IF;

    -- ── Quote ──────────────────────────────────────────────────────────────
    v_amount := p_quoted_amount;

    IF v_amount IS NULL AND p_breakdown IS NOT NULL
       AND jsonb_typeof(p_breakdown) = 'array' THEN
        SELECT SUM(COALESCE((e->>'total_price')::NUMERIC, 0))
          INTO v_amount
          FROM jsonb_array_elements(p_breakdown) e;
    END IF;

    IF v_amount IS NULL OR v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'Enter a quote amount, or price the individual items',
                                  'error_code', 'AMOUNT_REQUIRED');
    END IF;

    UPDATE t_contract_vendors
       SET response_status   = 'quoted',
           quoted_amount     = v_amount,
           quote_notes       = NULLIF(TRIM(COALESCE(p_quote_notes, '')), ''),
           quote_breakdown   = p_breakdown,
           quote_currency    = COALESCE(v_contract.currency, 'INR'),
           quote_valid_until = p_valid_until,
           decline_reason    = NULL,
           responded_at      = NOW()
     WHERE id = v_vendor.id;

    UPDATE t_contract_access
       SET status       = 'responded',
           responded_at = NOW()
     WHERE contract_id = v_contract.id
       AND secret_code = p_secret;

    INSERT INTO t_contract_history (
        contract_id, tenant_id, action, from_status, to_status,
        changes, performed_by_type, performed_by_name, note
    ) VALUES (
        v_contract.id, v_contract.tenant_id, 'rfq_quoted', NULL, NULL,
        jsonb_build_object('vendor_id', v_vendor.vendor_id, 'quoted_amount', v_amount),
        'vendor', v_vendor.vendor_name,
        format('Quoted %s %s', COALESCE(v_contract.currency, 'INR'), v_amount)
    );

    -- First quote moves the RFQ forward. Uses the same transition the state
    -- machine already validates, so nothing here invents a new status.
    SELECT COUNT(*) INTO v_quoted_count
      FROM t_contract_vendors
     WHERE contract_id = v_contract.id AND response_status = 'quoted';

    IF v_contract.status = 'sent' AND v_quoted_count > 0 THEN
        PERFORM update_contract_status(
            v_contract.id, v_contract.tenant_id, 'quotes_received',
            NULL, v_vendor.vendor_name, 'vendor',
            'First quote received', NULL
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'response_status', 'quoted',
            'quoted_amount',   v_amount,
            'currency',        COALESCE(v_contract.currency, 'INR'),
            'responded_at',    NOW()
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to submit quote',
                              'details', SQLERRM, 'error_code', SQLSTATE);
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 8. The buyer awards
--
--    OPEN DESIGN POINT, deliberately NOT decided here.
--    The owner's model is "the vendor initiates the contract". So awarding does
--    NOT create a contract — it marks the winner, declines the rest, and moves
--    the RFQ to 'awarded'. Turning that into a contract is a separate act by
--    the winning vendor, and it is the one piece of the cycle this migration
--    does not implement, because doing it here would make the BUYER the author
--    of the contract, which contradicts the stated model.
--
--    'converted_to_contract' already exists in the state machine as the landing
--    place for whatever that separate act turns out to be.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rfq_award(
    p_contract_id UUID,
    p_tenant_id   UUID,
    p_vendor_id   UUID,
    p_user_id     UUID DEFAULT NULL,
    p_user_name   TEXT DEFAULT NULL,
    p_note        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_contract    RECORD;
    v_winner      RECORD;
    v_status_res  JSONB;
    v_declined    INT;
BEGIN
    IF p_contract_id IS NULL OR p_tenant_id IS NULL OR p_vendor_id IS NULL THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'contract_id, tenant_id and vendor_id are required');
    END IF;

    SELECT * INTO v_contract
      FROM t_contracts
     WHERE id = p_contract_id
       AND tenant_id = p_tenant_id
       AND record_type = 'rfq'
       AND is_active = true
     FOR UPDATE;

    IF v_contract IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'RFQ not found',
                                  'error_code', 'NOT_FOUND');
    END IF;

    SELECT * INTO v_winner
      FROM t_contract_vendors
     WHERE contract_id = p_contract_id
       AND vendor_id  = p_vendor_id
     FOR UPDATE;

    IF v_winner IS NULL THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'That vendor was not invited to this request',
                                  'error_code', 'VENDOR_NOT_ON_RFQ');
    END IF;

    IF v_winner.response_status <> 'quoted' THEN
        RETURN jsonb_build_object('success', false,
                                  'error', 'That vendor has not submitted a quote',
                                  'error_code', 'NO_QUOTE',
                                  'response_status', v_winner.response_status);
    END IF;

    -- Winner first, then the rest. Ordering matters only for readability of the
    -- audit trail; both run inside the caller's transaction.
    UPDATE t_contract_vendors
       SET response_status = 'accepted'
     WHERE contract_id = p_contract_id AND vendor_id = p_vendor_id;

    UPDATE t_contract_vendors
       SET response_status = 'declined',
           decline_reason  = COALESCE(decline_reason, 'Another quote was selected')
     WHERE contract_id = p_contract_id
       AND vendor_id  <> p_vendor_id
       AND response_status <> 'accepted';
    GET DIAGNOSTICS v_declined = ROW_COUNT;

    v_status_res := update_contract_status(
        p_contract_id, p_tenant_id, 'awarded',
        p_user_id, p_user_name, 'user',
        COALESCE(p_note, format('Awarded to %s', COALESCE(v_winner.vendor_name, 'vendor'))),
        NULL
    );

    IF NOT COALESCE((v_status_res->>'success')::BOOLEAN, false) THEN
        -- Surface the state-machine's own message rather than a generic one.
        RAISE EXCEPTION 'RFQ_STATUS_TRANSITION_FAILED: %', v_status_res->>'error';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'contract_id',     p_contract_id,
            'awarded_to',      p_vendor_id,
            'awarded_to_name', v_winner.vendor_name,
            'quoted_amount',   v_winner.quoted_amount,
            'declined_count',  v_declined,
            'status',          'awarded'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award RFQ',
                              'details', SQLERRM, 'error_code', SQLSTATE);
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 9. Grants
--    rfq_resolve_for_vendor / rfq_submit_quote are reached by a party who has
--    no account, over the same anon path the public check-in page uses.
-- ───────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION rfq_resolve_for_vendor(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rfq_submit_quote(TEXT, TEXT, NUMERIC, TEXT, JSONB, DATE, BOOLEAN, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rfq_award(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
