# Phase v7-01: Fundación & Limpieza del Portal — Research

**Researched:** 2026-07-16
**Domain:** Post-signature tenant portal shell (Next.js 14 App Router, TypeScript, Tailwind/Cadence) — wiring real lease/payment/profile data + removing fake surfaces
**Confidence:** HIGH (data-reality map grounded directly in repo code; guardrails cross-verified in PITFALLS against official Colombian norms)

> Companion doc: `v7-01-PATTERNS.md` (pattern-mapper) covers per-file pattern assignments. This RESEARCH answers "what is real vs fake, what constrains us, and what's actually blocked." Read both.

## Summary

The `/inquilino` portal is a working post-signature funnel wired ~55-60% to the real NestJS backend (`NEXT_PUBLIC_BACKEND_URL`) via a typed `apiClient` + Supabase `tenant` JWT. v7-01 is **not** "build data plumbing" — the plumbing exists. It is **wire existing real data into the dashboard, drop the Chilean mock in profile, and un-fake config theater**, then delete dead code.

The single most important correction to the ROADMAP framing: the ROADMAP says lease/next-payment data "ya es real" (correct) but frames profile get/update and config password/sessions as external deps that "may not exist yet." **In fact the real endpoints already exist and are already wired into `useAuth()` and `settingsApi`** — `updateProfile()` → `PATCH /users/me`, `changePassword()` → `PATCH /users/me/password`, `settingsApi.requestDataExport()` → `POST /users/me/data-export`, `settingsApi.deleteAccount()` → `DELETE /users/me/account`, `settingsApi.get/updateNotificationSettings()` → `/users/me/notification-settings`. The perfil and config pages simply **ignore** them in favor of `setTimeout` theater and hardcoded Chilean data. So BASE-02 and most of BASE-03 are **fully doable now** (wire what exists), not contract+empty-state. The one genuine gap is **active sessions** (no `/users/me/sessions` endpoint) → honest empty-state / hide.

**Primary recommendation:** Treat v7-01 as a wiring + deletion phase, not a build phase. Consume the already-real hooks (`useLeases`, `useMyPayments`, `useLeasePaymentInfo`) in the dashboard; bind perfil to `useAuth().user` + `updateProfile()`; bind config actions to `authContext.changePassword` + `settingsApi.*`; add nav items; delete `TenantDashboardSidebar.tsx`. Fabricate no number the backend doesn't return — especially no "saldo/deuda" number and no cases count (cases hub is v7-03).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BASE-01 | Dashboard shows real active lease + next payment + open cases; remove hardcoded empty arrays / `TODO(Backend)` | Real via `useLeases()`/`useMyPayments()` (already used by arriendo/pagos pages). Dashboard hardcodes `activeLeases=[]`, `nextPayment=null` at `src/app/inquilino/page.tsx:97-105`. Cases: **no aggregation service exists yet** (hub = v7-03) — see Risk R1. |
| BASE-02 | Profile via real get/update API with Colombia data (cédula, +57); remove Chilean mock (RUT, +56) | Real data + mutation already exist in `useAuth()`: `user.{phone,rut,address,birthDate,emergencyContact*}` from `/users/me` + `updateProfile()` (`auth-context.tsx:449-452`). Perfil page ignores them, hardcodes Chilean `formData` (`perfil/page.tsx:46-54`) + `setTimeout(800)` save (`:107-120`). |
| BASE-03 | Config runs real actions where backend exists (or honest empty-state); remove `setTimeout` theater | Real endpoints exist for password (`auth-context.tsx:445`), data-export + account-delete + notif prefs (`settings.service.ts:75-92`). Config uses `setTimeout` theater instead (`configuracion/page.tsx:128,150,158`). Sessions = mock, no endpoint → empty-state. |
| BASE-04 | Nav exposes Notificaciones/Perfil/Configuración; delete dead `TenantDashboardSidebar.tsx` | Sidebar nav omits all three (`layout.tsx:28-37`); they ARE reachable via PlanHeader avatar dropdown (`PlanHeader.tsx:966/1016/1025`). `TenantDashboardSidebar.tsx` has zero importers (dead code confirmed). |
| PAGO-01 | Estado de cuenta (saldo + next payment) traces to `tenant-payment-requests`/lease single source of truth; no self-computed number; no dark patterns/guilt-tripping | Pagos page already traces to `paymentInfo` (`GET /leases/:id/payment-info`) + `useMyPaymentRequests` (`/tenant-payment-requests`). Dashboard must read the same source, not invent a saldo. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lease / next-payment / payment-status | API/Backend (NestJS) | Frontend hooks (`useLeases`, `useLeasePaymentInfo`) | Backend owns the authoritative period status; frontend only renders it |
| Saldo / "how much owed" | API/Backend (`tenant-payment-requests` + `payment-info`) | — | Single source of truth; frontend must never compute a second number (PAGO-01, PITFALLS 9) |
| Profile identity data (cédula, phone, address) | API/Backend (`/users/me`) | `useAuth()` context | Already the canonical store; perfil page must read/write it, not shadow it |
| Config actions (password/export/delete/notif) | API/Backend (`/users/me/*`) | `authContext` + `settingsApi` | Endpoints exist; frontend is a thin caller |
| Active sessions | — (no backend) | Frontend | No endpoint exists → honest empty-state, not fabricated devices |
| Nav / layout composition | Frontend (client) | — | Pure client config in `layout.tsx` |

## Data Reality Map for v7-01 (the core finding)

Legend: 🟢 real & wired · 🟡 real API exists but UI ignores it (fake shown) · 🔴 no backend / genuinely mock

| Surface | State | What is REAL today | What is FAKE / where (file:line) | v7-01 action |
|---|---|---|---|---|
| **Dashboard — lease** | 🟡 | `useLeases().getActive()` → `GET /leases` (used by arriendo page) | Dashboard hardcodes `activeLeases: any[] = []` — `page.tsx:101` | Consume `useLeases()`; drop the `[]` |
| **Dashboard — next payment** | 🟡 | `useMyPayments().getNextPayment()` / `useLeasePaymentInfo()` (used by pagos page) | Dashboard hardcodes `nextPayment = null`, `primaryLease = null` — `page.tsx:103-104` | Consume real hook; render fecha+monto |
| **Dashboard — applications** | 🟡 | `useApplications()` hook exists | Hardcoded `activeApplications: any[] = []` — `page.tsx:102` | Optional (not a listed criterion); wire or leave neutral |
| **Dashboard — "casos abiertos"** | 🔴 | Nothing — no case-aggregation service (hub is **v7-03**) | Implied by BASE-01 wording | **Do NOT fabricate.** Omit widget or neutral placeholder — see Risk R1 |
| **Estado de cuenta — próximo pago / status** | 🟢 | `paymentInfo.currentPeriodStatus` + `.monthlyRent` from `GET /leases/:id/payment-info` (`leases.service.ts:151`; type `leases.types.ts:64-85`) | — | Dashboard reads same `paymentInfo`; no new number |
| **Estado de cuenta — historial** | 🟢 | `useMyPaymentRequests()` → `/tenant-payment-requests` (documented "fuente única del historial") | — | Reuse as-is |
| **Perfil — identity fields** | 🟡 | `useAuth().user.{firstName,lastName,phone,rut,address,birthDate,emergencyContactName,emergencyContactPhone}` from `/users/me` (`auth-context.tsx:60-78`) | Hardcoded Chilean mock: `phone:'+56…'`, `rut:'12.345.678-9'`, `address:'Av. Providencia…'`, `emergencyContact:'…+56…'` — `perfil/page.tsx:46-54` | Bind form to `user.*`; empty when backend returns `undefined` (honest) |
| **Perfil — save** | 🟡 | `useAuth().updateProfile()` → `PATCH /users/me` (`auth-context.tsx:449-452`) | `handleSave` = `await new Promise(setTimeout 800)` — `perfil/page.tsx:107-120` | Call `updateProfile()`; toast on real success |
| **Perfil — quick stats / verify modal** | 🔴 | — | Hardcoded "12 Pagos realizados", "Departamento Providencia" (`:558-576`); modal asks "Ingreso mensual (CLP)" (`:911`) | Derive from real payments or remove; CLP→COP |
| **Perfil — delete account** | 🟡 | `settingsApi.deleteAccount()` → `DELETE /users/me/account` | `handleDeleteAccount` = `setTimeout 2000` sim — `perfil/page.tsx:202-217` | Wire real (destructive → `safety.always_confirm_destructive`) |
| **Config — password** | 🟡 | `authContext.changePassword()` → `PATCH /users/me/password` (`auth-context.tsx:445`) | `handlePasswordChange` = `setTimeout 1500` — `configuracion/page.tsx:128-143` | Wire real |
| **Config — data export** | 🟡 | `settingsApi.requestDataExport()` → `POST /users/me/data-export` | `handleDownloadData` = `setTimeout 2000` — `:150-156` | Wire real |
| **Config — delete account** | 🟡 | `settingsApi.deleteAccount()` → `DELETE /users/me/account` | `handleDeleteAccount` = `setTimeout 2000` — `:158-168` | Wire real |
| **Config — notification prefs** | 🟡 | `settingsApi.get/updateNotificationSettings()` → `/users/me/notification-settings` | Local `useState` only, no persistence — `:92-115` | Wire real (map the toggle keys) |
| **Config — active sessions** | 🔴 | Nothing — **no `/users/me/sessions` endpoint exists** | `mockSessions` (3 fake devices) — `configuracion/page.tsx:74-78` | Honest empty-state or hide; do NOT keep fake devices |
| **Config — theme / language / reset onboarding** | 🟢 | `next-themes`, `useI18n`, localStorage | — | Keep as-is (already real) |
| **Config — MFA** | 🟢 | `<MfaSetupSection />` (real component) | — | Keep as-is |
| **Layout nav** | 🟡 | Header dropdown links to perfil/config/notif (`PlanHeader.tsx:966/1016/1025`) | Sidebar `useTenantNavItems` omits them — `layout.tsx:28-37` | Add sidebar nav items (see Risk R3) |
| **`TenantDashboardSidebar.tsx`** | 🔴 | — | Zero importers (grep confirmed) | Delete |
| **Notificaciones page** | 🟢 | `useTenantNotifications` — real | — | No work; just expose in nav |

**Bottom line:** Only two things in v7-01 are genuinely "no backend" (contract+empty-state): **active sessions** and **cases aggregation** (the latter belongs to v7-03). Everything else is "real API exists, UI ignores it" → wire it.

## api-client + Honest Empty-State Pattern (canonical, cite this)

The repo's established frontend-first pattern is a **typed service method over `apiClient` that degrades to an empty/neutral value on 403/404** — never fake data. Canonical example (`src/lib/api/leases.service.ts:114-125`):

```ts
async getMine(): Promise<Lease[]> {
  try {
    const raw = await apiClient.get<BackendLease[]>('/leases');
    return raw.map(mapBackendLease);
  } catch (err) {
    // 403 = tenant calling landlord-only endpoint, 404 = endpoint not available
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return [];   // ← honest empty, NOT mock
    }
    throw err;
  }
}
```

- `apiClient` (`src/lib/api/client.ts`) is the only HTTP entry point: reads `NEXT_PUBLIC_BACKEND_URL`, injects the Supabase bearer token, wraps failures in `ApiError(status,msg)`; network failure = `ApiError(0)`.
- UI renders the empty result via the Cadence `<EmptyState>` / `<ErrorState>` primitives (DESIGN.md §11; `src/components/ui/empty-state.tsx`, `error-state.tsx`). The pagos page already models the full ladder: loading spinner → `CompleteProfileFirst` gate → `!primaryLease` EmptyState → data (`pagos/page.tsx:170-225`).
- **For v7-01's genuine gaps (sessions):** the honest empty-state is the exact same pattern — show a neutral "Función no disponible" / hide the row, never `mockSessions`.

## Single-Source-of-Truth for Saldo (PAGO-01)

There is **no "saldo/deuda total" number in the system, and that is correct.** The estado de cuenta is expressed as *(próximo pago amount + current-period status)*, both server-owned:

- `GET /leases/:leaseId/payment-info` → `{ monthlyRent, paymentDay, currentPeriod:{month,year}, currentPeriodStatus: 'NONE'|'PENDING_VALIDATION'|'APPROVED'|'REJECTED', currentPeriodRejectionReason }` (`leases.types.ts:54-85`). Read via `useLeasePaymentInfo(leaseId)`.
- History / totals: `useMyPaymentRequests()` → `/tenant-payment-requests` (documented single source of the tenant's payment history).

**Do:** dashboard reads `paymentInfo.monthlyRent` + `.currentPeriodStatus` (identical to `pagos/page.tsx:90-92`) and shows next-payment fecha+monto. **Don't:** sum, cache, or derive a separate "total owed" / "saldo vigente" figure on the dashboard — that would fork from the backend (PITFALLS 9). Note the pagos page's `totalPaid`/`pendingAmount` are year-to-date *display roll-ups* of already-authoritative request rows, not a competing balance — safe to reuse, do not extend into a "deuda" number.

**Watch-out (arriendo page precedent):** `arriendo/page.tsx:157-162` hardcodes status "Al día / Todos los pagos al día" regardless of real state. Do **not** replicate that on the dashboard — the status must reflect `currentPeriodStatus`, not a constant string (PAGO-01 + PITFALLS 8).

## Legal Guardrails Constraining v7-01 (concrete do/don't for the planner)

From PITFALLS.md (HIGH confidence, official-norm-verified) + milestone guardrails. Only the ones that touch v7-01 surfaces:

1. **No dark patterns / guilt-tripping on mora (PAGO-01, PITFALLS 8/UX).**
   - DO: neutral factual display — "Próximo pago: $X · vence el Y", low-friction pay CTA.
   - DON'T: red/pulsing "EN MORA" badge, countdown timers, "¡Última oportunidad!", pre-selected highest-fee method, or hiding cost until confirm. DON'T show alarm color for "próximo a vencer" that isn't overdue.
2. **Saldo/estado traces to the single source; never a second number (PAGO-01, PITFALLS 9).** Encoded above.
3. **No "why are you late" field anywhere (PITFALLS 5, Ley 2300/2023 art.7).** v7-01 has no mora form, but the profile/config forms must not sneak a `motivo`/`razón` field.
4. **Habeas Data on profile data (BASE-02, Ley 1581/2012).**
   - DO: purpose-scoped display; any consent checkbox is **unchecked by default** with inline purpose (PITFALLS security row). The "delete account / download my data" actions are the ARCO surface — wire them to the real endpoints (they exist), don't leave them theater.
   - DON'T: expose another tenant's data (the `/users/me` scoping already prevents IDOR here — no raw IDs in URLs).
5. **No "comprobante interno" ≠ "factura" issue in v7-01** — no receipt/PDF is generated in this phase (that's v7-02/v7-04). Just don't introduce a "factura" label. (Listed for completeness; no v7-01 action.)
6. **No credit-bureau / Datacrédito copy (PITFALLS 4).** v7-01 has no mora messaging, but any dashboard mora state must not add "riesgo de reporte" strings.

These are **success criteria, non-negotiable** — the planner should encode #1 and #2 as verification steps on the dashboard/estado-de-cuenta tasks, and #4 on the profile/config tasks.

## External Deps / Frontend-First Boundaries

| Criterion | Verdict | Why |
|---|---|---|
| BASE-01 lease + next-payment | **Fully doable now** | `useLeases`/`useMyPayments`/`useLeasePaymentInfo` are real |
| BASE-01 "casos abiertos" | **Deferred surface** | No aggregation service; hub is v7-03 → omit/neutral in v7-01 (Risk R1) |
| PAGO-01 estado de cuenta | **Fully doable now** | `payment-info` + `tenant-payment-requests` real |
| BASE-02 profile get/save | **Fully doable now** (ROADMAP's "external dep" is stale) | `useAuth().user.*` + `updateProfile()` already wired to `/users/me` |
| BASE-03 password / export / delete / notif prefs | **Fully doable now** | Endpoints exist in `authContext` + `settingsApi` |
| BASE-03 active sessions | **Contract+empty-state** (genuine gap) | No `/users/me/sessions` endpoint → honest empty-state / hide |
| BASE-04 nav + delete dead code | **Fully doable now** | Pure client change |

**Correction to ROADMAP `External deps` line:** "NestJS perfil get/update endpoint; endpoints de config (password/sesiones)" — perfil get/update, password, export, delete, and notif-prefs endpoints already exist and are wired at the service layer. Only **sessions** remains a real gap. The planner should not gate BASE-02/BASE-03 behind "backend TBD."

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Fetch lease / next payment | New fetch in the dashboard | `useLeases()`, `useMyPayments()`, `useLeasePaymentInfo()` | Already real, mapped, error-handled |
| Profile read/write | New `profileApi` service | `useAuth().user` + `updateProfile()` / `changePassword()` | Canonical store; a parallel service forks identity |
| Config actions | New settings client | `settingsApi.{requestDataExport,deleteAccount,get/updateNotificationSettings}` | Real endpoints already typed |
| Empty / loading / error UI | Bespoke divs | `<EmptyState>`, `<ErrorState>`, `<Spinner>` (DESIGN.md §11) | Cadence canonical |
| "Saldo" number | Client-side sum of payments | Read `payment-info` server fields | PITFALLS 9 / PAGO-01 |
| Money formatting | `toLocaleString` ad-hoc | `useI18n().formatCurrency` (COP) | DESIGN.md §16; consistent COP |

## Common Pitfalls (v7-01-specific)

### Pitfall 1: Fabricating a "casos abiertos" count on the dashboard
**What goes wrong:** BASE-01 lists "casos abiertos," but the case-aggregation hub is v7-03. Building a count now means inventing a number or forking a data model. **Avoid:** render lease + next-payment for real; for cases, omit the widget or show a neutral "próximamente" until v7-03. **Warning sign:** a hardcoded or client-derived case count.

### Pitfall 2: Leaving the theater half-wired
**What goes wrong:** replacing `setTimeout` with a real call but keeping the fake success toast on failure, or keeping `mockSessions` alongside a real password call. **Avoid:** each wired action must surface real `ApiError` (via `apiClient`), not an unconditional `toast.success`.

### Pitfall 3: Chilean → Colombian is more than a string swap
**What goes wrong:** swapping `+56`→`+57` but leaving RUT-format validation, "CLP" labels (`perfil:911`), `es-CL` date locale (`arriendo:36`, `pagos:95`), or Chilean placeholders. **Avoid:** cédula (not RUT) label + Colombian validation, COP, `+57`. Note the frontend field is still named `rut` in the `User` type / `updateProfile` signature — it semantically holds the cédula; relabel in UI, don't rename the contract in this phase.

### Pitfall 4: Adding nav items that duplicate the header dropdown confusingly
**What goes wrong:** perfil/config/notif are already in the PlanHeader avatar menu; adding them to the sidebar without a decision creates two nav affordances. **Avoid:** confirm the intended IA (sidebar + header both, per BASE-04 wording) — see Risk R3.

## Runtime State Inventory (cleanup phase)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys reference removed mock; profile data lives in backend `/users/me` | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None new; reuses `NEXT_PUBLIC_BACKEND_URL` (already set) | None |
| Build artifacts | `TenantDashboardSidebar.tsx` deletion is source-only; no compiled artifact | Verify no lingering import after delete (grep confirms 0 importers now) |
| Client localStorage | `plan_onboarding_tenant` (onboarding gate) + `TenantProfileContext` demo profile keys — **out of scope**, do not touch | None |

**Note:** `TenantProfileContext` (`src/lib/context/TenantProfileContext.tsx`) is a localStorage/mock construct used only for `hasArriendoPass` plan-gating in the layout — it is NOT the profile identity source (that's `useAuth()`). Leave it alone in v7-01.

## Risks / Unknowns (planner must resolve)

| # | Risk / unknown | Recommended approach |
|---|---|---|
| **R1** | BASE-01 "casos abiertos" has no data source in v7-01 (hub = v7-03) | Wire lease + next-payment for real; **omit or neutral-placeholder** the cases widget. Flag as forward-reference to v7-03. Do not fabricate. |
| **R2** | `/users/me` may not populate `rut/address/birthDate/emergencyContact*` for every tenant | Bind form to `user.*`; when a field is `undefined`, show empty input/placeholder (honest), never the old Chilean mock. Save via `updateProfile()` regardless. |
| **R3** | BASE-04 says "nav expone" — but perfil/config/notif are already in the header dropdown; is the ask the sidebar? | Add the three to the sidebar `useTenantNavItems` (that's the visible gap) AND keep header links. Confirm IA intent in discuss-phase if ambiguous. |
| **R4** | Active sessions has no backend | Honest empty-state / hide the "Sesiones activas" row; do not keep `mockSessions`. Could optionally show only the current Supabase session as read-only. |
| **R5** | Account deletion + "download my data" are destructive/PII actions | `config.json safety.always_confirm_destructive=true` → keep the type-"ELIMINAR" confirm gate, but wire to the real `settingsApi.deleteAccount()` / `requestDataExport()`. |
| **R6** | Dashboard has an onboarding gate (`isOnboardingComplete`) that short-circuits to `TenantDashboardEmpty` | Preserve that gate; wire real data only in the post-onboarding branch (mirror how arriendo/pagos gate via `useOnboardingStatus`). |

## Environment Availability

| Dependency | Required by | Available | Notes |
|---|---|---|---|
| NestJS backend (`NEXT_PUBLIC_BACKEND_URL`) | all real reads/writes | ✓ (assumed running per repo README) | Frontend degrades to `[]`/error-state if down (`apiClient` `ApiError(0)`) |
| Supabase auth (`tenant` role) | `/users/me`, JWT | ✓ | Same JWT already used across portal |
| New npm packages | — | N/A | **Zero** new dependencies — v7-01 reuses existing hooks/services |

## Package Legitimacy Audit

**None — v7-01 installs zero external packages.** It wires existing hooks/services and deletes one dead file. No slopcheck/registry verification applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config | (vitest defaults; no standalone config file) |
| Run command | `pnpm test` (`vitest run`) · watch: `pnpm test:watch` |
| Existing coverage | 3 service tests in `src/lib/api/*.test.ts` (e.g. `funnel.service.test.ts`) |

### Phase Requirements → Test Map
| Req | Behavior | Test type | Command | Exists? |
|-----|----------|-----------|---------|---------|
| BASE-01/PAGO-01 | Dashboard renders real lease + next-payment from hooks; no hardcoded `[]` | unit (hook mock) / manual | `pnpm test` | ❌ Wave 0 (add) |
| BASE-02 | `updateProfile()` called on save; no `setTimeout`; cédula/+57 rendered | unit + manual | `pnpm test` | ❌ Wave 0 |
| BASE-03 | password/export/delete call real `settingsApi`/`authContext`; sessions empty-state | unit + manual | `pnpm test` | ❌ Wave 0 |
| BASE-04 | nav includes 3 items; `TenantDashboardSidebar` import absent | grep/manual | `grep -r TenantDashboardSidebar src` → 0 | ✅ can assert |

### Sampling
- Per task: `pnpm test` + `pnpm build` (CI does NOT run `next build` — see MEMORY `project-mvp-ci-build-gap`; run it locally before calling a PR mergeable).
- Phase gate: `pnpm test` green + `pnpm build` green + manual smoke of dashboard/perfil/config as a `tenant`.

### Wave 0 Gaps
- [ ] No component/page tests for `/inquilino` pages today — this is mostly manual-verified UI wiring. Prioritize a smoke assertion that the dashboard consumes `useLeases`/`useLeasePaymentInfo` and that no `setTimeout`-only handlers remain (grep gate).
- [ ] Grep gate: `grep -rn "setTimeout" src/app/inquilino/{perfil,configuracion}/page.tsx` should return only legitimate UX delays (redirect-after-toast), not fake API calls.

## Security Domain

### Applicable ASVS categories
| ASVS | Applies | Control |
|------|---------|---------|
| V2 Authentication | yes | Password change via `PATCH /users/me/password` (backend verifies current); never handle raw creds client-side beyond the form |
| V4 Access Control | yes | All data is `/users/me`-scoped or lease-scoped by JWT; no raw IDs in URLs → IDOR N/A for v7-01 surfaces |
| V5 Input Validation | yes | Cédula format + Colombian phone (+57) on the profile form; validate before `updateProfile()` |
| V6 Cryptography | no | No crypto in v7-01 |
| Privacy / Habeas Data | yes | Data-export + account-delete are the ARCO surface — wire to real endpoints; consent checkboxes unchecked-by-default if any added |

### Threat patterns for this stack
| Pattern | STRIDE | Mitigation |
|---|---|---|
| Fake success masking a real failure (theater) | Repudiation/Info | Surface real `ApiError`; no unconditional `toast.success` |
| Showing another tenant's data | Info disclosure | Rely on `/users/me` + lease-scoped JWT; no client-side ID guessing |
| Dark-pattern mora framing | Consumer-law (Ley 1480) | Neutral factual estado de cuenta (PAGO-01) |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The NestJS `/users/me`, `/users/me/password`, `/users/me/data-export`, `/users/me/account`, `/users/me/notification-settings` endpoints are live for `tenant` role (frontend service methods exist and are used elsewhere; not runtime-verified this session) | Data Reality Map, External Deps | If a route 404s for tenants, that specific action falls back to the honest empty-state pattern (still safe, not theater) |
| A2 | `/users/me` returns Colombian profile fields for tenants (`rut` holds cédula, `phone` is `+57`) | BASE-02, R2 | If fields are empty, form shows honest empty inputs — acceptable |
| A3 | "casos abiertos" in BASE-01 is intended to be satisfied by v7-03's hub, not built in v7-01 | R1 | If cases must ship in v7-01, scope expands significantly — confirm in discuss-phase |
| A4 | BASE-04 "nav" means the sidebar (`PlanSidebar`), since header dropdown already links these | R3 | If header-only was intended, the sidebar change is unnecessary |

## Sources

### Primary (HIGH — in-repo code, this session)
- `src/app/inquilino/page.tsx:97-105` (dashboard hardcoded arrays); `arriendo/page.tsx` (real hooks); `pagos/page.tsx` (estado de cuenta via `payment-info`); `perfil/page.tsx:46-54,107-120,202-217` (Chilean mock + theater); `configuracion/page.tsx:74-78,128,150,158` (mock sessions + theater); `layout.tsx:28-37` (nav gap)
- `src/lib/hooks/useLeases.ts`; `src/lib/api/leases.service.ts` (403/404→[] pattern) + `leases.types.ts:54-85` (payment-info shape); `src/lib/api/client.ts` (apiClient)
- `src/lib/auth/auth-context.tsx:25-79,179,445,449-452` (`mapBackendUser`, `updateProfile`, `changePassword`, `/users/me`); `src/lib/api/settings.service.ts:71-142` (export/delete/notif endpoints)
- `src/components/ui/plan/PlanHeader.tsx:966,1016,1025` (header links to notif/perfil/config); grep: `TenantDashboardSidebar` 0 importers
- `docs/DESIGN.md` §1/§11/§16 (principles, state templates, money); `v7-01-PATTERNS.md` (pattern-mapper companion)

### Milestone research (HIGH — synthesized, not re-derived)
- `.planning/research/portal-inquilino/{GAP-ANALYSIS,PITFALLS}.md`; `.planning/{ROADMAP,REQUIREMENTS}.md`

## Metadata

**Confidence breakdown:**
- Data reality map: HIGH — every claim cites a read file:line this session.
- Guardrails: HIGH — PITFALLS cross-verified against official Colombian norms; v7-01 subset is display/consent hygiene.
- External-dep correction (profile/config endpoints exist): HIGH at the service layer; runtime availability = A1 (assumed).

**Research date:** 2026-07-16
**Valid until:** ~2026-08-15 (stable; revisit if backend `/users/me/*` contracts change)
