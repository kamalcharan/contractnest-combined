# VaNi Opportunity Audit - ContractNest Full Codebase Analysis

**Audit Date:** 2026-02-11
**Auditor:** Claude Opus 4.6
**Scope:** contractnest-api, contractnest-ui, contractnest-edge (all services, routes, types, schemas)
**Purpose:** Identify every surface where VaNi AI agent can add value across ContractNest

---

## Table of Contents

1. [Architecture Summary](#1-architecture-summary)
2. [Current VaNi/AI Integration](#2-current-vaniai-integration)
3. [Complete Data Model Map](#3-complete-data-model-map)
4. [Complete API Surface Map](#4-complete-api-surface-map)
5. [Complete UI Workflow Map](#5-complete-ui-workflow-map)
6. [VaNi Opportunity Map (Prioritized)](#6-vani-opportunity-map-prioritized)
7. [Missing Infrastructure & Gaps](#7-missing-infrastructure--gaps)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Architecture Summary

### Stack
| Layer | Technology | Key Patterns |
|-------|-----------|-------------|
| **Database** | PostgreSQL via Supabase | RLS, JSONB config, optimistic concurrency (version field) |
| **API** | Node.js/Express/TypeScript | Multi-tenant (x-tenant-id), idempotency keys, rate limiting |
| **Edge** | Supabase Edge Functions (Deno) | RPC calls to PostgreSQL, JWT auth |
| **UI** | React/TypeScript/Vite | Block-based architecture, wizard flows, theme system |
| **AI/Automation** | N8N webhooks | Profile processing, embeddings, semantic search, AI agent |

### PostgreSQL Extensions in Use
- `timescaledb` - Time-series data
- `pg_cron` - Scheduled jobs
- `pg_net` - HTTP requests from DB
- `pgroonga` - Full-text search (Japanese/multilingual)
- `postgis` - Geospatial data
- `vector` - Vector embeddings for AI search
- `pgmq` - Message queue
- `pg_jsonschema` - JSON validation
- `pg_graphql` - GraphQL layer
- `pgcrypto` - Cryptographic functions

### Multi-Tenancy Pattern
- Every request requires `x-tenant-id` header
- RLS enforced at database level
- Environment switching via `x-environment` header (`live` / `test`)
- Product context via `x-product` header (supports multiple products per tenant)

---

## 2. Current VaNi/AI Integration

### N8N Webhook Configuration (`VaNiN8NConfig.ts`)
| Webhook Path | Purpose | Used By |
|-------------|---------|---------|
| `/process-profile` | AI-enhance member profiles | FamilyKnows |
| `/generate-embedding` | Generate vector embeddings | FamilyKnows |
| `/generate-semantic-clusters` | Cluster keywords/terms | FamilyKnows |
| `/search` | Intent-based semantic search | FamilyKnows |
| `/group-discovery-agent` | Conversational AI agent | FamilyKnows |

### Current AI Capabilities
- **Multi-channel support:** Chat, WhatsApp, Web
- **Search scopes:** Group, Tenant, Product
- **Intent detection:** Built into AI agent
- **Caching:** Search result caching with hit counting
- **Session continuity:** Session IDs for conversation context

### Key Observation
**VaNi currently serves ONLY FamilyKnows.** ContractNest has ZERO AI integration points despite having rich structured data ideal for AI augmentation. This is the primary opportunity.

---

## 3. Complete Data Model Map

### Core Contract Entities

#### `t_contracts` (main contracts table)
| Field Group | Key Fields | VaNi Opportunity |
|------------|-----------|-----------------|
| Identity | `id`, `tenant_id`, `contract_number`, `global_access_id` (CNAK) | Contract search & retrieval |
| Classification | `record_type` (contract/rfq), `contract_type` (service/partnership/nda/po/lease/subscription) | Smart classification |
| Status | `status` (draft/pending_review/pending_acceptance/active/completed/cancelled/expired) | Status prediction, bottleneck detection |
| Counterparty | `buyer_id`, `buyer_name`, `buyer_company`, `buyer_email`, `contact_id` | Contact matching, risk scoring |
| Duration | `duration_value`, `duration_unit`, `grace_period_value`, `grace_period_unit` | Renewal prediction |
| Billing | `currency`, `billing_cycle_type`, `payment_mode`, `emi_months`, `per_block_payment_type` | Payment optimization |
| Financials | `total_value`, `tax_total`, `grand_total`, `tax_breakdown` (JSONB) | Revenue forecasting |
| Evidence | `evidence_policy_type` (none/upload/smart_form), `evidence_selected_forms` (JSONB) | Evidence automation |
| Audit | `version`, `is_live`, `created_by`, `updated_by` | Change tracking |
| Metadata | `metadata` (JSONB), `notes`, `renewal_terms`, `termination_clause` | NLP extraction |

#### `t_contract_blocks` (blocks within contracts)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `block_name` | string | Service identification |
| `category_id` / `category_name` | string | Block classification |
| `unit_price`, `quantity`, `total_price` | numeric | Pricing optimization |
| `billing_cycle` | string | Billing automation |
| `flyby_type` | string | Service routing |
| `custom_fields` | JSONB | Flexible data extraction |

#### `t_contract_vendors` (RFQ vendors)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `vendor_id`, `vendor_name` | string | Vendor matching |
| `response_status` | string | Response prediction |
| `quoted_amount`, `quote_notes` | mixed | Quote analysis |

#### `t_contract_events` (service/billing timeline)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `event_type` | service/billing/spare_part | Event classification |
| `billing_sub_type` | advance/milestone/recurring/final | Payment scheduling |
| `scheduled_date`, `original_date` | date | Schedule optimization |
| `amount`, `currency` | numeric | Cash flow prediction |
| `status` | DB-driven (configurable per tenant) | Status automation |
| `assigned_to`, `assigned_to_name` | string | Resource assignment |
| `task_id` | UUID (nullable) | Execution tracking |

#### `t_invoices` & `t_invoice_receipts`
| Entity | Key Fields | VaNi Opportunity |
|--------|-----------|-----------------|
| Invoice | `amount`, `status` (unpaid/partially_paid/paid/overdue), `due_date`, `emi_sequence` | Payment prediction |
| Receipt | `amount`, `payment_method`, `is_offline`, `is_verified` | Reconciliation automation |

### Catalog Studio Entities

#### `cat_blocks` (reusable blocks library)
| Field Group | Key Fields | VaNi Opportunity |
|------------|-----------|-----------------|
| Identity | `name`, `description`, `block_type_id` | Block recommendation |
| Pricing | `pricing_mode_id`, `config.base_price`, `resource_pricing`, `variant_pricing` | Price optimization |
| Config | `config` (JSONB) - holds service_name, payment_terms, content, media, checklist items, etc. | Auto-configuration |
| Taxonomy | `tags[]`, `is_admin`, `is_seed`, `visible`, `is_active` | Smart categorization |

**Block Types (8 categories):**
1. **Service** - Core service definition with pricing, delivery, business rules
2. **Spare** - Parts/materials with SKU, stock tracking
3. **Billing** - Payment terms (EMI, advance, milestone)
4. **Text** - T&C, policies, notices (rich text)
5. **Video** - Welcome/demo videos
6. **Image** - Brochures, team photos
7. **Checklist** - Pre/post-service verification with evidence requirements
8. **Document** - Certificate uploads, ID verification

#### `cat_templates` (block compositions)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `blocks[]` | TemplateBlock[] (block_id + order + config_overrides) | Template recommendation |
| `is_system`, `is_public`, `is_live` | boolean | Template discovery |
| `copied_from_id` | UUID | Template lineage tracking |
| `status_id` | string | Publishing workflow |

### Service Catalog Entities

#### `services` (service definitions)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `service_name`, `description`, `short_description` | string | Service matching |
| `service_type` | independent/resource_based | Resource planning |
| `status` | boolean | Availability tracking |
| `is_variant`, `parent_id` | boolean/UUID | Variant recommendation |
| `sku` | string | Inventory integration |

#### `service_pricing` (multi-currency pricing)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `currency`, `amount`, `price_type` | mixed | Dynamic pricing |
| `tax_inclusion`, `tax_rate_id` | string | Tax automation |
| `billing_cycle` | string | Revenue modeling |

#### `service_resources` (resource requirements)
| Field | Type | VaNi Opportunity |
|-------|------|-----------------|
| `resource_id`, `resource_type_id` | UUID | Resource allocation |
| `quantity`, `duration_hours` | numeric | Capacity planning |
| `unit_cost`, `is_billable` | mixed | Cost optimization |
| `required_skills[]`, `required_attributes` | JSONB | Skill matching |

### Service Execution Entities

#### Tickets (service execution tracking)
- Created from contract events
- Status tracking with evidence collection
- Audit log for all state changes

#### Evidence
- Attached to tickets
- Types: photos, signatures, GPS, documents, smart forms
- Verification workflow

### Supporting Entities

#### Master Data
- Categories, Industries, Currencies, Tax rates
- Configurable per tenant
- Drives dropdowns and validation across the app

#### Event Status Config (DB-driven state machine)
- `m_event_status_config` - Defines allowed statuses per event type
- `m_event_status_transitions` - Defines allowed transitions
- Tenant-configurable (each tenant can customize their workflow)

#### Contacts
- Contact classifications (buyer, vendor, partner)
- Contact person management
- Used as counterparties in contracts

#### Resources
- Resource types (technicians, equipment, vehicles)
- Resource attributes and skills
- Linked to services via service_resources

---

## 4. Complete API Surface Map

### Contract Routes (`/api/contracts`)
| Method | Path | Purpose | VaNi Hook Point |
|--------|------|---------|----------------|
| GET | `/` | List contracts (filtered, paginated) | **Search enhancement** |
| GET | `/:id` | Get contract detail + blocks/vendors/attachments/history | **Analysis trigger** |
| GET | `/stats` | Dashboard statistics | **Insights generation** |
| POST | `/` | Create contract/RFQ | **Template recommendation, auto-fill** |
| PUT | `/:id` | Update contract (optimistic concurrency) | **Change validation** |
| PATCH | `/:id/status` | Status transition (flow-validated) | **Bottleneck detection** |
| DELETE | `/:id` | Soft delete (draft/cancelled only) | N/A |
| POST | `/:id/notify` | Send sign-off notification (email/WhatsApp) | **Smart timing** |
| GET | `/:id/invoices` | Contract invoices + collection summary | **Payment prediction** |
| POST | `/:id/invoices/record-payment` | Record payment receipt | **Reconciliation** |
| POST | `/public/validate` | Validate CNAK access | N/A |
| POST | `/public/respond` | Accept/reject via CNAK | **Response analysis** |
| POST | `/claim` | Claim contract via CNAK | N/A |

### Catalog Studio Routes (`/api/catalog-studio`)
| Method | Path | Purpose | VaNi Hook Point |
|--------|------|---------|----------------|
| GET | `/blocks` | List blocks (filtered) | **Block recommendation** |
| GET | `/blocks/:id` | Get block detail | **Usage analytics** |
| POST | `/blocks` | Create block | **Auto-configuration** |
| PATCH | `/blocks/:id` | Update block | **Optimization suggestions** |
| DELETE | `/blocks/:id` | Soft delete block | N/A |
| GET | `/templates` | List tenant templates | **Template recommendation** |
| GET | `/templates/system` | System templates | **Best practice matching** |
| GET | `/templates/public` | Public templates | **Marketplace discovery** |
| GET | `/templates/:id` | Get template detail | **Composition analysis** |
| POST | `/templates` | Create template | **Block composition assist** |
| POST | `/templates/:id/copy` | Copy template to tenant | **Customization suggestions** |
| PATCH | `/templates/:id` | Update template | N/A |
| DELETE | `/templates/:id` | Soft delete template | N/A |

### Service Catalog Routes (`/api/service-catalog`)
| Method | Path | Purpose | VaNi Hook Point |
|--------|------|---------|----------------|
| GET | `/master-data` | Categories, industries, currencies, tax rates | N/A |
| GET | `/services` | List services (filtered, sorted) | **Service search** |
| GET | `/services/statistics` | Aggregate service stats | **Analytics insights** |
| GET | `/services/:id` | Get service detail | **Usage tracking** |
| POST | `/services` | Create service | **Auto-fill from description** |
| PUT | `/services/:id` | Update service | **Optimization hints** |
| DELETE | `/services/:id` | Soft delete (deactivate) | N/A |
| PATCH | `/services/:id/status` | Toggle active/inactive | N/A |
| POST | `/services/:id/activate` | Activate service | N/A |
| GET | `/services/:id/versions` | Version history | **Change analysis** |
| GET | `/services/:id/resources` | Service resources | **Resource optimization** |

### Service Execution Routes (`/api/service-execution`)
| Method | Path | Purpose | VaNi Hook Point |
|--------|------|---------|----------------|
| GET | `/` | List tickets (filtered) | **Workload analysis** |
| GET | `/:ticketId` | Ticket detail | **Completion prediction** |
| POST | `/` | Create ticket | **Smart assignment** |
| PATCH | `/:ticketId` | Update ticket | **Status automation** |
| GET | `/evidence` | List evidence (contract-wide) | **Evidence validation** |
| GET | `/:ticketId/evidence` | Ticket evidence | **Completeness check** |
| POST | `/:ticketId/evidence` | Upload evidence | **Auto-validation** |
| PATCH | `/:ticketId/evidence/:id` | Update evidence | N/A |
| GET | `/audit` | Audit log | **Anomaly detection** |

### Contract Events Routes (inferred from types/validators)
| Method | Path | Purpose | VaNi Hook Point |
|--------|------|---------|----------------|
| GET | `/` | List events (filtered, paginated) | **Schedule optimization** |
| GET | `/date-summary` | Bucketed summary (overdue/today/tomorrow/this_week/next_week/later) | **Priority scoring** |
| POST | `/` | Bulk create events | **Smart scheduling** |
| PATCH | `/:id` | Update event (status, date, assignment) | **Rescheduling intelligence** |

### Other Routes
| Area | Key Endpoints | VaNi Hook Point |
|------|--------------|----------------|
| Contacts | CRUD, classifications, contact persons | **Contact matching** |
| Resources | CRUD, types, attributes | **Resource planning** |
| Billing | Payment gateway, tax settings | **Payment optimization** |
| Admin | Tenant management, forms, JTD | **Config recommendation** |
| Onboarding | Tenant onboarding flow | **Guided setup** |
| Business Model | Configuration management | **Model optimization** |

---

## 5. Complete UI Workflow Map

### Contract Creation Wizard Flow
```
Step 1: Record Type Selection (Contract vs RFQ)
    |
Step 2: Contract Type (Service/Partnership/NDA/PO/Lease/Subscription)
    |
Step 3: Contact/Buyer Selection (from contacts or create new)
    |                                          <-- VaNi: suggest contact based on type
Step 4: Template Selection (system/public/tenant templates)
    |                                          <-- VaNi: recommend template
Step 5: Block Selection & Configuration
    |   - Add service blocks (from catalog)
    |   - Add billing blocks
    |   - Add text/legal blocks
    |   - Add checklist blocks
    |   - Configure each block                 <-- VaNi: auto-configure blocks
    |
Step 6: Pricing & Financials
    |   - Multi-currency pricing
    |   - Tax configuration
    |   - EMI/milestone setup                  <-- VaNi: pricing optimization
    |
Step 7: Duration & Timeline
    |   - Contract duration
    |   - Grace period
    |   - Event scheduling                     <-- VaNi: smart scheduling
    |
Step 8: Evidence Policy Selection
    |   - None / Upload / Smart Form
    |   - Form template selection              <-- VaNi: recommend forms
    |
Step 9: Review & Send
    |   - Preview contract
    |   - Send notification (email/WhatsApp)   <-- VaNi: optimal send timing
    |
Step 10: Track (Contract Events Timeline)
        - Service visits scheduled
        - Billing milestones
        - Evidence collection                  <-- VaNi: monitor & alert
```

### Catalog Studio Block Wizard (Service Block)
```
Step 1: Basic Info (name, icon, description)   <-- VaNi: generate from NL description
    |
Step 2: Pricing
    |   - Price type: fixed/hourly/tiered/custom/resource_based
    |   - Multi-currency pricing records
    |   - Tax entries (multi-tax tag style)
    |   - Resource-based pricing               <-- VaNi: price benchmarking
    |
Step 3: Delivery Settings
    |   - Mode: on-site/virtual/hybrid
    |   - Scheduling requirements
    |   - Service cycles (recurring visits)    <-- VaNi: delivery optimization
    |
Step 4: Business Rules
    |   - Follow-up config (free followups, period, conditions)
    |   - Warranty config (period, type, terms)
    |   - Cancellation policy (hidden but modeled)
    |   - Reschedule rules
    |   - Deposit requirements                 <-- VaNi: rules from industry data
    |
Step 5: Evidence & Compliance
        - Evidence types (photo, signature, GPS)
        - Checklist items                      <-- VaNi: evidence requirements
```

### Contract Events Timeline UI
```
Date Bucket View:
  - Overdue (red)        <-- VaNi: escalation triggers
  - Today                <-- VaNi: daily briefing
  - Tomorrow             <-- VaNi: preparation reminders
  - This Week            <-- VaNi: workload balancing
  - Next Week            <-- VaNi: resource planning
  - Later                <-- VaNi: trend analysis

Per Event:
  - Status badge (DB-driven, tenant-configurable)
  - Assignment
  - Amount (for billing events)
  - Evidence status       <-- VaNi: completion tracking
```

### Dashboard Pages
```
Contract Stats Dashboard:
  - Total contracts
  - By status (draft, active, etc.)
  - By record type (contract vs RFQ)
  - By contract type (service, NDA, etc.)
  - Total value, currency breakdown          <-- VaNi: business intelligence
```

---

## 6. VaNi Opportunity Map (Prioritized)

### TIER 1: HIGH IMPACT, LOW-MEDIUM EFFORT (Build First)

#### 1.1 Natural Language Contract Search
- **Where:** Contract list page (`GET /api/contracts?search=...`)
- **Current:** Basic text search on title/contract_number
- **VaNi Upgrade:** Semantic search across ALL contract fields
  - "Show me all HVAC contracts expiring next month"
  - "Find contracts with payment issues"
  - "Which vendors haven't responded to RFQs?"
- **Implementation:** Extend existing `/search` N8N workflow for contracts scope
- **New N8N Path:** `/contract-search`
- **Effort:** LOW (reuse existing AI search infrastructure)
- **Data needed:** Contract embeddings (generate from title + description + block names + notes)

#### 1.2 Smart Template Recommendation
- **Where:** Contract creation wizard Step 4 (template selection)
- **Current:** User manually browses templates
- **VaNi Upgrade:** Auto-recommend top 3 templates based on:
  - `contract_type` + `contact_classification`
  - Past successful contracts for this tenant
  - Industry benchmarks
  - Block composition similarity
- **New N8N Path:** `/recommend-template`
- **Effort:** MEDIUM
- **Data needed:** Template usage stats, contract success/completion rates

#### 1.3 Contract Event Smart Scheduling
- **Where:** Contract wizard Step 7 (timeline) + `POST /api/contract-events`
- **Current:** Manual date selection for each event
- **VaNi Upgrade:** Auto-generate optimal schedule:
  - Spread service visits evenly across contract duration
  - Avoid weekends/holidays (tenant-configurable)
  - Cluster visits by geography (minimize travel)
  - Balance technician workload
- **New N8N Path:** `/optimize-schedule`
- **Effort:** MEDIUM
- **Data needed:** Events table, resource availability, geolocation (postgis already available!)

#### 1.4 Daily Briefing / Priority Scoring
- **Where:** Dashboard + Contract Events timeline
- **Current:** Date-bucket summary (overdue/today/tomorrow/etc.)
- **VaNi Upgrade:** Daily AI briefing:
  - "You have 3 overdue events. Event X has highest revenue impact ($5,000 billing milestone)."
  - "Contract #CN-2024-0042 has 2 failed evidence uploads - may need rescheduling."
  - Priority score for each event (combining urgency + revenue + SLA risk)
- **New N8N Path:** `/daily-briefing`
- **Effort:** MEDIUM
- **Data needed:** Events, invoices, evidence status, contract values

#### 1.5 Invoice Collection Intelligence
- **Where:** Contract invoices page (`GET /api/contracts/:id/invoices`)
- **Current:** Manual payment tracking
- **VaNi Upgrade:**
  - Predict payment likelihood per invoice (based on payment history, due date proximity)
  - Suggest optimal collection method (email reminder vs call vs WhatsApp)
  - Auto-generate payment reminders with appropriate tone
  - Cash flow forecasting across all contracts
- **New N8N Path:** `/predict-payment`
- **Effort:** MEDIUM
- **Data needed:** Invoices, receipts, payment patterns, contact preferences

---

### TIER 2: HIGH IMPACT, HIGH EFFORT (Build Next)

#### 2.1 AI-Powered Block Auto-Configuration
- **Where:** Catalog Studio Block Wizard (all steps)
- **Current:** Manual entry of pricing, delivery, business rules
- **VaNi Upgrade:** User describes service in natural language:
  - "AC deep cleaning service, 90 minutes on-site, includes gas check"
  - VaNi auto-fills: price range (from benchmarks), delivery mode (on-site), duration (90 min), checklist (standard AC checklist), warranty (30 days parts), evidence (before/after photos + GPS)
- **New N8N Path:** `/configure-block`
- **Effort:** HIGH (needs industry benchmark data)
- **Data needed:** Existing blocks across tenants (anonymized), industry pricing data

#### 2.2 Contract Risk Scoring
- **Where:** Contract list + detail page (new badge/widget)
- **Current:** No risk assessment
- **VaNi Upgrade:** Real-time risk score (1-100) based on:
  - Payment history (overdue invoices, partial payments)
  - Event completion rate (missed visits, rescheduled events)
  - Contract value vs counterparty track record
  - Contract type risk profile
  - Time remaining vs work remaining
- **New N8N Path:** `/score-risk`
- **Effort:** HIGH (needs scoring model)
- **Data needed:** Full contract history, events, invoices, contact history

#### 2.3 Automated Evidence Validation
- **Where:** Service execution evidence upload (`POST /:ticketId/evidence`)
- **Current:** Manual evidence upload with no validation
- **VaNi Upgrade:**
  - Photo: Verify GPS matches service location (postgis!)
  - Photo: Before/after comparison (vision AI)
  - Document: Extract key data from certificates/IDs
  - Checklist: Auto-verify checklist completion from photos
  - Smart form: Validate form responses against service requirements
- **New N8N Path:** `/validate-evidence`
- **Effort:** HIGH (needs vision AI integration)
- **Data needed:** Evidence uploads, service locations, checklist requirements

#### 2.4 Vendor Matching & Performance Analytics
- **Where:** RFQ vendor selection + Contact cockpit
- **Current:** Manual vendor selection
- **VaNi Upgrade:**
  - For RFQs: Recommend top vendors based on past performance, pricing, specialization
  - Performance dashboard: Response rate, quote competitiveness, delivery quality
  - Alert when vendor performance degrades
- **New N8N Path:** `/vendor-analytics`
- **Effort:** HIGH (needs historical data aggregation)
- **Data needed:** Contract vendors, events, evidence, payment records

#### 2.5 SLA Monitoring & Breach Prevention
- **Where:** Contract detail page + Dashboard (new widget)
- **Current:** No SLA tracking
- **VaNi Upgrade:**
  - Define SLA terms per contract (response time, resolution time, uptime %)
  - Monitor events against SLA terms
  - Alert BEFORE breach (predictive, not reactive)
  - Generate SLA compliance reports
- **New tables needed:** `sla_definitions`, `sla_metrics`
- **New N8N Path:** `/monitor-sla`
- **Effort:** HIGH (needs new DB tables + monitoring infrastructure)

---

### TIER 3: MEDIUM IMPACT, FUTURE ROADMAP

#### 3.1 Equipment/Asset Lifecycle Management
- **Status:** NOT YET IN CODEBASE (no tables, no routes, no UI)
- **Opportunity:** Track physical equipment tied to service contracts
  - Asset registry (serial numbers, locations, warranty dates)
  - Maintenance history per asset
  - Predictive maintenance (VaNi predicts failures from service patterns)
  - Spare part consumption tracking (link to spare blocks)
- **New tables:** `equipment`, `equipment_maintenance`, `equipment_contracts`
- **Effort:** VERY HIGH (entirely new module)

#### 3.2 Contract Auto-Drafting
- **Where:** Contract creation wizard
- **VaNi Upgrade:** Generate contract text from:
  - Template + block composition
  - Past successful contracts
  - Legal requirements per jurisdiction
  - Industry-specific clauses
- **Effort:** HIGH (needs legal AI capabilities)

#### 3.3 Renewal Prediction & Automation
- **Where:** Active contracts nearing expiry
- **VaNi Upgrade:**
  - Predict renewal probability (based on satisfaction signals)
  - Auto-generate renewal contract (pre-filled)
  - Suggest pricing adjustments for renewal
- **Data needed:** Contract lifecycle data, events completion rates, payment history

#### 3.4 WhatsApp Contract Operations Bot
- **Where:** WhatsApp channel (already exists in VaNi AI agent)
- **VaNi Upgrade:** Extend AI agent for:
  - "What's the status of contract CN-2024-0042?"
  - "Show me today's service visits"
  - "Approve payment for invoice INV-001"
  - "Reschedule tomorrow's AC service to Friday"
- **Effort:** MEDIUM (extend existing AI agent)

#### 3.5 Cross-Tenant Industry Benchmarking
- **Where:** New analytics dashboard
- **VaNi Upgrade:** Anonymized benchmarks:
  - Average pricing for service types
  - Typical contract durations
  - Payment terms by industry
  - SLA standards
- **Effort:** HIGH (needs anonymization + aggregation infrastructure)

---

## 7. Missing Infrastructure & Gaps

### Database Tables Needed

| Table | Purpose | Tier | Blocked By |
|-------|---------|------|-----------|
| `ai_recommendations` | Log VaNi suggestions + user acceptance/rejection (feedback loop) | 1 | Nothing |
| `ai_interactions` | Track VaNi usage patterns, session data | 1 | Nothing |
| `contract_embeddings` | Vector embeddings for contract semantic search | 1 | Nothing |
| `sla_definitions` | SLA terms per contract | 2 | Nothing |
| `sla_metrics` | Actual SLA measurements | 2 | `sla_definitions` |
| `equipment` | Physical asset registry | 3 | Nothing |
| `equipment_maintenance` | Maintenance history | 3 | `equipment` |
| `equipment_contracts` | Link equipment to contracts | 3 | `equipment` |

### API Endpoints Needed

| Endpoint | Purpose | Tier |
|----------|---------|------|
| `POST /api/vani/contract-search` | Semantic contract search | 1 |
| `POST /api/vani/recommend-template` | Template recommendations | 1 |
| `POST /api/vani/optimize-schedule` | Smart event scheduling | 1 |
| `POST /api/vani/daily-briefing` | AI daily briefing | 1 |
| `POST /api/vani/predict-payment` | Payment prediction | 1 |
| `POST /api/vani/configure-block` | Block auto-configuration | 2 |
| `POST /api/vani/score-risk` | Contract risk scoring | 2 |
| `POST /api/vani/validate-evidence` | Evidence validation | 2 |
| `POST /api/vani/vendor-analytics` | Vendor performance | 2 |
| `POST /api/vani/monitor-sla` | SLA monitoring | 2 |

### N8N Workflows Needed

| Workflow | Trigger | Input | Output |
|----------|---------|-------|--------|
| Contract Search | API call | query + tenant_id + scope | Ranked contract results |
| Template Recommender | API call | contract_type + classification + tenant_id | Top 3 templates + reasons |
| Schedule Optimizer | API call | contract_id + blocks + duration + constraints | Optimized event schedule |
| Daily Briefing | Cron (morning) | tenant_id | Priority-scored summary |
| Payment Predictor | API call | invoice_id | Prediction + recommendations |
| Block Configurator | API call | natural_language_description | Complete block config |
| Risk Scorer | API call | contract_id | Risk score + factors |
| Evidence Validator | Webhook (on upload) | evidence_file + requirements | Validation result |
| Vendor Analyzer | API call | vendor_id OR contract_id | Performance metrics |
| SLA Monitor | Cron (hourly) | tenant_id | Breach alerts |

### UI Components Needed

| Component | Location | Tier |
|-----------|----------|------|
| VaNi Chat Widget | Global (bottom-right) | 1 |
| AI Recommendation Cards | Contract wizard, block wizard | 1 |
| Risk Score Badge | Contract list, contract detail | 2 |
| SLA Dashboard Widget | Dashboard page | 2 |
| AI Insights Panel | Contract detail sidebar | 1 |
| Smart Search Bar | Contract list header | 1 |
| Daily Briefing Card | Dashboard | 1 |
| Payment Prediction Badge | Invoice list items | 1 |

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
```
Goal: Enable VaNi for ContractNest

1. Create ai_recommendations + ai_interactions tables
2. Create contract_embeddings table
3. Generate embeddings for existing contracts (batch job via pg_cron)
4. Build /api/vani/* route group in contractnest-api
5. Build VaNi Chat Widget component in contractnest-ui
6. Create ContractNest-specific N8N webhook paths in VaNiN8NConfig.ts
```

### Phase 2: Quick Wins (Weeks 3-6)
```
Goal: Deliver Tier 1 features

1. Natural Language Contract Search
   - N8N: contract-search workflow
   - API: POST /api/vani/contract-search
   - UI: Smart Search Bar in contract list

2. Daily Briefing
   - N8N: daily-briefing workflow (cron trigger)
   - API: GET /api/vani/daily-briefing
   - UI: Daily Briefing Card on dashboard

3. Smart Template Recommendation
   - N8N: recommend-template workflow
   - API: POST /api/vani/recommend-template
   - UI: AI Recommendation Cards in contract wizard

4. Invoice Collection Intelligence
   - N8N: predict-payment workflow
   - API: POST /api/vani/predict-payment
   - UI: Payment Prediction Badge on invoices
```

### Phase 3: Core Intelligence (Weeks 6-10)
```
Goal: Deliver Tier 1 + start Tier 2

1. Contract Event Smart Scheduling
   - N8N: optimize-schedule workflow
   - API: POST /api/vani/optimize-schedule
   - UI: "Optimize with VaNi" button in event wizard

2. AI-Powered Block Configuration
   - N8N: configure-block workflow
   - API: POST /api/vani/configure-block
   - UI: NL input field in Block Wizard Step 1

3. Contract Risk Scoring
   - N8N: score-risk workflow
   - API: POST /api/vani/score-risk
   - UI: Risk Score Badge
```

### Phase 4: Advanced Intelligence (Weeks 10-16)
```
Goal: Deliver Tier 2

1. Evidence Validation (vision AI)
2. SLA Monitoring (new tables + monitoring)
3. Vendor Analytics
4. WhatsApp Contract Bot (extend AI agent)
```

### Phase 5: Platform (Weeks 16+)
```
Goal: Tier 3 features

1. Equipment/Asset Management (new module)
2. Contract Auto-Drafting
3. Renewal Prediction
4. Cross-Tenant Benchmarking
```

---

## Appendix A: Current Code Files Audited

### contractnest-api (33 services)
```
services/
  adminJtdService.ts, adminFormsService.ts, adminTenantService.ts
  auditService.ts, billingService.ts, blockService.ts
  businessModelService.ts, catBlocksService.ts, catTemplatesService.ts
  catalogValidationService.ts, contactService.ts, contractEventService.ts
  contractService.ts, eventStatusConfigService.ts, groupsService.ts
  integrationService.ts, jtdService.ts, masterDataService.ts
  onboardingService.ts, paymentGatewayService.ts, productConfigService.ts
  productMasterdataService.ts, resourceService.ts, resourcesService.ts
  serviceCatalogGraphQLService.ts, serviceCatalogService.ts
  serviceExecutionService.ts, storageService.ts, taxSettingsService.ts
  tenantAccountService.ts, tenantContextService.ts, tenantFormsService.ts
  tenantProfileService.ts
```

### contractnest-ui (key type files)
```
types/
  billing.ts, businessModel.ts, catalogStudio.ts, catalogTypes.ts
  catalog/service.ts, contactCockpit.ts, contacts.ts, contractEvents.ts
  contracts.ts, cro.types.ts, eventStatusConfig.ts, groupsTypes.ts
  misc.types.ts, onboardingTypes.ts, productConfig.ts, resources.ts
  seo.types.ts, service-contracts/contract.ts, service-contracts/template.ts
  taxSettings.ts, tenantManagement.ts, user.ts
```

### contractnest-edge (Edge Functions)
```
supabase/functions/
  contract-operations/ (CRUD + RPC)
  service-execution/ (tickets + evidence)
  contract-events/ (timeline + scheduling)
  catalog-studio/ (blocks + templates)
```

---

## Appendix B: VaNi Integration Architecture

```
                    +------------------+
                    |   ContractNest   |
                    |       UI         |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  contractnest-api|
                    |  /api/vani/*     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |    N8N Instance   |
                    | /webhook/vani-*  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v----+  +-----v------+  +----v-------+
     | OpenAI/Claude|  | Supabase   |  |  PostGIS   |
     | (LLM calls) |  | (vector DB)|  | (geo ops)  |
     +-------------+  +------------+  +------------+
```

---

**End of Audit Report**
**Next Steps:** Discuss priorities with the team and begin Phase 1 implementation.
