---
phase: v7-04-pagos-wompi
plan: 01
subsystem: payments
tags: [wompi, integrity, server-side-amount, period-lock, pago-02, security, node-crypto-split]

# Dependency graph
requires: []
provides:
  - "Server-only route POST /api/inquilino/pagos/wompi-session (server-side amount + period lock + integrity)"
  - "Client-safe helper wompi-rent-session.ts (isPeriodPayable, buildRentReference, buildWompiCheckoutUrl, WompiRentSession)"
  - "Server-only wompi-integrity.ts (computeWompiIntegrity + node:crypto, import 'server-only')"
affects: [v7-04-02, v7-04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wompi rent session copied 1:1 from the avalúo route for hash/secret discipline"
    - "Server-side amount resolution via auth-forward to NestJS /leases/:id/payment-info (docs-route idiom) — never trusts a client amount"
    - "Client-safe vs server-only module split so a 'use client' component can import buildWompiCheckoutUrl without pulling node:crypto into the client bundle"

key-files:
  created:
    - src/lib/payments/wompi-rent-session.ts
    - src/lib/payments/wompi-integrity.ts
    - src/lib/payments/wompi-rent-session.test.ts
    - src/app/api/inquilino/pagos/wompi-session/route.ts

key-decisions:
  - "Split the helper: wompi-rent-session.ts is client-safe (NO node:crypto); computeWompiIntegrity lives in wompi-integrity.ts with import 'server-only' + node:crypto — imported ONLY by the route"
  - "Route accepts only { leaseId }; resolves monthlyRent server-side; never reads body.amount (anti-tamper)"
  - "Period lock: 409 unless currentPeriodStatus in {NONE, REJECTED}"
  - "Response returns exactly { reference, amountInCents, currency, integrity, publicKey } — the integrity SECRET is never in the response"

completed: 2026-07-18
---

# Phase v7-04 Plan 01: Server-only Wompi rent-session route (security core)

**A server-only `POST /api/inquilino/pagos/wompi-session` that resolves the rent amount server-side, enforces a period lock, and computes the Wompi integrity hash with the secret never leaving the server — the security core of PAGO-02.**

## Status

**Complete and verified.** TDD in 3 commits: `8f2a6168` (failing unit tests, RED) → `63aff8d9` (helpers, GREEN) → `f86c9a86` (route). Working tree clean.

> ⚠️ **Provenance:** the gsd-executor STALLED (stream watchdog, 600s) *after* committing all three commits and running its build, but *before* writing this SUMMARY. This summary was reconstructed by the orchestrator from the committed code, the passing unit tests, the security grep checks, and a clean independent `pnpm build`. The code is the executor's committed work, independently re-verified.

## What was built

- **`wompi-rent-session.ts`** (client-safe, NO `node:crypto`): `isPeriodPayable` (NONE/REJECTED only), `buildRentReference` (`rent-{leaseId}-{year}-{MM}`), `buildWompiCheckoutUrl` (hosted-checkout URL with `signature:integrity`), `WompiRentSession` type.
- **`wompi-integrity.ts`** (server-only): `import 'server-only'` + `import { createHash } from 'node:crypto'`; exports only `computeWompiIntegrity` = `sha256(reference + amountInCents + currency + secret)`, no separators, hex.
- **`route.ts`**: `runtime='nodejs'`; reads `WOMPI_INTEGRITY_SECRET` + `WOMPI_PUBLIC_KEY` (no `NEXT_PUBLIC_`); accepts only `{ leaseId }`; forwards the tenant `Authorization` to `GET /leases/:id/payment-info`; period lock → 409; resolves `monthlyRent` server-side (502 on invalid); returns exactly the 5 public fields.
- **Test**: 7 unit specs — hash order pinned by an independently-computed digest, period-lock across all 4 statuses, reference format, checkout URL params.

## Security invariants (independently verified)

- **Secret server-only** ✅ — grep: zero `NEXT_PUBLIC_WOMPI` in `src`; response object (route.ts:96) is exactly `{ reference, amountInCents, currency, integrity, publicKey }` — `integritySecret` (the local var) is never a response key.
- **Server-side amount** ✅ — route never reads `body.amount`; amount = `monthlyRent` from `payment-info` under forwarded tenant JWT.
- **Period lock** ✅ — 409 unless NONE/REJECTED.
- **Client-bundle split** ✅ — `pnpm build` green; `node:crypto` stays out of the client bundle.

## Verification

- `npx vitest run …wompi-rent-session.test.ts` → **7/7 pass**.
- `pnpm build` → **green** (route `/api/inquilino/pagos/wompi-session` compiled).
- `pnpm test` → 0 new failures (~7 pre-existing unrelated, `deferred-items.md`).

## Next

- **v7-04-02** swaps the `/pse-mock` seam: `PayRentModal` POSTs `{ leaseId }` to this route, builds the checkout URL via the client-safe `buildWompiCheckoutUrl`, and redirects — dropping the client `amount`.
- **Backend-gated (out of scope):** productive Wompi gateway + the rent webhook that reconciles `TenantPaymentRequest` (status flips only there, never from the client redirect).
