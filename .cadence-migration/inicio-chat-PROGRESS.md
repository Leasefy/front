# Inicio-chat (beta/) area (Area 12) — Cadence adoption ✅ COMPLETE (2026-06-30, opus by hand)

Scope = the AI chat universe `src/components/beta/*` (30 tsx, 20 had native elements) + the
`useBetaChatContext` wiring (preserved untouched). All at allowlist floor + **tsc=0**.

SCOPE NOTE: the route `app/panel/inmobiliaria/hoy/page.tsx` is NOT the chat — it's a "Tu
sistema" dashboard (CRM/ERP/Ops link blocks + InsightsPanel), no chat components. The
**HOY→Inicio RENAME is a product-naming change (nav labels/links), not a Cadence-component
task** — deferred/flagged separately, out of this component-adoption pass.

APPROACH: same as the prior 11 areas — convert native INTERACTIVE elements
(`<button>`/`<input>`/`<textarea>`) → Cadence adapters; adopt real DS chat/segmented
primitives where the fit is clean & behavior-preserving; allowlist bespoke chat orchestration
+ decorative spans. Did NOT do a wholesale "rebuild ChatContainer on ChatThread / ChatInput on
Composer" — those bespoke parts carry substantial behavior (streaming, voice dictation, agent
activity, workspace) the flat DS components don't model; forcing them would drop features.

## ✅ Converted (real Cadence components)
### Core chat
- **UserBubble** — REBUILT on real Cadence `MessageBubble` (role="user"); content wrapped in a
  `whitespace-pre-wrap break-words` span so multi-line input keeps line breaks (the DS inner
  pill doesn't pre-wrap).
- **AssistantBubble** — 4 action-icons (copy/regen/like/dislike) → `IconButton`. (Streaming
  markdown body + sending-dots + inline LeasefyMark layout kept — allowlist.)
- **ChatInput** — voice + send(hero) + send(default) `<button>` → `IconButton` (inverse-ink
  fill via className). (Bespoke composer: hero/default cards + Web-Speech voice dictation +
  VoiceBars equalizer + auto-resize textareas — allowlist.)
- **BetaWelcome** — BETA pill → `Badge`; 6 suggestion chips → `Button variant="outline"`.

### Result / artifact cards
- **ResponseCard** — `ActionButton` (a/button, primary/secondary/ghost) → `Button`
  (default/outline/ghost, `asChild` for href; drops the old mono-uppercase primary
  anti-pattern); `TypeBadge` → `Badge` (default/secondary).
- **AgentResultCard** — retry `<button>` → `Button` (soft-tint danger). (Disclosure header
  button = allowlist.)
- **BriefingCard** — section action `<button>` → `Button` (agent-color soft-tint idiom);
  "nuevo" pill → `Badge`. (2 disclosure section headers = allowlist.)
- **WorkspaceView** (3-col) — `ActionButton` → `Button` (drops mono-uppercase); MiniChatInput
  send + 2 close(X) → `IconButton`; step-count + response-type spans → `Badge`
  (success/default, warning/default); cleaned `uppercase tracking font-mono` off the mini user
  bubble. (Mobile underline tab-bar + borderless mini-chat input + active-step `animate-spin`
  status icon + agent-palette badges = allowlist.)
- **DecisionCard** — NO conversions: option `<button>`s = selectable option-tiles (allowlist);
  recommendation/category micro-tags = agent-palette, no DS variant (allowlist).

### Sidebar tab panels
- **ConversationList** — delete `<button>` → `IconButton`; search `<input>` → `Input`;
  date-group overlines (`uppercase tracking-widest`) → `MonoLabel`. (Item-row whole-button =
  allowlist.)
- **BriefingHistory** — date-pills `<button>` (single-select) → `Button` (active=default /
  inactive=secondary). (removed now-unused `cn` import.)
- **AgentActivityLog** — 2 section overlines (`<h3>`) → `MonoLabel`. (ActivityItem whole-row =
  allowlist; agent status `animate-spin` + dots = allowlist.)
- **DecisionHistory** — 2 section overlines → `MonoLabel`. (DecisionItem whole-row + category
  agent-palette badge = allowlist.)

### Settings panels
- **PreferencesPanel** — reset `<button>` → `Button variant="outline"`.
- **AutonomySettings** — per-agent bespoke segmented (Auto|Preguntar|Manual) → real
  `SegmentedControl<AutonomyLevel>` (fullWidth, icon+label ReactNode options); reset-link →
  `Button variant="ghost"`.
- **NotificationSettings** — category `<button role=switch>` → `Switch`; channel bespoke
  segmented → `SegmentedControl<NotificationPreferences['channel']>`; channel overline →
  `MonoLabel`.
- **ToneSelector** — NO conversions: 3 tone cards = selectable option-tiles (allowlist).
- **ThresholdSettings** — Number/Currency stepper +/- `<button>`s → `IconButton` (×4 via
  replace_all, ghost + explicit border/bg); score-tag span → `Badge`
  (destructive/warning/success via a `getScoreColor → variant` refactor). (Value-display divs +
  COP formatting kept — Cadence NumberStepper has no COP display.)

### Misc
- **BetaErrorBoundary** (class component) — "Intentar de nuevo" retry `<button>` → `Button`.
- **AgentActivityIndicator** — NO conversions: `<div>` card, status `animate-spin` icon +
  bespoke state-colored progress bar (allowlist).
- **AgentBadge** — NO conversions: `<div>` status pill, 6-color agent palette (no DS variant)
  + status `animate-spin` (allowlist).
- **AppSwitcher** — already on Cadence `Button` (ghost/icon). Untouched.
- **TypingIndicator / MarkdownRenderer / LeasefyMark / BetaSkeletons / ChatContainer** — no
  native interactive elements (ChatContainer = pure orchestration). Untouched.

## NEW idiom this area
- **Bespoke "track + flex-1 buttons" segmented control → real `SegmentedControl`**: when you
  find a `<div class="flex rounded bg-surface-muted p-0.5">{opts.map(<button flex-1 active?bg-primary>)}` ,
  that's a segmented control → adopt Cadence `SegmentedControl` (fullWidth, `value`/`onChange`,
  `options[].label` ReactNode for icon+label). Accept the active-style shift from cobalt-fill →
  DS raised white pill (the §segmented standard). Used in AutonomySettings + NotificationSettings
  (+ BetaSidebar tab-bar).
- **MessageBubble adoption for a simple bubble**: wrap pre-wrap content in a span child so
  multi-line text survives (the DS inner pill doesn't pre-wrap).

## Allowlist (stayed native — documented reasons)
- **Whole-row clickables** — ConversationItem, ActivityItem, DecisionItem (`w-full text-left`
  cards that navigate/select; nested delete IconButton inside ConversationItem preserved).
- **Disclosure toggles** — AgentResultCard header, BriefingCard section headers (`aria-expanded`).
- **Selectable option-tiles** — DecisionCard options, ToneSelector tone cards (`text-left`,
  selected ring/check). (Cadence RadioCard exists but the precedent allowlists these.)
- **Borderless composer inputs** — ChatInput's 2 auto-resize voice textareas; WorkspaceView
  mini-chat `<input>` (transparent, the border lives on the parent bar; HeroSection precedent).
- **Bespoke composer chrome** — ChatInput hero/default cards + Web-Speech voice + VoiceBars.
- **Mobile underline tab-bar** — WorkspaceView steps/content/chat (`border-b-2` strip;
  nav-chrome precedent; SegmentedControl would change the underline look).
- **Agent-palette micro-tags / status pills** — DecisionCard/DecisionHistory category tags,
  AgentBadge, WorkspaceView/StepItem agent badges (emerald/blue/amber/purple/pink/indigo — no
  DS Badge variant for the 6 agent colors).
- **Per-status `animate-spin` icons** — CircleNotch on running/active status in
  AgentActivityIndicator/AgentActivityLog/AgentBadge/WorkspaceView StepItem (status icon, not a
  standalone loader → not Spinner).
- **Bespoke state-colored progress bar** — AgentActivityIndicator (success/danger/neutral fill).
- **ChatContainer orchestration + BetaLayout/MobileSidebarDrawer shells** (covered in Area 11).

## GATE
```
FILES=$(find src/components/beta -name '*.tsx'); printf '%s\n' $FILES | \
  xargs grep -nE '<button|<input|<select|<textarea|uppercase tracking|SpinnerGap'
```
→ 11 residual hits, every one a documented allowlist category above. `npx tsc --noEmit` → 0.

## Deferred (NOT done — flagged to Nico)
- **HOY→Inicio route RENAME** (`app/panel/inmobiliaria/hoy/page.tsx` + nav labels/links) —
  product-naming, not a component migration. Confirm before doing (touches nav across the app).
- Full mvp `pnpm build` (env-dependent — Nico runs it).
