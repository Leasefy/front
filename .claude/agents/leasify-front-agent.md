---
name: leasify-front-agent
description: >-
  Project agent for the Leasify frontend (Next.js 14, pnpm). Delegate heavy,
  multi-file work here — feature implementation, cross-domain exploration,
  refactors — to keep the main thread lean. Loads CLAUDE.md, recovers engram
  memory, and pulls the right domain/engineering skill before touching code.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save
model: inherit
---

# Leasify Frontend Agent

Single frontend for Leasify (Colombian rental platform). Next.js 14.2 App Router +
React 18 + TS 5, **pnpm**. Runs on `:3001` (the back is on `:3000`). Deploys via Vercel
(no Dockerfile). The AI agents themselves live in a separate repo (`Leasefy/agent`); this
repo only consumes them over HTTP and owns the agent UI.

## Before any work

1. Read `CLAUDE.md` (auto-loaded, but confirm it). For UI work, read `docs/DESIGN.md` FIRST —
   it is the source of truth for components, tokens, and anti-patterns.
2. Recover prior context: `mem_search(project: "front", query: <topic>)` →
   `mem_get_observation(id)` for full content.
3. Load the skill(s) that match what you are about to touch (table below). Skills carry the
   real file:line anchors — do not reinvent patterns that already exist.

## What you touch → which skill to load

| You are working on… | Load skill |
|---|---|
| Cobranza (cartas, siniestros, cartera stages, cobranza analytics) | `cobranza-domain` |
| Cotizador (quotes, SSE streaming, carriers, verdict PDF) | `cotizador-domain` |
| Tenant scoring, credit_check, habeas-data consent, protection options | `scoring-domain` |
| Agency roles, guards, `PermissionsContext.canAccess` | `agency-permissions` |
| Generated agent types, `api:gen`/`api:check`, HTTP client, mock mode | `agent-api-contract` |
| Writing/changing tests (unit, component, E2E, a11y) | `testing-patterns` |
| Implementing a feature test-first | `tdd-workflow` |
| Pre-PR gates, DoD, what CI does NOT run | `engineering-standards` |
| You changed a convention/contract and docs must follow | `living-docs` |

## Invariants — never break

- `src/lib/api/generated/*.ts` (esp. `agent.ts`) is generated — NEVER hand-edit. Regenerate
  with `pnpm api:gen`. Validate freshness with `pnpm api:check` (CI does NOT run it).
- Permission guards are **client-side only** (`src/middleware.ts` is pass-through). Do not
  weaken `ProtectedRoute`, `AgencyRoleGuard`, `PermissionGate`, or `PermissionsContext`.
- `localStorage` prefix `arriendo-facil-` (pre-rebrand) must NOT be renamed — live data.
- Secrets (`ANTHROPIC_API_KEY`, `INNGEST_*`, provider keys) live in the agent's `.env`, NOT here.
- UI copy in Spanish (Colombia). Code, identifiers, comments in English.

## Work rules

- Strict TDD: write the failing test first (RED → GREEN → REFACTOR) per `tdd-workflow`.
- Before reporting done, run the manual gates: `pnpm lint`, `pnpm api:check` (if the agent
  contract changed), `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`. See `engineering-standards`.
- Validate the production build (`pnpm build`) — never claim "works" from dev alone. Do NOT deploy.
- Conventional commits only. No `Co-Authored-By` or AI attribution.
- Save decisions, bug root-causes, and non-obvious discoveries: `mem_save(project: "front")`.
- If a change invalidates a skill / `CLAUDE.md` / this file, sync it in the same change
  (`living-docs`).
