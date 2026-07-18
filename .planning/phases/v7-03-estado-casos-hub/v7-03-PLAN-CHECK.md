# v7-03 Estado de Casos (Hub) — Plan Check

**Verdict:** PASS-WITH-NITS
**Checked:** 2026-07-18 · Plans: v7-03-01/02/03 · Worktree: `/Users/nicolasgarcia/rent/mvp-portal-inquilino`

## Criterion → plan map

| Criterion | Plan(s) | Delivery | Verdict |
|---|---|---|---|
| CASO-01 hub aggregates pagos+PQRS+mant+acuerdos, estado+responsable | 01 (aggregator) + 02 (hub page) | pagos + application-journey REAL; PQRS/mant/acuerdos = honest 0-row "Próximamente" | MET (frontend-first) |
| CASO-02 detail + timeline, own-cases-only | 03 | `cases.find(id===caseId)`, no raw-id fetch, timeline from `case.events` (source timestamps), role responsable | MET |
| CASO-03 in-app on state change; push/WhatsApp Próximamente | 02 | links to REAL `/inquilino/notificaciones` (PAYMENT_*/APPLICATION_* templates fire for exactly the hub's real case types); push/WhatsApp disabled Próximamente | MET |
| CASO-04 guardrail: neutral tone, trace-to-source, no 2nd number | 01/02/03 | `CaseTone` omits danger; pure total mappers read source enums; grep gates | MET |

## Verified against real source
`useTenantApplications().active` (useApplications.ts:90,126; `isApplicationCompleted` keeps approved+non-active-contract in `active`) ✓ · `useMyPaymentRequests`/`useLeasePaymentInfo` (useLeases.ts:231,274) ✓ · `TenantApplicationView` has NO `events` — plan 01 correctly builds events from submittedAt/updatedAt (PATTERNS.md:41 wrongly claimed `events[]`; plan followed RESEARCH, not the error) ✓ · `APPLICATION_STATUS_LABELS`/`isApplicationFinal` (tenant-application.ts:27,130) ✓ · `pqrs.types.ts` field names (api/pqrs.types.ts:34-52) ✓ · dashboard placeholder "no fabricar conteo" (page.tsx:256) ✓ · `PlanActivityTimeline` es-CL @:44 ✓ · badge variants secondary/default/warning ✓ · nav `useTenantNavItems` (layout.tsx:26) ✓ · `casos/` dir absent (new) ✓.

## Rulings
- **R1 scope (open pagos + non-terminal apps):** SOUND. Open pago = PENDING_VALIDATION/DISPUTED/REJECTED + current NONE/REJECTED; excludes APPROVED/CANCELLED + the ACTIVE lease (context header). No real open case wrongly excluded; no terminal wrongly included. Including apps stretches "post-firma" but is the only other REAL source and matches RESEARCH R1 default.
- **Contrato-row deviation:** SOUND. Contract-signing folds through the `active` app case (code-verified); once contract active, app→completed, lease→context. No actionable case dropped (no tenant renewal flow exists). `CaseType` declaring `contrato` for forward-compat is harmless (mapper never emits it).
- **CASO-01 "Próximamente" honesty:** HONEST, not overpromise. Milestone frontend-first rule sanctions "UI + contract + honest Próximamente" where backend absent; RESEARCH proves PQRS/mant (v7-06) + acuerdos (v7-07) have zero tenant backend; forward-refs emit 0 fabricated rows (unit-tested). Nit: roadmap criterion text lists all four "agrega" — should be reworded like v7-01's casos deferral so post-exec verifier doesn't false-fail.

## Guardrails encoded
All encoded as grep/type/test gates: normalize-never-compute ✓ · CaseTone cannot express danger + no destructive/Datacrédito/urgency ✓ · own-cases-only/no responsableId/role ✓ · forward-refs 0 rows ✓ · timeline source-timestamps + `ApplicationTimeline` grep-blocked ✓ · dashboard placeholder wired ✓ · es-CL→es-CO ✓.

## Waves / overlap
Wave1=01; Wave2=02∥03 (both depends_on [v7-03-01]). ZERO files_modified overlap: 02={casos/page.tsx, page.tsx, layout.tsx}, 03={casos/[caseId]/page.tsx, PlanActivityTimeline.tsx}. Dashboard+nav in 02 only; timeline in 03 only. Both read-only import 01's hook. No conflict. ✓ All plans ≤4 files; build+test in every DoD.

## WARNINGS (fix before/at execution)
1. **[correctness] Current-period-REJECTED double-count (plan 01 Task 2).** A current period REJECTED yields BOTH a request-derived 'pago' row (REJECTED ∈ requests, the "fuente única") AND the additive próximo-pago row (currentPeriodStatus==='REJECTED') → two rows + inflated `openCasesCount` for one logical case. Violates the "never a fabricated count" guardrail. Fix: emit the próximo-pago row only when currentPeriodStatus==='NONE' (or when no non-terminal request exists for the current period/month+year).
2. **[docs] Reword CASO-01 roadmap criterion** to state pagos+application-journey REAL / PQRS+mant+acuerdos Próximamente (mirror v7-01 casos deferral), so the post-execution verifier scores it correctly.

## Ordered fixes
1. Plan 01 Task 2 — dedupe current-period REJECTED against request rows (WARNING 1).
2. ROADMAP — reword CASO-01 criterion for forward-ref honesty (WARNING 2, doc-only).

Neither is a blocker; plans may execute. Recommend applying fix 1 in plan 01 before Wave 1.
