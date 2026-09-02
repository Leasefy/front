# Phase v7-07: Acuerdos de Pago (LAST) — Pattern Map

**Mapped:** 2026-07-19
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 9 anticipated surfaces (types contract, tolerant service, hook, list page, detail, accept-with-signature modal, request-premora-plan modal, caso-hub seam, nav) + the OTP generalization
**Analogs found:** 8 exact/role-match · 1 HARD gap (generalized OTP) · the phase's dominant reality = **almost everything is backend-gated "Próximamente"** because the tenant-scoped `agent` routes + RLS do not exist

> **Headline for the planner — read before writing any plan:**
> - **This is the most gated phase of the milestone.** Unlike v7-04/05/06 (which shipped a real in-app capability behind a partial backend), v7-07's ENTIRE backend is absent: there is **no tenant-scoped route + RLS on `Leasefy/agent`** to read/accept/pay an acuerdo, and even the **agency** acuerdos surface already ships its create/approve actions as **disabled "Próximamente"** (`cobranza/acuerdos/page.tsx:240-267`). So v7-07 = **UI shell + a types-only api-client contract + honest "Próximamente"** on every path a real tenant can reach. **NO fabricated acuerdo/cuota rows.** This is exactly why the phase is LAST.
> - **The golden posture-analog is the agency page `src/app/panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx`.** Read it once. It is the canonical "acuerdos with honest disabled placeholders" surface, and it encodes the T-323 guardrail the tenant page must mirror: `requiereAprobacion = true` **fixed + disabled Switch** (`:309-310, :535-541`), Aprobar/Editar/Enviar/Escalar/Rechazar as `disabled title="Próximamente"` buttons (`:244-266`), and `notDeployed`→soft notice (`:570-581`). **The tenant never approves/fixes terms; it only VIEWS an already-approved acuerdo, ACCEPTS by signing, PAYS a cuota, or REQUESTS a pre-mora plan (a proposal, never an activation).**
> - **The acuerdo Wompi rail already exists — but agency-scoped only.** The `agent` exposes `GET /api/agency/:agencyId/cartera/payment-plans/:planId` → `paymentUrl` (the hosted-checkout link; `use-payment-plan-approval.ts:186, :131`; schema `CarteraPaymentPlanDetailResponse.paymentUrl`, `agent.ts:3754`). ACUE-03 pays a cuota via that `paymentUrl`, but a **tenant** cannot call the `/api/agency/:agencyId/...` route (no `agency.id`, no tenant RLS). → contract-first: the tenant service asks the (future) tenant-scoped route for a `paymentUrl`; the **v7-04 Wompi rail is reused only if the amount is server-resolved** — do NOT rebuild a client-side amount.
> - **`OTPVerification` is HARDCODED to contracts today** (`contractId` + `ContractOtpRole` + `contractsApi.sendOtp/verifyOtp`, `OTPVerification.tsx:9-11, :73, :123`). GAP-ANALYSIS:58 names this explicitly: *"ajuste: generalizar `OTPVerification` (hoy hardcodeado a `contractsApi`)"*. ACUE-02's accept-by-signature reuses `SignaturePad` (already generic) but **needs the OTP generalized** — this is the one genuine build, and it is itself gated (the acuerdo-accept + acuerdo-OTP endpoints don't exist).
> - **Single source of saldo (PITFALLS 9):** every peso shown (acuerdo total, cuota amount, remaining) must trace to the `agent`'s single payment-plan record via the tenant service — **never a second saldo engine**, never recompute. `tenant-payment-requests` remains the fuente única for rent history; acuerdo figures come from the plan record only.
> - Read DESIGN.md before building: §11 EmptyState/"Próximamente", §4 buttons (sentence case, pill), §8/§17 Dialog + Lenis (`useLenis().stop()` + `data-lenis-prevent`) for any modal, §16 money/date `formatCurrency` + `es-CO`. Tenant pages use `@/components/ui/empty-state` (`EmptyState` with `action{label,href}`), NOT the agency `@/components/data-display/EmptyState`.

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog (path:line) | Match |
|------------------|------|-----------|----------------------------|-------|
| `src/lib/api/tenant-acuerdos.types.ts` **(NEW)** | type/model | transform | `agent.ts:3744` `CarteraPaymentPlanDetailResponse` (reuse shape) + `pqrs.types.ts` (house style) | reuse |
| `src/lib/api/tenant-acuerdos.service.ts` **(NEW)** | service | CRUD + honest-degrade | `pqrs.service.ts` (listMine→[], create→UnavailableError) + `agent-contact.service.ts` (default-gated) | exact |
| `src/lib/hooks/use-tenant-acuerdos.ts` **(NEW)** | hook | request-response (fetch mine) | `useMyPaymentRequests` (`useLeases.ts:231`) / `useTenantPqrs` (`use-tenant-pqrs.ts`) | exact |
| `src/app/inquilino/acuerdos/page.tsx` **(NEW)** | page | request-response (read) | `src/app/inquilino/solicitudes/page.tsx` + tenant shell `casos/page.tsx:196-234` | exact |
| `src/app/inquilino/acuerdos/[id]/page.tsx` **(NEW)** OR fold into `casos/[caseId]` | page | read + accept + pay | `casos/[caseId]/page.tsx` (own-list `.find`, timeline) + agency `acuerdos/page.tsx` cuota list (`:702-728`) | role-match |
| `src/components/tenant/AceptarAcuerdoModal.tsx` **(NEW)** — sign to accept (ACUE-02) | component | form + sign + OTP | `SignatureForm.tsx` (compose SignaturePad+OTP+checkboxes) + `PayRentModal.tsx` (modal shell/Lenis) | role-match (needs OTP generalization) |
| `src/components/contract/OTPVerification.tsx` **(MODIFY — generalize)** | component | request-response | *(itself, contract-scoped `:9-11,:73,:123`)* | **GAP — generalize** |
| `src/components/tenant/SolicitarPlanPagoModal.tsx` **(NEW)** — request pre-mora plan (ACUE-04) | component | form → propose | agency `CrearAcuerdoForm` (`acuerdos/page.tsx:290-635`, `useAgreementPropose`) — **tenant proposes, never fixes terms** | role-match |
| Pay a cuota via Wompi (ACUE-03) | component/route | request-response → redirect | v7-04 `PayRentModal.tsx` + `wompi-session/route.ts` + `wompi-rent-session.ts` (server-resolved amount) | exact (rail) / gated (paymentUrl source) |
| `src/lib/types/tenant-case.ts` **(MODIFY)** — add `acuerdoToCase` | model | transform | own `pqrsToCase` (`:250-286`) / `paymentRequestToCase` | exact |
| `src/lib/hooks/use-tenant-cases.ts` **(MODIFY)** — fold in acuerdo rows | hook | compose | own pqrs fold (`:198-203, :233-235`) | exact |
| `src/app/inquilino/casos/page.tsx` **(MODIFY)** — replace acuerdos `ProximamenteSection` | page | — | own `Solicitudes` real-link swap (`:334-358`, replaced PQRS placeholder in v7-06) | exact |
| `src/app/inquilino/layout.tsx` **(MODIFY)** — add "Acuerdos" nav | layout | — | own nav array (`:31-45`) | exact |

---

## REAL today vs. GATED "Próximamente" — the split that defines this phase

Because the tenant-scoped `agent` routes + RLS are ALL absent, the real/gated line is unusually stark. **What ships as real code is the contract + the UI shell + the caso seam; the data behind it stays honestly empty.**

| Capability (ACUE) | Real today (ships in v7-07) | GATED → "Próximamente" (why) |
|-------------------|------------------------------|-------------------------------|
| **ACUE-01** view approved acuerdos + cuota plan | The `tenant-acuerdos` **types contract** + tolerant service (`listMine()→[]`), the **list page + detail shell**, the **caso-hub seam** (mapper + fold + nav), all reusing existing shells. Saldo/figures wired to trace to the plan record (no second engine). | **All acuerdo/cuota DATA.** No tenant-scoped `agent` read route + RLS exists (`use-payment-plan-approval.ts` is `/api/agency/:agencyId/...` — not tenant-reachable). → `listMine()` returns `[]`, hub keeps the honest "Próximamente" acuerdos section, **no fabricated rows**. |
| **ACUE-02** accept by signing (SignaturePad + OTP) | Reuse `SignaturePad` **as-is** (generic, `SignaturePad.tsx`); build the **accept modal shell** (checkboxes + T-323 copy). **Generalize `OTPVerification`** off `contractId`. | **The accept POST + the acuerdo-scoped OTP send/verify endpoints.** No accept route exists tenant-side; the OTP is contract-scoped today. → the modal is built but `accept()` throws `AcuerdoUnavailableError` → honest "Próximamente", **never a fake "aceptado"**. Off-policy items route through the agent's `requiresHumanReview` gate (T-323) — never decided client-side. |
| **ACUE-03** pay a cuota (same Wompi rail) | Reuse the **v7-04 rail** (`PayRentModal` shell / hosted-checkout redirect / `buildWompiCheckoutUrl`) **only with a server-resolved amount**. | **The cuota `paymentUrl` source.** The `agent` `paymentUrl` is agency-scoped (`cartera/payment-plans/:planId`, `agency.id` bound). A tenant needs a tenant-scoped route returning the cuota's `paymentUrl`/amount. → contract-first: service asks for it, gets `null`/unavailable → "Próximamente". **Never build a client-side cuota amount.** |
| **ACUE-04** request pre-mora plan (proposes, doesn't fix) | The **request-plan modal** (fields + honest "propone, no fija términos" copy), modeled on the agency `CrearAcuerdoForm` + `useAgreementPropose` **fail-soft** pattern (`notDeployed`). | **The tenant-initiated propose route.** Agency propose is `POST /api/agency/:agencyId/cobranza/agreements/propose` — not tenant-callable. → `requestPlan()` throws `AcuerdoUnavailableError` / sets `notDeployed` → soft notice, form intact, **no fabricated plan**. No "por qué la mora" field, no central-de-riesgo mention (PITFALLS 4/5). |

---

## Pattern Assignments

### 1. `src/lib/api/tenant-acuerdos.types.ts` (type/model) — NEW

**Analog — reuse the `agent` payment-plan shape, do NOT fork a parallel model** (guardrail: acuerdos reuse the existing contract, ROADMAP.md:59). The authoritative shape is the generated `CarteraPaymentPlanDetailResponse` (`src/lib/api/generated/agent.ts:3744-3769`):
```ts
CarteraPaymentPlanDetailResponse: {
  planId: string; tenantId: string; debtorId: string;
  stage: CarteraStage; status: string;
  paymentProvider: string; paymentUrl: string | null;
  totalDueCop: number; initialAmountCop: number;
  discountAppliedPct: number; discountKind: string;
  offeredAt: string; acceptedAt: string | null; defaultedAt: string | null;
  installments: { number: number; dueDate: string; amountCop: number; status: string; paidAt: string | null }[];
}
```
**Copy this as the source of truth.** Define a **tenant projection** (only tenant-visible fields — exclude `debtorId`/internal audit, mirroring how `tenant-case.ts` excludes agency-internal fields for anti-IDOR, `tenant-case.ts:14-17`). Keep the `installments[]` shape (`number/dueDate/amountCop/status/paidAt`) verbatim so a cuota row maps 1:1. House-style header comment like `pqrs.types.ts:1-11` ("UI con estado vacío honesto; NO hay data falsa hasta que exista el motor"). The `'acuerdo'` `CaseType` member already exists (`tenant-case.ts:53`).

**What differs:** the tenant never sees `discountKind`/policy internals as editable; those are display-only. Add a small `AcuerdoAcceptInput` (signature payload + OTP token) and `PremoraPlanRequestInput` (proposal fields — see #7) types here too.

---

### 2. `src/lib/api/tenant-acuerdos.service.ts` (service, CRUD + honest-degrade) — NEW

**Analog: `src/lib/api/pqrs.service.ts` — copy it near-wholesale; it is the exact tolerant, frontend-first contract this phase needs, only MORE gated.**

Copy verbatim:
- The `isEndpointUnavailable` gate (`pqrs.service.ts:35-40` — 404/403/0), the canonical idiom (also in `lease-documents.service.ts:67`, `agent-contact.service.ts:64`, `tenant-payment-requests.service.ts:23`).
- `listMine()` → `[]` on not-live (`pqrs.service.ts:79-86`). **This is the ACUE-01 read** — degrades to zero rows, hub stays "Próximamente", never fabricates.
- `getMine(id)` resolves from `listMine()` (own-only, anti-IDOR, `pqrs.service.ts:94-97`) — **never a raw fetch-by-id**.
- A typed `AcuerdoUnavailableError` (mirror `PqrsUnavailableError` `pqrs.service.ts:47-52`) thrown by the mutating methods so the UI stays on "Próximamente" and never invents an acceptance/plan/paymentUrl.

Methods to add (all currently gated):
- `accept(acuerdoId, { signatureData, otpVerificationToken })` (ACUE-02) → `throw AcuerdoUnavailableError` on not-live. **Never a fake "aceptado".**
- `getCuotaPaymentUrl(acuerdoId, cuotaNumber)` (ACUE-03) → `null` on not-live (mirror `tenant-payment-requests.service.ts:39-50 getReceiptUrl`). The **paymentUrl is server-provided** — the client never builds a checkout amount.
- `requestPremoraPlan(input)` (ACUE-04) → `throw AcuerdoUnavailableError` on not-live. Proposal only; the agent's `requiresHumanReview` gate decides.

**What differs from pqrs.service:** the read route is not just "backend may lag" — the whole tenant-scoped RLS surface is absent, so `[]`/`Unavailable` is the EXPECTED result at ship time (document it in the header, as pqrs.service.ts:5-11 does). Provisional paths (e.g. `/tenant-acuerdos/mine`, `/tenant-acuerdos/:id/accept`) are a one-line change when the `agent` lands the routes.

**⚠️ Auth note (do NOT copy the agency pattern):** the agency hooks (`use-agreement-propose.ts:124`, `use-payment-plan-approval.ts:186`) call `NEXT_PUBLIC_AGENT_URL/api/agency/:agencyId/...` with `agentAuthHeaders()`. A **tenant has no `agency.id`** and must not hit an agency-scoped route. Route the tenant contract through `apiClient` (→ `NEXT_PUBLIC_BACKEND_URL`, the BFF) exactly like `agent-contact.service.ts:9-12` / `pqrs.service.ts`, OR a future tenant-scoped `agent` route — the planner should flag the tenant RLS route as the external seam, not repurpose the agency path.

---

### 3. `src/lib/hooks/use-tenant-acuerdos.ts` (hook, request-response) — NEW

**Analog:** `useMyPaymentRequests` (`useLeases.ts:231-267`) and the v7-06 `useTenantPqrs` (`use-tenant-pqrs.ts`) — identical shape: `useState` list + `isLoading` + `error`, `fetch` in `useCallback`, `catch → setError + setList([])`, `useEffect(fetch)`, return `{ items, isLoading, error, refetch }`. Source is `tenantAcuerdosApi.listMine()`. Optionally add `useVisibilityPolling(refetch, 30_000, !isLoading)` (as `use-tenant-cases.ts:262`). This hook is then composed into `use-tenant-cases.ts` (#9).

---

### 4. `src/app/inquilino/acuerdos/page.tsx` (page, list) — NEW

**Analogs:**
- **Tenant page shell + gates:** `casos/page.tsx:196-234` (Spinner loading gate → `useOnboardingStatus` + `CompleteProfileFirst` → error `EmptyState` → `min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]` + `max-w-7xl` + framer `motion`). Canonical; also `solicitudes/page.tsx`.
- **Empty / "Próximamente":** `@/components/ui/empty-state` `EmptyState` (icon/title/description/action) + the tenant `ProximamenteSection` inline component (`casos/page.tsx:151-181`). At ship time this list is EMPTY (`listMine()→[]`) → render an honest "Próximamente"/all-clear state, **not fabricated acuerdos**.
- **Acuerdo/cuota presentation (when data exists):** the agency `AcuerdoPropuestoCard` desglose (`cobranza/acuerdos/page.tsx:196-238` — deuda total / pago inicial / saldo / valor por cuota in `tabular-nums`) and the cuota list (`:702-728` — `Cuota N · fecha` + `amountCop`). Reuse the layout/labels so tenant ≡ agency vocabulary; strip the agency-only actions.

**What differs:** tenant-side, read-only, own-scoped (`listMine`), no approve/edit affordances. A "Solicitar un plan de pago" CTA opens the request-plan modal (#7). Neutral tone only (see Shared Patterns).

---

### 5. `src/app/inquilino/acuerdos/[id]/page.tsx` (detail) — NEW, or fold into `casos/[caseId]`

**Analog:** `casos/[caseId]/page.tsx` — own-list `.find(x => x.id === params.id)` resolution (anti-IDOR; never fetch-by-raw-id), unknown id → honest "no encontrado" `EmptyState`, `PlanActivityTimeline` for milestones from source timestamps only. Reuse wholesale.

**Detail contents (all gated until data exists):**
- Cuota plan table (from `installments[]`, #1) with per-cuota status + a **"Pagar cuota"** button (ACUE-03, #6) that is disabled/"Próximamente" while `getCuotaPaymentUrl()` returns `null`.
- **"Aceptar acuerdo"** affordance (ACUE-02, #6-accept) visible only when the plan `status` is agency-approved-and-unaccepted (`acceptedAt === null`), opening the sign modal (#6a). Never auto-accept.
- Timeline: `offeredAt` → `acceptedAt` → per-cuota `paidAt` (real timestamps only, no synthesis).

**Decision for the planner:** a dedicated `/inquilino/acuerdos/[id]` keeps the accept/pay actions off the generic caso timeline (cleaner), while `casos/[caseId]` remains the unified read view. Prefer the dedicated detail for the interactive actions; the caso row `detailLink` can point at it (like `pqrsToCase` points solicitudes at their own list, `tenant-case.ts:272-273`).

---

### 6. Accept-with-signature (ACUE-02) + pay-a-cuota (ACUE-03)

**6a. `src/components/tenant/AceptarAcuerdoModal.tsx` (NEW) — sign to accept**

**Analogs (composed):**
- **Signature capture:** `SignaturePad.tsx` — **fully generic already** (`onChange(dataUrl|null)`, base64 PNG). Reuse **as-is**, no change.
- **Sign + legal-consent + OTP composition:** `SignatureForm.tsx:60-315` — the pattern to mirror: `SignaturePad` + 3 required consent checkboxes (terms / legally-binding / Habeas Data Ley 1581) + a `canSign` gate + `SignaturePayload { otpVerified, signatureData, otpVerificationToken }` (`:15-22`) + the OTP-then-onSign lifecycle (`:82-108`). For an acuerdo, the checkboxes become "acepto las condiciones del acuerdo de pago" etc.
- **Modal shell + Lenis:** `PayRentModal.tsx` — `AnimatePresence` backdrop `fixed inset-0 z-50`, `useLenis().stop()/start()` (mandatory, DESIGN.md §8), `data-lenis-prevent`, header/body/footer, `toast` on error/success. Copy the shell.

**⚠️ The one real build + the gap — generalize `OTPVerification` (`src/components/contract/OTPVerification.tsx`).** Today it is contract-scoped: props `contractId` + `role: ContractOtpRole` (`:16-29`) and it calls `contractsApi.sendOtp/verifyOtp` (`:73, :123`). GAP-ANALYSIS:58 flags exactly this. To reuse for acuerdos, generalize the send/verify to an injected transport (e.g. a `sendOtp`/`verifyOtp` prop pair, or an `entity: { kind:'contract'|'acuerdo', id }` + a resolver), keeping the UI (6-digit inputs, cooldown, Ley 527 note) intact. **The generalization is additive — do NOT break the existing contract-signing flow** (`SignatureForm.tsx:306-312` still passes `contractId`/`otpRole`). The acuerdo OTP send/verify endpoints don't exist → the modal is built, but `accept()` is gated (`AcuerdoUnavailableError` → honest "Próximamente"), never a fake acceptance.

**6b. Pay a cuota (ACUE-03) — reuse the v7-04 Wompi rail, server-resolved amount**

**Analog:** the shipped v7-04 rail — `PayRentModal.tsx` (confirm/cost step + redirect), `src/lib/payments/wompi-rent-session.ts` (`buildWompiCheckoutUrl` `:56-78`, `WompiRentSession` `:43-49`), `src/app/api/inquilino/pagos/wompi-session/route.ts` (server-only integrity, **amount resolved server-side**, period lock).

**Key reuse rule:** the cuota amount, like `route.ts:56-86`'s `monthlyRent`, must be **resolved server-side** — for a cuota it comes from the `agent`'s payment-plan record (`installments[].amountCop` + the plan's `paymentUrl`), NOT from the client. Two shapes are possible:
1. The tenant-scoped `agent` route returns the cuota's ready **`paymentUrl`** (hosted checkout) directly (mirrors the agency approve path `use-payment-plan-approval.ts:252 wompiUrl`). → the client just redirects; no local integrity hash needed. **Preferred** — matches `paymentUrl` in the schema (`agent.ts:3754`).
2. Or a Leasefy-hosted session (like the rent route) that resolves the cuota amount server-side and builds the integrity hash. Reuse `route.ts`/`wompi-integrity.ts` verbatim, swapping `payment-info` lookup for a cuota-amount lookup.

Until the tenant-scoped `agent` route exists, `getCuotaPaymentUrl()` returns `null` → the "Pagar cuota" button is disabled/"Próximamente". **Never fabricate a checkout URL or a cuota amount.** DIAN guardrail carries over (any receipt = "comprobante interno", not "factura").

---

### 7. `src/components/tenant/SolicitarPlanPagoModal.tsx` (ACUE-04) — request a pre-mora plan

**Analog: the agency `CrearAcuerdoForm` + `useAgreementPropose` (`cobranza/acuerdos/page.tsx:290-635` + `use-agreement-propose.ts`)** — but flipped to the tenant as the requester.

Copy the fail-soft propose lifecycle (`use-agreement-propose.ts:107-168`): POST the proposal, `404 → setNotDeployed(true)` (soft notice, form intact, `:138-142`), other errors → readable message, success → a returned draft. The agency form's guardrails to mirror:
- **T-323 "propone, no fija términos":** the agency draft is `requiresHumanApproval: true` and NEVER activates (`use-agreement-propose.ts:14-15, :65`). The tenant request is a **proposal that feeds the agency approval pipeline** — it never sets terms, never auto-approves. Copy the `Info`/primary-soft T-323 notice (`acuerdos/page.tsx:560-567`).
- **The fixed "requiere aprobación humana" affordance** (`acuerdos/page.tsx:309-310, :527-542`) — mirror the read-only/disabled posture; the tenant cannot toggle it off.

**⚠️ PITFALLS 4/5 guardrails (non-negotiable):** the request form must NOT ask **"por qué"** the mora (Ley 2300 art. 7) and must NOT mention centrales de riesgo without the 3-party gate (Ley 1266/2008 + 2157/2021). The agency form's `CONSECUENCIAS` select includes `reportar_centrales` (`acuerdos/page.tsx:283`) — **do NOT copy that select into the tenant form.** The tenant proposes amount/cuotas/first-date only; consequences are the agency's to set.

**Auth/route:** tenant-initiated propose has no route today (agency propose is `agency`-scoped). → gated: `requestPremoraPlan()` sets `notDeployed`/throws `AcuerdoUnavailableError`, form intact, **no fabricated plan**.

---

### 8. `src/lib/types/tenant-case.ts` + `use-tenant-cases.ts` + `casos/page.tsx` (MODIFY) — the caso-hub seam

The v7-03 hub left an explicit forward-compat seam for exactly this phase, and v7-06 already exercised the identical seam for PQRS — **copy the v7-06 move**:
- **`tenant-case.ts`** — `'acuerdo'` already in the union (`:53`, "declared for v7-06/v7-07, contribute zero rows today"). Add a pure total `acuerdoToCase(a): TenantCase` mapper mirroring `pqrsToCase` (`:250-286`): normalize the plan `status`/timestamps only, `detailLink: /inquilino/acuerdos/${id}`, `sourceLink: /inquilino/acuerdos`, `events` from `offeredAt`/`acceptedAt`/cuota `paidAt` timestamps only. **Reuse `CaseTone` (capped at `attention`, `:59`)** — an acuerdo/mora case NEVER reaches an alarm color (PITFALLS 8). No new enum; project the plan `status` verbatim.
- **`use-tenant-cases.ts`** — compose `useTenantAcuerdos` and push its rows in the `useMemo` (`:205-238`) where the comment says *"Forward-ref types (acuerdo/contrato) still contribute ZERO rows"* (`:25-27`, `:232`). Extend `refetch`'s `Promise.all` (`:250-258`) and the `error ??` chain (`:247-248`). When `listMine()→[]`, zero rows → hub stays "Próximamente" (exactly the pqrs behavior, `:230-235`).
- **`casos/page.tsx`** — replace the acuerdos `ProximamenteSection` (`:360-370`) with a real link to `/inquilino/acuerdos` **exactly as v7-06 replaced the PQRS placeholder with the `/inquilino/solicitudes` link** (`:334-358`). `TYPE_ICON` already maps `acuerdo: Handshake` (`:80`). If the tenant-scoped route is still absent at ship, keep the honest posture (link to a page that itself shows "Próximamente") — the point is one honest entry point, not a fake count.

**Guardrail carried from v7-03/06:** normalize source status/timestamps only — NEVER recompute a saldo/status; badge capped at neutral tone; no countdown/urgency/credit-bureau copy (`tenant-case.ts:27-31`).

---

### 9. `src/app/inquilino/layout.tsx` (MODIFY) — nav

Add an "Acuerdos" entry to the nav array (`:31-45`). **Note `Handshake` is already used by "Contratos"** (`:35`) — pick a distinct Phosphor icon (e.g. `ClipboardText` is taken by "Mis casos" `:37`; consider `Scroll`, `Coins`, or `Receipt`). Follow the exact object shape `{ label, href: '/inquilino/acuerdos', icon }` with `locale === 'es' ? 'Acuerdos' : 'Agreements'` inline copy like the "Mis casos"/"Solicitudes" entries (`:37-38`). Place it near "Pagos" (`:36`) since acuerdos are a payment concern.

---

## Shared Patterns

### T-323 / never-auto-approve, never-fix-terms (the phase's legal crux)
**Source:** agency `cobranza/acuerdos/page.tsx` — fixed+disabled "requiere aprobación humana" Switch (`:309-310, :535-541`, `aria-readonly`), disabled Aprobar/Editar/Enviar/Escalar/Rechazar buttons `title="Próximamente"` (`:244-266`), T-323 primary-soft notice (`:560-567`); `use-agreement-propose.ts:14-15,:65` (`requiresHumanApproval: true`, "no persiste un plan vivo, no aprueba, no activa").
**Apply to:** the accept modal (#6a), the request-plan modal (#7), the detail page. The tenant only VIEWS/ACCEPTS/PAYS an **already-agency-approved** acuerdo, or REQUESTS a plan (proposal). Everything off the policy matrix routes through the agent's `requiresHumanReview` gate — **never decided client-side** (GAP-ANALYSIS:41).

### Honest degrade (api-client) — MORE gated here
**Source:** `pqrs.service.ts:35-40` / `agent-contact.service.ts:64-69` `isEndpointUnavailable` (404/403/0) — canonical, replicated across `lease-documents.service.ts:67`, `tenant-payment-requests.service.ts:23`.
**Apply to:** `tenant-acuerdos.service.ts` — `listMine()→[]`, mutations → `AcuerdoUnavailableError`, `getCuotaPaymentUrl()→null`. At ship time these are the EXPECTED results (whole backend absent). NEVER fabricate an acuerdo, cuota, acceptance, plan, or checkout URL. Rethrow every other error.

### Single source of saldo (PITFALLS 9)
**Source:** `tenant-payment-requests.types.ts:2` ("fuente única del historial"); `tenant-case.ts:6-11` ("NEVER recomputes a saldo… normalizes, does not compute"). The agency plan record is the single acuerdo source (`use-payment-plan-approval.ts:118-147 buildView`).
**Apply to:** every peso in the acuerdo UI traces to the plan record via the tenant service. No second saldo engine, no client-side recompute of totals/cuotas.

### Wompi rail reuse (server-resolved amount)
**Source (v7-04):** `wompi-rent-session.ts:56-78 buildWompiCheckoutUrl`, `wompi-session/route.ts:56-96` (server-only secret, **amount resolved server-side**, `runtime='nodejs'`), `wompi-integrity.ts`. Agency approve path returns a ready `wompiUrl`/`paymentUrl` (`use-payment-plan-approval.ts:252`; schema `agent.ts:3754`).
**Apply to:** ACUE-03. Prefer the `agent` returning the cuota `paymentUrl` directly; if Leasefy-hosted, resolve the cuota amount server-side (never from the client). "comprobante interno" DIAN label carries over.

### Reuse SignaturePad as-is; generalize OTP
**Source:** `SignaturePad.tsx` (generic — reuse unchanged); `SignatureForm.tsx:15-108` (compose sign+OTP+consent → `SignaturePayload`); `OTPVerification.tsx:9-11,:73,:123` (contract-hardcoded — **the generalization target**, GAP-ANALYSIS:58).
**Apply to:** the accept modal (#6a). Generalize OTP additively without breaking the contract-signing flow.

### Neutral tone / no-alarm / no dark patterns (Ley 1480, PITFALLS 8)
**Source:** `CaseTone` capped at `attention` (`tenant-case.ts:59`, cannot express alarm); factual labels, no credit-bureau/urgency copy (`:27-31`).
**Apply to:** every acuerdo/cuota status badge, the mora request flow. No red countdown, no guilt copy, no "por qué la mora" field, no central-de-riesgo mention without the 3-party gate (PITFALLS 4/5).

### Tenant page shell + EmptyState + Lenis modal
**Source:** `casos/page.tsx:196-234` (shell/gates), `@/components/ui/empty-state` (tenant EmptyState with `action{label,href}`), `PayRentModal.tsx` (Lenis `useLenis().stop()` + `data-lenis-prevent`, DESIGN.md §8/§17), DESIGN.md §4 sentence-case pill buttons, §16 `es-CO`.
**Apply to:** all new pages + modals. Tenant convention = inline `locale === 'es' ? … : …` copy (NOT agency `t()` i18n keys).

---

## No Analog Found (gaps — planner should note)

| File / capability | Role | Data Flow | Reason → planner action |
|-------------------|------|-----------|-------------------------|
| **Generalized `OTPVerification`** | component | request-response | Today hardcoded to `contractId` + `contractsApi.sendOtp/verifyOtp` (`OTPVerification.tsx:9-11,:73,:123`). No entity-agnostic OTP exists. → **generalize additively** (inject send/verify transport or an `entity` descriptor) without breaking contract signing. The acuerdo OTP endpoints themselves are gated. |
| **Tenant-scoped acuerdo read/accept/pay routes + RLS on `agent`** | backend | — | The HARD cross-repo dep. All agency acuerdo hooks are `/api/agency/:agencyId/...` (`use-payment-plan-approval.ts:186`, `use-agreement-propose.ts:124`) — not tenant-reachable (no `agency.id`, no tenant RLS). → contract-first: tenant service targets provisional tenant routes via the BFF; real data lands when `agent` ships tenant RLS. **This is why v7-07 is LAST.** |
| **Tenant-initiated propose route (ACUE-04)** | backend | — | Agency propose is `POST /api/agency/:agencyId/cobranza/agreements/propose`. No tenant-initiated equivalent. → gated `requestPremoraPlan()` with `notDeployed` fail-soft; feeds the agency approval pipeline once the route exists. |
| **Cuota `paymentUrl` for a tenant (ACUE-03)** | backend | request-response | `paymentUrl` exists agency-scoped (`agent.ts:3754`) but not via a tenant route. → `getCuotaPaymentUrl()→null` until the tenant route serves it; reuse the v7-04 rail behind it. |

---

## Metadata

**Analog search scope:** `src/app/panel/inmobiliaria/ai/cobranza/acuerdos/**` + `pagos/planes/**` (agency acuerdos posture), `src/lib/hooks/cobranza/**` (use-agreement-propose, use-payment-plan-approval), `src/lib/api/generated/{cartera,agent}.ts` (payment-plan schema), `src/components/contract/**` (SignaturePad, OTPVerification, SignatureForm), `src/lib/api/**` (pqrs.service, pqrs.types, tenant-payment-requests.service, agent-contact.service, agent-auth, client), `src/lib/hooks/**` (use-tenant-cases, use-tenant-pqrs, useLeases), `src/lib/types/tenant-case.ts`, `src/lib/payments/**` (wompi-rent-session), `src/app/api/inquilino/pagos/wompi-session/route.ts`, `src/app/inquilino/{casos,solicitudes,pagos}/**` + `layout.tsx`, `.planning/research/portal-inquilino/GAP-ANALYSIS.md`, prior PATTERNS v7-03/04/05/06.
**Files read end-to-end:** `cobranza/acuerdos/page.tsx`, `use-agreement-propose.ts`, `use-payment-plan-approval.ts`, `OTPVerification.tsx`, `SignatureForm.tsx`, `SignaturePad.tsx`, `agent-contact.service.ts`, `tenant-case.ts`, `use-tenant-cases.ts`, `pqrs.service.ts`, `pqrs.types.ts`, `tenant-payment-requests.service.ts`, `wompi-rent-session.ts`, `wompi-session/route.ts`, `agent-auth.ts`, `cartera.ts`; targeted: `agent.ts` (CarteraPaymentPlanDetailResponse schema), `casos/page.tsx` (acuerdos ProximamenteSection), `inquilino/layout.tsx` (nav), GAP-ANALYSIS acuerdos rows.
**Pattern extraction date:** 2026-07-19
**Read-only:** no source files modified; this PATTERNS.md is the only write.
