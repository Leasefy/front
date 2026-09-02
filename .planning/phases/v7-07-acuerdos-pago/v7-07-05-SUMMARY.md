---
phase: v7-07-acuerdos-pago
plan: 05
subsystem: tenant-ui
tags: [acuerdos-pago, accept-by-signature, ley-527, t-323, a5, anti-idor, honest-degrade, no-saldo-math, otp-adapter, ley-1480, ley-1581]

# Dependency graph
requires:
  - phase: v7-07-acuerdos-pago
    plan: 01
    provides: "acuerdosApi.accept(planId,{signatureData,otpVerificationToken}) + AcuerdoUnavailableError; AcuerdoDetail/AcuerdoAcceptResult re-exported from the generated agent schema (single source of saldo)"
  - phase: v7-07-acuerdos-pago
    plan: 02
    provides: "generalized OTPVerification (adapter?: OtpAdapter) + OtpAdapter interface — the injectable Ley 527/1999 transport"
  - phase: v7-07-acuerdos-pago
    plan: 03
    provides: "useTenantAcuerdos() tolerant list hook + acuerdoStatusToTone/acuerdoStatusToLabel neutral mappers (tone capped at 'attention')"
  - phase: v7-07-acuerdos-pago
    plan: 04
    provides: "CuotaPlanTable (verbatim installments, no saldo math) + the /inquilino/acuerdos list that deep-links to [id]"
  - phase: contract-e-signature
    provides: "SignaturePad (generic, reused as-is) + SignatureForm composition template"
provides:
  - "AcuerdoAcceptPanel — sign-to-accept surface (SignaturePad + generalized OTPVerification via an injected acuerdo OtpAdapter + 3 consent checkboxes + 'lo aprobó tu inmobiliaria' banner) → acuerdosApi.accept; honest 'Próximamente' on AcuerdoUnavailableError; accepted status from the agent (no optimistic flip); NO approve button, NO terms editor, NO decline (T-323/A5)"
  - "/inquilino/acuerdos/[id] detail — own-only .find resolution (anti-IDOR, no fetch-by-id); totalDueCop verbatim + CuotaPlanTable + offered→accepted source-timestamp timeline; AcuerdoAcceptPanel shown only when acceptedAt===null, else a factual accepted state; honest not-found"
affects: [v7-07-06 (pay-a-cuota affordance lands on this detail), the /inquilino/acuerdos list deep-link target is now live]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse a shipped composition (SignatureForm) + a shared compliance UI (generalized OTPVerification) by INJECTING a per-entity transport (acuerdo OtpAdapter) — one Ley 527/1999 flow, never a fork"
    - "Honest-degrade at the transport seam: the OtpAdapter maps not-live (404/403/0) to an honest 'estará disponible pronto' state inside the OTP modal (never a fabricated verificationToken); acuerdosApi.accept → AcuerdoUnavailableError → honest 'Próximamente' toast (never a fake 'aceptado')"
    - "Accepted status comes from the AGENT response — onAccepted → parent refetch re-pulls the record; no local optimistic status flip"
    - "Detail resolves own-only via useTenantAcuerdos().items.find(planId) (copied from casos/[caseId]) — no fetch-by-id, anti-IDOR; unknown/foreign id → honest EmptyState"
    - "Render the record verbatim: total + CuotaPlanTable + timeline from source timestamps only (offeredAt→acceptedAt); zero saldo/total arithmetic (PITFALLS 9)"

key-files:
  created:
    - src/components/tenant/AcuerdoAcceptPanel.tsx
    - src/app/inquilino/acuerdos/[id]/page.tsx
  modified: []

key-decisions:
  - "AcuerdoAcceptPanel is an inline PANEL (mirrors SignatureForm), not a modal; the OTP step is the only modal (Dialog via OTPVerification). The plan props { planId; onAccepted?; className? } are honored exactly"
  - "The acuerdo OtpAdapter is a local useMemo(planId) const; unavailable detection replicates the service's isEndpointUnavailable (ApiError status 404/403/0) inline via the exported ApiError (isEndpointUnavailable itself is private to the service) — the adapter throws an honest es-CO message so OTPVerification's own send/verify catch surfaces it, NEVER returning a fabricated token"
  - "No optimistic status: handleOTPVerified awaits acuerdosApi.accept then calls onAccepted?.() (→ refetch); the accepted state is only shown after the agent record reports acceptedAt≠null"
  - "Detail accept gate uses `plan.acceptedAt === null` (offered+unaccepted → panel); a non-null acceptedAt renders a factual success-soft accepted card with the accepted date (es-CO)"
  - "Banner copy uses 'aprobado' (Task-1 positive gate `aprob(ó|ado)`); the forbidden action tokens (aprobar acuerdo / editar término / descuento / rechazar / por qué / central) are kept out of BOTH files entirely, including comments, so the comment-stripped negative gates read 0"

patterns-established:
  - "A per-entity OtpAdapter that honest-degrades at the transport (throw → OTP modal error state) — reusable by any future non-contract e-signature (Ley 527/1999) flow"

requirements-completed: [ACUE-01, ACUE-02]

# Metrics
duration: 25min
completed: 2026-07-20
---

# Phase v7-07 Plan 05: Acuerdo Accept + Detail Summary

**The tenant can now open a dedicated `/inquilino/acuerdos/[id]` detail — resolved own-only from `useTenantAcuerdos().items.find` (no fetch-by-id, anti-IDOR) — that renders the plan total verbatim + the cuota plan (`CuotaPlanTable`) + an offered→accepted source-timestamp timeline, and (only while `acceptedAt === null`) hosts a new `AcuerdoAcceptPanel` that lets the tenant ACCEPT an already-agency-approved acuerdo by SIGNING (reused `SignaturePad` + the generalized `OTPVerification` driven by an injected acuerdo `OtpAdapter` + three consent checkboxes + a factual "este acuerdo ya fue aprobado por tu inmobiliaria" banner) → `acuerdosApi.accept`; the accept is honestly GATED (`AcuerdoUnavailableError` → "Próximamente" toast, the OTP adapter degrades to an honest unavailable state — never a fabricated token, never a fake "aceptado"), the accepted status comes from the agent (no optimistic flip), and there is NO approve button, NO terms editor, and NO decline anywhere (T-323 / A5).**

## Performance
- **Duration:** ~25 min
- **Tasks:** 2 (both `type="auto"`)
- **Files created:** 2 · **Files modified:** 0 (purely additive)

## Accomplishments
- **Task 1 — AcuerdoAcceptPanel (ACUE-02, T-323/A5).** An inline panel mirroring `SignatureForm`'s composition: `SignaturePad` (reused as-is) + 3 required consent checkboxes ("acepto las condiciones del acuerdo de pago", "entiendo que mi firma es legalmente vinculante", "autorizo el tratamiento de datos — Ley 1581/2012") + a `canSign` gate + the OTP-then-accept lifecycle. A local `OtpAdapter` (`useMemo(planId)`) hits the provisional acuerdo OTP endpoints via `apiClient`/BFF and, on not-live (404/403/0), throws an honest "estará disponible pronto" message so `OTPVerification`'s send/verify catch surfaces it — **never a fabricated verificationToken**. On `onVerified(token)` → `acuerdosApi.accept(planId,{signatureData,otpVerificationToken})`; success → `toast.success('Acuerdo aceptado')` + `onAccepted?.()` (**status from the agent, no optimistic flip**); `AcuerdoUnavailableError` → honest `toast.info` "Próximamente". A factual primary-soft banner states the acuerdo was already **aprobado** by the agency + the Ley 527/1999 footnote. **NO approve button, NO condition/cuota editor, NO decline affordance.** Sentence-case buttons; es-CO via `useI18n()`.
- **Task 2 — /inquilino/acuerdos/[id] detail (ACUE-01/02).** Copies the `casos/[caseId]` resolution pattern: `useTenantAcuerdos().items.find(p => p.planId === params.id)` — **no fetch-by-id** (anti-IDOR). Loading gate (Spinner); hard error → `EmptyState`; `!plan` → honest "Acuerdo no encontrado" `EmptyState` (covers unknown AND foreign ids) + BackLink → `/inquilino/acuerdos`. Resolved detail: header + neutral tone badge (`acuerdoStatusToTone/Label`), `formatCurrency(plan.totalDueCop)` verbatim (`font-mono tabular-nums`), `CuotaPlanTable`, and a `PlanActivityTimeline` from source timestamps only (`offeredAt` → `acceptedAt` when present — no synthesis). The `AcuerdoAcceptPanel` renders **only when `plan.acceptedAt === null`**; an already-accepted plan shows a factual success-soft accepted card with the accepted date instead. **No "pagar cuota" affordance** (deferred to v7-07-06). Neutral tone; no saldo math.

## Task Commits
1. **Task 1: AcuerdoAcceptPanel — sign to accept (ACUE-02, T-323/A5)** — `4f44c707` (feat)
2. **Task 2: /inquilino/acuerdos/[id] detail — read + accept (ACUE-01/02)** — `55a440d9` (feat)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified
- `src/components/tenant/AcuerdoAcceptPanel.tsx` **(new)** — sign-to-accept panel; injected acuerdo `OtpAdapter` (honest-degrade, no fabricated token); consent + banner + Ley 527 footnote; `acuerdosApi.accept` → `AcuerdoUnavailableError` honest "Próximamente"; no approve/terms/decline; status from the agent.
- `src/app/inquilino/acuerdos/[id]/page.tsx` **(new)** — own-only `.find` detail (no fetch-by-id); total verbatim + `CuotaPlanTable` + offered→accepted timeline; accept panel gated on `acceptedAt===null`; honest not-found.

## Verification Results

| Gate | Result |
|------|--------|
| Task 1 grep gate (`acuerdosApi.accept` + `AcuerdoUnavailableError` + `SignaturePad` + `adapter` + `aprob(ó\|ado)` present; 0 forbidden `aprobar acuerdo`/`editar término`/`descuento`/`rechazar`/`por qué`/`central` comment-stripped) | `GATE_OK` |
| Task 2 grep gate (`useTenantAcuerdos` + `find(` + `CuotaPlanTable` + `AcuerdoAcceptPanel` + `acceptedAt` present; 0 `.reduce(`/`restante`/`aprobar acuerdo`/`apiClient.get...${params` comment-stripped) | `GATE_OK` |
| `pnpm build` (next build, TS strict) | **EXIT 0 (green)** — new `ƒ /inquilino/acuerdos/[id]` route registered (6.71 kB) |
| Full `pnpm test` | 710 pass / 7 fail (5 files) — **0 new failures** (all pre-existing agency-side AI/cobranza/cotizador/risk; none import the new files) |
| `package.json` / `pnpm-lock.yaml` | unchanged (zero new deps) |

## Decisions Made
- **Inline panel, not a modal.** The plan calls `AcuerdoAcceptPanel` a "panel" with props `{ planId; onAccepted?; className? }` mirroring `SignatureForm` (which is inline). Only the OTP step is a modal (via `OTPVerification`'s Dialog). The detail page embeds the panel in a card that is shown only while unaccepted.
- **Unavailable detection replicated inline.** `isEndpointUnavailable` is private to `tenant-acuerdos.service.ts`; the adapter replicates the exact 404/403/0 check via the exported `ApiError` (`apiClient`, `client.ts`) and throws an honest es-CO message rather than importing/re-exporting the private helper — keeping the service surface unchanged (additive-only).
- **No optimistic status.** The panel never sets a local "accepted" flag; it awaits `acuerdosApi.accept` then calls `onAccepted?.()` (→ `refetch`), so the accepted state only appears after the agent record reports `acceptedAt≠null`.
- **Banner copy carries the positive gate.** The banner says "aprobado" (satisfying Task 1's `aprob(ó|ado)` gate) while the forbidden action tokens stay out of both files entirely, including comments, so the comment-stripped negative gates read 0.

## Deviations from Plan
None — plan executed exactly as written. No deviation rules (1–4) triggered; no auth gates; no architectural changes. Two intent reconciliations (not deviations): (1) the panel is inline (SignatureForm-style) with the OTP as the only modal, matching the plan's prop shape and "mirror SignatureForm" instruction; (2) the OTP send failing (endpoints not live) surfaces the honest unavailable state inside the OTP modal, while the `acuerdosApi.accept` → `AcuerdoUnavailableError` → "Próximamente" toast path is present as specified — both are honest, neither fabricates.

## Threat Model Coverage
- **T-v7-07-14 (Information Disclosure / IDOR) — mitigated.** The detail resolves via `items.find(p => p.planId === params.id)` on the own JWT-scoped list; there is NO `apiClient.get(.../${params.id})` fetch-by-id (grep-gated to 0). Unknown/foreign id → honest "Acuerdo no encontrado".
- **T-v7-07-15 (Elevation of Privilege / T-323, A5) — mitigated.** Accept-only: NO "aprobar" button, NO terms/discount editor, NO decline (grep-gated to 0, comment-stripped). Off-policy stays the agent's `requiresHumanReview()`; the banner states the agency already approved.
- **T-v7-07-16 (Repudiation / Integrity) — mitigated.** The accepted status comes from `acuerdosApi.accept`'s `CarteraPaymentPlanAcceptResponse` (the agent) — never optimistic; `AcuerdoUnavailableError` → honest "Próximamente", never a fabricated acceptance. The Ley 527 one-use OTP token binds the signature.
- **T-v7-07-17 (Spoofing / acuerdo OtpAdapter) — mitigated.** OTP send/verify go through the BFF (`apiClient`) with the tenant JWT; a not-live endpoint surfaces an honest unavailable message, NEVER a fabricated `verificationToken`.
- **T-v7-07-SC (supply chain) — accept.** Zero new npm dependencies (`package.json`/lockfile unchanged).

## Threat Flags
None — no new network endpoints, auth paths, file access, or schema changes at trust boundaries beyond the already-declared provisional acuerdo OTP send/verify + accept routes (defined and gated in v7-07-01/02). The OTP adapter and accept both route through the existing `apiClient`/`acuerdosApi` contract.

## Known Stubs
None that hide a broken goal. The whole accept path is honest-degrading by design: the acuerdo OTP send/verify + accept routes on `Leasefy/agent` (the HARD cross-repo dependency) do not exist yet, so today a tenant reaching the OTP step sees an honest "estará disponible pronto" state and the accept surfaces "Próximamente" — never a fabricated token or acceptance. This is documented "Próximamente" (RESEARCH "Real vs. Gated"), not a stub; the panel + detail light up automatically once the agent lands the tenant-scoped routes (each a one-line change per v7-07-01's provisional paths).

## Issues Encountered
- **Full-suite pre-existing failures (out of scope).** `pnpm test` reports 7 failing tests across 5 files — all agency-side AI/cobranza/cotizador/risk subsystems (`asegurabilidad/nueva` ×2, `EquipoAgentes`, `WorkItemDetalle`, `CarrierRegistryTable`, `risk-levels` ×2). None import the modules this plan created (`AcuerdoAcceptPanel` / `acuerdos/[id]`), and this plan adds no test files, so **zero new failures are attributable to this plan**. The count/fileset matches the v7-07-04 baseline exactly (already logged in `deferred-items.md`).

## User Setup Required
None. The tenant-scoped acuerdo OTP + accept routes on `Leasefy/agent` remain absent by design; the accept surface degrades honestly to "Próximamente" until they land.

## Next Phase Readiness
- **v7-07-06 (pay-a-cuota)** can add the "Pagar cuota" affordance onto this `/inquilino/acuerdos/[id]` detail, reusing the v7-04 Wompi rail behind `acuerdosApi.getCuotaPaymentUrl()` (→ `null` / "Próximamente" until the tenant route serves the server-resolved `paymentUrl`).
- The `/inquilino/acuerdos` list deep-link target is now live; the accept flow is fully wired behind the honest gate.
- No blockers introduced.

## Self-Check: PASSED
- FOUND: `src/components/tenant/AcuerdoAcceptPanel.tsx`
- FOUND: `src/app/inquilino/acuerdos/[id]/page.tsx`
- FOUND commit: `4f44c707` (Task 1)
- FOUND commit: `55a440d9` (Task 2)

---
*Phase: v7-07-acuerdos-pago — Plan 05 (wave 4, LAST)*
*Completed: 2026-07-20*
