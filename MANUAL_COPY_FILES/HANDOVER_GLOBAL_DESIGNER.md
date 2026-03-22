# Handover: Global Template Designer - UX Prototype

**Date:** 2026-03-22
**Branch:** `claude/init-contractnest-projects-Nl9ND`
**Status:** UX Prototype NOT YET BUILT - carry forward to next session

---

## What Was Done This Session

### 1. Menu Location Identified
The Global Designer entry point is already wired in the sidebar:

**File:** `contractnest-ui/src/utils/constants/industryMenus.ts` (lines 205-215)

```
Sidebar (Admin users only)
  └── 🔧 Implementation Toolkit (adminOnly: true, defaultOpen)
        ├── 📄 Global Templates        → /service-contracts/templates/admin/global-templates
        ├── ✏️ Global Template Designer → /service-contracts/templates/admin/global-designer  ← THIS
        ├── 📊 Template Analytics       → /service-contracts/templates/admin/analytics
        └── ... (other admin items)
```

**Visibility:** Only shown when `currentTenant.is_admin === true`
**Sidebar component:** `contractnest-ui/src/components/layout/Sidebar.tsx` (line 278 for admin check)

### 2. Role-Based Menu Filtering
- Regular menu items shown to all authenticated users
- Admin items filtered via `const isAdmin = Boolean(currentTenant?.is_admin)`
- Admin section has a visual separator in the sidebar
- Menu items defined in `industryMenus.ts` with `adminOnly: boolean` flag

---

## What Needs To Be Done (NEXT SESSION)

### PRIMARY REQUEST: Build a standalone HTML prototype

**User's exact words:** "I want the UX flow first - maybe in HTML" and "I don't need app's look and feel, but I need ultimate UX, don't take safe approach"

### Prototype Requirements

**Single HTML file** with embedded CSS + JS showing 4 views with navigation between them:

#### View 1: Industry Coverage Dashboard
- Stat cards at top (Total Industries, Avg Coverage %, Templates Published, Gaps Identified)
- Grid of industry cards (Healthcare, Financial Services, Education, Construction, etc.)
- Each card shows: industry name, icon, coverage % progress bar, template count, gap count
- Click a card → navigates to View 2

#### View 2: Resource List (per industry)
- Breadcrumb: Global Designer > [Industry Name]
- Filter bar (search, category filter, status filter)
- Table/list of resources/templates for that industry
- Each row: resource name, category, status (Published/Draft/Gap), last updated
- "Gap" items highlighted visually (these are templates that don't exist yet)
- Click a resource → opens View 3
- Bulk action: "Create Templates for All Gaps" button

#### View 3: Resource Detail (slide-in panel from right)
- Slides in over View 2 (View 2 stays visible but dimmed)
- Shows: template name, description, field schema, preview
- Actions: Edit, Publish, Delete, "Generate with AI"
- "Generate with AI" → opens View 4

#### View 4: AI Agent Panel
- Replaces or overlays View 3
- Chat-like interface for AI to generate/refine template
- Shows: prompt input, AI response stream, generated template preview
- Actions: Accept, Regenerate, Edit manually

### Design Direction
- **NOT** matching existing app theme
- **Ultimate UX** - bold, modern, premium SaaS feel
- Smooth animations/transitions between views
- Progressive panel pattern (drill-down with slide-ins)
- Single HTML file, no external dependencies (inline everything)

### File Location
Save to: `MANUAL_COPY_FILES/GlobalDesigner/global-designer-prototype.html`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `contractnest-ui/src/utils/constants/industryMenus.ts` | Menu config - Global Designer menu item defined here |
| `contractnest-ui/src/components/layout/Sidebar.tsx` | Sidebar component with admin filtering |
| `contractnest-ui/src/components/layout/MainLayout.tsx` | Main layout wrapping sidebar + content |
| `contractnest-ui/src/context/AuthContext.tsx` | Auth context with `is_admin` field |
| `MANUAL_COPY_FILES/GlobalDesigner/` | Where the HTML prototype should be saved |

---

## Industries to Include in Prototype

Based on existing menu config (`industryMenus.ts` lines 308-366):
1. Healthcare
2. Financial Services
3. Education
4. Construction
5. General/Default (catch-all)

---

## Session Notes
- User wants to SEE and CLICK THROUGH the flow before any backend/frontend code is written
- This is a validation step - once user approves the UX flow, they'll provide clearer requirements for actual implementation
- Don't overthink it - just build the HTML fast and iterate
