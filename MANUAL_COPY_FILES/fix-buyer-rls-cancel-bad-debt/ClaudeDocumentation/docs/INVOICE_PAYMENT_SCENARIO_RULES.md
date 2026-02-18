# Invoice & Payment System — Scenario Rules

> **Scope**: `get_contract_invoices`, `record_invoice_payment`, `cancel_or_writeoff_invoice`, Financials Tab UI
> **Migrations**: `044_fix_invoice_buyer_access_and_receipts.sql`, `045_buyer_rls_and_invoice_cancel_writeoff.sql`
> **Last Updated**: 2026-02-18

---

## A. ACCESS CONTROL RULES

### A1. Who Can View Invoices
| Rule | Description |
|------|-------------|
| **R-A1** | Seller (contract owner — `t_contracts.tenant_id`) can ALWAYS view invoices |
| **R-A2** | Buyer (accessor — `t_contract_access.accessor_tenant_id`) can view invoices IF grant is active AND not expired |
| **R-A3** | Any other tenant is DENIED — returns `"Access denied: not a party to this contract"` |
| **R-A4** | Expired access grant (`expires_at < NOW()`) is treated as NO access |
| **R-A5** | Deactivated access grant (`is_active = false`) is treated as NO access |
| **R-A6** | Soft-deleted contract (`is_active = false`) returns access denied for ALL parties |

### A2. Who Can Record Payments
| Rule | Description |
|------|-------------|
| **R-A7** | Seller can record payments against their own invoices |
| **R-A8** | Buyer can record payments — receipt is created under SELLER's tenant namespace (not buyer's) |
| **R-A9** | Unrelated tenant is DENIED — returns `"Access denied: not a party to this contract"` |
| **R-A10** | `recorded_by` field stores the actual user who recorded (could be buyer or seller) |

### A3. Who Can Cancel / Write-Off Invoices
| Rule | Description |
|------|-------------|
| **R-A11** | ONLY the seller (contract owner) can cancel or write-off invoices |
| **R-A12** | Buyer CANNOT cancel or write-off — returns `"Only the contract owner can cancel or write off invoices"` |
| **R-A13** | Unrelated tenant is DENIED |

### A4. RLS (Row-Level Security)
| Rule | Description |
|------|-------------|
| **R-A14** | `t_invoices` SELECT policy allows owner tenant members AND accessor tenant members with active grants |
| **R-A15** | `t_invoice_receipts` SELECT policy same — owner OR accessor with active grant on the contract |
| **R-A16** | INSERT/UPDATE policies remain seller-only (tenant_id match) |

---

## B. INVOICE STATUS RULES

### B1. Status Definitions
| Status | Condition | Badge Color | Opacity |
|--------|-----------|-------------|---------|
| **R-B1** `unpaid` | `amount_paid = 0` and not past due | Grey | 100% |
| **R-B2** `partially_paid` | `0 < amount_paid < total_amount` | Yellow/Warning | 100% |
| **R-B3** `paid` | `amount_paid >= total_amount` (balance = 0) | Green/Success | 100% |
| **R-B4** `overdue` | Past `due_date` and not fully paid | Red/Error | 100% |
| **R-B5** `cancelled` | Voided by seller — billing error, etc. | Grey | 70% |
| **R-B6** `bad_debt` | Written off as uncollectable by seller | Red/Error | 70% |

### B2. Status Transitions — Payment
| Rule | Description |
|------|-------------|
| **R-B7** | `unpaid` → `partially_paid` when first partial payment recorded |
| **R-B8** | `partially_paid` → `paid` when remaining balance reaches 0 |
| **R-B9** | `unpaid` → `paid` when full amount paid in one transaction |
| **R-B10** | `paid` invoice CANNOT accept further payments — returns `"Invoice is already paid"` |
| **R-B11** | `cancelled` invoice CANNOT accept payments — returns `"Invoice is already cancelled"` |
| **R-B12** | `bad_debt` invoice CANNOT accept payments — returns `"Invoice is already bad_debt"` |
| **R-B13** | When status becomes `paid`, `paid_at` timestamp is set to NOW() |

### B3. Status Transitions — Cancel / Write-Off
| Rule | Description |
|------|-------------|
| **R-B14** | `unpaid` → `cancelled` or `bad_debt` (seller action) |
| **R-B15** | `partially_paid` → `cancelled` or `bad_debt` (seller action, partial payments preserved) |
| **R-B16** | `overdue` → `cancelled` or `bad_debt` (seller action) |
| **R-B17** | `paid` → CANNOT be cancelled or written off — returns `"Cannot cancel/bad_debt a fully paid invoice"` |
| **R-B18** | `cancelled` → CANNOT be re-cancelled or written off — returns `"Invoice is already cancelled"` |
| **R-B19** | `bad_debt` → CANNOT be re-written off or cancelled — returns `"Invoice is already bad_debt"` |
| **R-B20** | On cancel/write-off: `balance` set to 0, `amount_paid` preserved, `notes` appended with reason |

---

## C. PAYMENT VALIDATION RULES

| Rule | Description |
|------|-------------|
| **R-C1** | `amount` must be > 0 — returns `"amount must be a positive number"` |
| **R-C2** | `amount` must not exceed `invoice.balance` — returns `"Payment amount exceeds invoice balance"` with balance and attempted values |
| **R-C3** | `invoice_id` and `tenant_id` are required |
| **R-C4** | If `contract_id` not provided, it's derived from the invoice |
| **R-C5** | Receipt number is auto-generated from seller's sequence namespace (`get_next_formatted_sequence`) |
| **R-C6** | Row-level lock (`FOR UPDATE`) on the invoice prevents race conditions during concurrent payments |

---

## D. RECEIPT DATA RULES

| Rule | Description |
|------|-------------|
| **R-D1** | Each invoice returns a `receipts[]` array (not just `receipts_count`) |
| **R-D2** | Receipts are ordered by `payment_date ASC`, then `created_at ASC` |
| **R-D3** | Deactivated receipts (`is_active = false`) are EXCLUDED from array and count |
| **R-D4** | Each receipt includes: `id`, `receipt_number`, `amount`, `currency`, `payment_date`, `payment_method`, `reference_number`, `notes`, `is_offline`, `is_verified`, `recorded_by`, `created_at` |
| **R-D5** | Invoice with 0 receipts returns `receipts: []` (empty array, not null) |

---

## E. SUMMARY RULES

| Rule | Description |
|------|-------------|
| **R-E1** | `total_invoiced` = SUM of all active invoice `total_amount` |
| **R-E2** | `total_paid` = SUM of all active invoice `amount_paid` |
| **R-E3** | `total_balance` = SUM of all active invoice `balance` |
| **R-E4** | `collection_percentage` = `(total_paid / total_invoiced) * 100`, rounded to 1 decimal |
| **R-E5** | If `total_invoiced = 0`, `collection_percentage = 0` (no division by zero) |
| **R-E6** | `cancelled_count` tracks cancelled invoices separately |
| **R-E7** | `bad_debt_count` tracks written-off invoices separately |
| **R-E8** | Cancelled/bad_debt invoices ARE included in `invoice_count` but their balance is 0 |

---

## F. AUTO-ACTIVATION RULES

| Rule | Description |
|------|-------------|
| **R-F1** | When an invoice becomes `paid`, check if contract qualifies for auto-activation |
| **R-F2** | Auto-activation triggers ONLY when ALL of: contract status = `pending_acceptance`, `acceptance_method = 'manual'`, `record_type = 'contract'` |
| **R-F3** | ALL active invoices must be `paid` or `cancelled` — any `unpaid`/`partially_paid`/`overdue`/`bad_debt` blocks activation |
| **R-F4** | Activation uses `update_contract_status` with `performed_by_type = 'system'` and note `"Auto-activated: all invoices paid"` |
| **R-F5** | If some invoices remain unpaid, contract stays at `pending_acceptance` — no error |

---

## G. CANCEL / BAD DEBT RULES

| Rule | Description |
|------|-------------|
| **R-G-C1** | `cancel_or_writeoff_invoice` RPC accepts `p_action` = `'cancel'` or `'bad_debt'` |
| **R-G-C2** | Seller-only: validates `t_contracts.tenant_id = p_tenant_id` (not via access grants) |
| **R-G-C3** | Row-level lock (`FOR UPDATE`) on invoice prevents concurrent cancel + payment |
| **R-G-C4** | Appends reason to `notes` field with timestamp: `"Cancelled on 2026-02-18 14:30: <reason>"` |
| **R-G-C5** | Creates audit trail entry in `t_contract_history` with action `'invoice_cancel'` or `'invoice_bad_debt'` |
| **R-G-C6** | History `metadata` includes: `invoice_id`, `invoice_number`, `previous_status`, `previous_balance`, `amount_paid`, `total_amount`, `reason` |
| **R-G-C7** | Returns `previous_balance` and `amount_paid` in response for UI feedback |

---

## H. UI RENDERING RULES

### H1. Invoice Card
| Rule | Description |
|------|-------------|
| **R-H1** | Each invoice renders as an InvoiceCard with status badge, amounts, and action buttons |
| **R-H2** | Cancelled AND bad_debt invoices render at 70% opacity with `AlertTriangle` icon |
| **R-H3** | Bad debt card has red-tinted border (`error + 25` opacity) |
| **R-H4** | Paid invoices show `CheckCircle2` icon in green |
| **R-H5** | Unpaid/Overdue/Partial invoices show `FileText` icon |
| **R-H6** | Balance chip only shown when `balance > 0` AND invoice is NOT terminal (cancelled/bad_debt) |
| **R-H7** | Amount sub-label shows: `paid` (normal), `cancelled` (cancelled), `written off` (bad_debt) |

### H2. Receipt Expansion
| Rule | Description |
|------|-------------|
| **R-H8** | If invoice has receipts, a toggle button shows: `"N Receipts totalling $X"` |
| **R-H9** | Clicking toggle expands/collapses the receipt detail rows |
| **R-H10** | Each receipt row shows: receipt_number, amount, payment_date, payment_method, reference_number |
| **R-H11** | Offline receipts show a Wallet icon indicator |
| **R-H12** | Action bar has "Receipts (N)" button that also toggles expansion |

### H3. Cancel / Bad Debt Actions
| Rule | Description |
|------|-------------|
| **R-H13** | "Cancel" and "Bad Debt" buttons shown ONLY for seller view (`isSeller = true`) |
| **R-H14** | Buttons hidden for buyer view — buyers cannot cancel invoices |
| **R-H15** | Buttons hidden for terminal invoices (already cancelled, bad_debt, or paid) |
| **R-H16** | Clicking a button opens an inline confirmation panel (not a modal) |
| **R-H17** | Confirmation panel includes: action title, description, optional reason input, Confirm + Dismiss buttons |
| **R-H18** | Confirm button shows loading spinner during submission |
| **R-H19** | On success: toast notification + invoice list auto-refreshes (query invalidation) |
| **R-H20** | On error: toast error with server message |
| **R-H21** | Bad debt confirmation panel has red-tinted background to signal severity |

### H4. Fallback States
| Rule | Description |
|------|-------------|
| **R-H22** | Paid/Partial invoice with NO receipt details → shows "Payment recorded (receipt details not available)" |
| **R-H23** | Contract with 0 invoices → shows "No invoices generated yet" (active) or "Invoices will appear when contract is activated" (other) |
| **R-H24** | Buyer view loads Financials tab without error (no blank state) |

---

## I. GAP ANALYSIS

| Gap ID | Area | Description | Status |
|--------|------|-------------|--------|
| ~~**GAP-1**~~ | ~~RLS~~ | ~~`t_invoices` RLS policies still filter by `tenant_id` only~~ | **CLOSED** (Migration 045) |
| ~~**GAP-2**~~ | ~~RLS~~ | ~~`t_invoice_receipts` RLS same issue~~ | **CLOSED** (Migration 045) |
| **GAP-3** | Overdue Detection | No scheduled job/trigger to transition `unpaid` → `overdue` when `due_date` passes | **OPEN** |
| **GAP-4** | Receipt Deletion | No RPC to void/cancel a receipt (e.g., bounced cheque) — would need to reverse invoice amounts | **OPEN** |
| **GAP-5** | Online Payment | `record_invoice_payment` only handles offline (`is_offline = true`) — Razorpay webhook flow needs same buyer access fix | **REVIEW** |
| ~~**GAP-6**~~ | ~~Cancelled Invoice~~ | ~~No RPC or UI to cancel an invoice~~ | **CLOSED** (Migration 045 + UI) |
| **GAP-7** | Receipt PDF/Download | "PDF" and "Receipt" action buttons navigate to invoice page — no standalone receipt download | **OPEN** |
| **GAP-8** | Summary - Cancelled | Cancelled/bad_debt amounts included in `total_invoiced` — may want to exclude from calculation | **REVIEW** |
| **GAP-9** | Buyer Payment UI | Buyer view hides "Collect Payment" CTA if `showBuyerView` is true — buyer may need a "Pay Now" button | **REVIEW** |
| **GAP-10** | Concurrent Payments | Row-level lock on invoice handles DB race conditions, but UI has no optimistic lock — two tabs could submit simultaneously | **LOW RISK** |
| **GAP-11** | Bad Debt Reversal | No RPC to reverse a bad_debt back to unpaid/partially_paid if customer later pays | **OPEN** |
| **GAP-12** | Notification | No email/WhatsApp notification sent when invoice is cancelled or written off | **OPEN** |

---

## J. PRIORITY: Remaining Gaps

| Priority | Gap | Action |
|----------|-----|--------|
| **P2** | GAP-3 | Create overdue detection cron/trigger |
| **P2** | GAP-5 | Verify Razorpay webhook uses same access pattern |
| **P2** | GAP-9 | Add buyer "Pay Now" CTA on Financials tab |
| **P3** | GAP-4 | Receipt void/reversal flow |
| **P3** | GAP-7 | Standalone receipt PDF generation |
| **P3** | GAP-8 | Decide if cancelled/bad_debt amounts should be excluded from totals |
| **P3** | GAP-11 | Bad debt reversal flow |
| **P3** | GAP-12 | Cancel/write-off notification to buyer |

---

## K. FULL API ENDPOINT MAP

| Method | Endpoint | RPC | Access |
|--------|----------|-----|--------|
| `GET` | `/api/contracts/:id/invoices` | `get_contract_invoices` | Seller + Buyer |
| `POST` | `/api/contracts/:id/invoices/record-payment` | `record_invoice_payment` | Seller + Buyer |
| `POST` | `/api/contracts/:id/invoices/cancel` | `cancel_or_writeoff_invoice` | Seller ONLY |
