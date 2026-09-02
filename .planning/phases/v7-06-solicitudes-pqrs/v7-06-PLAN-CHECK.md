# v7-06 Solicitudes / PQRS — Plan Check (pre-execution)

**Verdict: BLOCK** — two `<verify>` gates will deterministically FAIL on correct code
(they match pre-existing doctrine comments in files the plans modify). Substance, coverage,
wiring, dependency order and wave-3 parallel-safety are all **PASS-quality**. Fix the two
gate anchors (one line each) and this is a clean PASS. No deliverable logic needs to change.

Reviewer: gsd-plan-checker · worktree `mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
Scope: read-only; only this file written.

---

## 1. Success-Criteria Coverage Map (ROADMAP v7-06, lines 130-134)

| # | Success criterion (must be TRUE) | Covering plan(s) | Verified grounding | Status |
|---|----------------------------------|------------------|--------------------|--------|
| 1 | Tenant opens maintenance/reparación with description + **real photos** (SOLI-01) | 03·T1 (NuevaSolicitudModal → `pqrsApi.create` → `documentsApi.upload`) | `documents.service.ts:78` upload(entityType/entityId) exists; photo picker idiom real | COVERED |
| 2 | Tenant opens formal PQRS **reusing `pqrs.types.ts`** (same entity, `solicitanteTipo` server-side, agency sees same estado vocab — no fork) | 01·T1 (additive only) + 02·T1 (`import … from '@/lib/api/pqrs.types'`) + 03·T1 (tipo selector) | Fork-gate `^(export )?(type PqrsEstado\|interface SolicitudPqrs)` runs live → only `pqrs.types.ts` → EMPTY ✓ | COVERED |
| 3 | Tenant tracks estado in a timeline with **SLA (15 business days) computed + visible, never blank, interim "estimado"** (SOLI-03) | 01·T2 (`addBusinessDays`/`resolveExpectedResponse`) + 02 (pass-through, no compute) + 03·T2 (list SLA) + 04·T1 (detail SLA row) | `PQRS_SLA_BUSINESS_DAYS=15` reused (`response-sla.ts:14`); weekday-only, no festivos (ROADMAP:135); SLA computed in **presentation**, not the mapper ✓ | COVERED |
| 4 | Cost-responsibility transparency (Ley 820 dueño/inquilino/split) + **approve-quote before execute** when tenant-cost (SOLI-04) | 01·T3 (`approveCotizacion`→`PqrsUnavailableError`) + 04·T2 (`CostoResponsabilidadCard`, backend-sourced, approve-only, honest "Próximamente") | costoResponsable/cotizacionMonto backend-sourced; no provider-assign/cost-input/self-close (grep-gated); approve-only ✓ | COVERED |

All 4 requirements (SOLI-01..04) present in ≥1 plan's `requirements`; all 4 success criteria covered. **No coverage gaps.**

---

## 2. Milestone-Doctrine Compliance

| Doctrine | Verdict | Evidence |
|----------|---------|----------|
| **Additive only** (agency PQRS page + v7-03 pago/aplicación cases byte-identical) | PASS | `/panel/inmobiliaria/pqrs/page.tsx` in NO `files_modified`. 01 only ADDS optional fields + `CostoResponsable` type; existing fields/exports untouched (no exhaustiveness break). 04 SLA/cost gated on `caso.solicitud` (present only for pqrs/mant). 02 emits 0 PQRS rows when `listMine()=[]`. |
| **Frontend-first honesty** (no fabricated radicado/rows) | PASS | `listMine→[]` on 404/403/0; `create/approveCotizacion→PqrsUnavailableError`; `isEndpointUnavailable` copied verbatim from `lease-documents.service.ts:67`. No fake data on the real-tenant path. |
| **DESIGN.md §4 — sentence-case buttons (the v7-04 bite)** | PASS | Plans 03/04 explicitly require sentence case; **no gate anywhere hard-requires an UPPERCASE CTA** (checked all `<verify>` blocks). The v7-04 mistake is not repeated. |

---

## 3. Legal / Product Cruxes

- **SOLI-02 NO FORK** — PASS. 01 extends the shared entity in place; 02 reuses `PqrsEstado`/`CostoResponsable` via import. Fork-gate is **correctly anchored** (`^(export )?…`, start-of-line) so it does NOT false-positive on prose; ran live → EMPTY. Agency keeps the same estado vocabulary (no agency file touched).
- **SOLI-03 SLA never blank + "estimado"** — PASS. Hand-rolled pure `addBusinessDays` (Mon–Fri, no holiday table), reuses `PQRS_SLA_BUSINESS_DAYS=15`, zero npm, "estimado" label, neutral tone (no red countdown). **Computed in the presentation layer** (03·T2 list, 04·T1 detail), NOT inside `pqrsToCase`/`tenant-case.ts` (02 = normalize-never-compute, verified in plan text). Two-tier resolver prefers authoritative `slaVenceAt`.
- **SOLI-01 / IDOR** — PASS. Photos via `documentsApi.upload`; retrieval mandated through `getSignedUrl` (`getDownloadUrl` forbidden, gated). Detail resolves own-only from `useTenantCases().find` (`casos/[caseId]/page.tsx:244`) — no fetch-by-id; service `getMine` resolves from `listMine` (anti-IDOR gate present).
- **SOLI-04** — PASS. `costoResponsable`/`cotizacionMonto` backend-sourced; approve-only, contract-first honest "Próximamente"; tenant never assigns providers / sets cost / self-closes (grep-gated).

---

## 4. Route-Structure Decision — CONSISTENT

REUSE `/inquilino/casos/[caseId]` for the unified detail/timeline/SLA/cost + a dedicated
`/inquilino/solicitudes` LIST whose rows deep-link to the caso detail. Verified:
- `pqrsToCase.detailLink = /inquilino/casos/${id}` (02) and the list rows link to the same
  `/inquilino/casos/${id}` (03·T2) → single timeline, no duplicate.
- **No** `/inquilino/solicitudes/[id]` file is created (03 `files_modified` = list page only).
- SLA + cost card added to `casos/[caseId]/page.tsx` are gated on `caso.solicitud` → pago/aplicación byte-identical.

---

## 5. Dependency Graph & Wave Order — SOUND (one accuracy nit)

```
01 depends_on []            → wave 1  ✓
02 depends_on [01]          → wave 2  ✓   (max dep wave 1 +1)
03 depends_on [01,02]       → wave 3  ✓   (max dep wave 2 +1)
04 depends_on [02]          → wave 3  ✓   (max dep wave 2 +1)
```
Acyclic; no missing/forward refs; all referenced plans exist. Wave numbers consistent with deps.

**Nit (low):** 04 directly imports `resolveExpectedResponse` (business-days.ts) and
`pqrsApi.approveCotizacion` (pqrs.service.ts) — both produced by **01** — yet `depends_on`
omits `v7-06-01`. Execution order is still correct (01=w1 runs before 04=w3 via the transitive
04→02→01 chain), so this is **not** an execution blocker; declare `depends_on: [v7-06-01, v7-06-02]`
for accuracy/robustness.

---

## 6. Wave-3 Parallel-Safety — SAFE ✓

The planner's "zero file overlap" claim is **TRUE**. `files_modified` intersection of 03 ∩ 04 = ∅:
- 03: `NuevaSolicitudModal.tsx`, `solicitudes/page.tsx`, `layout.tsx`, **`casos/page.tsx`** (hub LIST)
- 04: `CostoResponsabilidadCard.tsx`, **`casos/[caseId]/page.tsx`** (DETAIL)

`casos/page.tsx` ≠ `casos/[caseId]/page.tsx` — different files. No runtime coupling forces
ordering within the wave (03's hub rows deep-link by href; 04's SLA/cost render independently).
03 & 04 may run in parallel.

---

## 7. Frontmatter — PARSES, schema-consistent with v7-05

All 4 v7-06 frontmatters are well-formed and use the identical key set to the shipped v7-05 plans
(`phase, plan, type, wave, depends_on, files_modified, autonomous, requirements, must_haves`), with
richer nested `must_haves.{truths,artifacts,key_links}`. Requirements arrays valid; every plan has a
complete `must_haves`. No schema drift.

---

## 8. Scope / Task Completeness / Nyquist — PASS

- Task counts: 01=3, 02=3, 03=3, 04=2 (all within 2-3 budget); files/plan ≤5. No overload.
- Every `<task>` has Files + Action + Verify + Done; every task carries an `<automated>` verify
  (fast per-file `pnpm test`/grep — no watch mode, no E2E). Sampling continuous across waves.
- Key-links all planned (no orphan artifacts): business-days↔response-sla, service↔isEndpointUnavailable,
  aggregator↔listMine↔pqrsToCase, modal↔create↔upload, list/detail↔resolveExpectedResponse, card↔approveCotizacion.

---

## 9. BLOCKERS (must fix before execution) — ordered

### BLOCKER 1 — v7-06-02-PLAN.md · Task 1 `<verify>` (line 154): gate false-positives on doctrine prose
The gate `test $(grep -ciE "destructive|danger|alarm|'error'" $T) -eq 0` runs against
`src/lib/types/tenant-case.ts`, which the plan **modifies** (and whose header it UPDATES).
That file already contains **3** matching lines — all doctrine comments, e.g.:
- `:20  * alarm/danger level so the type cannot express an alarmist tone.`
- `:42  * … There is intentionally NO alarm …`
- `:91  * … (no alarm level exists).`

→ count = 3 ≠ 0 → the `&&` chain fails → `pnpm test` never runs → **verify fails on every run**,
even for a perfectly correct implementation. Worse, an executor "fixing" it may delete the doctrine
comments that document the no-alarm invariant (net regression).

**Fix (choose one):**
- (a) Code-anchor to a RETURNED alarm value only:
  `test $(grep -cE "return '(destructive\|alarm)'\|=> '(destructive\|alarm)'" $T) -eq 0`
- (b) Drop the token grep entirely — it is redundant: `CaseTone` has no alarm member (tsc enforces
  it) and the test already asserts `tone ∈ {neutral,info,attention}` for all 6 estados. Keep the
  positive checks (`grep -q pqrsStatusToTone/Label/pqrsToCase … && pnpm test …`).

### BLOCKER 2 — v7-06-04-PLAN.md · Task 1 `<verify>` (line 123): same class of false-positive
The gate `test $(grep -ciE "vence el|destructive|countdown|red-" "$P") -eq 0` runs against
`src/app/inquilino/casos/[caseId]/page.tsx`, which the plan **modifies**. That file already
contains **2** matching lines — doctrine comments:
- `:20  * (secondary/default/warning) — never destructive/alarm, no countdown, no`
- `:60  * intentionally NO destructive/alarm mapping — pair icon + text, never color`

→ count = 2 ≠ 0 → **verify fails deterministically** on correct code.

**Fix (choose one):**
- (a) Anchor to introduced JSX/classes:
  `test $(grep -cE "className=\"[^\"]*(bg-red\|text-red\|destructive)" "$P") -eq 0`
- (b) Drop the negative token grep; rely on the existing positive asserts
  (`grep -q "estimado" && grep -q "es-CO" && grep -q resolveExpectedResponse`) + `pnpm build`.

---

## 10. WARNINGS / NITS (recommended, not blocking)

1. **W — self-inflicted comment gates on NEW files.** Three gates forbid tokens the plan's own
   action text uses, so an executor that echoes them in code comments will false-fail:
   - 03·T1 (line 153): `solicitanteTipo | por qu[eé] | asignar proveedor` — plan action says "never set
     solicitanteTipo", "no 'por qué' field".
   - 03·T2 (line 182): `vence el | countdown | destructive` — doctrine is literally "never 'vence el'".
   - 04·T2 (line 155): `asignar proveedor | assign provider | input.*costo | costo.*input` — a Spanish
     comment like "sin input de costo" or "no asignar proveedor" would trip it.
   These are avoidable (executor authors the new files). Add a one-line instruction: *keep forbidden
   tokens out of comments*, or code-anchor the gates. Low risk, but it caused the two blockers above
   on modified files.
2. **Nit (low)** — 04 `depends_on` should be `[v7-06-01, v7-06-02]` (see §5).

---

## Bottom line
Excellent, goal-complete plan set: reuse-not-fork honored and well-anchored, SLA computed in the
presentation layer, honest degradation everywhere, no uppercase-CTA trap, and wave-3 truly disjoint.
**Only two `<verify>` commands must be re-anchored** (they match pre-existing doctrine comments in the
very files they modify) before this executes cleanly. Fix §9 BLOCKER 1 + BLOCKER 2 → PASS.
