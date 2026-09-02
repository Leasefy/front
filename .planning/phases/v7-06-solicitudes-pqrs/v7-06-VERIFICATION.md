---
phase: v7-06-solicitudes-pqrs
verdict: GOAL ACHIEVED (frontend-first)
verified: 2026-07-19
method: goal-backward (code-level, legal-forward)
---

# Verification — Phase v7-06: Solicitudes / PQRS

## Verdict: ✅ GOAL ACHIEVED (frontend-first)

The tenant can **open a maintenance/repair request** (description + real photos) and a **formal PQRS typed by REUSING `pqrs.types.ts`** (no fork — the agency page's estado vocabulary is untouched), sees an **SLA that is never blank** (authoritative `slaVenceAt` or a hand-rolled `createdAt + 15 días hábiles` estimate labeled **"estimado"**, neutral tone), tracks it in the **unified v7-03 caso timeline**, and gets **Ley 820 cost-responsibility transparency** with an **approve-only quote affordance**. Real create/list/approve settlement is gated on the NestJS/agent PQRS CRUD + triage engine — backend, disclosed, honest "Próximamente" (no fabricated radicado/rows).

> **Provenance:** the `gsd-verifier` agent has been unreliable this session; verification was done by the orchestrator via each plan's grep gates (all `GATE_OK`), the phase-wide fork gate (`PqrsEstado` declared exactly once), the anti-IDOR / no-red-className / no-self-close negative gates (all 0), the 63/63 v7-06 unit tests, and two clean `pnpm build` runs (EXIT 0). All 4 executors completed cleanly this phase (no mid-run API deaths).

## Success-criteria map

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | SOLI-01 — maintenance/repair request with description + photos | ✅ TRUE (frontend-first) | `NuevaSolicitudModal.tsx`: tipo + descripción + real file-picker → `pqrsApi.create` → `documentsApi.upload` (create-then-attach, no orphan). Photo retrieval documented via `getSignedUrl` (anti-IDOR, v7-02 lesson); **0** `getDownloadUrl` in the modal. On `PqrsUnavailableError` → honest "Próximamente", **no fabricated radicado**. |
| 2 | SOLI-02 — formal PQRS typed, REUSING `pqrs.types.ts` (no fork) | ✅ TRUE (crux) | `pqrs.types.ts` extended ADDITIVELY (`CostoResponsable` + optional `costoResponsable?`/`cotizacionMonto?`/`cotizacionAprobadaAt?`); agency exports untouched. **Fork gate: `PqrsEstado`/`SolicitudPqrs` declared exactly once** (phase-wide grep = 1). `solicitanteTipo` server-assigned from JWT (create input omits it; **0** in the modal). Agency `/panel/inmobiliaria/pqrs` renders the same entity → same estado vocabulary, no agency change. |
| 3 | SOLI-03 — status timeline with SLA 15 días hábiles computed + visible, never blank; interim "estimado" | ✅ TRUE | Pure hand-rolled `addBusinessDays` (Mon-Fri, no holidays per ROADMAP:135, **0 new npm packages**) + two-tier `resolveExpectedResponse` (authoritative `slaVenceAt` ?? `createdAt+15` estimate — never blank), reusing `PQRS_SLA_BUSINESS_DAYS=15`. Computed in the **presentation layer** (list row + `casos/[caseId]` detail), NOT in `pqrsToCase`/`tenant-case.ts` (which stays pure pass-through — normalize-never-compute). Interim labeled **"estimado"**, soft-framed, **neutral only** (red/`destructive` className count = 0; `CaseTone` has no alarm member). Folds into the v7-03 hub via `useTenantCases`; **0 PQRS rows when `listMine()` → `[]`** (unit-proven — the "Próximamente" placeholder holds). |
| 4 | SOLI-04 — cost responsibility (Ley 820) + quote approval before execution | ✅ TRUE (frontend-first) | `CostoResponsabilidadCard.tsx` renders the **backend-sourced** `costoResponsable` (dueño/inquilino/compartido) as a factual Ley-820 label (returns `null` if unset — never a computed guess). Approve-only "Aprobar cotización" (sentence case) via `pqrsApi.approveCotizacion` when `en_cotizacion` + tenant-cost → honest "Próximamente" on `PqrsUnavailableError` (**no fake "aprobado"**). Tenant NEVER assigns providers / edits cost / self-closes (forbidden-token gate = 0). |

## Legal / product invariants (verified)

- **No fork of `pqrs.types.ts`** ✅ — reused by import + additive optional fields; single declaration phase-wide.
- **SLA never blank + "estimado"** ✅ — two-tier resolver, neutral tone, no countdown, no red className.
- **Anti-IDOR** ✅ — `getMine(id)` resolves from `listMine().find()` (own-only, no fetch-by-id); the only `/pqrs/${id}` is the `approveCotizacion` action on the tenant's own resource; photos via `getSignedUrl`.
- **Tenant never self-serves the agency's job** ✅ — no provider-assign, no cost-input, no `setEstado`/self-close (grep = 0).
- **Additive** ✅ — pago/aplicación cases byte-identical; agency PQRS page untouched; 0 PQRS rows when backend empty.
- **Zero new npm packages** ✅ across the entire phase (`package.json`/`pnpm-lock.yaml` unchanged `2526cdbc..HEAD`).

## Honesty boundaries (accepted, not faked)

- **Create / list / approve settlement** — needs NestJS/agent PQRS CRUD tenant-scoped (`POST /pqrs`, `GET /pqrs/mine`, `POST /pqrs/:id/aprobar-cotizacion` — JSDoc-tagged provisional). Today `listMine → []`, `create`/`approveCotizacion → PqrsUnavailableError` → honest "Próximamente"; **no fabricated radicado/rows**.
- **Authoritative SLA** (`slaVenceAt`) — from the M1 triage engine; the interim weekday estimate is explicitly "estimado".
- **`costoResponsable` value + quote amount** — the agency determines them (Ley 820); the frontend only displays + lets the tenant approve.
- **PQRS-photo retrieval/display** — deferred; any future display must use `getSignedUrl` (guarded).

## Build & tests

- `pnpm build` — **green (EXIT 0)** on the full stack (new route `○ /inquilino/solicitudes 14.4 kB`; 206/206 static pages).
- v7-06 unit tests — **63/63 passed** (`business-days` 9, `pqrs.service` 19, `tenant-case` 16, `use-tenant-cases` 19).
- Full suite baseline: **7 pre-existing** unrelated failures (asegurabilidad ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels — see v7-01 `deferred-items.md`); **0 new**. (Occasionally +5 flaky timeouts in the unrelated `panel/inmobiliaria/ai/cobranza/plantillas/*` agency suite under parallel load — they pass in isolation; not touched by v7-06.)

## Follow-ups (not gaps in v7-06)

- **Backend/agent**: PQRS CRUD tenant-scoped (create+photos, `/pqrs/mine`, approve-cotización) with RLS; the triage engine's real `slaVenceAt`; the agency's `costoResponsable` determination + quote engine; PQRS-scoped photo `entityType` + signed retrieval; Supabase Realtime (interim uses `useVisibilityPolling`).

**Commit stack:** `ba4907b5` `609cd9e6` `14c499b4` (01) · `cbb11c0b` `c1488285` `f3e1d17a` (02) · `c677bb64` `90982c41` `5b843590` (03) · `9ec7cb57` `8258884c` (04) · docs `0b8428e3` `ea5e05fd` `3fb76ae2` `e510693d` `1988fce4`, plan+check `2526cdbc` `e0f33119`. Local on `plan/v7.0-portal-inquilino`; not pushed.
