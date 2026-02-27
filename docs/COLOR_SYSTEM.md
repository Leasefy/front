# Design System - Color Usage Guide

## MANDATORY COLOR RULES

**CRITICAL: Use ONLY these colors in ALL components. NO exceptions.**

---

## Allowed Colors Reference

### Semantic Tokens (Preferred - Use These First)

| Token | Usage | Example |
|-------|-------|---------|
| `primary` | CTAs, links, focus rings, actions | `bg-primary`, `text-primary` |
| `primary-foreground` | Text on primary backgrounds | `text-primary-foreground` |
| `secondary` | Ambient surfaces (NOT for CTAs) | `bg-secondary` |
| `muted` | Subdued backgrounds | `bg-muted` |
| `muted-foreground` | Secondary text | `text-muted-foreground` |
| `foreground` | Primary text | `text-foreground` |
| `background` | Page background | `bg-background` |
| `border` | Borders | `border-border` |
| `destructive` | Error actions/buttons | `bg-destructive` |

### Color Scales (When Semantic Tokens Don't Fit)

#### Primary Actions - `indigo-*`
Use for: Buttons, links, focus states, interactive elements
```
indigo-50   - Light backgrounds for primary elements
indigo-100  - Hover backgrounds
indigo-500  - Main action color (equivalent to `primary`)
indigo-600  - Hover state
indigo-700  - Active/pressed state
indigo-900  - Text on light indigo backgrounds
```

#### Ambient/Surfaces - `sand-*`
Use for: Warm backgrounds, subtle sections, decorative (NEVER for CTAs)
```
sand-50   - Warm surface background
sand-100  - Warm muted background
sand-200  - Warm border
sand-500  - Ambient accent (NOT interactive)
```

#### Neutrals - `neutral-*`
Use for: Text, backgrounds, borders
```
neutral-0    - White (cards)
neutral-50   - Page background
neutral-100  - Subtle backgrounds
neutral-200  - Borders
neutral-400  - Tertiary text
neutral-700  - Secondary text
neutral-900  - Primary text
```

#### Success States - `success-*`
Use for: Positive feedback, approvals, completed states
```
success-50   - Light success background
success-100  - Success surface
success-500  - Success text/icons
success-700  - Success text on light backgrounds
```

#### Warning States - `warning-*`
Use for: Caution, pending, attention needed
```
warning-50   - Light warning background
warning-100  - Warning surface
warning-500  - Warning text/icons
warning-700  - Warning text on light backgrounds
```

#### Error States - `error-*`
Use for: Errors, destructive actions, critical alerts
```
error-50   - Light error background
error-100  - Error surface
error-500  - Error text/icons
error-700  - Error text on light backgrounds
```

---

## FORBIDDEN Colors

**NEVER use these in regular components:**

| Forbidden | Replacement |
|-----------|-------------|
| `emerald-*` | Use `success-*` |
| `green-*` | Use `success-*` |
| `amber-*` | Use `warning-*` |
| `yellow-*` | Use `warning-*` |
| `rose-*` | Use `error-*` |
| `red-*` | Use `error-*` |
| `teal-*` | Use `primary` or `indigo-*` |
| `cyan-*` | Use `primary` or `indigo-*` |
| `violet-*` | Use `primary` or `indigo-*` |
| `purple-*` | Use `primary` or `indigo-*` |
| `blue-*` | Use `primary` or `indigo-*` |
| `orange-*` | Use `warning-*` |
| `slate-*` | Use `neutral-*` |

**Exception:** Product pages with dark themes may use extended colors for specific brand differentiation (documented separately).

---

## Quick Reference Mappings

### Before → After

```
bg-emerald-50      → bg-success-50
bg-emerald-100     → bg-success-100
text-emerald-500   → text-success-500
text-emerald-600   → text-success-500 or text-success-700
text-emerald-700   → text-success-700
border-emerald-*   → border-success-500 or use border-border

bg-amber-50        → bg-warning-50
bg-amber-100       → bg-warning-100
text-amber-500     → text-warning-500
text-amber-600     → text-warning-500 or text-warning-700
text-amber-700     → text-warning-700
border-amber-*     → border-warning-500 or use border-border

bg-rose-50         → bg-error-50
bg-rose-100        → bg-error-100
text-rose-500      → text-error-500
text-rose-600      → text-error-500 or text-error-700
text-rose-700      → text-error-700
border-rose-*      → border-error-500 or use border-border

bg-slate-*         → bg-neutral-* (map to closest shade)
text-slate-*       → text-neutral-* or text-foreground/text-muted-foreground
```

---

## Common Patterns

### Success Badge
```tsx
// ❌ WRONG
<div className="bg-emerald-100 text-emerald-700">Aprobado</div>

// ✅ CORRECT
<div className="bg-success-50 text-success-700">Aprobado</div>
```

### Warning State
```tsx
// ❌ WRONG
<div className="bg-amber-50 text-amber-600">Pendiente</div>

// ✅ CORRECT
<div className="bg-warning-50 text-warning-700">Pendiente</div>
```

### Error State
```tsx
// ❌ WRONG
<div className="bg-rose-100 text-rose-600">Rechazado</div>

// ✅ CORRECT
<div className="bg-error-50 text-error-700">Rechazado</div>
```

### Primary Action
```tsx
// ❌ WRONG
<button className="bg-indigo-500 hover:bg-indigo-600">Click</button>

// ✅ CORRECT (semantic)
<button className="bg-primary hover:bg-primary/90">Click</button>

// ✅ ALSO CORRECT (scale)
<button className="bg-indigo-500 hover:bg-indigo-600">Click</button>
```

### Neutral Text
```tsx
// ❌ WRONG
<p className="text-slate-600">Secondary text</p>

// ✅ CORRECT (semantic)
<p className="text-muted-foreground">Secondary text</p>

// ✅ ALSO CORRECT (scale)
<p className="text-neutral-700">Secondary text</p>
```

### Warm Ambient Surface
```tsx
// ❌ WRONG
<div className="bg-orange-50">Warm section</div>

// ✅ CORRECT
<div className="bg-sand-50">Warm section</div>
```

---

## UI Illustrations / Decorative Elements

For UI illustrations inside cards (like IntroSection, AboutSection), use:

| Element | Color |
|---------|-------|
| Success/positive indicators | `success-*` |
| Warning/pending indicators | `warning-*` |
| Error/negative indicators | `error-*` |
| Primary actions/highlights | `primary` or `indigo-*` |
| Neutral backgrounds | `neutral-*` or `bg-muted` |
| Warm backgrounds | `sand-*` |
| Text | `foreground`, `muted-foreground`, or `neutral-*` |

---

## Gradient Usage

When using gradients in decorative elements:

```tsx
// ❌ WRONG - arbitrary colors
<linearGradient>
  <stop stopColor="#10B981" />  // emerald
  <stop stopColor="#F59E0B" />  // amber
</linearGradient>

// ✅ CORRECT - use CSS variables
<linearGradient>
  <stop stopColor="hsl(var(--success-500))" />
  <stop stopColor="hsl(var(--warning-500))" />
</linearGradient>

// ✅ ALSO CORRECT - use the approved hex values
<linearGradient>
  <stop stopColor="#2F7D4E" />  // success-500
  <stop stopColor="#C07A2D" />  // warning-500
</linearGradient>
```

---

## Approved Hex Values (Reference Only)

Use CSS variables/Tailwind classes when possible. Direct hex values ONLY when CSS vars aren't available (SVG inline styles):

### Primary (Indigo)
- 50: #F2F3FF
- 500: #5B5FEF (main)
- 600: #4A4FE6 (hover)
- 700: #3E41C9

### Success
- 50: #F2F7F2
- 100: #DDEBDF
- 500: #2F7D4E
- 700: #1F5A38

### Warning
- 50: #FFFBF0
- 100: #F9E8C9
- 500: #C07A2D
- 700: #8A4F1D

### Error
- 50: #FFF4F2
- 100: #FBD9D3
- 500: #C24B3A
- 700: #8E3328

### Neutral
- 0: #FFFFFF
- 50: #FAFAF9
- 200: #E7E5E4
- 400: #A8A29E
- 700: #44403C
- 900: #1C1917

### Sand (ambient only)
- 50: #FAF7F2
- 100: #F3EEE4
- 200: #E7DDCC
- 500: #B9A58A

---

## Enforcement

This document is the source of truth. All PRs should be reviewed for color compliance.

**Checklist before merge:**
- [ ] No `emerald-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `violet-*`, `purple-*`, `blue-*`, `orange-*`, `slate-*` classes used
- [ ] Success states use `success-*`
- [ ] Warning states use `warning-*`
- [ ] Error states use `error-*`
- [ ] Primary actions use `primary` or `indigo-*`
- [ ] Text uses `foreground`, `muted-foreground`, or `neutral-*`
- [ ] Backgrounds use `background`, `muted`, `sand-*`, or `neutral-*`
