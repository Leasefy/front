# Phase 33: Property Import System - Research

**Researched:** 2026-04-04
**Domain:** File parsing, import wizards, heuristic column mapping, AI-style UX
**Confidence:** HIGH (codebase verified), MEDIUM (library selection), LOW (Colombian ERP export formats)

---

## Summary

This phase builds a multi-method property import system for Colombian real estate agencies. The primary deliverable is a client-side Excel/CSV upload wizard with heuristic "AI" column mapping and gap-filling, plus static content cards for Software Migration (Method 2) and Portal Import (Method 3).

The feature is entirely frontend — no real AI backend is needed. Column mapping and gap-filling are implemented as deterministic heuristics that simulate AI behavior with mock delays and confidence scores. The existing ConsignacionWizard pattern (6-step, framer-motion, useCallback/useState state machine) is the direct reuse template.

**Primary recommendation:** Use SheetJS (xlsx 0.20.3) for all file formats (.xlsx, .xls, .csv) parsed client-side, react-dropzone for the drop zone, and pure Levenshtein/keyword scoring for column mapping. No API route is needed — all parsing runs in the browser; only the final "confirm import" step would hit an API in the future.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xlsx (SheetJS) | 0.20.3 | Parse .xlsx, .xls, .csv to JSON | Only library that handles all three formats; ~7.7M weekly downloads; reads binary XLS files that PapaParse cannot |
| react-dropzone | 14.x | Drag & drop file zone | Industry standard for React file input; handles mime type filtering, drag states |
| framer-motion | already installed (^12) | Step transition animations, AI reveal animations | Already in codebase; used in ConsignacionWizard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PapaParse | (NOT needed) | CSV-only parsing | Skip — SheetJS already handles CSV with `read(data, {type:'binary'})` |
| zod | already installed (^3) | Validate each parsed row against expected field shapes | Already in codebase; use for per-row validation after column mapping |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SheetJS | PapaParse | PapaParse is faster and MIT but CSV-ONLY — agencies export .xlsx from Simi/Daytona, so we need SheetJS |
| react-dropzone | Native `<input type="file">` | Native is simpler but react-dropzone adds drag states, mime filtering, and the UX the context demands |
| SheetJS npm CDN | exceljs | exceljs is larger (~2MB), node-first, not ideal for client-side streaming |

**Installation:**
```bash
npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz react-dropzone
```

Note: SheetJS is installed from their CDN tarball, not the public npm registry. The public npm `xlsx` package is outdated. Use the CDN URL.

---

## Property Fields: What Imports Need to Populate

From `src/lib/types/inmobiliaria.ts` — the `ConsignacionFormData` interface:

### Required Fields (import must have these or AI fills them)
| Field | Type | Notes |
|-------|------|-------|
| `propertyTitle` | string | e.g. "Apto 301 El Poblado" |
| `propertyAddress` | string | Street address |
| `propertyCity` | string | e.g. "Medellín" |
| `propertyZone` | string | Neighborhood/barrio |
| `propertyType` | `'apartment' \| 'house' \| 'studio' \| 'commercial' \| 'office' \| 'warehouse'` | Must normalize from Spanish variants |
| `monthlyRent` | number | Canon mensual in COP |
| `commissionPercent` | number | Agency commission %, typically 8-12 |
| `agenteId` | string | Cannot import — user assigns after |

### Optional Fields (nice to have, AI can suggest)
| Field | Type | Notes |
|-------|------|-------|
| `adminFee` | number | Cuota de administración |
| `minimumTerm` | number | Months, default 12 |
| `propietarioId` | string | Cannot import — linked separately |

### Fields NOT in import scope
- `photosUrls` — deferred to future phase
- `inventoryItems` — too complex for CSV, wizard only
- `consignmentContractUrl`, `actaEntregaUrl` — file links, not import

### Derived import-only fields (additional columns agencies typically have)
| Column they export | Maps to |
|--------------------|---------|
| `area` / `metros` / `m2` | Custom field stored in notes or future schema extension |
| `habitaciones` / `cuartos` | Bedrooms — store in description or future schema |
| `banos` | Bathrooms — same |
| `piso` | Floor number — store in propertyTitle or notes |

---

## Existing Wizard Pattern: ConsignacionWizard

**File:** `src/components/inmobiliaria/ConsignacionWizard.tsx`

The wizard pattern to follow:

1. **Step progression:** `useState<number>(1)` for current step; `STEPS` array of `{id, labelKey, icon}`
2. **Form state:** Single `Partial<WizardFormData>` object, updated via `updateFormData(Partial<T>)` callback
3. **Step validation:** `useMemo` switch on `currentStep` returning boolean
4. **Navigation:** `goToNextStep`, `goToPreviousStep`, `goToStep(n)` with guard checks
5. **Submit:** Async with `isSubmitting` flag, toast success/error, redirect via `router.push`
6. **Cancel dialog:** `showCancelDialog` state with confirmation
7. **Animations:** `<AnimatePresence mode="wait">` + `<motion.div>` per step with `initial/animate/exit` transitions

**Step header pattern:** Progress dots with `Check` icon for completed steps, active step highlighted in indigo.

**The import wizard should follow this exact same pattern.** The number of steps will differ (5 steps vs 6), but all the structural primitives are the same.

---

## Architecture Patterns

### Recommended File Structure
```
src/app/panel/inmobiliaria/portafolio/importar/
└── page.tsx                        # Route page

src/components/inmobiliaria/import/
├── ImportWizard.tsx                # Top-level wizard (mirrors ConsignacionWizard)
├── ImportWizardSteps.tsx           # All step components
├── steps/
│   ├── StepChooseMethod.tsx        # Step 1: Choose import method
│   ├── StepUploadFile.tsx          # Step 2: Drag & drop + parse
│   ├── StepColumnMapping.tsx       # Step 3: Review/fix column mapping
│   ├── StepAIReview.tsx            # Step 4: AI gap-filling review (the star)
│   └── StepConfirmImport.tsx       # Step 5: Final confirmation + batch import
├── lib/
│   ├── parseFile.ts                # SheetJS parsing, returns ParsedRow[]
│   ├── columnMapping.ts            # Heuristic column matcher
│   ├── gapFiller.ts                # Mock AI gap-filling suggestions
│   └── importTypes.ts              # All import-specific types
└── components/
    ├── AISuggestionCard.tsx        # Collapsible suggestion per property
    ├── MappingRow.tsx              # Column mapping UI row
    └── PortalCard.tsx              # Coming soon portal card
```

### The Import State Object (core type)

```typescript
// src/components/inmobiliaria/import/lib/importTypes.ts

export interface ParsedRow {
  _rowIndex: number;
  [columnName: string]: unknown;
}

export interface ColumnMapping {
  sourceColumn: string;       // Header from file, e.g. "Canon mensual"
  targetField: string | null; // Leasefy field, e.g. "monthlyRent"
  confidence: number;         // 0-1 from heuristic
  isManual: boolean;          // User overrode the suggestion
}

export interface ImportProperty {
  _rowIndex: number;
  // Mapped values
  propertyTitle?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyZone?: string;
  propertyType?: string;
  monthlyRent?: number;
  adminFee?: number;
  commissionPercent?: number;
  // AI suggestions
  suggestions: AISuggestion[];
  // Import decision
  selected: boolean;
  hasErrors: boolean;
  errorMessages: string[];
}

export interface AISuggestion {
  field: string;
  suggestedValue: string;
  confidence: 'alta' | 'media' | 'baja';
  reasoning: string;
  accepted: boolean | null; // null = pending
}

export interface ImportWizardState {
  method: 'excel' | 'software' | 'portal' | null;
  file: File | null;
  rawRows: ParsedRow[];
  columnMappings: ColumnMapping[];
  properties: ImportProperty[];
  aiAnalyzed: boolean;
  importedCount: number;
}
```

---

## Column Mapping: The Heuristic Approach

No AI backend. Use a two-tier matching strategy:

### Tier 1: Keyword Dictionary (HIGH confidence, 0.9+)

Map Spanish column header variations to Leasefy fields:

```typescript
const COLUMN_KEYWORDS: Record<string, string[]> = {
  propertyTitle:    ['titulo', 'nombre', 'inmueble', 'propiedad', 'descripcion corta'],
  propertyAddress:  ['direccion', 'dirección', 'address', 'ubicacion', 'calle'],
  propertyCity:     ['ciudad', 'municipio', 'city'],
  propertyZone:     ['barrio', 'zona', 'sector', 'localidad', 'urbanizacion'],
  propertyType:     ['tipo', 'tipo inmueble', 'clase', 'type'],
  monthlyRent:      ['canon', 'arriendo', 'valor', 'precio', 'alquiler', 'renta', 'mensual', 'rent'],
  adminFee:         ['admin', 'administracion', 'cuota admin', 'copropiedad'],
  commissionPercent:['comision', 'comisión', 'fee', 'honorario'],
  area:             ['area', 'área', 'm2', 'metros', 'superficie'],
};
```

Normalize headers: lowercase, strip accents, trim whitespace before matching.

### Tier 2: Levenshtein Distance (MEDIUM confidence, 0.5-0.89)

For headers not caught by Tier 1, compute edit distance against keyword dictionary entries. Accept if normalized distance < 0.4 (distance/max_len).

### Implementation: No external library needed

Implement a 20-line Levenshtein function inline. It's a standard algorithm. The `fuse.js` library is an option for fuzzy search but adds unnecessary weight for this use case.

### Confidence Display

| Score | Badge | Meaning |
|-------|-------|---------|
| ≥ 0.9 | "Detectado" (green) | Keyword match, very reliable |
| 0.5-0.89 | "Probable" (amber) | Edit distance match, user should verify |
| < 0.5 | "Sin mapear" (red) | No match found, user must select |
| null | "Ignorar" (gray) | Column will be skipped |

---

## AI Gap-Filling: Mock Simulation Approach

Since there is no AI backend, gap-filling is deterministic rule logic with simulated confidence scores and human-readable reasoning. The UX should feel like AI.

### Gap Detection Rules

After column mapping, scan each row for:
- `monthlyRent` missing or zero → suggest based on `propertyCity` + `propertyType` lookup table
- `propertyZone` missing → suggest "Por definir" with low confidence or infer from address string
- `propertyType` ambiguous string → normalize to enum via keyword matching
- `propertyCity` missing → attempt to extract from `propertyAddress` (look for known city names)
- `commissionPercent` missing → suggest 10 (Colombian market default)

### Price Suggestion Table (mock data)

```typescript
const RENT_ESTIMATES: Record<string, Record<string, number>> = {
  'bogota': { apartment: 1800000, house: 2800000, studio: 1200000, commercial: 3500000 },
  'medellin': { apartment: 1600000, house: 2400000, studio: 1000000, commercial: 3000000 },
  'cali': { apartment: 1400000, house: 2000000, studio: 900000, commercial: 2500000 },
  'barranquilla': { apartment: 1300000, house: 1800000, studio: 800000, commercial: 2200000 },
  'default': { apartment: 1500000, house: 2200000, studio: 950000, commercial: 2800000 },
};
```

### AI Review UX Pattern

The AI review step should simulate processing delay to feel alive:
1. Show "Analizando X propiedades..." with animated SpinnerGap
2. Stagger-reveal each property card with `animation-delay: Xms` (from existing `stagger-in` keyframe)
3. Properties needing attention get an amber badge; complete properties get green badge
4. Summary header: "47 propiedades listas. 12 necesitan atención."

The `stagger-in` keyframe (`0%: opacity 0 translateY 6px → 100%: opacity 1 translateY 0`) already exists in `tailwind.config.ts`. Use `style={{ animationDelay: \`${index * 50}ms\` }}` on each card.

---

## Method 2: Software Migration (Static Content)

### Colombian ERP landscape (research findings, MEDIUM confidence)

The major Colombian real estate ERPs are:
- **SIMI CRM** (simicrm.app) — market leader since 1992, most common
- **Daytona Cyber** (daytona.cloud) — second largest
- **DOMUS** — older, still in use
- **WASI** — newer, cloud-first
- **Inmoflex** — growing
- **2clics, KiteProp, UbiQuo, Saari** — smaller players

All these systems export property data to Excel or CSV when the user goes to their "Propiedades" list and uses an Export/Exportar function. The exact column names vary per system but are standard Spanish real estate terminology (Direccion, Canon, Tipo, Barrio, etc.).

### Content Structure for Method 2

Each software card should show:
- Logo placeholder (use colored icon fallback)
- Software name
- "X propiedades exportadas en Y pasos"
- Expandable step-by-step guide

Export steps (generic, valid for all systems):
1. Ir a la sección de Propiedades / Inmuebles
2. Seleccionar todas o filtrar las que desea importar
3. Buscar botón "Exportar" o "Descargar" (usualmente en formato .xlsx o .csv)
4. Descargar el archivo y cargarlo aquí

For systems without documented export: show "Solicitar ayuda" card with WhatsApp/email link.

---

## Method 3: Portal Import (Coming Soon)

Three portal cards:
- FincaRaíz (fincaraiz.com.co)
- Metrocuadrado (metrocuadrado.com)
- Ciencuadras (ciencuadras.com)

Each shows: logo area, portal name, property count badge ("Ideal para agencias con X+ propiedades publicadas"), a URL input field (disabled/grayed), "Próximamente" badge, and an email capture for notification.

These are placeholders only. No scraping logic.

---

## File Upload in Next.js App Router

### Decision: Client-side parsing only, no API route for this phase

The context document says "Mock AI responses for frontend demo (no actual AI backend needed yet)." This means:
- Parse the Excel/CSV file **in the browser** using SheetJS
- Store parsed data in component state
- The final "Import" button simulates a delay (like ConsignacionWizard's submit) and shows a success toast
- No API route is needed for Phase 33

If a real backend import API is added later, it would accept JSON (the already-parsed rows) via POST, not the raw file. This keeps things simple.

### File Reading Pattern (client-side SheetJS)

```typescript
// src/components/inmobiliaria/import/lib/parseFile.ts
import { read, utils } from 'xlsx';

export async function parseSpreadsheetFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false, // Return formatted strings, not raw cell values
  });
  return rows.map((row, index) => ({ ...row, _rowIndex: index + 1 })) as ParsedRow[];
}
```

This works entirely in the browser with no server round-trip.

---

## UX Patterns from Existing Codebase

### Animations Available (tailwind.config.ts)
| Keyframe | CSS Class | Use for |
|----------|-----------|---------|
| `stagger-in` | `animate-stagger-in` | Property cards appearing one by one in AI review |
| `fade-in-up` | `animate-fade-in-up` | Step transitions |
| `shimmer` | `animate-shimmer` | Loading skeleton during "AI analysis" |
| `panel-in` | `animate-panel-in` | Suggestion detail sidebar |
| `content-reveal` | `animate-content-reveal` | Column mapping rows appearing |
| `indeterminate` | `animate-indeterminate` | Progress bar during batch import |

### AI Activity Panel Pattern (`AIActivityDetailPanel.tsx`)
- Uses `createPortal` for full-screen overlay
- Slide-in from right with `panel-in` keyframe
- Step trace list with status dots (completed/pending/failed)
- Each step shows `label`, `duration`, optional `output` detail

The `AISuggestionCard` component should borrow this pattern: expandable card showing what field is missing, what AI suggests, and why. Accept/reject buttons.

### Button Variants (button.tsx)
| Variant | Use |
|---------|-----|
| `default` | Primary CTA (Importar, Siguiente) |
| `outline` | Secondary (Cancelar, Descargar plantilla) |
| `ghost` | Tertiary/inline (Ignorar fila) |
| `secondary` | Accept individual suggestion |

All buttons use `font-mono uppercase tracking-wide` — maintain this for consistency.

---

## Template Download

The "Descargar plantilla" button should trigger a SheetJS workbook write to generate a template .xlsx with the correct column headers pre-filled.

```typescript
import { utils, writeFileXLSX } from 'xlsx';

export function downloadTemplate() {
  const headers = [
    'Titulo', 'Direccion', 'Ciudad', 'Barrio', 'Tipo',
    'Canon mensual', 'Cuota admin', 'Comision %',
  ];
  const ws = utils.aoa_to_sheet([headers]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Propiedades');
  writeFileXLSX(wb, 'plantilla_leasefy.xlsx');
}
```

Using `writeFileXLSX` (not `writeFile`) ensures the smallest possible bundle for write operations per SheetJS docs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Excel/XLS/XLSX binary parsing | Custom binary parser | SheetJS `read()` |
| Drag & drop file zone | Manual mouse event handlers | react-dropzone `useDropzone` |
| Animated skeleton during AI analysis | Custom CSS animation | Existing `animate-shimmer` + `animate-indeterminate` classes |
| String edit distance | Custom implementation would be ~30 lines — acceptable | Inline Levenshtein, 20 lines, no dependency |

---

## Common Pitfalls

### Pitfall 1: SheetJS Bundle Size
**What goes wrong:** Importing all of `xlsx` adds ~1MB to the bundle
**Why it happens:** SheetJS includes parsers for 20+ legacy formats most users don't need
**How to avoid:** Use dynamic import with `React.lazy` or `next/dynamic`: `const xlsx = await import('xlsx')` inside the async parse function. This defers SheetJS to a separate chunk loaded only when the import page is visited.
**Warning signs:** If Lighthouse reports a large chunk, check if xlsx is in the main bundle.

### Pitfall 2: XLS vs XLSX binary encoding
**What goes wrong:** Passing a File directly to SheetJS `read()` without converting to ArrayBuffer fails for binary .xls files
**Why it happens:** `.xls` (BIFF8) is a binary format; SheetJS needs the raw buffer
**How to avoid:** Always use `file.arrayBuffer()` first, then `read(buffer, { type: 'array' })`. This handles all three formats (.xlsx, .xls, .csv) consistently.

### Pitfall 3: Numbers as strings from SheetJS
**What goes wrong:** Monthly rent parsed as `"1,800,000"` (string with commas) instead of `1800000`
**Why it happens:** SheetJS `raw: false` returns formatted strings; accounting formats include thousand separators
**How to avoid:** Parse monetary values with a cleaning function: `parseInt(str.replace(/[^0-9]/g, ''))`. Apply to all numeric fields after mapping.

### Pitfall 4: Multi-sheet workbooks
**What goes wrong:** User uploads a workbook with multiple sheets; wrong sheet is parsed
**Why it happens:** `workbook.SheetNames[0]` assumes data is on the first sheet
**How to avoid:** Show the user a sheet selector if `workbook.SheetNames.length > 1`. Most ERP exports have data on Sheet1/Hoja1 but show the dropdown as a fallback.

### Pitfall 5: framer-motion AnimatePresence with large lists
**What goes wrong:** Animating 200 property cards simultaneously in AI review step causes jank
**Why it happens:** All animations start simultaneously; browser layout thrashes
**How to avoid:** Use CSS `animation-delay: calc(${index} * 30ms)` for list items instead of framer-motion per-item transitions. Limit visible animated items to first 20; remaining appear instantly.

### Pitfall 6: SheetJS npm package vs CDN package
**What goes wrong:** `npm install xlsx` installs the outdated community edition from npm registry (stuck at 0.18.5)
**Why it happens:** SheetJS moved distribution to their own CDN after npm drama
**How to avoid:** Always install from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

---

## State of the Art (2026)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Server-side CSV parsing via API route | Client-side SheetJS parsing, no upload needed | Faster UX, no file size limits |
| Exact header matching | Keyword + Levenshtein heuristic | Handles typos, Spanish accent variants |
| Individual row API calls for import | Batch JSON payload with all rows | One network call for full import |
| Static "Choose file" input | react-dropzone drag & drop | Better UX, file type filtering |

---

## Open Questions

1. **Row limit for preview table**
   - What we know: Agencies have 50-300+ properties; 300 rows in a DOM table is fine; 3000+ rows could be slow
   - What's unclear: Should we cap the editable preview at 100 rows shown and batch-process the rest silently?
   - Recommendation: Show all rows (up to 500) in the review table with virtualization using simple CSS `overflow-y: auto` + `max-height`. For >500 rows, show a warning and process in batches during import.

2. **What happens to the `agenteId` field during import?**
   - What we know: `agenteId` is required in `ConsignacionFormData`; it can't come from a CSV
   - What's unclear: Does the user assign one agent to all imported properties, or per-property?
   - Recommendation: Add a global "Asignar agente" selector in the confirmation step that applies to all imported properties. This matches how bulk operations typically work.

3. **propietarioId during import**
   - What we know: Properties need an owner (`propietarioId`); this won't be in the CSV
   - What's unclear: Create new propietario records automatically, or require pre-existing?
   - Recommendation: Skip propietario assignment during import (leave null/default). User can assign owners later via the existing propietario management. Flag imported properties as "Propietario pendiente" in the portfolio.

4. **Daytona/SIMI exact column names**
   - What we know: These are the most common Colombian ERPs; they export to Excel
   - What's unclear: We couldn't verify exact column header names from their exports
   - Recommendation: The keyword dictionary approach handles this. Run QA with a real SIMI export when available. The column mapping step (Step 3) exists precisely so users can fix mismatches.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/types/inmobiliaria.ts` — Consignacion, ConsignacionFormData type definitions (read directly)
- Codebase: `src/components/inmobiliaria/ConsignacionWizard.tsx` — Wizard pattern (read directly)
- Codebase: `tailwind.config.ts` — Available animation keyframes (read directly)
- SheetJS official docs: https://docs.sheetjs.com/docs/getting-started/installation/frameworks — version 0.20.3 installation

### Secondary (MEDIUM confidence)
- npm trends: xlsx vs papaparse vs exceljs comparison (WebSearch verified) — https://npmtrends.com/csv-parse-vs-exceljs-vs-node-xlsx-vs-papaparse-vs-xlsx
- react-dropzone official: https://react-dropzone.js.org — version 14.x, useDropzone hook API
- WebFetch: comparasoftware.co — Colombian ERP landscape (Daytona, SIMI, WASI, Inmoflex)
- WebSearch: Daytona.cloud, simicrm.app confirmed as top Colombian real estate ERP platforms

### Tertiary (LOW confidence)
- Daytona/SIMI specific export column headers: unverified; inferred from generic real estate terminology
- Exact bundle size numbers for SheetJS: stated as ~1MB pre-minification from GitHub issue #694 (2018 era, may be different now)

---

## Metadata

**Confidence breakdown:**
- Standard stack (SheetJS + react-dropzone): HIGH — verified against official docs and npm
- Property field schema: HIGH — read directly from codebase types
- Wizard pattern reuse: HIGH — read directly from ConsignacionWizard.tsx
- Column mapping heuristic approach: MEDIUM — standard practice, no codebase precedent
- Colombian ERP landscape: MEDIUM — top two verified by name, export format assumed
- Specific ERP column names: LOW — unverified, handled by column mapping step

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (SheetJS and react-dropzone are stable; recheck if major version bump)
