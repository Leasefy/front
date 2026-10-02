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
Resumen — el sistema completo (tokens, primitivas, cuándo usar cuál) está en **§8b Movimiento**.
- **Durations**: `duration-instant` 100ms · `duration-fast` 150ms (presión, salidas) · `duration-base` 200ms (por defecto) · `duration-slow` 300ms (paneles, página, colapsables) · `duration-reveal` 500ms (revelados, cifras)
- **Easing**: `ease-enter` (lo que entra, desacelera) · `ease-exit` (lo que sale, acelera) · `ease-emphasis` `cubic-bezier(0.32,0.72,0,1)` (paneles) · `ease-spring` (rebote leve: presión, toggles)
- **Press feedback**: controles interactivos `active:scale-[0.97]` con `ease-spring` (el `Button` ya lo trae)
- **Hover lift**: `-translate-y-0.5` + upgrade to `shadow-md` (`motionClasses.hoverLift`)

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

**Anatomy**: `rounded-full` (pill), `font-sans` (Schibsted Grotesk) **medium**, **sentence case**, `active:scale-[0.97]` con resorte leve (CSS, viene del DS; el spinner de `isLoading` entra con pop).

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

### Drawers / Side Panels — el cajón flotante (02-10-2026)

> Nico: «que los drawers todos sean así, que se vean así de hermosos, que se separen de las
> esquinas». Todo cajón del producto es el `Sheet` **flotante** de Cadence, a través del
> adaptador `src/components/ui/sheet.tsx`. **Nadie arma un cajón a mano** (`createPortal` +
> `fixed inset-y-0 right-0`): ese patrón quedó retirado.

**Forma** (la pone la primitiva, no el call site):

| Qué | Valor |
|---|---|
| Margen a la ventana | 12 px arriba, abajo y al costado (16 px desde `lg`) |
| Esquinas | las CUATRO en 24 px (`rounded-[24px]`) |
| Sombra | amplia y suave `0 24px 80px -12px rgba(20,19,15,.28)`; en oscuro la separa un borde blanco al 10 % (`ink-border`), nunca el gris café de `border` |
| Velo | ink al 18 % + `backdrop-blur-[6px]`; en oscuro negro al 55 % |
| Animación | con los tokens de §8b: entra en `duration-slow` (300 ms) con `ease-emphasis`, deslizándose `--motion-distance-lg` (24 px) desde su lado con escala `--motion-pop-scale` (0,96) y opacidad; sale igual en `duration-fast` (150 ms) con `ease-exit`. En el celular la hoja sube desde el borde de abajo (100 %). Con `prefers-reduced-motion` sólo el fundido, con las duraciones reducidas de `--motion-*` |
| ✕ | la de todo el producto: círculo con borde fino de 36 px (`ASPA_DE_CIERRE` = `dialogCloseClassName` de Cadence), centrada en la línea del título. `closeLabel` cambia su nombre accesible cuando hay dos cajones a la vista («Cerrar el documento») |
| Capa | `z-[300]` (§17) |
| Celular (< 640 px) | el cajón derecho **sube como hoja desde abajo**: radios arriba, asa, hasta el 92 % del alto, pie al alcance del pulgar. Los izquierdos (navegación) siguen laterales y flotantes. `mobile="sheet" \| "side"` lo cambia |
| Tamaños (`size`) | `sm` 400 · `md` 560 (default) · `lg` 680 · `xl` 880 · `full` |

**Anatomía**:

```
┌───────────────────────────────────────┐
│ [ícono] Título                     (✕) │  SheetHeader — título, subtítulo apagado, acciones
│         Subtítulo                      │                junto a la ✕; filete abajo
├───────────────────────────────────────┤
│ ‹ Anterior   1 de 9 del tablero  Sig. › │  SheetNav — opcional, entre registros
├───────────────────────────────────────┤
│  cuerpo (lo ÚNICO que scrollea)        │  SheetBody — data-lenis-prevent + overscroll contain
│  ┌ SheetSection ────────────────────┐  │  tarjetas: borde suave, fondo apenas distinto,
│  │ subtarjetas en bg-surface        │  │  subtarjetas blancas adentro
│  └──────────────────────────────────┘  │
├───────────────────────────────────────┤
│ [✕ Rechazar]          [Mover] [Avanzar]│  SheetFooter — fijo, filete arriba;
└───────────────────────────────────────┘  `start` a la izquierda, acciones a la derecha
```

```tsx
import {
  Sheet, SheetContent, SheetHeader, SheetNav, SheetBody, SheetSection, SheetFooter,
} from '@/components/ui/sheet';

<Sheet open={abierto} onOpenChange={(o) => !o && onCerrar()}>
  <SheetContent size="lg" aria-describedby={undefined}>
    <SheetHeader
      leading={<Avatar … />}            /* opcional */
      title="Candidatura"
      description="Apartamento 402 · Laureles"
      actions={<Badge>En estudio</Badge>} /* opcional, junto a la ✕ */
    />
    <SheetNav position={1} total={9} context="del tablero" onPrevious={…} onNext={…} />
    <SheetBody className="space-y-5">
      <SheetSection title="Progreso de la postulación">…</SheetSection>
    </SheetBody>
    <SheetFooter
      note="Una línea de ayuda encima de los botones (opcional)"
      start={<Button variant="secondary"><X /> Rechazar</Button>}
    >
      <Button variant="secondary">Mover</Button>
      <Button>Avanzar a visita</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

Un **formulario** va con el `<form>` adentro y `className="contents"` (o con `id` y el botón
del pie con `form="…"`), para que `SheetBody` y `SheetFooter` sigan siendo hijos de la columna
y el botón del pie pueda ser `submit`.

**Reglas que no se negocian:**

| Regla | Por qué |
|---|---|
| No pongas `p-0`, `flex flex-col`, `w-full sm:max-w-*` ni `overflow-y-auto` en `SheetContent` | Ya los trae. El ancho es `size`. Un `p-0` además apaga el reparto (ver abajo) |
| La ✕ la pone `SheetContent` (`ASPA_DE_CIERRE`, la misma de los modales) | Nadie dibuja la suya. `hideCloseButton` la apaga, sólo para un cajón que no se debe abandonar |
| Sin `useLenis().stop()`, sin `keydown` de Esc, sin `createPortal` | Radix pone el portal, el foco, Esc y el bloqueo del scroll; `SmoothScroll` frena Lenis mientras haya un `[role=dialog][data-state=open]` |
| El cuerpo es `SheetBody` | Es lo que lleva `data-lenis-prevent` + `overscroll-behavior: contain`; sin eso la rueda mueve la página de atrás |
| Para animar la salida, el contenido sigue montado | `open` manda; si el dato se va al cerrar, `useUltimoPresente`. Un cajón que el padre monta y desmonta guarda su `abierto` y avisa en `onCloseAutoFocus` (ver `AIActivityDetailPanel`) |

**El reparto.** Como `DialogContent`, el `SheetContent` del adaptador **reparte** a sus hijos
directos leyendo `bandaDeModal`: cabecera y navegación arriba, pie abajo y todo lo demás a un
`SheetBody` automático. Así un cajón escrito «a la antigua» no queda pegado a los bordes. Se
apaga solo cuando el call site ya arma su layout: si trae un `SheetBody`/`CajonCuerpo` en su
JSX, si pasa `layout="manual"` (obligatorio cuando las bandas viven en un subcomponente, p. ej.
`CuerpoDelCandidato`) o, por compatibilidad con cajones viejos, si pasa `p-0` en `className`.

**`Cajon`** (`src/components/ui/cajon.tsx`) es la capa en español sobre lo mismo:
`Cajon` (`tamano`, o el `ancho` viejo traducido) · `CajonCabecera` = `SheetHeader` ·
`CajonCuerpo` = `SheetBody` · `CajonPie` (`izquierda`, `ayuda`) = `SheetFooter`.

**Sub-cajón** (un panel junto a otro): un segundo `Sheet` DENTRO del primero, con
`overlayClassName="bg-transparent"` (el adaptador también le quita el desenfoque) y un
`right-[calc(margen + ancho del principal …)]` que lo deja a su izquierda SÓLO desde el
ancho en que caben los dos; debajo se para encima del principal. Dos formas:
- **separado** (dos tarjetas con 12 px de aire): el panel secundario de `PlanDetailSheet`,
  desde `xl`;
- **pegado** (una sola pieza con la costura a ras): `PilotoDocumento` junto a `PilotoCajon`,
  desde `lg` — el principal pierde el radio izquierdo (`lg:!rounded-l-none`) y el secundario
  el derecho y su borde (`lg:!rounded-r-none lg:border-r-0`). Su ✕ lleva
  `closeLabel="Cerrar el documento"`.

Referencias: `CandidateDrawer.tsx` (cabecera con avatar + pie con decidir),
`PipelineDetail.tsx` (pie «perder» a la izquierda / «avanzar» a la derecha),
`PlanDetailSheet.tsx` (sub-cajón), `InquilinoDrawer.tsx` (encabezado de persona con chips de
contacto). En Cadence: historia `Overlays/Sheet › Referencia · Candidatura`.

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
- **Botón de plegar** (`BotonDeLaBarra`, 02-10-2026): cuadrado de 36 px, `rounded-[12px]`,
  `bg-surface` + `border-border`, ícono `SidebarSimple` de Phosphor (el mismo en los dos estados).
  Abierta, a la derecha del logo; plegada, debajo del símbolo. Tooltip neutro (`bg-fg text-bg`)
  «Ocultar barra» / «Mostrar barra» seguido de la tecla en el `Kbd` de Cadence (`size="sm"`, el
  mismo del ⌘K): «⌘B» en macOS, «Ctrl B» en el resto; el botón lleva `aria-keyshortcuts`. En el
  cajón del celular no aparece. Se hunde al apretarlo (`whileTap` 0,94, framer).
- **Atajo ⌘B / Ctrl+B** (02-10-2026): pliega y despliega la barra de escritorio (⌘ en macOS, Ctrl en
  el resto; nunca con Mayúscula ni Alt: ⌘⇧B es la barra de favoritos del navegador). No actúa con
  el foco en un `input`, `textarea`, `select` o `contenteditable`; con un modal abierto (diálogo de
  Radix con `data-state="open"` o cualquiera con `aria-modal="true"`); bajo `lg`, donde está el
  cajón; si otro ya atendió la tecla (`defaultPrevented`), ni al dejarla apretada. El movimiento es
  el mismo de plegar con el botón. Si el foco estaba en la barra y quien plegó iba con el teclado,
  pasa al botón de plegar (la cabecera se monta de nuevo y el foco caía al `<body>`). Reglas en
  `src/lib/nav/atajo-de-la-barra.ts`. Ningún otro atajo usa B (⌘K es el buscador).
- **Cajón del celular — el foco**: al abrir cae en el logo (`onOpenAutoFocus`). Radix enfoca el
  primer control que no sea enlace, que era el campo «Buscar», y el `SidebarSearch` de Cadence
  pinta el anillo con `focus:`: salía azul apenas se abría. El logo y no la ✕ porque es lo primero
  en el orden de lectura y del Tab (la ✕ va última en el DOM); su anillo es `focus-visible`, se ve
  sólo yendo con el teclado. Queda atrapado y al cerrar vuelve al botón que lo abrió
  (`openPlanMobileSidebar(evento)`; sin `SheetTrigger` Radix no sabe cuál es), salvo que otro ya
  tenga el foco (el ⌘K que abre «Buscar»). El diálogo se llama «Menú de navegación».
- **Al plegar/desplegar**: la cabecera y la navegación nuevas entran con un fundido de 200 ms
  (sólo `opacity`) mientras la barra cambia de ancho; lo que ya estaba al cargar la página NO se
  anima ni sale con `opacity: 0` en el HTML del servidor (`useDespuesDelPrimerPintado`). El ancho
  sigue con `transition-all` de CSS (cambia el layout del panel; no es `transform`).
- **Elemento activo del menú**: tinte NEUTRO (`bg-surface-selected`) que se desliza entre filas
  del mismo bloque con `layoutId` (framer-motion, `MotionConfig reducedMotion="user"`), texto e
  ícono en `text-fg` con el ícono relleno; dentro de una sección, un tramo de 2 px `bg-fg-subtle`
  sobre la guía, sin halo ni degradado. Al pasar: `hover:bg-surface-hover` (también la cabecera de
  sección). Nunca `bg-primary-soft` (en oscuro es un índigo saturado). Resorte de 220 ms sin
  rebote, a opacidad plena; sólo cuando la activa salta a OTRO bloque (sin resaltado previo desde
  donde deslizarse) entra con un fundido. Ver `ResalteDeLaFilaActiva` en `PlanSidebar.tsx`.
- **Secciones al entrar**: una sola abierta, «Operación» (`#sec-operacion`; en un panel sin ella,
  la primera), más la de la página actual. Lo que se abre o cierra vale mientras se navega y NO se
  guarda (`secciones-del-menu.ts`).

### Command palette (⌘K, `src/components/inmobiliaria/CommandPalette.tsx`)
Guía: el menú flotante y el modal del sistema de diseño de referencia (`SaleADS-projects/chat`,
`chat-v2/live/Menu.tsx` / `Modal.tsx`) hablado con tokens de Leasefy.
- Caja de 680 px a 12 vh del borde, `rounded-[20px]`, con la sombra de los modales de Cadence,
  centrada con `mx-auto` (NO con `-translate-x-1/2`: la animación usa `transform`); en `<md`,
  pantalla completa con la ✕ del producto (`AspaDeCierre`, sólo ahí).
- Velo §41: tinta al 32 % + `backdrop-blur-[6px]` (en oscuro, negro al 62 %). Un clic en él cierra.
- **Movimiento con framer-motion** (no con las clases `animate-dialog-*` de Cadence): el
  `DialogContent` de Radix queda como MARCO invisible a pantalla completa (`hideClose`, velo de
  Radix transparente, `!animate-none`) y adentro `AnimatePresence` anima el velo y la caja. El
  diálogo sigue abierto (`montada`) hasta que termina la salida; lo escrito se borra recién ahí.
  Caja: entra en 220 ms (sube 8 px, 0,98 → 1), sale en 150 ms; velo: entra en 200 ms, sale en 150.
  Filas, grupos, novedades, vacío y cargando: 180 ms, 4 px de subida, escalera de 20 ms (tope en la
  fila 8); la fila que ya estaba no se vuelve a animar al seguir escribiendo. Lupa ↔ cargando, la ✕
  de limpiar y el ↵: fundidos de 150 ms. Resaltado de la activa: resorte de 200 ms sin rebote.
  Curva: ease-out `[0.22, 1, 0.36, 1]`. Valores PROVISIONALES (`MOVIMIENTO` en el archivo) hasta que
  exista el sistema de movimiento de Cadence.
- Fila: ícono en su cuadrito (32 px, `rounded-[10px]`, `bg-surface-muted`), título + línea de apoyo;
  la activa lleva el mismo tinte neutro deslizante que el menú y un `kbd` ↵. Lo escrito se resalta
  (`tramos-de-coincidencia.ts`, sin tildes ni mayúsculas). Foco en el campo + `aria-activedescendant`.
- Novedades del audit log: `novedades-del-buscador.ts` las dice en español y junta las repetidas
  («3 veces»).

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

**`toast` se importa SIEMPRE de `@/components/ui/toast`, nunca de `'sonner'`.** Es el
mismo objeto por los dos caminos, así que la diferencia no se ve corriendo la app —
se ve en los tests. `vi.mock('sonner', …)` sólo intercepta a los importadores que Vite
procesa: el código de la app sí, `node_modules` no. Un componente que importa `sonner`
directo queda del lado equivocado del seam el día que el envoltorio cambie, y el
envoltorio mismo tomaba `toast` de `@leasefy/cadence` (que lo re-exporta de sonner):
por ese camino los ~46 tests que espían el toast no veían la llamada. Hoy el envoltorio
lo toma de `sonner` directo y el seam es uno solo. Barrido el 2026-09-05 en
`src/app/panel/inmobiliaria/**` y `src/components/**` (105 archivos).

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
- **Modals**: usá `Dialog` / `AlertDialog` (Radix): foco atrapado, Esc, `aria-labelledby`/`describedby` desde `DialogTitle`/`DialogDescription` y foco devuelto al disparador. Sin descripción visible, `aria-describedby={undefined}` en el Content.
- **Backdrop**: `aria-hidden="true"`
- **Icon-only buttons**: must have `aria-label` or `title`
- **Color**: never communicate state with color alone — pair with icon + text
- **Gradients**: verify text contrast ≥ 4.5:1 against the lightest stop of any brand gradient

---

## 8. Lenis Smooth Scroll

The site uses **Lenis** smooth scroll, configured in `src/components/providers/SmoothScroll.tsx`. Two rules:

1. **For any modal / drawer / overlay**: call `lenis.stop()` on open, `lenis.start()` on close + cleanup
2. **For any scrollable nested container** inside the modal/drawer: add `data-lenis-prevent` + `overscrollBehavior: 'contain'`

Failure mode: wheel events get hijacked, drawer body appears frozen. En los cajones ya no se
hace a mano: `SheetBody` trae `data-lenis-prevent` + `overscroll-behavior: contain`, y
`SmoothScroll` frena Lenis mientras haya un diálogo o cajón abierto (§4 Drawers).

---

## 8b. Movimiento — cada interacción con su animación

Nico (02-10-2026): «que cada interacción tenga su animación top: cosas suaves, entradas,
salidas, cambios». El sistema vive en **`@leasefy/cadence`** (`cadence/src/motion/`): tokens,
primitivas sobre **framer-motion** (peer de Cadence: UNA sola copia, la del front) y recetas de
clases para lo que se anima en CSS. Las historias de Storybook «Foundations/Motion» y la
«Animación» de cada componente muestran todo funcionando.

### Las reglas (lo que hace que todo se sienta de la misma familia)

| Regla | Por qué |
|---|---|
| Lo que **entra** desacelera (`enter`, 200ms); lo que **sale** acelera y dura menos (`exit`, 150ms) | Nadie espera a que algo termine de irse |
| Sólo se anima **`transform` y `opacity`** | Lo demás (width, height, top, margin) recalcula el layout en cada cuadro. Única excepción: la altura de un colapsable (`Collapse`, acordeón) |
| **Distancias chicas**: 4 · 8 · 16 · 24 px | Algo que viaja 40px parece un error; 8px parece que llegó |
| **Movimiento reducido** (`prefers-reduced-motion`): sin desplazamientos, quedan fundidos cortos | Accesibilidad. Las primitivas lo hacen solas; `MotionProvider` (layout raíz) lo aplica a todo framer. En CSS, `globals.css` pone los `--motion-*` reducidos (distancia 0, escala 1, 150 ms) y su regla global deja quieto todo lo demás, salvo las animaciones del sistema (modales, cajones, flotantes, `animate-in` sin desplazamiento) y las transiciones de sólo opacidad, que quedan como fundidos. Una animación nueva del preset que se quiera salvar se agrega a esa lista: `movimiento-reducido.test.ts` comprueba que no se mueva |
| Nada arranca invisible en HTML del servidor arriba del pliegue | Un `initial={{ opacity: 0 }}` sin hidratar es una página en blanco (y castiga el LCP) |
| Los estados que ya vienen al cargar **no se animan**; se anima el CAMBIO | Una tabla con 40 casillas marcadas no «late» entera al abrir |

### Tokens

| Token | JS (`@leasefy/cadence`) | Tailwind | CSS |
|---|---|---|---|
| Duraciones | `motionDuration.instant/fast/base/slow/reveal` (s) | `duration-instant` 100 · `duration-fast` 150 · `duration-base` 200 · `duration-slow` 300 · `duration-reveal` 500 | `--motion-duration-*` |
| Curvas | `motionEase.enter/exit/emphasis/standard/spring` | `ease-enter` · `ease-exit` · `ease-emphasis` · `ease-standard` · `ease-spring` | `--motion-ease-*` |
| Resortes | `motionSpring.soft` (sin rebote, superficies) · `.snappy` (indicadores, layout) · `.bouncy` (rebote leve, algo que «llega») | — | — |
| Distancias | `motionDistance.xs` 4 · `sm` 8 · `md` 16 · `lg` 24 | — | `--motion-distance-*` |
| Escalas | `motionScale.pop` 0.96 (flotantes) · `.press` 0.97 | `active:scale-[0.97]` | `--motion-pop-scale` |
| Escalonado | `motionStagger.step` 40ms, techo `max` 320ms | — | — |

Las clases de Tailwind leen las variables con el mismo valor de respaldo, así que funcionan aunque
la app no las defina. Animaciones CSS del preset: `animate-pop-in` / `animate-pop-out`
(flotantes), `animate-tip-in` (tooltip), `animate-rise-in` (avisos), `animate-collapse-open` /
`animate-collapse-close` (acordeón y colapsable), `animate-spinner-in`.

### Primitivas — cuál usar

| Quiero… | Usa | Ejemplo |
|---|---|---|
| Que algo **aparezca** (una tarjeta, una sección) | `Appear` | `<Appear>…</Appear>` · `<Appear direction="left" delay={0.1}>` · `<Appear inView>` (al hacer scroll) |
| **Mostrar y ocultar** con salida (lo que `{x && …}` no puede) | `Presence` | `<Presence show={hayError}><Banner …/></Presence>` |
| Una **lista** que entra escalonada; **filas que se agregan o quitan** | `Stagger` + `StaggerItem` | `<Stagger as="ul">{filas.map(f => <StaggerItem key={f.id} as="li">…)}</Stagger>` |
| **Cambiar un contenido por otro**: cargando → contenido, vacío → lleno, **pasos** de un asistente | `CrossFade` | `<CrossFade swapKey={cargando ? 'cargando' : 'listo'}>…` · `<CrossFade swapKey={paso} direction={adelante ? 'forward' : 'backward'}>` |
| Una sección que **se abre y se cierra** (altura automática) | `Collapse` | `<Collapse open={abierto} className="pt-3">…</Collapse>` |
| Una **cifra que cambia** (saldo, total, KPI) | `AnimatedNumber` | `<AnimatedNumber value={saldo} format={formatCurrency} className="font-mono" />` |
| La marca de **«estás acá» que se desliza** (pestañas propias, filtros, navegación) | `MotionIndicator` | dentro del ítem activo: `<MotionIndicator layoutId={\`${id}-filtro\`} className="inset-0 -z-10 rounded-full bg-surface" />` (ítem con `relative isolate`) |
| **Presión y hover** físicos en una tarjeta o loseta armada a mano | `Pressable` (o `motionClasses.press` / `hoverLift` en CSS) | `<Pressable as="button" onClick={abrir}>…</Pressable>` |
| La **entrada de una página** | `PageTransition` | ya está en los `template.tsx` (ver abajo) |

Todas aceptan `as` (`div`, `li`, `ul`, `section`, `tr`…), respetan el movimiento reducido solas y
no cambian el marcado entre servidor y cliente. Para un flotante de Radix hecho a mano:
`motionClasses.floating` (popover/menú) y `motionClasses.tooltip`.

### Los componentes base ya traen su movimiento

Quien usa estos componentes (o sus adaptadores de `src/components/ui/`) lo hereda sin hacer nada:
`Button` (presión con resorte; el spinner entra con pop) · `Tabs` (la barra o la píldora del
activo **se desliza**, `layoutId`; el panel entra con fundido) · `SegmentedControl` (la píldora se
desliza y se ajusta al ancho) · `Accordion` y `Collapsible` (altura + fundido, chevron con la misma
curva) · `Popover`, `DropdownMenu` (y submenú), `Select`, `Combobox`, `HoverCard` y `Tooltip`
(**entran desde su ancla y salen acelerando**; antes cerraban de golpe) · `Toast` (sonner con la
curva de entrada del sistema) · `Switch` (thumb con resorte que se estira al presionar) ·
`Checkbox` (el visto **se dibuja** al marcar y se borra al desmarcar) · `Radio` (el punto crece) ·
`Badge` (cruza el color al cambiar de estado) · `Chip` (presión) · `Card interactive` (hover sutil:
sube 1px) · `Banner`, `Alert`, `Callout` (entran subiendo 8px) · `Skeleton` (deja de brillar con
movimiento reducido). `Dialog`, `AlertDialog`, `Sheet` y `Drawer` tienen su propia coreografía
(§17) con los mismos tokens.

### Páginas

- `MotionProvider` (Cadence) envuelve toda la app en `src/app/layout.tsx`: `reducedMotion="user"`.
  No toca el scroll; Lenis sigue igual y `inView` funciona con él.
- `template.tsx` con `PageTransition` en: la raíz (cambio de sección de primer nivel),
  `panel/inmobiliaria`, `panel/(landlord)` e `inquilino`. Los de los paneles van **dentro** del layout:
  al cambiar de módulo entra sólo el contenido (fundido + 8px, 300ms); sidebar, header, muro de
  migración y guards de sesión quedan montados y no parpadean.
- La **primera pantalla** de la sesión no se anima: llega visible desde el HTML del servidor.
- **Nunca dos a la vez:** al llegar al panel desde fuera se montan juntos el template raíz y el del
  panel; anima sólo el de afuera. Y la página **no anima su propia entrada** (`initial={{ opacity: 0, y: 20 }}`
  en el contenedor de la página): se suma a la del template. Lo que se anima adentro son los cambios.
- Navegar dentro de un módulo (lista → ficha) no remonta el template: ese movimiento lo pone cada
  pantalla con las primitivas.
- ⚠️ Durante los 300ms de la entrada el contenedor tiene `transform`: un `position: fixed` de
  adentro se ubica relativo a él. Lo flotante de una página va en portal o `sticky` (§19).

### Errores que no hay que repetir

| ❌ | ✅ |
|---|---|
| `transition-all` en un contenedor grande | Nombrar las propiedades: `transition-[transform,opacity]` |
| Animar `width`/`height`/`top` (barras de progreso, indicadores) | `transform` (`scaleX`, `translateX`) o `MotionIndicator` |
| `key={index}` en una lista animada | `key={dato.id}`: con el índice, borrar la fila 2 anima la salida de la última |
| `layout` en una lista de 300 filas o virtualizada | `<Stagger layout={false}>`: cada cambio mediría todas las filas |
| `AnimatePresence mode="wait"` con salidas largas | Salidas en `fast`; `CrossFade` ya lo hace |
| Curvas y duraciones inventadas (`duration: 0.6, ease: 'easeInOut'`) | Los tokens. Si falta uno, se agrega al sistema |
| `{abierto && <Panel/>}` y quejarse de que «cierra de golpe» | `Presence` (o `open={…}` en los primitivos de Radix) |

### En las pruebas

`vitest.setup.ts` pone `MotionGlobalConfig.skipAnimations = true`: toda animación de framer salta a
su valor final, así que ya no hace falta mockear `framer-motion` para que un `AnimatePresence`
monte el contenido nuevo.

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

> **Hay UN solo estado vacío.** `@/components/data-display/EmptyState` existía como un
> segundo componente con la misma cara nominal y distinta ejecución (ícono en un
> `rounded-2xl` —loseta, no círculo— y CTAs con `<a>`/`<button>` crudos, fuera del pill,
> del foco cobalto y del `active:scale`). Desde el 2026-09-05 es un **adaptador** sobre
> éste: conserva su API vieja (`primaryCta` / `secondaryCta`) para no tocar sus ~47 call
> sites, pero no dibuja nada propio. Para código nuevo importá siempre
> `@/components/ui/empty-state`.

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

**Esqueleto → contenido** (§8b): nunca un corte seco. `CrossFade` saca el esqueleto en 150ms y
hace entrar el contenido; si el contenido es una lista, sus filas llegan con `Stagger`:
```tsx
<CrossFade swapKey={isLoading ? 'cargando' : 'listo'}>
  {isLoading ? <SkeletonTableRows rows={6} /> : <TablaDeContratos filas={filas} />}
</CrossFade>
```
Lo mismo para vacío → lleno y error → reintento.

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

### Switch tab — `SegmentedControl` (`@leasefy/cadence`)

El control de dos a cuatro opciones que cambia **qué se mira dentro de un
mismo bloque**: «Vista Kanban | Vista Lista» en Mantenimientos, «Ingresos |
Egresos | Facturas» en la tarjeta de comprobantes migrados.

```tsx
import { SegmentedControl } from '@leasefy/cadence';

<SegmentedControl<Clase>
  aria-label="Ingresos, egresos y facturas"
  value={clase}
  onChange={setClase}
  options={[{ value: 'ingreso', label: <span>Ingresos</span>, ariaLabel: 'Ingresos: 18' }]}
/>
```

- **Segmentado vs. `Tabs`**: `Tabs` (subrayadas) son navegación de sección —
  cambian el contenido de la página. El segmentado es un **filtro** de un
  bloque que ya está: la tabla de abajo sigue siendo la misma tabla.
- Los segmentos son `<button role="radio">` dentro de un `role="radiogroup"`;
  el activo es la píldora blanca con `shadow-sm`. **No re-pintes el estado
  activo** desde el call site.
- `label` acepta un nodo (icono + texto, o texto + píldora de conteo). El DS no
  pasa props sueltas a cada segmento: un `data-testid` va **dentro** del
  `label`, y para clickearlo en un test se sube al botón con `.closest('button')`.
- `ariaLabel` es obligatorio cuando `label` no es un string.
- `fullWidth` sólo para el switch de login/crear cuenta (thumb deslizante).

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
| **Dialog (centered modal)** | `<Dialog>` / `<AlertDialog>` (`dialog.tsx`, Radix-based) + `confirmar()` / `avisar()` | `z-[300]` | Confirmations, short forms, status messages (info / éxito / error / advertencia) |
| **Floating-in-modal** | `Select` / `DropdownMenu` / `Popover` / `Tooltip` / `HoverCard` content | `z-[400]` | Any Radix popover opened *inside* a modal/drawer |

⚠️ **Overlay stack: modal/drawer `z-[300]` < floating content `z-[400]` < toasts (sonner, ~1e9).**
Floating primitives MUST outrank the modal that contains them — otherwise their content
renders **behind** the `z-[300]` overlay and is invisible/clipped. That's why
`select.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`, and `hover-card.tsx`
override the design-system default `z-50` to `z-[400]`. Add new floating primitives to
that list, don't invent a new number.

Dialog and Sheet share `z-[300]`; a confirmation Dialog spawned *from* a Sheet lands on
top by DOM order (it mounts later). Desde el 02-10-2026 no queda ningún cajón armado a mano
(`PlanDetailSheet` incluido): todos son el `<Sheet>` flotante (§4 Drawers).

### Dialog Pattern — el modal canónico (02-10-2026)

> Nico: «quiero algo hermoso, que cada modal se sienta bello, sea informativo,
> de éxito, de error». Desde ese día **todo modal del producto sale de la misma
> primitiva** (`Dialog` / `AlertDialog` de Cadence, a través de
> `src/components/ui/dialog.tsx` y `alert-dialog.tsx`) y **nadie arma una
> cáscara a mano** (`fixed inset-0` + caja centrada). Las historias de Storybook
> de Cadence (`Overlays/Dialog`, `Overlays/AlertDialog`,
> `Overlays/MessageDialog`, `Overlays/Imperativo`) son la referencia visual.

```
┌────────────────────────────────────────────┐
│  (◎)                                  (✕)  │  medallón opcional (variant / icon)
│  Título grande 20/28                       │  + subtítulo 14px apagado
│  Subtítulo                                 │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤  filete SÓLO cuando el cuerpo scrollea
│  cuerpo — lo único que scrollea            │  data-lenis-prevent + overscroll contain
│  ┌──────────────────────────────────────┐  │
│  │ bloque con borde fino (DialogSection)│  │
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  pie, fondo suave         Cancelar  [Sí]   │  pie fijo, acciones a la derecha
└────────────────────────────────────────────┘
```

- **Panel:** esquinas de **24px**, borde fino, sombra profunda y suave, centrado
  con `inset-0 m-auto` (no con translate). Entra con escala + opacidad en
  `duration-slow` (300 ms) + `ease-enter`, subiendo `--motion-distance-sm`; sale
  en `duration-fast` (150 ms) + `ease-exit` (§8b). La hoja del celular entra con
  `ease-emphasis`. Con `prefers-reduced-motion` los tokens valen 0 y 1 y queda
  un fundido corto, sin ninguna clase `motion-reduce:` en el panel (salvo la
  hoja, que viaja el 100% de su alto y pasa a fundido).
- **Velo:** tinta translúcida + **desenfoque** del fondo (negro 60% en oscuro).
- **✕:** un círculo con borde fino arriba a la derecha. La pone el Content
  (nunca la cabecera) y no scrollea nunca.
- **Pie:** fondo `surface-hover` (blanco/negro translúcido: neutro en los dos
  temas), filete arriba, acciones a la derecha. Salida = botón blanco con borde
  (`variant="outline"` o `secondary`: el pie pinta de superficie el `outline`),
  acción = cobalto, destructiva = rojo sobrio (también en oscuro: el pie fuerza
  `#c0392b` en vez del salmón, que con texto blanco no llega a 4.5:1).
- **Celular (<640px):** sube como **hoja desde abajo**, a todo el ancho, con las
  esquinas de arriba redondeadas, los botones a todo el ancho (el principal
  arriba) y la zona segura del iPhone respetada. `mobile="center"` lo deja como
  tarjeta centrada.
- **Oscuro:** Onyx `#0a0a0a`. Nada de `surface-muted` adentro del modal (es un
  gris cálido, amarillento sobre el negro).

#### Tamaños — `size` en el Content

| `size` | Ancho | Para |
|---|---|---|
| `sm` | 420 | Confirmaciones, mensajes de estado (default de `AlertDialog`) |
| `md` | 520 | Formularios cortos (default de `Dialog`) |
| `lg` | 680 | Formularios con secciones |
| `xl` | 880 | Tablas, comparaciones, extractos |

Un `className="max-w-…"` en el Content sigue ganando (tailwind-merge), pero
preferí `size`.

#### Las variantes — `variant` en el Content

| Tipo | Componente | `variant` | Medallón | Botón principal |
|---|---|---|---|---|
| Contenido / formulario | `Dialog` | — | ninguno (o `icon`) | cobalto |
| Confirmación | `AlertDialog` / `confirmar()` | `confirm` | cobalto, «?» (o el ícono de la acción) | cobalto |
| **Destructiva** | `AlertDialog` / `confirmar({ destructivo })` | `destructive` | rojo, papelera (o `Prohibit`…) | **rojo sobrio, solo** |
| Advertencia | `AlertDialog` / `avisar` | `warning` | ámbar, «!» | cobalto |
| Informativa | `Dialog` / `avisar({ tipo: "info" })` | `info` | azul, «i» | «Entendido» blanco |
| Éxito | `Dialog` / `avisar({ tipo: "exito" })` | `success` | verde, **el ✓ se dibuja** | «Listo» blanco |
| Error | `Dialog` / `avisar({ tipo: "error" })` | `error` | rojo, «×» | «Reintentar» si aplica |

El medallón es un círculo de 48px con el **tinte suave** del estado (nunca
saturado) y un halo del mismo tinte; entra con escala + opacidad (desde
`--motion-pop-scale`: con movimiento reducido, sólo el fundido).

```tsx
// Formulario / contenido
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent size="md">
    <DialogHeader>
      <DialogTitle>Nuevo propietario</DialogTitle>
      <DialogDescription>Con el documento basta; el resto se completa después.</DialogDescription>
    </DialogHeader>
    {/* hijos sueltos: van al cuerpo con scroll (grid gap-4) */}
    <DialogSection title="Datos">…</DialogSection>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button isLoading={guardando}>Crear propietario</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Destructiva: el título nombra QUÉ, la descripción dice EXACTAMENTE qué se pierde
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent variant="destructive">
    <AlertDialogHeader>
      <AlertDialogTitle>¿Anular el recibo RC-1042?</AlertDialogTitle>
      <AlertDialogDescription>
        La cuota de octubre vuelve a quedar pendiente por $ 2.450.000. El recibo queda
        marcado como anulado; no se borra.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction loading={anulando} onClick={(e) => { e.preventDefault(); anular() }}>
        Anular recibo
      </AlertDialogAction>          {/* sale rojo solo: lo decide la variante */}
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Un estado que cambia adentro del mismo modal: la variante sigue al estado
<DialogContent variant={resultado ? "success" : undefined}>…</DialogContent>
```

#### Preguntar o avisar desde un manejador — `confirmar()` / `avisar()`

`src/components/ui/confirmar.tsx`. Devuelven una promesa; **reemplazan a
`window.confirm` / `alert`** (prohibidos: `sin-dialogos-del-navegador.test.ts`,
que también mira `globalThis.` y `self.`). No hay que montar nada: el primer
pedido monta un único anfitrión en `document.body` con el z del panel.

```ts
const ok = await confirmar({
  destructivo: true,
  titulo: '¿Eliminar a Laura Gómez del equipo?',
  descripcion: 'Pierde el acceso al panel ya mismo. Sus gestiones y notas se conservan.',
  accion: 'Eliminar del equipo',
})
if (!ok) return

// Con el trabajo adentro: el botón carga; si falla, el modal sigue abierto.
await confirmar({ titulo: '¿Enviar los 42 recordatorios?', accion: 'Enviar', alConfirmar: enviar })

await avisar({ tipo: 'error', titulo: 'No pudimos enviar el lote a Wompi',
  descripcion: 'Wompi no respondió. Lo enviado quedó guardado; reintenta en unos minutos.',
  referencia: 'WOMPI_NO_RESPONDIO · 7f3a-29c1', accion: 'Reintentar', alAccionar: reintentar })
```

Una confirmación lleva siempre `descripcion` (qué pasa si se acepta) o, por lo
menos, `detalle`: sin descripción, el detalle es lo que lee el lector de
pantalla; sin ninguno de los dos, Radix avisa en la consola de desarrollo.

Un error en un modal dice **qué pasó** (título) y **qué hacer** (descripción),
con la **referencia** opcional para soporte (se copia con un clic) — las mismas
piezas que `FalloDeCarga` (`titulo`, `descripcion`, `sePuedeReintentar`).

#### Reglas que NO se negocian

| Regla | Por qué |
|---|---|
| **Siempre `<DialogHeader>`** | Da el título 20/28, el subtítulo, el medallón y el lugar de la ✕. Sin él el modal se ve de otra familia. |
| **No toques el tamaño del título** | Lo fija Cadence (20/28). El color tampoco: el estado lo dice el medallón, no un título rojo o ámbar. |
| **Nada de cabeceras con ícono hechas a mano** | Un `WarningCircle` en un recuadro `bg-danger-soft` al lado del título es lo que hace `variant` / `icon`, mejor y igual en todos lados. |
| **El pie es `<DialogFooter>`** | Un `div` a mano no queda fijo, no tiene el fondo suave ni apila bien en el celular. |
| **No le pongas `p-0`, `overflow-y-auto`, `max-h-*` ni `flex flex-col` al Content** | Ya los tiene, y pelean: con `overflow-y-auto` scrollea el panel entero y la cabecera se va. |
| **Destructiva = `variant="destructive"`** | Medallón rojo + botón rojo sobrio + el texto dice exactamente qué se pierde (y qué no). |
| **Cargando ≠ deshabilitado** | `loading` / `isLoading` en el botón principal: spinner y bloqueado, pero conserva su color. Cancelar se deshabilita mientras tanto. |

`DialogContent` **reparte** a sus hijos directos: `DialogHeader` arriba,
`DialogFooter` abajo y lo demás a un cuerpo con scroll (`grid gap-4`). Si
escribís `<DialogBody>` a mano, se respeta tal cual (para darle otro layout).

### La ✕: una sola, y la pone la primitiva

**Ningún call site dibuja una ✕.** Hay UN aspa en todo el producto —un
**círculo con borde fino**, `size-9 rounded-full border border-border
bg-surface`— y vive en `AspaDeCierre` (`src/components/ui/dialog.tsx`, dibujo en
`aspa-de-cierre.ts`, el mismo que `DialogCloseButton` de Cadence). Diálogos y
cajones la heredan.

| Dónde | Quién la pone |
|---|---|
| `DialogContent` (con o sin cabecera) | El Content, como `closeButton` de Cadence: arriba a la derecha, fuera del cuerpo que scrollea; la cabecera le reserva lugar |
| `SheetContent` | El Content, en `right-4 top-[18px] sm:top-3.5` y `z-20` (`sheetCloseClassName` de Cadence: centrada en la línea del título), después de los hijos; `SheetHeader` le reserva el hueco. `closeLabel` le cambia el nombre («Cerrar el documento») |
| `AlertDialog` / `confirmar()` | Nadie: se sale por `Cancelar` o por la acción (y Esc), a propósito |

Para apagarla entera: `hideClose` en `DialogContent` (`hideCloseButton` en
`SheetContent`). Sólo para un modal que no se debe abandonar a medias. El
`hideClose` de `DialogHeader` quedó por compatibilidad y no hace nada.

⚠️ **Un envoltorio de `DialogHeader`/`DialogFooter` tiene que declarar
`bandaDeModal`.** `DialogContent` reparte a sus hijos leyendo esa marca; antes
comparaba identidad de componente y `ResponsiveDialogHeader` no calificaba: la
cabecera se iba al cuerpo con scroll. Así vivió «Agendar una cita» con dos aspas.
`ResponsiveDialog` hoy es el mismo `Dialog` (que ya es hoja de abajo en el
celular).

Una cáscara escrita a mano que todavía exista (`createPortal`) usa
**`rounded-[24px]`**, el mismo radio que la primitiva — pero lo correcto es
pasarla a `Dialog`. `src/components/ui/modales-alineados.test.ts` y
`una-sola-aspa.test.tsx` verifican todo esto.

---

## 18. UI Primitives Inventory

Available at `src/components/ui/` — **check first before creating new components**:

| Primitive | Purpose |
|---|---|
| `accordion` | Collapsible sections (Radix) |
| `alert` / `alert-dialog` | Banners / confirm dialogs |
| `animated-counter` | Counts up on view (mono tabular). Sin consumidores: para cifras nuevas usa `AnimatedNumber` (§8b) |
| `avatar` | User avatars with size/ring variants |
| `back-button` | Standard back button |
| `badge` | Status pills (incl. risk-a/b/c/d) |
| `breadcrumb` | Navigation breadcrumbs |
| `button` | Primary primitive — pill, sentence case (variants + sizes) |
| `card` | Card containers (`rounded-lg`, hairline border) |
| `checkbox` | Checkbox input |
| `collapsible` | Expand/collapse |
| `dialog` | Centered modal (z-[300]) — variantes `confirm`/`destructive`/`info`/`success`/`warning`/`error`, `DialogSection`, `DialogBody` |
| `confirmar` | `confirmar()` / `avisar()`: modales imperativos (reemplazan `window.confirm`/`alert`) |
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
| `sheet` | El cajón flotante: `Sheet` + `SheetHeader`/`SheetNav`/`SheetBody`/`SheetSection`/`SheetFooter` (§4 Drawers) |
| `cajon` | La misma anatomía en español: `Cajon`/`CajonCabecera`/`CajonCuerpo`/`CajonPie` |
| `drawer` | Hoja desde abajo con arrastre (vaul), mismo dibujo. Para un cajón lateral, `sheet` |
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
   - **Drawer**: §4 Drawers + `src/components/inmobiliaria/CandidateDrawer.tsx`, `src/components/inmobiliaria/PipelineDetail.tsx`
   - **Form**: `src/components/auth/AuthForm.tsx`
   - **Layout**: `src/app/panel/inmobiliaria/layout.tsx` + `src/components/ui/plan/PlanSidebar.tsx` + `PlanHeader.tsx`
   - **Button**: `src/components/ui/button.tsx`
3. If still unsure, ask before inventing — extend this doc, don't drift.

---

*Migrated to the Cadence design system (`@leasefy/cadence`). Update this doc when patterns change — don't let it drift.*
