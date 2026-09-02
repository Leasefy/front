---
phase: v7-05-comunicacion
plan: 02
wave: 2
status: complete
requirements: [COMU-02]
commits: [63f6d026, 437a50d8, ae9446d5]
build: green
tests: 601 passed / 7 pre-existing unrelated failures (0 new)
---

# Summary — v7-05-02: Adjuntos + acciones de conversación (COMU-02)

> **Provenance note:** the executor completed all 3 tasks + commits + build, but a transient API
> error (ECONNRESET) killed it during its final widget review, before it wrote this SUMMARY. This
> file was reconstructed by the orchestrator from the committed diffs, the per-task grep gates
> (all `GATE_OK`), and a green `pnpm build`. A first attempt had died even earlier having made zero
> commits; the tree was clean and this run started fresh on top of wave-1 HEAD `d93c8e9c`.

## What shipped

Chat attachments and the archive/mute/report conversation actions are now **real-or-honest** on the
shared `MessagesWidget.tsx`, replacing the inert Paperclip/Image buttons and the three `alert()`
placeholders — **without breaking the landlord/agency actors** (the handlers are shared; the
replacement is behavior-preserving for every actor).

### Task 1 — Conversation-action + attachment CONTRACTS (`63f6d026`)
`src/lib/api/messages.types.ts` (+45): `ChatAttachmentDraft { file: File }`, an optional in-thread
`attachment?` note-type (declared for the future; `BackendChatMessage` untouched, backend seam JSDoc'd),
and `export type ConversationActionResult = 'ok' | 'unavailable'`.
`src/lib/api/messages.service.ts` (+100): four typed methods reusing the `isEndpointUnavailable`
(404/403/0) idiom, all degrading honestly (never a fake success):
- `archiveConversation(id) → ConversationActionResult` (PATCH `/messages/conversations/:id/archive`)
- `muteConversation(id) → ConversationActionResult` (PATCH `…/mute`)
- `reportConversation(id, reason?) → ConversationActionResult` (POST `…/report`) — JSDoc: `reason` is
  VOLUNTARY free-text; never require/suggest a "why late" reason (Ley 2300 art. 7)
- `sendAttachment(id, file) → null` — contract stub modeled on `documents.service.ts` multipart upload
  (`entityType:'conversation'`), ALWAYS resolves `null` today (no endpoint + no message attachment field);
  it does NOT POST and must never stage an orphaned `/documents` upload.

### Task 2 — Real file picker, honest pending send (`437a50d8`)
A hidden `<input type="file">` wired to the Paperclip (`accept="image/*,application/pdf"`) and Image
(`accept="image/*"`) buttons. On select: first `File`, 10 MB cap (`toast.error` if exceeded), call
`sendAttachment` (resolves `null`) → honest `toast.info('El envío de adjuntos estará disponible pronto.')`.
Input value reset so re-selecting the same file fires again. **No fake attachment bubble, no "enviado",
no `documentsApi.upload` on the chat path** (orphaned-doc trap avoided — gate confirms 0).

### Task 3 — alert()→ service + sonner + AlertDialog report confirm (`ae9446d5`)
The three `alert()` bodies deleted; **zero `alert(` remain in the widget** (strict gate). `handleArchive`/
`handleMute` call the typed service with optimistic update + `sonner` toast on `'ok'`, honest
"…estará disponible próximamente." on `'unavailable'`. `handleReport` opens a Radix `AlertDialog`
confirm first (safety action) → `reportConversation`; any report reason is a single OPTIONAL free-text
`Textarea` ("Cuéntanos qué pasó (opcional)"), never a required/"motivo del atraso" prompt. Shared by
tenant + landlord/agency — behavior-preserving for both.

## Guardrails honored (grep-gated)
- Attachment send is honestly pending — **no fake "enviado"/bubble, no orphaned `/documents` upload** (0).
- **Zero `alert(`** in the widget; report is behind an `AlertDialog` confirm; feedback via `sonner`.
- **No "why late" field** — report reason is optional free-text only (Ley 2300 art. 7); gate = 0 tokens.
- Future attachment retrieval documented to use `getSignedUrl` (anti-IDOR, v7-02 pattern).
- Buttons sentence case (DESIGN.md §4). Zero new npm packages. Landlord/agency intact.

## Honest "Próximamente" boundaries (backend-gated, disclosed, not faked)
- Real attachment SEND (chat-attachment endpoint + `BackendChatMessage.attachment` field — two backend gaps).
- archive/mute/report persistence (NestJS `/messages/conversations/:id/{archive,mute,report}` not live) —
  today they honest-toast "Próximamente" via `isEndpointUnavailable`.

## Verification
- Grep gates T1/T2/T3 → all `GATE_OK`.
- `pnpm build` — **green** on the full stack.
- `pnpm test` — 601 passed / 7 pre-existing unrelated failures (asegurabilidad, EquipoAgentes,
  WorkItemDetalle, CarrierRegistryTable, risk-levels — see v7-01 `deferred-items.md`); **0 new**.

**Commit stack:** `63f6d026` · `437a50d8` · `ae9446d5`. Local on `plan/v7.0-portal-inquilino`; not pushed.
