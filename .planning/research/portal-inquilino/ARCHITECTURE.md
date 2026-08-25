# Architecture Research: Tenant Portal (`/inquilino`) Integration

**Domain:** Tenant self-service portal integration with agency backend (NestJS) + AI agent microservice (Mastra) + Supabase
**Researched:** 2026-07-16
**Confidence:** HIGH — grounded in direct reads of the actual `rent/mvp` codebase (auth context, api-client, existing services, existing agent-microservice hooks, existing Wompi route), not training-data inference. The one MEDIUM-confidence area is flagged explicitly (tenant-scoped agent-service RLS, which does not exist yet and is a cross-repo backend decision).

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend (this repo, rent/mvp)                  │
│                                                                                │
│  /panel (landlord)     /panel/inmobiliaria (agency)     /inquilino (tenant)   │
│       │                        │                              │              │
│       └────────────────────────┴──────────────┬───────────────┘              │
│                                     Single Supabase Auth session              │
│                                  (role: 'tenant'|'landlord'|'agency')         │
│                                                 │                              │
│              ┌──────────────────────────────────┴───────────────────────┐    │
│              │  src/lib/api/*.service.ts  (NestJS-backed, apiClient)     │    │
│              │  src/lib/hooks/*  + generated/agent.ts (agent-backed)     │    │
│              └──────────────────────────────────┬───────────────────────┘    │
└─────────────────────────────────────────────────┼────────────────────────────┘
                                                    │  Authorization: Bearer <same JWT>
                     ┌──────────────────────────────┼──────────────────────────────┐
                     ▼                                                             ▼
     ┌───────────────────────────────┐                          ┌───────────────────────────────┐
     │ NestJS backend (back-main)     │                          │ Leasefy/agent microservice     │
     │ NEXT_PUBLIC_BACKEND_URL        │                          │ NEXT_PUBLIC_AGENT_URL           │
     │                                │                          │                                │
     │ owns: users, applications,     │                          │ owns: cobranza state machine,   │
     │ leases, contracts, documents,  │                          │ payment plans/acuerdos, payment  │
     │ tenant-payment-requests,       │                          │ links (Wompi/Bold), WhatsApp/    │
     │ messages (app chat),           │                          │ voice notifications, PQRS triage │
     │ notifications, PSE-mock        │                          │ (future), Vision/OCR             │
     └───────────────┬────────────────┘                          └───────────────┬────────────────┘
                      │                                                            │
                      └───────────────────┬────────────────────────────────────────┘
                                           ▼
                         ┌───────────────────────────────────────┐
                         │      Supabase (shared Postgres)         │
                         │  - Auth (single source of identity)     │
                         │  - `public.*` tables (NestJS domain)     │
                         │  - `agent.*` tables, exposed as `public` │
                         │    view in prod, RLS-gated               │
                         │  - Realtime (postgres_changes channels)  │
                         └───────────────────────────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              ▼                          ▼
                    Wompi / Bold (PSP)         Twilio/360dialog/Kapso (WhatsApp)
                    hosted checkout,           payment links, cobranza notices
                    server-computed
                    integrity hash
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation (evidence) |
|-----------|----------------|------------------------------------|
| `AuthProvider` (`src/lib/auth/auth-context.tsx`) | Single Supabase Auth session for ALL roles (tenant/landlord/agency); fetches `/users/me` from NestJS to resolve role + onboarding state | Already handles `role: 'tenant'`, `tenantOnboardingData`, agency membership lookup — no separate tenant auth needed |
| `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) | Role-gates `/inquilino/**` via `allowedRoles={['tenant']}`, redirects to `/inquilino` or `/panel` or `/panel/inmobiliaria` based on `user.role` | Pattern already used for landlord/agency; tenant portal reuses verbatim |
| `apiClient` (`src/lib/api/client.ts`) | Typed fetch wrapper to NestJS backend, injects `Authorization: Bearer <supabase token>` set by `AuthProvider` via `setAccessToken()` | Single token store (`_accessToken`), no per-role variant |
| `agentAuthHeaders()` (`src/lib/api/agent-auth.ts`) | Same Supabase token, reused verbatim for calls to the agent microservice (`NEXT_PUBLIC_AGENT_URL`) | Confirms: **one JWT works for both backends** — the agent microservice must add tenant-scoped RLS/routes to accept it for tenant use cases (see Gaps below) |
| `*.service.ts` per domain (`src/lib/api/leases.service.ts`, `tenant-payment-requests.service.ts`, `pse-payments.service.ts`, `messages.service.ts`, `documents.service.ts`, `notifications.service.ts`) | Domain-scoped, typed NestJS API clients; tenant already consumes several of these today | Already wired and used by `/inquilino/pagos`, `/inquilino/arriendo/[leaseId]`, `/inquilino/mensajes`, `/inquilino/documentos` |
| Agent-microservice hooks (`src/lib/hooks/cobranza/use-payments-funnel.ts`, `use-*-realtime.ts`) | Poll/realtime consumption of `agent.*` data via `paths` types generated from OpenAPI (`src/lib/api/generated/agent.ts`) | Agency-scoped only today (`/api/agency/{agencyId}/...`); this is the pattern to extend for tenant-scoped equivalents |
| Next.js Route Handler `POST /api/avaluo/wompi-session` (`src/app/api/avaluo/wompi-session/route.ts`) | Server-side computation of Wompi's SHA-256 integrity hash using `WOMPI_INTEGRITY_SECRET` (never `NEXT_PUBLIC_`), returns `{reference, amountInCents, currency, integrity, publicKey}` | **This is the canonical, only existing real-money PSP integration in the repo.** Model for rent-payment initiation |
| Supabase Realtime channel hooks (`src/lib/hooks/cobranza/use-payments-funnel-realtime.ts`, `use-stage-transitions-realtime.ts`) | Subscribe to `postgres_changes` on `agent.*` tables (exposed under `schema: 'public'` in prod), single-predicate filter, RLS enforces tenant/agency isolation | Proven pattern for near-real-time case-status; needs tenant-scoped RLS policies to extend to `/inquilino` |

## Recommended Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── leases.service.ts              # EXISTS — lease/payment-info (NestJS)
│   │   ├── tenant-payment-requests.service.ts  # EXISTS — payment history (NestJS)
│   │   ├── pse-payments.service.ts        # EXISTS (MOCK) — to be superseded/augmented
│   │   ├── tenant-wompi-payments.service.ts    # NEW — real PSE/Wompi checkout for rent
│   │   ├── messages.service.ts            # EXISTS — extend to lease-scoped conversations
│   │   ├── documents.service.ts           # EXISTS — extend with lease/contract-scoped listing
│   │   ├── notifications.service.ts       # EXISTS — reuse as-is (already role-agnostic)
│   │   ├── pqrs.types.ts                  # EXISTS (agency v6-06 contract) — REUSE, don't fork
│   │   ├── tenant-pqrs.service.ts         # NEW — tenant-scoped CRUD on the same PQRS contract
│   │   └── tenant-acuerdos.types.ts       # NEW — types-only contract mirroring cobranza's
│   │                                      #        payment-plan shape (agent-owned data)
│   ├── hooks/
│   │   ├── useLeases.ts                   # EXISTS — useLease, useMyPaymentRequests, useLeasePaymentInfo
│   │   ├── tenant/
│   │   │   ├── use-tenant-case-status.ts  # NEW — composes applications+leases+contracts
│   │   │   ├── use-tenant-pqrs.ts         # NEW — CRUD + polling, mirrors use-payments-funnel.ts
│   │   │   └── use-tenant-acuerdo-realtime.ts  # NEW (LAST) — Supabase Realtime, mirrors
│   │   │                                  #        use-payments-funnel-realtime.ts, needs
│   │   │                                  #        tenant-scoped RLS in agent repo first
│   │   └── cobranza/... (existing, agency-only — do not import tenant-side)
│   └── auth/                              # EXISTS — no changes needed for tenant auth
├── app/
│   ├── api/
│   │   └── inquilino/
│   │       └── pagos/
│   │           └── wompi-session/route.ts # NEW — server-side integrity hash for rent, modeled
│   │                                      #        1:1 on /api/avaluo/wompi-session/route.ts
│   └── inquilino/
│       ├── pagos/                         # EXISTS — deepen: real checkout, receipts, acuerdo view
│       ├── documentos/                    # EXISTS — deepen: lease-scoped, agency-shared docs
│       ├── contratos/                     # EXISTS — deepen: renewal state, e-sign status
│       ├── mensajes/                      # EXISTS — deepen: lease-scoped thread (not just application)
│       ├── casos/  (or reuse /inquilino root as hub) # NEW — "Estado de casos" aggregation
│       └── solicitudes/                   # NEW — PQRS pillar (tenant-facing)
```

### Structure Rationale

- **No new auth stack, no new app.** `/inquilino` is a role inside the existing Supabase Auth + `AuthProvider` + `ProtectedRoute` system, exactly like `/panel` (landlord) and `/panel/inmobiliaria` (agency). Building a separate tenant identity system would fork auth logic that already exists and works (`toFrontendRole`, `tenantOnboardingData`, MFA, Google OAuth).
- **Two backend targets, same token.** `apiClient` (NestJS) and `agentAuthHeaders()` (agent microservice) both consume the same `getAccessToken()` value. This means a tenant, once authenticated, is technically able to call both services — the only missing piece is agent-service-side authorization (routes + RLS) for tenant-scoped reads, which is a `Leasefy/agent` repo change, not an `mvp` one.
- **Reuse, don't fork, the PQRS contract.** `src/lib/api/pqrs.types.ts` already models the full PQRS lifecycle for the agency side (v6-06). The tenant-facing "Solicitudes/PQRS" pillar is the tenant's read/write view into the *same* entity (`solicitanteTipo: 'inquilino'`), not a parallel model. Extending it avoids the exact "two sources of truth" risk flagged in `GAP-ANALYSIS.md` §5.7 for payments/payouts.
- **`tenant-acuerdos` is contract-only until the agent repo ships tenant-scoped routes.** The existing "Acuerdos de pago" surface (`/panel/inmobiliaria/ai/cobranza/acuerdos`) already explicitly documents that persisting/approving an acuerdo has no endpoint yet even agency-side ("NO se duplica esa tabla ni ese detalle" — cross-links to the real detail page). The tenant view must do the same: types + honest empty state, not a second payment-plan engine.

## Architectural Patterns

### Pattern 1: Single-Session Multi-Role Auth (no separate tenant login)

**What:** One Supabase Auth session serves landlord, agency, and tenant roles. `AuthProvider.fetchUser()` calls `GET /users/me` on the NestJS backend, which returns a `role` field; `toFrontendRole()` maps it to `'tenant' | 'landlord' | 'agency'`. `ProtectedRoute` then gates by `allowedRoles`.

**When to use:** Always, for `/inquilino/**`. This is already the established pattern — do not introduce a tenant-specific login page, token store, or session model.

**Trade-offs:** Pro — zero new auth surface, MFA/OAuth/password-reset all inherited for free. Con — role is fetched from the backend on every session event (`INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`), so a NestJS outage degrades gracefully to `mapSupabaseUser()` fallback (defaults role based on `localhost` dev override only — in production it falls back to `'tenant'`, which is actually the safe default for this portal).

**Example (already in codebase):**
```typescript
// src/components/auth/ProtectedRoute.tsx usage for a new /inquilino page:
<ProtectedRoute allowedRoles={['tenant']}>
  <SolicitudesPage />
</ProtectedRoute>
```

### Pattern 2: Contract-First `*.types.ts` + `*.service.ts` (v6.0 pattern, reused)

**What:** Every domain gets a `X.types.ts` (backend DTO shapes + frontend view types + mappers) and an `X.service.ts` (typed `apiClient` calls). When the backend endpoint does not exist yet, the service either (a) omits the method and the UI renders an honest empty state, or (b) catches 403/404 and returns an empty collection (see `tenantPaymentRequestsApi.getMine()`).

**When to use:** For every new tenant-portal endpoint. This is not optional — it's the convention the whole `src/lib/api/` directory already follows (24+ existing `.service.ts` files).

**Trade-offs:** Pro — matches roadmap consumption pattern already proven in v6.0 (FEATURES.md/ARCHITECTURE.md → phases); backend team can implement against a stable frontend contract. Con — requires discipline to avoid inventing shapes that diverge from what the backend team eventually ships (mitigate by reusing `pqrs.types.ts` and `leases.types.ts` wherever an equivalent agency-side contract already exists).

**Example:**
```typescript
// src/lib/api/tenant-payment-requests.service.ts — EXISTING pattern to replicate
export const tenantPaymentRequestsApi = {
  async getMine(): Promise<BackendTenantPaymentRequest[]> {
    try {
      return await apiClient.get<BackendTenantPaymentRequest[]>('/tenant-payments/requests/mine');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return [];
      throw err;
    }
  },
};
```

### Pattern 3: Server-Side PSP Integrity Hash (Wompi), Never Client-Computed

**What:** A Next.js Route Handler (`runtime: 'nodejs'`) is the *only* place that reads `WOMPI_INTEGRITY_SECRET` and computes `sha256(reference + amountInCents + currency + secret)`. The client POSTs a business identifier (e.g. `submissionId`, or for rent: `leaseId` + `period`), the server look up/derives the authoritative amount, computes the hash, and returns `{reference, amountInCents, currency, integrity, publicKey}`. The client then redirects to `https://checkout.wompi.co/p/?...` — it never touches the secret or computes the hash.

**When to use:** For the "Pagos" pillar's real payment initiation (rent, and later `acuerdos` installments). This is the *only* existing real-PSP integration in the repo — build the rent-payment route as a sibling, not a rewrite, of `/api/avaluo/wompi-session`.

**Trade-offs:** Pro — secret never leaves the server, matches Wompi's own security requirement (client-side hash computation is a documented anti-pattern in Wompi's docs). Con — amount must be resolved server-side from an authoritative source (lease payment obligation, or — for `acuerdos` — the agent-owned payment plan), which means the rent-payment route needs read access to `leases`/`tenant-payment-requests` (NestJS) and, later, to the agent's `cartera_payments` plan data. Recommend the rent-payment version create a `TenantPaymentRequest` (status `PENDING_VALIDATION` or new `PENDING_CHECKOUT`) *before* redirecting, so a webhook can reconcile deterministically (mirrors what `pse-mock` already does on the "success" path).

**Example:** See `src/app/api/avaluo/wompi-session/route.ts:1-45` (full file read; do not duplicate here — copy structure, swap `submissionId`→`leaseId`+`period`, swap the fixed `5_000_000` cents for an amount resolved from the lease's payment info).

### Pattern 4: Tenant-Scoped Supabase Realtime (extends existing agency pattern — REQUIRES agent-repo work)

**What:** `postgres_changes` subscriptions on `agent.*` tables (exposed as `public` schema tables in production) filtered by a *single* predicate column, with Postgres RLS enforcing that a caller can only see rows belonging to them. Today this exists only for `cartera_payments` / stage-transition tables filtered by `plan_id`/`debtor_id`, gated by *agency* RLS.

**When to use:** For "Estado de casos" and "Acuerdos de pago" pillars, once (and only once) the agent repo adds:
1. A `tenant_id` (or equivalent) column/mapping on the relevant `agent.*` tables that RLS can filter on.
2. An RLS policy allowing `auth.uid() = tenant_user_id` reads (parallel to the existing agency-scoped policy).

**Trade-offs:** Pro — sub-second case-status/payment updates without polling, proven pattern (`isConnected` boolean, clean `removeChannel` teardown). Con — **this is the one MEDIUM-confidence gap in this research**: no tenant-scoped RLS policy or tenant-facing agent-service route exists today. Until it ships, the tenant portal must fall back to polling NestJS endpoints (`tenant-payment-requests.service.ts`, extended lease/case endpoints) — do NOT block the frontend milestone on this; ship polling first, upgrade to Realtime when the agent repo lands tenant RLS.

**Example (pattern to mirror once RLS exists):**
```typescript
// Mirrors src/lib/hooks/cobranza/use-payments-funnel-realtime.ts
const channel = supabase
  .channel('agent:cartera_payments:tenant')
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'cartera_payments',
    filter: `tenant_user_id=eq.${userId}`,  // NEW predicate — requires RLS + column
  }, (payload) => onUpdate(mapRow(payload.new)))
  .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))
```

## Data Flow

### Tenant Auth Flow (no changes required)

```
Tenant opens /inquilino/pagos
    ↓
ProtectedRoute checks useAuth() → isLoading? → spinner
    ↓
Supabase onAuthStateChange (INITIAL_SESSION) → AuthProvider.fetchUser()
    ↓
GET /users/me (NestJS, Bearer <supabase JWT>) → { role: 'TENANT', ... }
    ↓
toFrontendRole('TENANT') → 'tenant' → ProtectedRoute allowedRoles=['tenant'] passes
    ↓
Page renders; every subsequent apiClient/agentAuthHeaders() call reuses the same token
```

### Payment Initiation Flow (Pagos pillar, real PSP — NEW)

```
Tenant clicks "Pagar arriendo" in PayRentModal (or successor)
    ↓
POST /api/inquilino/pagos/wompi-session { leaseId, period }   (NEW Next.js route, server-only)
    ↓
Route Handler: apiClient.get(`/leases/${leaseId}/payment-info`) [reuse existing NestJS endpoint]
    → resolve amountInCents, reference = `rent-${leaseId}-${period}`
    → createHash('sha256').update(reference+amountInCents+currency+secret)   [WOMPI_INTEGRITY_SECRET, server-only]
    → (recommended) apiClient.post('/tenant-payments/requests', { leaseId, period, reference, status: 'PENDING_CHECKOUT' })
    ↓
Client redirects to checkout.wompi.co/p/?...&signature:integrity=<hash>&redirect-url=/inquilino/pagos/estado/<reference>
    ↓
Wompi webhook → NestJS backend (existing pattern from avalúo, needs a rent-specific webhook handler)
    → updates TenantPaymentRequest status → PAID/FAILED
    ↓
Tenant lands on /inquilino/pagos/estado/<reference> → polls tenantPaymentRequestsApi.getMine() (or Realtime once available)
```

### Case-Status Flow (Estado de casos pillar — pure composition, no new backend)

```
/inquilino (hub) or /inquilino/casos
    ↓ (parallel fetch, all EXISTING NestJS endpoints)
applicationsApi.getMineForDisplay()  +  leasesApi.getMine()  +  contractsApi.getMine()
    ↓
use-tenant-case-status.ts composes: application.status → lease.status → contract.status
    into a single timeline/stepper per property (postulación → contrato → arriendo activo)
    ↓
Renders as the tenant-portal home/hub — other pillars (Pagos, Documentos, Mensajes,
Solicitudes) link OUT from each case, not the reverse
```

### PQRS / Solicitudes Flow (contract-first, backend NET-NEW)

```
Tenant creates a solicitud → tenantPqrsApi.create(dto)  [NEW service, same shape as pqrs.types.ts]
    ↓
POST /pqrs (NestJS or agent — TBD by backend team, M1/M4 per GAP-ANALYSIS)
    → 501/404 today → UI shows honest "Próximamente" / queues locally is NOT acceptable
      (no fake data per project convention) — ship the CREATE FORM disabled with a
      clear "en construcción" state, OR wire to a real NestJS CRUD stub if the backend
      team ships a bare create+list endpoint ahead of the AI-triage engine (recommended
      — the triage/SLA/assignment automation can lag the CRUD by a milestone)
    ↓
Tenant list view: GET /pqrs/mine — same estado machine as agency (`recibida → asignada →
  en_proceso → resuelta → cerrada`), tenant sees own solicitudes only
```

### Acuerdos de pago Flow (LAST — hard cross-repo dependency)

```
Tenant views /inquilino/pagos/acuerdo
    ↓
tenant-acuerdos.service.ts → GET /api/tenant/{leaseId}/cobranza/plan  [DOES NOT EXIST]
    ↓ (today)
404/hook returns null → EmptyState: "No tienes un acuerdo de pago activo" (correct honest
  state if true) — but if the tenant DOES have an active plan on the agency side
  (agent.payment_plans), the tenant portal has no way to know until the agent repo ships
  a tenant-scoped read route + RLS. This pillar cannot show REAL data until that ships.
    ↓ (once agent repo ships tenant route)
Same Supabase Realtime pattern as usePaymentsFunnelRealtime, filtered by tenant_user_id
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (MVP, few hundred tenants) | Polling (30s interval, tab-visibility-gated via `useVisibilityPolling`) is sufficient for all pillars except payment-checkout status, which should poll faster (2-5s) for a short window right after redirect back from Wompi |
| Thousands of tenants | Supabase Realtime channels scale per-connection; the single-predicate-filter constraint (`postgres_changes` supports one filter) already forces RLS to do isolation — this is the correct long-term shape, just needs the tenant RLS policies added |
| Tens of thousands+ | At this point PQRS/case-status volume likely needs server-side aggregation endpoints (dashboard-style summaries) rather than raw list+filter client-side, same evolution already visible in the agency cobranza pagination (`cursor`-based, KPI snapshot returned alongside rows) |

### Scaling Priorities

1. **First bottleneck:** Polling multiple pillars simultaneously (pagos + casos + solicitudes + acuerdo) on the same page — mitigate by staggering poll intervals and reusing `useVisibilityPolling`'s tab-hidden gate (already exists, reuse it).
2. **Second bottleneck:** N+1 composition in "Estado de casos" (fetching lease+contract+application per case client-side) — if the tenant has many historical applications, add a single NestJS aggregation endpoint rather than fanning out client-side fetches.

## Anti-Patterns

### Anti-Pattern 1: Building a Separate Tenant Auth/Session System

**What people do:** Assume a customer-facing portal needs its own lighter-weight auth (e.g., magic-link-only, separate JWT issuer) because "tenants aren't agency staff."
**Why it's wrong:** The codebase already has one Supabase Auth system covering all three roles, with role resolution, MFA, OAuth, and onboarding fully built. A separate system would duplicate `AuthProvider`, break the single-token assumption that `agentAuthHeaders()` relies on, and diverge from `ProtectedRoute`'s role-redirect logic.
**Instead:** Add `allowedRoles={['tenant']}` gates and reuse everything else.

### Anti-Pattern 2: Computing the Wompi Integrity Hash Client-Side, or Trusting a Client-Supplied Amount

**What people do:** For speed, compute the amount and/or hash in the browser, or accept an `amountInCents` from the client in the session-creation request.
**Why it's wrong:** Leaks `WOMPI_INTEGRITY_SECRET` (never `NEXT_PUBLIC_`) and allows a tenant to pay less than owed by tampering with the request. The existing avalúo route explicitly guards against this (comment: "integrity comes from server — never computed here").
**Instead:** Route Handler resolves the amount server-side from the authoritative NestJS lease/payment-request record, computes the hash server-side, returns only the derived values.

### Anti-Pattern 3: Forking the PQRS or Payment-Plan Data Model for the Tenant Side

**What people do:** Define a new `TenantSolicitud` type or a new `AcuerdoTenantView` model independent of the agency-side contracts, because "the tenant sees it differently."
**Why it's wrong:** `GAP-ANALYSIS.md` explicitly flags this exact risk for D3/D4 ("Decide schema ownership early to avoid drift between the autopilot's `Payment`/`Payout` and the ERP's ledger"). Two sources of truth for the same PQRS ticket or payment plan is how state drifts (agency marks resolved, tenant portal still shows "en proceso").
**Instead:** Same entity, different view/permissions. Tenant service methods hit tenant-scoped endpoints (`/pqrs/mine`, future `/api/tenant/{leaseId}/cobranza/plan`) that return the *same* underlying row, filtered by RLS/ownership, not a parallel model.

### Anti-Pattern 4: Faking Data for Pillars Whose Backend Doesn't Exist Yet

**What people do:** Ship a plausible-looking "acuerdo de pago" card with mock numbers so the UI "looks done," planning to wire it up later.
**Why it's wrong:** Explicitly against this project's convention — the existing `/panel/inmobiliaria/ai/cobranza/acuerdos` page's own code comments state persistence "no tiene endpoint aún → placeholders honestos 'Próximamente' deshabilitados." Memory notes elsewhere in this repo reinforce: no fake data, honest empty states.
**Instead:** Ship the UI shell + typed contract + a real, disabled/empty state, exactly like the agency `acuerdos` page already does.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | Single session, `onAuthStateChange`, token pushed into both `apiClient` and `agentAuthHeaders()` via `setAccessToken()` | No changes needed for tenant role |
| Wompi (PSP) | Server-side integrity-hash Route Handler → browser redirect to hosted checkout → webhook reconciliation | Model: `src/app/api/avaluo/wompi-session/route.ts`. Rent-payment version needs its own webhook handler distinct from avalúo's (different reference prefix, different downstream entity: `TenantPaymentRequest` not avalúo submission) |
| Bold (PSP, agent-side) | Used today only inside agent-microservice cobranza payment links (`use-payments-funnel.ts` `provider` filter: `wompi,bold`) | Not directly integrated by `mvp` for tenant-initiated payments today; relevant only once "Acuerdos de pago" tenant view exists and needs to surface which provider generated a given cuota's link |
| Supabase Realtime | `postgres_changes` channel, single-predicate filter, RLS-enforced isolation | Proven agency-side; needs new tenant-scoped RLS + predicate column before reuse for `/inquilino` |
| NestJS backend (`NEXT_PUBLIC_BACKEND_URL`) | `apiClient` typed fetch, `Authorization: Bearer` | Owns tenant profile, applications, leases, contracts, documents, tenant-payment-requests, messages, notifications, PSE-mock |
| Leasefy/agent microservice (`NEXT_PUBLIC_AGENT_URL`) | `agentAuthHeaders()` + generated OpenAPI `paths` types (`src/lib/api/generated/agent.ts`) | Today exposes only agency-scoped routes (`/api/agency/{agencyId}/...`); tenant-scoped routes are a **new agent-repo requirement**, not yet built |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `/inquilino/**` ↔ NestJS backend | REST via `apiClient`, per-domain `*.service.ts` | Existing, real, low-risk to extend (documents, leases, messages, notifications already wired) |
| `/inquilino/**` ↔ Agent microservice | REST via `agentAuthHeaders()` + generated types (once tenant routes exist); Realtime channel (once RLS exists) | Net-new integration surface; gate "Acuerdos de pago" and any AI-triage-dependent PQRS features behind this landing |
| `/inquilino/**` ↔ `/panel/inmobiliaria` (agency UI) | No direct communication — both consume the *same* backend entities (leases, PQRS, payment plans) independently, each with its own view/permission scope | This is the mechanism that prevents duplication: shared backend truth, separate frontend surfaces |
| Tenant portal ↔ Wompi webhook | Indirect, via NestJS webhook handler updating `TenantPaymentRequest`, tenant portal polls/subscribes to the updated record | Do not have the tenant portal poll Wompi directly; the webhook-to-DB-to-portal chain is the existing, correct pattern (mirrors avalúo's `/avaluo/estado/[submissionId]` page) |

## Sources

- Direct reads of `rent/mvp` source (HIGH confidence, this session):
  - `src/lib/auth/auth-context.tsx`, `src/lib/auth/types.ts` — single-session multi-role auth
  - `src/components/auth/ProtectedRoute.tsx` — role gating pattern
  - `src/lib/api/client.ts`, `src/lib/api/agent-auth.ts` — dual-backend, single-token pattern
  - `src/app/api/avaluo/wompi-session/route.ts`, `src/components/avaluo/WompiPayButton.tsx` — the only real PSP integration in the repo, model for rent payments
  - `src/lib/api/tenant-payment-requests.service.ts`, `src/lib/api/pse-payments.service.ts`, `src/components/tenant/PayRentModal.tsx` — confirms today's rent-payment flow is PSE-mock only, no real PSP
  - `src/lib/api/pqrs.types.ts` — existing agency-side (v6-06) PQRS contract to reuse
  - `src/lib/hooks/cobranza/use-payments-funnel.ts`, `use-payments-funnel-realtime.ts` — agent-microservice polling + Realtime pattern to extend for tenant scope
  - `src/app/panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx` — existing "acuerdo de pago" surface, explicitly documents no-fake-data / cross-link-don't-duplicate convention
  - `src/lib/api/leases.service.ts`, `src/app/inquilino/arriendo/[leaseId]/page.tsx` — existing lease-detail composition to extend for "Estado de casos"
- `.planning/research/ERP-VISION/GAP-ANALYSIS.md` — D15 (Portal) status ("MOSTLY-MISSING", gated on M1-M5 backend data), D3/D4 schema-ownership risk, six-milestone program context
- `.planning/PROJECT.md` — v6.0 frontend-first/additive convention, Colombia/COP context

---
*Architecture research for: Tenant Portal (`/inquilino`) integration*
*Researched: 2026-07-16*
