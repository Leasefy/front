# Session handoff — Landing rebuild a estructura NewsCatcher (2026-06-24)

**Repo:** `~/rent/mvp` · **branch:** `feat/leasefy-ds-redesign` · **dev server:** `npx next dev -p 3000` (:3000)
**Ruta:** `/landing-nueva` (preview, no toca `/`). Todo untracked.

## Qué se hizo (giro grande)
La landing venía clonando **Handle**; Nico pidió clonar **NewsCatcher** (newscatcher.ai → News API page).
Primer intento = ERROR: reskinié las secciones Handle viejas con tokens NewsCatcher en vez de
**reconstruir la estructura**. Nico mandó 7 capturas full-res (Desktop `Screenshot 2026-06-24 at 2.52–2.53`)
y pidió clonar **sección por sección, espacio por espacio, tamaño por tamaño**.

**Ahora la página está RECONSTRUIDA con la secuencia exacta de NewsCatcher** (se descartaron las
secciones Handle: Architecture/Pricing/HowItWorks/Finance/Retention/Testimonials/Security/FAQ/Stats/
Integrations/Problem/FinalCta/AgentsShowcase — siguen en el repo pero NO se renderizan).

### page.tsx (orden NewsCatcher)
`AnnouncementBar` (azul) → `LandingNav` → `Hero` → `NCFeatureGrid` (#plataforma) → `NCProblemSplit`
→ `NCProcessCells` (#agentes) → `ComparisonSection` (#comparar) → `NCTagCloud` → `NCCtaSplit` (#contacto) → `NCFooter`

### Mapeo sección ↔ captura NewsCatcher
| Componente nuevo | Captura NewsCatcher | Estado |
|---|---|---|
| `Hero.tsx` | #1 hero (texto centrado + grilla diagonal, SIN mock) | ✅ ok |
| `NCFeatureGrid.tsx` | #2 "Expansive insights" (3-col crosshair, iconos line-art arriba, título+desc abajo) | ✅ ok |
| `NCProblemSplit.tsx` | #3 "Conventional search…" (accordion numerado izq + mock producto der) | ⏳ falta verificar/pulir |
| `NCProcessCells.tsx` | #4 "Precision search… clustering" (2 celdas crosshair centradas) | ✅ ok |
| `ComparisonSection.tsx` | #5 "When accuracy, speed…" (tabs cajas separadas izq + barras der) | ⏳ pulir spacing |
| `NCTagCloud.tsx` | #6 "Navigating news with context" (2 filas de tag pills marquee) | ⏳ verificar |
| `NCCtaSplit.tsx` | #6-bottom "Secure strategic advantage" (titular izq + nota mono + botón der, panel gris) | ⏳ verificar |
| `NCFooter.tsx` | #7 footer multi-columna (badges + social + columnas mono) | ⏳ verificar |

## Tokens NewsCatcher (medidos, en `_kit.tsx`)
- Fuente: **Satoshi** (decisión de Nico; NewsCatcher real = PP Neue Montreal, no la usamos). Mono = Ubuntu Mono.
- Azul NewsCatcher #183FD9 ≈ nuestro indigo **#1A40FF** (`primary`).
- `EyebrowPill` = ▪ cuadrado (5px, `bg-primary`) + mono UPPERCASE slate `text-[#6f7790]`, tracking 0.14em.
- `LpButton` = rectangular `rounded-[4px]`, mono UPPERCASE 11px, primary=negro / light=`bg-[#eeeef2]`.
- `lpHeading`/`lpDisplay` = Satoshi `font-medium` (500), negro `text-neutral-950`, centrados. Section h2 ≈ 52px.
- `AnnouncementBar` (azul, dismissible) + `HeroGrid` (grilla diagonal `rgba(28,40,76,0.10)`, mask fade abajo).

## 🐞 BUG CRÍTICO resuelto (¡recordar!)
`lpHeading`/`lpDisplay` son strings exportados desde `_kit.tsx` que tiene `"use client"`.
**Si un Server Component los importa, Next.js (RSC) los convierte en client-reference objects** →
`className="[object Object] …"` → el titular renderiza a 16px. Síntoma: `getComputedStyle(h2).fontSize===16px`.
**Fix aplicado:** agregué `"use client"` a `NCFeatureGrid` + `NCProcessCells` (y cambié su import de iconos
de `@phosphor-icons/react/dist/ssr` a `@phosphor-icons/react`). Todos los h2 ahora a 52px ✅.
**Mejora futura:** mover los recipes string a un módulo plano sin `"use client"` (p.ej. `_recipes.ts`) para
que sirvan en server+client sin este bug.

## Pendiente (próxima sesión) — pulido pixel-a-pixel contra las 7 capturas
1. Verificar en browser (`:3000`, scrollear sección por sección — usan `Reveal` whileInView):
   `NCProblemSplit`, `ComparisonSection` (tabs separadas ya), `NCTagCloud`, `NCCtaSplit`, `NCFooter`.
2. Comparar contra cada captura: spacing, tamaños, el **grid crosshair** (las líneas deben sobresalir
   formando "+"; verificar que los ticks `-top-2 -bottom-2` se vean).
3. Gaps conocidos aún: la **fuente** nunca será idéntica (Satoshi vs PP Neue Montreal). El resto debe calzar.
4. Nico quería que se vea **IGUAL** — comparar componente por componente.

## 🎬 AMOR / animaciones (Nico: "le falta amor; mirá las animaciones del sitio en vivo")
Estudié la web EN VIVO (`https://www.newscatcherapi.com/news-api`), no el HTML estático.
**Técnica NewsCatcher:** SVG + CSS/Webflow-IX2 (NO Lottie, NO canvas, NO Rive). Animaciones vistas:
`top-line-close` / `bottom-line-close` (líneas del grid que se cierran/dibujan), `progressLine`.
El "amor" está en:
- **Iconos wireframe 3D que ROTAN** (esfera/cono/cubo) — ✅ YA IMPLEMENTADO en `NCFeatureGrid.tsx`
  (`<Wire>` = motion.svg rotando 26s + hover: card sube línea-acento, icono escala/rota, título→indigo).
- **Líneas del grid que se dibujan al entrar en viewport** (animar `width/height` 0→full con whileInView).
- **Demos de producto animados**: proximity-search (tags Amazon/Alexa aparecen secuenciales), clustering
  (cards se agrupan), barras del benchmark que crecen. → animar dentro de NCProblemSplit/ComparisonSection.
- **Hover en cards** (lift + accent + icon motion) — patrón aplicado en NCFeatureGrid, replicar en todas.
- **Scroll-reveal escalonado** (stagger delay por item) — usar el patrón de NCFeatureGrid (motion.div
  whileInView + delay 0.08*i).
- **Tag pills marquee** (NCTagCloud) — ya scrollean; agregar pause-on-hover.

**PLAN próxima sesión (con contexto fresco, hacerlo HERMOSO):**
1. Aplicar iconos wireframe animados + hover a todas las secciones que tengan iconos.
2. Animar el mock de NCProblemSplit (tags/cards aparecen secuenciales en loop).
3. Animar las barras de ComparisonSection (crecen al entrar en viewport + al cambiar de tab).
4. Animar las líneas de los crosshair-grids (draw-in con whileInView).
5. Hover lift + accent en todas las cards. Stagger reveals everywhere.
6. Hero: considerar un sutil parallax/animación en la grilla diagonal.
7. Comparar SIEMPRE contra el sitio EN VIVO (no el HTML estático) para ver las animaciones reales.

## 🔘 BOTONES = los del producto (2026-06-24 PM/3) — pedido de Nico
"los botones de la landing si deberian ser los mismos de dentro del producto". `LpButton` (en `_kit.tsx`)
ya NO renderiza el botón rectangular mono-uppercase de NewsCatcher; ahora **envuelve el `Button` del
producto** (`@/components/ui/button`, adapter sobre `@leasefy/ui`) vía `asChild` + `<Link>`. Mapeo de
variants: primary→`default` (indigo `#1A40FF` + **ArrowUpRight automática**), light→`secondary` (blanco +
borde), white→`white`, outline-light→`outline`, ghost→`ghost`. Nuevo prop `size` (default/sm/lg; default
`lg` para CTAs prominentes, nav usa `default`). `arrow={false}` fuerza ocultar la flecha (vía `hideArrow`).
Se borraron `DottedArrow` + `LP_BTN`. Verificado en browser: todos rounded-md(8px), Satoshi, primary indigo
con flecha. Esto APLICA a TODOS los call sites de LpButton (incl. secciones Handle viejas no renderizadas).
⚠ `_LANDING-STYLE.md` describe el botón viejo (pill) — desactualizado.

## 🎬 PASO DE ANIMACIÓN APLICADO (2026-06-24 PM/2) — "amor", comparado vs sitio EN VIVO
Estudié el sitio EN VIVO con Playwright (computed styles + keyframes reales). Keyframes de NewsCatcher
detectados: `spin`, `top-line-close/open`, `bottom-line-close`, **`progressLine` (7s lineal)**,
`moveInCircle/Vertical/Horizontal`. **Hallazgo clave:** el accordion "Conventional search" es un
**Webflow w-tabs que AUTO-AVANZA cada 7s** con una hairline de progreso bajo el item activo, y el mock
de la derecha **cambia por item**. Eso era lo que faltaba.

**Infra nueva en `_kit.tsx`:**
- `useAutoTabs(count, {interval, paused})` — hook de tabs que auto-avanzan; click resetea, hover pausa.
- `ProgressLine` — hairline CSS (`lpProgress`) que llena 0→100% sobre el dwell, remonta por `cycleKey`,
  congela con `paused` (animation-play-state). Keyframe en `globals.css`.
- `Marquee` reescrito a CSS (`lpMarquee`/`lpMarqueeReverse`) con **pause-on-hover** real (`[animation-play-state:paused]`).
- `AmbientField` — blobs de gradiente lentos (`lpMoveCircle/Vertical/Horizontal`) = la firma ambiente NewsCatcher.
- Keyframes nuevas en `globals.css`: `lpProgress`, `lpMarquee(+Reverse)`, `lpMove*` + guard `prefers-reduced-motion`.

**Por sección:**
- **NCProblemSplit** = pieza central. Accordion AUTO-AVANZA 7s + progress line bajo el activo; el mock
  derecho **SWAPEA por item** con 3 mockups animados distintos (AnimatePresence + stagger):
  01 `MatchMock` (matching 94% Chapinero), 02 `CarteraMock` (cobranza: statuses Al día/Mora/Recordatorio +
  barra recaudado 82%), 03 `EstudioMock` (scorecard Riesgo bajo + barras ingresos/estabilidad + checks).
  Marco con corner-ticks. ✅ verificado en browser (mock cambia con el item).
- **ComparisonSection** = REFORZADA "con mucho amor" (Nico pidió mejorarla muchísimo): tabs de dimensión
  con ICONO (Stack/Lightning/ShieldCheck) + accent-bar indigo + shadow en el activo, AUTO-AVANZAN 6s +
  progress line + pausa al hover. Panel der: header con chip-icono + label mono + **takeaway dinámico que
  cambia por dimensión**. Barras re-crecen EN CASCADA (delay por fila) en cada cambio; **números COUNT-UP
  0→valor** (`CountUp` con framer `animate()`); fila Leasefy con badge "✦ MEJOR" + **sheen** barriendo la
  barra (`lpSheen` keyframe). ✅ verificado (count-up asienta correcto por dimensión, sheen activo).
- **NCFeatureGrid** = rieles del crosshair DIBUJAN al entrar (scaleX/scaleY whileInView, stagger) + iconos
  wireframe rotando + hover (línea-acento, icono escala/rota, título→indigo). Fallback de bordes en mobile.
- **NCProcessCells** = rieles crosshair draw-in + celdas con reveal escalonado + hover (núm/título→indigo).
- **NCTagCloud** = marquee con pause-on-hover + pills con hover (borde/tint indigo).
- **Hero** = `AmbientField` (blobs) detrás de la grilla diagonal + entrada escalonada (ya estaba).
- **NCCtaSplit** = `AmbientField` sutil (opacity-60) en el panel gris + botón con flecha.

**Estado:** tsc limpio (filtrado a landing), eslint limpio, sin regresión `[object Object]` (todos los h2 a
52px). Server :3000 OK. Fix TS: variants de framer necesitan `ease` tipado como tupla `[number,number,number,number]`
(no `number[]`) — definido `const EASE` en NCProblemSplit. Capturas de verificación tomadas (problem-split en
item 03=Estudio, comparison en Automatización, feature-grid con iconos+crosshair).

**Pendiente / siguiente:** revisar fino vs capturas el resto (Footer/CtaSplit spacing), y si Nico quiere,
animar el draw-in de las líneas también en NCProblemSplit/Comparison. La DIRECCIÓN de "amor" ya está aplicada
en todas las secciones. `_LANDING-STYLE.md` aún dice "Handle" (actualizar a NewsCatcher).

## Últimos cambios previos (fin de sesión, 2026-06-24 PM/1)
- ✅ **Iconos wireframe 3D animados** en `NCFeatureGrid` (`<Wire>` esfera/prisma/cubo rotando 26s con
  framer-motion) + hover en cards (línea-acento indigo que crece, icono escala/rota, título→indigo) +
  reveal escalonado. = primer "amor" real, mirror del detalle firma de NewsCatcher.
- ✅ **Titulares MONOCROMO** (todo negro): quité el two-tone gris (era de Handle) en `NCProblemSplit`
  ("multiplica el trabajo") y `ComparisonSection` ("no herramientas sueltas"). REGLA: NewsCatcher NUNCA
  usa títulos en dos tonos — todos `text-neutral-950` un solo color. (Revisar que no quede two-tone en
  NCTagCloud/NCProcessCells/NCCtaSplit/NCFeatureGrid.)
- ✅ **Accordion `NCProblemSplit` con títulos GRANDES** (text-[26px] md:text-[34px], activo negro /
  colapsado neutral-300) — antes estaban a text-xl (muy chicos). Ahora matchea la captura #2 (zoom accordion).
- 🐞 Bug `[object Object]` (lpHeading en server component) → resuelto con "use client" en NCFeatureGrid+NCProcessCells.

**Nico sigue insatisfecho con el nivel de pulido/animación general** ("le falta amor"). Lo entregado es
la DIRECCIÓN correcta (iconos animados + hover); falta APLICARLO a todas las secciones (ver plan 🎬 arriba)
y comparar SIEMPRE contra el sitio EN VIVO (no el HTML estático ni mi memoria).

## Gotchas
- ⚠️ NUNCA `git checkout` en `~/rent/mvp` (Nico tiene uncommitted en otra branch).
- El HTML de referencia de NewsCatcher ya NO está en Downloads (solo quedó `_files/`); usar las 7 capturas.
- `_LANDING-STYLE.md` todavía dice "Handle" — actualizar a NewsCatcher.
- Server dev en :3000 (`npx next dev -p 3000`). Build OK, eslint+tsc limpios en landing.
