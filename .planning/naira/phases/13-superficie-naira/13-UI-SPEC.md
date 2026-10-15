---
phase: 13
slug: superficie-naira
status: approved
reviewed_at: 2026-09-27
shadcn_initialized: true
preset: "components.json new-york / slate / cssVariables (sin registries de terceros) + preset Tailwind @leasefy/cadence (file:../cadence)"
created: 2026-09-27
repo: Leasefy/front (worktree /Users/nicolasgarcia/rent/wt-front-naira, rama project/naira-superficie, base origin/Main 5e3a6f85)
requirements: [UI-01, UI-02, UI-03]
consume_contratos_de: [API-01 (9.5-06, 10-06, 11-07, 12-07, naira-memory.ts ejecutado)]
---

# Phase 13 — UI Design Contract · Superficie de Naira en `Leasefy/front`

> Contrato visual y de interacción de la Fase 13 (cross-repo). Lo generó `gsd-ui-researcher`; lo valida `gsd-ui-checker`;
> lo consumen `gsd-planner`, `gsd-executor` y `gsd-ui-auditor`. **Solo planificación**: nada de esto está construido.
> Donde el flujo normal habría preguntado, se decidió con una recomendación marcada 🔔 (supuesto para Nico; se planifica igual).
> Todo `archivo:línea` citado se midió el 2026-09-27 sobre la base `5e3a6f85` (front) y `8fef66ed` (agent-account-manager).

## Δ REBASE (2026-09-28) — la base cambió a `cambios-nico-10` @ `4ad6c188`: MANDA `13-CONTEXT.md` §0 y D13-1′/D13-19..22

Este contrato visual se aprobó contra `5e3a6f85`. Donde choque con la base nueva rige el CONTEXT: **ubicación** = módulo N2 de la
sección «Agentes IA» con la MISMA URL `/panel/inmobiliaria/reportes/naira`, sin píldora IA, migaja «Agentes IA › Naira › …» (no
«Reportes › Naira»; D13-1′ 🔔); **tipografía** sin `text-xs` (guardián `doce-pixeles`): rótulos en `text-overline`/`text-label`,
contenido en `text-caption` (D13-20 🔔); **drill-down** a `/pagos/*` en lugar de `/cobros/*` (D13-21); `PageGuard` ya no redirige:
pinta el cartel de 403 (RB-3); la intro se marca vista en el back (D13-22). El resto del contrato (estados, 403 sin residuo,
categorías, `claimClass`, B-5, copy en tuteo, a11y) no cambia.

***

## 0 · Resumen en una pantalla

| Tema | Decisión |
|---|---|
| Design system vigente | **Cadence** vía `@leasefy/cadence` (`package.json:31`, `file:../cadence`) + shadcn `new-york` (`components.json`) + tokens `var(--…)` en `src/app/globals.css`. **No** existe `@leasefy/ui`. El `/admin` (`admin.css`) **no** se usa. |
| Iconos | **Solo Phosphor** (`@phosphor-icons/react`): 760 archivos de `src/` lo importan, **0** importan `lucide-react` (medido). |
| Ubicación 🔔 U1 | Naira es un **workspace N3 de agente** (`agente: 'naira'`) dentro del módulo **Reportes** (grupo `pie`, scope `general`): `/panel/inmobiliaria/reportes/naira`. Sin fila nueva en el sidebar, sin namespace propio. |
| Pestañas 🔔 U3 | Briefing · Seguimiento · Aprobaciones · Preguntar · Qué cree Naira (vía `WorkspaceNav`). Fichas N4: `senales/[promocionId]`, `seguimiento/[loopId]`, `aprobaciones/[proposalId]`. |
| Inicio y Chat 🔔 U2 | `/piloto` y `/` **no se tocan en v1** (el Piloto ya tiene «la lectura del Gerente» y un recaudo del mes: dos briefings y dos números del mismo concepto en una pantalla). |
| Color | Neutro/sobrio (`CLAUDE.md` del front, «Colores UI agentes»). Cobalto `#1A40FF` solo en la lista cerrada de §5. Las 6 categorías de INV-03 se distinguen por **etiqueta + icono + estilo de borde**, nunca por color. |
| Copy | **Tuteo** (medido en `src/lib/i18n/locales/es.json`: «tienes» 41, «puedes» 50, «intenta» 56; 0 formas de voseo). |
| 403 | Lectura **principal** en 403 ⇒ pantalla «sin permiso» que reemplaza TODO el cuerpo de la vista, sin un solo dato previo (ni en caché); lecturas **secundarias** (tareas en Aprobaciones, loop de una señal) en 403 ⇒ su sección se omite sin rastro; **escrituras** en 403 ⇒ aviso en línea «No tienes permiso para esta acción.» sin eco de datos (§8.2). |
| Choques con el ROADMAP/contratos | 17 medidos (§14). Los que bloquean criterios: el briefing no expone el inventario del silencio (C3), ninguna cita causal trae `claimClass` (C5), la respuesta de la conversación es texto plano sin secciones ni refs tipadas (C6), el listado de propuestas no trae cortes (C16), las cifras de la conversación no tienen drill-down (C17), los enlaces del correo apuntan a `/naira/*` en la raíz (C2). Van como enmiendas E13-1..E13-8 para el orquestador (E13-7 `AccionListada.asOfs`, E13-8 refs por cifra en `respondida`). |

---

## 1 · Design System (medido en la base, no supuesto)

| Property | Value | Evidencia |
|---|---|---|
| Tool | shadcn (`style: new-york`, `rsc: true`, `baseColor: slate`, `cssVariables: true`, `registries: {}`) | `components.json` |
| Preset | Preset Tailwind de Cadence (`@leasefy/cadence/tailwind-preset`) puenteado por `tailwind.leasefy.ts` + `tailwind.alpha.ts` (alpha sobre `var()`); `tailwind.config.ts:9` lo aplica como `presets`. No se corrió `npx shadcn info` (el worktree no tiene `node_modules` y esta fase no instala nada). | `tailwind.config.ts:7-15`, `tailwind.leasefy.ts` |
| Component library | Radix (vía primitivas `src/components/ui/*`) + componentes Cadence (`@leasefy/cadence`: `IconButton`, `MonoLabel`, `Chip`, `StatusBadge`, `Banner`, `Callout`, `KeyValueList`, `MessageBubble`, `SegmentedControl`) | `src/components/ui/`; imports medidos en `src/` |
| Icon library | Phosphor (`@phosphor-icons/react` 2.1.10), `weight="regular"` por defecto, `fill` para activo | `docs/DESIGN.md` §5; 0 usos de lucide (medido) |
| Font | Schibsted Grotesk (`font-sans`, texto) + JetBrains Mono (`font-mono`, **todo numeral, etiqueta, ID**) | `docs/DESIGN.md` §3; `tailwind.config.ts:30-33` |
| Fuente de verdad visual | `docs/DESIGN.md` (obligatorio por `CLAUDE.md` del front) + `docs/COLOR_SYSTEM.md` + `docs/VOCABULARIO.md` | — |

**Notas de medición que el executor necesita (trampas reales de la base):**

- `.text-h2` **no** es lo que dice `DESIGN.md` §3 (22/28, 600): en `src/app/globals.css:707-710` es `text-2xl md:text-3xl lg:text-4xl font-bold`. Esta fase **no usa** `.text-h2` ni `.text-label` (11px): declara tamaños Tailwind explícitos (§4). El patrón hermano de encabezado de página es `h1 text-2xl font-semibold tracking-tight` + bajada `text-sm` (medido en 12 de 15 páginas del panel, `src/app/panel/inmobiliaria/piloto/page.tsx:39-43`).
- Una clase de Tailwind inexistente no falla: no genera nada (`docs/DESIGN.md` §2). Todo token usado acá está en la tabla de roles de `docs/COLOR_SYSTEM.md` (§«Semantic Tokens»). Prohibidos: `bg-surface-raised`, `bg-surface-sunken`, `text-fg-secondary`, `border-border-subtle`, `bg-error-bg`, paletas crudas (`blue-*`, `gray-*`, `amber-*`…).
- Los tonos de feedback **no aceptan opacidad** (`bg-warning-soft/70` no se genera, `docs/DESIGN.md` §2): hover por `hover:opacity-*`.
- `CLAUDE.md` del front dice «Iconos: Phosphor + Lucide» y `components.json` declara `iconLibrary: lucide`: ambos están desactualizados frente al código (0 imports de lucide). Manda `DESIGN.md` §5: **Phosphor solo**.
- `@leasefy/cadence` es primera parte (repo hermano `../cadence`), no un registry de terceros.

---

## 2 · Ubicación y arquitectura de información

### 2.1 · Qué quiere decir hoy «dentro del AI Hub existente» (criterio 1 del ROADMAP §Phase 13)

El ROADMAP (`agent-account-manager/.planning/agents/account-manager/ROADMAP.md:380-395`) pide que briefing, open loops,
conversación y detalle de señal vivan «dentro del AI Hub existente — no se crea una página nueva ni una sección paralela».
Ese hub **ya no existe** en la base:

- el namespace `/panel/inmobiliaria/ai` murió y un test lo impide en código (`src/lib/nav/arquitectura-del-panel.test.ts:91-98`);
- la vitrina `/panel/inmobiliaria/configuracion/agentes` redirige a Configuración («la sección de Agentes IA ocultala», `src/app/panel/inmobiliaria/configuracion/agentes/page.tsx`);
- hoy un agente es un **WORKSPACE N3 dentro del módulo dueño del proceso**, declarado como dato (`src/lib/nav/arquitectura-del-panel.ts:37-80`, `agente: '<slug>'`), con sus pestañas en `AGENT_WORKSPACES` (`src/lib/nav/agentWorkspaceNav.ts`) que pinta `WorkspaceNav` debajo de las tarjetas del módulo; Inicio (`/piloto`) y Chat (`/`) viven en el layout y «no se tocan» (`arquitectura-del-panel.ts:79`).

**Traducción que rige esta fase:** Naira es un workspace más, declarado con el mismo mecanismo (`agente: 'naira'`), sin
fila propia en el sidebar, sin namespace, sin cromo nuevo. Eso cumple la intención del criterio («no una sección paralela»)
sobre la arquitectura que existe hoy.

### 2.2 · Dónde cuelga 🔔 U1

**Módulo `reportes`** (grupo `pie`, `scope: 'general'`, `arquitectura-del-panel.ts:263`), como pantalla hermana de
«Resumen del negocio», «Rentabilidad» y «Desempeño IA»:

```ts
// arquitectura-del-panel.ts → módulo 'reportes' → pantallas (se AGREGA al final)
{ labelKey: 'inmobiliaria.ai.nav.naira', href: r('/reportes/naira'), icon: Compass, module: 'naira', ia: true,
  agente: 'naira', hintKey: 'inmobiliaria.ai.nav.nairaHint' }
```

Por qué Reportes: Naira lee **tres dominios** a la vez (`DomainRole = 'cartera' | 'portafolio' | 'prospectos'`,
`agent-account-manager/src/naira/attribution/types.ts:362`) y el catálogo tiene métricas de cartera, inmuebles, prospectos
y SLA; no es el agente de UN proceso (como Cobranza de Cobros), es la lectura transversal de la agencia, y el único módulo
transversal del árbol es Reportes (`scope: 'general'`). Reusa sin cambios `SeccionesDelModulo`, `WorkspaceNav`,
`AgentHeaderBreadcrumb` («Reportes › Naira › Briefing») y `CabeceraDelAgente`/`AgentIntroModal`.

Alternativas descartadas (quedan para Nico): (a) `/panel/inmobiliaria/piloto/naira` — el Piloto no está en la arquitectura
ni tiene `WorkspaceNav`, habría que inventar un segundo mecanismo de pestañas; (b) N3 de Cobros — Naira no es de cobranza y
un OPERATOR de inmuebles lo buscaría en otro lado.

Guardianes que ya existen y la ubicación debe pasar (`arquitectura-del-panel.test.ts`): cada pantalla y cada pestaña de
agente tiene su `page.tsx`; el `basePath` de `AGENT_WORKSPACES` y el `href` con `agente` coinciden; ningún icono ni nombre se
repite entre las pestañas de un mismo módulo (`Compass` no lo usa ninguna fila, medido); `es.json` **y** `en.json` tienen cada clave.

### 2.3 · Rutas y pestañas 🔔 U3

Base `B = /panel/inmobiliaria/reportes/naira`. Todas son Client Components bajo el patrón del panel (`page.tsx` + `XxxView.tsx` + `XxxClient.tsx`).

| Pestaña (orden) | Ruta | Icono | Gate de la pestaña (acción de `naira` en `/my-permissions`) | Endpoint principal |
|---|---|---|---|---|
| Briefing (raíz, `exact`) | `B` (`?dia=YYYY-MM-DD` opcional) | `Newspaper` | `briefing-view` | `GET /api/agency/{agencyId}/naira/briefing?dia=` (`getNairaBriefing`, 10-06) |
| Seguimiento | `B/seguimiento` | `ArrowsCounterClockwise` | `open-loops-view` | `GET …/naira/open-loops` (`listNairaOpenLoops`, 11-07) |
| Aprobaciones | `B/aprobaciones` | `SealCheck` | `action-view` | `GET …/naira/actions` + `GET …/naira/tasks` (12-07) |
| Preguntar | `B/preguntar` | `ChatTeardropText` | `conversation-ask` | `POST …/naira/conversation/questions` (`askNaira`, 9.5-06) |
| Qué cree Naira | `B/memoria` | `Notebook` | `memory-view` | `GET …/naira/memory` (`getNairaMemoryView`, ejecutado: `agent-account-manager/src/server/routes/naira-memory.ts:183-199`) |

| Ficha N4 (no es pestaña; la pestaña dueña queda activa por prefijo) | Ruta | Endpoint |
|---|---|---|
| Detalle de señal | `B/senales/[promocionId]` | `GET …/naira/signals/{promocionId}` (`getNairaSignalDetail`, 10-06) — acción `signal-view` |
| Bitácora de un loop | `B/seguimiento/[loopId]` | `GET …/naira/open-loops/{loopId}` (`getNairaOpenLoop`, 11-07) |
| Propuesta de acción | `B/aprobaciones/[proposalId]` | `GET …/naira/actions/{proposalId}` (`getNairaAction`, 12-07) — **registra `presentada`** |

Todas las fichas N4 montan `VolverALaLista` (`src/components/inmobiliaria/ai/VolverALaLista.tsx`) hacia su pestaña. La
señal es ruta (no cajón) porque la enlazan el correo y WhatsApp del briefing (C2): un cajón no tiene URL.

### 2.4 · Permisos en el front 🔔 U4

- `src/lib/auth/agent-module-access.ts` gana `naira?: string[]` en `AgentModulePermissions` (`:24-32`) y `'naira'` entra a
  `FAIL_CLOSED_MODULES` (`:33`): payload ausente, agente caído o acción no otorgada ⇒ **denegado**.
- `canAccess('naira', 'view')` (lo que usan el sidebar y `SeccionesDelModulo`) = la lista `naira` existe y **no está vacía**.
- `WorkspaceNavItem` gana `action?: string` (por defecto `'view'`) y `WorkspaceNav` filtra con `canAccess(item.module, item.action ?? 'view')` (hoy `'view'` fijo, `src/components/inmobiliaria/ai/WorkspaceNav.tsx:36`). Cambio aditivo: los otros workspaces no cambian.
- Cada `page.tsx` va envuelta en `PageGuard module="naira" action="<acción de la pestaña>"` (`src/components/auth/PageGuard.tsx:48-52` redirige si el front ya sabe que no hay acceso). El **403 del servicio** (el front puede creer que sí y el agente decir que no: `PageGuard` deja pasar a `isAdmin`, `:48`) se pinta como §8.2, nunca como redirección silenciosa.
- La UI **nunca nombra roles** (el agente usa `OWNER|ADMIN|OPERATOR|VIEWER`, `agent-account-manager/src/server/routes/permissions-matrix.ts:70`; el front usa `ADMIN|AGENTE|CONTADOR|VIEWER`, `src/lib/auth/agency-roles.ts`): decide solo por la lista de acciones y por `puedeDecidir` del servidor.

### 2.5 · Inicio y Chat 🔔 U2

En v1 **no** se agrega nada de Naira a `/panel/inmobiliaria/piloto` ni al chat `/panel/inmobiliaria`. Motivo medido: el
Piloto ya pinta «la lectura del Gerente» (`piloto/page.tsx`, `usePilotoBriefing` → `GET …/ai-hub/briefing`) y
`recuperadoMesCop` (`src/lib/api/piloto.ts:120`), mientras Naira tiene `cartera.recovered_cop_30d` («Recaudo de los últimos
30 días», catálogo `agent-account-manager/src/naira/metrics/catalog.ts:221-231`): dos briefings y dos números del mismo concepto
con cortes distintos en una pantalla es exactamente el bug que NOT-11/EVAL-10 prohíben. El chat del Inicio despacha a otro
backend (`ChatContainer`) que no conoce las compuertas de Naira (`asOf`, linters). Alternativa para Nico: una fila de entrada
**sin números** en el encabezado del Piloto («Ver el briefing de Naira») una vez reconciliado el briefing del Gerente.

### 2.6 · Presentación del agente

`AGENT_INTROS` (`src/components/tour/AgentIntroModal.tsx:36-88`) gana la entrada `naira` (slug `naira`, imagen libre
`/images/features/leasefy-brand-10.jpg` 🔔 U16, claves `inmobiliaria.ai.intro.naira.{title,description}`), CTA «Entendido» como los demás.

---

## 3 · Spacing Scale

Escala de 4 pt de Cadence (`docs/DESIGN.md` §2 «Spacing»). Solo estos valores (todos múltiplos de 4):

| Token | Value | Clase Tailwind | Uso en esta fase |
|---|---|---|---|
| xs | 4px | `gap-1`, `p-1` | icono ↔ texto dentro de un chip; separación chip ↔ chip en fila |
| sm | 8px | `gap-2`, `px-2`, `space-y-2` | filas de metadatos de un ítem (corte · fuente · enlace); botones de feedback entre sí |
| md | 12px | `gap-3`, `space-y-3` | bloques dentro de una tarjeta (título → valor → metadatos) |
| lg | 16px | `p-4`, `gap-4`, `space-y-4` | padding de tarjeta en móvil; separación entre tarjetas de una lista |
| xl | 24px | `p-6`, `space-y-6`, `md:p-6` | padding de tarjeta desde `md`; ritmo vertical de la página (`space-y-6`); padding de página en móvil |
| 2xl | 32px | `lg:p-8` | padding de página desde `lg` |
| 3xl | 48px | `py-12` | aire vertical de estados vacíos / sin permiso / apagada dentro del cuerpo |

Contenedor de TODA página de Naira: `p-6 lg:p-8 space-y-6` (el patrón hermano, 12 de 15 páginas, `piloto/page.tsx:39`).
Ancho de lectura: bloques de texto largo (respuestas, citas, memoria) con `max-w-3xl`.

**Excepciones (declaradas):**
- Objetivos táctiles: todo control solo-icono mide **44×44 px** (`h-11 w-11`) por debajo de `lg` (WCAG 2.5.5); desde `lg`, 36 px (`h-9 w-9`).
- Primitivas heredadas conservan su espaciado interno (`Button`, `Badge` `px-3 py-1`, `BarraDePestanas` `px-3 py-3`): esta fase no las re-declara.
- Borde izquierdo de énfasis de RECOMENDACIÓN: `border-l-4` (4 px) — ver §6.3.

---

## 4 · Typography

Dos familias (`font-sans` Schibsted Grotesk, `font-mono` JetBrains Mono). **Cuatro tamaños y dos pesos**, nada más:

| Role | Size | Weight | Line Height | Clases | Dónde |
|---|---|---|---|---|---|
| Display / H1 | 24px | 600 | 30px (1.25) | `text-2xl font-semibold tracking-tight leading-tight` | `h1` de cada pestaña y ficha (solo eso) |
| Body | 16px | 400 (600 en títulos y cifras de ítem) | 24px (1.5) | `text-base leading-6` | títulos-oración del briefing (600), cifra de un ítem (600, `font-mono tabular-nums`), consecuencia de una propuesta (600), respuestas de la conversación, texto de memoria, citas |
| Secondary | 14px | 400 | 20px (1.43) | `text-sm leading-5 text-fg-muted` | bajada del H1, metadatos, explicaciones de estados, cuerpo de diálogos |
| Label (mono) | 12px | 400 (600 para el valor dentro de un chip) | 16px (1.33) | `font-mono text-xs uppercase tracking-widest` para etiquetas; `font-mono text-xs tabular-nums` para cortes y referencias | etiquetas de categoría (DATO, INFERENCIA…), chip de corte, chip de `claimClass`, IDs, referencias técnicas |

Reglas:
- **Todo numeral de datos** (valores, porcentajes, COP, fechas del corte) va en `font-mono tabular-nums whitespace-nowrap`: se parte la etiqueta, nunca el número (`docs/DESIGN.md` §19, regla de numerales).
- Los textos que vienen renderizados del servidor (título del briefing, `texto` de la conversación, citas) se pintan **tal cual**, en `font-sans`, sin reformatear sus números (ya los formateó el renderer del agente con sus tramos; reformatearlos rompería el linter numérico INV-04). Excepción: si el contrato trae `tramos` (enmiendas E13-3/E13-4), cada tramo `origen: fact` se envuelve en `<span class="font-mono tabular-nums">` sin cambiar un carácter.
- Primitivas heredadas conservan su tipo (botones `font-medium` 500, pestañas 13px): no se re-declaran.
- Nada de mayúsculas en botones (sentence case, `docs/DESIGN.md` §1); las etiquetas mono sí van en mayúsculas.

---

## 5 · Color

| Role | Value | Token | Usage |
|---|---|---|---|
| Dominant (60%) | `#FBFAF9` | `bg-bg` | fondo de página del panel (lo pone el layout; las páginas de Naira NO pintan fondo propio) |
| Secondary (30%) | `#FFFFFF` + `#F4F2EF` | `bg-surface` (tarjetas, diálogos) + `bg-surface-muted` (pozos: inventario del silencio, razonamiento, bloque de hipótesis, MEMORIA) | tarjetas con `border border-border` (`#E5E2DC`) y `shadow-sm` como máximo en reposo |
| Texto | `#14130F` / `#6E6A63` | `text-fg` / `text-fg-muted` | cuerpo / secundario (`text-fg-subtle` solo sobre `bg-surface` o `bg-bg`) |
| Accent (10%) | `#1A40FF` | `bg-primary` / `text-primary` / `ring` | solo la lista de abajo |
| Destructive | `#C0392B` | `text-danger` / variante `destructive` | solo el botón de confirmación de «Borrar» (memoria) y de «Cancelar tarea» |
| Caution (feedback) | `#FBF1DD` + icono `#BF752B` | `bg-warning-soft` + `text-warning` **solo en el icono** | banda de datos de ejemplo, fuente desactualizada, rol sin personas asignadas |

**Accent reserved for (lista cerrada):**
1. El **único** botón primario de cada vista: «Aprobar acción» (ficha de propuesta), «Enviar pregunta» (envío de la conversación), «Guardar corrección» (diálogo de memoria), «Enviar respuesta» (pregunta semanal del briefing).
2. El anillo de foco global (`*:focus-visible`, `docs/DESIGN.md` §7) — no se sobrescribe.
3. El indicador de pestaña activa (heredado de `BarraDePestanas`).
4. El hover de los enlaces de drill-down (`hover:text-primary`); en reposo son `text-fg-muted underline`.
5. El botón de confirmación **no destructivo** de un `AlertDialog` (Rechazar propuesta, Confirmar) — es el primario de ese diálogo.

Nunca en: chips de categoría, chips de `claimClass`, estados de loops o propuestas, valores numéricos, iconos decorativos,
etiquetas de urgencia. Sin segundo acento, sin gradientes (datos UI, `docs/DESIGN.md` §1), sin colores de apoyo (cyan, violet…:
son de gráficos y esta fase no tiene gráficos).

**Contraste medido (WCAG 2.1, luminancia relativa calculada de los hex de `docs/COLOR_SYSTEM.md`):**

| Par | Ratio | Veredicto |
|---|---|---|
| `text-fg-muted` #6E6A63 sobre `bg-surface` #FFFFFF | 5.4:1 | AA texto normal |
| `text-fg-muted` sobre `bg-surface-muted` #F4F2EF | 4.8:1 | AA |
| `text-fg-subtle` #726E68 sobre `bg-surface-muted` | 4.5:1 | AA justo: **no** se usa sobre pozos (se usa `text-fg-muted`) |
| `text-primary` #1A40FF sobre blanco / blanco sobre `bg-primary` | 6.5:1 | AA |
| `text-danger` #C0392B sobre `bg-danger-soft` #FBE9E6 | 4.6:1 | AA |
| `text-warning` #BF752B sobre `bg-warning-soft` #FBF1DD | **3.2:1** | **Falla AA para texto**; pasa 3:1 de componente no textual ⇒ en esta fase `text-warning` va **solo en iconos**; el texto dentro de una banda de precaución es `text-fg`. (`AvisoDatosDeEjemplo`, `src/components/estado/AvisoDatosDeEjemplo.tsx:51-53`, pinta su texto `text-sm` en `text-warning`: axe lo marcaría en el gate `panel-a11y` de Naira. Esta fase lo **reusa** y le aplica el arreglo mínimo —texto `text-fg`, icono `text-warning`— con su test; ver §8.6 y §13.) |

---

## 6 · Reglas visuales transversales (valen en TODAS las vistas)

### 6.1 · El corte (`asOf`) va pegado a cada número — INV-07, criterio 2

Componente nuevo `MarcaDeCorte` (`src/components/inmobiliaria/naira/MarcaDeCorte.tsx`). Toda cifra de datos que se pinta
sale acompañada, en la MISMA línea o inmediatamente debajo (nunca en un pie de página ni en un tooltip solo):

```
12,34 %   CORTE 5 OCT 2026, 6:15 A. M. · HACE 13 H
```

- Marcado: `<time dateTime="<ISO original>">` dentro de un chip `font-mono text-xs tabular-nums text-fg-muted`, prefijo
  «Corte» (etiqueta mono), con `aria-label="Dato con corte al 5 de octubre de 2026, 6:15 a. m., hora de Colombia; hace 13 horas"`.
- Formato: `Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' })` — la zona es **fija** (`America/Bogota`), nunca la del navegador. `formatDateTime` de `src/lib/format.ts:64-76` **no** sirve (no fija zona). Se agrega el helper puro `formatearCorte(iso)` en `src/lib/naira/formato.ts`, con test que fije la zona.
- Edad relativa («hace 13 h», «hace 3 d», «hace 20 min») calculada contra `Date.now()` en el cliente, siempre visible. La UI **no** decide si un dato está rancio (eso es FRESH-01 del servidor, que lo declara); solo muestra la edad para que la persona juzgue.
- **Fail-closed:** una cifra que llega sin `asOf` (violación de contrato) **no se pinta**: en su lugar va «Dato sin corte: no lo mostramos» (`text-sm text-fg-muted`) + `console.warn` en desarrollo. Una cifra que no se pudo leer nunca se pinta como `0`, `—` ni vacío: se dice «No pude leer este dato» (ver §6.6).
- **Congelado vs vivo:** el briefing y el detalle de señal muestran lo que se **congeló** al enviarse (`congeladaEn`, 10-06 «el detalle de señal no calcula ningún valor "de ahora"»). La cabecera de esas vistas lo declara: «Esto es lo que Naira te envió el 5 oct a las 6:45 a. m.; los datos pueden haber cambiado desde entonces.»
- **Datos de ejemplo:** en modo simulado (§8.6) el chip no muestra una fecha: dice «DATO DE EJEMPLO» (mono, mismo lugar). Ningún fixture puede parecer medido.
- Fechas que NO son cifras de datos (cuándo vence una propuesta, próxima revisión de un loop, cuándo se escribió una memoria) usan el mismo formateador pero sin prefijo «Corte» ni edad relativa obligatoria.

### 6.2 · Drill-down: de cada número a su fuente en el panel — UI-02, criterio 2

Componente nuevo `EnlaceALaFuente`. Junto a cada cifra (a la derecha de `MarcaDeCorte` desde `md`, debajo en móvil):
«Ver en Cartera ↗» (`text-sm text-fg-muted underline underline-offset-2 hover:text-primary`, icono `ArrowSquareOut` 16 px).

Mapa **cerrado** `RUTA_DE_LA_METRICA` (`as const satisfies Record<MetricaCanonica, …>`) de las 14 métricas del catálogo
(`agent-account-manager/src/naira/metrics/catalog.ts:174-577`) a una pantalla que existe en el panel (las 7 rutas destino
verificadas con su `page.tsx`):

| `metricId` | Aterriza en | Gate del destino (`canAccess`) | Etiqueta visible |
|---|---|---|---|
| `cartera.morosidad_rate`, `cartera.mora_exposure_cop` | `/panel/inmobiliaria/cobros/cartera` | `cobros` | «Ver en Cartera» |
| `cartera.recovered_cop_30d` | `/panel/inmobiliaria/cobros/recaudo` | `cobros` | «Ver en Recaudo» |
| `cartera.promise_kept_rate_7d`, `cartera.promises_open_count`, `cartera.payment_plan_default_rate_90d` | `/panel/inmobiliaria/cobros/cobranza/acuerdos` | `cobranza` | «Ver en Acuerdos de pago» |
| `cartera.escalations_open_count`, `sla.escalacion_vencida_count` | `/panel/inmobiliaria/cobros/cobranza` | `cobranza` | «Ver en Cobranza» |
| `cartera.disputes_open_count` | `/panel/inmobiliaria/cobros/cobranza/disputas` | `cobranza` | «Ver en Disputas» |
| `portafolio.available_units_count`, `portafolio.vacancy_rate`, `portafolio.rent_roll_cop`, `portafolio.days_on_market_p50` | `/panel/inmobiliaria/inmuebles` | `portafolio` | «Ver en Inmuebles» |
| `prospectos.leads_sin_contacto_count` | `/panel/inmobiliaria/pipeline` | `pipeline` | «Ver en Pipeline» |

🔔 U7 — **En v1 el drill-down aterriza en el listado de la fuente (N2/N3), no en una ficha N4**: ningún contrato publicado
trae el id de la entidad (el `ItemCongelado` no lo tiene y los 5 detectores activos emiten `affectedEntities: []`,
`10-CONTEXT.md:58`). Cuando E13-2 traiga entidades, cada una enlaza a su ficha N4 (`/inmuebles/:id` = id de consignación,
`docs/VOCABULARIO.md` regla 2).

Estados del enlace (nunca un enlace roto, `docs/DESIGN.md` §20):
- métrica fuera del mapa ⇒ sin enlace; se pinta «Fuente: <nombre de la métrica>» + la referencia técnica;
- la persona no puede abrir el destino (`canAccess` falso) ⇒ texto sin enlace: «Tu rol no puede abrir Cartera»;
- modo simulado ⇒ texto sin enlace: «Enlace inactivo: datos de ejemplo».

La `fuente` cruda del contrato (`agent.debtor_states`, `public.consignaciones`…) es un nombre interno de tabla: **no** es
el texto visible. Va como «Referencia técnica» (mono `text-xs`) dentro de un `Popover` que abre un botón `Info` junto al enlace.

### 6.3 · DATO / INFERENCIA / RECOMENDACIÓN (y las otras tres de INV-03) — criterio 4

Componente nuevo `BloqueDeCategoria` (`categoria: SeccionDeSalida` = `KNOWLEDGE | LIVE_DATA | MEMORY | INFERENCE |
RECOMMENDATION | ACTION`, vocabulario de `09-03-PLAN.md:353-354`). La categoría se distingue por **etiqueta visible + icono +
estilo de borde**; el color es el mismo neutro para las seis (a11y: nunca estado por color solo, `docs/DESIGN.md` §7).

| Categoría (contrato) | Etiqueta visible (mono, mayúsculas) | Icono (16 px, `text-fg-muted`) | Estilo del bloque | Qué la llena en v1 |
|---|---|---|---|---|
| `LIVE_DATA` | DATO | `Database` | `bg-surface border border-border rounded-lg` (sólido) | valor + corte + fuente de cada ítem; título-oración del briefing. **No** la respuesta de la conversación: `respondida.texto` puede traer citas causales (`9.5-04-PLAN.md:744`) y va en un bloque neutro «RESPUESTA» (§7.7) hasta E13-4 |
| `KNOWLEDGE` | CONOCIMIENTO | `BookOpen` | `bg-surface border border-border rounded-lg` + la política citada por referencia (sin contenido: 🔔 C9 de la 9.5) | respuestas que citan políticas o fichas |
| `MEMORY` | MEMORIA | `Notebook` | `bg-surface-muted border border-border rounded-lg` | «Qué cree Naira»; memoria citada en una respuesta |
| `INFERENCE` | INFERENCIA | `Lightbulb` | `bg-surface border border-dashed border-border-strong rounded-lg` (**borde discontinuo**: no es un dato medido) | causa investigada de una señal; toda oración causal |
| `RECOMMENDATION` | RECOMENDACIÓN | `Signpost` | `bg-surface border border-border border-l-4 border-l-border-strong rounded-lg` | recomendación de una respuesta (E13-4); vacía en el briefing v1 (el `ItemCongelado` no la trae) |
| `ACTION` | ACCIÓN | `HandTap` | `bg-surface border border-border-strong rounded-lg` | solo en Aprobaciones (la consecuencia de una propuesta) |

Reglas: la etiqueta es un `<p>` visible (no solo `aria-label`) arriba a la izquierda del bloque; el bloque es `<section
aria-labelledby>`; un bloque de categoría **vacía no se pinta** (no se inventa relleno), salvo que el contrato traiga su razón
de vacío (`RAZONES_DE_SECCION_VACIA`, `09-03-PLAN.md:356-357`), que se dice en una línea `text-sm text-fg-muted`.

### 6.4 · `claimClass` en TODA oración causal — CLM-01, CLM-03, criterio 4

Componente nuevo `ChipDeAfirmacion` pegado al final de la oración (en línea, `inline-flex`). Es un `<button type="button">`
que abre un `Popover` con la explicación (tocable en móvil; accesible por teclado; `aria-expanded`, `aria-controls`):

| `claimClass` | Chip (mono `text-xs`, `Badge` `outline`) | Explicación del popover |
|---|---|---|
| `aritmetica` | ARITMÉTICA | «Sale de sumar, restar o dividir datos medidos. Se puede comprobar con los datos.» |
| `asociacion` | ASOCIACIÓN | «Dos datos se mueven juntos. Eso no prueba que uno cause el otro.» |
| `hipotesis` | HIPÓTESIS | «Una explicación posible, todavía no probada. Abajo ves su banda, qué otra explicación se consideró y qué dato la confirmaría.» |

Una oración `hipotesis` lleva **siempre** debajo un pozo (`bg-surface-muted rounded-sm p-3 text-sm`, `<dl>`), con los tres
campos obligatorios de CLM-03 (`Hipotesis` sin opcionales, `09-03-PLAN.md:370-372`):

```
Probabilidad             probable (55-80 %)
Alternativa considerada  <entidad alternativa>  |  «No había otra explicación en los datos descompuestos»
Qué la confirmaría       Ver que <nombre de la métrica del discriminador> <sube|baja>
```

🔔 U6 — **Fail-closed**: una oración causal (INFERENCIA) que llega **sin** `claimClass` no se renderiza. En su lugar:
«Hay una explicación investigada, pero esta versión de Naira no envía su clasificación, así que no la mostramos.» Hoy
**todas** las citas caen acá (C5): ningún contrato publicado trae la clase. La vista de la cita existe y se prueba con
fixture; se enciende sola cuando llegue E13-3.

### 6.5 · Vocabulario de probabilidad (ADR-005, 7 bandas ICD 203) 🔔 U18

El front **no** redacta probabilidades: pinta la banda que manda el servidor con el mapa cerrado `BANDAS_DE_PROBABILIDAD`
(paridad con `09-03-PLAN.md:328-332`; un test compara la tabla del front con la del ADR cuando exista en disco). Render EXACTO:
`<término> (<min>-<max> %)`.

| id | término | rango |
|---|---|---|
| `casi_imposible` | casi imposible | 1-5 % |
| `muy_poco_probable` | muy poco probable | 5-20 % |
| `poco_probable` | poco probable | 20-45 % |
| `tan_probable_como_no` | tan probable como no | 45-55 % |
| `probable` | probable | 55-80 % |
| `muy_probable` | muy probable | 80-95 % |
| `casi_seguro` | casi seguro | 95-99 % |

Los términos son traducción del research (Nico los ratifica, 09-CONTEXT D9-5). **Nunca** se pinta «confianza» junto a una banda
(ADR-005: no mezclar probabilidad y confianza); por eso `FactSnapshot.confidence` (`agent-account-manager/src/lib/automated-decisions/write.ts:131-132`)
**no se renderiza** en ninguna vista 🔔 U11. La copy propia del front (claves `inmobiliaria.ai.naira.*`) no puede contener
ningún término del léxico de probabilidad fuera de esta tabla (test estático sobre `es.json`, ver §11.4).

### 6.6 · Conteos propios de Naira: sin numeral 🔔 U5

Mismo criterio que N17 de la Fase 10 (`10-CONTEXT.md:394`) y D11-13: lo que Naira cuenta de sí misma (ocultos por rol,
ciclos de un loop, confirmaciones, descartes por compuerta, «y N más», pendientes) **no tiene una fuente registrada con
`asOf`**, así que la UI no lo escribe como número. Se dice cualitativo:

- `ocultosPorRol > 0` ⇒ «Hay elementos que tu rol no puede ver.» (sin cuántos: además no filtra información sobre lo oculto);
- pestañas y listas sin badges numéricos: un punto neutro `h-2 w-2 rounded-full bg-fg` con `role="img"` y `aria-label="Hay acciones por decidir"`;
- `ciclos` y `confirmaciones` de un loop se expresan por su `forma` y por fechas (§7.3).

Números de interfaz que no son datos (paginación, contador de caracteres, fechas de vencimiento) quedan fuera de INV-07.

### 6.7 · Vocabularios cerrados (etiquetas, siempre con texto; `switch` exhaustivo con `never` en el código)

| Vocabulario (contrato) | Etiquetas |
|---|---|
| `UrgencyClass` (`agent-account-manager/src/naira/detect/types.ts:79-83`) | `ventana_legal` «Plazo legal» · `irreversible` «Irreversible» · `degradacion_con_realimentacion` «Empeora si nadie actúa» · `reversible` «Reversible». `Badge variant="secondary"`, todas neutras (el orden ya lo da el servidor, NOT-12). |
| Rol de dominio (`role:<DomainRole>`) 🔔 U19 | `role:cartera` «Cartera» · `role:portafolio` «Inmuebles» (`docs/VOCABULARIO.md`: «Portafolio» murió como título) · `role:prospectos` «Prospectos». Siempre con prefijo «Rol:». |
| `SeccionDelBriefing` (+ `seguimiento` de 11-06) | `atencion` «Requiere tu atención» · `informativo` «Para que estés al tanto» · `estado` «Estado de la agencia» · `semanal` «Resumen de la semana» · `seguimiento` «Seguimiento» |
| `EstadoDelLoop` | `abierto` «Abierto» · `en_seguimiento` «En seguimiento» · `escalado` «Escalado» · `en_confirmacion` «Confirmando el cierre» · `cerrado` «Cerrado» |
| `FormaDelLoop` | `recordatorio` «Recordatorio» · `impacto` «Impacto» · `escalada` «Escalada» |
| `DesenlaceDelLoop` | `resuelto_por_dato` «Se resolvió según los datos» · `no_accionado` «Nadie actuó» · `sin_reincidencia` «No volvió a aparecer» · `expirado` «Venció sin cambios» |
| `EstadoDeLaPropuesta` (`12-07-PLAN.md:372`) | `pendiente` «Por decidir» · `vencible` «Vence pronto» · `aprobada` «Aprobada» · `rechazada` «Rechazada» · `vencida` «Vencida» · `ejecutada` «Ejecutada» · `no_ejecutada` «Aprobada, no ejecutada» |
| `ClaseDeConsecuencia` | `interna_reversible` «Interna · se puede deshacer» · `interna_irreversible` «Interna · no se puede deshacer» · `externa` «Externa» |
| `TipoDeAccion` | `crear_tarea` «Crear una tarea» · `asignar_tarea` «Reasignar una tarea» · `aviso_interno` «Aviso interno» · `despachar_vertical` «Pedirle algo a otro agente» |
| `provenance` (`naira-memory.ts`, ejecutado) | `observed` «Observado» · `inferred` «Inferido» · `stated_by_human` «Lo dijo alguien del equipo» |
| `layer` | `episodic` «Episodios» · `semantic` «Conocimiento» · `preference` «Preferencias» · `procedural` «Procedimientos» |
| `trust` | «Aportado por:» + `system` «Sistema» · `staff` «Equipo» · `third_party` «Tercero» (nunca «confianza») |

---

## 7 · Vistas

Todas las vistas: encabezado `<header className="space-y-1">` con `h1` (24/600) + bajada `text-sm text-fg-muted` (máx.
dos líneas); cuerpo en `space-y-6`. Las vistas consumen el cliente del agente con `agentFetch` (`src/lib/api/agent-fetch.ts`),
el contrato `src/lib/api/naira/contrato.ts` + el cliente `src/lib/api/naira/cliente.ts` y hooks `src/lib/hooks/naira/use-naira-*.ts` con el guard de respuestas viejas del
Piloto (cada fetch aborta el anterior, `src/lib/hooks/piloto/use-piloto-briefing.ts`).

### 7.1 · Briefing (pestaña raíz) — UI-01, NOT-05, NOT-06, INV-06

```
Briefing de hoy                                          [‹ Día anterior]  lun 5 oct 2026  [Día siguiente ›]
Lo que Naira te envió el 5 oct a las 6:45 a. m. Los datos pueden haber cambiado desde entonces.
─────────────────────────────────────────────────────────────────────────────────────────────────────────
REQUIERE TU ATENCIÓN                                             │  QUÉ REVISÓ NAIRA HOY            (pozo)
┌───────────────────────────────────────────────────────────┐   │  Detectores · Fuentes y cortes
│ DATO                                    PLAZO LEGAL        │   │  Qué se descartó y dónde
│ <título-oración con verbo y consecuencia> (16/600)          │   │  Métricas que todavía no evalúa
│ 12,34 %  CORTE 5 OCT, 6:15 A. M. · HACE 30 MIN              │   │  (enmienda E13-1)
│ Ver en Cartera ↗   (i)                                      │   │
│ INFERENCIA ┊ <causa: ver §6.4>                              │   │
│ ¿Te sirvió?  [Útil] [No útil] [Ya lo sabía]    Ver la señal →│   │
└───────────────────────────────────────────────────────────┘   │
PARA QUE ESTÉS AL TANTO (mismo molde, sin urgencia destacada)     │
ESTADO DE LA AGENCIA    (mismo molde, sin feedback)               │
```

- **Datos:** `GET …/naira/briefing?dia=` → `NairaBriefingDay = { dia; corte; resultado: {kind:'entregado'; entregas; ocultosPorRol} | {kind:'sin_entrega'; razon} }` (`10-06-PLAN.md:333-335`). Cada `entrega` (`canal`, `tipo`, `congeladaEn`, `estadoDelEnvio`, `items`) trae ítems `NairaBriefingItem` = los 13 campos de `ItemCongelado` (`sección, posición, metricId, valor, unidad, asOf, fuente, trust, clave, urgencyClass, titulo, promocion, causa`). Si hay entrega por email y por WhatsApp el mismo día, se pinta **una** (los ítems son los mismos por valor): la de email; «También te llegó por WhatsApp» como línea `text-sm`.
- **Orden:** el de `posicion` dentro de cada sección, tal cual viene (el servidor ordena por `urgencyClass` antes que por impacto, NOT-12). La UI no reordena ni «destaca» por monto.
- **Ítem** (`<article aria-labelledby>`; tarjeta `rounded-lg border border-border bg-surface p-4 md:p-6 space-y-3`): bloque DATO con el `titulo` (16/600, texto del servidor tal cual), la cifra (`valor` + `unidad`, 16 px mono semibold, debajo del título) con `MarcaDeCorte` y `EnlaceALaFuente`, la etiqueta de urgencia; si `causa.kind === 'investigada'`, un bloque INFERENCIA regido por §6.4; si `investigacion_no_disponible`: «Naira todavía no había investigado esta señal cuando armó el briefing.» Pie: feedback (§7.3.2) y «Ver la señal →» a `B/senales/[promocionId]` (solo si `promocion.kind === 'promovida'`). Ítems de `estado` no llevan feedback (no son votables, `SECCIONES_VOTABLES`, `11-07-PLAN.md:357`). **Ancla visual del ítem: el título-oración** (se lee primero; NOT-06 titula con el hecho y su consecuencia, nunca con un número): la cifra va debajo, al mismo tamaño y en mono, para que ningún ítem se lea como una tarjeta de KPI.
- **Unidad → formato** (`es-CO`, sin reescribir el valor decimal): `cop` ⇒ `$ 2.500.000` (`formatCurrency`, `src/lib/format.ts:19`); `pct` ⇒ el valor es en **puntos porcentuales** (`12.34` ⇒ «12,34 %», `9.5-04-PLAN.md:735`), 2 decimales máx.; `count` ⇒ entero con separador de miles; `days` ⇒ «23 días». Unidad desconocida ⇒ el `valor` crudo en mono + la `unidad` en `text-fg-muted` (nunca se adivina).
- **Silencio (`no_signal`) — INV-06:** si `atencion` está vacía, el bloque de atención dice la frase del servidor «Hoy no hay nada que requiera tu atención» (`FRASE_DE_SILENCIO`, `10-CONTEXT.md` §3.1 10-04) **y al lado el inventario**: qué detectores corrieron (`ok` «Corrió» · `skipped_stale` «No corrió: la fuente estaba desactualizada» · `failed` «Falló»), el corte de cada fuente (con `MarcaDeCorte`; `never-observed` ⇒ «Esta fuente nunca se ha leído»), en qué compuerta se descartó algo (nombre de la compuerta, sin cantidad, §6.6), qué señales no se investigaron y por qué, y `clase` del día (`con_senales` · `silencio` «Hoy no hubo señales» · `sin_evaluacion` «Hoy Naira no evaluó: no es lo mismo que un día tranquilo»). **Regla dura:** si el contrato no trae el inventario (hoy: no lo trae, C3) y la atención está vacía, la UI **no** dice «no hay nada»: dice «No podemos mostrarte qué revisó Naira hoy, así que no sabemos si este silencio es un día tranquilo.» Un silencio sin inventario es indistinguible de una supresión (INV-06).
- **Arranque / madurez (warm-up) — NOT-05:** cada `LineaDeMadurez` (E13-1) se pinta como «Todavía no evalúo <métrica>: tendré suficiente historia el 12 oct 2026» (`fecha_estimada`) o «No puedo estimar cuándo evaluaré <métrica>: <remedio del servidor>» (`sin_fecha`). **Prohibido**: «todavía estoy aprendiendo» (NOT-05 lo excluye por infalsificable). `arranque.kind === 'sin_go_live'` ⇒ banda neutra: «Nada entra a "Requiere tu atención" hasta que tu inmobiliaria fije la fecha de arranque de Naira.» (sin enlace en v1: la configuración está fuera de la fase, 🔔 U12).
- **`sin_entrega`** (`RAZONES_SIN_BRIEFING`, `10-06-PLAN.md:331`): `antes_del_corte` ⇒ «El briefing de hoy sale a las 6:45 a. m. (hora de Colombia).» + botón `outline` «Ver el de ayer»; `briefing_apagado` ⇒ estado apagado de la pestaña (§8.3); `sin_entregas_del_tenant` ⇒ «Naira no envió briefing este día.»; `sin_entrega_para_el_llamador` ⇒ «Este día no te llegó briefing a ti. Si crees que debió llegarte, revisa tus preferencias de notificación con un administrador.»
- **Navegación por día:** `‹ Día anterior` / `Día siguiente ›` (`Button variant="outline" size="sm"`), la fecha en el centro (`<time>`); «Día siguiente» deshabilitado en el día de hoy (Bogotá). La URL refleja `?dia=` (enlazable).
- **Pregunta semanal (lunes) 🔔 U13 — NOT-05 recall:** si `dia` es lunes en Bogotá, al final: tarjeta «¿Hubo algo importante esta semana que Naira no te dijo?» + `Textarea` (máx. 4000) + botón primario «Enviar respuesta» → `POST …/naira/recall` (`answerNairaRecall`, acción `recall-answer`, `10-06-PLAN.md:348`). 201 ⇒ «Gracias. Lo usamos para descubrir lo que Naira no está viendo.»; 422 `rechazada_por_pii` ⇒ «Tu respuesta tiene una cédula, un teléfono o un correo. Quítalos y vuelve a enviarla.»; 422 `semana_no_es_lunes`/`semana_futura` ⇒ «Esta pregunta ya no está abierta.». Ancla `#recall` (destino del enlace del correo, C2). La respuesta no se guarda en el navegador.
- **Aside «Qué revisó Naira hoy»:** desde `lg`, columna derecha (`lg:grid-cols-3`: ítems `lg:col-span-2`, aside `lg:col-span-1`, ambos `min-w-0`); en móvil, al final como `Collapsible` cerrado «Qué revisó Naira hoy». Si hay silencio, el inventario sube al bloque de atención (arriba) y el aside no se repite.

### 7.2 · Detalle de señal (ficha N4) — UI-01 («con la lista de entidades afectadas»), UI-02

```
‹ Volver al briefing
<título-oración>                                                    PLAZO LEGAL
Congelada el 5 oct, 6:45 a. m. — es lo que Naira te envió ese día.
[DATO]        12,34 %  CORTE … · HACE …   Ver en Cartera ↗ (i)
[INFERENCIA]  causa (§6.4)  |  razón de «no citable»
[ENTIDADES AFECTADAS]
  Esta señal es de toda la agencia: el detector mide el total y no señala inmuebles,
  contratos ni personas en particular.  → Ver en Cartera ↗
¿Te sirvió esta señal?  [Útil] [No útil] [Ya lo sabía]
Seguimiento: <estado del loop si existe> → Ver la bitácora
```

- **Datos:** `NairaSignalDetail = { promocionId; dia; corte; congeladaEn; item; causa: {kind:'investigacion_no_disponible'} | {kind:'citada'; investigacionId; citas: string[]} | {kind:'no_citable'; razon} }` (`10-06-PLAN.md:335-336`).
- **Causa:** `citada` ⇒ bloque INFERENCIA con cada cita bajo §6.4 (hoy fail-closed: sin `claimClass`, C5). `no_citable` (`RAZONES_DE_CAUSA_NO_CITABLE`, `10-06-PLAN.md:332`): `sin_investigacion_al_congelar` «Cuando se envió, esta señal no tenía investigación.» · `fila_ilegible` «No pudimos leer la investigación de esta señal.» · `no_visible_para_el_rol` «Tu rol no puede ver la explicación de esta señal.» · `con_datos_de_terceros` «La explicación usa datos de terceros y no se muestra.» · `sin_explicacion` «Naira investigó y no encontró una explicación que pudiera sostener con datos.»
- **Entidades afectadas (siempre presente, nunca oculta):** 🔔 hoy el contrato no trae entidades (C4) y los detectores activos son agregados; la sección dice el texto de arriba + el drill-down al listado fuente. Con E13-2: lista `<ul>` de hasta 50 entidades (etiqueta + enlace a su ficha N4 con el gate del destino), y si hay más, «Ver todas en <módulo> ↗» (sin decir cuántas, §6.6). Ninguna entidad persona (deudor) se nombra si el catálogo la bloquea por B-5 (`decomposability: not_decomposable / entidad_es_persona_natural`, `catalog.ts:192-196`).
- **Seguimiento (lectura secundaria):** solo si el usuario tiene `open-loops-view` se pide `GET …/open-loops` (no hay endpoint por señal) y se busca el loop con ese `promocionId`; si existe, una línea con su estado y enlace `link` «Ver la bitácora»; si no existe, o la lectura falla o da 403, la línea se omite sin rastro (§8.2).
- **404** (no existe, de otro tenant o su métrica no es visible para el rol — el servidor responde el MISMO cuerpo): «No encontramos esta señal, o no está disponible para tu rol.» + volver. No se distingue cuál de los tres (el servidor no lo dice a propósito).

### 7.3 · Seguimiento (open loops) — UI-01, LOOP-04, LOOP-06

#### 7.3.1 · Lista

```
Seguimiento
Lo que Naira sigue de cerca hasta que se resuelva. Naira cierra cada caso cuando los datos lo confirman.
┌────────────────────────────────────────────────────────────────────────┐
│ <Nombre de la métrica>                          EN SEGUIMIENTO · IMPACTO │
│ Rol: Cartera                    ⚠ Nadie tiene asignado este rol …        │
│ Te lo avisamos el 3 oct · Última revisión: 5 oct · Próxima: 6 oct, 6:25 a. m.│
│ Se cierra solo el 4 nov si nada cambia.                                   │
│ ¿Te sirvió?  [Útil] [No útil] [Ya lo sabía]     Ver la señal · Ver la bitácora │
└────────────────────────────────────────────────────────────────────────┘
```

- **Datos:** `NairaOpenLoopsList = { generadoEn; loops: NairaOpenLoop[]; ocultosPorRol }`; cada `NairaOpenLoop` = `{ loopId; detectorId; metricId; clase; familia; episodio; claveDeCausa; promocionId; owner; ownerRazon; estado; ciclos; forma; nextCheckAt; candidato; huerfanoDeRol; ultimoDiaVerificado; abiertoEn; expiraEn; comunicacion }` (`11-07-PLAN.md:380-384`). Solo loops **vivos** (los cerrados se ven en su bitácora).
- **Título de la fila:** nombre conversacional de la métrica (mapa cerrado del front con las 14 métricas, sin dígitos, paridad con `NOMBRES_CONVERSACIONALES` de 9.5-01 cuando esté en disco). No es un score ni un número.
- **Dueño:** «Rol: Cartera» (§6.7). `huerfanoDeRol: true` ⇒ banda de precaución en línea (icono `Warning` `text-warning`, texto `text-fg`): «Nadie tiene asignado este rol: el seguimiento va al dueño de la cuenta.» Nunca una persona.
- **Comunicación:** `comunicado` ⇒ «Te lo avisamos el 3 oct»; `sin_comunicar` ⇒ «Todavía no se ha avisado a nadie.»
- **Tiempos:** «Última revisión: <ultimoDiaVerificado>» (hace de corte del estado del loop), «Próxima: <nextCheckAt.en>» o «Sin revisión programada», «Se cierra solo el <expiraEn> si nada cambia». `ciclos` no se pinta como número (§6.6): la `forma` ya lo expresa.
- **Candidato:** `en_curso` ⇒ «Parece <desenlace>: Naira lo confirmará en la próxima revisión.» (sin el número de confirmaciones).
- **Sin «quién cerró», sin botón de cerrar/reabrir:** en v1 solo el sistema cierra (D11-17). No existe ninguna acción humana sobre el loop.
- **Vacío:** «Naira no está siguiendo nada en este momento.» + «Cuando una señal necesite seguimiento, aparecerá aquí con su próxima revisión.» (sin CTA).
- **503 `tabla_no_disponible`:** «El seguimiento todavía no está disponible para tu inmobiliaria.» (no reintentable).

#### 7.3.2 · Los tres botones de feedback (lista de loops, ítems del briefing, detalle de señal)

- `role="group"` con `aria-label="¿Te sirvió esta señal?"`; tres `Button variant="outline" size="sm"`: «Útil» (`ThumbsUp`), «No útil» (`ThumbsDown`), «Ya lo sabía» (`Check`). Etiqueta visible «¿Te sirvió?» (`text-sm text-fg-muted`).
- `POST …/naira/signals/{promocionId}/feedback` con `{ valor: 'util' | 'no_util' | 'ya_lo_sabia' }` (`11-07-PLAN.md:387`).
- 201 ⇒ el botón elegido queda `aria-pressed="true"` con icono `fill` y una línea en una región `aria-live="polite"`: «Registrado como "útil". Tu respuesta cuenta como la del equipo y reemplaza la anterior.» (D11-10: voto de equipo, gana el último, **sin actor**). El estado es **solo de la sesión**: no hay endpoint que devuelva «mi voto» (no se guarda quién votó), así que al recargar los tres vuelven a neutro 🔔 U20.
- 404 ⇒ «Solo puede responder quien recibió esta señal en su briefing.»; 409 `ventana_vencida` ⇒ «Ya pasó el plazo para responder sobre esta señal.»; 409 `voto_antes_de_la_entrega` ⇒ «Esta señal todavía no te llegó.»; error de red ⇒ toast `error` «No pudimos registrar tu respuesta. Intenta de nuevo.» y los botones vuelven a su estado anterior.
- Mientras viaja: los tres `disabled`, el elegido con `isLoading`.

### 7.4 · Bitácora de un loop (ficha N4)

- **Datos:** `NairaOpenLoopDetail = { loop: <identidad + ownerAlNacer + owner/ownerRazon/huerfanoDeRol del último evento + cierre + comunicacion>; eventos: NairaOpenLoopEvent[] }` (`11-07-PLAN.md:385-386`).
- Cabecera como la fila de §7.3.1; si `cierre.kind === 'cerrado'` ⇒ `Badge` «Cerrado» + «Se cerró el <en>: <desenlace>» (§6.7). Si el dueño cambió desde el nacimiento: «Empezó con Rol: Inmuebles; hoy es Rol: Cartera.» (reasignación por rol, nunca persona).
- Bitácora: `<ol>` vertical ordenado por día (el orden del servidor), cada evento: fecha (`<time>`), tipo (`nacimiento` «Se abrió» · `ciclo` «Revisión» · `cambio_de_forma` «Cambió a <forma>» · `en_confirmacion` «Parece resuelto; a confirmar» · `confirmacion_fallida` «No se confirmó» · `no_verificable` «No se pudo verificar» · `cierre` «Se cerró»), estado, forma y la verificación en una línea `text-sm`. Sin actor en ningún evento (no existe en el contrato).
- 404 igual que §7.2 («No encontramos este seguimiento, o no está disponible para tu rol.»).

### 7.5 · Aprobaciones (lista + tareas) — ACT-01, ACT-05, ACT-10, ACT-11

```
Aprobaciones
Lo que Naira propone hacer. Nada se ejecuta sin que alguien con permiso lo apruebe.
POR DECIDIR
┌──────────────────────────────────────────────────────────────────┐
│ ACCIÓN                                       POR DECIDIR          │
│ Crear una tarea · Rol: Cartera                          (16/600)   │
│ Interna · se puede deshacer                                        │
│ Vence el 6 oct, 6:35 a. m.              [Revisar propuesta →]      │
└──────────────────────────────────────────────────────────────────┘
RECIENTES (últimos días)   (mismo molde, con su estado)
TAREAS CREADAS POR NAIRA
  <detector → nombre de la tarea> · Rol: Cartera · Abierta desde 4 oct   [Cancelar tarea]
```

- **Datos:** `NairaActionsList = { generadoEn; desde; acciones: NairaActionSummary[]; ocultasPorRol }` y `NairaTasksList = { generadoEn; tareas; ocultasPorRol }` (`12-07-PLAN.md:433-435`); cada acción: `proposalId, consecuencia ({reproducible; texto} | {no_reproducible}), tipo, clase, destinatario ({rol} | {vertical}), reversible, estado, venceEn, propuestaEn, puedeDecidir` (`12-07-PLAN.md:413-416`).
- **Sin la consecuencia con cifras en el listado (C16):** el texto de la consecuencia lleva numerales de hechos `system` (`12-09-PLAN.md:338`) y `AccionListada` no trae ningún `asOf` (`12-07-PLAN.md:413-416`): pintarlo dejaría cifras sin corte (INV-07). Mientras no llegue **E13-7**, el titular de la tarjeta (16/600) es solo tipo · rol (p. ej. «Crear una tarea · Rol: Cartera»), debajo clase, estado y vencimiento en `text-sm`; la consecuencia completa, con sus cortes, está en la ficha (§7.6), donde va primero (ACT-05). Con E13-7 la tarjeta vuelve a abrir con la consecuencia + un `MarcaDeCorte` por cada `asOf`. `no_reproducible` ⇒ «No podemos mostrarte la consecuencia exacta de esta propuesta, así que no se puede aprobar.» (el botón sigue llevando a la ficha, para ver el estado).
- **Destinatario:** «Rol: Cartera» o, para `despachar_vertical`, «Otro agente: <evento>» (en v1 no hay ninguno despachable, H1). **Nunca una persona** (H2: asignar a persona espera a B-5).
- «Revisar propuesta →» (`Button asChild variant="outline" size="sm"` sobre un `Link`) navega a `B/aprobaciones/[proposalId]`. **Prohibido pre-cargar el detalle** (hover, `prefetch` de datos, SWR anticipado): su `GET` registra `presentada` y alimenta el detector de rubber-stamping (ACT-06, D12-13); solo se pide al montar la ficha.
- **Tareas** (`task-view`, lectura secundaria: no se pide sin la acción y un 403 omite la sección sin rastro, §8.2): cada `TareaVisible` (`tareaId, proposalId, loopId, detectorId, owner, estado, creadaEn`): nombre por detector (mapa cerrado del front), «Rol: <dueño>», «Abierta desde <creadaEn>», enlace a su loop. «Cancelar tarea» (`Button variant="ghost" size="sm"`) solo si la lista de acciones de `naira` del usuario incluye `task-cancel`; abre el diálogo destructivo de §10.4.
- **Vacíos:** sin propuestas ⇒ «No hay nada por decidir.» + «Cuando Naira proponga algo, lo verás aquí; al abrirla verás su consecuencia antes de que se ejecute.»; sin tareas ⇒ la sección muestra «Naira no tiene tareas abiertas.»
- **Quién aprobó no aparece en ninguna vista** (ni lista, ni ficha, ni toast): vive solo en el registro de auditoría T-323 del agente (`12-CONTEXT.md` §2.1, 🔔 H7), que no tiene lector en el front.

### 7.6 · Propuesta de acción (ficha N4) — ACT-03, ACT-05, ACT-10, ACT-12

```
‹ Volver a aprobaciones
Propuesta de Naira                                             POR DECIDIR
┌ ACCIÓN ────────────────────────────────────────────────────────────┐
│ <consecuencia.texto> (16/600)                                        │
│ Datos de esta propuesta: CORTE 5 OCT, 6:15 A. M. · HACE 30 MIN       │
│                                               Ver en Cartera ↗ (i)   │
│ Rol: Cartera · Crear una tarea · Interna · se puede deshacer         │
│ Vence el 6 oct, 6:35 a. m.                                           │
│                              [Rechazar propuesta]  [Aprobar acción]  │
└─────────────────────────────────────────────────────────────────────┘
[ Ver el razonamiento ▾ ]    ← cerrado por defecto: el razonamiento va detrás de un toque (ACT-05)
  DATO  hechos: valor · CORTE … · Ver en <módulo> ↗ (i)   (una fila por FactSnapshot)
  Señal que la originó → Ver la señal
  Investigación: → ver la explicación en la señal | «Esta propuesta no tiene investigación detrás.»
```

- **Datos:** `NairaActionDetail = { consecuencia: { texto, tipo, clase, destinatario, reversible, venceEn }; razonamiento: { senal: { senalId, promocionId, detectorId, metricId }, hechos: FactSnapshot[], investigacion: {referencia; id} | {sin_investigacion} }; huella; estado; puedeDecidir }` (`12-07-PLAN.md:395-400`; `consecuencia` va PRIMERO en el esquema y en la UI).
- **Corte junto a la consecuencia (INV-07):** la consecuencia lleva cifras de los hechos (`12-09-PLAN.md:338`), así que **inmediatamente debajo** de ella (la línea siguiente, antes del rol, el tipo, la clase y el vencimiento; §6.1 «en la MISMA línea o inmediatamente debajo»), dentro del bloque ACCIÓN y **fuera** del `Collapsible`, va la fila «Datos de esta propuesta:» con un `MarcaDeCorte` por cada `asOf` distinto de `razonamiento.hechos[]` (en el orden del servidor) y el `EnlaceALaFuente` de `razonamiento.senal.metricId` (§6.2). No rompe ACT-05: el detalle de los hechos (valor, fuente) y la investigación siguen detrás del toque; lo que sube junto a la consecuencia es solo el corte y el camino a la fuente.
- **Razonamiento detrás de un toque:** `Collapsible` con disparador `<button aria-expanded aria-controls>` «Ver el razonamiento»; cerrado al montar y nunca auto-abierto (explicar mejor aumenta la deferencia acrítica, ACT-05). Cada `FactSnapshot` (`value, source, asOf, trust`; `confidence` NO se pinta, §6.5) va como fila DATO con `MarcaDeCorte`; su `source` es un nombre de tabla y **no** se pinta como texto: la fila lleva el enlace de `RUTA_POR_FUENTE` (§7.8) o, si la fuente no está en ese mapa, «sin enlace» declarado (§6.2), y la `source` cruda va solo en el popover «Referencia técnica»; la unidad sale de `senal.metricId` si hay un solo hecho; si no, el valor crudo en mono. `investigacion.referencia` ⇒ enlace «Ver la explicación en la señal» a `B/senales/[promocionId]` (E3 de 12-07: la ruta de acciones no sirve texto de investigación).
- **Botones** (solo si `puedeDecidir`; el servidor ya lo calcula con la clase, el canal y `estado === 'pendiente'`, `12-07-PLAN.md:816`; la UI no lo recalcula): «Aprobar acción» (`default`, único acento de la vista) y «Rechazar propuesta» (`outline`). Si `puedeDecidir` es falso: «Tu rol no puede aprobar esta acción.» (`text-sm`, sin botones deshabilitados que parezcan clicables).
- **Aprobar** 🔔 U9: sin diálogo extra (la consecuencia ya está a la vista, la acción es reversible y la fricción automática está fuera de alcance, C-14). `POST …/actions/{proposalId}/decision` con `{ decision: 'aprobar', huellaVista: <huella del GET> }`. 200 ⇒ estado pasa a «Aprobada» y aviso `role="status"`: «Registramos tu aprobación. Antes de ejecutarla, Naira vuelve a comprobar que nada cambió; si algo cambió, no la ejecuta y lo verás aquí.» (la ejecución es asíncrona y puede terminar `no_ejecutada`: la copy no promete ejecución).
- **Rechazar:** `AlertDialog` (§10.4) porque no se vuelve a proponer para el mismo loop (H6). 200 ⇒ «Rechazada. Naira no la ejecutará ni la volverá a proponer para este seguimiento.»
- **La huella que se envía es la de lo que la persona vio:** la ficha **no** se revalida sola (sin refetch en foco/intervalo) mientras está `pendiente`; hay un botón `ghost` «Actualizar propuesta» explícito. Errores (`RAZONES_DE_CONFLICTO_DE_DECISION`, `12-07-PLAN.md:378-379`): 409 `huella_distinta` ⇒ «La situación cambió desde que abriste esta propuesta. Carga la versión actual para ver su consecuencia antes de decidir.» + botón `outline` «Cargar la versión actual» · 409 `vencida` ⇒ «Esta propuesta venció el <venceEn> y ya no se puede decidir.» · 409 `ya_decidida` ⇒ «Esta propuesta ya fue decidida.» (sin decir por quién) · 409 `no_reproducible`/`procedencia_no_disponible`/`clase_incoherente` ⇒ «No podemos verificar esta propuesta, así que no se puede aprobar.» · 403 `sin_permiso_de_la_clase`/`canal_no_permitido_para_la_clase` ⇒ regla de 403 en escrituras (§8.2): los botones de decisión se retiran y queda «No tienes permiso para esta acción.» sin eco de datos (el resto de la ficha ya se mostró legítimamente con `action-view`; no es un 403 de lectura).
- **Foco:** tras decidir, el foco va al `<p role="status">` del resultado.

### 7.7 · Preguntar (conversación ON-DEMAND) — CHAT-01..04, INV-07, FRESH-01

```
Pregúntale a Naira
Responde solo con las métricas de su catálogo, con el corte de cada dato. No guarda la conversación.
                                                    ┌──────────────────────────┐
                                                    │ ¿Cómo va la morosidad?    │  (UserBubble)
                                                    └──────────────────────────┘
RESPUESTA  <texto del servidor, tal cual>                         ALCANCE: TODA LA INMOBILIARIA
      Cortes de los datos: CORTE 5 OCT, 6:15 A. M. · HACE 2 H
─────────────────────────────────────────────────────────────────────────────────
[ Tu pregunta para Naira …                                  ] [Enviar pregunta ➤]
Enter envía · Shift+Enter nueva línea
```

- **Datos:** `POST …/naira/conversation/questions` con `{ question }` (1..2000, `ROUTER_QUESTION_MAX_CHARS`, `agent-account-manager/src/naira/retrieval/types.ts:326`); 200 = unión `NairaConversationAnswer` (`9.5-06-PLAN.md:338-347`): `respondida {texto, refsServidas, asOfs, alcance, noServidos}` · `negada {razon, puedoResponder, texto}` · `bloqueada {motivo, texto}` · `fallida {razon, texto}`. La negativa, el bloqueo y la falla son **200**, no errores: se pintan como respuestas.
- **Pregunta:** `UserBubble` existente (`src/components/beta/UserBubble.tsx`, `MessageBubble` de Cadence).
- **Respuesta `respondida`:** `texto` del servidor **tal cual** (`whitespace-pre-wrap`, sin Markdown: **no** se reusa `AssistantBubble`/`MarkdownRenderer`, que reinterpretarían el texto validado por los linters). Hoy el contrato trae un solo `texto` sin secciones (C6) que **puede traer citas causales persistidas** (`9.5-04-PLAN.md:744`, `[SAL:causa-citada]`): por eso **no** va como DATO sino en un bloque neutro «RESPUESTA» —no es una de las 6 categorías de INV-03: es el contenedor sin clasificar— con estilo `bg-surface border border-border-faint rounded-lg p-4` (filete tenue, distinto del `border-border` sólido de DATO, del discontinuo de INFERENCIA, del pozo de MEMORIA y del filete izquierdo de RECOMENDACIÓN), icono Phosphor `ChatTeardropText` 16 px `text-fg-muted` y etiqueta mono visible «RESPUESTA», con la nota `text-sm text-fg-muted` «Esta versión de Naira no separa dato, inferencia y recomendación dentro de la respuesta.». **U6 sobre toda la respuesta:** si `refsServidas` no está vacío, puede traer un `investigacionId` (hoy es `string[]` sin tipo: indistinguible de un id de chunk) y la parte causal no se puede aislar del texto plano ⇒ el `texto` **no se muestra**; en su lugar: «Esta respuesta puede incluir una explicación de causas que esta versión de Naira no clasifica, así que no mostramos su texto. Abajo ves los cortes y el alcance.» Declarado: mientras E13-4 no tipifique las refs, las respuestas con refs de chunk (políticas) caen también acá. Con E13-4 cada sección va en su `BloqueDeCategoria` y cada oración causal con su `ChipDeAfirmacion`. Debajo, siempre: «Cortes de los datos:» + un `MarcaDeCorte` por cada `asOfs[]` (el texto del servidor ya pone el corte junto a cada valor, `9.5-04-PLAN.md:735`), y el **alcance** declarado: `toda_la_agencia` ⇒ «Alcance: toda la inmobiliaria» · `por_eje` ⇒ «Alcance: por <eje>» (un total declarado como total nunca se presenta como subconjunto, D9.5-5). `noServidos: ['grafo_sin_filtro_de_rol']` ⇒ «No consulté las relaciones entre registros: todavía no se pueden filtrar por rol.»
- **Sin drill-down por cifra (C17):** en las respuestas de métricas `refsServidas` llega vacío (`9.5-04-PLAN.md:735`) y el texto no dice de qué métrica sale cada cifra ⇒ no hay `EnlaceALaFuente` por número. Mientras no llegue **E13-8**, debajo de los cortes va la línea «Esta versión de Naira no indica de qué métrica sale cada cifra, así que no podemos enlazarla a su fuente.»; la UI **no** infiere la métrica desde la pregunta.
- **`negada`:** el `texto` del servidor (ya nombra lo que sí puede responder) + fila de chips-sugerencia de `puedoResponder` (`metrica` ⇒ su `nombre`; `politicas` ⇒ «Políticas de la agencia»; `ficha_por_direccion_o_referencia` ⇒ «Una ficha por dirección o referencia»). Tocar un chip de métrica **precarga** el compositor con «¿Cómo va <nombre>?» (no envía solo). Razones con copy propia además del texto del servidor: `bajo_k` ⇒ nada numérico extra (no se revela el tamaño del grupo); `fuente_rancia` ⇒ chip de precaución «Fuente desactualizada»; `presupuesto_agotado` ⇒ «Llegaste al límite de preguntas de hoy. Vuelve a intentarlo mañana.»; `accion_en_fase_12` ⇒ enlace «Ir a Aprobaciones» (las acciones pasan por propuesta + aprobación, CHAT-04).
- **`bloqueada`:** «Naira armó una respuesta pero no pasó sus controles de calidad, así que no te la mostramos. Reformula la pregunta o inténtalo más tarde.» (+ el `texto` del servidor, que no trae la respuesta bloqueada).
- **`fallida`:** el `texto` del servidor + «No pude leer el dato. Eso no significa que sea cero. Reformula la pregunta o inténtalo más tarde.» (`lectura_fallida`), sin ningún número.
- **Mientras responde:** el compositor queda `disabled`, una línea «Naira está consultando…» con `Spinner` en la región `role="log"`; una pregunta a la vez.
- **Estado de la sesión 🔔 U10:** el hilo vive solo en memoria del componente; no se guarda en `localStorage`/`sessionStorage` ni en ningún store (el agente tampoco persiste el texto de la pregunta, D9.5-3). Al recargar empieza vacío; la bajada lo avisa.
- **Vacío (sin preguntas aún):** «Pregúntale por una métrica de tu inmobiliaria.» + chips de ejemplo **sin números** derivados de los nombres del catálogo visibles para el rol (p. ej. «¿Cómo va la morosidad?», «¿Cuántos inmuebles están disponibles?»). El compositor tiene el foco al montar solo si la pestaña se abrió por teclado/navegación explícita (no roba foco en cargas por enlace).
- **Compositor:** 🔔 componente nuevo `CompositorDePregunta` con `Textarea` (`src/components/ui/textarea.tsx`) + `Button` `default` `size="sm"` con texto visible «Enviar pregunta» e icono `PaperPlaneRight` (`aria-hidden`), sin `aria-label` (su nombre accesible es su texto visible, WCAG 2.5.3); **no** se reusa `ChatInput` de `/beta` (placeholder fijo `beta.chat.placeholder`, menciones y dictado por voz que no aplican). `sticky bottom-0` dentro del contenido (no `fixed`: `PageTransition` vuelve *containing block* a los `fixed`, `docs/DESIGN.md` §19). Placeholder: «Pregúntale a Naira por una métrica…». Contador visible solo desde 1.800 caracteres: «Te quedan 200 caracteres».
- **Sub-flag apagado** (404 del POST con el flag de conversación apagado): la pestaña muestra el estado apagado propio: «La conversación con Naira no está habilitada para tu inmobiliaria.»

### 7.8 · Qué cree Naira sobre nosotros — MEM-05, MEM-07, MEM-02, MEM-03 (Ley 1581)

```
Qué cree Naira sobre tu inmobiliaria
Cada cosa que Naira cree, de dónde la sacó y desde cuándo. Puedes corregirla o borrarla.
Vista del 7 oct, 9:12 a. m. · Versión r-000123
[Todas | Episodios | Conocimiento | Preferencias | Procedimientos]   [Todas | Observado | Inferido | Lo dijo alguien del equipo]
┌ MEMORIA ──────────────────────────────────────────────────────────────┐
│ <texto de la memoria, tal cual>                                         │
│ INFERIDO · CONOCIMIENTO · APORTADO POR: SISTEMA                         │
│ Lo escribió Naira · Sale de un dato: Cartera ↗ · Desde el 3 oct, 8:00 a. m. │
│      [Confirmar que es cierto] [Corregir ítem] [Borrar ítem]            │
└────────────────────────────────────────────────────────────────────────┘
PROPUESTAS PENDIENTES (procedimientos)
  <texto propuesto> · Propuesto el 2 oct   [Confirmar procedimiento] [Rechazar procedimiento]
```

- **Datos (endpoint EJECUTADO):** `GET …/naira/memory` → `NairaMemoryView = { snapshot: {revision}, items: NairaMemoryItem[], pendingProposals, generatedAt }`; cada ítem `{ id, layer, provenance, trust, writtenBy, derivedFrom, recordedAt, revision, content }` (`agent-account-manager/src/server/routes/naira-memory.ts:104-133`).
- **Procedencia obligatoria por ítem:** chip de `provenance` (§6.7) SIEMPRE visible como primera etiqueta; luego capa y `trust`. La etiqueta de `trust` es «Aportado por: Sistema / Equipo / Tercero». La palabra «confianza» **no** se usa en ninguna copy de Naira (ADR-005 no define escala de confianza y la palabra bloquea una salida: `09-03-PLAN.md:333-334,345`).
- **Autor (MEM-07) sin persona 🔔 U8:** `writtenBy.kind === 'system'` ⇒ «Lo escribió Naira»; `'user'` ⇒ «Lo escribió alguien del equipo». El `userId` **no** se pinta ni se resuelve a un nombre (B-5, §9).
- **Origen (`derivedFrom`):** `fact {source, ref}` ⇒ `source` es un nombre de tabla y el mapa de §6.2 está indexado por `metricId`, así que acá rige un mapa cerrado **por fuente** `RUTA_POR_FUENTE` con las 9 fuentes del catálogo (`catalog.ts:178-557`): `agent.debtor_states`, `agent.recovery_outcomes` ⇒ Cartera · `agent.payments` ⇒ Recaudo · `agent.payment_promises`, `agent.payment_plans` ⇒ Acuerdos de pago · `agent.escalations` ⇒ Cobranza · `agent.disputes` ⇒ Disputas · `public.consignaciones` ⇒ Inmuebles · `agent.prospect_leads` ⇒ Pipeline; se pinta «Sale de un dato de <módulo>» con su enlace (mismas reglas de gate y de modo ejemplo que §6.2). Cualquier otra fuente ⇒ **sin enlace**: «Sale de un dato» + la referencia técnica en el popover; `memory {itemId}` ⇒ «Sale de otra memoria» con enlace-ancla a ese ítem (`#memoria-<itemId>`); `human_statement` ⇒ «Sale de algo que dijo alguien del equipo»; `deterministic_query {queryId}` ⇒ «Lo reprodujo una consulta» + `queryId` en mono.
- **Ítem borrado** (`content.kind === 'erased'`): sin texto; «Se borró el <erasedAt>.» (no se pinta `erasedBy`). Queda en la lista porque el registro de que se borró es parte de la rectificación.
- **Filtros:** dos `SegmentedControl` de Cadence (capa y procedencia), filtran en el cliente; el estado va a la URL (`?capa=&procedencia=`). Filtro sin resultados ⇒ «No hay nada con estos filtros.» + «Quitar filtros» (`link`).
- **Acciones por ítem** (cada botón existe solo si la acción está en la lista `naira` del usuario):
  - «Corregir ítem» (`outline`, `size="sm"`; `memory-correct`): `ResponsiveDialog` (`src/components/ui/responsive-dialog.tsx`) con `Textarea` precargado (1..4000), primario «Guardar corrección» → `POST …/memory/items/{itemId}/correction` `{ text }`. 201 ⇒ toast «Corregido. Naira usará la versión nueva desde ahora; la anterior queda en el historial.» · 422 (`MEMORY_CONTENT_REJECTION_REASONS`, `agent-account-manager/src/naira/memory/pii-guard.ts:58-63`) ⇒ `pii:cedula` «Tiene un número de cédula.» · `pii:telefono` «Tiene un teléfono.» · `pii:email` «Tiene un correo.» · `pending_counsel:naira_desempeno_empleados` «Habla del desempeño de una persona del equipo; eso todavía no se puede guardar.» — siempre seguido de «Quítalo y vuelve a guardar.» · 409 ⇒ «Este ítem cambió mientras lo editabas. Recarga para ver la versión actual.»
  - «Borrar ítem» (`ghost`, `size="sm"`; `memory-erase`): `AlertDialog` destructivo con motivo obligatorio (§10.4) → `POST …/memory/items/{itemId}/erasure` `{ motivo }`. 200 ⇒ toast «Borrado. También se borró lo que Naira había derivado de ese ítem.» (sin cuántos, §6.6) y el foco pasa al siguiente ítem (o al `h1` si era el último).
  - «Confirmar que es cierto» (`outline`, `size="sm"`) 🔔 U17 (`memory-promote`, 11-07 D11-14): solo en ítems `inferred` de capa ≠ `procedural` (`isPromotable`, `agent-account-manager/src/naira/memory/promotion.ts:68-70`); `AlertDialog` no destructivo: «Naira pasará a tratar esto como observado. Hazlo solo si lo comprobaste.» → `POST …/memory/items/{itemId}/promotion`. 422/409/404 con el mismo molde de mensajes.
- **Propuestas pendientes** (`pendingProposals`): texto + «Propuesto el <proposedAt>» (**sin** `proposedBy`); «Confirmar procedimiento» (`outline`, `size="sm"`) / «Rechazar procedimiento» (`ghost`, `size="sm"`) solo con `procedural-approve` → `POST …/procedural/proposals/{proposalId}/resolution` `{ decision: 'confirm' | 'reject' }`; «Rechazar procedimiento» con `AlertDialog`. Escribir memoria procedural nueva (`POST …/procedural`) queda fuera de la fase 🔔 U12.
- **Vacío:** «Naira todavía no cree nada sobre tu inmobiliaria.» + «A medida que trabaje, aquí verás cada cosa que crea, de dónde la sacó y desde cuándo.»

---

## 8 · Estados de cada vista

Molde: `EstadoDeDatos` (`src/components/estado/EstadoDeDatos.tsx`, orden cargando → falló → vacío → datos) + `FalloDeCarga`
(`src/components/estado/FalloDeCarga.tsx`, clasifica con `src/lib/errores/clasificar.ts`) + `EmptyState`
(`src/components/ui/empty-state.tsx`, ícono en círculo gris). Se agregan dos estados propios de Naira (apagada, datos de
ejemplo) y una regla dura para el 403.

### 8.1 · Matriz

| Vista | Cargando | Vacío | 403 | Naira apagada | Red / 5xx | Datos de ejemplo |
|---|---|---|---|---|---|---|
| Briefing | esqueleto: 3 tarjetas `h-40` + aside `h-64` (`Skeleton`) | §7.1 silencio / `sin_entrega` | §8.2 | §8.3 (404 o `briefing_apagado`) | `FalloDeCarga` reintentable | §8.6 |
| Detalle de señal | esqueleto: cabecera + 3 bloques | — (404 = §7.2) | §8.2 | §8.3 | `FalloDeCarga` | §8.6 |
| Seguimiento | 4 filas `h-28` | §7.3.1 | §8.2 | §8.3 | `FalloDeCarga`; 503 `tabla_no_disponible` no reintentable | §8.6 |
| Bitácora | cabecera + lista de 5 líneas | — | §8.2 | §8.3 | `FalloDeCarga` | §8.6 |
| Aprobaciones | 3 tarjetas `h-36` + 2 filas de tareas | §7.5 (dos vacíos independientes) | §8.2 | §8.3 | `FalloDeCarga` en la lectura principal (acciones); las tareas son lectura secundaria (§8.2) | §8.6 |
| Propuesta | cabecera + bloque ACCIÓN | — | §8.2 (lectura) · §7.6 (decisión) | §8.3 | `FalloDeCarga` | §8.6 (botones deshabilitados: «Datos de ejemplo: no se puede decidir») |
| Preguntar | — (compositor listo al montar) · respuesta: «Naira está consultando…» | §7.7 | §8.2 | §8.3 (Naira) · §7.7 (sub-flag) | la respuesta del hilo se reemplaza por «No pudimos enviar tu pregunta. Revisa tu conexión e inténtalo de nuevo.» + «Reintentar pregunta» (`outline`; reenvía la MISMA pregunta) | §8.6 (envío habilitado; el bloque sigue rotulado «RESPUESTA» y solo sus chips de corte dicen «DATO DE EJEMPLO») |
| Qué cree Naira | 5 tarjetas `h-32` | §7.8 | §8.2 | §8.3 | `FalloDeCarga` | §8.6 |

El esqueleto solo se usa cuando la forma se conoce (regla de `EstadoDeDatos`). 401: lo resuelve `agentFetch` + `FalloDeCarga`
(`sinSesion`), sin copy propia.

### 8.2 · 403 = «sin permiso», sin un solo dato parcial — UI-03, criterio 3

- Se pinta `FalloDeCarga` con clasificación `sinPermiso` (`clasificar.ts:141-150`): título «No tienes acceso a esto», cuerpo
  «Tu rol en la inmobiliaria no incluye esta sección. Pídele a un administrador que te lo habilite.», sin reintentar, con
  «Volver a Reportes» (`volverA`). `data-testid="naira-sin-permiso"`.
- Reemplaza **todo** el cuerpo de la vista debajo de las pestañas: ni cabecera con datos, ni aside, ni cifras, ni contadores, ni
  el título de una señal, ni el nombre de una métrica.
- **Nunca** conserva contenido previo: `conservarContenido` de `EstadoDeDatos` (`:58`, `:73`) queda **prohibido** para un 403; el
  hook de Naira **vacía su caché** al recibir un 403 (un rol degradado a mitad de sesión no puede seguir viendo lo que veía).
- **Lectura principal vs secundaria.** Si la lectura **principal** de la vista (la de la pestaña o la ficha) da 403, la vista entera
  pasa a este estado (no fail-soft para 403). Las lecturas **secundarias** —las tareas (`GET …/tasks`, `task-view`) en Aprobaciones y
  la búsqueda del loop de una señal (`GET …/open-loops`, `open-loops-view`) en el detalle de señal— **no se piden** si la acción no
  está en la lista `naira` del usuario, y si igual responden 403 su sección **se omite sin rastro**: ni encabezado, ni aviso, ni
  conteo, ni un dato.
- **403 en escrituras** (feedback, corregir/borrar/confirmar memoria, resolver un procedimiento, pregunta semanal, decisión de una
  propuesta): el control que escribió queda deshabilitado (o se retira, si es la decisión) y aparece en línea «No tienes permiso
  para esta acción.» (`role="status"`), sin eco del dato ni del texto enviado; la lectura ya mostrada se conserva porque su permiso
  es otro.
- Test obligatorio (vitest + Playwright con `route.fulfill`): con el primer GET en 200 y un refetch en 403, el DOM no contiene
  ningún texto ni número del 200 (se buscan el título, el valor y el corte sembrados).

### 8.3 · Naira apagada para la agencia (flag) — `NAIRA_ENABLED`/habilitación por tenant ⇒ 404 del servicio

- Disparadores: 404 en el endpoint **principal de la pestaña** (lista o briefing; `DP5-7` de `naira-memory.ts:34`: «Naira
  apagada para el tenant ⇒ 404»), o `/my-permissions` sin la clave `naira` (agente viejo) con permisos del agente resueltos
  (`agentPermsResolved`).
- `EmptyState` con ícono `Power` en círculo gris: título «Naira todavía no está activa para tu inmobiliaria», cuerpo «Cuando se
  active, aquí verás su briefing diario, lo que sigue de cerca y lo que te propone hacer.» Sin CTA. `data-testid="naira-apagada"`.
- En la **ficha N4** un 404 no es «apagada» sino «no encontrado» (§7.2): el servidor usa el mismo 404 para las dos cosas; la
  ficha no puede distinguirlas y dice la versión que cubre ambas.
- Mientras el agente no tenga desplegados los endpoints de Naira (hoy: `src/lib/api/generated/agent.ts` tiene **0** menciones de
  `naira`), la superficie en producción muestra este estado. Es correcto: no hay datos que mostrar.

### 8.4 · Error de red / servidor

`FalloDeCarga` tal cual (`red` ⇒ «No pudimos conectarnos», `servidor` ⇒ «No pudimos cargar esto», ambos reintentables;
`not_configured` ⇒ «Esto todavía no está conectado», no reintentable). `queEs` por vista: «el briefing», «esta señal», «el
seguimiento», «las aprobaciones», «esta propuesta», «lo que cree Naira».

### 8.5 · Refresco

Ninguna vista de Naira hace polling. Refetch al volver al foco: **sí** en Briefing, Seguimiento, Aprobaciones (lista) y Qué cree
Naira; **no** en la ficha de propuesta mientras esté pendiente (la huella, §7.6) ni en Preguntar. Un refresco que falla con
red/5xx conserva lo ya mostrado con una banda «No pudimos actualizar; lo que ves es de las <hora>» (`conservarContenido`); con
403 aplica §8.2.

### 8.6 · Datos de ejemplo (endpoints que todavía no existen) — `docs/DESIGN.md` §21 🔔 U15

Modo simulado = la política del repo: nunca en producción, opt-in con `NEXT_PUBLIC_USE_MOCK_API === 'true'` fuera de
producción (`src/lib/api/config.ts:43-51`). Con el simulado prendido, las tres capas (cada una sola falla):

1. **Banda superior persistente:** `AvisoDatosDeEjemplo` montado desde `src/app/panel/inmobiliaria/reportes/naira/layout.tsx`
   (cubre las 5 pestañas y las 3 fichas), con `queEsInventado="El briefing, las señales, el seguimiento, las propuestas y la memoria de Naira"`
   y `queFalta="Falta que el servicio de agentes publique los endpoints de Naira."`; `role="status"`, no se puede cerrar. Se le
   aplica el arreglo de contraste de §5 (texto `text-fg`). Convive con `AvisoModoSimulado` (global, abajo a la izquierda).
2. **La marca dentro del contenido:** todo `MarcaDeCorte` dice «DATO DE EJEMPLO» en vez de fecha; todo `EnlaceALaFuente` queda
   inactivo con «Enlace inactivo: datos de ejemplo»; los botones que escriben (feedback, decidir, corregir, borrar, confirmar, resolver, pregunta semanal)
   quedan deshabilitados con esa misma razón visible. **Excepción declarada: Preguntar** mantiene el envío habilitado (en modo
   simulado no escribe nada en el servidor); el bloque de cada respuesta de ejemplo sigue rotulado «RESPUESTA» (§7.7) y lo único
   que dice «DATO DE EJEMPLO» son sus chips de corte (esta capa), además de la banda de la capa 1.
3. **Marca en los propios datos:** los fixtures llevan «(ejemplo)» en todo texto libre (títulos, consecuencias, memorias), ids
   imposibles (`00000000-0000-4000-8000-00000000000x`) y ningún nombre de persona, dirección real ni monto que parezca de una
   agencia concreta. Los textos de servidor simulados (títulos, `texto` de respuestas, citas) **no** llevan cortes con fecha:
   donde el servidor real pondría el corte, el fixture dice «(corte: dato de ejemplo)».

Además `data-sample="true"` en el contenedor de la vista. Ningún fixture puede renderizarse fuera del modo simulado (test).

---

## 9 · B-5 (counsel pendiente: datos de desempeño de empleados)

Regla de la superficie: **ninguna vista asocia un acto, un caso, un tiempo o un resultado a una persona del equipo** (misma
regla que 6.5/10/11/12: `12-CONTEXT.md` §2.1). Concretamente, la UI **no** tiene:

- métricas, rankings, tablas o gráficos por persona (ni «tiempo de aprobación por persona», ni «votos por persona», ni «loops por dueño persona»);
- «quién cerró» un loop, «quién aprobó» o «quién rechazó» una propuesta, «quién votó», «quién preguntó», «quién corrigió»;
- filtros o agrupaciones por miembro del equipo; avatares de miembros en ninguna tarjeta de Naira;
- asignación a una persona (solo a un **rol de dominio**, H2);
- el reporte de descubrimiento (`GET …/feedback/report`) — fuera de la fase 🔔 U12; cuando se construya, solo por regla y agencia.

**Campos de actor que los contratos SÍ exponen y la UI NO renderiza** (ni texto, ni `title`, ni `aria-label`, ni `data-*`, ni logs de consola):

| Contrato | Campo | Qué se pinta en su lugar |
|---|---|---|
| `NairaMemoryItem.writtenBy` (`naira-memory.ts:84-86`) | `{ kind: 'user', userId }` | «Lo escribió alguien del equipo» (solo el `kind`) — choque con MEM-07 declarado en C13 |
| `NairaMemoryContent` borrado (`naira-memory.ts:100`) | `erasedBy` (`userId` o sistema) | «Se borró el <fecha>.» |
| `NairaMemoryProposal.proposedBy` (`naira-memory.ts:125`) | `{ kind: 'user', userId }` | nada: «Propuesto el <fecha>» |
| Registro T-323 (`approved_by_user_id`, `principal_binding`) | no lo expone ninguna ruta de 12-07 | nada: no se construye lector en el front |
| Registro de la conversación (`asked_by_user_id`, 9.5-02) | no lo expone la ruta | nada |
| `GET …/role-assignments` (10-06) `asignaciones[].userId` | configuración, fuera de la fase | — (si una fase posterior lo muestra, será solo en configuración y para OWNER/ADMIN) |

Test estático obligatorio: ningún componente bajo `src/components/inmobiliaria/naira/` lee `userId`, `proposedBy`,
`erasedBy`, `approvedBy*`, `askedBy*` ni `writtenBy.userId` (grep con control positivo sembrado en una copia).

---

## 10 · Copywriting Contract

Español de Colombia, **tuteo** (§0). Textos en `src/lib/i18n/locales/es.json` **y** `en.json` bajo `inmobiliaria.ai.naira.*`
(navegación en `inmobiliaria.ai.nav.naira*`, intro en `inmobiliaria.ai.intro.naira.*`), interpolación `{{var}}` (medido:
`es.json:7551`). Nunca hardcodeado en un componente (`docs/VOCABULARIO.md` §«Cómo se aplica»). Los textos que vienen del
servidor (títulos, `texto`, citas, `FRASE_DE_SILENCIO`, textos de negativa) se pintan tal cual y **no** se traducen.

### 10.1 · Tabla del template

| Element | Copy |
|---|---|
| Primary CTA | Ficha de propuesta: **«Aprobar acción»** · Preguntar: **«Enviar pregunta»** (botón de envío visible; nombre accesible = su texto) · Corregir memoria: **«Guardar corrección»** · Pregunta semanal: **«Enviar respuesta»** |
| Empty state heading | Briefing sin atención con inventario: «Hoy no hay nada que requiera tu atención» (del servidor) · Seguimiento: «Naira no está siguiendo nada en este momento» · Aprobaciones: «No hay nada por decidir» · Qué cree Naira: «Naira todavía no cree nada sobre tu inmobiliaria» · Preguntar: «Pregúntale por una métrica de tu inmobiliaria» |
| Empty state body | Briefing: el inventario de §7.1 (qué corrió, cortes, descartes) · Seguimiento: «Cuando una señal necesite seguimiento, aparecerá aquí con su próxima revisión.» · Aprobaciones: «Cuando Naira proponga algo, lo verás aquí; al abrirla verás su consecuencia antes de que se ejecute.» · Qué cree Naira: «A medida que trabaje, aquí verás cada cosa que crea, de dónde la sacó y desde cuándo.» · Preguntar: chips de ejemplo sin números |
| Error state | Red: «No pudimos conectarnos» / «Revisa tu conexión. Los datos siguen ahí; apenas vuelva la red los traemos.» + «Intentar de nuevo» · Servidor: «No pudimos cargar <queEs>» / «Fue un problema nuestro, no tuyo. Prueba de nuevo en un momento; si sigue igual, escríbenos con la referencia de abajo.» (copy existente de `clasificar.ts`) · Silencio sin inventario: «No podemos mostrarte qué revisó Naira hoy, así que no sabemos si este silencio es un día tranquilo.» · Lectura fallida: «No pude leer el dato. Eso no significa que sea cero.» |
| Destructive confirmation | ver §10.4 (Borrar memoria · Cancelar tarea · Rechazar propuesta · Rechazar propuesta de procedimiento) |

### 10.2 · Navegación, encabezados y bajadas

| Clave | es | en |
|---|---|---|
| `inmobiliaria.ai.nav.naira` | Naira | Naira |
| `inmobiliaria.ai.nav.nairaHint` | Briefing y seguimiento | Briefing and follow-up |
| `…nav.nairaBriefing` / `nairaSeguimiento` / `nairaAprobaciones` / `nairaPreguntar` / `nairaMemoria` | Briefing / Seguimiento / Aprobaciones / Preguntar / Qué cree Naira | Briefing / Follow-up / Approvals / Ask / What Naira believes |
| H1 Briefing | Briefing de hoy (o «Briefing del <fecha>» si `dia` ≠ hoy) | Today's briefing |
| Bajada Briefing | Lo que Naira te envió el {{fecha}} a las {{hora}}. Los datos pueden haber cambiado desde entonces. | — |
| H1 Seguimiento | Seguimiento | Follow-up |
| Bajada | Lo que Naira sigue de cerca hasta que se resuelva. Naira cierra cada caso cuando los datos lo confirman. | — |
| H1 Aprobaciones | Aprobaciones | Approvals |
| Bajada | Lo que Naira propone hacer. Nada se ejecuta sin que alguien con permiso lo apruebe. | — |
| H1 Preguntar | Pregúntale a Naira | Ask Naira |
| Bajada | Responde solo con las métricas de su catálogo, con el corte de cada dato. No guarda la conversación. | — |
| H1 Memoria | Qué cree Naira sobre tu inmobiliaria | What Naira believes about your agency |
| Bajada | Cada cosa que Naira cree, de dónde la sacó y desde cuándo. Puedes corregirla o borrarla. | — |
| Intro (modal) título / cuerpo | Naira, la que mira toda tu inmobiliaria / Cada mañana te cuenta qué necesita tu atención, con el corte de cada dato; sigue cada caso hasta que se resuelve y te propone acciones que solo se ejecutan si alguien las aprueba. | — |

### 10.3 · Microcopy fijo (además de lo ya escrito en §6-§8)

«Corte» (prefijo del chip) · «hace {{n}} min / h / d» · «DATO DE EJEMPLO» · «Ver en {{modulo}}» · «Referencia técnica» ·
«Tu rol no puede abrir {{modulo}}» · «Enlace inactivo: datos de ejemplo» · «Ver la señal» · «Ver la bitácora» · «Ver el
razonamiento» / «Ocultar el razonamiento» · «¿Te sirvió?» · «Útil» · «No útil» · «Ya lo sabía» · «Registrado como "{{valor}}".
Tu respuesta cuenta como la del equipo y reemplaza la anterior.» · «Hay elementos que tu rol no puede ver.» · «Rol: {{rol}}» ·
«Alcance: toda la inmobiliaria» · «Cortes de los datos:» · «Naira está consultando…» · «Día anterior» / «Día siguiente» ·
«Actualizar propuesta» · «Cargar la versión actual» · «Revisar propuesta» · «Reintentar pregunta» · «No tienes permiso para
esta acción.» · «Reformula la pregunta o inténtalo más tarde.».

### 10.4 · Confirmaciones destructivas o sin vuelta (`AlertDialog`, nunca `window.confirm`: `src/components/ui/sin-dialogos-del-navegador.test.ts`)

| Acción | Título | Cuerpo | Confirmar | Salida |
|---|---|---|---|---|
| Borrar un ítem de memoria (`memory-erase`) | ¿Borrar esto de la memoria de Naira? | Se borra el texto y todo lo que Naira derivó de él. No se puede deshacer. Queda el registro de que se borró y cuándo. **Motivo (obligatorio):** ( ) Lo pidió el titular de los datos · ( ) Decisión de la inmobiliaria | **Borrar ítem** (`destructive`, deshabilitado hasta elegir motivo) | Volver |
| Cancelar una tarea de Naira (`task-cancel`) | ¿Cancelar esta tarea? | La tarea deja de estar asignada al rol {{rol}}. Si el problema sigue, Naira lo seguirá mostrando en Seguimiento. | **Cancelar tarea** (`destructive`) | Volver |
| Rechazar una propuesta | ¿Rechazar esta propuesta? | Naira no la ejecutará y no la volverá a proponer para este seguimiento. | **Rechazar propuesta** (`default`) | Volver |
| Rechazar una propuesta de procedimiento (`procedural-approve`) | ¿Rechazar esta propuesta? | Naira no guardará este procedimiento. | **Rechazar procedimiento** (`default`) | Volver |
| Confirmar que una inferencia es cierta (`memory-promote`) | ¿Confirmar que esto es cierto? | Naira pasará a tratarlo como observado. Hazlo solo si lo comprobaste. | **Confirmar como cierto** (`default`) | Volver |

Motivos del borrado = `ERASURE_REASONS` (`agent-account-manager/src/naira/memory/erasure.ts:64`): `solicitud_del_titular`,
`decision_de_la_agencia`, con las etiquetas de arriba.

### 10.5 · Copy prohibida (test estático sobre las claves `inmobiliaria.ai.naira.*` de `es.json`)

- «todavía estoy aprendiendo» y variantes (NOT-05);
- «score», «puntaje», «índice de salud», «/100» (NOT-06: nunca un score compuesto);
- todo término del léxico de probabilidad (`probab…`, `improbab…`, `posiblemente`, `es posible que`, `puede que`, `quizá(s)`, `tal vez`, `seguramente`, `con seguridad`, `sin duda`, `indudablemente`, `es claro que`, `certeza`, `imposible`, `verosímil…`, `plausible…`: `09-03-PLAN.md:340-345`) y la palabra «confianza». Únicas excepciones, en una lista blanca explícita del test: los 7 términos de la tabla de §6.5 y la etiqueta de fila «Probabilidad» del `BloqueDeHipotesis`;
- conectores causales desnudos en copy propia del front (`porque`, `debido a`, `causó`, `provocó`, `se explica por`, `a raíz de`: CLM-01): el front no explica causas, las pinta del servidor;
- «quién cerró», «cerrado por», «aprobado por», nombres de roles del agente (`OWNER`, `OPERATOR`);
- voseo (`tenés`, `podés`, `querés`, `confirmás`…) — el panel tutea (C9).

### 10.6 · Variante de cada botón (ninguno sin variante: la `default` es cobalto y solo va en la lista de §5)

| Variante | Botones |
|---|---|
| `default` | «Aprobar acción» · «Enviar pregunta» · «Guardar corrección» · «Enviar respuesta» · confirmación no destructiva de un `AlertDialog` («Rechazar propuesta», «Rechazar procedimiento», «Confirmar como cierto») |
| `destructive` | confirmación de «Borrar ítem» y de «Cancelar tarea» (dentro del `AlertDialog`) |
| `outline` | «Rechazar propuesta» (ficha) · «Revisar propuesta →» · «Cargar la versión actual» · «Reintentar pregunta» · «Día anterior» / «Día siguiente» · «Ver el de ayer» · «Útil» / «No útil» / «Ya lo sabía» · «Corregir ítem» · «Confirmar que es cierto» · «Confirmar procedimiento» · «Volver» de los diálogos |
| `ghost` | «Actualizar propuesta» · «Cancelar tarea» (en la fila) · «Borrar ítem» (en la tarjeta) · «Rechazar procedimiento» (en la fila) · disparador «Ver el razonamiento» |
| `link` | «Ver la señal» · «Ver la bitácora» · «Ver en <módulo>» · «Quitar filtros» · «Ir a Aprobaciones» · chips-sugerencia de la conversación |

«Intentar de nuevo» de `FalloDeCarga` y los botones de primitivas heredadas conservan la variante que ya tienen.

---

## 11 · Accesibilidad

Gate: proyecto Playwright `panel-a11y` (`playwright.config.ts:58-63`, `tests/e2e/panel-a11y/`), axe con etiquetas `wcag2a`,
`wcag2aa`, `wcag21a`, `wcag21aa` (`tests/e2e/panel-a11y/_helpers/axe-helpers.ts:147`), red mockeada con `route.fulfill` (como
cobranza: no requiere el agente corriendo). Specs nuevos (uno por archivo): las 5 pestañas pobladas, las 3 fichas N4, y los
estados 403, apagada, vacío y datos de ejemplo del Briefing — **cero violaciones** en todos.

### 11.1 · Estructura y roles

- Un solo `h1` por vista; secciones del briefing con `h2`; cada ítem es `<article aria-labelledby="<id del título>">`.
- Cifras: `<data value="<valor crudo>">` con el texto formateado; cortes en `<time dateTime>` (§6.1).
- Bloques de categoría: `<section aria-labelledby>` con la etiqueta visible como nombre (§6.3).
- Feedback: `role="group"` + `aria-label`, botones con `aria-pressed`; el resultado en una región `aria-live="polite"` compartida por la vista.
- Conversación: el hilo es `role="log"` con `aria-live="polite"` y `aria-relevant="additions"`; el compositor tiene `<label>` visualmente oculto («Tu pregunta para Naira», `VisuallyHidden`); el botón de envío es el visible «Enviar pregunta» (nombre accesible = su texto, WCAG 2.5.3); Enter envía, Shift+Enter hace salto de línea; `aria-busy="true"` en el hilo mientras responde.
- Disclosure del razonamiento: `<button aria-expanded aria-controls>`; el panel es `role="region"` con nombre.
- `ChipDeAfirmacion` y el botón `Info` de la referencia técnica: `<button type="button">` con nombre accesible («Qué significa "hipótesis"», «Ver la referencia técnica») que abre un `Popover` (foco dentro, Escape cierra y devuelve el foco).
- Estado en banda (sin permiso, apagada, silencio sin inventario, datos de ejemplo): `role="status"` (no `alert`: no son urgentes).
- Tabs: las pone `WorkspaceNav` con `aria-label="Pestañas de Naira"` y `aria-current="page"` solo en coincidencia exacta (heredado).

### 11.2 · Foco

- `focus-visible` global cobalto (no se sobrescribe, `docs/DESIGN.md` §7).
- Tras aprobar/rechazar: foco al `<p role="status">` del resultado. Tras borrar un ítem: foco al siguiente ítem (o al `h1`). Tras votar: el foco se queda en el botón.
- Diálogos: `AlertDialog`/`ResponsiveDialog` de Radix (trampa de foco, Escape, retorno del foco al disparador); scroll interno con `data-lenis-prevent` + `useLenis().stop()` al abrir (`docs/DESIGN.md` §8).
- Ninguna vista roba el foco al cargar por enlace (correo/WhatsApp).

### 11.3 · Color, contraste y movimiento

- Ningún estado se comunica solo por color: categoría = etiqueta + icono + borde; urgencia, estado de loop y de propuesta = texto; precaución = icono + texto.
- Contrastes de §5; `text-warning` solo en iconos.
- Sin animaciones propias más allá de las primitivas; todo bajo `prefers-reduced-motion` (`useReducedMotion` si se agrega alguna).

### 11.4 · Tests de contrato visual (vitest, sin navegador)

- cada vocabulario de §6.7 con `switch` exhaustivo (`never`) y una etiqueta por valor en `es` y `en`;
- `BANDAS_DE_PROBABILIDAD` igual a la tabla de ADR-005 cuando exista en disco (si no existe, el test lo declara `skip` con razón visible, no pasa en verde vacío);
- copy prohibida de §10.5 ausente de `inmobiliaria.ai.naira.*` (con control positivo sembrado en una copia);
- §8.2 (403 sin residuos) y §9 (campos de actor no leídos).

---

## 12 · Responsive

Breakpoints de Tailwind por defecto (el config no redefine `screens`; solo el `container` fija `2xl: 1280px`,
`tailwind.config.ts:18-28`): base < 640 · `sm` 640 · `md` 768 · `lg` 1024 (aparece el sidebar fijo de 240 px) · `xl` 1280.
Mobile-first; todo hijo de grid lleva `min-w-0` (sin eso la página scrollea de lado en móvil: medido en el Piloto,
`piloto/page.tsx:193-194`).

| Vista | < 768 | ≥ 768 (`md`) | ≥ 1024 (`lg`) |
|---|---|---|---|
| Briefing | una columna; el valor va debajo del título; corte y enlace en filas propias; el inventario es un `Collapsible` al final | tarjeta con `md:p-6`; corte y enlace en la misma fila del valor | `lg:grid-cols-3`: ítems `lg:col-span-2` + aside «Qué revisó Naira hoy» |
| Detalle de señal | una columna | una columna `max-w-3xl` | igual (lectura) |
| Seguimiento | fila = tarjeta apilada; botones de feedback en fila con scroll horizontal si no caben (nunca se parten) | metadatos en dos columnas (`md:grid-cols-2`) | igual |
| Aprobaciones | tarjetas apiladas; «Revisar propuesta» a lo ancho | tarjetas con acciones a la derecha | igual; tareas como lista |
| Propuesta | botones de decisión a lo ancho y apilados (`flex-col`), «Aprobar acción» arriba | en fila, alineados a la derecha | igual |
| Preguntar | hilo a lo ancho; compositor `sticky bottom-0` por encima de la nav móvil | hilo `max-w-3xl` centrado | igual |
| Qué cree Naira | filtros como `SegmentedControl` con scroll horizontal; acciones del ítem en un `DropdownMenu` «Acciones» | acciones visibles en fila | igual |

Pestañas: `BarraDePestanas` ya resuelve el desborde con scroll y flechas (heredado). Objetivos táctiles de §3.

---

## 13 · Inventario de componentes

### 13.1 · Se reusan (sin cambios salvo lo marcado)

| Componente | Ruta | Uso |
|---|---|---|
| `WorkspaceNav` | `src/components/inmobiliaria/ai/WorkspaceNav.tsx` | pestañas de Naira — **cambio aditivo**: respeta `item.action` (§2.4) |
| `AgentHeaderBreadcrumb`, `CabeceraDelAgente`, `VolverALaLista` | `src/components/inmobiliaria/ai/` | breadcrumb «Reportes › Naira › …», montaje de pestañas, volver desde fichas N4 |
| `AgentIntroModal` | `src/components/tour/AgentIntroModal.tsx` | entrada `naira` en `AGENT_INTROS` |
| `SeccionesDelModulo` | (layout del panel) | la tarjeta «Naira» entre las secciones de Reportes (por dato, sin tocar el componente) |
| `EstadoDeDatos`, `FalloDeCarga`, `SinDatos` | `src/components/estado/` | cuatro estados; 403 con la regla de §8.2 |
| `AvisoDatosDeEjemplo` | `src/components/estado/AvisoDatosDeEjemplo.tsx` | banda de §8.6 — **arreglo de contraste** (texto `text-fg`, icono `text-warning`) con su test |
| `AvisoModoSimulado` | `src/components/estado/AvisoModoSimulado.tsx` | global, sin cambios |
| `PageGuard` | `src/components/auth/PageGuard.tsx` | gate por acción de `naira` |
| `UserBubble` | `src/components/beta/UserBubble.tsx` | la pregunta en el hilo |
| Primitivas `src/components/ui/` | `button`, `badge`, `card`, `skeleton`, `spinner`, `empty-state`, `alert-dialog`, `responsive-dialog`, `popover`, `collapsible`, `textarea`, `dropdown-menu`, `visually-hidden`, `toast` (importado de `@/components/ui/toast`, nunca de `sonner`, `docs/DESIGN.md` §4) | — |
| Cadence | `IconButton`, `SegmentedControl`, `MonoLabel`, `MessageBubble` (vía `UserBubble`) | — |
| Helpers | `formatCurrency` (`src/lib/format.ts:19`), `agentFetch` (`src/lib/api/agent-fetch.ts`), `clasificarFallo`, `isMockMode` (`src/lib/api/config.ts`) | — |

**No** se reusan (declarado): `SalaAgente` (su tira de KPIs pinta números sin corte ni drill-down, `SalaAgente.tsx:168-180`, y
usa `bg-muted`/`text-muted-foreground` de shadcn en vez de tokens Cadence); `AssistantBubble`/`MarkdownRenderer` (reinterpretan
el texto validado); `ChatInput` (§7.7); `TrazaCaso` (pinta badges de tipo de actor: riesgo B-5 en la bitácora).

### 13.2 · Se crean (todos en `src/components/inmobiliaria/naira/`, `PascalCase.tsx`, con test)

| Componente | Responsabilidad | Reglas que hace cumplir |
|---|---|---|
| `MarcaDeCorte` (usa `formatearCorte` de `src/lib/naira/formato.ts`) | chip de corte con edad relativa | §6.1 (zona fija, fail-closed sin `asOf`, modo ejemplo) |
| `EnlaceALaFuente` (usa `RUTA_DE_LA_METRICA` y `RUTA_POR_FUENTE` de `src/lib/naira/fuente-a-ruta.ts`) | drill-down + referencia técnica | §6.2 (mapa cerrado, gate del destino, nunca enlace roto) |
| `CifraDeNaira` | `valor` + `unidad` + `MarcaDeCorte` + `EnlaceALaFuente` en una pieza | §6.1-§6.2, formato por unidad (§7.1) |
| `BloqueDeCategoria` | las 6 categorías de INV-03 | §6.3 |
| `ChipDeAfirmacion` + `BloqueDeHipotesis` | `claimClass` y banda/alternativa/discriminador | §6.4-§6.5 (fail-closed) |
| `BotonesDeUtilidad` | los tres botones de feedback | §7.3.2 |
| `ItemDelBriefing`, `InventarioDelDia`, `LineaDeMadurez`, `PreguntaSemanal` | briefing | §7.1 |
| `FilaDeSeguimiento`, `BitacoraDelLoop` | loops | §7.3-§7.4 |
| `TarjetaDePropuesta`, `DecisionDePropuesta`, `RazonamientoDePropuesta`, `FilaDeTarea` | aprobaciones | §7.5-§7.6 |
| `CompositorDePregunta`, `RespuestaDeNaira` | conversación | §7.7 |
| `ItemDeMemoria`, `DialogoDeCorreccion`, `DialogoDeBorrado` | memoria | §7.8, §10.4 |
| `NairaApagada`, `NairaSinPermiso` | estados de §8.2-§8.3 (envoltorios finos sobre `EmptyState`/`FalloDeCarga`) | §8 |

Datos: `src/lib/api/naira/contrato.ts` (tipos del contrato mientras los generados no tengan `Naira*`; en cuanto `pnpm api:gen`
los traiga, salen de `src/lib/api/generated/agent.ts` y el contrato local los re-exporta — nunca se edita el generado) +
`src/lib/api/naira/cliente.ts` (llamadas con `agentFetch`), hooks `src/lib/hooks/naira/use-naira-*.ts`, fixtures de §8.6 en
`src/lib/data/mock-naira.ts` (importable solo detrás de `isMockMode()`). Puros, sin React y con test: `src/lib/naira/formato.ts`
(`formatearCorte`, formato por unidad), `src/lib/naira/fuente-a-ruta.ts` (`RUTA_DE_LA_METRICA`, `RUTA_POR_FUENTE`) y
`src/lib/naira/categorias.ts` (vocabularios de §6.7, etiquetas de categoría, `BANDAS_DE_PROBABILIDAD`).

### 13.3 · Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official (`components.json` `registries: {}`) | ninguno nuevo: solo primitivas ya presentes en `src/components/ui/` | not required |
| `@leasefy/cadence` (primera parte, `file:../cadence`) | componentes ya consumidos por el repo (`IconButton`, `SegmentedControl`, `MonoLabel`, `MessageBubble`) | not required (no es registry de terceros) |
| Terceros | **ninguno** | no aplica: esta fase no declara registries ni bloques de terceros; no se corre `npx shadcn add` |

---

## 14 · Choques medidos (ROADMAP / contratos ↔ base) y enmiendas propuestas

Esta fase **no** edita `agent-account-manager` (solo lectura). Las enmiendas van al orquestador; hasta que lleguen, la UI se
comporta como dice la columna «Mientras tanto» (nunca inventa el dato que falta).

| # | Choque | Evidencia | Consecuencia | Mientras tanto (UI) |
|---|---|---|---|---|
| **C1** | El «AI Hub existente» del criterio 1 ya no existe | `/ai` muerto (`arquitectura-del-panel.test.ts:91-98`); vitrina `configuracion/agentes` redirige | «Sin página nueva ni sección paralela» se traduce a workspace N3 | §2 (U1) |
| **C2** | Los enlaces del correo del briefing apuntan a `https://<host>/naira/briefing`, `/naira/senales/<id>`, `/naira/reglas`, `/naira/recall`, `/naira/cola-legacy`, `/naira/arranque` — **raíz**, fuera del panel = sección paralela | `10-04-PLAN.md:379-380` (`RUTAS_DEL_PANEL`, marcado «🔔 rutas del front (Fase 13)») | enlaces rotos o una sección paralela | **E13-5**. El front **no** crea páginas `/naira/*`. Si 10-04 se ejecuta antes que la enmienda, se agregan redirecciones 307 en una tabla tipada con test (molde `src/lib/nav/rutas-por-ciclo-de-vida.data.mjs` + `next.config.mjs:126-130`): `/naira/briefing` → `B`, `/naira/senales/:id` → `B/senales/:id`, `/naira/recall` → `B#recall`; `reglas`, `cola-legacy`, `arranque` → `B` (no tienen pantalla en la 13). |
| **C3** | `GET /briefing` solo expone los ítems congelados: **no** trae `inventario`, `madurez`, `semanal`, `arranque` | `10-06-PLAN.md:333-336` vs `BriefingDePersona` de `10-04-PLAN.md:313-330` | el silencio con inventario (INV-06), el warm-up con fecha (NOT-05) y la pregunta semanal no se pueden pintar desde el contrato | **E13-1**. La UI pinta el silencio sin inventario como «no sabemos si es un día tranquilo» (§7.1); la pregunta semanal se muestra los lunes con `semana = dia` |
| **C4** | El detalle de señal no trae entidades afectadas; los 5 detectores activos emiten `affectedEntities: []` | `10-06-PLAN.md:335-336`; `10-CONTEXT.md:58` | la «lista de entidades afectadas» del criterio 1 es, en v1, siempre «agregada» | **E13-2**. Sección siempre visible con el estado agregado declarado (§7.2) |
| **C5** | Ninguna cita causal trae `claimClass` ni banda/alternativa/discriminador: `citas: string[]` en la ruta y `CitaPersistida = { plantilla, texto }` en disco | `10-06-PLAN.md:336`; `9.5-04-PLAN.md:324` | el chip de `claimClass` del criterio 4 no se puede pintar | **E13-3**. Fail-closed: la cita no se muestra (§6.4, U6) |
| **C6** | La conversación devuelve un `texto` plano + `asOfs[]`, sin las 6 secciones de INV-03 ni tramos | `9.5-06-PLAN.md:340-344` | la distinción DATO/INFERENCIA/RECOMENDACIÓN no se puede pintar en la respuesta | **E13-4**. Bloque «RESPUESTA» neutro con la nota de §7.7 |
| **C7** | Roles distintos en front (`ADMIN`, `AGENTE`, `CONTADOR`, `VIEWER`) y agente (`OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`) | `src/lib/auth/agency-roles.ts`; `permissions-matrix.ts:70` | nombrar un rol en la UI engañaría | la UI decide solo por la lista de acciones y `puedeDecidir` (§2.4) |
| **C8** | El front no conoce la clave `naira` de `/my-permissions` | `src/lib/auth/agent-module-access.ts:24-33` | sin cambio, `canAccess('naira', …)` cae al mapa del monolito y da falso | se agrega `naira` fail-closed (§2.4) |
| **C9** | Ejemplos de copy del agente en voseo («¿lo confirmás?») vs panel en tuteo | `REQUIREMENTS.md:208` (NOT-10), `10-CONTEXT.md:142`; `es.json` 0 voseo | mezcla de registros en la misma pantalla | 10-04 ya fija `TEXTOS_DEL_BRIEFING` en tuteo (`10-04-PLAN.md:382`); **E13-6** pide que TODO texto servido a la UI (negativas, declaraciones de 9.5-04) sea tuteo |
| **C10** | `.text-h2` en `globals.css` ≠ `DESIGN.md` | `globals.css:707-710` vs `DESIGN.md` §3 | tipografía impredecible | tamaños Tailwind explícitos (§4) |
| **C11** | `text-warning` sobre `bg-warning-soft` = 3.2:1 | cálculo de §5; `AvisoDatosDeEjemplo.tsx:51-53` | axe falla el gate `panel-a11y` | arreglo mínimo del componente (§13.1) |
| **C12** | `CLAUDE.md` y `components.json` nombran lucide; el código no lo usa | 0 imports medidos | ambigüedad para el executor | Phosphor solo (§1) |
| **C13** | MEM-07 pide mostrar `writtenBy`; el contrato lo da con `userId` y B-5 está abierto | `REQUIREMENTS.md` MEM-07; `naira-memory.ts:84-86` | mostrar el `userId`/nombre expone autoría individual | solo el tipo de autor (§7.8, U8); alternativa para Nico: nombre visible solo para OWNER/ADMIN tras counsel |
| **C14** | El Piloto ya tiene un briefing («lectura del Gerente») y un recaudo del mes | `piloto/page.tsx` (`usePilotoBriefing`); `src/lib/api/piloto.ts:120` vs `catalog.ts:221-231` | dos briefings y dos números del mismo concepto si Naira entra al Inicio | Naira no entra al Inicio en v1 (U2) |
| **C15** | El correo promete confirmar reglas degradadas, drenar la cola legacy y fijar el arranque desde el panel; no hay pantalla (ni `GET` de reglas) en la 13 | `10-04-PLAN.md:379-380`, `:993`; `10-06-PLAN.md:343-349` | enlaces del correo sin destino útil | **E13-5 (b)**: 10-04 no emite esos tres enlaces hasta que exista la configuración de Naira (U12) |
| **C16** | El listado de propuestas no trae ningún `asOf` y el texto de la consecuencia lleva numerales de hechos | `12-09-PLAN.md:338` («el texto de la plantilla con numerales de hechos `system` y fechas; no devuelve `hechos` ni `source`»); `AccionListada`, `12-07-PLAN.md:413-416` | pintar la consecuencia en el listado deja cifras sin corte (INV-07) | **E13-7**. La tarjeta muestra solo tipo · rol · clase · estado · vencimiento (§7.5) |
| **C17** | Las cifras de una respuesta `respondida` no dicen de qué métrica salen: `refsServidas` llega vacío en respuestas de métricas | `9.5-04-PLAN.md:735` (`[SAL:respuesta-aprobada]`) | sin drill-down por cifra en la conversación (UI-02) | **E13-8**. Línea explícita de §7.7; la UI no infiere la métrica desde la pregunta |

### 14.1 · Enmiendas para el orquestador (a `Leasefy/agent`, todas aditivas: «el dueño puede AGREGAR, no renombrar»)

- **E13-1 (10-06):** `NairaBriefingDay.resultado.entregado` gana, por entrega o por día: `inventario: InventarioVisible`, `madurez: LineaDeMadurez[]`, `arranque: ArranqueVisible` y `semanal` (al menos `recall.semana` y las `reglas` visibles), con el nombre legible de cada compuerta (`NOMBRES_DE_COMPUERTA`, `10-04-PLAN.md:382`). Los conteos siguen sin numeral (N17).
- **E13-2 (10-06 / 09-04):** `NairaSignalDetail` gana `entidades: { kind: 'agregada' } | { kind: 'lista'; items: { tipo; id; etiqueta }[] }` para que la UI no infiera «agregada» de la ausencia de un campo.
- **E13-3 (09-06 / 9.5-04 / 10-06):** persistir y exponer por cita `{ texto, tramos, claimClass, hipotesis: null | { banda, alternativa, discriminador } }` (lo calcula `derivarClaseDeAfirmacion` de 09-03 y hoy se descarta al persistir). Sin esto, el criterio 4 no se cumple en ninguna superficie.
- **E13-4 (9.5-06):** `NairaConversationAnswered` gana `secciones` (las 6 de `SECCIONES_DE_SALIDA`, cada una `{ vacia; razon } | { oraciones: { texto; tramos; claimClass? }[] }`) además del `texto` actual, **y `refsServidas` pasa a ser tipado**: `{ kind: 'chunk'; id } | { kind: 'investigacion'; id }` (hoy `string[]`: un `investigacionId` es indistinguible de un chunk, así que la UI no puede aislar la parte causal y aplica U6 a toda la respuesta, `9.5-04-PLAN.md:744`).
- **E13-5 (10-04):** `RUTAS_DEL_PANEL` = rutas del panel (`/panel/inmobiliaria/reportes/naira`, `…/senales/<id>`, `…/reportes/naira?dia=`, `…#recall`); y (b) no emitir `reglas`, `cola-legacy` ni `arranque` hasta que exista su pantalla.
- **E13-6 (9.5-04 y cualquier texto servido):** tuteo en todo texto que la UI pinte tal cual.
- **E13-7 (12-07):** `AccionListada` / `NairaActionSummary` gana `asOfs: string[]` —el `asOf` de cada hecho cuyo numeral aparece en `consecuencia.texto`— y el `metricId` de la señal, para que el listado pueda abrir con la consecuencia, su corte y su drill-down (C16).
- **E13-8 (9.5-04 / 9.5-06):** en `respondida`, una referencia por cifra `{ kind: 'metrica'; metricId; asOf }` (se puede plegar en las refs tipadas de E13-4) para enlazar cada número a su fuente (C17).
- **Fuera de la fase, sin enmienda:** la UI necesita un mapa `metricId → nombre legible` para títulos de loops y chips; se duplica en el front con test de paridad contra `NOMBRES_CONVERSACIONALES` cuando exista en disco (preferible: que las rutas lo sirvan; se deja como sugerencia, no como bloqueo).

---

## 15 · Decisiones 🔔 (supuestos para Nico; se planifica igual)

| # | Decisión tomada | Alternativa |
|---|---|---|
| **U1** | Naira = workspace N3 `agente: 'naira'` en el módulo **Reportes** (`/panel/inmobiliaria/reportes/naira`) | Bajo el Piloto (`/piloto/naira`, requiere otro mecanismo de pestañas) o bajo Cobros |
| **U2** | En v1 no se toca Inicio (`/piloto`) ni Chat (`/`) | Fila de entrada sin números en el encabezado del Piloto, tras reconciliar el briefing del Gerente |
| **U3** | 5 pestañas (Briefing · Seguimiento · Aprobaciones · Preguntar · Qué cree Naira) + 3 fichas N4 con URL | Detalle de señal en cajón (pierde el enlace del correo) |
| **U4** | `naira` fail-closed; `canAccess('naira','view')` = lista no vacía; gate por acción en cada pestaña | Gate solo por `briefing-view` para todo el workspace |
| **U5** | Ningún conteo propio de Naira como numeral (ocultos, ciclos, pendientes, descartes) | Mostrarlos con `generadoEn` como corte |
| **U6** | Oración causal sin `claimClass` ⇒ no se muestra | Mostrarla con chip «Clase no informada» |
| **U7** | Drill-down aterriza en el listado de la fuente (N2/N3) con mapa cerrado de 14 métricas | Esperar a E13-2 para enlazar fichas N4 |
| **U8** | Autor de memoria = solo tipo («Naira» / «alguien del equipo») | Nombre visible para OWNER/ADMIN tras counsel (B-5) |
| **U9** | «Aprobar acción» sin diálogo extra; «Rechazar», «Cancelar tarea», «Borrar» con `AlertDialog` | Diálogo también al aprobar (más fricción, C-14 fuera de alcance) |
| **U10** | La conversación no persiste en el navegador | Guardar el hilo en `sessionStorage` (contradice D9.5-3) |
| **U11** | `FactSnapshot.confidence` no se pinta | Pintarlo con escala propia (requiere ADR) |
| **U12** | Fuera de la 13: configuración de Naira (arranque, reglas degradadas, cola legacy, preferencias, asignación de roles, tope), escribir memoria procedural nueva y el reporte de descubrimiento | Incluirlos (su hogar natural: `/panel/inmobiliaria/configuracion/ia`, que existe) |
| **U13** | Pregunta semanal (recall) dentro del Briefing del lunes, ancla `#recall` | Pantalla propia |
| **U14** | Corte: «Corte 5 oct 2026, 6:15 a. m. · hace 13 h», zona fija `America/Bogota`, 12 h como `formatDateTime` del repo | 24 h |
| **U15** | Datos de ejemplo con las 3 capas de `DESIGN.md` §21 y cortes «DATO DE EJEMPLO» | Solo la banda |
| **U16** | Iconos: `Compass` (pantalla), `Newspaper`, `ArrowsCounterClockwise`, `SealCheck`, `ChatTeardropText`, `Notebook`; imagen de intro `leasefy-brand-10.jpg` | — |
| **U17** | «Confirmar que es cierto» (`memory-promote`) incluido en la vista de memoria | Dejarlo para la superficie de investigación |
| **U18** | Las 7 bandas de ADR-005 tal cual (Nico las ratifica en la Fase 9) | 4 bandas centrales |
| **U19** | `role:portafolio` se muestra «Inmuebles» (VOCABULARIO) | «Portafolio» |
| **U20** | El voto de feedback es solo de la sesión (no hay «mi voto» sin guardar actor) | Guardar el voto en el navegador (daría la ilusión de un registro personal) |
| **U21** | Navegación por día en el briefing (`?dia=`) | Solo el día de hoy |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG → resuelto
- [x] Dimension 2 Visuals: FLAG → resuelto
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-27
