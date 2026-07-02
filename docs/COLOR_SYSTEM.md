# Design System - Color Usage Guide

> This app now uses the **Cadence design system**, consumed via the shared
> **`@leasefy/cadence`** Tailwind preset. Tokens are backed by CSS variables in this
> app's `src/app/globals.css` (already migrated to Cadence). The canonical reference is
> [`cadence/reference/Cadence Design System.dc.html`](../../cadence/reference/Cadence%20Design%20System.dc.html).
>
> Cadence is a **warm-neutral foundation with a single cobalt accent** (`#1A40FF`). This
> file documents the color tokens, the semantic roles they map to, and the rules for using
> them. For typography, spacing, radius, elevation, and component patterns see
> [`DESIGN.md`](./DESIGN.md).

## MANDATORY COLOR RULES

**CRITICAL: Use the Cadence semantic tokens / `@leasefy/cadence` preset classes in ALL components.**

1. Reach for **semantic role tokens first** (`bg-surface`, `text-fg`, `bg-primary`, `border-border`).
2. Use the **ramp scales** (`neutral-*`, `primary-*`) only when a role token does not exist for the case.
3. **Never hardcode hex** outside `globals.css`. SVG inline fills are the only exception — and they must use an approved Cadence hex listed below.
4. There is exactly **one accent**: cobalt `#1A40FF`. Do not introduce a second "brand" hue.
5. **Supporting hues** (cyan, green, amber, coral, violet, peach) are reserved for **charts and categorical data** — not for UI chrome or CTAs.
6. **Gradients are allowed** on hero/brand surfaces (this reverses the old "no gradients" rule). See [Brand Gradients](#brand-gradients).

---

## Allowed Colors Reference

### Semantic Tokens (Preferred - Use These First)

| Token (Tailwind) | Role | Light value | Use For |
|---|---|---|---|
| `bg-surface` | surface.page | `#FBFAF9` | Page background (warm off-white) |
| `bg-surface-raised` | surface.raised | `#FFFFFF` | Cards, sheets, popovers |
| `bg-surface-sunken` | surface.sunken | `#F4F2EF` | Wells, insets, subtle sections |
| `bg-surface-brand` | surface.brand | `#EDF1FF` | Cobalt-tinted highlight surfaces |
| `bg-surface-inverse` | surface.inverse | `#14130F` | Dark spotlight blocks on light pages |
| `text-fg` | text.primary | `#14130F` | Primary text (warm ink) |
| `text-fg-secondary` | text.secondary | `#6E6A63` | Secondary text |
| `text-fg-muted` | text.muted | `#726E68` | Muted / tertiary text, captions |
| `text-link` | text.link | `#1A40FF` | Inline links |
| `bg-primary` | primary | `#1A40FF` | CTAs, focus rings, selected states |
| `text-on-primary` | primary.foreground | `#FFFFFF` | Text/icons on primary backgrounds |
| `border-border` | border.default | `#E5E2DC` | Default borders, input outlines |
| `border-border-subtle` | border.subtle | `#ECEAE6` | Hairline dividers |
| `border-border-strong` | border.strong | `#C9C4BB` | Emphasized borders |
| `ring` / `border-focus` | border.focus | `#1A40FF` | Focus rings (cobalt) |

> Exact class suffixes are defined by the `@leasefy/cadence` preset; the preset + `globals.css`
> are the source of truth. The roles above are stable.

### Color Scales (When Semantic Tokens Don't Fit)

#### Primary (Cobalt) - `primary-*`
Use for: buttons, links, focus states, selected/active interactive elements.
```
primary-50   #EDF1FF   Tinted surfaces (surface.brand)
primary-100  #D6DFFF   Hover tint / soft fills
primary-200  #ADBEFF   Borders on tinted surfaces
primary-300  #7B95FF   Disabled-on-tint, decorative
primary-400  #4A6BFF   Decorative / chart secondary
primary-500  #1A40FF   Brand cobalt (equivalent to `primary`)
primary-600  #1533D6   Hover / pressed state
primary-700  #0C1F80   Text on light cobalt tints, deep accents
```

#### Neutrals (Warm) - `neutral-*`
Use for: text, surfaces, borders. The Cadence ramp is warm (sandy taupe), not cool gray.
```
neutral-50   #FBFAF9   Page background (surface.page)
neutral-100  #F4F2EF   Sunken surface
neutral-200  #ECEAE6   Subtle border / divider
neutral-300  #E5E2DC   Default border
neutral-400  #D5D1CA   Strong-ish border, disabled fills
neutral-500  #B3AEA5   Placeholder, disabled text
neutral-600  #7E7A72   Icon muted (#726E68 = text.muted)
neutral-700  #6E6A63   Secondary text (text.secondary)
neutral-800  #4D4A45   High-contrast secondary
neutral-900  #2A2824   Near-ink
neutral-950  #14130F   Ink (text.primary, surface.inverse)
```

#### Success States - `success-*`
Use for: positive feedback, approvals, completed states.
```
success-fg   #3F8A53   Text / icons
success-bg   #E8F4EA   Tinted background
```

#### Warning States - `warning-*`
Use for: caution, pending, attention needed.
```
warning-fg   #A8730F   Text / icons
warning-bg   #FBF1DD   Tinted background
```

#### Error States - `error-*`
Use for: errors, destructive actions, critical alerts.
```
error-fg     #C0392B   Text / icons
error-bg     #FBE9E6   Tinted background
```

#### Info States - `info-*`
Use for: neutral informational notices.
```
info-fg      #2A6FB0   Text / icons
info-bg      #E6F0FA   Tinted background
```

#### Supporting Hues - charts & categorical only
Never for UI chrome, CTAs, or state. Use for data series and categorical accents.
```
cyan    #2BB5E8
green   #3F8A53
amber   #A8730F
coral   #F0816F
violet  #8E7BF0
peach   #F0925A
```

---

## FORBIDDEN Colors

**NEVER use raw framework palette colors that bypass the Cadence preset:**

| Forbidden | Replacement |
|-----------|-------------|
| `indigo-*`, `blue-*`, `violet-*`, `purple-*` (as accent) | `bg-primary` / `primary-*` (cobalt `#1A40FF`) |
| `emerald-*`, `green-*` | `success-*` (chart green → supporting `green #3F8A53`) |
| `amber-*`, `yellow-*`, `orange-*` | `warning-*` |
| `rose-*`, `red-*` | `error-*` |
| `sky-*`, `cyan-*` (as accent) | `info-*` (chart cyan → supporting `cyan #2BB5E8`) |
| `slate-*`, `gray-*`, `zinc-*`, `stone-*` | `neutral-*` (warm ramp) |
| Legacy Manus `sand-*` ambient | `bg-surface-sunken` / `neutral-100` |
| Legacy `#5B5FEF` electric blue / "Deep Navy ink" | `#1A40FF` cobalt / `#14130F` warm ink |

**Reversed rule:** gradients are **no longer forbidden**. Cadence encourages brand gradients on
hero/brand surfaces (see below). They remain off-limits on body content, cards, and data UI.

---

## Quick Reference Mappings

### Manus / Leasefy-UI → Cadence (migration)

```
# Accent
bg-indigo-500        → bg-primary            (#1A40FF cobalt)
hover:bg-indigo-600  → hover:bg-primary-600  (#1533D6)
#5B5FEF (electric)   → #1A40FF
text-indigo-600      → text-primary / text-link

# Neutrals & surfaces (cool → warm)
bg-neutral-50 (cool) → bg-surface            (#FBFAF9)
bg-white card        → bg-surface-raised     (#FFFFFF)
bg-sand-50 ambient   → bg-surface-sunken     (#F4F2EF)
text-slate-600       → text-fg-secondary     (#6E6A63)
border-neutral-200   → border-border         (#E5E2DC)

# State (palette → semantic)
bg-emerald-100 text-emerald-700 → bg-success-bg text-success-fg
bg-amber-50    text-amber-600   → bg-warning-bg text-warning-fg
bg-rose-100    text-rose-600    → bg-error-bg   text-error-fg
bg-blue-50     text-blue-700    → bg-info-bg    text-info-fg

# Type & shape (see DESIGN.md)
font-heading (Manrope/Satoshi)  → font-sans  (Schibsted Grotesk)
font-mono (Space/DM/Ubuntu Mono)→ font-mono  (JetBrains Mono)
rounded-xl button                → rounded-full (pill, radius 999)
uppercase button label           → sentence case
```

---

## Common Patterns

### Success Badge
```tsx
// ❌ WRONG (raw palette)
<div className="bg-emerald-100 text-emerald-700">Aprobado</div>

// ✅ CORRECT (Cadence)
<div className="bg-success-bg text-success-fg">Aprobado</div>
```

### Warning State
```tsx
// ❌ WRONG
<div className="bg-amber-50 text-amber-600">Pendiente</div>

// ✅ CORRECT
<div className="bg-warning-bg text-warning-fg">Pendiente</div>
```

### Error State
```tsx
// ❌ WRONG
<div className="bg-rose-100 text-rose-600">Rechazado</div>

// ✅ CORRECT
<div className="bg-error-bg text-error-fg">Rechazado</div>
```

### Primary Action
```tsx
// ❌ WRONG (raw palette / second accent)
<button className="bg-indigo-500 hover:bg-indigo-600">Continuar</button>

// ✅ CORRECT (semantic) — pill, sentence case (see DESIGN.md §4)
<button className="bg-primary text-on-primary hover:bg-primary-600 rounded-full">
  Continuar
</button>
```

### Secondary Text
```tsx
// ❌ WRONG
<p className="text-slate-600">Texto secundario</p>

// ✅ CORRECT (semantic)
<p className="text-fg-secondary">Texto secundario</p>

// ✅ ALSO CORRECT (scale)
<p className="text-neutral-700">Texto secundario</p>
```

### Warm Ambient Surface
```tsx
// ❌ WRONG (legacy sand / raw palette)
<div className="bg-orange-50">Sección cálida</div>

// ✅ CORRECT
<div className="bg-surface-sunken">Sección cálida</div>
```

---

## UI Illustrations / Decorative Elements

For illustrations inside cards, use the same role tokens:

| Element | Color |
|---------|-------|
| Success / positive indicators | `success-*` (or supporting `green #3F8A53`) |
| Warning / pending indicators | `warning-*` (or supporting `amber #A8730F`) |
| Error / negative indicators | `error-*` |
| Info indicators | `info-*` (or supporting `cyan #2BB5E8`) |
| Primary actions / highlights | `bg-primary` / `primary-*` (cobalt) |
| Neutral backgrounds | `neutral-*` / `bg-surface-sunken` |
| Brand-tinted backgrounds | `bg-surface-brand` (`#EDF1FF`) |
| Categorical data series | supporting hues (cyan, green, amber, coral, violet, peach) |
| Text | `text-fg`, `text-fg-secondary`, `text-fg-muted` |

---

## Brand Gradients

**Reversed rule:** Cadence **encourages** gradients on hero and brand surfaces. Each gradient is
applied with a subtle **grain / noise overlay** to avoid banding and to read as a printed,
editorial surface. Use them on heroes, brand headers, marketing blocks, and the footer — **not**
on cards, body content, buttons, or data UI.

| Gradient | Hues | Mood |
|---|---|---|
| **Aurora** | cobalt `#1A40FF` · cyan `#2BB5E8` · lime | Bright, primary brand hero |
| **Spectrum** | cobalt `#1A40FF` · cyan `#2BB5E8` · amber `#A8730F` | Energetic, full-spectrum |
| **Dusk** | cobalt `#1A40FF` · violet `#8E7BF0` · peach `#F0925A` | Warm, dimensional |
| **Daylight** | blue · peach `#F0925A` · cream `#FBFAF9` | Soft, airy, light backgrounds |

Rules:
- Always pair a gradient with the noise/grain overlay (the Cadence grain utility).
- Keep text on gradients to white or warm ink and **verify ≥ 4.5:1 contrast**.
- One gradient per surface; do not stack or animate them.

```tsx
// ✅ CORRECT — hero with brand gradient + grain, CSS-var driven
<section className="gradient-aurora gradient-grain text-white rounded-xl p-12">
  <h1 className="text-display">...</h1>
</section>
```

When defining a gradient inline in SVG, use approved Cadence hexes:
```tsx
<linearGradient>
  <stop stopColor="#1A40FF" />  {/* cobalt */}
  <stop stopColor="#2BB5E8" />  {/* cyan   */}
</linearGradient>
```

---

## Dark Theme (warm-dark)

Cadence ships a **warm-dark** theme (not a cool gray dark mode). The cobalt accent is unchanged.

| Role | Light | Dark (warm) |
|---|---|---|
| surface.page | `#FBFAF9` | `#141310` |
| surface.raised | `#FFFFFF` | `#1C1A16` |
| border.default | `#E5E2DC` | `#312E27` |
| text.primary | `#14130F` | `#FBFAF9` |
| primary | `#1A40FF` | `#1A40FF` |

Every role token has a `dark:` counterpart resolved through CSS variables — author against the
semantic class (`bg-surface`, `text-fg`, `border-border`) and the warm-dark values apply
automatically. Do not hand-pick `dark:` palette colors.

---

## Approved Hex Values (Reference Only)

Use CSS variables / Tailwind tokens when possible. Direct hex ONLY in SVG inline fills.

### Primary (Cobalt)
- 50: #EDF1FF
- 100: #D6DFFF
- 200: #ADBEFF
- 300: #7B95FF
- 400: #4A6BFF
- 500: #1A40FF (brand)
- 600: #1533D6 (hover)
- 700: #0C1F80

### Neutral (Warm)
- 50: #FBFAF9
- 100: #F4F2EF
- 200: #ECEAE6
- 300: #E5E2DC
- 400: #D5D1CA
- 500: #B3AEA5
- 600: #7E7A72
- 700: #6E6A63
- 800: #4D4A45
- 900: #2A2824
- 950: #14130F (ink)

### Feedback
- success: fg #3F8A53 / bg #E8F4EA
- warning: fg #A8730F / bg #FBF1DD
- error:   fg #C0392B / bg #FBE9E6
- info:    fg #2A6FB0 / bg #E6F0FA

### Supporting Hues (charts / categorical)
- cyan #2BB5E8 · green #3F8A53 · amber #A8730F · coral #F0816F · violet #8E7BF0 · peach #F0925A

### Dark (warm-dark)
- page #141310 · surface #1C1A16 · border #312E27 · text #FBFAF9 · primary #1A40FF

---

## Enforcement

This document plus the `@leasefy/cadence` preset are the source of truth. All PRs are reviewed for
color compliance.

**Checklist before merge:**
- [ ] No raw palette classes (`indigo-*`, `blue-*`, `emerald-*`, `amber-*`, `rose-*`, `slate-*`, `gray-*`, legacy `sand-*`)
- [ ] Single accent only — cobalt `#1A40FF` via `bg-primary` / `primary-*`
- [ ] Success/warning/error/info states use `success-*` / `warning-*` / `error-*` / `info-*`
- [ ] Text uses `text-fg`, `text-fg-secondary`, `text-fg-muted`, or `neutral-*`
- [ ] Surfaces use `bg-surface`, `bg-surface-raised`, `bg-surface-sunken`, `bg-surface-brand`
- [ ] Borders use `border-border*`; focus ring uses cobalt `ring` / border.focus
- [ ] No hardcoded hex outside `globals.css` (SVG inline fills use approved Cadence hexes)
- [ ] Supporting hues used only for charts/categorical data
- [ ] Gradients (if used) are on hero/brand surfaces only, with grain overlay and verified contrast
