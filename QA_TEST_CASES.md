# ContractNest — Manual QA Test Cases

**Version:** 1.0
**Last Updated:** 2026-02-25
**Prepared By:** Claude Code
**Total Test Cases:** 182

---

## Table of Contents

1. [Contracts Listing Page (`/contracts`)](#1-contracts-listing-page)
2. [Contract Detail Page (`/contracts/:id`)](#2-contract-detail-page)
3. [Operations Cockpit (`/ops/cockpit`)](#3-operations-cockpit)
4. [Contract Creation Wizard](#4-contract-creation-wizard)
5. [Catalog Studio Configure (`/catalog-studio/configure`)](#5-catalog-studio-configure)
6. [Revenue/Expense Switches (Cross-Cutting)](#6-revenueexpense-switches)

---

## 1. Contracts Listing Page

**Route:** `/contracts`
**Key Files:** `pages/contracts/hub/index.tsx`, `components/contracts/list/*`

### 1.1 Page Load & Initial State

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1.1 | Page loads with correct default state | Navigate to `/contracts` | - Title shows "All Contracts" with total count<br>- Default perspective based on business type (Seller → Revenue, Buyer → Expense)<br>- Status filter defaults to "Active"<br>- Sort defaults to "Worst Health First"<br>- View mode defaults to "Flat/List"<br>- Pagination shows 25 items per page |
| 1.1.2 | Loading state displays skeleton | Navigate to `/contracts` while data loads | VaNiLoader shows with "Loading contracts..." message and 8 skeleton rows |
| 1.1.3 | Empty state shows correctly | Navigate with no contracts for current filters | - FileText icon in rounded box<br>- "No [client/vendor] contracts yet" title<br>- CTA button: "New [Client/Vendor] Contract"<br>- Clicking CTA opens Contract Wizard |

### 1.2 Perspective Switcher

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.2.1 | Toggle Revenue ↔ Expense | Click inactive perspective button | - Active button: brand color bg, white text<br>- Contract list reloads with matching `contract_type`<br>- Pipeline counts update<br>- Portfolio metrics update<br>- View mode label changes: "By Client" ↔ "By Vendor"<br>- Page resets to 1 |
| 1.2.2 | Flip button works | Click "flip to [Expense/Revenue] ops" | Same as 1.2.1, perspective toggles |
| 1.2.3 | Default perspective matches profile | Log in as Buyer-type business | Defaults to "Expense · Vendors" |
| 1.2.4 | Default perspective matches profile (Seller) | Log in as Seller-type business | Defaults to "Revenue · Clients" |

### 1.3 Pipeline Bar (Status Filters)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.3.1 | Pipeline shows 6 statuses + All | Load page | Statuses: Draft, In Review, Pending, Active, Completed, Expired — each with count badge |
| 1.3.2 | Click status pill filters list | Click "Draft" pill | - Pill gets colored border + bg<br>- List shows only draft contracts<br>- Count matches badge number<br>- Bottom bar segment highlights |
| 1.3.3 | Click same pill again clears filter | Click active "Draft" pill again | Reverts to "All" — shows all contracts |
| 1.3.4 | Click "All" clears status filter | Click "All" pill | All contracts shown, no status filter active |
| 1.3.5 | Pipeline bar proportional segments | Load page with mixed statuses | Colored bar segments proportional to each status count, min segment width 2% |
| 1.3.6 | Pipeline counts match perspective | Switch perspective | Counts refresh to match new `contract_type` filter |
| 1.3.7 | Status filter persists in URL | Click "Active" then copy URL | URL contains `?status=active`; pasting URL in new tab restores filter |

### 1.4 Portfolio Summary Strip

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.4.1 | All 6 metrics display | Load page with contracts | Shows: Portfolio Value, Collected (green), Outstanding (red if >0), Avg Health (color-coded), Needs Attention, Overdue Tasks |
| 1.4.2 | Outstanding turns green when 0 | All contracts fully paid | Outstanding shows green (success color) |
| 1.4.3 | Health score color logic | Various health scores | >=70: green, 40-69: warning/amber, <40: red |
| 1.4.4 | Currency formatting correct | INR contracts | Shows ₹ symbol with en-IN formatting, 0 decimal places |
| 1.4.5 | Metrics update on filter change | Apply status filter | Summary recalculates from visible contracts only |

### 1.5 Search

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.5.1 | Search by contract title | Type "maintenance" in search box | List filters to contracts containing "maintenance" in title |
| 1.5.2 | Search by contract number | Type contract number (e.g., "CN-2024-001") | Matching contract(s) appear |
| 1.5.3 | Search by client/vendor name | Type buyer/vendor company name | Matching contracts appear |
| 1.5.4 | Search resets pagination | Be on page 3, type search query | Resets to page 1 |
| 1.5.5 | Empty search restores full list | Clear search box | All contracts for current filters reappear |
| 1.5.6 | No results message | Type gibberish (e.g., "zxcvbnm123") | Shows "No contracts found" or equivalent empty state |

### 1.6 Sort Options

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.6.1 | Worst Health First (default) | Check default sort | Contracts sorted ascending by health_score (lowest/worst first) |
| 1.6.2 | Highest Value | Select "Sort: Highest Value" | Contracts sorted descending by total_value |
| 1.6.3 | Recently Updated | Select "Sort: Recently Updated" | Contracts sorted descending by created_at (newest first) |
| 1.6.4 | Least Complete | Select "Sort: Least Complete" | Contracts sorted ascending by completion % |

### 1.7 View Mode Toggle

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.7.1 | Flat/List view | Select "List" mode | Contracts in single column, no grouping |
| 1.7.2 | Grouped view | Select "By Client" / "By Vendor" | Contracts grouped by buyer_company with collapsible headers |
| 1.7.3 | Group header shows aggregates | Switch to grouped view | Each group shows: client name, contract count, avg health, total value, collected, overdue count |
| 1.7.4 | Expand/collapse groups | Click group header chevron | Toggles visibility of contracts within group |
| 1.7.5 | Group label matches perspective | Revenue → Expense | Label changes from "By Client" to "By Vendor" |

### 1.8 Contract Row Display

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.8.1 | Row shows all fields | Load flat view | Each row: Avatar, Title, Contract Number, Status Badge, Client Name, Contract Type, Value, Overdue indicator |
| 1.8.2 | Status badge color-coded | Various statuses | Draft=gray, In Review=blue, Pending=amber, Active=green, Completed=teal, Expired=red |
| 1.8.3 | Overdue indicator shows count | Contract with 3 overdue events | Shows "3 overdue" red badge |
| 1.8.4 | No overdue shows dash | Contract with 0 overdue | Shows "—" |
| 1.8.5 | Needs attention left border | Contract with health < 50 | 3px red left border on row |
| 1.8.6 | Click row navigates to detail | Click any contract row | Navigates to `/contracts/{id}` |
| 1.8.7 | Eye button navigates | Click eye icon on row | Navigates to `/contracts/{id}` |
| 1.8.8 | Hover effect on row | Hover over contract row | Shadow increases, slight upward translate |

### 1.9 Pagination

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.9.1 | Pagination shows when >25 items | 30+ contracts exist | Shows "Showing 1 to 25 of 30 contracts" + page buttons |
| 1.9.2 | Navigate to next page | Click page 2 | Shows items 26-30, updates "Showing 26 to 30 of 30" |
| 1.9.3 | Previous button disabled on page 1 | Be on page 1 | Left chevron disabled (grayed) |
| 1.9.4 | Next button disabled on last page | Be on last page | Right chevron disabled |
| 1.9.5 | Hidden when ≤25 items | <25 contracts | No pagination component visible |

### 1.10 Create Contract Button

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.10.1 | Button label matches perspective | Revenue perspective | Shows "New Contract" |
| 1.10.2 | Opens wizard with correct type | Click "New Contract" in Revenue view | ContractWizard opens with `contractType='client'` |
| 1.10.3 | Expense perspective creates vendor | Click button in Expense view | ContractWizard opens with `contractType='vendor'` |

---

## 2. Contract Detail Page

**Route:** `/contracts/:id`
**Key Files:** `pages/contracts/detail/*`, `components/contracts/*`

### 2.1 Page Load & Header

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1.1 | Page loads with contract data | Navigate to `/contracts/{valid-id}` | Shows header with: back button, contract icon, title, contract number, status badge, created date |
| 2.1.2 | Loading state | Navigate while loading | VaNiLoader with "VaNi is Loading Contract..." message |
| 2.1.3 | Contract not found | Navigate to `/contracts/{invalid-id}` | AlertTriangle + "Contract not found" + "Back to Contracts" button |
| 2.1.4 | Contract icon color by classification | Open client/vendor/partner contract | Icon color differs per classification type |
| 2.1.5 | Untitled contract fallback | Contract with no title | Shows "Untitled Contract" |

### 2.2 Status Management (Seller)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.2.1 | Status badge dropdown (Seller) | Click status badge as seller | Dropdown shows available transitions |
| 2.2.2 | Status badge read-only (Buyer) | View as buyer | No dropdown, read-only badge |
| 2.2.3 | Draft → Pending transition | Select "Pending" from dropdown | Confirmation dialog: "Change status from Draft to Pending?" → Confirm → status updates |
| 2.2.4 | Active → Completed transition | Select "Completed" | Status changes to Completed with success toast |
| 2.2.5 | Terminal state (Cancelled) | Open cancelled contract | Banner: "This contract has been cancelled. It is now read-only." All buttons disabled |
| 2.2.6 | Terminal state (Expired) | Open expired contract | Same read-only banner, all actions disabled |
| 2.2.7 | Cancel status change | Click Cancel in confirmation dialog | No change, dialog closes |

### 2.3 Summary Bar

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.3.1 | Seller summary items | View as seller | Shows: Contract Value, Collected, Balance, Blocks, Duration, Health Score |
| 2.3.2 | Buyer summary items | View as buyer | Shows: Contract Value, Paid, Remaining, Progress %, Services, Health Score |
| 2.3.3 | Health score color coding | Various scores | >=70: green, >=40: warning, <40: red |
| 2.3.4 | Values update after payment | Record a payment | Collected increases, Balance decreases |

### 2.4 Seller Tabs

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.4.1 | Overview tab loads | Click Overview | Health ring + pillar bars (6 pillars) + Needs Attention panel |
| 2.4.2 | Tasks tab loads | Click Tasks | Date-grouped timeline with service/billing events |
| 2.4.3 | Tasks empty state (pre-active) | Open draft contract's Tasks tab | "Contract Not Yet Active" message |
| 2.4.4 | Financials tab loads | Click Financials | Invoice list with Collect Payment CTA (or "Fully Paid" state) |
| 2.4.5 | Audit Log tab loads | Click Audit Log | Chronological entries with category filters |
| 2.4.6 | Document tab loads | Click Document | Read-only contract preview with PDF download |

### 2.5 Buyer Tabs

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.5.1 | My Services tab | Click My Services | Service events timeline (simplified vs seller) |
| 2.5.2 | Payments tab | Click Payments | Summary cards (Total/Paid/Remaining) + Payment timeline |
| 2.5.3 | Proof of Work tab | Click Proof of Work | Evidence summary + filter bar + ticket groups |
| 2.5.4 | Requests tab | Click Requests | "Coming Soon" placeholder |
| 2.5.5 | Accept Contract button | Buyer opens pending contract | "Accept Contract" green button visible in header |

### 2.6 Financials Tab (Seller)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.6.1 | Collect Payment CTA visible | Open active contract with balance | Card: "Record an offline payment or collect online via Razorpay" + button |
| 2.6.2 | Fully paid state | All invoices paid | Green success card: "Invoice Fully Paid" |
| 2.6.3 | Invoice card displays all fields | Invoice exists | Shows: status indicator, invoice number, EMI badge (if EMI), due date, amount paid, balance |
| 2.6.4 | Invoice status colors | Various invoice states | Fully Paid=green, Partially Paid=amber, Overdue=red, Unpaid=gray, Cancelled=gray (faded) |
| 2.6.5 | Expand receipts | Click "X Receipt(s)" toggle | Shows receipt list: number, date, method, reference, amount |
| 2.6.6 | Cancel invoice | Click Cancel on unpaid invoice | Modal: "Cancel Invoice — [number]" + optional reason + Confirm Cancel |
| 2.6.7 | Mark bad debt | Click Bad Debt on unpaid invoice | Modal: "Mark as Bad Debt — [number]" + optional reason + Confirm |
| 2.6.8 | Invoice PDF download | Click PDF button on invoice | Downloads invoice as PDF |
| 2.6.9 | Financial Health sidebar | View right sidebar | Shows AR/AP badge, contract value breakdown, tax details, collection progress |

### 2.7 Record Payment Dialog

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.7.1 | Open offline payment | Click "Collect Payment" → Offline tab | Form: Amount (defaults to balance), Payment Method dropdown, Date (defaults today), Reference, Notes |
| 2.7.2 | Amount validation | Enter 0 or negative amount | Error: "Invalid amount — Enter a positive payment amount" |
| 2.7.3 | Amount exceeds balance | Enter amount > remaining balance | Error: "Amount exceeds balance — Maximum payable is [amount]" |
| 2.7.4 | Record offline payment success | Fill valid data, submit | Toast: "Payment recorded" + receipt number. Invoice balance updates |
| 2.7.5 | Payment methods available | Click method dropdown | Options: Bank Transfer, UPI, Cash, Cheque, Card, Other |
| 2.7.6 | EMI contract shows sequence | Open payment dialog for EMI contract | EMI sequence field visible, pre-fills installment amount |
| 2.7.7 | Online payment (Razorpay) | Click Online tab → Terminal mode | Razorpay checkout opens after amount entry |
| 2.7.8 | Online payment - Email link | Select Email Link mode | Requires: amount + buyer email → generates payment link with copy button |
| 2.7.9 | Online payment - WhatsApp link | Select WhatsApp mode | Requires: amount + buyer phone → generates payment link |
| 2.7.10 | Checkout closed without payment | Close Razorpay popup | Warning toast: "Checkout Closed — payment window was closed without completing" |

### 2.8 Audit Log Tab

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.8.1 | Audit entries load | Open Audit Log tab | Summary strip with total count + category breakdown |
| 2.8.2 | Filter by category | Click "Status" filter | Only status change entries shown |
| 2.8.3 | Entry details correct | View status change entry | Shows: "Status Changed: Draft → Pending", performer name, timestamp |
| 2.8.4 | Category icons correct | View various entries | Status=RefreshCw, Content=Edit, Assignments=UserCheck, Evidence=Camera, Billing=DollarSign |
| 2.8.5 | Empty state | Open new contract audit log | "No Activity Yet" message |
| 2.8.6 | Error state | Simulate load failure | AlertTriangle + error message + "Try Again" button |

### 2.9 Evidence / Proof of Work Tab

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.9.1 | Evidence summary | Open evidence tab | Total evidence count, ticket count, verification %, progress bar |
| 2.9.2 | Filter evidence types | Click "Photos & Files" filter | Only upload-type evidence shown |
| 2.9.3 | Expand ticket group | Click ticket header | Evidence items listed: type, upload date, status (verified/unverified) |
| 2.9.4 | Empty state (Buyer) | No evidence yet | "No Proof of Work Yet" message |
| 2.9.5 | Empty state (Seller) | No evidence yet | "No Evidence Yet" message |
| 2.9.6 | Buyer view hides assignee | View as buyer | No internal assignee/notes visible |

---

## 3. Operations Cockpit

**Route:** `/ops/cockpit`
**Key Files:** `pages/ops/cockpit/index.tsx`

### 3.1 Page Load & Layout

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1.1 | Page loads correctly | Navigate to `/ops/cockpit` | - Title: "Operations Cockpit"<br>- Subtitle varies by perspective<br>- 3-column layout: Stats, Main content, VaNi sidebar |
| 3.1.2 | Loading state | Navigate while loading | VaNiLoader: "Loading Operations Cockpit..." with 4 skeleton cards |
| 3.1.3 | Revenue subtitle | View in revenue mode | "Revenue operations — what needs your attention today" |
| 3.1.4 | Expense subtitle | View in expense mode | "Expense operations — procurement & vendor management" |

### 3.2 Stat Cards (Top Row)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.2.1 | Three stat cards display | Load page | Cards: Pending Acceptance (amber), Drafts (gray), Overdue Events (red if >0, gray if 0) |
| 3.2.2 | Animated counter | Load page | Numbers animate up from 0 over ~1 second |
| 3.2.3 | Overdue card turns red | Overdue events exist | Card indicator color turns red |
| 3.2.4 | Counts match backend | Compare with API stats | All 3 counts match `useContractStats()` data |

### 3.3 Perspective Switcher

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.3.1 | Toggle works | Click inactive perspective | All cards/content refresh with perspective-appropriate data |
| 3.3.2 | Revenue shows correct cards | Switch to Revenue | Shows: Awaiting Acceptance card. Hides: CNAK Claim, RFQ Tracker |
| 3.3.3 | Expense shows correct cards | Switch to Expense | Shows: CNAK Claim CTA, RFQ Tracker. Hides: Awaiting Acceptance |
| 3.3.4 | Action buttons match perspective | Revenue mode | Buttons: "New Contract" + "Add Client" |
| 3.3.5 | Action buttons (Expense) | Expense mode | Buttons: "Vendor Contract" + "Add Vendor" |

### 3.4 Awaiting Acceptance Card (Revenue Only)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.4.1 | Carousel displays contracts | Revenue mode with pending contracts | Horizontal carousel of contract cards (max 4 visible, 280px each) |
| 3.4.2 | Card content correct | View carousel card | Shows: avatar, title, contract number, buyer name, "Sent Xd ago", status badge |
| 3.4.3 | Status badges | Various contract states | "Viewed" (green), "Opened" (amber), "Not Seen" (red) |
| 3.4.4 | Carousel navigation | Click right arrow | Scrolls to show next card(s) |
| 3.4.5 | Carousel bounds | Scroll to end | Right arrow disabled at max, left arrow disabled at 0 |
| 3.4.6 | "View all" link | Click "View all in Hub" | Navigates to `/contracts?status=pending_acceptance` |
| 3.4.7 | Eye button navigates | Click eye icon on card | Navigates to `/contracts/{id}` |
| 3.4.8 | Send/Nudge button | Click send icon | Opens NudgeConfirmationModal with contract details |
| 3.4.9 | Empty state | No pending contracts | "All caught up" message with CheckCircle2 icon |

### 3.5 CNAK Claim CTA (Expense Only)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.5.1 | CTA visible in expense mode | Switch to expense | "Claim Contract via CNAK" button visible |
| 3.5.2 | Navigate to claim | Click claim button | Navigates to `/contracts/claim` |

### 3.6 Event Schedule Buckets

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.6.1 | Six buckets display | Load page | Overdue (red), Today (blue), Tomorrow (purple), This Week (cyan), Next Week (amber), Later (gray) |
| 3.6.2 | Bucket counts correct | Compare with event data | Each bucket shows: total count + sub-counts (service, spare parts, billing) |
| 3.6.3 | Overdue bucket highlighted | Overdue events exist | 3px left red border on overdue bucket |
| 3.6.4 | Today bucket highlighted | Events scheduled today | 3px left blue border on today bucket |
| 3.6.5 | Spare parts badge hidden when 0 | Category has 0 spare parts | Package icon badge not shown for that bucket |

### 3.7 Service Events Grid

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.7.1 | Event cards display | Events exist | 2-column grid showing up to 6 compact EventCards |
| 3.7.2 | Overflow indicator | >6 events for current filter | "+N more events" text below grid |
| 3.7.3 | Event card content | View individual card | Icon (service/spare/billing), block name, contract title, status badge, amount (billing) |
| 3.7.4 | Event type icons | View various types | Service=Wrench (green), Spare=Package (blue), Billing=Receipt (amber) |
| 3.7.5 | Sequence indicator | Recurring event | Shows "2/12" format badge |

### 3.8 Filters

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.8.1 | Time filter - Today | Click "Today" | Only events for today shown |
| 3.8.2 | Time filter - This Week | Click "This Week" | Events for next 7 days shown |
| 3.8.3 | Time filter - This Month | Click "This Month" | Events for next 30 days shown |
| 3.8.4 | Type filter - All | Click "All" | Service + billing + spare part events shown |
| 3.8.5 | Type filter - Deliverables | Click "Deliverables" | Only service + spare part events |
| 3.8.6 | Type filter - Invoices | Click "Invoices" | Only billing events |

### 3.9 Action Queue

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.9.1 | Queue items display | Drafts/overdue/pending items exist | List items with: colored dot, title, subtitle, date, chevron |
| 3.9.2 | Draft items (gray dot) | Draft contracts exist | Shows: contract title, "Draft · [number]", updated date |
| 3.9.3 | Urgent items (red dot) | Overdue events exist | Shows: block name, "Overdue · [contract]", scheduled date |
| 3.9.4 | Pending items (amber dot) | Pending review contracts | Shows: contract title, "Pending Review · [number]", updated date |
| 3.9.5 | Filter queue | Click "Drafts" tab | Only draft items shown |
| 3.9.6 | Click queue item | Click any row | Navigates to `/contracts/{id}` |
| 3.9.7 | Empty queue | No action items | "Queue clear" message |
| 3.9.8 | Filter badge counts | View filter pills | Each shows count badge (only if >0) |

### 3.10 Footer & Refresh

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.10.1 | Footer shows stats | View bottom bar | Shows: "[N] contracts" + "[N] events" on left; "Synced HH:MM" + Refresh on right |
| 3.10.2 | Refresh button | Click Refresh | RefreshCw icon spins, data reloads, "Synced" timestamp updates |
| 3.10.3 | Refresh disabled while loading | Click refresh twice quickly | Button disabled during refresh, prevents duplicate calls |

### 3.11 Quick Actions

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.11.1 | New Contract button | Click "New Contract" (Revenue) | ContractWizard opens with type='client' |
| 3.11.2 | Vendor Contract button | Click "Vendor Contract" (Expense) | ContractWizard opens with type='vendor' |
| 3.11.3 | Add Client button | Click "Add Client" (Revenue) | QuickAddContactDrawer opens with classification='client' |
| 3.11.4 | Add Vendor button | Click "Add Vendor" (Expense) | QuickAddContactDrawer opens with classification='vendor' |

### 3.12 NudgeConfirmationModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.12.1 | Modal opens | Click send button on awaiting card | Shows: contract number, 4-step sequence timeline, WhatsApp preview, CNAK info |
| 3.12.2 | Confirm send | Click confirm in modal | Notification sent, spinner shows, success toast |
| 3.12.3 | Close modal | Click X or Cancel | Modal closes, no action taken |

### 3.13 VaNi Sidebar

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.13.1 | Sidebar shows coming soon | View right panel | "Coming Soon" placeholder with 5 planned capabilities listed |

---

## 4. Contract Creation Wizard

**Trigger:** "New Contract" button from listing or cockpit
**Key Files:** `components/contracts/ContractWizard/index.tsx`, `steps/*`

### 4.1 Wizard Initialization

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1.1 | Wizard opens as modal | Click "New Contract" | Modal opens with step 1 (Path Selection) |
| 4.1.2 | Contract type passed correctly | Open from client/vendor/partner context | `contractType` matches calling context |
| 4.1.3 | Fresh state on open | Close wizard, reopen | All fields reset to defaults, no stale data |
| 4.1.4 | Close wizard | Click X or Cancel | Modal closes, no data persisted |

### 4.2 Step 0: Path Selection

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.2.1 | Two path options shown | Open wizard | "From Template" (Recommended) and "Create from Scratch" cards |
| 4.2.2 | Select Template path | Click "From Template" | Card selected (checkmark), enables Continue |
| 4.2.3 | Select Scratch path | Click "Create from Scratch" | Card selected, enables Continue |
| 4.2.4 | Cannot proceed without selection | Try clicking Continue with no selection | Continue button disabled (`canGoNext: path !== null`) |
| 4.2.5 | Vendor mode selection | Open wizard for vendor contract | Additional cards: "Create RFQ" and "Create Contract" |
| 4.2.6 | RFQ mode sets wizard mode | Click "Create RFQ" | `wizardMode = 'rfq'`, reduced step count (6 steps) |
| 4.2.7 | Template sub-step | Select Template → Continue | TemplateSelectionStep shown; must select a template or "Switch to Scratch" |
| 4.2.8 | No templates available | Select Template with 0 templates | Lottie animation empty state + "Switch to Scratch" button |

### 4.3 Step 1: Nomenclature

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.3.1 | Nomenclature groups display | Reach nomenclature step | Grouped cards: Equipment Maintenance, Facility Property, Service Delivery, etc. |
| 4.3.2 | Selection stores values | Click a nomenclature | `nomenclatureId`, `nomenclatureName`, `nomenclatureGroup` updated |
| 4.3.3 | Step is optional | Click Continue without selection | Proceeds (always valid) |
| 4.3.4 | Equipment group triggers asset step | Select "Equipment Maintenance" | Asset Selection step (Step 5) will be shown later |
| 4.3.5 | Other groups skip asset step | Select "Service Delivery" | Asset Selection step skipped in flow |

### 4.4 Step 2: Acceptance Method

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.4.1 | Three options displayed | Reach acceptance step | Payment (green), Sign-off (blue), Auto-Accept (purple) |
| 4.4.2 | Payment selected | Click Payment card | Card selected, features listed: "Payment triggers acceptance" etc. |
| 4.4.3 | Sign-off selected | Click Sign-off card | Card selected, digital signature features listed |
| 4.4.4 | Auto-Accept selected | Click Auto-Accept card | Card selected, instant activation features listed |
| 4.4.5 | Cannot proceed without selection | Try Continue with no selection | Disabled (`canGoNext: acceptanceMethod !== null`) |
| 4.4.6 | Not shown in RFQ mode | Open wizard in RFQ mode | This step is skipped entirely |

### 4.5 Step 3: Counterparty Selection

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.5.1 | Label matches contract type | Client contract | Header: "Select your Client" |
| 4.5.2 | Contact list loads | Reach step | List of contacts filtered by classification |
| 4.5.3 | Search contacts | Type in search box | Filters contact list by name/email/phone |
| 4.5.4 | Select a buyer | Click on contact card | `buyerId` and `buyerName` set, Continue enabled |
| 4.5.5 | Quick add new contact | Click "Add New Client" | QuickAddContactDrawer opens |
| 4.5.6 | Cannot proceed without selection | Try Continue with no buyer | Disabled (`canGoNext: buyerId !== null`) |
| 4.5.7 | RFQ multi-select vendors | RFQ mode | Checkboxes for multi-select, `vendorIds.length > 0` required |
| 4.5.8 | Optional contact person | Select buyer then pick contact person | `selectedContactPersonId` set |

### 4.6 Step 4: Contract Details

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.6.1 | All fields present | Reach details step | Contract Name, Status, Currency, Description, Start Date, Duration (value+unit), Grace Period |
| 4.6.2 | Name required | Leave name empty, Continue | Disabled (`contractName.trim() !== ''`) |
| 4.6.3 | Name max length | Type >80 characters | Limited to 80 chars (CONTRACT_TITLE_MAX_LENGTH) |
| 4.6.4 | Duration required | Set duration to 0 | Disabled (`durationValue > 0`) |
| 4.6.5 | Duration presets | Click preset buttons | Options: 1 Week, 2 Weeks, 1 Month, 3 Months, 6 Months, 1 Year, 2 Years |
| 4.6.6 | Grace period presets | Click preset | Options: No Grace Period, 7 Days, 14 Days, 30 Days, 60 Days, 90 Days |
| 4.6.7 | Timeline visualization | Fill start date + duration | 3-node timeline: Start Date → End Date → Grace End Date |
| 4.6.8 | Default currency from tenant | Load step | Currency defaults to tenant config (e.g., INR) |
| 4.6.9 | Description max length | Type >2000 chars | Limited to 2000 chars |
| 4.6.10 | Status defaults to Draft | Check status field | "Draft" pre-selected |

### 4.7 Step 5: Asset Selection (Conditional)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.7.1 | Step shown for equipment | Nomenclature = equipment_maintenance | Asset Selection step visible |
| 4.7.2 | Step shown for facility | Nomenclature = facility_property | Asset Selection step visible |
| 4.7.3 | Step skipped for others | Nomenclature = service_delivery | Step not in flow |
| 4.7.4 | Coverage types required | Try Continue with 0 types | Disabled (`coverageTypes.length > 0`) |
| 4.7.5 | Select coverage types | Click coverage type checkboxes | Added to `coverageTypes[]` array |
| 4.7.6 | Equipment attachment modes | View options | 4 modes: Existing Equipment, Buyer to Add, Create New, Skip |
| 4.7.7 | Create new equipment | Click "Create New" | Equipment form dialog opens with fields: name, make, model, serial, condition etc. |

### 4.8 Step 6: Billing Cycle

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.8.1 | Two options displayed | Reach billing cycle step | Unified Cycle and Mixed Cycles cards |
| 4.8.2 | Unified selected | Click Unified | Card selected, benefits listed |
| 4.8.3 | Mixed selected | Click Mixed | Card selected, flexibility benefits listed |
| 4.8.4 | Cannot proceed without selection | Try Continue | Disabled (`billingCycleType !== null`) |
| 4.8.5 | Unified cycle mismatch validation | Select Unified + add blocks with different cycles | Error toast on Next: "Billing cycle mismatch" |
| 4.8.6 | Not shown in RFQ mode | RFQ flow | Step skipped |

### 4.9 Step 7: Service Blocks

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.9.1 | Three-column layout | Reach blocks step | Block Library (left), Added Blocks (center), Preview (right) |
| 4.9.2 | Search blocks in library | Type in search box | Filters available blocks |
| 4.9.3 | Add catalog block | Click block in library | Added to selected blocks list |
| 4.9.4 | Add fly-by block | Click fly-by menu → Service | Opens fly-by form for ad-hoc block |
| 4.9.5 | Fly-by types | Open fly-by dropdown | 4 options: Service, Spare Part, Text Block, Document |
| 4.9.6 | At least one block required | Try Continue with 0 blocks | Disabled (`selectedBlocks.length > 0`) |
| 4.9.7 | Delete block | Click delete on added block | Block removed from selection |
| 4.9.8 | Edit block quantity/price | Edit inline on added block | Values update, total recalculates |
| 4.9.9 | Coverage type tabs | Coverage types exist | Blocks grouped per coverage type tab |
| 4.9.10 | RFQ: fly-by only | RFQ mode | Catalog blocks disabled, only fly-by allowed |

### 4.10 Step 8: Billing View

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.10.1 | Pricing summary shows | Reach billing view | Base subtotal, tax total, grand total displayed |
| 4.10.2 | Select tax rates | Click tax rate checkboxes | Tax applied, totals recalculate |
| 4.10.3 | Tax breakdown correct | Apply SGST 9% + CGST 9% | Shows line items: SGST amount, CGST amount |
| 4.10.4 | Payment mode - Prepaid | Select Prepaid | Full amount due upfront |
| 4.10.5 | Payment mode - EMI | Select EMI, set 6 months | Calculates installment = total / 6 |
| 4.10.6 | Payment mode - Defined | Select "As Defined" | Per-block payment schedule |
| 4.10.7 | Per-block payment type | Toggle block between prepaid/postpaid | Updates `perBlockPaymentType` record |
| 4.10.8 | Step always valid | Try Continue | Always enabled (no mandatory fields) |
| 4.10.9 | Not shown in RFQ mode | RFQ flow | Step skipped |

### 4.11 Step 9: Evidence Policy

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.11.1 | Three policy options | Reach evidence step | No Verification, Upload Proof, Smart Form |
| 4.11.2 | Default is "None" | Check default | "No Verification" pre-selected |
| 4.11.3 | Smart Form selected | Click Smart Form | Shows form picker below |
| 4.11.4 | Add forms | Click "Add Form" in smart form mode | Picks from tenant's bookmarked forms |
| 4.11.5 | Reorder forms | Drag forms | Sort order updates |
| 4.11.6 | Remove form | Click X on form | Form removed from selection |
| 4.11.7 | Forms clear on mode switch | Select Smart Form → add forms → switch to Upload | Forms array clears |
| 4.11.8 | Not shown in RFQ mode | RFQ flow | Step skipped |

### 4.12 Step 10: Events Preview

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.12.1 | Timeline renders | Reach events step | Vertical timeline with service + billing events |
| 4.12.2 | Event types color-coded | View timeline | Service=green, Spare=blue, Billing=amber |
| 4.12.3 | Override event date | Click event → change date | Date updates in `eventOverrides` |
| 4.12.4 | Reset overridden date | Click "Reset Date" | Reverts to computed date |
| 4.12.5 | EMI generates multiple billing events | EMI mode with 6 months | 6 billing events, one per month |
| 4.12.6 | Unlimited blocks show continuous | Unlimited service quantity | Shows infinity indicator |
| 4.12.7 | Step is informational only | Try Continue | Always enabled |

### 4.13 Step 11: Review & Send

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.13.1 | Contract preview displays | Reach review step | Paper-style preview with all contract details |
| 4.13.2 | Self vs Buyer view toggle | Click toggle | Switches perspective of preview (sender/receiver info changes) |
| 4.13.3 | Download PDF | Click download button | PDF generated with contract details |
| 4.13.4 | Send contract (Payment acceptance) | Click "Send Contract" | Contract created as draft → status transitions → success screen |
| 4.13.5 | Send contract (Sign-off) | Click "Send Contract" | Contract created + sign-off notification sent |
| 4.13.6 | Send contract (Auto-Accept) | Click "Send Contract" | Shows pre-payment dialog with options: Record Payment, Skip Payment, Online Payment |
| 4.13.7 | Auto-Accept: Record offline payment | Fill payment form, submit | Contract created + payment recorded → toast with receipt number |
| 4.13.8 | Auto-Accept: Skip payment | Click Skip | Contract created without payment |
| 4.13.9 | Auto-Accept: Online payment | Select Online → Razorpay | Contract created + Razorpay checkout opens |
| 4.13.10 | Send RFQ | RFQ mode, click "Send RFQ" | RFQ sent to selected vendors |
| 4.13.11 | API error handling | Simulate network failure | Error toast: "Failed to create contract — [message]" |
| 4.13.12 | Partial failure (payment) | Contract created, payment fails | Warning: "Contract created, payment recording failed" |

### 4.14 Success Screen

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.14.1 | Success screen shows | After successful send | Contract name, ID/CNAK, buyer email, acceptance flow info |
| 4.14.2 | Copy CNAK | Click "Copy CNAK" | CNAK copied to clipboard, button text → "Copied!" for 2 seconds |
| 4.14.3 | View Contract | Click "View Contract" | Navigates to `/contracts/{id}` |
| 4.14.4 | Create Another | Click "Create Another" | Wizard resets to step 0 |

### 4.15 Floating Action Island (Navigation)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.15.1 | Island always visible | Any wizard step | Fixed bottom center with: Cancel, Status, Progress dots, Total, Back, Next |
| 4.15.2 | Cancel button | Click Cancel (red X) | Wizard closes without saving |
| 4.15.3 | Back button disabled on step 0 | First step | Back button disabled |
| 4.15.4 | Next button disabled when invalid | Missing required fields | "Continue" button disabled (opacity-40) |
| 4.15.5 | Last step button text | Contract mode, last step | Shows "Send Contract" |
| 4.15.6 | RFQ last step text | RFQ mode, last step | Shows "Send RFQ" |
| 4.15.7 | Total value hidden in RFQ | RFQ mode | Total value not displayed |
| 4.15.8 | Progress dots | Navigate through steps | Completed=green, Current=blue (wider), Remaining=gray |

---

## 5. Catalog Studio Configure

**Route:** `/catalog-studio/configure`
**Key Files:** `pages/catalog-studio/configure.tsx`, `components/catalog-studio/*`

### 5.1 Page Load & Layout

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1.1 | Three-panel layout loads | Navigate to `/catalog-studio/configure` | Left: Category Panel, Center: Block Grid, Right: Editor Panel (on selection) |
| 5.1.2 | Loading state | Navigate while loading | "Loading blocks..." message centered |
| 5.1.3 | Error state | API returns error | Error message: "Error: [message]" |
| 5.1.4 | Default category selected | Page loads | "Service" category selected by default |

### 5.2 Category Panel (Left Sidebar)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.2.1 | All 8 categories shown | Load page | Service, Spare Parts, Billing, Text, Video, Image, Checklist, Document |
| 5.2.2 | Category icons and colors | View panel | Each category has unique icon and color (Service=purple, Spare=cyan, etc.) |
| 5.2.3 | Block count per category | View badges | Shows count of blocks in each category |
| 5.2.4 | Select category | Click "Spare Parts" | Grid updates to show only spare part blocks |
| 5.2.5 | Selected state styling | Click category | Primary color bg (10%) + solid primary border |
| 5.2.6 | Hover state | Hover over unselected category | Background and border change |

### 5.3 Block Grid (Center)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.3.1 | Grid shows filtered blocks | Select category | Only blocks of that type displayed |
| 5.3.2 | Responsive grid | Resize window | 1 col (mobile) → 2 cols → 3 cols → 4 cols (xl) |
| 5.3.3 | "Add Block" card visible | View grid | Dashed border card at end: "Add [Type] Block" |
| 5.3.4 | Click add block | Click dashed card | Navigates to `/catalog-studio/blocks/new?type=[category]` |
| 5.3.5 | "New Block" button | Click top-right button | Navigates to block creation wizard |
| 5.3.6 | No blocks empty state | Category with 0 blocks | "Add Block" card only, appropriate messaging |

### 5.4 Block Card Display

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.4.1 | Card shows all info | View block card | Icon, name, description, price breakdown, tags, usage counts |
| 5.4.2 | Price breakdown (tax exclusive) | Block with exclusive tax | Shows: base + tax amount in parentheses |
| 5.4.3 | Price breakdown (tax inclusive) | Block with inclusive tax | Shows: total with "Incl" badge |
| 5.4.4 | Tags display | Block with tags | Evidence tags (green, camera icon) + regular tags (gray) |
| 5.4.5 | Usage counts | Block used in templates/contracts | Shows template count + contract count |
| 5.4.6 | Click card | Single-click block | Block selected (blue border), Editor Panel opens on right |
| 5.4.7 | Double-click card | Double-click block | Navigates to `/catalog-studio/blocks/{id}/edit` |
| 5.4.8 | Hover effect | Hover over card | Shadow increases + slight upward translate |
| 5.4.9 | Multi-currency indicator | Block with 2+ currencies | Shows indicator badge |

### 5.5 Search & Currency Filter

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.5.1 | Search by name | Type "Yoga" in search box | Only blocks with "Yoga" in name shown |
| 5.5.2 | Search by description | Type keyword from description | Matching blocks filtered |
| 5.5.3 | Case-insensitive search | Type "yoga" (lowercase) | Matches "Yoga Session" |
| 5.5.4 | No results message | Type non-matching term | SearchX icon + "No blocks found" + suggestion text |
| 5.5.5 | Clear search restores all | Clear search box | All category blocks reappear |
| 5.5.6 | Currency selector visible | 2+ currencies exist | Dropdown shows: "All Currencies", "₹ INR", "$ USD", etc. |
| 5.5.7 | Filter by currency | Select "INR" | Block prices show in INR (₹ symbol) |
| 5.5.8 | Currency selector hidden | Only 1 currency | Dropdown not rendered |

### 5.6 Block Editor Panel (Right)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.6.1 | Panel opens on selection | Click a block card | Slide-in panel from right with block details |
| 5.6.2 | Close panel | Click X button | Panel slides out |
| 5.6.3 | View-only fields | Inspect panel | All fields read-only (ViewField components) |
| 5.6.4 | Edit button | Click Edit | Navigates to `/catalog-studio/blocks/{id}/edit` |
| 5.6.5 | Delete button | Click Delete | Confirm dialog: "Are you sure you want to delete '[name]'?" |
| 5.6.6 | Confirm delete | Click Confirm in dialog | Block removed, panel closes, toast: "Block deleted successfully" |
| 5.6.7 | Cancel delete | Click Cancel in dialog | Dialog closes, block still exists |
| 5.6.8 | Duplicate button | Click Duplicate | New block created with "(Copy)" suffix, toast: "Block duplicated" |
| 5.6.9 | Service block sections | Select service block | Shows: Basic Info, Resource Dependencies, Delivery, Pricing, Business Rules, Usage |
| 5.6.10 | Spare block shows SKU | Select spare block | SKU field visible in details |

### 5.7 Block Wizard (Create/Edit)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.7.1 | Wizard loads for create | Click "New Block" | Full-page wizard with step progress sidebar |
| 5.7.2 | Wizard loads for edit | Double-click block | Wizard pre-populated with block data |
| 5.7.3 | Step navigation forward | Click Continue | Advances to next step (validates current) |
| 5.7.4 | Step navigation backward | Click Back | Returns to previous step (preserves data) |
| 5.7.5 | Step jump backward | Click completed step in sidebar | Jumps to that step |
| 5.7.6 | Cannot jump forward | Click future step in sidebar | No action (only backward jumps allowed) |
| 5.7.7 | Validation errors | Submit with missing required fields | Error banner above footer + inline field errors |
| 5.7.8 | Name required validation | Leave name empty, Continue | Error: "Block name is required" |
| 5.7.9 | Description required | Leave empty | Error: "Description is required" |
| 5.7.10 | Name length validation | Type >100 chars | Error: "Name must be at most 100 characters" |
| 5.7.11 | Save block success | Fill all required fields, Save | Redirect to configure + toast: "Block created successfully" |
| 5.7.12 | Save block error | Simulate API failure | Error toast: "Failed to create block" |

### 5.8 Service Block Specific

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.8.1 | Delivery mode selection | Step 4 | 3 options: On-site, Virtual, Hybrid |
| 5.8.2 | Scheduling toggle | Enable scheduling | Buffer hours and max distance fields appear |
| 5.8.3 | Cycle configuration | Enable cycles | Cycle days + grace period fields appear |
| 5.8.4 | Pricing multi-currency | Add INR + USD pricing | Two currency cards with independent amounts/taxes |
| 5.8.5 | Tax selection | Select SGST + CGST | Tags show with rates; breakdown calculates |
| 5.8.6 | Business rules | Enable follow-ups | Free follow-ups, period, paid price fields appear |
| 5.8.7 | Warranty config | Enable warranty | Period, type, terms fields appear |
| 5.8.8 | Cancellation policy | Select "Moderate" | Refund % updates to 50, cutoff shows 24h |

### 5.9 Version Conflict Handling

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.9.1 | Conflict detected | Edit block while another user edits same block | VersionConflictModal appears |
| 5.9.2 | Modal content | View conflict modal | Title: "Version Conflict Detected", block name, warning message |
| 5.9.3 | Refresh data | Click "Refresh Data" in modal | Data reloads, toast: "Data refreshed. Please try your changes again." |
| 5.9.4 | Cancel conflict | Click Cancel | Modal closes, changes discarded |

---

## 6. Revenue/Expense Switches

**Cross-cutting feature affecting:** Contracts listing, Ops Cockpit, Financial views
**Key mechanism:** `PerspectiveSwitcher` component + `contract_type` API filter

### 6.1 Perspective Switcher Behavior

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1.1 | Default based on business type | Log in as Buyer | Defaults to "Expense · Vendors" |
| 6.1.2 | Default based on business type | Log in as Seller | Defaults to "Revenue · Clients" |
| 6.1.3 | Toggle Revenue → Expense | Click "Expense" | All data reloads filtered by `contract_type='vendor'` |
| 6.1.4 | Toggle Expense → Revenue | Click "Revenue" | All data reloads filtered by `contract_type='client'` |
| 6.1.5 | Active button styling | View active button | Brand color background, white text, shadow |
| 6.1.6 | Inactive button styling | View inactive button | Transparent, secondary text |

### 6.2 Contracts Listing Impact

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.2.1 | Revenue shows client contracts | Select Revenue | Only contracts where user is seller (contract_type='client') |
| 6.2.2 | Expense shows vendor contracts | Select Expense | Only contracts where user is buyer (contract_type='vendor') |
| 6.2.3 | Pipeline counts update | Switch perspective | Status counts change to reflect new contract_type |
| 6.2.4 | Portfolio metrics update | Switch perspective | Total value, collected, outstanding recalculate |
| 6.2.5 | Group view label changes | Revenue → Expense | "By Client" → "By Vendor" |
| 6.2.6 | Empty state text changes | Switch to empty perspective | "No [client/vendor] contracts yet" |
| 6.2.7 | CTA button label changes | Switch perspective | "New Client Contract" ↔ "New Vendor Contract" |
| 6.2.8 | Page resets to 1 | Switch perspective while on page 3 | Returns to page 1 |
| 6.2.9 | Search clears | Switch perspective | Search query clears |

### 6.3 Ops Cockpit Impact

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.3.1 | Revenue: Awaiting Acceptance visible | Revenue perspective | Carousel of pending contracts shown |
| 6.3.2 | Revenue: CNAK hidden | Revenue perspective | No CNAK Claim CTA |
| 6.3.3 | Expense: CNAK visible | Expense perspective | "Claim Contract via CNAK" button shown |
| 6.3.4 | Expense: Awaiting Acceptance hidden | Expense perspective | Carousel not rendered |
| 6.3.5 | Expense: RFQ Tracker visible | Expense perspective | RFQ tracking card shown |
| 6.3.6 | Stat cards update | Switch perspective | Pending/Draft/Overdue counts change |
| 6.3.7 | Event buckets update | Switch perspective | Event counts recalculate for new perspective contracts |
| 6.3.8 | Action buttons update | Revenue → Expense | "New Contract"+"Add Client" → "Vendor Contract"+"Add Vendor" |

### 6.4 Financial Impact

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.4.1 | Revenue: AR badge | Open contract detail (revenue) | Financial Health shows "Receivable (AR)" green badge |
| 6.4.2 | Expense: AP badge | Open contract detail (expense) | Financial Health shows "Payable (AP)" orange badge |
| 6.4.3 | Revenue: invoice = receivable | View invoice in revenue contract | Invoice type = 'receivable' |
| 6.4.4 | Expense: invoice = payable | View invoice in expense contract | Invoice type = 'payable' |
| 6.4.5 | Accounts Receivable page | Navigate to AR page | Shows only receivable invoices (revenue contracts) |

### 6.5 API & Caching

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.5.1 | API filters correctly | Switch perspective, inspect network | `contract_type=client` (Revenue) or `contract_type=vendor` (Expense) sent |
| 6.5.2 | Cache invalidation | Switch perspective | Old data invalidated, new request made |
| 6.5.3 | Stats refresh | Switch perspective | Stats endpoint called with new `contract_type` |
| 6.5.4 | No stale data | Switch back and forth rapidly | Data always matches current perspective |

### 6.6 Contract Creation Defaults

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.6.1 | Revenue: creates client contract | Click "New Contract" in Revenue | Wizard opens with `contractType='client'` |
| 6.6.2 | Expense: creates vendor contract | Click "Vendor Contract" in Expense | Wizard opens with `contractType='vendor'` |

### 6.7 Cross-Page Consistency

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.7.1 | Perspective consistent across pages | Set Revenue on listing → navigate to cockpit | Cockpit also shows Revenue perspective |
| 6.7.2 | Returning preserves perspective | Set Expense → go to detail → back | Listing still shows Expense |
| 6.7.3 | Dark mode compatibility | Toggle dark mode with Revenue/Expense | Switcher buttons readable in both themes |
| 6.7.4 | Mobile/responsive | View on small screen | Switcher doesn't overflow, buttons stay accessible |

---

## Appendix A: Common Cross-Cutting Checks

Apply these to ALL 6 areas above:

| # | Check | Details |
|---|-------|---------|
| A.1 | Dark Mode | All text readable, status colors visible, no contrast issues, icons clear |
| A.2 | Loading States | Spinner/skeleton shown during API calls, loaders have appropriate messages |
| A.3 | Empty States | Correct messaging, helpful icon, CTA button where applicable |
| A.4 | Error Handling | API failures show toast with message, retry available, graceful degradation |
| A.5 | Toast Notifications | Success=green, Error=red (must dismiss), Warning=amber, Info=blue (auto-dismiss ~3-4s) |
| A.6 | Browser Refresh | Page recovers gracefully after F5/Ctrl+R, URL state preserved where applicable |
| A.7 | Keyboard Navigation | Tab order logical, buttons focusable, Enter triggers actions |
| A.8 | Long Text Handling | Titles/descriptions truncate with ellipsis, no layout breaking |
| A.9 | Currency Formatting | INR=₹ (en-IN), USD=$ (en-US), correct symbols and locale |
| A.10 | Theme Colors | Brand colors consistent, semantic colors match status meanings |

---

## Appendix B: Test Data Requirements

| Data | Quantity | Details |
|------|----------|---------|
| Contracts (Client/Revenue) | 30+ | Various statuses: draft, pending, active, completed, expired, cancelled |
| Contracts (Vendor/Expense) | 15+ | Same status variety |
| Contacts (Clients) | 10+ | Mix of individual/corporate |
| Contacts (Vendors) | 5+ | For expense perspective |
| Service Blocks | 10+ | Various pricing, cycles, delivery modes |
| Spare Part Blocks | 5+ | With SKU, multi-currency pricing |
| Billing/Text/Other Blocks | 3+ each | To verify category filtering |
| Invoices | Mix | Paid, partial, overdue, unpaid, cancelled |
| Events | Mix | Service, billing, spare — overdue, today, upcoming |
| Template | 2+ | For template path testing |
| Nomenclature Master Data | 3+ | Equipment, facility, service types |
| Tax Rates | 2+ | e.g., SGST 9%, CGST 9% |

---

**End of QA Test Cases Document**
