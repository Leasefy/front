---
phase: 26-plan-gating
plan: 01
subsystem: plan-gating
tags: [feature-gates, hooks, access-control, agency-plans]
dependency-graph:
  requires: []
  provides: [feature-gates-config, hasFeature-hook, plan-type-detection]
  affects: [26-02, advanced-reports, executive-reports, reminders, ai-agents-gating]
tech-stack:
  added: []
  patterns: [feature-gate-map, tier-check-with-flex-flag, upgrade-reason-provider]
key-files:
  created:
    - src/lib/constants/feature-gates.ts
  modified:
    - src/lib/hooks/useAgencyPlan.ts
decisions:
  - id: flex-default
    decision: "Default plan type is 'flex' when no localStorage value exists"
    rationale: "Demo mode should show the most feature-rich experience (flex includes AI agents)"
  - id: upgrade-reason-shape
    decision: "getUpgradeReason returns plan name + bilingual labels"
    rationale: "Enough info for upgrade prompts without over-engineering"
metrics:
  duration: ~2.5 minutes
  completed: 2026-03-26
---

# Phase 26 Plan 01: Feature Gates Configuration Summary

Feature-to-plan mapping config + enhanced useAgencyPlan hook with hasFeature(), isFlexPlan, getUpgradeReason(), and setPlan() for testing.

## What Was Done

### Task 1: Feature Gates Configuration
Created `src/lib/constants/feature-gates.ts` with:
- `FeatureName` type covering 7 gatable features
- `FEATURE_GATES` record mapping each feature to its minimum plan tier
- `flexOnly` flag for flex-plan-exclusive features (ai-agents)
- Bilingual labels (ES/EN) for upgrade prompt UI
- Commit: `06314f9`

### Task 2: Enhanced useAgencyPlan Hook
Extended `src/lib/hooks/useAgencyPlan.ts` with:
- `hasFeature(name)` -- checks tier + flexOnly against current plan
- `isFlexPlan` -- read from `leasefy_agency_plan_type` in localStorage
- `getUpgradeReason(name)` -- returns required plan name + labels when locked
- `setPlan(planId, type)` -- sets both plan and type in localStorage for testing
- Full backward compatibility preserved (hasMinPlan, hasAdvancedReports unchanged)
- Commit: `0d98f29`

## Verification

- [x] Next.js compiles successfully (pre-existing mfa-verify type error unrelated)
- [x] feature-gates.ts exports FEATURE_GATES and FeatureName
- [x] useAgencyPlan.ts exports enhanced hook with hasFeature()
- [x] No changes to existing hook API (backward compatible)

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

Plan 26-02 can consume `hasFeature()` and `getUpgradeReason()` to build gating UI components (upgrade prompts, locked feature overlays).
