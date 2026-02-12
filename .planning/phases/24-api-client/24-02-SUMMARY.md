---
phase: 24-api-client
plan: "02"
title: "SSE streaming client + mock API layer with agent simulation"
subsystem: lib
tags: [sse, streaming, mock-api, agent-simulation, async-generator, beta]
depends_on:
  - plan: 24-01
    provides: "API types, client module, environment config"
  - plan: 18-01
    provides: "useBetaChat hook with inline mock data"
  - plan: 20-02
    provides: "Agent execution simulation in useBetaChat"
provides:
  - "SSE parser (parseSSEStream) for real-time chat event consumption"
  - "connectChatStream fetch helper for SSE endpoint connection"
  - "mockChatStream AsyncGenerator simulating orchestrator event flow"
  - "mockApi object with all CRUD endpoint implementations"
  - "Dual-path routing in LeasefyAIClient (mock vs real)"
affects: [24-03]
tech-stack:
  added: []
  patterns:
    - "AsyncGenerator for SSE streaming (yield* delegation)"
    - "isMockMode() dual-path routing in client methods"
    - "DailyBriefing to ApiBriefing shape conversion"
key-files:
  created:
    - src/lib/api/streaming.ts
    - src/lib/api/mock.ts
  modified:
    - src/lib/api/client.ts
    - src/lib/api/index.ts
decisions:
  - id: "24-02-01"
    description: "reader.releaseLock() in finally block for SSE parser cleanup"
  - id: "24-02-02"
    description: "mockApi returns static data; hooks manage their own localStorage persistence"
  - id: "24-02-03"
    description: "toApiBriefing helper converts DailyBriefing Date to ISO string for API shape"
  - id: "24-02-04"
    description: "Private fetch() helper on client for JSON endpoints with auth headers"
metrics:
  duration: "3min"
  completed: "2026-02-10"
  tasks: 4
  commits: 4
  ts-errors: 0
---

# Phase 24 Plan 02: SSE Streaming Client + Mock API Layer Summary

SSE parser with buffer-aware partial chunk handling, mock API layer simulating full orchestrator event flow (message_start through message_complete), and dual-path LeasefyAIClient routing via isMockMode().

## What Was Built

### Task 1: SSE Streaming Utilities (`streaming.ts`)
- `parseSSEStream(response)` — AsyncGenerator reading Response body, buffering partial chunks, yielding `ChatStreamEvent` objects
- Handles `[DONE]` sentinel, SSE comments (`:` prefix), malformed JSON (silent skip)
- `reader.releaseLock()` in finally block for proper cleanup
- `connectChatStream(baseUrl, request, token?)` — POST fetch with Accept: text/event-stream, error handling for non-OK responses

### Task 2: Mock API Layer (`mock.ts`)
- `mockChatStream(request)` — AsyncGenerator emitting events in orchestrator order:
  1. `message_start` (with generated conversationId/messageId)
  2. `agent_dispatch` (if keyword-matched via getMockAgentScenario)
  3. `agent_status` per agent (with staggered durationMs delays)
  4. `content_delta` (3-char chunks at 25ms intervals = ~120 chars/sec)
  5. `decision` (if keyword-matched via getMockDecisionScenario)
  6. `message_complete` (with token usage estimate)
- `mockApi` object with all CRUD endpoints:
  - Conversations: list (3 static), get, create, delete
  - Decisions: list (3 from getMockDecisionScenario), select
  - Briefings: list (getMockBriefings), latest (getTodayBriefing)
  - Preferences: get (DEFAULT_PREFERENCES), update (deep merge)
- All mock data delegates to existing data files (zero duplication)

### Task 3: Client Wiring (`client.ts`)
- Every method now checks `isMockMode()` and routes to mock or real path
- `sendMessage` uses `yield*` delegation to mockChatStream or parseSSEStream
- Added private `fetch()` helper with auth headers and error handling
- Removed all stub throw errors

### Task 4: Barrel Export (`index.ts`)
- Added exports for `parseSSEStream`, `connectChatStream`, `mockChatStream`, `mockApi`

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 0a4dd6d | SSE streaming parser and connection utilities |
| 2 | de3b773 | Mock API layer with chat stream and CRUD endpoints |
| 3 | aff67c2 | Wire LeasefyAIClient to mock/real dual-path routing |
| 4 | 591b9b1 | Add streaming and mock module exports to barrel |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **reader.releaseLock() in finally** — Ensures SSE ReadableStream reader is properly released even on early termination or errors
2. **mockApi returns static data, hooks own persistence** — Mock CRUD endpoints return realistic static data; the hooks (useBetaChat, useDecisions, etc.) continue managing their own localStorage. This avoids coupling mock endpoints to client-side storage
3. **toApiBriefing conversion** — DailyBriefing uses Date objects, ApiBriefing uses ISO strings. Helper function bridges the shape difference
4. **Private fetch() helper** — Centralized JSON fetch with auth headers on LeasefyAIClient, reducing repetition across 10 endpoint methods

## Next Phase Readiness

Plan 24-03 (Backend Documentation) can proceed. The complete API surface is now implemented:
- Streaming: parseSSEStream + connectChatStream
- Mock: mockChatStream + mockApi (all endpoints)
- Client: LeasefyAIClient with dual-path routing
- Exports: Everything accessible from @/lib/api
