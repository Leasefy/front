---
phase: v7-07-acuerdos-pago
plan: 06
wave: 5
status: complete
requirements: [ACUE-03]
commits: [5c8bd524, 8a8c12d9]
build: green
tests: route 10/10; suite 7 pre-existing unrelated (0 new)
---

# Summary — v7-07-06: Pago de cuota del acuerdo (Wompi rail) — ACUE-03

> **Provenance note:** the executor completed both tasks + commits + gates + build, but a transient
> API error (connection closed) killed it during its final message, before it wrote this SUMMARY.
> Reconstructed by the orchestrator from the committed diffs, the security-invariant gates, the
> 10/10 route test, and a clean `pnpm build` (EXIT 0).

## What shipped

ACUE-03: the tenant pays a cuota of an agency-approved acuerdo on the **same v7-04 Wompi rail**, with
the amount resolved **server-side** from the `agent` payment-plan record — the client can never tamper it.

### Task 1 — Cuota Wompi server route (`5c8bd524`)
- `src/app/api/inquilino/acuerdos/wompi-session/route.ts` (new, +111) — `runtime = 'nodejs'`; accepts only
  an **identifier** `{ planId, cuotaNumber }` (**never `body.amount`** — gate = 0); the cuota amount
  originates server-side in `installments[cuotaNumber].amountCop` (or the plan-level fallback) from the
  agent record; the integrity hash is computed in the `import 'server-only'` `wompi-integrity` module
  (secret server-only, **no `NEXT_PUBLIC_WOMPI`** — gate = 0 in the route and repo-wide); the response
  returns only the public checkout fields (never the secret). A tampered amount breaks Wompi's signature.
- `src/app/api/inquilino/acuerdos/wompi-session/route.test.ts` (new, +188) — **10/10 pass**: no `body.amount`,
  server-only secret, server-resolved amount, honest-degrade when the agent plan/paymentUrl isn't live.

### Task 2 — Gated "Pagar cuota" affordance on the acuerdo detail (`8a8c12d9`)
- `src/app/inquilino/acuerdos/[id]/page.tsx` (+147) — a "Pagar cuota" button GATED by `getCuotaPaymentUrl`:
  `null` when the agent route isn't live → the button is **disabled "Próximamente"** (no fabricated
  paymentUrl, no fake charge). On return the UI shows **"confirmando"**, never a client-side
  "pagado"/"factura" (status flips only via the backend webhook + agent record). Cuota amount rendered
  verbatim (reused `CuotaPlanTable`; no `.reduce`/saldo recompute — PITFALLS 9). Sentence-case buttons.

## Security invariants (verified — this plan handles money)

- **Server-resolved amount (anti-tamper)** ✅ — route never reads `body.amount` (gate = 0); amount from the agent record.
- **Secret server-only** ✅ — hash in the `import 'server-only'` module; `0` `NEXT_PUBLIC_WOMPI` in the route and across `src`.
- **runtime = 'nodejs'** ✅ — Node crypto isolated from the client bundle.
- **No premature success** ✅ — "confirmando" on return; `0` `pago exitoso`/`factura` on the detail (comment-stripped).
- **Gated honestly** ✅ — `getCuotaPaymentUrl → null` → disabled "Próximamente"; no fabricated paymentUrl.
- **Anti-IDOR** ✅ — reuses the own-only acuerdo resolution; the route keys off the agent's tenant-scoped record.

## Honesty boundary (accepted, not faked)

- Real cuota settlement = the productive Wompi gateway + the **agent's `cartera/payment-plans` tenant-RLS
  route** returning the cuota `paymentUrl`, + the reconciliation webhook. Absent today → the button is a
  disabled honest "Próximamente"; the route + integrity plumbing are real and unit-tested vs the sandbox shape.

## Build & tests

- `pnpm build` — **green (EXIT 0)**.
- Route test — **10/10**. Full suite — 7 pre-existing unrelated failures (agency AI/cotizador/risk — see
  `deferred-items.md`); **0 new**. Zero new npm packages.

**Commit stack:** `5c8bd524` (route + test) · `8a8c12d9` (gated pay affordance). Local on `plan/v7.0-portal-inquilino`; not pushed.
