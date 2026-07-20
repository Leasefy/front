---
phase: v7-06-solicitudes-pqrs
plan: 03
subsystem: tenant-solicitudes
tags: [pqrs, solicitudes, sla, modal, file-upload, additive, es-CO, honest-degrade, anti-idor, ley-1480, ley-2300, ley-820]

# Dependency graph
requires:
  - phase: v7-06-01
    provides: "pqrsApi.create/listMine (PqrsUnavailableError, no fabricated radicado), NuevaSolicitudInput (no client-set requester role), resolveExpectedResponse (two-tier, never blank)"
  - phase: v7-06-02
    provides: "useTenantPqrs tolerant list hook, pqrsStatusToTone/Label mappers (capped at 'attention'), pqrsToCase fold into useTenantCases (detailLink → /inquilino/casos/[id])"
provides:
  - "NuevaSolicitudModal: shared-entity create Dialog (6 PqrsTipo + asunto + descripcion + real photo picker) → pqrsApi.create → documentsApi.upload; honest 'Próximamente' on PqrsUnavailableError, no orphan upload"
  - "/inquilino/solicitudes list: own-requests via useTenantPqrs with a never-blank per-row SLA estimate (resolveExpectedResponse, 'estimado' label), neutral tone, honest empty-state, rows deep-link to the unified caso detail"
  - "'Solicitudes' nav entry (Lifebuoy) + a real 'Nueva solicitud' entry-point card on the caso hub replacing the PQRS/mantenimiento 'Próximamente' placeholders (Acuerdos stays 'Próximamente' for v7-07)"
affects: [v7-06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PayRentModal shell reuse (AnimatePresence backdrop + useLenis().stop()/start() + data-lenis-prevent) for a tenant create Dialog"
    - "MessagesWidget photo-picker idiom (hidden multiple input, image/*+pdf, 10 MB cap, value reset, removable chips) wired to the REAL documentsApi.upload path"
    - "create-then-attach sequencing: photos upload ONLY after a real create id (entityType 'pqrs') — never orphaned; PqrsUnavailableError keeps the form intact"
    - "presentation-layer SLA render (resolveExpectedResponse) — authoritative vs 'estimado', never blank, neutral tone (no red, no ticking timer)"
    - "tenant page shell + gates (Spinner → CompleteProfileFirst → EmptyState) copied from casos/page.tsx"

key-files:
  created:
    - src/components/tenant/NuevaSolicitudModal.tsx
    - src/app/inquilino/solicitudes/page.tsx
  modified:
    - src/app/inquilino/layout.tsx
    - src/app/inquilino/casos/page.tsx

key-decisions:
  - "Requester role never claimed client-side: the create body omits it (server assigns 'inquilino' from the JWT); no provider-assignment / cost / estado / motive-of-arrears fields (Ley 2300 / Ley 1480 / Ley 820)"
  - "Honest-degrade over fabrication: PqrsUnavailableError → 'Próximamente' toast + form kept open (no radicado, no upload); listMine() → [] → honest empty-state (no padded rows)"
  - "Anti-IDOR by construction: photos UPLOAD only (never a raw retrieval URL); list rows deep-link to the unified /inquilino/casos/[id] (own-only resolution lives there) — no new fetch-by-id"
  - "SLA is presentation-only here: resolveExpectedResponse renders authoritative slaVenceAt else the weekday estimate labeled 'estimado'; neutral styling, never blank, never a red urgency clock"
  - "Caso hub keeps its forward-compat seam: cases.map untouched (real rows fold via v7-06-02); only the two PQRS/mant 'Próximamente' cards are replaced by one real entry-point link; Acuerdos stays 'Próximamente'"

patterns-established:
  - "Tenant create Dialog that composes the PayRentModal shell + MessagesWidget picker + the real documentsApi.upload, with a create-then-attach, honest-degrade lifecycle"
  - "Own-requests list page rendering a never-blank two-tier SLA estimate with neutral tone, deep-linking to the unified caso detail"

requirements-completed: [SOLI-01, SOLI-02, SOLI-03]

# Metrics
duration: ~35min
completed: 2026-07-19
---

# Phase v7-06 Plan 03: Tenant Create + List Surface (Solicitudes / PQRS) Summary

**Shipped the tenant CREATE + LIST surface for solicitudes/PQRS (SOLI-01/02/03): a `NuevaSolicitudModal` Dialog (the shared entity — maintenance/reparación + formal PQRS — with a REAL photo picker) that calls `pqrsApi.create` then `documentsApi.upload` and degrades honestly to "Próximamente" on `PqrsUnavailableError` (no fabricated radicado, no orphan upload); a `/inquilino/solicitudes` page listing the tenant's own requests via `useTenantPqrs` with a never-blank per-row SLA estimate (`resolveExpectedResponse`, "estimado"-labeled) and rows deep-linking to the unified caso detail; and a "Solicitudes" nav entry + a real caso-hub entry point replacing the PQRS/mantenimiento "Próximamente" placeholders. Build green, all PQRS/tenant tests green, zero new npm packages.**

## Performance

- **Duration:** ~35 min (first task commit → SUMMARY)
- **Tasks:** 3
- **Files created:** 2 · **Files modified:** 2

## Accomplishments

- **SOLI-01/02 (NuevaSolicitudModal):** new `src/components/tenant/NuevaSolicitudModal.tsx` copies the `PayRentModal` shell — `AnimatePresence` backdrop (`fixed inset-0 z-50 bg-black/50`), `useLenis().stop()/start()` on open (DESIGN §8), `data-lenis-prevent` scroll body, header/body/footer, `Button isLoading`, sonner `toast`. Fields (simple `useState` + inline validation — the lighter tenant-modal norm, no react-hook-form/zod): a `tipo` `<select>` over the 6 shared `PqrsTipo` (es-CO labels, maintenance leads), a bounded `asunto` `Input` (120), a bounded `descripcion` `Textarea` (1000). The photo picker is REAL: a hidden `<input type="file" multiple accept="image/*,application/pdf">` reached via a ref, a 10 MB `MAX_BYTES` guard with a per-file `toast.error` on oversize, `e.target.value=''` reset so re-selecting the same file re-fires, and removable chips. Submit builds `NuevaSolicitudInput` (the requester role is **omitted** — server-assigned from the JWT), calls `await pqrsApi.create(input)`, then uploads each `File` via `documentsApi.upload({ file, type:'solicitud_evidencia', entityType:'pqrs', entityId: created.id })` — photos attach **only after a real create id**. `catch`: `instanceof PqrsUnavailableError` → honest "Próximamente" toast, form kept open, **no fabricated radicado, no upload**; any other error → a generic error toast. Buttons sentence case.
- **SOLI-03 (/inquilino/solicitudes list):** new `src/app/inquilino/solicitudes/page.tsx` (`'use client'`) reuses the tenant page shell + gates from `casos/page.tsx` (Spinner loading gate incl. `useTenantPqrs.isLoading` → `useOnboardingStatus`+`CompleteProfileFirst` onboarding gate → error `EmptyState`; `min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]` + `max-w-7xl` + framer `motion`). The list comes from `useTenantPqrs()`; each row (reusing the `CaseRow`/`TONE_BADGE` idiom) shows a `Wrench`/`ChatCircle` leading icon, `asunto`, a neutral tone badge (`pqrsStatusToTone/Label`, capped at `warning`), and a per-row SLA line via `resolveExpectedResponse(s.createdAt, s.slaVenceAt)`: authoritative → "Respuesta a más tardar el {date}"; estimated → "Respuesta estimada hacia el {date}" + a `estimado` chip with a clarifying tooltip. Dates formatted with `Intl.DateTimeFormat('es-CO'|'en-US', { day, month:'long', year })`. NEVER blank, neutral only (no red, no ticking timer, no "vence"). Each row is a `Link` to `/inquilino/casos/${encodeURIComponent(s.id)}` (the unified detail — timeline NOT duplicated here). A prominent header "Nueva solicitud" CTA + an empty-state "Nueva solicitud" action both open the modal (`onCreated={refetch}`). Empty / not-live `[]` → honest `EmptyState` (`Lifebuoy`).
- **Nav + hub wiring:** `layout.tsx` imports `Lifebuoy` and inserts `{ label: 'Solicitudes'|'Requests', href:'/inquilino/solicitudes', icon: Lifebuoy }` between "Mis casos" and "Documentos". `casos/page.tsx` replaces the two PQRS + Mantenimiento `ProximamenteSection` calls with ONE real entry-point `Link` card (→ `/inquilino/solicitudes`, `Lifebuoy` icon, "Abre y sigue tus solicitudes de mantenimiento y PQRS." + a sentence-case "Nueva solicitud" affordance with `ArrowUpRight`); the section heading is retitled "Más en tu portal"/"More in your portal" and the grid → 2-col (real Solicitudes card + Acuerdos "Próximamente"). Acuerdos stays "Próximamente" (v7-07). `cases.map` is untouched — real PQRS/mant rows already fold into the hub list via v7-06-02.

## Task Commits

Each task committed atomically (explicit-path `git add`, `feat(v7-06):` prefix, not pushed):

1. **Task 1: NuevaSolicitudModal — tipo + descripción + real photos → create → upload (SOLI-01/02)** — `c677bb64` (feat) — `GATE_OK`
2. **Task 2: /inquilino/solicitudes list with per-row SLA estimate (SOLI-03)** — `90982c41` (feat) — `GATE_OK` (after a comment-hygiene fix; see Deviations)
3. **Task 3: Solicitudes nav entry + caso-hub 'Nueva solicitud' wiring** — `5b843590` (feat) — `GATE_OK`

**Plan metadata:** this SUMMARY committed separately (docs: complete plan).

## Files Created/Modified

- `src/components/tenant/NuevaSolicitudModal.tsx` (new) — shared-entity create Dialog with the real photo picker + create-then-attach honest-degrade lifecycle
- `src/app/inquilino/solicitudes/page.tsx` (new) — own-requests list with the never-blank two-tier SLA estimate + "Nueva solicitud" CTA + honest empty-state; rows deep-link to the unified caso detail
- `src/app/inquilino/layout.tsx` (modified) — "Solicitudes" nav entry (`Lifebuoy`) between "Mis casos" and "Documentos"
- `src/app/inquilino/casos/page.tsx` (modified) — PQRS/mant "Próximamente" cards replaced by one real entry-point link; Acuerdos kept "Próximamente"; section retitled + 2-col grid

## Decisions Made

- **Requester role stays server-authoritative:** the create body never carries it (the wave-1 `NuevaSolicitudInput` already omits it). No provider-assignment, no cost input, no estado field, no motive-of-arrears prompt — the tenant only OPENS a request (T-v7-06-10).
- **Honest-degrade over fabrication:** `PqrsUnavailableError` → a "Próximamente" toast with the form kept open (no radicado invented, no orphan upload); `listMine()` → `[]` → an honest empty-state (no padded rows). Photos attach only after a real create id.
- **SLA is presentation-only:** the list computes the estimate via `resolveExpectedResponse` and labels the interim "estimado"; authoritative `slaVenceAt` renders a firm date. Never blank, neutral tone, no red urgency clock (Ley 1480 / PITFALLS 8).
- **Anti-IDOR by construction:** this surface only UPLOADS photos; any future retrieval must use the short-lived signed URL path (documented in the modal header comment, no raw-URL token present). List rows deep-link to `/inquilino/casos/[id]`, whose own-only resolution lives in the v7-03 detail — no new fetch-by-id is added.
- **Additive, non-breaking hub change:** the `cases.map` rendering is untouched (real rows already fold via v7-06-02); only the two placeholder cards are swapped for a real entry point, and Acuerdos remains "Próximamente" for v7-07.

## Deviations from Plan

**1. [Rule 3 — Blocking gate hygiene] Rephrased three of my own comments to satisfy the Task-2 negative grep.**
- **Found during:** Task 2 (first gate run → `GATE_FAIL`).
- **Issue:** The Task-2 negative gate is `grep -ciE "vence el|getDownloadUrl|destructive|countdown" == 0` (case-insensitive, applies to the whole file including comments — plan rule 7). My module/JSDoc comments described the AVOIDED behaviors using the banned words "countdown" (×2) and "destructive" (×1), so the anchored greps false-positived on prose that documents what the UI must NOT do.
- **Fix:** Rephrased without the banned tokens — "NEVER a red ticking-timer badge", "no ticking timer", "no alarm level at all". No production behavior changed; the neutral-tone/never-a-live-clock intent is intact.
- **Files modified:** `src/app/inquilino/solicitudes/page.tsx` (comments only).
- **Commit:** `90982c41` (gate then `GATE_OK`).

No other deviations. Rules 1/2/4 not triggered; no auth gates; no package installs; no architectural decisions.

## Verification

- **`pnpm build`: GREEN** (`BUILD_EXIT=0`, "✓ Compiled successfully"). The new route registered: `○ /inquilino/solicitudes  14.4 kB`. This is the real gate — repo CI does NOT run `next build`.
- **`pnpm test` (full suite): 647 passed / 12 failed (659 total).** Breakdown:
  - **7 are the documented pre-existing baseline** (identical to wave-1/wave-2): `risk-levels.test.ts` ×2, `EquipoAgentes.test.tsx`, `WorkItemDetalle.test.tsx`, `CarrierRegistryTable.test.tsx`, `asegurabilidad/nueva/page.test.tsx` ×2 (cotizador / agent-UI / constants).
  - **5 are flaky timeouts in `panel/inmobiliaria/ai/cobranza/plantillas/*`** (agency cobranza — untouched by this plan; ~20.8 s / 21.1 s durations under full-suite parallel load). **Run in ISOLATION they PASS: 2 files / 7 tests / EXIT 0.** Not caused by these changes — nothing my files export is imported by those pages.
  - **My scope is green:** the PQRS/tenant test set (`business-days.test.ts`, `pqrs.service.test.ts`, `tenant-case.test.ts`, `use-tenant-cases.test.ts`) → **4 files / 63 tests / EXIT 0**, zero NEW failures.
- **Per-task gates:** Task 1 `GATE_OK`; Task 2 `GATE_OK` (after the comment-hygiene fix); Task 3 `GATE_OK`.
- **Guardrails honored:** no fabricated radicado (PqrsUnavailableError → honest toast); photos upload only after a real create id (no orphan); requester role server-authoritative (absent from client input); SLA never blank + "estimado"-labeled, neutral tone (no red/ticking timer, no "vence el"); no motive-of-arrears / credit-bureau field (Ley 2300); es-CO copy; buttons sentence case (DESIGN §4); no provider-assignment / cost / estado / self-close; anti-IDOR (upload-only, deep-link to the unified own-only detail, no fetch-by-id, no raw-URL token); zero new npm packages; not pushed (local commits for the tren de versiones).

## Threat Register Coverage

All `mitigate` dispositions in the plan's `<threat_model>` are implemented:
- **T-v7-06-07** (Info Disclosure / IDOR, photo retrieval) → this surface only UPLOADS; the header comment documents that any future retrieval uses `documentsApi.getSignedUrl`; no raw-URL/`getDownloadUrl` token appears in either authored file (grep-gated, count = 0). ✅
- **T-v7-06-08** (Tampering, modal submit) → `PqrsUnavailableError` → honest "Próximamente" toast, no fabricated radicado; photos upload ONLY after a real create id (no orphan). ✅
- **T-v7-06-09** (Input validation / compliance) → bounded `asunto`/`descripcion`; `tipo` from the shared 6-member enum; photo MIME `image/*,application/pdf` + 10 MB cap; NO motive-of-arrears / credit-bureau field (grep-gated, count = 0). ✅
- **T-v7-06-10** (Elevation of Privilege) → no provider-assignment, no cost input, no estado field, no self-close; the requester role is set server-side (absent from the create body). ✅
- **T-v7-06-SC** (supply chain) → N/A: zero new dependencies, no install task. ✅

## Manual Smoke (expected posture, backend not live)

As a `tenant`: `/inquilino/solicitudes` renders the shell → an honest empty-state (`listMine()` → `[]`) with a "Nueva solicitud" CTA. Opening the modal → picking a tipo + adding a photo + submitting → `pqrsApi.create` throws `PqrsUnavailableError` → an honest "Próximamente" toast, no radicado, no upload, form kept open. The "Solicitudes" nav item and the caso-hub entry-point card both route to `/inquilino/solicitudes`. The build registering the route + the green unit set confirm the wiring; a live end-to-end pass awaits the M1 PQRS routes (disclosed external dependency).

## Deferred / Out-of-Scope

- **Full-suite flakiness (pre-existing, infra):** `panel/inmobiliaria/ai/cobranza/plantillas/*` time out under full parallel load but pass in isolation. Not introduced by this plan and outside its scope — noted here for the verifier rather than "fixed", since a timeout-tuning change would touch unrelated agency test config.

## Next Phase Readiness

- v7-06-04 (SOLI-04 cost-responsibility + quote approval) consumes exactly what's now in place: the `NuevaSolicitudModal` create path, the `useTenantPqrs` list, the unified caso detail deep-link, and the `resolveExpectedResponse` presentation helper. The additive `costoResponsable`/`cotizacionMonto`/`cotizacionAprobadaAt` fields (wave 1) + `pqrsApi.approveCotizacion` (throws `PqrsUnavailableError` today) are ready for the cost/approval UI. No blockers.

## Self-Check: PASSED

- `src/components/tenant/NuevaSolicitudModal.tsx` FOUND (pqrsApi.create + PqrsUnavailableError + documentsApi.upload + data-lenis-prevent present)
- `src/app/inquilino/solicitudes/page.tsx` FOUND (useTenantPqrs + resolveExpectedResponse + NuevaSolicitudModal + /inquilino/casos/ + estimado + es-CO present)
- `src/app/inquilino/layout.tsx` FOUND (Lifebuoy + /inquilino/solicitudes nav entry present)
- `src/app/inquilino/casos/page.tsx` FOUND (/inquilino/solicitudes entry-point + Handshake/Acuerdos kept present)
- Commits `c677bb64`, `90982c41`, `5b843590` FOUND in git log
- `/inquilino/solicitudes` route FOUND in the production build output

---
*Phase: v7-06-solicitudes-pqrs*
*Completed: 2026-07-19*
