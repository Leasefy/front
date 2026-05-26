# OpenAPI Codegen Runbook

Generated TypeScript types for the Leasefy Agent API (v0.1.2).
Source: `~/rent/agent` — Hono backend with `@hono/zod-openapi`.

## Quick start

```bash
# From ~/rent/mvp/
pnpm api:gen
```

That's it. The script tries the live agent dev server first, falls back to
the committed snapshot if the server is offline.

## Prerequisites

- Node >= 20, pnpm installed
- (Optional, for freshest types) Agent dev server running:
  ```bash
  cd ~/rent/agent && pnpm dev   # starts on http://localhost:4000
  ```

## What gets generated

| File | Description |
|------|-------------|
| `src/lib/api/generated/agent.ts` | Full type map from the OpenAPI spec. AUTO-GENERATED — do not hand-edit. |
| `src/lib/api/generated/cotizador.ts` | Thin re-export for cotizador domain. Hand-authored — safe to extend. |
| `src/lib/api/generated/cartera.ts` | Thin re-export for cartera/cobranza domain. Hand-authored — safe to extend. |
| `src/lib/api/generated/agency.ts` | Thin re-export for agency/permissions domain. Hand-authored — safe to extend. |
| `src/lib/api/generated/index.ts` | Barrel. Imports from all three domain files. |
| `scripts/openapi-snapshot.json` | Latest committed snapshot of the agent spec. Used as fallback by `api:gen`. |

## When to re-run

Re-run `pnpm api:gen` whenever:
- The agent's OpenAPI spec version bumps (grep for `SPEC_VERSION` in `~/rent/agent/src/server/openapi.ts`)
- A new endpoint is added to the agent and you need its types in mvp
- After Phase 29-06 ships the cartera-overview endpoint (uncomment the alias in `cartera.ts`)
- After Plan 29-02 ships the updated permissions response (uncomment alias in `agency.ts`)

Commit both `generated/agent.ts` and `scripts/openapi-snapshot.json` after every re-run.

## Conflict resolution

If `git diff src/lib/api/generated/agent.ts` shows unexpected changes after a re-run:
1. Verify the agent server version: `curl http://localhost:4000/openapi.json | jq .info.version`
2. If version changed intentionally: update types, review downstream imports for breakage,
   fix type errors, commit.
3. If version is the same but output changed: the spec may have been mutated without a
   version bump. Escalate to the agent maintainer.

## Drift detection (optional CI gate)

```bash
pnpm api:check
```

Runs `api:gen` then checks `git diff`. Fails if generated types are stale.
Wire this into CI as a pre-merge check (not set up in Phase 29 — follow-up).

## Architecture notes

- Tool: `openapi-typescript` (devDependency) — chosen over `@openapi-generator-cli`
  because it has no Java runtime dependency, generates pure TypeScript types (no axios
  runtime), and supports OpenAPI 3.1.0 natively.
- The agent's spec endpoint is PUBLIC (no auth required, per D-06) — `api:gen`
  does not need a JWT token.
- Generated types follow the `paths["/path"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]`
  pattern from openapi-typescript. Use with typed fetch wrappers, not the raw `paths` type directly.

## i18n note (XR-05)

Generated types are schema types only — they contain no display strings.
All UI strings for cobranza/cotizador must use the `inmobiliaria.ai.*` i18n namespace
in `es.json` and `en.json`, not values from generated types.

---
*Last updated: Phase 29-01 (2026-05-26)*
