# Tenant / Inquilino — Cadence adoption progress (updated 2026-06-30, opus, by hand)

Area = `src/app/inquilino/**` (18 tsx) + `src/components/{tenant,contract,lease,score}` (15+13+5+9). 60 tsx total.

## ⚠️ GATE GOTCHA (read first)
`grep -rlE pattern dir1 dir2 … --include='*.tsx'` over MULTIPLE dir paths returns **false all-0 on macOS BSD grep** (esp. when one is an app-route dir like `src/app/inquilino`). It nearly made me mark this area DONE when it wasn't. **ALWAYS gate with find|xargs:**
```
FILES=$(find src/app/inquilino src/components/tenant src/components/contract src/components/lease src/components/score -name '*.tsx')
g(){ printf '%s\n' $FILES | xargs grep -lE "$1" 2>/dev/null | wc -l | tr -d ' '; }
```

## REAL START GATE (find|xargs, 2026-06-30)
button 27 · input 5 · select 2 · table 1 · pill 4 · eyebrow 5 · spinner 12. tsc=0.

## IDIOMS (reuse)
- eyebrow `font-mono uppercase` (h4/p/span/div) → `MonoLabel` from `@leasefy/cadence` (add `block` for former block els; keep size/tracking/color via className — tailwind-merge overrides MonoLabel's baked `text-[11px]/tracking-[0.1em]/font-medium/text-fg-subtle`).
- manual `<SpinnerGap … animate-spin/>` loader → `Spinner` from `@/components/ui/spinner` (`size` xs/sm/md/lg/xl/2xl; `variant="current"` inherits text color; add `className="text-primary"` for color). Remove now-unused `SpinnerGap` import.
- status pill (`rounded-full bg-*-soft text-*` span/div with text) → `Badge` from `@/components/ui/badge` (`variant` default|success|warning|destructive|secondary) — Badge provides the pill bg so the literal leaves the file.
- icon-only btn (close/scroll/wishlist) → `IconButton` from `@leasefy/cadence` (`icon={<X/>}`, `aria-label`, `variant="ghost"`, size via className for non-standard px).
- `<table>` → Table family from `@/components/ui/table` (`Table/TableHeader/TableBody/TableRow/TableHead/TableCell`) — headers become mono-UPPER Cadence; drop redundant `py-/px-` (cell provides), keep content classes (font-mono tabular-nums).
- text-link btn ("ver más") → `Button variant="link" size="sm" hideArrow`.
- Sign btn loader: keep manual ternary, just swap SpinnerGap→Spinner (preserves "Procesando…" text).
- IMPORT-ALIAS guard: JSX name must match import.

## ✅ DONE — allowlist floor + tsc=0 per sub-group

### lease + score (DONE)
- `LeaseCard`: eyebrow→`MonoLabel`, "Vence pronto" pill→`Badge warning`.
- `LeaseExpandableItem`: 2 loaders→`Spinner` (replace_all), "Ver N pagos más" link→`Button link`. (disclosure header `<button>` 101 = ALLOWLIST.)
- `PaymentHistory`: desktop `<table>`→`Table` family.
- ALLOWLIST: `LeaseListItem` (whole-row `<button onClick=onSelect>`), `PaymentMethodSelector` (selectable tile), `RiskScoreDisplay` (disclosure aria-expanded). Floor: button 4 (all allowlist), rest 0.

### contract (DONE)
- `AuthenticityCertificate`: "VÁLIDO" pill `<div rounded-full bg-success-soft>`→`Badge success`; 3 `<h4 font-mono uppercase>`→`MonoLabel`.
- `ContractPreview`: 5 eyebrows→`MonoLabel`; "Ver N cláusulas más" `<button>`→`Button link`.
- `OTPVerification`: 2 loaders→`Spinner`; token-cleaned hexes `bg-[#FDF3F1]`→`bg-danger-soft`, `bg-[#F3FAF4]`→`bg-success-soft`. (OTP `<input maxLength=1>` multi-box = ALLOWLIST — bespoke OTP w/ refs/paste/keyboard; OTPInput rewire too risky.)
- `SignatureForm`: sign-btn loader→`Spinner`. (3 `<input type=checkbox className="sr-only">` consent-cards = ALLOWLIST — hidden/sr-only behind clickable card.)
- `SignaturePad`: "Borrar" `<button>`→`Button ghost`.
- ALLOWLIST: `RejectionsHistory` (disclosure), `ContractExpandableItem` (disclosure — inferred, NOT spot-checked), `InsuranceSelector` (selectable tile — inferred, NOT spot-checked). Floor: button 3 + input 2 (all allowlist), rest 0.

### tenant components (DONE ✅ 2026-06-30 — floor: button 6 + pill 1 all allowlist, tsc=0)
- `ApplicationDetail`: 2 eyebrows→`MonoLabel`.
- `PayRentModal`: 2 loaders→`Spinner` (size lg/xl). (14×14 `rounded-full bg-*-soft` icon-circles 526/548/566/610 = ALLOWLIST.)
- `RecommendedProperties`: 2 scroll arrows→`IconButton` (kept `text-plan-*` + disabled state via className).
- `ScoreDetailSheet`: close (inline SVG X)→`IconButton icon={<X/>}`. (copy-code row 323 = ALLOWLIST whole-row.)
- `PropertyDetailSheet` ✅: close→`IconButton icon={<X/>}`; "Ver N fotos" overlay→`Button secondary sm hideArrow` (kept glass `bg-surface/90 backdrop-blur-sm` + abs pos via className); wishlist heart→`IconButton` (Heart in `icon={}`, kept toggle hexes/border via className). ALLOWLIST: image-thumbnail tile (`<button>` line 284, `aspect-square` wraps fill image, opens gallery). Added `Button`+`IconButton` imports.
- ALLOWLIST (no conversion): `ScoreCard` (×2 whole-card), `PropertyMatchCard` (×4 whole-card/image-tile, all onClick=onViewProperty), `ScoreShareModal` (×2 copy-rows), `ScoreDetailSheet` copy-row, `ApplicationCard` (whole-card).

LATEST tenant-components gate (after the above): button 6 · pill 1 — all allowlist except PropertyDetailSheet's 3 convertibles. tsc=0.

## `app/inquilino/**` pages — 7/11 DONE (2026-06-30, tsc=0)
✅ DONE (floor; remaining `<button>` = documented allowlist):
- `arriendo/[leaseId]` ✅ — "Pagar arriendo" CTA→Button.
- `guardados` ✅ — manual spinner→Spinner; glass remove-btn→IconButton. ALLOWLIST: image-tile + title-clickable (whole-card).
- `notificaciones` ✅ — "Marcar todo"/gear→Button/IconButton; action CTA→Button; mark-read+delete→IconButton; clear-read→Button link. ALLOWLIST: filter chips (filter-tab).
- `aplicaciones/[applicationId]/completar` ✅ — spinner→Spinner; success CTA→Button; banner close→IconButton.
- `aplicaciones/[applicationId]` ✅ — spinner→Spinner; copy-chip→Button; amber "Completar" CTA→Button; stripped dead `uppercase tracking-wide font-mono` off 2 icon-circles (no text). ALLOWLIST: 4 sidebar action-rows (list-row, w/ icon-box+2-line text — matches LeaseListItem precedent).
- `aplicaciones/page` ✅ — spinner→Spinner; 2 SegmentedControl count chips→Badge (default+`bg-primary-soft` override, dropped `rounded-full`); view-toggle×2 + pag arrows×2→IconButton (aria-pressed); page-number→Button ghost.
- `para-ti` ✅ — 2 filter `<select>`→Cadence `Select` (h-9 w-auto rounded-none); pag arrows→IconButton + page-number→Button (rounded-none PLan style); clear-filters→Button link; stripped inconsistent mono off D-branch risk-letter badge. (`CaretDown` now unused — harmless, noUnusedLocals off.)

- `contratos/[contractId]/firmar` ✅ — 2 SpinnerGap→Spinner (muted); "Tipo de contrato" eyebrow→MonoLabel; 4 buttons→Button (success CTA / 2 cancel-link / "Pedir cambios" outline). Removed unused SpinnerGap import.
- `documentos` ✅ — spinner→Spinner; search→Input (rounded-full pill); view-action→Button ghost; pag arrows→IconButton + page-number→Button; modal close→IconButton. ALLOWLIST: type filter pills (filter-tab). NOTE: doc-viewer modal (framer-motion `fixed inset-0`) left as-is (modal-structure family out of current button/input/select/pill/eyebrow/spinner floor scope).

- `configuracion` ✅ — Modal close→IconButton; language `<select>`→Select; 6 `SettingToggle`→Switch (one component); 4 modal inputs→Input; 10 buttons→Button (outline cancels / ink-secondary submits w/ `isLoading` / destructive delete / link "Cerrar"). ALLOWLIST: `SettingLink` rows (list-row); bespoke modals.
- `perfil` ✅ — 22 buttons→Button/IconButton (edit/save/cancel groups, avatar pencil/camera/trash, modal closes, danger/destructive CTAs, save buttons `isLoading`); 11 form/modal inputs→Input; step-action + verify pill→Button. ALLOWLIST: hidden `type=file` (line 404); avatar mono-initial display (line ~430, `text-4xl` — not an eyebrow).

## ✅✅ AREA COMPLETE (2026-06-30) — all 11 pages + all components at allowlist floor, tsc=0.
Final find|xargs gate: select/textarea/table/spinner=0 · button 27 · input 5 · pill 5 · eyebrow 1 — every hit documented allowlist in `cadence/CADENCE-ADOPTION-PLAYBOOK.md` (tenant section).
Also caught + fixed 2 missed eyebrows from the prior session: `PayRentModal` "Período"/"Monto a pagar"→MonoLabel; stripped dead mono off `ContractTimeline` current-step circle.
Idioms: real CTAs→Button · closes/icon-only→IconButton · spinners→Spinner (or Button isLoading) · `<input>`→Input (hidden file/sr-only=allowlist) · `<select>`→Select · eyebrows→MonoLabel · pill→Badge · whole-card/list-row/filter-tab/disclosure/pagination-dots=allowlist.

## ✅ tenant/inquilino COMPLETE — no resume needed here. Next area: `landlord` (then flows / BetaSidebar / Inicio chat).

## AFTER tenant/inquilino — remaining MIGRATION areas (use SAME playbook + find|xargs gate + tsc=0)
`landlord` · `flows` (onboarding/layout/nav/wizard/settings/messages) · **BetaSidebar** (4th sidebar→real `Sidebar`/`SidebarItem`) · **Inicio chat** (rename HOY→Inicio, rebuild on Cadence `Composer`/`ChatThread`/`MessageBubble`/`SuggestedFollowups`/`ArtifactPanel`, preserve `useBetaChatContext`).
For each new area: `FILES=$(find <area-dirs> -name '*.tsx')` → gate button/input/select/textarea/table/pill/eyebrow/spinner via `printf '%s\n' $FILES | xargs grep -lE` → convert per idioms below → drive each remaining hit to a documented allowlist reason → `tsc --noEmit`=0 → append an "### <area>" block to `cadence/CADENCE-ADOPTION-PLAYBOOK.md`.

## DONE areas (allowlist floor + tsc=0, all documented in `cadence/CADENCE-ADOPTION-PLAYBOOK.md`)
admin · avaluo · mvp: property · inmobiliaria core · panel · ai/cobranza · marketing (landing/home/pricing) · **tenant/inquilino (this area)**. → ~8 of ~13.

## IDIOMS (reuse for next areas)
- Button from `@/components/ui/button` — variants default(primary cobalt, auto ArrowUpRight)/secondary(neutral)/outline/destructive(danger)/ghost/link/white/glass; size sm/default(h-10)/lg(h-12)/icon; `hideArrow` kills the auto-arrow (default/white only); `isLoading` for spinner. Ink/black modal CTA = `variant="secondary"` + `className="bg-ink dark:bg-surface text-white dark:text-fg"`. Semantic-colored CTA (amber/etc) = `variant="secondary"|"outline"` + bg/text className overrides.
- IconButton from `@leasefy/cadence` — `icon={<X/>}` (NOT children), `aria-label`, `variant="ghost"`, size/shape via className (`rounded-full`/`rounded-none`/`p-2`). Toggle → add `aria-pressed`.
- Input from `@/components/ui/input` (thin adapter, same props; DS gives border/radius/cobalt focus — drop the hand-rolled border/focus/text classes, keep layout: w-full + pl-/rounded-/bg-).
- Select from `@/components/ui/select` (Radix): `<Select value onValueChange><SelectTrigger className="w-auto"><SelectValue/></SelectTrigger><SelectContent><SelectItem value>…</SelectContent></Select>`. Drop the hand-rolled caret overlay.
- Switch from `@/components/ui/switch` — `checked` / `onCheckedChange` / `aria-label`.
- Spinner from `@/components/ui/spinner` — size xs/sm/md/lg/xl/2xl; `variant="current" className="text-primary"` for cobalt, `variant="muted"` for gray. Or fold into `Button isLoading`.
- MonoLabel from `@leasefy/cadence` — span; add `block` when replacing `<p>/<h*>`; override tracking/color via className (baked: font-mono text-[11px] uppercase tracking-[0.1em] font-medium text-fg-subtle). NOT for large mono display headings/initials.
- Badge from `@/components/ui/badge` — variants default(primary)/secondary/destructive/outline/success/warning/risk-a..d; for `bg-*-soft` count chips use `variant="default"` + `className="bg-primary-soft text-primary"` and DROP literal `rounded-full` (Badge provides it → clears pill gate).
- ALLOWLIST categories (stay native, document why): whole-card/list-row clickables, disclosure toggles (aria-expanded), selectable tiles (aria-pressed), copy-rows, filter-tabs / carousel-pagination dots, hidden file / OTP multi-box / sr-only inputs, icon-circles (`rounded-full bg-*-soft` wrapping an icon, no label), mono DISPLAY headings/initials, nav-chrome, glass-on-media/hero, bespoke framer-motion `fixed inset-0` modals (structure; convert their close + form fields).
- ⚠️ GATE: multi-path `grep -rlE … --include` gives false 0 on BSD → ALWAYS `find <dirs> | xargs grep -lE`.
