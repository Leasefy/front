# Cadence adoption — REMAINING 2 areas (scout, 2026-06-30)

State: ~10/13 mvp areas DONE (admin · avaluo · mvp property+inmobiliaria+ai/cobranza+marketing+tenant/inquilino+landlord+flows). tree `tsc --noEmit` = 0. Per-area gate+idioms+allowlist in `cadence/CADENCE-ADOPTION-PLAYBOOK.md`; per-area ledgers in `mvp/.cadence-migration/*-PROGRESS.md`.

These last 2 are NOT a simple native→adapter sweep — they're a **rebuild on real Cadence chat/sidebar components**. Nico's mandate carries: real Cadence component, full API, "no se te puede quedar uno por fuera"; do NOT touch the `papas` project; prefer hand-mode (a delegated fork already failed once with 0 edits — verify any agent actually edits).

## Cadence components available (real, in `cadence/src/components/ui/`)
- `sidebar.tsx` → `Sidebar` / `SidebarItem` (+ stories)
- `composer.tsx` → `Composer` (chat input)
- `chat-thread.tsx` → `ChatThread`
- `message-bubble.tsx` → `MessageBubble`
- `suggested-followups.tsx` → `SuggestedFollowups`
- `artifact-panel.tsx` → `ArtifactPanel`
NOTE: mvp has NO local adapter for these yet (`src/components/ui/` has none) — beta/ is fully bespoke. Decide per-component: import the DS component directly from `@leasefy/cadence`, or add a thin `src/components/ui/<x>.tsx` adapter (consistent with button/input/etc.) if the mvp needs prop-shimming. Confirm exact export names by reading each `.tsx` (stories grep returned Playground/Showcase only).

## Area 11 — BetaSidebar → real `Sidebar`/`SidebarItem`
Files:
- `src/components/beta/BetaSidebar.tsx`  ← the 4th hand-rolled sidebar (rebuild on Cadence `Sidebar`/`SidebarItem`)
- `src/components/beta/BetaLayout.tsx`   ← shell that renders BetaSidebar
- `src/components/beta/MobileSidebarDrawer.tsx`  ← mobile variant
Consumers/route: `src/app/panel/(landlord)/beta/`, `src/app/panel/inmobiliaria/beta/`, `src/app/panel/beta/` (layout+page each).
Approach: map BetaSidebar's nav items → `SidebarItem`; preserve `useBetaChatContext` wiring (active conversation, app switcher). Keep collapse/mobile-drawer behavior.

## Area 12 — Inicio chat (HOY→Inicio) — rebuild AI chat on Cadence chat components
Route to RENAME: `src/app/panel/inmobiliaria/hoy/page.tsx`  (HOY → "Inicio"; update nav labels/links that point to /hoy).
Bespoke chat components in `src/components/beta/` to rebuild/retire onto Cadence:
- `ChatContainer.tsx` + `ChatInput.tsx` → `ChatThread` + `Composer`
- `AssistantBubble.tsx` / `UserBubble.tsx` → `MessageBubble`
- `WorkspaceView.tsx` / `ResponseCard.tsx` / `AgentResultCard.tsx` / `DecisionCard.tsx` → `ArtifactPanel`
- followup chips → `SuggestedFollowups`
- supporting: ConversationList, TypingIndicator, AgentActivity*, Briefing*, AgentBadge, MarkdownRenderer, etc.
MUST preserve ALL existing chat behavior + the `useBetaChatContext` API (`src/lib/context/BetaChatContext.tsx`; consumed by ~13 beta files — list via `grep -rln useBetaChatContext src`). This is the biggest/riskiest area — do it last, incrementally, tsc=0 each step.

## Then
Full mvp `pnpm build` (env-dependent — Nico runs it). Per the repo "tren de versiones": each change = PR + `.planning/releases/vN.md` row (Nico/Victor cut the tag).
