# Phase v7-06: Solicitudes / PQRS — Research

**Researched:** 2026-07-19
**Domain:** Tenant-facing PQRS + maintenance requests (frontend-first, additive, es-CO) reusing the shipped `pqrs.types.ts` contract, with a Ley 1480 SLA clock and Ley 820 cost-responsibility transparency.
**Confidence:** HIGH (all idioms verified in-repo; both legal facts CITED to official sources)

## Summary

v7-06 is a **contract-first, additive** phase. Everything it needs to reuse already exists in the worktree: the shared `pqrs.types.ts` entity (with `solicitanteTipo:'inquilino'` and the full estado enum), the tolerant api-client degrade idiom (`isEndpointUnavailable` → honest "Próximamente"), the anti-IDOR signed-URL retrieval (`documentsApi.getSignedUrl` + `useSignedDocUrl`), the caso hub aggregator (`useTenantCases`) which already declares `pqrs`/`mantenimiento` in its `CaseType` union with **zero rows**, and the shared SLA constant `PQRS_SLA_BUSINESS_DAYS = 15`. There are **no new npm packages** and **no backend endpoints** to build in this phase — the NestJS/agent PQRS engine is a disclosed external dependency (M1).

The crux (SOLI-02) is precise: "reuse, don't fork" means **import** `SolicitudPqrs`/`PqrsEstado` and, where the tenant path needs a field the agency entity lacks (cost responsibility, quote-approval timestamp), **extend the same file with optional additive fields** — never create a parallel `pqrs-inquilino.types.ts` with a divergent estado enum. Both the maintenance request (SOLI-01, `tipo:'reparacion'` + photos) and the formal PQRS (SOLI-02, `tipo` ∈ {peticion,queja,reclamo,sugerencia,solicitud}) are the **same entity** with `solicitanteTipo:'inquilino'`; the agency reads them through the identical estado vocabulary it already renders at `/panel/inmobiliaria/pqrs`.

The SLA (SOLI-03) is a two-tier honest clock: prefer the backend's authoritative `slaVenceAt` when present; otherwise compute an interim `createdAt + 15 business days` (Mon–Fri, no holidays) client-side with a **~10-line hand-rolled pure helper** (zero packages), labeled **"estimado"** and framed as a soft target ("respuesta estimada hacia el …"), never blank and never presented as a hard deadline. Cost responsibility (SOLI-04) surfaces the Ley 820 split (dueño/inquilino/compartido) as a transparent, backend-sourced label, and the quote-approval-before-execution gate is a contract-first affordance (the quote engine lives in the agency Operaciones module + M1 triage) — the tenant **approves**, never self-assigns providers or self-fixes cost.

**Primary recommendation:** Ship `pqrs.service.ts` (tolerant contract, modeled 1:1 on `lease-documents.service.ts`), **extend** `pqrs.types.ts` with optional tenant fields (no fork), add pure PQRS→case mappers into `tenant-case.ts`, fold `pqrsApi.listMine()` into `useTenantCases` (degrades to `[]` → keeps the existing "Próximamente" hub sections), and build the tenant request form (Dialog) + a per-request detail with the two-tier SLA and Ley 820 cost card. Every real-data surface is gated behind `isEndpointUnavailable`; nothing fabricates a radicado, an SLA, or a cost.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PQRS/maintenance CRUD (create, list, get) | API / Backend (NestJS or `agent`) | Frontend BFF api-client contract | Persistence + tenant JWT scoping (`/pqrs/mine`) is server-owned; frontend ships the typed contract + honest degrade |
| Triage: classification, priority, assignment, **real `slaVenceAt`** | API / Backend (`agent` Mastra, M1) | — | Automatic triage engine is explicitly M1 (`pqrs.types.ts` header) |
| **Interim SLA estimate** (`createdAt + 15 hábiles`) | Frontend (pure helper) | — | Display-only fallback so SLA is never blank; labeled "estimado" |
| Photo upload (create) | API / Backend (multipart store) | Frontend picker + contract | Bytes store is server-owned; contract mirrors `documentsApi.upload` |
| Photo retrieval | API / Backend (`getSignedUrl`) | Frontend `useSignedDocUrl` | Anti-IDOR: backend mints short-lived ownership-checked URL (v7-02 lesson) |
| Cost responsibility (Ley 820 dueño/inquilino/split) | API / Backend (agency determines) | Frontend transparent label | A legal cost assertion; frontend renders it, never decides it |
| Quote generation + provider assignment | API / Backend (agency Operaciones + M1) | Frontend read + approve affordance | Anti-feature: tenant never assigns providers or fixes terms |
| Quote **approval** by tenant | Frontend affordance → Backend persists | — | Tenant explicitly approves; contract-first until backend exposes the quote |
| Case hub aggregation + timeline | Frontend (`useTenantCases` projection) | — | Read projection of `/…/mine` sources; normalize-never-compute |
| Realtime status updates | API / Backend (RLS tenant) | Frontend `useVisibilityPolling` fallback | No SSE/WebSocket in-repo; polling is the shipped pattern |

## Standard Stack

**Zero new dependencies.** Every capability reuses an in-repo pattern (verified against `.planning/research/portal-inquilino/GAP-ANALYSIS.md` §4: "Cero dependencias npm nuevas").

### Core (all already installed / in-repo)
| Library / Module | Purpose | Why Standard |
|---------|---------|--------------|
| `src/lib/api/pqrs.types.ts` | Shared PQRS entity + estado enum | `[VERIFIED: in-repo]` The single source of truth SOLI-02 must reuse; agency already renders it |
| `src/lib/api/client.ts` (`apiClient`, `ApiError`) | HTTP + typed error | `[VERIFIED: in-repo]` `ApiError.status` drives the `isEndpointUnavailable` degrade |
| `src/lib/constants/response-sla.ts` (`PQRS_SLA_BUSINESS_DAYS=15`) | SLA business-day count | `[VERIFIED: in-repo]` Shipped in v7-05 precisely so v7-06's clock reuses it |
| `documentsApi.getSignedUrl` + `useSignedDocUrl` | Anti-IDOR photo retrieval | `[VERIFIED: in-repo]` The v7-02 signed-URL lesson; blob-safe short-lived URL |
| `useTenantCases` / `tenant-case.ts` | Case hub aggregator + view-model | `[VERIFIED: in-repo]` Already declares `pqrs`/`mantenimiento` with 0 rows — the seam |
| `useVisibilityPolling` | Tab-gated refresh (realtime fallback) | `[VERIFIED: in-repo]` No SSE/WebSocket; the shipped fallback |
| `@phosphor-icons/react` (Wrench, ChatCircle, Lifebuoy, Camera, Info, Clock) | Iconography | `[VERIFIED: in-repo]` Named imports per MEMORY + DESIGN §5 |
| `sonner` `toast` + Radix `Dialog`/`AlertDialog` | Feedback + form modal | `[VERIFIED: in-repo]` DESIGN §4 Toaster / §17 Dialog |
| `EmptyState` (`src/components/ui/empty-state.tsx`) | Honest "Próximamente" | `[VERIFIED: in-repo]` DESIGN §11; used by the agency PQRS page + caso hub |

### Supporting
| Module | Purpose | When to Use |
|---------|---------|-------------|
| `documentsApi.upload` (raw `fetch` + FormData + Bearer) | Multipart shape for photo create | Document the create-with-photos contract shape (NOT sent today) |
| `PlanActivityTimeline` (`components/ui/plan/`) | Status timeline | Reused by caso detail; PQRS events map to `TimelineItem[]` |
| `useLeases` / `useLeasePaymentInfo` | Lease context (`contratoId`, `propiedadId`) | Prefill `contratoId`/`propiedadDireccion` on a new request |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `addBusinessDays` | `date-fns` `addBusinessDays` | `[VERIFIED: npm registry — but REJECTED]` No date lib is installed (`grep` of package.json → none); adding one violates the ZERO-new-packages guardrail for a 10-line pure function. Hand-roll. |
| Full Colombian `festivos` table (Ley 51/1983) | Maintained holiday list | Rejected for the interim estimate: ROADMAP locked "sin festivos"; a holiday table implies false precision on a value already labeled "estimado" and needs yearly maintenance. Authoritative date is server-side. |
| `GET /pqrs/:id` fetch-by-id for detail | Direct id fetch | Rejected — IDOR risk. Resolve detail from `listMine()` (own-only) exactly like `casos/[caseId]/page.tsx`. |

**Installation:** none — `pnpm install` unchanged.

**Version verification:** N/A — no new packages. Existing test runner is `vitest ^4.0.18` (`[VERIFIED: package.json]`), config `vitest.config.ts`.

## Package Legitimacy Audit

No external packages are installed in this phase. **Disposition: N/A — zero new dependencies.** All modules referenced are first-party (`src/lib/**`) or already-present devDeps (`vitest`). slopcheck not applicable.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────── TENANT (browser, /inquilino) ────────────────────────┐
│                                                                               │
│  [New request Dialog]                      [My cases hub + detail]            │
│   tipo: reparacion | peticion | queja …     /inquilino/casos                  │
│   + descripción + fotos (picker)            /inquilino/casos/[caseId]         │
│        │                                          ▲                           │
│        │ createSolicitud(payload, files)          │ pqrsToCase() (pure)       │
│        ▼                                           │                           │
│   ┌─────────────────────────── pqrs.service.ts (NEW, tolerant) ───────────┐   │
│   │  create → POST /pqrs           (multipart, documentsApi.upload shape)  │   │
│   │  listMine → GET /pqrs/mine     (own-scoped)                            │   │
│   │  getById → resolve from listMine (own-only, NO fetch-by-id → no IDOR)  │   │
│   │  photo bytes → documentsApi.getSignedUrl (short-lived, ownership-chkd) │   │
│   │  ── all wrapped in isEndpointUnavailable(404/403/0) ──                 │   │
│   └────────────┬──────────────────────────────────┬───────────────────────┘   │
│      404/403/0 │ (endpoint not live TODAY)         │ 200 (when M1 lands)       │
│                ▼                                    ▼                           │
│      throw PqrsUnavailableError            SolicitudPqrs[] (real)              │
│      listMine → []                                 │                           │
│                │                                    │                           │
│   ┌────────────▼─────────────┐        ┌─────────────▼──────────────────────┐  │
│   │ Honest "Próximamente"    │        │ useTenantCases() folds rows in;     │  │
│   │ (hub sections unchanged) │        │ hub "Próximamente" PQRS/mant hides  │  │
│   │ NO fabricated radicado   │        │ SLA: slaVenceAt ?? estimate("hacia")│  │
│   └──────────────────────────┘        └─────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                 │ (external dep — M1, disclosed)
                                 ▼
        NestJS / agent (Mastra) — PQRS CRUD tenant-scoped + triage engine
        classification · priority · assignment · REAL slaVenceAt · cotización
```

### Recommended Structure (all additive)
```
src/
├── lib/
│   ├── api/
│   │   ├── pqrs.types.ts          # EXTEND (optional fields) — NOT fork
│   │   └── pqrs.service.ts        # NEW — tolerant contract (create/listMine/getById)
│   ├── types/
│   │   └── tenant-case.ts         # EXTEND — pqrsStatusToTone/Label mappers + optional slaLabel
│   ├── hooks/
│   │   ├── use-tenant-cases.ts    # EDIT — fold pqrsApi.listMine() + pqrsToCase()
│   │   ├── use-tenant-pqrs.ts      # NEW (optional) — list/create hook wrapping the service
│   │   └── use-sla-estimate.ts     # NEW (optional) — thin wrapper over addBusinessDays
│   └── date/
│       └── business-days.ts       # NEW — pure addBusinessDays (Mon–Fri, no holidays) + test
├── app/inquilino/
│   ├── solicitudes/page.tsx        # NEW — list + "Nueva solicitud" entry (or fold into casos)
│   └── casos/[caseId]/page.tsx     # EDIT — render SLA + Ley 820 cost card for pqrs cases
└── components/inquilino/pqrs/
    ├── NuevaSolicitudDialog.tsx    # NEW — tipo selector + descripción + photo picker
    ├── SlaEstimateBadge.tsx        # NEW — "hacia el {date} · estimado" vs authoritative
    └── CostoResponsabilidadCard.tsx# NEW — Ley 820 dueño/inquilino/split + approve affordance
```

### Pattern 1: Tolerant contract-only api-client (the phase's backbone)
**What:** A typed service where every method catches `isEndpointUnavailable(err)` (404/403/0) and degrades honestly — list → `[]`, create → throws a typed `PqrsUnavailableError`, get → resolve-from-list.
**When to use:** Every PQRS network call in this phase (the backend is a disclosed dependency).
**Example (model 1:1 on the shipped idiom):**
```typescript
// Source: src/lib/api/lease-documents.service.ts (verified in-repo) + autopago.service.ts
import { apiClient, ApiError } from './client';
import type { SolicitudPqrs } from './pqrs.types';

function isEndpointUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 0);
}

export class PqrsUnavailableError extends Error {
  constructor() { super('pqrs_unavailable'); this.name = 'PqrsUnavailableError'; }
}

export const pqrsApi = {
  /** GET /pqrs/mine — own-scoped. Degrades to [] (honest empty), NEVER fabricated rows. */
  async listMine(): Promise<SolicitudPqrs[]> {
    try {
      return await apiClient.get<SolicitudPqrs[]>('/pqrs/mine');
    } catch (err) {
      if (isEndpointUnavailable(err)) return [];
      throw err;
    }
  },

  /** Resolve own detail by filtering the /mine list — NO raw fetch-by-id (anti-IDOR). */
  async getMine(id: string): Promise<SolicitudPqrs | null> {
    const all = await this.listMine();
    return all.find((s) => s.id === id) ?? null;
  },

  /**
   * POST /pqrs — create (multipart when photos present, documentsApi.upload shape).
   * Throws PqrsUnavailableError on 404/403/0 so the UI stays on "Próximamente" and
   * NEVER fabricates a radicado. solicitanteTipo is forced to 'inquilino' server-side
   * from the JWT — the client never claims another solicitanteTipo.
   */
  async create(input: NuevaSolicitudInput): Promise<SolicitudPqrs> {
    try {
      return await apiClient.post<SolicitudPqrs>('/pqrs', input); // multipart variant for photos
    } catch (err) {
      if (isEndpointUnavailable(err)) throw new PqrsUnavailableError();
      throw err;
    }
  },
};
```

### Pattern 2: Pure business-day estimate (SLA never blank)
**What:** ~10-line pure `addBusinessDays` (Mon–Fri, no holidays). Two-tier: authoritative `slaVenceAt` wins; else compute the interim, labeled "estimado".
**Example:**
```typescript
// Source: NEW src/lib/date/business-days.ts — pure, unit-tested, zero deps
/** Add N business days (Mon–Fri, NO holidays). Interim estimate only — the
 *  authoritative deadline is the server's slaVenceAt. Deterministic + total. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();           // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}
```
```typescript
// Consumer: resolve the SLA for display — NEVER blank
import { PQRS_SLA_BUSINESS_DAYS } from '@/lib/constants/response-sla';
function resolveSla(s: SolicitudPqrs): { date: Date; estimated: boolean } {
  if (s.slaVenceAt) return { date: new Date(s.slaVenceAt), estimated: false };
  return { date: addBusinessDays(new Date(s.createdAt), PQRS_SLA_BUSINESS_DAYS), estimated: true };
}
```
Copy: authoritative → `"Respuesta a más tardar el {date}"`; estimated → `"Respuesta estimada hacia el {date}"` + a small `· estimado` chip and a tooltip `"Fecha estimada; tu inmobiliaria confirma la definitiva."` Format dates es-CO (`Intl.DateTimeFormat('es-CO', { day:'numeric', month:'long', year:'numeric' })`).

### Pattern 3: Extend the shared type (reuse, NOT fork)
**What:** Add optional fields to `pqrs.types.ts` used by BOTH tenant + agency. This is the SOLI-02 discipline made concrete.
**Example:**
```typescript
// Source: EDIT src/lib/api/pqrs.types.ts — additive optional fields, same estado enum
export type CostoResponsable = 'dueno' | 'inquilino' | 'compartido';   // Ley 820

export interface SolicitudPqrs {
  // …existing fields unchanged (estado enum, solicitanteTipo, slaVenceAt, cotizacionId)…
  costoResponsable?: CostoResponsable;   // set by agency/backend — NEVER decided client-side
  cotizacionMonto?: number;              // COP, server-provided
  cotizacionAprobadaAt?: string;         // ISO — set when the tenant approves (SOLI-04)
}
```
**Fork test (encode in the plan's grep gate):** ✅ reuse = `import { SolicitudPqrs, PqrsEstado } from '@/lib/api/pqrs.types'` + optional additions to that file. ❌ fork = a new file redeclaring `PqrsEstado`/a divergent estado union, or a `solicitanteTipo` literal narrowed away from the shared union.

### Anti-Patterns to Avoid
- **Forking the entity** (`pqrs-inquilino.types.ts` with its own estado enum) → the tenant's tickets diverge from what the agency sees (PITFALLS 1). Reuse + extend only.
- **Blank / dashed SLA** → always compute the interim; never render "—" for the SLA (PITFALLS 6).
- **Presenting the estimate as authoritative** → it must carry the "estimado" label and soft "hacia el" framing; never "vence el {date}" for a computed value.
- **Fetch-by-id detail** (`GET /pqrs/:id` from a route param) → IDOR. Resolve from `listMine()`.
- **Raw photo URLs** → always `documentsApi.getSignedUrl` (v7-02 lesson); never persist/display a raw Supabase URL.
- **Fabricated radicado / rows** → create throws `PqrsUnavailableError`; list degrades to `[]`. No optimistic fake ticket in a tenant-reachable path.
- **Tenant self-closing PQRS or assigning providers or fixing cost** → GAP-ANALYSIS anti-features. Tenant opens, tracks, and *approves* a quote; nothing else.
- **Alarm tone on a PQRS case** → `CaseTone` has no alarm level by design (PITFALLS 8); map all estados to neutral/info/attention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Endpoint-not-live handling | Custom per-call try/catch shapes | `isEndpointUnavailable(404/403/0)` idiom | Verbatim across 4 shipped services; consistent honest degrade |
| PQRS entity / estado vocabulary | A tenant-only ticket type | Import + extend `pqrs.types.ts` | The whole point of SOLI-02 (PITFALLS 1) |
| Photo download security | Raw URL or a client "signer" | `documentsApi.getSignedUrl` + `useSignedDocUrl` | Frontend can't ownership-check; backend mints short-lived URL (anti-IDOR) |
| Case timeline widget | New timeline component | `PlanActivityTimeline` | Already renders `TimelineItem[]` in the caso detail |
| SLA constant | A new `15` literal | `PQRS_SLA_BUSINESS_DAYS` | Shipped in v7-05 so both pillars agree |
| Realtime updates | SSE/WebSocket client | `useVisibilityPolling` | No streaming infra in-repo; polling is the fallback until tenant RLS |

**Exception — the ONE thing you DO hand-roll:** `addBusinessDays` (~10 lines, pure, unit-tested). Adding a date library for this violates the zero-packages guardrail and is disproportionate to the need.

**Key insight:** This phase is 90% wiring existing seams. The only genuinely new logic is the ~10-line business-day estimate and the PQRS→case mappers — both pure and testable.

## Runtime State Inventory

Not a rename/refactor/migration phase — additive greenfield tenant surfaces. **None — verified:** no stored data is renamed, no OS-registered state, no secrets/env changes (the create-with-photos contract reuses `NEXT_PUBLIC_BACKEND_URL`, already present), no build artifacts affected.

## Common Pitfalls

### Pitfall 1: Forking the PQRS entity (SOLI-02 crux)
**What goes wrong:** A tenant `pqrs-inquilino.types.ts` is created "to keep tenant fields separate," redeclaring `PqrsEstado`. The tenant's tickets then drift from the agency's state vocabulary; the agency's `/panel/inmobiliaria/pqrs` shows a different lifecycle than the tenant sees.
**Why it happens:** The tenant needs 2–3 fields the agency entity lacks (cost responsibility), and the fastest path *looks like* a new file.
**How to avoid:** Extend `pqrs.types.ts` with **optional** fields shared by both roles. Force `solicitanteTipo:'inquilino'` server-side from the JWT (client never claims it). Add a grep gate: no second declaration of `PqrsEstado`/`SolicitudPqrs`.
**Warning signs:** Any new `type Pqrs*Estado`, any `solicitanteTipo` narrowed to a non-shared literal, any import of the entity from anywhere other than `@/lib/api/pqrs.types`.

### Pitfall 2: SLA rendered blank or as a hard deadline
**What goes wrong:** When `slaVenceAt` is absent (the normal case today, since the engine is M1), the UI shows "—" (PITFALLS 6 violation) OR shows the computed date as "vence el {date}" implying an authoritative deadline the agency could "miss."
**Why it happens:** `slaVenceAt?` is optional in the entity; a naive render of an absent field is blank.
**How to avoid:** Always resolve via the two-tier helper; label computed values "estimado" and frame as a soft target ("respuesta estimada hacia el"). Note the Mon–Fri estimate is slightly **optimistic** (it skips no holidays), so soft framing also avoids a false "late" impression.
**Warning signs:** Any `{slaVenceAt}` rendered directly; the word "vence" next to a computed date; a dash/empty SLA cell.

### Pitfall 3: Photo retrieval via raw URL (IDOR)
**What goes wrong:** A PQRS photo is displayed from a raw persistent Supabase URL — the exact IDOR shape v7-02 flagged (`documentsApi.getDownloadUrl` is `@deprecated` for this reason).
**How to avoid:** Retrieve every photo via `documentsApi.getSignedUrl(id)` → blob (the `useSignedDocUrl({enabled})` hook, gated so URLs are only signed on open, not per-card mount).
**Warning signs:** `<img src={doc.url}>`, any use of `getDownloadUrl` on a tenant path, a photo URL persisted in component state without expiry.

### Pitfall 4: Detail fetched by route id (IDOR)
**What goes wrong:** `casos/[caseId]` or a new PQRS detail calls `GET /pqrs/:id` with the raw route param → a tenant could probe foreign ids.
**How to avoid:** Resolve from `listMine()` (`.find(s => s.id === id)`), returning an honest "no encontrado" for unknown/foreign ids — identical to the shipped `casos/[caseId]/page.tsx` pattern.

### Pitfall 5: The hub shows fabricated PQRS rows before the backend exists
**What goes wrong:** To "demo" the feature, mock PQRS rows leak into `useTenantCases`, reaching a real tenant.
**How to avoid:** `pqrsApi.listMine()` returns `[]` on unavailable; the aggregator pushes zero rows; the existing "Próximamente" PQRS/mantenimiento hub sections stay. When (and only when) `listMine()` returns real rows, the hub renders them and those sections are hidden. Unit-test the empty path (mirror `use-tenant-cases.test.ts`).

## Code Examples

### Fold PQRS into the case aggregator (replaces the v7-03 "Próximamente" placeholders)
```typescript
// Source: EDIT src/lib/hooks/use-tenant-cases.ts (verified idiom in-repo)
// pqrsApi.listMine() degrades to [] → zero rows → hub keeps "Próximamente".
for (const s of pqrsRows) {            // pqrsRows = [] until the engine is live
  out.push(pqrsToCase(s));             // pure mapper in tenant-case.ts
}
```
```typescript
// Source: EDIT src/lib/types/tenant-case.ts — pure, total mapper, NO alarm level (PITFALLS 8)
import type { PqrsEstado } from '@/lib/api/pqrs.types';
export function pqrsStatusToTone(e: PqrsEstado): CaseTone {
  switch (e) {
    case 'recibida':
    case 'asignada':
    case 'en_proceso':   return 'info';
    case 'en_cotizacion': return 'attention';  // tenant action may be needed (approve quote)
    case 'resuelta':
    case 'cerrada':      return 'neutral';
    default: return assertNever(e);
  }
}
export function pqrsStatusToLabel(e: PqrsEstado): string {
  const M: Record<PqrsEstado, string> = {
    recibida: 'Recibida', asignada: 'Asignada', en_proceso: 'En proceso',
    en_cotizacion: 'En cotización', resuelta: 'Resuelta', cerrada: 'Cerrada',
  };
  return M[e];
}
```

### Ley 820 cost-responsibility card (SOLI-04) — transparent label + approve affordance
```tsx
// Source: NEW component. costoResponsable is BACKEND-sourced; the frontend renders it,
// never decides it. The approve button is contract-first (no quote endpoint yet).
const COSTO_COPY: Record<CostoResponsable, string> = {
  dueno: 'A cargo del propietario (reparación necesaria — Ley 820).',
  inquilino: 'A cargo tuyo (reparación locativa por uso — Ley 820).',
  compartido: 'Costo compartido. Tu inmobiliaria confirma la distribución.',
};
// When estado === 'en_cotizacion' AND costoResponsable === 'inquilino':
//   show the quote amount (server-provided) + "Aprobar cotización" (approves, never executes).
//   Approval → pqrsApi.approveCotizacion(id) → PqrsUnavailableError → honest "Próximamente".
//   The tenant NEVER assigns a provider and NEVER fixes the cost (anti-features).
```

## State of the Art

| Old (v7-03 shipped) | Current (v7-06) | When | Impact |
|--------------------|-----------------|------|--------|
| PQRS/mantenimiento = honest "Próximamente" sections, `CaseType` union declares them with 0 rows | Real create/list wired through `pqrsApi`; rows fold into the hub when backend returns them | v7-06 | The seam v7-03 left is filled; no rework of the aggregator's shape |
| SLA = a static composer hint ("hasta 15 días hábiles") in the chat (v7-05) | A per-request computed clock (authoritative `slaVenceAt` ?? estimate), reusing `PQRS_SLA_BUSINESS_DAYS` | v7-06 | Same constant, upgraded from a hint to a real (or estimated) date |
| Agency `/panel/inmobiliaria/pqrs` = contract-only empty-state (RESUMEN_PQRS_VACIO), "new" = `toast.info` | Same entity, now also written from the tenant side (`solicitanteTipo:'inquilino'`) | v7-06 | No agency change needed; it reads the shared entity |

**Deprecated/outdated:** `documentsApi.getDownloadUrl` (raw URL) — `@deprecated`, must not be used for PQRS photos; use `getSignedUrl`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backend PQRS routes will be `POST /pqrs` + `GET /pqrs/mine` (mirroring `/tenant-payments/requests/mine`) | Pattern 1 | Low — contract-only; the exact path is a one-line change when the backend lands. Tag the path as provisional. |
| A2 | `costoResponsable` maps cleanly to `dueno`/`inquilino`/`compartido` and is set by the agency/backend | SOLI-04 | Medium — Ley 820 distinguishes reparaciones locativas (tenant) vs necesarias/indispensables no locativas (owner); "compartido" is a product convenience for ambiguous cases. Confirm the agency's determination model in discuss-phase. |
| A3 | Photo create uses the `documentsApi.upload` multipart shape (`entityType:'pqrs'`, `entityId`) | Pattern 1 | Low — contract shape only; documented, not sent. |
| A4 | Tenant quote approval persists via a future `POST /pqrs/:id/aprobar-cotizacion` | SOLI-04 | Low — contract-first; affordance degrades to "Próximamente" until the endpoint exists. |
| A5 | Mon–Fri interim estimate (no holidays) is acceptable because it is labeled "estimado" and authoritative date is server-side | SOLI-03 | Low — ROADMAP explicitly locked "sin festivos". Optimism caveat documented (soft "hacia el" framing). |

## Open Questions

1. **Where does the tenant *enter* a new request?**
   - What we know: the caso hub has "Próximamente" PQRS/mantenimiento sections; DESIGN §17 favors a Dialog for a short form.
   - What's unclear: a dedicated `/inquilino/solicitudes` page vs. a "Nueva solicitud" CTA folded into `/inquilino/casos`.
   - Recommendation: add a "Nueva solicitud" button on the caso hub opening `NuevaSolicitudDialog`; list PQRS as real cases in the hub. A separate page is optional polish, not required by the success criteria.

2. **Does the agency Operaciones/cotización flow expose the quote to the tenant, or only the amount + responsibility?**
   - What we know: `pqrs.types.ts` has `cotizacionId`; the agency page links repairs → `/panel/inmobiliaria/operaciones`.
   - What's unclear: whether the tenant sees quote line-items or just a total + responsibility + approve.
   - Recommendation: model tenant-side as `{ cotizacionMonto, costoResponsable, aprobar() }` — total + responsibility + approve only. Line-items are backend/agency scope.

3. **`en_cotizacion` tone — `attention` or `info`?**
   - Recommendation: `attention` **only** when `costoResponsable === 'inquilino'` (tenant action needed); otherwise `info`. This keeps neutral discipline (PITFALLS 8) while surfacing the one case that needs the tenant.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| NestJS/agent `POST /pqrs`, `GET /pqrs/mine` | Real create/list | ✗ | — | `isEndpointUnavailable` → honest "Próximamente" / `[]` (frontend-first) |
| Triage engine (real `slaVenceAt`, assignment, priority) | Authoritative SLA | ✗ (M1) | — | Interim `createdAt + 15 hábiles`, labeled "estimado" |
| Photo multipart store + `getSignedUrl` for PQRS | Photo create/retrieve | Partial | — | `documents` store + `getSignedUrl` exist (v7-02); PQRS-scoped entityType is the gap |
| Quote engine + tenant approval endpoint | SOLI-04 execution gate | ✗ (agency Operaciones + M1) | — | Contract-first approve affordance → "Próximamente" |
| `vitest` | Unit tests (business-days, mappers, empty-hub) | ✓ | ^4.0.18 | — |
| `NEXT_PUBLIC_BACKEND_URL` | api-client base | ✓ | — | — |

**Missing dependencies with no fallback:** none — every gap has an honest frontend-first fallback (that is the phase design).
**Missing dependencies with fallback:** all four backend gaps above.

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- src/lib/date/business-days.test.ts` |
| Full suite command | `pnpm test` (then `pnpm build` for the route/TS gate) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOLI-01/02 | `pqrsApi.listMine()` degrades to `[]` on 404/403/0; `create` throws `PqrsUnavailableError`; no fabricated rows | unit | `pnpm test -- src/lib/api/pqrs.service.test.ts` | ❌ Wave 0 |
| SOLI-02 | PQRS→case mappers pure/total over the full `PqrsEstado` enum; no alarm tone | unit | `pnpm test -- src/lib/types/tenant-case.test.ts` | ⚠️ extend existing coverage |
| SOLI-03 | `addBusinessDays` skips Sat/Sun; `createdAt+15` lands on a weekday; two-tier resolver prefers `slaVenceAt` | unit | `pnpm test -- src/lib/date/business-days.test.ts` | ❌ Wave 0 |
| SOLI-03 | Aggregator emits 0 PQRS rows when `listMine()` is `[]` (hub keeps "Próximamente") | unit | `pnpm test -- src/lib/hooks/use-tenant-cases.test.ts` | ✅ extend (12/12 today) |
| SOLI-01/03 | Routes register; TS strict passes | build | `pnpm build` | ✅ |
| SOLI-02 (fork gate) | No second `PqrsEstado`/`SolicitudPqrs` declaration; entity imported only from `@/lib/api/pqrs.types` | grep gate | `! grep -rn "type PqrsEstado\|interface SolicitudPqrs" src --include=*.ts \| grep -v "api/pqrs.types.ts"` | grep |

### Sampling Rate
- **Per task commit:** the relevant unit file (`business-days`, `tenant-case`, `pqrs.service`) — < 5s each.
- **Per wave merge:** `pnpm test` (expect the 7 pre-existing unrelated failures from `deferred-items.md`; **0 new**).
- **Phase gate:** `pnpm test` green (modulo the 7 known) + `pnpm build` EXIT=0 before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/date/business-days.test.ts` — covers SOLI-03 estimate
- [ ] `src/lib/api/pqrs.service.test.ts` — covers SOLI-01/02 tolerant degrade (mirror `funnel.service.test.ts` mocking `apiClient`/`ApiError`)
- [ ] Extend `src/lib/hooks/use-tenant-cases.test.ts` — 0-PQRS-rows path
- [ ] Extend `src/lib/types/tenant-case.test.ts` (create if absent) — PQRS mapper totality

*(Framework already installed — no install step.)*

## Security Domain

`security_enforcement` absent from config → treated as enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Tenant scoping owned by backend JWT (`/pqrs/mine`); frontend never claims `solicitanteTipo` |
| V4 Access Control (IDOR) | **yes (crux)** | Detail resolved from `listMine()` (own-only), never fetch-by-id; photos via `getSignedUrl` (ownership-checked, short-lived) |
| V5 Input Validation | yes | Request form: bounded `descripcion`, `tipo` from the shared enum, photo MIME/size cap (image/* + pdf, ~10 MB — mirror v7-05 picker); no `motivo de mora` field ever |
| V6 Cryptography | no (delegated) | Signed URLs minted server-side; frontend never signs |
| V8 Data Protection (Habeas Data) | yes | Photos may contain personal data → signed retrieval only, no raw persistent URL (Ley 1581 discipline carried from v7-02) |
| V12 Files/Resources | yes | Multipart upload contract mirrors `documentsApi.upload`; no client-side file write to the documents store from the PQRS path |

### Known Threat Patterns for {Next.js tenant portal + shared PQRS entity}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Foreign PQRS read via id probing | Information Disclosure | Resolve from `/pqrs/mine`; honest "no encontrado" for unknown/foreign ids |
| Photo bytes exposed via raw URL | Information Disclosure | `documentsApi.getSignedUrl` (short-lived, ownership-checked); `getDownloadUrl` forbidden here |
| Client fabricates a radicado / status | Tampering | Create throws on unavailable; status is backend-owned, never client-computed |
| Tenant self-elevates (self-close, assign provider, set cost) | Elevation of Privilege | Anti-features enforced in UI: tenant opens/tracks/approves only; `costoResponsable` + estado are backend-sourced |
| Ley 2300 leakage (asking "why" the delay) | Compliance/Privacy | No `motivo`/"por qué" field in any PQRS form (carried from v7-05 grep gate) |

## Sources

### Primary (HIGH confidence)
- `src/lib/api/pqrs.types.ts` — the shared entity + estado enum (SOLI-02 target) `[VERIFIED: in-repo]`
- `src/lib/api/lease-documents.service.ts`, `autopago.service.ts`, `messages.service.ts` — the tolerant `isEndpointUnavailable` contract idiom `[VERIFIED: in-repo]`
- `src/lib/api/documents.service.ts` + `src/lib/hooks/useDocuments.ts` — `getSignedUrl` / `useSignedDocUrl` anti-IDOR retrieval `[VERIFIED: in-repo]`
- `src/lib/hooks/use-tenant-cases.ts` + `src/lib/types/tenant-case.ts` — case aggregator + view-model (`pqrs` union member, 0 rows) `[VERIFIED: in-repo]`
- `src/app/inquilino/casos/[caseId]/page.tsx` — resolve-from-list detail (anti-IDOR) + `PlanActivityTimeline` `[VERIFIED: in-repo]`
- `src/lib/constants/response-sla.ts` — `PQRS_SLA_BUSINESS_DAYS = 15` `[VERIFIED: in-repo]`
- `src/app/panel/inmobiliaria/pqrs/page.tsx` — agency-side render of the shared entity `[VERIFIED: in-repo]`
- `.planning/ROADMAP.md` (v7-06 entry + milestone guardrails) + `.planning/research/portal-inquilino/GAP-ANALYSIS.md` §3 (PITFALLS 1–8, anti-features) `[VERIFIED: in-repo]`
- Ley 1480/2011 art. 58 — PQR response within **15 días hábiles** `[CITED: funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306]`, `[CITED: ambitojuridico.com]`
- Ley 820/2003 — reparaciones locativas (arrendatario, por uso/culpa) vs necesarias no locativas (arrendador); art. 1993 C.C. descuento ≤30% `[CITED: funcionpublica.gov.co/eva/gestornormativo/norma.php?i=8738]`

### Secondary (MEDIUM confidence)
- Metrocuadrado / Construdata / MinJusticia LegalApp — practitioner explanations of the Ley 820 repair split (corroborate the official text) `[CITED]`

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every module verified in the worktree; zero new packages.
- Architecture: HIGH — all four seams (contract idiom, signed-URL, case aggregator, SLA constant) are shipped and read directly.
- Pitfalls: HIGH — derived from GAP-ANALYSIS §3 PITFALLS 1/6/7/8 + the v7-02/v7-03/v7-05 shipped lessons.
- Legal facts: HIGH — Ley 1480 art. 58 and Ley 820 both CITED to Función Pública (official gestor normativo).

**Research date:** 2026-07-19
**Valid until:** ~2026-08-18 (stable — in-repo patterns; legal statutes are long-lived). Re-verify only if the NestJS/agent PQRS routes land (then A1/A3/A4 resolve from ASSUMED → VERIFIED).

---

## Backend gaps vs. what's real today

| Capability | Real today (frontend ships) | Gated behind backend ("Próximamente") | Guardrail |
|------------|-----------------------------|----------------------------------------|-----------|
| **SOLI-01** maintenance request + photos | `NuevaSolicitudDialog` (tipo `reparacion`, descripción, real photo picker); `pqrsApi.create` contract (multipart shape) | Actual persistence + photo store (`POST /pqrs`); create throws `PqrsUnavailableError` → honest "Próximamente", **no fake radicado** | No fabricated ticket; photo retrieval via `getSignedUrl` only |
| **SOLI-02** formal PQRS, reuse `pqrs.types.ts` | Same Dialog with `tipo` selector; imports + **extends** the shared entity; `solicitanteTipo:'inquilino'` | Same backend as SOLI-01; agency reads the identical estado vocabulary today | **PITFALLS 1** — reuse+extend, never fork (grep-gated) |
| **SOLI-03** SLA timeline, 15 días hábiles | Two-tier resolver: authoritative `slaVenceAt` when present, else `addBusinessDays(createdAt,15)` labeled "estimado"; never blank; timeline via `PlanActivityTimeline` | Real `slaVenceAt` from the M1 triage engine (replaces the estimate, drops the "estimado" label) | **PITFALLS 6** — never blank; estimate soft-framed "hacia el … · estimado" |
| **SOLI-03** hub integration | `useTenantCases` folds `pqrsApi.listMine()`; rows render when real, else the v7-03 "Próximamente" sections stay | Real `/pqrs/mine` rows (list = `[]` until then) | Normalize-never-compute; own-cases-only; **PITFALLS 8** no alarm tone |
| **SOLI-04** Ley 820 cost transparency | `CostoResponsabilidadCard` renders backend-sourced `costoResponsable` (dueno/inquilino/compartido) with factual copy | The **value** of `costoResponsable` + `cotizacionMonto` (agency/backend determines) | Frontend renders, never decides the cost responsibility |
| **SOLI-04** quote approval before execution | "Aprobar cotización" affordance when `en_cotizacion` + cost is the tenant's; `approveCotizacion` contract | Real quote engine (agency Operaciones + M1) + approval persistence → "Próximamente" | Tenant **approves** only; never assigns providers / self-fixes cost / self-closes (anti-features) |
| Photo bytes retrieval | `documentsApi.getSignedUrl` + `useSignedDocUrl` (short-lived, ownership-checked) | PQRS-scoped `entityType` on the documents store | **PITFALLS 7** anti-IDOR; `getDownloadUrl` forbidden |
| Realtime status | `useVisibilityPolling` (tab-gated refresh) | Supabase Realtime `postgres_changes` once tenant RLS exists in `agent` | Polling fallback (no SSE/WebSocket) |
