# Fase 13 (cross-repo) — Superficie de Naira en `Leasefy/front` · CONTEXT

**Escrito:** 2026-09-27 · **Re-medido contra la base nueva:** 2026-09-28 · **Worktree:** `/Users/nicolasgarcia/rent/wt-front-naira`
(repo `Leasefy/front`, rama local `project/naira-superficie`). **Base de ejecución (Δ REBASE, decisión de Nico 2026-09-27):**
`cambios-nico-10` @ `4ad6c188bd79a1f1272d96411a75813f87707651` (fijada en `BASE-DE-EJECUCION`, en esta carpeta); la base con la que se
planificó primero (`origin/Main` = `5e3a6f85`) queda en la rama local `naira-superficie-base-main-5e3a6f85`.
**Requisitos:** UI-01 · UI-02 · UI-03 (consumo; la matriz y `agencyRoleMiddleware` son `API-01` del agente, V-7)
**Insumos:** `13-RESEARCH.md` (T1-T8, FG13-1..17, Q1-Q13) · `13-PATTERNS.md` (§0-§9, B13-1..8) · `13-UI-SPEC.md` (U1-U21, C1-C17)
**Fuente de verdad de Naira (SOLO LECTURA):** `/Users/nicolasgarcia/rent/agent-account-manager/.planning/agents/account-manager/`
(`ROADMAP.md:383-395` §Phase 13; `REQUIREMENTS.md:249-251` UI-01..03, `:221` API-01 — re-medido tras `46e00d10` del agente; los `<contrato_publicado>` de 9.5-06, 10-06,
11-07 y 12-07; el código ejecutado de la Fase 8 `src/server/routes/naira-memory.ts`).
**Decisión de alcance (Nico, 2026-09-26: "planificar lo que falta"):** 🔴 **SOLO SE PLANIFICA.** Ningún plan de esta fase se
ejecuta sin una autorización nueva de Nico. **Donde RESEARCH, PATTERNS y UI-SPEC difieren, manda este CONTEXT.**

***

> **Reglas duras que rigen a todo plan de la fase** (del brief del sub-orquestador, del `CLAUDE.md` del front y de la casa):
> - Trabajar SOLO en un worktree del front; **nunca** en `~/rent/mvp` (nunca `checkout`/`switch` ahí), `~/rent/mvp-*`, otros
>   `~/rent/wt-front-*` ni `~/.cursor/worktrees/*`. `agent-account-manager` es solo lectura. Commits solo con rutas explícitas
>   (`git add -- <rutas>`); **nunca** `git add -A`, `git stash` ni `push`. Esta fase no agrega filas a `.planning/releases/` (sin PR).
> - `docs/DESIGN.md` es la fuente de verdad visual (manda sobre el `CLAUDE.md` del front donde choquen: botones en *sentence
>   case*, `DESIGN.md:35`); `src/lib/api/generated/agent.ts` NUNCA se edita a mano; mock **nunca** en producción; copy en
>   **tuteo** (es-CO del panel); iconos **solo Phosphor**; componentes `PascalCase.tsx`, hooks `use-kebab-case.ts`; tests
>   **colocados** (`src/**/*.test.ts(x)`, `vitest.config.ts:24`) con `createRoot` + `act` (**no hay Testing Library**); toda
>   clave i18n en `es.json` **y** `en.json`; `AlertDialog`, nunca `window.confirm` (`src/components/ui/sin-dialogos-del-navegador.test.ts`).
> - La fase **no instala dependencias nuevas** (zod, Radix, Phosphor, Cadence ya están en `package.json`).
> - El shell que corre `<verify>` es **zsh 5.9**: ninguna lista en una variable escalar sin comillas (arreglos y `"${A[@]}"`);
>   `cmd > "$D/x.txt" 2>&1; RC=$?` (nunca por tubería ni tras `&&`); `set +e`; `${N:-0}`; sin `timeout`; en macOS `/tmp` es
>   symlink: borrar SOLO por la ruta que devolvió `mktemp -d`, **jamás `rm` con comodines**. Todo bloque `automated` pasa
>   `bash -n` y `zsh -n`.
>   Una variable seguida de `:` va con llaves (`"${RA}:src/x"`): `"$RA:src/x"` es un modificador de zsh y da `bad substitution`
>   en ejecución, **y `zsh -n` no lo detecta** (medido en esta planificación).
> - Conteo de fallos con `--reporter=json` y **POR ARCHIVO** (un archivo que no carga cuenta). Mutaciones "por la causa" SOLO en
>   una copia `mktemp -d` (con `node_modules` enlazado), nunca escribiendo dentro de `src/` del worktree; el marcador va en la línea FAIL.
> - **B-5** (counsel pendiente, finalidad `naira_desempeno_empleados`): ninguna métrica por persona, ningún "quién cerró" ni
>   "quién aprobó", asignación solo a un **rol**.

***

## 0 · Δ REBASE (2026-09-28) — lo que cambió al re-medir contra `cambios-nico-10` @ `4ad6c188` (MANDA sobre §1-§8 donde choquen)

Detalle y `archivo:línea`: `13-REBASE-RESEARCH.md` (semántico: §1 ubicación, §2 Next 15/React 19, §3 design system, §4 agente y
mock, §5 tests y guardianes, §6 agente, §7 Paso 0, `## Impacto por plan`) y `13-REBASE-PATTERNS.md` (censo mecánico de citas y de
anclas de los bloques `automated`). Lo que rige desde ahora:

- **RB-1 — Hay sección de agentes.** El grupo «Agentes IA» (`key: 'agentes'`, primero del catálogo) tiene a cada agente como
  **módulo N2** con su URL de siempre (`arquitectura-del-panel.ts:331-366`); 5 grupos y **25** módulos (`arquitectura-del-panel.test.ts:233,238`);
  «ninguna fila de Agentes IA lleva la marca IA» y toda pantalla con `agente` tiene `ia` falsy (`:349-353`); «toda sala de agente
  vive acá» (`:782-787`); Reportes queda con resumen y rentabilidad (`:963`); «Desempeño IA» se mudó a «Agentes IA» con su URL
  `/reportes/ia` intacta (`arquitectura-del-panel.ts:365`). **No reapareció el hub de tarjetas** (`/ai` sigue muerto, `:109`).
  ⇒ la FORMA de D13-1 (N3 de Reportes con `ia: true`) ya no se puede construir: **D13-1′ 🔔** (abajo).
- **RB-2 — Regla nueva de Nico:** «lo que existe pero está sin sacar NO entra» a la sección (`arquitectura-del-panel.ts:109-111`;
  Retención/Tickets quedaron comentados). 🔔 (ver D13-1′).
- **RB-3 — Next 15.5 / React 19:** `params` de `page.tsx` es `Promise` (molde `pagos/cobranza/deudores/[id]/page.tsx:17-29`); el
  `JSX` global no existe (`import type { JSX } from 'react'` o `React.JSX.Element`, `4b6b093d`); `PageGuard` ya NO redirige: pinta
  el cartel de 403 (`PageGuard.tsx:98-108`), y sigue con `isAdmin ||` (`:57`); `isAgentModule` antes que `isAdmin` sigue
  (`PermissionsContext.tsx:218,225`).
- **RB-4 — Tipografía con contador exacto:** el guardián `doce-pixeles` fija el total de `text-xs` del repo (hoy 2716); la fase no
  agrega ningún `text-xs`: rótulos en `text-overline`/`text-label`, contenido en `text-caption` (🔔 U-tipografía).
- **RB-5 — Rutas del ERP:** `/cobros/*` ya no tiene `page.tsx`; cartera, recaudo y cobranza viven en `/pagos/*` (drill-down, D13-7).
- **RB-6 — El agente aplicó E13-1 y E13-2** (`5d2f9291`, `fb8d3e8c` en `project/account-manager`): `RUTAS_DEL_PANEL` de 10-04 ya
  apunta a `/panel/inmobiliaria/reportes/naira` y `NairaBriefingItem` suma `entidades: { kind: 'agregada' } | { kind: 'lista';
  items: { tipo; id }[] }` (14 campos). La memoria (`naira-memory.ts`) no cambió.
- **RB-9 — El agente aplicó además (en sus planes, `ENMIENDAS-PASADA-UNICA.md` §5):** E13-3 (por cita `claimClass` + `hipotesis`;
  `citasConClase` en el detalle de señal de 10-06), E13-4 (`respondida` gana `oraciones: OracionServida[]` con `seccion`, `texto`,
  `claimClass | null` y `cifras: { metricId; asOf }[]`, y `refs` tipadas; se conserva `texto`), E13-6 (`AccionListada.asOfs`),
  E13-7 (404 de «apagada» con `reason: 'naira_no_habilitada'` en las rutas PLANIFICADAS; la memoria ejecutada, en parte) y E13-13
  (`NairaBriefingItem.valorRenderizado`). **E13-5 (inventario del silencio) NO se aplicó.** Todo es aditivo: el parseo tolerante no
  se rompe, pero la 13 los CONSUME (D13-23).
- **RB-7 — La intro de un agente** se marca «vista» en el back (`PUT /inmobiliaria/onboarding-visto/agente:<id>`), no en
  `localStorage`, y `CabeceraDelAgente` solo la presenta con `tourDismissed === true`.
- **RB-8 — `cambios-nico-10` recibe commits a diario** (2 a 105 por día): el control por archivo `AJENO`/`MOV` contra una base fija ya
  no sirve; se reemplaza por procedencia POR COMMIT (D13-17).

***

## 1 · Realidad medida que condiciona el diseño (detalle y `archivo:línea` en RESEARCH T1-T8, PATTERNS §0-§1, UI-SPEC §14)

- **R13-1 — El "AI Hub existente" del criterio 1 ya no existe como página.** `/panel/inmobiliaria/ai` redirige
  (`src/lib/nav/rutas-por-ciclo-de-vida.data.mjs:69-70`) y un test prohíbe enlazarlo desde `src/` y `tests/`
  (`src/lib/nav/arquitectura-del-panel.test.ts:98`). Lo vigente: **Inicio = Piloto** (`/panel/inmobiliaria/piloto`, "torre de
  control transversal de los agentes"), **Chat** (raíz) y los **workspaces N3** de cada agente dentro de su módulo
  (`src/lib/nav/arquitectura-del-panel.ts:37-80`, `AGENT_WORKSPACES` en `src/lib/nav/agentWorkspaceNav.ts`).
- **R13-2 — Un workspace nuevo pasa por ~15 guardianes de navegación que ya existen** (PATTERNS §0.2): página por ruta y por
  pestaña, "dos puertas" (fila con `agente` ↔ `AGENT_WORKSPACES` con el mismo `basePath`), i18n `es`+`en`, R4 etiqueta↔segmento,
  módulo conocido (`gates-del-panel.test.ts`), ficha dinámica con vuelta (`fichas-con-vuelta.test.ts`). **No puede ser un módulo
  N2**: `expect(modulos).toHaveLength(17)` (`arquitectura-del-panel.test.ts:202`). Inicio (`/piloto`) **no** está cubierto por
  ninguno de esos guardianes (`moduloDeLaRuta('/piloto') === null`).
- **R13-3 — El Piloto ya pinta el briefing de OTRO agente** (el "Gerente": `usePilotoBriefing` → `GET /ai-hub/briefing`) y una
  cifra de recaudo del mes; Naira tiene `cartera.recovered_cop_30d`. Meter el briefing de Naira ahí = dos briefings y dos cifras
  del mismo concepto en la misma pantalla (el bug que `EVAL-10` declara el más destructivo).
- **R13-4 — Endpoints:** existen **5** (memoria, Fase 8 ejecutada, `naira-memory.ts:183` `BASE = '/api/agency/{agencyId}/naira/memory'`)
  en una rama LOCAL no pusheada y con migraciones sin aplicar (B-4), más `/my-permissions` **sin** `naira`; **25** están solo
  planificados (1 en 9.5-06, 14 en 10-06 —12 de configuración—, 5 en 11-07, 5 en 12-07). En el alcance de la 13 (D13-12):
  **4 existentes + 13 planificados** (RESEARCH T2.H). Ningún plan de 9.5-12 está ejecutado.
- **R13-5 — Lo que el criterio 4 y UI-01 piden NO viaja en ningún contrato publicado:** el `claimClass` por cita (la causa sale
  como `citas: string[]`), la categoría por oración de la conversación (un `texto` plano) y la lista de entidades afectadas (los
  5 detectores activos emiten `affectedEntities: []`). ⇒ E13-2/E13-3/E13-4. El drill-down en v1 llega al **listado** de la fuente.
- **R13-6 — El silencio con inventario no viaja en `GET /briefing`** (la entrega congelada guarda solo `items`) ⇒ E13-5.
- **R13-7 — Permisos:** `naira` no es un módulo de agente para el front (`src/lib/auth/agent-module-access.ts:33-34`), así que
  `canAccess('naira', …)` cae al monolito, donde `isAdmin ⇒ true` (`src/lib/context/PermissionsContext.tsx:204`); `PageGuard`
  además hace `isAdmin || …` (`src/components/auth/PageGuard.tsx:48`); `WorkspaceNav` pregunta `'view'` fijo
  (`src/components/inmobiliaria/ai/WorkspaceNav.tsx:36`) y Naira no tiene ninguna acción `view`.
- **R13-8 — Ningún hook del front que pega al agente limpia `data` al fallar** (`use-piloto-briefing.ts:61`, PATTERNS §0.4) y
  `src/lib/api/retencion.ts:51` sirve el simulado ante CUALQUIER error, 403 incluido y sin guarda de producción (anti-análogo).
- **R13-9 — Roles distintos a cada lado:** front `ADMIN | AGENTE | CONTADOR | VIEWER`; agente `OWNER | ADMIN | OPERATOR | VIEWER`.
  La única autoridad para la UI es el arreglo `naira` de `/my-permissions` (lo agrega 10-06) y el `puedeDecidir` del servidor.
- **R13-10 — Mock:** hay 2 guardas reales (`src/lib/api/config.ts:48`, `funnel.service.ts:25`; el `CLAUDE.md` dice 3), el
  `.env.example:42` trae `NEXT_PUBLIC_USE_MOCK_API=true`, y hay precedente de Nico sacando del catálogo un agente mock-first sin
  endpoint (mantenimiento). Existen `AvisoModoSimulado` (global) y `AvisoDatosDeEjemplo` (por pantalla; contraste 3.2:1, UI-SPEC C11).
- **R13-11 — Entorno:** el worktree **no tiene `node_modules`**; `../cadence` existe (`@leasefy/cadence` 1.0.57, `file:../cadence`);
  el CI clona cadence con el secreto `CADENCE_REPO_TOKEN` (`.github/workflows/ci.yml:57-64`) y corre solo `tsc --noEmit` +
  `pnpm test`; `tsconfig` excluye `tests/e2e`; ningún E2E simula un 403 hoy.
- **R13-12 — Base:** `5e3a6f85` (2026-09-07) es `origin/Main`, pero la rama local `cambios-nico-10` (worktree `~/rent/mvp-erp`)
  **divergió** en `4027f8c1` (2026-09-07): Main tiene 9 commits propios y `cambios-nico-10` **836** (medido con `git rev-list`;
  según RESEARCH, Next 15/React 19 y navegación reescrita). `git fetch` falla por SSH ⇒ el `origin/Main` remoto puede estar
  adelante. Las anclas de los planes pueden moverse antes de ejecutar.
- **R13-13 — La 10 hardcodea rutas del front que no existen:** `RUTAS_DEL_PANEL = { briefing: '/naira/briefing', senal:
  '/naira/senales', reglas: …, recall: …, colaLegacy: …, arranque: … }` (`10-04-PLAN.md:379`), sobre `APP_URL` sin ruta: una
  sección paralela en la raíz del dominio; su test fija esa forma ⇒ E13-1 bloquea ejecutar 10-04.
- **R13-14 — Design system:** Cadence (`@leasefy/cadence`) + shadcn `new-york`; **no** existe `@leasefy/ui`; 0 imports de
  `lucide-react` en `src/`; el panel tutea (0 formas de voseo en `es.json`). UI-SPEC §1.

***

## 2 · Decisiones (las 🔔 son SUPUESTO para Nico: se planifican igual, declaradas)

- **D13-1′ 🔔 (Δ REBASE; RIGE — planificada con la recomendación nueva, para que Nico la ratifique) — Naira = módulo N2 del grupo
  «Agentes IA»,** fila `{ key: 'naira', labelKey: 'inmobiliaria.ai.nav.naira', href: r('/reportes/naira'), icon: Compass, module:
  'naira', scope: 'general', agente: 'naira' }` **sin `ia`** (`arquitectura-del-panel.test.ts:349-353`) y su `AGENT_WORKSPACES`
  con el mismo `basePath`. La URL `/panel/inmobiliaria/reportes/naira`, las pestañas, las fichas y los deep links NO cambian (ya
  los contrató el agente con E13-1). Precedente exacto: «Desempeño IA» (N2 de «Agentes IA» con URL `/reportes/ia`). Migaja
  «Agentes IA › Naira › …». **Orden 🔔:** después de «Agente de pagos» y antes de «Desempeño IA» (que cierra la sección;
  fuera de la barra móvil). **Regla «sin sacar» 🔔 (RB-2):** la fila se registra gateada fail-closed (D13-3: invisible hasta que
  el agente publique `naira` en `/my-permissions`, también en simulado) y lo dice su comentario; alternativa para Nico: dejarla
  comentada como Retención/Tickets hasta el go-live (entonces también el workspace, y Naira queda inalcanzable hasta otra
  edición). Los guardianes que se actualizan con su frase de la casa («Eran 25 hasta que entró Naira»):
  `arquitectura-del-panel.test.ts:238` (25→26), `:755-765`, `:767-780`, `:853-873`; `secciones('reportes')` (`:963`) NO cambia.
  La búsqueda ⌘K (`src/lib/search/sources/navigation-source.ts:45-63`) gana su fila con `context: 'Agentes IA'`.
- **D13-1 🔔 (forma SUPERADA por RB-1; se conserva como historia) — Dónde vive Naira: workspace N3 `agente: 'naira'` en el módulo Reportes** (`/panel/inmobiliaria/reportes/naira`,
  UI-SPEC U1 §2.2). Una fila N3 más en `reportes` (grupo `pie`, `scope: 'general'`, `arquitectura-del-panel.ts:263`) y su
  `AGENT_WORKSPACES` con el mismo `basePath`; **sin** módulo N2 (la cuenta de 17 no se mueve), **sin** namespace propio, **sin**
  rutas fuera de `/panel/inmobiliaria`, **sin** cromo nuevo (se reusan `SeccionesDelModulo`, `WorkspaceNav`,
  `AgentHeaderBreadcrumb`, `CabeceraDelAgente`/`AgentIntroModal`). **Lectura del criterio 1 que rige:** el hub de tarjetas murió
  (R13-1) y hoy "estar dentro del hub de los agentes" es exactamente usar el mecanismo de workspaces que usa todo agente (el
  sucesor de `/ai/<slug>`); "página nueva / sección paralela" = cualquier superficie de Naira FUERA de ese mecanismo (un módulo
  N2, un `/naira` en la raíz, un layout propio). **Por qué no el Piloto** (la recomendación R1/Q1 del RESEARCH): (1) el Piloto ya
  pinta el briefing y el recaudo del Gerente (R13-3) — sin una decisión de producto externa (ticket V2) quedarían dos briefings y
  dos cifras del mismo concepto en la misma pantalla; (2) ningún guardián de navegación cubre `/piloto` (R13-2) y habría que
  escribir uno propio; (3) el correo de la 10 necesita URLs estables para la señal (E13-1), y el cajón del Piloto no tiene URL.
  **Diseño para poder cambiar de opinión barato:** datos, hooks y componentes son agnósticos de la ubicación
  (`src/lib/api/naira/`, `src/lib/hooks/naira/`, `src/lib/naira/`, `src/components/inmobiliaria/naira/`); solo las páginas bajo
  `src/app/panel/inmobiliaria/reportes/naira/**` y el registro de navegación saben dónde viven. Si Nico elige el Piloto, se
  reemplazan esas piezas (13-03..13-07 tarea de montaje) y el guardián `[N13:sin-seccion-paralela]`. Enmienda E13-9 al ROADMAP.
- **D13-2 🔔 — Inicio (`/piloto`) y Chat (`/`) no se tocan en v1** (UI-SPEC U2). La convivencia Naira ↔ Gerente es una decisión
  de producto fuera de esta fase (ticket V2; RESEARCH Q2 recomienda que Naira reemplace la lectura del Gerente cuando esté
  habilitada). La conversación con Naira es una pestaña propia, no un modo del Chat (el Chat persiste en `localStorage`).
- **D13-3 🔔 — Permisos fail-closed por acción real.** `src/lib/auth/agent-module-access.ts` gana `naira?: string[]` en
  `AgentModulePermissions` y `'naira'` entra a `FAIL_CLOSED_MODULES` (payload ausente, agente caído o acción no otorgada ⇒
  DENEGADO; **nunca** `ABSENT_ALLOWED_MODULES`). `canAccess('naira', 'view')` es un ALIAS = "el arreglo `naira` existe y no está
  vacío" (lo usan el sidebar, `SeccionesDelModulo` y `gates-del-panel`); cada pestaña se gatea por su acción real
  (`WorkspaceNavItem` gana `action?: string`, aditivo, por defecto `'view'`; `PageGuard module="naira" action="<acción>"`). El
  **403 del servicio es la autoridad final** (PageGuard deja pasar `isAdmin`, R13-7) y se pinta como `NairaSinPermiso`, nunca como
  redirección silenciosa. Consecuencia declarada: **antes de que 10-06 despliegue `naira` en `/my-permissions`, Naira entera
  (incluida la memoria, que ya existe) queda oculta** (RESEARCH Q9).
- **D13-4 — Un cliente, estados cerrados, el 403 no lleva datos.** Toda llamada devuelve `EstadoNaira<T>` (§3.1), nunca tira:
  403 (del middleware SIN `reason`, o de capa 2 CON `reason`) ⇒ `sin_permiso`; 404 en una lectura de VISTA o LISTA ⇒ `apagada`
  (Naira no habilitada para el tenant); 404 en una lectura POR ID o en una escritura ⇒ `no_encontrado` (hasta E13-7 son
  indistinguibles de "apagada": se declara); 409 ⇒ `conflicto{razon}`; 400/422 ⇒ `rechazado{razon}`; 503, red o falta de
  `NEXT_PUBLIC_AGENT_URL` ⇒ `no_disponible`; 200 que no parsea ⇒ `contrato_roto` (todo-o-nada: jamás los campos que sí parsearon).
  El hook REEMPLAZA el estado entero (nunca `data` + error a la vez) y la vista evalúa el estado ANTES de montar los hijos
  (`VistaDeNaira`, molde `SalaAgente.tsx:109-132`). El transporte es `agentFetch` (Bearer + reintento solo del 401).
- **D13-5 — Contrato espejo con zod, escrito a mano** (`src/lib/api/naira/contrato.ts`, molde de cabecera `MIRROR` de
  `src/lib/api/piloto.ts:3-26`), con los nombres del agente y, por esquema, `// fuente: <plan:línea | archivo:línea>` y
  `// estado: EXISTE | PLANIFICADO`. **En ejecución se parsea SIN `.strict()`** (un campo AGREGADO por una enmienda no rompe);
  **los tests de fixtures parsean con `.strict()`** (un campo inventado sí rompe). Cuando `pnpm api:gen` traiga `Naira*`, un
  plan futuro agrega la paridad espejo↔generado y borra el espejo (fuera de esta fase; ticket V4).
- **D13-6 — Mock-first sin mentir.** Guarda ÚNICA: `isMockMode()` de `src/lib/api/config.ts` (opt-in, nunca en producción),
  evaluada ANTES de la red y **nunca** en un `catch` (anti `retencion.ts`); sin `NEXT_PUBLIC_AGENT_URL` ⇒ `no_disponible`, no
  simulado (anti `funnel.service.ts:24-28`). Fixtures en `src/lib/data/mock-naira.ts` (convención `src/lib/data/mock-*.ts`),
  importados SOLO por `cliente.ts`, que pasan `contrato.ts` con `.strict()`. Un `ok` simulado lleva `origen: 'ejemplo'` y la
  vista pinta `AvisoDatosDeEjemplo` + la marca "DATO DE EJEMPLO" en cada cifra (UI-SPEC §8.6, 🔔 U15). Ningún fixture se presenta
  como medido.
- **D13-7 — Drill-down (UI-02) en v1 = el LISTADO de la fuente en el panel** (🔔 U7), por mapas cerrados en
  `src/lib/naira/fuente-a-ruta.ts`: `metricId → ruta` (las 14 métricas del catálogo del agente) y `fuente → ruta` (para
  `derivedFrom.fact.source` de la memoria); `null` = "sin enlace", declarado en la UI. Toda ruta no nula tiene `page.tsx`
  (test, molde `tienePagina` de `arquitectura-del-panel.test.ts:63-77`). **Jamás** se pinta un `href` que venga del agente (anti
  `PilotoCajon.tsx:474-494`). La ficha N4 llega cuando E13-2 traiga entidades.
- **D13-8 — El `asOf` va pegado a cada número** (INV-07): `MarcaDeCorte` en zona fija `America/Bogota` (🔔 U14), dentro del MISMO
  contenedor que la cifra (`data-naira-numero` + `data-naira-asof`); un número sin `asOf` **no se pinta como número**. Los
  conteos propios de Naira (ocultos por rol, ciclos, descartes) no se escriben como numeral (🔔 U5).
- **D13-9 — DATO / INFERENCIA / RECOMENDACIÓN por el CAMPO de origen, nunca por el texto.** `KNOWLEDGE` y `LIVE_DATA` ⇒ DATO;
  `INFERENCE` ⇒ INFERENCIA; `RECOMMENDATION` y `ACTION` ⇒ RECOMENDACIÓN; `MEMORY` según procedencia (`observed` y
  `stated_by_human` ⇒ DATO, `inferred` ⇒ INFERENCIA; RESEARCH Q7). Se distinguen por etiqueta + icono + borde, **nunca solo por
  color** (`docs/DESIGN.md:427-445`); cada pieza lleva `data-categoria`.
- **D13-10 🔔 — `claimClass` fail-closed** (U6): una oración causal cuyo contrato no trae `claimClass` NO se muestra (se declara
  "explicación no disponible con su clase"); una `hipotesis` muestra banda + alternativa + dato que la distinguiría; **prohibido**
  derivar la clase de palabras del texto (guardia estática). Hasta E13-3/E13-4, la causa del detalle de señal y la parte causal de
  una respuesta con referencias de investigación no se muestran; la respuesta de la conversación se rotula "RESPUESTA" (neutra),
  nunca DATO.
- **D13-11 🔔 — B-5 en la UI** (U8, U20; 12-CONTEXT H2 `:545`, H7 `:550`, H9 `:552`): ningún `userId`, nombre, actor, ranking ni
  latencia de aprobación se renderiza; la autoría de una memoria se muestra solo como tipo ("Naira" / "alguien del equipo"); el
  dueño de un loop o una tarea, solo como ROL; "quién aprobó / cerró / canceló" no existe en la UI (vive en la auditoría del
  agente); no se reusan `TrazaCaso` ni `AgenteLeaderboard`; el voto de feedback es de equipo y su estado dura la sesión.
- **D13-12 🔔 — Alcance** (U12, U13, U17). **Entra:** briefing (con la pregunta semanal de recall dentro del briefing del lunes),
  detalle de señal, seguimiento (lista de loops + bitácora) con los 3 botones de feedback, aprobaciones (propuestas, decisión,
  tareas, cancelar tarea), preguntar, y "qué cree Naira sobre nosotros" (ver, corregir, borrar con motivo, confirmar/rechazar
  propuestas procedurales pendientes, promover). **No entra:** la configuración de la 10 (preferencias, asignaciones de rol,
  arranque/go-live, tope de investigación, reglas degradadas, cola legacy), escribir memoria procedural nueva y el reporte de
  descubrimiento (`GET /feedback/report`). Enmienda E13-1(b): la 10 no emite enlaces a esas pantallas.
- **D13-13 — La conversación no persiste en el navegador** (U10; `9.5-CONTEXT` D9.5-3: el agente tampoco guarda el texto): ni
  `localStorage` ni `sessionStorage`; no se reusa `useBetaChat`.
- **D13-14 — Acciones: consecuencia primero y la huella que se mostró.** El detalle (`GET /actions/{id}`, que registra
  `presentada`) se pide SOLO al abrir la ficha, nunca por prefetch ni polling; consecuencia arriba con el `asOf` de los hechos
  VISIBLE debajo de ella (fuera del desplegable), razonamiento detrás de un tap; el POST de decisión lleva `huellaVista` = la huella
  RENDERIZADA; un 409 `huella_distinta` re-lee y re-muestra, jamás reenvía solo; `puedeDecidir = false` ⇒ sin botones. El listado
  no pinta el texto de consecuencia con cifras hasta E13-6 (muestra tipo · rol · clase).
- **D13-15 — Feedback:** los 3 botones (`util` / `no_util` / `ya_lo_sabia`) solo en ítems `atencion`/`informativo` entregados al
  llamador (nunca sobre un ítem de la SECCIÓN `seguimiento` del briefing); 409 `ventana_vencida` / `voto_antes_de_la_entrega` se
  dicen por su razón. *Δ 13-04:* en la lista de Seguimiento el voto se monta en la fila de un loop abierto y apunta a la señal que
  lo originó (`promocionId`); el servidor decide (404 si esa señal no se le entregó al llamador) y la UI lo dice sin datos.
- **D13-16 — Entorno de ejecución declarado en cada plan:** Paso 0 verifica `../cadence` y hace `pnpm install --frozen-lockfile`
  (Node 20 como el CI; con Node 25 el `vitest.setup.ts` ya arregla `localStorage`); si la instalación falla, el ejecutor **PARA y
  reporta** (no "arregla" el lockfile ni agrega dependencias). Sin `node_modules`, el plan-checker verifica por estructura y
  **declara** que no corrió tests.
- **D13-17 — Base de ejecución (RESUELTA por Nico 2026-09-27: `cambios-nico-10`).** El Paso 0 de cada plan exige, en su bloque
  `automated`: (1) `BASE=$(cut -d' ' -f1 "$FASE/BASE-DE-EJECUCION")` no vacía y `git cat-file -e "${BASE}^{commit}"`; (2)
  `git merge-base --is-ancestor 4ad6c188bd79a1f1272d96411a75813f87707651 "$BASE"` y `git merge-base --is-ancestor "$BASE" HEAD`
  (la base es descendiente de `4ad6c188` y HEAD desciende de la base) y rama `project/naira-superficie`; (3) **procedencia POR
  COMMIT** (reemplaza `AJENO`/`MOV`): `git rev-list --merges "$BASE"..HEAD` vacío y cada commit de `"$BASE"..HEAD` con asunto
  `docs(13` o `<tipo>(13-0N)` y archivos ⊆ `.planning/naira/` ∪ la unión de `files_modified` de 13-01..13-0N; más `status
  --porcelain` ⊆ esa unión; (4) si el SUMMARY del plan anterior registró otra `BASE=`, PARA (hubo re-base entre planes); (5) las
  anclas del plan se re-miden por PRESENCIA contra el árbol: **un ancla ausente o movida de sentido ⇒ PARA** (manda el disco; no
  se improvisa). **Re-basar es acto del coordinador, nunca del ejecutor:** ni `rebase`/`merge`/`pull` dentro de un plan; subir de
  base = un commit que solo cambia `BASE-DE-EJECUCION` + re-censo de anclas + re-corrida de los tests de los planes ya ejecutados.
  Cada SUMMARY anota la deriva (`git rev-list --count "$BASE"..cambios-nico-10` y los archivos en conflicto de `git merge-tree
  --write-tree --name-only cambios-nico-10 HEAD`); en 13-08 un conflicto en un archivo compartido ⇒ PARA y se reporta. Se ejecuta
  en un worktree propio, nunca en `~/rent/mvp` ni en `~/rent/mvp-erp` (E13-10).
- **D13-19 — Next 15 / React 19 (RB-3):** toda ficha dinámica recibe `params: Promise<{ … }>` y lo resuelve con `await` en el
  Server Component (molde `pagos/cobranza/deudores/[id]/page.tsx:17-29`); ninguna firma usa el `JSX` global (`import type { JSX }
  from 'react'` o `React.JSX.Element`); `useSearchParams` como en las páginas del panel que ya lo usan.
- **D13-20 🔔 — Tipografía sin `text-xs` (RB-4):** ningún archivo de la fase agrega `text-xs` (el guardián `doce-pixeles` fija el
  total del repo); rótulos mono (DATO/INFERENCIA/RECOMENDACIÓN, cortes, clases) en `text-overline`/`text-label`, contenido en
  `text-caption`. Se confirma con Nico (U-tipografía).
- **D13-21 — Drill-down a `/pagos/*` (RB-5):** los mapas de `fuente-a-ruta.ts` apuntan a `/pagos/cartera`, `/pagos/recaudo`,
  `/pagos/cobranza` y `/pagos/cobranza/{acuerdos,disputas,deudores,pagos,escalaciones}` (existen, medido) en lugar de `/cobros/*`.
- **D13-23 — La 13 consume los campos enmendados del agente (RB-9; "consumir el nombre enmendado y declararlo"):** 13-01 los
  espeja (opcionales en el tolerante; en los fixtures, presentes y con `.strict()`); el cliente mapea un 404 CON `reason:
  'naira_no_habilitada'` ⇒ `apagada` y SIN esa razón ⇒ lo que diga `si404` del endpoint. 13-03: la causa del detalle de señal se
  muestra desde `citasConClase` con su chip (D13-10 sigue: una cita con `claimClass: null` no se muestra) y la cifra del ítem usa
  `valorRenderizado` si viene (si no, `formatearValorDeNaira`). 13-05: el listado muestra la consecuencia con cifras junto a sus
  `asOfs` (D13-14 queda satisfecha por E13-6). 13-06: la respuesta se pinta por `oraciones` — categoría por `seccion`
  (D13-9; `declaracion` = neutra), chip por `claimClass`, cada cifra con su `asOf` y drill-down por `metricId`; si `oraciones` no
  viene, el bloque «RESPUESTA» neutro de hoy. El inventario del silencio sigue fail-closed hasta E13-5.
- **D13-22 — La intro de Naira en los E2E (RB-7):** el «ya la vi» vive en el back; el E2E la suprime con `route.fulfill` de
  `**/inmobiliaria/onboarding-visto**` devolviendo como vista la clave de `claveDeLaPresentacionDelAgente('naira')` (forma medida en
  `onboarding-visto.service.ts` por el Paso 0 de 13-08), nunca con `localStorage`; los tests de componente que monten la intro
  mockean `PanelPrefsContext`.
- **D13-18 — Sin filas en el tren de versiones del front** hasta que exista PR (lo deciden Victor/Nico); los planes no tocan
  `.planning/releases/` ni el `.planning/` raíz del front.

***

## 3 · Planes (solo se planifican; ninguno se ejecuta sin autorización nueva)

Base `B = /panel/inmobiliaria/reportes/naira`. Todas las páginas: `page.tsx` + `XxxView.tsx` + `XxxClient.tsx` (patrón del panel).

| Plan | Ola | `depends_on` | Qué | REQ / criterio | Contra qué contrato del agente | Autónomo |
|---|---|---|---|---|---|---|
| **13-01** | 1 | — | **BASE — datos y permisos.** Paso 0 de entorno (D13-16/17). `contrato.ts` (zod de los 17 endpoints en alcance + permisos, D13-5), `cliente.ts` (`EstadoNaira`, una función por endpoint, D13-4), `mock-naira.ts` (D13-6), `use-lectura-de-naira.ts` (hook base que reemplaza el estado entero), puros `formato.ts` / `fuente-a-ruta.ts` / `categorias.ts` (D13-7/8/9), `naira` fail-closed en `agent-module-access.ts` + alias `'view'` (D13-3), `claves-naira.test.ts` (i18n es+en, vivo desde el inicio) | UI-02, UI-03 (crit. 3 base) | Fase 8 (EXISTE) + los `<contrato_publicado>` de 9.5-06, 10-06, 11-07, 12-07 (PLANIFICADOS) | sí |
| **13-02** | 2 | 13-01 | **Primitivas transversales** en `src/components/inmobiliaria/naira/`: `VistaDeNaira` (estado antes que hijos), `NairaSinPermiso`, `NairaApagada`, `MarcaDeCorte`, `EnlaceALaFuente`, `CifraDeNaira`, `BloqueDeCategoria`, `ChipDeAfirmacion`, `BloqueDeHipotesis`, `BotonesDeUtilidad`; arreglo de contraste de `AvisoDatosDeEjemplo` (UI-SPEC C11); guardias estáticas `b5-sin-persona` y `claimclass-del-contrato` | crit. 2, 3, 4 (transversal) · UI-01..03 | — (props tipadas por `contrato.ts`) | sí |
| **13-03** | 3 | 13-02 | **Montaje del workspace + Briefing + detalle de señal.** Fila N3 en Reportes + `AGENT_WORKSPACES` `naira` (1.ª pestaña: Briefing) + `WorkspaceNavItem.action` (aditivo) + `AGENT_INTROS` `naira`; páginas `B` y `B/senales/[promocionId]`; `ItemDelBriefing`, `InventarioDelDia`, `LineaDeMadurez`, `PreguntaSemanal` (recall); `useNairaBriefing`, `useNairaSenal`; feedback en ítems `atencion`/`informativo`; guardia `naira-sin-seccion-paralela.test.ts`; deep links `?dia=` y `B/senales/<id>` (E13-1) | UI-01, UI-02, UI-03 · crit. 1-4 | 10-06 (+ E13-1/2/3/5 para datos reales) · 11-07 (voto) | sí |
| **13-04** | 4 | 13-03 | **Seguimiento:** pestaña `B/seguimiento` + ficha `B/seguimiento/[loopId]`; `FilaDeSeguimiento`, `BitacoraDelLoop`; `useNairaSeguimiento`, `useNairaLoop`; dueño solo como ROL | UI-01, UI-03 | 11-07 | sí |
| **13-05** | 5 | 13-04 | **Aprobaciones:** pestaña `B/aprobaciones` + ficha `B/aprobaciones/[proposalId]`; `TarjetaDePropuesta`, `DecisionDePropuesta`, `RazonamientoDePropuesta`, `FilaDeTarea`; `useNairaPropuestas`, `useNairaPropuesta`, `useNairaTareas`; D13-14 | UI-01, UI-02, UI-03 | 12-07 (+ E13-6) | sí |
| **13-06** | 6 | 13-05 | **Preguntar:** pestaña `B/preguntar`; `CompositorDePregunta`, `RespuestaDeNaira`; `useNairaConversacion` (sin persistencia, D13-13); las 4 ramas (`respondida`/`negada`/`bloqueada`/`fallida`); D13-10 | UI-01, UI-03 | 9.5-06 (+ E13-4) | sí |
| **13-07** | 7 | 13-06 | **Qué cree Naira sobre nosotros:** pestaña `B/memoria`; `ItemDeMemoria`, `DialogoDeCorreccion`, `DialogoDeBorrado`; `useNairaMemoria`; corregir / borrar con motivo / confirmar-rechazar procedural pendiente / promover, cada acción gateada por su permiso; 409/422 por razón sin eco del texto; autoría solo como tipo | UI-01, UI-02, UI-03 · crit. 4 | Fase 8 (EXISTE) + 11-07 (promover) + 10-06 (`/my-permissions`) | sí |
| **13-08** | 8 | 13-07 | **Cierre "construido con ejemplos, no verificado contra el agente":** E2E `tests/e2e/panel-a11y/naira.a11y.spec.ts` + `tests/e2e/naira-403.spec.ts` (con `route.fulfill`, marcador de montaje antes de axe); `13-ACCEPTANCE.md` (por criterio: mecánica verificada / lo que exige agente vivo y enmiendas); trazabilidad UI-01..03; suite completa + `tsc` + `lint` + `build`; `checkpoint:human-verify` (visual + a11y con `:3001` y sesión; y, si el agente ya publica Naira, un smoke real) | UI-01..03 · crit. 1-4 | todos | **no** |

**Olas en cadena lineal** (01 → 02 → … → 08): 13-03..13-07 editan los mismos archivos compartidos (`agentWorkspaceNav.ts`,
`es.json`, `en.json`, las guardias que crecen), así que no se ejecutan en paralelo. Cada plan fija su ola como max(olas de sus
`depends_on`) + 1. **Mock-first:** cada plan es ejecutable (con autorización) ANTES de que su fase del agente esté ejecutada,
contra los fixtures; lo que exige el agente vivo queda en `13-08` y en `13-ACCEPTANCE.md`. Ningún plan de 13-03..13-07 da por
cumplido un criterio "con datos reales".

### 3.1 · Contrato de nombres (EXACTOS; los planes lo consumen tal cual; el dueño puede AGREGAR, no renombrar)

**Endpoints en alcance** (17; ruta relativa a `NAIRA_BASE = '/api/agency/{agencyId}/naira'`; fila `#` = RESEARCH T2; "404 ⇒" es
el `kind` que produce el cliente, D13-4). El Paso 0 del plan que lo consume re-mide la ruta y los campos en disco (manda el disco).

| `id` (en `ENDPOINTS_DE_NAIRA`) | Método y ruta | Acción de `naira` | Estado | RESEARCH | 404 ⇒ | Plan |
|---|---|---|---|---|---|---|
| `memoria.vista` | `GET /memory` | `memory-view` | EXISTE | #1 | `apagada` | 13-07 |
| `memoria.corregir` | `POST /memory/items/{itemId}/correction` | `memory-correct` | EXISTE | #2 | `no_encontrado` | 13-07 |
| `memoria.borrar` | `POST /memory/items/{itemId}/erasure` | `memory-erase` | EXISTE | #3 | `no_encontrado` | 13-07 |
| `memoria.resolverPropuesta` | `POST /memory/procedural/proposals/{proposalId}/resolution` | `procedural-approve` | EXISTE | #5 | `no_encontrado` | 13-07 |
| `memoria.promover` | `POST /memory/items/{itemId}/promotion` | `memory-promote` | PLANIFICADO (11-07) | #6 | `no_encontrado` | 13-07 |
| `conversacion.preguntar` | `POST /conversation/questions` | `conversation-ask` | PLANIFICADO (9.5-06) | #8 | `apagada` | 13-06 |
| `briefing.dia` | `GET /briefing?dia=` | `briefing-view` | PLANIFICADO (10-06) | #9 | `apagada` | 13-03 |
| `senal.detalle` | `GET /signals/{promocionId}` | `signal-view` | PLANIFICADO (10-06) | #10 | `no_encontrado` | 13-03 |
| `recall.responder` | `POST /recall` | `recall-answer` | PLANIFICADO (10-06) | #10f | `apagada` | 13-03 |
| `senal.voto` | `POST /signals/{promocionId}/feedback` | `signal-feedback` | PLANIFICADO (11-07) | #13 | `no_encontrado` | 13-03 |
| `seguimiento.lista` | `GET /open-loops` | `open-loops-view` | PLANIFICADO (11-07) | #11 | `apagada` | 13-04 |
| `seguimiento.detalle` | `GET /open-loops/{loopId}` | `open-loops-view` | PLANIFICADO (11-07) | #12 | `no_encontrado` | 13-04 |
| `acciones.lista` | `GET /actions` | `action-view` | PLANIFICADO (12-07) | #15 | `apagada` | 13-05 |
| `acciones.detalle` | `GET /actions/{proposalId}` | `action-view` | PLANIFICADO (12-07) | #16 | `no_encontrado` | 13-05 |
| `acciones.decidir` | `POST /actions/{proposalId}/decision` | `action-approve-internal` \| `action-approve-external` (por clase) | PLANIFICADO (12-07) | #17 | `no_encontrado` | 13-05 |
| `tareas.lista` | `GET /tasks` | `task-view` | PLANIFICADO (12-07) | #18 | `apagada` | 13-05 |
| `tareas.cancelar` | `POST /tasks/{tareaId}/cancel` | `task-cancel` | PLANIFICADO (12-07) | #19 | `no_encontrado` | 13-05 |

Fuera del cliente: `GET /api/agency/{agencyId}/my-permissions` (lo lee `PermissionsContext`; `naira` lo agrega 10-06, RESEARCH #7).
Rutas descartadas por contradicción entre planes (manda el plan dueño, RESEARCH T2): `/questions`, `/loops`, `/feedback/summary`,
`/actions/latency`, `/actions/approval-latency` **no existen** y ningún plan de la 13 las nombra.

```ts
// ── 13-01 · src/lib/api/naira/contrato.ts — espejo zod escrito a mano (cabecera MIRROR; cada esquema con // fuente: y // estado:)
export const NAIRA_BASE = '/api/agency/{agencyId}/naira'
export const ACCIONES_DE_NAIRA = ['memory-view', 'memory-correct', 'memory-erase', 'procedural-approve', 'memory-promote',
  'conversation-ask', 'briefing-view', 'signal-view', 'recall-answer', 'open-loops-view', 'signal-feedback', 'action-view',
  'task-view', 'action-approve-internal', 'action-approve-external', 'task-cancel'] as const        // solo las que consume la 13
export type AccionDeNaira = (typeof ACCIONES_DE_NAIRA)[number]
export type IdDeEndpoint = 'memoria.vista' | 'memoria.corregir' | 'memoria.borrar' | 'memoria.resolverPropuesta' | 'memoria.promover'
  | 'conversacion.preguntar' | 'briefing.dia' | 'senal.detalle' | 'recall.responder' | 'senal.voto' | 'seguimiento.lista'
  | 'seguimiento.detalle' | 'acciones.lista' | 'acciones.detalle' | 'acciones.decidir' | 'tareas.lista' | 'tareas.cancelar'
export interface EndpointDeNaira { readonly id: IdDeEndpoint; readonly metodo: 'GET' | 'POST'; readonly ruta: string
  readonly acciones: readonly AccionDeNaira[]; readonly estado: 'EXISTE' | 'PLANIFICADO'; readonly fuente: string
  readonly si404: 'apagada' | 'no_encontrado' }
export const ENDPOINTS_DE_NAIRA: Readonly<Record<IdDeEndpoint, EndpointDeNaira>>                   // la tabla de arriba, fila por fila
// Esquemas: valor `<Nombre>Schema`, tipo `<Nombre> = z.infer<typeof <Nombre>Schema>`; nombres del agente:
//   NairaError (reason OPCIONAL: el 403 del middleware no la trae) · NairaMemoryView · NairaMemoryItem · NairaMemoryProposal ·
//   NairaMemoryWriteResult · NairaMemoryErasureResult · NairaMemoryResolutionResult · NairaConversationAnswer (unión por `kind`:
//   respondida | negada | bloqueada | fallida) · NairaBriefingDay · NairaBriefingDelivery · NairaBriefingItem · NairaSignalDetail ·
//   NairaRecallResult · NairaSignalFeedbackResult · NairaOpenLoopsList · NairaOpenLoop · NairaOpenLoopDetail · NairaActionsList ·
//   NairaActionSummary · NairaActionDetail · NairaActionDecisionResult · NairaTasksList · NairaTaskCancelResult
// Cuerpos de pedido: NairaMemoryCorrectionRequest { text } · NairaMemoryErasureRequest { motivo } · NairaMemoryResolutionRequest
//   { decision } · NairaConversationQuestionRequest { question } · NairaRecallRequest (forma medida en 10-06) ·
//   NairaSignalFeedbackRequest { valor: 'util' | 'no_util' | 'ya_lo_sabia' } · NairaActionDecisionRequest { decision: 'aprobar' | 'rechazar'; huellaVista }
// Regla (D13-5): en ejecución se parsea SIN .strict(); los tests de fixtures parsean con .strict().

// ── 13-01 · src/lib/api/naira/cliente.ts — nunca tira; transporte agentFetch
export type EstadoNaira<T> =
  | { readonly kind: 'ok'; readonly data: T; readonly origen: 'agente' | 'ejemplo' }
  | { readonly kind: 'sin_permiso' }
  | { readonly kind: 'apagada' }
  | { readonly kind: 'no_encontrado' }
  | { readonly kind: 'conflicto'; readonly razon: string | null }
  | { readonly kind: 'rechazado'; readonly razon: string | null }
  | { readonly kind: 'no_disponible' }
  | { readonly kind: 'contrato_roto' }
export const KINDS_DE_ESTADO_NAIRA = ['ok', 'sin_permiso', 'apagada', 'no_encontrado', 'conflicto', 'rechazado', 'no_disponible', 'contrato_roto'] as const
export function leerMemoria(agencyId: string): Promise<EstadoNaira<NairaMemoryView>>
export function corregirItem(agencyId: string, itemId: string, text: string): Promise<EstadoNaira<NairaMemoryWriteResult>>
export function borrarItem(agencyId: string, itemId: string, motivo: NairaMemoryErasureRequest['motivo']): Promise<EstadoNaira<NairaMemoryErasureResult>>
export function resolverPropuestaProcedural(agencyId: string, proposalId: string, decision: NairaMemoryResolutionRequest['decision']): Promise<EstadoNaira<NairaMemoryResolutionResult>>
export function promoverItem(agencyId: string, itemId: string): Promise<EstadoNaira<NairaMemoryWriteResult>>
export function preguntarANaira(agencyId: string, question: string): Promise<EstadoNaira<NairaConversationAnswer>>
export function leerBriefing(agencyId: string, dia?: string): Promise<EstadoNaira<NairaBriefingDay>>
export function leerSenal(agencyId: string, promocionId: string): Promise<EstadoNaira<NairaSignalDetail>>
export function responderRecall(agencyId: string, cuerpo: NairaRecallRequest): Promise<EstadoNaira<NairaRecallResult>>
export function votarSenal(agencyId: string, promocionId: string, valor: NairaSignalFeedbackRequest['valor']): Promise<EstadoNaira<NairaSignalFeedbackResult>>
export function leerSeguimiento(agencyId: string): Promise<EstadoNaira<NairaOpenLoopsList>>
export function leerLoop(agencyId: string, loopId: string): Promise<EstadoNaira<NairaOpenLoopDetail>>
export function leerPropuestas(agencyId: string): Promise<EstadoNaira<NairaActionsList>>
export function leerPropuesta(agencyId: string, proposalId: string): Promise<EstadoNaira<NairaActionDetail>>
export function decidirPropuesta(agencyId: string, proposalId: string, cuerpo: NairaActionDecisionRequest): Promise<EstadoNaira<NairaActionDecisionResult>>
export function leerTareas(agencyId: string): Promise<EstadoNaira<NairaTasksList>>
export function cancelarTarea(agencyId: string, tareaId: string): Promise<EstadoNaira<NairaTaskCancelResult>>

// ── 13-01 · src/lib/data/mock-naira.ts — importado SOLO por cliente.ts detrás de isMockMode(); cada fixture pasa su Schema con .strict()
export const EJEMPLOS_DE_NAIRA: Readonly<Record<IdDeEndpoint, unknown>>   // 13-01 fija el tipo exacto por clave; un fixture por endpoint

// ── 13-01 · src/lib/hooks/naira/use-lectura-de-naira.ts — reemplaza el estado ENTERO (nunca data + error)
export type LecturaDeNaira<T> = { readonly kind: 'cargando' } | EstadoNaira<T>
export function useLecturaDeNaira<T>(leer: (() => Promise<EstadoNaira<T>>) | null, deps: DependencyList): { readonly estado: LecturaDeNaira<T>; readonly recargar: () => void }
//   leer = null ⇒ estado { kind: 'sin_permiso' } SIN tocar la red (lectura secundaria sin su acción, UI-SPEC §8.2).
//   agencyId sale de useAuth().agency?.id (molde use-piloto-briefing.ts:28-29).

// ── 13-01 · src/lib/naira/formato.ts · fuente-a-ruta.ts · categorias.ts (puros, sin React)
export const ZONA_DE_NAIRA = 'America/Bogota'
export function formatearCorte(asOf: string, ahora: Date): { readonly absoluto: string; readonly edadMs: number } | null   // null ⇒ asOf inválido ⇒ no se pinta el número
export function formatearValorDeNaira(valor: string, unidad: 'pct' | 'cop' | 'count' | 'days'): string | null            // Δ 13-01: pct llega en PUNTOS porcentuales ('12.5'; 10-04-PLAN.md:981, 09-03-PLAN.md:504,531), no en bps
export const RUTA_DE_LA_METRICA: Readonly<Record<string, string | null>>   // las 14 métricas del catálogo del agente (medidas); null = sin enlace
export const RUTA_POR_FUENTE: Readonly<Record<string, string | null>>      // fuentes (SOURCE_REGISTRY / derivedFrom.fact.source); null = sin enlace
export function rutaDeLaMetrica(metricId: string): string | null          // desconocida ⇒ null (nunca una ruta armada con el id)
export type CategoriaVisible = 'dato' | 'inferencia' | 'recomendacion'
export const SECCIONES_DE_SALIDA = ['KNOWLEDGE', 'LIVE_DATA', 'MEMORY', 'INFERENCE', 'RECOMMENDATION', 'ACTION'] as const
export function categoriaDeSeccion(seccion: Exclude<(typeof SECCIONES_DE_SALIDA)[number], 'MEMORY'>): CategoriaVisible
export function categoriaDeProcedencia(p: 'observed' | 'inferred' | 'stated_by_human'): CategoriaVisible

// ── 13-01 · MOD src/lib/auth/agent-module-access.ts (+ su test): `naira?: string[]` en AgentModulePermissions; 'naira' en
//   FAIL_CLOSED_MODULES; resolveAgentModuleAccess('naira','view') = arreglo existe y no vacío; cualquier otra acción = incluida.
//   El test "reconoce los cinco" (agent-module-access.test.ts:20-29) pasa a SEIS.

// ── 13-02 · src/components/inmobiliaria/naira/ (PascalCase.tsx, cada uno con su test colocado)
//   VistaDeNaira<T>({ estado, renderOk, ...}) — cargando | sin_permiso ⇒ NairaSinPermiso | apagada ⇒ NairaApagada | resto ⇒ su
//   cartel; SOLO kind==='ok' llama a renderOk(data, origen). NairaSinPermiso · NairaApagada · MarcaDeCorte · EnlaceALaFuente ·
//   CifraDeNaira · BloqueDeCategoria · ChipDeAfirmacion · BloqueDeHipotesis · BotonesDeUtilidad
//   Atributos de prueba: data-naira-numero · data-naira-asof · data-categoria · data-claim-class · data-naira-ejemplo · data-naira-vista
//   Guardias estáticas (crecen en cada plan): src/components/inmobiliaria/naira/b5-sin-persona.test.ts ·
//   src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts

// ── 13-03 · navegación (y cada plan 13-04..13-07 AGREGA su pestaña)
//   Δ REBASE (D13-1′): ARQUITECTURA_DEL_PANEL → grupo 'agentes' («Agentes IA») → MÓDULO N2 { key: 'naira', labelKey:
//     'inmobiliaria.ai.nav.naira', href: r('/reportes/naira'), icon: Compass, module: 'naira', scope: 'general', agente: 'naira' }
//     SIN `ia` (hintKey opcional), después de 'agente-de-pagos' y antes de 'desempeno-ia'; fila ⌘K en navigation-source.ts
//     (context 'Agentes IA'). (Antes: pantalla N3 de 'reportes' con ia: true — ya no pasa arquitectura-del-panel.test.ts:349-353.)
//   AGENT_WORKSPACES → { slug: 'naira', basePath: '/panel/inmobiliaria/reportes/naira', module: 'naira', items: [...] }
//   WorkspaceNavItem.action?: string (aditivo; WorkspaceNav filtra con canAccess(item.module, item.action ?? 'view'))
//   Pestañas (href · acción · plan): B · briefing-view · 13-03 | B/seguimiento · open-loops-view · 13-04 | B/aprobaciones ·
//     action-view · 13-05 | B/preguntar · conversation-ask · 13-06 | B/memoria · memory-view · 13-07
//   Fichas N4 (con VolverALaLista): B/senales/[promocionId] (13-03) · B/seguimiento/[loopId] (13-04) · B/aprobaciones/[proposalId] (13-05)
//   AGENT_INTROS → slug 'naira', claves inmobiliaria.ai.intro.naira.{title,description}
//   i18n (es y en): inmobiliaria.ai.nav.naira · inmobiliaria.ai.nav.nairaHint · inmobiliaria.ai.naira.* (pestañas en
//     inmobiliaria.ai.naira.tabs.{briefing,seguimiento,aprobaciones,preguntar,memoria})
//   Guardias: src/lib/nav/naira-sin-seccion-paralela.test.ts (13-03) · src/lib/i18n/claves-naira.test.ts (13-01, crece)
// ── Hooks por superficie (src/lib/hooks/naira/use-naira-<superficie>.ts, todos sobre useLecturaDeNaira)
//   useNairaBriefing(dia?) · useNairaSenal(promocionId) (13-03) · useNairaSeguimiento() · useNairaLoop(loopId) (13-04) ·
//   useNairaPropuestas() · useNairaPropuesta(proposalId) · useNairaTareas(habilitada) (13-05) · useNairaConversacion() (13-06) ·
//   useNairaMemoria() (13-07)
```

**Δ 13-01 (planificado, solo AGREGA):** `contrato.ts` publica además `ESQUEMAS_ESTRICTOS_DE_NAIRA`, `RespuestasDeNaira`,
`RESPUESTA_TOLERANTE_POR_ENDPOINT`, `RESPUESTA_ESTRICTA_POR_ENDPOINT`, `IDS_DE_ENDPOINT`, `NODOS_OPACOS_DE_NAIRA`,
`NairaOpenLoopEvent`, `NairaTask` y los vocabularios con el nombre del agente (`construirEsquemas(estricto)`: el `.strict()` de
zod 3 es superficial y D13-5 lo exige en todos los niveles); el cliente/fixtures/puros agregan `RAZON_PEDIDO_INVALIDO`,
`USER_IDS_DE_EJEMPLO`, `FECHA_DE_EJEMPLO`, `rutaDeLaFuente`, `METRICAS_DEL_CATALOGO`, `FUENTES_DEL_REGISTRO`,
`CATEGORIAS_VISIBLES`, `SeccionDeSalida`. `PermissionsContext.tsx` NO se toca (`:197` `isAgentModule` va antes que `:204`
`isAdmin`). Manda su `<contrato_publicado>` (`13-01-PLAN.md`). **Choque resuelto:** UI-SPEC §8.5 (conservar lo mostrado si un
refresco falla) cede ante D13-4: un refresco que falla reemplaza el estado; lo único que puede quedar es un aviso sin datos.

Paso 0 de todo plan: verificar en disco los nombres que consume de un plan anterior de ESTA fase (si su ejecutor los cambió, manda
el disco y va al SUMMARY) y los del agente que consume (ruta y campos; si el plan del agente ya se ejecutó, manda su código; si no,
su `<contrato_publicado>`).

***

## 4 · `<false_greens>` específicos (marcadores `[N13:*]`; mutación "por la causa" en COPIA `mktemp -d`, marcador en la línea FAIL)

- **FG13-1 — el 403 con residuo:** un test que monta el estado 403 desde cero no prueba el criterio. `[N13:403-sin-residuo]`: el
  MISMO hook recibe 200 con un fixture que siembra un token único y luego 403; asevera `kind === 'sin_permiso'` y que el
  contenedor NO contiene el token ni ningún `[data-naira-numero]`. Mutación: el hook conserva el `data` anterior ⇒ rojo. Se repite
  por superficie (13-03..13-07) y en E2E (13-08, `naira-403.spec.ts`).
- **FG13-2 — el 403 del middleware sin `reason`:** `{ error: 'Forbidden — insufficient role' }` sin `reason` ⇒ `sin_permiso`
  (no `contrato_roto`). `[N13:403-sin-reason]`.
- **FG13-3 — fixtures a la medida del componente:** `[N13:fixture-es-contrato]`: cada fixture pasa su esquema con `.strict()`;
  mutación: renombrar un campo del fixture ⇒ rojo. Y `[N13:parseo-tolerante]`: un campo AGREGADO en la respuesta real no rompe.
- **FG13-4 — `contrato_roto` pintado a medias:** `[N13:contrato-roto-sin-datos]`: 200 con un campo requerido faltante ⇒
  `contrato_roto` y la vista no pinta ningún campo.
- **FG13-5 — `asOf` "visible" en cualquier lado de la página:** `[N13:asof-pegado]`: todo `[data-naira-numero]` tiene su
  `[data-naira-asof]` en el MISMO contenedor con el ISO del fixture; mutación: mover la marca fuera ⇒ rojo. `[N13:asof-bogota]`
  con una fecha que cruza la medianoche en UTC.
- **FG13-6 — drill-down a una ruta muerta o armada con el id:** `[N13:ruta-con-pagina]` (toda ruta no nula de `RUTA_DE_LA_METRICA`
  y `RUTA_POR_FUENTE` tiene `page.tsx`) y `[N13:sin-href-del-agente]` (ningún `href` sale de un campo del contrato).
- **FG13-7 — sección paralela:** `[N13:sin-seccion-paralela]`: no existe `src/app/panel/inmobiliaria/naira/` ni ruta `/naira` fuera
  de `B`; la cuenta de 17 módulos sigue (`arquitectura-del-panel.test.ts:202`); los componentes de `naira/` solo se importan desde
  `src/app/panel/inmobiliaria/reportes/naira/**` o desde el propio árbol de Naira. Mutación: crear `naira/page.tsx` ⇒ rojo.
- **FG13-8 — el gate que deja pasar al admin del monolito:** `[N13:naira-fail-closed]`: con `isAdmin: true` y payload SIN `naira`,
  `canAccess('naira', 'briefing-view')` y `canAccess('naira', 'view')` son `false`; mutación: sacar `'naira'` de
  `FAIL_CLOSED_MODULES` ⇒ rojo.
- **FG13-9 — verde vacuo porque todo está oculto:** cada archivo de test de componente/hook tiene un control positivo
  `[N13:control-positivo]` (con permisos y 200, el token del fixture SÍ aparece).
- **FG13-10 — simulado en producción:** `[N13:simulado-nunca-en-prod]`: con `NODE_ENV=production` y `NEXT_PUBLIC_USE_MOCK_API=true`
  el cliente llama a la red y nunca al fixture; sin `NEXT_PUBLIC_AGENT_URL` ⇒ `no_disponible`, no simulado; y `[N13:simulado-visible]`:
  un `ok` con `origen: 'ejemplo'` pinta `AvisoDatosDeEjemplo` y `data-naira-ejemplo` en cada cifra.
- **FG13-11 — `claimClass` inventado:** `[N13:claimclass-del-contrato]`: el chip solo aparece si el campo viene en el contrato;
  una guardia estática prohíbe en `src/components/inmobiliaria/naira/` y `src/lib/naira/` cualquier regex sobre vocabulario de
  probabilidad o conectores causales.
- **FG13-12 — categoría por el texto:** `[N13:categoria-por-campo]`: una cita de INFERENCE rotulada DATO ⇒ rojo.
- **FG13-13 — persona colada (B-5):** `[N13:b5-sin-persona]`: ningún `userId` del fixture aparece en el DOM; la guardia estática
  prohíbe `userId`, `actorId`, `approvedBy`, `proposedBy`, `AgenteLeaderboard` y `TrazaCaso` en el árbol de componentes/hooks de
  Naira; `[N13:sin-latencia]` (ninguna vista de latencia).
- **FG13-14 — presentación registrada sin que nadie la viera:** `[N13:detalle-solo-al-abrir]`: el `fetch` de `GET /actions/{id}`
  ocurre 0 veces hasta abrir la ficha y 1 vez al abrirla.
- **FG13-15 — aprobación con otra huella:** `[N13:huella-vista]`: el POST lleva la huella RENDERIZADA; tras 409 `huella_distinta`
  se re-lee y no se re-envía solo.
- **FG13-16 — conversación persistida:** `[N13:conversacion-sin-persistencia]`: tras preguntar, `localStorage` y `sessionStorage`
  no contienen el texto de la pregunta ni de la respuesta.
- **FG13-17 — i18n verde con claves faltantes:** los tests usan `i18n-test-stub` (resuelve contra `es.json` real), nunca
  `t: (k) => k`, y `claves-naira.test.ts` exige cada clave `inmobiliaria.ai.naira.*` en `es` y `en`.
- **FG13-18 — E2E que no prueba nada:** `seedAuthState` entra como admin (el gate del front nunca niega) y `runAxeOrFixme` salta en
  silencio si la página no montó ⇒ `[N13:e2e-montado]`: el spec asevera `[data-naira-vista]` visible ANTES de axe, y el 403 se
  simula con `route.fulfill({ status: 403 })` sobre la ruta del agente.
- **FG13-19 — falso verde de navegación:** `agency-nav-filter.test.ts` usa su propio fixture y no ve filas nuevas; el que cubre la
  fila de Naira es `arquitectura-del-panel.test.ts` (existente) + `[N13:sin-seccion-paralela]`.
- **FG13-20 — test verde contra una base que ya no existe:** Paso 0 de cada plan re-mide `git rev-parse HEAD` y las anclas; ancla
  movida ⇒ PARA (D13-17).

***

## 5 · Bloqueadores y supuestos

| ID | Estado | Consecuencia |
|---|---|---|
| **Autorización de ejecución** | ⛔ no dada | Nada de la 13 se ejecuta; los planes quedan listos y chequeados |
| **Fases 9.5 / 10 / 11 / 12 del agente** | 🟠 solo planificadas | La UI se construye contra el espejo + fixtures; "con datos reales" solo en 13-08 cuando existan (ninguna depende hoy de la 13) |
| **Fase 8 (memoria)** | 🟠 ejecutada en rama LOCAL, sin desplegar | La memoria también se ve en simulado hasta que el agente se despliegue y 10-06 publique `naira` en `/my-permissions` |
| **B-4** (Supabase caída) | 🔴 | Ningún agente con Naira corre contra datos; sin impacto en el build del front |
| **B-5** (counsel) | 🔴 | D13-11: la UI no muestra persona, actor ni métricas por persona |
| **E13-1** | 🔴 bloquea ejecutar **10-04** del agente | Sin ella, el correo de la 10 enlaza a `/naira/*` (sección paralela / enlace roto) |
| **E13-2 / E13-3 / E13-4 / E13-5** | 🟠 | Sin ellas, la UI cumple el crit. 4 y la "lista de entidades" solo de forma DECLARADA (fail-closed); 13-08 lo registra |
| **Base del front** (R13-12) | 🟠 | Ticket V1; Paso 0 re-mide y PARA ante un ancla movida |
| **`node_modules`** | 🟠 | El ejecutor instala con `--frozen-lockfile`; si falla, PARA |
| 🔔 D13-1, D13-2, D13-3, D13-10, D13-11, D13-12, D13-17 y U5-U21 | supuestos | §7 |

***

## 6 · Enmiendas propuestas (las aplica el orquestador principal en `agent-account-manager`; esta fase NO lo edita)

Numeración de este CONTEXT (manda); entre paréntesis, la de RESEARCH (`R`) y UI-SPEC (`U`). Todas **aditivas** ("el dueño puede
AGREGAR, no renombrar"). Van a `ENMIENDAS-PASADA-UNICA.md` §5 "Fase 13 — pendiente".

| # | A quién | Qué | Por qué / qué bloquea |
|---|---|---|---|
| **E13-1** ✅ APLICADA en el agente (`5d2f9291`) | `10-04-PLAN.md:379` (`RUTAS_DEL_PANEL`) y su test `[RND:enlaces]` | (a) rutas del panel: briefing `/panel/inmobiliaria/reportes/naira` (+ `?dia=YYYY-MM-DD`), señal `/panel/inmobiliaria/reportes/naira/senales/<promocionId>`, recall `/panel/inmobiliaria/reportes/naira?dia=<lunes>#recall`; (b) **no** emitir `reglas`, `colaLegacy` ni `arranque` hasta que exista su pantalla (D13-12) (R E13-1 · U E13-5) | crit. 1 (sin sección paralela) y deep links; **bloquea ejecutar 10-04** (su test fija la forma de hoy) |
| **E13-2** ✅ APLICADA en el agente (`fb8d3e8c`: `NairaBriefingItem` suma `entidades`) | `09-04` (`SenalPromovida`), `10-CONTEXT` (`ItemCongelado`), `10-06` (`NairaSignalDetail`) | `entidades: { kind: 'agregada' } \| { kind: 'lista'; items: { tipo; id }[] }` copiado de `Signal.affectedEntities` (nunca una persona) (R E13-2 · U E13-2) | UI-01 "lista de entidades afectadas"; drill-down a ficha N4 |
| **E13-3** 🔴 | `09-06` (persistencia de la investigación), `9.5-04` (`CitaPersistida`), `10-06` (`citas: string[]`) | por cita `{ texto; claimClass; hipotesis: null \| { banda; alternativa; discriminador } }` (lo que ya deriva el linter de 09-03 y hoy se descarta al persistir) (R E13-3 · U E13-3) | crit. 4 en TODA superficie |
| **E13-4** | `9.5-06` (`NairaConversationAnswered`), `9.5-04` (`refsServidas`) | `respondida` gana `oraciones: { seccion; texto; claimClass \| null }[]`, `refs` tipadas `{ kind: 'chunk'; source; sourceRef } \| { kind: 'investigacion'; id }` y, por cifra, `{ metricId; asOf }`; se conserva `texto` (R E13-4 · U E13-4 + U E13-8) | crit. 2 y 4 en la conversación (UI-SPEC C6, C17) |
| **E13-5** | `10-06` (`NairaBriefingDay`) | gana `inventario`, `madurez`, `arranque` y `semanal` (al menos `recall.semana`), leídos al mismo `corte` de lo persistido (R E13-5 · U E13-1) | crit. 3 de la 9 y 4 de la 10 en la UI (el silencio con inventario) |
| **E13-6** | `12-07` (`AccionListada`) | gana `asOfs` de los hechos que cita su consecuencia (U E13-7, choque C16) | crit. 2 en el listado de aprobaciones |
| **E13-7** | **código EJECUTADO** de la Fase 8 (`src/server/routes/naira-memory.ts`, 404 de `acceso`) + rutas planificadas de 9.5/10/11/12 | el 404 de "Naira no habilitada" lleva `reason: 'naira_no_habilitada'` (R E13-6) — en la Fase 8 es un cambio de código (tarea rápida), no solo de plan | distinguir "apagada" de "ítem no existe" sin heurística |
| **E13-8** | `9.5-04` (declaraciones, negativas) y todo texto servido que la UI pinta tal cual | **tuteo** (el panel tutea; NOT-10/`10-CONTEXT` traen ejemplos en voseo) (U E13-6) | mezcla de registros en la misma pantalla |
| **E13-9** | `ROADMAP.md:388` (crit. 1 §Phase 13) y `REQUIREMENTS.md:249` (UI-01) | "Δ Fase 13: el hub de tarjetas murió (`/ai` redirige); 'dentro del AI Hub existente' = como módulo de la sección «Agentes IA» del panel (D13-1′ Δ REBASE: URL `/panel/inmobiliaria/reportes/naira`, el mismo mecanismo que «Desempeño IA»), sin namespace ni rutas fuera de `/panel/inmobiliaria`" (R E13-7) | criterio 1 verificable contra la base real |
| **E13-9′** 🔴 (Δ REBASE; PLAN-CHECK v3 W2) | `ROADMAP.md:388` y `REQUIREMENTS.md:249` del agente (E13-9 ya aplicada con la forma D13-1: «… `/panel/inmobiliaria/reportes/naira`), sin módulo N2, sin namespace…») | re-enmendar en línea (sin correr líneas) a «… como módulo de la sección «Agentes IA» del panel (D13-1′: URL `/panel/inmobiliaria/reportes/naira`, el mismo mecanismo que «Desempeño IA»), sin namespace ni rutas fuera de `/panel/inmobiliaria`» | el texto aplicado dice «sin módulo N2» y D13-1′ construye un N2; aplicar ANTES de ejecutar 13-08 (si no, 13-08 lo declara en la ACCEPTANCE) |
| **E13-10** | `ROADMAP.md:395` (⚠️ cross-repo) | "se ejecuta en `~/rent/mvp`" ⇒ "en un worktree propio del front (`~/rent/wt-front-naira`), nunca en `~/rent/mvp`; base de integración a confirmar (ticket V1)" (R E13-8) | evita ejecutar en el checkout compartido |
| **E13-11** (informativa) | `10-06-PLAN.md` (`/my-permissions`) | el front falla cerrado hasta que `naira` esté desplegado, incluida la memoria que ya existe (R E13-9) | D13-3 |
| **E13-12** (informativa) | `12-CONTEXT.md` D12-12/D12-13, `12-07` | la 13 asume consecuencia primero, razonamiento tras un tap, sin prefetch del detalle y `huellaVista` = huella mostrada (R E13-10) | D13-14 |
| **E13-13** (opcional) | `10-04`/`10-06`/`12-01` | `valorRenderizado` junto a `valor` (una sola forma de formatear en todas las superficies, EVAL-10) y el nombre legible de cada `metricId` servido por las rutas (R E13-11) | hoy el front duplica el formato y los nombres (con test de paridad cuando existan en disco) |

***

## 7 · Decisiones 🔔 para Nico (recomendación planificada)

| # | Pregunta | Planificado | Alternativa |
|---|---|---|---|
| **D13-1′** (Δ REBASE) | ¿Dónde vive Naira en el front, ahora que existe «Agentes IA»? | Módulo N2 de «Agentes IA» con URL `/panel/inmobiliaria/reportes/naira` (la contratada por E13-1), sin píldora IA, 5 pestañas + 3 fichas | Bloque dentro del Piloto (Inicio); o N3 de Reportes (ya no pasa los guardianes nuevos) |
| **D13-1′ orden** | ¿Dónde va la fila? | Después de «Agente de pagos», antes de «Desempeño IA»; fuera de la barra móvil | Otra posición |
| **Regla «sin sacar»** (RB-2) | ¿Registrar la fila aunque Naira no esté en producción? | Registrada y gateada fail-closed (invisible hasta que el agente publique `naira`), dicho en su comentario | Comentada hasta el go-live, como Retención/Tickets |
| **D13-20** | ¿Rótulos en `text-label`/`text-overline` y contenido en `text-caption` (sin `text-xs`)? | Sí | Otra escala (sin mover el contador `doce-pixeles`) |
| **U15 / mock-first** | Nico retiró el mock de retención («SIN DATOS DE EJEMPLO»): ¿sigue el simulado opt-in de Naira (nunca en producción) mientras el agente no esté vivo? | Sí, opt-in y rotulado | Sin simulado: las pantallas se ven solo con el agente vivo |
| **D13-2** | ¿Inicio y Chat? | No se tocan en v1 | Entrada sin números en el encabezado del Piloto; o Naira reemplaza la lectura del Gerente |
| **D13-3** | ¿Naira visible antes de que 10-06 publique `naira` en `/my-permissions`? | No (fail-closed, también la memoria que ya existe) | Ausente = permitido (la UI prometería acciones que el agente niega) |
| **D13-10** | Oración causal sin `claimClass` | No se muestra | Mostrarla con "clase no informada" |
| **D13-11** | Autoría de memoria | Solo el tipo | Nombre visible para OWNER/ADMIN tras counsel (B-5) |
| **D13-12** | Configuración de la 10 (arranque, reglas, cola legacy, preferencias, asignaciones, tope) y reporte de descubrimiento | Fuera de la 13 | Incluirlas en `Configuración › Automatización IA` (13.x) |
| **D13-17** | ¿Contra qué base se ejecuta? | La rama de integración vigente al ejecutar, con re-medición | Rebasar ya sobre `cambios-nico-10` |
| U5-U21 | Detalle visual (conteos sin numeral, drill-down a listados, diálogos, sin persistencia de la conversación, corte en 12 h, marcas de ejemplo, iconos, promover en la vista, bandas ICD 203, vocabulario de roles, voto de sesión, navegación por día) | Lo de `13-UI-SPEC.md` §15 | Lo de la columna "Alternativa" de §15 |
| Q11 | CONTADOR del front ⇒ VIEWER del agente | Se acepta en v1; la UI decide por la matriz, nunca por el rol | Corregir el mapeo en el agente (V5) |
| Q12 | Panel en inglés | Cromo traducido; textos del agente en español (declarado) | — |

***

## 8 · Tickets para Victor (ops / integración; ninguno bloquea planificar)

- **V1 — ✅ RESUELTO (Nico, 2026-09-27: base `cambios-nico-10`).** ~~Base de integración del front.~~ `origin/Main` = `5e3a6f85` (2026-09-07), pero `cambios-nico-10` divergió en `4027f8c1`
  con 836 commits (Main tiene 9 propios) y `git fetch` falla por SSH desde este worktree. ¿Sobre qué rama se ejecuta la 13?
- **V2 — Naira vs. el Gerente.** El Piloto y el Chat consumen el briefing del Gerente (`/ai-hub/briefing`, `origin/develop` del
  agente) con cifras sin `asOf`; con Naira habilitada, el producto tendría dos briefings. Decisión de producto (Nico/Victor).
- **V3 — `.env.example:42`** trae `NEXT_PUBLIC_USE_MOCK_API=true`: quien lo copie arranca en simulado (nunca en producción, pero
  confunde). Considerar `false`.
- **V4 — Contrato del agente en el front.** El snapshot OpenAPI con Naira vive en una rama no pusheada del agente; el CI del front
  no corre `pnpm api:check`. Cuando el agente publique Naira: `pnpm api:gen` + commit y un plan que reemplace el espejo.
- **V5 — Mapeo de roles** del agente (`CONTADOR → VIEWER`, RESEARCH Q11) y, con la base nueva, tres roles de agencia más en el
  front (`COORDINADOR`, `AUXILIAR_CARTERA`, `ABOGADO_EXTERNO`, `src/lib/auth/agency-roles.ts:10-24`) sin mapeo medido en el agente.
- **V7 — Intro de agentes en el back:** ¿acepta `PUT /inmobiliaria/onboarding-visto/agente:naira`? (RB-7; si no, la intro reaparece).
- **V6 — CI del front** necesita el secreto `CADENCE_REPO_TOKEN` (`.github/workflows/ci.yml:57-64`); si falta, todo el CI queda rojo
  en la instalación (no por el diff).
