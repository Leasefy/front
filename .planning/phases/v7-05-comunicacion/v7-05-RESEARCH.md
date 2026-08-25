# Phase v7-05: Comunicación atada al arriendo/caso — Research

**Researched:** 2026-07-18
**Domain:** Tenant↔agency in-app chat (Next.js 14 frontend consuming NestJS `back-main` + `Leasefy/agent` microservice); Colombia legal guardrails on outbound contact.
**Confidence:** HIGH (chat reality map, contact-gate posture, upload reuse — grounded in current repo code); MEDIUM (backend endpoint shapes for lease-scope/attachments — not yet built, contract-first).

## Summary

The tenant chat already exists and is **real for text**: `MessagesWidget` → `useChat` → `messagesApi` POSTs to `/applications/:id/chat/messages` and polls every 5s. It is **scoped exclusively by `applicationId`** end-to-end (service, types, hook, widget, URL param). There is **no lease/caso scoping today** and no chat-attachment or conversation-action endpoint. Everything the phase adds beyond text lands on one of two backend gaps.

Critically, the frontend does **NOT** self-send via Twilio/WhatsApp on any tenant path — the tenant chat is a pure in-app POST. That is exactly the posture Ley 2300/2023 requires and must be **preserved, not "fixed" into an outbound sender.** The honest v7-05 build is: keep in-app messaging real, tie the conversation to the arriendo/caso by **frontend composition** (deep-link + context header), add an **expected-response hint** consistent with the PQRS SLA, and land lease-scope / attachment-send / archive-report / proactive-WhatsApp as **api-client contracts + honest "Próximamente"** because each is blocked on a backend/`agent` dependency.

**Primary recommendation:** Ship in-app chat composition-tied to the caso + a static expected-response hint as the *real* deliverables. Land lease-scope, attachment **send**, archive/report, and any proactive/WhatsApp outbound as **typed contracts behind "Próximamente"** — and hard-guard against three things the law/UX forbid: no frontend Twilio send, no "why the mora" prompt, no "instant human reply" implication.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| In-app chat send/read (text) | API / Backend (`/applications/:id/chat`) | Frontend (widget, polling) | Already real; message persistence + authz is server-owned |
| Tie chat to arriendo/caso | **Frontend (composition)** | API (true lease-scoped threads) | Frontend can present + deep-link today; a real `/leases/:id/chat` thread = backend change |
| Attachment upload bytes | API / Backend (upload endpoint) | Frontend (file picker UI) | No chat-attachment endpoint exists; reuse pattern is server-side |
| Conversation actions (archive/report/mute) | API / Backend | Frontend (menu UI) | Report especially is a compliance action → must reach the agency, not stay client-side |
| Proactive WhatsApp / reminders (outbound) | **`Leasefy/agent` contact-ledger/gate** | — | Ley 2300 cap is enforced once, centrally, in the agent. Frontend NEVER sends. |
| Expected-response window hint | Frontend (static copy/constant) | API (real SLA clock, v7-06) | A neutral hint is safe now; a live countdown is v7-06 (PQRS engine) |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMU-01 | Chat atado al arriendo/caso (no solo `applicationId`); `messages.service.ts` lease-scoped | Chat is 100% `applicationId`-scoped today (`messages.service.ts:19,26,34`). Lease-scope = **backend change** → frontend composition now + contract for the real thread. |
| COMU-02 | Adjuntar archivos/fotos + acciones (archivar/reportar) reales, no `alert()`/inertes | Attach buttons inert (`MessagesWidget.tsx:539-550`); archive/mute/report are `alert()` (`:198-219`). No api-client method exists → contract + "Próximamente". |
| COMU-03 | Saliente respeta el gate de contacto del `agent` (Ley 2300); no pregunta "por qué" la mora | Frontend does NOT self-send via Twilio (verified). WhatsApp/reminders routed by `agent` gate → gated/"Próximamente". No "why-late" field anywhere. |
| COMU-04 (ROADMAP SC4 / guardrail) | Ventana de respuesta esperada, sin implicar respuesta humana instantánea | No SLA/business-day helper in code; reuse PQRS 15-días-hábiles (Ley 1480/2011 art. 58) as a **static neutral hint**, not a live clock. |

---

## 1. Chat Reality Map (COMU-01)

**Where it lives (tenant):** `src/app/inquilino/mensajes/page.tsx` → renders `<MessagesWidget actor="tenant" />` behind an onboarding gate. Same widget serves landlord/agency (`actor` prop).

**Scoping today — 100% `applicationId`:**
- Service `src/lib/api/messages.service.ts`: `getMessages(applicationId)` → `GET /applications/:id/chat`; `sendMessage(applicationId, content)` → `POST /applications/:id/chat/messages`; `markAsRead(applicationId)` → `PATCH /applications/:id/chat/read`. `getConversations()` → `GET /messages/conversations`.
- Types `src/lib/api/messages.types.ts`: `BackendConversation.applicationId` (`:27`), `ChatConversation.applicationId` (`:66`); every conversation carries a `property`, no `leaseId`/`caseId`.
- Hook `src/lib/hooks/useMessages.ts`: `useChat(applicationId)` (`:51`); optimistic append + 5s poll (`:88`).
- Widget `src/components/messages/MessagesWidget.tsx`: state `selectedApplicationId`, URL deep-link `?applicationId=` (`:117,142`).

**Is lease/caso-scoping a frontend composition or a backend change?** **Backend change.** True lease-scoped threads need a new NestJS surface (e.g. `GET /leases/:id/chat` or `/cases/:id/chat`) plus a `leaseId`/`caseId` on the conversation/message models. `messages.service.ts` today has no lease dimension. **Frontend-first stance (criterion):** compose now — from the v7-03 caso detail (`src/app/inquilino/casos/[caseId]/page.tsx`) and the arriendo screen, present/deep-link the relevant conversation and render a **context header** ("Conversación sobre tu arriendo — {property}") so the chat *reads as* tied to the arriendo, while the actual lease-scoped thread ships as an api-client contract + honest label. Note: `TenantCase` (`src/lib/types/tenant-case.ts`) already reserves a `conversacion`-linkable detail per CASO-02, but the current `CaseType` union emits only `pago`/`aplicacion` — a conversation case row is itself forward-ref territory.

**Verdict:** **Composition + context = real today. Lease-scoped `messages.service.ts` = external backend dep → contract + "Próximamente".**

## 2. Attachments (COMU-02)

**State today:** The Paperclip and Image `IconButton`s (`MessagesWidget.tsx:539-550`) have **no `onClick`, no `<input type=file>`** — purely decorative. `sendMessage` accepts `content: string` only; `BackendChatMessage` (`messages.types.ts:40`) has **no attachment field**. So attachment send is blocked on *two* backend gaps: (a) an upload endpoint bound to the conversation, and (b) an attachment field on the message model.

**Reusable upload paths (for when the endpoint exists):**
- **Multipart FormData → backend** (simplest, matches Habeas Data doc flow): `applications.service.ts:247 uploadDocument(file,type)` → `POST /documents/upload`; `settings.service.ts:101 uploadAvatar` → `POST /users/me/avatar`; hook wrapper `useDocumentUpload()` (`src/lib/hooks/useDocuments.ts:70`).
- **Presign → direct S3 PUT** (photos, no auth header on PUT): `avaluo.service.ts photoPresign` + `uploadPhotoToS3` (`:26-90`); the `agent` habeas-data flow uses the same presign→confirm shape (`generated/agent.ts:901`).
- **Signed GET for retrieval (v7-02, no IDOR):** `documentsApi.getSignedUrl(docId)` → `GET /documents/:id/signed-url` + hook `useSignedDocUrl()` (`useDocuments.ts:130`). Any tenant-reachable attachment retrieval MUST use this signed pattern, never a raw `/documents/:id`.

**Verdict:** **Attachment send = backend-gated → contract + "Próximamente".** Wire a real file picker UI (accept image/pdf, size cap) that **discloses** "el envío de adjuntos estará disponible pronto" — do NOT stage a file to `/documents/upload` and imply it's attached to the thread (that creates an orphaned doc invisible to the conversation — a "looks done but isn't" trap, PITFALLS checklist).

## 3. Conversation Actions — archive / report / mute (COMU-02)

**State today:** All three are `alert()` placeholders (`MessagesWidget.tsx:198-219`, comment: "backend no las soporta aún"). No method exists in `messages.service.ts`. i18n keys already exist (`inmobiliaria.mensajes.archiveConversation/report/muteNotifications`; tenant `messages.archive`).

**Analysis:**
- **Report** is compliance-sensitive: it must create a real signal the **agency can see** — never a client-side no-op. Contract-first: `messagesApi.reportConversation(id, reason)` behind "Próximamente".
- **Archive/Mute** could be a local UI preference, but the honest, non-forking choice is a backend contract so state survives devices and the agency view stays consistent. Do NOT let "archive" hide a legally-relevant thread client-side only (audit gap).

**Verdict:** **Contract + "Próximamente" for all three.** Replace `alert()` with typed no-throw api-client stubs that degrade to an honest disabled/"Próximamente" affordance (the `lease-documents.service.ts` `isEndpointUnavailable` 404/403/0 pattern is the template).

## 4. Contact Gate (COMU-03) — the legal crux

**How outbound works today:** It doesn't — from the tenant path. Verified: **no Twilio/SendGrid/WhatsApp send anywhere in the tenant chat path.** The only Twilio strings are mock data (`mock-chat-responses.ts:311`) and the *agency* `PipelineDetail.tsx:342` "Enviar WhatsApp" (not the tenant portal). Tenant chat = in-app `POST /applications/:id/chat/messages` only. The `agent` owns the Ley 2300 gate (`canContact`/`validateMessage`), which this repo's own PITFALLS 3 says the portal must call, never reimplement.

**The honest design — concrete do/don'ts:**

| # | DO | DON'T |
|---|----|----|
| 1 | Keep in-app messaging real (text POST already works — this is not "contact" under the cap; it's the tenant reading/writing their own thread). | **Never** add a frontend Twilio/SendGrid/WhatsApp/push sender on any tenant path. Any proactive outbound is a **direct statutory risk** (Ley 2300 art. 3: máx 1 contacto/día, 1 canal/semana). |
| 2 | Route **every** proactive message/reminder (payment nudge, case-status push, WhatsApp) through the `agent` contact-ledger/`canContact` gate via `AGENT_SERVICE_URL`. Until that HTTP endpoint exists → **gated / "Próximamente"** (it's a blocking dep, not something to route around — PITFALLS 3). | Don't add a tenant-facing "enviar recordatorio" button that self-sends. Don't let `back-main` send tenant notifications directly either. |
| 3 | Present WhatsApp as a **first-class channel** in copy — but as *"ruteado por el agente"*, gated. | Don't render two independent "1 recordatorio enviado hoy" counters (portal + agent) — one central ledger only. |
| 4 | Compose only **forward-looking** message affordances if any quick-reply exists ("¿en qué te ayudamos?"). | **Never** prompt/require/dropdown a "motivo del atraso" / "¿por qué no ha pagado?" field anywhere in chat or compose (Ley 2300 **art. 7**, SIC Concepto 23-463720). Voluntary free-text is fine; *asking why* is prohibited. |

**Verdict:** **In-app chat = real. Proactive WhatsApp/email/push = gated by `agent` → "Próximamente".** The frontend's job is to *not* become an outbound sender.

## 5. Expected-Response Window (COMU-04)

**Source:** No business-day/SLA helper exists in code (`slaVenceAt` is deferred to the M1 engine — `pqrs.types.ts:52`; PITFALLS 6). The statutory anchor is **Ley 1480/2011 art. 58 núm. 5 → 15 días hábiles** for a formal queja/reclamo. The chat is *not* the PQRS surface, so v7-05 needs only a **neutral static hint consistent with** that SLA — not a computed clock.

**Design:**
- Render a one-line, factual expected-response hint near the composer: e.g. *"Respondemos en horario hábil. Los reclamos formales tienen respuesta en hasta 15 días hábiles."* Optionally introduce a shared constant (`PQRS_SLA_BUSINESS_DAYS = 15`) so v7-06's real clock reuses it.
- **Must NOT** imply an instant human reply (PITFALLS UX row `:229`). The i18n has `online`/`typing`/`offline` keys (`inmobiliaria.mensajes`) — **do not** surface a live "en línea"/"escribiendo…" presence indicator for the agency on the tenant path; it fabricates a human-present illusion.
- **Must NOT** show a live countdown here (that belongs to the PQRS timeline in v7-06, computed server-side or labeled "estimado").

**Verdict:** **Static expected-response hint = real today.** Live SLA clock = v7-06.

## 6. Frontend-First Boundaries (per COMU criterion)

| Capability | Real today? | Why |
|------------|-------------|-----|
| In-app text chat (send/read/mark-read/poll) | ✅ Real | `messagesApi` fully wired to backend |
| Chat presented/tied to arriendo/caso (context header + deep-link from caso/arriendo) | ✅ Real (composition) | Deep-link `?applicationId=` + v7-03 caso detail already exist |
| Expected-response hint (COMU-04) | ✅ Real | Static neutral copy/constant |
| File picker UI (COMU-02) | ⚠️ UI real, **send gated** | No chat-attachment endpoint + no message attachment field |
| Lease/caso-scoped thread (COMU-01) | ❌ "Próximamente" | Needs NestJS `messages.service.ts` lease-scope + model `leaseId` |
| Archive / report / mute (COMU-02) | ❌ "Próximamente" | No api-client method; report must reach agency |
| Proactive WhatsApp / reminders (COMU-03) | ❌ Gated / "Próximamente" | `agent` contact-ledger/`canContact` endpoint not exposed |

**Hard rule:** **No fake "enviado por WhatsApp" on a real-tenant path.** Empty-states/contracts follow the `lease-documents.service.ts` honest-unavailable posture (404/403/0 → "Próximamente"), never fabricated success.

## 7. Risks / Unknowns + Recommended Approach

**Risks:**
1. **Accidental outbound sender.** Adding a "notify" or WhatsApp button that hits any send API = Ley 2300 violation (HIGH recovery cost, PITFALLS 3 recovery: audit + pause). Mitigation: lint/grep gate — no `twilio|sendgrid|whatsapp.*send` import on tenant paths.
2. **Fake attachment.** Wiring the picker to `/documents/upload` and implying it's in the thread → orphaned doc, IDOR surface if retrieved raw. Mitigation: disclose "Próximamente"; retrieval only via `getSignedUrl`.
3. **"Why late" field creep.** A well-meaning quick-reply/segmentation prompt reintroduces the art. 7 violation. Mitigation: form-field audit — zero `motivo`/`razon` prompts.
4. **Instant-human illusion.** Enabling `online`/`typing` presence on the tenant path. Mitigation: keep those keys unused for tenant; ship the static SLA-consistent hint.

**Unknowns (backend/`agent`-owned):** exact lease-scoped chat route shape; whether attachments ride the presign→S3 or multipart path; whether the `agent` will expose `canContact` over HTTP for the portal. All are contract-first — sketch the api-client method + type now, degrade to "Próximamente".

**Recommended approach (order):**
1. Compose chat into the arriendo/caso context (header + deep-links) — real, low-risk.
2. Add the expected-response hint + shared `PQRS_SLA_BUSINESS_DAYS` constant — real.
3. Replace inert attach buttons with a real file picker UI that **discloses send is pending** — contract.
4. Replace `alert()` archive/report/mute with typed api-client stubs behind honest disabled/"Próximamente" — contract.
5. Sketch (do not call) the lease-scoped + contact-gate contracts with doc comments naming the `agent`/NestJS dependency — contract.

---

## Common Pitfalls (phase-specific)

### Pitfall 3 (PITFALLS.md:47) — Portal double-counts against the legal contact cap
Any outbound the portal triggers outside the `agent` gate lets a tenant get 2+ contacts/day. **Avoid:** route all proactive messaging through the `agent` contact ledger; if absent, it's a blocking dep, not a workaround. **Warning sign:** Twilio/SendGrid import on a tenant path.

### Pitfall 5 (PITFALLS.md:81) — Portal asks the tenant "why" they're late
A `motivo del atraso` field violates Ley 2300 art. 7. **Avoid:** never prompt/require/suggest a reason-for-nonpayment anywhere in chat/compose; ask only forward-looking questions.

### UX Pitfall (PITFALLS.md:229) — Messaging with no explicit response-time expectation
Tenant assumes instant human reply. **Avoid:** state the expected-response window explicitly, consistent with the PQRS SLA; suppress live-presence indicators on the tenant path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed attachment retrieval | Raw `/documents/:id` fetch | `documentsApi.getSignedUrl` / `useSignedDocUrl` (v7-02) | No-IDOR, short-lived, ownership-checked |
| File upload | New multipart plumbing | `useDocumentUpload()` / `avaluo` presign flow | Existing patterns, tested |
| Ley 2300 contact frequency | Portal-side counter | `agent` `canContact`/contact-ledger | Statutory cap enforced once, centrally |
| "Endpoint not live" degrade | Ad-hoc try/catch | `lease-documents.service.ts` `isEndpointUnavailable` (404/403/0) | Honest "Próximamente" template |
| Case↔chat linkage view-model | New chat-case type | `TenantCase` + `sourceLink` (v7-03) | Read-projection, no forked shape |

## Project Constraints (from CLAUDE.md / DESIGN.md)
- **Read DESIGN.md before any UI.** Cadence system: warm-neutral + single cobalt accent; **buttons sentence case** (DESIGN.md §1 "No uppercase button labels"), pill `rounded-full`; Phosphor icons; JetBrains Mono for numerals; WCAG AA (pair icon+text, never color alone).
- **Additive only** — do not rewrite the working `/inquilino/mensajes` widget; extend it.
- **es-CO** locale (not es-CL); COP; `+57`/cédula.
- **PR workflow** — feature branch → PR (never commit to main).
- The `agent` owns collections/contact-gate logic; the portal calls it, never reimplements (CLAUDE.md architecture note).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Lease-scoped chat needs a new NestJS route + model `leaseId` (no hidden lease param on the existing route) | §1 | LOW — if a lease param already exists, composition still ships; contract adjusts |
| A2 | No chat-attachment endpoint nor message attachment field exists | §2 | LOW — verified `messages.types.ts`/`messages.service.ts`; a hidden endpoint would only unblock earlier |
| A3 | `agent` does not yet expose `canContact` over HTTP for the portal | §4 | MEDIUM — governs whether any outbound can be real this phase; default gated is safe either way |
| A4 | Chat is not itself a "gestión de cobranza" contact under the cap (tenant reading/writing own thread) | §4 | MEDIUM — conservative reading; proactive outbound is the regulated surface, and it stays gated |

## Sources

### Primary (HIGH)
- `src/lib/api/messages.service.ts`, `messages.types.ts`, `src/lib/hooks/useMessages.ts`, `src/components/messages/MessagesWidget.tsx` — chat reality map + inert attach/action buttons
- `src/lib/api/applications.service.ts:247`, `settings.service.ts:101`, `avaluo.service.ts:26-90`, `src/lib/hooks/useDocuments.ts:70,130`, `documents.service.ts:121` — upload + signed-URL reuse
- `src/app/inquilino/casos/[caseId]/page.tsx`, `src/lib/types/tenant-case.ts` — v7-03 caso↔detail linkage
- `.planning/research/portal-inquilino/PITFALLS.md` §3/§5/§6/UX row — legal + UX guardrails
- `.planning/ROADMAP.md:110-121`, `.planning/REQUIREMENTS.md:38-41` — COMU scope

### Verification (session)
- Grep across `src/lib src/app src/components` for `twilio|sendgrid|whatsapp.*send` — **no tenant-path sender** (only mock data + agency PipelineDetail)
- No business-day/SLA helper found in `src/lib` — confirms static-hint approach for COMU-04

## Metadata
- **Standard stack:** HIGH — reuses existing in-repo services/hooks; no new packages.
- **Architecture (composition + contracts):** HIGH — grounded in current code.
- **Backend endpoint shapes (lease-scope/attachments/gate):** MEDIUM — not yet built, contract-first.
- **Research date:** 2026-07-18 · **Valid until:** ~2026-08-17 (stable; revalidate if `agent` exposes a contact-gate HTTP endpoint or NestJS ships lease-scoped chat).
