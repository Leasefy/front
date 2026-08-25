# Phase v7-04: Pagos Reales (Wompi) — Pattern Map

**Mapped:** 2026-07-18
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 8 surfaces (server session route, client pay trigger, pagos page, cost/method chooser, history, receipt PDF, autopago, return/status)
**Analogs found:** 3 exact (route, button, history) / 2 partial (cost UI, return page) / 2 no-analog → contract + "Próximamente" (receipt PDF, autopago)

> **Headline for the planner — read before writing any plan:**
> - **The golden analog is `src/app/api/avaluo/wompi-session/route.ts` (45 lines) — read it once, copy its hash + secret discipline verbatim.** BUT the rent route is **NOT** a 1:1 copy: avaluo has a **hardcoded** price (`5_000_000` cents, `route.ts:35`) and needs **no auth / no backend lookup**. Rent has a **per-lease, per-period amount that the server must resolve from NestJS** and must **authenticate the tenant**. That server-side amount resolution + auth-forwarding is the **one structural addition** v7-04 makes on top of the avaluo skeleton. Everything else (SHA-256 hash formula, server-only secret, response shape, `runtime='nodejs'`) is copied unchanged.
> - **"Reemplaza el `/pse-mock`" is ambiguous in the repo — resolve it now.** There are **two** distinct PSE-mocks. (1) `src/app/pse-mock/page.tsx` is an **agency/landlord plan-subscription** simulator (Flex plans), reached only from `checkout/page.tsx` — **NOT** the tenant rent flow, **out of scope**. (2) The **tenant rent** flow is `PayRentModal` → `psePaymentsApi.processPayment` → backend `POST /pse-mock/process` (a mock PSE gateway). **v7-04 replaces #2**, not #2's page — there is no tenant-facing `/pse-mock` page.
> - **The current rent flow leaks the amount from the client.** `PayRentModal.handleProcess` sends `amount: paymentInfo.monthlyRent` in the DTO (`PayRentModal.tsx:173`). Real Wompi **must drop the client-supplied amount** and resolve it server-side. This is the core PAGO-02 security requirement.
> - **PAGO-05 (single-source saldo + cost transparency + no dark patterns) is pure frontend/UX discipline** — no backend needed. Saldo already traces to `tenant-payment-requests`/`payment-info` (do not add a 4th number — Pitfall 9). Cost breakdown (cuota de manejo / recargo) must show **before** method choice, no high-fee rail pre-selected, no guilt copy on mora (Pitfall 8 + UX pitfall line 226).
> - **Receipt PDF and autopago have NO analog** → same playbook as v7-02/v7-01: UI + api-client contract + honest **"Próximamente"** empty-state. **No fake comprobante, no fake autopago** on a path a real tenant can reach.
> - **DIAN guardrail:** every receipt/comprobante is labeled **"comprobante interno"**, never "factura" (Pitfall 10 — no FE-DIAN yet).

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog (path:line) | Match |
|------------------|------|-----------|----------------------------|-------|
| `src/app/api/inquilino/pagos/wompi-session/route.ts` **(NEW)** | route (server) | request-response + payment integrity | `src/app/api/avaluo/wompi-session/route.ts:1-45` | exact skeleton + **adds auth + server-side amount** |
| `src/components/tenant/WompiPayButton.tsx` **(NEW)** (or extend PayRentModal CTA) | component (client trigger) | request-response → redirect | `src/components/avaluo/WompiPayButton.tsx:21-81` | exact |
| `src/app/inquilino/pagos/page.tsx` **(CHANGED)** — swap PSE modal for Wompi; add cost UI | page/container | request-response (read) + event (pay) | *(itself)* `pagos/page.tsx:227-474` + `PayRentModal.tsx` (flow being replaced) | self / role-match |
| Cost breakdown + method chooser **(NEW section/component)** | component | transform (present) | `PayRentModal.tsx:290-317` (confirm/monto) + `pse-mock/page.tsx:196-212` (merchant/total block) | partial |
| Payment history list | hook + view | request-response (read) | `useMyPaymentRequests()` `useLeases.ts:231` + `pagos/page.tsx:304-407` | exact (REAL) |
| Receipt / "comprobante interno" PDF download | service + component | file-I/O (signed URL) | *(no analog)* → v7-02 signed-URL chain (`contracts.service.ts:214` + `DownloadContractPdfButton.tsx:36-63`) | no-analog → contract + "Próximamente" |
| Autopago config/change/cancel (tokenized) | service + section | CRUD (tokenized subscription) | *(no analog)* → `subscriptions.service.ts` (agency recurring, shape ref only) | no-analog → contract + "Próximamente" |
| Return/status after Wompi redirect | page/effect | request-response (read query) | `src/app/avaluo/estado/[submissionId]/page.tsx:28-42` (`?id`/`?status` toast) | exact |
| Webhook reconciliation → `TenantPaymentRequest` | backend (NestJS) | event-driven | *(out of frontend scope)* | backend-gated |

---

## Pattern Assignments

### 1. Server session route — `src/app/api/inquilino/pagos/wompi-session/route.ts` (NEW)

**Analog: `src/app/api/avaluo/wompi-session/route.ts` — copy the hash + secret discipline exactly. Read all 45 lines once.**

**(a) How the avaluo route builds the integrity hash + keeps the secret server-only + resolves the amount — the safe recipe to copy:**

- **`export const runtime = 'nodejs'`** (`route.ts:10`) — required; the hash uses `node:crypto` `createHash` (`route.ts:8`), unavailable on the Edge runtime.
- **Server-only secret, guarded** (`route.ts:26-32`):
  ```ts
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY
  if (!integritySecret || !publicKey) {
    return NextResponse.json({ error: 'wompi_not_configured' }, { status: 500 })
  }
  ```
  Both are read **without** a `NEXT_PUBLIC_` prefix. The file's header comment (`route.ts:1-5`) states the rule explicitly: *"WOMPI_INTEGRITY_SECRET must NEVER be prefixed NEXT_PUBLIC_ — computing the hash client-side leaks the secret. This route is the single server-side source of the integrity hash."* **Confirmed: no `NEXT_PUBLIC_WOMPI_*` anywhere.** Only `publicKey` is returned to the client (it is public by Wompi's design); the secret never leaves the route.
- **Integrity hash — Wompi spec, no separators** (`route.ts:39-42`):
  ```ts
  const integrity = createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex')
  ```
  SHA-256 of `reference + amountInCents + currency + secret`, concatenated with **no delimiters**, hex digest. Copy this line unchanged.
- **Amount resolution (the ONLY part that must change):** avaluo **hardcodes** `amountInCents = 5_000_000` server-side (`route.ts:35`) and trusts nothing from the client — the body carries only `submissionId` (`route.ts:16`). Response = `{ reference, amountInCents, currency, integrity, publicKey }` (`route.ts:44`), reference = `'avaluo-' + submissionId` (`route.ts:37`).

**(b) What the RENT route must do differently — the server-side amount contract (PAGO-02 core):**
1. Accept `{ leaseId }` (and derive period) in the body — **never accept an `amount` from the client** (drop today's `PayRentModal.tsx:173` anti-pattern).
2. **Authenticate the tenant and resolve the authoritative amount server-side** by calling NestJS `GET /leases/:leaseId/payment-info` (`leases.service.ts:151`) → `BackendPaymentInfo.monthlyRent` (`leases.types.ts:64`). This endpoint is lease-scoped/tenant-checked in NestJS, so it also enforces ownership (reject if the lease isn't the caller's).
3. **Auth-forwarding is the structural add vs avaluo:** the tenant token is a **Supabase access token held in-memory client-side** (`client.ts:9` `_accessToken`, set by AuthProvider) — **not a cookie** — so the Next route cannot read it from `cookies()`. The client must pass `Authorization: Bearer <token>` to this route; the route forwards it to `NEXT_PUBLIC_BACKEND_URL` (`client.ts:1`) to resolve `payment-info`. (Backend contract point — planner should flag it.)
4. Compute `amountInCents = monthlyRent * 100` (+ cuota de manejo/recargo if the amount is defined as inclusive — see §4; the number still comes from the server, never the client).
5. Reference should be rent+lease+period specific and idempotent, e.g. `arriendo-<leaseId>-<year><month>`, so the webhook can reconcile to the correct `TenantPaymentRequest`/period.
6. Same hash line as (a); same `{ reference, amountInCents, currency, integrity, publicKey }` response.

**Env vars (new to this repo — add to `.env`/manifiesto, server-only):** `WOMPI_INTEGRITY_SECRET`, `WOMPI_PUBLIC_KEY`. Reuse `NEXT_PUBLIC_BACKEND_URL` for the payment-info lookup.

---

### 2. Client pay trigger — `src/components/tenant/WompiPayButton.tsx` (NEW)

**Analog: `src/components/avaluo/WompiPayButton.tsx:21-81` — copy verbatim, change the body + redirect target.**

Idioms to copy (all present in the avaluo button):
- `'use client'` + `useState(isLoading)`; header comment reiterates *"integrity comes from server — never computed here."*
- `fetch('/api/avaluo/wompi-session', { method:'POST', body: JSON.stringify({ submissionId }) })` (`:28-32`) → for rent: `POST /api/inquilino/pagos/wompi-session` with `{ leaseId }` **and the `Authorization: Bearer` header** (see §1.b.3).
- Reads `{ reference, amountInCents, currency, integrity, publicKey }` from the response (`:38-45`) — never recomputes the hash.
- Builds the **hosted-checkout URL** (`:50-63`):
  ```
  https://checkout.wompi.co/p/?public-key=…&currency=…&amount-in-cents=…&reference=…&signature:integrity=…&redirect-url=…
  ```
  `redirect-url` is `window.location.origin + '/avaluo/estado/' + submissionId` (`:47-48`) → for rent, `…/inquilino/pagos` (or a dedicated confirmation route), `encodeURIComponent`'d (`:62`).
- `window.location.href = url` (`:64`) — full-page redirect to hosted checkout.
- Failure → Sonner `toast.error(...)` + reset loading (`:65-68`).
- Renders the canonical `Button` primitive (`@/components/ui/button`, `isLoading`) — DESIGN.md §4 (primary CTA uppercase). Copy label as e.g. "PAGAR ARRIENDO".

**Decision for the planner:** either (a) a standalone `WompiPayButton` used directly in the pagos sidebar CTA, or (b) fold the redirect into the existing `PayRentModal` (replace the PSE `handleProcess` `psePaymentsApi.processPayment` call at `PayRentModal.tsx:166-204` with the wompi-session fetch + redirect). Option (b) preserves the confirm/cost step (§4); option (a) is closer to the avaluo analog. Prefer (b) so the cost-transparency step (PAGO-05) survives.

---

### 3. Pagos page — swap PSE modal for Wompi, keep history — `src/app/inquilino/pagos/page.tsx` (CHANGED)

**What is REAL today (verified):** the page already renders the **real** history (`useMyPaymentRequests()`, `:49-51`), the **real** period status/next-payment card from `useLeasePaymentInfo` (`:55-58`), stats (total pagado YTD / pendiente, `:80-86`), pagination, and the `PayRentModal` (`:464-472`). Saldo/next-payment already trace to `tenant-payment-requests` + `payment-info` — **do not introduce a second number** (Pitfall 9; the header comment of `tenant-payment-requests.types.ts:2` declares it "fuente única del historial").

**Changes for v7-04:**
- Replace the `PayRentModal` PSE trigger with the Wompi flow (§2). Keep `handlePayNow`/`handlePaid` (`:125-130`) wiring — after redirect-return, `refetchRequests()` + `refetchPaymentInfo()` re-read the source.
- Add the **cost breakdown + method chooser** (§4) into the confirm step before the redirect.
- **Fix date locale bug:** `formatShortDate` uses `'es-CL'` (`:96`) — change to `'es-CO'` (DESIGN.md §16; same fix v7-02/v7-03 applied).
- **No dark patterns (Pitfall 8):** the "al día"/APPROVED card already uses neutral success copy (`PeriodStatusCard`, `:534-556`) — keep it neutral; do not add "EN MORA" alarm badges or invented urgency. REJECTED shows the backend reason only (`:572-576`).

DESIGN.md: cards/banners §4, EmptyState §11 (the no-lease / no-history states at `:213-221`, `:399-406` already conform), `Button` uppercase §4.

---

### 4. Cost transparency + payment-method chooser — NEW section (PAGO-05 + PAGO-02 multi-rail)

**Partial analog only — no true multi-method (PSE + tarjeta + Nequi) chooser exists yet.**

- **Cost/total presentation analog:** `PayRentModal.tsx:303-317` (confirm step: período + "Monto a pagar" in `font-mono tabular-nums`, `MonoLabel` from `@leasefy/cadence`) and the `pse-mock/page.tsx:196-212` merchant/total block (label "Total" + amount). Reuse the confirm-step layout for the breakdown.
- **PAGO-05 requirements to encode (guardrails, no analog to lean on):**
  - Show **full cost breakdown before the tenant picks a method** — arriendo + cuota de manejo/recargo PSE/tarjeta itemized (UX pitfall line 226: hiding cost until final step is a dark pattern under SIC scrutiny). The **total still comes from the server** amount (§1) — the breakdown is presentational; never let the client compute the charged number.
  - **No pre-selected high-fee rail** (Pitfall 8): if a method carries a higher commission/float, it must **not** be the default selection.
  - **No guilt copy** on mora; neutral/honest states for "al día".
- Wompi hosted checkout itself presents PSE/tarjeta/Nequi on its page, so the in-app chooser is mainly for **cost disclosure per method**; if surcharges differ by rail the server must return them (backend contract). Frontend-first: if per-method surcharge data doesn't exist yet, show a single transparent total + a note, not a fabricated fee table.
- Method enum already exists: `TenantPaymentMethod` (`tenant-payment-requests.types.ts:14-21`) includes `PSE | CREDIT_CARD | DEBIT_CARD | NEQUI` — reuse it, don't fork.

---

### 5. Payment history + receipt "comprobante interno" PDF

**History = REAL (exact analog):** `useMyPaymentRequests()` (`useLeases.ts:231`) → `tenantPaymentRequestsApi.getMine()` → `GET /tenant-payments/requests/mine`, rendered at `pagos/page.tsx:304-407`. Single source of truth; ship as-is.

**Receipt/comprobante PDF = NO ANALOG → contract + "Próximamente"** (identical finding to v7-02 PATTERNS §4/No-Analog): `BackendTenantPaymentRequest` exposes only `hasReceipt: boolean` (`tenant-payment-requests.types.ts:32`) — **no `receiptUrl`**. A downloadable per-payment comprobante PDF **does not exist**.
- **Contract to add:** `tenantPaymentRequestsApi.getReceiptUrl(requestId)` → `{ url, expiresAt }`, modeled on the v7-02 signed-URL chain (`contracts.service.ts:214` `getSignedPdfUrl` + `ContractSignedPdf { url, expiresAt }`). Download via the blob idiom that hides the storage URL (`DownloadContractPdfButton.tsx:36-63`).
- Until the backend serves it → honest **"Próximamente"** on the download action (DESIGN.md §11 `EmptyState`), gated on `hasReceipt`.
- **DIAN label (Pitfall 10):** the artifact is a **"comprobante interno"**, never "factura", until FE-DIAN exists.

---

### 6. Autopago (domiciliación tokenizada) — NO ANALOG → contract + "Próximamente" (PAGO-04)

**Verified: no tenant-facing tokenization/subscription surface exists.** The only recurring-payment code is `subscriptions.service.ts` (agency **Flex plan** subscription via PSE) — a **shape reference only** for "recurring cycle", not a tenant autopago rail; do not repurpose it as tenant data.

**Frontend-first plan (same as v7-01/v7-02 no-analog features):**
- Build the config/change/cancel **UI** + an api-client **contract** (e.g. `autopagoApi.get()/enable(tokenPayload)/cancel()`), + honest **"Próximamente"** empty-state.
- Real autopago depends on **Wompi tokenized payment-source support + backend** (external dep, ROADMAP `v7-04 External deps`). **No fake "autopago activo"** on a real tenant path.
- Cross-repo note: the `agent` already exposes `cartera/payment-plans` → `paymentUrl` (wompi|bold|stub) (GAP-ANALYSIS:55) — that is the **acuerdos** rail (v7-07), not tenant rent autopago; don't conflate.

---

### 7. Return / status after Wompi redirect — `src/app/avaluo/estado/[submissionId]/page.tsx` (analog)

**Analog (`estado/page.tsx:28-42`):** on mount, reads Wompi return query params `?id=` and `?status=` from `useSearchParams()` and shows a Sonner `toast.info` mapping `APPROVED → "Pago recibido"`, `DECLINED → "rechazado, podés intentarlo nuevamente"`, else the raw status. Runs once (`[]` deps + eslint-disable, `:42`).

**For rent:** the `redirect-url` (§2) returns to `/inquilino/pagos` (or a dedicated confirmation route); replicate the `?id`/`?status` toast, then `refetchRequests()`/`refetchPaymentInfo()` to re-read the source of truth. **Do not treat the redirect status as the final paid state** — the "Looks Done But Isn't" checklist (Pitfall line 233) requires reconciliation against `tenant-payment-requests` (webhook, §8), not just a green toast. Interim UI = "en verificación" (the existing `PENDING_VALIDATION` card already models this, `PeriodStatusCard:509-531`).

---

### 8. Webhook reconciliation → `TenantPaymentRequest` — BACKEND-GATED

Rent-specific Wompi/Bold webhook in NestJS that reconciles the confirmed transaction into `TenantPaymentRequest`/`Payment` (and downstream tesorería + agent cobranza ledger — Pitfall 9 lineage `paymentId → treasury → agent balance`). **Out of frontend scope.** The frontend only reads the reconciled state via `useMyPaymentRequests`/`useLeasePaymentInfo`. Planner: name a reconciliation integration test as the acceptance for "paid" (Pitfall 9 recovery).

---

## Shared Patterns

### Wompi integrity + server-only secret (PAGO-02 core)
**Source:** `src/app/api/avaluo/wompi-session/route.ts` — `runtime='nodejs'` (`:10`); `WOMPI_INTEGRITY_SECRET`/`WOMPI_PUBLIC_KEY` read without `NEXT_PUBLIC_`, guarded (`:26-32`); `createHash('sha256').update(`${reference}${amountInCents}${currency}${integritySecret}`).digest('hex')` (`:39-42`); response returns only `publicKey` + hash, never the secret (`:44`). **Rent adds:** drop client amount, resolve `monthlyRent` server-side via `GET /leases/:id/payment-info`, forward tenant Bearer token.

### Single source of truth for saldo (PAGO-05 / Pitfall 9)
**Source:** `tenant-payment-requests.types.ts:2` ("fuente única del historial") + `useMyPaymentRequests` + `useLeasePaymentInfo`. Any saldo/estado shown must trace to these + `paymentId` lineage — never a self-computed or cached number.

### No dark patterns / cost transparency (PAGO-05 / Pitfall 8 + UX line 226)
**Source:** PITFALLS.md §8 + UX pitfalls. Full cost breakdown before method choice; no high-fee rail pre-selected; neutral "al día" states; no invented urgency/guilt on mora. Extend the agent's DO/DON'T honesty checklist to portal screens, not just outbound messages.

### DIAN "comprobante interno" label (Pitfall 10)
**Source:** PITFALLS.md §10 + v7-02 PATTERNS. Every receipt is "comprobante interno", never "factura", until FE-DIAN.

### Signed/expiring URL + blob download (for receipt PDF once real)
**Source (v7-02):** `contracts.service.ts:214` (`getSignedPdfUrl` → `{ url, expiresAt }`) + `DownloadContractPdfButton.tsx:36-63` (blob download hides the Supabase URL). Reuse for the comprobante PDF.

### api-client contract (frontend-first)
**Source:** `src/lib/api/client.ts` + `leases.service.ts`. Typed `apiClient.get/post<T>`; `ApiError(status,message)`; 403/404 → honest empty. New services (`getReceiptUrl`, `autopagoApi`) follow this; missing endpoint → "Próximamente", not a crash.

### DESIGN.md canonical components
`Button` (uppercase primary CTA, `isLoading`, §4) · cards/banners §4 · `EmptyState`/`Spinner` §11 · Dialog z-[300] / modal + Lenis `useLenis().stop()` + `data-lenis-prevent` §8/§17 (PayRentModal already conforms, `PayRentModal.tsx:82-86,258`) · money/date `formatCurrency` + `es-CO` §16 (fix `es-CL` at `pagos/page.tsx:96`).

---

## No Analog Found

| Feature | Role | Data Flow | Reason → planner action |
|---------|------|-----------|-------------------------|
| **Per-payment receipt / comprobante PDF** | download | file-I/O (signed URL) | `tenant-payment-requests` exposes only `hasReceipt: boolean`, no `receiptUrl`. → contract `getReceiptUrl` (v7-02 signed-URL shape) + "Próximamente"; label "comprobante interno". |
| **Autopago tokenizado (config/change/cancel)** | service + section | CRUD (tokenized) | No tenant tokenization surface exists (`subscriptions.service.ts` is agency Flex, shape-only). → UI + api-client contract + "Próximamente"; depends on Wompi token support + backend. |
| **Rent-specific webhook reconciliation** | backend | event-driven | NestJS concern; frontend reads reconciled state only. → name a reconciliation integration test as "paid" acceptance. |
| **Per-method surcharge / cuota de manejo data** | data | request-response | If not returned by backend yet, show transparent single total + note — do not fabricate a fee table. |

---

## PAGO-0x — Frontend-satisfiable NOW vs Backend-gated

| Req | Now (ships in v7-04) | Backend-gated → "Próximamente" / real-behind |
|-----|----------------------|----------------------------------------------|
| **PAGO-02** Wompi pay, server-side amount | New route `/api/inquilino/pagos/wompi-session` (avaluo skeleton + auth + server amount) + client trigger + hosted-checkout redirect. Works vs Wompi **sandbox**. | Wompi/Bold **productivo** enabled for rent + `WOMPI_INTEGRITY_SECRET` in prod + rent webhook reconciliation in NestJS. |
| **PAGO-03** history + receipt PDF | History list = **REAL** (`useMyPaymentRequests`). | Receipt/comprobante PDF (no `receiptUrl` today) → contract + "Próximamente"; "comprobante interno" label. |
| **PAGO-04** autopago tokenized | Config/change/cancel **UI** + api-client contract. | Real tokenization (Wompi payment-source token + backend) → "Próximamente". |
| **PAGO-05** single-source saldo + cost transparency + no dark patterns | **Fully FE-satisfiable** — saldo already traces to source; cost breakdown before method choice; no pre-selected high-fee rail; no guilt copy. | (none — pure frontend/UX discipline) |

---

## Metadata

**Analog search scope:** `src/app/api/avaluo/**` (wompi-session route), `src/components/avaluo/**` (WompiPayButton, AvaluoEstadoCard), `src/app/avaluo/estado/**`, `src/app/inquilino/pagos/**`, `src/components/tenant/**` (PayRentModal), `src/app/pse-mock/**` + `checkout/**` (both PSE-mocks), `src/lib/api/**` (client, leases, tenant-payment-requests, pse-payments, subscriptions), `src/lib/hooks/useLeases.ts`, `.planning/research/portal-inquilino/{GAP-ANALYSIS,PITFALLS}.md`.
**Files read end-to-end:** avaluo/wompi-session/route.ts, avaluo/WompiPayButton.tsx, pse-mock/page.tsx, inquilino/pagos/page.tsx, tenant/PayRentModal.tsx, tenant-payment-requests.types.ts, avaluo/estado page; targeted reads of client.ts, leases.service/types (payment-info), useLeases.ts (hooks), PITFALLS 8/9/10 + UX, GAP-ANALYSIS pagos rows, v7-02 PATTERNS (house style).
**Pattern extraction date:** 2026-07-18
**Read-only:** no source files modified; this PATTERNS.md is the only write.
