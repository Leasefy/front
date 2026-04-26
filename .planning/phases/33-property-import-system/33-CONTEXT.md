# Phase 33: Property Import System - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Source:** Conversational context from user session

<domain>
## Phase Boundary

Build a property import system that lets real estate agencies migrate their entire portfolio into Leasefy in minutes. Three import methods with AI-powered gap-filling that detects and fixes missing/incomplete property data.

This is a critical launch feature — agencies won't adopt unless migration is painless.

</domain>

<decisions>
## Implementation Decisions

### Import Method 1: Excel/CSV Upload (FULL BUILD - Priority 1)
- Drag & drop file upload with preview
- AI column mapping: automatically detect which column is address, price, area, type, etc.
- Data preview table showing all imported rows with editable cells
- AI gap-filling: detect missing fields per property and suggest values
- Batch import with progress indicator
- Support .xlsx, .xls, and .csv formats
- Template download: user can download a Leasefy template to fill in

### Import Method 2: Software Migration (GUIDED - Priority 2)
- Show logos/cards for common Colombian real estate ERPs (Simi, Daytona, Propiedades.com admin)
- For each software: step-by-step export instructions with screenshots/descriptions
- The export produces a CSV/Excel that feeds into Method 1
- "Conexión directa" badge with "Próximamente" for future API integrations
- Contact form for agencies using unlisted software

### Import Method 3: Portal Import (COMING SOON - Priority 3)
- Cards for FincaRaíz, Metrocuadrado, Ciencuadras
- User pastes their agency profile URL from the portal
- Show "Próximamente" state with email capture for notification when ready
- This is a placeholder for future scraping/API integration

### AI Gap-Filling Experience
- After file upload and column mapping, AI analyzes each property for completeness
- Summary view: "47 propiedades importadas. 12 necesitan atención."
- Properties with issues get expandable AI suggestion cards showing:
  - What's missing (field name)
  - AI suggested value with confidence level
  - Source/reasoning for suggestion
- AI can suggest:
  - Market pricing based on location, area, and property type
  - Property descriptions from basic attributes
  - Normalized addresses (barrio → full address with city/department)
  - Property type categorization from ambiguous data
  - Amenity suggestions based on property type and price range
  - Missing area estimates from price and location comparables
- "Accept all AI suggestions" batch action button
- Individual accept/reject per suggestion
- The experience should feel magical — like having an assistant review each property

### AI Column Mapping
- When user uploads file, AI reads the header row and maps to Leasefy fields
- Show mapping preview: "Dirección" → address, "Canon" → monthly_rent, etc.
- User can manually correct any mapping
- Remember mappings for future imports from same source
- Handle common Spanish variations: "Precio", "Canon", "Arriendo", "Valor" → all map to rent

### Route & Navigation
- New page at /panel/inmobiliaria/portafolio/importar
- Accessible from portfolio page via "Importar propiedades" button
- Also accessible from the empty state of portfolio
- After successful import, redirect to portfolio with success toast

### UX Patterns
- Multi-step wizard: Choose method → Upload/Configure → AI Review → Confirm → Import
- Each step should have clear progress indicator
- The AI review step is the star — should feel alive with animations
- Error states must be clear: "Row 15: address missing, cannot import"
- Partial import supported: user can deselect rows they don't want

### Claude's Discretion
- File parsing library choice (SheetJS/xlsx, PapaParse, etc.)
- State management approach for wizard
- API route structure for file upload and AI processing
- How to implement column similarity matching
- Mock AI responses for frontend demo (no actual AI backend needed yet)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Portfolio
- `src/app/panel/inmobiliaria/portafolio/page.tsx` — Current portfolio page (where import button will live)
- `src/app/panel/inmobiliaria/portafolio/nuevo/page.tsx` — New property wizard (reference for field structure)
- `src/components/inmobiliaria/ConsignacionWizard.tsx` — Existing wizard pattern to follow
- `src/components/inmobiliaria/ConsignacionWizardSteps.tsx` — Wizard step components

### Types & Data
- `src/lib/types/inmobiliaria.ts` — Property type definitions (what fields a property has)
- `src/lib/types/ai-agents.ts` — AI agent patterns (for AI suggestion UI patterns)

### Design System
- `src/components/ui/button.tsx` — Button component (primary/secondary/link styles)
- `src/components/inmobiliaria/ai/AIActivityDetailPanel.tsx` — Panel slide-over pattern
- `tailwind.config.ts` — Animation keyframes (panel-in, stagger-in, etc.)

### Layout
- `src/app/panel/inmobiliaria/layout.tsx` — Inmobiliaria layout with sidebar nav

</canonical_refs>

<specifics>
## Specific Ideas

- User mentioned "algo de AI con esto" — the AI gap-filling should be the wow factor
- Referenced wanting it to "resolve problems" when properties have missing info
- The import should support all 3 methods but Excel/CSV is the priority for launch
- Agency user quoted: agencies manage 50-300+ properties, one-by-one creation is a dealbreaker

</specifics>

<deferred>
## Deferred Ideas

- Direct API connections to Simi, Daytona, and other ERPs (future Phase)
- Portal scraping from FincaRaíz/Metrocuadrado (future Phase — requires agreements)
- Photo import from external URLs (complex, different phase)
- Bulk update of existing properties via re-import (v2 of this feature)
- Import history and rollback capability

</deferred>

---

*Phase: 33-property-import-system*
*Context gathered: 2026-04-04 via conversational context*
