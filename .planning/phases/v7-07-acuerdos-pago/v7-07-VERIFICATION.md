---
phase: v7-07-acuerdos-pago
verdict: GOAL ACHIEVED (frontend-first, contract-first)
verified: 2026-07-20
method: goal-backward (code-level, legal-forward, security-forward)
---

# Verification — Phase v7-07: Acuerdos de Pago (LAST)

## Verdict: ✅ GOAL ACHIEVED (frontend-first / contract-first)

The tenant can **view** agency-approved acuerdos with the cuota plan (installments/`totalDueCop` rendered **verbatim** from the `agent`'s single record — no second saldo engine), **accept** one by **signing** (reused `SignaturePad` + a generalized `OTPVerification`, banner "Este acuerdo ya fue **aprobado** por tu inmobiliaria" — the frontend NEVER auto-approves or sets terms), **pay a cuota** on the same v7-04 Wompi rail (amount resolved server-side, never `body.amount`), and **request a pre-mora plan** (proposes, never sets terms; no "por qué la mora", no bureau mention). Because the tenant-scoped RLS routes on the `Leasefy/agent` repo don't exist yet, all acuerdo/cuota DATA + the accept/pay/request settlement are honest **"Próximamente"** (contract-first) — **no fabricated acuerdo/cuota/radicado on any real-tenant path**. This closes the v7.0 milestone (7/7).

> **Provenance:** the `gsd-verifier` agent has been unreliable all session; verification was done by the orchestrator via each plan's grep gates (all `GATE_OK`), the phase-wide fork/A5/A6/Wompi negative gates (all 0), the 103/103 v7-07 unit tests, and a clean `pnpm build` (EXIT 0). Execution note: 6 of 7 executors ran clean; plan 06 (money route) died on a transient API error after committing both feat commits but before its SUMMARY — the security core was independently re-verified (no `body.amount`, secret server-only, runtime nodejs, gated pay, route test 10/10) and the SUMMARY reconstructed.

## Success-criteria map

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | ACUE-01 — view approved acuerdos + cuota plan, tracing to the agent's SINGLE record (no 2nd saldo engine) | ✅ TRUE (contract-first) | `tenant-acuerdos.types.ts` **re-exports** `CarteraPaymentPlan*` from the generated agent schema (**fork gate = 0**, no re-declared interface). `tenant-acuerdos.service.ts` via the BFF `apiClient` (**A6: 0** `NEXT_PUBLIC_AGENT_URL`/`/api/agency/`), `listMine → []` honest. `CuotaPlanTable` renders installments/`totalDueCop` **verbatim** (no `.reduce`/`restante`/saldo recompute — PITFALLS 9). Folds into the v7-03 hub via `acuerdoToCase` (pass-through); **0 acuerdo rows when `[]`** (hub keeps "Próximamente"). `/inquilino/acuerdos` list + `/inquilino/acuerdos/[id]` detail (own-only `.find`, no fetch-by-id). |
| 2 | ACUE-02 — explicitly accept by signing; never auto-approve/set terms; off-policy → agent gate (T-323/SIC-001) | ✅ TRUE (legal crux) | `AcuerdoAcceptPanel`: reused `SignaturePad` + the **generalized** `OTPVerification` (plan 02 — injected adapter, contract-signing path byte-unchanged) + consent; banner "ya fue **aprobado** por tu inmobiliaria". **No approve button, no terms/discount/cuota editor, no reject** (A5 gate = 0 across the acuerdo surfaces). `accept → AcuerdoUnavailableError` → honest "Próximamente" (no fake "aceptado", no optimistic status — comes from the agent record). Off-policy stays the agent's `requiresHumanReview()`. |
| 3 | ACUE-03 — pay a cuota on the same Wompi rail (agent-resolved amount) | ✅ TRUE (frontend-first, security-verified) | `api/inquilino/acuerdos/wompi-session/route.ts`: `runtime='nodejs'`, accepts only `{planId, cuotaNumber}` (**never `body.amount`** = 0), amount from `installments[cuotaNumber].amountCop` server-side, integrity in the `import 'server-only'` module (**0** `NEXT_PUBLIC_WOMPI` route + repo-wide), 5 public response fields. "Pagar cuota" **gated** by `getCuotaPaymentUrl → null` → disabled "Próximamente". Return shows "confirmando" (**0** premature `pagado`/`factura`). Route test **10/10**. |
| 4 | ACUE-04 — request a pre-mora plan (proposes, not sets); no "por qué la mora"; no bureau w/o 3-party gate | ✅ TRUE | `SolicitarPlanPagoModal`: intent-only (`{leaseId}` + optional neutral note) → `requestPremoraPlan`; **no** amount/cuotas/date/discount/consequence editor; notice "Los términos los define y aprueba tu inmobiliaria" (T-323). **0** "por qué la mora"/`motivo` (Ley 2300 art. 7); **0** centrales/DataCrédito/TransUnion/`reportar_centrales` (Ley 1266/2008 + 2157/2021). `AcuerdoUnavailableError` → honest "Próximamente", never a fabricated radicado. Lenis-safe. |

## Legal / security / IDOR invariants (verified phase-wide)

- **A5 — policy stays agent-side (T-323/2024 + SIC 001/2025)** ✅ — no client approve/terms/reject anywhere (grep = 0); the frontend only views/accepts/pays/proposes; decisions stay the agency + `requiresHumanReview()`.
- **A6 — tenant via BFF, not the agency IDOR path** ✅ — `apiClient`/`NEXT_PUBLIC_BACKEND_URL`; 0 `NEXT_PUBLIC_AGENT_URL`/`/api/agency/`; own-only `.find`, no fetch-by-id.
- **Re-export, not re-declare** ✅ — fork gate = 0 (`CarteraPaymentPlan*` aliased from the generated schema).
- **Single saldo (PITFALLS 9)** ✅ — installments/`totalDueCop` verbatim; no `.reduce`/`restante`/saldo recompute on any acuerdo surface.
- **Wompi money invariants** ✅ — no `body.amount`, secret server-only, `runtime='nodejs'`, no premature success (return "confirmando"), gated pay button.
- **Contract-signing unbroken** ✅ — the OTP generalization left `SignatureForm.tsx` byte-unchanged; the default adapter forwards the exact `contractsApi` calls.
- **Zero new npm packages** ✅ across the entire phase (`react-signature-canvas` already present).

## Honesty boundaries (accepted, not faked — this is the MOST gated phase)

- **All acuerdo/cuota DATA** (ACUE-01) — `listMine → []` until the `agent` exposes tenant-scoped RLS routes; no fabricated rows.
- **Accept + acuerdo-OTP** (ACUE-02) — the accept POST + OTP endpoints don't exist yet → honest "Próximamente".
- **Cuota `paymentUrl`** (ACUE-03) — from the agent's `cartera/payment-plans` (tenant RLS) + productive Wompi + reconciliation webhook — absent → disabled "Próximamente"; the route + integrity plumbing are real.
- **Pre-mora request route** (ACUE-04) — the tenant-initiated propose endpoint on the agent → honest "Próximamente".
- 100% of the UI + contracts + honest-degrade ships now; 0% of real settlement works until the `agent` cross-repo dep lands. That cross-repo dep is why this phase is LAST.

## Build & tests

- `pnpm build` — **green (EXIT 0)** on the full stack (routes `/inquilino/acuerdos`, `/inquilino/acuerdos/[id]`, `/api/inquilino/acuerdos/wompi-session`).
- v7-07 tests — **103/103** (`tenant-acuerdos.service` 28, `OTPVerification` 7, `tenant-case` 32, `use-tenant-cases` 26, `acuerdos/wompi-session` route 10).
- Full suite — **7 pre-existing** unrelated failures (agency AI/cotizador/risk — see `deferred-items.md`); **0 new**.

## Follow-ups (not gaps in v7-07 — the cross-repo work in `Leasefy/agent`)

- Tenant-scoped RLS routes on `agent`: list approved acuerdos, accept+sign (+acuerdo OTP), pay-cuota `paymentUrl` (`cartera/payment-plans`), request-pre-mora-plan — all behind the tenant JWT, forwarded by the BFF. The `requiresHumanReview`/`canContact` gates exposed over HTTP. Productive Wompi gateway + reconciliation webhook for cuota settlement.

**Commit stack:** `a79a6d9c` `f98a05c4` (01) · `4a1915ba` `b3ef283b` (02) · `6369e37f` `3a2fd9db` `d0341eac` (03) · `d33a08e2` `17d3d193` `2c67c26e` (04) · `4f44c707` `55a440d9` (05) · `99371de5` `1cb1ec67` (07) · `5c8bd524` `8a8c12d9` (06) · docs `f042e848` `c581c748` `b118386c` `694e3d0f` `b5b12390` `a64f645a` `ba0ef389`, plan+check `350c8bf6` `ea5944d4`. Local on `plan/v7.0-portal-inquilino`; not pushed.
