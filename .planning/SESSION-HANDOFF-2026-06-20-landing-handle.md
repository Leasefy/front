# Session handoff — Landing estilo Handle + Sidebar limpia (2026-06-20)

**Repo:** `~/rent/mvp` · **branch:** `feat/leasefy-ds-redesign` · **dev server:** `npx next dev -p 3400` (estaba vivo en :3400)
**Estado git:** TODO untracked/nuevo (nada commiteado): `src/components/landing/`, `src/app/landing-nueva/`, `src/app/sidebar-preview/`, `src/app/agentes-preview/`.
**No se tocó** `docs/DESIGN.md` ni la landing original `/` (sigue intacta).

---

## 1. Qué se construyó

### A) Nueva landing estilo **Handle (usehandle.ai)** — ruta PREVIEW `/landing-nueva`
Clon **visual de Handle** con **Satoshi + indigo Leasefy (#1A40FF)**. NO reemplaza `/`.
- **Empezó como clon de AgentLab**, luego Nico pidió migrarla TODA a **Handle** (más limpia, sans, mucho aire, mockups de producto, botones pill, fondos claros).
- Ver en vivo: **http://localhost:3400/landing-nueva**

**Archivos** (`src/components/landing/`):
- `_kit.tsx` — primitivas compartidas: `EyebrowPill` (pill con borde, uppercase), `lpHeading`/`lpDisplay` (Satoshi **bold**, grandes), `LpButton` (**pill** rounded-full), `Reveal`, `Marquee`, `MockFrame`, `CodeRainPanel`, `PageRails` (rieles punteados), `Eyebrow` (pixel-mark, legacy), `lpBody`.
- `_LANDING-STYLE.md` — contrato de estilo.
- Secciones (orden en `src/app/landing-nueva/page.tsx`):
  1. `LandingNav` — nav limpia Handle (logo + links centrados + switcher ES/EN + pill negro "Contáctanos", sin barra de anuncio)
  2. `Hero` — badge pill + titular **bold gigante 2 líneas** («Tu inmobiliaria, operando en piloto automático.» = copy adaptado del de Handle) + 1 botón pill + **dashboard mock en marco gris** (`bg-neutral-100`, SIN sombra — Nico la quitó)
  3. **`showcase/AgentsShowcaseA`** (id="agentes") — sección de agentes ELEGIDA por Nico
  4. `IntegrationsMarquee` — logo cloud "Se conecta con" (pill con borde, estático)
  5. `ProblemSection` — "Realidad actual": titular izq + 4 columnas con **mini line-art SVG** + divisores
  6. `StatsSection` — "Qué cambia cuando los agentes trabajan": 4 números gigantes (7 / 24·7 / 1 / 100%)
  7. `ArchitectureSection` (id="plataforma") · `InitialProductsSection` · `PricingSection` (id="planes") · `HowItWorksSection` (id="como-funciona") · `FinanceSection` · `RetentionSection` · `TestimonialsSection` · `SecuritySection` (id="seguridad") · `FaqSection` (id="faq") · `FinalCta`
  8. `LandingFooter`

### B) Sección de Agentes — `showcase/AgentsShowcaseA.tsx` (ELEGIDA)
Generada con un **workflow de 3 variantes** (ultracode). Nico eligió la **A — showcase interactivo**: lista de los 8 agentes a la izq + **mock de producto vivo** que cambia al seleccionar (Cobranza→promesas de pago con montos, Matching→% match, etc.). Colocada tras el hero con `id="agentes"`; se quitó el `AgentsSection` grid viejo.
- Variantes NO usadas: `showcase/AgentsShowcaseB.tsx` (bento), `AgentsShowcaseC.tsx` (card-grid line-art) + preview `src/app/agentes-preview/page.tsx`. **Se pueden borrar** si no se van a usar.

### C) Sidebar limpia estilo Handle — preview `/sidebar-preview`
`src/app/sidebar-preview/page.tsx` — clon de la sidebar del backoffice de Handle (Nico la pidió: "muy clean"). Nav agrupada (Inicio / AGENTES / SISTEMA DE REGISTRO) + item activo **negro redondeado** + card de usuario + toggle de tema + main "Pregunta a tus registros".
- ⚠️ **NO aplicada a la sidebar real.** La real es `src/components/ui/plan/PlanSidebar.tsx` (usada por `/panel/inmobiliaria`). Para aplicarla: item activo gris→**negro `rounded-lg`**, agregar card de usuario + toggle de tema + secciones colapsables. Esperar OK de Nico (toca nav del equipo).

---

## 2. Convención de estilo Handle (para seguir puliendo)
- Fondos SOLO claros (`bg-white` / `bg-neutral-50`). Sin secciones negras.
- Eyebrow = `<EyebrowPill>`. Titulares = `lpHeading`/`lpDisplay` (**bold**). Body `text-neutral-500`.
- Botones = `LpButton` (pill; primary negro / light blanco-borde).
- Paleta: neutral-* + primary/indigo + success/warning/error. NADA blue-*/purple-*/serif.
- Números/stats: `font-mono tabular-nums`. Mockups en marco gris neutral-100 sin sombra fuerte.
- Iconos Phosphor named imports. Animación `Reveal` (framer-motion). `container-platform` (px-72).

## 3. Verificación
`npx tsc --noEmit` = 0 errores en landing · `npx eslint src/components/landing src/app/landing-nueva` = limpio. Render verificado en browser (Playwright) para hero, problema, stats, sidebar, showcase A.

## 4. Pendiente / next
- **Pulir sección-por-sección en browser** las migradas por subagentes (Architecture, InitialProducts, Pricing, HowItWorks, Finance, Retention, Testimonials, Security, FAQ, CTA, Footer) — pasaron tsc/eslint pero no se screenshoteó cada una.
- Detalles: sombra del mock del showcase A (igualar a "sin sombra" como el hero), números del dashboard en sans bold (hoy mono), borrar variantes B/C + `/agentes-preview`.
- **Aplicar la sidebar** Handle a `PlanSidebar.tsx` (con OK de Nico).
- **Promover a `/`** = apuntar `src/app/page.tsx` a los componentes de landing (1 archivo) cuando esté listo.
- Commitear (nada está commiteado). Tren de versiones: este repo versiona en `.planning/releases/` (ver convención).

## 5. Gotchas
- ⚠️ NUNCA `git checkout` en `~/rent/mvp` (Nico tiene work sin commitear) — solo agregar/editar archivos.
- La landing original `/` tiene un buscador IA en el hero (no es nuevo — viene del rediseño `feat/leasefy-ds-redesign`, está en `main` también). No confundir con el chat de la nueva.
- Server dev del repo usa `-p 3001` por default; yo levanté uno aparte en `:3400`.
- Memoria: topic `landing-agentlab-clone` (actualizado a Handle) + `version-train-convention`.
