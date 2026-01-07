# Product Requirements Document: FamilyKnows Internationalization (i18n)

## Document Information
| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | January 6, 2026 |
| **Status** | Draft |
| **Product** | FamilyKnows Mobile App |
| **Author** | Development Team |

---

## 1. Executive Summary

### 1.1 Overview
FamilyKnows requires internationalization (i18n) support to serve users who prefer regional languages. This PRD outlines the implementation strategy for multi-language support, starting with English and Telugu, with architecture designed for future language expansion.

### 1.2 Goals
- Enable users to use FamilyKnows in their preferred language
- Provide seamless language switching without app restart
- Maintain offline functionality for all language content
- Support regional Indian languages starting with Telugu

### 1.3 Non-Goals (Phase 1)
- Real-time translation of user-generated content
- Voice input in regional languages
- RTL (Right-to-Left) language support
- Machine translation integration

---

## 2. Background & Context

### 2.1 Problem Statement
FamilyKnows targets Indian families where many users prefer consuming content in their native language. Currently, the app is English-only, creating a barrier for non-English speaking family members, particularly elderly users who may be more comfortable with regional languages.

### 2.2 User Research Insights
- 70%+ of Indian internet users prefer content in regional languages
- Family apps require multi-generational accessibility
- Language preference often varies within the same family
- Users expect native keyboard input support

### 2.3 Strategic Alignment
- Aligns with FamilyKnows' mission to be accessible to entire families
- Supports expansion into Tier 2/3 Indian cities
- Differentiator from English-only competitors

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **i18n Library** | react-i18next | Already installed, React Native compatible, robust interpolation |
| **Storage** | MMKV | Already installed, fast, encryption-ready for sensitive data |
| **Translation Format** | JSON namespace files | Standard format, easy to manage, supports nesting |
| **Keyboard** | Native OS Keyboard | No custom implementation needed, users already have language keyboards |

### 3.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FamilyKnows App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Screens   │    │  Components │    │   Services  │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                   │            │
│         └──────────────────┼───────────────────┘            │
│                            │                                │
│                    ┌───────▼───────┐                        │
│                    │  useTranslation │  (react-i18next hook)│
│                    └───────┬───────┘                        │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         │                  │                  │            │
│  ┌──────▼──────┐   ┌───────▼───────┐  ┌──────▼──────┐     │
│  │  en/*.json  │   │  te/*.json    │  │  (future)   │     │
│  │  (English)  │   │  (Telugu)     │  │  hi, ta...  │     │
│  └─────────────┘   └───────────────┘  └─────────────┘     │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    MMKV Storage                      │  │
│  │  @FamilyKnows:language = 'en' | 'te'                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 File Structure

```
FamilyKnows/
├── src/
│   ├── i18n/
│   │   ├── index.ts              # i18n configuration
│   │   ├── languageDetector.ts   # MMKV-based language detector
│   │   └── locales/
│   │       ├── en/
│   │       │   ├── common.json       # Shared strings (buttons, labels)
│   │       │   ├── auth.json         # Login, signup, onboarding
│   │       │   ├── home.json         # Home screen
│   │       │   ├── assets.json       # Asset management
│   │       │   ├── family.json       # Family management
│   │       │   ├── settings.json     # Settings screens
│   │       │   ├── notifications.json # Notifications
│   │       │   └── errors.json       # Error messages
│   │       └── te/
│   │           ├── common.json
│   │           ├── auth.json
│   │           ├── home.json
│   │           ├── assets.json
│   │           ├── family.json
│   │           ├── settings.json
│   │           ├── notifications.json
│   │           └── errors.json
│   ├── constants/
│   │   └── languages.ts          # Single source of truth for supported languages
│   └── ...
```

### 3.4 Configuration

#### i18n/index.ts
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageDetector } from './languageDetector';
import { supportedLanguages, defaultLanguage } from '../constants/languages';

// Import all namespaces
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
// ... other imports

import teCommon from './locales/te/common.json';
import teAuth from './locales/te/auth.json';
// ... other imports

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    // ... other namespaces
  },
  te: {
    common: teCommon,
    auth: teAuth,
    // ... other namespaces
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages.map(l => l.code),
    defaultNS: 'common',
    ns: ['common', 'auth', 'home', 'assets', 'family', 'settings', 'notifications', 'errors'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;
```

#### i18n/languageDetector.ts
```typescript
import { MMKV } from 'react-native-mmkv';
import { LanguageDetectorModule } from 'i18next';
import { defaultLanguage } from '../constants/languages';

const storage = new MMKV({ id: 'familyknows-settings' });
const LANGUAGE_KEY = 'user-language';

export const languageDetector: LanguageDetectorModule = {
  type: 'languageDetector',
  async: false,
  detect: () => {
    const savedLanguage = storage.getString(LANGUAGE_KEY);
    return savedLanguage || defaultLanguage;
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    storage.set(LANGUAGE_KEY, lng);
  },
};
```

---

## 4. Supported Languages

### 4.1 Phase 1 Languages

| Code | Language | Native Name | Flag | Status |
|------|----------|-------------|------|--------|
| `en` | English | English | 🇺🇸 | Default |
| `te` | Telugu | తెలుగు | 🇮🇳 | Primary Regional |

### 4.2 Future Phases (Roadmap)

| Phase | Languages | Timeline |
|-------|-----------|----------|
| Phase 2 | Hindi (hi), Tamil (ta) | Post-MVP |
| Phase 3 | Kannada (kn), Malayalam (ml) | Q3 2026 |
| Phase 4 | Marathi (mr), Bengali (bn), Gujarati (gu) | Q4 2026 |

### 4.3 Language Constants (Single Source of Truth)

```typescript
// src/constants/languages.ts

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
}

export const supportedLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isRTL: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', isRTL: false },
  // Future languages (commented until implemented)
  // { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', isRTL: false },
  // { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', isRTL: false },
];

export const defaultLanguage = 'en';
export const fallbackLanguage = 'en';
```

---

## 5. User Experience

### 5.1 Language Selection Touchpoints

1. **Onboarding** - Last step of onboarding flow (glass style)
2. **Settings > My Profile > Language** - Anytime change (normal style)
3. **App First Launch** - Default to English, user selects during onboarding

### 5.2 Language Selection Screen Variants

| Variant | Context | Style | Shows Progress |
|---------|---------|-------|----------------|
| `glass` | Onboarding | Dark glassmorphic, stars background | Yes (Step 4/4) |
| `normal` | Settings | Theme-aware (light/dark mode) | No |

### 5.3 User Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                           │
├──────────────────────────────────────────────────────────────┤
│  Splash → Intro → Login/Signup → Phone → Profile → Theme     │
│                                                     ↓        │
│                                              ┌──────────┐    │
│                                              │ Language │    │
│                                              │ Selection│    │
│                                              │ (glass)  │    │
│                                              └────┬─────┘    │
│                                                   ↓          │
│                                                 Main App     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    SETTINGS FLOW                             │
├──────────────────────────────────────────────────────────────┤
│  Main App → Menu → My Profile → Language (normal)            │
│                                      ↓                       │
│                              Select Language                 │
│                                      ↓                       │
│                              Save & Go Back                  │
│                              (App updates instantly)         │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 Language Change Behavior

- **No App Restart Required** - i18next re-renders all translated strings
- **Immediate Effect** - All screens update to new language
- **Persisted** - Language preference saved in MMKV, survives app restart
- **Synced to Server** - Language preference saved via `/api/FKonboarding/complete-step`

---

## 6. Translation Guidelines

### 6.1 JSON Structure Example

```json
// en/common.json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "continue": "Continue",
    "back": "Back",
    "done": "Done",
    "edit": "Edit",
    "delete": "Delete"
  },
  "labels": {
    "email": "Email",
    "password": "Password",
    "phone": "Phone Number",
    "name": "Name"
  },
  "messages": {
    "loading": "Loading...",
    "saving": "Saving...",
    "success": "Success!",
    "error": "Something went wrong"
  }
}

// te/common.json
{
  "buttons": {
    "save": "సేవ్ చేయి",
    "cancel": "రద్దు చేయి",
    "continue": "కొనసాగించు",
    "back": "వెనుకకు",
    "done": "పూర్తయింది",
    "edit": "సవరించు",
    "delete": "తొలగించు"
  },
  "labels": {
    "email": "ఇమెయిల్",
    "password": "పాస్వర్డ్",
    "phone": "ఫోన్ నంబర్",
    "name": "పేరు"
  },
  "messages": {
    "loading": "లోడ్ అవుతోంది...",
    "saving": "సేవ్ అవుతోంది...",
    "success": "విజయం!",
    "error": "ఏదో తప్పు జరిగింది"
  }
}
```

### 6.2 Interpolation Examples

```json
// en/family.json
{
  "welcome": "Welcome, {{name}}!",
  "memberCount": "{{count}} family member",
  "memberCount_plural": "{{count}} family members",
  "inviteSent": "Invitation sent to {{email}}"
}

// te/family.json
{
  "welcome": "స్వాగతం, {{name}}!",
  "memberCount": "{{count}} కుటుంబ సభ్యుడు",
  "memberCount_plural": "{{count}} కుటుంబ సభ్యులు",
  "inviteSent": "{{email}}కి ఆహ్వానం పంపబడింది"
}
```

### 6.3 Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('common');

  return (
    <View>
      <Text>{t('buttons.save')}</Text>
      <Text>{t('messages.loading')}</Text>
    </View>
  );
};

// With namespace
const FamilyComponent = () => {
  const { t } = useTranslation('family');

  return (
    <Text>{t('welcome', { name: 'Ravi' })}</Text>
    // Output (en): "Welcome, Ravi!"
    // Output (te): "స్వాగతం, Ravi!"
  );
};
```

---

## 7. Keyboard & Input

### 7.1 Keyboard Strategy

| Aspect | Approach |
|--------|----------|
| **Keyboard Type** | Native OS keyboard |
| **Language Input** | Users install Telugu keyboard via device settings |
| **No Custom Keyboard** | Rely on system keyboards (Google Indic, SwiftKey, etc.) |
| **Input Validation** | Accept Unicode text (no language-specific validation) |

### 7.2 User Education

- First-time Telugu users shown a one-time tooltip: "Enable Telugu keyboard in device settings"
- Link to device keyboard settings (deep link where supported)
- Fallback: English keyboard always works

---

## 8. Offline Support

### 8.1 Offline-First Architecture

| Component | Offline Behavior |
|-----------|------------------|
| **Translation Strings** | Bundled in app (no download needed) |
| **Language Preference** | Stored in MMKV (local) |
| **Language Change** | Works offline, syncs when online |

### 8.2 No Download Required

- All translations bundled at build time
- No OTA translation updates (for Phase 1)
- App size impact: ~50-100KB per language

---

## 9. API Integration

### 9.1 Save Language Preference

**Endpoint:** `POST /api/FKonboarding/complete-step`

```json
{
  "stepId": "language",
  "data": {
    "language": "te",
    "user_id": "uuid"
  }
}
```

### 9.2 Get User Preferences

**Endpoint:** `GET /api/FKauth/user`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "preferred_language": "te",
    // ... other fields
  }
}
```

---

## 10. Testing Strategy

### 10.1 Test Cases

| Category | Test Case | Priority |
|----------|-----------|----------|
| **Unit** | Translation keys exist for all supported languages | P0 |
| **Unit** | Fallback to English when key missing | P0 |
| **Unit** | Interpolation works correctly | P0 |
| **Integration** | Language change persists across app restart | P0 |
| **Integration** | Language change updates all visible screens | P0 |
| **Integration** | Language preference syncs to server | P1 |
| **E2E** | Complete onboarding in Telugu | P0 |
| **E2E** | Change language from Settings | P0 |

### 10.2 Translation Coverage Tool

```bash
# Script to check missing translations
node scripts/check-translations.js

# Output:
# ✓ en: 100% coverage (245/245 keys)
# ✓ te: 98% coverage (240/245 keys)
# Missing in te: ['settings.advanced.title', 'errors.network.timeout', ...]
```

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Telugu adoption | 20% of users | Analytics: language preference |
| Language retention | 80% stay in selected language | Analytics: language changes/user |
| Translation coverage | 100% for both languages | CI check |
| Crash rate (i18n related) | <0.1% | Crash analytics |

---

## 12. Rollout Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Set up i18n infrastructure
- [ ] Create all English JSON files (extract from hardcoded strings)
- [ ] Implement language detector with MMKV
- [ ] Update LanguageSetupScreen with variant support

### Phase 2: Telugu Translation (Week 3-4)
- [ ] Professional translation of all strings to Telugu
- [ ] Review by native Telugu speakers
- [ ] Create Telugu JSON files

### Phase 3: Integration (Week 5)
- [ ] Replace all hardcoded strings with t() calls
- [ ] Test all screens in both languages
- [ ] Fix layout issues (Telugu text may be longer)

### Phase 4: QA & Launch (Week 6)
- [ ] Full QA cycle in both languages
- [ ] Performance testing
- [ ] Release to production

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Telugu text longer than English | Layout breaks | Use flexible layouts, test all screens |
| Missing translations in production | Poor UX | CI check for 100% coverage, fallback to English |
| Font rendering issues | Unreadable text | Test on multiple devices, use system fonts |
| Translation quality | Confusing UX | Professional translators + native speaker review |

---

## 14. Future Considerations

### 14.1 Phase 2+ Features
- Language auto-detection from device locale
- Per-user language (family members can have different languages)
- OTA translation updates (without app update)
- Community translation contributions

### 14.2 Technical Debt to Address
- Extract all hardcoded strings before adding more languages
- Consider Crowdin/Lokalise for translation management at scale

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|------------|
| **i18n** | Internationalization - designing software for multiple languages |
| **l10n** | Localization - adapting software for specific locale |
| **Namespace** | Grouping of translation keys (e.g., 'auth', 'settings') |
| **Interpolation** | Inserting dynamic values into translated strings |
| **Fallback** | Default language when translation is missing |

### 15.2 References

- [react-i18next Documentation](https://react.i18next.com/)
- [MMKV Documentation](https://github.com/mrousavy/react-native-mmkv)
- [i18next Interpolation](https://www.i18next.com/translation-function/interpolation)

---

*Document End*
