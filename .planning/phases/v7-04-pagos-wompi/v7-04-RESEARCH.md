# Phase v7-04: Pagos Reales (Wompi) — Research

**Researched:** 2026-07-18
**Domain:** Real Wompi/Bold hosted-checkout rent payment (server-side integrity + amount), payment history + "comprobante interno", tokenized autopago; replaces `/pse-mock`.
**Confidence:** HIGH (in-repo grounding — Wompi route, PSE seam, payment contracts all read at file:line); MEDIUM (backend-gated pieces — no rent webhook / prod gateway exists yet, verified by absence).

## Summary

The repo already ships a **working Wompi hosted-checkout precedent** for avalúos: a server-only route (`src/app/api/avaluo/wompi-session/route.ts`) computes the integrity hash with a server-only secret, and a client `WompiPayButton` (`src/components/avaluo/WompiPayButton.tsx`) redirects to `checkout.wompi.co`. v7-04 clones that pattern for rent. The **frontend half is real-today**; the pieces that make a payment *actually count* (productive gateway, webhook that writes `TenantPaymentRequest`, receipt PDF, tokenized autopago) are **backend-gated → honest "Próximamente"/"confirmando"** — never a fake "pago exitoso" on a real tenant's path.

The single most important delta vs. the avalúo precedent: the avalúo route **hardcodes** the amount (`5_000_000`, line 35) — it doesn't trust the client, but it also doesn't resolve a per-entity amount. Rent is variable (`lease.monthlyRent`), so the new route MUST resolve the authoritative amount **server-side under tenant auth**, never from a client-sent number. The codebase already has the exact auth-forwarding pattern for this in `src/app/api/docs/[documentId]/route.ts` (forwards the tenant `Authorization` header to NestJS). Combine the two: wompi-session route (integrity) + docs-route auth-forward (amount from `payment-info`).

**Primary recommendation:** Build `POST /api/inquilino/pagos/wompi-session` modeled 1:1 on the avalúo route, but (a) forward the tenant JWT and resolve `amountInCents` from NestJS `GET /leases/:id/payment-info` server-side, (b) rent-namespace the `reference` (`rent-{leaseId}-{year}-{month}`), (c) enforce the period lock (`currentPeriodStatus ∈ {NONE,REJECTED}`) before issuing a session. Replace the PSE process-step inside the shared `PayRentModal` with a "confirm total → redirect to Wompi" step; the redirect-return page shows an honest "confirmando tu pago" (pending) state and polls — it does NOT write "paid."

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Integrity hash + secret | Frontend Server (Next route) | — | Secret must never reach browser; `node:crypto` needs `runtime='nodejs'` |
| Authoritative rent amount | API / Backend (NestJS `payment-info`) | Next route (proxy w/ tenant JWT) | Anti-tamper: amount is server-owned, never client-sent |
| Hosted checkout + redirect | CDN (checkout.wompi.co) | Browser (WompiPayButton) | Wompi owns the card/PSE/Nequi form; we only redirect |
| Payment confirmation / reconciliation | API / Backend (webhook) | — | Redirect params are client-controlled; only a webhook may write `TenantPaymentRequest` |
| Balance / mora / history (single source) | API / Backend (`tenant-payment-requests`, `payment-info`) | Browser (render only) | PITFALLS 9 — one source of truth, UI never computes a second number |
| Receipt "comprobante interno" PDF | API / Backend (signed URL) | Browser (download) | Same signed-URL discipline as v7-02 docs |
| Tokenized autopago | API / Backend (token store + scheduler) | Browser (config UI) | Recurring charge + PCI token storage is backend-owned |

## User Constraints (from ROADMAP / REQUIREMENTS — no CONTEXT.md yet)

### Locked (milestone guardrails, non-negotiable)
- **PAGO-05 single-source saldo** — balance/mora traces to `tenant-payment-requests` / `payment-info`; UI never computes its own number. `[CITED: REQUIREMENTS.md:13,86; PITFALLS.md Pitfall 9]`
- **DIAN label** — portal-generated PDF is **"comprobante interno"**, never "factura", until FE-DIAN (FACT module) exists. `[CITED: ROADMAP.md:99; PITFALLS.md Pitfall 10]`
- **Server-side amount** — route resolves the amount; client-sent amount is never trusted. `[CITED: ROADMAP.md:98]`
- **No dark patterns** — neutral mora (no guilt/countdown), total cost shown BEFORE method choice, no high-fee method pre-selected. `[CITED: PITFALLS.md Pitfall 8; UX Pitfalls table]`
- **Additive-only** — reuse `tenant-payment-requests` contract; don't fork a 4th "saldo"/"paid" notion. `[CITED: CLAUDE.md; PITFALLS.md Pitfall 9]`

### Claude's Discretion
- Whether the new checkout UX is a redesigned `PayRentModal` step or a dedicated confirm screen (both feasible; modal is the smaller change and is the shared seam).
- The exact rent `reference` scheme (must be rent-namespaced + idempotent per period).

### Deferred / Out of Scope
- Real DIAN factura electrónica (FE-DIAN / FACT module). `[CITED: PITFALLS.md Pitfall 10]`
- A portal-owned payment/collections engine — lives in `agent`. `[CITED: REQUIREMENTS.md:60]`

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAGO-02 | Pay via real Wompi (PSE+card+Nequi) hosted checkout, amount server-side, replace `/pse-mock` | Avalúo route + WompiPayButton precedent (below); PSE seam mapped |
| PAGO-03 | Payment history + download "comprobante interno" PDF | History already real (`useMyPaymentRequests`); PDF = signed-URL (v7-02 pattern), backend-gated |
| PAGO-04 | Configure/change/cancel tokenized autopago | Fully backend-gated → UI + contract + "Próximamente" |
| PAGO-05 | Single-source saldo; total cost before method; no dark patterns | Page already traces to `payment-info` (v7-01); design guardrails frontend-satisfiable |

## Standard Stack

No new npm installs. Wompi is redirect-based (no SDK); integrity uses the Node builtin `node:crypto`. `[VERIFIED: src/app/api/avaluo/wompi-session/route.ts:8]`

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` (builtin) | — | SHA-256 integrity hash server-side | Already used by avalúo route (line 8,40) |
| Wompi Web Checkout | hosted (`checkout.wompi.co/p/`) | PSE + card + Nequi form | Redirect model; no package. `[VERIFIED: WompiPayButton.tsx:51]` |
| `next` route handler (`runtime='nodejs'`) | 14 | Server-only secret + hash | `runtime='nodejs'` mandatory for `node:crypto`. `[VERIFIED: wompi-session/route.ts:10]` |

## Package Legitimacy Audit

**N/A — this phase installs no external packages.** Integrity uses the `node:crypto` builtin; checkout is a redirect (no SDK). No slopcheck run required.

## Key Findings (decision-oriented, cite file:line)

### 1. Wompi integrity + secret handling — invariants the rent route MUST preserve
From `src/app/api/avaluo/wompi-session/route.ts`:
- **Secret is server-only.** Route reads `process.env.WOMPI_INTEGRITY_SECRET` + `WOMPI_PUBLIC_KEY` (lines 27-28) — **no `NEXT_PUBLIC_` prefix** (banner comment lines 1-5). Verified no `NEXT_PUBLIC_WOMPI*` anywhere in `src` or env. `[VERIFIED: grep — NONE FOUND]`
- **Hash algorithm (exact):** `sha256( reference + amountInCents + currency + integritySecret )`, **no separators**, hex digest (lines 40-42). The rent route must use the same concatenation order.
- **`publicKey` is safe to return to the client** — it is a *public* key, returned in the JSON and used in the checkout URL. Only the *integrity secret* stays server-side. `[VERIFIED: route.ts:44 → WompiPayButton.tsx:38-44]`
- **`runtime = 'nodejs'`** (line 10) required — do not run on Edge.
- **Checkout URL param is `signature:integrity`** (not `&integrity=`). The shipped `WompiPayButton.tsx:59` is authoritative over the older 34-RESEARCH.md draft which wrote `&integrity=`. `[VERIFIED: WompiPayButton.tsx:51-62]`

**Security invariants for the new route (do NOT violate):** (1) secret never `NEXT_PUBLIC_`, never in client bundle; (2) hash computed only server-side; (3) `runtime='nodejs'`; (4) return only `{reference, amountInCents, currency, integrity, publicKey}` — never the secret; (5) rent-namespace the reference so rent and avalúo transactions never collide in reconciliation.

### 2. Server-side amount resolution (anti-tamper) — the one real delta
- The avalúo route **hardcodes** `amountInCents = 5_000_000` (line 35) — safe (no client input) but not applicable to variable rent.
- Authoritative rent amount lives at NestJS **`GET /leases/:leaseId/payment-info` → `monthlyRent`** plus `currentPeriod {month,year}` and `currentPeriodStatus` (the period lock). `[VERIFIED: leases.types.ts:64-85]`
- That endpoint is **tenant-authed (JWT)**. A Next route handler runs server-side and does **not** have the client's in-memory token (`apiClient._accessToken` is a browser module-level var, `client.ts:9`). So the client must **forward its `Authorization: Bearer <token>`** to the route, and the route forwards it to NestJS — exactly the pattern already shipped in `src/app/api/docs/[documentId]/route.ts:19-23` (reads `req.headers.get('authorization')`, forwards to backend).
- **Recommended route flow:** receive `{leaseId}` + tenant JWT → `GET /leases/{leaseId}/payment-info` server-side → read `monthlyRent`, assert `currentPeriodStatus ∈ {NONE,REJECTED}` (else 409, period already paid/pending) → compute `amountInCents = monthlyRent * 100` → hash → return. The client is never trusted for the amount.
- **Contract point / unknown:** confirm NestJS accepts the forwarded Supabase JWT on `payment-info` from a server origin (CORS/origin not an issue server-to-server, but token audience must be valid). If backend later prefers a server-to-server secret, that's a contract change — flag, don't route around by trusting the client.

### 3. `/pse-mock` reality — the exact seam to replace
- The current payment UI is the shared **`PayRentModal`** (`src/components/tenant/PayRentModal.tsx`), rendered from **two** entry points: `inquilino/pagos/page.tsx:464` and `inquilino/arriendo/[leaseId]/page.tsx`. Replacing the seam once updates both. `[VERIFIED: grep PayRentModal]`
- Flow today: `getBanks()` → `GET /pse-mock/banks`; `processPayment(dto)` → `POST /pse-mock/process` (`pse-payments.service.ts:17-31`). Deterministic mock: last digit of document → 0/1 FAILURE, 9 PENDING, 2-8 SUCCESS (`pse-payments.types.ts:1-8`). On SUCCESS the backend auto-creates a `TenantPaymentRequest` PENDING_VALIDATION and returns `paymentRequestId` (`pse-payments.service.ts:4-5`).
- **Tamper note in the current DTO:** `PayRentModal.handleProcess` sends `amount: paymentInfo.monthlyRent` from the client (`PayRentModal.tsx:174`); the DTO type marks `amount?` optional/"default lease.monthlyRent" (`pse-payments.types.ts:23`). The Wompi replacement must drop client `amount` entirely and let the route resolve it.
- **The seam:** the modal's `form` → `processing` → `result` steps (in-page PSE form) get replaced by a **"confirm total → redirect to hosted checkout"** step (WompiPayButton behavior). Keep the pre-flight `period-blocked` / `confirm` steps (they use `payment-info`, which stays). Do not design error UX around the 3 mock buckets — use real PSE/card failure taxonomy on the return page. `[CITED: PITFALLS.md Integration Gotchas — pse-payments.service.ts]`

### 4. Real-today vs backend-gated — per PAGO criterion

| Criterion | Real-today (frontend) | Backend-gated → honest state |
|-----------|----------------------|------------------------------|
| **PAGO-02** pay w/ Wompi | ✅ `POST /api/inquilino/pagos/wompi-session` (integrity, server-side amount via JWT-forward) + WompiPayButton redirect + PSE-seam swap | Wompi **PRODUCTIVO** enabled for rent (env keys); **webhook** that writes `TenantPaymentRequest`. Return page shows "confirmando tu pago" (pending) — **never** "pago exitoso" from redirect params |
| **PAGO-03** history + PDF | ✅ history renders now from `useMyPaymentRequests` (real); "comprobante interno" label | PDF download endpoint / signed URL (v7-02 `useSignedDocUrl` pattern). No generation endpoint today → "Próximamente" for the PDF; `hasReceipt` flag exists (`tenant-payment-requests.types.ts:32`) |
| **PAGO-04** autopago | ✅ config/cancel UI + api-client contract | Wompi tokenization + token store + recurring scheduler = fully backend. Ship UI + "Próximamente" |
| **PAGO-05** single-source + cost transparency | ✅ page already traces saldo to `payment-info` (v7-01); neutral mora; show `monthlyRent` before method; no pre-selected method | Per-method fee/cuota-de-manejo **not modeled** (`adminFee` is `@deprecated`, `leases.types.ts:41`) — see guardrail 5 |

### 5. Guardrails that change implementation (concrete do/don't)

- **Single-source saldo (PITFALLS 9 / PAGO-05):** DO render `monthlyRent` + `currentPeriodStatus` from `payment-info`, and history from `tenant-payment-requests`. DON'T compute a second "saldo"/"total owed" number, DON'T cache a local "paid" flag. The redirect return is not a source of truth — only the backend webhook + landlord validation flip status.
- **Cost transparency (PITFALLS 8 / PAGO-05):** DO show the full amount the tenant will pay **before** they pick a method. DON'T fabricate a "cuota de manejo" or per-method PSE/card surcharge line — **no surcharge field exists in `payment-info` today**; inventing one is itself a dark pattern. If Wompi charges a method fee, it appears on Wompi's own checkout. DON'T pre-select the highest-fee method; if offering method hints, default to the lowest-cost (PSE).
- **Neutral mora (PITFALLS 8):** DO use neutral factual copy ("Saldo pendiente: $X, vence el Y"). DON'T use red pulsing "EN MORA" badges, countdowns, urgency, or "última oportunidad." Note the existing pagos page already uses a mild amber `daysUntil <= 3` highlight (`pagos/page.tsx:607`) — keep it factual, no escalation.
- **DIAN label (PITFALLS 10 / PAGO-03):** DO label any generated PDF **"comprobante interno."** DON'T label it "factura" or "Descargar factura"; real factura = FE-DIAN, out of scope.
- **Anti-tamper amount (PAGO-02):** DO resolve amount server-side from `payment-info`. DON'T accept a client `amount` in the wompi-session body.

## Runtime State Inventory (replacing `/pse-mock`)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `TenantPaymentRequest` rows created by pse-mock SUCCESS (PENDING_VALIDATION) | None to migrate — real Wompi creates the same shape via webhook; keep the contract |
| Live service config | Wompi keys (`WOMPI_INTEGRITY_SECRET`, `WOMPI_PUBLIC_KEY`) — currently avalúo-only | Confirm same keys serve rent OR add rent-scoped keys; **rent-namespace the reference** to avoid reconciliation collision |
| OS-registered state | None | None |
| Secrets/env vars | Server-only Wompi secret (no `NEXT_PUBLIC_`), verified absent from client | Add `WOMPI_EVENTS_SECRET` (webhook signature) when backend webhook lands — backend-side |
| Build artifacts | None | None |

## Common Pitfalls

### Pitfall 1: Writing "paid" from the redirect return params
**What goes wrong:** Wompi redirects back with `?id=&status=APPROVED` (client-controlled); trusting it to mark the period paid lets a tenant forge success.
**How to avoid:** Return page shows an informational toast (like `avaluo/estado/.../page.tsx:29-42`) + optimistic "confirmando" state, then **polls** `payment-info`/`useMyPaymentRequests`. The authoritative `APPROVED` only comes from the backend webhook + landlord validation.
**Warning signs:** any `TenantPaymentRequest` written or status flipped on the client after redirect.

### Pitfall 2: Fabricating a fee breakdown for "cost transparency"
**What goes wrong:** To "show total before method," a dev invents a cuota-de-manejo/surcharge line — but no such field exists (`adminFee` deprecated). A fake number is a dark pattern and can mis-charge.
**How to avoid:** Show only the real `monthlyRent`. Fees, if any, are Wompi's and shown on Wompi's checkout.

### Pitfall 3: Reusing avalúo's hardcoded-amount shortcut for rent
**What goes wrong:** Copying the route verbatim leaves the amount hardcoded or accepts it from the client.
**How to avoid:** Resolve from `payment-info` under forwarded tenant JWT (docs-route pattern) + enforce period lock.

## Code Examples

### Server route shape (rent) — models avalúo route + docs-route auth-forward
```typescript
// src/app/api/inquilino/pagos/wompi-session/route.ts  (to build)
// Source: avaluo/wompi-session/route.ts:26-44 + docs/[documentId]/route.ts:19-23
export const runtime = 'nodejs'
export async function POST(req: Request) {
  const { leaseId } = await req.json()
  const authorization = req.headers.get('authorization') ?? ''      // forward tenant JWT
  const info = await fetch(`${BACKEND_URL}/leases/${leaseId}/payment-info`,
    { headers: { Authorization: authorization } }).then(r => r.json())
  // assert info.currentPeriodStatus ∈ {NONE,REJECTED} else 409 (period lock)
  const amountInCents = info.monthlyRent * 100                       // SERVER-resolved
  const currency = 'COP'
  const reference = `rent-${leaseId}-${info.currentPeriod.year}-${info.currentPeriod.month}` // rent-namespaced
  const integrity = createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`)
    .digest('hex')
  return NextResponse.json({ reference, amountInCents, currency, integrity, publicKey: process.env.WOMPI_PUBLIC_KEY })
}
```

## Security Domain

Payments are security-critical; `security_enforcement` absent = enabled.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Amount + period resolved under tenant JWT; tenant sees only own lease |
| V5 Input Validation | yes | Reject client `amount`; validate `leaseId`; assert period lock |
| V6 Cryptography | yes | SHA-256 integrity via `node:crypto` server-side; secret never client-side |
| V13 API/Webhook | yes (backend) | Wompi webhook must verify `WOMPI_EVENTS_SECRET` before writing state |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Client tampers with amount | Tampering | Server-side amount from `payment-info`; no client `amount` accepted |
| Forged "paid" via redirect params | Spoofing | Only backend webhook writes `TenantPaymentRequest`; redirect = display only |
| Integrity secret leak | Info disclosure | No `NEXT_PUBLIC_`; hash server-only; `runtime='nodejs'` |
| Double-pay a period | Tampering | Period lock (`currentPeriodStatus`) + idempotent rent-namespaced `reference` |

## Validation Architecture

Framework: **vitest** (`vitest.config.ts` present; `*.test.tsx` in `src/lib/hooks`). `[VERIFIED]`

| Req | Behavior | Test type | Command |
|-----|----------|-----------|---------|
| PAGO-02 | wompi-session returns integrity, resolves amount server-side, rejects client amount | unit (route) | `vitest run` on new route test — Wave 0 |
| PAGO-05 | UI shows single-source saldo, no fabricated fee, neutral mora | unit (component) | existing pagos render test extended |

**Wave 0 gap:** route unit test for `/api/inquilino/pagos/wompi-session` (assert: no client `amount` trusted, 409 on non-payable period, hash order matches Wompi spec).

## Risks / Unknowns

| Risk / Unknown | Finding | Recommended approach |
|----------------|---------|----------------------|
| Does avalúo route trust a client amount? | **No** — hardcoded `5_000_000` (route.ts:35). Safe precedent, but not variable-amount. | Rent route resolves amount server-side from `payment-info` |
| Can the Next route auth to NestJS server-side? | Token is browser-only (`client.ts:9`); docs route already forwards `Authorization` header (docs route:19). | Forward tenant JWT from client → route → NestJS `payment-info` |
| Is there a rent webhook? | **No** — only `wompi-session` + `docs` routes exist; no webhook in `src/app/api`. | Backend-gated: return page = "confirmando"/pending; webhook is a NestJS dependency |
| Is Wompi PRODUCTIVO enabled for rent? | Keys exist for avalúo; prod enablement for rent unverified. | Treat prod gateway as external dep; rent-namespace reference; ship checkout behind the same server route |
| Fee/cuota-de-manejo for cost transparency? | **Not modeled** (`adminFee` deprecated, leases.types.ts:41). | Show only real `monthlyRent`; never fabricate a fee line |
| Receipt PDF generation? | `hasReceipt` flag exists; no generation endpoint found. | Use v7-02 signed-URL contract; "Próximamente" until endpoint exists |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Same `WOMPI_*` keys serve both avalúo and rent | Runtime State / Risks | If rent needs separate keys, route env lookup changes; low risk |
| A2 | NestJS accepts forwarded Supabase JWT on `payment-info` from server origin | Finding 2 | If backend needs a server-to-server secret, amount-resolution contract changes |
| A3 | Rent payment confirmation follows the same `TenantPaymentRequest` PENDING_VALIDATION → landlord-validated lifecycle as pse-mock | Finding 4 | If Wompi auto-confirms, the "confirmando" copy over-promises pending |

## Sources

### Primary (HIGH — in-repo, read at file:line)
- `src/app/api/avaluo/wompi-session/route.ts` — integrity hash, server-only secret, `runtime='nodejs'`
- `src/components/avaluo/WompiPayButton.tsx` — redirect URL, `signature:integrity` param
- `src/app/api/docs/[documentId]/route.ts` — tenant-JWT auth-forward pattern
- `src/components/tenant/PayRentModal.tsx`, `src/app/inquilino/pagos/page.tsx` — PSE seam
- `src/lib/api/pse-payments.{service,types}.ts`, `tenant-payment-requests.types.ts`, `leases.types.ts` — contracts
- `src/lib/api/client.ts` — token store (browser-only)

### Secondary (milestone research, distilled)
- `.planning/research/portal-inquilino/PITFALLS.md` — Pitfalls 8 (dark patterns), 9 (single-source saldo), 10 (DIAN)
- `.planning/ROADMAP.md:93-104`, `.planning/REQUIREMENTS.md:10-13,83-86`
- `.planning/phases/34-avaluos-ui/34-RESEARCH.md` — Wompi redirect model, integrity-client-side pitfall

## Metadata
- Standard stack: HIGH — precedent shipped in-repo, no new deps.
- Architecture / seam: HIGH — grounded at file:line.
- Backend-gated pieces: MEDIUM — verified by absence (no webhook/prod route); exact backend contracts pending.
- **Research date:** 2026-07-18 · **Valid until:** ~2026-08-17 (stable; re-check if backend webhook/prod gateway lands).
