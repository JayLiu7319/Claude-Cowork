# I18n Implementation Plan

**Based on**: [2025-01-21-i18n-design.md](../../../docs/plans/2025-01-21-i18n-design.md)
**Branch**: `feature/i18n`
**Worktree**: `.worktrees/feature-i18n`

## Overview

Implement i18n internationalization for Agent Cowork, supporting Chinese (Simplified) and English with automatic system language detection.

## Dependencies

Install i18n packages:
```bash
bun add i18next react-i18next
```

## Implementation Steps

### Step 1: Create locales directory structure

Create the translation resources directory and files:

```
locales/
├── index.ts
├── zh-CN/
│   ├── ui.json
│   ├── main.json
│   └── common.json
└── en/
    ├── ui.json
    ├── main.json
    └── common.json
```

### Step 2: Create translation files

**locales/index.ts** - Export translation resources for both main process and UI

**locales/en/ui.json** - English UI translations for all components:
- Sidebar (newSession, settings, sessions)
- PromptInput (placeholder, send)
- Settings (title, language, theme, etc.)
- StartSessionModal
- EventCard
- DecisionPanel

**locales/zh-CN/ui.json** - Chinese UI translations (corresponding keys)

**locales/en/main.json** - Main process translations:
- IPC messages
- Task execution messages
- Error messages

**locales/zh-CN/main.json** - Chinese main process translations

**locales/en/common.json** & **locales/zh-CN/common.json** - Shared translations (dates, numbers, etc.)

### Step 3: Create main process i18n module

**src/electron/i18n.ts**
- Initialize i18next instance
- Detect system language using `app.getLocale()`
- Map locale codes (zh-CN, en-US) to language codes (zh-CN, en)
- Configure fallback to English
- Export i18n instance

### Step 4: Initialize i18n in main process

**src/electron/main.ts**
- Import and initialize i18n early in startup
- Pass language to renderer process via IPC

### Step 5: Add getLanguage IPC handler

**src/electron/ipc-handlers.ts**
- Add `get-language` IPC handler that returns current language

**src/electron/preload.cts**
- Expose `getLanguage()` function to renderer process

### Step 6: Create UI layer i18n module

**src/ui/i18n.ts**
- Initialize react-i18next
- Get language from main process via IPC
- Configure with same resources as main process
- Set default namespace to 'ui'

### Step 7: Wrap App with I18nextProvider

**src/ui/App.tsx**
- Import i18n instance
- Wrap app with `<I18nextProvider i18n={i18n}>`

### Step 8: Translate components

For each component in `src/ui/components/`:

1. **Import** `useTranslation` hook
2. **Extract** hardcoded strings to `locales/{lang}/ui.json`
3. **Replace** strings with `t('key.path')` calls

**Components to translate:**
- Sidebar.tsx
- PromptInput.tsx
- SettingsModal.tsx
- StartSessionModal.tsx
- EventCard.tsx
- DecisionPanel.tsx

### Step 9: Translate main process

Update files with user-visible text:
- **src/electron/ipc-handlers.ts** - Error messages, status messages
- **src/electron/libs/runner.ts** - Task execution messages

### Step 10: Testing

1. Change system language to Chinese, restart app, verify Chinese display
2. Change system language to English, restart app, verify English display
3. Navigate all pages, check for untranslated text
4. Test missing key fallback behavior

## File Changes Summary

### New Files
- `locales/index.ts`
- `locales/zh-CN/ui.json`
- `locales/zh-CN/main.json`
- `locales/zh-CN/common.json`
- `locales/en/ui.json`
- `locales/en/main.json`
- `locales/en/common.json`
- `src/electron/i18n.ts`
- `src/ui/i18n.ts`

### Modified Files
- `src/electron/main.ts`
- `src/electron/ipc-handlers.ts`
- `src/electron/preload.cts`
- `src/ui/App.tsx`
- `src/ui/components/Sidebar.tsx`
- `src/ui/components/PromptInput.tsx`
- `src/ui/components/SettingsModal.tsx`
- `src/ui/components/StartSessionModal.tsx`
- `src/ui/components/EventCard.tsx`
- `src/ui/components/DecisionPanel.tsx`
- `src/electron/libs/runner.ts`

## Acceptance Criteria

- [ ] Dependencies installed (i18next, react-i18next)
- [ ] All locale files created with translations
- [ ] Main process i18n initialized
- [ ] UI layer i18n initialized
- [ ] getLanguage IPC handler working
- [ ] All components use t() for translations
- [ ] Chinese displays correctly on Chinese system
- [ ] English displays correctly on English system
- [ ] Build passes without errors
- [ ] No untranslated strings visible in UI

## Rollout Plan

1. Implement Phase 1 (Infrastructure) → Verify build
2. Implement Phase 2 (UI translation) → Test UI
3. Implement Phase 3 (Main process translation) → Test full flow
4. Final testing on different system languages
5. Create PR to main branch
