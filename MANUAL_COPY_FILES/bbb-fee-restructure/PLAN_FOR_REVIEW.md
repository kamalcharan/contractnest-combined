# BBB fee restructure — ₹18,000 → ₹19,500 · plan for review

**Status: ANALYSIS ONLY. Nothing has been executed against the database.**
Read, decide the six open questions at the bottom, then I execute step by step.

Live source: tenant `BBB` (`dd194710-92b4-4110-80eb-0b492a0d2c1f`), `is_live = true`,
49 active contracts CN-1001..CN-1049. Sheet: `updated_on_6th_aug_at_14_30_pm.xlsx`,
53 member rows. Matched on last-10-digits of phone.

---

## 1. The instalment model (decoded from the circular + your split, reconciles exactly)

| Plan | Instalments | Sum | Discount | Gross |
|---|---|---|---|---|
| Monthly | 1500 ×10, **2250** Oct, **2250** Dec | 19,500 | 0 | 19,500 ✓ |
| Quarterly | 4500 Apr, 4500 Jul, **5000** Oct, **5125** Feb | 19,125 | 375 | 19,500 ✓ |
| Half-yearly | 9000 Apr, **9750** Oct | 18,750 | 750 | 19,500 ✓ |
| Yearly | 18,000 Apr | 18,000 | 1,500 | 19,500 ✓ |

Contract fields become, for every member:
`total_value = 19500`, `discount_type = 'fixed'`, `discount_value = discount_total = per table`,
`grand_total = 19500 − discount`.

Q4 lands in **February** (your call). The 5000 / 5125 split is deliberately round
rather than 5062.50 ×2, because members sometimes pay cash.

---

## 2. Reconciliation — 53 sheet rows vs 49 contracts

### A. Sheet rows with NO contract (4) — correct as-is, no action
| Member | Paid | Note |
|---|---|---|
| BBB (9701922923) | nil | the chapter itself, not a member |
| D DASARADHI SARMA | NA | |
| Karthikeya B | nil | |
| YASHWANTH KUMAR V | nil | |

### B. ⚠️ Contradiction with "8 people who are nil do not have contracts"
Five of the eight `nil` rows **do** have live contracts with billing events already generated:

| Contract | Member | Sheet plan | Settled |
|---|---|---|---|
| CN-1007 | BHARAT KUMAR MANGIPUDI | quarterly | **4,500** (matches the sheet note "he paid 4500 last meeting") |
| CN-1014 | FLT LT SONALI SHIRPURKAR (RETD) | monthly | 0 |
| CN-1024 | NARENDRA KUMAR KAMARAJU (Patron Member) | *(blank)* | 0 |
| CN-1026 | NISHIKANT MHAISEKHAR | *(blank)* | 0 |
| CN-1047 | JAGANNADHA SHASTRY SOMANCHI (BHUSHANA MEMBER) | *(blank)* | 0 |

Only Karthikeya B and YASHWANTH KUMAR V (plus BBB, D DASARADHI SARMA) genuinely have none.

### C. Dr Pawan Kulkarni **does** have a contract
Sheet row carries no phone so it didn't auto-match, but **CN-1049 "Pavan Kulkarni"**
(8801967324) exists — start 25 Jul 2026, ₹12,000 over 3 pro-rata events. Same person.

### D. Sheet's "Meeting fee Paid" vs the system receipt ledger
Six rows where the system has **more** money receipted than the sheet shows. The
system is the receipt ledger, so I propose it wins — but each is a real payment
worth confirming:

| Contract | Member | Sheet | System |
|---|---|---|---|
| CN-1002 | ABHINANDAN DESHMUKH | 6,000 | **7,500** |
| CN-1010 | D. Rama malini | 1,500 | **3,000** |
| CN-1012 | Dr. SRINIVAS MEDEPALLI | 6,000 | **7,500** |
| CN-1019 | M V RAMANA MURTHY | 4,500 | **9,000** |
| CN-1048 | MALLADI MADHU KUMAR | 3,000 | **4,500** |
| CN-1007 | BHARAT KUMAR MANGIPUDI | nil | **4,500** |

---

## 3. Plan assignment — name by name

Your two overrides are already applied: **CA Sree Datta Sharma → quarterly**,
**Bheemsen Kulkarni → half-yearly**.

**⟶** = billing cycle changes. "Covers" = which instalments the money already
receipted pays for under the new schedule.

| # | Contract | Member | Now | → Plan | Paid | Covers | Still due |
|---|---|---|---|---|---|---|---|
| 1 | CN-1001 | CHARAN KAMAL | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 2 | CN-1002 | ABHINANDAN DESHMUKH | monthly | monthly | 7,500 | Apr–Aug | 12,000 |
| 3 | CN-1003 | ADITHYA PANDRAVADA | quarterly | quarterly | 4,500 | Apr | 14,625 |
| 4 | CN-1004 | AKHILESH WASHIKAR | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 5 | CN-1005 | Anuja Poddar | quarterly | quarterly | 4,500 | Apr | 14,625 |
| 6 | CN-1006 | ARATI MUKUL PINGLEY | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 7 | CN-1007 | BHARAT KUMAR MANGIPUDI | quarterly | quarterly | 4,500 | Apr | 14,625 |
| 8 | CN-1008 | BHEEMSEN KULKARNI | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 9 | CN-1009 | CA SREE DATTA SHARMA. A | quarterly | quarterly | 9,000 | Apr, Jul | 10,125 |
| 10 | CN-1010 | D. Rama malini | monthly | monthly | 3,000 | Apr–May | 16,500 |
| 11 | CN-1011 | Dr. SESHAGIRI RAO K H | quarterly | quarterly | 4,500 | Apr | 14,625 |
| 12 | CN-1012 | Dr. SRINIVAS MEDEPALLI | monthly | monthly | 7,500 | Apr–Aug | 12,000 |
| 13 | CN-1013 | Dr..ASHWIN MURTHY D | quarterly ⟶ | yearly | 18,000 | Apr | **0** |
| 14 | CN-1014 | FLT LT SONALI SHIRPURKAR (RETD) | quarterly ⟶ | monthly | 0 | — | 19,500 |
| 15 | CN-1015 | HARSHA KULKARNI | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 16 | CN-1016 | J V GopiChand | quarterly | quarterly | 4,500 | Apr | 14,625 |
| 17 | CN-1017 | JAGAN MOHAN RAO VYDULA | quarterly | quarterly | 9,000 | Apr, Jul | 10,125 |
| 18 | CN-1018 | KRISHNAMURTHY RATAN | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 19 | CN-1019 | M V RAMANA MURTHY | quarterly ⟶ | monthly | 9,000 | Apr–Sep | 10,500 |
| 20 | CN-1020 | M. GURURAJARAO | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 21 | CN-1021 | MANJUNATH SURESH | quarterly | quarterly | 9,000 | Apr, Jul | 10,125 |
| 22 | CN-1022 | MOHAN BORGAONKER | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 23 | CN-1023 | Mrs Krishna Jyothi | quarterly | quarterly | 9,000 | Apr, Jul | 10,125 |
| 24 | CN-1024 | NARENDRA KUMAR KAMARAJU (Patron) | quarterly | **? blank** | 0 | — | — |
| 25 | CN-1025 | NIKHIL TANDULWADIKAR | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 26 | CN-1026 | NISHIKANT MHAISEKHAR | quarterly | **? blank** | 0 | — | — |
| 27 | CN-1027 | PHANI KUMAR SHARMA | quarterly ⟶ | monthly | 4,500 | Apr–Jun | 15,000 |
| 28 | CN-1028 | PRASHANT KARMARKAR | quarterly ⟶ | monthly | 4,500 | Apr–Jun | 15,000 |
| 29 | CN-1029 | PRAVEEN DYTA | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 30 | CN-1030 | R RADHA | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 31 | CN-1031 | RAMESH KIDAMBI | quarterly ⟶ | monthly | 4,500 | Apr–Jun | 15,000 |
| 32 | CN-1032 | RAVINDRAN | quarterly ⟶ | monthly | 4,500 | Apr–Jun | 15,000 |
| 33 | CN-1033 | SANJAY GHOTIKAR | quarterly ⟶ | yearly | 18,000 | Apr | **0** |
| 34 | CN-1034 | Sravya Kopparapu | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 35 | CN-1035 | SREEDHAR KULKARNI | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 36 | CN-1036 | SREEHEMANTH PRAKHYA | quarterly | quarterly | 9,000 | Apr, Jul | 10,125 |
| 37 | CN-1037 | Srilekha Kulkarni | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 38 | CN-1038 | Sudhir Sarma J | quarterly ⟶ | monthly | 4,500 | Apr–Jun | 15,000 |
| 39 | CN-1039 | SUMEDHA Y DANGE | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 40 | CN-1040 | VASANTH JOSHI | quarterly ⟶ | yearly | 18,000 | Apr | **0** |
| 41 | CN-1041 | VENKATA SATYA S SHARMA MADDIPATLA | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 42 | CN-1042 | VENKATESWARA RAO MADDALI | quarterly ⟶ | half-yearly | 9,000 | Apr | 9,750 |
| 43 | CN-1043 | Y ANANTA SATYA BHASKAR | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 44 | CN-1044 | Y VILASINI MANJUNATH | monthly | monthly | 6,000 | Apr–Jul | 13,500 |
| 45 | CN-1045 | AJAY BALKRISHNA TALIKHEDKAR | monthly | monthly | 1,500 | *(joined 15 Jul)* | **see Q3** |
| 46 | CN-1046 | DR RAMANATHAN BALAJI | monthly | monthly | 1,500 | *(joined 11 Jul)* | **see Q3** |
| 47 | CN-1047 | JAGANNADHA SHASTRY SOMANCHI | quarterly | **? blank** | 0 | — | — |
| 48 | CN-1048 | MALLADI MADHU KUMAR | monthly | monthly | 4,500 | Apr–Jun | 15,000 |
| 49 | CN-1049 | Dr Pawan Kulkarni (New Inductee) | pro-rata ⟶ | quarterly | 0 | *(joined 25 Jul)* | **see Q3** |

**Target counts:** monthly 25 · quarterly 11 · half-yearly 7 · yearly 3 · undecided 3.
**Cycle changes:** 20 contracts (7 → monthly, 7 → half-yearly, 3 → yearly, 3 undecided).

Every rupee already receipted maps to a **whole number of instalments** under the
new schedule for all 46 decided members — no member ends up mid-instalment, and
no receipted payment needs to be touched.

Money: 46 decided contracts total ≈ ₹8.83 L gross, ₹3.14 L already receipted,
₹5.70 L outstanding.

---

## 4. What actually has to change in the database

### 4.1 `t_contracts` (49 rows)
`total_value` 18000 → 19500, `grand_total` → 19500 − discount,
`discount_type='fixed'`, `discount_value`/`discount_total` per plan.
Also `billing_cycle_type` is `'mixed'` on every row today — decide whether it
should become the real plan name (see Q5).

### 4.2 `t_contract_events` — rebuild the unpaid tail only
**Invariant: no already-receipted rupee is disturbed.** For each contract:
- Events already `paid` (113 rows, ₹3,13,500) keep their amount, date and status.
- Every `scheduled` / `due` / `overdue` event (226 rows) is deleted and re-derived
  from the new plan schedule, minus whatever the paid events already cover.

This also fixes the **quarterly date drift** documented in CLAUDE.md — quarterly
contracts currently sit at 1 Apr / **30 Jun** / **28 Sep** / **27 Dec** (fixed
90-day intervals), not on calendar quarters. Rebuilding puts them on
1 Apr / 1 Jul / 1 Oct / 1 Feb. *(Note: this fixes BBB's data only — the derivation
engine still produces drifted dates for every new contract on every tenant.)*

### 4.3 ⚠️ `t_invoices` — not what the todo assumed
Todo item 3 was "mark quarterly payers' invoices paid (probably already done)".
It can't be done as written, because **invoices here are not per instalment**:
there is exactly **one ₹18,000 receivable invoice per member** (INV-10001..),
all dated due 24 Jul 2026, with `amount_paid` accumulating against it:

| Status | Count | Total | Paid |
|---|---|---|---|
| paid | 3 | 54,000 | 54,000 |
| partially_paid | 41 | 7,38,000 | 2,59,500 |
| unpaid | 5 | 84,000 | 0 |

`contract_event_id` is NULL on all of them, and `t_contract_events.invoice_id` is
attached inconsistently (some paid events point at it, some don't).

So the per-instalment paid/unpaid record **is** `t_contract_events.status` +
`amount_settled` — which is already correct — and the invoices are a separate
contract-level receivable that must be restated 18,000 → 19,500 − discount, with
`balance` and `status` recomputed. Nothing to "mark paid" beyond that.

### 4.4 Dues matrix UI + CSV
Location: **Operations → Group Sessions** (`contractnest-ui/src/pages/operations/group-sessions/index.tsx`),
as a third tab beside the existing **Groups | Payments to confirm** switcher.
The page already has the table pattern, filter chips, paging, and
`downloadCsv`/`csvCell` helpers used by the Payments tab — the new tab reuses all of it.

Columns: Member · Plan · Contract value · Discount · Net · then Apr…Mar.
Green = paid, amber = due/overdue, yellow = future, each with its amount.
Backed by a new `gs_dues_matrix(block_id)` RPC + route, so the CSV and the grid
come from one source.

---

## 5. Proposed execution order (each step verified before the next)

| Step | What | Reversible? |
|---|---|---|
| 0 | Snapshot `t_contracts`, `t_contract_events`, `t_invoices` for BBB into backup tables | — |
| 1 | Write the plan assignment (49 rows) to a staging table and print it back for sign-off | yes |
| 2 | Restate `t_contracts` values + discounts | yes, from step 0 |
| 3 | Rebuild the unpaid event tail per plan; assert per contract: paid untouched, new sum = net | yes, from step 0 |
| 4 | Restate `t_invoices` totals / balance / status | yes, from step 0 |
| 5 | Reconciliation report: 49 rows, contracted vs receipted vs outstanding, tie-out to ₹3,13,500 | — |
| 6 | Build the dues-matrix RPC + tab + CSV (normal MANUAL_COPY_FILES two-phase delivery) | n/a |

Steps 2–4 run inside one transaction per contract.

---

## 6. Answers received (6 Aug 2026) — decisions now locked

| # | Question | Your answer | What it means for the migration |
|---|---|---|---|
| 1 | The 3 blank-plan members (CN-1024 Patron, CN-1026, CN-1047 Bhushana) | **Leave alone right now** | Excluded from the restatement. Their contracts keep ₹18,000 and their current quarterly schedule, untouched. Revisit separately. |
| 2 | "8 nil have no contracts" vs the 5 that do | **Not understood — re-explained below** | Still open. Only affects whether those 5 contracts should exist at all; it does not block steps 2–4. |
| 3 | Mid-year joiners | **Their year starts from that month** | CN-1045 (15 Jul), CN-1046 (11 Jul), CN-1049 (25 Jul) get their OWN 12-month window from their join month — not the Apr–Mar calendar. See 6.1. |
| 4 | The 6 sheet-vs-system paid differences | **OK** | System receipt ledger wins. The sheet is behind. No receipted payment is touched. |
| 5 | `billing_cycle_type` | **Leave it as 'mixed'** | Column not written. The Dues tab derives the plan from instalment spacing, so it displays correctly regardless. |
| 6 | Telling monthly members about ₹18,000 → ₹19,500 | **OK** | No message sent. The circular is their notice. |

### 6.1 Mid-year joiners — what "starts from that month" produces

Their fee is the same ₹19,500 gross with the same plan discount; only the **calendar** shifts to their
join month. So a July joiner on monthly runs Jul → Jun:

| Contract | Member | Joined | Plan | Schedule |
|---|---|---|---|---|
| CN-1045 | AJAY BALKRISHNA TALIKHEDKAR | 15 Jul 2026 | Monthly | 1500 ×10 Jul→Jun, **+750 in month 7 (Jan) and month 9 (Mar)** = 19,500 |
| CN-1046 | DR RAMANATHAN BALAJI | 11 Jul 2026 | Monthly | same shape, Jul→Jun |
| CN-1049 | Dr Pawan Kulkarni | 25 Jul 2026 | Quarterly | Jul / Oct / Jan / Apr, 4500 / 4500 / 5000 / 5125 = 19,125 (750 discount) |

⚠️ **One thing to confirm before I build this**: CN-1049 is currently a **₹12,000** contract
(3 instalments, ending 31 Mar 2027) — priced as a part-year joiner. "Start from that month" at the full
₹19,500 means his contract now runs **Jul 2026 → Jun 2027** and he pays a full year's fee, not a
part-year one. Say the word and I'll do that; if he was meant to pay pro-rata for the remaining
part of BBB's year, his ₹12,000 stays and only the other two change.

### 6.2 On question 2 — said differently

Your spreadsheet's "Meeting fee Paid" column says **nil** for eight people, and you told me those eight
have no contracts. For four of them that is exactly right — **BBB** (that's the chapter itself),
**D DASARADHI SARMA**, **Karthikeya B**, **YASHWANTH KUMAR V**. Nothing exists for them, nothing to do.

But the other five **do have a live contract already sitting in the system**, each with a full year of
billing instalments generated:

| Member | Contract | Money receipted |
|---|---|---|
| BHARAT KUMAR MANGIPUDI | CN-1007 | **₹4,500** — this is the "he paid 4500 last meeting" from your own sheet note |
| FLT LT SONALI SHIRPURKAR (RETD) | CN-1014 | ₹0 |
| NARENDRA KUMAR KAMARAJU (Patron Member) | CN-1024 | ₹0 |
| NISHIKANT MHAISEKHAR | CN-1026 | ₹0 |
| JAGANNADHA SHASTRY SOMANCHI (Bhushana Member) | CN-1047 | ₹0 |

So "nil" in the sheet means **nil paid**, not **no contract**. All five are already counted as members in
the system — they receive the WhatsApp reminders, they show in the roster, and they appear in the Dues
tab in amber as being in arrears (₹9,000 each for the four with nothing paid).

**The only thing I need from you**: should those five stay as members who simply owe money, or should
any of them be removed because they are not fee-paying (Patron and Bhushana sound like they might be
honorary categories)? Answering "leave them" is a perfectly fine answer — it changes nothing.

---

## 7. Original open questions (for the record)

1. **The 3 blank-plan members with live contracts** — CN-1024 NARENDRA KUMAR
   KAMARAJU (Patron Member), CN-1026 NISHIKANT MHAISEKHAR, CN-1047 JAGANNADHA
   SHASTRY SOMANCHI (Bhushana Member). All have ₹0 receipted. Patron/Bhushana
   may be non-fee categories. Assign a plan, or cancel/park the contracts?

2. **Your "8 nil have no contracts" vs section 2B** — five of them do have live
   contracts. Is the sheet behind, or should those five contracts be removed?

3. **Mid-year joiners** — CN-1045 AJAY (15 Jul), CN-1046 DR RAMANATHAN (11 Jul),
   CN-1049 Dr Pawan Kulkarni (25 Jul). Their contracts don't run Apr–Mar.
   Full ₹19,500, or pro-rate from their join month (Pavan is already ₹12,000)?

4. **The six sheet-vs-system paid differences** (section 2D) — confirm the system
   figures are right and the sheet is simply behind.

5. **`billing_cycle_type`** is `'mixed'` on all 49. Set it to the real plan
   (`monthly`/`quarterly`/`half_yearly`/`annual`), or leave it alone?

6. **Member-visible impact** — monthly members go from ₹18,000 to ₹19,500 for the
   year (+₹750 in Oct, +₹750 in Dec). Should anything be sent to them, or is the
   circular already their notice?
