# Phase v7-03: Estado de Casos (Hub — "Mis casos") — Pattern Map

**Mapped:** 2026-07-18
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 7 surfaces (hub page/route, unified case view-model hook+type, case detail, state timeline, in-app notifications, polling fallback, dashboard wire-in) + neutral-status framing
**Analogs found:** 5 exact/role-match / 3 forward-ref (PQRS v7-06 · mantenimiento v7-06 · acuerdos v7-07)

> **Headline for the planner:** v7-03 is a **pure frontend composition** phase (ARCHITECTURE §"Case-Status Flow": *"pure composition, no new backend"*). Almost every building block already exists in-repo:
> - A **reusable state timeline exists — twice.** `ApplicationTimeline.tsx` (event-typed, tenant) and the generic CRM `PlanActivityTimeline.tsx` (`TimelineItem[]`). **Do NOT build a new timeline** — adapt one (both need a small Cadence-token pass; see caveats).
> - An **in-app notifications read surface already exists and is real**: `notificaciones/page.tsx` + `useTenantNotifications()` (`useNotifications.ts:123`). CASO-03's "notificación in-app al cambiar estado" is **read-side already solved** — surface it; **push/WhatsApp = honest "Próximamente"** (no channel exists).
> - The **multi-hook composition pattern** for a hub is `useTenantApplications()` (`useApplications.ts:90`, parallel `Promise.all` + `useMemo` active/completed) and the dashboard's own multi-hook read (`inquilino/page.tsx:104-130`). The **unified cross-pillar `TenantCase` normalizer is the one genuinely NEW artifact** (no single-file analog — it composes existing analogs).
> - **Of the 4 nominal case types, only PAGOS is REAL tenant-facing today.** PQRS + mantenimiento = **v7-06** (no tenant surface exists — `pqrs.types.ts` is agency-only). Acuerdos = **v7-07** (hard cross-repo `agent` dep). Add **aplicaciones (in-progress)** — REAL and case-shaped (it already carries a status + `events[]` timeline) — as the real backbone alongside pagos.
> - **Guardrail (PITFALLS 8 / CASO-04):** "al día" cases use **neutral, factual** states — no alarm badges, no invented urgency. Copy the v7-01 `PeriodStatusCard` tone (factual `currentPeriodStatus` labels). States/SLA **trace to existing services** (no second number). Read DESIGN.md §12 (Badge/PlanStatusBadge), §11 (empty states), §4 (banners/cards), §16 (dates → fix `es-CL`→`es-CO`) before building.

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog (path:line) | Match |
|------------------|------|-----------|----------------------------|-------|
| `src/app/inquilino/casos/page.tsx` (NEW — "Mis casos" hub list) | page/container | request-response (read, aggregate) | `src/app/inquilino/aplicaciones/page.tsx` (list hub + status + empty-state) + `src/app/inquilino/page.tsx:104-130` (multi-hook compose) | role-match |
| `src/lib/hooks/use-tenant-cases.ts` (NEW — unified case aggregator) | hook/service | transform (compose N pillars) | `src/lib/hooks/useApplications.ts:90-137` (`useTenantApplications` parallel compose + `useMemo`) | role-match |
| `src/lib/types/tenant-case.ts` (NEW — normalized `TenantCase` + `CaseEvent`) | type/model | transform (view-model) | `src/lib/types/tenant-application.ts:60-96` (`ApplicationEvent`/`TenantApplication`) + `src/lib/api/pqrs.types.ts:34-52` (estado/responsable/slaVenceAt) | role-match |
| `src/app/inquilino/casos/[caseId]/page.tsx` (NEW — case detail + timeline) | page/container | request-response (read) | `src/components/tenant/ApplicationDetail.tsx:178,263` (status badge + timeline compose) | exact |
| *(reuse)* state timeline component | component | event-driven (render) | `src/components/tenant/ApplicationTimeline.tsx` (event-typed) **OR** `src/components/ui/plan/PlanActivityTimeline.tsx` (generic `TimelineItem[]`) | exact |
| In-app notifications read (CASO-03) | page/hook | request-response (poll) | `src/app/inquilino/notificaciones/page.tsx` + `src/lib/hooks/useNotifications.ts:123` (`useTenantNotifications`) | exact |
| Polling fallback (realtime substitute) | hook idiom | poll | `src/lib/hooks/useVisibilityPolling.ts:27` (used in cobranza @30s) | exact |
| `src/app/inquilino/page.tsx:256` (wire "casos abiertos" stat) | page (edit) | request-response (read) | *(itself — mirror Applications stat card `:243-254`)* | self |
| Tenant PQRS + mantenimiento cases | service/type | — | *(no tenant surface today)* → **v7-06**, honest placeholder | no-analog |
| Tenant acuerdos cases | service/type | — | *(cross-repo `agent` dep)* → **v7-07**, "Próximamente" | no-analog |

---

## REAL vs forward-ref: what case-source data exists tenant-facing TODAY

The hub aggregates 4 nominal case types. Verified against real code — **only pagos is real** among the four; **aplicaciones** (real, case-shaped) is the second real backbone:

| Case type | Real tenant data today? | Source (verified) | Planner action |
|-----------|-------------------------|-------------------|----------------|
| **Pagos abiertos** | ✅ **REAL** | `useMyPaymentRequests()` + `useLeasePaymentInfo()` (`useLeases.ts:231,274`), wired in v7-01. A "case" = a period `NONE`/`REJECTED`/pending. | Compose from these hooks. Estado = `currentPeriodStatus` verbatim (no second number, PAGO-01/CASO-04). |
| **Aplicaciones (en proceso)** | ✅ **REAL** — the only case type with a real timeline today | `useTenantApplications().active` (`useApplications.ts:90,126`); each app has `status` + `events: ApplicationEvent[]` (`tenant-application.ts:88-96`). | Treat an in-progress application as a case. Its `events[]` feed the timeline directly. **This is the hub's substance today.** |
| **Arriendo/contrato (estado)** | ✅ **REAL** (bonus source) | `useLeases().getActive()` (`useLeases.ts:38`) + `contractsApi.getMine()`. ARCHITECTURE §Case-Status composes application→lease→contract into one stepper. | Include lease/contract state as a case (postulación → contrato → arriendo activo stepper). |
| **PQRS (tenant)** | ❌ **NONE** → forward-ref **v7-06** | `pqrs.types.ts` exists but is **agency-only** (`inmobiliaria.service.ts`); no tenant read/service. `pqrs.types.ts:9` self-documents *"UI con estado vacío honesto; NO hay data falsa hasta que exista [el motor]"*. | Honest "Próximamente" placeholder / zero count — **no fabricated cases**. v7-06 wires the tenant service (reusing `pqrs.types.ts`, not forking). |
| **Mantenimiento (tenant)** | ❌ **NONE** → forward-ref **v7-06** | No tenant maintenance surface (grep clean). `notification.ts:304` has a `maintenance` category but no source. | Same honest placeholder; v7-06 (SOLI-01). |
| **Acuerdos (tenant)** | ❌ **NONE** → forward-ref **v7-07** (hard cross-repo) | Only agency-side cobranza hooks (`use-payment-plan-approval.ts`, `use-agreement-propose.ts`) call `agent`; no tenant route/RLS. ARCHITECTURE §Acuerdos: *"cannot show REAL data until [agent] ships a tenant-scoped read route + RLS."* | "Próximamente" honest empty-state (same as the agency acuerdos page already does). **No fake data on a path a real tenant reaches.** |

**Net:** the hub is **honestly substantive today** from pagos + aplicaciones + lease/contract state; PQRS/mantenimiento/acuerdos are honest "Próximamente" sections until v7-06/v7-07.

---

## Pattern Assignments

### 1. "Mis casos" hub page — `src/app/inquilino/casos/page.tsx` (NEW; page, read-aggregate)

**Route decision:** ARCHITECTURE §Directory (`ARCHITECTURE.md:110`) leaves it open: `casos/ (or reuse /inquilino root as hub)`. A dedicated `/inquilino/casos` route is cleaner and matches the nav pattern; the dashboard stat card (§7) deep-links into it.

**Analog A — list-hub layout:** `src/app/inquilino/aplicaciones/page.tsx`. Same route group, same design language: header + `SegmentedControl`/filter pills (from `@leasefy/cadence`, `aplicaciones/page.tsx:8`), `useTenantApplications()` read (`:10`), `CompleteProfileFirst` gate (`:14`), `EmptyState` (`:15`), grid/list of status-badged rows. **Copy this skeleton** — swap the applications list for the unified `useTenantCases()` list.

**Analog B — multi-hook composition on one page:** `src/app/inquilino/page.tsx:104-130`. Shows the canonical way to consume `useLeases` + `useMyPaymentRequests` + `useTenantApplications` + `useLeasePaymentInfo` together with a combined loading gate (`:136-148`, never read `.length` on in-flight data) and the **no-fabrication idiom** (`:118-121`: only a "next payment" when `currentPeriodStatus` is `NONE`/`REJECTED`; amount always from `paymentInfo.monthlyRent`).

**Key idioms:** combined loading gate → `<Spinner size="lg" />`; empty → `EmptyState` (DESIGN.md §11); each case row = icon + title + `responsable` + status badge (§7) + `CaretRight` link to detail. Honest "Próximamente" section for PQRS/mantenimiento/acuerdos (DESIGN.md §11 `EmptyState`, not fake rows).

---

### 2. Unified "case" view-model — `src/lib/hooks/use-tenant-cases.ts` + `src/lib/types/tenant-case.ts` (NEW)

**This is the one genuinely new artifact — but it's composition of existing analogs, not greenfield.**

**Composition analog** (`useApplications.ts:90-137`, `useTenantApplications`): parallel `Promise.all([...])` fetch (`:102-105`), build derived maps, `useMemo` to classify (`active`/`completed`, `:126-134`), return `{ items, active, completed, isLoading, error, refetch }`. **Clone this exact shape** — but fan out across pillars: `applicationsApi.getMineForDisplay()` + `leasesApi.getMine()` + `contractsApi.getMine()` + `tenantPaymentRequestsApi.getMine()` + `useLeasePaymentInfo`, each wrapped in the 403/404→`[]` honest-empty idiom (`leases.service.ts:120`; ARCHITECTURE Pattern 2) so a missing pillar degrades to empty, not crash.

**Type analog** (`tenant-application.ts:60-96`): model `CaseEvent` on `ApplicationEvent { id, type, timestamp, description }` (`:73`) and `TenantCase` on `TenantApplication { id, status, updatedAt, events[] }` (`:88`). **Add per-case fields by reusing `pqrs.types.ts:34-52`** — do NOT invent new names: `estado` (`:34`), `responsableId`/`responsableNombre` (`:45-46`), `slaVenceAt?` (`:52`), `solicitanteTipo` (`:40`). This keeps the tenant case shape aligned with the agency PQRS entity for v7-06 (guardrail PITFALLS 1: reuse `pqrs.types.ts`, no fork).

**No-fabrication rule (CASO-04):** each `TenantCase.estado`/SLA is copied verbatim from its source service — the aggregator **normalizes, it does not compute**. No derived "urgency", no second number.

**⚠️ N+1 note (ARCHITECTURE §Scaling 288):** client-side fan-out (lease+contract+app+payment per case) is acceptable at MVP scale; if a tenant has many historical apps, a single NestJS aggregation endpoint is the later fix. Frontend-first: compose now.

---

### 3. Case detail + state timeline — `src/app/inquilino/casos/[caseId]/page.tsx` (NEW) + reuse timeline

**Detail analog** (`src/components/tenant/ApplicationDetail.tsx`): composes `<ApplicationStatusBadge status={status} size="md" />` (`:178`) + a summary + `<ApplicationTimeline events={events} />` (`:263`). **This is the exact "detail + state timeline" pattern** CASO-02 asks for. Clone its structure; drive it from a single `TenantCase`.

**Timeline reuse — TWO options, do NOT build new:**
- **`src/components/tenant/ApplicationTimeline.tsx`** — vertical timeline: icon column + connecting line + content (`:85-121`), event-typed with per-type icon/color maps (`:17-54`), sorts chronologically (`:71-73`), has its own empty state (`:126`). Closest to CASO-02's per-state timeline. **Caveat:** uses hardcoded hex (`#1A40FF`/`#EEF1FF`, `:32-40`) and `bg-surface-muted` — a small Cadence-token pass is warranted (DESIGN.md §12 uses `*-bg`/`*-fg` feedback tokens) but not mandatory to function.
- **`src/components/ui/plan/PlanActivityTimeline.tsx`** — generic CRM primitive taking `TimelineItem[]` (`:6-19`: `title/description/timestamp/icon/iconColor/iconBg`), `maxItems`, empty message, `PlanActivityCard` wrapper (`:175`). More generic — good if the case timeline mixes pillar sources. **Caveat:** `text-plan-*` tokens + `es-CL` date (`:44`).

**Recommendation for planner:** if cases stay event-typed like applications, extend `ApplicationTimeline` (rename generically or map `CaseEvent`→its props); if cases are heterogeneous across pillars, feed `PlanActivityTimeline` with `TimelineItem[]`. Either way it's an **adapt**, not a build.

**Tenant-only scoping (CASO-02):** all sources are already `/mine`-scoped (`getMine`, `getMineForDisplay`, `getTenantNotifications`) — the tenant only ever sees their own. **Agency internal notes must be excluded**: when v7-06 wires tenant PQRS, map ONLY tenant-visible fields (estado/responsableNombre/slaVenceAt), never internal `notas`/assignment audit. Note this as a mapping guardrail in the case type.

---

### 4. In-app notifications (CASO-03) — READ SURFACE ALREADY EXISTS

**`src/app/inquilino/notificaciones/page.tsx` is a real, wired tenant notifications reader** — added to nav in v7-01 (`layout.tsx:41`). Backed by `useTenantNotifications()` (`useNotifications.ts:123`): `{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, refetch }`, polling @2min (`useNotifications.ts:9,146`). Types in `notification.ts` (`TenantNotification` `:123`, `TENANT_CATEGORIES` `:240`).

**What this means for CASO-03:** the "notificación in-app al cambiar estado de un caso" is **read-side already solved** — a case-state-change notification, once emitted by the backend, lands in this existing surface. Frontend work = surface unread notifications on/near the hub (e.g. reuse `unreadCount`), link to the case.

**⚠️ No case-specific notification type code exists yet** (`NotificationType` enum `notification.ts:16-44` covers applications/payments/visits/contracts/leases — **no `CASE_STATUS_CHANGED`**). Emitting that code is a backend concern; frontend-first, the hub reads what exists and doesn't fabricate. **Push/WhatsApp = honest "Próximamente"** (no channel exists; ARCHITECTURE §Realtime Pattern 4 + roadmap external-deps: proactive push depends on `agent` tenant routes + messaging gateway). Use DESIGN.md §11 `EmptyState`/a disabled toggle, not a fake "enabled" state.

**⚠️ Caveat:** `notificaciones/page.tsx` predates Cadence (framer-motion, hardcoded hex `bg-[#f8f8f8]`/`#1A40FF`, `es-CL` at `:100`). If the planner touches it, align to Cadence tokens; otherwise leave (out of scope for CASO-03 read).

---

### 5. Polling fallback (realtime substitute) — `src/lib/hooks/useVisibilityPolling.ts`

**Analog** (`useVisibilityPolling.ts:27`): `useVisibilityPolling(callback, intervalMs, enabled)` — tab-visibility-gated `setInterval` that pauses on hidden tabs and refetches on re-focus. Used across cobranza @30s (`use-inbox.ts:190`, `use-debtor-audit.ts:68`, etc.). **This is the roadmap's named realtime fallback** (`ROADMAP.md:86`: *"fallback hoy = polling (useVisibilityPolling)"*).

**Wire it in `use-tenant-cases.ts`:** `useVisibilityPolling(() => void refetch(), 30_000, Boolean(enabled))` after the initial fetch (the hook intentionally does NOT do the first fetch — caller owns it, `useVisibilityPolling.ts:18-22`). ARCHITECTURE §Scaling 287: **stagger** intervals if the hub polls multiple pillars. Realtime (`postgres_changes` filtered by tenant) is deferred until `agent` ships tenant RLS (ARCHITECTURE Pattern 4) — do NOT block on it.

---

### 6. Dashboard "casos abiertos" wire-in — `src/app/inquilino/page.tsx:256` (edit)

**The placeholder is explicit:** `page.tsx:256` → `{/* Casos abiertos: hub llega en v7-03 — no fabricar conteo */}`. This phase replaces it with a real 4th stat card.

**Analog — the Applications stat card** (`page.tsx:243-254`): icon tile + label + `{count}` + neutral sub-label ("En proceso" / "Sin aplicaciones"). **Copy it verbatim**, swapping the count for the open-case count from `useTenantCases()` and deep-linking the card to `/inquilino/casos`. Grid is already `lg:grid-cols-4` (`:219`) with 4 slots (Score, Arriendos, Aplicaciones, Next-Payment) — decide with the planner whether the case card replaces a slot or the grid grows; keep counts real (`:234,248` idiom), **never fabricate** (the comment mandates it).

**Neutral copy:** sub-label is factual ("2 casos abiertos" / "Todo al día"), no alarm color — CASO-04.

---

### 7. Neutral status framing (guardrail PITFALLS 8 / CASO-04)

**Reuse the v7-01 `PeriodStatusCard` tone** (`pagos/page.tsx`, cited in v7-01 PATTERNS §2): `APPROVED`/al-día → "Tu pago de este mes ya está al día" (neutral), `REJECTED` → shows backend reason verbatim + plain "Reintentar", **no guilt, no urgency inflation**.

**Badges:** use `Badge` / `PlanStatusBadge` (DESIGN.md §12) with feedback `*-bg`/`*-fg` tints. For "al día" cases use a **neutral/secondary** variant (`bg-surface-sunken`/`text-fg-secondary`), NOT `destructive`/alarm. The existing tenant status labels are already neutral: `APPLICATION_STATUS_LABELS` (`tenant-application.ts:27`: "En revisión", "Pre-aprobada"…) and `PqrsEstado` labels. **Never** communicate state by color alone (DESIGN.md §7 A11y) — pair icon + text.

---

## Shared Patterns

### api-client contract (all case sources)
**Source:** `src/lib/api/client.ts` + `leases.service.ts` (canonical). Typed `apiClient.get<T>`; `ApiError(status, message)`; **403/404 → `[]` honest empty** (`leases.service.ts:120`, `tenant-payment-requests.service.ts:19`) — the frontend-first "pillar may not exist yet → empty, not crash" contract. **Reuse for every pillar in `use-tenant-cases.ts`** so PQRS/mantenimiento/acuerdos degrade to empty until their backends land (ARCHITECTURE Pattern 2).

### Hook composition (multi-pillar aggregation)
**Source:** `useApplications.ts:90-137` (`useTenantApplications`) — parallel `Promise.all`, `useMemo` classification, `{ active, completed, isLoading, error, refetch }`. Clone for `useTenantCases()`. Combined loading gate idiom from `page.tsx:136-148`.

### State timeline (reuse, don't build)
**Source:** `ApplicationTimeline.tsx` (event-typed) **or** `PlanActivityTimeline.tsx` (`TimelineItem[]`, `:6`). Detail composition: `ApplicationDetail.tsx:263`. Both timelines need a light Cadence-token pass (DESIGN.md §12).

### In-app notifications (read)
**Source:** `notificaciones/page.tsx` + `useTenantNotifications()` (`useNotifications.ts:123`) + `notification.ts` types. Read-side of CASO-03 already works; push/WhatsApp = "Próximamente".

### Polling fallback
**Source:** `useVisibilityPolling.ts:27` @30s (stagger across pillars). Realtime deferred to `agent` tenant RLS.

### Empty / loading / neutral-status states
**Source:** DESIGN.md §11 (`EmptyState`, `spinner`, `skeleton`) + §12 (Badge/PlanStatusBadge) + §16 (dates → **fix `es-CL`→`es-CO`** in any timeline/notif copy touched). "Próximamente" = honest label, never fake data.

---

## No Analog Found

| Surface | Role | Data Flow | Reason → planner action |
|---------|------|-----------|-------------------------|
| **Unified cross-pillar `TenantCase` normalizer** | hook/type | transform | No single-file multi-domain aggregator exists — closest is single-domain `useTenantApplications`. → BUILD by composing existing analogs (§2); reuse `pqrs.types.ts` field names to stay v7-06-compatible. |
| **Tenant PQRS cases** | service/type | — | No tenant PQRS surface today (`pqrs.types.ts` agency-only). → **v7-06**; hub shows honest "Próximamente" section / zero count, **no fabricated cases**. |
| **Tenant mantenimiento cases** | service/type | — | No tenant maintenance surface. → **v7-06** (SOLI-01); honest placeholder. |
| **Tenant acuerdos cases** | service/type | — | Hard cross-repo `agent` dep (tenant route + RLS). ARCHITECTURE: cannot show real data until agent ships it. → **v7-07**; "Próximamente" (same as agency acuerdos page). |
| **`CASE_STATUS_CHANGED` notification type + proactive push/WhatsApp** | notification/channel | event-driven | No such type code in `NotificationType` enum; no messaging channel. → backend/agent concern; frontend reads existing notifications, push = honest "Próximamente" (CASO-03). |

---

## Metadata

**Analog search scope:** `src/app/inquilino/**` (casos/N-A, aplicaciones, pagos, notificaciones, arriendo/[leaseId], layout, dashboard), `src/components/tenant/**` (ApplicationTimeline, ApplicationDetail), `src/components/ui/plan/**` (PlanActivityTimeline), `src/lib/hooks/**` (useApplications, useLeases, useNotifications, useVisibilityPolling), `src/lib/types/**` (tenant-application, notification), `src/lib/api/**` (pqrs.types), plus repo-wide grep for tenant pqrs/mantenimiento/acuerdo surfaces (none found).
**Files read end-to-end:** ROADMAP/REQUIREMENTS/GAP-ANALYSIS + ARCHITECTURE (case-status flow), DESIGN.md, v7-01/v7-02 PATTERNS; `inquilino/page.tsx`, `inquilino/layout.tsx`, `notificaciones/page.tsx`, `ApplicationTimeline.tsx`, `PlanActivityTimeline.tsx`, `useNotifications.ts`, `useApplications.ts`, `useVisibilityPolling.ts`, `notification.ts`, `tenant-application.ts` (targeted); grep confirmation of `pqrs.types.ts` (responsable/estado/slaVenceAt), dashboard placeholder, polling usage.
**Pattern extraction date:** 2026-07-18
**Read-only:** no source files modified; this PATTERNS.md is the only write.
