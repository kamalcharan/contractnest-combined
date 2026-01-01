# Catalog Studio - Sprint Implementation Plan v1.0

**Document Version:** 1.0
**Created:** January 2026
**Based On:** CatalogStudio-PRD-v1.0 + Resource Pricing Addendum
**Branch:** `claude/init-catalog-studio-P2Vfh`

---

## Executive Summary

This document outlines the 3-sprint implementation plan for Catalog Studio, the core service contracting engine of ContractNest. The implementation uses the **NEW UI codebase** (Dec 2025) as the foundation and builds fresh API/DB per PRD specifications.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Base | NEW UI only (catalog-studio/) | Aligned to PRD, modern structure |
| Old API/DB | NOT USED | Schema mismatch (master/variant vs flat blocks) |
| Architecture | Keep patterns | Controller→Service→Edge, HMAC, RLS |
| Schema | Fresh per PRD | Flat `blocks` table with JSONB config |

---

## Repository Structure

```
contractnest-combined/          (Parent - submodule orchestrator)
├── contractnest-ui/            (React + TypeScript frontend)
├── contractnest-api/           (Express API layer)
├── contractnest-edge/          (Supabase Edge Functions)
├── ClaudeDocumentation/        (PRD and documentation)
├── ContractNest-Mobile/        (Mobile PWA for buyers)
└── FamilyKnows/                (Expo app + website - separate project)
```

---

## Sprint Overview

| Sprint | Duration | Focus | Key Deliverables |
|--------|----------|-------|------------------|
| **Sprint 1** | Foundation | Blocks + Resources + Buyers | Full CRUD with pricing modes |
| **Sprint 2** | Core Flow | Templates + Contracts | Drag-drop builder, contract wizard, buyer view |
| **Sprint 3** | Execution | Tasks + Automation | Task spawning, evidence capture, N8N integration |

---

# SPRINT 1: FOUNDATION

## Goal
Establish core data infrastructure. Complete Block management with Resource-based pricing. Enable Buyer management.

---

## 1.1 Database Schema (contractnest-edge)

### New Tables to Create

#### `blocks` - Core block definitions
```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),

  -- Classification
  type TEXT NOT NULL CHECK (type IN (
    'service', 'spare', 'billing', 'text',
    'video', 'image', 'checklist', 'document'
  )),
  category TEXT,  -- Custom grouping

  -- Display
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  description TEXT,
  tags TEXT[],

  -- Type-Specific Config (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',

  -- Pricing (for service/spare blocks)
  pricing_mode TEXT DEFAULT 'independent' CHECK (pricing_mode IN (
    'independent', 'resource_based', 'variant_based', 'multi_resource'
  )),
  base_price DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',
  price_type TEXT CHECK (price_type IN (
    'per_session', 'per_hour', 'per_day', 'per_unit', 'fixed'
  )),
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  hsn_sac_code TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_blocks_seller ON blocks(seller_id);
CREATE INDEX idx_blocks_type ON blocks(type);
CREATE INDEX idx_blocks_status ON blocks(seller_id, status);
CREATE INDEX idx_blocks_tags ON blocks USING GIN(tags);
CREATE INDEX idx_blocks_config ON blocks USING GIN(config);
```

#### `resources` - Team members, equipment, consumables
```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),

  -- Classification
  type TEXT NOT NULL CHECK (type IN (
    'member', 'equipment', 'consumable', 'vehicle', 'room'
  )),
  category TEXT,

  -- Display
  name TEXT NOT NULL,
  icon TEXT DEFAULT '👤',
  description TEXT,
  photo_url TEXT,

  -- For 'member' type
  phone TEXT,
  email TEXT,
  skills TEXT[],
  certifications TEXT[],

  -- Costing
  hourly_cost DECIMAL(12,2),

  -- Availability
  availability JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resources_seller ON resources(seller_id);
CREATE INDEX idx_resources_type ON resources(seller_id, type);
CREATE INDEX idx_resources_skills ON resources USING GIN(skills);
CREATE INDEX idx_resources_status ON resources(seller_id, status);
```

#### `asset_types` - Property/appliance variants
```sql
CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),

  -- Classification
  category TEXT NOT NULL,  -- 'residential', 'commercial', 'appliance'
  subcategory TEXT,        -- 'air_conditioner', 'washing_machine'

  -- Display
  name TEXT NOT NULL,      -- '1BHK Flat', 'Split AC 1.5 Ton'
  icon TEXT DEFAULT '🏠',
  description TEXT,

  -- Attributes
  attributes JSONB DEFAULT '{}',

  -- Ordering
  sequence INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_asset_types_seller ON asset_types(seller_id);
CREATE INDEX idx_asset_types_category ON asset_types(seller_id, category);
```

#### `buyers` - Customer records
```sql
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),

  -- Contact
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,

  -- Business
  company TEXT,
  gst_number TEXT,

  -- Metadata
  tags TEXT[],
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(seller_id, phone)
);

-- Indexes
CREATE INDEX idx_buyers_seller ON buyers(seller_id);
CREATE INDEX idx_buyers_phone ON buyers(seller_id, phone);
CREATE INDEX idx_buyers_tags ON buyers USING GIN(tags);
```

### RLS Policies
```sql
-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- Seller isolation policies
CREATE POLICY seller_isolation_blocks ON blocks
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY seller_isolation_resources ON resources
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY seller_isolation_asset_types ON asset_types
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY seller_isolation_buyers ON buyers
  FOR ALL USING (seller_id = auth.uid());
```

---

## 1.2 Edge Functions (contractnest-edge)

### New Edge Functions to Create

| Function | Path | Methods | Purpose |
|----------|------|---------|---------|
| blocks-v2 | /blocks-v2 | GET, POST, PATCH, DELETE | Block CRUD per new schema |
| resources | /resources | GET, POST, PATCH, DELETE | Resource management |
| asset-types | /asset-types | GET, POST, PATCH, DELETE | Asset type management |
| buyers | /buyers | GET, POST, PATCH, DELETE | Buyer management |

### Endpoint Specifications

#### blocks-v2
```
GET    /blocks-v2              List blocks (filters: type, status, search)
GET    /blocks-v2/:id          Get single block
POST   /blocks-v2              Create block
PATCH  /blocks-v2/:id          Update block
DELETE /blocks-v2/:id          Soft delete (status = archived)
```

#### resources
```
GET    /resources              List resources (filters: type, status, skills)
GET    /resources/:id          Get single resource
POST   /resources              Create resource
PATCH  /resources/:id          Update resource
DELETE /resources/:id          Soft delete
```

#### asset-types
```
GET    /asset-types            List asset types (filters: category)
POST   /asset-types            Create asset type
PATCH  /asset-types/:id        Update asset type
DELETE /asset-types/:id        Soft delete
```

#### buyers
```
GET    /buyers                 List buyers (filters: search, tags)
GET    /buyers/:id             Get single buyer
POST   /buyers                 Create buyer
PATCH  /buyers/:id             Update buyer
DELETE /buyers/:id             Soft delete
GET    /buyers/search          Search by phone/name
```

---

## 1.3 API Layer (contractnest-api)

### New Routes to Create

```
/api/catalog-studio/blocks      → blocks-v2 edge function
/api/catalog-studio/resources   → resources edge function
/api/catalog-studio/asset-types → asset-types edge function
/api/catalog-studio/buyers      → buyers edge function
```

### Files to Create

```
src/
├── routes/
│   └── catalogStudio/
│       ├── blockRoutes.ts
│       ├── resourceRoutes.ts
│       ├── assetTypeRoutes.ts
│       └── buyerRoutes.ts
├── controllers/
│   └── catalogStudio/
│       ├── blockController.ts
│       ├── resourceController.ts
│       ├── assetTypeController.ts
│       └── buyerController.ts
├── services/
│   └── catalogStudio/
│       ├── blockService.ts
│       ├── resourceService.ts
│       ├── assetTypeService.ts
│       └── buyerService.ts
└── types/
    └── catalogStudio/
        ├── block.ts
        ├── resource.ts
        ├── assetType.ts
        └── buyer.ts
```

---

## 1.4 UI Updates (contractnest-ui)

### Folder Restructuring

```
CURRENT:                              AFTER:
src/components/                       src/components/
├── catalog-studio/                   ├── blocks/           ← RENAMED
│   ├── BlockWizard/                  │   ├── BlockWizard/
│   ├── BlockCard.tsx                 │   ├── BlockCard.tsx
│   └── ...                           │   ├── BlockGrid.tsx
                                      │   └── DraggableBlock.tsx (new)
                                      │
                                      ├── resources/         ← NEW
                                      │   ├── ResourceManager.tsx
                                      │   ├── ResourceList.tsx
                                      │   ├── ResourceCard.tsx
                                      │   ├── ResourceForm.tsx
                                      │   ├── MemberForm.tsx
                                      │   ├── EquipmentForm.tsx
                                      │   └── AssetTypeManager.tsx
                                      │
                                      └── buyers/            ← NEW
                                          ├── BuyerList.tsx
                                          ├── BuyerCard.tsx
                                          └── BuyerForm.tsx
```

### New Hooks to Create

```
src/hooks/catalog-studio/
├── useBlocks.ts          ← Connect to real API (replace dummy data)
├── useResources.ts       ← New
├── useAssetTypes.ts      ← New
└── useBuyers.ts          ← New
```

### BlockWizard Updates

| Step | Current State | Sprint 1 Update |
|------|---------------|-----------------|
| TypeSelectionStep | Working | Keep as-is |
| BasicInfoStep | Working | Keep as-is |
| PricingStep | Basic | Add pricing mode selector (Independent/Resource/Variant) |
| DeliveryStep | Working | Keep as-is |
| EvidenceStep | Working | Keep as-is |
| RulesStep | Basic | Keep as-is (enhance in Sprint 3) |

### New Components to Build

#### ResourcePricingConfig.tsx
```typescript
// When pricing_mode = 'resource_based'
interface ResourcePricingConfigProps {
  resourceType: 'member' | 'equipment';
  selectedResources: ResourcePricing[];
  allowAny: boolean;
  anyLabel: string;
  anyPrice: number;
  onChange: (config: ResourceConfig) => void;
}
```

#### VariantPricingConfig.tsx
```typescript
// When pricing_mode = 'variant_based'
interface VariantPricingConfigProps {
  assetCategory: string;
  variants: VariantPricing[];
  onChange: (config: VariantConfig) => void;
}
```

---

## 1.5 Sprint 1 Deliverables Checklist

### Database
- [ ] Create `blocks` table with new schema
- [ ] Create `resources` table
- [ ] Create `asset_types` table
- [ ] Create `buyers` table
- [ ] Setup RLS policies for all tables
- [ ] Create indexes for performance
- [ ] Seed master data (currencies, evidence types)

### Edge Functions
- [ ] Create `blocks-v2` edge function with full CRUD
- [ ] Create `resources` edge function with full CRUD
- [ ] Create `asset-types` edge function with full CRUD
- [ ] Create `buyers` edge function with full CRUD

### API
- [ ] Create catalogStudio routes
- [ ] Create catalogStudio controllers
- [ ] Create catalogStudio services
- [ ] Add to main router

### UI
- [ ] Rename `catalog-studio/` to `blocks/`
- [ ] Create `useBlocks.ts` hook with React Query
- [ ] Remove DUMMY_BLOCKS, connect to real API
- [ ] Add pricing mode selector to PricingStep
- [ ] Create ResourcePricingConfig component
- [ ] Create VariantPricingConfig component
- [ ] Create ResourceManager page
- [ ] Create BuyerList page

### Testing
- [ ] Can create block with independent pricing
- [ ] Can create block with resource-based pricing
- [ ] Can create block with variant-based pricing
- [ ] Can manage resources (team members, equipment)
- [ ] Can manage asset types (1BHK, 2BHK, etc.)
- [ ] Can manage buyers
- [ ] All data persists to Supabase
- [ ] RLS prevents cross-tenant access

---

# SPRINT 2: CORE FLOW

## Goal
Enable sellers to assemble blocks into templates and create buyer-specific contracts. Build buyer-facing contract view.

---

## 2.1 Database Schema

### New Tables

#### `templates` - Reusable block assemblies
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),

  -- Display
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  cover_image TEXT,

  -- Block Assembly
  blocks JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ block_id, section, quantity, price_override, sequence }]

  -- Pricing Defaults
  currency TEXT DEFAULT 'INR',
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  discount_config JSONB DEFAULT '{"allowed": true, "max_percent": 20}',

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Visibility
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `contracts` - Buyer-specific instances
```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  template_id UUID REFERENCES templates(id),

  -- Display
  contract_number TEXT UNIQUE,
  name TEXT,

  -- Contract Items (snapshot)
  items JSONB NOT NULL DEFAULT '[]',

  -- Pricing
  subtotal DECIMAL(12,2),
  discount JSONB,
  tax_amount DECIMAL(12,2),
  total DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',

  -- Payment
  payment_plan JSONB,
  payment_status TEXT DEFAULT 'pending',

  -- Dates
  start_date DATE,
  end_date DATE,
  valid_until TIMESTAMPTZ,

  -- Status Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'signed',
    'active', 'completed', 'cancelled', 'expired'
  )),

  -- Delivery
  sent_via TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,

  -- Notes
  seller_notes TEXT,
  buyer_notes TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2.2 Edge Functions

| Function | Path | Methods | Purpose |
|----------|------|---------|---------|
| templates | /templates | GET, POST, PATCH, DELETE | Template CRUD |
| contracts | /contracts | GET, POST, PATCH, DELETE | Contract CRUD |
| contracts-public | /contracts/:id/public | GET | Public buyer view (no auth) |
| contracts-actions | /contracts/:id/send | POST | Send contract |
| contracts-actions | /contracts/:id/accept | POST | Accept contract |
| contracts-actions | /contracts/:id/sign | POST | Sign contract |

---

## 2.3 UI Components

### New Pages

```
src/pages/catalog-studio/
├── templates.tsx           ← Template list page
├── template-builder.tsx    ← 4-step template wizard
├── contracts.tsx           ← Contract list page
└── contract-wizard.tsx     ← 6-step contract wizard

src/pages/contract-public/
└── [id].tsx               ← Buyer view (public, mobile-friendly)
```

### Template Builder Components

```
src/components/templates/
├── TemplateBuilder.tsx        ← Main 4-step wizard
├── TemplateInfoStep.tsx       ← Step 1: Name, description
├── BlockLibraryPanel.tsx      ← Left panel: draggable blocks
├── TemplateCanvas.tsx         ← Center: drop zones
├── CanvasDropZone.tsx         ← Drop zone for each section
├── CanvasBlockItem.tsx        ← Block in canvas with qty control
├── TemplateSummary.tsx        ← Right panel: live totals
├── TemplateConfigStep.tsx     ← Step 3: Currency, tax, discounts
└── TemplateReviewStep.tsx     ← Step 4: Preview & save
```

### Contract Wizard Components

```
src/components/contracts/
├── ContractWizard.tsx         ← Main 6-step wizard
├── SourceSelector.tsx         ← Step 1: Template/Scratch/Clone
├── BuyerSelector.tsx          ← Step 2: Search/Add buyer
├── ContractCustomizer.tsx     ← Step 3: Qty, discounts, resources
├── ResourceSelector.tsx       ← Select resource for item
├── VariantSelector.tsx        ← Select asset variant
├── ContractScheduler.tsx      ← Step 4: Dates, payment plan
├── ContractReview.tsx         ← Step 5: Summary
├── ContractSender.tsx         ← Step 6: WhatsApp/Email/Link
└── ContractStatusTracker.tsx  ← Post-send tracking
```

### Buyer Contract View

```
src/components/contract-public/
├── BuyerContractView.tsx      ← Main public view
├── ContractHeader.tsx         ← Seller info, contract number
├── ContractItemsList.tsx      ← Services with selected resources
├── ContractPricing.tsx        ← Subtotal, tax, total
├── ContractActions.tsx        ← Accept/Decline buttons
└── ContractSignature.tsx      ← Digital signature capture
```

---

## 2.4 Sprint 2 Deliverables Checklist

### Database
- [ ] Create `templates` table
- [ ] Create `contracts` table
- [ ] Setup RLS policies
- [ ] Create contract number sequence

### Edge Functions
- [ ] Create `templates` edge function
- [ ] Create `contracts` edge function
- [ ] Create `contracts-public` edge function (no auth)
- [ ] Create contract actions (send, accept, sign)

### UI - Templates
- [ ] Create TemplateBuilder page
- [ ] Create BlockLibraryPanel with drag source
- [ ] Create TemplateCanvas with drop zones
- [ ] Implement drag-and-drop (react-dnd or native)
- [ ] Create TemplateSummary with live calculations
- [ ] Create useTemplates hook

### UI - Contracts
- [ ] Create ContractWizard page
- [ ] Create SourceSelector (template/scratch/clone)
- [ ] Create BuyerSelector with search
- [ ] Create ContractCustomizer with resource selection
- [ ] Create ContractScheduler
- [ ] Create ContractReview
- [ ] Create ContractSender
- [ ] Create useContracts hook

### UI - Buyer View
- [ ] Create public contract view page
- [ ] Mobile-responsive design
- [ ] Accept/Decline functionality
- [ ] Digital signature capture

### Testing
- [ ] Can drag blocks from library to canvas
- [ ] Template shows live price calculation
- [ ] Can create contract from template
- [ ] Can select resources/variants (price updates)
- [ ] Can send contract via link
- [ ] Buyer can view on mobile
- [ ] Contract status tracks correctly

---

# SPRINT 3: EXECUTION

## Goal
Complete task spawning from contracts, enable evidence capture, and integrate automation via N8N.

---

## 3.1 Database Schema

### New Tables

#### `tasks` - Executable service units
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  block_id UUID NOT NULL REFERENCES blocks(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),

  -- Assignment
  resource_id UUID REFERENCES resources(id),
  asset_type_id UUID REFERENCES asset_types(id),
  resource_locked BOOLEAN DEFAULT false,

  -- Task Details
  sequence INTEGER,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Location
  location_type TEXT,
  location JSONB,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'confirmed', 'in_progress',
    'completed', 'cancelled', 'rescheduled', 'no_show'
  )),

  -- SLA
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `evidence` - Proof of completion
```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),

  -- Evidence Type
  type TEXT NOT NULL CHECK (type IN (
    'photo', 'gps', 'signature', 'notes', 'document', 'video', 'rating'
  )),

  -- Content
  content JSONB NOT NULL,
  file_url TEXT,

  -- Metadata
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  captured_by UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3.2 Edge Functions

| Function | Path | Methods | Purpose |
|----------|------|---------|---------|
| tasks | /tasks | GET, POST, PATCH | Task management |
| tasks-schedule | /tasks/:id/schedule | POST | Schedule task |
| tasks-complete | /tasks/:id/complete | POST | Complete with evidence |
| evidence | /evidence | GET, POST | Evidence management |
| webhooks | /webhooks | POST | N8N webhook handler |

---

## 3.3 Task Spawning Logic

When contract status changes to `accepted`:

```typescript
async function spawnTasks(contractId: string) {
  const contract = await getContract(contractId);
  const serviceItems = contract.items.filter(i => i.type === 'service');

  const tasks = [];
  for (const item of serviceItems) {
    for (let seq = 1; seq <= item.quantity; seq++) {
      tasks.push({
        contract_id: contractId,
        block_id: item.block_id,
        seller_id: contract.seller_id,
        buyer_id: contract.buyer_id,
        resource_id: item.selected_resource?.resource_id,
        asset_type_id: item.selected_variant?.asset_type_id,
        resource_locked: item.resource_locked,
        sequence: seq,
        status: 'pending'
      });
    }
  }

  await supabase.from('tasks').insert(tasks);
}
```

---

## 3.4 UI Components

### Task Management

```
src/components/tasks/
├── TaskList.tsx              ← List tasks for contract
├── TaskCard.tsx              ← Task with status, schedule
├── TaskScheduler.tsx         ← Date/time picker, resource assignment
├── TaskDetails.tsx           ← Full task view
└── TaskStatusBadge.tsx       ← Status indicator
```

### Evidence Capture

```
src/components/evidence/
├── EvidenceCapture.tsx       ← Main capture component
├── PhotoCapture.tsx          ← Camera/upload for photos
├── GPSCapture.tsx            ← Location verification
├── SignatureCapture.tsx      ← Digital signature pad
├── NotesCapture.tsx          ← Text notes
└── EvidencePreview.tsx       ← Display captured evidence
```

---

## 3.5 N8N Automation Integration

### Webhook Events

| Event | Trigger | N8N Action |
|-------|---------|------------|
| contract_sent | Contract sent to buyer | WhatsApp message to buyer |
| contract_viewed | Buyer opens link | Notify seller |
| contract_accepted | Buyer accepts | Trigger task creation |
| task_reminder | 24h before scheduled | WhatsApp to resource |
| sla_breach | Task not started by SLA | Alert to seller |
| task_completed | Task marked complete | Thank you message |
| payment_due | EMI due date | WhatsApp reminder |

### Webhook Payload Structure

```json
{
  "event": "contract_accepted",
  "timestamp": "2026-01-01T10:00:00Z",
  "data": {
    "contract_id": "uuid",
    "buyer": { "name": "...", "phone": "..." },
    "seller_id": "uuid",
    "total": 5000
  }
}
```

---

## 3.6 Sprint 3 Deliverables Checklist

### Database
- [ ] Create `tasks` table
- [ ] Create `evidence` table
- [ ] Setup RLS policies
- [ ] Create task indexes

### Edge Functions
- [ ] Create `tasks` edge function
- [ ] Implement task spawning on contract accept
- [ ] Create `evidence` edge function
- [ ] Create `webhooks` edge function for N8N

### UI - Tasks
- [ ] Create TaskList page
- [ ] Create TaskCard component
- [ ] Create TaskScheduler
- [ ] Create TaskDetails view

### UI - Evidence
- [ ] Create EvidenceCapture component
- [ ] Implement PhotoCapture with camera
- [ ] Implement GPSCapture with geolocation
- [ ] Implement SignatureCapture
- [ ] Create EvidencePreview

### Automation
- [ ] Setup N8N webhook endpoints
- [ ] Create contract_sent automation
- [ ] Create task_reminder automation
- [ ] Create sla_breach automation

### BlockWizard Enhancement
- [ ] Enhance RulesStep with IF-THEN builder
- [ ] Add SLA configuration
- [ ] Add automation rule templates

### Testing
- [ ] Tasks auto-spawn when contract accepted
- [ ] Can schedule tasks
- [ ] Can complete tasks with evidence
- [ ] Evidence uploads work (photo, GPS, signature)
- [ ] N8N webhooks fire correctly
- [ ] Automation rules execute

---

# Technical Reference

## Type Definitions (TypeScript)

### Block Types
```typescript
type BlockType = 'service' | 'spare' | 'billing' | 'text' |
                 'video' | 'image' | 'checklist' | 'document';

type PricingMode = 'independent' | 'resource_based' |
                   'variant_based' | 'multi_resource';

type ResourceType = 'member' | 'equipment' | 'consumable' |
                    'vehicle' | 'room';

type ContractStatus = 'draft' | 'sent' | 'viewed' | 'accepted' |
                      'signed' | 'active' | 'completed' |
                      'cancelled' | 'expired';

type TaskStatus = 'pending' | 'scheduled' | 'confirmed' |
                  'in_progress' | 'completed' | 'cancelled' |
                  'rescheduled' | 'no_show';

type EvidenceType = 'photo' | 'gps' | 'signature' | 'notes' |
                    'document' | 'video' | 'rating';
```

### Service Block Config
```typescript
interface ServiceBlockConfig {
  duration: { value: number; unit: 'minutes' | 'hours' | 'days' };
  buffer: number;
  location: {
    type: 'onsite' | 'virtual' | 'hybrid';
    onsite_config?: { default: string; require_gps: boolean };
    virtual_config?: { platform: string; auto_invite: boolean };
  };
  assignment: {
    type: 'seller' | 'manual' | 'auto' | 'client_choice';
    skills?: string[];
  };
  evidence: EvidenceRequirement[];
  sla: { completion_hours: number; reschedule_hours: number };
  automation: AutomationRule[];
}
```

### Resource Pricing Config
```typescript
interface ResourceConfig {
  type: ResourceType;
  label: string;
  required: boolean;
  allow_any: boolean;
  any_label?: string;
  any_price?: number;
  filter_by_skills?: string[];
  selection_time: 'contract' | 'task';
  resource_pricing: ResourcePricingOption[];
}

interface ResourcePricingOption {
  resource_id: string;
  name: string;
  category?: string;
  price: number;
}
```

---

## API Endpoints Summary

### Sprint 1
```
POST   /api/catalog-studio/blocks
GET    /api/catalog-studio/blocks
GET    /api/catalog-studio/blocks/:id
PATCH  /api/catalog-studio/blocks/:id
DELETE /api/catalog-studio/blocks/:id

POST   /api/catalog-studio/resources
GET    /api/catalog-studio/resources
PATCH  /api/catalog-studio/resources/:id
DELETE /api/catalog-studio/resources/:id

POST   /api/catalog-studio/asset-types
GET    /api/catalog-studio/asset-types
PATCH  /api/catalog-studio/asset-types/:id
DELETE /api/catalog-studio/asset-types/:id

POST   /api/catalog-studio/buyers
GET    /api/catalog-studio/buyers
PATCH  /api/catalog-studio/buyers/:id
DELETE /api/catalog-studio/buyers/:id
```

### Sprint 2
```
POST   /api/catalog-studio/templates
GET    /api/catalog-studio/templates
PATCH  /api/catalog-studio/templates/:id
DELETE /api/catalog-studio/templates/:id

POST   /api/catalog-studio/contracts
GET    /api/catalog-studio/contracts
PATCH  /api/catalog-studio/contracts/:id
POST   /api/catalog-studio/contracts/:id/send
POST   /api/catalog-studio/contracts/:id/accept
POST   /api/catalog-studio/contracts/:id/sign
GET    /api/catalog-studio/contracts/:id/public
```

### Sprint 3
```
GET    /api/catalog-studio/tasks
PATCH  /api/catalog-studio/tasks/:id
POST   /api/catalog-studio/tasks/:id/schedule
POST   /api/catalog-studio/tasks/:id/complete

POST   /api/catalog-studio/evidence
GET    /api/catalog-studio/evidence/:task_id

POST   /api/webhooks/n8n
```

---

## Files Changed Per Sprint

### Sprint 1 Files

**contractnest-edge:**
```
supabase/migrations/catalog-studio/
├── 001_create_blocks_table.sql
├── 002_create_resources_table.sql
├── 003_create_asset_types_table.sql
├── 004_create_buyers_table.sql
└── 005_rls_policies.sql

supabase/functions/
├── blocks-v2/index.ts
├── resources/index.ts
├── asset-types/index.ts
└── buyers/index.ts
```

**contractnest-api:**
```
src/routes/catalogStudio/
├── blockRoutes.ts
├── resourceRoutes.ts
├── assetTypeRoutes.ts
└── buyerRoutes.ts

src/controllers/catalogStudio/
├── blockController.ts
├── resourceController.ts
├── assetTypeController.ts
└── buyerController.ts

src/services/catalogStudio/
├── blockService.ts
├── resourceService.ts
├── assetTypeService.ts
└── buyerService.ts

src/types/catalogStudio/
├── block.ts
├── resource.ts
├── assetType.ts
└── buyer.ts
```

**contractnest-ui:**
```
src/components/blocks/           ← Renamed from catalog-studio
├── BlockWizard/
│   └── Steps/
│       └── PricingStep.tsx     ← Updated with pricing modes
├── ResourcePricingConfig.tsx   ← New
└── VariantPricingConfig.tsx    ← New

src/components/resources/        ← New folder
├── ResourceManager.tsx
├── ResourceList.tsx
├── ResourceCard.tsx
├── ResourceForm.tsx
└── AssetTypeManager.tsx

src/components/buyers/           ← New folder
├── BuyerList.tsx
├── BuyerCard.tsx
└── BuyerForm.tsx

src/hooks/catalog-studio/
├── useBlocks.ts                ← Updated (real API)
├── useResources.ts             ← New
├── useAssetTypes.ts            ← New
└── useBuyers.ts                ← New

src/pages/catalog-studio/
├── blocks.tsx                  ← Updated
├── resources.tsx               ← New
└── buyers.tsx                  ← New
```

### Sprint 2 Files

**contractnest-edge:**
```
supabase/migrations/catalog-studio/
├── 006_create_templates_table.sql
└── 007_create_contracts_table.sql

supabase/functions/
├── templates/index.ts
├── contracts/index.ts
└── contracts-public/index.ts
```

**contractnest-ui:**
```
src/components/templates/        ← New folder
├── TemplateBuilder.tsx
├── BlockLibraryPanel.tsx
├── TemplateCanvas.tsx
├── CanvasDropZone.tsx
├── CanvasBlockItem.tsx
└── TemplateSummary.tsx

src/components/contracts/        ← Updated folder
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

src/components/contract-public/  ← New folder
├── BuyerContractView.tsx
└── ...

src/pages/catalog-studio/
├── templates.tsx               ← New
├── template-builder.tsx        ← New
├── contracts.tsx               ← New
└── contract-wizard.tsx         ← New

src/pages/contract-public/
└── [id].tsx                    ← New (public buyer view)
```

### Sprint 3 Files

**contractnest-edge:**
```
supabase/migrations/catalog-studio/
├── 008_create_tasks_table.sql
└── 009_create_evidence_table.sql

supabase/functions/
├── tasks/index.ts
├── evidence/index.ts
└── webhooks/index.ts
```

**contractnest-ui:**
```
src/components/tasks/            ← New folder
├── TaskList.tsx
├── TaskCard.tsx
├── TaskScheduler.tsx
└── TaskDetails.tsx

src/components/evidence/         ← New folder
├── EvidenceCapture.tsx
├── PhotoCapture.tsx
├── GPSCapture.tsx
├── SignatureCapture.tsx
└── EvidencePreview.tsx

src/components/blocks/BlockWizard/Steps/
└── RulesStep.tsx               ← Enhanced with automation builder
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (P95) | < 100ms | Supabase dashboard |
| Page Load (LCP) | < 2.5s | Lighthouse |
| Wizard Step Transition | < 50ms | Client-side |
| Concurrent Users | 1000+ | Load testing |
| Realtime Update Latency | < 500ms | Supabase Realtime |

---

## Appendix: Master Data

### Currencies
| Code | Symbol | Name |
|------|--------|------|
| INR | ₹ | Indian Rupee |
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| AED | د.إ | UAE Dirham |
| SGD | S$ | Singapore Dollar |

### Evidence Types
| Type | Icon | Description |
|------|------|-------------|
| photo | 📷 | Before/during/after photos |
| gps | 📍 | Location verification |
| signature | ✍️ | Client digital signature |
| notes | 📝 | Session notes/summary |
| document | 📄 | Report/certificate upload |
| video | 🎥 | Session recording |
| rating | ⭐ | Client feedback |

### Resource Types
| Type | Icon | Examples |
|------|------|----------|
| member | 👤 | Doctors, Trainers, Technicians |
| equipment | 🔧 | Premium Kit, Standard Kit |
| consumable | 🧴 | Organic solution, Oils |
| vehicle | 🚗 | Van, Bike, Truck |
| room | 🚪 | Consultation Room, Studio |

---

*End of Sprint Plan Document*
