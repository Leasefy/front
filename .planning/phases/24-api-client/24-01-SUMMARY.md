---
phase: 24-api-client
plan: 01
title: "API client module + TypeScript types + environment switching"
subsystem: lib
tags: [api-client, types, environment, mock, beta, typescript]
depends_on:
  - plan: 18-01
    provides: "useBetaChat hook with mock response flow"
  - plan: 20-02
    provides: "Agent execution simulation patterns"
  - plan: 21-01
    provides: "Decision scenario mock data"
  - plan: 22-01
    provides: "Briefing mock data"
  - plan: 23-01
    provides: "Preferences types and state"
provides:
  - "Typed API client module with all endpoint definitions"
  - "TypeScript request/response types for all AI endpoints"
  - "Environment flag switching between mock and real API"
affects: [24-02, 24-03]
tech-stack:
  added: []
  patterns:
    - "Singleton class-based API client with async methods"
    - "AsyncGenerator for SSE streaming return type"
    - "Environment-driven mock/real mode switching"
key-files:
  created:
    - src/lib/api/types.ts
    - src/lib/api/config.ts
    - src/lib/api/client.ts
    - src/lib/api/index.ts
  modified:
    - .env.example
decisions:
  - "AsyncGenerator<ChatStreamEvent> for sendMessage (not EventSource) — more idiomatic for async iteration"
  - "Underscore-prefixed params (_req, _id) for stub methods to suppress unused variable warnings"
  - "Config committed before client since client depends on config import"
metrics:
  duration: "2min 23s"
  completed: "2026-02-10"
---

# Phase 24 Plan 01: API Client Module + TypeScript Types + Environment Switching Summary

Typed API client with all AI orchestrator endpoint definitions, environment-based mock/real switching, and barrel exports for clean imports.

## What Was Built

### Task 1: API Request/Response Types (`types.ts`)
- `ChatStreamEvent` discriminated union covering 7 SSE event types (message_start, content_delta, agent_dispatch, agent_status, decision, message_complete, error)
- `AgentDispatchEvent` for orchestrator agent notifications
- Conversation types: `ConversationsListResponse`, `ApiConversation`, `ConversationDetailResponse`, `ApiMessage`, `CreateConversationResponse`
- Decision types: `DecisionsListResponse`, `ApiDecisionEntry`, `SelectDecisionRequest`, `SelectDecisionResponse`
- Briefing types: `BriefingsListResponse`, `ApiBriefing`, `LatestBriefingResponse`
- Preferences types: aliases to `BetaPreferences` for request/response consistency
- All shared domain types imported from `@/lib/types/beta-chat` (zero duplication)

### Task 2: LeasefyAIClient (`client.ts`)
- Class-based client with singleton `aiClient` export
- `sendMessage()` returns `AsyncGenerator<ChatStreamEvent>` for SSE streaming
- 10 endpoint methods: listConversations, getConversation, createConversation, deleteConversation, listDecisions, selectDecision, listBriefings, getLatestBriefing, getPreferences, updatePreferences
- All methods throw descriptive errors pointing to mock API (Plan 24-02)
- Auth header placeholder for future Clerk session integration

### Task 3: Environment Configuration (`config.ts`)
- `getApiConfig()` reads 3 environment variables (USE_MOCK_API, AI_API_URL, MOCK_DELAY_MS)
- `isMockMode()` convenience helper for conditional routing
- Defaults to mock mode when `NEXT_PUBLIC_USE_MOCK_API` is unset or anything other than "false"
- Updated `.env.example` with AI API configuration section

### Task 4: Barrel Export (`index.ts`)
- Single import path: `import { aiClient, isMockMode, type ChatStreamEvent } from '@/lib/api'`
- Re-exports all types, config, and client

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 883fc6e | API request/response types |
| 2 | 05186b3 | Environment config + .env.example |
| 3 | a9c6821 | LeasefyAIClient class |
| 4 | 1e5d681 | Barrel export |

## Verification

- `npx tsc --noEmit` passes with zero errors after each task
- All types correctly import from `@/lib/types/beta-chat`
- No circular imports in the module graph
- No changes to existing files (additive only, except .env.example)

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Plan 24-02 (streaming + mock layer) can now:
- Import `aiClient` and `isMockMode()` from `@/lib/api`
- Use `ChatStreamEvent` type to implement mock SSE streaming
- Wire mock implementations into the client methods
- Use `getApiConfig().mockDelayMs` for configurable response timing
