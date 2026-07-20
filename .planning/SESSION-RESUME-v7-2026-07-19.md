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

## Milestone progress: 5/7 phases DONE, v7-06 next

| Phase | Status | Commits (feat + docs) |
|-------|--------|-----------------------|
| **v7-01** Fundación & Limpieza | ✅ DONE (GOAL ACHIEVED, 5/5) | `94361686` `95e809f9` `749b4fe0` `a3169d18` (+ docs `c60c6703` `bf3bf682` `d604da71`) |
| **v7-02** Documentos del Arriendo | ✅ DONE (GOAL ACHIEVED, frontend-first) | `f91439a0` `3c3f2416` `e347ce28` `849987fe` (+ docs `fd70c1d2` `9468a36e`) |
| **v7-03** Estado de Casos (Hub — **fija P1**) | ✅ DONE (GOAL ACHIEVED) | `c0102f8a` `20c3b90f` `d9e90458` `ee785269` `d559e54b` (+ docs `45b89410` `7980701b` `c8f0df23`) |
| **v7-04** Pagos Reales (Wompi) | ✅ DONE (GOAL ACHIEVED, frontend-first, security-verified) | `8f2a6168` `63aff8d9` `f86c9a86` `e1f95bcf` `ffc7ad87` `77067453` `fb9db3b1` (+ docs `a8b314d3` `8d6ad769` `50b62aef`) |
| **v7-05** Comunicación (contact-gate crux) | ✅ DONE (GOAL ACHIEVED, frontend-first, legal-verified) | `d58b9526` `c59aef4b` `8e83d12c` · `63f6d026` `437a50d8` `ae9446d5` · `4b51fed4` `41a44150` `6722195f` (+ docs `d93c8e9c` `12b7a24f` `3a6e32e6`, check `8639e185`, verify `805e4098`) |
| **v7-06** Solicitudes / PQRS | ⬜ **not started — NEXT** (reuse `pqrs.types.ts`, SLA 15 días hábiles) | — |
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

**v7-05 is DONE + verified** (checker PASS-WITH-NITS `8639e185`, 9 feat + 3 docs commits, phase verify
`805e4098` GOAL ACHIEVED; ROADMAP row = 5/7 Complete). Resume at **v7-06 Solicitudes / PQRS**:
1. Recon (parallel): `gsd-pattern-mapper` + `gsd-phase-researcher` → `PATTERNS.md` + `RESEARCH.md`.
2. `gsd-planner` → `NN-PLAN.md`s (**reuse `pqrs.types.ts` — do NOT fork**; `solicitanteTipo:'inquilino'`),
   then `gsd-plan-checker`, apply nits, present for the execution GO, execute **sequentially**, verify by hand.
   - **Legal crux for v7-06:** SLA PQRS = **15 días hábiles** (Ley 1480/2011) computed + visible, never blank;
     interim value labeled "estimado" (`createdAt + 15 días hábiles`, Colombia calendar). Cost-responsibility
     transparency (Ley 820: dueño/inquilino/split); tenant-cost repairs require quote approval before execution.
   - Backend (NestJS/agent PQRS CRUD tenant-scoped) can lag → frontend-first: contract reusing `pqrs.types.ts`
     + honest "Próximamente" where the triage/SLA engine isn't live. Enlaza al hub de v7-03.
3. Then **v7-07 (Acuerdos**, LAST — contract-first, HARD cross-repo dep on `agent` RLS tenant; even the agency
   page is disabled "Próximamente"; acuerdos NEVER auto-approve — T-323/2024 + SIC 001/2025).

**v7-05 shape (shipped):** 01 chat composed into arriendo/caso + lease-scoped contract w/ honest-unavailable
(COMU-01) · 02 real file-picker (send "Próximamente") + archive/mute/report `alert()`→toast + AlertDialog
report confirm (COMU-02) · 03 contact-gate `canContact` default-gated + WhatsApp ruteado "Próximamente" +
static PQRS-SLA hint (COMU-03/04). Verified: 0 outbound senders repo-wide, 0 "por qué la mora", 0 fake presence.

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
git log --oneline -5             # HEAD = 805e4098 (v7-05 verification, 5/7 done)
# resume: plan v7-06 (Solicitudes / PQRS) — recon → planner → checker → execute → verify.
```
