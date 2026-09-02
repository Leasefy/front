# Phase v7-03: Estado de Casos (Hub "Mis casos") — Research

**Researched:** 2026-07-18
**Domain:** Unified tenant "cases" hub (Next.js 14 App Router, TypeScript, Tailwind/Cadence) — a **frontend composition** aggregating pagos + PQRS + mantenimiento + acuerdos over existing tenant-scoped services, with honest empty-states for the sources whose backend engines don't exist yet. Fixes P1.
**Confidence:** HIGH (case-source reality map grounded in read file:line this session; guardrails cross-verified in PITFALLS against official Colombian norms)

> Milestone research already exists (`.planning/research/portal-inquilino/{GAP-ANALYSIS,PITFALLS,ARCHITECTURE,STACK}.md`). This RESEARCH synthesizes only the parts that bear on v7-03 and grounds every claim in current repo code. Companions: `v7-01-RESEARCH.md` (house style + the `403/404 → []` api-client/empty-state pattern this phase reuses), `v7-02-RESEARCH.md` (the "Próximamente" contract-first discipline), and `v7-03-PATTERNS.md` (pattern-mapper: per-file assignments). Read all four.

## Summary

The ROADMAP frames v7-03 as "composición frontend de servicios existentes (apps + leases + contracts)" — and that framing is **directionally correct but needs one sharp correction**: of the four case types the hub must aggregate (pagos, PQRS, mantenimiento, acuerdos), **only pagos is real today**. `useMyPaymentRequests()` → `/tenant-payments/requests/mine` (documented "fuente única del historial") returns real tenant payment requests with genuine open-case states (`PENDING_VALIDATION`, `DISPUTED`, `REJECTED`), and `useLeasePaymentInfo().currentPeriodStatus` gives the current-period status. **PQRS and mantenimiento are forward-refs to v7-06** (only `pqrs.types.ts` exists — types-only, no service, header explicitly: "NO hay data falsa hasta que exista el motor"; there is **no tenant maintenance service at all** — maintenance is the `reparacion` subtype of PQRS). **Acuerdos is a forward-ref to v7-07** (hard cross-repo dependency on `agent` tenant RLS; even the *agency* acuerdos page has every action disabled `title="Próximamente"` because no persistence endpoint exists). So the hub is not "aggregate 4 real services" — it is "**aggregate the 1-2 real sources for real, and render honest 'Próximamente' sections for the 2-3 that have no tenant backend yet — never fabricate a case on a path a real tenant reaches.**"

The two *additional* real, tenant-operable sources the ROADMAP names (applications, contracts) do exist and are already composed on the dashboard: `useTenantApplications()` (status `submitted`/`under_review`/`needs_info`/`pre_approved`/`approved`/…) and `useContracts()` (contract signature status). An application in `needs_info` or a contract `READY_TO_SIGN` is a legitimate open case the tenant must act on — but they are **pre-firma funnel items**, and the milestone is explicitly post-firma operation. Whether to surface them as "casos" is a scope decision (Risk R1), not a technical blocker.

Two structural findings shape the whole phase. **(1) There is no real per-case event history anywhere.** The tenant application view-model (`TenantApplicationView`) returned by the real hooks has **no `events` array** — only a single current `status` + timestamps. The `ApplicationTimeline`/`ApplicationEvent` component that *looks* like a case timeline is fed client-synthesized events and is **not rendered on any real `/inquilino` page** (legacy). So a "timeline de estados" (CASO-02) must be built from **source-provided timestamps only** (created → validated), never a fabricated multi-step history. **(2) In-app notifications are already fully real** — `useTenantNotifications()` polls `/notifications` every 2 min with markRead/markAllRead/delete + `actionUrl` deep-linking, and templates already cover `PAYMENT_*`/`APPLICATION_*`/`CONTRACT_*`/`LEASE_*`/`VISIT_*`. So CASO-03's in-app requirement is **met today for the real case types**; what's missing is `PQRS_*`/`MAINTENANCE_*`/`AGREEMENT_*` templates (backend emitter = v7-06/v7-07) and the proactive **push/WhatsApp** channel (push has a real FCM client hook but no case-change emitter; WhatsApp must route the `agent` contact gate) → honest "Próximamente".

**Primary recommendation:** Build a single `useTenantCases()` aggregation hook that composes the **already-used** dashboard hooks (`useMyPaymentRequests` + `useLeasePaymentInfo`, optionally `useTenantApplications` + `useContracts` per the R1 scope decision), normalizing each real source row into a neutral `TenantCase` view-model **by reading — never recomputing — its source estado**. Render forward-ref sources (PQRS/mantenimiento/acuerdos) as honest "Próximamente" sections (agency-acuerdos precedent), not fake rows. For CASO-02 timelines, use the generic `PlanActivityTimeline`/`TimelineItem` component fed **source timestamps only**. For CASO-03, reuse the existing real in-app notification stack; label push/WhatsApp "Próximamente". Zero new npm dependencies; zero new backend.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CASO-01 | "Mis casos": hub aggregating PQRS + mantenimiento + acuerdos + pagos abiertos, each with estado + responsable (composición frontend de servicios existentes) | **Pagos = REAL** (`useMyPaymentRequests` → `/tenant-payments/requests/mine`, open states `PENDING_VALIDATION`/`DISPUTED`/`REJECTED`; `useLeasePaymentInfo.currentPeriodStatus`). **PQRS + mantenimiento = forward-ref v7-06** (only `pqrs.types.ts`, no service; no tenant maintenance service — `reparacion` is a PQRS subtype). **Acuerdos = forward-ref v7-07** (agency acuerdos page all `disabled title="Próximamente"`). Compose via a `useTenantCases()` hook mirroring the dashboard's multi-hook pattern (`page.tsx:104-113`). |
| CASO-02 | Each case links to its detail (solicitud/acuerdo/conversación) + shows estado timeline; tenant sees only own cases (internal agency notes excluded) | Detail links doable now (pago → `/inquilino/pagos`; app → `/inquilino/aplicaciones/[applicationId]`; contrato → `/inquilino/contratos`). Timeline: **no real event history exists** (`TenantApplicationView` has no `events`; `ApplicationTimeline` is client-synthesized + unused on real pages) → use `PlanActivityTimeline` with **source timestamps only**. Own-cases-only inherited from JWT-scoped `/…/mine` endpoints; must NOT surface internal fields (`responsableId`, PQRS internal notes). |
| CASO-03 | In-app notification on case state change; push/WhatsApp when channel available, honest empty-state meanwhile — the direct P1 fix | **In-app = REAL today** (`useTenantNotifications` → `/notifications`, poll 2 min, markRead/delete, `actionUrl`; templates cover PAYMENT/APPLICATION/CONTRACT/LEASE/VISIT). PQRS/maintenance/agreement templates = backend emitter later (v7-06/v7-07). Push = real FCM client hook (`usePushNotifications`) but **no case-change emitter**; WhatsApp = must route `agent` gate → both "Próximamente". Realtime fallback = `useVisibilityPolling` (already how notifications poll). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Case estado / status (per source) | API/Backend (each source service) | Frontend read-only mapper | Backend owns each authoritative status; the hub renders it, never recomputes it (CASO-01, PITFALLS 9) |
| Case aggregation into one list | **Frontend** (`useTenantCases()` composing existing hooks) | — | Pure client composition; no new backend (ROADMAP + ARCHITECTURE §"pura composición frontend") |
| Payment open-case data | API/Backend (`/tenant-payments/requests/mine`, `/leases/:id/payment-info`) | `useMyPaymentRequests`, `useLeasePaymentInfo` | Single source of truth for pago cases (`tenant-payment-requests` = "fuente única") |
| PQRS / mantenimiento data | API/Backend (M1 engine — **does not exist**) | Frontend "Próximamente" | Types-only (`pqrs.types.ts`); tenant has no PQRS/maintenance data until v7-06 |
| Acuerdos data | API/Backend (`agent` tenant RLS — **does not exist**) | Frontend "Próximamente" | Hard cross-repo dep (v7-07); even agency surface has no persistence |
| Case detail view + timeline | Frontend (link to existing detail routes; `PlanActivityTimeline`) | Source service timestamps | Timeline from real source fields only — no synthesized history |
| In-app notification on state change | API/Backend (`/notifications` emitters) | `useTenantNotifications` (poll) | Real for existing case types; new types need backend emitter |
| Proactive push / WhatsApp on state change | API/Backend (`agent` routes + gateway; FCM emitter) | `usePushNotifications` (client) + honest "Próximamente" | Client subscribe capability exists; case-change emission + WhatsApp gate do not |
| Own-cases-only authorization | API/Backend (JWT-scoped `/…/mine`) | Frontend (no raw-ID fetch, no internal fields) | IDOR/authorization owned by backend scoping; frontend must not leak internal notes |

## Case-Source Reality Map (the core finding)

Legend: 🟢 real & wired · 🟡 real API exists but hub doesn't compose it yet · 🔴 no tenant backend / genuinely absent (forward-ref)

| Case type | State | What is REAL today (file:line) | Gap / where it lands | v7-03 verdict |
|---|---|---|---|---|
| **Pagos abiertos** | 🟢 | `useMyPaymentRequests()` → `/tenant-payments/requests/mine` ("fuente única"), status enum `PENDING_VALIDATION`/`APPROVED`/`REJECTED`/`DISPUTED`/`CANCELLED` (`tenant-payment-requests.types.ts:7-47`); `useLeasePaymentInfo().currentPeriodStatus` `NONE`/`PENDING_VALIDATION`/`APPROVED`/`REJECTED` (`leases.types.ts`). Both already composed on dashboard (`page.tsx:104-113`) + pagos page (`pagos/page.tsx:46-58`). | — | **Aggregate for real.** Open cases = non-terminal payment requests (`PENDING_VALIDATION`, `DISPUTED`, `REJECTED`) + a `NONE`/`REJECTED` current period. `responsable` = "Inmobiliaria" (validator). detailLink `/inquilino/pagos`. |
| **PQRS** | 🔴 | Nothing tenant-facing. `pqrs.types.ts` is **types-only** (`SolicitudPqrs`, `PqrsEstado`, `solicitanteTipo:'inquilino'`), header: "UI con estado vacío honesto; NO hay data falsa hasta que exista el motor" (`pqrs.types.ts:1-11`). **No `pqrs.service.ts`.** | v7-06 (M1 engine) | **UI shell + "Próximamente".** Reuse `pqrs.types.ts` for the eventual shape; do NOT fork; do NOT fabricate rows. |
| **Mantenimiento** | 🔴 | No tenant maintenance service (only agency-side `inmobiliaria.service.ts` + `MantenimientoViewer`). In the shared model, maintenance = `PqrsTipo:'reparacion'` (`pqrs.types.ts:13`). | v7-06 (rides the PQRS engine) | **"Próximamente"** — subtype of PQRS; no separate tenant source. |
| **Acuerdos** | 🔴 | Nothing. Agency acuerdos page has **every** action `disabled title="Próximamente"`, comment "sin endpoint de persistencia/aprobación desde esta superficie" (`ai/cobranza/acuerdos/page.tsx:143-265`). | v7-07 (hard cross-repo dep: `agent` tenant RLS) | **UI shell + "Próximamente".** Types-only later (`tenant-acuerdos.types.ts`). **NO fake data on a real-tenant path** (ROADMAP v7-07 external-deps). |
| **Aplicaciones** *(candidate source)* | 🟡 | `useTenantApplications()` real: `status` `submitted`/`under_review`/`needs_info`/`pre_approved`/`approved`/`rejected`/`withdrawn`/`contract_failed` (`tenant-application.ts:14-22`), `active`/`completed` split already computed (`useApplications.ts:127-136`). | — | **Optional (Risk R1).** A `needs_info`/`under_review` application is an actionable open case, but pre-firma. Include only non-terminal states if the scope decision says so. detailLink `/inquilino/aplicaciones/[applicationId]`. |
| **Contratos** *(candidate source)* | 🟡 | `useContracts()` real (contract status incl. `READY_TO_SIGN`); already surfaced in portal. | — | **Optional (Risk R1).** A contract pending tenant signature is an open case, but pre-lease-activation. |
| **Leases** *(container, not a case)* | 🟢 | `useLeases().getActive()` → `/leases`; status `ACTIVE`/`ENDING_SOON`/`ENDED`/`TERMINATED` (`leases.types.ts:12`). | — | **Not a case.** The lease is the container the cases belong to; `ENDING_SOON` has no tenant renewal flow. Use as context/filter, not a case row. |

**Bottom line:** 1 of 4 named case types (**pagos**) is real and already composed elsewhere in the portal. PQRS + mantenimiento collapse into one forward-ref (v7-06, PQRS engine). Acuerdos is a separate forward-ref (v7-07, cross-repo). Applications + contracts are real *bonus* sources but pre-firma (scope decision). The ROADMAP's "composición de servicios existentes" is accurate **for pagos (+apps/contracts)**; it **overstates** PQRS/mantenimiento/acuerdos, which have no tenant service to compose — those are contract-first "Próximamente".

## Unified Case View-Model (CASO-01)

**Aggregation pattern already established in-repo:** the dashboard (`page.tsx:104-113`) and pagos page (`pagos/page.tsx:46-58`) both compose multiple tenant hooks in one client component, gate on a combined loading state, and render via the Cadence empty-state ladder. v7-03's hub is the same pattern, one level up: a `useTenantCases()` hook that fans out to the source hooks and merges their rows into a normalized list.

**Recommended shape (read-only projection — no second source of truth):**

```ts
type CaseType = 'pago' | 'pqrs' | 'mantenimiento' | 'acuerdo' | 'aplicacion' | 'contrato';
type CaseTone = 'neutral' | 'info' | 'attention'; // NO 'danger'/'alarm' — PITFALLS 8

interface TenantCase {
  id: string;              // source row id (opaque UUID) — never a guessable sequence
  type: CaseType;
  titulo: string;          // e.g. "Pago de julio", "Contrato pendiente de firma"
  estadoLabel: string;     // read from the source's own status enum — NOT recomputed
  tone: CaseTone;          // mapped neutrally from source status (see guardrail)
  responsable: string;     // role, e.g. "Inmobiliaria" — NOT an internal name/ID
  updatedAt: string;       // source updatedAt/validatedAt — real timestamp only
  detailLink: string;      // route to the existing detail page
}
```

**Rules the planner must encode:**
- Each `estadoLabel`/`tone` is **derived from the source service's status field** (`TenantPaymentRequestStatus`, `TenantApplicationStatus`, contract status) via a pure mapper — the hub must never compute a saldo, an SLA, or a synthetic status (PITFALLS 9; PAGO-01 single-source discipline carried from v7-01).
- Forward-ref types (`pqrs`/`mantenimiento`/`acuerdo`) contribute **no rows** — they render as a dedicated "Próximamente" section, not empty `TenantCase[]` entries that look like real-but-empty cases.
- `useTenantCases()` returns `{ cases, isLoading, error }` and degrades per-source with the `403/404 → []` pattern (`leases.service.ts:114-125`) so one unavailable source never blanks the whole hub.

## Timeline / State-History (CASO-02)

**A reusable timeline component exists — but no real per-case event history does.**

- **Reusable component:** `PlanActivityTimeline` + `TimelineItem { id, title, description?, timestamp, icon?, iconColor?, iconBg? }` (`ui/plan/PlanActivityTimeline.tsx:6-19`) — the best generic fit for a case timeline. (`ApplicationTimeline` is tenant-styled but hard-typed to `ApplicationEvent` and only handles application event types.)
- **Caveat 1 — the events don't exist.** `TenantApplicationView` (what the real tenant hooks return) has **no `events` array** — only `status` + `submittedAt`/`updatedAt` (`applications.service.ts:27-42`). Payment requests expose `createdAt`, `updatedAt`, `validatedAt`, `status` only (`tenant-payment-requests.types.ts:23-47`). There is no backend endpoint returning a per-case state history.
- **Caveat 2 — don't copy the legacy synthesis.** `ApplicationTimeline` renders `ApplicationEvent[]` fed by client-synthesized events (`ApplicationDetail.tsx:263`), and `ApplicationDetail` is **not rendered on any real `/inquilino` page** (grep: 0 usages in `src/app/inquilino`). That client-invents a multi-step "created → submitted → under_review → …" history the backend never recorded. **Do not propagate that pattern to a real-tenant path** — it fabricates timestamps and intermediate states.
- **Honest minimal approach:** build each case's timeline from **only the timestamps the source actually provides** — e.g. a payment: `createdAt` ("Solicitud enviada") → `validatedAt` ("Validado / Rechazado" per `status`). Two-to-three real milestones, real timestamps, no invented steps. Where a source has a single timestamp, show a single-entry timeline (honest) rather than padding it. Fix `PlanActivityTimeline`'s `es-CL` locale in `formatTimestamp` (`PlanActivityTimeline.tsx:44`) and verify its `text-plan-*` tokens read correctly in the tenant portal, or wrap it in a thin tenant-styled adapter (Risk R5).

## In-App Notifications (CASO-03)

**The in-app surface is fully real and already shipped — CASO-03's in-app clause is met today for the real case types.**

- `useTenantNotifications()` → `notificationsApi.getTenantNotifications()` → `GET /notifications` (`notifications.service.ts:102`), polling every **2 min** (`useNotifications.ts:9,146`), with real `markAsRead` (`PATCH /notifications/:id/read`), `markAllAsRead` (`POST /notifications/mark-all-read`), `deleteNotification` (`DELETE /notifications/:id`), and `actionUrl` deep-link navigation (`notificaciones/page.tsx:168-175`). The `/inquilino/notificaciones` route renders it with honest loading/empty states already.
- **Templates already cover the real case types:** `PAYMENT_*` (approved/rejected/dispute/reminder/overdue), `APPLICATION_*`, `CONTRACT_*`, `LEASE_*`, `VISIT_*` (`notificaciones/page.tsx:51-80`). So "notificación in-app al cambiar el estado de un caso" **already fires** for pago/application/contract cases. **Missing:** `PQRS_*`/`MAINTENANCE_*`/`AGREEMENT_*` templates → arrive when the v7-06/v7-07 engines emit (contract-first now).
- **Push:** `usePushNotifications()` is a **real FCM web-push client hook** (`onForegroundMessage`, `requestNotificationPermission`, service-worker + `Notification` permission) (`usePushNotifications.ts:22-72`) — the *subscribe* capability exists. What's missing is a **backend emitter that fires a push on case-state change** for the new case types, plus **WhatsApp** which must route the `agent` contact gate (Ley 2300, PITFALLS 3). Both = honest "Próximamente" in v7-03.
- **Realtime:** no SSE/WebSocket; the established fallback is `useVisibilityPolling` (tab-visibility-gated poll + refetch-on-focus, `useVisibilityPolling.ts`). The notifications hook already polls; the hub can reuse `useVisibilityPolling` for its aggregate refresh. Supabase Realtime `postgres_changes` waits on tenant RLS in `agent` (ARCHITECTURE §4) — out of scope.
- **No `caseId` on notifications:** `BackendNotification` has `actionUrl` + free-form `metadata`, no case foreign key (`notifications.types.ts:19-30`). So a per-case notification *thread* is not directly supported. The hub should link **out** to each detail route via `detailLink`; do not attempt to build a per-case notification feed in v7-03 (Risk R4).

## Guardrails Constraining Implementation (concrete do/don't — success criteria, non-negotiable)

From PITFALLS 8, PITFALLS "Looks Done But Isn't" #6, PITFALLS 9, and the milestone guardrails. Each is a hard constraint on the plan and a verification step:

1. **Neutral "al día" states — no invented urgency (CASO-01/04, PITFALLS 8 + UX).**
   - DO: neutral/factual tone for on-track cases; `tone` limited to `neutral`/`info`/`attention` (no `danger`/alarm). A `DISPUTED`/`REJECTED` payment is shown factually ("Rechazado — revisar"), not alarmingly. Honest "al día"/"sin novedades" empty state.
   - DON'T: red pulsing "EN MORA" badges, countdown timers, "¡Última oportunidad!", alarm color for a not-yet-overdue item, or a fabricated case count anywhere. (Note the notifications page already uses a `Warning` icon for `PAYMENT_OVERDUE` factually — mirror that restraint.)
2. **Own-cases-only; internal agency notes excluded (CASO-02, PITFALLS "Looks Done But Isn't" #6 + Security).**
   - DO: rely on the JWT-scoped `/…/mine` endpoints (aggregation inherits tenant scoping); show `responsable` as a **role** ("Inmobiliaria"), use opaque UUIDs for `id`/`detailLink`.
   - DON'T: fetch by raw/guessable IDs; surface any agency-internal field (`SolicitudPqrs.responsableId`, internal PQRS notes, `HostNote`-equivalents). The tenant view is a strict subset of the case record.
3. **Estado/SLA trace to the source — never a second number (CASO-04, PITFALLS 9 + 6).**
   - DO: read each case's `estado` from its source service; if/when a PQRS SLA (15 días hábiles) appears, it comes from the source (v7-06's `slaVenceAt`), the hub only displays it.
   - DON'T: compute a saldo, an SLA clock, or a rolled-up status in the hub. The hub is a projection, not an engine.
4. **No fake case data on a real-tenant path (CASO-01, milestone frontend-first rule).** PQRS/mantenimiento/acuerdos render as honest "Próximamente" sections (agency-acuerdos precedent `ai/cobranza/acuerdos/page.tsx:143-265`), never mock rows a real tenant could act on.
5. **No credit-bureau copy; no "why are you late" (PITFALLS 4/5).** The hub displays payment cases — any mora state must NOT add "riesgo de reporte"/"Datacrédito" strings, and no case-detail/intake surface may ask a `motivo`/`razón de mora` field.

## Frontend-First Boundaries (per success criterion)

| Criterion | Verdict | Why |
|---|---|---|
| **CASO-01** hub aggregates pagos | **Fully doable now** | `useMyPaymentRequests` + `useLeasePaymentInfo` real, already composed |
| **CASO-01** hub aggregates apps/contratos *(if in scope)* | **Fully doable now** | `useTenantApplications` + `useContracts` real (Risk R1 scope decision) |
| **CASO-01** hub aggregates PQRS/mantenimiento | **Contract + "Próximamente"** | No tenant service (types-only); engine = v7-06 |
| **CASO-01** hub aggregates acuerdos | **Contract + "Próximamente"** | No tenant/agency persistence; hard dep = v7-07 (`agent` RLS) |
| **CASO-02** detail links | **Fully doable now** | Existing routes: `/inquilino/pagos`, `/aplicaciones/[id]`, `/contratos` |
| **CASO-02** estado timeline | **Doable now, source-derived only** | Real timestamps yes; real event history no — no synthesized steps |
| **CASO-02** own-cases-only | **Fully doable now** | Inherited from JWT-scoped `/…/mine`; exclude internal fields |
| **CASO-03** in-app notification on state change | **Fully doable now (real case types)** | `useTenantNotifications` real; PQRS/acuerdo templates = backend later |
| **CASO-03** push / WhatsApp on state change | **Contract + "Próximamente"** | FCM client hook exists; no case-change emitter; WhatsApp needs `agent` gate |

**NO fake data on any path a real tenant can reach.** Forward-ref case types get honest "Próximamente" sections (same discipline as v7-02 paz y salvo / v7-01 sessions / agency acuerdos).

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Fetch payment/lease/app/contract cases | New per-source fetch in the hub | `useMyPaymentRequests`, `useLeasePaymentInfo`, `useTenantApplications`, `useContracts` | Already real, mapped, error-handled, composed elsewhere |
| Case aggregation | A backend "cases" endpoint / a cached case store | Client `useTenantCases()` composing existing hooks | ARCHITECTURE: "pura composición frontend, sin backend nuevo" |
| Case estado | Recompute status/saldo/SLA in the hub | Read the source status enum via a pure mapper | PITFALLS 9 / single-source discipline |
| Case timeline | Synthesize a multi-step history (legacy `ApplicationTimeline` path) | `PlanActivityTimeline` fed source timestamps only | No fabricated timestamps/states on a real path |
| In-app notifications | A new notification store/poller | `useTenantNotifications` (+ `/inquilino/notificaciones`) | Already real, polling, markRead/delete, `actionUrl` |
| Realtime refresh | SSE/WebSocket | `useVisibilityPolling` (tab-gated poll + refocus refetch) | Established repo fallback; RLS Realtime is out of scope |
| Empty / loading / error / "Próximamente" | Bespoke divs | `<EmptyState>` / `<ErrorState>` / `<Spinner>` (DESIGN.md §11); disabled `title="Próximamente"` buttons | Cadence canonical + agency-acuerdos precedent |
| Money/date formatting | ad-hoc `toLocaleString`, `es-CL` | `useI18n().formatCurrency` (COP) + Colombian locale | DESIGN.md §16; fix `PlanActivityTimeline` `es-CL` (`:44`) |
| Push subscription | New FCM plumbing | `usePushNotifications` (already real) — but gate emission "Próximamente" | Client capability exists; only the emitter is missing |

## Common Pitfalls (v7-03-specific)

### Pitfall 1: Fabricating PQRS/mantenimiento/acuerdo cases to make the hub "look full"
**What goes wrong:** the hub aggregates 4 types but only 1 (pagos) has data, so it's tempting to seed mock PQRS/acuerdo rows. **Why:** an empty-looking hub feels broken. **Avoid:** honest "Próximamente" section for the forward-ref types; real rows only from real sources. **Warning sign:** any hardcoded/`MOCK` case array, or a case count that doesn't derive from a real source hook.

### Pitfall 2: Synthesizing a case timeline the backend never recorded
**What goes wrong:** feeding `PlanActivityTimeline` invented "created → reviewed → approved" steps with made-up timestamps (as legacy `ApplicationTimeline` does). **Avoid:** timeline entries only from real source fields (`createdAt`, `validatedAt`, `updatedAt` + current `status`). **Warning sign:** timeline items with timestamps not present on the source row.

### Pitfall 3: Leaking agency-internal fields into the tenant view
**What goes wrong:** mapping `SolicitudPqrs.responsableId`/internal notes, or linking by a guessable sequential id, into the tenant case card. **Avoid:** show `responsable` as a role; use opaque UUIDs; strict subset of the record. **Warning sign:** an internal ID or a `HostNote`-style field on a tenant surface (IDOR / purpose-limitation).

### Pitfall 4: Alarmist mora framing sneaking into the hub
**What goes wrong:** a `DISPUTED`/`REJECTED`/overdue payment case rendered with red pulsing badges, urgency copy, or a "riesgo de reporte" string. **Avoid:** neutral factual tone (`attention` max), no credit-bureau copy, no countdowns. **Warning sign:** `danger`/alarm tone in the case mapper; "Datacrédito"/"última oportunidad" strings.

### Pitfall 5: Claiming push/WhatsApp works because the client hook exists
**What goes wrong:** wiring `usePushNotifications` and calling CASO-03's proactive channel "done" — but nothing emits a push on case-state change, and WhatsApp isn't gated. **Avoid:** in-app = real; push/WhatsApp = honest "Próximamente" until the backend emitter + `agent` gate exist. **Warning sign:** a "push activado" toast with no server-side emitter behind it.

### Pitfall 6: Per-component polling stampede
**What goes wrong:** the hub, the notifications bell, and each detail view each poll independently (PITFALLS Performance). **Avoid:** one shared aggregate refresh via `useVisibilityPolling`; reuse the notifications hook's poll rather than adding a second. **Warning sign:** multiple intervals hitting the same endpoints per tenant session.

## Runtime State Inventory (additive UI phase)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None new — cases are a client-side projection of existing backend records; no datastore key introduced | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | Reuses `NEXT_PUBLIC_BACKEND_URL` (already set); FCM push config already present for `usePushNotifications`. No new secret | None |
| Build artifacts | None — additive components/hook; no rename or deletion planned | None |

**Nothing found in any category** — verified: v7-03 is additive frontend composition over existing tenant-scoped services; it stores no new client-side state and introduces no backend.

## Risks / Unknowns (planner must resolve)

| # | Risk / unknown | Recommended approach |
|---|---|---|
| **R1** | Scope of "casos": include pre-firma sources (applications `needs_info`/`under_review`, contracts `READY_TO_SIGN`) or only post-firma (pagos)? Milestone is post-firma, but those are real, actionable, tenant-operable | **Include actionable non-terminal apps/contracts as cases**, clearly typed — they are real and the tenant must act on them. Make it an explicit discuss-phase decision; default to including them since they're the only *other* real source and excluding them leaves a near-empty hub |
| **R2** | Temptation to render a rich synthesized timeline (legacy `ApplicationTimeline`) | Timeline from **source timestamps only**; single-entry timeline where the source has one timestamp. Do not reuse the client-synthesis path |
| **R3** | How to present PQRS/mantenimiento/acuerdos without looking broken | Honest "Próximamente" section (agency-acuerdos precedent, `ai/cobranza/acuerdos/page.tsx`), not fake rows; explain the operation is coming |
| **R4** | Notifications have no `caseId` → can't build a per-case notification thread | Hub links **out** to each detail route; don't attempt per-case notification grouping in v7-03 |
| **R5** | `PlanActivityTimeline` uses `text-plan-*` (agency theme) + `es-CL` locale (`:44`) | Verify tokens render in the tenant portal or wrap in a thin tenant adapter; fix locale to Colombian; reuse the tenant-portal empty-state/card tokens (DESIGN.md) |
| **R6** | `responsable` per case — most sources give no owner name | Show a **role** ("Inmobiliaria") not a fabricated/internal name; never invent a person |
| **R7** | Which detail route for a pago case? (`/pagos` list vs a per-request detail) | Link to `/inquilino/pagos` (existing list with request rows); a per-request detail route is out of scope unless one already exists — do not invent one |

## Environment Availability

| Dependency | Required by | Available | Notes |
|---|---|---|---|
| NestJS backend (`NEXT_PUBLIC_BACKEND_URL`) | pagos/apps/contracts/notifications reads | ✓ (assumed running) | `apiClient` degrades to `[]`/error-state if down |
| Supabase auth (`tenant` JWT) | all `/…/mine` reads | ✓ | Same JWT across portal; provides own-cases scoping |
| `/notifications` emitters for PQRS/maintenance/agreement | CASO-03 in-app for new types | ✗ | **Backend gap** — templates land with v7-06/v7-07 |
| Case-change **push** emitter + WhatsApp gateway (`agent` gate) | CASO-03 proactive channel | ✗ | **Backend/cross-repo gap** — "Próximamente" |
| Tenant PQRS/maintenance service | CASO-01 PQRS rows | ✗ | **Backend gap** (v7-06) — "Próximamente" |
| Tenant acuerdos routes + RLS (`agent`) | CASO-01 acuerdo rows | ✗ | **Cross-repo gap** (v7-07) — "Próximamente" |
| New npm packages | — | N/A | **Zero** new deps — reuses existing hooks/components |

**Missing with no fallback (block full criterion):** PQRS/maintenance service (CASO-01), acuerdos routes (CASO-01), push/WhatsApp emitter (CASO-03 proactive). **Missing with fallback:** none require a workaround — all use the honest "Próximamente" pattern; in-app notification already covers CASO-03 for real case types.

## Package Legitimacy Audit

**None — v7-03 installs zero external packages.** It composes existing hooks (`useMyPaymentRequests`, `useLeasePaymentInfo`, `useTenantApplications`, `useContracts`, `useTenantNotifications`, `useVisibilityPolling`) and reuses in-repo components (`PlanActivityTimeline`, Cadence `EmptyState`/`ErrorState`/`Spinner`). No slopcheck/registry verification applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config | vitest defaults (no standalone config) |
| Run command | `pnpm test` (`vitest run`) · watch `pnpm test:watch` |
| Existing coverage | service tests in `src/lib/api/*.test.ts` (e.g. `funnel-applications.service.test.ts`) |

### Phase Requirements → Test Map
| Req | Behavior | Test type | Command | Exists? |
|-----|----------|-----------|---------|---------|
| CASO-01 | `useTenantCases()` maps real payment-request rows to `TenantCase`; PQRS/mantenimiento/acuerdo contribute **no rows** (Próximamente) | unit (mock hooks/services) | `pnpm test` | ❌ Wave 0 |
| CASO-01 | case `estadoLabel`/`tone` derived from source status; no recomputed saldo/SLA; no `MOCK`/hardcoded case array | unit + grep gate | `grep -rniE "mock|hardcoded case" src/…/casos` | ❌ Wave 0 |
| CASO-02 | timeline items only from real source timestamps; detail links resolve to existing routes; no internal IDs/notes on the tenant card | unit + manual | `pnpm test` | ❌ Wave 0 |
| CASO-03 | hub/notifications use `useTenantNotifications`; push/WhatsApp labeled "Próximamente" (disabled) | unit + grep gate | `grep -rniE "Próximamente" src/…/casos` | ❌ Wave 0 |

### Sampling
- Per task: `pnpm test` + `pnpm build` (CI does NOT run `next build` — MEMORY `project-mvp-ci-build-gap`; run locally before calling a PR mergeable).
- Phase gate: `pnpm test` green + `pnpm build` green + manual smoke of the cases hub as a `tenant` (pago cases real; PQRS/mantenimiento/acuerdo "Próximamente"; timeline shows only real timestamps; each case links to its detail; no alarmist/mora dark-pattern; no "Datacrédito" string).

### Wave 0 Gaps
- [ ] No component/page tests for the new cases hub — add a smoke test asserting `useTenantCases()` produces rows only from real sources and that forward-ref types render "Próximamente" (no rows).
- [ ] Grep gate: no `MOCK`/hardcoded case array; no `danger`/alarm tone or "Datacrédito"/"motivo de mora"/"última oportunidad" strings on the hub; no internal `responsableId` on the tenant card; timeline items trace to source timestamps.

## Security Domain

### Applicable ASVS categories
| ASVS | Applies | Control |
|------|---------|---------|
| V4 Access Control | **yes** | Cases aggregated from JWT-scoped `/…/mine` endpoints; tenant sees only own cases; opaque UUIDs, no raw-ID fetch; internal agency fields (`responsableId`, notes) excluded → **the core own-cases-only/IDOR control for CASO-02** |
| V5 Input Validation | yes | Case-type filter/tab values sanitized; status→tone mapper is total (no unmapped status leaks a raw enum) |
| V6 Cryptography | no (frontend) | No crypto; no signed-URL minting in this phase |
| Privacy / Habeas Data | yes | Purpose-limitation: the hub is a read projection; it surfaces no new sensitive category and no internal note; no access-log claim made from the frontend (backend concern) |

### Threat patterns for this stack
| Pattern | STRIDE | Mitigation |
|---|---|---|
| Tenant sees another tenant's / internal case data | Info disclosure | JWT-scoped `/…/mine`; opaque UUIDs; exclude internal fields (CASO-02) |
| Fabricated case / synthesized timeline presented as real | Repudiation / integrity | Real sources only; timeline from source timestamps; "Próximamente" for forward-refs |
| Dark-pattern / alarmist mora framing on a case | Consumer-law (Ley 1480/PITFALLS 8) | Neutral tone, factual copy, no credit-bureau/urgency strings |
| Fake "push activado" with no emitter | Repudiation | In-app real; push/WhatsApp honestly "Próximamente" |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The tenant `/…/mine` endpoints (`/tenant-payments/requests/mine`, `/applications/mine`, `/leases`, `/notifications`, `/contracts`) are live for `tenant` role (service methods exist + used across the portal; not runtime-verified this session) | Case-Source Reality Map | If one 404s, that source degrades to `[]` via the `403/404→[]` pattern — hub still renders, honestly emptier |
| A2 | No tenant PQRS/maintenance service or acuerdos route exists (grep: only `pqrs.types.ts`, no `pqrs.service.ts`; agency acuerdos all "Próximamente") | Case-Source Reality Map | If a tenant PQRS/acuerdo endpoint already exists, upgrade that section from "Próximamente" to real — cheap change |
| A3 | No backend per-case event-history endpoint exists (`TenantApplicationView` has no `events`; payment rows have status+timestamps only) | Timeline | If a history endpoint exists, the timeline can show real multi-step events — verify at plan time |
| A4 | In-app notification templates cover PAYMENT/APPLICATION/CONTRACT/LEASE/VISIT but not PQRS/MAINTENANCE/AGREEMENT | In-App Notifications | If PQRS/acuerdo templates already exist, CASO-03 in-app is fuller for those types — still correct |
| A5 | Including applications/contracts as "casos" is a scope choice, not a requirement (milestone is post-firma) | R1 | If the milestone means pagos-only, the hub is thinner; if it means "all operable items", apps/contracts belong in — confirm in discuss-phase |
| A6 | `usePushNotifications` (FCM) is a client subscribe capability with no server-side case-change emitter wired | In-App Notifications, R? | If a case-change push emitter already exists, push moves from "Próximamente" toward real — verify |

## Sources

### Primary (HIGH — in-repo code read this session)
- `src/app/inquilino/page.tsx:104-113,256` (dashboard multi-hook composition; `{/* Casos abiertos: hub llega en v7-03 — no fabricar conteo */}`)
- `src/lib/api/tenant-payment-requests.types.ts:7-47` (real open-case statuses); `src/app/inquilino/pagos/page.tsx:46-58,184` (canonical composition + `CompleteProfileFirst` gate + EmptyState ladder)
- `src/lib/api/pqrs.types.ts:1-53` (types-only, "NO hay data falsa hasta que exista el motor"; `reparacion` subtype; no service); `src/app/panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx:143-265` (agency acuerdos "Próximamente" precedent)
- `src/lib/hooks/useApplications.ts:90-136,143-199`; `src/lib/api/applications.service.ts:27-42,190-202` (`TenantApplicationView` has **no** `events`); `src/lib/types/tenant-application.ts:14-96` (status enum + `ApplicationEvent`); `src/components/tenant/ApplicationTimeline.tsx`, `ApplicationDetail.tsx:263` (client-synthesized events, unused on real pages)
- `src/components/ui/plan/PlanActivityTimeline.tsx:6-48` (generic `TimelineItem` timeline; `es-CL` at `:44`)
- `src/lib/hooks/useNotifications.ts:9,123-201` (real tenant notifications, poll 2 min); `src/lib/api/notifications.service.ts:67-133` (`/notifications` endpoints); `src/lib/api/notifications.types.ts:19-30` (no `caseId`); `src/app/inquilino/notificaciones/page.tsx:51-80,168-175` (templates + `actionUrl`)
- `src/lib/hooks/usePushNotifications.ts:22-72` (real FCM client hook, no case emitter); `src/lib/hooks/useVisibilityPolling.ts` (realtime fallback)
- `src/lib/api/leases.types.ts:12` (lease status = container); grep: no tenant maintenance service; no `pqrs.service.ts`; `ApplicationDetail` 0 usages in `src/app/inquilino`
- `docs/DESIGN.md` §11/§16; `.planning/config.json` (`safety.always_confirm_destructive=true`; nyquist/security keys absent → treated enabled)

### Milestone research (HIGH — synthesized, not re-derived)
- `.planning/research/portal-inquilino/{PITFALLS,GAP-ANALYSIS,ARCHITECTURE,STACK}.md` (PITFALLS 1,4,5,6,8,9 + "Looks Done But Isn't" #6 — official-norm-verified); `.planning/{ROADMAP,REQUIREMENTS}.md`; `v7-01-RESEARCH.md` + `v7-02-RESEARCH.md` (api-client/empty-state + "Próximamente" discipline)

## Metadata

**Confidence breakdown:**
- Case-source reality map: HIGH — every claim cites a read file:line or a grep-verified absence.
- Aggregation + timeline findings: HIGH — composition pattern and the "no real event history" fact read directly.
- In-app notifications real / push "Próximamente": HIGH — hooks + endpoints + FCM client read directly.
- Guardrails: HIGH — PITFALLS cross-verified against official Colombian norms; v7-03 subset is display/scoping/tone hygiene.
- Backend availability (A1–A6): MEDIUM — service methods exist and are typed; runtime behavior not verified this session.

**Research date:** 2026-07-18
**Valid until:** ~2026-08-17 (stable; revisit if backend adds tenant PQRS/acuerdos endpoints, a case event-history endpoint, or PQRS/agreement notification templates)
