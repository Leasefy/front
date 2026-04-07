---
phase: 33-property-import-system
plan: "03"
subsystem: import-wizard
tags: [import, wizard, software-migration, portal-import, i18n, portfolio]

dependency_graph:
  requires: ["33-01", "33-02"]
  provides:
    - StepSoftwareMigration with expandable SIMI/Daytona/DOMUS/WASI/Inmoflex cards
    - StepPortalImport with Próximamente placeholder and email capture
    - Method-aware ImportWizard routing (step 2 renders by method)
    - Portfolio page import entry points (header button + empty state)
    - i18n keys for software and portal namespaces (es + en)
  affects: []

tech_stack:
  added: []
  patterns:
    - method-aware conditional rendering in wizard step 2
    - visibleSteps computed from method for dynamic step indicator
    - terminal step pattern (portal method caps at 2 steps, shows "Volver" CTA)
    - local state email capture with success toast (no API)

key_files:
  created:
    - src/components/inmobiliaria/import/steps/StepSoftwareMigration.tsx
    - src/components/inmobiliaria/import/steps/StepPortalImport.tsx
  modified:
    - src/components/inmobiliaria/import/ImportWizard.tsx
    - src/components/inmobiliaria/import/steps/StepChooseMethod.tsx
    - src/app/panel/inmobiliaria/portafolio/page.tsx
    - src/lib/i18n/locales/es.json
    - src/lib/i18n/locales/en.json

decisions:
  - id: visibleSteps-computed
    decision: "visibleSteps useMemo derives 2-step array when method === 'portal', full 5-step array otherwise"
    rationale: "Single source of truth for step indicator and navigation cap; avoids scattered conditionals"
  - id: portal-terminal-step
    decision: "Portal method shows 'Volver al portafolio' button instead of 'Siguiente' when on step 2"
    rationale: "Portal is a terminal step — no upload/mapping/review/confirm applies to 'coming soon' portals"
  - id: software-to-excel-switch
    decision: "StepSoftwareMigration 'Ya tengo mi archivo' CTA sets method to 'excel' in wizard state"
    rationale: "Method change causes step 2 to re-render as StepUploadFile — simplest pivot without extra sub-step state"
  - id: portal-enabled
    decision: "Portal method card in StepChooseMethod changed from disabled:true to disabled:false"
    rationale: "Portal now shows its own step (StepPortalImport) instead of going nowhere"
  - id: no-toast-library
    decision: "Email capture success state uses local boolean, shows inline success message"
    rationale: "No toast library dependency needed; inline feedback is cleaner for this context"

metrics:
  tasks_completed: 5
  tasks_total: 5
  duration: "~25 minutes"
  completed: "2026-03-29"
---

# Phase 33 Plan 03: Software Migration + Portal Import + Portfolio Integration Summary

**One-liner:** Software migration guide cards with expandable step-by-step instructions, portal placeholder with email capture, and portfolio import entry points — completing the three-method import wizard.

## What Was Built

### Task 1: StepSoftwareMigration
Cards for 5 Colombian real estate ERP systems (SIMI, Daytona, DOMUS, WASI, Inmoflex) with:
- `animate-stagger-in` with 80ms delay per card
- Expandable click-to-toggle export instructions (4 steps, `animate-content-reveal` per step)
- "Popular" indigo badge on SIMI and Daytona
- Amber-styled "Solicitar ayuda" card at bottom linking to WhatsApp
- "Ya tengo mi archivo" CTA that sets `method: 'excel'` causing wizard step 2 to re-render as StepUploadFile

### Task 2: StepPortalImport
Portal placeholder for FincaRaíz, Metrocuadrado, Ciencuadras with:
- "Próximamente" badge (absolute positioned, top-right, rounded-bl-xl)
- Globe icon in portal-color circle (green, blue, orange)
- Disabled URL input fields with opacity-50
- Email capture section with success state (inline message, 5s auto-reset)
- No API call — purely frontend state

### Task 3: ImportWizard Updates
- Added `StepSoftwareMigration` and `StepPortalImport` imports
- `visibleSteps` useMemo: `STEPS.slice(0, 2)` for portal, full array otherwise
- Step 2 switch case: routes to `StepSoftwareMigration` | `StepPortalImport` | `StepUploadFile` by method
- Step 2 validation: software and portal are always valid (no file required)
- `goToNextStep` capped at `visibleSteps.length` instead of `TOTAL_STEPS`
- Step indicator and mobile progress bar use `visibleSteps` array
- Footer: portal step 2 shows "Volver al portafolio" instead of "Siguiente"

### Task 4: Portfolio Page Integration
- Added `FileArrowUp` to imports
- `handleImportar` callback: `router.push('/panel/inmobiliaria/portafolio/importar')`
- Header buttons wrapped in `flex items-center gap-3` — import button (outline) + nueva consignación (primary)
- EmptyState enhanced: added `useRouter()`, renders import CTA button below description

### Task 5: i18n Translations
Added `inmobiliaria.import.software` and `inmobiliaria.import.portal` namespaces to both `es.json` and `en.json` including:
- `software.title/subtitle/popular/exportSteps.step1-4/otherSoftware/otherSoftwareDesc/haveFile/requestHelp`
- `portal.title/subtitle/comingSoon/backToPortfolio/emailCapture.title/subtitle/placeholder/submit/success`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Minor implementation notes (within spec):**
- The "Solicitar ayuda" card uses an `<a>` tag with `href="#"` and `e.preventDefault()` per plan's "placeholder WhatsApp link (href='#')"
- Email capture success resets after 5 seconds (not specified in plan, reasonable UX choice)
- Portal method was `disabled: true` in StepChooseMethod — changed to `false` as required by "When user selects 'portal' method in step 1, step 2 shows PortalImport"

## Commits

- `922f7c8`: feat(33-03): add software migration + portal import steps and portfolio integration

## Next Phase Readiness

Phase 33 (Property Import System) is now complete across all 3 plans:
- Plan 01: Wizard scaffolding, StepChooseMethod, StepUploadFile, StepColumnMapping, file parsing
- Plan 02: StepAIReview with mock AI gap-filling, StepConfirmImport with progress simulation
- Plan 03: StepSoftwareMigration, StepPortalImport, wizard method routing, portfolio integration

The import route `/panel/inmobiliaria/portafolio/importar` is fully functional for Excel/CSV imports with AI review. Software and portal methods have their respective UI guides. No blockers for future phases.
