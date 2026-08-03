---
name: living-docs
description: update CLAUDE.md, skill sync, ADR, subagent context, convention change, doc drift, living documentation
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

# living-docs

When and how to keep CLAUDE.md, skills, and ADRs in sync **in the same PR as the code change**.

## Activation Contract

Trigger when: establishing a new convention, changing an architecture decision, adding a new command/script, changing a guard or security boundary, creating a new domain module, or renaming a key path. Documentation drift is a bug.

## Hard Rules

1. **Same PR rule** — doc updates ship in the same PR as the code they describe. No "follow-up" doc tasks.
2. **CLAUDE.md is the entry point** — it links to domain docs. Update it when adding a new route namespace, service contract, or architectural decision.
3. **Skills are LLM-context** — they describe what's true NOW, not aspirationally. Do not add "will be" language.
4. **Engram is the session layer** — save non-obvious discoveries and decisions to engram (`mem_save` with `project: 'front'`) so subagent sessions start with context.
5. **ADRs are for irreversible decisions** — decisions that would take >1 day to reverse deserve an ADR. Minor conventions go in CLAUDE.md directly.

## What to Update and When

| Change type | Update |
|-------------|--------|
| New `pnpm` script added to `package.json` | `CLAUDE.md` (Commands section) + `engineering-standards` skill if it's a gate |
| New auth guard or permission check | `CLAUDE.md` (Auth section) + `engineering-standards` (security guards table) |
| New API service file (`src/lib/api/*.service.ts`) | `CLAUDE.md` (Contratos consumidos) |
| New route namespace (`/panel/new-area/*`) | `CLAUDE.md` (Rutas section) |
| New test helper in `tests/e2e/**/_helpers/` | `testing-patterns` skill (section 4 or 5) |
| New domain hook pattern established | `CLAUDE.md` (Convenciones) + relevant domain skill |
| Architecture decision (e.g. state management choice) | `CLAUDE.md` (Decisiones tomadas table) + ADR file |
| Agent API contract changes (`src/lib/api/generated/agent.ts`) | `CLAUDE.md` (Contratos) — note that `pnpm api:gen` regenerates; never hand-edit |
| New testing convention (new mock pattern, new helper) | `testing-patterns` skill |
| TDD or pre-PR gate changes | `tdd-workflow` + `engineering-standards` skills |

## How to Update CLAUDE.md

`CLAUDE.md` at `C:\Users\victo\Proyectos\Leasify\front\CLAUDE.md` is the project source of truth.

Sections to keep current:
- **Comandos** — every `pnpm` script in `package.json` should appear here if subagents need it.
- **Decisiones tomadas** — append rows; never delete old decisions (add a "superseded by" note instead).
- **Auth y permisos** — list every guard and context component.
- **Contratos consumidos** — backend URL, agent URL, generation command.
- **Convenciones** — naming, language, a11y, localStorage prefix.

## How to Update Skills

Skills live at `.claude/skills/<name>/SKILL.md`.

Update a skill when:
- A command in its `Commands` section changes (verify against `package.json`).
- A new canonical pattern replaces an old one.
- A guard it references is renamed or moved.

Never add aspirational language. If a thing doesn't exist yet, don't document it.

## Subagent Context Protocol

Before delegating a task to a subagent, search engram for existing context:

```
mem_search(query: "front <topic>", project: "front")
```

If found, pass the relevant observation content in the subagent prompt — subagents start with no memory.

After completing significant work, save to engram:

```
mem_save(
  title: "verb + what",
  type: "decision|pattern|bugfix|discovery",
  project: "front",
  topic_key: "optional/stable/key",
  content: "**What**: ...\n**Why**: ...\n**Where**: ...\n**Learned**: ..."
)
```

## ADR Format (when needed)

Create `docs/adr/NNNN-title.md`:

```markdown
# ADR-NNNN: Short Title

**Date**: YYYY-MM-DD
**Status**: Accepted

## Context
[What problem prompted this decision]

## Decision
[What was decided]

## Consequences
[What becomes easier / harder as a result]
```

## References

- `CLAUDE.md` — `C:\Users\victo\Proyectos\Leasify\front\CLAUDE.md` — master context file.
- `.claude/skills/` — all skill files for this project.
- [[engineering-standards]] — DoD checklist that includes doc updates.
- [[tdd-workflow]] — when commits happen (doc commits follow code commits in same PR).
