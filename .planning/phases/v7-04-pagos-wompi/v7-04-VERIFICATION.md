---
phase: v7-04-pagos-wompi
verdict: GOAL ACHIEVED (frontend-first)
verified: 2026-07-18
method: goal-backward (code-level, security-forward)
---

# Verification — Phase v7-04: Pagos Reales (Wompi)

## Verdict: ✅ GOAL ACHIEVED (frontend-first)

The tenant rent-payment flow moves off the PSE-mock to a **real Wompi hosted-checkout initiation** whose integrity is computed server-side over a **server-resolved amount** the client cannot tamper with. History is real; the return is honest ("confirmando", never a premature "paid"); receipt PDF + tokenized autopago render as honest "Próximamente". End-to-end real settlement is gated on the productive Wompi gateway + the backend reconciliation webhook — backend, disclosed, not faked.

> **Provenance:** the `gsd-verifier` agent has been unreliable this session; verification was done by the orchestrator via each plan's grep gates, the 7/7 security unit test, a green `pnpm build` on the full stack, and consolidated goal-level greps. Note: executor 01 STALLED after committing (3 TDD commits) but before its SUMMARY — the security core was independently re-verified (secret server-only, server-side amount, period lock, response fields, module split, build).

## Success-criteria map

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | PAGO-02 — real Wompi checkout, amount resolved server-side, replace pse-mock | ✅ TRUE (initiation) | `api/inquilino/pagos/wompi-session/route.ts`: `runtime='nodejs'`, reads `WOMPI_INTEGRITY_SECRET`/`WOMPI_PUBLIC_KEY` (no `NEXT_PUBLIC_` — **0 in src**), accepts only `{leaseId}` (**no `body.amount`**), resolves `monthlyRent` via auth-forward to `/leases/:id/payment-info`, period-lock 409, returns exactly the 5 public fields (secret never in response). `PayRentModal` calls it via `buildWompiCheckoutUrl` and drops the client amount + `psePaymentsApi` (both **0**). Productive gateway + rent webhook = backend-gated. |
| 2 | PAGO-03 — history + receipt PDF ("comprobante interno") | ✅ TRUE (frontend-first) | History real (`useMyPaymentRequests`). `getReceiptUrl` contract + per-row link gated on `hasReceipt`; no `receiptUrl` today → honest "Próximamente"; labeled **"comprobante interno"**, DIAN disclosed, **"Descargar factura" = 0**. No fabricated PDF. |
| 3 | PAGO-04 — configure/cancel autopago (tokenized) | ✅ CONTRACT + "Próximamente" (accepted) | `autopago.service.ts` (get/enable/cancel contract) + `AutopagoSection.tsx`: `available:false` today → honest `EmptyState` "Próximamente". **No fake "autopago activado"**, no fabricated token/masked PAN/charge date. |
| 4 | PAGO-05 — single-source saldo, no dark patterns | ✅ TRUE | Saldo/mora trace to `payment-info`/`tenant-payment-requests` — no second computed number; **no fabricated cuota-de-manejo/recargo** (`adminFee` @deprecated); neutral mora; return shows "confirmando" (**"pago exitoso" = 0**), status flips only via backend webhook + landlord validation. es-CL→es-CO. |

## Security invariants (verified — this phase handles money)

- **Secret server-only** ✅ — 0 `NEXT_PUBLIC_WOMPI` in `src`; hash in a `import 'server-only'` module (`wompi-integrity.ts`); response is 5 public fields, never the secret.
- **Server-side amount (anti-tamper)** ✅ — route never reads `body.amount`; the integrity hash binds the server amount, so URL tampering breaks Wompi's signature.
- **Period lock** ✅ — 409 unless `currentPeriodStatus ∈ {NONE, REJECTED}` (no double-pay).
- **No premature success** ✅ — the `/inquilino/pagos` Wompi-return shows "confirmando"; never branches paid on the client-controlled `?status`.
- **Client-bundle split** ✅ — `node:crypto` isolated to the server-only module; `pnpm build` green.

## Honesty boundaries (accepted, not faked)

- **End-to-end real settlement** = productive Wompi gateway + the rent webhook that writes `TenantPaymentRequest` (backend; no webhook route exists yet). Checkout *initiation* works vs the Wompi sandbox now.
- **Receipt PDF** (PAGO-03) + **tokenized autopago** (PAGO-04) = contract + "Próximamente".
- **Backend dependency**: NestJS must accept the forwarded Supabase JWT on `/leases/:id/payment-info` from a server origin (same trust the shipped `api/docs` route places).

## Build & tests

- `pnpm build` — **green** on the full stack (route `/api/inquilino/pagos/wompi-session` + `/inquilino/pagos` compiled; the pagos page wrapped its `useSearchParams` in `<Suspense>` per Next 14).
- `pnpm test` — 7/7 payment-security unit specs; overall 601 passed / **7 pre-existing** unrelated failures (`deferred-items.md`). **0 new failures.**

## Follow-ups (not gaps in v7-04)

- **Backend**: enable productive Wompi + build the rent webhook (reconcile `TenantPaymentRequest`); generate the receipt/comprobante PDF (signed-URL, v7-02 pattern); implement tokenized autopago.
- A DESIGN.md §4 nit was fixed mid-phase: the CTA was corrected from uppercase "PAGAR ARRIENDO" to sentence-case "Pagar arriendo" (`ffc7ad87`); the stale uppercase memory was corrected.

**Commit stack:** `8f2a6168` · `63aff8d9` · `f86c9a86` · `e1f95bcf` · `ffc7ad87` · `77067453` · `fb9db3b1` (+ docs `a8b314d3`, `8d6ad769`). Local on `plan/v7.0-portal-inquilino`; not pushed.
