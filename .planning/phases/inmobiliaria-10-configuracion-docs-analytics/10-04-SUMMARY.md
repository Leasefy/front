---
phase: inmobiliaria-10-configuracion-docs-analytics
plan: 04
subsystem: documentos
tags: [documents, templates, document-management, pdf, signatures]
dependency-graph:
  requires: [inmobiliaria-01, inmobiliaria-types, 10-01]
  provides: [DocumentoTemplates, DocumentoManager, DocumentTemplate, PropertyDocument]
  affects: [10-05-actas, 10-08-routes]
tech-stack:
  added: []
  patterns: [template-gallery, document-table, category-tabs, bulk-actions, status-badges]
key-files:
  created:
    - src/components/inmobiliaria/DocumentoTemplates.tsx
    - src/components/inmobiliaria/DocumentoManager.tsx
  modified:
    - src/lib/types/inmobiliaria.ts
    - src/lib/data/mock-inmobiliaria.ts
    - src/components/inmobiliaria/index.ts
decisions:
  - "Document categories: contrato, acta, inventario, poliza, carta, otro"
  - "Document statuses: draft, pending_signature, signed, expired, cancelled"
  - "Template variables: {{variable_name}} format with descriptions"
  - "Usage stats: Templates sorted by usageCount descending"
  - "View modes: List (table) and grid toggle in DocumentoManager"
  - "Bulk actions: Download and delete for selected documents"
metrics:
  duration: 6min
  completed: 2026-02-08
---

# Phase 10 Plan 04: DocumentoTemplates + DocumentoManager Summary

Document template gallery and document management components for the inmobiliaria module.

## One-liner

Template gallery with category filtering and preview modal, plus document manager with table/grid views, status badges, and bulk actions.

## What Was Built

### Types Added (Task 1)
- `DocumentCategory` - contrato, acta, inventario, poliza, carta, otro
- `DocumentStatus` - draft, pending_signature, signed, expired, cancelled
- `DocumentTemplate` - Template definition with variables, version, usage stats
- `PropertyDocument` - Document instance with property/tenant/signature info
- `DocumentGenerateRequest` - Request interface for document generation
- Helper functions:
  - `getDocumentCategoryLabel()` / `getDocumentCategoryColor()`
  - `getDocumentStatusLabel()` / `getDocumentStatusColor()`
  - `formatFileSize()` - Bytes to human readable

### Mock Data (Task 2)
- `MOCK_DOCUMENT_TEMPLATES` - 7 templates covering all categories
  - Contrato de Arrendamiento (Ley 820/2003)
  - Acta de Entrega / Devolucion
  - Inventario del Inmueble
  - Carta de Terminacion / Incremento
  - Solicitud de Poliza
- `generateMockDocuments()` - Creates documents from consignaciones
- `MOCK_PROPERTY_DOCUMENTS` - Generated document instances

### DocumentoTemplates (Task 3) - 483 lines
**Template gallery component:**

1. **Header Section**
   - Title "Plantillas de Documentos"
   - Total template count
   - "Nueva Plantilla" button (disabled - coming soon)

2. **Search Bar**
   - Search by name or description
   - Magnifying glass icon

3. **Category Tabs**
   - Todos, Contratos, Actas, Inventarios, Polizas, Cartas
   - Category count badges
   - Active state styling

4. **Template Cards Grid**
   - 3 columns desktop, 2 tablet, 1 mobile
   - Icon with category-colored background
   - Template name with default star badge
   - Description (truncated)
   - Category and version badges
   - Usage count ("Usado 156 veces")
   - Last updated date
   - Actions: "Vista previa" and "Usar"

5. **Preview Modal**
   - Template icon and name
   - Full description
   - Category and stats
   - Variables list with descriptions
   - Document preview placeholder (animated skeleton)
   - Close and "Usar Plantilla" buttons

6. **Empty State**
   - Icon, title, description when no templates match

### DocumentoManager (Task 4) - 710 lines
**Document management component:**

1. **Header Section**
   - Title "Documentos"
   - Document count (filtered/total)
   - View toggle (list/grid)
   - "Generar Documento" dropdown menu

2. **Filters Row**
   - Search by name, property, or tenant
   - Category dropdown filter
   - Status dropdown filter
   - Clear filters button

3. **Summary Stats Row**
   - Total documents
   - Pending signature (amber)
   - Signed (green)
   - Expired (red)

4. **Bulk Actions Bar** (when items selected)
   - Selection count
   - Download selected button
   - Delete selected button

5. **Table View**
   - Checkbox column for selection
   - Document name with icon
   - Property (Buildings icon)
   - Tenant (User icon)
   - Category badge (colored)
   - Status badge with icon
   - Signature status (X/Y signed)
   - Relative date ("Hace 2 dias")
   - File size
   - Actions menu

6. **Grid View**
   - Cards with selection indicator
   - Icon, name, property title
   - Category and status badges
   - Tenant and date info
   - Signature status
   - Actions dropdown

7. **Actions Menu**
   - Ver documento
   - Descargar PDF
   - Enviar para firma (draft only)
   - Ver firmas (pending_signature)
   - Duplicar
   - Eliminar (destructive)

8. **Empty State**
   - When no documents match filters

### Barrel Export (Task 5)
- Added DocumentoTemplates export
- Added DocumentoManager export

## Commits

| Hash | Description |
|------|-------------|
| a99d421 | feat(10-04): add DocumentoTemplates and DocumentoManager components |

## Verification Checklist

- [x] pnpm tsc --noEmit passes
- [x] Document types defined in inmobiliaria.ts
- [x] Mock templates and documents exported
- [x] DocumentoTemplates shows template cards (483 lines > 280 min)
- [x] Category filtering works
- [x] DocumentoManager shows document table (710 lines > 350 min)
- [x] Filters work correctly
- [x] Components exported from barrel

## Deviations from Plan

None - plan executed exactly as written. Types and mock data were already added in a prior session (commit 7a9034d).

## Next Steps

Ready for Plan 10-05 (ActaEntregaForm + ActaEntregaViewer) which will add delivery/return acta forms with inventory, meters, and signatures.
