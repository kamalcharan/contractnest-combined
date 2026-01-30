# Session Handover — Contract Wizard Bugfixes & Next Steps
**Date**: 2026-01-30
**Branch**: `claude/init-submodules-review-Hw5NS`

---

## Session Summary

This session continued from a prior session that built the Contract Wizard through 9 steps (Phases 1-6). The prior session delivered: paper canvas Review & Send step, PDF export utility, contact prefetch, and signoff success screen with Lottie animation. Two bugs were reported at the end of that session.

---

## PENDING BUG FIXES (NOT RESOLVED)

### Bug 1: Signoff Success Screen Not Showing
**User report**: "when i clicked on 'send contract'....it is not taking me to success screen - with animation"

**Root cause identified**: In `ContractWizard/index.tsx`, `handleNext` called `onComplete?.(wizardState)` BEFORE `setIsContractSent(true)`. The parent component (`ContractCreatePage`) has:
```tsx
onComplete={(contractData) => {
  console.log('Contract created:', contractData);
  setShowWizard(false);  // This closes the wizard immediately
}}
```
The render guard `if (!isOpen) return null` at line 592 fired before the `isContractSent` check, so the wizard closed instantly.

**Fix applied** (3 changes in `index.tsx`) — but user says NOT resolved:
1. **handleNext** (line 303-311): For signoff, only `setIsContractSent(true)` - `onComplete` deferred to Done button
2. **Render guard reorder** (line 592 moved to 655): `isContractSent` check now before `!isOpen`
3. **Done button** (line 637-643): Calls `onComplete -> setIsContractSent(false) -> onClose`

**Next session TODO**: Debug why the fix didn't work. Possible causes:
- The MANUAL_COPY_FILES were not copied to the user's local machine (changes only in this container)
- The parent conditionally renders `{showWizard && <ContractWizard .../>}` instead of always rendering with `isOpen` prop - this would unmount the component entirely, losing state
- Check `ContractCreatePage` at `/contractnest-ui/src/pages/contracts/create/index.tsx` lines 190-199 for conditional rendering vs always-mount pattern
- `acceptanceMethod` might not be `'signoff'` - verify user actually selected "Sign-off" in Step 3

### Bug 2: Billing View Not Showing Pricing Blocks
**User report**: "code broke --- Billing View -- i am not getting the pricing blocks added in the previous screen -- even totals are also not coming"

**Analysis**: Code inspection shows state-passing is correct:
- `wizardState.selectedBlocks` is properly passed to both `ServiceBlocksStep` (case 6) and `BillingViewStep` (case 7)
- `handleBlocksChange` correctly updates state with blocks and totalValue
- `BillingViewStep` filters blocks via `categoryHasPricing(b.categoryId || '')` - this is the same filter used elsewhere

**Likely cause**: Secondary symptom of Bug 1 - wizard closing unexpectedly resets state. On reopen, `selectedBlocks` is `[]`.

**Alternative cause**: If `categoryHasPricing` returns false for the blocks' `categoryId` values, `billableBlocks` would be empty. Investigate whether FlyBy blocks or specific category IDs are not recognized.

**Next session TODO**:
- Verify blocks have correct `categoryId` at runtime
- Check `categoryHasPricing` utility at `/contractnest-ui/src/utils/catalog-studio/categories.ts`
- Consider adding console logs or a debug check

---

## KEY FILES - Current State

### `contractnest-ui/src/components/contracts/ContractWizard/index.tsx`
- **Location**: Container file (792 lines)
- **State**: Contains all fixes from this session
- **Key sections**:
  - Line 28-57: `ContractWizardState` interface
  - Line 101-183: Lottie animation (contractSentAnimation)
  - Line 194-205: `useContactList` prefetch hook
  - Line 211: `isContractSent` state
  - Line 302-324: `handleNext` - signoff defers onComplete
  - Line 461-589: `renderStepContent()` switch - all 9 steps
  - Line 592-653: Success screen (checked before `!isOpen`)
  - Line 655: `if (!isOpen) return null` guard
  - Line 657-783: Normal wizard UI

### `contractnest-ui/src/pages/contracts/create/index.tsx`
- **Parent page** that renders ContractWizard
- Line 35: `showWizard` state
- Line 190-199: ContractWizard with `onComplete` that calls `setShowWizard(false)`
- `contractType` derived from URL params: `/contracts/create/:contractType`

### `contractnest-ui/src/components/contracts/ContractWizard/steps/`
| File | Step | Purpose |
|------|------|---------|
| `PathSelectionStep.tsx` | 0 | Choose: Scratch vs Template |
| `TemplateSelectionStep.tsx` | 0.5 | Sub-step: Pick template |
| `YourRoleStep.tsx` | 1 | Provider or Buyer role |
| `BuyerSelectionStep.tsx` | 2 | Select counterparty (client/vendor/partner) |
| `AcceptanceMethodStep.tsx` | 3 | Payment / Sign-off / Auto-Accept |
| `ContractDetailsStep.tsx` | 4 | Name, currency, duration, grace period |
| `BillingCycleStep.tsx` | 5 | Unified vs Mixed billing |
| `ServiceBlocksStep.tsx` | 6 | Add/configure blocks (library + FlyBy) |
| `BillingViewStep.tsx` | 7 | Line items, tax, payment mode, totals |
| `ReviewSendStep.tsx` | 8 | Paper canvas review + PDF export |

### `contractnest-ui/src/components/contracts/ContractWizard/FloatingActionIsland.tsx`
- Floating footer with Back/Continue buttons
- Last step shows green "Send Contract" button
- Calls `onNext` prop - delegates to parent's `handleNext`

### `contractnest-ui/src/utils/pdf/generatePDF.ts`
- Reusable PDF utility: html2canvas to jsPDF multi-page A4
- Dependencies: `html2canvas ^1.4.1`, `jspdf ^2.5.2` (require `--legacy-peer-deps`)

---

## NEW FEATURE: Vendor & Partner Contract Workflows

### Current Support (already exists)
The wizard already supports all three contract types via the `contractType` prop:

```typescript
type ContractType = 'client' | 'vendor' | 'partner';
```

**What already works**:
- `BuyerSelectionStep` has labels for all 3 types:
  - `client` -> "Select your Client", classification filter: `['client']`
  - `vendor` -> "Select your Vendor", classification filter: `['vendor']`
  - `partner` -> "Select your Partner", classification filter: `['partner']`
- `useContactList` prefetch uses `classifications: [contractType]` - works for all 3
- `ContractCreatePage` reads `contractType` from URL params and validates against `['client', 'vendor', 'partner']`
- COUNTERPARTY_HEADINGS in index.tsx has headings for all 3

### What Needs to Be Built
The user wants distinct Vendor and Partner contract workflows. Areas to investigate:

1. **Step differences by type**: Do vendor/partner contracts have different steps than client contracts? (e.g., different acceptance methods, billing logic, role definitions)
2. **Role semantics**: In `YourRoleStep`, does "Provider" vs "Buyer" change meaning for vendor/partner flows?
3. **Block types**: Do vendor contracts use different block categories? Different pricing logic?
4. **Review & Send**: Does the paper canvas need different layouts per type?
5. **Success screen text**: Currently says "sent to [buyerName] for review" - should say "sent to [vendorName]" or "sent to [partnerName]"
6. **Navigation routes**: Currently `/contracts/create/:contractType` - may need sidebar entries for each

### Key Files to Modify
- `ContractWizard/index.tsx` - conditionally show/hide steps per type
- `YourRoleStep.tsx` - role labels per contract type
- `BuyerSelectionStep.tsx` - already supports all 3 (mostly done)
- `AcceptanceMethodStep.tsx` - may need different methods per type
- `ReviewSendStep.tsx` - counterparty labels
- `ContractCreatePage` - routing and type validation

---

## Wizard State Interface (for reference)

```typescript
export interface ContractWizardState {
  path: ContractPath;                    // 'scratch' | 'template' | null
  templateId: string | null;
  role: ContractRole;                    // 'provider' | 'buyer' | null
  buyerId: string | null;
  buyerName: string;
  acceptanceMethod: 'payment' | 'signoff' | 'auto' | null;
  contractName: string;
  status: string;
  currency: string;
  description: string;
  durationValue: number;
  durationUnit: string;
  gracePeriodValue: number;
  gracePeriodUnit: string;
  billingCycleType: BillingCycleType;    // 'unified' | 'mixed' | null
  selectedBlocks: SelectedBlock[];
  totalValue: number;
  selectedTaxRateIds: string[];
  paymentMode: 'prepaid' | 'emi';
  emiMonths: number;
  perBlockPaymentType: Record<string, 'prepaid' | 'postpaid'>;
}
```

## Acceptance Methods (for reference)

| ID | Label | Color | Description |
|---|---|---|---|
| `payment` | "Payment" | Green (#10B981) | Accept on payment completion |
| `signoff` | "Sign-off" | Blue (#3B82F6) | Accept on buyer approval |
| `auto` | "Auto-Accept" | Purple (#8B5CF6) | Accept automatically |

---

## MANUAL_COPY_FILES Status

| Folder | Contents | Status |
|--------|----------|--------|
| `prefetch-and-sent-screen/` | index.tsx with prefetch + sent screen + bugfix | Updated with fixes |
| `bugfix-success-screen/` | index.tsx with just the bugfix changes | NEW - created this session |
| `pdf-export/` | ReviewSendStep.tsx + generatePDF.ts + package.json | From prior session |
| `review-send-step/` | ReviewSendStep.tsx paper canvas | From prior session |

---

## Technical Context

- **Theme system**: `useTheme()` -> `isDarkMode`, `currentTheme`, `colors.brand.primary`, `colors.utility.*`, `colors.semantic.*`
- **Tenant branding**: `useTenantProfile()` -> `primary_color` (#F59E0B default), `secondary_color` (#10B981)
- **Contact prefetch**: `useContactList` has global in-memory `Map<string, CacheEntry>` with 5-min TTL
- **Block types**: Library blocks (from catalog) + FlyBy blocks (inline-created). Both have `categoryId`, `totalPrice`, `isFlyBy` flag
- **categoryHasPricing(categoryId)**: Metadata-driven check - `CATEGORY_METADATA[categoryId].wizardSteps.includes('pricing')`
- **npm peer conflict**: `react-helmet-async@2.0.5` requires React 16/17/18, project uses React 19. Use `--legacy-peer-deps`
- **Lottie animations**: Inline JSON objects using `lottie-react` package
- **MANUAL_COPY_FILES rule**: NEVER commit directly to submodule. Always use MANUAL_COPY_FILES + copy commands.

---

## LOST FEATURES: FlyBy Blocks + Non-Pricing Block Logic

### What Happened
Subsequent MANUAL_COPY_FILES copies overwrote files that contained FlyBy and non-pricing logic. The correct code exists in this container but was lost on the user's local machine. The next session MUST rebuild/re-verify these features.

### MANUAL_COPY_FILES Copy Order (chronological)
| # | Folder | Date | Overlapping Files | FlyBy? | Non-Pricing? |
|---|--------|------|-------------------|--------|-------------|
| 1 | `context-aware-contracts` | Jan 29 | index.tsx | No | No |
| 2 | `layout-flyby-blocks` | Jan 30 06:29 | ServiceBlocksStep, index.tsx, BlockCardConfigurable, FlyByBlockCard (NEW), BlockLibraryMini, catalog index.ts | YES (introduced) | No |
| 3 | `billing-view-fixes` | Jan 30 08:25 | ServiceBlocksStep, BlockCardConfigurable, BillingViewStep | YES (refined, added categoryId) | No |
| 4 | `review-send-step` | Jan 30 10:39 | ReviewSendStep, index.tsx | YES (FlyBy badges) | YES (introduced) |
| 5 | `pdf-export` | Jan 30 12:07 | ReviewSendStep | YES (preserved) | YES (preserved) |
| 6 | `prefetch-and-sent-screen` | Jan 30 12:40 | index.tsx only | N/A | N/A |

**Key problem**: If user copied folders out of order or re-copied an older folder AFTER a newer one, the FlyBy-aware ServiceBlocksStep.tsx and/or the non-pricing-aware ReviewSendStep.tsx could have been overwritten with older versions.

---

### FEATURE 1: FlyBy Blocks — What They Are

FlyBy blocks are **inline, manually-created contract blocks** where users enter all data directly without referencing a pre-existing catalog entry. They allow rapid creation of service/spare/text/document items.

#### FlyBy Block Types
| Type | Icon | Color | Has Pricing | Has Quantity | Has Billing Cycle | Special Fields |
|------|------|-------|-------------|-------------|-------------------|----------------|
| `service` | Wrench | #3B82F6 (blue) | YES | YES | YES | description |
| `spare` | Package | #F59E0B (amber) | YES | YES | NO | config.sku |
| `text` | FileText | #8B5CF6 (purple) | NO | NO | NO | config.content |
| `document` | File | #10B981 (green) | NO | NO | NO | config.fileType |

#### FlyBy vs Library Blocks
| Aspect | FlyBy | Library/Catalog |
|--------|-------|-----------------|
| Source | Created inline by user | Pre-existing in catalog |
| ID format | `flyby-{type}-{timestamp}` | UUID from database |
| `isFlyBy` flag | `true` | `false` / undefined |
| `flyByType` field | 'service' / 'spare' / 'text' / 'document' | undefined |
| Visual indicator | Dashed border + Zap badge | Solid border, category icon |
| Data entry | All fields manual | Pre-populated from catalog |
| `categoryId` | Set to the flyByType string (e.g. `'service'`) | Database categoryId |

#### ConfigurableBlock Interface (FlyBy fields)
```typescript
export interface ConfigurableBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  cycle: string;
  customCycleDays?: number;
  unlimited: boolean;
  price: number;
  currency: string;
  totalPrice: number;
  categoryId?: string;
  categoryName: string;
  categoryColor: string;
  categoryBgColor?: string;
  // FlyBy fields
  isFlyBy?: boolean;
  flyByType?: 'service' | 'spare' | 'text' | 'document';
  config?: {
    showDescription?: boolean;
    customPrice?: number;
    notes?: string;
    sku?: string;        // Spare parts SKU
    content?: string;    // Text block content
    fileType?: string;   // Document file type
  };
}
```

#### Files That Implement FlyBy

| File | What it does | MANUAL_COPY_FILES source |
|------|-------------|--------------------------|
| `catalog-studio/FlyByBlockCard.tsx` | **NEW component** - Renders FlyBy block card with dashed border, Zap badge, type-specific form fields (service/spare show pricing, text shows content textarea, document shows file type selector) | `layout-flyby-blocks/` |
| `catalog-studio/BlockCardConfigurable.tsx` | Block interface with `isFlyBy`, `flyByType`, config fields. Uses `categoryHasPricing()` to hide pricing for non-pricing blocks | `billing-view-fixes/` |
| `catalog-studio/BlockLibraryMini.tsx` | Catalog library with FlyBy "Add" buttons for each type | `layout-flyby-blocks/` |
| `catalog-studio/index.ts` | Exports `FlyByBlockCard`, `FLYBY_TYPE_CONFIG`, `FlyByBlockType` | `layout-flyby-blocks/` |
| `ContractWizard/steps/ServiceBlocksStep.tsx` | FlyBy dropdown menu, `handleAddFlyByBlock` handler, renders `FlyByBlockCard` for isFlyBy blocks, sets `categoryId: type` | `billing-view-fixes/` (most complete) |
| `ContractWizard/steps/BillingViewStep.tsx` | Shows "FlyBy" badge on FlyBy blocks in line items table | `billing-view-fixes/` |
| `ContractWizard/steps/ReviewSendStep.tsx` | Shows amber "FlyBy" badge on paper canvas for FlyBy blocks | `pdf-export/` (most complete) |

#### handleAddFlyByBlock (from ServiceBlocksStep.tsx)
```typescript
const handleAddFlyByBlock = useCallback(
  (type: FlyByBlockType) => {
    const typeConfig = FLYBY_TYPE_CONFIG[type];
    const flyById = `flyby-${type}-${Date.now()}`;
    const newBlock: ConfigurableBlock = {
      id: flyById,
      name: '',                          // Empty - user fills in
      description: '',
      icon: typeConfig.icon.displayName || 'Package',
      quantity: 1,
      cycle: type === 'service' ? 'prepaid' : '',
      unlimited: false,
      price: 0,
      currency: currency,
      totalPrice: 0,
      categoryId: type,                  // CRITICAL: maps FlyByType to categoryId
      categoryName: typeConfig.label,
      categoryColor: typeConfig.color,
      categoryBgColor: typeConfig.bgColor,
      isFlyBy: true,
      flyByType: type,
      config: { showDescription: false },
    };
    onBlocksChange([...selectedBlocks, newBlock]);
    setShowFlyByMenu(false);
    setExpandedBlockId(flyById);         // Auto-expand for inline editing
  },
  [selectedBlocks, onBlocksChange, currency]
);
```

#### FlyBy Rendering in ServiceBlocksStep
```typescript
{block.isFlyBy ? (
  <FlyByBlockCard
    block={block}
    isExpanded={expandedBlockId === block.id}
    isDragging={isDragging}
    dragHandleProps={{ style: { cursor: 'grab' } }}
    onToggleExpand={handleToggleExpand}
    onRemove={handleRemoveBlock}
    onUpdate={handleUpdateBlock}
  />
) : (
  <BlockCardConfigurable ... />  // Library block
)}
```

---

### FEATURE 2: Non-Pricing Blocks — Correct Behavior

Non-pricing blocks (text, document, video, image, checklist, billing) should NOT show prices, quantities, or billing cycles. Only `service` and `spare` categories have pricing.

#### categoryHasPricing Logic
```typescript
// File: contractnest-ui/src/utils/catalog-studio/categories.ts
export const categoryHasPricing = (categoryId: string): boolean => {
  return getWizardSteps(categoryId).includes('pricing');
};
```

| Category | `categoryHasPricing()` | Has Pricing | Has Quantity |
|----------|----------------------|-------------|-------------|
| `service` | `true` | YES | YES |
| `spare` | `true` | YES | YES |
| `billing` | `false` | NO | NO |
| `text` | `false` | NO | NO |
| `video` | `false` | NO | NO |
| `image` | `false` | NO | NO |
| `checklist` | `false` | NO | NO |
| `document` | `false` | NO | NO |

#### Where Non-Pricing Logic Must Exist

**BlockCardConfigurable.tsx** (for library blocks):
```typescript
const hasPricing = categoryHasPricing(block.categoryId || '');
// Conditionally show:
// - Pricing tags (qty, cycle): ONLY when hasPricing
// - Price display: ONLY when hasPricing
// - Quantity section: ONLY when hasPricing
// - Billing cycle section: ONLY when hasPricing
// - Pricing section (defined/selling price): ONLY when hasPricing
// - Price summary: ONLY when hasPricing
```

**FlyByBlockCard.tsx** (for FlyBy blocks):
```typescript
const hasPricing = flyByType === 'service' || flyByType === 'spare';
const hasQuantity = flyByType === 'service' || flyByType === 'spare';
const hasBillingCycle = flyByType === 'service';
// Text blocks show: name + config.content textarea
// Document blocks show: name + description + config.fileType selector
// Service blocks show: name + description + cycle + quantity + price
// Spare blocks show: name + description + config.sku + quantity + price
```

**ReviewSendStep.tsx** (paper canvas):
```typescript
const billableBlocks = selectedBlocks.filter(b => categoryHasPricing(b.categoryId || ''));
// For each block:
const hasPricing = categoryHasPricing(block.categoryId || '');
// Show pricing tags (Qty, Cycle, Payment): ONLY when hasPricing
// Show price column: ONLY when hasPricing && isSelfView
// Show content/description: when !hasPricing (text blocks show content, etc.)
```

**BillingViewStep.tsx** (billing table):
```typescript
const billableBlocks = useMemo(
  () => selectedBlocks.filter(b => categoryHasPricing(b.categoryId || '')),
  [selectedBlocks]
);
// Non-pricing blocks are COMPLETELY EXCLUDED from billing view
// Only service and spare blocks appear in the line items table
```

---

### HOW TO REBUILD IN NEXT SESSION

**Step 1**: Verify which files on user's local machine are missing FlyBy/non-pricing logic.

Check these files for the presence of key patterns:
```
ServiceBlocksStep.tsx  -> Search for: "isFlyBy", "handleAddFlyByBlock", "FlyByBlockCard", "showFlyByMenu"
ReviewSendStep.tsx     -> Search for: "categoryHasPricing", "hasPricing", "isFlyBy", "FlyBy"
BlockCardConfigurable  -> Search for: "isFlyBy", "flyByType", "categoryHasPricing"
FlyByBlockCard.tsx     -> Check if file EXISTS at all
BlockLibraryMini.tsx   -> Search for: "FlyBy", "flyby"
catalog-studio/index.ts -> Search for: "FlyByBlockCard"
BillingViewStep.tsx    -> Search for: "isFlyBy", "FlyBy"
```

**Step 2**: Copy the CORRECT versions from MANUAL_COPY_FILES in this order:
1. `layout-flyby-blocks/` FIRST (introduces FlyByBlockCard.tsx, BlockLibraryMini, catalog index.ts)
2. `billing-view-fixes/` SECOND (fixes categoryId on blocks, updates ServiceBlocksStep + BlockCardConfigurable + BillingViewStep)
3. `pdf-export/` THIRD (has the most complete ReviewSendStep with FlyBy badges + non-pricing + PDF export)

**Step 3**: If files in MANUAL_COPY_FILES are outdated (missing later features like PDF, prefetch), rebuild from the CONTAINER versions in this repo, which have all features intact.

---

## Priority Order for Next Session

1. **Rebuild FlyBy blocks** - Verify/restore FlyByBlockCard.tsx, ServiceBlocksStep.tsx FlyBy dropdown + handler, BlockLibraryMini FlyBy buttons, catalog index.ts exports
2. **Rebuild non-pricing block logic** - Verify/restore categoryHasPricing checks in BlockCardConfigurable, ReviewSendStep, BillingViewStep
3. **Fix Bug 1 & Bug 2** - success screen + billing view (debug why current fix didn't resolve)
4. **Build Vendor contract workflow** - buyer -> vendor flow
5. **Build Partner contract workflow** - buyer -> partner flow
