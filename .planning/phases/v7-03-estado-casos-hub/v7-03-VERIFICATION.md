---
phase: v7-03-estado-casos-hub
verdict: GOAL ACHIEVED (frontend-first)
verified: 2026-07-18
method: goal-backward (code-level)
---

# Verification — Phase v7-03: Estado de Casos (Hub "Mis casos")

## Verdict: ✅ GOAL ACHIEVED (frontend-first) — fixes P1

The tenant now has a single "Mis casos" hub that aggregates their open cases with estado, responsable (role), and a per-case timeline — the direct fix for P1 (operate the relationship in one place, not just a complaint channel). Real case data comes from pagos + application-journey; PQRS/mantenimiento (v7-06) and acuerdos (v7-07) render as honest "Próximamente" sections — **zero fabricated cases**.

> **Provenance:** the `gsd-verifier` agent has been unreliable this session (API stalls/errors); this verification was done by the orchestrator via each plan's passing grep gates + the 12/12 unit test, a green `pnpm build` on the full stack, and consolidated goal-level greps against the committed code.

## Success-criteria map

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | CASO-01 — "Mis casos" aggregates open cases (pagos + …) with estado + responsable | ✅ TRUE (frontend-first) | `casos/page.tsx` renders `useTenantCases()` real rows (pago + aplicación) with neutral badges + `responsable` role; PQRS/mant/acuerdos = honest "Próximamente" sections (0 fabricated rows, unit-tested); dashboard `page.tsx` shows the real `openCasesCount` linking to the hub. |
| 2 | CASO-02 — each case links to its detail + timeline; own-cases-only | ✅ TRUE | Hub rows link via `detailLink` → `/inquilino/casos/[caseId]` (the unified detail+timeline; **fixed** `d559e54b` — was orphaned). Detail resolves by `cases.find(c => c.id === caseId)` on the JWT-scoped aggregate — **no raw-id fetch** (0 fetch-by-id). Timeline built from `case.events` (source timestamps only). `responsable` = role; no `responsableId`/internal notes in the view-model. |
| 3 | CASO-03 — in-app notification on state change; push/WhatsApp "Próximamente" | ✅ TRUE (frontend-first) | Hub CASO-03 strip deep-links to the REAL `/inquilino/notificaciones` (`useTenantNotifications`, templates fire for PAYMENT/APPLICATION/CONTRACT/LEASE — the hub's real case types). Push/WhatsApp rendered disabled "Próximamente" (no case-change emitter / no gateway yet — backend). |
| 4 | (guardrail CASO-04) trace to source; neutral "al día" states | ✅ TRUE | `CaseTone = 'neutral'|'info'|'attention'` — the type literally cannot express `danger`/alarm; mappers are pure/total, no recomputed saldo/SLA/status; a fully-al-día tenant sees a neutral "Todo al día" empty-state. |

## Honesty boundaries (accepted, not faked)

- **PQRS + mantenimiento = v7-06**, **acuerdos = v7-07** → honest "Próximamente" sections; the `CaseType` union declares them for forward-compat but the aggregator emits ZERO rows (unit-tested).
- **Application-journey included** as real cases (R1 scope, checker-approved); a contract pending signature surfaces THROUGH its application case (no double-counted contrato row); the active lease is a **context header**, not a row.
- **Double-count fix**: a current-period REJECTED payment yields exactly ONE 'pago' row (próximo-pago row emitted only for `NONE`) — unit-tested.
- **Own-cases-only**: relies on the source hooks' `/…/mine` JWT scoping; no tenant-supplied id ever drives a fetch.

## Build & tests

- `pnpm build` — **green** on the full stack (routes `/inquilino/casos` + `/inquilino/casos/[caseId]` registered).
- `pnpm test` — `use-tenant-cases.test.ts` 12/12; overall 594 passed / **7 pre-existing** unrelated failures (`deferred-items.md`). **0 new failures.**

## Follow-ups (not gaps in v7-03)

- **v7-06** (PQRS/mantenimiento) and **v7-07** (acuerdos): once their tenant backends exist, they emit real rows into the hub the same way (the aggregator + "Próximamente" sections are the seams).
- **Backend**: a `CASE_STATUS_CHANGED` notification type + push/WhatsApp emitter would upgrade CASO-03's proactive channel; realtime tenant RLS in `agent` would replace the polling fallback.

**Commit stack:** `c0102f8a` · `20c3b90f` · `d9e90458` · `ee785269` · `d559e54b` (+ docs `45b89410`, `7980701b`). Local on `plan/v7.0-portal-inquilino`; not pushed.
