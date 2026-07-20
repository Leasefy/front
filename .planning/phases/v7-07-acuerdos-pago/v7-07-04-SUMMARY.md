---
phase: v7-07-acuerdos-pago
plan: 04
subsystem: tenant-ui
tags: [acuerdos-pago, cartera, payment-plans, cuota-plan, read-only, honest-degrade, no-saldo-math, a5, t-323, ley-1480, nav, hub-swap]

# Dependency graph
requires:
  - phase: v7-07-acuerdos-pago
    plan: 01
    provides: "AcuerdoDetail/AcuerdoInstallment re-exported from the generated agent CarteraPaymentPlan* schema (single source of saldo, no fork)"
  - phase: v7-07-acuerdos-pago
    plan: 03
    provides: "useTenantAcuerdos() tolerant list hook + acuerdoStatusToTone/acuerdoStatusToLabel neutral mappers (tone capped at 'attention')"
  - phase: v7-06-pqrs
    provides: "the Solicitudes real-link swap of the casos-hub ProximamenteSection — mirrored here for acuerdos"
provides:
  - "CuotaPlanTable — pure presentational component rendering AcuerdoInstallment[] VERBATIM (Cuota N · fecha es-CO · monto · estado + paidAt), no saldo/total arithmetic; reusable by list + detail (v7-07-05)"
  - "/inquilino/acuerdos — own-scoped READ-only acuerdos list (useTenantAcuerdos): totalDueCop verbatim + neutral tone badge + cuota count + embedded CuotaPlanTable; honest empty/'Próximamente' when []; rows deep-link to /inquilino/acuerdos/[id]; no approve/terms affordance"
  - "'Acuerdos' nav entry (distinct Scroll icon) → /inquilino/acuerdos, placed near Pagos"
  - "casos hub: Acuerdos 'Próximamente' ProximamenteSection replaced by a real Link card → /inquilino/acuerdos (ProximamenteSection definition removed, now unused)"
affects: [v7-07-05 (acuerdos detail page — reuses CuotaPlanTable + the /inquilino/acuerdos/[id] deep-link), v7-07-07 (request-plan CTA lands on this list surface)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render the agent record verbatim: CuotaPlanTable maps installments[] 1:1 with zero client arithmetic (no .reduce / no accumulated total) — the agent is the sole saldo authority (PITFALLS 9)"
    - "Tenant page shell + gates copied from casos/page.tsx (Spinner → onboarding → error EmptyState; min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] + max-w-7xl + framer motion.header)"
    - "Honest empty: useTenantAcuerdos → [] on not-live → an EmptyState, never a fabricated acuerdo/cuota row; read-only surface (no approve button, no terms editor — A5, T-323)"
    - "Replace a casos-hub 'Próximamente' ProximamenteSection with a real entry-point Link card, exactly the v7-06 PQRS→Solicitudes swap"

key-files:
  created:
    - src/components/tenant/CuotaPlanTable.tsx
    - src/app/inquilino/acuerdos/page.tsx
  modified:
    - src/app/inquilino/layout.tsx
    - src/app/inquilino/casos/page.tsx

key-decisions:
  - "CuotaPlanTable is embedded in each list row (below the plan header) so the list literally renders the cuota plan VERBATIM (satisfying the plan key_link acuerdos/page.tsx → CuotaPlanTable(installments)); the compact header still carries totalDueCop + a cuota COUNT (installments.length, a length not a sum)"
  - "The whole acuerdo row is a Link to /inquilino/acuerdos/[id]; CuotaPlanTable renders only static <ul>/<li> text (no interactive children), so nesting it inside the row Link is valid HTML"
  - "cuota-status chip uses a neutral surface-muted chip (no alarm color, Ley 1480) with a factual es-CO label; an unknown installment status degrades to the raw string, never invents an alarm"
  - "Removed the now-unused ProximamenteSection definition from casos/page.tsx (only the acuerdos block referenced it); Clock/EmptyState/Icon/Handshake imports all remain in use"
  - "Updated the casos-hub module doc comment: 'Más en tu portal' now surfaces two REAL entry-point links (Solicitudes + Acuerdos), each owning its own honest empty/'Próximamente' state — the hub never fabricates a count"

patterns-established:
  - "A verbatim cuota renderer (CuotaPlanTable) that a caller can drop into a list row or a detail page; the caller passes totalDueCop separately — the component never derives it"

requirements-completed: [ACUE-01]

# Metrics
duration: 20min
completed: 2026-07-20
---

# Phase v7-07 Plan 04: Acuerdos READ Surface Summary

**The tenant now sees a real `/inquilino/acuerdos` page — an own-scoped, read-only list of agency-approved acuerdos (`useTenantAcuerdos`) that renders each plan's `totalDueCop` + a neutral tone badge + a cuota count and the full cuota plan VERBATIM via a new reusable `CuotaPlanTable` (no `.reduce`, no saldo/total arithmetic — the agent is the sole authority), degrading honestly to a "Próximamente" EmptyState when `listMine()` returns `[]`; an "Acuerdos" nav entry (distinct `Scroll` icon) and a caso-hub real-link card (replacing the old `ProximamenteSection`, mirroring the v7-06 PQRS swap) make it the one honest entry point — with NO approve button and NO terms editor anywhere (A5, T-323).**

## Performance
- **Duration:** ~20 min
- **Tasks:** 3 (all `type="auto"`)
- **Files created:** 2 · **Files modified:** 2

## Accomplishments
- **Task 1 — CuotaPlanTable (ACUE-01, PITFALLS 9).** A pure presentational component (`{ installments: AcuerdoInstallment[]; locale?: string; className? }`) rendering each cuota as `Cuota N · {dueDate es-CO} · {formatCurrency amountCop} · {estado}`, money in `font-mono tabular-nums`, a neutral cuota-status chip, and a `paidAt` date when paid. It renders `installments[]` VERBATIM — **zero** total/saldo arithmetic, no `.reduce`, no `+` accumulation over `amountCop`. Empty `installments` → an honest "Sin cuotas" line. Imports `AcuerdoInstallment` from `tenant-acuerdos.types` (no fork).
- **Task 2 — /inquilino/acuerdos list (ACUE-01).** Tenant page shell + gates copied from `casos/page.tsx` (Spinner → `useOnboardingStatus`/`CompleteProfileFirst` → error `EmptyState`; `min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]` + `max-w-7xl` + framer `motion.header`). Each `AcuerdoDetail` renders as a `Link` card → `/inquilino/acuerdos/${encodeURIComponent(planId)}`: a `Scroll` tile, "Acuerdo de pago" title, a neutral `acuerdoStatusToTone/Label` badge, `formatCurrency(totalDueCop)` (verbatim, `tabular-nums`), a `installments.length` cuota count, and the embedded `CuotaPlanTable`. `[]` (incl. not-live) → an honest `EmptyState` ("Aún no tienes acuerdos de pago" + the factual note that agency-approved acuerdos will appear here). **NO approve button, NO terms editor, NO "solicitar plan" CTA, NO fabricated rows** — neutral tone only.
- **Task 3 — nav + hub swap (ACUE-01).** `layout.tsx`: `Scroll` imported + an `{ label: 'Acuerdos'/'Agreements', href: '/inquilino/acuerdos', icon: Scroll }` nav item inserted right after "Pagos" (distinct from `Handshake`/`Lifebuoy`/`ClipboardText`). `casos/page.tsx`: the Acuerdos `ProximamenteSection` replaced by a real `Link` entry-point card (`Handshake` tile, "Consulta y gestiona tus acuerdos de pago.", sentence-case "Ver acuerdos" + `ArrowUpRight`), reusing the Solicitudes card styling — exactly the v7-06 PQRS-placeholder swap. The now-unused `ProximamenteSection` definition was removed (all remaining imports still referenced).

## Task Commits
1. **Task 1: CuotaPlanTable renders installments verbatim (ACUE-01)** — `d33a08e2` (feat)
2. **Task 2: /inquilino/acuerdos read-only list page (ACUE-01)** — `17d3d193` (feat)
3. **Task 3: Acuerdos nav entry + caso-hub real-link swap (ACUE-01)** — `2c67c26e` (feat)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified
- `src/components/tenant/CuotaPlanTable.tsx` **(new)** — verbatim cuota renderer; neutral chips + es-CO long dates + `formatCurrency` in `font-mono tabular-nums`; no saldo/total math; reusable by list + detail.
- `src/app/inquilino/acuerdos/page.tsx` **(new)** — own-scoped read-only acuerdos list with per-plan header (total + count + tone badge) + embedded `CuotaPlanTable`; honest empty/"Próximamente"; rows deep-link to the dedicated detail.
- `src/app/inquilino/layout.tsx` **(modified)** — `Scroll` import + "Acuerdos" nav item near "Pagos".
- `src/app/inquilino/casos/page.tsx` **(modified)** — Acuerdos `ProximamenteSection` → real `/inquilino/acuerdos` Link card; unused `ProximamenteSection` definition removed; hub doc comment updated for honesty.

## Verification Results

| Gate | Result |
|------|--------|
| Task 1 grep gate (installments/amountCop/formatCurrency/`es-CO` present; 0 `.reduce`/`restante`/`saldo` comment-stripped) | `GATE_OK` |
| Task 2 grep gate (useTenantAcuerdos/acuerdoStatusToTone/formatCurrency/`/inquilino/acuerdos/`/EmptyState present; 0 `aprobar acuerdo`/`editar término`/`.reduce`/`restante`/`por qué`/`central` comment-stripped) | `GATE_OK` |
| Task 3 grep gate (`/inquilino/acuerdos` + `Scroll` in layout; `/inquilino/acuerdos` in casos) | `GATE_OK` |
| `pnpm build` (next build, TS strict) | **EXIT 0 (green)** — new `/inquilino/acuerdos` route registered (○ static, 8.2 kB) |
| Orphaned-import check (casos: Clock/EmptyState/Icon/Handshake/ArrowUpRight) | all still referenced — 0 orphans |
| Full `pnpm test` | 710 pass / 7 fail (5 files) — **0 new failures** (all pre-existing agency-side AI/cobranza/cotizador/risk; none import the acuerdos/CuotaPlanTable/casos/layout files) |
| `package.json` / `pnpm-lock.yaml` | unchanged (zero new deps) |

## Decisions Made
- **CuotaPlanTable embedded in the list row.** The plan's Task 2 action describes a compact "· N cuotas" summary, while the plan key_link draws `acuerdos/page.tsx → CuotaPlanTable(installments)`. Both are honored: the compact header carries `totalDueCop` + the cuota **count** (`installments.length`, a length not a sum), and `CuotaPlanTable` renders the cuota plan verbatim below it. Nesting the static `<ul>/<li>` table inside the row `Link` is valid HTML (no interactive children).
- **Neutral cuota-status chips.** A `surface-muted` chip with a factual es-CO label (Pagada/Pendiente/Próxima/Vencida/Cancelada), unknown → raw string. No alarm color, no countdown (Ley 1480, PITFALLS 8).
- **Doc-comment honesty.** The casos-hub header comment previously claimed acuerdos rendered as "Próximamente" EmptyState sections; updated to describe the two real entry-point links (Solicitudes + Acuerdos), each owning its own honest degrade.

## Deviations from Plan
None — plan executed exactly as written. No deviation rules (1–4) triggered; no auth gates; no architectural changes. One reconciliation of intent (not a deviation): the plan's compact-summary Task text and the key_link's `CuotaPlanTable(installments)` were both satisfied by embedding the table under the compact header — documented above.

## Threat Model Coverage
- **T-v7-07-10 (Tampering / PITFALLS 9) — mitigated.** Every peso (`totalDueCop`, `installments[].amountCop`) is rendered verbatim; CuotaPlanTable + list are free of `.reduce`/`restante`/`saldo` (comment-stripped grep-gated to 0). The agent is the sole saldo authority.
- **T-v7-07-11 (Elevation of Privilege — A5, T-323) — mitigated.** The list + table only VIEW: no "aprobar acuerdo" button, no terms editor (grep-gated to 0). Approval/policy stay agent-side.
- **T-v7-07-12 (Tampering — empty state) — mitigated.** `useTenantAcuerdos` → `[]` → an honest "Próximamente" EmptyState; no fabricated acuerdo/cuota rows on any real-tenant path (PITFALLS 5).
- **T-v7-07-13 (Compliance — Ley 2300 / 1266) — mitigated.** Neutral tone; no "por qué la mora", no centrales-de-riesgo copy (grep-gated to 0).
- **T-v7-07-SC (supply chain) — accept.** Zero new npm dependencies (`package.json`/lockfile unchanged).

## Threat Flags
None — no new network endpoints, auth paths, file access, or schema changes at trust boundaries. This surface is a read-only projection over the existing `useTenantAcuerdos` contract (v7-07-03).

## Known Stubs
None that block ACUE-01. The list is honest-degrading by design: `useTenantAcuerdos` → `[]` until the `Leasefy/agent` tenant RLS route (`GET /cartera/payment-plans/mine`) lands, at which point real approved-plan rows flow in with no UI change. This is documented "Próximamente" (RESEARCH "Real vs. Gated"), not a stub that hides a broken goal. The `/inquilino/acuerdos/[id]` detail deep-link target is delivered by v7-07-05 (next plan).

## Issues Encountered
- **Full-suite pre-existing failures (out of scope).** `pnpm test` reports 7 failing tests across 5 files — all agency-side AI/cobranza/cotizador/risk subsystems (`asegurabilidad/nueva`, `EquipoAgentes`, `WorkItemDetalle`, `CarrierRegistryTable`, `risk-levels`). None import the modules this plan touched (CuotaPlanTable / acuerdos page / casos / layout), and this plan adds no test files, so **zero new failures are attributable to this plan**. The set is a subset of the v7-07-01/03 documented baseline (already in `deferred-items.md`).

## User Setup Required
None. The tenant RLS routes on `Leasefy/agent` remain absent by design; the surface degrades honestly to "Próximamente" until they land.

## Next Phase Readiness
- **v7-07-05 (acuerdos detail)** can build `/inquilino/acuerdos/[id]` by reusing `CuotaPlanTable` (the cuota plan verbatim) + the `acuerdosApi.getMine(planId)` own-only resolve; the list already deep-links there.
- **v7-07-07 (request-plan)** can add the "Solicitar plan" CTA onto this list surface.
- No blockers introduced. `/inquilino/acuerdos` renders the honest empty state today (`listMine()` → `[]`) and lights up automatically the moment the agent returns records.

## Self-Check: PASSED
- FOUND: `src/components/tenant/CuotaPlanTable.tsx`
- FOUND: `src/app/inquilino/acuerdos/page.tsx`
- FOUND commit: `d33a08e2` (Task 1)
- FOUND commit: `17d3d193` (Task 2)
- FOUND commit: `2c67c26e` (Task 3)

---
*Phase: v7-07-acuerdos-pago — Plan 04 (wave 3)*
*Completed: 2026-07-20*
