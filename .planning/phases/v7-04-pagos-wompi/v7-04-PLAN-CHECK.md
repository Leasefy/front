# v7-04 Pagos Reales (Wompi) — Pre-Execution PLAN CHECK

**Verdict: PASS-WITH-NITS** · Checked 2026-07-18 · 4 plans, goal-backward + payment-security-first · read-only

All source file:line claims + security analogs verified against the real tree. No BLOCKERs.
Every payment-security invariant (2a–2e) rules PASS. Honesty boundaries + no-fabricated-fee PASS.
Wave chain is clean-serial, no shared-file parallel conflict.

## Criterion → Plan map (all 4 delivered)
| Req | Where | Ruling |
|-----|-------|--------|
| PAGO-02 pay w/ Wompi, server-side amount, replace pse-mock | 01 (route+helper+test) + 02 (seam swap) | COVERED |
| PAGO-03 history + comprobante PDF | 03 (history real + getReceiptUrl → "Próximamente") | COVERED (PDF backend-gated, honest) |
| PAGO-04 autopago tokenizado | 04 (contract + UI + "Próximamente") | COVERED (fully backend-gated, honest) |
| PAGO-05 single-source saldo, no dark patterns | 02 + 03 (only real monthlyRent, es-CO, neutral mora) | COVERED |

## Security crux — per-invariant ruling
- **2a Secret server-only — PASS.** Route reads `process.env.WOMPI_INTEGRITY_SECRET`/`WOMPI_PUBLIC_KEY` (no NEXT_PUBLIC_), `runtime='nodejs'`, returns only `{reference,amountInCents,currency,integrity,publicKey}`. Grep gate `grep -rc NEXT_PUBLIC_WOMPI src == 0` is REAL and passes today (verified NONE FOUND). Header-comment avoids the literal token so the gate stays clean.
- **2b Server-side amount (anti-tamper) — PASS (strong).** Route accepts ONLY `{leaseId}`, resolves `monthlyRent` from `/leases/:id/payment-info` via forwarded JWT, `amountInCents=Math.round(monthlyRent*100)`; gate `grep -c body.amount == 0`. Plan 02 REMOVES the client send at `PayRentModal.tsx:173` (`amount: paymentInfo.monthlyRent`, verified) — gate `grep -c "amount: paymentInfo" == 0`. A tampered client cannot influence the charge: route ignores any body amount, and the integrity hash binds the server amount, so mutating `amount-in-cents` in the URL breaks Wompi's signature.
- **2c Pure helper — PASS.** `wompi-rent-session.ts` takes `secret` as a PARAMETER; it never reads env. The secret lives ONLY in route.ts. `computeWompiIntegrity` order pinned by an independently-computed `createHash` digest in the unit test (`reference+amountInCents+currency+secret`, no separators). Client-importable but secret-free.
- **2d Period lock — PASS.** `isPeriodPayable` true only for NONE/REJECTED → 409 otherwise; enum comments confirm (PENDING_VALIDATION/APPROVED = "no puede pagar"). Test covers all 4 statuses; gate checks `409`+`isPeriodPayable`.
- **2e No premature success — PASS (strong).** Plan 03 shows neutral "Estamos confirmando tu pago" regardless of `?status`; NEVER branches on `?status==='APPROVED'`, never prints "pago exitoso" (both grep-gated). Deliberately stricter than the avaluo analog (which maps APPROVED→"Pago recibido"). Status flips only via backend webhook + landlord validation.

## Honesty boundaries + no-fabricated-fee
- Autopago (04) / receipt PDF (03) / prod-gateway = honest "Próximamente"/"confirmando"; no fake "autopago activado/activo" (gated), no fake PDF, "comprobante interno" never "factura" (`descargar factura == 0`, DIAN disclosed). **PASS.**
- PAGO-05: shows only real `monthlyRent`; no invented cuota-de-manejo/recargo (`adminFee` @deprecated confirmed at leases.types.ts:41; gated in 02+03). Single-source saldo; neutral mora (amber `daysUntil<=3` stays factual). **PASS.**

## Wave / conflict
Linear serial chain 01→02→03→04 (each depends_on prev); no cycles/forward-refs. `pagos/page.tsx` edited by 03 (wave 3) AND 04 (wave 4) — SERIAL, 04 is explicitly additive → no conflict. `PayRentModal.tsx` only in 02. Files/plan ≤3; tasks/plan ≤3. **CLEAN.**

## Fixes before execution (ordered — all NITS, none blocking)
1. **(WARNING, executability) node:crypto client-bundle.** Plan 02's `'use client'` PayRentModal imports `buildWompiCheckoutUrl`+type from `wompi-rent-session.ts`, which top-level `import { createHash } from 'node:crypto'`. If `pnpm build` fails resolving `node:crypto` in the client bundle, split: crypto (`computeWompiIntegrity`) → server-only file; URL builder + types → client-safe file. DoD `pnpm build` catches it, but pre-empt to save a revision cycle. (No secret-leak: secret is never in this module.)
2. **(NIT) grep-gate robustness.** `body.amount` and `get('status')==='APPROVED'` gates match one syntax; an executor using a local var (`const s = get('status'); if (s==='APPROVED')`) could slip a gate. Written intent is explicit + correct; rely on the "pago exitoso" gate + manual smoke as backstop.
3. **(NIT) off-by-one line refs.** PayRentModal render is `pagos/page.tsx:465` (plan says 464); client amount is `:173` (correct). Cosmetic.
4. **(NIT) redirect-url** returns to `/inquilino/pagos` even when the pay was launched from `/inquilino/arriendo/:id`; return handling (03) lives only on pagos. Minor UX, not security.

Backend contract dependency (honestly flagged in RESEARCH A2): `/leases/:id/payment-info` must enforce lease ownership on the forwarded JWT — same trust the shipped docs route already places. Not a plan defect.
