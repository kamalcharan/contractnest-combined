# ContractNest Theme System Audit
**Date**: 2026-03-29
**Scope**: Theme registry, application, CSS variables, component usage, glass effects

---

## CRITICAL FINDING UPFRONT

The **source-of-truth files are in the uninitialized `contractnest-ui` submodule** and cannot be read:
- `contractnest-ui/src/contexts/ThemeContext.tsx` — Provider, useTheme hook, theme application logic
- `contractnest-ui/src/utils/theme.ts` (or `.tsx`) — Theme registry with all theme definitions + color maps
- `contractnest-ui/src/styles/globals.css` — Global CSS + CSS custom properties
- `contractnest-ui/src/styles/layout.css` — Layout styles
- `contractnest-ui/src/pages/onboarding/steps/ThemeSelectionStep.tsx` — Onboarding theme picker
- `contractnest-ui/src/pages/auth/LoginPage.tsx` — Login page
- `contractnest-ui/src/components/onboarding/OnboardingLayout.tsx` — Onboarding layout wrapper

**Everything below is reconstructed from 150+ components that CONSUME these files.**

---

## 1. THEME REGISTRY

### Where is the theme registry defined?

**File**: `contractnest-ui/src/utils/theme.ts` (or `.tsx`)
**Evidence**: Header.tsx line 22 imports it:
```typescript
// MANUAL_COPY_FILES/layout-optimization/contractnest-ui/src/components/layout/Header.tsx:22
import { themes } from "../../utils/theme"
```

**Status**: FILE NOT READABLE — lives in uninitialized submodule.

### How many themes exist?

**Unknown exact count.** From Header.tsx (line 63-67), themes is an object (not array):
```typescript
const availableThemes = Object.values(themes).map(theme => ({
    name: theme.id,     // slug used by context
    label: theme.name,  // display name
    id: theme.id
}));
```

Each theme object has shape: `{ id: string, name: string, colors: {...}, darkMode: { colors: {...} } }`

### Theme IDs found in code:

| Source | Theme Reference |
|--------|----------------|
| FamilyKnows onboarding default | `'purple-tone'` |
| FamilyKnows edge function | `default_value: 'purple-tone'` |
| Header.tsx | Lists `Object.values(themes)` — count unknown |

**We cannot list all theme names/slugs without reading `utils/theme.ts`.**

### What does each theme define?

Reconstructed from 150+ component usages. Each theme has this structure:

```typescript
interface Theme {
  id: string;           // e.g. 'purple-tone'
  name: string;         // e.g. 'Purple Tone'
  colors: ColorSet;     // Light mode colors
  darkMode: {
    colors: ColorSet;   // Dark mode colors
  };
}

interface ColorSet {
  brand: {
    primary: string;      // Main brand color (buttons, accents)
    secondary: string;    // Secondary brand
    tertiary: string;     // Tertiary brand
  };
  utility: {
    primaryBackground: string;    // Page/main background
    secondaryBackground: string;  // Cards, panels, header
    primaryText: string;          // Primary text color
    secondaryText: string;        // Muted/secondary text
  };
  semantic: {
    success: string;     // Green tones
    warning: string;     // Yellow/amber tones
    error: string;       // Red tones
    info: string;        // Blue tones (inferred)
  };
  accent: {
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
  };
}
```

**Evidence for each property** (file:line):
- `colors.brand.primary` — Header.tsx:206, blocks.tsx:48, welcome/index.tsx:227
- `colors.brand.secondary` — ThemeSetupScreen.tsx:133
- `colors.brand.tertiary` — ThemeSetupScreen.tsx:134
- `colors.utility.primaryBackground` — welcome/index.tsx:193, blocks.tsx:58
- `colors.utility.secondaryBackground` — Header.tsx:225, blocks.tsx:338
- `colors.utility.primaryText` — Header.tsx:234, blocks.tsx:69
- `colors.utility.secondaryText` — Header.tsx:358, blocks.tsx:73
- `colors.semantic.success` — welcome/index.tsx:265, 278
- `colors.semantic.warning` — welcome/index.tsx:200, 207
- `colors.semantic.error` — blocks.tsx:356
- `colors.accent.accent1` — ThemeSetupScreen.tsx:135
- `colors.accent.accent4` — SplashScreen.tsx:291-299

### Are themes CSS custom properties, JS objects, or both?

**JS objects only.** Zero CSS custom properties (`var(--xxx)`) found anywhere in the codebase.

```
Grep for: var\(--    → ZERO matches in any .ts/.tsx file
Grep for: --cn-      → ZERO matches
Grep for: data-theme → ZERO matches
Grep for: :root      → ZERO matches (no .css files in repo)
```

All styling is applied via **inline `style={{}}` props** reading from the JS theme object.

---

## 2. THEME APPLICATION

### How is the active theme applied?

**Via React Context + inline styles.** NOT via CSS classes, data attributes, or CSS variables.

Pattern used by ALL 150+ components:
```typescript
const { isDarkMode, currentTheme } = useTheme();
const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

// Then everywhere:
<div style={{ backgroundColor: colors.utility.primaryBackground }}>
<p style={{ color: colors.utility.primaryText }}>
<button style={{ backgroundColor: colors.brand.primary }}>
```

**No CSS class switching.** No `data-theme` attribute. No `:root` variable changes.

### Where is ThemeProvider?

**File**: `contractnest-ui/src/contexts/ThemeContext.tsx`
**Status**: NOT READABLE (uninitialized submodule)

**Evidence**: App.tsx wraps entire app:
```typescript
// MANUAL_COPY_FILES/contractnest-ui/src/App.tsx:7
import { ThemeProvider } from './contexts/ThemeContext';

// Line 576-588
<ThemeProvider>
  <Router>
    <AuthProvider>
      ...
    </AuthProvider>
  </Router>
</ThemeProvider>
```

**What `useTheme()` returns** (from Header.tsx:50):
```typescript
const { isDarkMode, toggleDarkMode, currentThemeId, setTheme, currentTheme } = useTheme();
```

| Property | Type | Purpose |
|----------|------|---------|
| `isDarkMode` | `boolean` | Current dark mode state |
| `toggleDarkMode` | `() => void` | Toggle dark/light mode |
| `currentThemeId` | `string` | Active theme slug (e.g. 'purple-tone') |
| `setTheme` | `(id: string) => void` | Switch active theme |
| `currentTheme` | `Theme` | Full theme object with colors |

### When a user selects a theme, what happens?

**From Header.tsx (lines 128-148):**
```typescript
const handleThemeChange = async (themeName: string): Promise<void> => {
    // 1. Update React Context immediately (re-renders all components)
    setTheme(themeName as any);
    setThemeMenuOpen(false);

    // 2. Persist to backend
    if (user && updateUserPreferences) {
        await updateUserPreferences({ preferred_theme: themeName });
    }
};
```

**DOM changes**: NONE at the `<html>` or `<body>` level. All changes happen through React re-render — every component re-reads `colors` from context and updates its inline `style={{}}` props.

---

## 3. CSS VARIABLE COVERAGE

### List ALL CSS variables:

**NONE EXIST.**

```
Total CSS custom properties defined: 0
Total var(--xxx) usages in .ts/.tsx: 0
Total .css files in codebase: 0 (all in uninitialized submodule)
```

The theme system is **100% JavaScript-based** using inline styles. There are no CSS custom properties anywhere.

### Variables that SHOULD exist but DON'T:

| Need | Current Status |
|------|---------------|
| `--background` | Replaced by `colors.utility.primaryBackground` via JS |
| `--surface` / `--card` | Replaced by `colors.utility.secondaryBackground` via JS |
| `--text-primary` | Replaced by `colors.utility.primaryText` via JS |
| `--text-secondary` | Replaced by `colors.utility.secondaryText` via JS |
| `--accent` / `--primary` | Replaced by `colors.brand.primary` via JS |
| `--border` | NOT DEFINED — components use `${colors.utility.primaryText}20` (20% opacity hack) |
| `--input-bg` | NOT DEFINED — components use `${colors.utility.primaryText}05` or `10` |
| `--input-border` | NOT DEFINED — same opacity hack as border |
| `--shadow` | NOT DEFINED — hardcoded or Tailwind `shadow-lg` |
| `--glass-bg` | NOT DEFINED — see Glass section |
| `--glass-blur` | NOT DEFINED |

---

## 4. WHAT COMPONENTS ACTUALLY USE

### a. Onboarding Wizard

**OnboardingLayout**: `contractnest-ui/src/components/onboarding/OnboardingLayout.tsx`
- **NOT READABLE** — in uninitialized submodule
- Imported in App.tsx (line 49)
- Wraps all `/onboarding/*` routes

**OnboardingIndexPage**: `contractnest-ui/src/pages/onboarding/index.tsx`
- **NOT READABLE** — in uninitialized submodule

### b. ThemeSelectionStep (web)

**File**: `contractnest-ui/src/pages/onboarding/steps/ThemeSelectionStep.tsx`
- **NOT READABLE** — in uninitialized submodule
- Route: `/onboarding/theme-selection` (App.tsx:323)
- Imported as: `import ThemeSelectionStep from '@/pages/onboarding/steps/ThemeSelectionStep'`

### c. Login Page

**File**: `contractnest-ui/src/pages/auth/LoginPage.tsx`
- **NOT READABLE** — in uninitialized submodule
- Imported in App.tsx:36

### d. FamilyKnows Mobile Theme Step (readable)

**File**: `MANUAL_COPY_FILES/FamilyKnows/src/features/onboarding/screens/ThemeSetupScreen.tsx`
**Lines**: 1-461

**Theme vars used**: `themeItem.colors.brand.primary`, `.brand.secondary`, `.brand.tertiary`, `.accent.accent1`

**Hardcoded colors** (NOT using theme):
| Hex | Where | What |
|-----|-------|------|
| `#0F172A` | Line 160 | Background gradient (dark navy) |
| `#1E293B` | Line 160 | Background gradient (slate) |
| `#F59E0B` | Line 221 | Amber icon color |
| `#8B5CF6` | Line 234 | Purple dark mode icon |
| `#4ADE80` | Lines 307,394,432 | Green progress/badge |
| `rgba(30,41,59,0.8)` | Lines 360,387 | Glass card background |
| `rgba(255,255,255,0.1)` | Lines 366,391 | Glass border |

### Components using hardcoded colors vs theme vars:

**Every component in the codebase uses the SAME pattern:**
```typescript
const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
// Then inline style={{ color: colors.xxx, backgroundColor: colors.xxx }}
```

**Hardcoded patterns found across components:**
- Border colors: `${colors.utility.primaryText}20` — opacity hack, not a CSS variable
- Hover states: `${colors.utility.primaryText}05` or `10`
- Background subtle: `${colors.brand.primary}20` for selected states
- Tailwind classes: `shadow-sm`, `shadow-lg`, `rounded-lg` — NOT theme-aware

---

## 5. BACKGROUND & SURFACE

### What renders the page background?

**Cannot confirm** without reading the source files. Based on component patterns:
- Components set their own backgrounds via `style={{ backgroundColor: colors.utility.primaryBackground }}`
- The `<body>` likely has a default from `globals.css` (unreadable)
- Individual pages/layouts apply background via inline styles

### Does the background change per theme?

**YES for components that use theme context.** Each theme defines different `utility.primaryBackground` and `utility.secondaryBackground` values.

**UNKNOWN for the `<body>` element** — `globals.css` is unreadable.

### Light/Dark mode support?

**YES.** Every theme has both modes:
```typescript
const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
```

The `toggleDarkMode()` function switches between `theme.colors` (light) and `theme.darkMode.colors` (dark). Persisted via `updateUserPreferences({ is_dark_mode: !isDarkMode })`.

---

## 6. GLASS/FROSTED EFFECTS

### Is backdrop-filter used?

**No `backdrop-filter` found in any `.ts` or `.tsx` file** in the available codebase.

```
Grep for: backdrop-filter  → 0 matches
Grep for: backdrop_filter  → 0 matches
Grep for: glass            → 0 matches (in web components)
Grep for: frosted          → 0 matches
```

**Exception**: FamilyKnows mobile uses a "glass card" pattern but with **opacity-based fake glass**, not `backdrop-filter`:
```typescript
// ThemeSetupScreen.tsx:360
backgroundColor: 'rgba(30, 41, 59, 0.8)'  // Semi-transparent dark
// Line 366
borderColor: 'rgba(255,255,255,0.1)'       // Subtle border
```

### Glass card styles?

**Not in the web app.** No CSS class or variable controls glass effects.

The mobile FamilyKnows app fakes glass with:
- `rgba(30, 41, 59, 0.8)` background (semi-transparent dark slate)
- `rgba(255, 255, 255, 0.1)` borders (subtle white)
- NO actual blur/backdrop-filter

### What CSS class or variable controls glass?

**None.** No glass-related CSS class, variable, or utility exists.

---

## 7. VISUAL STATE RIGHT NOW

### What does the default theme look like?

**Cannot confirm exact hex values** without reading `utils/theme.ts`. Based on component defaults and the `'purple-tone'` default:

| Element | Likely Value | Source |
|---------|-------------|--------|
| Default theme ID | `'purple-tone'` | ThemeSetupScreen.tsx:43, FKonboarding/index.ts:19 |
| Brand primary | Purple-ish (#8B5CF6 range) | Name implies purple |
| Page background | Dark navy (#0F172A range) if dark mode | Hardcoded in mobile screens |
| Card background | Dark slate (#1E293B range) if dark mode | Hardcoded in mobile screens |
| Text color | White (#FFF) if dark mode | All mobile screens |
| Accent | Green (#4ADE80) in FamilyKnows | Different in ContractNest web? |

**We cannot confirm exact colors without the source file.**

### When switching themes on onboarding, what VISUALLY changes?

Based on the architecture:
1. `setTheme(selectedThemeId)` changes the React context value
2. All components re-render with new `colors` object
3. Every inline `style={{}}` updates to new color values
4. The preview cards on ThemeSetupScreen show `brand.primary`, `brand.secondary`, `brand.tertiary`, `accent.accent1`

### What does NOT change that should?

**Known issues from code analysis:**

1. **`<body>` background** — Likely set in `globals.css` with a static value. If globals.css uses a hardcoded color and not the JS theme, the body background won't change.

2. **Tailwind utility classes** — Components use `shadow-sm`, `shadow-lg`, `rounded-lg` etc. which are NOT theme-aware. Shadows won't change with theme.

3. **FamilyKnows mobile screens** — The gradient background is hardcoded:
   ```typescript
   // ThemeSetupScreen.tsx:160 — ALWAYS #0F172A → #1E293B regardless of selected theme
   <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} ... />
   ```

4. **Glass card backgrounds** — Hardcoded `rgba(30, 41, 59, 0.8)` in mobile, not derived from theme

5. **Opacity-based borders** — `${colors.utility.primaryText}20` appends hex alpha. This is a string concatenation hack, not a proper CSS variable. Works but fragile.

6. **No scroll/status bar theming** — Mobile status bar is always `barStyle="light-content"` regardless of theme

---

## ARCHITECTURE SUMMARY

```
┌────────────────────────────────────────────────────────┐
│  utils/theme.ts  [CANNOT READ]                         │
│  ─────────────────────────────────                     │
│  export const themes = {                               │
│    'purple-tone': { id, name, colors, darkMode },      │
│    'blue-ocean': { ... },                              │
│    ...                                                 │
│  }                                                     │
└──────────────┬─────────────────────────────────────────┘
               │ imported by
               ▼
┌────────────────────────────────────────────────────────┐
│  contexts/ThemeContext.tsx  [CANNOT READ]               │
│  ──────────────────────────────────                    │
│  Provides: isDarkMode, toggleDarkMode,                 │
│            currentThemeId, setTheme, currentTheme      │
│  Storage: localStorage + backend persistence           │
│  Application: React Context → inline styles            │
│  CSS Variables: NONE                                   │
│  DOM Mutations: NONE (no data-theme, no class)         │
└──────────────┬─────────────────────────────────────────┘
               │ consumed by
               ▼
┌────────────────────────────────────────────────────────┐
│  Every Component (150+ files)                          │
│  ─────────────────────────                             │
│  const { isDarkMode, currentTheme } = useTheme();      │
│  const colors = isDarkMode                             │
│    ? currentTheme.darkMode.colors                      │
│    : currentTheme.colors;                              │
│                                                        │
│  <div style={{ backgroundColor: colors.xxx }}>         │
│  <p style={{ color: colors.xxx }}>                     │
│                                                        │
│  NO CSS variables, NO CSS classes for theming           │
│  ALL inline style={{}} with JS color values             │
└────────────────────────────────────────────────────────┘
```

---

## GAPS & RISKS

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| 1 | **Source files unreadable** — ThemeContext.tsx, utils/theme.ts, globals.css, all onboarding steps are in uninitialized submodule | Cannot audit exact theme definitions, CSS variables, or onboarding UI | **CRITICAL** |
| 2 | **Zero CSS custom properties** — All theming via inline styles | Cannot use CSS transitions on theme change, no Tailwind integration, poor performance on bulk re-renders | **HIGH** |
| 3 | **No glass/frosted effects in web** | No backdrop-filter, no blur, no modern glass card UI | **MEDIUM** |
| 4 | **Opacity hack for borders/shadows** — `${color}20` string concat | Fragile, not type-safe, breaks if color format changes | **MEDIUM** |
| 5 | **No `<body>` or `:root` theme application** — Only inline styles | Scrollbar colors, selection colors, native elements don't theme | **HIGH** |
| 6 | **Mobile screens hardcode backgrounds** — Gradient always #0F172A→#1E293B | Theme selection preview changes but actual page doesn't | **HIGH** |
| 7 | **Tailwind classes NOT theme-aware** — shadow, border-radius static | Inconsistent with theme-driven colors | **LOW** |

---

## RECOMMENDATION

**To complete this audit, initialize the contractnest-ui submodule:**

```bash
cd contractnest-combined
git submodule update --init --recursive contractnest-ui
```

Then read these files:
1. `contractnest-ui/src/utils/theme.ts` — Full theme registry with all colors
2. `contractnest-ui/src/contexts/ThemeContext.tsx` — Provider + application logic
3. `contractnest-ui/src/styles/globals.css` — CSS variables if any exist
4. `contractnest-ui/src/styles/layout.css` — Layout CSS
5. `contractnest-ui/src/pages/onboarding/steps/ThemeSelectionStep.tsx` — Theme picker UI
6. `contractnest-ui/src/pages/auth/LoginPage.tsx` — Login page theming
7. `contractnest-ui/src/components/onboarding/OnboardingLayout.tsx` — Onboarding wrapper

---

## FILE REFERENCES INDEX

| File | Path | Lines | Status |
|------|------|-------|--------|
| Theme Registry | `contractnest-ui/src/utils/theme.ts` | all | **UNREADABLE** |
| ThemeContext | `contractnest-ui/src/contexts/ThemeContext.tsx` | all | **UNREADABLE** |
| globals.css | `contractnest-ui/src/styles/globals.css` | all | **UNREADABLE** |
| layout.css | `contractnest-ui/src/styles/layout.css` | all | **UNREADABLE** |
| ThemeSelectionStep | `contractnest-ui/src/pages/onboarding/steps/ThemeSelectionStep.tsx` | all | **UNREADABLE** |
| LoginPage | `contractnest-ui/src/pages/auth/LoginPage.tsx` | all | **UNREADABLE** |
| OnboardingLayout | `contractnest-ui/src/components/onboarding/OnboardingLayout.tsx` | all | **UNREADABLE** |
| Header (theme menu) | `MANUAL_COPY_FILES/layout-optimization/.../Header.tsx` | 1-700+ | READABLE |
| App.tsx (routes) | `MANUAL_COPY_FILES/contractnest-ui/src/App.tsx` | 1-596 | READABLE |
| Welcome/CNAK page | `MANUAL_COPY_FILES/cnak-claim-feature/.../welcome/index.tsx` | 1-300+ | READABLE |
| Catalog Studio blocks | `Manual_Copy/Catalog-Studio/.../blocks.tsx` | 1-400+ | READABLE |
| FK ThemeSetupScreen | `MANUAL_COPY_FILES/FamilyKnows/.../ThemeSetupScreen.tsx` | 1-461 | READABLE |
| FK SplashScreen | `MANUAL_COPY_FILES/FamilyKnows/.../SplashScreen.tsx` | 1-422 | READABLE |
| FK LoginScreen | `MANUAL_COPY_FILES/FamilyKnows/.../LoginScreen.tsx` | 1-644 | READABLE |
