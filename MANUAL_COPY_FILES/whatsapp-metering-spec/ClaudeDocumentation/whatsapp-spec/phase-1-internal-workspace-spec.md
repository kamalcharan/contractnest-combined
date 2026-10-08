# ContractNest WhatsApp workspace — product spec and plan of action

Status: Phase 1 tasks 1–2 implemented and verified (phone binding confirmed 8 Oct); task 3 not started; metering decisions recorded (section 10)  
Date: 8 October 2026  
Scope: Phase 1 internal team members. Phase 2 customers interacting with a business is a separate release.

## 1. Outcome and boundaries

An authorized team member can use WhatsApp as a practical interface to the same Live ContractNest workspace and domain operations available on the web. WhatsApp is not a second contract, finance, scheduling, or form engine. It invokes existing domain operations with channel-specific presentation, authorization, confirmation, and audit.

Phase 1 is **Live-only**, supports both **Revenue and Expense**, and allows only verified internal members. No tenant Test records may be read, written, summarized, or linked by this channel. Provider/developer test numbers and fixtures are permitted for integration QA, but are not a tenant-facing Test environment.

Phase 2 will introduce a distinct external customer actor and customer-specific record access. A customer must never inherit an internal team menu just because the phone number matches a contact. A tenant may optionally connect its **own WhatsApp Business number and brand** in either phase. The shared ContractNest number is a fallback/pilot channel, not the only supported topology.

## 2. Current-state baseline (as inspected)

- `/extend` currently publishes template-backed touchpoints and, for WhatsApp, generates a `wa.me` share link to a hosted buy page. This is not an inbound workspace assistant.
- The API has MSG91 outbound WhatsApp message support, currently configured with a product-level `MSG91_WHATSAPP_NUMBER`. The existing Integrations configuration and common sender do not by themselves establish tenant-owned-number onboarding, inbound tenant routing, interactive replies, or WhatsApp Flows.
- The web client sends a tenant header and an `x-environment` header derived from Live/Test UI state. WhatsApp must not trust either a browser header or a callback payload as its authority for Live access; its server-side command layer must force Live.
- BBB's membership audit found one account with two active workspace memberships (Charan in BBB and vikuna). The agreed one-workspace rule for ordinary users needs an explicit, audited platform-administrator exception. Existing access must not be silently removed.

The first implementation task is to verify the deployed provider and inbound webhook contract, and to reconcile this source baseline with the deployed configuration. Do not advertise the workspace assistant as live merely because the current `/extend` share link works.

### Progress confirmed on 8 October 2026

- Task 1's code/database reuse audit is recorded in `phase-1-task-1-audit.md`. MSG91 account-level proof for inbound messages, receiving-number identity, callback authentication, tenant-owned numbers, and Flows remains open.
- The MSG91 WhatsApp Webhook (New) list shown by the user has two existing n8n destinations: `BBB` subscribes to **On Inbound Report Received** at `/webhook/whatsapp-msg91`; `VaNi` subscribes to **On Inbound Request Received** at `/webhook/group-discovery-agent`. These are existing production routes and must not be overwritten or assumed safe to duplicate. The screenshot does not show a subscription to **On Outbound Report Received**, the MSG91 event documented for outbound Sent/Failed/Delivered/Read status. Verify each n8n workflow's current behavior and any number/event filters before deciding on a fan-out or migration.
- The user clarified that existing BBB/VaNi WhatsApp activity and the proposed internal-team assistant should use the **currently configured MSG91 integrated WhatsApp business number** for the first pilot. A member's verified personal phone is only the sender identity; it is separate from the MSG91 business number. Read the full receiving-number identifier from authenticated MSG91 events/configuration in implementation; do not ask the user to map numbers by their last four digits.
- The user confirmed that the existing MSG91 number **can run a WhatsApp Flow**. Treat Flow sending as an available provider capability for planning. Dynamic data exchange for a member-specific contract list and secure Flow completion handling still require integration verification; a sendable Flow alone does not prove those data paths.
- Task 2's one-workspace guard, administrator exception, Live-only workspace/member switches, and verified phone-binding path are implemented. The user completed MSG91 OTP authentication successfully; a read-only database check found one newly verified, active phone binding. For that account, the workspace switch is on, the member switch is off, and active workspace count is one. No chat access is enabled until the member switch is explicitly turned on.
- The MSG91 OTP widget is for **proving ownership of a team member's personal phone**. Its OTP event webhook is not the inbound WhatsApp conversation webhook. An OTP widget log, callback 200, or successful phone binding does not establish inbound command transport or outbound delivery.
- Neither a WhatsApp workspace assistant nor tenant-owned-number connection is live. Do not infer either from the existing `/extend` buy-link sharing or the completed OTP check.

## 3. Identity, tenancy, and permissions

1. Resolve the receiving WhatsApp business number to a configured ContractNest channel. A tenant-owned number maps to **exactly one tenant** and presents that tenant's business identity. The shared ContractNest number may serve internal staff where the member has exactly one workspace; it must never imply tenant-branded messaging. If routing is ambiguous, stop and request secure context rather than guessing.
2. Normalize the sending phone to a canonical international format. Match only a verified phone binding to an active ContractNest user; never grant access from an unverified profile field or a contact record.
3. Resolve the user's active workspace membership. Ordinary users must have exactly one eligible workspace. An explicit platform-admin exception must choose a workspace context, be audited, and never silently select one for a consequential action.
4. Require both the workspace WhatsApp master switch and the member's WhatsApp permission. Re-evaluate both, the user's membership/role, the target record, and Live environment for **every** command and callback.
5. Separate roles: internal member, platform administrator, and (in phase 2) external customer. A customer may access only records explicitly linked to their identity or invitation, not the business workspace.
6. If identity is ambiguous, disabled, suspended, or unverified, return a non-sensitive explanation and a secure linking/help path. Never disclose workspace names or record details while resolving an unknown sender.

### Settings controls

`/settings/users`: a tenant administrator can enable/disable WhatsApp usage for each active member. Show verified phone, permission status, last access, and reason a switch is unavailable. Suspension or disablement revokes new actions immediately. A profile phone change requires re-verification; it must not silently transfer WhatsApp access.

`/extend` → WhatsApp: show the workspace-level channel switch, **Use ContractNest number / Connect my business number** choice, connection/health state, configured number and verified brand/display name, enabled-member count, supported capabilities, approved-template/Flow status, recent delivery failures, and a link to `/settings/users`. Clearly separate **WhatsApp workspace** from the existing **share a buy link on WhatsApp** touchpoint. An entitlement may unlock configuration, but entitlement alone does not authorize any member.

For a tenant-owned number, onboarding must prove ownership/authorization, complete provider and Meta business-number registration, map the provider's receiving-number identifier to one tenant, synchronize its approved templates and Flows, and show actionable errors for pending verification or disconnected status. The connection must be removable without deleting ContractNest business records; disable inbound actions and outbound sends immediately on disconnect. A number must not be connected to two tenants at once. Confirm the exact MSG91 multi-number/embedded-onboarding capability in the provider spike before promising self-service connection UX.

**Sender selection:** every outbound message chooses the tenant-connected number when active, otherwise the permitted shared number. The current single `MSG91_WHATSAPP_NUMBER` environment variable cannot remain the sole sender selector. Keep provider secrets server-side; store only tenant-scoped connection references and non-secret status in ordinary settings APIs. A member's personal number identifies the actor; the business number identifies the brand and workspace. Both are required for authorization.

Both screens must read and write the same backend permission records. UI-only switches are not acceptable.

## 4. Perspective and capability model

The member can select Revenue or Expense in chat. Perspective affects labels, menus, and eligible actions; it does not change tenant or bypass authorization. The command layer maps to existing domain services, not to web page scraping or a parallel WhatsApp data model.

| Capability | Revenue | Expense | First release | Later controlled action |
| --- | --- | --- | --- | --- |
| Contracts | Client contracts, status, next steps | Vendor/purchased contracts, status | List, find, view summary and secure record link | Create from approved template after review; no unstable free-form VaNi draft |
| Money | Money-in invoices, receipts, dues | Payouts/to-pay, dues | Read-only status, amount, due date | Record/approve actions only after permission, review, confirmation, and duplicate protection |
| Appointments and commitments | Client visits and service commitments | Incoming vendor commitments/appointments | Today's/upcoming/overdue lists and detail | Propose/confirm/reschedule; use one appointment domain workflow |
| Service execution | Assigned service visit and evidence status | Incoming service status where applicable | Ticket/task status and secure form link | Start/complete through existing ticket rules; complex Smart Forms through secure handoff |
| Leads | Sales leads | Not applicable unless an existing Expense use case is confirmed | List and view authorized leads | Update stage or assign after confirmation |
| Group sessions | Sessions, attendance and schedule | Only if an existing Expense use case is confirmed | List sessions and status | Check-in/attendance through existing rules |

Do not promise a capability in WhatsApp merely because its web route exists. Each action needs a reuse audit of its domain API, authorization, validation, idempotency, and web/WhatsApp state parity.

## 5. WhatsApp workspace UX and Flows

The user-selected primary UX is **native WhatsApp Flows (forms/screens)**, not a sequence of text menus. A short message or button may launch a Flow; workspace navigation, filters, record selection, and structured actions then happen inside the Flow wherever the platform supports them. A chat-only echo or numbered-list interaction is an engineering test, not the promised user experience.

Use the smallest suitable native interaction:

| Interaction | Preferred surface | Reason |
| --- | --- | --- |
| Launching or reopening the workspace | One concise WhatsApp message with **Open workspace** Flow button | Chat is an entry point, not the navigation UI |
| Home, Revenue/Expense, contract filters, record selection, status/detail | **WhatsApp Flow screens** with dynamic data exchange | The member navigates a form-like workspace inside WhatsApp; server supplies only authorized Live data |
| Multiple dependent inputs, e.g. appointment date/time, contract contact/start date, lead qualification, group-session registration | **WhatsApp Flow screens** | Structured input, review, and validation within WhatsApp |
| Long Smart Forms, document preview/signature, complex coverage or payment review | Short-lived, record-scoped secure web handoff | Reuse existing validated components without forcing a poor chat form |
| High-impact action confirmation | **Flow review screen** with explicit Confirm/Cancel | User sees the exact action before execution |

The first Flow proof must be a **read-only workspace journey**: Open workspace → Revenue → Active client contracts → select one → see authorized summary, with an optional secure Open-contract link. The sender's verified phone resolves the member; the Flow is not an authentication substitute. Contract lists and detail must come from ContractNest through Meta Flow data exchange or an equivalent provider-supported secure mechanism, not from a static template or a preloaded all-tenant list. Appointment proposal and approved-template contract intake follow once this foundation works. Build a shared Flow definition/version registry, record which business account/number can send each published Flow, and map every submission to the same domain command used by web. A published Flow version is treated as immutable; changes create a new version. A WhatsApp Flow is not a replacement for every long ContractNest Smart Form or document workflow.

Flow sending from the connected MSG91 number is user-confirmed. The remaining proof is to receive and validate completed Flow submissions and to support secure dynamic data exchange for live, member-specific contract lists/details. MSG91's public guide documents Flow-template sync and API sending, but does not by itself establish this dynamic data path. If dynamic exchange is unavailable, stop and bring the trade-off back to the user; do not silently substitute chat menus and call the Flow UX complete. See [Meta's official WhatsApp Business Platform collection](https://www.postman.com/meta/whatsapp-business-platform/overview), [Meta's Flows API collection](https://www.postman.com/meta/whatsapp-business-platform/request/9cwjfve/get-flow), and [MSG91's Flow guide](https://msg91.com/help/whatsapp/whatsapp-flows-via-msg91).

Every step needs Back, Cancel, Help, and a human-support route. After inactivity, resume with a safe summary, not a stale write-ready state.

## 6. Command and data architecture

`MSG91/Meta → ContractNest verified webhook → deduplicate → resolve receiving number, tenant and actor → force Live → authorize intent and record → fetch/prepare → review → explicit confirmation → execute idempotently through domain service → audit → tenant-selected sender/receipt → track delivery`

- Normalize provider payloads into a provider-neutral event. Store provider message ID, sender, receiving number, timestamp, event type, and correlation ID. Protect callback secrets and reject unverifiable events.
- Persist short-lived conversation state: actor, workspace, perspective, intent, selected record IDs, Flow/version, expiry. It is **not** the source of truth for business records.
- Use typed commands and existing domain services. A permission check precedes both read and write, including a lookup by an opaque record ID supplied through a button or Flow.
- Generate a persistent idempotency key for each proposed write and enforce it at the domain write boundary. Duplicated provider callbacks, retries, and repeated taps return the original result.
- Audit actor, workspace, perspective, command, target, request/correlation IDs, review snapshot, result, and failures without unnecessarily storing sensitive message text.
- Provider accepted/queued is not delivered. Track sent, delivered, read where available, and failed separately. A failed outbound confirmation does not roll back a successful business operation; the operation remains findable in the web app.
- Use an outbox/retry process for messages and fail closed on uncertain authorization. External links are short-lived, single-purpose, and record-scoped.

### Direct integration versus n8n

**Recommendation: the transactional path goes directly through ContractNest's API/Edge layer, not through n8n.** The webhook receiver, provider-event verification, number-to-tenant routing, staff identity, Live-only enforcement, role/record authorization, Flow data exchange, confirmation, idempotency, domain write, audit, and receipt status must remain in versioned application code. This gives web and WhatsApp one set of business rules and prevents an n8n workflow from becoming a second privileged contract/finance engine.

n8n is **optional after a trusted domain event** for non-authoritative automation: analytics, internal alerts, digest preparation, experimental AI text assistance, or human-escalation notifications. Such workflows receive a minimal event payload, not provider secrets or broad tenant database credentials, and must call a scoped ContractNest API if they need to request an action. n8n failure must not duplicate or reverse a completed business operation. Existing n8n use in VaNi/AI integrations is not evidence that WhatsApp command execution already routes through n8n.

## 7. Example journeys

**Read:** member sends “open workspace” or taps an entry button → a native Flow opens → chooses Revenue → Active client contracts → sees a dynamically loaded, authorized list → selects a contract → sees name, counterparty, status, and next step within the Flow. A secure Open link may be sent after completion for full contract view. An unauthorized contract ID produces no existence leak. A static chat menu is not the target UX.

**Appointment proposal:** member selects a due service inside the workspace Flow → Propose slot screen collects date/time and optional technician → domain validator checks eligibility/conflicts → Flow review screen shows customer, service, date/time, and whether a message will be sent → Confirm → one appointment proposal/reference, reflected in timeboard and contract tasks. Repeated Confirm returns that reference, not a second proposal.

**Template contract:** member chooses approved template → Flow collects counterparty, start date, and any genuinely variable fields → server shows frozen template terms and calculated preview → user confirms creation. “Review draft” remains optional in the product, but no irreversible activation is hidden behind one tap. Free-form VaNi drafting is not part of this release.

**Finance:** first release answers “What is due?” and links to the invoice/payout. A later write journey must show payer/payee, amount, currency, source, target invoice, and effect on balance before confirmation. WhatsApp must not treat “mark paid” as evidence that money moved.

## 8. Security, policy, and operations

The server must force Live and reject Test context even if a malicious or stale client supplies Test IDs. Deny inactive users, revoked phone bindings, disabled channel/member flags, wrong workspace, wrong perspective entitlement, and forbidden record access. Include replay, cross-tenant, number-reassignment, and stale-Flow tests.

Business-initiated WhatsApp messaging requires recipient opt-in and approved templates; free-form replies have a customer-service window, and automation needs a clear human escalation path under [WhatsApp Business policy](https://whatsappbusiness.com/policy/). Record consent and opt-out state separately from the internal-use permission switch. Obtain security/privacy review for sensitive finance and customer data displayed in chat.

Operational dashboard: inbound processing, provider failures, message delivery, unknown senders, authorization denials, Flow health, callback latency, duplicate suppression, action outcomes, and human handoffs. Add a channel kill switch that stops actions without breaking the web app.

## 9. Plan of action and exit gates

1. **Architecture/reuse and provider audit.** Inventory domain APIs for contracts, money, timeboard, service tickets/Smart Forms, leads, and group sessions; map permission and Live/Test behavior. Confirm MSG91 inbound, multi-number tenant onboarding, per-number sending/templates, and native Flow/data-exchange support on the connected account. Exit: signed capability matrix marked reusable, adapter needed, or blocked; documented shared-number and tenant-number onboarding paths.
2. **Identity and entitlement.** Enforce one workspace for ordinary accounts at membership creation and login selection, with explicit admin exception; add verified phone binding, workspace channel setting, member permission, and audit. Preserve existing access until reviewed. Exit: cross-workspace and revoked-user tests pass.
3. **Transport foundation.** First obtain the actual MSG91 WhatsApp (not OTP-widget) inbound and delivery webhook configuration/payloads, callback authentication method, receiving-number identifier, and outbound sender selection for the pilot number. Preserve the existing VaNi/BBB webhook behavior until its scope is understood; do not point production traffic at an unverified echo handler. Since the pilot shares a business number with VaNi, design one authoritative inbound routing decision: verified, entitled staff messages go to ContractNest's internal assistant; all other messages retain the existing VaNi behavior. The decision and all workspace authorization must live in ContractNest, not an n8n branch based only on phone text. Then build the authenticated inbound adapter, deduplication, outbox/delivery tracking, receiving-number routing, sender selection, human handoff, and provider failure handling directly in ContractNest. Keep tenant-owned-number routing as a supported design, not a claimed working connection. Exit: one verified member sends a harmless message and receives exactly one reply; inbound, send acceptance, delivery/failure, and correlation are observable; unknown/disabled senders get no workspace data; retries create no duplicate reply; no tenant Test-data access or cross-tenant send. This echo is an **internal transport test only**; do not expose it as the user-facing workspace or mark the product journey complete until the task-5 Flow slice works.
4. **Settings and tenant-number UX.** Add truthful controls to `/settings/users` and `/extend`, including shared-versus-own-number choice, onboarding/verification state, brand identity, health, and disabled reasons. Exit: toggles persist, revoke immediately, and are enforced server-side; disconnected tenant number cannot receive or send tenant actions.
4b. **Metering (section 10).** One metered sender for every outbound WhatsApp message, the zero-credit rules, the 20 % alert, the WhatsApp storefront add-on (₹700/yr, 150 credits) and the `/home` usage split. Exit: section 10's gate. Must be done before any assistant reply reaches a real user.
5. **Read-only Flow pilot.** Ship the native Flow workspace with role-filtered Revenue/Expense screens, starting with dynamically loaded Active client contracts and contract detail. Only then add other read-only status views. Exit: the verified member can complete this journey inside WhatsApp; web/WhatsApp parity and record-level authorization tests pass; no chat-menu substitute is presented as completion.
6. **Additional structured Flows.** Build and version appointment proposal, then approved-template contract intake after the read-only Flow and provider data-exchange spike succeed. Keep long Smart Forms as secure handoffs. Exit: validations, cancellation, callback correlation, and provider failures pass.
7. **Controlled writes.** Appointments → service actions → template contracts → finance writes, each behind review/confirmation/idempotency. Exit: repeated webhook/button presses create exactly one operation and the web UI shows the same result.
8. **Pilot and release.** Small internal cohort, documented support runbook, delivery monitoring, opt-in/template review, security QA, rollback/kill switch, then broader release. Exit: no Test leakage, no unauthorized access, no duplicate writes, and recoverable provider outages.

## 10. Metering, credits and the WhatsApp storefront plan (owner decisions, 8 October 2026)

**Already built (reuse, do not rebuild).** `t_tenant_context` holds `credits_whatsapp`, `credits_pooled`, `wallet_balance_paise`, `billing_mode` (e.g. `exempt`), `credit_grant_rates`, `credits_reserved`, `flag_can_send_whatsapp` and `flag_credits_low`. Every message sent through `jtd-worker` is metered: `jtd_reserve_credit` before the provider call, `jtd_charge_credit` after the provider accepts, `jtd_release_credit` on failure; with no credits the message is parked (`no_credits`) and re-queued automatically when credits arrive (`trg_fn_release_jtds_on_context_credit`). `t_credit_journal` records each charge (388 WhatsApp, 123 email, 1 SMS entries at 8 Oct). Top-up packs (`t_bm_topup_pack`) and the Settings → Business model → Usage page exist.

**Rules for the WhatsApp workspace and storefront chat:**
1. **One metered sender.** Every outbound WhatsApp message — notification templates, assistant replies, lists, buttons, Flow messages, secure-link messages — goes through the same reserve → charge → release path. Nothing calls the provider directly. Inbound messages are recorded for usage reporting and are **not** charged.
2. **Unit: 1 credit per outbound message** for now. Category pricing (marketing / utility / authentication / service window) can come later through `credit_grant_rates`; do not build it now.
3. **WhatsApp storefront plan: ₹700 / year includes 150 WhatsApp credits** (pricing to be reviewed later). It is a plan add-on that unlocks customer chat for the tenant's storefronts; further credits come from the existing top-up packs.
4. **At zero credits:**
   - **Team member:** one final reply is sent without charge — "Your workspace is out of WhatsApp credits. Ask your admin to top up." — and nothing else is sent until credits arrive.
   - **Customer in a chat:** the same rule — one closing message without charge ("signia can't reply on WhatsApp right now. Please call or use <link>.") and no further assistant replies. *(Taken as the same rule as team members; owner to confirm.)*
   - Notifications keep today's behaviour: parked, sent automatically after a top-up.
5. **Low-credit alert at 20 %** of the last grant (reuse `flag_credits_low`): shown in the app and sent once to the tenant's admins.
6. **`/home` shows WhatsApp usage:** credits left, used this month split into **notifications · team assistant · customer chat**, the low-credit warning, and a **Top up** action. The Usage settings page shows the same split with history.
7. **Exempt tenants** (`billing_mode = exempt`) are counted but not charged, as today.

**Exit gate (before any customer chat ships):** an assistant reply and a Flow message each create one journal row; zero credits produces exactly one free closing message and no further sends; a top-up resumes sending; `/home` and Usage show the three-way split.

## 11. Decisions to confirm before implementation

- Is tenant-owned-number onboarding available through the actual MSG91 account/contract, and can it be made self-service? If not, start with assisted onboarding; do not display a nonfunctional Connect button.
- A shared ContractNest number may be used for the internal pilot, but the system must support tenant-owned numbers as an option. Confirm which tenant is the first branded-number pilot and who owns number verification, templates, Flows, and provider charges.
- Which exact read-only commands make the first internal pilot? Recommendation: contracts, appointments/commitments, money status, leads, and group sessions; defer all writes until parity tests pass.
- Does the connected MSG91 setup support native WhatsApp Flows and data exchange? This is a required evidence-backed spike, not an assumption.
- Which roles may view financial amounts and later perform financial writes? Reuse existing permissions where sound; define any missing permissions before enabling those commands.

### Immediate task-3 evidence needed from the MSG91 account

1. Use the currently configured MSG91 integrated WhatsApp business number for BBB/VaNi/team use. During implementation, read its full provider-side receiving-number identifier from MSG91 configuration/events. The member's verified personal phone is the sender identity. No separate pilot number or manual last-four-digit mapping is required from the user.
2. The webhook list is now known: preserve `BBB` and `VaNi` as configured. Inspect their detail pages or sanitized n8n executions to establish callback authentication, whether either route is filtered to a business number, and whether `VaNi` is already consuming live inbound messages. Do not repoint either URL. Confirm whether an **On Outbound Report Received** subscription exists elsewhere or must be added after an outbox/status receiver is ready. Redact every secret/header value. The OTP-widget Event and Actions POST URL is a separate integration and is not sufficient.
3. Send a harmless message such as `hello` from the verified personal WhatsApp number to the proposed business number. Share a redacted MSG91 inbound event/log or sample payload showing the event type, receiving-number identifier, message ID, and delivery/correlation identifiers. Do not share OTPs, auth keys, full phone numbers, or customer message histories.
4. Confirm whether MSG91 can select that business number as the sender for an outbound reply and expose its delivery/failure callback. If no inbound event is visible, stop and resolve provider routing before building commands.

No task-3 transport implementation or end-to-end echo is claimed here.

