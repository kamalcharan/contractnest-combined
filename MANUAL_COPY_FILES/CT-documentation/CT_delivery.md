# Catalog Studio - Delivery Tracker

> **Purpose**: Track planned vs completed work for each sprint
> **PRD Reference**: `ClaudeDocumentation/contractUI/CatalogStudio-SprintPlan-v1.0.md`
> **Database Schema**: `ClaudeDocumentation/contractUI/CatalogStudio-Database-Schema-v1.0.md`
> **Last Updated**: January 2026

---

## Quick Status

| Sprint | Status | Focus | Planned | Completed | Notes |
|--------|--------|-------|---------|-----------|-------|
| **Sprint 1** | 🔵 In Progress | Foundation | Blocks + Resources + Buyers | Blocks (partial) | Edge + API + UI done for blocks |
| Sprint 2 | ⚪ Pending | Core Flow | Templates + Contracts | Templates (partial) | Edge + API done, UI in progress |
| Sprint 3 | ⚪ Pending | Execution | Tasks + Automation | - | Depends on Sprint 2 |

**Legend**: 🔵 In Progress | ✅ Completed | ⚪ Pending | 🔴 Blocked

---

## Sprint 1: Foundation

**Status**: 🔵 In Progress
**Target**: Core data infrastructure - Blocks, Resources, Asset Types, Buyers
**Started**: January 2026

### 1.1 Database Schema

| # | Deliverable | Table Name | Status | Notes |
|---|-------------|------------|--------|-------|
| 1 | Blocks table | `cat_blocks` | ✅ Done | Full schema with pricing modes |
| 2 | Asset Types table | `cat_asset_types` | ✅ Done | Property/appliance variants |
| 3 | Buyers table | `cat_buyers` | ⚪ Pending | Customer records |
| 4 | RLS Policies | All `cat_*` tables | ✅ Done | Tenant isolation |
| 5 | Indexes | All `cat_*` tables | ✅ Done | Performance indexes |

### 1.2 Edge Functions (contractnest-edge)

| # | Function | Path | Status | Features |
|---|----------|------|--------|----------|
| 1 | cat-blocks | `/cat-blocks` | ✅ Done | Full CRUD, global/seed/tenant blocks, HMAC auth |
| 2 | resources | `/resources` | ⚪ Pending | Reuse existing `t_category_resources_master` |
| 3 | asset-types | `/asset-types` | ⚪ Pending | Asset type CRUD |
| 4 | buyers | `/buyers` | ⚪ Pending | Buyer management |

### 1.3 API Layer (contractnest-api)

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | CatalogStudio routes | `src/routes/catalogStudioRoutes.ts` | ✅ Done |
| 2 | CatalogStudio controller | `src/controllers/catalogStudioController.ts` | ✅ Done |
| 3 | CatalogStudio service | `src/services/catalogStudioService.ts` | ✅ Done |

### 1.4 UI Components (contractnest-ui)

| # | Component | Location | Status | Notes |
|---|-----------|----------|--------|-------|
| 1 | BlockWizard | `components/catalog-studio/BlockWizard/` | ✅ Done | Multi-step wizard |
| 2 | TypeSelectionStep | `BlockWizard/steps/TypeSelectionStep.tsx` | ✅ Done | 8 block types |
| 3 | BasicInfoStep | `BlockWizard/steps/BasicInfoStep.tsx` | ✅ Done | Name, icon, description |
| 4 | PricingStep (Service) | `BlockWizard/steps/service/PricingStep.tsx` | ✅ Done | 45KB - All pricing modes |
| 5 | DeliveryStep (Service) | `BlockWizard/steps/service/DeliveryStep.tsx` | ✅ Done | Duration, location, assignment |
| 6 | EvidenceStep (Service) | `BlockWizard/steps/service/EvidenceStep.tsx` | ✅ Done | Photo, GPS, signature |
| 7 | BusinessRulesStep | `BlockWizard/steps/service/BusinessRulesStep.tsx` | ✅ Done | SLA, automation rules |
| 8 | Billing steps | `BlockWizard/steps/billing/` | ✅ Done | Structure, Schedule, Automation |
| 9 | Spare steps | `BlockWizard/steps/spare/` | ✅ Done | Inventory, Fulfillment |
| 10 | Checklist steps | `BlockWizard/steps/checklist/` | ✅ Done | Items, Settings |
| 11 | Content steps | `BlockWizard/steps/content/` | ✅ Done | Content, Settings |
| 12 | Media steps | `BlockWizard/steps/media/` | ✅ Done | Upload, Display |
| 13 | Document steps | `BlockWizard/steps/document/` | ✅ Done | File settings |
| 14 | BlockCard | `components/catalog-studio/BlockCard.tsx` | ✅ Done | Block display card |
| 15 | BlockGrid | `components/catalog-studio/BlockGrid.tsx` | ✅ Done | Grid layout |
| 16 | IconPicker | `components/catalog-studio/IconPicker.tsx` | ✅ Done | Emoji/icon selection |
| 17 | CategoryPanel | `components/catalog-studio/CategoryPanel.tsx` | ✅ Done | Category sidebar |
| 18 | ResourceManager | `components/resources/` | ⚪ Pending | Resource CRUD |
| 19 | BuyerList | `components/buyers/` | ⚪ Pending | Buyer management |

### 1.5 UI Pages (contractnest-ui)

| # | Page | Location | Status |
|---|------|----------|--------|
| 1 | Blocks list | `pages/catalog-studio/blocks.tsx` | ✅ Done |
| 2 | Create block | `pages/catalog-studio/blocks/new.tsx` | ✅ Done |
| 3 | Edit block | `pages/catalog-studio/blocks/[id]/edit.tsx` | ✅ Done |
| 4 | Resources page | `pages/catalog-studio/resources.tsx` | ⚪ Pending |
| 5 | Buyers page | `pages/catalog-studio/buyers.tsx` | ⚪ Pending |

### 1.6 Sprint 1 Remaining Work

| # | Task | Priority | Blocker |
|---|------|----------|---------|
| 1 | Create `cat_buyers` edge function | High | None |
| 2 | Create buyers API routes | High | Edge function |
| 3 | Create BuyerList UI components | Medium | API |
| 4 | Create useResources hook (connect to existing API) | Medium | None |
| 5 | Create ResourceManager UI | Medium | Hook |
| 6 | Create useAssetTypes hook | Low | None |
| 7 | Connect BlockWizard to real API (remove dummy data) | High | None |

---

## Sprint 2: Core Flow

**Status**: ⚪ Pending (Partial Work Done)
**Target**: Templates + Contracts with drag-drop builder and buyer view
**Depends On**: Sprint 1

### 2.1 Database Schema

| # | Deliverable | Table Name | Status | Notes |
|---|-------------|------------|--------|-------|
| 1 | Templates table | `cat_templates` | ✅ Done | Reusable block assemblies |
| 2 | Contracts table | `cat_contracts` | ⚪ Pending | Buyer-specific instances |
| 3 | Contract Items | JSONB in contracts | ⚪ Pending | Line items |

### 2.2 Edge Functions (contractnest-edge)

| # | Function | Path | Status | Features |
|---|----------|------|--------|----------|
| 1 | cat-templates | `/cat-templates` | ✅ Done | Full CRUD, system/public templates, copy |
| 2 | contracts | `/contracts` | ⚪ Pending | Contract CRUD |
| 3 | contracts-public | `/contracts/:id/public` | ⚪ Pending | Buyer view (no auth) |
| 4 | contracts-actions | `/contracts/:id/send` | ⚪ Pending | Send, accept, sign |

### 2.3 API Layer (contractnest-api)

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Template routes | In `catalogStudioRoutes.ts` | ✅ Done |
| 2 | Contract routes | `src/routes/contractRoutes.ts` | ⚪ Pending |

### 2.4 UI Components (contractnest-ui)

| # | Component | Location | Status | Notes |
|---|-----------|----------|--------|-------|
| 1 | Template list page | `pages/catalog-studio/templates-list.tsx` | ✅ Done | 88KB |
| 2 | Template builder | `pages/catalog-studio/template.tsx` | ✅ Done | 101KB |
| 3 | TemplatePreviewModal | `pages/catalog-studio/components/TemplatePreviewModal.tsx` | ✅ Done | Preview |
| 4 | TemplatePDFExport | `pages/catalog-studio/components/TemplatePDFExport.tsx` | ✅ Done | PDF export |
| 5 | ContractWizard | `components/contracts/ContractWizard.tsx` | ⚪ Pending | 6-step wizard |
| 6 | BuyerSelector | `components/contracts/BuyerSelector.tsx` | ⚪ Pending | Search/add buyer |
| 7 | ContractCustomizer | `components/contracts/ContractCustomizer.tsx` | ⚪ Pending | Qty, discounts |
| 8 | BuyerContractView | `components/contract-public/BuyerContractView.tsx` | ⚪ Pending | Public mobile view |

### 2.5 Sprint 2 Remaining Work

| # | Task | Priority | Blocker |
|---|------|----------|---------|
| 1 | Create `cat_contracts` table migration | High | None |
| 2 | Create contracts edge function | High | Migration |
| 3 | Create contracts-public edge function | High | Migration |
| 4 | Create contract API routes | High | Edge functions |
| 5 | Build ContractWizard UI | High | API |
| 6 | Build BuyerContractView (public) | Medium | API |
| 7 | Drag-drop enhancements for template builder | Low | None |

---

## Sprint 3: Execution

**Status**: ⚪ Pending
**Target**: Tasks + Automation with evidence capture and N8N integration
**Depends On**: Sprint 2

### 3.1 Database Schema

| # | Deliverable | Table Name | Status |
|---|-------------|------------|--------|
| 1 | Tasks table | `cat_tasks` | ⚪ Pending |
| 2 | Evidence table | `cat_evidence` | ⚪ Pending |

### 3.2 Edge Functions

| # | Function | Path | Status |
|---|----------|------|--------|
| 1 | tasks | `/tasks` | ⚪ Pending |
| 2 | tasks-schedule | `/tasks/:id/schedule` | ⚪ Pending |
| 3 | tasks-complete | `/tasks/:id/complete` | ⚪ Pending |
| 4 | evidence | `/evidence` | ⚪ Pending |
| 5 | webhooks | `/webhooks` | ⚪ Pending |

### 3.3 UI Components

| # | Component | Status |
|---|-----------|--------|
| 1 | TaskList | ⚪ Pending |
| 2 | TaskCard | ⚪ Pending |
| 3 | TaskScheduler | ⚪ Pending |
| 4 | EvidenceCapture | ⚪ Pending |
| 5 | PhotoCapture | ⚪ Pending |
| 6 | GPSCapture | ⚪ Pending |
| 7 | SignatureCapture | ⚪ Pending |

---

## Architecture Reference

### Data Flow Pattern

```
CORRECT (ContractNest Standard):
UI → API (validate, headers) → Edge (HMAC verified) → RPC/Query → DB

All Edge functions verify:
1. Authorization header
2. x-tenant-id header
3. x-internal-signature (HMAC from API)
4. x-timestamp (within 5 minutes)
```

### Block Types

| Type | Icon | Pricing | Evidence |
|------|------|---------|----------|
| service | 🛠️ | Independent/Resource/Variant | Yes |
| spare | 📦 | Independent | No |
| billing | 💳 | N/A (payment schedule) | No |
| text | 📝 | N/A (content only) | No |
| video | 🎥 | N/A (media) | No |
| image | 🖼️ | N/A (media) | No |
| checklist | ✅ | N/A (task list) | Optional |
| document | 📄 | N/A (file attachment) | No |

### Pricing Modes

| Mode | Description | Config Field |
|------|-------------|--------------|
| independent | Fixed price | `base_price` |
| resource_based | Price by team member/equipment | `resource_pricing` JSONB |
| variant_based | Price by asset type (1BHK, 2BHK) | `variant_pricing` JSONB |
| multi_resource | Multiple resource selections | `resource_pricing` JSONB array |

---

## File Locations

### Edge Functions

```
contractnest-edge/supabase/functions/
├── cat-blocks/index.ts          # ✅ Blocks CRUD (716 lines)
├── cat-templates/index.ts       # ✅ Templates CRUD (787 lines)
├── contracts/index.ts           # ⚪ Pending
├── tasks/index.ts               # ⚪ Pending
└── evidence/index.ts            # ⚪ Pending
```

### API Layer

```
contractnest-api/src/
├── routes/catalogStudioRoutes.ts      # ✅ Blocks + Templates routes
├── controllers/catalogStudioController.ts  # ✅ Controller
├── services/catalogStudioService.ts   # ✅ Service
└── types/catalogStudio/               # ⚪ Type definitions needed
```

### UI Components

```
contractnest-ui/src/
├── components/catalog-studio/
│   ├── BlockWizard/             # ✅ Complete wizard system
│   │   ├── index.tsx
│   │   ├── BlockWizardContent.tsx
│   │   ├── WizardHeader.tsx
│   │   ├── WizardFooter.tsx
│   │   ├── WizardProgress.tsx
│   │   └── steps/
│   │       ├── TypeSelectionStep.tsx
│   │       ├── BasicInfoStep.tsx
│   │       ├── ResourceDependencyStep.tsx
│   │       ├── service/           # PricingStep, DeliveryStep, EvidenceStep, etc.
│   │       ├── billing/           # StructureStep, ScheduleStep, AutomationStep
│   │       ├── spare/             # InventoryStep, FulfillmentStep
│   │       ├── checklist/         # ItemsStep, ChecklistSettingsStep
│   │       ├── content/           # ContentStep, ContentSettingsStep
│   │       ├── media/             # MediaStep, ImageUploadStep, DisplaySettingsStep
│   │       └── document/          # FileSettingsStep
│   ├── BlockCard.tsx
│   ├── BlockGrid.tsx
│   ├── IconPicker.tsx
│   ├── CategoryPanel.tsx
│   └── ContentEnhancements.tsx
├── pages/catalog-studio/
│   ├── blocks.tsx               # ✅ Blocks listing (46KB)
│   ├── blocks/new.tsx           # ✅ Create block
│   ├── blocks/[id]/edit.tsx     # ✅ Edit block
│   ├── template.tsx             # ✅ Template builder (101KB)
│   ├── templates-list.tsx       # ✅ Templates listing (88KB)
│   ├── configure.tsx            # ✅ Configuration
│   └── components/
│       ├── TemplatePreviewModal.tsx
│       └── TemplatePDFExport.tsx
└── hooks/
    └── catalog-studio/          # ⚪ Hooks needed (useBlocks, useTemplates, etc.)
```

---

## Session Log

| Date | Session | Work Done | Key Decisions |
|------|---------|-----------|---------------|
| Jan 2026 | Initial | PRD + Schema docs created | Flat blocks table, JSONB config |
| Jan 2026 | Sprint 1 | cat-blocks edge function | Global/seed/tenant block model |
| Jan 2026 | Sprint 1 | cat-templates edge function | System templates with copy feature |
| Jan 2026 | Sprint 1 | BlockWizard UI complete | 8 block types, all steps |
| Jan 2026 | Current | Delivery tracker created | CT_delivery.md + CT_Handover.md |

---

## Appendix: Existing Resources Integration

### Tables to REUSE (not create new)

| Table | Purpose | Used For |
|-------|---------|----------|
| `m_catalog_resource_types` | Resource type master | team_staff, equipment, etc. |
| `t_category_resources_master` | Actual resources | Doctors, technicians, kits |

### How Blocks Use Resources

```
cat_blocks.resource_pricing.options[].resource_id → t_category_resources_master.id
cat_blocks.resource_pricing.resource_type_id → m_catalog_resource_types.id
```

---

**End of Delivery Tracker**
