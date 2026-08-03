---
name: engineering-standards
description: definition of done, pre-PR checklist, manual gates, CI gaps, security guards, DoD, quality gate
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# engineering-standards

Definition of Done and the gates to run **manually** before every PR — because CI does not run all of them.

## Activation Contract

Trigger before creating any PR, before marking any task done, and when asked about quality gates, DoD, or "what to check before merging."

## CI vs. Manual Gates

### What CI runs automatically (every push + PR)

Job `test` on `.github/workflows/ci.yml`:
```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit   # type check
pnpm test                # vitest run (unit tests, happy-dom)
```

Job `e2e`: **workflow_dispatch only**, `continue-on-error: true`. Does NOT block merges.

### Gates CI does NOT run — you MUST run these manually before PR

```bash
# 1. ESLint (not in CI)
pnpm lint

# 2. Generated agent types freshness (not in CI)
pnpm api:check
# Fails with: "Generated types are stale. Run pnpm api:gen and commit."

# 3. Type check (redundant if you run this manually, but fast)
pnpm exec tsc --noEmit

# 4. Unit tests
pnpm test

# 5. Production build (catches Next.js build errors not caught by tsc)
pnpm build
```

Run them in this order. A build failure blocks everything else.

## Definition of Done

A change is done when ALL of the following are true:

- [ ] Tests written first (RED before GREEN) per [[tdd-workflow]].
- [ ] `pnpm test` passes — zero failures, zero skipped without documented reason.
- [ ] `pnpm exec tsc --noEmit` — zero errors.
- [ ] `pnpm lint` — zero errors (warnings acceptable if pre-existing).
- [ ] `pnpm api:check` — passes if the agent contract was touched; otherwise verify `src/lib/api/generated/agent.ts` is unchanged.
- [ ] `pnpm build` — clean production build, zero Next.js errors.
- [ ] No security guards weakened (see below).
- [ ] `CLAUDE.md` / skill / ADR updated if a new convention was established (see [[living-docs]]).

## Security Guards — Never Weaken

These must not be disabled, bypassed, or reduced in scope:

| Guard | Location | What it does |
|-------|----------|-------------|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.tsx` | Client-side auth gate for all panel routes |
| `AgencyRoleGuard` | `src/components/auth/AgencyRoleGuard.tsx` | Blocks non-agency roles from agency panels |
| `PermissionGate` | `src/components/auth/PermissionGate.tsx` | Granular module/action permission check |
| `PermissionsContext.canAccess` | `src/lib/context/PermissionsContext.tsx` | Loads permissions from backend + agent; gates every feature |
| Security headers | `next.config.mjs` | CSP, X-Frame-Options, HSTS etc. |

If a PR modifies any of these files, the PR description must explain why and what was validated.

## Conventions

- Package manager: **pnpm** exclusively. No `npm install` or `yarn`.
- No `typecheck` script — use `pnpm exec tsc --noEmit` directly.
- `postinstall` runs `prisma generate` — expected on fresh installs.
- `localStorage` legacy prefix `arriendo-facil-` must NOT be renamed (pre-rebrand, live data).
- UI copy in Spanish (Colombia). Code and identifiers in English.
- Conventional commits only. No `Co-Authored-By` or AI attribution.

## When to Run E2E

E2E (`npx playwright test`) is NOT part of the standard pre-PR gate because:
- No `webServer` entry — requires a running dev server at `:3001`.
- Panel specs require seeded auth state (`seedAuthState` helper).
- Agent backend is not required for cobranza/cotizador specs (mocked via `route.fulfill`).

Run E2E locally when: touching navigation, auth flow, Playwright spec files, or the a11y panel suite.

```bash
# Requires: pnpm dev running in another terminal
npx playwright test                          # all projects
npx playwright test --project=panel-a11y    # a11y suite only
npx playwright test tests/e2e/cobranza-overview.spec.ts  # single file
```

## References

- [[tdd-workflow]] — RED→GREEN cycle.
- [[testing-patterns]] — test skeletons.
- [[living-docs]] — when to update CLAUDE.md / skills / ADRs.
- `src/components/auth/` — all auth guard implementations.
- `.github/workflows/ci.yml` — authoritative CI definition.
