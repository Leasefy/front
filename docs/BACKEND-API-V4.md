# Leasefy AI Platform — Backend API V4 Specification

**Version:** 4.0
**Fecha:** 2026-02-10
**Audiencia:** Desarrollador Backend
**Status:** Contrato definido por frontend (pre-implementacion)

---

## Overview

This document defines the exact API contract between the Leasefy frontend and the AI orchestrator backend. The frontend is already built against these types — the backend must implement endpoints that match these schemas exactly.

- **Base URL:** `/api/v1/ai`
- **Authentication:** Bearer token (JWT from Clerk)
- **Content-Type:** `application/json` (except SSE endpoints)
- **Date format:** ISO 8601 strings (`"2026-02-10T14:30:00Z"`)
- **Language:** All user-facing text in Spanish (Colombian)
- **TypeScript types:** `src/lib/api/types.ts` (source of truth)

### Authentication

All endpoints require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

The JWT is issued by Clerk and contains `userId`, `orgId`, and role claims. Return `401 Unauthorized` if the token is missing, expired, or invalid.

### Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "not_found",
    "message": "Conversation not found"
  }
}
```

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `bad_request` | Missing required fields, invalid format |
| 401 | `unauthorized` | Missing or invalid JWT |
| 404 | `not_found` | Resource does not exist or belongs to another user |
| 429 | `rate_limit` | Too many requests (per-user rate limiting) |
| 500 | `internal_error` | Unexpected server error |

---

## Endpoints

### 1. POST /api/v1/ai/message

Send a user message to the AI orchestrator and receive a streaming response via SSE.

**Request:**

```typescript
interface SendMessageRequest {
  message: string;
  conversationId?: string;  // omit or null for new conversation
  attachments?: string[];   // URLs of uploaded files
}
```

```bash
curl -X POST https://api.leasefy.co/api/v1/ai/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Como va el cobro del apartamento en Chapinero?",
    "conversationId": "conv-a1b2c3d4"
  }'
```

**Response:** Server-Sent Events stream (`text/event-stream`). See [SSE Streaming Protocol](#sse-streaming-protocol) section for full details.

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 400 | `bad_request` | Empty `message` field |
| 401 | `unauthorized` | Invalid token |
| 404 | `not_found` | `conversationId` does not exist |
| 429 | `rate_limit` | User exceeded message rate limit |
| 500 | `internal_error` | Orchestrator failure |

---

### 2. GET /api/v1/ai/conversations

List the authenticated user's conversations, ordered by most recently updated.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 50) |
| `search` | string | — | Search in titles and message content |

**Response:**

```typescript
interface ConversationsListResponse {
  conversations: ApiConversation[];
  total: number;
}

interface ApiConversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

```bash
curl https://api.leasefy.co/api/v1/ai/conversations?page=1&limit=20&search=cobro \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "conversations": [
    {
      "id": "conv-a1b2c3d4",
      "title": "Cobro apartamento Chapinero",
      "lastMessage": "El inquilino confirmo el pago de febrero por $2.800.000",
      "messageCount": 12,
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-10T14:30:00Z"
    },
    {
      "id": "conv-e5f6g7h8",
      "title": "Mantenimiento calentador Usaquen",
      "lastMessage": "El proveedor confirmo visita para el jueves a las 2pm",
      "messageCount": 5,
      "createdAt": "2026-02-08T09:15:00Z",
      "updatedAt": "2026-02-09T16:45:00Z"
    }
  ],
  "total": 23
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

### 3. GET /api/v1/ai/conversations/:id

Get a single conversation with its full message history.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Conversation UUID |

**Response:**

```typescript
interface ConversationDetailResponse {
  id: string;
  title: string;
  messages: ApiMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentActivity?: {
    agents: AgentDispatchEvent[];
  };
  decision?: PendingDecision;
  createdAt: string;
}
```

```bash
curl https://api.leasefy.co/api/v1/ai/conversations/conv-a1b2c3d4 \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "id": "conv-a1b2c3d4",
  "title": "Cobro apartamento Chapinero",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "Como va el cobro del apartamento en Chapinero?",
      "createdAt": "2026-02-10T14:00:00Z"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "El arriendo de febrero del apartamento en Chapinero esta al dia. Maria Fernanda pago $2.800.000 el 5 de febrero, 3 dias despues del vencimiento como es habitual en ella.\n\n**Resumen de cobros:**\n- Monto: $2.800.000 COP\n- Fecha de pago: 5 de febrero\n- Estado: Al dia\n- Patron: Maria siempre paga entre el dia 3 y 5",
      "agentActivity": {
        "agents": [
          {
            "id": "agent-exec-001",
            "agentType": "cobranza",
            "taskDescription": "Consultando estado de cobros para Chapinero"
          }
        ]
      },
      "createdAt": "2026-02-10T14:00:05Z"
    }
  ],
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-10T14:00:05Z"
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 404 | `not_found` | Conversation does not exist or belongs to another user |
| 500 | `internal_error` | Database error |

---

### 4. POST /api/v1/ai/conversations

Create a new empty conversation. The title can be auto-generated after the first message.

**Request:** No body required (empty POST).

**Response:**

```typescript
interface CreateConversationResponse {
  id: string;
  title: string;
  createdAt: string;
}
```

```bash
curl -X POST https://api.leasefy.co/api/v1/ai/conversations \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "id": "conv-new-uuid-123",
  "title": "Nueva conversacion",
  "createdAt": "2026-02-10T15:00:00Z"
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

### 5. DELETE /api/v1/ai/conversations/:id

Delete a conversation and all its messages. This is a hard delete.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Conversation UUID |

```bash
curl -X DELETE https://api.leasefy.co/api/v1/ai/conversations/conv-a1b2c3d4 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `204 No Content` (empty body)

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 404 | `not_found` | Conversation does not exist or belongs to another user |
| 500 | `internal_error` | Database error |

---

### 6. GET /api/v1/ai/decisions

List all decisions across conversations for the authenticated user.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter: `pending` or `resolved` |
| `category` | string | — | Filter by agent type: `cobranza`, `pipeline`, `mantenimiento`, `documentos`, `comunicacion`, `reportes` |

**Response:**

```typescript
interface DecisionsListResponse {
  decisions: ApiDecisionEntry[];
  pendingCount: number;
}

interface ApiDecisionEntry {
  id: string;
  title: string;
  description: string;
  category: AgentType;  // 'cobranza' | 'pipeline' | 'mantenimiento' | 'documentos' | 'comunicacion' | 'reportes'
  options: DecisionOption[];
  selectedOptionId?: string;   // present if resolved
  selectedAt?: string;         // ISO 8601, present if resolved
  conversationId: string;
  createdAt: string;
}

interface DecisionOption {
  id: string;
  label: string;
  description: string;
  recommendation: 'recommended' | 'neutral' | 'not_recommended';
}
```

```bash
curl "https://api.leasefy.co/api/v1/ai/decisions?status=pending&category=cobranza" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "decisions": [
    {
      "id": "dec-001",
      "title": "Escalar mora de Pedro Rodriguez",
      "description": "Pedro lleva 45 dias de mora en el apartamento 502 de Usaquen. Deuda acumulada: $5.600.000 COP.",
      "category": "cobranza",
      "options": [
        {
          "id": "opt-a",
          "label": "Enviar recordatorio final",
          "description": "Enviar un ultimo recordatorio por WhatsApp y email antes de escalar",
          "recommendation": "neutral"
        },
        {
          "id": "opt-b",
          "label": "Enviar carta pre-juridica",
          "description": "Enviar carta formal de cobro pre-juridico con plazo de 15 dias",
          "recommendation": "recommended"
        },
        {
          "id": "opt-c",
          "label": "Iniciar proceso de terminacion",
          "description": "Iniciar terminacion unilateral del contrato por incumplimiento",
          "recommendation": "not_recommended"
        }
      ],
      "conversationId": "conv-e5f6g7h8",
      "createdAt": "2026-02-09T08:00:00Z"
    }
  ],
  "pendingCount": 3
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 400 | `bad_request` | Invalid `status` or `category` value |
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

### 7. POST /api/v1/ai/decisions/:id/select

Select an option for a pending decision. This triggers the orchestrator to execute the selected action.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Decision UUID |

**Request:**

```typescript
interface SelectDecisionRequest {
  optionId: string;
  additionalContext?: string;
}
```

**Response:**

```typescript
interface SelectDecisionResponse {
  status: 'accepted' | 'executing';
  actionsTriggered: string[];
}
```

```bash
curl -X POST https://api.leasefy.co/api/v1/ai/decisions/dec-001/select \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "optionId": "opt-b",
    "additionalContext": "Incluir detalle de los meses adeudados en la carta"
  }'
```

```json
{
  "status": "executing",
  "actionsTriggered": [
    "Generando carta pre-juridica con detalle de 3 meses adeudados",
    "Enviando carta a Pedro Rodriguez por email certificado"
  ]
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 400 | `bad_request` | Missing `optionId`, or decision already resolved |
| 401 | `unauthorized` | Invalid token |
| 404 | `not_found` | Decision does not exist |
| 500 | `internal_error` | Orchestrator failure |

---

### 8. GET /api/v1/ai/briefings

List briefings for the authenticated user, ordered by most recent.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 10 | Number of briefings to return (max 30) |
| `type` | string | — | Filter: `daily`, `weekly`, or `alert` |

**Response:**

```typescript
interface BriefingsListResponse {
  briefings: ApiBriefing[];
}

interface ApiBriefing {
  id: string;
  type: 'daily' | 'weekly' | 'alert';
  date: string;           // ISO 8601
  greeting: string;
  overallSummary: string;
  sections: BriefingSection[];
  isNew: boolean;
  createdAt: string;
}

interface BriefingSection {
  id: string;
  title: string;
  icon: string;           // Phosphor icon name (e.g. "CurrencyDollar")
  color: string;          // Tailwind color token (e.g. "emerald")
  summary: string;        // One-line summary, always visible
  details: string[];      // Detailed bullet points
  actionLabel?: string;   // CTA text (e.g. "Cuentame mas sobre cobros")
  actionContext?: string;  // Context sent to chat when CTA is clicked
}
```

```bash
curl "https://api.leasefy.co/api/v1/ai/briefings?limit=5&type=daily" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "briefings": [
    {
      "id": "brief-2026-02-10",
      "type": "daily",
      "date": "2026-02-10",
      "greeting": "Buenos dias, Nicolas",
      "overallSummary": "8 de 10 arriendos cobrados. 1 decision pendiente sobre mora en Usaquen.",
      "sections": [
        {
          "id": "sec-cobros",
          "title": "Cobros",
          "icon": "CurrencyDollar",
          "color": "emerald",
          "summary": "8/10 pagados ($22.4M de $28M)",
          "details": [
            "Maria (Apto 301): pago el 5 de febrero, $2.800.000",
            "Pedro (Apto 502): mora 45 dias, $5.600.000 pendientes",
            "Los demas inquilinos al dia"
          ],
          "actionLabel": "Cuentame mas sobre cobros",
          "actionContext": "Dame un resumen detallado del estado de cobros de este mes"
        },
        {
          "id": "sec-pipeline",
          "title": "Pipeline",
          "icon": "FunnelSimple",
          "color": "blue",
          "summary": "3 candidatos nuevos para Apto 204",
          "details": [
            "Carolina M. - Score 89, ingresos 4.8x arriendo",
            "Andres P. - Score 74, documentos pendientes",
            "Lucia R. - Score 68, verificacion en proceso"
          ],
          "actionLabel": "Ver candidatos",
          "actionContext": "Muestrame los candidatos actuales para el apartamento 204"
        },
        {
          "id": "sec-mantenimiento",
          "title": "Mantenimiento",
          "icon": "Wrench",
          "color": "amber",
          "summary": "1 ticket cerrado, 1 preventivo sugerido",
          "details": [
            "Gotera Apto 502 reparada - Proveedor Martinez, $180.000",
            "Calentador Apto 201 cumple 9 anios - reemplazo preventivo recomendado ($450.000)"
          ],
          "actionLabel": "Ver mantenimiento",
          "actionContext": "Dame detalles del mantenimiento pendiente y el preventivo sugerido"
        }
      ],
      "isNew": true,
      "createdAt": "2026-02-10T07:00:00Z"
    }
  ]
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

### 9. GET /api/v1/ai/briefings/latest

Get the most recent briefing. Returns the latest briefing regardless of type.

**Response:**

```typescript
type LatestBriefingResponse = ApiBriefing;
```

```bash
curl https://api.leasefy.co/api/v1/ai/briefings/latest \
  -H "Authorization: Bearer $TOKEN"
```

Response body is the same shape as a single `ApiBriefing` object (see example in briefings list above).

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 404 | `not_found` | No briefings exist yet |
| 500 | `internal_error` | Database error |

---

### 10. GET /api/v1/ai/preferences

Get the authenticated user's AI preferences.

**Response:**

```typescript
type PreferencesResponse = BetaPreferences;

interface BetaPreferences {
  autonomy: Record<AgentType, AutonomyLevel>;
  notifications: NotificationPreferences;
  tone: CommunicationTone;
  thresholds: ThresholdSettings;
}

// Where:
type AgentType = 'cobranza' | 'pipeline' | 'mantenimiento' | 'documentos' | 'comunicacion' | 'reportes';
type AutonomyLevel = 'auto' | 'ask_first' | 'manual';
type CommunicationTone = 'formal' | 'professional' | 'casual';

interface NotificationPreferences {
  categories: Record<AgentType, boolean>;
  channel: 'in_app' | 'email' | 'whatsapp' | 'all';
}

interface ThresholdSettings {
  moraTolerance: number;           // Days of late payment tolerance
  maintenanceBudgetLimit: number;  // COP amount before requiring approval
  minCandidateScore: number;       // Minimum score to auto-approve
}
```

```bash
curl https://api.leasefy.co/api/v1/ai/preferences \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "autonomy": {
    "cobranza": "ask_first",
    "pipeline": "ask_first",
    "mantenimiento": "ask_first",
    "documentos": "ask_first",
    "comunicacion": "ask_first",
    "reportes": "ask_first"
  },
  "notifications": {
    "categories": {
      "cobranza": true,
      "pipeline": true,
      "mantenimiento": true,
      "documentos": false,
      "comunicacion": true,
      "reportes": false
    },
    "channel": "in_app"
  },
  "tone": "professional",
  "thresholds": {
    "moraTolerance": 5,
    "maintenanceBudgetLimit": 500000,
    "minCandidateScore": 70
  }
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

### 11. PUT /api/v1/ai/preferences

Update user AI preferences. Supports partial updates — only include fields you want to change. The backend must deep-merge the provided fields with existing preferences.

**Request:**

```typescript
type UpdatePreferencesRequest = Partial<BetaPreferences>;
```

**Response:**

```typescript
type UpdatePreferencesResponse = BetaPreferences;  // Full updated object
```

```bash
curl -X PUT https://api.leasefy.co/api/v1/ai/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autonomy": {
      "cobranza": "auto",
      "reportes": "auto"
    },
    "thresholds": {
      "moraTolerance": 3
    }
  }'
```

```json
{
  "autonomy": {
    "cobranza": "auto",
    "pipeline": "ask_first",
    "mantenimiento": "ask_first",
    "documentos": "ask_first",
    "comunicacion": "ask_first",
    "reportes": "auto"
  },
  "notifications": {
    "categories": {
      "cobranza": true,
      "pipeline": true,
      "mantenimiento": true,
      "documentos": false,
      "comunicacion": true,
      "reportes": false
    },
    "channel": "in_app"
  },
  "tone": "professional",
  "thresholds": {
    "moraTolerance": 3,
    "maintenanceBudgetLimit": 500000,
    "minCandidateScore": 70
  }
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| 400 | `bad_request` | Invalid autonomy level, tone, or threshold values |
| 401 | `unauthorized` | Invalid token |
| 500 | `internal_error` | Database error |

---

## SSE Streaming Protocol

The chat endpoint (`POST /api/v1/ai/message`) uses Server-Sent Events (SSE) for streaming responses to the client.

### Connection Setup

The client sends a regular POST with `Accept: text/event-stream`:

```http
POST /api/v1/ai/message HTTP/1.1
Host: api.leasefy.co
Authorization: Bearer <jwt-token>
Content-Type: application/json
Accept: text/event-stream

{"message": "Como van los cobros este mes?", "conversationId": "conv-a1b2c3d4"}
```

The server responds with `Content-Type: text/event-stream` and begins streaming events.

### Event Format

Each event is a single `data:` line containing a JSON object with a `type` field:

```
data: {"type": "event_type", ...payload}\n\n
```

### Event Types

There are 7 event types. The `type` field in the TypeScript union `ChatStreamEvent` defines the exact shape of each:

```typescript
type ChatStreamEvent =
  | { type: 'message_start'; conversationId: string; messageId: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'agent_dispatch'; agents: AgentDispatchEvent[] }
  | { type: 'agent_status'; agentId: string; status: AgentExecutionStatus; durationMs?: number; error?: string }
  | { type: 'decision'; decision: PendingDecision }
  | { type: 'message_complete'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; code: string; message: string };
```

#### 1. `message_start`

Always the first event. Provides IDs for the conversation and the new assistant message.

```json
{"type": "message_start", "conversationId": "conv-a1b2c3d4", "messageId": "msg-789xyz"}
```

- If the request omitted `conversationId`, a new conversation is created and its ID is returned here.
- The `messageId` is the ID of the assistant response being streamed.

#### 2. `agent_dispatch`

Sent when the orchestrator decides to invoke one or more specialized agents. Contains the full list of agents being dispatched.

```json
{
  "type": "agent_dispatch",
  "agents": [
    {
      "id": "exec-001",
      "agentType": "cobranza",
      "taskDescription": "Consultando estado de cobros para Chapinero"
    },
    {
      "id": "exec-002",
      "agentType": "reportes",
      "taskDescription": "Generando resumen mensual de pagos"
    }
  ]
}
```

```typescript
interface AgentDispatchEvent {
  id: string;
  agentType: AgentType;  // 'cobranza' | 'pipeline' | 'mantenimiento' | 'documentos' | 'comunicacion' | 'reportes'
  taskDescription: string;
}
```

- Sent once per message (not per agent).
- Multiple agents can be dispatched simultaneously.
- The frontend shows agent badges immediately upon receiving this event.

#### 3. `agent_status`

Sent per-agent as each agent completes or fails its task.

```json
{"type": "agent_status", "agentId": "exec-001", "status": "completed", "durationMs": 1250}
```

```json
{"type": "agent_status", "agentId": "exec-002", "status": "failed", "error": "Timeout al consultar base de datos de pagos"}
```

- `status`: `'dispatching' | 'running' | 'completed' | 'failed'`
- `durationMs`: Included only when `status` is `"completed"`.
- `error`: Included only when `status` is `"failed"`.

#### 4. `content_delta`

Streaming text content. Each delta is a small chunk of the assistant's response (typically a few words or a sentence fragment).

```json
{"type": "content_delta", "delta": "El arriendo de febrero "}
```

```json
{"type": "content_delta", "delta": "del apartamento en Chapinero "}
```

```json
{"type": "content_delta", "delta": "esta al dia."}
```

- The client concatenates all deltas to build the full response.
- Content is streamed after agent execution completes (not during).
- Content may include Markdown formatting (bold, lists, tables, headings).

#### 5. `decision`

Sent when the orchestrator presents a decision requiring user input.

```json
{
  "type": "decision",
  "decision": {
    "id": "dec-001",
    "title": "Escalar mora de Pedro Rodriguez",
    "description": "Pedro lleva 45 dias de mora. Deuda acumulada: $5.600.000 COP.",
    "options": [
      {
        "id": "opt-a",
        "label": "Enviar recordatorio final",
        "description": "Enviar un ultimo recordatorio antes de escalar",
        "recommendation": "neutral"
      },
      {
        "id": "opt-b",
        "label": "Enviar carta pre-juridica",
        "description": "Carta formal con plazo de 15 dias",
        "recommendation": "recommended"
      },
      {
        "id": "opt-c",
        "label": "Iniciar terminacion",
        "description": "Terminacion unilateral por incumplimiento",
        "recommendation": "not_recommended"
      }
    ],
    "category": "cobranza"
  }
}
```

- Sent after `content_delta` events (decision is attached after the response text).
- At most one decision per message.
- The user selects an option via `POST /api/v1/ai/decisions/:id/select`.

#### 6. `message_complete`

Always the last semantic event. Indicates the response is fully delivered.

```json
{"type": "message_complete", "usage": {"inputTokens": 2340, "outputTokens": 512}}
```

- `usage` is optional — include it if token tracking is available.
- After this event, the only remaining data is the `[DONE]` terminator.

#### 7. `error`

Sent when an error occurs during streaming. Can appear at any point.

```json
{"type": "error", "code": "rate_limit", "message": "Limite de mensajes alcanzado. Intenta de nuevo en 60 segundos."}
```

```json
{"type": "error", "code": "orchestrator_error", "message": "Error interno del orquestador. Por favor intenta de nuevo."}
```

- Error codes: `rate_limit`, `orchestrator_error`, `context_overflow`, `timeout`
- After an error event, the stream terminates with `[DONE]`.

### Stream Termination

Every stream ends with the `[DONE]` sentinel:

```
data: [DONE]\n\n
```

This tells the client to close the connection. The `[DONE]` line is NOT valid JSON — the client must check for it before parsing.

### Event Sequence Rules

1. `message_start` is always first.
2. `agent_dispatch` (if present) comes before `content_delta`.
3. `agent_status` events arrive between `agent_dispatch` and the first `content_delta`.
4. `content_delta` events arrive in order — concatenate to build the full text.
5. `decision` (if present) comes after all `content_delta` events.
6. `message_complete` is always the last semantic event.
7. `error` can appear at any point and terminates the sequence.
8. `[DONE]` is always the final line.

### Complete SSE Session Example

Below is a realistic complete session showing all event types in order:

```
data: {"type":"message_start","conversationId":"conv-a1b2c3d4","messageId":"msg-resp-456"}

data: {"type":"agent_dispatch","agents":[{"id":"exec-001","agentType":"cobranza","taskDescription":"Consultando estado de cobros del mes"},{"id":"exec-002","agentType":"reportes","taskDescription":"Generando resumen de pagos recibidos"}]}

data: {"type":"agent_status","agentId":"exec-001","status":"running"}

data: {"type":"agent_status","agentId":"exec-002","status":"running"}

data: {"type":"agent_status","agentId":"exec-001","status":"completed","durationMs":1250}

data: {"type":"agent_status","agentId":"exec-002","status":"completed","durationMs":1800}

data: {"type":"content_delta","delta":"Este mes van "}

data: {"type":"content_delta","delta":"**8 de 10 arriendos cobrados** "}

data: {"type":"content_delta","delta":"por un total de $22.400.000 COP.\n\n"}

data: {"type":"content_delta","delta":"**Pendientes:**\n"}

data: {"type":"content_delta","delta":"- Pedro Rodriguez (Apto 502): "}

data: {"type":"content_delta","delta":"mora de 45 dias, $5.600.000\n"}

data: {"type":"content_delta","delta":"- Ana Gutierrez (Apto 108): "}

data: {"type":"content_delta","delta":"vence maniana, recordatorio enviado\n\n"}

data: {"type":"content_delta","delta":"La situacion de Pedro requiere atencion."}

data: {"type":"decision","decision":{"id":"dec-001","title":"Escalar mora de Pedro Rodriguez","description":"Pedro lleva 45 dias de mora. Deuda acumulada: $5.600.000 COP.","options":[{"id":"opt-a","label":"Enviar recordatorio final","description":"Ultimo recordatorio antes de escalar","recommendation":"neutral"},{"id":"opt-b","label":"Enviar carta pre-juridica","description":"Carta formal con plazo de 15 dias","recommendation":"recommended"},{"id":"opt-c","label":"Iniciar terminacion","description":"Terminacion unilateral por incumplimiento","recommendation":"not_recommended"}],"category":"cobranza"}}

data: {"type":"message_complete","usage":{"inputTokens":2340,"outputTokens":512}}

data: [DONE]

```

### Client Reconnection Guidance

- If the connection drops mid-stream, the client should **not** automatically retry the same message.
- Instead, the client should call `GET /api/v1/ai/conversations/:id` to fetch the conversation state and check if the assistant message was saved.
- If the message was partially saved, display what exists and let the user send a follow-up.
- For rate limit errors, implement exponential backoff starting at 1 second.

---

## Agent Execution Events

This section documents the agent system as it appears in the SSE stream.

### Agent Types

The orchestrator can dispatch 6 types of specialized agents:

| Agent Type | Description | Typical Duration | Icon | Color |
|------------|-------------|-----------------|------|-------|
| `cobranza` | Collection and payment tracking. Sends reminders, verifies receipts, detects delinquency. | 1-2s | CurrencyDollar | emerald |
| `pipeline` | Candidate management. Scores applicants, moves through pipeline stages, schedules viewings. | 1-2s | FunnelSimple | blue |
| `mantenimiento` | Maintenance coordination. Creates tickets, assigns vendors, tracks repairs. | 1-2s | Wrench | amber |
| `documentos` | Document generation and verification. Contracts, certificates, OCR validation. | 1-3s | FileText | purple |
| `comunicacion` | Multi-channel communication. WhatsApp, email, SMS via Twilio/SendGrid. | 1-2s | ChatCircle | pink |
| `reportes` | Report generation and analytics. Financial summaries, occupancy stats, trends. | 2-3s | ChartBar | indigo |

The `AgentType` is a union type:

```typescript
type AgentType = 'cobranza' | 'pipeline' | 'mantenimiento' | 'documentos' | 'comunicacion' | 'reportes';
```

### Status Lifecycle

Each agent goes through this lifecycle:

```
dispatching → running → completed
                     → failed
```

```typescript
type AgentExecutionStatus = 'dispatching' | 'running' | 'completed' | 'failed';
```

- **dispatching**: Agent has been selected by the orchestrator but has not started executing yet.
- **running**: Agent is actively executing its task.
- **completed**: Agent finished successfully. `durationMs` is included.
- **failed**: Agent encountered an error. `error` message is included.

### Event Schemas

#### `agent_dispatch` Event

Sent once when the orchestrator dispatches agents. Contains the full list.

```typescript
{
  type: 'agent_dispatch';
  agents: Array<{
    id: string;           // Unique execution ID (e.g. "exec-001")
    agentType: AgentType; // Which agent type
    taskDescription: string; // Human-readable task description in Spanish
  }>;
}
```

**Rules:**
- Sent at most once per message.
- Can contain 1-6 agents (one per type, no duplicates).
- The `id` field is unique per execution, not per agent type.
- `taskDescription` should be a short sentence in Spanish describing what the agent is doing.

#### `agent_status` Event

Sent per-agent as status changes.

```typescript
{
  type: 'agent_status';
  agentId: string;                    // Matches id from agent_dispatch
  status: AgentExecutionStatus;       // 'dispatching' | 'running' | 'completed' | 'failed'
  durationMs?: number;                // Only when status = 'completed'
  error?: string;                     // Only when status = 'failed', in Spanish
}
```

**Rules:**
- One `agent_status` event per status transition per agent.
- Typical sequence for a healthy agent: `running` -> `completed`.
- Failed agent: `running` -> `failed`.
- All agent_status events arrive before the first `content_delta`.

### Frontend Rendering Expectations

The frontend renders agent activity based on these events:

1. **On `agent_dispatch`**: Show an activity block with agent badges. Each badge shows the agent icon, label, color, and `taskDescription`. Initial status is `dispatching`.
2. **On `agent_status` (running)**: Update the badge to show a spinning indicator.
3. **On `agent_status` (completed)**: Show green checkmark with `durationMs` formatted as seconds (e.g. "1.2s").
4. **On `agent_status` (failed)**: Show red X with error message. Display retry button.
5. **Content streaming begins**: Only after all dispatched agents have reached `completed` or `failed`.
6. **Retry on failure**: User clicks retry, frontend sends a new message. The backend should re-execute only the failed agent's task.

### Example: Multi-Agent Dispatch

Orchestrator decides to check payments AND generate a report:

```
data: {"type":"agent_dispatch","agents":[{"id":"exec-101","agentType":"cobranza","taskDescription":"Verificando estado de pagos del mes"},{"id":"exec-102","agentType":"reportes","taskDescription":"Generando resumen financiero mensual"}]}

data: {"type":"agent_status","agentId":"exec-101","status":"running"}
data: {"type":"agent_status","agentId":"exec-102","status":"running"}

data: {"type":"agent_status","agentId":"exec-101","status":"completed","durationMs":1100}
data: {"type":"agent_status","agentId":"exec-102","status":"completed","durationMs":2300}

data: {"type":"content_delta","delta":"Aqui tienes el resumen financiero..."}
```

### Example: Agent Failure

One agent fails while another succeeds:

```
data: {"type":"agent_dispatch","agents":[{"id":"exec-201","agentType":"cobranza","taskDescription":"Consultando pagos pendientes"},{"id":"exec-202","agentType":"comunicacion","taskDescription":"Enviando recordatorio a inquilino"}]}

data: {"type":"agent_status","agentId":"exec-201","status":"running"}
data: {"type":"agent_status","agentId":"exec-202","status":"running"}

data: {"type":"agent_status","agentId":"exec-201","status":"completed","durationMs":950}
data: {"type":"agent_status","agentId":"exec-202","status":"failed","error":"Timeout al conectar con API de Twilio"}

data: {"type":"content_delta","delta":"Encontre los pagos pendientes, pero no pude enviar el recordatorio por un error temporal con el servicio de mensajeria. Puedes intentar de nuevo."}
```
