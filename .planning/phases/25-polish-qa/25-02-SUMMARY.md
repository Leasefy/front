---
phase: 25-polish-qa
plan: 02
subsystem: beta-ui
tags: [i18n, keyboard-shortcuts, accessibility, a11y, useI18n, aria]

# Dependency graph
requires:
  - phase: 25-01
    provides: All 23 Beta components with dark mode and mobile layout
  - phase: 17-beta-sidebar
    provides: BetaLayout, BetaSidebar, AppSwitcher
  - phase: 18-chat-interface
    provides: ChatInput, ChatContainer, AssistantBubble, TypingIndicator
provides:
  - "All Beta UI strings available in ES and EN via useI18n() t() calls"
  - "Keyboard shortcuts: Cmd/Ctrl+K new chat, Esc close drawer"
  - "Screen reader support: ARIA landmarks, aria-live, aria-expanded, skip-nav"
affects:
  - "Future locale additions: all Beta strings already in beta.* namespace"
  - "Backend integration: locale-aware UI ready for real API"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "labelKey pattern: static arrays use translation key strings resolved at render time via t()"
    - "DATE_GROUP_KEYS lookup map: internal string keys mapped to i18n translation keys"
    - "Renderless shortcut component: BetaKeyboardShortcuts returns null, wires hook inside provider"
    - "Skip-to-chat link: sr-only with focus:not-sr-only for keyboard accessibility"

key-files:
  created:
    - src/lib/hooks/useBetaKeyboardShortcuts.ts
  modified:
    - src/lib/i18n/locales/es.json (beta.* namespace ~155 keys)
    - src/lib/i18n/locales/en.json (beta.* namespace ~155 keys)
    - src/components/beta/BetaLayout.tsx
    - src/components/beta/BetaSidebar.tsx
    - src/components/beta/ChatInput.tsx
    - src/components/beta/ConversationList.tsx
    - src/components/beta/DecisionCard.tsx
    - src/components/beta/DecisionHistory.tsx
    - src/components/beta/BriefingCard.tsx
    - src/components/beta/BriefingHistory.tsx
    - src/components/beta/PreferencesPanel.tsx
    - src/components/beta/AutonomySettings.tsx
    - src/components/beta/NotificationSettings.tsx
    - src/components/beta/ToneSelector.tsx
    - src/components/beta/ThresholdSettings.tsx
    - src/components/beta/AgentActivityIndicator.tsx
    - src/components/beta/AgentResultCard.tsx
    - src/components/beta/AssistantBubble.tsx
    - src/components/beta/TypingIndicator.tsx
    - src/components/beta/AppSwitcher.tsx
    - src/components/beta/ChatContainer.tsx
    - src/components/beta/MobileSidebarDrawer.tsx

key-decisions:
  - "25-02: labelKey pattern for static arrays -- store translation key string, resolve with t() at render time"
  - "25-02: DATE_GROUP_KEYS Record<DateGroup, string> maps internal Spanish keys to i18n keys for display"
  - "25-02: Nested function components each get own useI18n() call (hooks cant share from parent scope)"
  - "25-02: BetaKeyboardShortcuts renderless component inside BetaChatProvider for context access"
  - "25-02: Cmd+K fires globally even in input fields (standard shortcut convention)"
  - "25-02: UserBubble 'TU' kept as-is (user initials, not translatable text)"
  - "25-02: Mock data strings (AGENT_RESULT_SUMMARIES, AGENT_ERROR_MESSAGES) kept hardcoded -- will be replaced by real API responses"

patterns-established:
  - "labelKey/exampleKey pattern for static option arrays with i18n"
  - "Renderless keyboard shortcut component pattern (returns null, wraps useEffect hook)"
  - "Skip-to-chat with sr-only focus:not-sr-only for screen reader navigation"

# Metrics
duration: 10min
completed: 2026-02-10
---

# Phase 25 Plan 02: i18n Strings + Keyboard Shortcuts + Accessibility Summary

**Full i18n integration via useI18n() across 20 Beta components with ~155 translation keys, Cmd+K keyboard shortcut, and ARIA landmarks/live regions/expanded states for screen reader support**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-02-10
- **Tasks:** 4/4
- **Files modified:** 22 (1 created, 21 modified)

## Accomplishments
- Added ~155 translation keys under `beta.*` namespace to both ES and EN locale files covering all Beta UI strings
- Integrated `useI18n()` into 20 Beta components, replacing every hardcoded Spanish string with `t('beta.*')` calls
- Created `useBetaKeyboardShortcuts` hook with Cmd/Ctrl+K (new chat) and Esc (close drawer) shortcuts
- Added ARIA landmarks (`role="main"`, `role="navigation"`, `role="dialog"`), `aria-live="polite"` regions, `aria-expanded` toggles, and skip-to-chat navigation link

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Beta translations to locale files** - `12ba1b3` (feat)
2. **Task 2: Integrate useI18n() into all Beta components** - `cec5b44` (feat)
3. **Task 3: Keyboard shortcuts hook** - `7874eeb` (feat)
4. **Task 4: Accessibility improvements** - `d7fc250` (feat)

## Files Created/Modified

- `src/lib/i18n/locales/es.json` - Added `beta.*` namespace with ~155 Spanish translation keys
- `src/lib/i18n/locales/en.json` - Added `beta.*` namespace with ~155 English translation keys
- `src/lib/hooks/useBetaKeyboardShortcuts.ts` - New hook: Cmd/Ctrl+K new chat, Esc close drawer
- `src/components/beta/BetaLayout.tsx` - Skip-to-chat link, role="main", keyboard shortcuts wiring
- `src/components/beta/BetaSidebar.tsx` - role="navigation", aria-label, role="tablist" on tabs
- `src/components/beta/ChatInput.tsx` - i18n placeholder and send button aria-label
- `src/components/beta/ConversationList.tsx` - i18n all strings, DATE_GROUP_KEYS lookup map
- `src/components/beta/DecisionCard.tsx` - i18n recommendation labels, aria-label on option buttons
- `src/components/beta/DecisionHistory.tsx` - i18n pending/resolved labels, empty state
- `src/components/beta/BriefingCard.tsx` - i18n day names, badge, aria-expanded on sections
- `src/components/beta/BriefingHistory.tsx` - i18n day abbreviations, today/yesterday labels
- `src/components/beta/PreferencesPanel.tsx` - i18n title, subtitle, reset button
- `src/components/beta/AutonomySettings.tsx` - i18n autonomy title, subtitle, reset
- `src/components/beta/NotificationSettings.tsx` - i18n channels with labelKey pattern
- `src/components/beta/ToneSelector.tsx` - i18n tone options with labelKey/exampleKey pattern
- `src/components/beta/ThresholdSettings.tsx` - i18n headers, descriptions, score labels, stepper aria-labels
- `src/components/beta/AgentActivityIndicator.tsx` - i18n status text, aria-live="polite"
- `src/components/beta/AgentResultCard.tsx` - i18n retry button, aria-expanded, aria-label on toggle
- `src/components/beta/AssistantBubble.tsx` - i18n "Leasefy AI" label
- `src/components/beta/TypingIndicator.tsx` - i18n "Leasefy AI" label
- `src/components/beta/AppSwitcher.tsx` - i18n all workspace switch labels
- `src/components/beta/ChatContainer.tsx` - aria-live="polite" on messages area
- `src/components/beta/MobileSidebarDrawer.tsx` - role="dialog", aria-modal, i18n close button

## Decisions Made
- Used `labelKey` pattern for static arrays: store translation key in config, resolve with `t()` at render time
- Created `DATE_GROUP_KEYS` Record to map internal DateGroup type values (Spanish strings) to i18n display keys
- Each nested function component (ConversationItem, DecisionItem, MobileNewChatButton) gets its own `useI18n()` call
- `BetaKeyboardShortcuts` renderless component (returns null) placed inside BetaChatProvider to access context
- Mock data strings (agent result summaries, error messages) kept hardcoded since they'll be replaced by real API responses
- `UserBubble` "TU" kept as literal (user initials, not a translatable string)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None in this execution session. All TypeScript builds passed with zero errors across all 4 tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Beta components fully i18n-integrated with ES and EN locales
- Keyboard shortcuts active for power-user navigation
- Screen reader accessibility meets basic WAI-ARIA standards
- Phase 25 (Polish & QA) is now fully complete (all 3 plans done)

---
*Phase: 25-polish-qa*
*Completed: 2026-02-10*
