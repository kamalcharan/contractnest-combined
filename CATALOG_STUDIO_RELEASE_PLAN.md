# Catalog Studio - 3-Sprint Release Plan

## Overview
This plan outlines the phased implementation of Catalog Studio based on PRD v1.0 and Resource Pricing Addendum.

---

## SPRINT 1: Foundation (Blocks + Resources)

### Goal
Establish core data infrastructure and complete Block management with Resource-based pricing.

### Database Tasks

| Task | Table | Priority | Effort |
|------|-------|----------|--------|
| Create `blocks` table per PRD schema | blocks | P0 | 1d |
| Create `resources` table (team members, equipment) | resources | P0 | 0.5d |
| Create `asset_types` table (property variants) | asset_types | P0 | 0.5d |
| Create `buyers` table | buyers | P0 | 0.5d |
| Setup RLS policies for all tables | all | P0 | 0.5d |
| Create indexes for performance | all | P1 | 0.5d |
| Seed master data (currencies, evidence types) | master | P1 | 0.5d |

### API Tasks (Edge Functions)

| Task | Endpoint | Priority |
|------|----------|----------|
| Blocks CRUD | POST/PATCH/DELETE /blocks | P0 |
| Resources CRUD | /resources | P0 |
| Asset Types CRUD | /asset-types | P0 |
| Buyers CRUD | /buyers | P0 |
| Block search with filters | GET /blocks?type=&search= | P1 |

### UI Tasks

| Component | Action | Priority |
|-----------|--------|----------|
| BlockWizard | Connect to real API (remove dummy data) | P0 |
| BlockWizard/PricingStep | Add pricing mode selection (Independent/Resource/Variant) | P0 |
| ResourcePricingConfig | New - Configure resource-based prices | P0 |
| VariantPricingConfig | New - Configure variant-based prices | P0 |
| ResourceManager | New - Settings page for Resources | P0 |
| AssetTypeManager | New - Settings page for Asset Types | P1 |
| hooks/useBlocks | Connect to real API with React Query | P0 |
| hooks/useResources | New - Resources CRUD hook | P0 |

### Folder Rationalization

```
Rename/Move:
  components/catalog-studio/ → components/blocks/

Create New:
  components/resources/
    ├── ResourceManager.tsx
    ├── ResourceList.tsx
    ├── ResourceCard.tsx
    ├── ResourceForm.tsx
    ├── MemberForm.tsx
    ├── EquipmentForm.tsx
    └── AssetTypeForm.tsx

  hooks/
    ├── useBlocks.ts (update)
    ├── useResources.ts (new)
    └── useAssetTypes.ts (new)
```

### Sprint 1 Definition of Done
- [ ] Can create/edit/delete all 8 block types via UI
- [ ] Can select pricing mode (Independent/Resource/Variant) for service blocks
- [ ] Can manage team members and equipment in Resources settings
- [ ] Can manage asset types (1BHK, 2BHK, etc.) in settings
- [ ] All data persists to Supabase
- [ ] RLS prevents cross-tenant access

---

## SPRINT 2: Templates + Contracts

### Goal
Enable sellers to assemble blocks into templates and create buyer-specific contracts.

### Database Tasks

| Task | Table | Priority |
|------|-------|----------|
| Create `templates` table | templates | P0 |
| Create `contracts` table | contracts | P0 |
| Create `contract_items` (if normalized) or use JSONB | contracts.items | P0 |
| Contract number sequence | sequences | P1 |

### API Tasks

| Task | Endpoint | Priority |
|------|----------|----------|
| Templates CRUD | /templates | P0 |
| Contracts CRUD | /contracts | P0 |
| Contract from template | POST /contracts (with template_id) | P0 |
| Contract send | POST /contracts/:id/send | P0 |
| Public contract view | GET /contracts/:id/public | P0 |
| Contract accept | POST /contracts/:id/accept | P1 |
| Contract sign | POST /contracts/:id/sign | P1 |

### UI Tasks

| Component | Action | Priority |
|-----------|--------|----------|
| TemplateBuilder | New - 4-step wizard per PRD | P0 |
| BlockLibraryPanel | New - Left panel with draggable blocks | P0 |
| TemplateCanvas | Update - Drop zones for sections | P0 |
| CanvasDropZone | New - Individual drop zone component | P0 |
| TemplateSummary | New - Right panel with totals | P0 |
| ContractWizard | New - 6-step wizard per PRD | P0 |
| SourceSelector | New - Template/Scratch/Clone selection | P0 |
| BuyerSelector | New - Search/Add buyer | P0 |
| ContractCustomizer | New - Qty, discount, resource selection | P0 |
| ResourceSelector | New - Select resource in contract items | P0 |
| VariantSelector | New - Select asset variant | P0 |
| ContractScheduler | New - Dates, payment plan | P0 |
| ContractReview | New - Summary before send | P0 |
| ContractSender | New - WhatsApp/Email/Link options | P0 |
| BuyerContractView | New - Public mobile-friendly view | P0 |

### Folder Structure

```
Create:
  components/templates/
    ├── TemplateBuilder.tsx
    ├── BlockLibraryPanel.tsx
    ├── TemplateCanvas.tsx
    ├── CanvasDropZone.tsx
    ├── CanvasBlockItem.tsx
    └── TemplateSummary.tsx

  components/contracts/
    ├── ContractWizard.tsx
    ├── SourceSelector.tsx
    ├── BuyerSelector.tsx
    ├── ContractCustomizer.tsx
    ├── ResourceSelector.tsx
    ├── VariantSelector.tsx
    ├── ContractScheduler.tsx
    ├── ContractReview.tsx
    ├── ContractSender.tsx
    └── ContractStatusTracker.tsx

  pages/
    ├── contract-public/
    │   └── [id].tsx  (buyer view)
```

### Sprint 2 Definition of Done
- [ ] Can drag blocks from library to canvas to build templates
- [ ] Template shows live price calculation
- [ ] Can create contract from template for a buyer
- [ ] Can select resources/variants when creating contract (price updates)
- [ ] Can send contract via WhatsApp/Email/Link
- [ ] Buyer can view contract on mobile without login
- [ ] Contract status tracks: draft → sent → viewed → accepted

---

## SPRINT 3: Tasks + Automation + Polish

### Goal
Complete task spawning, add automation rules, and polish UX.

### Database Tasks

| Task | Table | Priority |
|------|-------|----------|
| Create `tasks` table | tasks | P0 |
| Create `evidence` table | evidence | P0 |
| Create `payments` table (if needed) | payments | P1 |
| Task status indexes | tasks | P1 |

### API Tasks

| Task | Endpoint | Priority |
|------|----------|----------|
| Tasks CRUD | /tasks | P0 |
| Spawn tasks on contract accept | POST /contracts/:id/accept | P0 |
| Task scheduling | PATCH /tasks/:id/schedule | P0 |
| Task completion with evidence | POST /tasks/:id/complete | P0 |
| Evidence upload | POST /evidence | P0 |
| N8N webhook integration | /webhooks | P1 |

### UI Tasks

| Component | Action | Priority |
|-----------|--------|----------|
| TaskList | New - View tasks for contract | P0 |
| TaskCard | New - Task with status, schedule | P0 |
| TaskScheduler | New - Assign date/time/vendor | P0 |
| EvidenceCapture | New - Photo/GPS/Signature capture | P0 |
| TaskCompletion | New - Complete with evidence | P0 |
| ContractStatusTracker | Update - Show task progress | P0 |
| BlockWizard/RulesStep | Update - IF-THEN automation rules | P1 |
| Notifications | Integration with JTD worker | P1 |

### Automation Integration

| Automation | Trigger | Action |
|------------|---------|--------|
| Task reminder | 24h before scheduled | WhatsApp to vendor |
| SLA breach alert | Task not started by SLA | Alert to seller |
| Contract viewed | Buyer opens link | Update status + notify |
| Payment reminder | EMI due date | WhatsApp to buyer |

### Sprint 3 Definition of Done
- [ ] Tasks auto-spawn when contract accepted
- [ ] Vendor can schedule tasks
- [ ] Vendor can complete tasks with photo/GPS/signature
- [ ] Seller sees task progress on contract
- [ ] Automation rules trigger WhatsApp notifications via N8N
- [ ] Full contract lifecycle: draft → sent → viewed → accepted → signed → active → completed

---

## Technical Decisions

### What to REUSE from existing code

| Component | Reuse | Notes |
|-----------|-------|-------|
| Security patterns (HMAC, Auth, RLS) | ✅ Yes | Copy patterns to new endpoints |
| Controller/Service/Edge architecture | ✅ Yes | Same layered approach |
| UI BlockWizard structure | ✅ Yes | Update steps, connect to API |
| shadcn/ui components | ✅ Yes | All design system components |
| React Query patterns | ✅ Yes | Existing hooks as reference |
| ThemeContext, AuthContext | ✅ Yes | Keep as-is |
| ContractBuilderContext | ⚠️ Partial | Refactor for new contract flow |

### What to DEPRECATE

| Component | Reason |
|-----------|--------|
| `m_block_categories` table | Replaced by block.type field |
| `m_block_masters` table | Replaced by flat blocks table |
| `m_block_variants` table | Replaced by blocks.config JSONB |
| Existing GET /blocks endpoints | Will be replaced with new schema |
| Dummy block data (utils/catalog-studio/blocks.ts) | Replaced with real API |

### Migration Strategy

1. **Create new tables** alongside existing (no breaking changes)
2. **Build new API endpoints** with `/v2/` prefix or separate path
3. **Migrate UI** to use new endpoints
4. **Deprecate old tables** after verification
5. **Drop old tables** in future cleanup sprint

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Schema migration breaks existing | Keep old tables, build new alongside |
| N8N integration delays | Mock webhooks initially, integrate later |
| WhatsApp API limitations | Start with link-based sharing, add WhatsApp later |
| Mobile buyer view complexity | Use responsive design, not separate PWA initially |

---

## Success Metrics (per PRD)

| Metric | Target |
|--------|--------|
| API Response Time (P95) | < 100ms |
| Page Load (LCP) | < 2.5s |
| Wizard Step Transition | < 50ms |
| Concurrent Users | 1000+ |
| Realtime Update Latency | < 500ms |

---

## Summary

| Sprint | Focus | Key Deliverable |
|--------|-------|-----------------|
| **Sprint 1** | Foundation | Blocks + Resources fully working |
| **Sprint 2** | Core Flow | Templates + Contracts + Buyer View |
| **Sprint 3** | Execution | Tasks + Automation + Polish |

**Total New Tables:** 7 (blocks, templates, contracts, tasks, evidence, resources, asset_types, buyers)
**Total New Components:** ~30 React components
**Total New Endpoints:** ~25 API endpoints

