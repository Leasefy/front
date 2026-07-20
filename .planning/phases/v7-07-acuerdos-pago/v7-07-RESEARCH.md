# Phase v7-07: Acuerdos de Pago (LAST) — Research

**Researched:** 2026-07-19
**Domain:** Tenant-facing payment-agreement (acuerdo de pago) UI over the `Leasefy/agent` cartera/payment-plans engine; contract-first (cross-repo tenant RLS routes absent)
**Confidence:** HIGH (in-repo idioms + the agent's payment-plan OpenAPI schema are already in this tree; the only unknowns are the *tenant-scoped* route shapes, which are provisional by design)

## Summary

v7-07 is the mirror image of v7-06: a thin, honest tenant surface over an engine that lives in another repo. The difference is that the engine here is **already integrated on the agency side** — `src/lib/hooks/cobranza/use-payment-plan-approval.ts` talks to the agent's `cartera/payment-plans/*` routes today, and the OpenAPI types (`src/lib/api/generated/agent.ts`) already declare `CarteraPaymentPlanDetailResponse` (with `installments[]`, `paymentUrl`, `totalDueCop`, `status`, `acceptedAt`) and a `CarteraPaymentPlanAcceptResponse`. So the "single record" the tenant view must trace to already exists and has a stable shape. What does **not** exist is any **tenant-scoped, RLS** route: every current route is `/api/agency/{agencyId}/...` (operator surface — a tenant calling it is an IDOR). That gap is the whole reason this phase is contract-first and last. [VERIFIED: codebase grep — `src/lib/api/generated/agent.ts:3744`, `:2364`, `:2451`]

The prescriptive path: ship a real UI shell (`/inquilino/acuerdos` list + `/inquilino/casos/[caseId]` acuerdo detail fold) plus a **types-only `tenant-acuerdos.types.ts`** (re-exporting the agent's generated `CarteraPaymentPlan*` shapes — do NOT re-declare them) and a **tolerant `tenant-acuerdos.service.ts`** modeled 1:1 on `agent-contact.service.ts` / `pqrs.service.ts`: every call routes through `apiClient` (→ `NEXT_PUBLIC_BACKEND_URL`, the BFF, which forwards to the agent — the v7-05 convention, NOT the agency's direct `NEXT_PUBLIC_AGENT_URL` bearer path), degrades on `isEndpointUnavailable` (404/403/0) to `[]` / an `AcuerdoUnavailableError`, and never fabricates an acuerdo or a cuota row on a real-tenant path. Accept reuses the shipped `SignaturePad` + a **generalized** `OTPVerification`. Pay-cuota reuses the v7-04 Wompi rail invariants but takes the `paymentUrl`/amount from the agent's plan record — never a client amount. Request-a-plan **proposes** intent only; it never sets terms, never asks "por qué la mora", never mentions centrales de riesgo.

**Primary recommendation:** Build the four surfaces (view/accept/pay/request) as an additive tenant fork of the *shape* the agency already consumes, wired through the BFF, with every real-data path gated behind `isEndpointUnavailable`. Reuse — never fork — `SignaturePad`, `OTPVerification` (generalized via an injected OTP adapter), the v7-04 Wompi server-route pattern, the `tenant-case.ts` fold, and the `ProximamenteSection` seam already sitting in the casos hub for "Acuerdos de pago". Zero new npm packages.

---

## Phase Constraints (from ROADMAP guardrails + CLAUDE.md)

> No `CONTEXT.md` exists for this phase (not yet run through discuss-phase). The binding constraints are the ROADMAP v7-07 success criteria + the milestone "Guardrails legales Colombia" block + `CLAUDE.md`. Treat these with locked-decision authority.

### Locked (non-negotiable)
- **No second saldo engine** — the acuerdo view traces to the agent's single `CarteraPaymentPlanDetailResponse` record; saldo/cuota amounts are read from `installments[]` + `totalDueCop`, never recomputed (PITFALLS 9, ACUE-01). [CITED: ROADMAP:148]
- **Never auto-approve / never set terms** — the tenant only *accepts* an already-agency-approved acuerdo and *proposes* a pre-mora plan. Anything outside the policy matrix routes through the agent's `requiresHumanReview()` gate (T-323/2024 + SIC Circular 001/2025). [CITED: ROADMAP:149]
- **Same Wompi rail** — cuota payment reuses the v7-04 server-resolved-amount + integrity pattern; the `paymentUrl`/amount come from the agent's `cartera/payment-plans`. No premature "pagado" (status flips only via webhook). [CITED: ROADMAP:150]
- **Request proposes, does not set** — the pre-mora form feeds the agency approval pipeline; **no field asks "por qué" la mora** (Ley 2300/2023 art. 7); **no mention of centrales de riesgo** without the 3-party gate (Ley 1266/2008 + 2157/2021). [CITED: ROADMAP:151]
- **NO fake data on a real-tenant path** — until the agent exposes tenant RLS routes, list → `[]`, mutations → honest "Próximamente" (DESIGN §11). [CITED: ROADMAP:152]

### From CLAUDE.md / MEMORY
- **Additive-only** — build on top; never rewrite the agency cobranza/payment-plan surfaces. The tenant service is a new file; the agency's `use-payment-plan-approval.ts` is untouched.
- **es-CO neutral copy**, **buttons sentence case** (DESIGN §4 — "sentence case reverses the old uppercase rule"). [CITED: docs/DESIGN.md:147,164]
- **Zero new npm packages** — `react-signature-canvas@^1.1.0-alpha.2` is already a dependency. [VERIFIED: codebase grep — `package.json:84`]
- **UI work → read DESIGN.md first** (§11 EmptyState/Próximamente, §17 Dialog, signature/OTP patterns).

### Deferred (OUT OF SCOPE — do not build)
- The agent's tenant RLS routes, the policy matrix / `requiresHumanReview` implementation, the Wompi productive webhook, real cuota settlement, PDF acuerdo generation — all backend/`Leasefy/agent`, disclosed as "Próximamente".

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACUE-01 | Tenant sees agency-APPROVED acuerdos with the cuota plan (fechas, montos, estado), tracing to the agent's single record | `tenant-acuerdos.service.ts.listMine()` → agent `CarteraPaymentPlanDetailResponse[]`; view reads `installments[]`/`totalDueCop` verbatim; folds into `useTenantCases` like v7-06 PQRS |
| ACUE-02 | Tenant explicitly accepts (sign, reusing `SignaturePad` + generalized `OTPVerification`); never auto-approves/sets terms; non-policy → agent `requiresHumanReview()` | Reuse `SignatureForm` composition (`SignaturePad`+`OTPVerification`+`onSign({otpVerificationToken, signatureData})`) → `acuerdosApi.accept(planId, {signatureData, otpVerificationToken})` |
| ACUE-03 | Tenant pays a cuota on the SAME Wompi rail (agent `cartera/payment-plans` → `paymentUrl`) | Reuse v7-04 server-route invariants; amount/`paymentUrl` server-resolved from the agent plan; no client amount; no premature success |
| ACUE-04 | Tenant requests a pre-mora payment plan feeding the agency approval pipeline (proposes, not sets) | Minimal `SolicitarPlanModal` → `acuerdosApi.requestPlan({leaseId})`; no "por qué"; no bureau copy; degrades to "Próximamente" |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Acuerdo/cuota records, saldo, policy matrix, `requiresHumanReview`, Wompi link generation | `Leasefy/agent` microservice (cartera/payment-plans) | — | The agent OWNS the single record + the legal gates. The frontend must never recompute saldo or self-decide policy (PITFALLS 9 / 2). |
| Tenant identity / RLS scoping of acuerdos to the caller | NestJS BFF (`NEXT_PUBLIC_BACKEND_URL`) forwarding JWT → agent | — | Same trust boundary as v7-05 `agent-contact` + v7-04 payment-info: the BFF forwards the tenant's Supabase JWT; the agent enforces RLS. Tenant never hits `agency/{agencyId}` routes (IDOR). |
| Wompi hosted-checkout initiation (integrity hash, server-resolved amount) | Frontend server route (`app/api/inquilino/.../route.ts`, `runtime='nodejs'`) | agent (`paymentUrl`) | v7-04 invariant: the integrity secret is server-only; amount resolved server-side. For acuerdos, the amount + link originate in the agent's plan record; the route forwards, never trusts a client amount. |
| Accept-with-signature capture (canvas PNG + OTP token) | Browser (`SignaturePad`/`OTPVerification`) → agent accept route | — | The UI captures signature + OTP; the agent persists + performs the offered→active transition (never the client). |
| List/detail render, timeline, "Próximamente" degrade, es-CO copy | Browser (`/inquilino/acuerdos`, `casos/[caseId]`) | — | Pure presentation over normalized agent data; no business math. |

---

## The Cross-Repo Reality (the honest boundary, crisply)

### What the agent EXPOSES today (agency-scoped — tenant CANNOT use these)
Confirmed in `src/lib/api/generated/agent.ts`:

| Route (existing) | Schema | Notes |
|---|---|---|
| `GET /api/agency/{agencyId}/cartera/payment-plans/{planId}` | `CarteraPaymentPlanDetailResponse` | `{ planId, tenantId, debtorId, stage, status, paymentProvider, paymentUrl, totalDueCop, initialAmountCop, discountAppliedPct, offeredAt, acceptedAt, defaultedAt, installments[]{ number, dueDate, amountCop, status, paidAt } }` [VERIFIED: `agent.ts:3744`] |
| `POST /api/agency/{agencyId}/cartera/payment-plans/offer` | `CarteraPaymentPlanOfferResponse` | **Policy matrix lives here**: "computes the discounted offer per RESEARCH §4 tier defaults clamped by `Math.min(tier, agencyMaxDiscountPct)`, generates a Wompi payment link… **Stages S4/S5/SX → 400 (no negotiation surface)**." That 400 is the `requiresHumanReview` boundary manifest. [VERIFIED: `agent.ts:2198`] |
| `POST /api/agency/{agencyId}/cartera/payment-plans/{planId}/accept` | `CarteraPaymentPlanAcceptResponse` | Idempotent `offered → active`; **no signature/OTP in the current body**; status outside offered/active → 409. [VERIFIED: `agent.ts:2364`] |
| `POST .../{planId}/approve` | `PaymentPlanApproveResponse{ wompiUrl, approvedAt, operatorApprovedBy }` | **Operator** approval — this is the agency's job, NOT the tenant's. [VERIFIED: `agent.ts:2451`] |
| `POST .../{planId}/reject` | `PaymentPlanRejectResponse` | Operator reject. |

The agency consumes them **directly** via `NEXT_PUBLIC_AGENT_URL` + `agentAuthHeaders()` bearer (`use-payment-plan-approval.ts`). **The tenant must NOT** — `agencyId` in the path is an operator scope; a tenant JWT has no agency membership → 403, and constructing it client-side is an IDOR anti-pattern.

### What v7-07 must target (tenant-scoped RLS — provisional, do NOT exist yet)
Routed through `apiClient` (BFF → agent), JWT-derived tenant identity, JSDoc-tagged provisional (Assumptions A1–A4):

| Capability | Provisional tenant route (via BFF) | Degrade | Success |
|---|---|---|---|
| List approved acuerdos | `GET /cartera/payment-plans/mine` → `CarteraPaymentPlanDetailResponse[]` (only agency-approved/active for the caller) | `[]` on 404/403/0 | ACUE-01 |
| Read one (own-only) | resolve from `listMine().find(id)` — **no raw fetch-by-id** (anti-IDOR, copied from `pqrs.service.getMine`) | `null` | ACUE-01 |
| Accept + sign | `POST /cartera/payment-plans/:planId/accept` body `{ signatureData, otpVerificationToken }` → `CarteraPaymentPlanAcceptResponse` | `AcuerdoUnavailableError` → "Próximamente" | ACUE-02 |
| Pay a cuota | reuse `plan.paymentUrl` (already on the record) OR `GET /cartera/payment-plans/:planId/installments/:n/payment-url` → `{ paymentUrl, amountInCents }` | `null` → disabled "Próximamente" | ACUE-03 |
| Request pre-mora plan | `POST /cartera/payment-plans/request` body `{ leaseId }` (intent only — **no terms**) → feeds agency pipeline | `AcuerdoUnavailableError` → "Próximamente" | ACUE-04 |

**Key seam already in place:** the casos hub renders a `ProximamenteSection` titled "Acuerdos de pago" (`src/app/inquilino/casos/page.tsx:360`). v7-07 swaps it for a real `Link → /inquilino/acuerdos` (exactly as v7-06 swapped the PQRS placeholder for the Solicitudes link) and folds real acuerdo rows into `useTenantCases` (which today emits **zero** `'acuerdo'` rows — the union member already exists for this forward-ref, `tenant-case.ts:53`).

---

## Standard Stack (all already installed / in-repo)

### Core
| Library / module | Version | Purpose | Why standard here |
|---|---|---|---|
| `react-signature-canvas` | ^1.1.0-alpha.2 | Signature canvas (ACUE-02) | Already the engine behind `SignaturePad`; reuse the wrapper, not the lib directly [VERIFIED: `package.json:84`] |
| `apiClient` (`src/lib/api/client.ts`) | in-repo | BFF calls (→ `NEXT_PUBLIC_BACKEND_URL`), `ApiError` with `.status` | The tolerant-degrade backbone (404/403/0 detection) used by every tenant service |
| generated agent types (`src/lib/api/generated/agent.ts`) | in-repo | `CarteraPaymentPlan*` shapes | The single-source contract for the acuerdo record — re-export, don't re-declare |
| `sonner` (toast) | in-repo | honest action feedback | Same as v7-05/06 (`toast.info` "…disponible pronto") |
| `@phosphor-icons/react` | in-repo | `Handshake` (already the acuerdo icon), `SealCheck`, `Receipt` | icon vocabulary already mapped in hub + casos detail |

### Supporting (reuse targets — do NOT rebuild)
| Module | Purpose | When |
|---|---|---|
| `src/components/contract/SignaturePad.tsx` | Draw-signature → base64 PNG via `onChange` | ACUE-02 accept |
| `src/components/contract/OTPVerification.tsx` | Email OTP → `verificationToken` (needs generalization — see Pattern 2) | ACUE-02 accept |
| `src/components/contract/SignatureForm.tsx` | Composition (`SignaturePad`+OTP+checkboxes+`onSign`) | Template for the acuerdo accept panel |
| `src/lib/payments/wompi-rent-session.ts` + `.../wompi-integrity.ts` + `app/api/inquilino/pagos/wompi-session/route.ts` | Server-resolved amount + integrity + `buildWompiCheckoutUrl` | ACUE-03 pay-cuota |
| `src/lib/types/tenant-case.ts` + `src/lib/hooks/use-tenant-cases.ts` | Case projection + hub fold | ACUE-01 (add `acuerdoToCase`, emit `'acuerdo'` rows) |
| `src/lib/api/pqrs.service.ts` | tolerant contract template (verbatim `isEndpointUnavailable` + `*UnavailableError`) | ACUE-01/02/04 service |
| `src/lib/api/agent-contact.service.ts` | agent-routed convention (BFF-forwarded, default-gated) | the exact convention for `tenant-acuerdos.service.ts` |
| `src/lib/api/tenant-payment-requests.service.ts` | single-source saldo context | ACUE-01/05 (folded saldo — never a parallel number) |
| `src/components/ui/empty-state.tsx` + the hub's `ProximamenteSection` | honest "Próximamente" | every gated surface |

### Alternatives Considered
| Instead of | Could Use | Tradeoff — why rejected |
|---|---|---|
| BFF-forwarded `apiClient` | Direct `NEXT_PUBLIC_AGENT_URL` + `agentAuthHeaders` (agency convention) | Direct path is **agency-scoped** (`/api/agency/{agencyId}/…`) — IDOR for tenants, and inconsistent with every other tenant service. Rejected. |
| Re-export generated `CarteraPaymentPlan*` | Hand-declare a parallel `Acuerdo`/`Cuota` type | A parallel type is a second source of truth for the record shape → drift + PITFALLS 9 risk. Re-export the generated schema. |
| Generalize `OTPVerification` via injected adapter | Fork a second `AcuerdoOTP` component | Forking duplicates the Ley-527 OTP flow → two things to keep compliant. Generalize (Pattern 2). |

**Installation:** none — zero new packages.

**Version verification:** N/A — no new packages. Existing deps confirmed present via `package.json` grep.

## Package Legitimacy Audit

**No external packages are installed in this phase.** Every dependency (`react-signature-canvas`, `sonner`, `@phosphor-icons/react`, `apiClient`) is already in `package.json` and in production use. slopcheck / registry verification is **not applicable** — there is nothing to install. The verifier should confirm `package.json` + `pnpm-lock.yaml` are byte-identical across the phase (the v7-04/05/06 zero-new-deps gate).

---

## Architecture Patterns

### System Architecture Diagram

```
Tenant browser (/inquilino/acuerdos, /inquilino/casos/[caseId])
        │
        │  (1) LIST + DETAIL                         (2) ACCEPT + SIGN
        │  acuerdosApi.listMine()                    SignaturePad → PNG
        │                                            OTPVerification → verificationToken
        ▼                                            acuerdosApi.accept(planId,{signatureData,token})
   apiClient  ──────────────────────────────────────────────┐
   (→ NEXT_PUBLIC_BACKEND_URL, the BFF; forwards tenant JWT) │
        │                                                    │
        ▼                                                    ▼
   NestJS BFF ── forwards JWT ──►  Leasefy/agent (cartera/payment-plans)
                                     ├── SINGLE record: CarteraPaymentPlanDetailResponse
                                     │     (installments[], totalDueCop, status, paymentUrl, acceptedAt)
                                     ├── policy matrix + requiresHumanReview()  ◄── S4/S5/SX = human gate
                                     └── Wompi link generation (paymentUrl)
        ▲
        │  (3) PAY A CUOTA  — same v7-04 rail
        │  app/api/inquilino/acuerdos/wompi-session/route.ts (runtime=nodejs)
        │     · reads plan.paymentUrl/amount SERVER-SIDE from the agent (never body.amount)
        │     · redirect → checkout.wompi.co ; status flips ONLY via backend webhook
        │
        │  (4) REQUEST PRE-MORA PLAN — proposes, never sets
        │  SolicitarPlanModal → acuerdosApi.requestPlan({leaseId}) → agency approval pipeline
        │  (no "por qué la mora"; no centrales de riesgo)
        ▼
   Until tenant RLS routes exist → 404/403/0 → isEndpointUnavailable →
   list []  ·  mutations AcuerdoUnavailableError  →  honest "Próximamente" (DESIGN §11)
```

File-to-implementation mapping is in Component Responsibilities below; the diagram shows data flow only.

### Recommended Structure (all additive)
```
src/
├── lib/api/
│   ├── tenant-acuerdos.types.ts       # RE-EXPORT generated CarteraPaymentPlan* + tenant input types
│   └── tenant-acuerdos.service.ts     # tolerant contract (listMine/getMine/accept/requestPlan/getCuotaPaymentUrl)
├── lib/types/tenant-case.ts           # ADD acuerdoStatusToTone/Label + acuerdoToCase (pure, pass-through)
├── lib/hooks/
│   ├── use-tenant-acuerdos.ts         # listMine hook (mirrors use-tenant-pqrs)
│   └── use-tenant-cases.ts            # fold acuerdo rows (emit 'acuerdo' when listMine() non-empty)
├── app/inquilino/acuerdos/page.tsx    # list surface (rows or honest empty/Próximamente)
├── app/inquilino/casos/[caseId]/page.tsx  # acuerdo branch: cuota timeline + accept + pay affordances
├── app/api/inquilino/acuerdos/wompi-session/route.ts  # ACUE-03 server route (v7-04 clone, agent-sourced amount)
└── components/inquilino/acuerdos/
    ├── AcuerdoAcceptPanel.tsx         # SignaturePad + generalized OTP + "esto lo aprueba tu inmobiliaria"
    ├── CuotaPlanTable.tsx             # renders installments[] verbatim (no saldo math)
    └── SolicitarPlanModal.tsx         # ACUE-04 minimal intent form (no "por qué", no bureau copy)
```

### Pattern 1: Tolerant, BFF-forwarded, tenant-scoped contract (the backbone)
Model `tenant-acuerdos.service.ts` on `agent-contact.service.ts` + `pqrs.service.ts` verbatim — same `isEndpointUnavailable(404/403/0)`, same `*UnavailableError`, same anti-IDOR `getMine = listMine().find`.

```typescript
// Source: modeled on src/lib/api/pqrs.service.ts + agent-contact.service.ts (in-repo, VERIFIED)
import { apiClient, ApiError } from './client';
import type { components } from './generated/agent';

export type AcuerdoDetail = components['schemas']['CarteraPaymentPlanDetailResponse'];
export type AcuerdoAcceptResult = components['schemas']['CarteraPaymentPlanAcceptResponse'];

function isEndpointUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 0);
}
export class AcuerdoUnavailableError extends Error {
  constructor() { super('acuerdo_unavailable'); this.name = 'AcuerdoUnavailableError'; }
}

export const acuerdosApi = {
  /** GET /cartera/payment-plans/mine — only agency-APPROVED/active plans for the caller.
   *  Degrades to [] on not-live — NEVER a fabricated acuerdo. Provisional path (A1). */
  async listMine(): Promise<AcuerdoDetail[]> {
    try { return await apiClient.get<AcuerdoDetail[]>('/cartera/payment-plans/mine'); }
    catch (err) { if (isEndpointUnavailable(err)) return []; throw err; }
  },
  /** Own-only resolve via listMine().find — no raw fetch-by-id (anti-IDOR). */
  async getMine(planId: string): Promise<AcuerdoDetail | null> {
    return (await this.listMine()).find((p) => p.planId === planId) ?? null;
  },
  /** POST /cartera/payment-plans/:id/accept {signatureData, otpVerificationToken}.
   *  The AGENT performs offered→active + runs requiresHumanReview() for non-policy cases.
   *  Never a client-side approval. Throws on not-live → "Próximamente". Provisional (A2). */
  async accept(planId: string, body: { signatureData: string; otpVerificationToken: string }): Promise<AcuerdoAcceptResult> {
    try { return await apiClient.post<AcuerdoAcceptResult>(`/cartera/payment-plans/${planId}/accept`, body); }
    catch (err) { if (isEndpointUnavailable(err)) throw new AcuerdoUnavailableError(); throw err; }
  },
  /** POST /cartera/payment-plans/request {leaseId} — PROPOSES a pre-mora plan (no terms).
   *  Feeds the agency approval pipeline. Provisional (A3). */
  async requestPlan(body: { leaseId: string }): Promise<{ requestId: string }> {
    try { return await apiClient.post<{ requestId: string }>('/cartera/payment-plans/request', body); }
    catch (err) { if (isEndpointUnavailable(err)) throw new AcuerdoUnavailableError(); throw err; }
  },
};
```

### Pattern 2: Generalize `OTPVerification` via an injected adapter (reuse, not fork)
`OTPVerification` is hardcoded to `contractsApi.sendOtp/verifyOtp(contractId, {role})` and `ContractOtpRole` (`OTPVerification.tsx:73,123`). Generalize with a **backward-compatible optional adapter** so the same component serves acuerdo acceptance without a second OTP component:

```typescript
// Recommended additive prop (keeps existing contractId/role default path working):
export interface OtpAdapter {
  send: () => Promise<{ sentTo: string; cooldownSeconds: number }>;
  verify: (code: string) => Promise<{ verificationToken: string }>;
}
// OTPVerificationProps gains `adapter?: OtpAdapter`. When absent → today's contract adapter
// (contractsApi + contractId + role). For acuerdos, pass an adapter that hits the agent's
// acuerdo OTP endpoints (provisional) and honest-degrades. NO fork.
```
The Ley 527/1999 help copy already in the component stays valid for acuerdos (same electronic-signature basis). The `SignatureForm` composition (`onSign({otpVerificationToken, signatureData})`, `SignatureForm.tsx:96-108`) is the exact template for `AcuerdoAcceptPanel`.

### Pattern 3: Pay-cuota on the v7-04 rail, amount from the agent
Clone `app/api/inquilino/pagos/wompi-session/route.ts` → `app/api/inquilino/acuerdos/wompi-session/route.ts`. Preserve **all** v7-04 invariants: `runtime='nodejs'`, server-only secret (no `NEXT_PUBLIC_WOMPI`), **never read `body.amount`**, forward the tenant JWT. The one change: resolve the amount + reference from the agent's plan/installment record (the plan already carries a `paymentUrl`; a per-cuota amount comes from `installments[n].amountCop`), not from `/leases/:id/payment-info`. Status flips **only** via the backend webhook; the `/inquilino/acuerdos` return shows "confirmando", never "pagado" (v7-04 no-premature-success).

### Pattern 4: Fold acuerdo into the case aggregator (replace the hub placeholder)
Add `acuerdoStatusToTone`/`acuerdoStatusToLabel` (pure, total, neutral — `CaseTone` has no alarm level) + `acuerdoToCase(plan)` to `tenant-case.ts`, and emit `'acuerdo'` rows in `use-tenant-cases.ts` from `acuerdosApi.listMine()` (→ `[]` keeps the hub's "Próximamente"). `acuerdoToCase` **passes through** `installments`/`totalDueCop`/`status` on an optional metadata block — it does **not** compute saldo (mirrors `pqrsToCase` not computing SLA).

### Anti-Patterns to Avoid
- **Calling `/api/agency/{agencyId}/…` from the tenant** — IDOR; that's the operator surface. Use the tenant-scoped BFF route.
- **Re-declaring the acuerdo/cuota shape** — re-export the generated schema; a parallel type is a second saldo source.
- **A client-computed saldo or "total restante"** — read `totalDueCop`/`installments[].amountCop` from the record. No arithmetic that the agent didn't sign off on.
- **A tenant "aprobar acuerdo" button** — the tenant *accepts*; the agency *approves*. Copy must say "esto lo aprueba tu inmobiliaria".
- **Any "por qué la mora" field or centrales-de-riesgo copy** — Ley 2300 art. 7 + Ley 1266/2008.
- **Optimistic "pagado" / "aceptado"** — status flips only via the agent (accept) / webhook (payment).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Acuerdo/cuota record shape | A tenant `Acuerdo`/`Cuota` type | Re-export `CarteraPaymentPlan*` from `generated/agent.ts` | Single source of truth; avoids drift + a second saldo model (PITFALLS 9) |
| Saldo / total restante | A reducer over cuotas | `totalDueCop` + `installments[].amountCop` verbatim | The agent is the sole saldo authority |
| Signature capture | A new canvas | `SignaturePad` | Already HiDPI-correct, white-bg PNG, Ley-527 wording |
| OTP flow | A second OTP modal | Generalized `OTPVerification` (adapter) | One compliant Ley-527 flow, not two |
| Wompi checkout + integrity | New hash/url code | v7-04 `wompi-integrity.ts` + `buildWompiCheckoutUrl` + the server route | Server-only secret + anti-tamper amount already proven |
| Not-live degrade | Ad-hoc try/catch per call | `isEndpointUnavailable` + `*UnavailableError` | Identical idiom across every tenant service |
| Policy decisions (discount tiers, human-review) | Any client policy check | The agent's `offer`/`requiresHumanReview` | Frontend replicating policy = the exact T-323/SIC-001 risk |

**Key insight:** In this phase almost nothing should be *built* — it should be *composed*. The one genuinely new artifact is the tenant-scoped tolerant service + the accept panel; everything else is reuse. Any code that computes money or decides policy is a red flag.

---

## Runtime State Inventory

Not a rename/refactor/migration phase — this is additive greenfield UI. **N/A.** No stored data, live-service config, OS-registered state, secrets, or build artifacts are renamed or migrated. (The one adjacent env var, `NEXT_PUBLIC_AGENT_URL`, is *not* introduced for the tenant path — the tenant uses the existing `NEXT_PUBLIC_BACKEND_URL` BFF; no env change required.)

---

## Common Pitfalls

### Pitfall 1 — A second saldo engine (PITFALLS 9, ACUE-01)
**What goes wrong:** the view recomputes "total restante" / "saldo" from cuotas, diverging from the agent's `totalDueCop`.
**How to avoid:** render `totalDueCop` and `installments[].amountCop`/`status`/`paidAt` verbatim. No sums, no derived saldo. `acuerdoToCase` passes through, never computes (like `pqrsToCase`).
**Warning sign:** any `.reduce(`, `+`, or "restante = ..." over cuota amounts in the acuerdo surface.

### Pitfall 2 — The frontend auto-approves or sets terms (PITFALLS 2, ACUE-02)
**What goes wrong:** an "aprobar acuerdo" affordance, a discount/cuota editor, or a client-side policy check.
**Why it happens:** the agency operator UI (`use-payment-plan-approval.ts`) *does* approve/modify — copy-pasting it into the tenant surface would leak an operator power to the tenant.
**How to avoid:** tenant only *accepts* an already-approved plan; only the agent runs `requiresHumanReview()`; S4/S5/SX + any non-policy case stay server-side. Copy: "esto lo aprueba tu inmobiliaria". No terms editor.
**Warning sign:** `approve`, `modify`, `discount`, `reject_reason`, `maxDiscount` tokens anywhere under `components/inquilino/acuerdos/` or `app/inquilino/acuerdos/`.

### Pitfall 3 — "por qué la mora" / centrales de riesgo (PITFALLS 4/5, ACUE-04)
**What goes wrong:** the request form asks the reason for arrears, or the UI threatens/mentions credit bureaus.
**How to avoid:** the request form is intent-only (`{leaseId}`, optional contact preference). Zero "motivo/razón/por qué" fields. Zero "DataCrédito/TransUnion/central(es) de riesgo/reporte negativo" strings. Any bureau reference requires the agent's 3-party gate (Ley 1266/2008 + 2157/2021) — out of scope here.
**Warning sign:** grep for `mora|por qué|motivo|central|DataCrédito|TransUnion|reporte` in the request/accept surfaces → must be 0 (except neutral, factual estado labels).

### Pitfall 4 — IDOR via agency route or fetch-by-id
**What goes wrong:** the tenant service calls `/api/agency/{agencyId}/…` or `GET .../payment-plans/:id` on a route param.
**How to avoid:** BFF tenant route only; `getMine` resolves via `listMine().find` (copied from `pqrs.service.getMine`, `pqrs.service.ts:94`). No `agencyId` ever constructed client-side for a tenant.

### Pitfall 5 — Fabricated acuerdo/cuota rows before the backend exists
**What goes wrong:** a mock plan renders on a real-tenant path to "show the feature".
**How to avoid:** `listMine()` → `[]` on not-live; the hub keeps its "Próximamente"; mutations throw `AcuerdoUnavailableError`. NO fixture on any `/inquilino/*` path. (Fixtures are allowed only in `*.test.ts`.)

### Pitfall 6 — Premature "pagado"/"aceptado"
**What goes wrong:** optimistic status flip on the client after redirect/accept.
**How to avoid:** accept status comes from `CarteraPaymentPlanAcceptResponse` (the agent); cuota "pagado" flips only via the backend webhook. The Wompi return shows "confirmando" (v7-04).

### Pitfall 7 — Copy register drift (es-CO vs shipped voseo)
**Observed:** the reused `SignaturePad`/`OTPVerification` ship Argentine voseo ("Firmá", "Dibujá", "Podés reenviar"). ROADMAP guardrail says es-CO neutral.
**How to avoid:** write **new** acuerdo copy in es-CO neutral; do **not** fork the reused components to change their copy (out of scope, and would touch the contract-signing flow). Flag as a milestone-wide copy pass, not a v7-07 task. (Open Question 1.)

---

## Code Examples

### Fold acuerdo into the case aggregator (replaces the hub "Próximamente" placeholder)
```typescript
// Source: mirrors src/lib/types/tenant-case.ts pqrsToCase + use-tenant-cases.ts PQRS fold (VERIFIED in-repo)
// tenant-case.ts — add (pure, total, NEUTRAL — CaseTone has no alarm level):
export function acuerdoStatusToTone(status: string): CaseTone {
  switch (status) {
    case 'offered': return 'attention';      // tenant may need to accept — caps at attention
    case 'active': return 'info';
    case 'completed': case 'cancelled': return 'neutral';
    default: return 'info';                   // unknown agent status → info, never alarm
  }
}
export function acuerdoToCase(p: AcuerdoDetail): TenantCase {
  return {
    id: p.planId, type: 'acuerdo',
    titulo: 'Acuerdo de pago',
    estadoLabel: acuerdoStatusToLabel(p.status),
    tone: acuerdoStatusToTone(p.status),
    responsable: 'Inmobiliaria',
    updatedAt: p.acceptedAt ?? p.offeredAt,
    detailLink: `/inquilino/casos/${encodeURIComponent(p.planId)}`,
    sourceLink: '/inquilino/acuerdos',
    events: [{ id: `${p.planId}:offered`, label: 'Propuesto', timestamp: p.offeredAt },
             ...(p.acceptedAt ? [{ id: `${p.planId}:accepted`, label: 'Aceptado', timestamp: p.acceptedAt }] : [])],
    // pass-through record metadata — NO saldo math here
    acuerdo: { status: p.status, totalDueCop: p.totalDueCop, installments: p.installments, paymentUrl: p.paymentUrl },
  };
}
```

### Accept panel wiring (ACUE-02 — "esto lo aprueba tu inmobiliaria")
```tsx
// Source: composition mirrors src/components/contract/SignatureForm.tsx (VERIFIED in-repo)
<AcuerdoAcceptPanel
  planId={plan.planId}
  onSigned={async ({ signatureData, otpVerificationToken }) => {
    try {
      const res = await acuerdosApi.accept(plan.planId, { signatureData, otpVerificationToken });
      // status comes from the AGENT — never set optimistically
      toast.success('Acuerdo aceptado'); refetch();
    } catch (e) {
      if (e instanceof AcuerdoUnavailableError) toast.info('La aceptación de acuerdos estará disponible pronto');
      else throw e;
    }
  }}
/>
// Panel copy (es-CO, sentence-case Button): a factual banner —
// "Este acuerdo ya fue aprobado por tu inmobiliaria. Al firmar, confirmás que lo aceptás."
// NO "aprobar" affordance; NO terms editor.
```

---

## State of the Art

| Old approach (elsewhere in repo) | v7-07 approach | Why |
|---|---|---|
| Agency hits agent directly (`NEXT_PUBLIC_AGENT_URL` + bearer, `agency/{id}` scope) | Tenant hits agent via the BFF (`apiClient` → `NEXT_PUBLIC_BACKEND_URL`), tenant RLS | Tenant has no agency scope; matches v7-05 `agent-contact` |
| v7-03 acuerdo = static `ProximamenteSection` | Real `/inquilino/acuerdos` + folded cases, gated to "Próximamente" only when `listMine()` empty | Same evolution v7-06 did for PQRS |

**Deprecated/outdated:** none introduced. Do not reuse the agency's `use-payment-plan-approval.ts` mutation set (approve/reject/modify) on the tenant path — those are operator powers.

---

## Real vs. Gated (explicit — the honest split)

| Capability | REAL today (frontend ships, works vs a live tenant RLS route) | GATED behind `Leasefy/agent` ("Próximamente") | Guardrail |
|---|---|---|---|
| ACUE-01 view acuerdos | UI shell, `listMine()`/`getMine` contract, `CuotaPlanTable` rendering `installments[]` verbatim, hub fold, es-CO copy, empty/"todo al día" state | The tenant RLS route `GET /cartera/payment-plans/mine`; real approved-plan data | No second saldo engine; read `totalDueCop`/`installments` verbatim |
| ACUE-02 accept + sign | `AcuerdoAcceptPanel` (SignaturePad + generalized OTP), "esto lo aprueba tu inmobiliaria" banner, `accept()` contract | Tenant accept route persisting signature+OTP; `requiresHumanReview()` over HTTP; the offered→active transition | Never auto-approve/set terms (T-323/2024 + SIC 001/2025) |
| ACUE-03 pay a cuota | Server route (v7-04 clone), `buildWompiCheckoutUrl`, "confirmando" return, disabled affordance when `paymentUrl` null | Agent per-cuota `paymentUrl`/amount; productive Wompi; reconciliation webhook | Server-resolved amount, no premature "pagado" |
| ACUE-04 request a plan | `SolicitarPlanModal` (intent-only, no "por qué", no bureau copy), `requestPlan()` contract | Agent `POST /cartera/payment-plans/request` feeding the agency pipeline | Proposes not sets; Ley 2300 art. 7; Ley 1266/2021 |

**Net:** 100% of the UI + contracts + honest degrade ships now; 0% of real acuerdo settlement works until the `agent` exposes tenant RLS routes. No real-tenant path shows fabricated data.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Tenant list route is `GET /cartera/payment-plans/mine` (via BFF), returning approved/active `CarteraPaymentPlanDetailResponse[]` for the caller | Cross-repo reality; Pattern 1 | Wrong path = a one-line service change; degrade keeps UI honest meanwhile. LOW. |
| A2 | Tenant accept is `POST /cartera/payment-plans/:planId/accept` with body `{signatureData, otpVerificationToken}` (a tenant-scoped superset of the existing agency accept, which today takes no body) | ACUE-02; Pattern 2 | The agent may model signature capture differently (e.g., a separate sign endpoint). Contract adjusts; the panel is unaffected. MEDIUM. |
| A3 | Pre-mora request is `POST /cartera/payment-plans/request {leaseId}` (intent only; agent+agency compute/approve terms) | ACUE-04 | If the agent expects more fields, the form stays intent-only regardless (guardrail); only the body grows. LOW. |
| A4 | Per-cuota payment reuses `plan.paymentUrl` (already on the record) or a provisional `installments/:n/payment-url`; the v7-04 server route resolves amount from the agent, not the client | ACUE-03 | If the plan's single `paymentUrl` covers the whole plan (not per-cuota), the UI pays the plan, not a cuota — a copy/label change, not an architecture change. MEDIUM. |
| A5 | The **policy matrix + `requiresHumanReview()` live entirely in `Leasefy/agent`** (cartera payment-plans offer service — "RESEARCH §4 tier defaults clamped by `agencyMaxDiscountPct`", S4/S5/SX → 400). The frontend never replicates it. | ACUE-02; Pitfall 2 | This is the legal crux — if any planner adds a client policy check, it violates T-323/SIC-001. Must stay agent-only. HIGH if violated. |
| A6 | Tenant acuerdo services route through the BFF (`apiClient`/`NEXT_PUBLIC_BACKEND_URL`), NOT the agency's direct `NEXT_PUBLIC_AGENT_URL` bearer path | Architectural Responsibility Map | Using the agency path = IDOR. HIGH if violated. |

**For the checker:** A5 + A6 are the two that must never be "optimized away". A1–A4 are provisional endpoint shapes — JSDoc-tag them `@provisional` and treat a wrong path as a one-line fix (the honest-degrade covers the gap until then).

---

## Open Questions

1. **Copy register (es-CO vs shipped voseo).** The reused signature/OTP components ship Argentine voseo; ROADMAP says es-CO.
   - What we know: new acuerdo copy should be es-CO neutral; forking the reused components' copy is out of scope.
   - Recommendation: write new copy es-CO; leave `SignaturePad`/`OTPVerification` strings as-is (a milestone-wide copy pass, not a v7-07 task).
2. **Per-cuota vs whole-plan payment (A4).** Does the agent generate one `paymentUrl` per plan or per installment?
   - Recommendation: build for per-cuota; if only a plan-level link exists, label the affordance "Pagar acuerdo" and pay the plan. Either way the v7-04 server-resolved-amount invariant holds.
3. **Signature persistence on accept (A2).** Does the agent's tenant accept take the signature inline, or is there a separate sign step (like `contracts` OTP+sign)?
   - Recommendation: model the service to send `{signatureData, otpVerificationToken}` inline; if the agent splits it, only the service changes.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` (BFF) | all four ACUE contracts (forwarded to agent) | ✓ (in `.env.example:18`) | — | honest-degrade to "Próximamente" if unreachable (`ApiError(0)`) |
| `Leasefy/agent` tenant RLS routes | real acuerdo data | ✗ (agency-scoped routes only exist) | — | `[]` / `AcuerdoUnavailableError` → "Próximamente" (by design) |
| `WOMPI_INTEGRITY_SECRET` / `WOMPI_PUBLIC_KEY` (server-only) | ACUE-03 server route | ✓ (v7-04 established) | — | route returns `wompi_not_configured` 500; UI keeps affordance gated |
| `react-signature-canvas` | ACUE-02 | ✓ | ^1.1.0-alpha.2 | — |

**Missing with no fallback:** none (the missing agent routes have the honest-degrade fallback — the entire premise of the phase).

---

## Validation Architecture

`workflow.nyquist_validation` is not disabled in `.planning/config.json` → included.

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest (in-repo; v7-06 shipped 63 unit specs the same way) |
| Config file | existing repo vitest config (no change) |
| Quick run | `pnpm test -- <file>` |
| Full suite | `pnpm test` (baseline: 601 pass / 7 pre-existing unrelated failures — `deferred-items.md`) |
| Build gate | `pnpm build` green (EXIT 0) — the phase's hard gate |

### Phase Requirements → Test Map
| Req | Behavior | Type | Command | File exists? |
|---|---|---|---|---|
| ACUE-01 | `listMine()` → `[]` on 404/403/0; `getMine` resolves via find (anti-IDOR) | unit | `pnpm test -- tenant-acuerdos.service` | ❌ Wave 0 |
| ACUE-01 | `acuerdoToCase` pass-through (no saldo compute); tone never alarm | unit | `pnpm test -- tenant-case` (extend) | ⚠️ extend existing |
| ACUE-01 | `useTenantCases` emits 0 acuerdo rows when `listMine()` `[]`; N rows otherwise | unit | `pnpm test -- use-tenant-cases` (extend) | ⚠️ extend existing |
| ACUE-02 | `accept()` throws `AcuerdoUnavailableError` on not-live; no optimistic status | unit | `pnpm test -- tenant-acuerdos.service` | ❌ Wave 0 |
| ACUE-03 | server route ignores `body.amount`; secret never in response (v7-04 parity) | unit | `pnpm test -- acuerdos-wompi-session` | ❌ Wave 0 |
| ACUE-04 | `requestPlan()` sends only `{leaseId}`; no "por qué"/bureau fields (grep gate) | unit + grep | `pnpm test -- tenant-acuerdos.service` + phase grep | ❌ Wave 0 |

### Sampling Rate
- Per task commit: `pnpm test -- <touched spec>` + `pnpm build`
- Per wave merge: `pnpm test` (0 new failures vs the 7-failure baseline)
- Phase gate: full suite green (minus baseline) + `pnpm build` EXIT 0 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tenant-acuerdos.service.test.ts` — degrade/anti-IDOR/no-optimistic-status (ACUE-01/02/04)
- [ ] `acuerdos-wompi-session` route test — server-amount + no-secret-leak (ACUE-03)
- [ ] extend `tenant-case.test.ts` + `use-tenant-cases.test.ts` — acuerdo fold (ACUE-01)
- [ ] phase-wide grep gates: 0 `NEXT_PUBLIC_AGENT_URL` on the tenant path · 0 `agency/${` on the tenant path · 0 `por qué|motivo|central(es)? de riesgo|DataCrédito|TransUnion` in acuerdo surfaces · 0 `body.amount` in the server route · `package.json`/`pnpm-lock.yaml` unchanged

---

## Security Domain

`security_enforcement` not disabled → included.

### Applicable ASVS Categories
| ASVS | Applies | Standard control (this phase) |
|---|---|---|
| V2 Authentication | yes | Tenant Supabase JWT forwarded by the BFF; the agent enforces RLS (never trust client identity) |
| V4 Access Control | **yes (crux)** | Tenant-scoped routes only; own-only `getMine` via find; **no `agency/{agencyId}` from the tenant** (IDOR) |
| V5 Input Validation | yes | Server route accepts only `{leaseId}`/`{planId}` — never `amount`; request form is intent-only |
| V6 Cryptography | yes | Wompi integrity hash stays in the v7-04 `server-only` module; secret never leaves the process |
| V7 Error Handling | yes | 404/403/0 → honest degrade, never a stack/PII leak; no fabricated success |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---|---|---|
| Tenant reads another tenant's acuerdo (agency route / fetch-by-id) | Information disclosure | BFF tenant route + `listMine().find` (no fetch-by-id); agent RLS |
| Client tampers the cuota amount | Tampering | Server-resolved amount from the agent record; integrity hash binds it (v7-04) |
| Client self-approves an acuerdo / edits terms | Elevation of privilege | Accept-only; policy + `requiresHumanReview` are agent-side (A5); no operator mutations on the tenant path |
| Premature "pagado"/"aceptado" | Repudiation / integrity | Status from the agent (accept) / webhook (payment); "confirmando" on return |
| Unlawful arrears interrogation / bureau threat | Compliance (Ley 2300 / 1266) | No "por qué" field; no bureau copy; grep-gated to 0 |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/api/generated/agent.ts` — `CarteraPaymentPlanDetailResponse` (`:3744`), `CarteraPaymentPlanAcceptResponse` (`:3770`), `PaymentPlanApproveResponse` (`:3776`), accept route (`:2364`), offer route + policy note (`:2198`), `CarteraStage` (`:3710`). The authoritative acuerdo record shape.
- `src/lib/hooks/cobranza/use-payment-plan-approval.ts` — the agency's live agent integration (URL/auth convention, plan/installments/paymentUrl usage, approve/reject/modify — operator-only powers).
- `src/lib/api/agent-contact.service.ts` — the BFF-forwarded, default-gated tenant→agent convention (v7-05).
- `src/lib/api/pqrs.service.ts` + `tenant-payment-requests.service.ts` — the tolerant-degrade + anti-IDOR `getMine` template.
- `src/components/contract/{SignaturePad,OTPVerification,SignatureForm}.tsx` — reuse targets for ACUE-02 (+ Ley 527 OTP framing).
- `src/lib/payments/wompi-rent-session.ts` + `app/api/inquilino/pagos/wompi-session/route.ts` — the ACUE-03 rail (server amount + integrity).
- `src/lib/types/tenant-case.ts` + `src/lib/hooks/use-tenant-cases.ts` + `src/app/inquilino/casos/page.tsx:360` — the fold + the `ProximamenteSection` acuerdo seam.
- `.planning/ROADMAP.md:143-155` + guardrails `:28` — success criteria + locked legal guardrails.
- `.planning/phases/v7-0{4,5,6}-*/*-VERIFICATION.md` — the honest-degrade + Wompi-invariant + fork-not-reuse discipline this phase inherits.
- `docs/DESIGN.md` §11 (`:465`, EmptyState/Próximamente), §4 (`:147,164`, sentence-case buttons).

### Secondary (MEDIUM confidence)
- Legal framing (T-323/2024, SIC Circular 001/2025, Ley 2300/2023 art. 7, Ley 1266/2008 + 2157/2021, Ley 1480/2011, Ley 527/1999) — taken from ROADMAP guardrails (user-locked) + in-repo component copy; not independently re-verified this session. Tagged [CITED: ROADMAP] — treat as locked decisions, not researcher-verified law.

### Tertiary (LOW confidence)
- Provisional tenant RLS route shapes (A1–A4) — inferred from the agency schema + the tenant BFF convention; JSDoc-tag `@provisional`.

---

## Metadata

**Confidence breakdown:**
- Standard stack / reuse targets: HIGH — every module read directly in-tree.
- Agent record shape (ACUE-01): HIGH — generated OpenAPI schema present in-repo.
- Tenant route shapes (A1–A4): LOW — provisional by design; honest-degrade covers the gap.
- Legal guardrails: MEDIUM (CITED from locked ROADMAP, not independently verified).
- Architecture / pitfalls: HIGH — directly mirrors v7-04/05/06 shipped idioms.

**Research date:** 2026-07-19
**Valid until:** ~2026-08-18 (stable in-repo idioms; re-check if `Leasefy/agent` ships tenant RLS routes or changes the `CarteraPaymentPlan*` schema — then A1–A4 firm up and gated→real).
