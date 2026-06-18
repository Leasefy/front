# Leasefy — Contrato de UI (adopción del Design System) · 2026-06-16

Origen: Nico marcó la UI del panel como inconsistente ("parece un botón y no un chip",
"no hay definición clara de CTAs", "texto más grande unos que otros", "rounded diferentes",
"secondary unos blancos otros no", "¿tenemos definición de links?"). Causa raíz: **existe un
design system completo (`@leasefy/ui`) y las pantallas lo evaden** con `<button>` crudo + hex
inline (`bg-[#1A40FF]`). Este doc es la **única definición clara**. Toda pantalla del panel se
alinea a esto. No se modifican los primitivos del DS — se **adoptan**.

---

## 0. Reglas duras (no negociables)
- **Cero hex inline de marca.** Nunca `bg-[#1A40FF]`, `text-[#1A40FF]`, `border-[#...]`. Usar
  tokens: `bg-primary`, `text-primary`, `bg-primary-soft`, `bg-surface`, `bg-surface-muted`,
  `bg-card`, `bg-bg`, `text-fg`, `text-fg-muted`, `border-border`, `bg-danger`/`text-danger`.
- **Cero `<button>` crudo accionable.** Todo botón = `<Button>` del DS.
- **Un solo radio para controles:** `rounded-md` (8px) — ya es el default de `<Button>`/`<Chip>`.
  `rounded-full` SOLO para badges de estado y avatares. Nunca botones/chips/inputs pill.
- **No tocar:** `node_modules/**`, `src/components/ui/**` (primitivos, congelados — solo importar),
  `src/app/panel/inmobiliaria/layout.tsx`, `auth-context.tsx`, `PermissionsContext.tsx`,
  `*.test.tsx`, barrels `index.ts`, `src/lib/i18n/**`. Nunca `git`/`pnpm`/`tsc`/`next build`.
- **Solo UX/visual.** No cambiar data-fetching, hooks, props de datos, rutas ni lógica. T-323:
  nunca auto-rechazar; acciones sin backend = placeholder honesto ("Próximamente").

## 1. Imports
- Core desde el adapter mvp: `import { Button, Card, Badge, EmptyState, Tabs, Input, Textarea, Select } from "@/components/ui"`
- Ricos desde el DS: `import { Chip, SegmentedControl, KpiCard, Stat, PageHeader, EmptyHero, Stepper, Timeline, ListRow, Tag, StatusBadge, Eyebrow, QuickActionChips } from "@leasefy/ui"`
- Si dudás de props de un componente DS, **leé** `node_modules/@leasefy/ui/src/components/ui/<name>.tsx` antes de usarlo (evita errores de tsc).

## 2. Botones — UN contrato
Variantes (`<Button variant=...>`), radio fijo `rounded-md`, altura fija por `size`:
| variant | uso | aspecto |
|---|---|---|
| `default` | **acción principal — UNA por vista/sección** | azul sólido |
| `secondary` | acción secundaria junto a la principal (header) | blanco + borde |
| `outline` | acción terciaria / toolbar | transparente + borde |
| `ghost` | icon-buttons, acciones de fila/baja jerarquía | sin fondo |
| `link` | **navegación inline de texto** ("Ver detalle", "Editar") | texto azul, subraya en hover |
| `destructive` | solo destructivo | rojo |

- `size`: `sm` (toolbars/filas densas) · `default` (estándar) · `lg` (CTA de hero/empty) · `icon`.
- **Flecha:** `<Button>` pone una `ArrowUpRight` automática en `default`/`white`. Es firma de
  marketing — en acciones de app pasá **`hideArrow`** salvo que sea un CTA tipo hero.
- **Secondary = SIEMPRE `secondary`** (blanco + borde) en headers → resuelve "secondary unos
  blancos otros no". No mezclar con `outline` en el mismo contexto.
- **Links:** navegación de texto inline = `<Button variant="link">` o clase canónica
  `text-primary underline-offset-4 hover:underline font-medium`.

## 3. Chips vs Segmented vs Badge (la queja central)
- **`<SegmentedControl>`** → selector **excluyente** (1 opción): p.ej. "Empleado / Independiente /
  Pensionado…". **NUNCA** un botón azul sólido por opción.
- **`<Chip>`** → **multi-select / filtros / tags**: p.ej. documentos (Cédula, Certificación…).
  Seleccionado = relleno azul claro (`bg-primary-soft text-primary`), `rounded-md`, `h-7`.
  Nunca `rounded-full`, nunca azul sólido. Props: `selected`, `removable`, `onRemove`, `icon`.
- **`<Badge>` / `<StatusBadge>` / `<Tag>`** → etiqueta/estado **no interactivo** (acá sí pill).
- **`<QuickActionChips>`** → atajos de acción en empty/hero.

## 4. Tipografía (escala fija — resuelve "textos disparejos")
- Título de página `h1`: `text-2xl font-semibold tracking-tight text-fg`
- Descripción de página `p`: `text-sm text-fg-muted max-w-2xl`
- Título de sección/card `h2/h3`: `text-base font-semibold text-fg`
- Eyebrow (único uppercase permitido): `<Eyebrow>` o `text-xs font-medium uppercase tracking-wide text-fg-muted`
- Cuerpo: `text-sm text-fg` · Meta/secundario: `text-xs text-fg-muted`
- Números KPI: **`<KpiCard>` / `<Stat>`** (no hand-roll). Nunca tamaños arbitrarios `text-[15px]`.
- Sentence case siempre. Nada de mono/uppercase salvo el Eyebrow.

## 5. Page header (patrón único)
`<PageHeader>` del DS, o el patrón inline canónico:
```
<div className="flex items-start justify-between gap-4">
  <div className="space-y-1">
    {/* eyebrow opcional */}
    <h1 className="text-2xl font-semibold tracking-tight text-fg">Título</h1>
    <p className="text-sm text-fg-muted max-w-2xl">Descripción.</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Button variant="secondary" hideArrow>Acción secundaria</Button>
    <Button hideArrow>Acción principal</Button>
  </div>
</div>
```
- Una sola `default` (azul). Las demás `secondary`. Mismo `size`. Alineadas a la derecha, `gap-2`.

## 6. Empty states (resuelve "pelado" + CTA duplicado)
- Usar **`<EmptyState icon title description action?>`** (ícono mudo + título + desc + **UNA** acción).
- **Nunca duplicar el CTA.** Si el header ya tiene la acción principal → `EmptyState` SIN `action`.
  Si no hay header CTA → el `EmptyState` es dueño de la única acción. (Mata el doble "Ver estudios".)
- Primer uso / hero conversacional → `<EmptyHero>`.
- Una sección vacía nunca queda como texto centrado suelto: va `EmptyState`, con buen ritmo vertical.

## 7. Pasos / flujos (Equipo IA, "¿Cómo funciona?", Solicitud) — iconografía DS
Decisión de Nico: **ilustración/iconografía del DS, sin assets nuevos.** Patrón:
- Nodo de paso = chip de ícono `rounded-md` + número + título + sublíneas. Ícono Phosphor
  `weight="duotone"`. Activo: `bg-primary-soft text-primary`. Inactivo: `bg-surface-muted text-fg-muted`.
- Vertical (Equipo IA): nodos conectados por hairline `border-l border-border`/conector.
- Horizontal ("¿Cómo funciona?"): grid 4-up parejo, mismo alto, mismo tamaño de texto.
- Usar `<Stepper>` / `<Timeline>` del DS donde calce. Métricas por paso = `<Stat>` con em-dash si vacío.

## 8. Cards, KPIs, errores
- Card shell: `<Card>` o `rounded-xl border border-border bg-card p-5`. Radio de card = `rounded-xl`.
- KPIs: `<KpiCard>`/`<Stat>` — mismo tamaño de número, mismo chip de ícono, `rounded-lg`. Tints
  semánticos vía token (ok=verde, warn=ámbar, bad=rojo, info=azul) consistentes.
- Errores de carga: `<ErrorState>` (DS/`@/components/ui/error-state`) con `Reintentar` como
  `<Button variant="outline">` o `default` — consistente, no un pill azul suelto.

## 9. i18n
- Mantener los `t()` y keys existentes. Minimizar copy nueva. Para copy nueva, **string literal en
  español** (plataforma ES-first) — no introducir keys `t()` inexistentes (renderizan crudo).

## 10. Ritmo / spacing
- Padding de página y `space-y-6`/`gap-6` entre secciones, consistente. Sin huecos verticales sueltos.
