# SESSION RESUME — v7.0 Portal del Inquilino (2026-07-16 → 2026-07-19)

**Read this first to resume the milestone.** Everything below is committed on branch
`plan/v7.0-portal-inquilino`, **local, not pushed** (Victor integrates via the tren de versiones).

---

## Where the work lives (isolation)

```
~/rent/
  ├── mvp/                      ← feat/leasefy-ds-redesign (base; the SESSION's cwd). main lives here, UNTOUCHED (e5e0f825).
  └── mvp-portal-inquilino/     ← git worktree, branch plan/v7.0-portal-inquilino  ← ALL v7 work is here
```

- The whole session was **orchestrated from `~/rent/mvp`** (redesign) by spawning GSD agents that
  target the worktree via absolute paths + `cd`. To resume you can either keep doing that, OR
  **open Claude in `~/rent/mvp-portal-inquilino`** and run the GSD commands natively there.
- **main is never touched.** Nothing is pushed. Freeze/tag/PR is Victor's call.

## Milestone progress: 4/7 phases DONE, v7-05 planned

| Phase | Status | Commits (feat + docs) |
|-------|--------|-----------------------|
| **v7-01** Fundación & Limpieza | ✅ DONE (GOAL ACHIEVED, 5/5) | `94361686` `95e809f9` `749b4fe0` `a3169d18` (+ docs `c60c6703` `bf3bf682` `d604da71`) |
| **v7-02** Documentos del Arriendo | ✅ DONE (GOAL ACHIEVED, frontend-first) | `f91439a0` `3c3f2416` `e347ce28` `849987fe` (+ docs `fd70c1d2` `9468a36e`) |
| **v7-03** Estado de Casos (Hub — **fija P1**) | ✅ DONE (GOAL ACHIEVED) | `c0102f8a` `20c3b90f` `d9e90458` `ee785269` `d559e54b` (+ docs `45b89410` `7980701b` `c8f0df23`) |
| **v7-04** Pagos Reales (Wompi) | ✅ DONE (GOAL ACHIEVED, frontend-first, security-verified) | `8f2a6168` `63aff8d9` `f86c9a86` `e1f95bcf` `ffc7ad87` `77067453` `fb9db3b1` (+ docs `a8b314d3` `8d6ad769` `50b62aef`) |
| **v7-05** Comunicación | 🟡 **PLANNED + committed, NOT executed** | planning `21d091c4` (3 plans) — **pending checker → execute** |
| **v7-06** Solicitudes / PQRS | ⬜ not started | — |
| **v7-07** Acuerdos de Pago (LAST) | ⬜ not started (hard cross-repo dep on `agent`) | — |

Each done phase has `.planning/phases/<phase>/…-VERIFICATION.md` (verdict), the `NN-PLAN.md`s, and
`NN-SUMMARY.md`s. Build green on every phase; `pnpm test` = 601/608 (**7 PRE-EXISTING** unrelated
failures documented in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md`; **0 new**).

## The GSD workflow used each phase (repeat for v7-05/06/07)

1. **Recon** (parallel): `gsd-pattern-mapper` + `gsd-phase-researcher` → `PATTERNS.md` + `RESEARCH.md`.
2. **Plan**: `gsd-planner` → `NN-PLAN.md`s + updates ROADMAP Progress/Plans.
3. **Check**: `gsd-plan-checker` → `PLAN-CHECK.md` (PASS / PASS-WITH-NITS / BLOCK). Apply nits to the plans.
4. **Commit planning** (`docs(v7-NN): planificación …`).
5. **Present to Nico for the execution GO** (execution touches code → explicit OK).
6. **Execute SEQUENTIALLY** (one `gsd-executor` at a time — the shared worktree races on git
   index + `.next` if run in parallel; [[feedback-shared-worktree-concurrency]]).
7. **Verify each plan** independently (git stat + gates + build) — the `gsd-verifier` agent has been
   unreliable all session, so **do the goal-backward verification by hand**, then write `VERIFICATION.md`.
8. Mark the ROADMAP phase complete (checkbox + Progress row) + commit.

## NEXT STEP (resume here)

**v7-05 Comunicación** is planned + committed (`21d091c4`) but the **plan-checker has NOT run**
(the env broke right after planning — see gotcha below). Resume:
1. Run `gsd-plan-checker` on `.planning/phases/v7-05-comunicacion/v7-05-0{1,2,3}-PLAN.md`
   (focus: contact-gate legal crux — no outbound sender, no "por qué la mora" field, no fake
   online/typing presence; honest "Próximamente" for lease-scoped thread + attachment send +
   archive/report; deep-link goes to the inbox, NOT a fabricated `?applicationId=`).
   NOTE: the planner could NOT self-validate frontmatter (Bash was down) — have the checker confirm it.
2. Apply nits, present, then execute the 3 plans **sequentially** (all touch the shared
   `MessagesWidget.tsx`; strict waves 1→2→3).

**v7-05 plan shape:** 01 compose chat into arriendo/caso + lease-scoped contract (COMU-01) ·
02 attachments + conversation actions, `alert()`→toast (COMU-02) · 03 contact-gate `canContact`
default-gated + expected-response window PQRS SLA (COMU-03 + PITFALLS UX).

Then plan+execute **v7-06 (PQRS**, reuse `pqrs.types.ts`, SLA 15 días hábiles) and **v7-07 (Acuerdos**,
contract-first — hard cross-repo dep on `agent` RLS tenant; even the agency page is disabled "Próximamente").

## "Próximamente" boundaries accepted so far (backend-gated, NOT faked)

- v7-02: paz y salvo + cert. retención 3.5% (backend auto-gen); full IDOR closure needs backend-signed `/documents`.
- v7-03: PQRS/mantenimiento (v7-06) + acuerdos (v7-07); push/WhatsApp proactive.
- v7-04: productive Wompi gateway + rent reconciliation webhook; receipt PDF; tokenized autopago.
- v7-05 (planned): lease-scoped `messages.service`; attachment send; archive/report methods; proactive WhatsApp/reminders (agent contact-ledger).

## Gotchas / lessons (don't relearn these)

1. **ENV BREAKAGE (2026-07-19 date boundary):** a `claude-code` auto-update (symlink recreated
   `Jul 19 01:10`) left the **native binary uninstalled** → every `$(...)` subshell emitted
   `Error: claude native binary not installed` and returned empty, breaking grep-gates/builds.
   **Fix that worked:** `node /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/install.cjs`
   then re-test a `$(...)` substitution. Direct commands (git commit, plain grep) kept working throughout.
2. **DESIGN.md §4 reversed the button rule** → buttons are now **sentence case** (pill), NOT uppercase.
   Old uppercase memory was stale (corrected). Re-read DESIGN.md §4 before styling any CTA.
3. **CI build gap** ([[project-mvp-ci-build-gap]]): repo CI runs only tsc+vitest, NOT `next build`.
   Always `pnpm -C <worktree> build` before calling a frontend change done.
4. **Agent flakiness** (transient API/stream errors) hit ~4 agents this session (executor v7-01-01
   stalled after commit; v7-03-03 stalled early; `gsd-verifier` died twice). Recovery pattern:
   verify committed state + gates + build by hand, reconstruct any missing SUMMARY, re-launch cleanly.
5. **Sequential execution** for the shared worktree (git index + `.next` race in parallel).
6. Disk was tight (~22G) — executors clear regenerable `.next` on ENOSPC (never source).

## How to open the worktree

```bash
cd ~/rent/mvp-portal-inquilino   # branch plan/v7.0-portal-inquilino
git log --oneline -5             # HEAD = 21d091c4 (v7-05 planning)
# resume: gsd-plan-checker on v7-05, then execute.
```
