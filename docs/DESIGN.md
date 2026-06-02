# Leasefy Design System

> **Read this BEFORE building or modifying any UI.** This is the source of truth for visual style, component patterns, and anti-patterns in `Leasefy/front`.
>
> Color details live in [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md) — this file references it instead of duplicating.

---

## 1. Design Principles

The aesthetic is **Synapse AI-inspired**: clean, refined, sobrio. No flashy effects. Beauty comes from typography, spacing, and intentional composition — not from gradients, glow, or visual noise.

### Always
- ✅ **Sobrio + warm**: neutral surfaces with one accent color (indigo) per moment
- ✅ **Generous whitespace** — let elements breathe; density is the enemy
- ✅ **Soft/rounded** — radius scale: 8/10/14/18/24/32px, prefer `rounded-xl` (14px) for cards/buttons
- ✅ **Subtle elevation** — `shadow-sm`/`shadow-md` for floating feel; reserve heavier shadows for modals
- ✅ **Phosphor icons only** (`@phosphor-icons/react`), named imports, weight defaults to `regular`
- ✅ **WCAG AA** — verified contrasts (see `globals.css:308-319`); ratio ≥ 4.5:1 for normal text
- ✅ **Dark mode parity** — every color/border has a `dark:` counterpart

### Never
- ❌ **No glass morphism** on content (only the `.glass` navbar class in `globals.css:745-747`)
- ❌ **No gradients on bubbles / cards / buttons** — flat surfaces with one accent
- ❌ **No heavy effects** — drop shadows beyond `shadow-xl`, neon glows, animated gradients
- ❌ **No flashy colors** in agent UI / data dashboards — keep neutral, let data speak
- ❌ **No purple-on-white** AI-generic gradients
- ❌ **No raw Tailwind colors** that bypass our scales (`bg-red-500` instead of `bg-error-500` / `bg-rose-500`)
- ❌ **No hardcoded hex** outside `globals.css` — always go through CSS vars / Tailwind tokens
- ❌ **No `font-sans` on stat numbers** — use `text-numeric` / `stat-number` (DM Mono)

---

## 2. Tokens — Quick Reference

> Full color rules: [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md). Source of truth: `src/app/globals.css`.

### Color Roles (Semantic — Prefer These)
| Token | Use For |
|---|---|
| `bg-background` / `text-foreground` | Page bg + body text |
| `bg-card` | Elevated surfaces (white in light, neutral-10 in dark) |
| `bg-primary` / `text-primary-foreground` | CTAs, focus rings, links |
| `bg-muted` / `text-muted-foreground` | Subdued bg + secondary text |
| `bg-accent` / `text-accent-foreground` | Indigo-tinted highlight (selected, hover-emphasis) |
| `border-border` / `border-input` | All borders + input outlines |
| `bg-destructive` | Destructive actions only |

### Scales (When Roles Don't Fit)
Indigo (CTA), Sand (warm ambient — NEVER for CTA), Neutral (text/bg/borders), Success / Warning / Error (sobered), plus extended: Emerald, Teal, Cyan, Violet, Purple, Amber, Orange, Blue, Rose, Slate. All scales 50→950 with `dark:` variants. Defined in `globals.css:22-203`.

### Radius (`globals.css:324-331`)
```
sm: 6px    md: 10px   lg: 14px   xl: 18px   2xl: 24px   3xl: 32px   full: 9999px
```
- **Buttons / inputs**: `rounded-xl` (14px) — `button.tsx:11`
- **Cards**: `rounded-xl` or `rounded-2xl`
- **Pills / chips**: `rounded-full`
- **Inputs (default)**: `rounded-md` (10px) — `input.tsx:11`

### Shadow (`globals.css:351-368`)
- `shadow-subtle` / `shadow-sm` → resting cards
- `shadow-elevated` / `shadow-md` → hover, dropdowns
- `shadow-premium` / `shadow-lg` → modals (small)
- `shadow-xl` / `shadow-2xl` → drawer / overlay panels
- **Glow** (`shadow-glow-*`) → ONLY for dark product/landing pages

### Spacing (4px grid)
Tailwind defaults map cleanly. Prefer multiples of 4: `gap-2 gap-3 gap-4 gap-6 gap-8`. Section vertical rhythm: `.section-padding` = `py-16 md:py-20 lg:py-24` (`globals.css:618`).

### Z-Index Scale (`globals.css:218-228`)
```
dropdown: 10    sticky: 20    fixed: 30    modal-backdrop: 40
modal: 50       popover: 60   tooltip: 70  toast: 80   max: 100
```
**Drawers, modals → `z-50`.** Toaster is forced to `9999` via inline style in `inmobiliaria/layout.tsx:92`.

### Motion (`globals.css:372-382`, `tailwind.config.ts:36-135`)
- **Durations**: `duration-150` (micro), `duration-200` (default), `duration-300` (panels), `duration-500` (slow reveals)
- **Easing**: `ease-out` (default), `cubic-bezier(0.32, 0.72, 0, 1)` (Apple-style spring for panels)
- **Named animations**: `animate-fade-in`, `animate-fade-in-up`, `animate-slide-in-right`, `animate-panel-in`, `animate-page-in`, `animate-stagger-in`, `animate-content-reveal`
- **Press feedback**: buttons use `active:scale-[0.97]` (`button.tsx:11`)
- **Hover lift**: `hover-lift` class (`globals.css:839`) — `-translate-y-0.5 shadow-elevated`

---

## 3. Typography

**3-font system** loaded via `next/font` (`src/app/layout.tsx:2-23`):

| Font | Tailwind class | Use for |
|---|---|---|
| **Manrope** | `font-heading` | All h1–h6 (auto via `globals.css:582-584`), display text |
| **DM Sans** | `font-sans` (default) | Body, paragraphs, labels, UI |
| **Space Mono** | `font-mono` | Numbers, uppercase labels, button text, stat displays |

### Utility Classes (`globals.css:649-738`)
| Class | Spec |
|---|---|
| `.text-display` | Manrope, 36→58px, extrabold, tracking -0.04em |
| `.text-h1` | Manrope, 30→48px, bold, tracking -0.03em |
| `.text-h2` | Manrope, 24→36px, bold, tracking -0.02em |
| `.text-h3` | Manrope, 20→30px, semibold |
| `.text-h4` | Manrope, 18→24px, semibold |
| `.text-body-lg` | 18px, tracking -0.02em, leading-relaxed |
| `.text-body` | 16px, leading-relaxed (default body) |
| `.text-body-sm` | 14px |
| `.text-caption` | 12px |
| `.text-overline` | **DM Mono**, 12px, uppercase, tracking-widest |
| `.text-label` | **DM Mono**, 11px, uppercase, tracking-wide |
| `.stat-number` | **DM Mono**, 48→72px, tabular-nums |
| `.text-numeric` | **DM Mono**, tabular-nums |

### Rules
- Headings (h1–h6) get Manrope automatically — don't add `font-heading`
- Numbers → always `text-numeric` or `.stat-number` (tabular alignment)
- **Any uppercase label gets `font-mono`** — overlines, button text, badges
- Body line-height: `leading-relaxed` (1.625); headings: `leading-tight` to `leading-snug`

---

## 4. Component Patterns

### Buttons (`src/components/ui/button.tsx`)

**Anatomy**: `rounded-xl`, `font-mono`, `uppercase`, `tracking-wide`, `active:scale-[0.97]`.

```tsx
<Button>Iniciar sesión</Button>                          // default = bg-primary
<Button variant="outline">Cancelar</Button>
<Button variant="secondary">Volver</Button>
<Button variant="ghost">Cerrar</Button>
<Button variant="destructive">Eliminar</Button>
<Button variant="link">Ver más</Button>
<Button size="sm" /* h-9 */ />
<Button size="lg" /* h-12, hero CTAs */ />
<Button size="icon" /* 40x40 */ />
<Button isLoading>...</Button>                            // shows SpinnerGap
<Button hideArrow>...</Button>                            // hides ArrowUpRight on default/white
```

- Default + white variants **auto-append `ArrowUpRight` icon** with hover translate
- Primary buttons are **always uppercase + tracking-wide** — this is a hard rule
- For inline ad-hoc buttons, copy the pattern (`button.tsx:11`); don't reinvent

### Inputs (`src/components/ui/input.tsx`)

```tsx
<Input placeholder="tu@email.com" />
// h-11, rounded-md, border-2 border-input, px-4, focus-visible:ring-4 ring-ring/5
```

- Tall (h-11) by default; pair with h-12 buttons for visual rhythm
- Border-2 (not 1) — heavier border is the Leasefy signature
- Focus state: ring-4 with 5% alpha — subtle but unmistakable

### Cards (`globals.css:777-814`)

| Class | When |
|---|---|
| `.card-minimal` | Resting card with subtle shadow |
| `.card-interactive` | Adds hover: lift + shadow upgrade |
| `.card-premium` | Subtle dual-shadow, lifts on hover with accent border tint |
| `.card-active` | Selected state with accent ring |

Inline pattern (most common):
```tsx
<section className="rounded-2xl border border-border bg-card p-5 space-y-4">
  ...
</section>
```

### Colored Icon Circles
The **signature visual richness** of the design. Don't drop them.
```tsx
<div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
  <Robot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
</div>
```
Color rotation by domain: indigo (AI/actions), purple (matching), emerald (approved/contract), rose (errors/rejected), slate (docs/files), amber (warnings), blue (info).

### Drawers / Side Panels

**Canonical pattern** (see `src/components/inmobiliaria/CandidateDrawer.tsx`, `src/components/ui/plan/PlanDetailSheet.tsx`):

```tsx
// 1. Pause Lenis smooth scroll while open
const lenis = useLenis();
useEffect(() => {
  if (open) lenis.stop(); else lenis.start();
  return () => lenis.start();
}, [open, lenis]);

// 2. Close on Escape
useEffect(() => { ... }, [open, onClose]);

// 3. Wait for mount before portal
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!open || !mounted) return null;

// 4. Render via portal — escapes any parent stacking context
return createPortal(
  <>
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      aria-hidden="true"
    />
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex-none ...">{/* header */}</div>
      <div
        className="flex-1 overflow-y-auto p-6 space-y-6"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {/* body */}
      </div>
    </div>
  </>,
  document.body
);
```

**Critical**: `createPortal` to `document.body` + `data-lenis-prevent` on scrollable body + `lenis.stop()` on open. Skipping any of these breaks the drawer in subtle ways (overlay not at top, scroll dead).

### Sidebar / Layout
The `PlanSidebar` + `PlanHeader` pattern (`src/components/ui/plan/`) is the canonical layout. Use them as-is for any new panel page.
- Sidebar: `lg:fixed lg:inset-y-0`, 240px wide, collapsible to 64px via `SidebarContext`
- Header: `sticky top-0 z-30 bg-white dark:bg-card border-b`
- Main content offset: `lg:pl-[240px]` (or `lg:pl-16` when collapsed)

### Banners (state-colored info blocks)
```tsx
{requiresManualReview && (
  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 p-3 flex items-start gap-2">
    <WarningCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Título</p>
      <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">Detalle</p>
    </div>
  </div>
)}
```
Color follows severity: emerald (success), blue (info), amber (warning), rose (error), purple (special).

### Score / Progress Bars (`CandidateDrawer.tsx:913-931`)
```tsx
<div className="h-1.5 bg-muted rounded-full overflow-hidden">
  <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
</div>
```
Color thresholds: ≥75 emerald, ≥50 amber, <50 rose.

### Toaster (Sonner)
Configured in `src/app/panel/inmobiliaria/layout.tsx:90-101` — `position="top-right"`, `borderRadius: 16px`, `boxShadow: 0 4px 24px rgba(0,0,0,0.08)`. Don't override per-toast.

---

## 5. Iconography

- **Library**: `@phosphor-icons/react`, named imports only
  ```ts
  import { X, Robot, Sparkle, ArrowClockwise, MagnifyingGlass } from '@phosphor-icons/react';
  ```
- **Default weight**: `regular`. Use `weight="bold"` sparingly for emphasis
- **Default size**: `w-4 h-4` (16px) inline with text, `w-5 h-5` (20px) standalone, `w-3.5 h-3.5` (14px) in chips
- **Color**: inherit (`currentColor`) — never hardcode fill
- **Pair with text** when meaning isn't obvious; use `aria-hidden="true"` when decorative beside a label
- **`flex-shrink-0`** when next to truncating text

---

## 6. Internationalization & RTL

- All strings via `useI18n()` + `t('namespace.key')` (`src/lib/i18n`)
- Default locale `es-CO`; date formatting via `toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })`
- Money via `formatCurrency()` from `@/lib/format` — formats COP correctly with thousand separators

---

## 7. Accessibility

- **Focus**: global `*:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px }` (`globals.css:592-595`) — don't override per-component
- **Skip link**: `.skip-link` (`globals.css:603-609`)
- **Modals**: `role="dialog" aria-modal="true"`, focus trap optional but Escape-to-close mandatory
- **Backdrop**: `aria-hidden="true"`
- **Icon-only buttons**: must have `aria-label` or `title`
- **Color**: never communicate state with color alone — pair with icon + text

---

## 8. Lenis Smooth Scroll

The site uses **Lenis** (Luxterra-style smooth scroll), configured in `src/components/providers/SmoothScroll.tsx`. Two rules:

1. **For any modal / drawer / overlay**: call `lenis.stop()` on open, `lenis.start()` on close + cleanup
2. **For any scrollable nested container** inside the modal/drawer: add `data-lenis-prevent` attribute + `overscrollBehavior: 'contain'`

Failure mode: wheel events get hijacked, drawer body appears frozen. Both `PlanDetailSheet` and `CandidateDrawer` follow this pattern — copy it.

---

## 9. Anti-Patterns Cheat Sheet

| ❌ Don't | ✅ Do |
|---|---|
| `bg-purple-600` raw | `bg-primary` or `bg-indigo-600` (after checking scale) |
| `#5B5FEF` hardcoded | `hsl(var(--indigo-500))` or `text-indigo-500` |
| Glass morphism on cards | Solid `bg-card` + subtle shadow |
| Gradient backgrounds on buttons | Flat color with hover state |
| `<button>Login</button>` (mixed case) | `<Button>INICIAR SESIÓN</Button>` (uppercase via component) |
| Mounting modal inline without portal | `createPortal(content, document.body)` |
| Drawer without `data-lenis-prevent` | Always add it to the scrollable body |
| `sans-serif` for stat numbers | `font-mono` / `.text-numeric` / `.stat-number` |
| Inline z-index numbers | Use `z-30 z-40 z-50` per semantic scale |
| Mixed icon libraries | Phosphor only |
| Color alone for state | Color + icon + text |

---

## 10. Brand & Landing Patterns

### 10.1 Floating Glass Navbar (Public Site)
The landing/marketing nav is a **floating pill** that sticks to the top:
```tsx
<nav className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 px-6 py-3
                rounded-full bg-white/95 backdrop-blur-md shadow-elevated border border-border/40">
  <Logo />
  <button className="px-5 py-2 rounded-full bg-muted text-foreground font-mono uppercase tracking-wide text-sm">
    PUBLICAR INMUEBLE
  </button>
  {/* nav items: font-mono uppercase tracking-wide text-sm */}
</nav>
```
- All nav items: **`font-mono uppercase tracking-wide text-sm`** (Space Mono)
- The "PUBLICAR INMUEBLE" CTA is a soft pill on muted background (not primary indigo — primary lives elsewhere)
- This is the ONLY place glass morphism is allowed (`.glass` class also acceptable for legacy)

### 10.2 Highlighted Word Treatment (Headlines)
Signature Leasefy move: a key word inside a large heading is wrapped in a colored rounded pill.
```tsx
<h1 className="text-display">
  Arrienda diferente. Arrienda{' '}
  <span className="inline-block px-4 py-1 rounded-2xl bg-indigo-500 text-white font-mono uppercase">
    SIMPLE
  </span>
</h1>
```
- The wrapped word uses **mono uppercase white-on-indigo** (or **white-on-near-black** for darker mood)
- Always the LAST/punchline word of the headline
- Padding `px-4 py-1`, radius `rounded-2xl`
- Don't use for more than one word per heading

### 10.3 Italic Display Heading (Legal / Long-Form)
```tsx
<h1 className="text-display italic font-light">Términos y condiciones</h1>
```
Reserved for: terms, privacy, legal-feel long-form. Pair with `<SectionLabel>LEGAL</SectionLabel>` above.

### 10.4 Step Cards (Landing — "Cómo funciona")
```tsx
<section className="rounded-2xl border border-border bg-card p-8 space-y-6">
  <div className="flex items-start justify-between">
    <span className="text-7xl font-light text-indigo-100 dark:text-indigo-900 font-mono leading-none">01</span>
    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
      <Buildings className="w-6 h-6 text-indigo-600" />
    </div>
  </div>
  <h3 className="text-2xl font-mono uppercase tracking-tight">SUBE TU PORTAFOLIO</h3>
  <p className="text-xs font-mono uppercase tracking-wider text-indigo-600">EN MINUTOS, NO SEMANAS</p>
  <p className="text-body-sm text-muted-foreground">Body description...</p>
</section>
```
Key moves: oversized light-color step number, icon in soft tinted rounded-square (top-right), monospace uppercase title, indigo uppercase subhead, normal body.

### 10.5 Social Proof Bar (Avatar Stack + Rating)
```tsx
<div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-black/70 backdrop-blur-sm">
  <div className="flex -space-x-2">
    {avatars.map(a => <Avatar key={a.id} size="sm" ring="default" src={a.src} />)}
  </div>
  <div className="flex items-center gap-2 text-white">
    <Stars value={4.9} />
    <span className="font-mono">4.9 <span className="opacity-70">(850+ reseñas)</span></span>
  </div>
</div>
```
Always on dark/black pill, white text, mono numerals.

### 10.6 Brand-Color Footer
The site footer is **full-bleed `bg-indigo-500`** (primary):
- All headings + links: `font-mono uppercase tracking-wide text-white`
- Body links: `text-white/80 hover:text-white`
- Subscribe input: `rounded-full bg-white/10 text-white placeholder:text-white/50` with inline white button
- Divider: `border-white/20`

This is the **only** place the primary color is used as a full background.

### 10.7 Dark Product Preview Card (Landing Mockups)
For showing UI screenshots/mockups in a "spotlight" frame:
```tsx
<div className="rounded-3xl bg-neutral-900 dark:bg-product-bg p-8 space-y-6 shadow-2xl">
  <p className="font-mono uppercase tracking-wide text-white">INQUILINOS QUE PAGAN</p>
  <p className="text-sm text-white/60">Scoring AI que predice...</p>
  {/* Circular progress, score bars, avatar — all on dark */}
</div>
```
Use the `--product-bg`, `--product-bg-elevated`, `--product-bg-subtle`, `--product-border` tokens (defined in `globals.css:209-213`).

---

## 11. State Templates (Empty / Loading / Error)

### Empty State (component: `src/components/ui/empty-state.tsx`)
```tsx
<EmptyState
  icon={MagnifyingGlass}
  title="No encontramos propiedades"
  description="Intenta ajustar los filtros para ver más opciones."
  action={{ label: 'LIMPIAR FILTROS', href: '/propiedades' }}
/>
```
- Container: `rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03]`, vertical padding `py-14 px-6 text-center`
- Icon: in muted circle, centered above title
- Title `text-foreground` semibold, description `text-muted-foreground`
- Optional CTA = primary button (uppercase via Button component)

### Error State (component: `src/components/ui/error-state.tsx`)
Used as a centered card with **rose-tinted** icon circle:
```tsx
<div className="max-w-md mx-auto rounded-2xl bg-card border border-border p-8 text-center space-y-4">
  <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
    <WarningCircle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
  </div>
  <h2 className="text-h4 font-semibold">Invitación inválida</h2>
  <p className="text-body-sm text-muted-foreground">Token de invitación inválido o faltante.</p>
</div>
```

### Loading State — Route Level
Subtle, centered:
```tsx
<div className="flex flex-col items-center justify-center min-h-screen gap-3">
  <Spinner size="md" variant="muted" />
  <p className="text-sm text-muted-foreground">Verificando acceso...</p>
</div>
```

### Loading State — Inline
```tsx
<Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
```
Skeleton class: `animate-pulse rounded-sm bg-muted` (use the `<Skeleton />` primitive at `src/components/ui/skeleton.tsx`).

### 404 (Next.js default — KEEP IT BLACK)
The 404 page is pitch black with mono "404 | This page could not be found." — leave it as-is; it's intentional brand minimalism.

---

## 12. Badge System (component: `src/components/ui/badge.tsx`)

```tsx
<Badge variant="default">Disponible</Badge>      // bg-primary (indigo-500)
<Badge variant="secondary">Borrador</Badge>
<Badge variant="destructive">Rechazado</Badge>
<Badge variant="outline">Otro</Badge>
<Badge variant="success">Aprobado</Badge>
<Badge variant="warning">En revisión</Badge>
<Badge variant="risk-a">A</Badge>                // green pill, white text
<Badge variant="risk-b">B</Badge>                // blue
<Badge variant="risk-c">C</Badge>                // amber (text-foreground)
<Badge variant="risk-d">D</Badge>                // red
```
All badges: `rounded-full px-3 py-1 text-xs font-semibold`. Risk badges use solid `bg-[hsl(var(--risk-x))]` for vibrancy.

### PlanStatusBadge (CRM-specific, `PlanStatusBadge.tsx`)
Flat, no borders, light-100 bg + dark-800 text:
- `new` → indigo-100 / indigo-800
- `in_progress` → amber-100 / amber-800
- `accepted` → emerald-100 / emerald-800
- `rejected` → red-100 / red-800
- `important` → rose-100 / rose-800
- `pending` → neutral-100 / neutral-800
- `completed` → emerald-100 / emerald-800

Use **PlanStatusBadge** in CRM/list contexts; use **Badge** with `variant="risk-*"` for tenant scoring.

---

## 13. Section Label (component: `src/components/ui/section-label.tsx`)

```tsx
<SectionLabel dotVariant="default">LEGAL</SectionLabel>
<SectionLabel dotVariant="warning">PENDIENTE</SectionLabel>
<SectionLabel dotVariant="info">INFORMACIÓN</SectionLabel>
<SectionLabel dotVariant="success">APROBADO</SectionLabel>
```
Renders: small colored dot + 12px mono uppercase tracking-wider muted text. Always above the section heading.

---

## 14. Avatar (component: `src/components/ui/avatar.tsx`)

Sizes: `xs` (24) / `sm` (32) / `default` (40) / `md` (48) / `lg` (56) / `xl` (64) / `2xl` (80).
Ring variants: `none` / `default` (bg ring) / `primary` / `success` / `warning`.

Initials fallback uses uppercase text in default size for each scale. **Always specify size** — don't rely on default for new contexts.

Avatar stacks (overlapping):
```tsx
<div className="flex -space-x-2">
  {users.map(u => <Avatar key={u.id} size="sm" ring="default" src={u.avatar} fallback={u.initials} />)}
</div>
```

---

## 15. Search & Filter Patterns

### AI Search Input (signature Leasefy pattern)
```tsx
<div className="bg-card rounded-2xl shadow-sm border border-border p-2 flex items-center gap-3">
  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
    <Sparkle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
  </div>
  <input
    type="text"
    placeholder="Describe el inmueble que buscas..."
    className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground"
  />
  <button className="w-10 h-10 rounded-xl bg-muted hover:bg-accent flex items-center justify-center">
    <ArrowUp className="w-5 h-5" />
  </button>
</div>
```
- Hint text below: `text-xs text-muted-foreground` ("Pulsa Enter para buscar")
- Sparkle icon in `weight="fill"` is the AI signature — don't use it for non-AI inputs

### Filter Pills
```tsx
<button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border bg-background hover:bg-muted text-sm">
  Ciudad
  <CaretDown className="w-3.5 h-3.5 text-muted-foreground" />
</button>
```
All filters are pills with chevron-down. Active state: `border-foreground/30 bg-muted`.

### Inline Sort Dropdown
```tsx
<button className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary">
  Recomendado <CaretDown className="w-3.5 h-3.5" />
</button>
```

---

## 16. Money & Numeric Formatting

- All COP: use `formatCurrency()` from `@/lib/format` — outputs `$2.500.000` (Colombian dot-as-thousands)
- Always pair with `/mes` or unit suffix in `text-muted-foreground text-sm`:
  ```tsx
  <p className="text-foreground"><span className="font-mono tabular-nums">$2.500.000</span>
     <span className="text-sm text-muted-foreground">/mes</span></p>
  ```
- Score values: `<span className="font-mono tabular-nums text-foreground">{score}</span><span className="text-sm text-muted-foreground">/100</span>`
- Dates: `toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })` → "11 de abril de 2026"

---

## 17. Modal vs Drawer — Two Different Layers

The codebase uses **two distinct overlay patterns** with **different z-indexes**:

| Pattern | Component | z-index | When |
|---|---|---|---|
| **Drawer (side panel)** | Custom (see `CandidateDrawer`, `PlanDetailSheet`) | `z-50` | Detail views, settings, long content with sections |
| **Dialog (centered modal)** | `<Dialog>` from `dialog.tsx` (Radix-based) | `z-[300]` | Confirmations, short forms, alerts |

⚠️ **Different z-indexes are intentional** — Dialog must sit above drawer because drawers can spawn confirmation dialogs.

### Dialog Pattern
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent /* rounded-2xl, max-w-lg, p-6, center via translate */>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter className="flex gap-2 justify-end">
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
The X close button is built-in (top-right, `absolute right-4 top-4`). Use the primitive — don't roll your own.

---

## 18. UI Primitives Inventory

Available at `src/components/ui/` — **check first before creating new components**:

| Primitive | Purpose |
|---|---|
| `accordion` | Collapsible sections (Radix) |
| `alert` / `alert-dialog` | Banners / confirm dialogs |
| `animated-counter` | Counts up on view |
| `avatar` | User avatars with size/ring variants |
| `back-button` | Standard back button |
| `badge` | Status pills (10 variants incl. risk-a/b/c/d) |
| `breadcrumb` | Navigation breadcrumbs |
| `button` | Primary primitive (8 variants, 4 sizes) |
| `card` | Card containers |
| `checkbox` | Checkbox input |
| `collapsible` | Expand/collapse |
| `dialog` | Centered modal (z-[300]) |
| `divider` / `separator` | Horizontal/vertical rules |
| `dropdown-menu` | Menu popover |
| `empty-state` | Empty list/page state |
| `error-state` | Error display card |
| `hover-card` | Hover-reveal info |
| `input` | Text input (h-11, border-2) |
| `kbd` | Keyboard shortcut display |
| `label` | Form label |
| `LockedFeatureOverlay` | Plan-gating overlay |
| `not-found` | 404 component |
| `pagination` | Page navigation |
| `popover` | Floating popover |
| `progress` | Linear progress bar |
| `scroll-area` | Custom scrollbar |
| `section-label` | Dot + uppercase mono label |
| `select` | Select dropdown |
| `sheet` | Side sheet (alternative to custom drawer) |
| `skeleton` | Loading skeleton |
| `slider` | Range input |
| `spinner` | Loading spinner (7 sizes, 6 variants) |
| `switch` | Toggle switch |
| `table` | Data table |
| `tabs` | Tab navigation |
| `textarea` | Multi-line input |
| `toast` | Sonner-based toast |
| `toggle-group` | Toggle button group |
| `tooltip` | Hover tooltip |
| `visually-hidden` | Screen-reader-only |

And `src/components/ui/plan/` (CRM-specific): `PlanActivityTimeline`, `PlanDetailSheet`, `PlanHeader`, `PlanProgressBar`, `PlanSidebar`, `PlanStatsCard`, `PlanStatusBadge`, `PlanTable`, `PlanTabs`, `SubscriptionBadge`.

---

## 19. When in Doubt

1. Find a similar component already in the codebase — copy its pattern
2. Canonical references for common needs:
   - **Drawer**: `src/components/inmobiliaria/CandidateDrawer.tsx`, `src/components/ui/plan/PlanDetailSheet.tsx`
   - **Form**: `src/components/auth/AuthForm.tsx`
   - **Layout**: `src/app/panel/inmobiliaria/layout.tsx` + `src/components/ui/plan/PlanSidebar.tsx` + `PlanHeader.tsx`
   - **Button**: `src/components/ui/button.tsx`
   - **Banner**: `CandidateDrawer.tsx:578-592` (manual review banner)
3. If still unsure, ask before inventing.

---

*Last updated: 2026-05-12. Update this doc when patterns change — don't let it drift.*
