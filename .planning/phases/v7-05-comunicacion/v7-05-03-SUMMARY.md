---
phase: v7-05-comunicacion
plan: 03
wave: 3
subsystem: ui
status: complete
requirements: [COMU-03]
tags: [messages, chat, contact-gate, ley-2300, pqrs-sla, contract-first, es-CO, legal-guardrails]

# Dependency graph
requires:
  - phase: v7-05-02
    provides: "shared MessagesWidget.tsx (attachments + archive/mute/report) — wave 3 builds strictly on top"
provides:
  - "agent contact-ledger CONTRACT (agentContactApi.canContact) — ask-only, default-gated allowed:false; NO outbound sender anywhere"
  - "PQRS_SLA_BUSINESS_DAYS = 15 shared constant (Ley 1480/2011) for the static expected-response hint; reused by v7-06's real clock"
  - "guardrailed MessagesWidget: static neutral SLA hint (tenant) + disabled 'WhatsApp — ruteado por tu inmobiliaria · Próximamente' affordance gated by canContact; no 'why-late' field, no fake presence"
affects: [v7-06-pqrs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ask-only contact-gate contract (canContact) that never dispatches — cap enforced once, centrally, in the agent"
    - "isEndpointUnavailable (404/403/0) honest-unavailable idiom reused from lease-documents.service.ts"
    - "actor-gated additive UI on the shared widget (isTenant) — landlord/agency byte-identical"

key-files:
  created:
    - src/lib/api/agent-contact.service.ts
    - src/lib/constants/response-sla.ts
  modified:
    - src/components/messages/MessagesWidget.tsx

key-decisions:
  - "The frontend NEVER becomes an outbound sender: agent-contact.service.ts exposes ONLY canContact, no send* method, no Twilio/SendGrid/wa.me import in service or widget"
  - "Ley 2300 cap enforced ONCE, centrally, in the agent contact-ledger (owned by AGENT_SERVICE_URL, BFF forwards via apiClient); the portal never counts against the cap"
  - "WhatsApp is presented first-class but ROUTED BY THE AGENT — disabled 'Próximamente' via canContact (allowed:false today), never a frontend send"
  - "Expected-response hint is a STATIC neutral line (15 días hábiles), never 'al instante', never a live countdown — the real SLA clock is v7-06"

requirements-completed: [COMU-03]

# Metrics
duration: ~25min
completed: 2026-07-19
---

# Phase v7-05 Plan 03: Legal guardrails of comunicación (COMU-03 + expected-response) Summary

**The legal crux of the phase landed as three honest deliverables: an ask-only agent contact-ledger contract (`canContact`, default-gated `allowed:false`, zero outbound sender), a shared `PQRS_SLA_BUSINESS_DAYS = 15` constant backing a static neutral expected-response hint, and a disabled "WhatsApp — ruteado por tu inmobiliaria · Próximamente" affordance wired to the gate — all with a standing guard that there is no "por qué la mora" field and no fake presence on the chat path.**

## What shipped

### Task 1 — `agent-contact.service.ts` contact-ledger CONTRACT (`4b51fed4`)
New contract-only api-client:
- `export type ContactChannel = 'whatsapp' | 'email' | 'push'`
- `export interface CanContactResult { allowed: boolean; reason: 'unavailable' | 'gated' | 'ok' }`
- `async canContact(channel, leaseId?)` → `apiClient.get('/agent/contact/can-contact?…')`, wrapped in `isEndpointUnavailable` (404/403/0) → `{ allowed: false, reason: 'unavailable' }` today.

Extensive JSDoc names the `Leasefy/agent` contact-ledger (owned by `AGENT_SERVICE_URL`; the BFF at `NEXT_PUBLIC_BACKEND_URL` forwards via `apiClient`, mirroring `agent-credits.service.ts`) as the SINGLE central place the Ley 2300/2023 cap (máx 1 contacto/día, 1 canal/semana) is enforced. **There is intentionally NO `send*` method** and **no third-party messaging SDK import** — the module can only ASK; the frontend never dispatches and never counts against the cap.

### Task 2 — `response-sla.ts` constant + static expected-response hint (`41a44150`)
- New `src/lib/constants/response-sla.ts`: `export const PQRS_SLA_BUSINESS_DAYS = 15` (Ley 1480/2011 art. 58), JSDoc'd as shared so v7-06's real clock reuses it.
- `MessagesWidget.tsx`: a static, neutral hint renders below the composer, **gated to `isTenant`** — es "Respondemos en horario hábil. Los reclamos formales tienen respuesta en hasta 15 días hábiles." / en equivalent — muted, small, paired `Info` icon (a11y). No instant-human implication, no `en línea`/`escribiendo` presence, no live countdown. `actor !== 'tenant'` renders nothing new.

### Task 3 — WhatsApp "ruteado por el agente" disabled affordance + standing guard (`6722195f`)
- Info-panel Quick Actions (tenant only): a DISABLED `aria-disabled` affordance mirroring the `casos/page.tsx:275-282` posture — `ChatCircle` icon + "WhatsApp — ruteado por tu inmobiliaria · Próximamente" + `title` "Aún no disponible". Its disabled state is wired to `agentContactApi.canContact('whatsapp', selectedConversation?.leaseId)` via a tenant-only effect keyed on the conversation id/leaseId; `canContact` resolves `allowed:false` today, so it stays disabled. **Never a send button, no "recordatorio enviado" counter, no dispatch.**
- Standing guard asserted (grep-gated, not added): no "motivo/por qué la mora" field on the compose/report path (the v7-05-02 report reason stays optional free-text only, Ley 2300 art. 7); no fake online/typing/presence. The only real send remains the in-app `messagesApi.sendMessage` (a compliant portal message).

## Guardrails honored (grep-gated + repo sweep)
- **No outbound sender.** `agent-contact.service.ts` sender scan = 0; repo-wide sweep of `messages.service.ts`, `agent-contact.service.ts`, `components/messages/`, `app/inquilino/mensajes/` for `twilio|sendgrid|wa.me` = none. The only real send is in-app `messagesApi.sendMessage` (+ wave-1 `sendMessageByLease`, also in-app/honest-null).
- **Default-gated.** `canContact` returns `{ allowed:false, reason:'unavailable' }` on 404/403/0; the WhatsApp affordance stays disabled; the portal never counts against the cap.
- **No "why-late" field** on the chat/compose path (Ley 2300 art. 7) — gate = 0 tokens.
- **No fake presence / instant-human** — static SLA hint only; no `al instante`/`en línea`/`escribiendo`/countdown (gate = 0 tokens).
- **Buttons sentence case** (DESIGN.md §4); a11y icon+text pairing + `aria-disabled` + `title` (§7). **Zero new npm packages** (`package.json`/`pnpm-lock.yaml` unchanged). landlord/agency byte-identical.

## Task Commits
1. **Task 1: agent-contact.service.ts contact-ledger contract** — `4b51fed4` (feat) — GATE_OK
2. **Task 2: response-sla.ts + static expected-response hint** — `41a44150` (feat) — GATE_OK
3. **Task 3: WhatsApp ruteado disabled affordance + standing guard** — `6722195f` (feat) — GATE_OK

## Files Created/Modified
- `src/lib/api/agent-contact.service.ts` (created) — ask-only `canContact` contract, default-gated, no sender
- `src/lib/constants/response-sla.ts` (created) — `PQRS_SLA_BUSINESS_DAYS = 15`
- `src/components/messages/MessagesWidget.tsx` (modified) — SLA hint (tenant) + WhatsApp ruteado disabled affordance + canContact gate state/effect

## Deviations from Plan
None — plan executed as written. One gate-hygiene fix (no behavior change): the Task 3 negative gate initially matched my own explanatory comment, which literally contained the forbidden token `recordatorio enviado` ("No 'recordatorio enviado' counter…"). Reworded to "No portal-side reminder counter" — same pattern the wave-1 executor documented. No runtime/behavior impact.

## Verification
- **`pnpm build`: GREEN** (`EXIT=0`, "✓ Compiled successfully"). The only warnings are pre-existing Tailwind ambiguous-class notices (`duration-[280ms]`), unrelated to these changes. This is the real gate (repo CI does not run `next build`).
- **`pnpm test`: 601 passed / 7 failed (608 total).** The 7 failures are the exact documented pre-existing baseline (asegurabilidad `nueva/page`, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels — see v7-01 `deferred-items.md`). **Zero NEW failures**, none messages/casos/agent-contact/response-sla related.
- **Grep gates:** Task 1 `GATE_OK`, Task 2 `GATE_OK`, Task 3 `GATE_OK`.

## Threat Register Outcomes
- **T-v7-05-05** (accidental frontend outbound sender) — mitigated: `agent-contact.service.ts` has no send method; grep + repo sweep confirm zero `twilio/sendgrid/wa.me/whatsapp-send` in service + widget; only in-app `messagesApi.sendMessage` remains.
- **T-v7-05-06** (portal double-counting the cap) — mitigated: `canContact` routes to the agent's single ledger; no portal-side counter; zero "recordatorio enviado".
- **T-v7-05-07** (Ley 2300 art. 7 "why-late" field) — mitigated: grep-gated absence on the chat/compose path.
- **T-v7-05-08** (fake instant-human / presence) — mitigated: static SLA hint only; zero `al instante`/`en línea`/`escribiendo`/countdown.
- **T-v7-05-SC** (npm supply chain) — accepted: zero new packages.

## Known Stubs
`agentContactApi.canContact` is intentionally default-gated (`allowed:false`) until the agent exposes the contact-ledger over HTTP — this is a disclosed "Próximamente" contract, not a hidden stub (COMU-03 external dep). The WhatsApp affordance is disclosed disabled "Próximamente"; it renders no fabricated success. Documented as the intended honest posture, resolved when the agent ships the HTTP contact endpoint.

## Next Phase Readiness
- v7-05 (Comunicación) complete across all three waves. `PQRS_SLA_BUSINESS_DAYS` is in place for v7-06's real PQRS SLA clock; `agentContactApi.canContact` is the seam for any future proactive outbound (still routed by the agent, never the frontend).
- No blockers. Real WhatsApp routing + a live SLA clock unlock when the agent exposes the contact-ledger endpoint and v7-06 lands the PQRS engine.

## Self-Check: PASSED
- `src/lib/api/agent-contact.service.ts` FOUND (canContact/CanContactResult/isEndpointUnavailable present; 0 sender tokens)
- `src/lib/constants/response-sla.ts` FOUND (PQRS_SLA_BUSINESS_DAYS = 15 present)
- `src/components/messages/MessagesWidget.tsx` FOUND (días hábiles + ruteado por tu inmobiliaria + canContact present)
- Commits `4b51fed4`, `41a44150`, `6722195f` FOUND in git log

---
*Phase: v7-05-comunicacion · Plan 03 (wave 3) · Completed 2026-07-19*
