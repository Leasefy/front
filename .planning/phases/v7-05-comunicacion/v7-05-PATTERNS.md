# Phase v7-05: Comunicación atada al arriendo/caso — Pattern Map

**Mapped:** 2026-07-18
**Worktree:** `/Users/nicolasgarcia/rent/mvp-portal-inquilino` (branch `plan/v7.0-portal-inquilino`)
**Files analyzed:** 6 surfaces (chat widget, `messages.service.ts` scope, `useChat` hook, chat attachments, conversation actions archive/report, outgoing/contact-gate, expected-response window)
**Analogs found:** 5 exact/role-match · 2 external-dep contracts (lease-scoped chat route · proactive-outgoing gate)

> **Headline for the planner:** v7-05 is a **hardening + honest-gating** phase on an already-real chat. The chat, the send path, the bubbles, the input, the empty-states **already exist and work in-app** — `MessagesWidget.tsx` + `useMessages.ts` + `messages.service.ts` are wired to a real backend. Four things are true and must drive the plans:
> 1. **The chat is `applicationId`-scoped today** — every route is `/applications/:id/chat*` (`messages.service.ts:19,26,34`). Lease/caso-scoping (COMU-01) **needs a backend route change** (external dep) → frontend-first: extend the service contract + carry `leaseId`/`caseId` on the conversation. The *context* (which lease/caso) is **already reachable in-app** (`useLeases().getActive()` `useLeases.ts:38,64`; v7-03 `TenantCase`), so the frontend can pass a lease/caso key **now**; only the server's lease-scoped read/write is the gap.
> 2. **Attachments are inert** — the Paperclip + Image buttons have **no `onClick`** (`MessagesWidget.tsx:539-550`). The real upload analog to copy is `documents.service.ts:78 upload(dto)` (authenticated multipart `FormData` scoped by `entityType`/`entityId`).
> 3. **archive / mute / report are `alert()`** (`MessagesWidget.tsx:198-219`). Make them real with the v7-02 ARCO pattern (service call + `sonner` toast + confirm `alert-dialog.tsx` + optimistic), or honest "Próximamente" if the backend endpoint is absent — **never keep the `alert()`**.
> 4. **The frontend NEVER sends via Twilio/WhatsApp directly** (verified). The *only* send is in-app `messagesApi.sendMessage` → `POST /applications/:id/chat/messages` (real, persisted). **Proactive WhatsApp/email/push reminders are a HARD gate**: they must route through the `agent` contact-ledger / `canContact()` (Ley 2300/2023 — PITFALLS 3). No Twilio import in this repo. → "Próximamente"/disabled until the `agent` exposes an HTTP contact endpoint.
>
> Read DESIGN.md before building: §"Inputs" (`input.tsx`, line 168), §"Empty State" (`empty-state.tsx`, line 467), §4 **button labels are sentence case** (line 164), §17 (dialogs / `alert-dialog.tsx` for report confirm). Toast = `sonner` (`documentos/page.tsx:6`).

---

## File Classification

| New/changed file | Role | Data Flow | Closest analog (path:line) | Match |
|------------------|------|-----------|----------------------------|-------|
| `src/lib/api/messages.service.ts` (EDIT — add lease/caso-scoped read+send contract) | service | request-response | *(itself `:18-38`, applicationId-scoped)* + `lease-documents.service.ts:100-139` (lease-scoped POST contract-only idiom) | self + role-match |
| `src/lib/api/messages.types.ts` (EDIT — add `leaseId`/`caseId` to conversation + attachment shape) | type/model | transform | *(itself `:26-59`)* + `documents.types.ts` (`DocumentSignedUrl`, upload dto) | self |
| `src/lib/hooks/useMessages.ts` (EDIT — `useChat` keys off lease/caso, adds attach) | hook | request-response (poll) | *(itself `useChat` `:51-135`)* | self |
| Chat attachments (COMU-02) — wire Paperclip/Image → real upload | service action + component | file-I/O (upload) | `documents.service.ts:78` `upload(dto)` (multipart, `entityType`/`entityId`) · `settings.service.ts:100` `uploadAvatar(file)` · `avaluo.service.ts:73` `uploadPhotoToS3` (presign twin) | exact |
| Attachment display (anti-IDOR read) | service action | request-response | `documents.service.ts:121` `getSignedUrl` (v7-02, signed/expiring) | exact |
| Conversation actions (archive/mute/**report**) — replace `alert()` | service action + component | CRUD + optimistic | `documents.service.ts:106 delete(id)` + `alert-dialog.tsx` confirm + `sonner` toast (v7-02 ARCO, PATTERNS §7) | role-match |
| Outgoing send (in-app) — extend to lease route | service action | request-response | *(itself `messagesApi.sendMessage` `:26`)* — REAL, in-app only | self |
| Proactive WhatsApp/reminder (COMU-03) — gated | channel | event-driven | *(no analog — hard `agent` contact-gate dep)* → "Próximamente" like `casos/page.tsx:275-282` | no-analog |
| Expected-response window (COMU-04) | component (copy) | static hint | `pqrs.types.ts:52` `slaVenceAt` (PQRS SLA source) + DESIGN.md §"Empty State" tone | role-match |
| `src/components/messages/MessagesWidget.tsx` (EDIT — all of the above, tenant `actor`) | component | request-response | *(itself — the canonical chat surface)* | self |

---

## REAL vs external-dep: what is real in-app TODAY vs behind a backend/agent gate

| Capability | Real in-app today? | Source (verified) | Planner action |
|-----------|--------------------|-------------------|----------------|
| **In-app send / receive** | ✅ **REAL** | `messagesApi.sendMessage` → `POST /applications/:id/chat/messages` (`messages.service.ts:26`); optimistic append + refetch (`useMessages.ts:95-123`); 5s poll (`:87-93`) | Keep. Extend the route to lease/caso-scoped (COMU-01). |
| **Lease/caso context reachable** | ✅ **REAL** (frontend) | `useLeases().getActive()` (`useLeases.ts:38,64`) → active lease `.id`; v7-03 `TenantCase` normalizer already carries a case id | Pass `leaseId`/`caseId` into the chat **now**; the *display* of which arriendo a thread belongs to is a frontend win today. |
| **Lease-scoped messages (server)** | ❌ **NO** → backend dep (COMU-01) | routes hardcoded to `/applications/:id/chat*` (`messages.service.ts:19,26,34`); `BackendConversation` has `applicationId` but **no `leaseId`/`caseId`** (`messages.types.ts:27`) | Frontend-first: add lease-scoped contract (`getMessagesByLease`/`sendByLease`) + `leaseId` mapper field; real data when NestJS `messages.service.ts` goes lease-scoped. |
| **Attach file/photo** | ❌ **inert** (buttons no-op) | `MessagesWidget.tsx:539-550` — `IconButton` Paperclip/Image with no handler | Wire hidden `<input type="file">` + `documents.service.ts:78 upload` pattern (scoped by conversation). |
| **Archive / mute conversation** | ❌ **`alert()`** | `MessagesWidget.tsx:198-214` | Real service+optimistic if backend endpoint exists; else honest "Próximamente" (never `alert`). |
| **Report conversation** | ❌ **`alert()`** | `MessagesWidget.tsx:216-219` | Safety action → confirm dialog + service; contract-first if no endpoint. |
| **Proactive WhatsApp/email/push** | ❌ **must be gated** | no Twilio in FE (verified); WhatsApp only a "Próximamente" chip in `casos/page.tsx:252-282` | HARD gate via `agent` `canContact()` (PITFALLS 3, `PITFALLS.md:50,56`). Disabled "Próximamente" until agent HTTP contact endpoint exists. **No Twilio import.** |
| **Expected-response window** | ⚠️ copy only | reuse PQRS SLA (`pqrs.types.ts:52`) | Neutral hint; no "respuesta humana instantánea" (PITFALLS UX `:229`). |

---

## Pattern Assignments

### 1. Chat lease/caso-scoping (COMU-01) — `messages.service.ts` + `messages.types.ts` + `useMessages.ts` (EDIT)

**Confirmed applicationId-scoped today** (cite verbatim):
- `messages.service.ts:19` `getMessages(applicationId)` → `GET /applications/${applicationId}/chat`
- `messages.service.ts:26` `sendMessage(applicationId, content)` → `POST /applications/${applicationId}/chat/messages`
- `messages.service.ts:34` `markAsRead(applicationId)` → `PATCH /applications/${applicationId}/chat/read`
- `useMessages.ts:51` `useChat(applicationId: string | null)` (poll at `:89`)
- `messages.types.ts:27` `BackendConversation.applicationId` · `:56` `BackendConversationWithMessages.applicationId` · `messages.types.ts:66` `ChatConversation.applicationId`
- `MessagesWidget.tsx:119` state `selectedApplicationId`; conversations keyed on `conversation.applicationId` (`:148,153,311`)

**Backend change required, but context is frontend-reachable.** The service routes are hardcoded to the application resource; keying a thread off a **lease/caso** needs a server route (`/leases/:id/chat` or a conversation carrying `leaseId`). That is an **external dep** (roadmap external-deps: *"NestJS messages.service.ts lease-scoped"*). Frontend-first split:
- **Contract now:** add lease-scoped methods to `messages.service.ts` modeled on the existing shape, and extend `BackendConversation`/`ChatConversation` with an optional `leaseId?`/`caseId?` (mapper `mapToConversation` `:122-137` adds the field when the backend returns it). Until the backend returns it, it stays `undefined` — no fabrication.
- **Context today:** the lease/caso id is already in hand — `useLeases().getActive()` (`useLeases.ts:38`) and v7-03 `TenantCase` (`use-tenant-cases.ts`). The widget can show **which arriendo** a conversation belongs to (header context, deep-link from a case) using the active lease **now**, even before the server groups by lease.

**Contract-only idiom to copy for the not-live lease route:** `lease-documents.service.ts:100-161` — lease-scoped `POST` that catches 403/404/0 and degrades to an honest "unavailable" posture (`isEndpointUnavailable` `:67`, `LeaseDocumentUnavailableError` `:79`) instead of faking. Apply the same "endpoint may not be live → honest empty, never fake" discipline to a lease-scoped chat read.

**⚠️ Do not break the existing applicationId path.** The widget is shared by tenant + landlord + agency (`mensajes/page.tsx:29` `actor="tenant"`; `panel/(landlord)/mensajes`; `panel/inmobiliaria/mensajes`). Additive: keep applicationId, add lease/caso as an alternate key — v7.0 is aditivo (never break existing CRM).

---

### 2. Chat attachments (COMU-02) — Paperclip/Image → real upload

**Inert today:** `MessagesWidget.tsx:539-550` renders two `IconButton`s (Paperclip `:543`, Image `:549`) with `aria-label` but **no `onClick`** — pure decoration.

**Closest analog — authenticated multipart scoped by entity:** `documents.service.ts:78 upload(dto)`:
```
const formData = new FormData();
formData.append('file', dto.file);
formData.append('type', dto.type);
if (dto.entityType) formData.append('entityType', dto.entityType);
if (dto.entityId)   formData.append('entityId', dto.entityId);
// fetch POST ${BACKEND_URL}/documents with Authorization Bearer, throws on !ok
```
This is the **best** analog: a chat attachment is a file scoped to an entity (the conversation/lease) — `entityType: 'conversation'|'lease'`, `entityId: <id>` maps 1:1. Auth via `getAccessToken()` (`documents.service.ts:79`), `FormData`, throw-on-error — same contract the chat send should reuse.

**Simpler twin:** `settings.service.ts:100 uploadAvatar(file)` — single-file `FormData` POST `/users/me/avatar`. Good reference for the minimal wiring (hidden `<input type="file">` → `File` → POST).

**Presign twin (if attachments go direct-to-S3):** `avaluo.service.ts:73 uploadPhotoToS3(file)` — two-step presign (`photoPresign` `:36`) + PUT to S3 (no auth on the PUT, content-type must match `:80`). Use only if the backend prefers presigned uploads over multipart.

**Display / anti-IDOR read:** `documents.service.ts:121 getSignedUrl(docId)` (v7-02) — short-lived, ownership-checked `{ url, expiresAt }`. An attachment thumbnail/download **must** consume a signed URL, never a raw persistent URL (`getDownloadUrl` is `@deprecated` for tenant paths, `:126-139`). Habeas Data continuity with v7-02.

**Wiring pattern:** hidden file input triggered by the existing `IconButton`; on select → `upload` → append an attachment message (optimistic, like `useMessages.ts:100-113`) → `sonner` toast on error. DESIGN.md: keep the `IconButton` (Cadence), sentence-case any new button (§4).

**Backend dep note:** message-attachment persistence (a message row referencing a file) may need a backend field/endpoint. Frontend-first: upload contract + optimistic UI now; if the message-attachment endpoint is absent, the upload can still target `/documents` scoped to the lease and be listed — but flag the "attachment-in-thread" persistence as the external seam.

---

### 3. Conversation actions archive / mute / report (COMU-02) — replace `alert()`

**`alert()` today** (cite verbatim): `MessagesWidget.tsx:198` `handleArchive` → `alert(...)`, `:207` `handleMute` → `alert(...)`, `:216` `handleReport` → `alert('Conversacion reportada')`. Comment at `:197` self-documents *"backend no las soporta aún — mantenemos alert"*. These are wired to the options menu (`:443,449,456`) and quick-actions (`:662,668`).

**Analog for making them real — the v7-02 ARCO pattern** (v7-02 PATTERNS §7): a real destructive/state action = **service call + optimistic update + `sonner` toast**, and for a consequential action a **confirm `alert-dialog.tsx`** (DESIGN.md §17), never a bare `alert()`. Model on `documents.service.ts:106 delete(id)` (`DELETE /documents/:id`) + `documentos/page.tsx:296` `toast.success('Documento eliminado')` / `:302` `toast.error(msg)`.

**Per-action guidance:**
- **Archive / mute** — need a conversation endpoint (`PATCH /messages/conversations/:id/archive|mute`). Frontend-first: add the contract to `messages.service.ts`, optimistic remove/flag + `sonner` toast; if endpoint absent (403/404), degrade to honest **"Próximamente"** (disabled item), **not `alert`**. Use the `lease-documents.service.ts` `isEndpointUnavailable` idiom.
- **Report** — a safety action → open `alert-dialog.tsx` confirm ("¿Reportar esta conversación?") → service POST → `toast`. Contract-first if no endpoint. **Never fire-and-forget an `alert`.**

**PITFALLS 5 guardrail (`PITFALLS.md:84,90`):** no "motivo del atraso"/"por qué" prompt anywhere — a report reason, if collected, is **voluntary free-text**, never a required/suggested "why late" field.

---

### 4. Outgoing / contact gate (COMU-03) — in-app REAL, proactive WhatsApp GATED

**The frontend never sends via Twilio/WhatsApp directly — verified.** Grep of `src/lib/api`, `src/components/messages`, `src/app/inquilino/mensajes` finds **no** Twilio/SendGrid/`wa.me` send; the only WhatsApp mention is a **disabled "Próximamente" chip** in `casos/page.tsx:275-282`. The single real outgoing path is in-app: `messagesApi.sendMessage` → `POST /applications/:id/chat/messages` (`messages.service.ts:26`), persisted server-side, read by the other party inside the portal. **Keep this; it is compliant** (it does not fan out to WhatsApp).

**REAL vs "Próximamente":**
- **REAL in-app send** — `sendMessage` (extend to lease route in §1). No gate needed: it is a portal message the counterparty reads in-app, not an outbound WhatsApp/email/push.
- **GATED (hard external dep)** — any *proactive* WhatsApp/email/push (a "notificar por WhatsApp" toggle, an "enviar recordatorio" button in Pagos/Acuerdos, a mora nudge) **must** route through the `agent` contact-ledger / `canContact()` so the Ley 2300/2023 art. 3 cap (máx 1/día, 1 canal/semana) is enforced once, centrally (PITFALLS 3, `PITFALLS.md:50,56,200`). Until the `agent` exposes that as an HTTP endpoint, this is **blocking** — render a disabled **"Próximamente"** affordance (same posture as `casos/page.tsx:275-282`), **never** import Twilio/SendGrid here, **never** show two independent "1 recordatorio enviado hoy" counters.

**Guardrails to encode in the plan (non-negotiable):**
- No Twilio/SendGrid import in this repo (`PITFALLS.md:58` warning sign).
- No "por qué la mora" field in chat or any intake (Ley 2300 art. 7, `PITFALLS.md:84`).
- WhatsApp is *first-channel* but **routed by the agent**, not sent by the frontend (`ROADMAP.md:117`).

---

### 5. Expected-response window (COMU-04) — reuse PQRS SLA, no "instant human"

**Pitfall (`PITFALLS.md:229`):** a messaging pillar with no explicit response-time expectation makes the tenant assume live/instant human reply. **Fix:** state an expected-response window **consistent with the PQRS SLA** (15 días hábiles, Ley 1480/2011, PITFALLS 6).

**Source to trace to:** the PQRS SLA field `pqrs.types.ts:52 slaVenceAt` (the same SLA v7-06 computes/surfaces). For v7-05 this is a **neutral static hint** near the chat header/input — e.g. "La inmobiliaria suele responder en días hábiles" — **not** a fabricated "en línea"/typing indicator, **not** "respuesta inmediata". Keep it consistent with (and no stronger than) the PQRS SLA copy so the two pillars don't contradict. Tone: DESIGN.md §"Empty State" neutral register; sentence case (§4).

---

## Shared Patterns

### api-client contract
**Source:** `src/lib/api/client.ts` (`apiClient.get/post/patch/delete<T>`, `ApiError(status,message)` `:21`; multipart via raw `fetch` + `getAccessToken()` as in `documents.service.ts:78`). Reuse for every new messages/attachment/action method. **403/404/0 → honest empty/"unavailable"** (`lease-documents.service.ts:67` `isEndpointUnavailable`) so a not-live lease-scoped or archive endpoint degrades to "Próximamente", never a crash or fake.

### File upload (attachments)
**Source:** `documents.service.ts:78 upload(dto)` (multipart, `entityType`/`entityId` — closest) · `settings.service.ts:100 uploadAvatar` (minimal twin) · `avaluo.service.ts:73 uploadPhotoToS3` (presign twin). Display via signed URL: `documents.service.ts:121 getSignedUrl` (anti-IDOR, v7-02).

### Real action + feedback (replace `alert()`)
**Source:** v7-02 ARCO (`documents.service.ts:106 delete` + `alert-dialog.tsx` confirm + `sonner` `toast.success/error` per `documentos/page.tsx:6,296,302`). Optimistic update idiom from `useMessages.ts:100-117` (append optimistic → refetch → roll back on error).

### Contact gate (proactive outgoing)
**Source (external, `agent`):** `canContact()` / contact-ledger (PITFALLS 3, `PITFALLS.md:50,56`). Frontend posture = disabled "Próximamente" (`casos/page.tsx:275-282`). **No Twilio in this repo.**

### Empty / loading / neutral copy
**Source:** DESIGN.md §"Empty State" (`empty-state.tsx`, line 467; used `MessagesWidget.tsx:374`), §"Inputs" (`input.tsx`, line 168), §4 sentence-case buttons (line 164), §17 dialogs. Existing message bubbles (`MessagesWidget.tsx:502-527`) and read-receipt ticks (`:520-524`) are the in-house pattern — extend, don't reinvent. Fix any `es-CL`→`es-CO` in touched copy (v7.0 convention).

---

## No Analog Found

| Surface | Role | Data Flow | Reason → planner action |
|---------|------|-----------|-------------------------|
| **Lease/caso-scoped chat route (server)** | service | request-response | Routes are hardcoded to `/applications/:id/chat*`; no lease-scoped read/send exists. → **backend dep**; frontend adds the contract + `leaseId`/`caseId` mapper field now (context reachable via `useLeases().getActive()` / `TenantCase`), real grouping lands when NestJS goes lease-scoped. Use `lease-documents.service.ts` not-live idiom. |
| **Message-attachment persistence (message row → file)** | service/type | file-I/O | Upload analog exists (`documents.service.ts:78`), but a *message that carries an attachment* has no in-repo shape. → contract + optimistic now; flag the thread-attachment persistence endpoint as the seam. |
| **Conversation archive/mute/report endpoints** | service | CRUD | Backend "no las soporta aún" (`MessagesWidget.tsx:197`). → contract-first + optimistic; honest "Próximamente"/confirm-dialog, replace `alert()`. |
| **Proactive WhatsApp/email/push send** | channel | event-driven | Hard `agent` contact-gate dep (Ley 2300). No FE analog and must not have one (no Twilio import). → disabled "Próximamente" until `agent` HTTP contact endpoint exists. |

---

## Metadata

**Analog search scope:** `src/lib/api/**` (messages.service, messages.types, documents.service, settings.service, avaluo.service, lease-documents.service, client), `src/lib/hooks/**` (useMessages, useLeases), `src/components/messages/MessagesWidget.tsx`, `src/app/inquilino/mensajes/page.tsx` + `casos/page.tsx` + `documentos/page.tsx`, `docs/DESIGN.md` (inputs/empty-state/buttons/dialogs), `.planning/research/portal-inquilino/PITFALLS.md` (3/5/UX), `pqrs.types.ts` (SLA). Repo-wide grep for Twilio/WhatsApp send in FE → **none** (only "Próximamente" chip).
**Files read end-to-end:** ROADMAP (v7-05 §110-121 + guardrails §28), REQUIREMENTS (COMU-01/02/03), v7-03 PATTERNS (house style), `messages.service.ts`, `messages.types.ts`, `useMessages.ts`, `MessagesWidget.tsx`, `avaluo.service.ts`, `documents.service.ts`, `settings.service.ts` (upload), `client.ts`, `lease-documents.service.ts`, PITFALLS §40-94 + §218-235; targeted grep of `useLeases.ts`, DESIGN.md, `documentos/page.tsx`, `casos/page.tsx`.
**Pattern extraction date:** 2026-07-18
**Read-only:** no source files modified; this PATTERNS.md is the only write.
