---
phase: 33
plan: "01"
subsystem: property-import
tags: [import, wizard, xlsx, csv, react-dropzone, column-mapping, levenshtein]
requires: []
provides:
  - route: /panel/inmobiliaria/portafolio/importar
  - component: ImportWizard (5-step wizard, steps 1-3 functional)
  - utility: parseSpreadsheetFile (SheetJS client-side parsing)
  - utility: autoMapColumns (keyword + Levenshtein heuristic)
  - utility: downloadTemplate (xlsx template generator)
affects:
  - plan: "33-02"
    note: "Steps 4-5 (AIReview, ConfirmImport) built on top of these foundations"
tech-stack:
  added:
    - xlsx@0.20.3 (SheetJS CDN tarball)
    - react-dropzone@11.x
  patterns:
    - ConsignacionWizard mirrored for ImportWizard (useState step, AnimatePresence, footer nav)
    - Dynamic import of xlsx to avoid main bundle bloat
    - Two-tier column heuristic (keyword dict → Levenshtein fallback)
key-files:
  created:
    - src/components/inmobiliaria/import/lib/importTypes.ts
    - src/components/inmobiliaria/import/lib/parseFile.ts
    - src/components/inmobiliaria/import/lib/columnMapping.ts
    - src/components/inmobiliaria/import/ImportWizard.tsx
    - src/components/inmobiliaria/import/steps/StepChooseMethod.tsx
    - src/components/inmobiliaria/import/steps/StepUploadFile.tsx
    - src/components/inmobiliaria/import/steps/StepColumnMapping.tsx
    - src/app/panel/inmobiliaria/portafolio/importar/page.tsx
  modified:
    - src/lib/i18n/locales/es.json (added inmobiliaria.import.* keys)
    - src/lib/i18n/locales/en.json (added inmobiliaria.import.* keys)
    - package.json (added xlsx, react-dropzone)
decisions:
  - choice: Dynamic import for SheetJS
    reason: xlsx is ~1MB; dynamic import keeps initial bundle small
  - choice: Inline Levenshtein (no library)
    reason: ~20 lines, avoids extra dep for a simple string metric
  - choice: Tier-1 keyword dict with normalized Spanish accents
    reason: Colombian real estate files use accented headers — stripping NFD ensures matching works
  - choice: Steps 4-5 render placeholder divs
    reason: Plan 33-01 scope is steps 1-3; plan 33-02 delivers AIReview + ConfirmImport
metrics:
  duration: ~45 minutes
  completed: "2026-03-29"
---

# Phase 33 Plan 01: Property Import Wizard (Steps 1-3) Summary

**One-liner:** Client-side Excel/CSV import wizard with SheetJS parsing, two-tier column auto-mapping (keyword dict + Levenshtein), and react-dropzone file upload at `/panel/inmobiliaria/portafolio/importar`.

## What Was Built

### Route & Page
- `/panel/inmobiliaria/portafolio/importar` — new route with back link and ImportWizard component
- Matches the exact layout pattern of `/panel/inmobiliaria/portafolio/nuevo`

### ImportWizard Component
- 5-step wizard mirroring `ConsignacionWizard.tsx` exactly:
  - Desktop step indicator with connector lines and status circles
  - Mobile progress bar with percentage
  - `AnimatePresence` mode="wait" for step transitions (x: 20 → 0 → -20)
  - Footer with cancel (left) + previous/next (right) buttons
  - Cancel confirmation dialog with amber warning icon
- Steps 1-3 fully functional; steps 4-5 render placeholder content

### Step 1: StepChooseMethod
- 3 method cards in `grid grid-cols-1 md:grid-cols-3`
- Excel/CSV (emerald, recommended), Software (amber, guided), Portales (neutral, disabled)
- Staggered animation with `animate-stagger-in` + `animationDelay`
- "Descargar plantilla" button triggers SheetJS template download

### Step 2: StepUploadFile
- `react-dropzone` with `.xlsx`, `.xls`, `.csv` accept types
- Three visual states: default dashed border, drag-active indigo, file-loaded emerald
- On drop: calls `parseSpreadsheetFile()`, then `autoMapColumns()`, updates wizard state
- Sheet selector dropdown shown when workbook has multiple sheets
- 5-row preview table with horizontal scroll, truncated cell values
- Loading state with spinning `SpinnerGap` icon during parse
- Error display for invalid files

### Step 3: StepColumnMapping
- Lists all parsed column headers with arrow → target field dropdown
- Confidence badges: Detected (emerald ≥ 0.9), Probable (amber 0.5-0.89), Sin mapear (red), Manual (indigo)
- 2-3 sample values shown per column for visual verification
- Changing dropdown marks mapping as `isManual: true`
- Deduplication: selecting a field already used by another column clears the previous mapping
- "Restablecer mapeo" ghost button re-runs `autoMapColumns`
- Warning section lists required fields (propertyAddress, monthlyRent, propertyCity, propertyType) that remain unmapped

### Parsing & Mapping Utilities
- `parseSpreadsheetFile(file, sheetName?)` — dynamic XLSX import, returns rows + headers + sheetNames
- `downloadTemplate()` — generates 8-column .xlsx template with example row
- `autoMapColumns(headers)` — Tier 1 keyword substring match (confidence 0.92), Tier 2 Levenshtein fallback (capped at 0.89), deduplication pass keeps highest-confidence mapping per field

### i18n
- 60+ keys added under `inmobiliaria.import` in both `es.json` and `en.json`
- Covers: title, subtitle, steps, methods, upload strings, mapping strings, field labels, wizard nav, cancel dialog

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Plan 33-02 can build directly on top of `ImportWizardState`:
- `properties` array (populated from `rawRows` + `columnMappings`) is the input for AIReview
- `aiAnalyzed` flag gates the Review step
- `importProgress` and `importedCount` are ready for the progress UI in ConfirmImport
