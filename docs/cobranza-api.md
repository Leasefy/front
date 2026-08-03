# Cobranza IA — Referencia de API (para el front)

> Superficie HTTP completa del microservicio `agents-worker` (schema `agent`) para el módulo de
> cobranza por voz e IA. Documenta request y response de cada endpoint para el consumo desde el front.
>
> **Fuente de verdad = OpenAPI.** Casi todas las rutas `agency-cobranza-*` se registran con
> `@hono/zod-openapi` y aparecen en `/openapi.json`. Para tipos siempre sincronizados:
>
> ```bash
> npm run openapi:dump   # (agents-worker) regenera el snapshot OpenAPI
> pnpm api:gen           # (front) regenera los tipos desde el OpenAPI
> ```
>
> Este documento es la referencia legible; el codegen es para no tipear a mano. Si un schema cambia
> en el back, el codegen se actualiza — este `.md` puede quedar atrás, así que ante duda, mandá el OpenAPI.

---

## 1. Base URL y entornos

| Entorno | Base |
|---|---|
| Local (dev) | `http://localhost:4000` |
| Prod / staging | según `AGENT_PUBLIC_URL` |

- **Rutas de cobranza (agencia)**: `/api/agency/{agencyId}/cobranza/...`
- **Webhooks Vapi** (no los consume el front): `/vapi/webhook`, `/vapi/inbound`
- **Rutas públicas** (deudor / ARCO, sin sesión): `/api/habeas-data/opt-out`, `/api/automated-decisions/{id}/request-review`, `/api/arco`, `/api/arco/verify/{token}`

---

## 2. Autenticación y autorización

Todas las rutas `/api/agency/{agencyId}/cobranza/...`:

1. **Bearer JWT** en `Authorization: Bearer <token>` (HS256, `AGENT_JWT_SECRET`).
2. **Guard cross-tenant**: `jwt.agencyId` DEBE coincidir con el `:agencyId` del path → `403` si no.
3. **Rol de membresía** (`agency_members`): el endpoint declara roles permitidos (`OWNER|ADMIN|OPERATOR|VIEWER`) → `403` si el rol no está.
4. **Permiso puntual**: además cada handler re-chequea un permiso fino (`cobranza:view`, `cobranza:intervene`, `cobranza:approve`, etc.) vía la matriz de permisos → `403` si falta.

```http
GET /api/agency/6f3.../cobranza/debtors HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Nota**: la API pública expone el tenant como `agencyId`; internamente es `tenant_id` con RLS (ADR-005).
> El front nunca manda `tenant_id`, siempre `agencyId` en el path.

---

## 3. Convenciones comunes

- **Paginación por cursor**: query `cursor` (opaco base64url) + `limit` (1–100, default 50). La respuesta trae `nextCursor: string | null`. Cuando es `null`, no hay más páginas. Algunos endpoints usan `limit`/`offset` (se indica).
- **PII enmascarada por defecto**: `cedulaMasked` (`12•••890`), `phoneMasked` (`300•••4567`), `emailMasked` (`j•••@gmail.com`). El valor real solo se obtiene vía `POST .../reveal-pii` (auditado, token 5 min).
- **Fail-soft**: varios GET devuelven `200` con listas vacías si la tabla/columna no está migrada (no rompas el front con eso).
- **Audit-first**: en mutaciones sensibles, primero se escribe `audit_log` y solo si eso funciona se aplica el cambio. Si la auditoría falla → `500` y **no** se aplicó nada.
- **`generatedAt`**: la mayoría de respuestas de lectura traen timestamp ISO de generación.

### Códigos de error transversales

| Código | Significado |
|---|---|
| `400` | Body/query inválido, cursor corrupto, rango de fechas inválido |
| `401` | JWT ausente/inválido, o firma inválida (webhooks/públicos) |
| `403` | Rol o permiso insuficiente, o `agencyId` no coincide con el JWT |
| `404` | No existe o es cross-tenant (mismo body, sin oráculo) |
| `409` | Conflicto de estado (ej. ya resuelto, ya aprobado) |
| `500` | Error interno o audit-first falló |
| `503` | DB no disponible (stub mode) — `{ error: 'Database unavailable' }` |

Formato de error típico: `{ "error": "<mensaje>" }` (algunos agregan `from`/`to` en transiciones inválidas).

---

## 4. Endpoints

> Todos los paths de esta sección son relativos a `/api/agency/{agencyId}/cobranza` salvo que se indique.
> Roles: **V**=VIEWER, **O**=OPERATOR, **A**=ADMIN, **W**=OWNER.

### 4.1 Deudores

#### `GET /debtors`
Listado filtrable y cursor-paginado (página principal de cobranza). Auth: W·A·O·V + `cobranza:view`.
- **Query**: `stage` (CSV `S0..S5,SX`), `channel` (CSV `voice,whatsapp,sms,email`), `daysMin`, `daysMax` (int), `search` (≤200; prefijo `HEX:` busca por `cedula_hash_prefix8`), `cedulaPrefix` (≤16), `cursor`, `limit` (1–100=50).
- **200**:
```jsonc
{
  "items": [{
    "id": "uuid", "fullName": "string", "currentStage": "S2", "daysInStage": 14,
    "lastActivityAt": "ISO", "cedulaMasked": "12•••890", "phoneMasked": "300•••4567",
    "emailMasked": "j•••@gmail.com", "channel": "voice", "isPaused": false,
    "carteraPausedUntil": "ISO|null", "attempts": { "total": 3, "lastAttemptAt": "ISO" }
  }],
  "nextCursor": "string|null", "generatedAt": "ISO"
}
```
- **Errores**: 400, 403, 503. Archivo: `agency-cobranza-debtors.ts`.

#### `GET /debtors/{debtorId}`
Header + sidebar del detalle. Auth: W·A·O·V + `cobranza:view`.
- **200**:
```jsonc
{
  "id": "uuid", "fullName": "string", "currentStage": "S2", "daysInStage": 14,
  "lastActivityAt": "ISO", "cedulaMasked": "12•••890", "phoneMasked": "...",
  "emailMasked": "...", "fiadorCedulaMasked": "...", "isPaused": false,
  "creditBalanceCop": 0,
  "sidebar": {
    "nextAction": { "plannedFor": "ISO", "channel": "voice", "templateName": "string" } | null,
    "contactAttemptsCount": 3,
    "contactAttempts": { "total": 3, "lastAttemptAt": "ISO", "lastChannel": "voice",
      "byChannel": { "voice": 2, "whatsapp": 1, "email": 0, "sms": 0 } },
    "recommendedNextStep": { "action": "string", "label": "string", "reason": "string", "basedOnCallAt": "ISO" }
  },
  "kpis": { "totalOwed": 0, "paymentsCount": 0, "callsCount": 0 },
  "generatedAt": "ISO"
}
```
- **Errores**: 404, 503. Archivo: `agency-cobranza-debtor.ts`.

#### `GET /debtors/{debtorId}/timeline`
Timeline mergeado (stage_transitions + calls + payments approved + memos), DESC. Auth: `cobranza:view`.
- **Query**: `cursor`, `limit`.
- **200**: `{ events: [{ event_type: 'stage_transition'|'call'|'payment'|'memo', occurred_at: "ISO", payload: {} }], nextCursor, generatedAt }`
- **Errores**: 400, 404, 503. Archivo: `agency-cobranza-debtor-timeline.ts`.

#### `GET /debtors/{debtorId}/calls`
Llamadas del deudor (sin transcript). Auth: `cobranza:view`. Query: `cursor`, `limit`.
- **200**: `{ calls: [{ id, started_at, ended_at, duration_seconds, channel, direction, status, qa_score, compliance_flags_count, vapi_call_id }], nextCursor, generatedAt }`
- **Errores**: 400, 404, 503. Archivo: `agency-cobranza-debtor-calls.ts`.

#### `GET /debtors/{debtorId}/memos`
Memos post-llamada. Auth: `cobranza:view`. Query: `cursor`, `limit`.
- **200**: `{ memos: [{ id, body, last_outcome, last_emotional_state, last_objection_literal, open_ptp_amount_cop, open_ptp_date, call_id, created_at }], nextCursor, generatedAt }`
- **Errores**: 400, 404, 503. Archivo: `agency-cobranza-debtor-memos.ts`.

#### `GET /debtors/{debtorId}/compromisos`
Snapshot: payment plans + insurance claims + legal artifacts (cap 100 c/u, sin paginación). Auth: `cobranza:view`.
- **200**:
```jsonc
{
  "paymentPlans": [{ "id","status","total_due_cop","initial_amount_cop","discount_applied_pct",
    "discount_kind","stage_at_offer","payment_provider","offered_at","accepted_at","defaulted_at" }],
  "insuranceClaims": [{ "id","aseguradora","policy_number","claim_reference","status","filed_at","denial_reason","created_at" }],
  "legalArtifacts": [{ "id","kind","status","generated_at","approved_at","sent_at","physical_send_method" }],
  "generatedAt": "ISO"
}
```
- **Errores**: 404, 503. Archivo: `agency-cobranza-debtor-compromisos.ts`.

#### `GET /debtors/{debtorId}/audit`
Audit log filtrado por deudor. Auth: `cobranza:view`. Query: `cursor`, `limit`.
- **200**: `{ entries: [{ id, action, actor_type, actor_id, ip, user_agent, occurred_at, metadata }], nextCursor, generatedAt }`
- **Errores**: 400, 403, 404, 503. Archivo: `agency-cobranza-debtor-audit.ts`.

#### `GET /debtors/{debtorId}/case-state`
Estado de caso derivado (16 estados) — solo lectura, no persiste. Auth: `cobranza:view`.
- **200**: `{ debtorId, caseState, reason, signals: { stage, promiseStatus, paymentStatus, disputeStatus, escalationStatus, escalationUrgency }, generatedAt }`
- **Errores**: 404, 503. Archivo: `agency-cobranza-case-state.ts`.

#### `POST /debtors/{debtorId}/reveal-pii`
Revela UN campo PII con audit-first + token 5 min. Auth: W·A·O·V en middleware, pero requiere `cobranza:reveal-pii` (VIEWER → 403).
- **Body**: `{ "field": "cedula" | "phone" | "email" | "fiador_cedula" }`
- **200**: `{ "token": "jwt-5min", "expires_at": "ISO", "value": "string" }`
- **Errores**: 400, 403, 404, 500 (audit falló → token NO se emite), 503. Archivo: `agency-cobranza-reveal-pii.ts`.

---

### 4.2 Llamadas

#### `GET /calls`
Lista agency-wide, cursor-paginada, PII enmascarada. Auth: `cobranza:view`.
- **Query**: `outcome`, `channel`, `direction` (`outbound|inbound`), `from`, `to` (ISO-8601), `cursor`, `limit`.
- **200**: `{ calls: [{ id, debtorId, debtorNameMasked, debtorCedulaMasked, debtorPhoneMasked, channel, direction, outcome, durationSeconds, initiatedAt, endedAt, qaScore, complianceFlagsCount }], nextCursor, generatedAt }`
- **Errores**: 400, 401, 403, 503. Archivo: `agency-cobranza-calls.ts`.

#### `GET /calls/{callId}`
Detalle: metadata + QA + state-trace + costo. `recordingUrl` NO se expone. Auth: `cobranza:view`.
- **200**:
```jsonc
{
  "id","debtorId","vapiCallId","direction","channel","status","outcome",
  "initiatedAt","startedAt","endedAt","durationSeconds",
  "qaDimensions": { "rapport","compliance","resolution","sentiment" },
  "complianceFlags": ["string"],
  "stateTrace": [{ "id","fromStage","toStage","reason","actorType","createdAt" }],
  "costBreakdown": { "llmUsd","voiceUsd","whatsappUsd","totalUsd" },
  "generatedAt": "ISO"
}
```
- **Errores**: 401, 403, 404, 503. Archivo: `agency-cobranza-call.ts`.

#### `GET /calls/{callId}/transcript`
Turnos ASC por `startedAt`. Auth: `cobranza:view`. Query: `redacted` (`'true'|'false'`) enmascara PII en `text`.
- **200**: `{ turns: [{ index, speaker: 'operator'|'agent'|'customer', startedAt, endedAt, text, complianceFlags: [] }], totalTurns, generatedAt }` — header `Cache-Control: no-store`.
- **Errores**: 401, 403, 404, 503. Archivo: `agency-cobranza-call-transcript.ts`.

#### `GET /calls/{callId}/audio`
Proxy de streaming range-byte (RFC 7233) del audio Vapi — la URL firmada nunca llega al cliente. Auth: `cobranza:view`.
- **Request**: header `Range` opcional.
- **Response**: `200`/`206` binario `audio/*`, headers `accept-ranges: bytes`, `cache-control: no-store`.
- **Errores**: 401, 403, 404, 502 (upstream Vapi), 503. Archivo: `agency-cobranza-call-audio.ts`.

---

### 4.3 Intervenciones (tab Acciones)

#### `POST /debtors/{debtorId}/pause`
Pausa la gestión. Auth: W·A·O + `cobranza:intervene`.
- **Body**: `{ "paused_until": "ISO-datetime", "reason": "string(1-500)" }`
- **200**: `{ "ok": true }` · **Errores**: 400, 403, 404, 500 (audit-first), 503.

#### `POST /debtors/{debtorId}/force-stage`
Fuerza el stage (admin-only). Auth: W·A + `cobranza:force-stage`.
- **Body**: `{ "target_stage": "S0"|"S1"|"S2"|"S3"|"S4"|"S5"|"SX", "reason": "string(1-500)" }`
- **200**: `{ "ok": true }` · **Errores**: 400, 403, 404, 500, 503.

#### `POST /debtors/{debtorId}/wa-send`
Envía plantilla WhatsApp aprobada (rechaza texto libre por schema). Auth: W·A·O + `cobranza:intervene`.
- **Body**: `{ "template_id": "string", "variables": { "clave": "valor" } }`
- **200**: `{ "ok": true, "providerMessageId": "string|null" }` · **Errores**: 400 (template desconocido), 403, 404 (sin tel), 500, 502 (BSP), 503.

#### `POST /debtors/{debtorId}/manual-call`
Dispara llamada saliente manual vía Vapi (admin-only). Audita `sha256(phone)`. Auth: W·A + `cobranza:intervene`.
- **Body**: `{ "reason": "string(1-500)" }`
- **200**: `{ "ok": true, "callId": "string" }` · **202** stub: `{ "ok": true, "callId": "string", "stub": true }`
- **Errores**: 400, 403, 404 (sin tel), 500, 502 (Vapi), 503.

#### `GET /wa-templates`
Plantillas WhatsApp aprobadas del tenant. Auth: `cobranza:view`.
- **200**: `{ "templates": [{ "id", "label", "variables": ["string"] }] }` · **Errores**: 403, 503.

Archivo (todos): `agency-cobranza-interventions.ts`.

---

### 4.4 Case Flags (clasificación)

Patrón común: params `{agencyId, debtorId}`; body `{ "value": boolean, "reason"?: "string(≤500)" }` (strict); respuesta `{ "ok": true, "value": boolean }`; audit-first (falla → 500). Errores: 400, 403, 404, 500, 503 (columna no migrada). Archivo: `agency-cobranza-case-flags.ts`.

| Endpoint | Auth |
|---|---|
| `POST /debtors/{debtorId}/judicializado` | W·A + `cobranza:approve` |
| `POST /debtors/{debtorId}/cartera-final` | W·A + `cobranza:approve` |
| `POST /debtors/{debtorId}/primary-contact` | W·A·O + `cobranza:intervene` |

---

### 4.5 Codeudor / Fiador

#### `POST /debtors/{debtorId}/codeudor/contactar`
Contacto MANUAL al codeudor/fiador (sin cron). Gate `AgencyPolicy.contactCodeudorEnabled` (default OFF). Auth: W·A + `cobranza:approve`.
- **Body**: `{ "channel": "sms"|"whatsapp" (default "sms"), "body": "string(≥1)", "fiadorContact": { "phone": "string(≥1)", "name"?: "string" } }`
- **200 (siempre — fail-soft)**: `{ "contacted": boolean, "channel": "sms"|"whatsapp"|null, "reason": "string|null" }`
  - `reason` posibles: `codeudor_disabled | no_fiador | no_fiador_contact | judicializado | schedule_blocked | frequency_cap | opted_out | channel_disabled | prohibited_copy | send_failed | feature_not_provisioned | debtor_not_found | empty_body`.
- **Errores**: 400, 401, 403, 503 (nunca 500 por guardrail). Archivo: `agency-cobranza-codeudor.ts`.

---

### 4.6 Escalations (kanban)

Archivo: `agency-cobranza-escalations.ts`. `EscalationCard = { id, debtor_id, call_id, urgency, status, reason, assignee_user_id, created_at, resolved_at }`.

#### `GET /escalations`
Payload kanban. Auth: `cobranza:view`.
- **200**: `{ open: EscalationCard[], assigned: EscalationCard[], resolved: EscalationCard[], resolvedNextCursor: null, generatedAt }` · Errores: 403, 503.

#### `GET /escalations/{id}`
Detalle + email del asignado. Auth: `cobranza:view`.
- **200**: `{ id, urgency, status, reason, debtor_id, linked_call_id, assignee_user_id, assignee_email, created_at, assigned_at, resolved_at, resolution_category, resolution_text }` · Errores: 403, 404, 503.

#### `POST /escalations/{id}/claim`
Auto-asignación del operador. Auth: W·A·O + `cobranza:resolve-escalation`. Body `{}`.
- **200**: `{ id, assignee_user_id, assigned_at, status: "assigned" }` · Errores: 403, 404, 409 (ya resuelta), 500, 503.

#### `POST /escalations/{id}/assign`
Admin asigna a un miembro. Auth: W·A + `cobranza:assign-escalation`. Body `{ "assignee_user_id": "uuid" }`.
- **200**: `{ id, assignee_user_id, assigned_at, status: "assigned" }` · Errores: 400 (target inválido), 403, 404, 409, 500, 503.

#### `POST /escalations/{id}/resolve`
Resuelve. `category="escalated-to-legal"` cascada a stage `S3` (requiere además `cobranza:force-stage`). Auth: W·A·O + `cobranza:resolve-escalation`.
- **Body**: `{ "category": "compromise"|"customer-rejected"|"escalated-to-legal"|"false-positive"|"other", "resolution_text": "string(1-2000)" }`
- **200**: `{ id, resolved_at, resolution_category, cascaded_to_legal: boolean }` · Errores: 400, 403, 404, 409, 500, 503.

---

### 4.7 Disputes

Archivo: `agency-cobranza-disputes.ts`. Auth (todos): W·A·O + `cobranza:intervene` (mapeado como `cobranza:act`). `Dispute = { id, debtor_id, payment_id, reason, disputed_amount, evidence_url, status, outcome, opened_by_user_id, opened_at, resolved_by_user_id, resolved_at, resolution_note, created_at }`.

#### `GET /disputes`  — Query: `status?` (`open|in_review|resolved`). **200**: `{ disputes: Dispute[], generatedAt }` (fail-soft a vacío). Errores: 403, 503.
#### `GET /disputes/{id}`  — **200**: `Dispute`. Errores: 403, 404, 503.
#### `POST /disputes`
Abre disputa; NO pausa cobranza; crea `Escalation(reason='dispute')` fail-soft.
- **Body**: `{ "debtorId": "uuid", "reason": "string(1-2000)", "disputedAmount"?: number≥0, "evidenceUrl"?: "url(≤2048)", "paymentId"?: "uuid" }`
- **200 (siempre)**: `{ dispute: Dispute|null, escalationCreated: boolean, persisted: boolean }` · Errores: 400, 403, 404, 503.
#### `POST /disputes/{id}/resolve`
Resolución HUMANA únicamente (T-323).
- **Body**: `{ "outcome": "procedente"|"improcedente"|"parcial", "resolutionNote": "string(1-2000)", "resolvedByUserId": "uuid" }`
- **200**: `{ id, status: "resolved", outcome, resolved_at, resolved_by_user_id, recommendation, persisted: true }` · Errores: 400, 403, 404, 409, 503.

---

### 4.8 Inbox unificado

Archivo: `agency-cobranza-inbox.ts`. Nunca auto-responde (solo etiqueta). `ThreadSummary = { id, debtorId, channel, label, status, unread, requiresAction, lastMessageAt, lastMessagePreview, createdAt }`.

#### `GET /inbox`
Threads agrupados por `label` (7 grupos + `otro`). Auth: `cobranza:view`.
- **200**: `{ groups: [{ label, title, count, threads: ThreadSummary[] }], totalThreads, totalUnread, generatedAt }`
  - `label ∈ { nueva_respuesta, promesa_detectada, pago_reportado, solicitud_acuerdo, disputa, sin_entender, requiere_humano, otro }`
- Errores: 401, 403, 503 (fail-soft a grupos vacíos).

#### `GET /inbox/{threadId}`  — **200**: `{ thread: ThreadSummary, messages: [{ id, direction, channel, body, classification, occurredAt, createdAt }] }`. Errores: 401, 403, 404, 503.
#### `POST /inbox/{threadId}/read`  — Marca leído (sin body). **200**: `{ ok: true, threadId, unread: false }`. Errores: 401, 403, 404, 503.

---

### 4.9 Promesas y Acuerdos

Archivo: `agency-cobranza-promises.ts`.

#### `GET /promises`
Histórico de promesas con status derivado. Auth: `cobranza:view`.
- **Query**: `status?` (`open|kept|broken|partially_kept`), `debtorId?`, `from?`, `to?` (ISO), `limit` (≤200=50), `offset` (=0).
- **200**: `{ items: [{ id, debtorId, callId, debtorName, cedulaMasked, phoneMasked, emailMasked, amount, dueDate, channel, conditions, status, derivedStatus: "activa"|"incumplida"|"parcial"|"por_vencer"|"cumplida", createdAt, resolvedAt }], total, limit, offset, generatedAt }`
- Errores: 401, 403, 503 (fail-soft a vacío).

#### `POST /agreements/propose`
Calcula un DRAFT de acuerdo (reutiliza `computeOffer`) — NO persiste ni activa. Auth: W·A·O + `cobranza:act`.
- **Body**: `{ "debtorId": "uuid", "stage": "CarteraStage", "totalDueCop": int>0, "interestsCop": int≥0 }`
- **200**:
```jsonc
{
  "isDraft": true, "debtorId", "stage", "discountAppliedPct",
  "discountKind": "intereses_total"|"intereses_parcial"|"none",
  "discountAmountCop", "effectiveTotalCop", "initialAmountCop",
  "installments": [{ "number", "dueDate", "amountCop" }],
  "agreementText", "agencyMaxDiscountPct", "requiresHumanApproval": true, "generatedAt"
}
```
- Errores: 400 (stage `S4/S5/SX` sin negociación), 401, 403, 404, 503.

---

### 4.10 Pagos

#### `GET /pagos`
Tabla paginada + KPIs atómicos (snapshot en una `$transaction`). Auth: `cobranza:view`. Archivo: `cobranza-payments-funnel.ts`.
- **Query**: `date_from`, `date_to` (=30d), `provider` (CSV `wompi,bold`), `status` (CSV `approved,pending,declined,disbursed`), `disbursement_state` (`pending|settled`), `sort` (`created_at|amount|disbursement_pending_days`), `cursor`, `limit` (≤100=50).
- **200**:
```jsonc
{
  "items": [{ "id","createdAt","amount","feeCop","status","provider","disbursementState",
    "disbursementPendingDays","paymentPlanId",
    "debtor": { "id","fullName","cedulaMasked","phoneMasked","emailMasked" } }],
  "nextCursor": "string|null",
  "kpis": { "approvedCount","pendingCount","declinedCount","totalRecaudadoCop","totalDisbursedCop","avgFeeCop" },
  "generatedAt": "ISO"
}
```
- Errores: 400, 401, 403, 503.

#### `GET /pagos/{paymentId}`
Detalle (self-report/verify metadata). Auth: `cobranza:view`. Archivo: `agency-cobranza-payment-verify.ts`.
- **200**: `{ payment: { id, debtorId, amount, status, paymentMethod, paymentProvider, paidAt, createdAt, selfReportedAt, selfReportedBy, comprobanteUrl, verifiedAt, verifiedByUserId, debtor: {...} } | null, generatedAt }`
- Errores: 401, 403, 404, 503.

#### `POST /pagos/report`
Auto-reporte de pago — nunca marca `approved`. Auth: W·A·O + `cobranza:act`.
- **Body**: `{ "payment_id": "uuid", "comprobante_url"?: "url(≤2000)"|null, "note"?: "string(≤1000)" }`
- **200**: `{ ok: true, paymentId, status: "self_reported" }` · Errores: 400, 401, 403, 404, 409 (ya aprobado), 500, 503.

#### `POST /pagos/{paymentId}/verify`
Verificación humana approve/reject — nunca automática. Auth: W·A·O + `cobranza:act`.
- **Body**: `{ "action": "approve"|"reject", "note"?: "string(≤1000)" }` (`note` obligatorio si `reject`).
- **200**: `{ ok: true, paymentId, status: "approved"|"pending", action }` · Errores: 400, 401, 403, 404, 409 (no está `self_reported`), 500, 503.

#### `POST /pagos/abono`
Registro humano de abono/pago parcial — idempotente. Auth: W·A·O + `cobranza:act`. Archivo: `agency-cobranza-partial-payment.ts`.
- **Body**: `{ "debtor_id": "uuid", "amount": number>0 (≤9999999999999), "idempotency_key": "string(1-200)", "payment_method"?: "string(≤80)", "promise_id"?: "uuid"|null, "note"?: "string(≤1000)", "confirm": true }`
- **200**:
```jsonc
{
  "ok": true, "paymentId", "debtorId", "amount", "status", "idempotentReplay": boolean,
  "saldoBefore", "abonoAmount", "saldoAfter",
  "linkedPromise": { "id","amount","statusBefore","statusAfter" } | null,
  "appliedAmount", "excessAmount", "isOverpayment", "creditBalanceAfter": number|null, "generatedAt"
}
```
- Errores: 400, 401, 403, 404, 500 (audit), 503.

---

### 4.11 Owner Reports (informes a propietario)

Archivo: `agency-cobranza-owner-reports.ts`. `OwnerReport = { id, propertyId, ownerId, ownerName, debtorId, period, daysInMora, overdueAmount, gestionesCount, narrative, status, pdfUrl, approvedByUserId, sentAt, createdAt }`.

#### `GET /owner-reports`  — Query `status?` (`draft|pending_approval|sent`). **200**: `{ reports: OwnerReport[], total, generatedAt }`. Errores: 403, 503.
#### `GET /owner-reports/{id}`  — **200**: `OwnerReport`. Errores: 403, 404, 503.
#### `POST /owner-reports/generate`
Compone draft (narrativa ES) desde cartera real — nunca envía. Auth: W·A·O + `cobranza:intervene`.
- **Body**: `{ "debtorId": "uuid", "period"?: "string(1-40)", "ownerName"?: "string", "propertyId"?: "string", "ownerId"?: "uuid" }`
- **201**: `OwnerReport` (status `draft`). Errores: 400, 403, 404, 503.
#### `POST /owner-reports/{id}/approve`
Transición humana `draft → pending_approval` (o `→ sent` con `markAsSent`). Auth: W·A + `cobranza:approve`.
- **Body**: `{ "markAsSent"?: boolean }`. **200**: `OwnerReport`. Errores: 400 (ya sent), 403, 404, 503.
#### `GET /owner-reports/{id}/pdf`  — Reservado. **501** hasta implementar template. Errores: 403, 404, 501, 503.

---

### 4.12 Recovery (Resultados)

#### `GET /recovery`
KPIs de recuperación — cada métrica es `null` si su fuente no está disponible. Auth: `cobranza:view`. Archivo: `agency-cobranza-recovery.ts`.
- **200**: `{ recoveredValueCop, recoveredValueSource: "recovery_outcomes"|"payments"|null, casesClosed, casesManaged, avgRecoveryDays, responseRatePct, promisesKept, promisesTotal, agreementsKept, agreementsTotal, casesEscalated, moraReducedPct, moraWindowDays: 90, generatedAt }` (todos `number|null` salvo `moraWindowDays`).
- Errores: 401, 403, 503.

---

### 4.13 Compliance

Archivo: `agency-cobranza-compliance.ts`.

#### `GET /compliance/overview`
Cacheado 60s por tenant. Auth: `cobranza:view`.
- **200**:
```jsonc
{
  "ley_2300": { "weekly_outside_hours_count": 0, "target": 0 },
  "habeas_data": { "open_requests": [{ "id","debtor_id","timestamp","remaining_days",
    "color": "green"|"yellow"|"red"|"red-pulse" }] },
  "retention": { "compliance_pct": 100, "target": 100 },
  "sparkline": { "daily_buckets_30d": [{ "date","flag_rate_pct" }] },
  "generated_at": "ISO"
}
```
- Errores: 403, 503.

#### `GET /compliance/ley-2300/attempts`  — Intentos fuera de horario. Query `cursor`, `limit` (≤100=50). **200**: `{ entries: [{ id, debtor_id, event_type, channel, timestamp }], nextCursor, generatedAt }`. Errores: 400, 403, 503.
#### `GET /compliance/opt-out`  — Opt-outs con acuse. Query `cursor`, `limit`. **200**: `{ entries: [{ id, debtor_id, timestamp, acknowledged_at }], nextCursor, generatedAt }`. Errores: 400, 403, 503.
#### `POST /compliance/opt-out/{eventId}/acknowledge`  — Acusa recibo. Auth: W·A + `cobranza:configure`. Body `{}`. **200**: `{ eventId, acknowledgedAt, debtorId }`. Errores: 403, 404, 500, 503.

---

### 4.14 Audit Log (forense)

#### `GET /audit-log`
Log forense filtrado (PII redactada). Auth: `cobranza:view`. Archivo: `agency-cobranza-audit-log.ts`.
- **Query**: `actor?`, `action?`, `from?`, `to?` (`YYYY-MM-DD`, default 7 días), `q?` (≥8 chars — `cedula_hash_prefix8` o prefijo de `entityId`), `cursor`, `limit` (1–100=50).
- **200**: `{ entries: [{ id, action, actor_type, actor_id, entity_type, entity_id, ip, user_agent, occurred_at, details }], nextCursor, generatedAt }` (`details` pasa por `redactPii()`).
- Errores: 400, 403, 503.

#### `GET /compliance/audit-log.csv`
> Path completo: `/api/agency/{agencyId}/compliance/audit-log.csv`

Export CSV con PII enmascarada (BOM UTF-8). Auth: `cobranza:view`. Archivo: `agency-cobranza-audit-log-csv.ts`.
- **Query**: `from?`, `to?` (ISO), `kind?` (substring de `action`).
- **200**: `text/csv` — columnas `timestamp, actor_type, actor_id, action, entity_type, entity_masked, reason`; header `Content-Disposition: attachment`.
- Errores: 400, 403, 503.

---

### 4.15 Autonomy

Archivo: `agency-cobranza-autonomy.ts`. `AutonomyLevel = "sugerir"|"aprobar"|"automatico_controlado"|"automatico_completo"`.

#### `GET /autonomy`  — Auth: `cobranza:view`. **200**: `{ agencyId, autonomyLevel, requiresHumanApproval: boolean, isDefault: boolean }` (fail-soft al default `automatico_completo`). Errores: 400, 401, 403, 404, 503.
#### `PUT /autonomy`  — Auth: W·A + `cobranza:approve`. Body `{ "autonomyLevel": AutonomyLevel }`. **200**: mismo shape que GET (audita en la misma tx). Errores: 400, 401, 403, 404, 503.

---

### 4.16 Cadence (calendario de contacto)

Archivo: `agency-cobranza-cadence.ts`. `CadenceConfig = { S0..S5, SX: [{ dayOffset: int, channel: "voice"|"whatsapp"|"email", reason: "string(1-120)", retryUntilConnect?: boolean }] }`. Configurar el plan nunca envía nada (T-323).

#### `GET /cadence`  — Auth: `cobranza:view`. **200**: `{ cadenceConfig: CadenceConfig|null, source: "agency"|"default", effectiveConfig: CadenceConfig, generatedAt }`. Errores: 403, 503.
#### `PUT /cadence`  — Auth: W·A + `cobranza:approve`. Body `{ "cadenceConfig": CadenceConfig|null }` (null = limpiar override). **200**: `{ cadenceConfig, source, updatedAt }`. Errores: 400, 403, 404, 503.

---

### 4.17 Analytics

Todos bajo `/analytics/...`, auth W·A·O·V + `cobranza:view`. Errores comunes: 401, 403, 503. Archivo: `agency-cobranza-analytics.ts`.

| Endpoint | Query | Response 200 (resumen) |
|---|---|---|
| `GET /analytics/agency-gate` | — | `{ populated: boolean, calls_30d: int }` |
| `GET /analytics/recovery-rate` | `window_days` (7\|30\|90=30) | `{ populated, rows: [{ stage, bucket_date, pct_n, pct_cop, debtors_recovered_count, debtors_in_stage_count, recovered_cop, total_cop_in_stage }] }` o `{ populated: false, reason }` |
| `GET /analytics/top-objections` | — | `{ populated, reason?, objections: [{ rank, literal, count, pct }] }` |
| `GET /analytics/cadence` | — | `{ populated, reason?, channelMix?: { rows: [{ channel, outcome, count, pct }] }, heatmap?: { cells: [{ hour, day_of_week, call_count, positive_outcome_pct }] } }` |
| `GET /analytics/cost-per-peso` | — | `{ populated, reason?, cost_per_peso: number\|null, numerator_usd_voice, denominator_cop_paid, sparkline_90d: [{ day, cost_per_peso }] }` |
| `GET /analytics/top-scripts` | — | `{ populated, reason?, rows: [{ scriptTemplateId, scriptTemplateName, stage, outcomes, totalCalls, conversionRate, lift }], data_since }` |

---

### 4.18 Daily Report

Todos bajo `/daily-report/...`. Archivo: `agency-cobranza-daily-report.ts`.

#### `GET /daily-report/today`  — Auth: `cobranza:view`. Cache 1h. **200**: objeto libre (`buildDailyReport`). Errores: 401, 403, 503.
#### `GET /daily-report/history`  — Query `days` (1–90=30). **200**: `{ entries: [{ report_date, computed_at, summary, alerts_count }], days }`.
#### `GET /daily-report/history.csv`  — Query `days` (1–90). **200**: `text/csv` (`report_date, computed_at, pkr_7d_pct, indice_morosidad_pct, compliance_violations_count, calls_outside_window_count, payments_today_total_cop, payments_today_count, connect_rate_pct, alerts_count`).
#### `GET /daily-report/thresholds`  — **200**: `{ version: int|null, top_n_debtors_in_report, mora_dias_bucket_boundaries: number[], pkr_pct_alert_below, indice_morosidad_pct_alert_above, compliance_violations_critical_at_least, calls_outside_window_critical_at_least, is_rollback_of_version, created_at }`.
#### `PUT /daily-report/thresholds`  — Auth: W·A + `cobranza:edit-thresholds`. Body `{ top_n_debtors_in_report: int(1-50), mora_dias_bucket_boundaries: number[](1-10), pkr_pct_alert_below: 0-100, indice_morosidad_pct_alert_above: 0-100, compliance_violations_critical_at_least: int≥0, calls_outside_window_critical_at_least: int≥0 }`. **200**: fila nueva (versión +1). Errores: 400, 401, 403, 500, 503.
#### `POST /daily-report/thresholds/rollback`  — Auth: W·A + `cobranza:edit-thresholds`. Body `{ "to_version": int≥1 }`. **200**: fila nueva. Errores: 400, 401, 403, 500, 503.
#### `GET /daily-report/subscription`  — Auth: `cobranza:subscribe-daily-report`. **200**: `{ email_enabled, whatsapp_enabled, updated_at? }`.
#### `PATCH /daily-report/subscription`  — Auth: `cobranza:subscribe-daily-report`. Body `{ "email_enabled"?: boolean, "whatsapp_enabled"?: boolean }` (`user_id` del body SIEMPRE se ignora → se resuelve del JWT). **200**: `{ email_enabled, whatsapp_enabled, updated_at }`. Errores: 403, 500, 503.

---

## 5. Webhooks Vapi (NO los consume el front)

Se documentan para contexto. Van **fuera** del base path y se autentican por HMAC (`x-vapi-signature`, `VAPI_WEBHOOK_SECRET`; stub-mode acepta si el secreto no está).

- **`POST /vapi/webhook`** — dispatch del state-machine de voz saliente (María). Eventos: `assistant-request`, `tool-calls`/`function-call`, `end-of-call-report`. Idempotencia `SETNX vapi:turn:{callId}:{turnNumber}`. Archivo: `vapi-webhook.ts`.
- **`POST /vapi/inbound`** — IVR entrante (deudor llama), caller-ID lookup + rejoin al backbone de identidad. Archivo: `vapi-inbound.ts`.

---

## 6. Rutas públicas (deudor / ARCO) — sin sesión

Montadas antes del middleware JWT; auth propia (token firmado HMAC o público con rate-limit).

#### `POST /api/habeas-data/opt-out`
Opt-out público de Habeas Data. Mensaje no-leaky (idéntico exista o no el deudor). Archivo: `habeas-data-opt-out.ts`.
- **Body**: `{ "debtorPhone": "string(8-15 díg)", "channel"?: "voice"|"whatsapp"|"email"|"sms"|"all" (="all"), "reason"?: "string(≤500)", "source"?: "inbound_whatsapp"|"public_form"|"phone_request", "signedToken"?, "nonce"?: "string(8-128)", "expiresAt"?: "ISO(≤72h)" }`
- **200 (siempre)**: `{ status: "received", referenceId, message }`
- Errores: 400, 401 (firma/expirado/TTL>72h), 500 (reintentable).

#### `POST /api/automated-decisions/{id}/request-review`
Derecho a revisión humana de decisión automatizada (Sentencia T-323/2024). Archivo: `automated-decisions-review.ts`.
- **Body**: `{ "requestedBy": "debtor"|"agency"|"auditor", "debtorId": "uuid", "signedToken"?, "nonce": "string(8-128)", "expiresAt"?: "ISO(≤72h)", "reason"?: "string(≤500)" }`
- **200**: `{ status: "review_requested", decisionId, slaHours: 72, contactWillPauseUntil, replay?, alreadyReviewable? }`
- Errores: 400, 401, 404, 500, 503.

#### `POST /api/arco`
Solicitud ARCO (Ley 1581/2012). Resuelve agencia por header `Host`. Rate-limit 10/hora por IP. Cédula hasheada SHA-256 (nunca cruda). Archivo: `arco-public.ts`.
- **Body**: `{ "requester_name": "string(2-200)", "requester_email": "email", "requester_cedula": "string(4-20)", "type": "acceso"|"rectificacion"|"cancelacion"|"oposicion", "description"?: "string(≤2000)" }`
- **201**: `{ id: "uuid", status: "pending_email_verification" }`
- Errores: 400 (`agency_not_found`), 422 (validación), 429 (rate limit), 503.

#### `GET /api/arco/verify/{token}`
Confirma email del solicitante. Anti-enumeración: `200 { verified: true }` siempre. Errores: 503. Archivo: `arco-public.ts`.

---

## 7. Notas de conformidad (front)

> Auditoría del consumo del front vs este contrato (2026-07). Ver también los hooks en
> `src/lib/hooks/cobranza/`.

- **Configuración**: el front tiene una pantalla `/ai/cobranza/configuracion` que consume
  `/api/agency/{id}/policies` (+ `/policies/versions`, `/policies/impact`). **Estos endpoints
  NO están en este contrato** y viven fuera del namespace `/cobranza/`. La configuración del
  agente según el contrato son **§4.15 `/cobranza/autonomy`** y **§4.16 `/cobranza/cadence`**,
  con shapes distintos. Pendiente: confirmar si `/policies` es válido o migrar a autonomy+cadence.
- **Namespace `/cartera/*`**: varios hooks (import, overview, legal-artifacts, insurance-claims,
  payment-plans) usan `/api/agency/{id}/cartera/...`, no documentado acá.
- **ARCO con `agencyId`**: `use-arco-*` usan `/api/agency/{id}/arco/*` (autenticado); este doc
  solo cubre el ARCO **público** (§6).
- **`use-templates`** pega a `/cobranza/templates`; el contrato define `/cobranza/wa-templates` (§4.3).
- **`use-payment-plan-approval.ts:197`** referencia `/api/agency/{id}/policy` (singular) — verificar.

Regla dura del contrato: **todo con `Authorization: Bearer <JWT>` y el `agencyId` del path DEBE
coincidir con el del token (si no, 403)**. Varios GET son **fail-soft** (200 con listas vacías) —
no tratarlos como error.
