---
phase: 33-property-import-system
plan: "02"
subsystem: import-wizard
tags: [ai-gap-filling, import, wizard, heuristics, animations]

dependency_graph:
  requires:
    - "33-01: ImportWizard base, StepChooseMethod, StepUploadFile, StepColumnMapping, importTypes"
  provides:
    - "gapFiller.ts: deterministic gap-filling engine with 6 heuristic rules"
    - "StepAIReview: animated AI analysis step with per-property suggestion cards"
    - "AISuggestionCard: expandable card with individual accept/reject per suggestion"
    - "StepConfirmImport: final summary, agent assignment, import progress simulation"
  affects:
    - "Future: Real AI backend can replace gapFiller.ts analyzeProperties() with an API call"
    - "Future: Agent assignment in StepConfirmImport can POST to a real endpoint"

tech_stack:
  added: []
  patterns:
    - "Heuristic gap-filler as mock AI — deterministic rules simulate AI analysis experience"
    - "Double-cast via unknown for dynamic property assignment: (prop as unknown as Record<string, unknown>)"
    - "useEffect with cancelled flag for async analysis simulation"
    - "Progress simulation with for-loop + await setTimeout"

key_files:
  created:
    - "src/components/inmobiliaria/import/lib/gapFiller.ts"
    - "src/components/inmobiliaria/import/components/AISuggestionCard.tsx"
    - "src/components/inmobiliaria/import/steps/StepAIReview.tsx"
    - "src/components/inmobiliaria/import/steps/StepConfirmImport.tsx"
  modified:
    - "src/components/inmobiliaria/import/ImportWizard.tsx"
    - "src/lib/i18n/locales/es.json"
    - "src/lib/i18n/locales/en.json"

decisions:
  - id: "double-cast-unknown"
    decision: "Use (prop as unknown as Record<string, unknown>) for dynamic field assignment"
    rationale: "TypeScript's ImportProperty interface lacks an index signature; double-cast is explicit and intentional"
  - id: "cancelled-flag-async"
    decision: "Use cancelled flag in useEffect for async gap-filling simulation"
    rationale: "Prevents state update after unmount if user navigates away during 2s delay"
  - id: "footer-hidden-on-success"
    decision: "Hide wizard footer when step 5 import is complete (importedCount > 0)"
    rationale: "Success state renders its own CTA buttons; footer Next button is irrelevant"
  - id: "step4-valid-when-analyzed"
    decision: "Step 4 is valid only when aiAnalyzed=true AND at least 1 property is selected without errors"
    rationale: "Prevents proceeding to confirm before analysis completes or with nothing to import"

metrics:
  duration: "~45 minutes"
  completed: "2026-03-29"
---

# Phase 33 Plan 02: AI Review + Confirmation Import Summary

**One-liner:** Mock AI gap-filler with 6 heuristic rules (rent estimates, city detection, type normalization), animated StepAIReview with 2s delay + stagger-in cards, per-suggestion accept/reject, and StepConfirmImport with progress bar simulation.

## Tasks Completed

| # | Task | Files | Commit |
|---|------|-------|--------|
| 1 | Gap-filling engine | gapFiller.ts | 842e60c |
| 2 | AISuggestionCard component | components/AISuggestionCard.tsx | 842e60c |
| 3 | StepAIReview | steps/StepAIReview.tsx | 842e60c |
| 4 | StepConfirmImport | steps/StepConfirmImport.tsx | 842e60c |
| 5 | Update ImportWizard | ImportWizard.tsx | 842e60c |
| 6 | i18n translations | es.json, en.json | 842e60c |

## What Was Built

### gapFiller.ts
Six deterministic rules that simulate AI gap-filling:

1. **Missing monthlyRent** — Estimates from `RENT_ESTIMATES` table keyed by city + property type. Colombian market data for Bogotá, Medellín, Cali, Barranquilla, and a default. Confidence: 'media'.
2. **Missing propertyZone** — Suggests "Por definir" with 'baja' confidence, prompts manual review.
3. **Missing/ambiguous propertyType** — Normalizes 15+ Spanish variants ('apto', 'apartamento', 'casa', 'local', etc.) to enum values. Auto-applies normalization directly (no suggestion needed); falls back to 'apartment' suggestion if unrecognizable.
4. **Missing propertyCity** — Scans `propertyAddress` against 16 Colombian cities. 'media' confidence if found, 'baja' if not.
5. **Missing commissionPercent** — Suggests 10% with 'alta' confidence (Colombian market standard 8–12%).
6. **Missing propertyTitle** — Generates `{typeLabel} en {zone || city}` with 'media' confidence.

Also exports `mapRowsToProperties()` which converts ParsedRow[] + ColumnMapping[] into ImportProperty[] with numeric cleaning.

### AISuggestionCard
- Expandable card with checkbox for import selection
- Status badge: "Completo" (emerald), "N sugerencias" (amber), "Error" (red), "Listo" (emerald)
- Suggestion rows show field name, suggested value, confidence pill, reasoning text, and Accept/Reject buttons
- Accepted rows turn green-tinted; rejected rows get strikethrough + dim
- "Aceptar todas" button per-property when pending suggestions exist
- Error messages shown in red at bottom with Warning icon

### StepAIReview
- On mount: calls `mapRowsToProperties()` then `analyzeProperties()` after 2s simulated delay
- Loading: SpinnerGap + shimmer skeleton cards
- Post-analysis: emerald/amber/red stat pills, batch "Aceptar todas las sugerencias" button, select-all checkbox
- Property list sorted: errors first → has suggestions → complete
- Scrollable container (max-h-[60vh]) when >5 properties
- All suggestion handlers update wizard state via `updateState`

### StepConfirmImport
- Stats grid: properties to import (indigo), excluded (neutral), AI suggestions accepted (emerald), remaining errors (red/emerald)
- Agent dropdown from `useAgentes()` hook
- Import simulation: for-loop with per-item setTimeout, progress bar transitions from 0→100%
- Success state: emerald CheckCircle with `animate-scale-in`, "Ver portafolio" navigates to portfolio
- Toast notification on success via `toast.success()`

### ImportWizard updates
- Imports and renders StepAIReview (step 4) and StepConfirmImport (step 5)
- Step 4 valid: `aiAnalyzed && at least 1 selected non-error property`
- Footer hidden when on step 5 and `importedCount > 0` (success state)
- Next button hidden on last step (step 5 manages its own submit)

## Deviations from Plan

### Auto-fixed Issues

**[Rule 1 - Bug] Double-cast required for dynamic property assignment**

- **Found during:** TypeScript compilation after Task 1
- **Issue:** TypeScript rejects `(prop as Record<string, unknown>)` because ImportProperty lacks an index signature
- **Fix:** Use `(prop as unknown as Record<string, unknown>)` double-cast pattern throughout gapFiller.ts, StepAIReview.tsx, and AISuggestionCard.tsx
- **Files modified:** All 3 new files

**[Rule 2 - Missing Critical] Footer conditional JSX needs proper wrapping**

- **Found during:** Task 5 (ImportWizard update)
- **Issue:** Initial `&&` pattern with direct `<div>` wasn't wrapped in parentheses — valid JSX but risky for maintainability
- **Fix:** Wrapped in proper `(...)` grouping, also changed to hide Next button on last step entirely (step 5 has its own import button)

## Next Phase Readiness

- All 5 steps of the Import Wizard are now functional end-to-end
- Phase 33 is complete: method selection → file upload → column mapping → AI review → confirm import
- Future: Replace `analyzeProperties()` in gapFiller.ts with real API call to AI backend when ready
- Future: POST `selectedProperties` to an actual endpoint in `handleImport()`
