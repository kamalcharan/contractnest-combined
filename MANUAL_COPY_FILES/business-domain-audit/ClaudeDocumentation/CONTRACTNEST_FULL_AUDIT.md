# ContractNest - Full Business Domain Audit

**Generated: 2026-02-11**
**Scope: Database, API, Frontend, Edge Functions**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema Audit](#database-schema-audit)
3. [API & Backend Audit](#api--backend-audit)
4. [Frontend Audit](#frontend-audit)
5. [Gap Analysis & Recommendations](#gap-analysis--recommendations)

---

# Executive Summary

ContractNest is a **multi-tenant, multi-product SaaS platform** for contract lifecycle management, service execution, invoicing, and business automation. The platform consists of:

| Layer | Technology | Key Stats |
|-------|-----------|-----------|
| **Database** | PostgreSQL + Supabase | 62 tables, 4 schemas, RLS enabled |
| **Backend API** | Node.js + Express + TypeScript | 38 route groups, 150+ endpoints |
| **Edge Functions** | Supabase/Deno serverless | 40+ functions |
| **Frontend** | React + TypeScript + Vite | 52+ pages, 34+ component dirs, 60+ hooks |
| **Mobile** | React Native | Separate submodule |

**Products Served:**
- **ContractNest** (primary) - Contract & service management
- **FamilyKnows** (secondary) - Separate SaaS product

**Key Frameworks:**
- **JTD** (Jobs To Do) - Event-driven notification & automation engine
- **SmartForms** - Dynamic form builder & renderer
- **VaNi** - AI-powered notification & chat engine
- **Catalog Studio** - Block/template builder for contracts

---

# Database Schema Audit

## Overview

- **Total Tables:** 62 (across 4 schemas)
- **Naming Convention:** `t_` = Transactional, `m_` = Master/Reference, `n_` = JTD Framework
- **Security:** Row Level Security (RLS) enabled on all tenant-scoped tables
- **Audit:** All tables have `created_at`, `updated_at`, `created_by`, `updated_by` fields

---

## All Tables by Domain

### 1. JTD Framework (Jobs To Do) - 12 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `n_system_actors` | System users (VaNi AI, System, Webhook) | id, name, actor_type, is_active |
| `n_jtd_event_types` | Master event type definitions | id, name, category (communication/scheduling/action) |
| `n_jtd_channels` | Communication channels | id, name (email/sms/whatsapp/push/inapp) |
| `n_jtd_statuses` | Status definitions per event type | id, event_type_id, name, is_terminal |
| `n_jtd_status_flows` | Valid status transitions | id, from_status_id, to_status_id, is_valid |
| `n_jtd_source_types` | What triggers JTD creation | id, name (user_invite, contract_created, etc.) |
| `n_jtd_tenant_config` | Per-tenant JTD settings | tenant_id, is_live, vani_config |
| `n_jtd_tenant_source_config` | Per-tenant, per-source overrides | tenant_id, source_type_id, overrides |
| `n_jtd_templates` | Message templates for channels | id, channel_id, subject, body, variables |
| `n_jtd` | Main JTD records | id, tenant_id, event_type_id, status, scheduled_at, executed_at |
| `n_jtd_status_history` | Status change audit trail | id, jtd_id, from_status, to_status, duration_ms |
| `n_jtd_history` | Field change audit trail | id, jtd_id, field_name, old_value, new_value |

**Capabilities:** Retry logic, scheduling, cost tracking, provider integration (Sendgrid, MSG91, Firebase), environment isolation (is_live flag)

---

### 2. Contract Management - 6 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `t_contracts` | Core contract records | id, tenant_id, contract_number, title, status, contract_type, buyer_id, currency, total_value, version |
| `t_contract_events` | Event records for service delivery | id, contract_id, event_type, status, scheduled_date |
| `t_contract_event_audit` | Event audit trail | id, event_id, action, changed_by, timestamp |
| `t_contract_access` | Access control mapping | id, contract_id, user_id, access_level |
| `m_event_status_config` | Event status configuration per tenant | id, tenant_id, status_name, color, icon |
| `m_event_status_transitions` | Valid event status transitions | id, from_status, to_status, is_valid |

**Contract Types:** fixed_price, time_and_materials, retainer, milestone, subscription
**Contract Statuses:** draft → pending_review → pending_acceptance → active → completed/cancelled/expired

---

### 3. Invoicing & Payments - 4 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `t_invoices` | Invoice records (AR/AP) | id, contract_id, invoice_number, amount, tax_total, status, due_date |
| `t_invoice_receipts` | Payment receipts | id, invoice_id, amount, payment_method, receipt_date |
| `t_contract_payment_requests` | Payment request generation | id, contract_id, amount, status |
| `t_contract_payment_events` | Payment transaction history | id, payment_request_id, event_type, amount |

**Invoice Statuses:** unpaid, partially_paid, paid, overdue, cancelled
**Payment Modes:** prepaid, EMI (installments), defined cycle
**Payment Methods:** cash, bank_transfer, UPI, cheque, card

---

### 4. Service Execution - 4 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `t_service_tickets` | Field-executable work units (TKT-XXXXX) | id, contract_id, ticket_number, status, version |
| `t_service_ticket_events` | Junction: tickets ↔ contract events | id, ticket_id, event_id |
| `t_service_evidence` | Photo/document uploads | id, ticket_id, file_url, evidence_type |
| `t_audit_log` | General audit trail | id, user_id, action, resource_type, resource_id |

**Ticket Lifecycle:** created → assigned → in_progress → evidence_uploaded → completed/cancelled

---

### 5. SmartForms - 5 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `m_form_templates` | Global form definitions | id, name, schema (JSONB), category, form_type |
| `m_form_tenant_selections` | Tenant activates forms | id, tenant_id, form_template_id, is_active |
| `m_form_template_mappings` | Maps forms to contracts/events | id, tenant_id, form_template_id, contract_id |
| `m_form_submissions` | Completed form responses | id, form_template_id, tenant_id, data (JSONB) |
| `m_form_attachments` | File uploads linked to submissions | id, submission_id, file_url |

**Form Categories:** calibration, inspection, audit, maintenance, clinical, pharma, compliance, onboarding, general
**Form Types:** pre_service, post_service, during_service, standalone

---

### 6. Master Data & Catalog - 9 Tables

| Table | Purpose |
|-------|---------|
| `m_block_categories` | Document block categories (hierarchical) |
| `m_block_masters` | Block/clause templates with styling |
| `m_block_variants` | Variants of block templates |
| `m_catalog_categories` | Service catalog categories |
| `m_catalog_industries` | Industry classifications |
| `m_catalog_items` | Catalog service items |
| `m_catalog_resources` | Resources (equipment, labor, materials) |
| `m_catalog_pricing_templates` | Pricing rule templates |
| `m_catalog_resource_templates` | Resource requirement templates |

---

### 7. Tenant & User Management - 10 Tables

| Table | Purpose |
|-------|---------|
| `t_tenants` | Multi-tenant organization records |
| `t_user_tenants` | User-Tenant relationship with roles |
| `t_user_profiles` | User profile information |
| `t_user_invitations` | Pending user invitations |
| `t_tenant_profiles` | Tenant organization details |
| `t_user_tenant_roles` | Role assignments per tenant |
| `t_user_auth_methods` | Authentication methods |
| `t_tenant_domains` | Custom domain mappings |
| `t_integration_providers` | Third-party integrations |
| `t_integration_types` | Available integration types |

---

### 8. Contact Management - 3 Tables

| Table | Purpose |
|-------|---------|
| `t_contacts` | Contact/party records (individuals, organizations) |
| `t_contact_channels` | Communication channels (email, phone, etc.) |
| `t_contact_addresses` | Address information |

---

### 9. Tax & Billing - 3 Tables

| Table | Purpose |
|-------|---------|
| `t_tax_rates` | Tax rate definitions |
| `t_tax_settings` | Tenant tax configuration |
| `t_tax_info` | Tax information per contact/entity |

---

### 10. Business Model (Subscription/Billing) - 7 Tables

| Table | Purpose |
|-------|---------|
| `t_bm_pricing_plan` | Pricing plan definitions |
| `t_bm_plan_version` | Pricing plan versioning |
| `t_bm_subscription_usage` | Usage tracking |
| `t_bm_tenant_subscription` | Tenant subscription records |
| `t_bm_invoice` | Business model invoicing |
| `t_bm_feature_reference` | Features in plans |
| `t_bm_notification_reference` | Notification settings |

---

### 11. System & Utilities - 4 Tables

| Table | Purpose |
|-------|---------|
| `t_sequence_counters` | Sequence number tracking (invoice #, ticket #, receipt #) |
| `t_tenant_files` | File references/metadata |
| `t_tenant_regions` | Tenant regional settings |
| `m_permissions` / `t_role_permissions` | Permission definitions & role mappings |

---

## Key Database Features

### Row Level Security (RLS)
- Pattern: `tenant_id IN (SELECT tenant_id FROM t_user_tenants WHERE user_id = auth.uid())`
- Master tables have public read access
- Service role has full access for Edge Functions

### Indexes (100+)
- Tenant + status lookups (JTD queue processing)
- Scheduled event retrieval
- Retry queue with criteria
- Due date ranges (invoices)
- GIN indexes on JSONB fields

### Stored Functions & RPCs
- JTD: `create_jtd()`, `transition_jtd_status()`, `retry_failed_jtd()`
- Contracts: `create_contract_rpc()`, `update_contract_status_rpc()`
- Invoicing: `create_invoice_rpc()`, `record_receipt_rpc()`, `generate_invoice_number()`
- Service: `create_service_ticket_rpc()`, `complete_service_ticket_rpc()`

---

# API & Backend Audit

## Architecture

```
Client → Express API (Node.js/TypeScript)
           ├─ Middleware (auth, tenant, rate limit, validation)
           ├─ Controllers (request handling)
           ├─ Services (business logic)
           └─ Edge Functions (Supabase/Deno) → PostgreSQL
```

---

## Route Summary (38 Route Groups, 150+ Endpoints)

| # | Route Base | Path | Purpose | Auth |
|---|-----------|------|---------|------|
| 1 | Storage | `/api/storage` | File upload/download | Bearer |
| 2 | System | `/api` | Health, version, diagnostics | Public |
| 3 | Card Proxy | `/card`, `/vcard` | Public card endpoints | Public |
| 4 | Auth | `/api/auth` | User authentication | Mixed |
| 5 | FK Auth | `/api/FKauth` | FamilyKnows auth | Bearer |
| 6 | FK Onboarding | `/api/FKonboarding` | FK onboarding | Bearer |
| 7 | Tenants | `/api/tenants` | Tenant CRUD | Bearer |
| 8 | Master Data | `/api/masterdata` | Categories, sequences | Bearer |
| 9 | Tenant Profile | `/api` | Tenant profile | Bearer |
| 10 | Integrations | `/api` | Third-party integrations | Bearer |
| 11 | Invitations | `/api/users` | User invitations | Bearer |
| 12 | Users | `/api/users` | User management | Bearer |
| 13 | Contacts | `/api/contacts` | Contact management | Bearer |
| 14 | Resources | `/api/resources` | Catalog resources | Bearer |
| 15 | Tax Settings | `/api/tax-settings` | Tax configuration | Bearer |
| 16 | Blocks | `/api/service-contracts/blocks` | Contract blocks | Bearer |
| 17 | Product Masterdata | `/api/product-masterdata` | Product-specific data | Bearer |
| 18 | Service Catalog | `/api/service-catalog` | Service definitions | Bearer |
| 19 | Groups | `/api` | Business groups | Bearer |
| 20 | Sequences | `/api/sequences` | Sequence generators | Bearer |
| 21 | Seeds | `/api/seeds` | Tenant seeds/presets | Bearer |
| 22 | Catalog Studio | `/api/catalog-studio` | Catalog management | Bearer |
| 23 | Billing | `/api` | Billing/subscription | Bearer |
| 24 | Tenant Context | `/api/tenant-context` | Tenant state & credits | Bearer |
| 25 | Contracts | `/api/contracts` | Contract & RFQ CRUD | Mixed |
| 26 | Contract Events | `/api/contract-events` | Event history | Bearer |
| 27 | Event Status Config | `/api/event-status-config` | Event status setup | Bearer |
| 28 | Service Execution | `/api/service-execution` | Service fulfillment | Bearer |
| 29 | Products | `/api/products` | Product definitions | Bearer |
| 30 | Business Model | `/api/business-model` | Plans and pricing | Bearer |
| 31 | Product Config | `/api/v1/product-config` | Business Model v2 | Bearer |
| 32 | JTD Events | `/api/jtd` | Journey/event tracking | Mixed |
| 33 | Onboarding | `/api/onboarding` | User onboarding | Bearer |
| 34 | Admin Tenants | `/api/admin/tenants` | Admin tenant ops | Bearer + Admin |
| 35 | Admin JTD | `/api/admin/jtd` | Admin JTD management | Bearer + Admin |
| 36 | Admin Forms | `/api/admin/forms` | Admin smart forms | Bearer + Admin |
| 37 | Tenant Forms | `/api/forms` | Smart forms UI | Bearer |
| 38 | Tenant Account | `/api/tenant` | Tenant settings & close | Bearer |

---

## Key Route Details

### Auth Routes (`/api/auth`) - 15 endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/login` | Public | User login |
| POST | `/register` | Public | User registration |
| POST | `/register-with-invitation` | Public | Register via invite code |
| POST | `/refresh-token` | Public | Refresh JWT |
| POST | `/signout` | Bearer | Sign out |
| POST | `/reset-password` | Public | Send reset email |
| POST | `/change-password` | Bearer | Change password |
| POST | `/verify-password` | Bearer | Verify current password |
| POST | `/complete-registration` | Bearer | Complete registration |
| GET | `/user` | Bearer | Get current user |
| PATCH | `/preferences` | Bearer | Update preferences |
| POST | `/google` | Public | Initiate Google OAuth |
| POST | `/google-callback` | Public | OAuth callback |
| POST | `/google-link` | Bearer | Link Google account |
| POST | `/google-unlink` | Bearer | Unlink Google account |

### Contracts Routes (`/api/contracts`) - 14 endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/public/validate` | Public | Validate via CNAK |
| POST | `/public/respond` | Public | Accept/reject |
| POST | `/claim` | Bearer | Claim by CNAK |
| GET | `/` | Bearer | List with filters |
| GET | `/stats` | Bearer | Dashboard stats |
| GET | `/{id}` | Bearer | Detail view |
| POST | `/` | Bearer | Create contract/RFQ |
| PUT | `/{id}` | Bearer | Update (optimistic concurrency) |
| PATCH | `/{id}/status` | Bearer | Status transition |
| DELETE | `/{id}` | Bearer | Soft delete (draft/cancelled) |
| POST | `/{id}/notify` | Bearer | Send sign-off notification |
| GET | `/{id}/invoices` | Bearer | Contract invoices |
| POST | `/{id}/invoices/record-payment` | Bearer | Record payment |

### Contacts Routes (`/api/contacts`) - 13 endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | Bearer | List with filters |
| GET | `/stats` | Bearer | Statistics |
| POST | `/` | Bearer | Create contact |
| POST | `/search` | Bearer | Advanced search |
| POST | `/duplicates` | Bearer | Check duplicates |
| GET | `/{id}/cockpit` | Bearer | Contact dashboard |
| GET | `/{id}` | Bearer | Detail view |
| PUT | `/{id}` | Bearer | Update |
| PATCH | `/{id}/status` | Bearer | Status update |
| DELETE | `/{id}` | Bearer | Soft/hard delete |
| POST | `/{id}/invite` | Bearer | Send invitation |

### Billing Routes (`/api/billing`) - 12 endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/status/{tenantId}` | Billing status |
| GET | `/subscription/{tenantId}` | Subscription details |
| GET | `/credits/{tenantId}` | Credit balances |
| GET | `/usage/{tenantId}` | Usage summary |
| GET | `/invoice-estimate/{tenantId}` | Estimated invoice |
| GET | `/alerts/{tenantId}` | Billing alerts |
| GET | `/topup-packs` | Available topup packs |
| POST | `/usage` | Record usage event |
| POST | `/credits/deduct` | Deduct credits |
| POST | `/credits/add` | Add credits |
| POST | `/credits/topup` | Purchase topup |
| POST | `/credits/check` | Check availability |

---

## Middleware Stack

| Middleware | Purpose | Key Features |
|-----------|---------|--------------|
| `auth.ts` | Token verification | Multi-product Supabase, fallback to Edge |
| `tenantContext.ts` | Tenant ID extraction | x-tenant-id header or path param |
| `productContext.ts` | Product detection | x-product-code header, defaults to contractnest |
| `requestContext.ts` | Request metadata | Request ID, session ID, timestamps |
| `fileUpload.ts` | Multer config | File type validation, size limits |
| `error.ts` | Global error handling | Sentry integration, normalized responses |
| `auditMiddleware.ts` | API operation logging | User, tenant, operation, result |
| `validateRequest.ts` | Request validation | Joi/express-validator schemas |
| `security/hmac.ts` | HMAC signatures | Internal service-to-service auth |

---

## Services (Business Logic)

| Service | Purpose |
|---------|---------|
| `contractService.ts` | Contract CRUD via HMAC-signed Edge Function calls |
| `contactService.ts` | Contact management with validation |
| `serviceCatalogService.ts` | Service definitions + version tracking |
| `resourceService.ts` | Catalog resources + sequence management |
| `billingService.ts` | Credit transactions, usage recording |
| `tenantAccountService.ts` | Tenant account management, close account |
| `tenantContextService.ts` | Tenant state aggregation with 30s cache |
| `integrationService.ts` | Third-party OAuth & webhooks |
| `jtdService.ts` | Event/notification tracking, N8N integration |
| `email.service.ts` | Nodemailer integration |
| `sms.service.ts` | Gupshup SMS integration |
| `whatsapp.service.ts` | Gupshup WhatsApp integration |
| `auditService.ts` | Audit trail logging |
| `onboardingService.ts` | Tenant setup & role assignment |
| `paymentGatewayService.ts` | Stripe/payment processing |

---

## Edge Functions (40+)

| Function | Purpose | Auth |
|----------|---------|------|
| `auth/` | Authentication (register, login, OAuth) | Mixed |
| `contracts/` | Contract CRUD | HMAC + tenant |
| `contacts/` | Contact management | Bearer |
| `contract-events/` | Event history | Bearer |
| `service-catalog/` | Service management | Bearer |
| `resources/` | Resource management | Bearer |
| `masterdata/` | Master data operations | Bearer |
| `billing/` | Credit/billing operations | Bearer |
| `plans/` | Subscription plans | Bearer |
| `onboarding/` | User onboarding | Bearer |
| `admin-tenant-management/` | Admin tenant ops | Bearer + Admin |
| `admin-jtd-management/` | Admin JTD ops | Bearer + Admin |
| `jtd-worker/` | Background JTD processing | Internal |
| `payment-gateway/` | Payment processing | Bearer |
| `payment-webhook/` | Payment webhooks | Signature |
| `integrations/` | Third-party integrations | Bearer |

---

## Security Patterns

| Pattern | Implementation |
|---------|---------------|
| Bearer Token | JWT via Supabase |
| Tenant Isolation | x-tenant-id + RLS |
| Role-Based Access | Edge Function role check |
| HMAC Signing | Internal service-to-service |
| Rate Limiting | express-rate-limit (100 req/15min general, 30 req/15min create) |
| Idempotency | x-idempotency-key header |
| Optimistic Concurrency | Version field on updates |
| Soft Deletes | deleted_at timestamp |

---

# Frontend Audit

## Architecture

```
React 18 + TypeScript + Vite
├── Routing: React Router v6
├── State: TanStack Query + React Context
├── Styling: Tailwind CSS + 11 Themes
├── HTTP: Axios (custom wrapper)
├── Error Tracking: Sentry
├── Analytics: Custom + Google Tag Manager
└── Toast: VaNiToast (custom)
```

---

## Pages by Domain (52+ pages)

### Contracts (24 files)
- **Hub:** ContractsHubPage, ContractDetailPage
- **Creation Wizard (8 steps):** ContractType → Builder → Recipient → Billing → Timeline → Acceptance → Review → Send
- **Templates:** Template list, preview, designer, analytics
- **Document:** PDF preview, PDF viewer, invoice view
- **Public:** Contract review, claim, invite sellers
- **Operations:** OpsCockpitPage (service execution tracking)

### Catalog (3 files)
- CatalogPage (list), ServiceViewPage (detail), CatalogServiceFormPage (CRUD)

### Catalog Studio (4 directories)
- Configure, Blocks (new/edit), Templates, Templates list

### Contacts (6 files)
- ContactsPage (list), ContactViewPage (detail), ContactCreateForm

### Business Model / Billing (10+ directories)
- Admin: Pricing plans (CRUD, versions, migration), Billing dashboard, Invoices
- Tenant: Pricing plans (shop), Subscription management

### Settings (15+ pages)
- Business Profile, Users/Team, Storage, LOV (Master Data), Tax Settings, Sequencing, Resources, Integrations, Smart Forms

### Onboarding (12 steps)
- Welcome → User Profile → Theme → Storage → Business Basic → Branding → Preferences → Sequence Numbers → Master Data → Complete

### VaNi / Notifications (16+ files)
- Dashboard, Jobs, Business Events, Templates, Channels, Analytics, Webhooks, AR, Service Schedule, Rules, Chat

### Admin (6+ files)
- JTD: Queue Monitor, Tenant Operations, Event Explorer, Worker Health
- Smart Forms: Admin page, Form Editor
- Subscription Management

### Public & Misc (10+ files)
- Landing, Playground, 404, Maintenance, Unauthorized, Session Conflict, Offline, Error, API Down

---

## Key Components

### Layout & Navigation
- `MainLayout.tsx` - Primary layout (sidebar + header + content)
- `Sidebar.tsx` - Navigation sidebar
- `Header.tsx` - Top header
- `TenantSwitcher.tsx` - Workspace switcher

### Common UI
- `VaNiToast.tsx` - Toast notification system
- `UnifiedLoader.tsx` - Spinner/loader
- `CardSkeleton.tsx`, `DetailsSkeleton.tsx`, `FormSkeleton.tsx`, `TableSkeleton.tsx` - Skeletons
- `FileUploader.tsx` - File upload widget
- `ErrorBoundary.tsx` - Error boundary
- `ProtectedRoute.tsx` - Auth route guard
- `LockScreen.tsx` - Session lock

### Contract Components (35+)
- ContractCard, ContractStatsGrid, PipelineBar, RecentContractsCard
- ContractWizard (21 step components), FloatingActionIsland, ContractPreviewPanel
- TimelineTab, ContractTab, EvidenceTab, AuditTab, OperationsTab
- ServiceExecutionDrawer, ServiceTicketDetail, RecordPaymentDialog

### Contact Components (20+)
- ContactCockpitPanel, ContactCockpitStatsBar, ActionIsland, ProfileDrawer
- Individual/Corporate profile forms, Channel management, Address book

### Catalog Studio Components (40+)
- BlockCard, BlockGrid, BlockLibraryMini, BlockEditorPanel
- BlockWizard (12 step types), TemplateBuilder, TemplatePreview

---

## State Management

### Contexts
| Context | Purpose |
|---------|---------|
| `AuthContext` | Login/logout, user, tenants, environment (live/test), lock screen |
| `ThemeContext` | Theme selection (11 themes), dark mode toggle |
| `MasterDataContext` | Cache invalidation for LOV categories |
| `ContractBuilderContext` | Contract creation wizard state |
| `TenantContext` | Tenant-specific configuration |
| `OnboardingContext` | Onboarding flow state |
| `FormEditorContext` | Smart form editing state |

### TanStack Query Hooks (60+)

**Query Hooks:**
- `useContractQueries` - Contracts (list, detail, stats)
- `useServiceCatalogQueries` - Services (catalog items, statistics)
- `useCatBlocks` - Catalog blocks
- `useCatTemplates` - Catalog templates
- `useContactsResource` - Contacts
- `useContactCockpit` - Contact cockpit
- `useBusinessModelQueries` - Plans & subscriptions
- `useInvoiceQueries` - Invoices
- `useResourceQueries` - Resources
- `useGroupQueries` - Customer groups
- `useOnboarding` - Onboarding status
- `useContractEventQueries` - Contract events
- `useEventStatusConfigQueries` - Event configuration
- `useServiceExecution` - Service execution
- Plus 10+ more...

**Mutation Hooks:**
- `useServiceCatalogMutations` - Service CRUD
- `useBulkServiceCatalogMutations` - Bulk operations
- `useCatBlocksMutations` - Block CRUD
- `useCatTemplatesMutations` - Template CRUD
- Contract, Contact, Billing mutations via inline patterns

---

## Type Definitions

### Contract Types
```typescript
CONTRACT_RECORD_TYPES: 'contract' | 'rfq'
CONTRACT_STATUSES: 'draft' | 'pending_review' | 'pending_acceptance' |
                   'active' | 'completed' | 'cancelled' | 'expired' |
                   'sent' | 'quotes_received' | 'awarded' | 'converted_to_contract'
CONTRACT_TYPES: 'service' | 'partnership' | 'nda' | 'purchase_order' |
                'lease' | 'subscription'
ACCEPTANCE_METHODS: 'e_signature' | 'auto' | 'manual_upload' | 'in_person'
```

### Contact Types
```typescript
CONTACT_TYPES: 'individual' | 'corporate' | 'contact_person'
CONTACT_STATUSES: 'active' | 'inactive' | 'archived'
CLASSIFICATIONS: 'vendor' | 'client' | 'partner' | 'employee'
```

### Service Types
```typescript
SERVICE_TYPES: 'independent' | 'resource_based'
PRICING_TYPES: 'fixed' | 'unit_price' | 'price_range'
TAX_INCLUSION: 'inclusive' | 'exclusive'
```

### Block Types
```typescript
BLOCK_TYPES: 'service' | 'billing' | 'content' | 'media' |
             'document' | 'checklist' | 'spare' | 'timeline'
```

---

## API Service Layer

### Main API Client (`/src/services/api.ts`)
- Axios instance with interceptors
- Token injection (Authorization header)
- x-tenant-id, x-product headers
- Error handling & redirects
- API health detection
- Multi-product support (contractnest / familyknows)

### Service URLs (`/src/services/serviceURLs.ts`)
- 70KB+ endpoint definitions organized by feature
- Contracts, Services, Contacts, Resources, Master Data, Onboarding, Subscriptions, etc.

---

## Theme System (11 Themes)

| Theme | Description |
|-------|-------------|
| BharathaVarshaTheme | Default (Indian market) |
| ClassicElegantTheme | Classic styling |
| PurpleToneTheme | Purple-focused |
| ContractNestTheme | Brand theme |
| ModernBoldTheme | Bold modern |
| ModernBusinessTheme | Business focused |
| ProfessionalRedefinedTheme | Professional |
| SleekCoolTheme | Sleek styling |
| TechAITheme | AI/tech focused |
| TechFutureTheme | Futuristic |
| TechySimpleTheme | Simple tech |

Each theme provides: brand colors (primary/secondary/tertiary/alternate), utility colors, accent colors, semantic colors (success/error/warning/info), and dark mode variants.

---

## Auth Flow

1. **Login:** POST `/api/auth/login` → JWT token
2. **Token Storage:** localStorage (access_token, refresh_token)
3. **Request Auth:** Axios interceptor adds `Authorization: Bearer <token>`
4. **Session Lock:** 16-min idle → lock screen (max 5 unlock attempts)
5. **Session Timeout:** 15-min total → forced logout
6. **Environment Toggle:** Live/Test mode with confirmation modal

---

# Gap Analysis & Recommendations

## Strengths

1. **Comprehensive Multi-Tenant Architecture** - Strong RLS policies, tenant isolation at every layer
2. **Production-Ready Patterns** - Optimistic concurrency, idempotency, rate limiting
3. **Full Audit Trail** - Status history, field change tracking, duration logging
4. **Flexible Notification System** - JTD framework supports multiple channels with retry logic
5. **SmartForms** - Dynamic form builder enables configurability without code changes
6. **Strong Type Safety** - TypeScript throughout frontend and backend
7. **Scalable Query Layer** - TanStack Query with proper cache invalidation
8. **11 Themes** - Significant brand customization capability
9. **Multi-Product Support** - Single codebase serves ContractNest + FamilyKnows

## Gaps & Recommendations

### 1. Database Layer

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No explicit backup/archival strategy visible | Medium | Add `archived_at` columns + archival jobs for old JTD/audit records |
| No database partitioning for large tables | Low | Consider partitioning `t_audit_log`, `n_jtd_history` by date |
| Missing composite indexes on some multi-column queries | Low | Audit slow queries and add targeted indexes |

### 2. API Layer

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No API versioning strategy | Medium | Add `/api/v1/`, `/api/v2/` prefix for breaking changes |
| Billing routes lack explicit auth middleware | High | Add Bearer + tenant validation to billing endpoints |
| No request size limits documented | Low | Add body-parser limits (e.g., 10MB for file uploads, 1MB for JSON) |
| No API documentation (OpenAPI/Swagger) | Medium | Generate OpenAPI spec from route definitions |

### 3. Frontend Layer

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No i18n framework active | Medium | Activate i18n for multi-language support (framework exists but unused) |
| No E2E testing visible | Medium | Add Playwright/Cypress tests for critical flows |
| No offline capability | Low | Enhance service worker for offline contract viewing |
| Large serviceURLs.ts file (70KB) | Low | Split by domain for better maintainability |

### 4. Security

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No input sanitization layer documented | High | Add XSS/SQL injection sanitization middleware |
| No API key rotation policy | Medium | Implement key rotation for third-party integrations |
| No Content Security Policy (CSP) headers | Medium | Add CSP headers to prevent XSS |
| No WAF/DDoS protection documented | Medium | Add Cloudflare WAF or equivalent |

### 5. Operations

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No health check aggregation | Medium | Add `/health/deep` endpoint checking all dependencies |
| No structured logging (JSON) | Medium | Switch to structured JSON logging for better observability |
| No circuit breaker for external services | Low | Add circuit breaker for Gupshup, SendGrid, etc. |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Database Tables | 62 |
| API Route Groups | 38 |
| API Endpoints | 150+ |
| Edge Functions | 40+ |
| Frontend Pages | 52+ |
| Component Directories | 34+ |
| Custom Hooks | 60+ |
| Type Definition Files | 20+ |
| Services/API Clients | 15+ |
| Middleware | 12+ |
| Themes | 11 |
| Controllers | 30+ |
| Validators | 18+ |

---

**End of Audit**
