# v7-07 Acuerdos de Pago — Pre-Execution Plan Check

**Checked:** 2026-07-19
**Phase:** v7-07 (LAST) — Acuerdos de Pago · 7 plans · worktree `mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Verdict:** ✅ **PASS-WITH-NITS** — architecture, legal doctrine, waves, coverage and frontmatter are all sound. **One must-fix gate-anchoring defect (Plan 05 Task 1) will deterministically fail the executor's own verify on the spec-correct banner copy** — fix before executing Plan 05. All other nits are minor.

---

## Success-Criteria Coverage Map (ROADMAP v7-07 §147-152)

| # | Success Criterion | Covered by | Verdict |
|---|-------------------|-----------|---------|
| 1 | Tenant sees agency-approved acuerdos + cuota plan (fechas/montos/estado), tracing to the agent's single record — no second saldo engine (ACUE-01, PITFALLS 9) | 01 (re-export types + `listMine`), 03 (`acuerdoToCase` pass-through + hub fold), 04 (`CuotaPlanTable` verbatim + list page), 05 (detail) | ✅ COVERED — saldo read verbatim (`totalDueCop`/`installments[].amountCop`); grep gates forbid `.reduce(`/`restante`/`saldo` on all acuerdo surfaces |
| 2 | Tenant explicitly accepts by signing (SignaturePad + generalized OTP); never auto-approves/fixes terms; off-policy → agent `requiresHumanReview()` (ACUE-02, T-323/SIC-001) | 01 (`accept`→`AcuerdoUnavailableError`), 02 (OTP generalization additive), 05 (`AcuerdoAcceptPanel`, "lo aprueba tu inmobiliaria", no approve/terms) | ✅ COVERED — accept-only; policy stays agent-side; status from agent, no optimistic flip |
| 3 | Tenant pays a cuota on the same v7-04 Wompi rail (agent `paymentUrl`) (ACUE-03) | 01 (`getCuotaPaymentUrl`→null), 06 (nodejs route clone, server-resolved amount, gated pay button) | ✅ COVERED — server-only secret, never `body.amount`, "confirmando" (no premature "pagado") |
| 4 | Tenant requests a pre-mora plan (proposes, not sets); no "por qué la mora"; no centrales de riesgo w/o 3-party gate (ACUE-04, Ley 2300/1266) | 01 (`requestPremoraPlan`→`AcuerdoUnavailableError`), 07 (`SolicitarPlanPagoModal` intent-only) | ✅ COVERED — no terms/consequence editor; `reportar_centrales` NOT copied; grep gates forbid `por qué`/`motivo`/`razón`/bureau tokens |

**Requirement coverage:** ACUE-01 {01,03,04,05} · ACUE-02 {01,02,05} · ACUE-03 {01,06} · ACUE-04 {01,07}. All 4 mapped requirements delivered by tasks that actually achieve them.

---

## Legal / IDOR Crux Gate Verdicts

| Crux | Verdict | Evidence |
|------|---------|----------|
| **A5 — policy stays agent-side** (T-323/2024 + SIC 001/2025) | ✅ HONORED | No tenant approve button / terms editor anywhere. Service (01) does no policy check; accept/request throw `AcuerdoUnavailableError`; off-policy routes to `requiresHumanReview()` (agent). Negative gates on 04/05/07 forbid `aprobar acuerdo`/`editar término`/`descuento`. Gates anchored on returned literals/introduced className context — **not** doctrine prose (comment-stripped via `grep -vE '^\s*(\*|//|/\*)'`). |
| **A6 — BFF, not agency IDOR path** | ✅ HONORED | 01 routes every call via `apiClient`→`NEXT_PUBLIC_BACKEND_URL`; `getMine` = `listMine().find` (no fetch-by-id); 05 detail resolves via `.find` (no `apiClient.get(...${params})`). Comment-stripped negative gate forbids `NEXT_PUBLIC_AGENT_URL`/`agentAuthHeaders`/`/api/agency/`. Header comment uses `/** … */` block style → **verified strip-safe** (matches `pqrs.service.ts` header). |
| **Re-export, not re-declare** | ✅ HONORED + gate anchored | `grep -rn "interface CarteraPaymentPlan" src` run LIVE → **empty** (generated schema uses `CarteraPaymentPlanDetailResponse: {` property form, not `interface`). Gate will NOT false-positive. Schema fields confirmed present (agent.ts:3744-3775): installments/totalDueCop/paymentUrl/offeredAt/acceptedAt all real. |
| **Single saldo source** (PITFALLS 9) | ✅ HONORED | `CuotaPlanTable`/list/detail render installments/`totalDueCop` verbatim; `acuerdoToCase` passes through (no `.reduce`). Gates on 03/04/05 forbid saldo arithmetic. |
| **ACUE-03 Wompi invariants** | ✅ HONORED | 06 clones v7-04 route: `runtime = 'nodejs'` (exact string confirmed in source), server-only `WOMPI_INTEGRITY_SECRET`, never `body.amount`, amount from agent record, webhook-only settlement. Source route confirmed to carry NO `body.amount`/`NEXT_PUBLIC_WOMPI` → clone won't inherit a forbidden token. |
| **ACUE-04 request form** | ✅ HONORED | 07 intent-only (`{leaseId}` + optional note); no reason field; `reportar_centrales` explicitly NOT copied. Negative gate forbids `por qué|motivo|razón|central|datacrédito|transunion|reporte|reportar_centrales|descuento|número de cuotas`; audited against the specified copy → 0 matches. |

---

## Gate-Anchoring Audit (run LIVE against current worktree — the recurring v7-06 failure)

**Result: all NEGATIVE gates are safely anchored; ONE POSITIVE gate is mis-anchored.**

| Gate | File | Live result | Verdict |
|------|------|-------------|---------|
| `interface CarteraPaymentPlan` (01-T1, neg) | src/**/*.ts | 0 matches (generated schema is property-form) | ✅ safe |
| alarm-tone `return '(destructive|danger|alarm|error)'` (03-T1, neg) | existing tenant-case.ts | 0 matches on current file | ✅ safe (no false-positive on modify) |
| `NEXT_PUBLIC_AGENT_URL|agentAuthHeaders|/api/agency/` (01-T2, neg, comment-stripped) | NEW service | header is `/** … */` block → stripped like pqrs.service header | ✅ safe (residual risk only from inline trailing comments; plan explicitly forbids the tokens) |
| `body.amount|NEXT_PUBLIC_WOMPI` (06-T1, neg) | route clone | source route has neither | ✅ safe |
| `por qué|motivo|razón|central|…` (07, neg) | NEW modal/page | specified copy audited → 0 matches | ✅ safe |
| `.reduce(|restante|saldo` (04, neg) | NEW CuotaPlanTable/list | not required tokens | ✅ safe |
| **`grep -q "aprobó"` (05-T1, POSITIVE)** | NEW AcuerdoAcceptPanel | **objective + must_haves specify the banner as "aprob*ADO*"** ("Este acuerdo ya fue **aprobado** por tu inmobiliaria"); only the STRIDE table says "aprobó" | ❌ **MIS-ANCHORED — deterministic verify-fail on spec-correct copy** |
| `pagado|factura|body.amount|* 100` (06-T2, neg) | detail [id] page | detail should show "confirmando", cuota-status labels live in CuotaPlanTable | ⚠️ LOW risk (see NIT-2) |

---

## Wave / Parallel-Safety Verdict: ✅ SOUND

Frontmatter parsed for all 7 plans; wave = max(dep wave)+1 holds everywhere.

- **W1 {01,02}: DISJOINT** ✅ (types/service vs OTPVerification)
- W2 {03} · W3 {04} alone
- **W4 {05,07}: DISJOINT** ✅ (AcuerdoAcceptPanel + `acuerdos/[id]/page.tsx` vs SolicitarPlanPagoModal + `acuerdos/page.tsx` — [id]/page.tsx ≠ page.tsx)
- W5 {06} alone

**Only two cross-plan shared files, both cross-wave with a dependency edge (no parallel collision):**
- `acuerdos/page.tsx`: created by 04 (W3) → modified by 07 (W4, depends_on 04). Sequential-safe.
- `acuerdos/[id]/page.tsx`: created by 05 (W4) → modified by 06 (W5, depends_on 05). Sequential-safe.

Dependency graph acyclic; all `depends_on` reference existing plans. All key-link deps verified present in the worktree: `useLeases().getActive()`, `buildWompiCheckoutUrl`, `computeWompiIntegrity`, `PlanActivityTimeline`, `pqrsToCase`, `CaseType 'acuerdo'` (:53), `CaseTone` (no alarm level), `casos/[caseId]` `.find` anti-IDOR analog, `Scroll` icon free (Handshake/Lifebuoy/ClipboardText taken), `ProximamenteSection` acuerdos seam (casos/page.tsx:360), OTP `contractsApi.sendOtp/verifyOtp` + Ley 527 note, SignatureForm call site passes `contractId`+`role` (additive-safe).

---

## Blockers / Must-Fix Nits (ordered)

### NIT-1 (BLOCKER-severity — fix before executing Plan 05) — mis-anchored positive gate
**File:** `.planning/phases/v7-07-acuerdos-pago/v7-07-05-PLAN.md`, Task 1 `<verify>` (line 136).
**Problem:** gate `grep -q "aprobó"` requires the token **aprobó**, but the authoritative banner copy (objective line 49/131, must_haves line 16) is **"Este acuerdo ya fue aprobado por tu inmobiliaria"** — i.e. "aprob**ado**". "aprobado" does not contain "aprobó" → the `&&` chain never prints `GATE_OK` → Task 1 verify fails deterministically on the spec-correct output. (Internal inconsistency compounds it: objective+truths say "aprobado", `<done>` says "aprueba", STRIDE says "aprobó".)
**Exact fix:** change the token to match the copy, e.g. `grep -qiE "aprob(ó|ado|ada)"` (or `grep -q "aprobado"`); and standardize the three prose mentions to one banner string ("Este acuerdo ya fue aprobado por tu inmobiliaria").

### NIT-2 (minor) — `pagado` negative gate edge on the detail page
**File:** `v7-07-06-PLAN.md`, Task 2 `<verify>` (line 172) — `grep -ciE "pagado|factura|…" -eq 0` on `acuerdos/[id]/page.tsx`.
**Problem:** a genuinely-paid cuota is legitimately "Pagado"; the guardrail is *no PREMATURE* success, not "never render paid". By design paid-cuota labels live in `CuotaPlanTable` (Plan 04, un-gated), so the detail page should be clean — but if the executor renders a per-cuota status chip inline in `[id]/page.tsx`, the gate trips.
**Fix/guard:** keep paid-status labels inside `CuotaPlanTable`; if the detail must show a cuota chip, forbid only a *premature-success* context (or delegate to the table). Low risk; note for the executor.

### NIT-3 (minor) — "mirror the v7-04 route test" but none exists
**File:** `v7-07-06-PLAN.md`, Task 1. `src/app/api/inquilino/pagos/wompi-session/` contains only `route.ts` (no `route.test.ts`). The plan already hedges ("If a Wave-0 route test harness … exists, copy its structure"), so the executor writes the test fresh — fine, but the "mirroring the v7-04 route test" phrasing is optimistic. No change required; awareness only.

### NIT-4 (minor) — RESEARCH "## Open Questions" not marked `(RESOLVED)`
Three provisional-endpoint questions (copy register; per-cuota vs whole-plan pay; inline vs split signature) each carry an actioned Recommendation and are provisional-by-design (honest-degrade covers them); the plans honor each (02 defers the copy pass; 06 builds per-cuota with plan-level fallback; 01/05 model signature inline). Consistent with shipped v7-05/06. Optional: append `(RESOLVED)` + inline resolutions.

### Note — Dimension 8 (Nyquist / VALIDATION.md): N/A for this workflow
No `*-VALIDATION.md` exists for v7-07 — **nor did shipped-and-verified v7-05 or v7-06** (this milestone embeds a "Validation Architecture" section inside RESEARCH instead). Every plan carries `<automated>` verify with fast `pnpm test -- <spec>` (unit, not E2E/watch). The Nyquist *spirit* (automated per-task feedback) is satisfied; the literal 8e gate is not part of this project's convention.

---

## Additive / Doctrine Compliance
- **Additive-only:** ✅ OTP generalization is backward-compatible (SignatureForm keeps `contractId`+`role`, no adapter → contract-signing flow byte-unchanged); agency `use-payment-plan-approval.ts`/`use-agreement-propose.ts` untouched; `acuerdo` rows contribute 0 when `listMine()` = [] → pago/aplicación/PQRS caso hub byte-identical.
- **Frontend-first honesty:** ✅ `listMine`→[], mutations→`AcuerdoUnavailableError`, `getCuotaPaymentUrl`→null; no fabricated acuerdo/cuota/radicado/checkout-URL on any real-tenant path (fixtures only in `*.test.ts`).
- **DESIGN.md §4 sentence-case:** ✅ every CTA specified sentence case; no uppercase-CTA gate present.
- **Zero new npm packages:** ✅ asserted in every plan; `package.json`/`pnpm-lock.yaml` unchanged gate carried.

**Bottom line:** Ship-ready after fixing **NIT-1** (one-line gate re-anchor). The legal-heaviest phase honors every crux (A5/A6/re-export/saldo/Wompi/ACUE-04) with correctly-anchored gates and disjoint waves.
