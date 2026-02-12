---
phase: 23-preferences-autonomy
plan: 02
subsystem: ui
tags: [preferences, notifications, tone, thresholds, settings, beta]
depends_on:
  requires: [23-01]
  provides:
    - "NotificationSettings component with per-agent toggles and channel selector"
    - "ToneSelector component with formal/professional/casual cards"
    - "ThresholdSettings component with mora, budget, and score controls"
    - "Complete PreferencesPanel with all 4 sections and global reset"
  affects: [24-api-client]
tech-stack:
  added: []
  patterns: ["stepper-input", "toggle-switch", "segmented-control", "card-selector"]
key-files:
  created:
    - src/components/beta/NotificationSettings.tsx
    - src/components/beta/ToneSelector.tsx
    - src/components/beta/ThresholdSettings.tsx
  modified:
    - src/components/beta/PreferencesPanel.tsx
decisions:
  - id: "23-02-01"
    description: "Toggle switches use role=switch with aria-checked for accessibility"
  - id: "23-02-02"
    description: "COP formatting uses toLocaleString('es-CO') for dot-as-thousands separator"
  - id: "23-02-03"
    description: "Score indicator uses 3-tier color system: red (<50), amber (50-69), green (70+)"
  - id: "23-02-04"
    description: "Global reset button at panel bottom styled with red hover for destructive action affordance"
metrics:
  duration: "3min"
  completed: "2026-02-10"
---

# Phase 23 Plan 02: Notification Preferences, Tone Selector, and Threshold Settings Summary

Complete preferences page with notification configuration, communication tone selection, and configurable thresholds for mora tolerance, maintenance budgets, and candidate score minimums.

## One-liner

Notification toggles per agent + channel selector, 3-card tone picker, and stepper-based threshold controls with COP formatting and score color indicator.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | NotificationSettings component | fd2d357 | NotificationSettings.tsx, PreferencesPanel.tsx |
| 2 | ToneSelector component | dc422e6 | ToneSelector.tsx, PreferencesPanel.tsx |
| 3 | ThresholdSettings component | a9f593d | ThresholdSettings.tsx, PreferencesPanel.tsx |
| 4 | PreferencesPanel final assembly | 3cebaa7 | PreferencesPanel.tsx |

## Decisions Made

1. **Toggle switches use accessible patterns** — role="switch" with aria-checked and aria-label for screen reader support on notification toggles.

2. **COP currency formatting via toLocaleString('es-CO')** — Produces dot-as-thousands separator natively (e.g., $500.000 COP), matching Colombian convention.

3. **Three-tier score color indicator** — Red (<50 "Riesgoso"), amber (50-69 "Moderado"), green (70+ "Seguro") for at-a-glance risk assessment.

4. **Global reset at panel level** — "Restablecer toda la configuracion" button with red hover state at the bottom of the full panel, calling resetPreferences() for all sections.

5. **Reusable stepper sub-components** — NumberStepper and CurrencyStepper extracted within ThresholdSettings for consistent increment/decrement UX across different value types.

## Deviations from Plan

None - plan executed exactly as written.

## Build Verification

```
npx tsc --noEmit  # Zero errors at each task commit
```

## What Was Built

### NotificationSettings
- Per-agent category toggle switches with colored dot indicators
- Segmented channel selector: En la app | Email | WhatsApp | Todos
- Matches AutonomySettings card/control design language

### ToneSelector
- Three selectable tone cards: Formal, Profesional, Casual
- Each card shows Phosphor icon, label, and italic example text snippet
- Selected card has indigo ring with subtle background tint
- Responsive: stacked on mobile, 3-column on sm+ breakpoints

### ThresholdSettings
- Mora tolerance: 1-30 day stepper with "dias" suffix
- Maintenance budget: $100K-$5M COP stepper with 50K increments
- Candidate score: 0-100 stepper with 5-point increments and colored risk badge
- All inputs enforce min/max bounds

### PreferencesPanel Assembly
- All 4 sections rendered in order with dividers
- Scrollable container with max-w-2xl centered layout
- Global reset button at bottom

## Next Phase Readiness

Phase 23 (Preferences & Autonomy) is now complete. All preference types defined in BetaPreferences are configurable through the UI:
- Autonomy levels (23-01)
- Notifications, tone, thresholds (23-02)

Ready for Phase 24 (API Client) which will consume these preferences when making real API calls.
