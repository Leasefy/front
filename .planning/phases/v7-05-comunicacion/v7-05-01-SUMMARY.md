---
phase: v7-05-comunicacion
plan: 01
subsystem: ui
tags: [messages, chat, lease-scope, nextjs, contract-first, es-CO]

# Dependency graph
requires:
  - phase: v7-03-casos
    provides: "casos/[caseId] read-only detail (TenantCase, own-cases-only resolution) to deep-link from"
provides:
  - "Lease-scoped chat read/send CONTRACT (getMessagesByLease/sendMessageByLease) that degrades to null on 404/403/0 (honest-unavailable), applicationId path untouched"
  - "Optional leaseId?/caseId? on BackendConversation, BackendConversationWithMessages, ChatConversation + mapper passthrough (undefined until backend returns them)"
  - "Tenant-only arriendo context header on the shared MessagesWidget (real property, honest 'próximamente' note, no presence)"
  - "Caso detail → tenant chat inbox deep-link (no fabricated thread)"
affects: [v7-05-02, v7-05-03, v7-06-pqrs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isEndpointUnavailable (404/403/0) honest-unavailable idiom on messages.service.ts (copied verbatim from lease-documents.service.ts)"
    - "Contract-first lease-scoped read/send returning `... | null` — never a fabricated thread"
    - "actor-gated additive UI on the shared widget (isTenant) — landlord/agency byte-identical"

key-files:
  created: []
  modified:
    - src/lib/api/messages.types.ts
    - src/lib/api/messages.service.ts
    - src/components/messages/MessagesWidget.tsx
    - src/app/inquilino/casos/[caseId]/page.tsx

key-decisions:
  - "Lease-scoped chat is a backend dep (NestJS lease-scoped messages.service.ts); shipped as a typed contract + honest null today, never a faked lease thread"
  - "Context header uses the REAL selectedConversation.property field only — ties the chat to the arriendo visually now, before the server groups by lease"
  - "Caso detail links to the inbox (/inquilino/mensajes) because TenantCase carries no applicationId/leaseId — no fabricated preselected thread"

patterns-established:
  - "Pattern 1: honest-unavailable contract for a not-live lease-scoped route (null, never fabrication)"
  - "Pattern 2: actor-gated additive composition on a shared multi-actor widget"

requirements-completed: [COMU-01]

# Metrics
duration: ~20min
completed: 2026-07-19
---

# Phase v7-05 Plan 01: Comunicación atada al arriendo/caso Summary

**Lease-scoped chat read/send landed as a contract-first `... | null` (honest-unavailable on 404/403/0), plus a tenant-only arriendo context header from the real property and a caso→chat inbox deep-link — all additive, applicationId path and landlord/agency behavior untouched.**

## Performance

- **Duration:** ~20 min (first task commit → SUMMARY)
- **Started:** 2026-07-19T21:00Z (approx)
- **Completed:** 2026-07-19T21:15Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- **COMU-01 core contract:** `messages.service.ts` gains `getMessagesByLease(leaseId)` / `sendMessageByLease(leaseId, content)` modeled 1:1 on the applicationId shape, wrapped in `isEndpointUnavailable` (404/403/0) so a not-live NestJS lease route resolves to `null` — never a fabricated lease thread. The existing `getMessages`/`sendMessage`/`markAsRead`/`getConversations` are byte-identical.
- **Types:** optional `leaseId?`/`caseId?` added to `BackendConversation`, `BackendConversationWithMessages`, and `ChatConversation`; `mapToConversation` passes them through ONLY when the backend returns them (undefined today, never derived from `applicationId`).
- **Arriendo context header:** for `actor === 'tenant'` only, a slim banner ("Sobre tu arriendo — {property}") renders above the messages scroll region from the REAL `property` field, with an honest per-arriendo "próximamente" disclosure. landlord/agency render nothing new.
- **Caso → chat:** the caso detail summary card gains a sentence-case "Escribir a la inmobiliaria" secondary button → `/inquilino/mensajes` (inbox only, no fabricated thread param). `ChatCircle` added to the Phosphor import.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lease-scoped read/send CONTRACT + leaseId?/caseId? types** - `d58b9526` (feat)
2. **Task 2: Actor-gated tenant arriendo context header** - `c59aef4b` (feat)
3. **Task 3: Deep-link from the caso detail to the tenant chat** - `8e83d12c` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `src/lib/api/messages.types.ts` - optional `leaseId?`/`caseId?` on the two backend conversation types + `ChatConversation`; mapper passthrough
- `src/lib/api/messages.service.ts` - `isEndpointUnavailable` + `getMessagesByLease`/`sendMessageByLease` contract (null on not-live route)
- `src/components/messages/MessagesWidget.tsx` - tenant-only arriendo context header (real property, honest note, no presence)
- `src/app/inquilino/casos/[caseId]/page.tsx` - "Escribir a la inmobiliaria" deep-link to the chat inbox + `ChatCircle` import

## Decisions Made
- Lease-scoped chat is a backend dependency → shipped as a typed contract returning `... | null` plus an honest "próximamente" disclosure in the UI, never a fabricated thread (mirrors `lease-documents.service.ts`).
- The context header uses the real `property` field so the chat reads as tied to the arriendo NOW, before the server groups by lease.
- The caso deep-link targets the inbox because `TenantCase` carries no application/lease id — an honest link, not a fabricated `?applicationId=`.

## Deviations from Plan

None - plan executed exactly as written. All three tasks landed as specified with no auto-fixes required. Two grep gates initially failed because explanatory code comments contained the very tokens the gates forbid (`online/typing` in Task 2; `?applicationId=` in Task 3); the comments were reworded (no behavior change) and both gates then printed `GATE_OK`. This is a gate-hygiene fix, not a deviation from the plan's intent.

## Issues Encountered
- Task 2 / Task 3 grep gates matched my own inline comments (the negation prose used the forbidden tokens). Resolved by rewording the comments ("presence/liveness indicators"; "no fabricated query param") — no runtime/behavior impact.

## Verification
- **`pnpm build`: GREEN** (EXIT=0, "Compiled successfully"). Touched routes compiled: `/inquilino/casos/[caseId]`, `/inquilino/mensajes`. This is the real gate (repo CI does not run `next build`).
- **`pnpm test`: 601 passed / 7 failed (608 total).** The 7 failures are the exact pre-existing baseline set documented in v7-01 `deferred-items.md` (asegurabilidad, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels) — **zero NEW failures**, none related to messages/casos.
- **Grep gates:** Task 1 `GATE_OK`, Task 2 `GATE_OK`, Task 3 `GATE_OK`.
- **Guardrails honored:** no faked lease thread (404/403/0 → null); context header from REAL property only; zero online/typing/presence tokens in the widget; applicationId path intact; landlord/agency unchanged; buttons sentence case (DESIGN.md §4); zero new npm packages.

## User Setup Required
None - no external service configuration required. The lease-scoped chat route (`/leases/:id/chat*`) is an external NestJS dependency; until it is live the contract resolves to `null` and the UI keeps the app-scoped chat + honest "próximamente".

## Next Phase Readiness
- Wave 1 seeds the shared service/types/widget that v7-05-02 and v7-05-03 build on (all three touch `MessagesWidget.tsx` → strictly sequential). The optional `leaseId?`/`caseId?` fields and the lease-scoped contract are in place for the next waves to consume.
- No blockers. Real per-arriendo threading unlocks once NestJS ships the lease-scoped chat route.

## Self-Check: PASSED
- `src/lib/api/messages.service.ts` FOUND (getMessagesByLease/sendMessageByLease/isEndpointUnavailable present)
- `src/lib/api/messages.types.ts` FOUND (leaseId/caseId present)
- `src/components/messages/MessagesWidget.tsx` FOUND ("Sobre tu arriendo" present)
- `src/app/inquilino/casos/[caseId]/page.tsx` FOUND (/inquilino/mensajes present)
- Commits `d58b9526`, `c59aef4b`, `8e83d12c` FOUND in git log

---
*Phase: v7-05-comunicacion*
*Completed: 2026-07-19*
