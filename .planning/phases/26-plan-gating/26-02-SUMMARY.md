---
phase: 26-plan-gating
plan: 02
subsystem: plan-gating
tags: [upgrade-prompt, feature-gate, gating-ui, agency-plans]
dependency-graph:
  requires: [26-01]
  provides: [upgrade-prompt-component, feature-gate-wrapper]
  affects: [advanced-reports-pages, executive-reports-pages, reminders-pages, ai-agents-gating]
tech-stack:
  added: []
  patterns: [conditional-render-wrapper, internal-modal-state, locale-aware-ui]
key-files:
  created:
    - src/components/inmobiliaria/UpgradePrompt.tsx
  modified: []
decisions: []
metrics:
  duration: ~2 minutes
  completed: 2026-03-26
---

# Phase 26 Plan 02: Gating UI Components Summary

UpgradePrompt component + FeatureGate conditional wrapper for plan-gated feature access control UI.

## What Was Done

### Task 1: Create UpgradePrompt and FeatureGate Components
Created `src/components/inmobiliaria/UpgradePrompt.tsx` with two named exports:

**UpgradePrompt** -- standalone upgrade message card:
- Lock icon (Phosphor duotone) in neutral circle
- Title: "Disponible en [plan name]" (locale-aware, overridable)
- Description: feature label from FEATURE_GATES (overridable)
- Flex-only callout: "Incluido en planes Flex" with Sparkle icon when feature requires flex
- "Ver planes" button (bg-neutral-900, rounded-xl) opens AgencyPricingModal
- Modal state managed internally via useState
- Props: featureName, title?, description?, className?

**FeatureGate** -- conditional render wrapper:
- Calls `useAgencyPlan().hasFeature(feature)` to check access
- If accessible: renders children
- If locked: renders custom fallback or default UpgradePrompt
- Props: feature, children, fallback?, className?

Commit: `e687950`

### Task 2: Verify Export Chain
Confirmed:
- Both `UpgradePrompt` and `FeatureGate` are named exports
- Import chain: UpgradePrompt -> useAgencyPlan -> FEATURE_GATES (no circular deps)
- Import chain: UpgradePrompt -> AgencyPricingModal (modal integration)
- Next.js build compiles with no new warnings

## Verification

- [x] `npx next build --no-lint` compiles successfully
- [x] UpgradePrompt renders with feature name and upgrade button
- [x] FeatureGate shows children when feature is accessible
- [x] FeatureGate shows UpgradePrompt when feature is locked
- [x] Upgrade button opens AgencyPricingModal
- [x] Both components use i18n for locale support

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

Any page or section can now gate features with a single wrapper:
```tsx
<FeatureGate feature="advanced-reports">
  <AdvancedReportsDashboard />
</FeatureGate>
```
Ready for plans 27+ to build gated report pages, reminder systems, and AI agent access control.
