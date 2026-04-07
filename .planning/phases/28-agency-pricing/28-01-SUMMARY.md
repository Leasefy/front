---
phase: 28-agency-pricing
plan: 01
subsystem: pricing
tags: [agency, pricing, modal, flex, subscription]
dependency-graph:
  requires: [26-plan-gating]
  provides: [polished-agency-pricing-modal, upgrade-flow]
  affects: [29-advanced-reports, 30-executive-reports]
tech-stack:
  added: []
  patterns: [createPortal-modal, scroll-lock, escape-close]
key-files:
  created: []
  modified: []
decisions:
  - id: no-changes-needed
    decision: "Both files already met all plan requirements — no code modifications required"
    rationale: "AgencyPricingModal.tsx and PlanHeader.tsx were already polished from pre-GSD work"
metrics:
  duration: "~1 minute"
  completed: "2026-03-26"
---

# Phase 28 Plan 01: Agency Pricing Modal Polish Summary

**One-liner:** Verified agency pricing modal is production-ready with Flex vs Subscription differentiation, createPortal rendering, scroll lock, and AI-only Flex features.

## What Was Done

Both target files were thoroughly audited against all plan requirements. Every checkpoint passed without requiring code changes:

### AgencyPricingModal.tsx Verification

| Requirement | Status |
|---|---|
| Uses createPortal to render in document.body | Verified (line 395) |
| Body scroll locked when open (position: fixed) | Verified (lines 109-123) |
| Close on Escape key | Verified (lines 125-130) |
| Default tab is 'per-lease' | Verified (useState default) |
| Per-lease tab has 'Recomendado' badge | Verified (line 183) |
| Flex plans show AI features with Sparkle icon in indigo | Verified (lines 294-304) |
| Subscription plans do NOT show AI agent features | Verified (no AI in SUBSCRIPTION_PLANS) |
| Calculator slider works (0-50 range) | Verified (lines 336-343) |
| Calculator shows savings comparison vs subscription | Verified (lines 356-359) |
| Value props section present | Verified (lines 369-388) |
| No API REST in features | Verified (grep returned 0 matches) |
| Features are realistic | Verified |

### PlanHeader.tsx Verification

| Requirement | Status |
|---|---|
| Agency "Mejorar Plan" opens modal | Verified (line 395) |
| Agency "Mi Plan" dropdown opens modal | Verified (line 817) |
| AgencyPricingModal rendered with createPortal | Verified (line 858) |
| Fragment wrapper around header + modal | Verified (line 860) |
| "Gestionar suscripcion" goes to billing config | Verified (line 413) |

### Feature List Accuracy

**Subscription Plans (no AI):**
- Starter: CRM, Publicacion, Contratos, Pipeline, Soporte email
- Growth: Todo en Starter + Reportes, Recordatorios, Dispersiones, Soporte prioritario
- Business: Todo en Growth + Multi-sucursal, Reportes ejecutivos, Webhooks, Gerente cuenta

**Per-Lease Plans (with AI):**
- Starter Flex: Same as sub + 2 Agentes AI incluidos, Scoring AI + Matching AI
- Growth Flex: Todo en Starter Flex + Agentes AI avanzados
- Business Flex: Todo en Growth Flex + Todos los Agentes AI

## Build Status

`npx next build --no-lint` compiled successfully. A pre-existing type error in `src/app/auth/mfa-verify/page.tsx` (supabase possibly null) is unrelated to this plan.

## Deviations from Plan

None - both files were already in polished, production-ready state from pre-GSD implementation. No code modifications were required.

## Next Phase Readiness

The agency pricing modal is complete and ready to support:
- Phase 29 (Advanced Reports): Features listed in Growth/Growth Flex plans
- Phase 30 (Executive Reports): Features listed in Business/Business Flex plans
