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
| `bg-bg` | surface.page | `#FBFAF9` | Page background (warm off-white) |
| `bg-surface` | surface.raised | `#FFFFFF` | Cards, sheets, popovers |
| `bg-surface-muted` | surface.sunken | `#F4F2EF` | Wells, insets, subtle sections |
| `bg-surface-hover` | surface.hover | `rgba(0,0,0,.04)` | Hover fill on rows / list items |
| `bg-primary-soft` | surface.brand | `#EDF1FF` | Cobalt-tinted highlight surfaces |
| `text-fg` | text.primary | `#14130F` | Primary text (warm ink) |
| `text-fg-muted` | text.secondary | `#6E6A63` | Secondary text |
| `text-fg-subtle` | text.muted | `#726E68` | Muted / tertiary text, captions |
| `bg-primary` | primary | `#1A40FF` | CTAs, focus rings, selected states |
| `text-primary` | primary | `#1A40FF` | Inline links, accent text |
| `text-primary-fg` | primary.foreground | `#FFFFFF` | Text/icons on primary backgrounds |
| `border-border` | border.default | `#E5E2DC` | Default borders, input outlines |
| `border-border-faint` | border.subtle | `#ECEAE6` | Hairline dividers |
| `border-border-strong` | border.strong | `#D5D1CA` | Emphasized borders |
| `ring` | border.focus | `#1A40FF` | Focus rings (cobalt) |

> ⚠️ **Corregido el 2026-08-07 leyendo `@leasefy/cadence/tailwind-preset`.** Esta tabla listaba
> `bg-surface-raised`, `bg-surface-sunken`, `bg-surface-brand`, `bg-surface-inverse`,
> `text-fg-secondary`, `text-link`, `text-on-primary` y `border-border-subtle`: **ninguno existe en
> el preset.** Los valores hex eran correctos — lo que estaba desactualizado eran los nombres.
>
> Dos que cuestan caro:
> - `text-fg-muted` significa cosas distintas en cada vocabulario. Acá es el gris **más fuerte**
>   (`#6E6A63`); el más tenue es `text-fg-subtle`.
> - `bg-surface` **no** es el fondo de página: es la superficie elevada (blanca). El fondo del panel
>   es `bg-bg`. Usar `bg-surface` para una página la pinta blanca en vez de hueso.
>
> Una clase de Tailwind inexistente no falla: no genera nada y el elemento hereda lo que haya. Por
> eso esto sobrevivió con `tsc`, `lint` y `next build` en verde. Detalle y cómo verificar un token:
> [`DESIGN.md` §2](./DESIGN.md#2-tokens--quick-reference).

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
neutral-950  #14130F   Ink (text.primary; como fondo oscuro: `bg-fg`)
```

#### Feedback States — `success` / `warning` / `danger` / `info`

El texto va **sin sufijo** y el tinte lleva **`-soft`**. No hay `-fg` ni `-bg`, y el rojo se llama
**`danger`**, no `error` (`error-*` sí existe en `tailwind.config.ts`, pero es una escala numérica
`error-50/100/500/700`, otra cosa).

| Uso | Texto / iconos | Fondo tinte |
|---|---|---|
| Positivo, aprobado, completado | `text-success` `#307E57` | `bg-success-soft` `#E8F4EA` |
| Atención, pendiente, en riesgo | `text-warning` `#BF752B` | `bg-warning-soft` `#FBF1DD` |
| Error, destructivo, crítico | `text-danger` `#C0392B` | `bg-danger-soft` `#FBE9E6` |
| Informativo neutro | `text-info` `#3C83F6` | `bg-info-soft` `#E6F0FA` |

> Los hex de texto también estaban desactualizados: decían `#3F8A53` / `#A8730F` / `#2A6FB0`. Los
> valores de arriba salen del CSS que se genera hoy.

⚠️ **Tailwind no puede aplicar opacidad a estos tokens**: resuelven a un `var()` con color literal, no
a canales, así que `bg-danger-soft/70` no se genera y el estilo queda muerto. Usá `hover:opacity-*`.

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
| `emerald-*`, `green-*` | `text-success` / `bg-success-soft` (chart green → supporting `green #3F8A53`) |
| `amber-*`, `yellow-*`, `orange-*` | `text-warning` / `bg-warning-soft` |
| `rose-*`, `red-*` | `text-danger` / `bg-danger-soft` |
| `sky-*`, `cyan-*` (as accent) | `text-info` / `bg-info-soft` (chart cyan → supporting `cyan #2BB5E8`) |
| `slate-*`, `gray-*`, `zinc-*`, `stone-*` | `neutral-*` (warm ramp) |
| Legacy Manus `sand-*` ambient | `bg-surface-muted` / `neutral-100` |
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
text-indigo-600      → text-primary

# Neutrals & surfaces (cool → warm)
bg-neutral-50 (cool) → bg-bg                 (#FBFAF9)
bg-white card        → bg-surface            (#FFFFFF)
bg-sand-50 ambient   → bg-surface-muted      (#F4F2EF)
text-slate-600       → text-fg-muted         (#6E6A63)
border-neutral-200   → border-border         (#E5E2DC)

# State (palette → semantic)
bg-emerald-100 text-emerald-700 → bg-success-soft text-success
bg-amber-50    text-amber-600   → bg-warning-soft text-warning
bg-rose-100    text-rose-600    → bg-danger-soft   text-danger
bg-blue-50     text-blue-700    → bg-info-soft    text-info

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
<div className="bg-success-soft text-success">Aprobado</div>
```

### Warning State
```tsx
// ❌ WRONG
<div className="bg-amber-50 text-amber-600">Pendiente</div>

// ✅ CORRECT
<div className="bg-warning-soft text-warning">Pendiente</div>
```

### Error State
```tsx
// ❌ WRONG
<div className="bg-rose-100 text-rose-600">Rechazado</div>

// ✅ CORRECT
<div className="bg-danger-soft text-danger">Rechazado</div>
```

### Primary Action
```tsx
// ❌ WRONG (raw palette / second accent)
<button className="bg-indigo-500 hover:bg-indigo-600">Continuar</button>

// ✅ CORRECT (semantic) — pill, sentence case (see DESIGN.md §4)
<button className="bg-primary text-primary-fg hover:bg-primary-600 rounded-full">
  Continuar
</button>
```

### Secondary Text
```tsx
// ❌ WRONG
<p className="text-slate-600">Texto secundario</p>

// ✅ CORRECT (semantic)
<p className="text-fg-muted">Texto secundario</p>

// ✅ ALSO CORRECT (scale)
<p className="text-neutral-700">Texto secundario</p>
```

### Warm Ambient Surface
```tsx
// ❌ WRONG (legacy sand / raw palette)
<div className="bg-orange-50">Sección cálida</div>

// ✅ CORRECT
<div className="bg-surface-muted">Sección cálida</div>
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
| Neutral backgrounds | `neutral-*` / `bg-surface-muted` |
| Brand-tinted backgrounds | `bg-primary-soft` (`#EDF1FF`) |
| Categorical data series | supporting hues (cyan, green, amber, coral, violet, peach) |
| Text | `text-fg`, `text-fg-muted`, `text-fg-muted` |

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
- [ ] Text uses `text-fg`, `text-fg-muted`, `text-fg-muted`, or `neutral-*`
- [ ] Surfaces use `bg-surface`, `bg-surface`, `bg-surface-muted`, `bg-primary-soft`
- [ ] Borders use `border-border*`; focus ring uses cobalt `ring` / border.focus
- [ ] No hardcoded hex outside `globals.css` (SVG inline fills use approved Cadence hexes)
- [ ] Supporting hues used only for charts/categorical data
- [ ] Gradients (if used) are on hero/brand surfaces only, with grain overlay and verified contrast
