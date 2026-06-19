---
name: tdd-workflow
description: TDD RED-GREEN-REFACTOR cycle, strict TDD, vitest, test-first, failing test, commit cadence
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# tdd-workflow

Strict TDD is **enabled** for this project. Every production change starts with a failing test.

## Activation Contract

Trigger on: writing new features, fixing bugs, adding API service methods, building UI components that have logic. Do not trigger on pure markup/styling-only changes.

## Hard Rules

1. **RED first** — write the test, run `pnpm test`, confirm it fails for the right reason before touching production code.
2. **GREEN minimum** — write the least code that makes it pass. No extras.
3. **REFACTOR** — clean up, extract, rename. Tests must still be green before committing.
4. **One behavior per commit** — commit after each RED→GREEN cycle using conventional commits. No `Co-Authored-By` or AI attribution.
5. **Never skip RED** — if a test passes before any production code exists, the test is wrong.

## Commands

```bash
# Run all unit tests once (CI gate)
pnpm test                # vitest run

# Watch mode for TDD loop
pnpm test:watch          # vitest

# Run a single test file during RED→GREEN
pnpm test:watch -- src/lib/__tests__/format.test.ts

# Type check (no script alias — run directly)
pnpm exec tsc --noEmit
```

> No `typecheck` script exists. Always use `pnpm exec tsc --noEmit`.
> Coverage is v8 scoped to `src/lib/**`. Run: `pnpm test -- --coverage`.

## Decision Gates

- **Before committing GREEN**: run `pnpm exec tsc --noEmit` and confirm zero errors.
- **Before REFACTOR commits**: run `pnpm test` to confirm nothing regressed.
- See [[engineering-standards]] for the full pre-PR gate checklist.

## Execution Steps

1. Identify the unit of behavior to add/fix.
2. Write test in `src/**/*.test.ts(x)` matching the file under test (same directory or `__tests__/`).
3. Run `pnpm test:watch` — confirm RED with the right failure message.
4. Write minimum production code.
5. Confirm GREEN in the watch output.
6. Commit: `feat(scope): add X` or `fix(scope): Y`.
7. REFACTOR if needed → confirm GREEN → commit separately if meaningful.

## Test File Placement

- Pure logic / utils: `src/lib/__tests__/` or co-located `*.test.ts`.
- Service layer: `src/lib/api/__tests__/*.service.test.ts`.
- Components: co-located `ComponentName.test.tsx` or inside `__tests__/`.
- Pages: co-located `page.test.tsx` inside the route directory.

## References

- [[testing-patterns]] — skeleton patterns for each test type.
- [[engineering-standards]] — Definition of Done and pre-PR gates.
- vitest config: `vitest.config.ts` (environment: happy-dom, globals: true).
