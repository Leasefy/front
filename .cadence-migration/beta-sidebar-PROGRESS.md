# beta-sidebar area (Area 11) — Cadence adoption ✅ COMPLETE (2026-06-30, opus by hand)

Scope = the 3 chat-sidebar **SHELL** files only:
`src/components/beta/{BetaSidebar,BetaLayout,MobileSidebarDrawer}.tsx`.
The tab-panel children (ConversationList / AgentActivityLog / DecisionHistory /
BriefingHistory) and all other `components/beta/*` chat parts belong to **Area 12
(Inicio chat rebuild)** — not touched here.

**Gate (find|xargs) on the 3 files = 0 native elements. tsc --noEmit = 0.**

## KEY DECISION — why NOT Cadence `Sidebar`/`SidebarItem`
The scout said "rebuild on `Sidebar`/`SidebarItem`". After reading
`cadence/src/components/ui/sidebar.tsx`: that component is a **vertical nav-LINK
shell** — `SidebarItem` renders an `<a href>` icon+label row, `SidebarSection`
groups link rows, the footer slot is `flex items-center` (a horizontal row).
BetaSidebar is a **chat sidebar**: a primary-pill "new conversation" CTA, a
horizontal **segmented icon tab-bar** (onClick tab switches, not navigation), a
dynamic content panel that swaps per tab, and a settings toggle + BETA badge
stacked **vertically** in the footer. There are **zero** vertical nav-link rows to
map onto `SidebarItem`. Forcing the `Sidebar` shell would impose `w-[248px]`,
children `px-2`, fixed header/footer slot padding, and a `flex-row` footer that
conflicts with the vertical settings+badge stack — heavy overrides = a mimic in
reverse, with visual-regression risk on a high-traffic screen.
**→ The `<aside>` container stays allowlist (nav-chrome); every real *control*
inside is converted to its Cadence component.** This is MORE compliant than the
flows-area precedent (which kept PaymentAccounts' bespoke segmented toggle as
allowlist) because here the toggle becomes the real `SegmentedControl`.

## ✅ Converted (real Cadence components)
### BetaSidebar.tsx
- **"Nueva conversación"** `<button>` (primary pill) → `Button` (default variant =
  primary cobalt, `hideArrow`, `className="w-full gap-2 rounded-full px-4 py-2.5 h-auto text-[13px]"`).
- **4-icon tab-bar** (`role=tablist` + 4 `role=tab` buttons) → real
  **`SegmentedControl<BetaTab>`** from `@leasefy/cadence`:
  - `fullWidth` (equal segments + sliding white thumb), `size="md"` (h-8 ≈ old py-2).
  - `value={activeTab}` — when `activeTab==='settings'` no option matches ⇒
    `activeIndex −1` ⇒ `hasThumb=false` ⇒ no segment active (correct, settings is
    the separate footer toggle). `onChange={handleTabChange}`.
  - `options = NAV_TABS.map(...)` → each `{ value: tab.id, ariaLabel: t(labelKey),
    label: <span className="relative …"><Icon weight={isActive?'fill':'regular'}/>
    {count-badge on decisions}{warning-dot on briefing}</span> }`. (Label is a
    ReactNode — established pattern, see portafolio/page.tsx SegmentedControl.)
  - Coarse-pointer 44px touch target preserved via
    `className="w-full [&>button]:[@media(pointer:coarse)]:min-h-11"`.
  - a11y model shifts tablist→radiogroup (the DS component's standard) — accepted.
- **Settings** `<button>` (bottom toggle) → `Button variant="ghost"`
  (`justify-start gap-2.5 px-3 py-2 h-auto rounded-full`, active override
  `bg-accent-soft hover:bg-accent-soft text-primary font-medium`, coarse min-h-11).
- **BETA badge** `<span>` → `Badge variant="secondary"` (`gap-1 text-[11px]
  font-medium`, keeps the Sparkle fill icon + label).
- Imports added: `import { Button, Badge } from '@/components/ui';` +
  `import { SegmentedControl } from '@leasefy/cadence';`.

### BetaLayout.tsx
- **Hamburger** `<button>` (mobile open-menu) → `IconButton` (`icon=<List/>`,
  `variant="ghost"`, `type="button"`, `w-11 h-11 rounded-md text-fg-muted …`).
- **MobileNewChatButton** `<button>` → `IconButton` (`icon=<Plus/>`, `variant="ghost"`,
  `text-primary hover:bg-primary-soft`).
- Import added: `import { IconButton } from '@leasefy/cadence';`.

### MobileSidebarDrawer.tsx
- **Close** `<button>` → `IconButton` (`icon=<X/>`, `variant="ghost"`, `rounded-full`).
- Import added: `import { IconButton } from '@leasefy/cadence';`.

### Already Cadence (left as-is)
- **AppSwitcher.tsx** — the brand header / workspace-switch already uses the local
  `Button` (variant ghost, size icon). No change.

## Allowlist (stayed native — documented reasons)
- **BetaSidebar `<aside>` shell** — chat-sidebar chrome; Cadence `Sidebar` is a
  vertical nav-LINK shell (wrong structural fit, see KEY DECISION). Layout container,
  not an interactive control.
- **BetaLayout outer container** — the fixed-inset (fullscreen) / relative (embedded)
  "separate universe" shell; pure layout chrome.
- **MobileSidebarDrawer scrim + panel** — `fixed` portal-free css-slide drawer: the
  backdrop `<div onClick>` (modal scrim) + the `role="dialog"` translate-x panel.
  Cadence `Drawer`/`Sheet` exist but this is portal-free, wraps arbitrary children,
  and owns Escape + body-scroll-lock; kept as STRUCTURE (flows bespoke-modal
  precedent), with the close button converted.
- **Skip-to-chat `<a>`** — `sr-only focus:not-sr-only` accessibility skip link
  (precedent: DocumentUpload sr-only file input).

## GATE
```
grep -nE '<button|<input|<select|<textarea|animate-spin|SpinnerGap|uppercase tracking' \
  src/components/beta/BetaSidebar.tsx \
  src/components/beta/BetaLayout.tsx \
  src/components/beta/MobileSidebarDrawer.tsx
```
→ 0 hits. `npx tsc --noEmit` → 0.
