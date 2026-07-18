---
phase: v7-02-documentos-arriendo
plan: 04
subsystem: portal-inquilino / documentos
tags: [paz-y-salvo, cert-retencion, contract-only, empty-state, honesty, DOCU-02, DOCU-03]
requires:
  - v7-02-03 (documentos page hardened — Habeas Data + signed URL + ARCO)
  - avaluo async flow (request id → poll status → presigned downloadUrl)
provides:
  - leaseDocumentsApi (contract-only api-client: paz y salvo + cert. retención)
  - Paz y salvo + cert. retención 3.5% sections on the documentos page (honest "Próximamente")
affects:
  - src/app/inquilino/documentos/page.tsx
tech-stack:
  added: []          # zero new packages
  patterns: [avaluo-async-contract, empty-state-proximamente, 403/404-degrade]
key-files:
  created:
    - src/lib/api/lease-documents.service.ts
  modified:
    - src/app/inquilino/documentos/page.tsx
decisions:
  - "Frontend never computes the 3.5% withholding number — backend/DIAN owns it (fiscal single source of truth)."
  - "No fabricated PDF / signed URL / 'sin deuda' status on any tenant-reachable path — both sections stay on honest 'Próximamente'."
  - "Contract modeled 1:1 on avalúo async flow; 403/404/offline degrade to unavailable, never a fake id/downloadUrl."
metrics:
  duration: ~20m
  completed: 2026-07-17
---

# Phase v7-02 Plan 04: Paz y salvo + Certificado de retención 3.5% Summary

**One-liner:** Contract-only `leaseDocumentsApi` (avalúo-style request → poll → presigned
`downloadUrl`) plus two honest "Próximamente" sections on the tenant documentos page for paz y
salvo (DOCU-02) and cert. retención en la fuente 3.5% (DOCU-03) — zero fabricated legal/fiscal
document, status, or number.

## What was built

### Task 1 — `src/lib/api/lease-documents.service.ts` (NEW)
- `leaseDocumentsApi` with `requestPazYSalvo(leaseId)`, `requestCertRetencion(leaseId, year)`,
  and `getStatus(id)`, modeled 1:1 on the avalúo async flow.
- Types: `LeaseDocRequestResponse { id }`, `LeaseDocStatusResponse { status: 'pending' |
  'processing' | 'ready' | 'unavailable'; downloadUrl?; expiresAt? }` — the presigned
  `downloadUrl` is only ever set by the backend when `status === 'ready'`.
- 403 / 404 / offline (`ApiError(0)`) → the request methods rethrow
  `LeaseDocumentUnavailableError` and `getStatus` resolves to `{ status: 'unavailable' }`. No
  fabricated `id` or `downloadUrl`.
- File-level JSDoc marks both as backend-owned LEGAL (paz y salvo) / FISCAL (retención 3.5%)
  documents; the frontend never computes the withholding number.

### Task 2 — `src/app/inquilino/documentos/page.tsx` (extended, additive)
- Added two sections (`grid lg:grid-cols-2`) below "Documentos del arriendo": **Paz y salvo**
  and **Certificado de retención en la fuente (3.5%)**, each a card (DESIGN.md §4) with an
  icon tile + honest description + `EmptyState` (DESIGN.md §11) titled **"Próximamente"**.
- Wired `leaseDocumentsApi` via `handleGenerateLeaseDoc(kind)`: on click it exercises the
  contract (request → `getStatus`); because no endpoint is live it degrades to a "próximamente"
  toast and the section stays on the empty-state. The presigned `downloadUrl` is opened ONLY
  if the backend itself reports `status === 'ready'` (future path, unreachable today).
- `leaseId` from `useLeases().getActive()[0]?.id`; the "Solicitar" button is disabled (with a
  tooltip) when there is no active lease.
- Icons: `FileText` (paz y salvo), `Certificate` (retención), `Clock` (empty-state). `Certificate`
  added to the existing Phosphor import.

## Honesty guardrails (verified)
- No fabricated downloadable PDF or signed URL on any tenant-reachable path.
- No fake "sin deuda" / "paz y salvo" status rendered.
- No client-computed / displayed 3.5% retención amount.
- No claim the document was "generado".
- No `"factura"` string (grep count = 0).
- Additive: contrato firmado, recibos, Habeas Data consent, signed-URL viewer, and ARCO delete
  (plan 01/03) all remain intact.

## Deviations from Plan

None — plan executed as written. The plan offered "button disabled with 'Próximamente' label OR
triggers the honest empty-state"; implemented as an enabled "Solicitar" button (when an active
lease exists) that exercises the contract and resolves to an honest "próximamente" toast — the
empty-state is the primary honest surface either way.

## Grep gates
- Task 1: `GATE_OK` (`leaseDocumentsApi` + `requestPazYSalvo` + `requestCertRetencion` + `downloadUrl`).
- Task 2: `GATE_OK` (`leaseDocumentsApi` + "paz y salvo" + "retención" + "Próximamente", zero "factura").

## Build / Test
- `pnpm -C /Users/nicolasgarcia/rent/mvp-portal-inquilino build`: **PASSED** (`✓ Compiled
  successfully`; `/inquilino/documentos` route built at 23.9 kB).
- `pnpm test`: **582 passed / 7 failed** — identical to the documented baseline. The 7 failures
  are the pre-existing ones (asegurabilidad, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable,
  risk-levels) per `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md`. **0 NEW failures.**

## Self-Check: PASSED
- `src/lib/api/lease-documents.service.ts` — FOUND
- `src/app/inquilino/documentos/page.tsx` — FOUND (modified)
- Both grep gates print `GATE_OK`; build passes; no new test failures.

## Commit
- Single atomic commit — `feat(v7-02): paz y salvo + cert. retención 3.5% contract + honest
  "Próximamente" (DOCU-02/03)` (see `git log` on `plan/v7.0-portal-inquilino`). Not pushed; no PR.
