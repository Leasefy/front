---
phase: v7-06-solicitudes-pqrs
plan: 04
subsystem: ui
tags: [pqrs, solicitudes, sla, business-days, ley-820, cost-transparency, quote-approval, tenant-case, es-CO, additive, contract-first]

# Dependency graph
requires:
  - phase: v7-06-01
    provides: "resolveExpectedResponse (two-tier authoritative-vs-estimate SLA), pqrsApi.approveCotizacion + PqrsUnavailableError, CostoResponsable type"
  - phase: v7-06-02
    provides: "TenantCase.solicitud pass-through metadata (estado/createdAt/slaVenceAt/costoResponsable/cotizacionMonto/cotizacionAprobadaAt) via pqrsToCase"
provides:
  - "Never-blank 'Respuesta esperada' SLA row on the unified caso detail (authoritative slaVenceAt ?? weekday estimate labeled 'estimado', neutral tone) — the presentation-layer application of the wave-1 resolver"
  - "CostoResponsabilidadCard: renders the BACKEND-sourced Ley 820 costoResponsable (dueño/inquilino/compartido) as a factual label — frontend renders, never decides"
  - "Approve-only quote affordance (contract-first pqrsApi.approveCotizacion) that degrades to an honest 'Próximamente' on PqrsUnavailableError — never a fabricated 'aprobado'; read-only 'Aprobada el {date}' from a server cotizacionAprobadaAt"
  - "Both sections gated on caso.solicitud metadata — pago/aplicación case detail is byte-identical (no regression); own-only .find() resolution untouched"
affects: [v7-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presentation-layer SLA: resolveExpectedResponse applied at render time over pass-through solicitud metadata (the mapper normalizes, the detail computes the estimate) — never blank, soft 'hacia el', 'estimado' chip"
    - "Backend-sourced transparency card: a Ley 820 outcome is RENDERED (dueño/inquilino/compartido) from server metadata, never derived client-side"
    - "Approve-only, contract-first affordance: single tenant-initiated state change via approveCotizacion; PqrsUnavailableError → honest 'Próximamente'; approved state reflects ONLY a server timestamp (no optimistic flip)"
    - "Additive gating on optional metadata: new detail sections render only when caso.solicitud (and costoResponsable) exist, keeping the pago/aplicación path unchanged"

key-files:
  created:
    - src/components/tenant/CostoResponsabilidadCard.tsx
  modified:
    - src/app/inquilino/casos/[caseId]/page.tsx

key-decisions:
  - "SLA is computed in the detail (presentation layer), not in the mapper: resolveExpectedResponse runs at render over caso.solicitud.createdAt/slaVenceAt, honoring the wave-1/2 normalize-never-compute split"
  - "Frontend renders, never decides: costoResponsable and cotizacionMonto are read straight from backend metadata; the card returns null when costoResponsable is unset ('not determined yet')"
  - "Approve-only + honest degrade: the tenant only approves (no provider designation, no amount edit, no self-close); PqrsUnavailableError yields a soft 'Próximamente' toast, never a fake 'aprobado'"
  - "Neutral, non-deadline framing: 'estimado' chip + soft 'hacia el {date}' + tooltip; no red/destructive classes, no live countdown, no due-date claim on the estimate (Ley 1480)"

patterns-established:
  - "Pattern 1: presentation-layer two-tier SLA row on a unified detail, gated on optional case metadata (never blank, 'estimado'-labeled)"
  - "Pattern 2: Ley 820 cost-transparency card with an approve-only, contract-first quote affordance that degrades honestly"

requirements-completed: [SOLI-03, SOLI-04]

# Metrics
duration: ~20min
completed: 2026-07-19
---

# Phase v7-06 Plan 04: Caso Detail SLA + Ley 820 Cost Transparency Summary

**Completed the phase on the UNIFIED caso detail: a never-blank "Respuesta esperada" SLA row (authoritative `slaVenceAt` ?? weekday estimate labeled "estimado", neutral tone — the presentation-layer application of wave-1's `resolveExpectedResponse`) plus a new `CostoResponsabilidadCard` that renders the BACKEND-sourced Ley 820 cost responsibility (dueño/inquilino/compartido) and an approve-only, contract-first "Aprobar cotización" affordance that degrades to an honest "Próximamente" — never a fabricated "aprobado". Both sections are gated on `caso.solicitud`, so pago/aplicación cases stay byte-identical; own-only resolution untouched; build green; zero new npm packages.**

## Performance

- **Duration:** ~20 min (first task commit → SUMMARY)
- **Tasks:** 2
- **Files created:** 1 · **Files modified:** 1

## Accomplishments

- **SOLI-03 (SLA row on the detail):** `casos/[caseId]/page.tsx` computes `resolveExpectedResponse(caso.solicitud.createdAt, caso.solicitud.slaVenceAt)` ONLY when `caso.solicitud` is present, and renders a "Respuesta esperada" field in the summary-card `dl` grid (next to Responsable / Actualizado) with a neutral `CalendarBlank` icon. Authoritative → es "Respuesta a más tardar el {es-CO date}"; estimate → es "Respuesta estimada hacia el {date}" + a subtle `· estimado` chip with a `title` tooltip ("Fecha estimada; tu inmobiliaria confirma la definitiva."). es-CO long date via `Intl.DateTimeFormat`. Never blank, neutral styling only — no red/`destructive` classes, no countdown, no hard-deadline framing on the estimate. The timeline, the own-only `.find()` resolution, and the pago/aplicación render path are untouched.
- **SOLI-04 (Ley 820 cost card + quote approval):** new `CostoResponsabilidadCard.tsx` (`'use client'`, props `{ caseId, solicitud }`) renders the BACKEND-sourced `costoResponsable` as a factual es-CO/en label in a primary-soft info sub-banner (dueño → propietario / inquilino → a cargo tuyo / compartido → costo compartido — all "Ley 820"). The card returns `null` when `costoResponsable` is unset (not determined yet). When `estado === 'en_cotizacion'` AND `costoResponsable === 'inquilino'`, it shows `cotizacionMonto` formatted COP (`useI18n().formatCurrency`) and an "Aprobar cotización" `Button` (sentence case) wired to `pqrsApi.approveCotizacion(caseId)` with an `isApproving` loading state; on `PqrsUnavailableError` it shows an honest "Próximamente" toast, on other errors a retry toast. If `cotizacionAprobadaAt` is set it shows a read-only "Aprobada el {es-CO date}" instead of the button. The card carries NO provider-designation control, NO amount edit, NO estado mutation / self-close — the tenant only approves.
- **Wiring:** the card is rendered in `CaseDetail` gated on `caso.solicitud && caso.solicitud.costoResponsable`, placed between the summary card and the timeline — so it appears only for PQRS/mantenimiento cases that carry a cost determination.

## Task Commits

Each task committed atomically (explicit-path `git add`, not pushed — local for the tren de versiones):

1. **Task 1: SLA "Respuesta esperada" row on the caso detail (SOLI-03)** — `9ec7cb57` (feat) — `GATE_OK`
2. **Task 2: Ley 820 CostoResponsabilidadCard + quote approval, wired into the detail (SOLI-04)** — `8258884c` (feat) — `GATE_OK`
3. **Comment hygiene: reword SLA comment to avoid a literal deadline token (rule 6)** — `e510693d` (docs, comment-only, no behavior change)

**Plan metadata:** this SUMMARY committed separately (docs: complete plan).

## Files Created/Modified

- `src/components/tenant/CostoResponsabilidadCard.tsx` (new) — Ley 820 transparent cost label + approve-only, contract-first quote affordance (honest "Próximamente" on unavailable; read-only "Aprobada el {date}"; no provider/amount/close controls)
- `src/app/inquilino/casos/[caseId]/page.tsx` (modified) — imports `resolveExpectedResponse` + `CostoResponsabilidadCard` + `CalendarBlank`; computes/renders the never-blank "Respuesta esperada" SLA row gated on `caso.solicitud`; renders `CostoResponsabilidadCard` gated on `caso.solicitud.costoResponsable`

## Decisions Made

- **SLA computed at the presentation layer, not the mapper.** `pqrsToCase` (wave 2) passes SLA/cost fields through verbatim on `caso.solicitud`; the detail is where `resolveExpectedResponse` runs, keeping the wave-1/2 "normalize-never-compute" split intact.
- **Frontend renders, never decides.** `costoResponsable`/`cotizacionMonto` come straight from backend metadata; the card returns `null` when responsibility is unset, so an undetermined case shows nothing rather than a client-guessed outcome.
- **Approve-only + honest degrade.** The single tenant-initiated action is `approveCotizacion`; `PqrsUnavailableError` yields a soft "Próximamente" toast and the approved state reflects ONLY a server `cotizacionAprobadaAt` — no optimistic flip, no fabricated "aprobado", no provider/amount/close affordances.
- **Neutral, non-deadline framing (Ley 1480).** The estimate is labeled `· estimado` with a soft "hacia el {date}" and a tooltip; there is no red styling, no live countdown, and no due-date claim on the estimate.

## Deviations from Plan

**None — plan executed exactly as written.** Rules 1–4 not triggered; no auth gates; no package installs; no architectural decisions.

One gate-hygiene note (not a deviation): my Task-1 SLA comment initially contained the literal phrase the guardrail forbids on-screen (the "vence el …" framing). Although no plan gate greps for it, per milestone rule 6 (keep forbidden literal tokens out of authored files INCLUDING comments) I reworded the comment to describe the avoided hard-deadline framing without the banned token (`e510693d`, comment-only). No production behavior changed. The pre-existing v7-03 comment on line 20 ("no countdown") was left as-is (not authored by this plan).

## Issues Encountered

- TypeScript control-flow narrowing does not persist into a nested closure, so the SLA computation was hoisted to a `const sla = caso.solicitud ? resolveExpectedResponse(...) : null` in the `CaseDetail` body (ternary narrows `caso.solicitud`) rather than an inline IIFE inside the JSX. The card wiring uses `caso.solicitud && caso.solicitud.costoResponsable && (...)`, which narrows `caso.solicitud` for the `solicitud={caso.solicitud}` prop. Both compile clean under `next build`'s type check.

## Verification

- **`pnpm build`: GREEN** (task `bacrraczk` exit code 0, "✓ Compiled successfully", 206/206 static pages generated). This is the real gate — repo CI does NOT run `next build`. Only pre-existing warnings (`<img>` / `react-hooks/exhaustive-deps` in unrelated files); none from the two changed files. The `e510693d` follow-up is comment-only and cannot affect the build.
- **Per-task gates:** Task 1 `GATE_OK` (resolveExpectedResponse + caso.solicitud + estimado + es-CO present; red/`destructive` className count = 0); Task 2 `GATE_OK` (costoResponsable + approveCotizacion + PqrsUnavailableError + "Ley 820" present in the card; card wired into the page; provider/cost/self-close forbidden-token count = 0).
- **Guardrails honored:** SLA never blank + "estimado" label + neutral tone (no red/countdown/hard-deadline); `costoResponsable`/`cotizacionMonto` backend-sourced (frontend renders, never decides); approve-only (no provider designation / no amount edit / no self-close); honest "Próximamente" on unavailable (no fake "aprobado"); own-only `.find()` resolution untouched (no IDOR); es-CO copy; buttons sentence case (DESIGN §4); zero new npm packages; not pushed (local commits for the tren de versiones).

## Threat Register Coverage

All `mitigate` dispositions in the plan's `<threat_model>` are implemented:
- **T-v7-06-10** (Elevation of Privilege, CostoResponsabilidadCard) → the tenant APPROVES only; no provider-designation control, no amount edit, no estado mutation / self-close (grep-gated, count = 0). `costoResponsable`/`cotizacionMonto` are backend-sourced and rendered, never derived. ✅
- **T-v7-06-11** (Tampering, quote approval state) → `approveCotizacion` → `PqrsUnavailableError` → honest "Próximamente"; the approved state reflects ONLY a server `cotizacionAprobadaAt`; no optimistic flip to "aprobado". ✅
- **T-v7-06-12** (Info Disclosure / Compliance, SLA + own-only detail) → two-tier resolver never blank; estimate labeled "estimado" + soft "hacia el" (no false "late"); detail resolved own-only from `useTenantCases().find()` (no fetch-by-id, no IDOR). Neutral tone (Ley 1480). ✅
- **T-v7-06-SC** (supply chain) → N/A: zero new dependencies, no install task. ✅

## User Setup Required

None. The PQRS routes (`GET /pqrs/mine`, `POST /pqrs/:id/aprobar-cotizacion`) and the real `slaVenceAt` / `costoResponsable` / `cotizacionMonto` are a disclosed external dependency (NestJS/agent, M1). Until they land, `listMine` returns `[]` (no PQRS rows reach the detail), and if/when a case carries `en_cotizacion` + tenant cost, "Aprobar cotización" degrades to an honest "Próximamente" — the honest frontend-first posture by design.

## Next Phase Readiness

- This is the LAST plan of phase v7-06 — the SLA + Ley 820 cost transparency close SOLI-03/04 on the unified detail. When the M1 backend lands real PQRS rows with `slaVenceAt`/`costoResponsable`/`cotizacionMonto`, the SLA row swaps from "estimado" to authoritative and the cost card lights up with the real approve flow — no further frontend change needed beyond the provisional endpoint paths (Assumptions A1/A4).
- v7-07 (Acuerdos/Contratos) still shows as "Próximamente" in the hub, untouched by this plan.

## Self-Check: PASSED

- `src/components/tenant/CostoResponsabilidadCard.tsx` FOUND (costoResponsable + approveCotizacion + PqrsUnavailableError + "Ley 820" present)
- `src/app/inquilino/casos/[caseId]/page.tsx` FOUND (resolveExpectedResponse + caso.solicitud + estimado + es-CO + CostoResponsabilidadCard present; red/destructive className count = 0)
- Commits `9ec7cb57`, `8258884c`, `e510693d` FOUND in git log
- `pnpm build` GREEN (exit 0, ✓ Compiled successfully)

---
*Phase: v7-06-solicitudes-pqrs*
*Completed: 2026-07-19*
