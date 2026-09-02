---
phase: v7-05-comunicacion
verdict: GOAL ACHIEVED (frontend-first)
verified: 2026-07-19
method: goal-backward (code-level, legal-forward)
---

# Verification — Phase v7-05: Comunicación atada al arriendo/caso

## Verdict: ✅ GOAL ACHIEVED (frontend-first)

The tenant chat is now **tied to the arriendo/caso** (a real per-arriendo context header + a deep-link from the caso detail into the inbox), its **attachments and conversation actions are real-or-honest** (real file picker, `alert()` gone → typed service + `sonner` + an `AlertDialog` report confirm), and every **outbound path respects the legal contact gate**: the frontend has NO outbound sender, `canContact` is default-gated, there is no "¿por qué la mora?" field, and the expected-response window is a static "15 días hábiles" hint with no instant-human/countdown illusion. True lease-scoped threading, real attachment send, and agency-routed WhatsApp are backend-gated and disclosed as honest "Próximamente" — never faked.

> **Provenance:** the `gsd-verifier` agent has been unreliable this session; verification was done by the orchestrator via each plan's grep gates (all `GATE_OK`), a phase-wide legal sweep (0 outbound-sender hits across the whole messages surface), and a green `pnpm build` on the full stack. Execution note: wave-1 executor died after committing all 3 feat commits but before its SUMMARY (reconstructed + independently gate-verified); wave-2 first attempt died with 0 commits (clean tree → relaunched) and the relaunch died during final review after committing all 3 feat commits (SUMMARY reconstructed); wave-3 completed cleanly incl. its SUMMARY.

## Success-criteria map

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | COMU-01 — chat atado al arriendo/caso; `messages.service.ts` extendido a lease-scoped | ✅ TRUE (contract + real header) | `messages.service.ts`: `getMessagesByLease`/`sendMessageByLease` returning `… | null`, wrapped in `isEndpointUnavailable` (404/403/0 → null, never a fake thread); `leaseId?/caseId?` added to conversation types + mapper passthrough (only when present). Widget renders a tenant-only "Sobre tu arriendo — {property}" header from the **real** `property` field + an honest per-arriendo "próximamente" note. `casos/[caseId]/page.tsx` deep-links "Escribir a la inmobiliaria" → `/inquilino/mensajes` (0 fabricated `applicationId=`). applicationId path untouched; landlord/agency byte-identical. |
| 2 | COMU-02 — adjuntos + acciones (archivar/reportar) reales, no `alert()`/inertes | ✅ TRUE (frontend-first) | Real `<input type="file">` (accept image/pdf, 10 MB cap) wired to Paperclip/Image → honest `toast.info` "…disponible pronto" (send is a `sendAttachment`→`null` contract; **no fake "enviado", no orphaned `/documents` upload**). `archive/mute/report` are typed api-client methods with `sonner` toasts; **report behind a Radix `AlertDialog` confirm**; **zero `alert(`** remain in the widget. Shared handlers behavior-preserving for tenant + landlord/agency. |
| 3 | COMU-03 — saliente respeta el gate de contacto del `agent` (Ley 2300); no envía por su cuenta ni pregunta "por qué" la mora; WhatsApp ruteado | ✅ TRUE (legal crux) | New `agent-contact.service.ts` exposes ONLY `canContact` (ask-only, **no `send*`**), default-gated `{allowed:false, reason:'unavailable'}` on 404/403/0; the cap is enforced once/centrally in the agent contact-ledger (owned by `AGENT_SERVICE_URL`; BFF forwards via `apiClient`). WhatsApp is a **disabled "ruteado por tu inmobiliaria · Próximamente"** affordance gated by `canContact`. Phase-wide sweep: **0** `twilio|sendgrid|wa.me|nodemailer` across the messages surface. **0** "motivo/por qué…mora/pagado" tokens. No `recordatorio enviado` portal counter. |
| 4 | COMU-04 / PITFALLS-UX — ventana de respuesta esperada, sin respuesta humana instantánea | ✅ TRUE | `response-sla.ts` exports `PQRS_SLA_BUSINESS_DAYS = 15` (Ley 1480/2011, shared so v7-06's real clock reuses it). Static tenant-only composer hint "…en hasta 15 días hábiles"; **0** "responde al instante/respuesta inmediata/en línea/escribiendo" tokens; no live countdown (the real SLA clock is v7-06). landlord/agency render nothing new. |

## Legal invariants (verified — this phase is the contact-gate crux)

- **No outbound sender** ✅ — `agent-contact.service.ts` has only `canContact`, no send method; phase-wide grep sweep = 0 `twilio/sendgrid/wa.me/nodemailer` in `components/messages/`, `messages.service.ts`, `agent-contact.service.ts`, `app/inquilino/mensajes/`. The only real send is the in-app `messagesApi.sendMessage` (a portal message read in-app — compliant).
- **Contact cap enforced once, centrally** ✅ — `canContact` default-gates (frontend never sends, never counts); the Ley 2300 máx-1/día cap lives in the agent ledger.
- **No "por qué la mora" field** ✅ (Ley 2300 art. 7) — grep-gated to 0 on the service + widget; the report reason is a single OPTIONAL free-text field.
- **No fake presence / no instant-human** ✅ — 0 online/typing tokens; SLA hint is static, no countdown.
- **No IDOR** ✅ — future attachment retrieval documented to use `getSignedUrl` (v7-02 pattern); no raw persistent URL.

## Honesty boundaries (accepted, not faked)

- **True lease-scoped threading** — needs the NestJS `/leases/:id/chat*` route; today `getMessagesByLease` → `null` and the UI keeps the app-scoped chat + an honest per-arriendo "próximamente" note.
- **Real attachment send** — needs a chat-attachment endpoint + an `attachment` field on `BackendChatMessage` (two backend gaps); the picker is real, the send is honestly pending.
- **archive/mute/report persistence** — needs the `/messages/conversations/:id/{archive,mute,report}` routes; today they honest-toast "Próximamente" via `isEndpointUnavailable`.
- **Agency-routed WhatsApp / proactive reminders** — need the agent contact-ledger exposed over HTTP; the affordance is a disabled "Próximamente" gated by `canContact`.

## Build & tests

- `pnpm build` — **green** (EXIT=0) on the full stack after every wave.
- `pnpm test` — 601 passed / **7 pre-existing** unrelated failures (asegurabilidad ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels — see v7-01 `deferred-items.md`). **0 new failures.**

## Follow-ups (not gaps in v7-05)

- **Backend/agent**: NestJS lease-scoped chat read/send; chat-attachment upload + `BackendChatMessage.attachment` field + signed retrieval; `/messages/conversations/:id/{archive,mute,report}`; expose the agent contact-ledger `canContact` over HTTP so the gate answers live and WhatsApp/reminders route through it.

**Commit stack:** `d58b9526` · `c59aef4b` · `8e83d12c` (01) · `63f6d026` · `437a50d8` · `ae9446d5` (02) · `4b51fed4` · `41a44150` · `6722195f` (03) · docs `d93c8e9c` `12b7a24f` `3a6e32e6`. Local on `plan/v7.0-portal-inquilino`; not pushed.
