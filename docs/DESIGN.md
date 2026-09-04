# Leasefy Design System — Cadence

> **Read this BEFORE building or modifying any UI.** This is the source of truth for visual style,
> component patterns, and anti-patterns in `Leasefy/front`.
>
> This app now uses the **Cadence design system**, consumed via the shared **`@leasefy/cadence`**
> Tailwind preset and the CSS variables in `src/app/globals.css` (already migrated to Cadence). The
> canonical reference is
> [`cadence/reference/Cadence Design System.dc.html`](../../cadence/reference/Cadence%20Design%20System.dc.html).
>
> Color details live in [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md) — this file references it instead of duplicating.

---

## 1. Design Principles

Cadence is **editorial, warm, and refined**. Beauty comes from typography, generous whitespace, and a
single confident accent — **cobalt `#1A40FF`** on a warm-neutral foundation. Display and body text are
**Schibsted Grotesk**; every number, label, eyebrow, code, and ID is **JetBrains Mono**.

### Always
- ✅ **Warm neutral + one cobalt accent** — warm off-white surfaces, warm ink, a single accent per moment
- ✅ **Generous whitespace** — editorial rhythm on a 4-pt scale; density is the enemy
- ✅ **Soft, distinct radii** — scale `8 / 14 / 22 / 32 / 999`; **cards ≈ 22 (`rounded-lg`)**, **buttons are full pills (`rounded-full`, radius 999)**
- ✅ **Whisper-soft elevation** — `flat` / `shadow-sm` / `shadow-md` for floating feel; reserve `shadow-lg` for overlays
- ✅ **Schibsted Grotesk for text, JetBrains Mono for all numerals/labels** — tabular numbers by default
- ✅ **Phosphor icons only** (`@phosphor-icons/react`), `Regular` default / `Fill` for active
- ✅ **WCAG AA** — verified contrasts; ratio ≥ 4.5:1 for normal text
- ✅ **Warm-dark parity** — every role token has a warm `dark:` counterpart (see `COLOR_SYSTEM.md`)
- ✅ **Brand gradients on hero/brand surfaces** — Aurora / Spectrum / Dusk / Daylight, always with grain overlay

### Never
- ❌ **No glass morphism on content** (only the floating public navbar may use it — §10.1)
- ❌ **No second accent** — cobalt is the only brand hue; supporting hues are for charts only
- ❌ **No uppercase button labels** — button text is **sentence case** (eyebrows/labels stay mono uppercase)
- ❌ **No raw framework palette colors** that bypass the Cadence preset (`bg-blue-500` instead of `bg-primary`)
- ❌ **No hardcoded hex** outside `globals.css` — always go through CSS vars / Cadence tokens
- ❌ **No `font-sans` on numerals** — numbers use `font-mono` (JetBrains Mono), tabular
- ❌ **No neon glow / heavy drop shadows** beyond `shadow-lg`; keep elevation whisper-soft
- ❌ **No gradients on cards, buttons, or data UI** — gradients are for hero/brand surfaces only

> **Reversed from the old Manus/Leasefy-UI rules:** gradients are now **encouraged** on hero/brand
> surfaces, and primary buttons are now **pill-shaped + sentence case** (no longer uppercase).

---

## 2. Tokens — Quick Reference

> Full color rules: [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md). Source of truth: `@leasefy/cadence` preset
> + `src/app/globals.css`.

### Color Roles (Semantic — Prefer These)

> ⚠️ **Esta tabla se corrigió el 2026-08-09 contra el preset real.** La versión
> anterior listaba seis tokens que **no existen** (`surface-raised`, `surface-sunken`,
> `surface-brand`, `on-primary`, `fg-secondary`, `border-subtle`). Tailwind no falla
> con una clase que no conoce: **no emite regla y el elemento queda transparente**.
> Así es como `bg-surface-brand` dejó 29 pantallas con el avatar sin fondo.
>
> Para verificar uno: `node -e "console.log(Object.keys(require('./node_modules/@leasefy/cadence/tailwind-preset.cjs').theme.extend.colors))"`
> — o medilo en el navegador con `getComputedStyle`, que es lo único que no miente.

| Token | Use For |
|---|---|
| `bg-surface` / `text-fg` | Elevated surface (white) + body text (`#14130F`) |
| `bg-bg` | Page background del panel (`#FBFAF9`) |
| `bg-surface-muted` | Wells, insets, subtle sections (`#F4F2EF`) |
| `bg-surface-hover` / `bg-surface-pressed` / `bg-surface-selected` | Estados de fila/celda |
| `bg-primary` / `text-primary-fg` | CTAs, focus rings, selected states (cobalt `#1A40FF`) |
| `bg-primary-soft` | Cobalt-tinted highlight (`#EDF1FF`) — selected, hover-emphasis |
| `text-fg-muted` / `text-fg-subtle` | Secondary (`#6E6A63`) / faintest (`#726E68`) text |
| `border-border` / `border-border-faint` / `border-border-strong` | Default (`#E5E2DC`) / hairline (`#ECEAE6`) / énfasis |
| `text-danger` / `bg-danger-soft` | Destructive / error states |

> ⚠️ **Esta tabla se corrigió el 2026-08-07 contra el CSS realmente generado.** Los nombres que
> listaba antes —`bg-surface-raised`, `bg-surface-sunken`, `bg-surface-brand`, `text-fg-secondary`,
> `border-border-subtle`, `text-error`, `bg-error-bg`— **no existen en este repo**. Los valores hex sí
> eran correctos: lo que estaba una generación atrás eran los nombres.
>
> Una clase de Tailwind inexistente no falla: simplemente no genera nada. `tsc`, `lint` y `next build`
> pasan en verde y el elemento hereda lo que haya. En el fondo por defecto muchas veces *se ve bien*,
> y por eso esto sobrevivió tanto.
>
> **La trampa peor:** `text-fg-muted` existe en los dos vocabularios con valores distintos. Acá es el
> gris **más fuerte** (`#6E6A63`); el más tenue es `text-fg-subtle` (`#726E68`). Quien venga del doc
> viejo va a elegir el contrario del que quiere.
>
> **Para verificar si un token existe, preguntale al preset** — no lo cuentes con grep (el uso alto
> no prueba que exista; el uso cero no prueba que no) ni lo midas en el navegador (Tailwind sólo
> emite las clases que encuentra en el código, así que una clase válida pero sin usar se ve idéntica
> a una inexistente):
>
> ```bash
> node -e "const p=require('@leasefy/cadence/tailwind-preset');
>   const c=(p.default||p).theme.extend.colors;
>   const f=[];(function w(o,k){for(const[a,b]of Object.entries(o)){const n=k?k+'-'+a:a;
>     b&&typeof b==='object'?w(b,n):f.push(n.replace(/-DEFAULT\$/,''))}})(c,'');
>   console.log(f.includes(process.argv[1])?'existe':'NO existe')" surface-raised
> ```
>
> Y ojo con lo que define `tailwind.config.ts` encima del preset: ahí `error` es una escala numérica
> (`error-50/100/500/700`), no un par `bg`/`fg` — otra razón por la que `bg-error-bg` nunca funcionó.

### Feedback (los cuatro tonos)
| Tinte | Texto |
|---|---|
| `bg-success-soft` (`#E8F4EA`) | `text-success` (`#307E57`) |
| `bg-warning-soft` (`#FBF1DD`) | `text-warning` (`#BF752B`) |
| `bg-danger-soft` (`#FBE9E6`) | `text-danger` (`#C0392B`) |
| `bg-info-soft` (`#E6F0FA`) | `text-info` (`#3C83F6`) |

El sufijo es **`-soft`**, no `-bg`, y el texto va **sin sufijo**, no `-fg`.

⚠️ **Tailwind no puede aplicar opacidad a estos tokens.** Resuelven a un `var()` con color literal (no
formato de canales), así que `bg-danger-soft/70` **no se genera** y el hover queda muerto. Usá
`hover:opacity-*`.

### Scales (When Roles Don't Fit)
Primary cobalt (`primary-50…700`), warm Neutral (`neutral-50…950`), and feedback (`success` / `warning`
/ `danger` / `info`, each with a `-soft` tint). Supporting hues (cyan, green, amber, coral, violet,
peach) are for charts/categorical data only. All resolve through CSS variables with warm-dark
counterparts.

### Radius
```
sm: 8px    md: 14px   lg: 22px   xl: 32px   pill/full: 999px
```
⚠️ Cadence **remapea toda la escala** de Tailwind: acá `rounded-lg` son 22px, no los 8px de siempre, y
`rounded` son 4px. Markup copiado de otro proyecto Tailwind sale con las esquinas infladas. Para un
pozo o una caja chica, `rounded-sm` (8px) es el equivalente al `rounded-lg` de un repo normal.
- **Buttons / inputs (action)**: `rounded-full` (pill, radius 999)
- **Cards**: `rounded-lg` (≈ 22px)
- **Pills / chips / badges**: `rounded-full`
- **Text inputs / small controls**: `rounded-md` (14px)
- **Hero / large feature panels**: `rounded-xl` (32px)

### Elevation (whisper-soft)
```
flat   1px border, no shadow                         → resting cards, inputs
sm     0 1px 2px rgba(20,19,15,.06)                  → raised cards, chips
md     0 4px 16px rgba(20,19,15,.08)                 → hover, dropdowns, popovers
lg     0 12px 36px rgba(20,19,15,.12)                → modals, drawers, overlays
```
No `shadow-xl`/neon. Brand gradients carry their own grain overlay, not a glow.

### Spacing (4-pt scale)
```
xs 4    sm 8    md 12   lg 16   xl 24   2xl 32   3xl 48   4xl 64   5xl 96
```
Prefer these steps for gap/padding/margins. Section vertical rhythm is generous — `2xl`→`4xl` between
major blocks. Let elements breathe.

### Z-Index Scale
```
dropdown: 10    sticky: 20    fixed: 30    modal-backdrop: 40
modal: 50       popover: 60   tooltip: 70  toast: 80   max: 100
```
**Drawers, modals → `z-50`.** Toaster sits above everything.

### Motion
- **Durations**: `150ms` (micro), `200ms` (default), `300ms` (panels), `500ms` (slow reveals)
- **Easing**: `ease-out` (default), `cubic-bezier(0.32, 0.72, 0, 1)` (spring for panels)
- **Press feedback**: interactive controls use a subtle `active:scale-[0.98]`
- **Hover lift**: `-translate-y-0.5` + upgrade to `shadow-md`

---

## 3. Typography

**2-font system** loaded via `next/font` in `src/app/layout.tsx`:

| Font | Tailwind class | Use for |
|---|---|---|
| **Schibsted Grotesk** | `font-sans` (default) | All display + headings (h1–h6) + body, paragraphs, UI labels |
| **JetBrains Mono** | `font-mono` | **All numerals**, labels, eyebrows, code, IDs, technical data — tabular by default |

### Type Roles
| Role | Size / Line | Tracking | Weight | Font |
|---|---|---|---|---|
| `.text-display` | 64 / 68 | −3.5% | 600 | Schibsted |
| `.text-h1` | 32 / 38 | −2.5% | 600 | Schibsted |
| `.text-h2` | 22 / 28 | −1.5% | 600 | Schibsted |
| `.text-subtitle` | 18 / 26 | −1% | 500 | Schibsted |
| `.text-overline` | 12 (uppercase) | tracking-widest | 400 | **Mono** |
| `.text-body-lg` | 18 / 27 | — | 400 | Schibsted |
| `.text-body` | 16 / 25 | — | 400 | Schibsted |
| `.text-body-sm` | 14 / 21 | — | 400 | Schibsted |
| `.text-caption` | 13 / 19 | — | 400 | Schibsted |
| `.text-label` | 11 (uppercase) | tracking-wide | 400 | **Mono** |
| `.text-numeric` / `.stat-number` | tabular | — | 500 | **Mono** |

> Corregido el 2026-08-07 contra `globals.css`: la fila del eyebrow decía `.text-eyebrow` y la del
> título `.text-title`, y **ninguna de las dos clase existe** (cero usos en el código). El overline es
> `.text-overline`; para el título usá `.text-h2`. `.text-label` son 11px, no 14.

### Rules
- Headings (h1–h6) use Schibsted Grotesk (`font-sans`) with the role's negative tracking — don't add a separate heading font.
- **Numbers → always `font-mono` / `.text-numeric` / `.stat-number`** (JetBrains Mono, `tabular-nums`).
- **Eyebrows, labels, overlines → mono UPPERCASE** with +10% tracking.
- **Button labels → sentence case** in Schibsted Grotesk medium (NOT mono, NOT uppercase). This reverses the old Manus rule.
- Body line-height follows the role table (≈ 1.5–1.55); display/headings are tight via negative tracking.

---

## 4. Component Patterns

### Buttons (`src/components/ui/button.tsx`)

**Anatomy**: `rounded-full` (pill), `font-sans` (Schibsted Grotesk) **medium**, **sentence case**, `active:scale-[0.98]`.

```tsx
<Button>Iniciar sesión</Button>                          // default = bg-primary, white text
<Button variant="secondary">Volver</Button>              // surface + hairline border
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Cerrar</Button>
<Button variant="destructive">Eliminar</Button>          // text-danger / error fill
<Button variant="link">Ver más</Button>
<Button size="sm" />
<Button size="lg" /* hero CTAs */ />
<Button size="icon" />
<Button isLoading>...</Button>                            // shows Phosphor spinner
```

- **Primary**: cobalt `#1A40FF` background, white text; **hover `#1533D6`** (`primary-600`); pill radius.
- **Secondary**: `bg-surface` (white/surface) with a hairline `border-border`, pill radius.
- Button labels are **sentence case** — this **reverses** the old "always uppercase + tracking-wide" rule.
- Eyebrows / overlines / section labels remain **mono uppercase** — but those are not buttons.
- For inline ad-hoc buttons, copy the primitive's pattern; don't reinvent.

### Inputs (`src/components/ui/input.tsx`)

```tsx
<Input placeholder="tu@email.com" />
// h-11, rounded-md (14px), border border-border, px-4, focus: ring-2 ring-[#1A40FF]
```

- Comfortable height (h-11); pair with `size="lg"` buttons for visual rhythm.
- **Hairline border** (`border-border`, 1px) — Cadence is restrained, not heavy-bordered.
- Focus state: cobalt ring (border.focus `#1A40FF`) — quiet but unmistakable.

### Cards (`globals.css` card utilities)

| Class | When |
|---|---|
| `.card` | Resting card — `bg-surface`, `border-border`, `rounded-lg`, `shadow-sm` |
| `.card-interactive` | Adds hover: lift + `shadow-md` |
| `.card-brand` | Cobalt-tinted (`bg-primary-soft`) feature card |
| `.card-active` | Selected state with cobalt ring |

Inline pattern (most common):
```tsx
<section className="rounded-lg border border-border bg-surface p-6 space-y-4 shadow-sm">
  ...
</section>
```

### Tinted Icon Tiles
A restrained accent moment — **cobalt by default**, supporting hues only for true categories.
```tsx
<div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center">
  <Robot className="w-5 h-5 text-primary" />
</div>
```
Default to `bg-primary-soft` + `text-primary` (cobalt). For categorical/chart contexts only, the
supporting hues (cyan, green, amber, coral, violet, peach) may tile — but never as a rainbow of UI chrome.

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
      className="fixed inset-0 z-50 bg-[#14130F]/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      aria-hidden="true"
    />
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-surface shadow-lg flex flex-col animate-in slide-in-from-right duration-300"
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

**Critical**: `createPortal` to `document.body` + `data-lenis-prevent` on the scrollable body +
`lenis.stop()` on open. Skipping any of these breaks the drawer in subtle ways (overlay not at top,
scroll dead). Overlay scrim uses warm ink (`#14130F`) at 40%, not pure black.

### Sidebar / Layout
The `PlanSidebar` + `PlanHeader` pattern (`src/components/ui/plan/`) is the canonical layout. Use as-is.
- **Unified shell background:** sidebar, page body, and header all share the cadence page bg
  `--bg` (`#FBFAF9` light / `#141310` dark). Separation comes from hairline borders (`border-r` /
  `border-b`), not a bg-color step. Cards/KPIs sit on `bg-surface` for elevation against
  the shell. Body is driven by `--plan-page-bg` (kept = `--bg` in both modes: `#FBFAF9` / `#141310`);
  header uses `bg-bg` (no `dark:` override, so it follows `--bg`).
- Sidebar: `lg:fixed lg:inset-y-0`, 240px wide, collapsible to 64px via `SidebarContext`
- Header: `sticky top-0 z-30 bg-bg border-b border-border`
- Main content offset: `lg:pl-[240px]` (or `lg:pl-16` when collapsed)

### Banners (state-colored info blocks)
```tsx
{requiresManualReview && (
  <div className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2">
    <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-danger">Título</p>
      <p className="text-body-sm text-fg-muted mt-0.5">Detalle</p>
    </div>
  </div>
)}
```
Color follows severity via feedback tokens: `success` (positive), `info` (info), `warning` (caution),
`error` (error). Use the `*-bg` tint as background and `*-fg` as text/icon.

### Score / Progress Bars
```tsx
<div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
  <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
</div>
```
Color thresholds: ≥75 `bg-success`, ≥50 `bg-warning`, <50 `bg-danger`.

### Toaster (Sonner)
**Hay UN solo `<Toaster>` en toda la app y vive en el layout raíz**
(`src/app/layout.tsx`), dentro de `ThemeProvider` y **fuera de `AuthProvider` y de todo
guard** — `position="top-right"`, `borderRadius: 22px` (`rounded-lg`),
`boxShadow: 0 4px 16px rgba(20,19,15,.08)` (`shadow-md`). Don't override per-toast.

⚠️ **No montes un `<Toaster>` en un layout de sección.** Dos reglas, las dos medidas:
- Sonner pinta cada toast en **todos** los `<Toaster>` montados ⇒ un segundo Toaster
  **duplica** cada toast en pantalla.
- Un Toaster dentro de `<ProtectedRoute>` / `<AgencySubscriptionGuard>` sólo existe
  después de que el guard deja pasar: todo `toast()` emitido antes se pierde en silencio.

Antes vivía en 4 layouts de sección (panel/inmobiliaria, panel/(landlord), inquilino,
onboarding), así que `toast()` desde el resto del árbol — `/auth/mfa-verify`, `/avaluo`,
`/propiedades`, la landing y el propio `auth-context` — no pintaba nada.

---

## 5. Iconography

- **Library**: `@phosphor-icons/react`, named imports only
  ```ts
  import { X, Robot, Sparkle, ArrowClockwise, MagnifyingGlass } from '@phosphor-icons/react';
  ```
- **SVG spec**: `viewBox="0 0 256 256"`, fill `currentColor` — Phosphor's native grid
- **Weight**: `Regular` default; **`Fill` for active/selected** states. Use `Bold` sparingly for emphasis
- **Sizes**: `16` (inline with text), `20` (standalone), `24` (feature/header). Map to `w-4 h-4` / `w-5 h-5` / `w-6 h-6`
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

- **Focus**: global `*:focus-visible { outline: 2px solid #1A40FF; outline-offset: 2px }` (cobalt, border.focus) — don't override per-component
- **Skip link**: `.skip-link` utility
- **Modals**: `role="dialog" aria-modal="true"`, focus trap optional but Escape-to-close mandatory
- **Backdrop**: `aria-hidden="true"`
- **Icon-only buttons**: must have `aria-label` or `title`
- **Color**: never communicate state with color alone — pair with icon + text
- **Gradients**: verify text contrast ≥ 4.5:1 against the lightest stop of any brand gradient

---

## 8. Lenis Smooth Scroll

The site uses **Lenis** smooth scroll, configured in `src/components/providers/SmoothScroll.tsx`. Two rules:

1. **For any modal / drawer / overlay**: call `lenis.stop()` on open, `lenis.start()` on close + cleanup
2. **For any scrollable nested container** inside the modal/drawer: add `data-lenis-prevent` + `overscrollBehavior: 'contain'`

Failure mode: wheel events get hijacked, drawer body appears frozen. Both `PlanDetailSheet` and
`CandidateDrawer` follow this pattern — copy it.

---

## 9. Anti-Patterns Cheat Sheet

| ❌ Don't | ✅ Do |
|---|---|
| `bg-blue-600` / `bg-indigo-600` raw | `bg-primary` (cobalt `#1A40FF`) |
| `#5B5FEF` / "electric blue" hardcoded | `text-primary` / `var(--primary)` (`#1A40FF`) |
| Second brand accent | One cobalt accent; supporting hues for charts only |
| Glass morphism on cards | Solid `bg-surface` + whisper `shadow-sm` |
| **Uppercase button labels** | **Sentence case** in Schibsted Grotesk medium |
| `rounded-xl` buttons | `rounded-full` pills (radius 999) |
| `font-sans` on stat numbers | `font-mono` / `.text-numeric` / `.stat-number` (JetBrains Mono) |
| Heavy `shadow-xl` / neon glow | Whisper elevation (`flat`/`sm`/`md`, max `lg`) |
| Gradients on cards/buttons | Gradients on hero/brand surfaces only (with grain) |
| Mounting modal inline without portal | `createPortal(content, document.body)` |
| Drawer without `data-lenis-prevent` | Always add it to the scrollable body |
| Inline z-index numbers | Use `z-30 z-40 z-50` per semantic scale |
| Mixed icon libraries | Phosphor only (`viewBox 0 0 256 256`) |
| Color alone for state | Color + icon + text |

> **Reversed from the old system:** uppercase buttons and "no gradients" are no longer rules — buttons
> are sentence-case pills, and brand gradients are encouraged on hero surfaces.

---

## 10. Brand & Landing Patterns

### 10.1 Floating Navbar (Public Site)
The landing/marketing nav is a **floating pill** that sticks to the top:
```tsx
<nav className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 px-6 py-3
                rounded-full bg-surface/95 backdrop-blur-md shadow-md border border-border-faint">
  <Logo />
  <button className="px-5 py-2 rounded-full bg-surface-muted text-fg font-sans text-sm">
    Publicar inmueble
  </button>
  {/* nav links: font-sans, sentence case, text-sm; eyebrow/utility labels may be mono uppercase */}
</nav>
```
- Nav links: **Schibsted Grotesk (`font-sans`), sentence case** — not uppercase.
- The "Publicar inmueble" CTA is a soft pill on a sunken surface (cobalt primary lives elsewhere).
- This is the ONLY place glass/backdrop-blur on chrome is allowed.

### 10.2 Highlighted Word Treatment (Headlines)
A signature move: a key word inside a large heading wrapped in a cobalt rounded pill.
```tsx
<h1 className="text-display">
  Arrienda diferente. Arrienda{' '}
  <span className="inline-block px-4 py-1 rounded-lg bg-primary text-primary-fg">
    simple
  </span>
</h1>
```
- The wrapped word stays in **Schibsted Grotesk, sentence case** (display type — not mono, not uppercase).
- White-on-cobalt (or white-on-warm-ink for a darker mood).
- Always the LAST/punchline word; one word per heading. Padding `px-4 py-1`, radius `rounded-lg`.

### 10.3 Italic Display Heading (Legal / Long-Form)
```tsx
<h1 className="text-display italic font-light">Términos y condiciones</h1>
```
Reserved for terms, privacy, legal long-form. Pair with `<SectionLabel>Legal</SectionLabel>` above.

### 10.4 Step Cards (Landing — "Cómo funciona")
```tsx
<section className="rounded-lg border border-border bg-surface p-8 space-y-6 shadow-sm">
  <div className="flex items-start justify-between">
    <span className="text-7xl font-mono font-light text-primary-100 leading-none tabular-nums">01</span>
    <div className="w-12 h-12 rounded-md bg-primary-soft flex items-center justify-center">
      <Buildings className="w-6 h-6 text-primary" />
    </div>
  </div>
  <h3 className="text-h2">Sube tu portafolio</h3>
  <p className="text-overline text-primary">En minutos, no semanas</p>
  <p className="text-body-sm text-fg-muted">Body description...</p>
</section>
```
Key moves: oversized **mono** light-cobalt step number (tabular), icon in a `surface-brand` tile,
**Schibsted sentence-case title**, mono-uppercase cobalt eyebrow, normal body.

### 10.5 Social Proof Bar (Avatar Stack + Rating)
```tsx
<div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-surface-inverse/80 backdrop-blur-sm">
  <div className="flex -space-x-2">
    {avatars.map(a => <Avatar key={a.id} size="sm" ring="default" src={a.src} />)}
  </div>
  <div className="flex items-center gap-2 text-white">
    <Stars value={4.9} />
    <span className="font-mono tabular-nums">4.9 <span className="opacity-70">(850+ reseñas)</span></span>
  </div>
</div>
```
On a warm-ink (`surface-inverse`) pill, white text, **mono** numerals.

### 10.6 Brand Gradient Hero / Footer
Heroes and the footer may use a **brand gradient** (Aurora / Spectrum / Dusk / Daylight) with a grain
overlay — this **reverses** the old "footer is flat indigo / no gradients" rule:
```tsx
<footer className="gradient-aurora gradient-grain text-white rounded-xl p-12">
  {/* headings + links: font-sans, sentence case, text-white */}
  {/* body links: text-white/80 hover:text-white */}
  {/* subscribe input: rounded-full bg-white/10 text-white placeholder:text-white/60 */}
  {/* divider: border-white/20 */}
</footer>
```
- One gradient per surface; never on cards/buttons/data UI.
- For a flat alternative, a full-bleed `bg-primary` (cobalt) footer is also acceptable.
- Verify white-text contrast against the lightest gradient stop.

### 10.7 Dark Spotlight Card (Landing Mockups)
For showing UI screenshots/mockups in a "spotlight" frame:
```tsx
<div className="rounded-xl bg-surface-inverse p-8 space-y-6 shadow-lg">
  <p className="text-overline text-white/80">Inquilinos que pagan</p>
  <p className="text-body-sm text-white/60">Scoring AI que predice...</p>
  {/* Circular progress, score bars, avatar — all on warm-dark */}
</div>
```
Use the warm-dark surface (`surface.inverse` `#14130F` / raised `#1C1A16`, border `#312E27`); cobalt
accent unchanged.

---

## 11. State Templates (Empty / Loading / Error)

### Empty State (component: `src/components/ui/empty-state.tsx`)
```tsx
<EmptyState
  icon={MagnifyingGlass}
  title="No encontramos propiedades"
  description="Intenta ajustar los filtros para ver más opciones."
  action={{ label: 'Limpiar filtros', href: '/propiedades' }}
/>
```
- Container: `rounded-lg bg-surface-muted`, vertical padding `py-14 px-6 text-center`
- Icon: in a **grey circle** (`rounded-full bg-surface-muted text-fg-muted`), centered above the title. Never a gradient tile and never a square (Nico, 2026-09-03: «todo en grises y siempre encerrado en círculos»)
- Title `text-fg` (h2/title), description `text-fg-muted`
- Optional CTA = primary pill button (sentence case)

### Error State (component: `src/components/ui/error-state.tsx`)
Centered card with an **error-tinted** icon circle:
```tsx
<div className="max-w-md mx-auto rounded-lg bg-surface border border-border p-8 text-center space-y-4 shadow-sm">
  <div className="w-14 h-14 mx-auto rounded-full bg-danger-soft flex items-center justify-center">
    <WarningCircle className="w-7 h-7 text-danger" />
  </div>
  <h2 className="text-h2">Invitación inválida</h2>
  <p className="text-body-sm text-fg-muted">Token de invitación inválido o faltante.</p>
</div>
```

### Loading State — Route Level
```tsx
<div className="flex flex-col items-center justify-center min-h-screen gap-3">
  <Spinner size="md" variant="muted" />
  <p className="text-body-sm text-fg-muted">Verificando acceso...</p>
</div>
```

### Loading State — Inline
```tsx
<Spinner className="w-5 h-5 animate-spin text-fg-muted" />
```
Skeleton class: `animate-pulse rounded-md bg-surface-muted` (use the `<Skeleton />` primitive at
`src/components/ui/skeleton.tsx`).

### 404 (Next.js default — KEEP IT DARK)
The 404 page is warm-ink (`surface.inverse`) with **JetBrains Mono** "404 | This page could not be
found." — leave it as-is; it's intentional brand minimalism.

---

## 12. Badge System (component: `src/components/ui/badge.tsx`)

```tsx
<Badge variant="default">Disponible</Badge>      // bg-primary-soft, text-primary
<Badge variant="secondary">Borrador</Badge>      // bg-surface-muted, text-fg-muted
<Badge variant="destructive">Rechazado</Badge>   // bg-danger-soft, text-danger
<Badge variant="outline">Otro</Badge>            // hairline border
<Badge variant="success">Aprobado</Badge>        // bg-success-soft, text-success
<Badge variant="warning">En revisión</Badge>     // bg-warning-soft, text-warning
<Badge variant="risk-a">A</Badge>                // success
<Badge variant="risk-b">B</Badge>                // info
<Badge variant="risk-c">C</Badge>                // warning
<Badge variant="risk-d">D</Badge>                // error
```
All badges: `rounded-full px-3 py-1`, label in **`font-mono` (JetBrains Mono)** medium — labels/IDs are
mono. Risk badges use the feedback tokens (A→success, B→info, C→warning, D→error) for legibility.

### PlanStatusBadge (CRM-specific, `PlanStatusBadge.tsx`)
Flat, no borders, `*-bg` tint + `*-fg` text:
- `new` → `bg-primary-soft` / `text-primary`
- `in_progress` → `bg-warning-soft` / `text-warning`
- `accepted` → `bg-success-soft` / `text-success`
- `rejected` → `bg-danger-soft` / `text-danger`
- `important` → `bg-danger-soft` / `text-danger`
- `pending` → `bg-surface-muted` / `text-fg-muted`
- `completed` → `bg-success-soft` / `text-success`

Use **PlanStatusBadge** in CRM/list contexts; use **Badge** with `variant="risk-*"` for tenant scoring.

---

## 13. Section Label (component: `src/components/ui/section-label.tsx`)

```tsx
<SectionLabel dotVariant="default">Legal</SectionLabel>
<SectionLabel dotVariant="warning">Pendiente</SectionLabel>
<SectionLabel dotVariant="info">Información</SectionLabel>
<SectionLabel dotVariant="success">Aprobado</SectionLabel>
```
Renders: a small colored dot + the **eyebrow** style (12px **mono UPPERCASE**, +10% tracking, `text-fg-muted`).
The component uppercases the label — author it in sentence case. Always sits above the section heading.

---

## 14. Avatar (component: `src/components/ui/avatar.tsx`)

Sizes: `xs` (24) / `sm` (32) / `default` (40) / `md` (48) / `lg` (56) / `xl` (64) / `2xl` (80).
Ring variants: `none` / `default` (subtle ring) / `primary` (cobalt) / `success` / `warning`.

Initials fallback uses uppercase text per scale, in **JetBrains Mono**. **Always specify size** — don't
rely on default for new contexts.

Avatar stacks (overlapping):
```tsx
<div className="flex -space-x-2">
  {users.map(u => <Avatar key={u.id} size="sm" ring="default" src={u.avatar} fallback={u.initials} />)}
</div>
```

---

## 15. Search & Filter Patterns

### AI Search Input (signature pattern)
```tsx
<div className="bg-surface rounded-lg shadow-sm border border-border p-2 flex items-center gap-3">
  <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
    <Sparkle className="w-5 h-5 text-primary" weight="fill" />
  </div>
  <input
    type="text"
    placeholder="Describe el inmueble que buscas..."
    className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-fg-muted"
  />
  <button className="w-10 h-10 rounded-full bg-surface-muted hover:bg-primary-soft flex items-center justify-center">
    <ArrowUp className="w-5 h-5 text-fg" />
  </button>
</div>
```
- Hint text below: `text-caption text-fg-muted` ("Pulsa Enter para buscar")
- `Sparkle` in `weight="fill"` is the AI signature — don't use it for non-AI inputs.

### Filter Pills
```tsx
<button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border bg-surface hover:bg-surface-muted text-sm">
  Ciudad
  <CaretDown className="w-3.5 h-3.5 text-fg-muted" />
</button>
```
All filters are pills with chevron-down. Active state: `border-border-strong bg-surface-muted`.

### Inline Sort Dropdown
```tsx
<button className="inline-flex items-center gap-1.5 text-sm text-fg hover:text-primary">
  Recomendado <CaretDown className="w-3.5 h-3.5" />
</button>
```

---

## 16. Money & Numeric Formatting

- All COP: use `formatCurrency()` from `@/lib/format` — outputs `$2.500.000` (Colombian dot-as-thousands)
- Numerals are **JetBrains Mono, tabular** — pair with a unit suffix in `text-fg-muted text-sm`:
  ```tsx
  <p className="text-fg"><span className="font-mono tabular-nums">$2.500.000</span>
     <span className="text-sm text-fg-muted">/mes</span></p>
  ```
- Score values: `<span className="font-mono tabular-nums text-fg">{score}</span><span className="text-sm text-fg-muted">/100</span>`
- Dates: `toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })` → "11 de abril de 2026"

---

## 17. Modal vs Drawer — Two Different Layers

Two overlay patterns plus the floating-content layer that must sit above them:

| Pattern | Component | z-index | When |
|---|---|---|---|
| **Drawer / Sheet (side panel)** | `<Sheet>` / `<Drawer>` primitives (`sheet.tsx`, `drawer.tsx`) | `z-[300]` | Detail views, settings, long sectioned content |
| **Dialog (centered modal)** | `<Dialog>` / `<AlertDialog>` (`dialog.tsx`, Radix-based) | `z-[300]` | Confirmations, short forms, alerts |
| **Floating-in-modal** | `Select` / `DropdownMenu` / `Popover` / `Tooltip` / `HoverCard` content | `z-[400]` | Any Radix popover opened *inside* a modal/drawer |

⚠️ **Overlay stack: modal/drawer `z-[300]` < floating content `z-[400]` < toasts (sonner, ~1e9).**
Floating primitives MUST outrank the modal that contains them — otherwise their content
renders **behind** the `z-[300]` overlay and is invisible/clipped. That's why
`select.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`, and `hover-card.tsx`
override the design-system default `z-50` to `z-[400]`. Add new floating primitives to
that list, don't invent a new number.

Dialog and Sheet share `z-[300]`; a confirmation Dialog spawned *from* a Sheet lands on
top by DOM order (it mounts later). The legacy `PlanDetailSheet` still uses `z-50` — new
side panels should use the shared `<Sheet>` primitive, not roll their own.

### Dialog Pattern

**Todo modal del producto tiene la misma anatomía, y la impone la primitiva.**

```
┌──────────────────────────────────────┐
│  Título                         (✕)  │  cabecera FIJA, filete abajo
├──────────────────────────────────────┤
│  cuerpo (lo único que scrollea)      │
├──────────────────────────────────────┤
│                  Cancelar  Confirmar │  pie FIJO, filete arriba
└──────────────────────────────────────┘
```

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent /* rounded-[20px], max-w-lg, flex-col, centrado por translate */>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    {/* cuerpo: hijos sueltos, con su padding y su scroll */}
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

`DialogContent` **reparte** a sus hijos: `DialogHeader` arriba, `DialogFooter`
abajo, y todo lo demás a un cuerpo con `overflow-y-auto` propio. No le pongas
`p-0`, `overflow-y-auto` ni `flex flex-col` — ya los tiene, y pelean.

Reglas que NO se negocian, porque son lo que hace que 29 modales se vean igual:

| Regla | Por qué |
|---|---|
| **Siempre `<DialogHeader>`** | Es lo único que da el título de 16px, el filete y la ✕ en su sitio. Sin él el modal se ve de otra familia. |
| **La ✕ vive en la cabecera** | La del DS va `absolute` dentro del contenedor que scrollea: en un modal alto desaparece. |
| **No toques el tamaño del título** | El del DS es `text-h2` (22px), tamaño de encabezado de PÁGINA. La primitiva lo baja con `[&_h2]:text-base`, por especificidad — un `className="text-base"` NO gana (tailwind-merge no reconoce `text-h2` como tamaño y sobreviven las dos). El color sí se puede cambiar. |
| **Cabecera `sr-only` ⇒ `hideClose`** | Si no, la ✕ nace `sr-only` también. Con `hideClose` en la cabecera, el `DialogContent` la pinta flotando arriba a la derecha. |

### La ✕: una sola, y la pone la primitiva

**Ningún call site dibuja una ✕.** Hay UN aspa en todo el producto —chip
redondo gris, `size-8 rounded-full bg-surface-muted`— y vive en
`AspaDeCierre` (`src/components/ui/dialog.tsx`). Diálogos y cajones la
heredan; la ✕ pelada del DS (`rounded-[9px]`, sin fondo) va apagada **siempre**
en los dos adaptadores.

| Dónde | Quién la pone |
|---|---|
| `DialogContent` con `<DialogHeader>` | La cabecera, a la derecha del título |
| `DialogContent` sin cabecera (o con `hideClose` en ella) | El Content, flotando en `absolute right-4 top-4` |
| `SheetContent` | El Content, en `right-4 top-4` y `z-20` — por encima de las cabeceras `sticky` |
| `AlertDialog` | Nadie: se sale por `Cancelar`/`Confirmar`, a propósito |

Para apagarla entera: `hideClose` en `DialogContent`, `hideCloseButton` en
`SheetContent`. Sólo para un modal que no se debe abandonar a medias.

⚠️ **Un envoltorio de `DialogHeader`/`DialogFooter` tiene que declarar
`bandaDeModal`.** `DialogContent` reparte a sus hijos leyendo esa marca; antes
comparaba identidad de componente y `ResponsiveDialogHeader` —que renderiza un
`DialogHeader` adentro pero *es* otro componente— no calificaba: la cabecera se
iba al cuerpo con scroll, el pie dejaba de estar fijo y el Content encendía la ✕
del DS encima de la del chip. Así vivió «Agendar una cita» con dos aspas.
Ver `responsive-dialog.tsx`.

Una cáscara escrita a mano (`createPortal`) usa **`rounded-[20px]`**, el mismo
radio que la primitiva. `src/components/ui/modales-alineados.test.ts` verifica
todo esto.

---

## 18. UI Primitives Inventory

Available at `src/components/ui/` — **check first before creating new components**:

| Primitive | Purpose |
|---|---|
| `accordion` | Collapsible sections (Radix) |
| `alert` / `alert-dialog` | Banners / confirm dialogs |
| `animated-counter` | Counts up on view (mono tabular) |
| `avatar` | User avatars with size/ring variants |
| `back-button` | Standard back button |
| `badge` | Status pills (incl. risk-a/b/c/d) |
| `breadcrumb` | Navigation breadcrumbs |
| `button` | Primary primitive — pill, sentence case (variants + sizes) |
| `card` | Card containers (`rounded-lg`, hairline border) |
| `checkbox` | Checkbox input |
| `collapsible` | Expand/collapse |
| `dialog` | Centered modal (z-[300]) |
| `divider` / `separator` | Horizontal/vertical rules |
| `dropdown-menu` | Menu popover |
| `empty-state` | Empty list/page state |
| `error-state` | Error display card |
| `hover-card` | Hover-reveal info |
| `input` | Text input (h-11, hairline border, cobalt focus) |
| `kbd` | Keyboard shortcut display (mono) |
| `label` | Form label |
| `LockedFeatureOverlay` | Plan-gating overlay |
| `not-found` | 404 component |
| `pagination` | Page navigation |
| `popover` | Floating popover |
| `progress` | Linear progress bar |
| `scroll-area` | Custom scrollbar |
| `section-label` | Dot + mono uppercase eyebrow |
| `select` | Select dropdown |
| `sheet` | Side sheet (alternative to custom drawer) |
| `skeleton` | Loading skeleton |
| `slider` | Range input |
| `spinner` | Loading spinner (sizes + variants) |
| `switch` | Toggle switch |
| `table` | Data table (mono numerals, tabular) |
| `tabs` | Tab navigation |
| `textarea` | Multi-line input |
| `toast` | Sonner-based toast |
| `toggle-group` | Toggle button group |
| `tooltip` | Hover tooltip |
| `visually-hidden` | Screen-reader-only |

And `src/components/ui/plan/` (CRM-specific): `PlanActivityTimeline`, `PlanDetailSheet`, `PlanHeader`,
`PlanProgressBar`, `PlanSidebar`, `PlanStatsCard`, `PlanStatusBadge`, `PlanTable`, `PlanTabs`,
`SubscriptionBadge`.

---

## 19. Documento largo consultable (informe de avalúo) — «Panel»

Patrón introducido por `/avaluo/reporte/[slug]`. Aplica a cualquier entregable que hoy
sea un PDF y pase a leerse en la web: un informe, un acta, un certificado. La dirección
visual elegida es **panel de producto**: chrome de app, un héroe ink con la cifra, y el
resto en tarjetas de un bento sin huecos.

**Estructura.** `main#main-content` → banda(s) de estado → `ReportTopbar` (sticky:
marca · `StatusBadge` de vigencia · chip del sello (ancla) · «Descargar el PDF» ·
Exportar · tema) → `grid lg:grid-cols-[16.5rem_minmax(0,1fr)]` con `ReportRail` (índice
sticky con scrollspy y progreso) y un `<article>` con `ReportHero` + `ReportChapter`s.
Capítulos en `<h2>` con pill numerada; secciones en `<section id={ancla}>` con `<h3>` y
`scroll-mt-28`. El **layout es declarativo**: `landing-layout.ts` describe cada capítulo
como `rows` de 12 columnas (celdas `hero | section(+filler) | group | stack`) y un test
exige que cada fila sume 12 y que las 39 secciones aparezcan exactamente una vez.

| Regla | Por qué |
|---|---|
| El índice lista **capítulos**, no secciones | 39 entradas es la tabla de contenidos del PDF con scrollspy encima |
| `sticky`, nunca `fixed` | `template.tsx` monta `PageTransition`, cuyo `transform` vuelve *containing block* a cualquier `fixed` descendiente (§17 / §8) |
| Tarjetas hermanas de una fila = **misma altura** | `grid-cols-12 items-stretch` + `h-full flex flex-col`; el hueco se rellena con un dato real (`filler`: anillo de vigencia, gauge de sector, medidor de exposición, dona terreno/construcción, gauge de divergencia) o la fila pasa a «una grande + columna de dos». Nunca dos alturas distintas lado a lado |
| Plegado ≠ ausente: `<details>` sin `hidden` | Ctrl-F lo encuentra, el export lo lleva y la hoja de impresión lo abre |
| Un bloque con consecuencia legal **no puede** ir dentro de `<details>` | Se marca en el modelo (`emphasis: 'disclaimer'`) y `ReportCard` lo cierra por id: aunque cambie el layout, «Alcance y limitaciones» es tarjeta de aviso siempre visible |
| Un hueco de datos se pinta, no se esconde | La tarjeta dice **qué** falta (chips de `gaps`); «datos no disponibles» a secas no informa |
| Superficies ink **planas** en el héroe y en UNA tarjeta de insight por página | Sin gradiente, sin bloom, sin `BrandMotif`, sin grano: §10.6 se cumple sin excepción. La jerarquía la hace el color del texto (`ink-fg`/`-muted`/`-subtle`), la banda es un instrumento de una sola tinta (`indigo-300`) y el marcador va en blanco. Decisión de producto (2026-08-18, «más minimalista») tras descartar el fondo fotográfico y luego el construido |
| Motion bajo `useReducedMotion` siempre | Reveal por scroll con stagger por fila, count-up de la cifra, banda que crece, indicador del índice con `layoutId`; con reduced-motion todo aparece al instante y el marcado SSR/cliente es idéntico (un `opacity:0` de servidor sin transición deja la página en blanco) |
| Tabla ancha → `data-lenis-prevent` + `overscrollBehavior: 'contain'` | Sin eso Lenis secuestra la rueda del mouse (§8) |
| Numerales siempre `font-mono tabular-nums whitespace-nowrap` | Un «$» huérfano en una línea es el error más visible de una fila estrecha; se parte el label, nunca el número |
| Cada campo PII lleva `data-pii-field` | `globals.css` ya lo esconde en `@media print` |
| Hoja de impresión propia | Cadence no trae ninguna utilidad `print:`. Molde: `src/app/avaluo/reporte/report-print.css` (apaga chrome, motion y capas decorativas; abre los `<details>`) |

Referencia: `src/components/avaluo/reporte/` (`ReporteAvaluoShell`, `ReportTopbar`,
`ReportRail`, `ReportHero`, `ReportChapter`, `ReportCard`, `ReportBlockView` + `blocks/`,
`charts/` (`ValueBandChart`, `Fillers`, `AnimatedAmount`), `motion/`).

**Vocabulario de bloques.** El contenido no se escribe a mano por sección: llega tipado
como una unión de once arquetipos (`prose`, `keyValues`, `bulletList`, `table`, `headline`,
`verdict`, `statChain`, `placeholder`, `media`, `figure`, `seal`) y `ReportBlockView`
despacha. Una sección nueva cuesta **cero** componentes; un arquetipo nuevo cuesta uno y
TypeScript lo cobra en el `switch`.

## 20. Sello de verificación

El bloque que dice «este documento es el que se firmó». Va **al final** del documento —es
el cierre de un argumento— con un ancla desde el encabezado.

- Tarjeta del bento con banner de veredicto (feedback tokens + icono + texto: el estado nunca depende sólo del color) y el QR en marco ink; el héroe y la insight son las otras superficies ink de la página.
- Contenido mínimo: emisor · fecha de firma · vigencia · método · huella corta en
  `font-mono tabular-nums` · **enlace al verificador público**.
- El enlace externo es obligatorio y visible: *un sello que sólo se puede ver dentro de la
  página que estás validando no prueba nada*.
- Si el enlace no puede navegar (datos de muestra, slug inexistente) se pinta la
  referencia en mono y se dice por qué está inactivo. Nunca un enlace roto.
- El chip del encabezado que lleva al sello es *chrome*: la sección se renderiza **una
  sola vez**.

Referencia: `SealBlockView` en `src/components/avaluo/reporte/blocks/SealBlock.tsx` (+ `QrMatrix`, `CopyHashButton`, `lib/avaluo/reporte/seal-presentation.ts`). Con un documento servido el sello muestra el veredicto REAL del verificador público (`render.seal`: verificado / alterado / no disponible), la cadena de vigencia y el QR dibujado con `<rect>` desde la matriz que manda el servicio; la muestra sigue declarándose sin verificación real.

## 21. Marca de datos de muestra

Cuando una pantalla se pinta con un juego de datos ficticio, tres capas —cada una sola
falla:

1. **Banda superior persistente**, ancho completo, `role="status"`, `bg-warning-soft`,
   **fuera** del `<article>` y no descartable.
2. **La marca dentro del contenido** que da autoridad (acá, la tarjeta del sello dice que
   no hay verificación real).
3. **Marca en los propios datos**: nomenclatura imposible (`# 00-00`), nombres con
   `(demo)`. Quien se salte la banda igual choca con datos obviamente ficticios.

Más `data-sample="true"` en el `<article>` y `robots: { index: false, follow: false }`.
El DS tiene además `SampleDataWatermark` para cuando haga falta la marca de agua diagonal.

---

## 22. When in Doubt

1. Find a similar component already in the codebase — copy its pattern.
2. Canonical references for common needs:
   - **Cadence foundation**: [`cadence/reference/Cadence Design System.dc.html`](../../cadence/reference/Cadence%20Design%20System.dc.html) + the `@leasefy/cadence` preset
   - **Color**: [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md)
   - **Drawer**: `src/components/inmobiliaria/CandidateDrawer.tsx`, `src/components/ui/plan/PlanDetailSheet.tsx`
   - **Form**: `src/components/auth/AuthForm.tsx`
   - **Layout**: `src/app/panel/inmobiliaria/layout.tsx` + `src/components/ui/plan/PlanSidebar.tsx` + `PlanHeader.tsx`
   - **Button**: `src/components/ui/button.tsx`
3. If still unsure, ask before inventing — extend this doc, don't drift.

---

*Migrated to the Cadence design system (`@leasefy/cadence`). Update this doc when patterns change — don't let it drift.*
