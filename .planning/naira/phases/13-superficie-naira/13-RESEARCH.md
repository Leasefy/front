# Fase 13: Superficie de Naira en `Leasefy/front` (cross-repo) — Research

**Investigado:** 2026-09-27
**Dominio:** superficie de lectura y decisión humana de un agente transversal (Naira, Account Manager) dentro del panel de inmobiliaria de `Leasefy/front` (Next 14 App Router, React 18, cliente HTTP directo al micro `Leasefy/agent`), consumiendo contratos que en su mayoría **todavía no existen en ningún agente** (solo planificados en 9.5/10/11/12), con permisos resueltos por el agente (`/my-permissions`), mock-first sin fabricar datos que parezcan medidos, y B-5 aplicado en la UI.
**Confianza global:** ALTA en el estado del front (todo `archivo:línea` medido en la base `5e3a6f85` con `grep`/`sed`/`python`) · ALTA en lo EJECUTADO del agente (Fase 8, rama local `project/account-manager` de `agent-account-manager`) · MEDIA en los contratos de 9.5/10/11/12 (nombres de sus `<contrato_publicado>`; ningún plan está ejecutado; manda el disco al ejecutar) · BAJA en la vigencia de la base del front (ver 🔴 abajo).

> 🔴 **SOLO PLANIFICACIÓN.** No se instaló nada, no se ejecutó ningún test, no se tocó `~/rent/mvp` ni el `.planning/` raíz del front. Único archivo escrito: este.
> 🔴 **La base del front está atrasada y la rama que viene la reescribe.** Base = `origin/Main` `5e3a6f85` (commit del **2026-09-07**; `git fetch` falla por SSH). En el mismo repo existe la rama LOCAL `cambios-nico-10` (último commit **2026-09-26**, `87114b1c`) con **836 commits** que no están en la base (`git rev-list --count 5e3a6f85..cambios-nico-10`) y que cambian exactamente lo que esta fase toca: `package.json` (Next `14.2.35`→`15.5.26`, React `^18.2.0`→`^19.3.0`), `src/lib/nav/arquitectura-del-panel.ts` (626 líneas), `agentWorkspaceNav.ts` (261; `pagos` y `estudio` ya no son workspaces), `PermissionsContext.tsx`, `src/lib/errores/clasificar.ts` (364), `src/lib/api/piloto.ts` (320), `src/lib/api/generated/agent.ts` (7079) y `scripts/openapi-snapshot.json`. **El Piloto (`/piloto`) sigue siendo Inicio en esa rama** (`git show cambios-nico-10:src/app/panel/inmobiliaria/layout.tsx:176`), así que la recomendación de T1 sobrevive; las líneas citadas acá, no. Todo plan re-mide en su Paso 0 contra la base real de ejecución.
> 🔴 **Nada de Naira está vivo en ningún agente.** Los 5 endpoints de memoria (Fase 8) existen en el código de la rama local no pusheada `project/account-manager` (299 commits propios y 830 detrás de `origin/develop`: `git rev-list --count HEAD..origin/develop` = 830), con migraciones GENERADAS y NO aplicadas (B-4: la Supabase del agente está caída). `origin/develop` del agente (el que alimenta el snapshot del front) tiene **0** rutas `naira`. Todo lo que la 13 consuma se consume detrás de un mock en v1.
> ⚠️ **Concurrencia medida:** durante este research otra sesión commiteó `e0f812ed` (`ENMIENDAS-PASADA-UNICA.md`) y dejó SIN commitear cambios en `09-03..09-07-PLAN.md` de `agent-account-manager` (+15/−15 líneas); las citas de 09-01/09-03/09-04 se re-midieron después y siguen vigentes. Este research no escribió en ese repo.
> **Sin `13-CONTEXT.md`:** las restricciones salen de `ROADMAP.md:380-392`, `REQUIREMENTS.md:219,247-249,434,454-456`, `briefs/brief-suborquestador-fase-13.md` y los CONTEXT/`<contrato_publicado>` de 8, 9.5, 10, 11 y 12 (rutas absolutas bajo `/Users/nicolasgarcia/rent/agent-account-manager/.planning/agents/account-manager/`), citados con su línea.

***

## Resumen

La Fase 13 es **una capa de lectura y decisión sin lógica de negocio propia**: pinta lo que el agente ya decidió, respeta lo que el agente autoriza y no recalcula nada. El diseño lo condicionan doce hallazgos medidos, varios de los cuales el ROADMAP (escrito el 2026-07-30) no podía ver:

1. **El "AI Hub existente" ya no existe como página.** El hub de tarjetas (`/panel/inmobiliaria/ai`, `agency-ai-hub-landing.ts`, que `research/ARCHITECTURE.md:699` nombra como el lugar de Naira) murió: `/ai` redirige a `/configuracion/agentes` (`src/lib/nav/rutas-por-ciclo-de-vida.data.mjs:70`), que a su vez redirige a `/configuracion` porque Nico ocultó la vitrina (`src/app/panel/inmobiliaria/configuracion/agentes/page.tsx:1-14`), y un test prohíbe que el código vuelva a enlazar `/panel/inmobiliaria/ai` (`src/lib/nav/arquitectura-del-panel.test.ts:98-127`). Lo que hoy es "el hub de los agentes" son las dos filas del layout: **Inicio = el Piloto automático** (`/panel/inmobiliaria/piloto`, "la torre de control transversal de los agentes", `src/app/panel/inmobiliaria/layout.tsx:168-188`) y **Chat** (`/panel/inmobiliaria`, `layout.tsx:193`, `page.tsx:21-29`). Los agentes de dominio son WORKSPACES N3 dentro de su módulo (`arquitectura-del-panel.ts:62-71`). Naira es transversal (lee cartera, portafolio y prospectos): **no tiene módulo dueño**, y darle uno o una fila propia sería exactamente la "sección paralela" que el criterio 1 prohíbe.
2. **El Piloto ya tiene un briefing, una bandeja de decisiones y un cajón de detalle** — de OTRO agente, el "Gerente" (`usePilotoBriefing`, `src/app/panel/inmobiliaria/piloto/page.tsx:80,125-133`, contra `GET /ai-hub/briefing` de `origin/develop`, `src/server/routes/agency-ai-hub-briefing.ts`), y el Chat consume ese mismo briefing (`src/lib/api/ai-hub-chat.ts:721-737`). Meter el briefing de Naira al lado es poner **dos briefings y dos cifras del mismo concepto en la misma pantalla** (el bug que EVAL-10 declara el más destructivo, `ROADMAP.md:331`). La planificación de Naira no menciona el Piloto ni el Gerente (grep = 0 fuera de los planes). 🔔
3. **Endpoints: 5 existen (código, no desplegados) y 25 están solo planificados.** Existen los 5 de memoria (Fase 8). Planificados: 1 de conversación (9.5-06), 14 de la 10-06 (2 de lectura + 12 de configuración), 5 de la 11-07, 5 de la 12-07; más la extensión aditiva de `/my-permissions` con `naira` (10-06). En el alcance literal de la 13 caen 5 existentes + 13 planificados; las 12 operaciones de configuración de la 10 quedan a decidir (🔔 Q4) porque el correo de la 10 **enlaza a pantallas suyas**.
4. **La 10 hardcodea rutas del front que no existen y contradicen la arquitectura:** `RUTAS_DEL_PANEL = { briefing: '/naira/briefing', senal: '/naira/senales', reglas: '/naira/reglas', recall: '/naira/recall', colaLegacy: '/naira/cola-legacy', arranque: '/naira/arranque' }` (`10-04-PLAN.md:379-380`, marcado "🔔 rutas del front (Fase 13)"), sobre la base `APP_URL` sin ruta (`10-04-PLAN.md:1056`). Un `/naira/*` en la raíz del dominio es una sección paralela fuera de `/panel/inmobiliaria` ⇒ enmienda E13-1.
5. **Tres campos que el criterio 4 exige NO viajan en ningún contrato publicado:** (a) el `claimClass` por oración — la causa del detalle sale como `citas: string[]` (`10-06-PLAN.md:336`), la persistida es `{ plantilla, texto: TextoRenderizado }` sin clase (`9.5-04-PLAN.md:324`) y la clase se DERIVA en el linter (`09-03-PLAN.md:631-634`), no se guarda; (b) la categoría por oración — la conversación devuelve UN `texto` plano (`9.5-06-PLAN.md:343-346`); (c) la banda/alternativa/discriminador de una hipótesis como campos. ⇒ E13-3/E13-4. Sin ellas, la UI solo puede cumplir el criterio 4 **por estructura del campo de origen** (T5) o con una heurística sobre texto, que queda prohibida.
6. **"La lista de entidades afectadas" (UI-01) no tiene fuente:** los 5 detectores activos emiten `affectedEntities: []` (medido: `vacancia-prolongada.ts:93`, `portafolio-sin-disponibles.ts:90`, `vacancia-tendencia.ts:105`, `leads-sin-contacto.ts:85`, `cambio-de-monto.ts:163`) y ni `RefDeSenalInvestigada` (`09-01-PLAN.md:320-323`) ni `ItemCongelado` ni `NairaSignalDetail` llevan el campo. ⇒ E13-2 + declaración honesta en la UI ("señal agregada: no apunta a registros").
7. **El drill-down "hasta el ERP" en v1 llega al LISTADO de la fuente, no a la ficha.** Lo que viaja es `fuente` (id de fuente, `SOURCE_REGISTRY`, `src/naira/volatility/registry.ts:48-`) + `metricId` + `asOf` por ítem (`ItemCongelado`, `10-CONTEXT.md:260-263`), `FactSnapshot{ value, source, asOf, trust }` en las acciones (`12-01-PLAN.md:186`) y `derivedFrom{ kind:'fact', source, ref }` en la memoria (`naira-memory.ts:88-95`). Con entidades vacías, "desde cualquier número a su fuente" = una tabla cerrada `fuente → ruta del front` (T5).
8. **El silencio con inventario no se puede renderizar desde `/briefing`:** la entrega congelada guarda solo `items` (`EntregaACongelar`, `10-04-PLAN.md:262`) y `NairaBriefingDelivery = { canal; tipo; congeladaEn; estadoDelEnvio; items }` (`10-06-PLAN.md:333-335`). El inventario de INV-06 vive en `naira_briefing_day` (09-04) y la ruta tiene prohibido recomponer. ⇒ E13-5; si no, la UI mostraría "hoy no hay nada" sin inventario, que es justo la supresión indistinguible que el criterio 3 de la 9 prohíbe.
9. **`canAccess('naira', …)` hoy le da `true` a cualquier admin del monolito.** `naira` no es un módulo de agente para el front (`src/lib/auth/agent-module-access.ts:33-46`), así que `canAccess` cae a la rama del monolito, donde `permissions.isAdmin ⇒ true` (`src/lib/context/PermissionsContext.tsx:197-204`), y `PageGuard` además hace `isAdmin || …` (`src/components/auth/PageGuard.tsx:48`). ⇒ `naira` entra a `FAIL_CLOSED_MODULES` y el gate de Naira NO usa `PageGuard`.
10. **El patrón de hooks del front deja datos viejos al fallar:** `use-piloto-briefing.ts:59-61` hace `setError(...)` sin `setData(null)`, y `piloto.ts:149-150` convierte todo no-2xx en `throw new Error('403')`. Un refetch que da 403 conserva la respuesta anterior ⇒ el "403 sin datos parciales" (criterio 3) requiere un cliente de Naira que limpie el dato en el mismo `setState`, probado por mutación.
11. **Roles:** el front habla `ADMIN | AGENTE | CONTADOR | VIEWER` (`src/lib/auth/agency-roles.ts:5-10`); el agente decide con `OWNER | ADMIN | OPERATOR | VIEWER` (`src/server/middleware/agency-role.ts:95`) y los mapea `ADMIN→ADMIN, AGENTE→OPERATOR, CONTADOR→VIEWER (hueco conocido), VIEWER→VIEWER` (`origin/develop:src/onboarding/steps/members-core.ts:102-110`). El rol del front NO predice el permiso de Naira (precedente del error: `PilotoBandeja.tsx:133` deja actuar a un CONTADOR que el micro rechaza como VIEWER). Única autoridad en la UI: el arreglo `naira` de `/my-permissions`, que solo existe tras 10-06.
12. **Mock-first con precedente en contra:** el agente de mantenimiento era mock-first sin endpoint y Nico lo sacó del catálogo ("no veo que funcione", `arquitectura-del-panel.ts:195-203`, test `arquitectura-del-panel.test.ts:280-286`). El simulado es opt-in y nunca en producción (`src/lib/api/config.ts:43-51`), con aviso global que no se puede cerrar (`src/components/estado/AvisoModoSimulado.tsx:39-70`, montado en `layout.tsx:337`). Pero `.env.example:42` trae `NEXT_PUBLIC_USE_MOCK_API=true` y el patrón de `funnel.service.ts:24-28` activa el mock también cuando FALTA `NEXT_PUBLIC_AGENT_URL`: ese segundo disparador no se copia.

Lo que existe y se **reusa sin reconstruir**: `agentFetch` (Bearer + reintento ante 401, `src/lib/api/agent-fetch.ts:99-127`); `clasificarFallo`/`esSinPermiso` (403 ⇒ "sin permiso, no reintentar", `src/lib/errores/clasificar.ts:124,141-150,251`); `PermissionsContext` con su tri-estado `resolviendo | resuelto | sin-verificar` (`PermissionsContext.tsx:27,177-192`); `PermissionGate` (sin bypass de `isAdmin` para módulos de agente, `src/components/auth/PermissionGate.tsx:29-37`); el cajón del Piloto con pila de aperturas (`PilotoCajon.tsx:1-35`, `piloto/page.tsx:96-116,218-225`); `isMockMode` + `AvisoModoSimulado`; el i18n con test de claves `es`/`en` (`arquitectura-del-panel.test.ts:175-188`, molde `src/lib/i18n/claves-avaluos.test.ts`); los tests de componentes con `createRoot` + `act` (349 archivos; `@testing-library/react` NO está en dependencias, `ActionProposalCard.test.tsx:5`); `@leasefy/cadence` (`KeyValueList`, `ListRow`, `Timeline`, `Chip`, `MonoLabel` ya usados en el Piloto).

**Recomendación principal:** Naira vive **dentro de Inicio (el Piloto)** como un bloque propio que se enciende solo si el agente responde (404 = Naira no habilitada ⇒ el Piloto queda como hoy), con el detalle de señal y el de acción como nuevas aperturas del **cajón** existente (sin rutas nuevas), la conversación como panel del Piloto (sin persistir texto), y "qué cree Naira" como panel lateral desde el encabezado del Piloto (molde `PilotoAutonomia`); cero filas de sidebar, cero `AGENT_WORKSPACES`, cero rutas bajo `/naira`. Todo contra un **contrato espejo con zod** (`src/lib/api/naira/contrato.ts`) derivado nombre por nombre de los `<contrato_publicado>`, un cliente único que devuelve una unión de estados (403 ⇒ `sin_permiso` sin dato) y fixtures que PASAN por ese mismo zod y se pintan con marca visible de simulado. Las enmiendas E13-1..E13-6 (rutas del correo, entidades, `claimClass`, respuesta estructurada, inventario, 404 distinguible) son precondición de cumplir los criterios 1, 2 y 4 con datos reales.

***
<user_constraints>
## Restricciones del usuario

> No existe `13-CONTEXT.md` todavía (lo escribe el sub-orquestador después de este research). Lo "bloqueado" se copia textual de las fuentes que lo fijan.

### Decisiones bloqueadas (textuales)

- **ROADMAP §Phase 13** (`ROADMAP.md:380-392`): *Goal:* "El equipo ve el briefing, los open loops, la conversación y el detalle de cada señal dentro del AI Hub que ya usa, y puede bajar de cualquier número hasta su fuente en el ERP." *Depends on:* Fases 9.5, 10, 11 y 12. *Criterios:*
  1. "Briefing, open loops, conversación y detalle de señal (con la lista de entidades afectadas) viven **dentro del AI Hub existente** — no se crea una página nueva ni una sección paralela."
  2. "Desde cualquier número se llega a su fuente en el ERP (drill-down), y el `asOf` es visible junto al número — un dato correcto de hace 13 horas es, sin esa marca, indistinguible de una alucinación."
  3. "El front **consume** los endpoints ya protegidos y **respeta el 403 sin renderizar datos parciales** (test). La `permissions-matrix` extendida y `agencyRoleMiddleware` **no se construyen acá**: viven en `Leasefy/agent` y son `API-01` (V-7 …)."
  4. "La UI distingue visualmente DATO / INFERENCIA / RECOMENDACIÓN, muestra el `claimClass` de toda oración causal, y expone la vista **"qué cree Naira sobre nosotros"** con corregir/borrar por ítem."
  *UI hint: yes.* "⚠️ Cross-repo: … otro repo y otro tren de versiones (`.planning/releases/` propio)."
- **Superficies declaradas por las fases productoras:** memoria "se renderiza en la Fase 13" (`ROADMAP.md:265`), conversación (`:314`), briefing (`:333`), lista de open loops y botones de feedback (`:357`), flujo de aprobación en dashboard (`:374`).
- **REQUIREMENTS:** `UI-01` (`REQUIREMENTS.md:247`), `UI-02` (`:248`), `UI-03` (`:249`, partido: la matriz es `API-01`, `:219`).
- **Brief del sub-orquestador** (`briefs/brief-suborquestador-fase-13.md`): SOLO PLANIFICACIÓN; worktree `/Users/nicolasgarcia/rent/wt-front-naira`, rama `project/naira-superficie`, base `origin/Main` `5e3a6f85` con riesgo de atraso (`:9-12`); no tocar `~/rent/mvp`, otras copias ni `agent-account-manager` (`:22-23`); qué existe vs planificado se declara y lo que no existe va detrás de un mock "sin fabricar datos que parezcan medidos" (`:33-36`); **B-5 rige en la UI** — "ninguna métrica por persona ni 'quién cerró'; asignar solo a un rol (🔔 H2 de la 12); quién aprobó solo en auditoría (🔔 H7 de la 12). Si un contrato de la 9.5-12 expone algo así, NO lo renderices y anotalo" (`:42-43`); planners de a 2; `<automated>` en zsh con `bash -n` y `zsh -n` (`:44-48`); el plan-checker no puede dar por verde lo que exige correr tests sin `node_modules` (`:46-48`).

### Discreción de Claude (este research recomienda)
Dónde exactamente dentro del hub vive cada superficie; el patrón del cliente/estados; el mock; el mapeo de categorías y fuentes; la partición en planes. Todo lo que es producto va como 🔔 (§"Preguntas abiertas").

### Fuera de alcance
Construir o cambiar `permissions-matrix`, `agencyRoleMiddleware` o cualquier endpoint (`ROADMAP.md:387`, `REQUIREMENTS.md:249`); el front de `~/rent/admin` (C-10, `REQUIREMENTS.md:292`); WhatsApp (lo cablea la 10); toda métrica por persona (B-5).
</user_constraints>

<phase_requirements>
## Requisitos de la fase

| ID | Descripción | Lo que lo habilita en este research |
|----|-------------|-------------------------------------|
| UI-01 | Briefing, open loops y detalle de señal con lista de entidades afectadas, dentro del AI Hub existente — no una página nueva | T1 (dónde: Piloto + cajón + panel; sin fila, sin workspace, sin `/naira`), T2 (endpoints y esquemas), E13-2 (entidades: hoy sin campo y sin datos) |
| UI-02 | Drill-down desde cada número hasta su fuente en el ERP | T5 (`fuente`/`source`/`derivedFrom` → tabla cerrada `FUENTE_A_RUTA` → rutas medidas de `src/app/panel/inmobiliaria/`; v1 = listado, ficha cuando haya entidades) |
| UI-03 | El front consume los endpoints protegidos y respeta el 403 sin renderizar datos parciales | T3 (cliente, 403 hoy), T4 (estados), `## Arquitectura de validación` (test del 403 con mutación) |
| (criterio 4) | DATO/INFERENCIA/RECOMENDACIÓN, `claimClass`, vista "qué cree Naira" con corregir/borrar | T5 (mapeo por campo de origen), E13-3/E13-4, T2 fila memoria (existe) |
</phase_requirements>

## Restricciones del proyecto (de `CLAUDE.md` del front y de la casa)

- **UI:** leer `docs/DESIGN.md` antes de cualquier UI (`CLAUDE.md` §"Trabajo de UI"); no inventar patrones; tokens `hsl(var(--…))`; copy en español de Colombia, código en inglés; componentes `PascalCase.tsx`, hooks `use-kebab-case.ts`; patrón de página `page.tsx` + `XxxView.tsx` + `XxxClient.tsx`.
- **Contrato del agente:** tipos generados en `src/lib/api/generated/agent.ts` — NUNCA a mano; `pnpm api:gen` / `pnpm api:check` (manual, el CI no lo corre).
- **Mock:** apagado por defecto y NUNCA en producción; guarda `NODE_ENV === 'production'` ⇒ false (`CLAUDE.md` §"Contratos consumidos"; `src/lib/api/config.ts:43-51`).
- **Permisos:** guards client-side `ProtectedRoute`, `AgencyRoleGuard`, `PermissionGate`; `PermissionsContext.canAccess(module, action)` carga permisos del back Y del agente.
- **A11y:** proyecto `panel-a11y` de Playwright con axe — "los paneles nuevos deben pasarlo".
- **Gates:** el CI solo corre `install --frozen-lockfile` → `tsc --noEmit` → `pnpm test` (`.github/workflows/ci.yml:70,75,79`); `pnpm lint`, `pnpm api:check`, `pnpm build` son manuales antes de PR.
- **Skills del repo** (`.claude/skills/`): `agent-api-contract`, `agency-permissions`, `testing-patterns` ("No RTL — `createRoot` + `act`"). ⚠️ `agent-api-contract/SKILL.md` está DESACTUALIZADA: dice que el mock es "default … `!== 'false'`" (`config.ts:35`), y el código hoy es opt-in (`config.ts:47-50`); y remite a `src/app/panel/inmobiliaria/ai/`, que murió. El planner no la toma como fuente de esas dos reglas.
- **Casa (brief):** commits solo en el worktree del front y solo `.planning/naira/`; nunca `git add -A`, `git stash`, `push`; temporales por ruta exacta de `mktemp -d`; nada de `rm` con comodines.

## Mapa de responsabilidad arquitectónica

| Capacidad | Tier dueño | Tier secundario | Por qué |
|---|---|---|---|
| Autorizar cada operación de Naira (rol × acción, 403) | API (`Leasefy/agent`: `agencyRoleMiddleware` + `permissions-matrix`) | — | V-7: no se construye en el front (`ROADMAP.md:387`) |
| Decidir qué mostrar/ocultar (botones, bloques) | Browser (`PermissionsContext` + arreglo `naira` de `/my-permissions`) | API (la verdad) | El front predice; el 403 del agente manda y se respeta sin datos parciales |
| Componer briefing, causa, loops, propuestas, respuestas | API (agente) | — | Todo congelado o leído allá; el front no recalcula (EVAL-10, `10-06-PLAN.md` P4) |
| Mapear `fuente` → ruta del front (drill-down) | Browser (tabla cerrada) | — | Conocimiento de rutas del front; el agente no conoce `/panel/inmobiliaria/*` |
| Formatear número + `asOf` | Browser | API (si E13-11 entrega el texto renderizado) | Un solo formateador probado, zona `America/Bogota` |
| Mock/fixtures | Browser (solo fuera de producción, opt-in) | — | `config.ts:43-51` |
| Persistencia | Ninguna en el front | API | C2 de la 9.5: el texto de la pregunta no se guarda (`9.5-CONTEXT.md:299`) |

***
## Estado medido

### T1 — Dónde vive Naira en el front hoy (y dónde debe vivir)

**Hoy Naira no existe en el front:** `grep -ril naira src tests scripts docs .github` devuelve un solo archivo, `src/lib/nav/arquitectura-del-panel.test.ts:105`, y es un comentario sobre un CRLF (T-0060), no una referencia al agente. `src/lib/api/generated/agent.ts` y `scripts/openapi-snapshot.json` tienen 0 menciones de `naira` (medido con `grep -ci`).

**Qué es hoy "el AI Hub" (base `5e3a6f85`):**

| Pieza | Dónde | Qué hace | Cita |
|---|---|---|---|
| Hub de tarjetas `/ai` | MUERTO | `/panel/inmobiliaria/ai` → `/configuracion/agentes` → `/configuracion` (vitrina oculta por Nico 2026-09-03) | `rutas-por-ciclo-de-vida.data.mjs:70`; `configuracion/agentes/page.tsx:1-14`; test que prohíbe enlazarlo `arquitectura-del-panel.test.ts:98-127` |
| **Inicio = Piloto automático** | `/panel/inmobiliaria/piloto` | "la torre de control transversal de los agentes"; destino de entrada; `module: null` (visible a todo miembro; cada widget se defiende solo) | `layout.tsx:168-188`; `piloto/page.tsx:1-49` |
| Piloto: pulso + lectura del Gerente | `PilotoPulso` | titular + banda de números; la lectura del Gerente va DENTRO del pulso | `piloto/page.tsx:120-133,178-189` |
| Piloto: bandeja ("¿qué necesita de mí?") | `PilotoBandeja` | decisiones pendientes de todos los agentes | `piloto/page.tsx:196-204` |
| Piloto: feed ("¿qué hicieron sin mí?") | `PilotoFeed` | actividad | `piloto/page.tsx:207-214` |
| Piloto: cajón | `PilotoCajon` | TODO el detalle sin salir de la sección; pila de aperturas `{tipo:'item'} \| {tipo:'alerta'}` con "volver" | `PilotoCajon.tsx:1-35`; `piloto/page.tsx:96-116,218-225` |
| Piloto: encabezado | `Procesos` (link a `/piloto/procesos`) + `PilotoAutonomia` (panel lateral) | "configuración, no operación: las dos viven en el encabezado" | `piloto/page.tsx:161-174` |
| Piloto: dock | `PilotoDock` | tray flotante de procesos, importado por el layout | `PilotoDock.tsx:1-20`; `layout.tsx:26` |
| **Chat** | `/panel/inmobiliaria` (raíz) | chat embebido estilo Manus que despacha agentes por `POST /ai-hub/chat[/stream]`; persiste conversaciones en `localStorage` (`leasefy-beta-conversations`) | `page.tsx:7-29`; `ai-hub-chat.ts:1-16,30-37`; `useBetaChat.ts:88` |
| Workspaces de agente (N3) | dentro de su módulo (Cobros → Cobranza, etc.) | pestañas `WorkspaceNav` de `agentWorkspaceNav.ts` | `arquitectura-del-panel.ts:46-71`; `agentWorkspaceNav.ts:37-58,102-274` |
| Configuración › Automatización IA | `/configuracion/ia` (gate `todos`) | lecciones que el chat aprendió, certificadas por OPERATOR+ | `configuracion/secciones.ts:193-203`; `configuracion/ia/page.tsx:1-19` |

**Qué exigen los tests para un workspace nuevo** (si Naira fuera un workspace, que NO se recomienda):
- fila con `agente: '<slug>'` en `ARQUITECTURA_DEL_PANEL` (`arquitectura-del-panel.ts:119-120`) cuyo `href` = `basePath` del workspace (`arquitectura-del-panel.test.ts:252-258`), y viceversa: todo workspace necesita su "puerta" (`:260-265`);
- toda pantalla con `agente` lleva `ia: true` (`:267-269`); todo `href` y toda pestaña tienen `page.tsx` (`:80-89`); ningún icono ni nombre repetido (`:151-173`); claves i18n en `es` y `en` (`:175-188`);
- **el sidebar tiene exactamente 17 módulos en 4 grupos** (`:197-203`) — una fila nueva lo pone rojo;
- el módulo gatea con un `module` conocido (back o agente) (`src/lib/nav/gates-del-panel.test.ts:51-68,85-87,147-163`);
- una ficha en segmento dinámico con `*Client.tsx` necesita `VolverALaLista` (`src/app/panel/inmobiliaria/fichas-con-vuelta.test.ts:42-76`).

**En qué módulo/grupo cabe un agente transversal:** en ninguno. Los grupos siguen el ciclo de vida del contrato (`arquitectura-del-panel.ts:58-60,148-283`) y cada workspace "vive dentro del módulo dueño del proceso que automatiza" (`agentWorkspaceNav.ts:50-54`). Naira lee cartera, portafolio y prospectos (`DomainRole = 'cartera' | 'portafolio' | 'prospectos'`, `src/naira/attribution/types.ts:362` del agente): no automatiza un proceso de un módulo, supervisa el negocio. Lo transversal en el panel es **Inicio** (Piloto) y **Chat**, que "viven en el layout, no acá: no se tocan" (`arquitectura-del-panel.ts:79`) y que `moduloDeLaRuta` no asocia a ningún módulo (`arquitectura-del-panel.test.ts:301`).

**Recomendación 🔔 R1 (con alternativas):**

| Superficie | Recomendado (A) | Alternativa (B) | Alternativa (C) |
|---|---|---|---|
| Briefing | Bloque "Naira" dentro del Piloto, bajo el pulso; si Naira está habilitada para el tenant, **reemplaza** la "lectura del Gerente" y la cifra `recuperadoMesCop` del pulso (Q2) | Convivir con el del Gerente (dos briefings; exige E-Gerente) | Solo por correo (sin UI) — incumple crit. 1 |
| Detalle de señal | Nueva apertura del **cajón** `{tipo:'naira-senal', promocionId}` | Ruta hoja `/piloto/senales/[promocionId]` (ficha N4, exige `VolverALaLista`) | — |
| Open loops + feedback | Sección "Lo que Naira sigue" dentro del bloque; feedback en cada ítem del briefing (secciones `atencion`/`informativo`) | Pestaña dentro del bloque | — |
| Aprobación de acciones | Las propuestas pendientes en el bloque de Naira con su cajón `{tipo:'naira-accion', proposalId}` (consecuencia primero) | Unirlas a la `PilotoBandeja` (una sola bandeja de decisiones) — exige un adaptador porque su contrato es otro (`piloto.ts:62-95`) | — |
| Conversación | Panel "Pregúntale a Naira" en el Piloto, sin persistencia | Modo "Naira" del Chat (`/`) **sin** `localStorage` (hoy el Chat persiste, `useBetaChat.ts:88`) | — |
| "Qué cree Naira sobre nosotros" | Panel lateral desde el encabezado del Piloto (molde `PilotoAutonomia`: configuración/transparencia, no operación) | Pestaña de Configuración › Automatización IA (vecina de las lecciones del chat) | Página `/piloto/naira` |
| Configuración de la 10 (recall, reglas, arranque, preferencias, asignaciones, tope, cola legacy) | 🔔 Q4 | Sección "Naira" en Configuración (grupo `sistema`, patrón `SECCIONES_DE_CONFIGURACION`) | Fuera de la 13 y la 10 quita esos enlaces del correo |

Por qué (A): cumple "sin página nueva ni sección paralela" literalmente (cero filas, cero workspaces, cero rutas nuevas salvo, si se elige, hojas bajo `/piloto`), reutiliza el cajón que Nico pidió para no sacar al usuario de la torre (`PilotoCajon.tsx:6-13`), respeta "fail-soft por widget" (`piloto/page.tsx:47-48`) y encaja con "Naira apagada para el tenant ⇒ 404" (`naira-memory.ts:421`, DP5-7): el bloque desaparece y el Piloto queda como hoy. Guardas que el plan BASE agrega como test estático: ninguna entrada `naira` en `ARQUITECTURA_DEL_PANEL` ni en `AGENT_WORKSPACES`; no existe `src/app/panel/inmobiliaria/naira/`; los componentes de Naira solo se importan desde `app/panel/inmobiliaria/piloto/**` (y, si se elige, `configuracion/**`); la cuenta de 17 módulos no cambia.

**Deep links desde el correo de la 10:** con (A) el detalle se abre por query (`/panel/inmobiliaria/piloto?senal=<promocionId>`, `?dia=YYYY-MM-DD`), leído por el Piloto al montar para empujar la apertura a la pila del cajón. Exige E13-1 (hoy la 10 arma `base + '/naira/senales' + '/' + promocionId`, `10-04-PLAN.md:379,987`).

***
### T2 — Inventario de endpoints `API-01` (la pieza central)

**Base común:** `/api/agency/{agencyId}/naira` (molde `naira-memory.ts:183`, repetido como BASE en `10-06-PLAN.md:328`, `11-07-PLAN.md:375`, `12-07-PLAN.md:426`). **Orden de toda operación** (`9.5-06-PLAN.md:366-378`; `10-06-PLAN.md:359`; `11-07-PLAN.md:405-412`): middleware (401 sin JWT; 403 miembro no resuelto o rol sin la acción) → validación (400) → `acceso(…, accion)` (403 `prohibido` · 503 `sin-base` · **404 `apagada` = Naira no habilitada para el tenant**) → UNA transacción con `principalDe` (null ⇒ 403) → lecturas → serialización campo por campo. **Cuerpo de error:** `{ error: string; reason: string | null }` con prefijo por archivo (`NairaMemoryError` `naira-memory.ts:160`; `NairaConversationError`; `NairaBriefingError`; `NairaOpenLoopsError`; `NairaActionsError`), **salvo** el 403 del middleware, que es `{ error: 'Forbidden — insufficient role' }` **sin `reason`** (`src/server/middleware/agency-role.ts:231-235`). El cliente del front no puede exigir `reason`.

**Estado de existencia:** "EXISTE" = código en la rama local `project/account-manager` de `agent-account-manager` (Fase 8 ejecutada), registrado (`src/server/index.ts:437`) y en SU snapshot OpenAPI (`openapi-snapshot.json`: 5 paths `naira`, 16 esquemas `NairaMemory*`); **no** está en `origin/develop` ni desplegado; migraciones no aplicadas (B-4). "PLANIFICADO" = nombre de un `<contrato_publicado>` de un plan no ejecutado; manda el disco al ejecutar.

#### T2.A — "Qué cree Naira sobre nosotros" (memoria) — Fase 8 (EXISTE) + 11-07 (PLANIFICADO)

| # | Método y ruta EXACTA | `operationId` / acción (roles) | Respuesta que la UI lee | Códigos | Estado · fuente |
|---|---|---|---|---|---|
| 1 | `GET /api/agency/{agencyId}/naira/memory` | `memory-view` (OWNER, ADMIN, OPERATOR, VIEWER) | `NairaMemoryView { snapshot: { revision }; items: NairaMemoryItem[]; pendingProposals: NairaMemoryProposal[]; generatedAt }` · `NairaMemoryItem { id; layer: episodic\|semantic\|preference\|procedural; provenance: observed\|inferred\|stated_by_human; trust: system\|staff\|third_party; writtenBy: {kind:'user'; userId}\|{kind:'system'}; derivedFrom: {kind:'fact'; source; ref}\|{kind:'memory'; itemId}\|{kind:'human_statement'}\|{kind:'deterministic_query'; queryId}; recordedAt; revision; content: {kind:'present'; text}\|{kind:'erased'; erasedAt; erasedBy} }` · `NairaMemoryProposal { id; proposedBy: {kind:'user'; userId}; proposedAt; text }` | 200 · 400 · 401 · 403 · 404 · 503 | **EXISTE** · `naira-memory.ts:84-133,185-199`; enums `memory/types.ts:47,55`, `fact/types.ts:67` |
| 2 | `POST …/naira/memory/items/{itemId}/correction` | `memory-correct` (OWNER, ADMIN) | cuerpo `{ text: 1..4000 }` → `NairaMemoryWriteResult { item; snapshot }` | 200 · 400 · 401 · 403 · 404 · 409 (versión no vigente / carrera) · 422 (pantalla de PII: `reason`, jamás el texto) · 503 | **EXISTE** · `naira-memory.ts:135,141,201-214` |
| 3 | `POST …/naira/memory/items/{itemId}/erasure` | `memory-erase` (OWNER, ADMIN) | cuerpo `{ motivo: 'solicitud_del_titular' \| 'decision_de_la_agencia' }` → `{ erasedItemIds; erasedAt; auditId }` (borra texto y vector del linaje) | 200 · 400 · 401 · 403 · 404 · 409 (ya redactado) · 503 | **EXISTE** · `naira-memory.ts:137,143-145,216-229`; `memory/erasure.ts:64` |
| 4 | `POST …/naira/memory/procedural` | `procedural-propose` (OWNER, ADMIN, OPERATOR) | cuerpo `{ text }` → 201 `{kind:'written'; item; snapshot}` (OWNER/ADMIN) · 202 `{kind:'proposed'; proposalId}` (OPERATOR) · 403 con `reason` (la decisión procedural) | 201 · 202 · 400 · 401 · 403 · 404 · 409 · 422 · 503 | **EXISTE** · `naira-memory.ts:147-151,231-254` |
| 5 | `POST …/naira/memory/procedural/proposals/{proposalId}/resolution` | `procedural-approve` (OWNER, ADMIN) | cuerpo `{ decision: 'confirm' \| 'reject' }` → `{kind:'confirmed'; item; snapshot}` \| `{kind:'rejected'; proposalId}` | 200 · 400 · 401 · 403 · 404 · 409 (`already_resolved`) · 422 · 503 | **EXISTE** · `naira-memory.ts:139,153-158,256-269`; `memory/human-actions.ts:71` |
| 6 | `POST …/naira/memory/items/{itemId}/promotion` | `promoteNairaMemoryItem` · `memory-promote` (OWNER, ADMIN) | 200 `NairaMemoryWriteResult` | 200 · 401 · 403 · 404 (no creída hoy / otro tenant) · 409 (`not-current`, carrera) · 422 (`no-promovible` o razón de la pantalla) · 503 | **PLANIFICADO** · `11-07-PLAN.md:400-403`; D11-14 (`11-CONTEXT.md:214-`) |

#### T2.B — Permisos que la UI lee

| # | Ruta | Respuesta | Estado · fuente |
|---|---|---|---|
| 7 | `GET /api/agency/{agencyId}/my-permissions` | HOY `{ cobranza: string[]; cotizador: string[] }` (`agency-permissions.ts:57-62,113-117`; el snapshot del front igual, `MemberPermissionsResponse` requiere solo esos dos). **10-06 agrega `naira: string[]`** (aditivo) derivado de la matriz; 11-07 y 12-07 agregan acciones por derivación sin tocar el handler | EXISTE sin `naira` · extensión **PLANIFICADA** `10-06-PLAN.md:322` (P15: hoy `/my-permissions` ni siquiera está en el dump OpenAPI del agente) |

**Acciones del módulo `naira` (orden final de `NAIRA_ACTIONS`) y roles:**

| Acción | Dueño | OWNER | ADMIN | OPERATOR | VIEWER |
|---|---|---|---|---|---|
| `memory-view` | Fase 8 (EXISTE, `permissions-matrix.ts:63,115,145,161,170`) | ✓ | ✓ | ✓ | ✓ |
| `memory-correct`, `memory-erase`, `procedural-approve` | Fase 8 | ✓ | ✓ | — | — |
| `procedural-propose` | Fase 8 | ✓ | ✓ | ✓ | — |
| `conversation-ask` | 9.5-06 (`9.5-06-PLAN.md:329-330`) | ✓ | ✓ | ✓ | ✓ |
| `briefing-view`, `signal-view`, `notify-preferences-edit`, `recall-answer` | 10-06 (`10-06-PLAN.md:318-321`, 🔔 P1) | ✓ | ✓ | ✓ | ✓ |
| `legacy-queue-view` | 10-06 | ✓ | ✓ | ✓ | — |
| `role-assignment-edit`, `go-live-set`, `investigation-cap-edit`, `rule-state-edit`, `notify-company-preferences-edit` | 10-06 | ✓ | ✓ | — | — |
| `open-loops-view`, `signal-feedback` | 11-07 (`11-07-PLAN.md:351-354`) | ✓ | ✓ | ✓ | ✓ |
| `feedback-report-view`, `memory-promote` | 11-07 | ✓ | ✓ | — | — |
| `action-view`, `task-view` | 12-07 (`12-07-PLAN.md:362-365`) | ✓ | ✓ | ✓ | ✓ |
| `action-approve-internal`, `task-cancel` | 12-07 (🔔 H4) | ✓ | ✓ | — | — |
| `action-approve-external` | 12-07 (sin acciones en v1) | ✓ | — | — | — |

⚠️ OWNER ≠ ADMIN desde la 12 (`action-approve-external`): la UI no asume que "admin ve lo mismo que owner" (el test del agente `[PM:naira-owner-admin]` choca con D12-9, E-1207-a, `12-07-PLAN.md:1242`).

#### T2.C — Conversación — 9.5-06 (PLANIFICADO)

| # | Método y ruta EXACTA | `operationId` / acción | Respuesta que la UI lee | Códigos | Fuente |
|---|---|---|---|---|---|
| 8 | `POST /api/agency/{agencyId}/naira/conversation/questions` | `askNaira` · `conversation-ask` (4 roles) | cuerpo `NairaConversationQuestionRequest { question: 1..ROUTER_QUESTION_MAX_CHARS }` → 200 unión por `kind`, cada rama con `texto` (= `textoParaElUsuario`): `respondida { preguntaId; texto; refsServidas: string[]; asOfs: string[]; alcance: {kind:'toda_la_agencia'}\|{kind:'por_eje'; eje}; noServidos: ('grafo_sin_filtro_de_rol')[] }` · `negada { preguntaId; razon; puedoResponder: ({kind:'metrica'; metricId; nombre}\|{kind:'politicas'}\|{kind:'ficha_por_direccion_o_referencia'})[]; texto }` con `razon ∈ fuera_de_catalogo, instruccion, accion_en_fase_12, dimension_de_persona, eje_no_disponible, bajo_k, metrica_no_visible_para_el_rol, documento_no_buscable_en_v1, fuente_rancia, presupuesto_agotado` · `bloqueada { preguntaId; motivo ∈ numeric_drift, causal_sin_clase, vocabulario_fuera_de_adr, categoria_inconsistente; texto }` · `fallida { preguntaId; razon ∈ registro_no_escrito, cupo_no_reservado, lectura_fallida; texto }` | 200 · 400 · 401 · 403 · 404 (Naira **o** el sub-flag `NAIRA_CONVERSATION_ENABLED` apagados) · 503 · 500 (excepción del motor se relanza) | `9.5-06-PLAN.md:336-350,366-378`; `9.5-CONTEXT.md:181-205,227-229`; motivos `09-03-PLAN.md:355-356` |

- `refsServidas` mezcla **dos cosas sin discriminador**: `sourceRef` de cada chunk citado y el `investigacionId` de cada causa citada (`9.5-04-PLAN.md:407`) ⇒ la UI no puede hacer drill-down con eso (E13-4).
- `asOfs` es una lista por respuesta, no por número ⇒ el criterio 2 ("`asOf` junto al número") solo se cumple a nivel de respuesta sin E13-4.
- **Contradicción resuelta:** `9.5-PATTERNS.md:446,617` proponía `POST …/naira/questions`; el §3.1 del CONTEXT (`9.5-CONTEXT.md:227`, "EXACTOS") y el plan dueño (`9.5-06-PLAN.md:80,142,336,545` `[NCV:operacion-registrada]`) fijan `…/naira/conversation/questions` ⇒ **manda el plan**.
- Semántica que la UI debe respetar: sin LLM en v1 (🔔 "LLM en el chat", `9.5-CONTEXT.md:309`); el texto de la pregunta NO se persiste (🔔 C2, `:299`; D9.5-3 `:80-84`); pedir una acción ⇒ `negada{accion_en_fase_12}` que la 12 conserva (E12-7, H11); un OPERATOR nunca ve la causa de `cartera`/`portafolio` (🔔 C12, `:307`).

#### T2.D — Briefing y detalle de señal — 10-06 (PLANIFICADO)

| # | Método y ruta EXACTA | `operationId` / acción | Respuesta que la UI lee | Códigos | Fuente |
|---|---|---|---|---|---|
| 9 | `GET …/naira/briefing?dia=YYYY-MM-DD` (`dia` opcional: hoy Bogotá) | `getNairaBriefing` · `briefing-view` (4 roles) | `NairaBriefingDay { dia; corte; resultado: {kind:'entregado'; entregas: NairaBriefingDelivery[]; ocultosPorRol} \| {kind:'sin_entrega'; razon ∈ antes_del_corte, briefing_apagado, sin_entregas_del_tenant, sin_entrega_para_el_llamador} }` · `NairaBriefingDelivery { canal; tipo: briefing\|aviso_suspension; congeladaEn; estadoDelEnvio: sin_despacho\|enviado\|stub\|solo_fallidos; items: NairaBriefingItem[] }` · `NairaBriefingItem` = los 13 campos de `ItemCongelado`: `{ seccion; posicion; metricId; valor (decimal en string); unidad; asOf; fuente; trust; clave; urgencyClass; titulo; promocion: {kind:'promovida'; promocionId}\|{kind:'sin_promocion'}; causa: {kind:'investigada'; razon}\|{kind:'investigacion_no_disponible'} }` | 200 · 400 (día inválido o futuro) · 401 · 403 · 404 (Naira apagada; **nunca** por el sub-flag del briefing: eso es `sin_entrega{briefing_apagado}`) · 503 | `10-06-PLAN.md:329,333-335`, P6/P7 (`:377-378`); `ItemCongelado` `10-CONTEXT.md:260-263`; `SECCIONES_DEL_BRIEFING` `10-CONTEXT.md:228` (+ `'seguimiento'`, 11-06, `11-CONTEXT.md:409`); `unidad ∈ pct\|cop\|count\|days` (`src/naira/metrics/types.ts:33`; formato `pct`→bps, `10-04-PLAN.md:981`) |
| 10 | `GET …/naira/signals/{promocionId}` | `getNairaSignalDetail` · `signal-view` (4 roles) | `NairaSignalDetail { promocionId; dia; corte; congeladaEn; item: NairaBriefingItem; causa: {kind:'investigacion_no_disponible'} \| {kind:'citada'; investigacionId; citas: string[]} \| {kind:'no_citable'; razon ∈ sin_investigacion_al_congelar, fila_ilegible, no_visible_para_el_rol, con_datos_de_terceros, sin_explicacion} }` — **sin entidades afectadas** (E13-2) y **sin `claimClass`** por cita (E13-3); lee lo CONGELADO, no hay vista "ahora" (P4) | 200 · 400 · 401 · 403 · 404 (no entregada al llamador **o** métrica fuera de su rol: MISMO cuerpo, no confirma existencia, P6) · 503 | `10-06-PLAN.md:330,332,336`, P4-P6 (`:375-377`) |

- **Qué no viaja en el briefing (E13-5):** el inventario del día (qué corrió, `asOf` por fuente, descartes por compuerta, loops), la madurez con fecha, el `arranque` (go-live) y la frase de silencio viven en `BriefingDePersona` para el render del correo (Δ 10-04, `10-CONTEXT.md:388-393`) pero la entrega congelada guarda solo `items` (`EntregaACongelar`, `10-02-PLAN.md:364`, `10-04-PLAN.md:262`) y la ruta no recompone (P4). Hoy la UI no tiene con qué pintar "Hoy no hay nada que requiera tu atención" **con** su inventario.
- **Dos números del mismo concepto (EVAL-10):** el detalle y el briefing leen el mismo congelado (mismo `valor`, `asOf`, `corte`); la conversación lee "ahora" (P4) ⇒ puede diferir del briefing de las 06:45 y la UI lo tiene que mostrar con su propio `asOf`, nunca lado a lado sin marca.

#### T2.E — Configuración de la 10 — 10-06 (PLANIFICADO; alcance 🔔 Q4)

| # | Ruta (BASE `…/naira`) | `operationId` · acción | Respuesta / códigos | Fuente |
|---|---|---|---|---|
| 10a | `GET\|PUT /notification-preferences` | `getNairaNotificationPreferences` / `setNairaNotificationPreference` · `notify-preferences-edit` (+ `notify-company-preferences-edit` si el alcance es `compania`) | `{ propia; compania }: PreferenciaEfectiva { modo: normal\|solo_digest; urgenciaMinimaParaAtencion; origen: persona\|compania\|por_defecto }` | `10-06-PLAN.md:338-339`; `10-CONTEXT.md:258-259` |
| 10b | `GET\|POST\|DELETE /role-assignments` (`DELETE ?rol=&userId=`) | `listNairaRoleAssignments` / `createNairaRoleAssignment` / `deleteNairaRoleAssignment` · `role-assignment-edit` (OWNER, ADMIN) | `{ asignaciones; sinDestinatario: { dia; duenos } }` · POST 201 asignada · 200 `ya_vigente` · 409 · 422 `no_es_miembro` · DELETE 200 · 404 `no_vigente` — ⚠️ lleva `userId` por rol (T6) | `10-06-PLAN.md:340-342`, P8/P9 (`:379-380`) |
| 10c | `GET\|PUT /go-live` | `getNairaGoLive` / `setNairaGoLive` · `go-live-set` | PUT 201 fijado · 409 `ya_fijado` · 422 `retroactivo` — sin arranque nada entra a "atención" (`[BRF:sin-go-live]`, `10-04-PLAN.md:993`) | `10-06-PLAN.md:343-344`, P11 |
| 10d | `GET\|PUT /investigation-cap` | `getNairaInvestigationCap` / `setNairaInvestigationCap` · `investigation-cap-edit` | `{ politica: TopeLeido; maximo; regla: 'min_politica_y_n_del_portafolio' }` · 422 `fuera_de_rango`\|`no_entero` | `10-06-PLAN.md:345-346`, P10 |
| 10e | `GET /legacy-queue?limite=` | `listNairaLegacyQueue` · `legacy-queue-view` (OWNER, ADMIN, OPERATOR) | `{ filas; ocultosPorRol }` (límite 50 por defecto, 100 máx.) | `10-06-PLAN.md:347,350` |
| 10f | `POST /recall` | `answerNairaRecall` · `recall-answer` (4 roles) | 201 · 422 `rechazada_por_pii`\|`semana_no_es_lunes`\|`semana_futura` (jamás el texto) | `10-06-PLAN.md:348`, P13 |
| 10g | `POST /rules/{reglaId}/resolution` | `resolveNairaRule` · `rule-state-edit` | 200 · 404 `regla_sin_estado` · 409 `transicion_ilegal`; `TRANSICION_POR_DECISION = { confirmar: 'confirmada', revertir: 'revertida' }` | `10-06-PLAN.md:349`, P12 |

Son 12 operaciones (con 9 y 10: los "14 `operationId`" de `10-CONTEXT.md:400`). El correo de la 10 enlaza a `reglas`, `recall`, `colaLegacy` y `arranque` (`10-04-PLAN.md:379-380,993`): si la 13 no les da pantalla, el correo promete vistas inexistentes (Q4, E13-1).

#### T2.F — Open loops + feedback — 11-07 (PLANIFICADO)

| # | Método y ruta EXACTA | `operationId` · acción | Respuesta que la UI lee | Códigos | Fuente |
|---|---|---|---|---|---|
| 11 | `GET …/naira/open-loops` | `listNairaOpenLoops` · `open-loops-view` (4 roles) | `NairaOpenLoopsList { generadoEn; loops: NairaOpenLoop[]; ocultosPorRol }` · `NairaOpenLoop { loopId; detectorId; metricId; clase; familia; episodio; claveDeCausa; promocionId; owner (EFECTIVO, `role:<dominio>`); ownerRazon; estado: abierto\|en_seguimiento\|escalado\|en_confirmacion\|cerrado; ciclos; forma: recordatorio\|impacto\|escalada; nextCheckAt: {kind:'programada'; en}\|{kind:'ninguna'}; candidato: {kind:'ninguno'}\|{kind:'en_curso'; desenlace; confirmaciones; desde}; huerfanoDeRol; ultimoDiaVerificado; abiertoEn; expiraEn; comunicacion: {kind:'comunicado'; primerDia}\|{kind:'sin_comunicar'} }` | 200 · 400 · 401 · 403 · 404 · 503 (también `tabla_no_disponible`) | `11-07-PLAN.md:376,380-384`; vocabularios `11-CONTEXT.md:309-320` |
| 12 | `GET …/naira/open-loops/{loopId}` | `getNairaOpenLoop` · `open-loops-view` | `NairaOpenLoopDetail { loop: { …identidad; ownerAlNacer; owner; ownerRazon; huerfanoDeRol; cierre: {kind:'abierto'}\|{kind:'cerrado'; en; desenlace: resuelto_por_dato\|no_accionado\|sin_reincidencia\|expirado}; comunicacion }; eventos: NairaOpenLoopEvent[] }` (tipos `nacimiento, ciclo, cambio_de_forma, en_confirmacion, confirmacion_fallida, no_verificable, cierre`) | 200 · 400 · 401 · 403 · 404 · 503 | `11-07-PLAN.md:377,385-386`; `11-CONTEXT.md:315,319` |
| 13 | `POST …/naira/signals/{promocionId}/feedback` | `submitNairaSignalFeedback` · `signal-feedback` (4 roles) | cuerpo `{ valor: 'util' \| 'no_util' \| 'ya_lo_sabia' }` → 201 `{ kind: 'registrado'; votoId; valor; diaDelVoto }` · voto de EQUIPO, sin actor, gana el último; solo sobre ítems de `atencion`/`informativo` entregados AL LLAMADOR | 201 · 400 · 401 · 403 · 404 (no entregado al llamador o métrica fuera del rol: mismo 404) · 409 (`ventana_vencida` \| `voto_antes_de_la_entrega`) · 503 | `11-07-PLAN.md:378,387,358-367,413-416`; D11-10 (`11-CONTEXT.md:180-190`) |
| 14 | `GET …/naira/feedback/report?desde=&hasta=` | `getNairaFeedbackReport` · `feedback-report-view` (OWNER, ADMIN) | `NairaFeedbackReport { desde; hasta; definicion; reglas: { reglaId; reporte: {kind:'medido'; n; descubrimiento; yaLoSabia; noUtil; sinRespuesta; aceptacion} \| {kind:'no_medible'; razon: n_bajo_minimo\|sin_entregas} }[]; ocultosPorRol }` con `Tasa { exitos; n; ic: { inferior; superior } }`; rango ≤ 90 días | 200 · 400 · 401 · 403 · 404 · 503 | `11-07-PLAN.md:379,388-393,417-419`; D11-11 (`11-CONTEXT.md:191-199`) |

- **Contradicción resuelta:** `11-PATTERNS.md:479` proponía `naira-loops.ts` con `GET /loops`, `GET /loops/{loopId}` y `GET /feedback/summary`; D11-12 (`11-CONTEXT.md:200-205`) y el plan dueño (`11-07-PLAN.md:375-379`) fijan `naira-open-loops.ts` con `GET /open-loops`, `GET /open-loops/{loopId}` y `GET /feedback/report` ⇒ **manda el plan** (PATTERNS es insumo anterior al CONTEXT).
- Obligaciones de UI declaradas por la 11: "la lista y los botones se renderizan contra estos esquemas; el voto es sobre `atencion`/`informativo` (no sobre `seguimiento`)" (`11-07-PLAN.md:431-432`); feedback **solo por API con JWT** — ni quick-reply ni enlace de un clic en el correo (🔔 L9, `11-CONTEXT.md:190,509`) ⇒ la UI es la ÚNICA superficie de voto; la aceptación nunca sale sola (`[FB:aceptacion-nunca-sola]`, `11-CONTEXT.md:459-461`) y toda tasa sale con su `n` y su intervalo (criterio 5 de la 10).

#### T2.G — Acciones y tareas — 12-07 (PLANIFICADO)

| # | Método y ruta EXACTA | `operationId` · acción | Respuesta que la UI lee | Códigos | Fuente |
|---|---|---|---|---|---|
| 15 | `GET …/naira/actions` | `listNairaActions` · `action-view` (4 roles) | `NairaActionsList { generadoEn; desde; acciones: NairaActionSummary[]; ocultasPorRol }` · resumen = `AccionListada { proposalId; consecuencia: {kind:'reproducible'; texto}\|{kind:'no_reproducible'}; tipo: crear_tarea\|asignar_tarea\|aviso_interno\|despachar_vertical; clase: interna_reversible\|interna_irreversible\|externa; destinatario: {kind:'rol'; rol}\|{kind:'vertical'; evento}; reversible; estado: pendiente\|vencible\|aprobada\|rechazada\|vencida\|ejecutada\|no_ejecutada; venceEn; propuestaEn; puedeDecidir }` (ventana de recientes 7 días) | 200 · 400 · 401 · 403 · 404 · (409 declarado, no se produce) · 503 | `12-07-PLAN.md:372,413-417,427,433`; vocabularios `12-01-PLAN.md:213,217` |
| 16 | `GET …/naira/actions/{proposalId}` | `getNairaAction` · `action-view` | `NairaActionDetail { consecuencia { texto; tipo; clase; destinatario; reversible; venceEn } (PRIMERO); razonamiento { senal { senalId; promocionId; detectorId; metricId }; hechos: [FactSnapshot, …] con `FactSnapshot { value; source; asOf; confidence; volatility; trust }`; investigacion: {kind:'referencia'; id (= promocionId)}\|{kind:'sin_investigacion'} }; huella; estado; puedeDecidir }` · **registra el evento `presentada`** (latencia) | 200 · 400 · 401 · 403 · 404 · 409 · 503 | `12-07-PLAN.md:392-399,428,434,451-457`; D12-12/D12-13 (`12-CONTEXT.md:192-201`); `FactSnapshot` `12-01-PLAN.md:186` |
| 17 | `POST …/naira/actions/{proposalId}/decision` | `decideNairaAction` · capa 1: roles con algún permiso de aprobación; capa 2: el permiso de la CLASE | cuerpo `{ decision: 'aprobar' \| 'rechazar'; huellaVista }` (`.strict()`) → 200 `{ kind: 'decidida'; proposalId; decision: 'aprobada' \| 'rechazada'; decisionId }` | 200 · 400 · 401 · 403 (middleware sin `reason`; capa 2 `reason ∈ canal_no_permitido_para_la_clase, sin_permiso_de_la_clase`) · 404 · 409 (`reason ∈ clase_incoherente, vencida, no_reproducible, huella_distinta, procedencia_no_disponible, ya_decidida`, en ese orden) · 503 | `12-07-PLAN.md:369-378,429,435`, P1 (`:465-`) |
| 18 | `GET …/naira/tasks` | `listNairaTasks` · `task-view` (4 roles) | `NairaTasksList { generadoEn; tareas: { tareaId; proposalId; loopId; detectorId; owner: 'role:<dominio>'; estado: abierta\|cancelada\|cerrada_por_loop; creadaEn }[]; ocultasPorRol }` | 200 · 400 · 401 · 403 · 404 · 503 | `12-07-PLAN.md:419-422,430,436`; `12-03-PLAN.md:321,330` |
| 19 | `POST …/naira/tasks/{tareaId}/cancel` | `cancelNairaTask` · `task-cancel` (OWNER, ADMIN) | 200 `{ kind: 'cancelada'; tareaId }` (sin actor: 🔔 H8) | 200 · 400 · 401 · 403 · 404 · 409 · 503 | `12-07-PLAN.md:423-424,431,436` |

- **Contradicción resuelta:** `GET /actions/latency` (`12-RESEARCH.md:547`, A9) y `GET /actions/approval-latency` (`12-PATTERNS.md:536,711`) **no existen**: D12-13 "Sin endpoint para la agencia en v1" (`12-CONTEXT.md:197-201`), 🔔 H9 "Solo Leasefy" (`:552`), y el plan dueño "SIN endpoint de latencia para la agencia" (`12-07-PLAN.md:437`; E-1207-d `:570`) ⇒ **la UI no construye vista de latencia** (además sería cuasi-identificadora con un solo aprobador, T6). `naira-actions.ts` (PATTERNS) vs `naira-acciones.ts` (D12-19, `12-CONTEXT.md:228`) es nombre de archivo: no toca a la UI.
- Obligaciones de UI declaradas por la 12: "el esquema OpenAPI declara `consecuencia` PRIMERO; la 13 pone `razonamiento` detrás de un tap" (`12-CONTEXT.md:192-194`); `huellaVista` = la `huella` que se MOSTRÓ (409 `huella_distinta` ⇒ re-leer y re-mostrar, jamás reintentar con la nueva sin volver a mostrar); `puedeDecidir` gobierna los botones (cero botones muertos, molde `PilotoCajon.tsx:25-28`); v1: acciones solo a un ROL (🔔 H2), sin propuestas desde el chat (H11) ni en el briefing (H12), WhatsApp tipado sin cablear (H3).

#### T2.H — Resumen de existencia y enmiendas que la UI debe consumir

| Grupo | Existen (código, sin desplegar) | Planificados | Plan dueño |
|---|---|---|---|
| Memoria | 5 (#1-5) | 1 (#6 promoción) | 08-05 / 11-07 |
| Permisos | 1 sin `naira` (#7) | extensión aditiva | 10-06 |
| Conversación | 0 | 1 (#8) | 9.5-06 |
| Briefing + detalle | 0 | 2 (#9-10) | 10-06 |
| Configuración de la 10 | 0 | 12 (#10a-g) | 10-06 |
| Loops + feedback | 0 | 4 (#11-14) | 11-07 |
| Acciones + tareas | 0 | 5 (#15-19) | 12-07 |
| **Total** | **5** (+ `/my-permissions` sin `naira`) | **25** | |

**Enmiendas pendientes de 9.5/10/11/12 que tocan lo que la UI lee** (TODAVÍA no aplicadas; `HANDOFF-2026-09-25.md:4-5,62-64`): ninguna **renombra** un campo o ruta que la UI consuma; todas son aditivas o semánticas y se consumen con el nombre del contrato publicado:
- 11-06 ensancha `SECCIONES_DEL_BRIEFING += 'seguimiento'`, `RAZONES_DE_DIGEST += 'loop_en_curso'` y `LoopsAbiertos` (`11-CONTEXT.md:405-410`) ⇒ el zod de `seccion` incluye `seguimiento` y el voto lo excluye.
- 12-07 (E2, `12-07-PLAN.md:451-457`) agrega `estado` y `puedeDecidir` a `DetalleDeAccion` y fija `destinatario` como unión; (E3) `investigacion.id` = `promocionId` ⇒ la causa se pide a `GET /signals/{promocionId}`.
- 10-06 agrega `notify-company-preferences-edit` (P2).
- E12-7 (`12-CONTEXT.md:529`) conserva el literal `accion_en_fase_12` de la negativa ⇒ la UI lo traduce ("las acciones se aprueban en el Piloto").
- E11-9/E11-10 (`11-CONTEXT.md:533-534`): voto de equipo y dueño solo `role:` — semántica, sin rename.
- **Inventario del orquestador, mismo día:** `ENMIENDAS-PASADA-UNICA.md` (commit `e0f812ed` de `agent-account-manager`, 2026-09-27 17:06, "nada aplicado", 58 enmiendas) deja dos 🔔 que tocan lo que la UI vería: **🔔-A** (`:162-167`) — si el chat produce `ActionProposal` (lectura 9.5-E1) o solo la negativa `accion_en_fase_12` (E12-7/H11); la UI se planifica con H11 (negativa, sin propuesta) y lo declara; **🔔-C** (`:177-179`) — renombre condicional de `acciones_en_fase_12` (razón de sección vacía; hoy no viaja por la API, sí viajaría con E13-3/E13-4). Su §5 "Fase 13 — pendiente" (`:322-324`) espera las E13 de este research.

***
### T3 — Cómo consume hoy el front al agente

**Cliente HTTP.** No hay un cliente único del agente: cada servicio arma `${process.env.NEXT_PUBLIC_AGENT_URL}${path}` y llama a `agentFetch` (`src/lib/api/agent-fetch.ts:99-127`), que agrega `Authorization: Bearer <token de Supabase en memoria>` vía `agentAuthHeaders` (`src/lib/api/agent-auth.ts:16-20`; el agente NO lee cookies, así que nada de `credentials: 'include'`) y ante un 401 espera UNA vez un token distinto del `AuthProvider` (≤ 3 s, `agent-fetch.ts:51-74`) — nunca renueva por su cuenta (revocaría la familia de refresh tokens, `:20-35`). Un 401 marcado con `code` de sesión muerta cierra la sesión (`:110-116`). Hay llamadas con `fetch` pelado todavía (`PermissionsContext.tsx:74`, `ai-hub-chat.ts:727`, `use-ai-hub-landing.ts:56`). El chat usa `POST` + SSE leído con `fetch` + reader (`ai-hub-chat.ts:1-16`).

**Servicios que pegan al agente y su forma de error.** El molde vigente de una superficie de agentes es `src/lib/api/piloto.ts`: `getJson` (`:145-153`) devuelve `{ data: null, notAvailable: true }` ante 404 ("estado vacío amable") y `throw new Error(String(res.status))` ante cualquier otro no-2xx (`:149-150`). El hook guarda `err.message` como string (`use-piloto-briefing.ts:59-61`) — **sin limpiar `data`** — y la vista decide. `src/lib/errores/clasificar.ts` recupera el status desde ese string (`statusDe`, `:84-106`: el comentario narra el bug de producción en el Piloto — un 403 se pintaba igual que un 500) y lo traduce a `noExiste | sinPermiso | sinSesion | red | servidor` con `sePuedeReintentar` (`:26-38,124-160`); `esSinPermiso` (`:251-253`) sirve para llamadas de apoyo donde el 403 es la respuesta correcta. El agente de mantenimiento tiene su propio traductor (`src/lib/hooks/mantenimiento/traer-del-agente.ts:35-37,49-58`: 404 = agente apagado, 401/403 = sin permiso).

**¿Algún servicio ya evita datos parciales ante 403?** No como regla: (a) los hooks del Piloto conservan el `data` anterior cuando un refetch falla (`use-piloto-briefing.ts:56-61`); (b) `lecturaDelGerente` sí se descarta si hay error (`piloto/page.tsx:125-127`), pero el pulso recibe `data` y `error` a la vez (`:178-182`) y decide el componente; (c) el cajón dice "no se pudo consultar" en vez de pintar vacío (`PilotoCajon.tsx:29-31`), que es el principio correcto pero no cubre el dato viejo. ⇒ El cliente de Naira fija la regla en el tipo (T4): **un estado no-`ok` no tiene campo `data`**.

**Tipos generados.** `pnpm api:gen` = `bash scripts/api-gen.sh` (`package.json:18`): intenta el agente vivo en `http://localhost:4000/openapi.json` con un guardarraíl que aborta si el vivo trae MENOS rutas que el snapshot (`scripts/api-gen.sh:26,42-63`), si no cae a `scripts/openapi-snapshot.json` (`:79-87`) y corre `openapi-typescript` a `src/lib/api/generated/agent.ts`. `api:check` (`package.json:20`) es manual (el CI no lo corre, `CLAUDE.md` §Gates). El snapshot del front tiene **309 paths** y viene de `origin/develop` del agente (tiene `/ai-hub/briefing`, `/ai-hub/pulso`…); el de `agent-account-manager` tiene **62 paths** y es el único con `naira` (5). **Consecuencia:** hoy no hay forma de generar tipos de Naira sin perder rutas: copiar el snapshot de `agent-account-manager` borraría ~247 paths del front en silencio (el guardarraíl solo mira el modo vivo). Los tipos de Naira se escriben A MANO como espejo del contrato (precedente: `piloto.ts:29-137` define sus tipos a mano; 31 archivos sí importan de `generated/`) hasta que el snapshot canónico del agente (`pnpm openapi:dump` en `develop` con Naira mergeada) los traiga; ese día se agrega un test de paridad espejo↔generado (Q-OpenAPI). Para endpoints que no existen en el agente, `api:gen` no puede generar nada: el espejo es la única fuente y se marca con `// fuente: <plan>:<línea>` por esquema.

**Permisos del agente en el front.** `PermissionsProvider` (montado en `layout.tsx:359`) pide EN PARALELO `/inmobiliaria/agency/my-permissions` al back y `/api/agency/{agencyId}/my-permissions` al agente (`PermissionsContext.tsx:60-79,125-150`); cada uno cae a `null` por separado. `canAccess(module, action)` (`:194-216`): si `isAgentModule(module)` resuelve contra el payload del agente con la postura del módulo (`agent-module-access.ts:52-65`: `cobranza`/`cotizador` FAIL CLOSED; `estudio`/`matching`/`avaluos` ABSENT = ALLOWED); si no, va al monolito donde `isAdmin ⇒ true` (`:204`). `agentAccessStatus` distingue `resolviendo | resuelto | sin-verificar` (`:27,177-192`) para no confundir "no sé" con "no". **`naira` no está en ninguna de las dos listas** (`agent-module-access.ts:33-34`) ⇒ hoy `canAccess('naira', x)` = `true` para un admin del monolito y `false` para el resto, sin mirar el agente. El tipo del payload (`AgentModulePermissions`, `:24-31`) no tiene `naira`.

**Guards.** `PageGuard` (`src/components/auth/PageGuard.tsx:39-60`): `hasAccess = isAdmin || (moduleAllowed && roleAllowed)` (`:48`) y ante denegación **redirige a `/panel/inmobiliaria`** (`:50-54`) — inservible para un bloque dentro del Piloto y con bypass de admin. `PermissionGate` (`src/components/auth/PermissionGate.tsx:29-57`): renderiza hijos si `canAccess(module, action)`, nada mientras carga, y un "Acceso restringido" (o `fallback`) si no — sin bypass para módulos de agente. `AgencyRoleGuard` gatea por rol del front (`managers` = ADMIN/AGENTE, `agency-roles.ts:18`), que NO sirve para Naira (el rol del front no predice la matriz). El test `gates-del-panel.test.ts:51-68,85-87` exige que todo `module` nombrado exista en el back o sea `isAgentModule` ⇒ agregar `naira` a `agent-module-access.ts` lo vuelve un módulo válido para guards y para ese test.

**Mapeo de roles front ↔ agente (medido):**

| Front (`agency-roles.ts:5-10`, del monolito) | Agente (`agency_members.role`, `agency-role.ts:95`) | Fuente del mapeo | Qué ve de Naira (matriz T2.B) |
|---|---|---|---|
| (creador de la agencia; `isAdmin` del monolito) | `OWNER` (único por tenant, `agency-role.ts:30`) | alta de la agencia | todo, incluido `action-approve-external` |
| `ADMIN` | `ADMIN` | `origin/develop:src/onboarding/steps/members-core.ts:102-110` | todo salvo `action-approve-external` |
| `AGENTE` | `OPERATOR` | ídem (`AGENTE: 'OPERATOR'`) | lectura + proponer procedural + votar + preguntar + `legacy-queue-view` |
| `CONTADOR` | `VIEWER` ("KNOWN GAP — least-privilege placeholder") | ídem (`CONTADOR: 'VIEWER'`) | lectura + votar + preguntar + recall |
| `VIEWER` | `VIEWER` | ídem | lectura + votar + preguntar + recall |

Precedente del error a no repetir: `PilotoBandeja.tsx:133` decide `puedeActuar = agencyRole === null || agencyRole !== 'VIEWER'` con el rol del FRONT; un CONTADOR ve el botón y el micro le devuelve 403 porque para el agente es VIEWER. En Naira toda decisión de UI sale del arreglo `naira` de `/my-permissions` (y aun así el 403 del agente manda).

***

### T4 — Mock-first sin datos que parezcan medidos

**El patrón que existe** (`CLAUDE.md` §"Contratos consumidos"): el simulado es opt-in y nunca corre en producción — `getApiConfig()` = `NODE_ENV === 'production' ? false : NEXT_PUBLIC_USE_MOCK_API === 'true'` (`src/lib/api/config.ts:43-51`), `isMockMode()` (`:70-72`). Mientras está prendido, `AvisoModoSimulado` pinta un aviso fijo, `role="status"`, que no se puede cerrar ("Modo simulado. Los datos de esta pantalla son inventados…", `src/components/estado/AvisoModoSimulado.tsx:39-70`), montado una vez en el layout (`layout.tsx:337`). El precedente más cercano es mantenimiento: hooks que eligen `getMockInbox()` solo con el opt-in (`src/lib/hooks/mantenimiento/use-mantenimiento-inbox.ts:10-12,29,114-117`) — y que igual salió del catálogo por no tener backend (`arquitectura-del-panel.ts:195-203`).

**Lo que NO se copia:** (1) el disparador de `funnel.service.ts:24-28` "falta `NEXT_PUBLIC_AGENT_URL` ⇒ mock": con `.env.example` sin esa variable y con `NEXT_PUBLIC_USE_MOCK_API=true` (`.env.example:42`), un entorno recién copiado serviría fixtures sin que nadie lo pidiera; (2) el comentario obsoleto de la skill `agent-api-contract` ("mock por defecto").

**Recomendado para Naira:**
1. **Contrato espejo con zod** (`src/lib/api/naira/contrato.ts`, zod `^3.25.76` ya es dependencia, `package.json`): un esquema por respuesta de T2 con el nombre EXACTO del `<contrato_publicado>` y `// fuente: <plan>:<línea>`; `z.enum` con los vocabularios literales; uniones discriminadas por `kind`; objetos `.strict()` donde el agente serializa "campo por campo" (10-06 P14, 11-07) para que un campo nuevo o renombrado se detecte.
2. **Fixtures que pasan por el contrato:** `src/lib/api/naira/simulado/*.ts`; un test parsea CADA fixture con su esquema (un fixture hecho a la medida del componente, y no del contrato, queda rojo).
3. **Estados en el tipo, no en la disciplina:**
   `EstadoNaira<T> = { kind: 'cargando' } | { kind: 'ok'; data: T; origen: 'agente' | 'simulado' } | { kind: 'sin_permiso' } | { kind: 'no_disponible' } | { kind: 'no_encontrado' } | { kind: 'conflicto'; razon: string } | { kind: 'contrato_roto' } | { kind: 'fallo'; reintentable: boolean }` — solo `ok` lleva `data`; `origen: 'simulado'` obliga al componente a pintar la marca.
4. **Marca visible y verificable:** además del aviso global, cada bloque de Naira con `origen: 'simulado'` pinta un chip "Simulado" (texto, no solo color) y el contenedor lleva `data-origen="simulado"`; un test de componente lo asevera. Los fixtures llevan `asOf` y `congeladaEn` fijos y visiblemente de ejemplo (fecha fija de fixture, no `Date.now()`), para que ninguna captura de pantalla pase por "de hoy".
5. **Se apaga** con `NEXT_PUBLIC_USE_MOCK_API` distinto de `'true'` o en `production` (test con `vi.stubEnv('NODE_ENV','production')` + opt-in ⇒ se llama a `fetch`, nunca al fixture). Un gate estático: ningún archivo fuera de `src/lib/api/naira/` importa `simulado/`.
6. **Cuándo el agente contesta 404 a TODO Naira** (apagada, sub-flag, o ruta aún no desplegada en ese agente) ⇒ `no_disponible` y el bloque NO se dibuja (el Piloto queda como hoy); no se cae al simulado.

***
### T5 — Semántica de presentación desde los contratos

**¿De dónde sale el `asOf` de cada número?**

| Superficie | Número | Su `asOf` | Otra marca temporal | Fuente |
|---|---|---|---|---|
| Briefing / detalle | `item.valor` (+ `unidad`) y el numeral del `titulo` (renderizado desde el mismo ítem) | `item.asOf` (ISO del `Fact`) | `congeladaEn`, `corte` (06:45 Bogotá), `dia` | `10-CONTEXT.md:260-263`; `10-06-PLAN.md:333-336`; `renderizarConValor` usa los 4 campos del ítem (`10-04-PLAN.md:383`) |
| Conversación | lo que haya en `texto` | `asOfs[]` **por respuesta, no por número** | — | `9.5-06-PLAN.md:338-341` ⇒ E13-4 |
| Acción (detalle) | cada `hechos[i].value` | `hechos[i].asOf` (`FactSnapshot`) | `venceEn`, `propuestaEn` | `12-01-PLAN.md:186`; `12-07-PLAN.md:395-399` |
| Loops | no hay números de negocio (solo `ciclos`) | — | `abiertoEn`, `ultimoDiaVerificado`, `nextCheckAt`, `expiraEn` | `11-07-PLAN.md:380-383` |
| Reporte de feedback | `n`, `exitos`, `ic` | ninguno: se calcula al pedir | `desde`, `hasta` (se muestra el rango) | `11-07-PLAN.md:388-393` |
| Memoria | (una memoria `inferred` no sustenta números, crit. 2 de la 8) | — | `recordedAt`, `revision` del snapshot | `naira-memory.ts:104-116,118` |

Regla de render: el `asOf` va **pegado al número** (mismo nodo contenedor, `data-naira-numero` + `data-naira-asof`), en hora de Bogotá **explícita** (`timeZone: 'America/Bogota'`; el `formatDate` compartido usa la zona del navegador, `src/lib/i18n/i18n-context.tsx:114-124`) y con antigüedad relativa ("hace 13 h"). La UI **no** calcula rancidez (el SLA por fuente vive en `SOURCE_REGISTRY` del agente; copiarlo sería una segunda verdad): pinta lo que el agente declara (`tipo: 'aviso_suspension'` del briefing; `negada{fuente_rancia}` de la conversación).

**Formato del valor (EVAL-10 en la pantalla).** `valor` es un decimal en string y `unidad ∈ pct | cop | count | days` (`src/naira/metrics/types.ts:33`); el agente formatea `pct` como bps (`12.5` ⇒ 1250 bps, `10-04-PLAN.md:981`). Si el front re-formatea con su propio `formatCurrency`/`toFixed`, el mismo número puede salir distinto en el correo, el detalle y la conversación. Recomendado: el `titulo` y los textos del agente se muestran tal cual; los números sueltos pasan por UNA función `formatearValorDeNaira(valor, unidad)` sin `parseFloat` (aritmética sobre el string decimal) cuyo test fija ejemplos iguales a los del render del agente; alternativa más segura: E13-11 (el agente manda `valorRenderizado`).

**Drill-down "hasta la fuente en el ERP".** Lo que viaja: `fuente` (id del `SOURCE_REGISTRY`, 24 ids, `src/naira/volatility/registry.ts:48-330`), `metricId` (10 métricas canónicas) y, para memoria, `derivedFrom{kind:'fact'; source; ref}`. Como los 5 detectores activos emiten `affectedEntities: []` (T1 §Resumen 6), en v1 el drill-down aterriza en el **listado de la fuente**; la ficha (`[id]`) queda preparada para cuando exista E13-2. Tabla cerrada propuesta (rutas medidas en `src/app/panel/inmobiliaria/`, todas con `page.tsx`):

| `fuente` (métricas que la usan) | Listado en el front | Ficha (cuando haya entidad) | Nota |
|---|---|---|---|
| `public.consignaciones` (`portafolio.available_units_count`, `portafolio.vacancy_rate`, `portafolio.rent_roll_cop`) | `/panel/inmobiliaria/inmuebles` | `/inmuebles/[id]` | gate `portafolio` del monolito |
| `agent.debtor_states`, `agent.debtors` (`cartera.morosidad_rate`) | `/cobros/cobranza/deudores` | `/cobros/cobranza/deudores/[id]` | gate `cobranza` (agente, fail-closed) |
| `agent.payments` (`cartera.mora_exposure_cop`) | `/cobros/cobranza/pagos` | `/cobros/cobranza/pagos/[paymentId]` | alternativa: `/cobros/recaudo` 🔔 |
| `agent.payment_promises`, `agent.payment_plans` (`cartera.promises_open_count`, `cartera.mora_exposure_cop`) | `/cobros/cobranza/acuerdos` | `/cobros/cobranza/pagos/planes/[planId]` | promesas y planes fusionados en "Acuerdos" (`agentWorkspaceNav.ts:290-319`) |
| `agent.escalations` (`cartera.escalations_open_count`, `sla.escalacion_vencida_count`) | `/cobros/cobranza/escalaciones` | `/cobros/cobranza/escalaciones/[id]` | |
| `agent.disputes` (`cartera.disputes_open_count`) | `/cobros/cobranza/disputas` | — | |
| `agent.recovery_outcomes` (`cartera.mora_exposure_cop`) | `/cobros/cobranza` (Resumen) | — | sin listado propio |
| `agent.prospect_leads` (`prospectos.leads_sin_contacto_count`) | **sin destino verificado** | — | `/pipeline` lista ítems del back, no `agent.prospect_leads` [ASUMIDO] ⇒ se muestra la fuente sin enlace 🔔 |
| cualquier otra | sin enlace | — | se nombra la fuente; nunca se interpola un string del agente en un `href` |

Tipos de entidad que la ficha tendría que mapear el día que haya entidades (`PROJECTED_NODE_TYPES`, `src/naira/graph-projection/node-types.ts:60-68`): `property`, `debtor`, `payment`, `lead`, `approval_request`, `member` (**nunca** se enlaza: B-5), `escalation`. ⚠️ En `cambios-nico-10` Cobranza se mudó a `/pagos/cobranza` (`git show cambios-nico-10:src/lib/nav/arquitectura-del-panel.ts:343`): la tabla se re-mide al ejecutar y un test exige `page.tsx` por cada destino (molde `tienePagina`, `arquitectura-del-panel.test.ts:63-77`).

**Las 6 categorías de salida → DATO / INFERENCIA / RECOMENDACIÓN.** `SECCIONES_DE_SALIDA = KNOWLEDGE, LIVE_DATA, MEMORY, INFERENCE, RECOMMENDATION, ACTION` (`09-03-PLAN.md:353-355`). Mapeo recomendado (🔔 Q7):

| Sección del agente | Categoría en la UI | Condición |
|---|---|---|
| `LIVE_DATA` | DATO | siempre (número con `Fact`, `asOf` y fuente) |
| `KNOWLEDGE` | DATO (documento) | política/ficha citada por `sourceRef`; su contenido no se muestra en v1 (🔔 C9, `9.5-CONTEXT.md:365-366`) |
| `MEMORY` | DATO si `provenance ∈ observed, stated_by_human`; INFERENCIA si `inferred` | la procedencia viaja en cada ítem (`naira-memory.ts:104-116`) |
| `INFERENCE` | INFERENCIA | toda la causa investigada es INFERENCE por construcción (`InferenciaPersistida`, `9.5-04-PLAN.md:325-327`) |
| `RECOMMENDATION` | RECOMENDACIÓN | — |
| `ACTION` | RECOMENDACIÓN (acción propuesta, requiere aprobación) | en v1 la sección sale `vacia{acciones_en_fase_12}` en la investigación (E12-8); las acciones reales llegan por `/actions` |

**Qué contrato permite asignar la categoría HOY (sin enmiendas):** por el CAMPO de origen, no por el texto — `item.valor`/`titulo` ⇒ DATO; `causa.citada.citas[]` ⇒ INFERENCIA; `DetalleDeAccion.consecuencia` ⇒ RECOMENDACIÓN; ítem de memoria ⇒ por `provenance`. **La conversación no se puede categorizar**: es UN `texto` que mezcla secciones (⇒ E13-4; hasta entonces la respuesta entera se rotula con su `kind` y se declara "respuesta compuesta").

**`claimClass` ∈ {`aritmetica`, `asociacion`, `hipotesis`}** (`09-03-PLAN.md:355`). Se DERIVA en el linter: `hipotesis` si la oración trae `mecanismo.kind === 'hipotesis'`; `asociacion` si cita `concentracion`/`cruce` respaldados; `aritmetica` si solo cita `fact`/`driver` (`09-03-PLAN.md:631-634`). Una hipótesis NO sale sin `banda` (de `BANDAS_DE_PROBABILIDAD`, 7 bandas por ADR-005, `09-03-PLAN.md:59,175,298`), `alternativa` (`{kind:'driver'; entidad}` \| `{kind:'sin_driver_alternativo_en_la_descomposicion'}`) y `discriminador { metricId; direccionEsperada: 'sube' \| 'baja' }` (`09-03-PLAN.md:370-372`). **Ningún contrato de API lo expone**: se persiste `{ plantilla; texto: TextoRenderizado }` (`9.5-04-PLAN.md:324`), el detalle entrega `citas: string[]` (`10-06-PLAN.md:336`) y la conversación un `texto`. ⇒ E13-3/E13-4. Mientras tanto: la UI rotula cada cita como INFERENCIA y **no** inventa `claimClass` (prohibido inferirlo de palabras como "probablemente"; FG13-8).

**`no_signal` con inventario.** Es salida de primera clase con qué detectores corrieron, `asOf` por fuente, descartes por compuerta y estado de loops (`ROADMAP.md:278`, crit. 3 de la 9; `LoopsAbiertos` de la 11, `11-CONTEXT.md:333-336`). La 10 lo pone en el correo (`FRASE_DE_SILENCIO = 'Hoy no hay nada que requiera tu atención'`, `10-CONTEXT.md:315-316`, `10-04-PLAN.md:1271`) pero la API no lo sirve (T2.D) ⇒ E13-5. Regla para la UI: **nunca** pintar "no hay nada" sin inventario; si el inventario no llegó, decir "Naira no publicó el inventario de hoy" (distinto de silencio). Los conteos propios de Naira no se escriben como numeral (🔔 N17, `10-CONTEXT.md:394-396,496`).

**Declaraciones de la conversación.** `negada{razon}` + `puedoResponder` (nombres conversacionales sin dígitos, 🔔 C8) — la UI ofrece esos nombres como sugerencias, no como botones que reescriban la pregunta; `bajo_k` (el grupo quedó bajo `k`: la respuesta **reencuadra** hacia la pregunta por entidad y NO dice el `n`, `9.5-CONTEXT.md:94`); `dimension_de_persona` (la persona no es un eje: B-5); `fuente_rancia` (FRESH-01: se declara, no se responde con dato vivo) y `no_pude_leer` ⇒ `fallida{lectura_fallida}` (`9.5-04-PLAN.md:45,319,384`); `bloqueada{motivo}` (una compuerta frenó la respuesta: la UI dice cuál, en palabras); `respondida.noServidos: ['grafo_sin_filtro_de_rol']` (🔔 C4). El resto de declaraciones (`total_sin_filtrar`, `desglose_suprimido`, `causa_citada`, …, `KINDS_DE_DECLARACION`, `9.5-04-PLAN.md:344-346`) viaja DENTRO de `texto`: la UI lo muestra como texto plano, sin markdown.

***

### T6 — B-5 en la UI

**Regla** (brief `:42-43`; `12-CONTEXT.md` §2.1): ninguna métrica por persona, ni "quién cerró", ni ranking; asignar solo a un rol (🔔 H2, `12-CONTEXT.md:545`); quién aprobó solo en auditoría (🔔 H7, `:550`). Una pieza es neutral si no permite asociar un acto, caso, tiempo o resultado a una persona del equipo (directo, por join o por cuasi-identificador).

| Campo que expone actor/persona | Contrato | ¿La UI lo renderiza? | Razón |
|---|---|---|---|
| `writtenBy: {kind:'user'; userId}` de cada ítem de memoria | #1 (EXISTE) | **Solo la CLASE**: "una persona del equipo" / "Naira (sistema)" — **sin** resolver `userId` a nombre (🔔 Q5) | MEM-07 exige que `writtenBy` sea visible (`ROADMAP.md:261`); resolverlo a nombre asocia una creencia a una persona y habilita contar "quién le enseña qué a Naira" |
| `content.erased.erasedBy` | #1 | Igual: la clase | ídem |
| `pendingProposals[].proposedBy.userId` | #1 | Clase; y "tú" SOLO si se puede comparar con el `userId` propio del agente — el front no lo conoce (el agente resuelve `userId` por `(tenant, email)`, D8-6, `08-CONTEXT.md:132-135`) ⇒ no se muestra | ídem |
| `/role-assignments` → `asignaciones` (userId por rol de dominio) | #10b (PLANIFICADO) | Solo si Q4 lo mete en alcance, en Configuración y para OWNER/ADMIN; nunca cruzado con loops ni resultados | Es configuración de ruteo (🔔 N5/A11), no desempeño; cruzarla con desenlaces SÍ lo sería |
| Autor del recall | #10f | No se muestra (la UI solo envía el texto) | 🔔 N7: se guarda con autor, para counsel |
| Dueño de un loop / de una tarea | #11, #12, #18 | Sí: siempre `role:<dominio>` (CHECK solo admite `role:`) | `11-CONTEXT.md:309` (`OwnerDeLoop = role:${DomainRole}`), E11-10; `DuenoDeTarea` `12-01-PLAN.md:223` |
| "Quién cerró" / "quién canceló" | #19 | No existe el campo | 🔔 H8: rechazos y cancelaciones sin actor |
| Quién aprobó (`approved_by_user_id`, binding) | ninguno de la UI | No existe endpoint | Solo en `automated_decisions` (T-323), un lector, 🔔 H7 |
| Latencia de aprobación | ninguno | **No se construye** | D12-13 / H9: solo Leasefy; con un aprobador es cuasi-identificadora |
| Reporte de feedback | #14 | Sí, por regla y tenant, con `n` e IC | Voto de equipo sin actor (D11-10/D11-11) |
| Votos individuales | #13 | La UI muestra "tu equipo marcó…" solo lo que devuelve el POST; no hay lista de votos | El `userId` no se persiste (`11-07-PLAN.md:416`) |
| Briefing por destinatario | #9 | Solo el propio (`miembro:<userId del principal>`) | 10-06 P7; no hay vista "qué recibió cada uno" |
| `puedeDecidir` (acción) | #15-16 | Sí | Es del llamador, no de un tercero |

**Del front existente, no tocar ni cruzar:** Configuración › Equipo monta un ranking por persona (`AgenteLeaderboard`, `src/app/panel/inmobiliaria/configuracion/SeccionEquipo.tsx:31,286`). Ninguna pieza de Naira enlaza a él ni lo alimenta.

***
### T7 — Entorno de pruebas del front

| Pieza | Medido | Cita |
|---|---|---|
| Runner | vitest `^4.0.18`, `environment: 'happy-dom'`, `globals: true`, `include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts']` | `vitest.config.ts:8-24`; `package.json` devDeps |
| Setup | `vitest.setup.ts` reinstala `localStorage`/`sessionStorage` de happy-dom porque Node 25 expone uno nativo roto (~195 tests caían) | `vitest.setup.ts:1-80`; `vitest.config.ts:11-20` |
| Cadence en tests | `server.deps.inline` para `cadence/node_modules` + `resolve.dedupe` y alias de `react`/`react-dom` al del front (si no, "Invalid hook call") | `vitest.config.ts:25-59` |
| Testing Library | **NO es dependencia** (0 en `package.json`); los tests de componentes usan `createRoot` + `act` de React 18 y `vi.mock` antes de importar (349 archivos con `createRoot`) | `src/components/beta/ActionProposalCard.test.tsx:5`; skill `testing-patterns` (`SKILL.md:21-24`); molde `PilotoCajon.test.tsx:16-70` |
| i18n en tests | stub que resuelve contra el `es.json` REAL: `vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))`; el mock `t: (k) => k` esconde claves faltantes | `src/lib/i18n/i18n-test-stub.tsx:1-40` |
| E2E | Playwright `^1.60`, sin `webServer` (asume `:3001` corriendo), `panel-a11y` = proyecto propio en `tests/e2e/panel-a11y/` con `@axe-core/playwright` `4.11.3`; helpers `seedAuthState`, `runAndAssertAxe`, mocks con `route.fulfill` | `playwright.config.ts:15-67`; `tests/e2e/panel-a11y/ai-hub.a11y.spec.ts:1-50`; `_helpers/` |
| CI | un job requerido: pnpm 10 + Node **20** + clona `Leasefy/cadence` en `../cadence` (secret `CADENCE_REPO_TOKEN`) + `pnpm --dir ../cadence install --frozen-lockfile --ignore-scripts` + `pnpm install --frozen-lockfile` + `tsc --noEmit` + `pnpm test`; e2e solo `workflow_dispatch` y `continue-on-error` | `.github/workflows/ci.yml:40-79,97-100` |
| Node local | `v25.9.0` (el CI usa 20; el setup ya cubre el caso de Node 25) | `node --version` |
| pnpm local | `10.34.5` (compatible con `allowBuilds` de `pnpm-workspace.yaml`); store en `~/Library/pnpm/store/v10` | `pnpm --version`; `pnpm store path` |
| Worktree | **sin `node_modules`** | `ls -d …/wt-front-naira/node_modules` ⇒ no existe |
| Design system hermano | `/Users/nicolasgarcia/rent/cadence` EXISTE: `@leasefy/cadence@1.0.57`, rama `main`, commit `1eece93` (2026-09-02), con `dist/` y `node_modules/`; sus 24 dependencias coinciden con las que el lockfile del front registra para `file:../cadence` (`pnpm-lock.yaml:1129-1133,7765-7795`); peer `react ^18.2.0` = la base. `@leasefy/ui` no existe en la base ni hay `design-system` hermano | medido con `python3` sobre ambos `package.json` |
| Agente local | `http://localhost:4000/openapi.json` no responde (000) ⇒ `api:gen` caería al snapshot | `curl --max-time 2` |

**Cómo prepararía un ejecutor el entorno (sin hacerlo acá):**
1. Desde `/Users/nicolasgarcia/rent/wt-front-naira`, con `../cadence` presente (lo está): `pnpm install --frozen-lockfile`. Resuelve `file:../cadence` porque la carpeta existe y sus dependencias coinciden con el lockfile [ASUMIDO: no ejecutado]. Riesgos: el `postinstall` corre `prisma generate` (`package.json:17`), que puede necesitar bajar motores (red); `xlsx` se resuelve desde `cdn.sheetjs.com` (ya está en el store local, medido). **Prohibido** enlazar `node_modules` de `~/rent/mvp` (otro checkout, otra rama, y el brief lo veda).
2. Tests acotados: `pnpm exec vitest run <archivos>`; tipos: `pnpm exec tsc --noEmit`; a11y: requiere `pnpm dev` en `:3001` + sesión sembrada ⇒ declarado manual (como hoy en el CI).
3. Si la base de ejecución es `cambios-nico-10` (Next 15 / React 19), el paso 1 cambia: `cadence` declara peer `react ^18.2.0` (medido) ⇒ el ejecutor re-mide antes de instalar (Q6).

**Qué se puede verificar SIN instalar (lo que el plan-checker puede dar por verde):** estructura de archivos (`test -f`), presencia/ausencia por `grep -n` (p. ej. `naira` fuera de `ARQUITECTURA_DEL_PANEL`, `'naira'` en `FAIL_CLOSED_MODULES`), claves i18n en `es.json` y `en.json` con `python3 -c 'import json…'`, que cada fixture JSON tenga las claves del contrato (si los fixtures se escriben como `.json`), `bash -n`/`zsh -n` de los bloques `<automated>`. **Lo que exige instalar:** todo `vitest`, `tsc`, `next lint`, `next build` y Playwright. El plan-checker lo mide por estructura y lo DECLARA "no ejecutado" (brief `:46-48`).

### T8 — i18n y copy

- **Resolución:** `useI18n().t(key, params)` busca la clave anidada en `src/lib/i18n/locales/{es,en}.json` (`i18n-context.tsx:6-10,20-31,75-84`); interpola **solo** `{{param}}` con llaves dobles (`:37-45`); una clave faltante hace `console.warn` y devuelve la clave (`:79`). `labelKey` en `arquitectura-del-panel.ts`/`agentWorkspaceNav.ts` se resuelve igual en el consumidor (`agentWorkspaceNav.ts:56-57`).
- **Dónde viven:** `es.json` (496 KB) y `en.json` (472 KB); el Piloto usa `inmobiliaria.piloto.*` (`titulo, descripcion, kpis, bandeja, feed, flota, procesos, dock, autonomia, pulso, cajon, preparacion, gobierno, catalogo`); `naira` no aparece en ninguno de los dos (medido).
- **Guardias existentes:** toda clave del sidebar/pestañas debe existir en `es` y `en` (`arquitectura-del-panel.test.ts:175-188`); tests por dominio `src/lib/i18n/claves-*.test.ts` (molde `claves-avaluos.test.ts:1-30`: "una clave nueva que alguien agregue sólo en `es.json` sale en pantalla como la ruta de la clave para quien use inglés"); `copy-del-piloto.test.ts:1-30` caza plurales muertos y llaves simples `{x}` que el interpolador no ve.
- **Recomendado:** namespace `inmobiliaria.naira.*` (chrome de la UI: títulos, estados `sin_permiso`/`no_disponible`/`simulado`, etiquetas DATO/INFERENCIA/RECOMENDACIÓN, `claimClass`, botones de feedback, razones de negativa/409/403/`sin_entrega`) + `src/lib/i18n/claves-naira.test.ts` que exige `es`/`en` por clave y un mapa **exhaustivo** por vocabulario del contrato (`as const satisfies Record<RazonDeNegativa, string>` y equivalentes para `RAZONES_SIN_BRIEFING`, `RAZONES_DE_CAUSA_NO_CITABLE`, `RAZONES_DE_CONFLICTO_DE_DECISION`, `ESTADOS_DEL_LOOP`, `ESTADOS_DE_LA_PROPUESTA`, `VALORES_DE_FEEDBACK`, `SECCIONES_DE_SALIDA`, `CLAIM_CLASSES`) — así un valor nuevo del contrato espejo rompe `tsc`.
- **Texto que NO se traduce:** `titulo`, `texto`, `citas`, `consecuencia.texto` y el contenido de memoria llegan ya redactados en español por el agente (plantillas cerradas, tuteo, `TEXTOS_DEL_BRIEFING`, `10-04-PLAN.md:382`); con el panel en inglés se muestran en español (declarado, Q12). Se renderizan como texto plano (sin `react-markdown`, que el chat sí usa).
- **Vocabulario:** `docs/VOCABULARIO.md` gobierna nombres del panel (excepciones de R4 en `arquitectura-del-panel.test.ts:221-248`); "Naira" es nombre propio y no se traduce.

***
## Stack estándar (todo ya está en la base; la fase no instala nada)

| Pieza | Versión en la base | Para qué en la 13 | Fuente |
|---|---|---|---|
| Next.js App Router | `14.2.35` | páginas cliente del panel (sin rutas nuevas en la opción A) | `package.json` [VERIFICADO: package.json de la base] |
| React | `^18.2.0` | componentes; tests con `createRoot` + `act` | ídem |
| `@leasefy/cadence` | `file:../cadence` → `1.0.57` | `KeyValueList`, `ListRow`, `Timeline`, `Chip`, `MonoLabel`, `IconButton` (ya usados por el Piloto, `PilotoCajon.tsx:47-54`, `PilotoDock.tsx:26`) | `package.json:31`; `/Users/nicolasgarcia/rent/cadence/package.json` |
| zod | `^3.25.76` | contrato espejo y validación de cada respuesta (fail-closed) | `package.json` |
| `@phosphor-icons/react` | `^2.1.10` | iconos (no repetir los de Inicio/Chat: `AirTrafficControl`, `ChatsCircle`) | `package.json`; `arquitectura-del-panel.test.ts:151-158` |
| sonner | `^2.0.7` | toasts de feedback/decisión | `package.json` |
| vitest + happy-dom | `^4.0.18` / `^20.6.0` | unit y componentes | `package.json` |
| Playwright + axe | `^1.60.0` / `4.11.3` | `panel-a11y` del bloque de Naira (manual) | `package.json`; `playwright.config.ts:59-63` |

**Alternativas consideradas:** generar los tipos con `openapi-typescript` (ya dependencia) — descartado HASTA que el snapshot canónico del agente traiga Naira (T3); `@testing-library/react` — no se agrega (convención del repo, T7); SWR/React Query — no existen en el repo (estado con hooks propios, `CLAUDE.md` §Stack) y no se introducen.

## Auditoría de legitimidad de paquetes

| Paquete | Registro | slopcheck | Disposición |
|---|---|---|---|
| — | — | — | **Ningún paquete nuevo.** La fase usa solo dependencias ya presentes en `package.json` de la base; no corresponde slopcheck. |

**Removidos por [SLOP]:** ninguno. **Marcados [SUS]:** ninguno.

## Patrones de arquitectura

### Flujo (de la pantalla al agente y vuelta)

```
                       /panel/inmobiliaria/piloto  (Inicio, module:null, ya existe)
                                   │
          ┌────────────────────────┼─────────────────────────────────────────┐
          │ PermissionsContext     │ ¿'naira' en FAIL_CLOSED_MODULES?        │
          │ /my-permissions.naira ─┴─► canAccess('naira', acción) ── no ──► nada de Naira (Piloto como hoy)
          └────────────────────────┬─────────────────────────────────────────┘
                                   │ sí (predicción; el 403 del agente manda)
                                   ▼
      hooks use-naira-*  ──►  nairaFetch(path)  ──► ¿isMockMode()? ── sí ──► fixture ─► zod.parse ─► {ok, origen:'simulado'}
                                   │ no
                                   ▼
                       agentFetch(NEXT_PUBLIC_AGENT_URL + /api/agency/{id}/naira/…)   (Bearer; reintento 401)
                                   │
            ┌──────────┬───────────┼────────────┬──────────────┬───────────────┐
           200        403         404          409            5xx/red
            │          │           │             │               │
       zod.parse   sin_permiso  ¿acceso?      conflicto{razon}  fallo{reintentable}
       ok|contrato  (SIN data)  lista ⇒ no_disponible (bloque oculto)
       _roto                    ítem  ⇒ no_encontrado
            │
            ▼
   Bloque Naira en el Piloto ── briefing (items con asOf + fuente → FUENTE_A_RUTA → listado del ERP)
            │                 ├─ loops + feedback (POST voto) + reporte (OWNER/ADMIN)
            │                 ├─ propuestas → cajón {naira-accion}: consecuencia ▸ [tap] razonamiento ▸ decidir(huellaVista)
            │                 ├─ conversación (panel, sin persistencia)
            └── cajón {naira-senal, promocionId}: ítem congelado + causa (INFERENCIA) + entidades (E13-2)
                encabezado ─► panel "Qué cree Naira" (ver · corregir · borrar · promover · procedural)
```

### Estructura recomendada

```
src/lib/api/naira/
├── contrato.ts            # zod espejo, un esquema por respuesta de T2, `// fuente: <plan>:<línea>`
├── cliente.ts             # nairaFetch → EstadoNaira<T>; única puerta al agente para Naira
├── rutas.ts               # constructores de path (encodeURIComponent, UUID validado)
└── simulado/              # fixtures (solo vía cliente.ts con isMockMode()); cada uno pasa por contrato.ts
src/lib/hooks/naira/       # use-naira-briefing.ts, use-naira-senal.ts, use-naira-loops.ts, use-naira-acciones.ts,
                           # use-naira-conversacion.ts, use-naira-memoria.ts, use-naira-permisos.ts
src/lib/naira/
├── fuente-a-ruta.ts       # tabla cerrada `as const satisfies` (T5)
├── categorias.ts          # sección/campo → DATO | INFERENCIA | RECOMENDACIÓN
└── formato.ts             # formatearValorDeNaira(valor, unidad), formatearAsOf(iso) en America/Bogota
src/components/inmobiliaria/naira/   # NairaBloque, NairaBriefing, NairaSenal (cajón), NairaLoops, NairaFeedback,
                                     # NairaAcciones (cajón), NairaConversacion, NairaMemoria (panel), NumeroConFuente,
                                     # AsOf, CategoriaChip, ClaimClassChip, NairaSinPermiso, NairaSimuladoChip
src/lib/auth/agent-module-access.ts  # + 'naira' en FAIL_CLOSED_MODULES y `naira?: string[]` en el payload
src/app/panel/inmobiliaria/piloto/page.tsx   # monta NairaBloque; lee ?senal= / ?dia= (E13-1)
src/lib/i18n/locales/{es,en}.json    # inmobiliaria.naira.*
```

### Patrón 1 — Un solo cliente con estados cerrados (el 403 no lleva datos)
**Qué:** `nairaFetch` traduce status + cuerpo a `EstadoNaira<T>`; solo `ok` tiene `data`. **Cuándo:** toda lectura/escritura de Naira. **Por qué:** hace imposible por tipo el "dato viejo + error" de `use-piloto-briefing.ts:56-61`.

```ts
// Patrón recomendado (derivado de src/lib/api/agent-fetch.ts:99-127 y src/lib/api/piloto.ts:145-153)
export type EstadoNaira<T> =
  | { kind: 'cargando' }
  | { kind: 'ok'; data: T; origen: 'agente' | 'simulado' }
  | { kind: 'sin_permiso' }                       // 403 (middleware o capa 2): SIN data
  | { kind: 'no_disponible' }                     // 404 de acceso: Naira no habilitada / ruta no desplegada
  | { kind: 'no_encontrado' }                     // 404 de un ítem (mismo cuerpo que "no visible": no confirma existencia)
  | { kind: 'conflicto'; razon: string | null }   // 409 (huella_distinta, ya_decidida, ventana_vencida, …)
  | { kind: 'contrato_roto' }                     // 200 que no pasa el zod espejo: no se pinta nada
  | { kind: 'fallo'; reintentable: boolean }      // 5xx / red

export async function nairaFetch<T>(esquema: z.ZodType<T>, path: string, init?: RequestInit, esLista = false): Promise<EstadoNaira<T>> {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) return { kind: 'no_disponible' }            // nunca "sin URL ⇒ simulado" (≠ funnel.service.ts:24-28)
  let res: Response
  try { res = await agentFetch(`${base}${path}`, init) } catch { return { kind: 'fallo', reintentable: true } }
  if (res.status === 403) return { kind: 'sin_permiso' }
  if (res.status === 404) return esLista ? { kind: 'no_disponible' } : { kind: 'no_encontrado' }
  if (res.status === 409) return { kind: 'conflicto', razon: await razonDe(res) }   // `reason` puede faltar (middleware)
  if (!res.ok) return { kind: 'fallo', reintentable: res.status >= 500 }
  const r = esquema.safeParse(await res.json())
  return r.success ? { kind: 'ok', data: r.data, origen: 'agente' } : { kind: 'contrato_roto' }
}
```
(Con E13-6 el 404 de acceso se distingue por `reason`; sin ella, "lista" vs "ítem" es la heurística declarada.)

### Patrón 2 — El hook reemplaza el estado entero (nunca mezcla)
```ts
// setEstado(await nairaFetch(...)) — un único setState; jamás setError sin tocar data.
// Al cambiar de agencia o de rol (PermissionsContext.refetch) se vuelve a { kind: 'cargando' } antes de pedir.
```
Molde de cancelación: `AbortController` como `use-piloto-briefing.ts:36-51`.

### Patrón 3 — Gate de UI por el arreglo `naira` (fail-closed) y aun así respetar el 403
`PermissionGate module="naira" action="briefing-view" fallback={null}` (sin bypass de admin, `PermissionGate.tsx:29-37`) para decidir si se monta; `agentAccessStatus === 'sin-verificar'` ⇒ "no pudimos verificar tu acceso" (no ocultar en silencio, `PermissionsContext.tsx:41-52`). **Nunca** `PageGuard` (redirige y tiene `isAdmin ||`, `PageGuard.tsx:48-54`) ni `AgencyRoleGuard` (rol del front).

### Patrón 4 — El cajón como detalle (sin página nueva)
Agregar aperturas `{tipo:'naira-senal'; promocionId}` y `{tipo:'naira-accion'; proposalId}` a la pila existente (`piloto/page.tsx:96-116`, `PilotoCajon.tsx:18-24`); el cajón pide el detalle SOLO al abrirse (la 12 registra `presentada` en el GET, `12-07-PLAN.md:428`): nada de prefetch en hover ni polling del detalle de acción.

### Patrón 5 — Número con fuente
`<NumeroConFuente valor unidad asOf fuente />`: el valor (formateado por `formato.ts` o texto del agente), el `asOf` pegado, y el enlace a `FUENTE_A_RUTA[fuente]` si existe (sin enlace si no: se nombra la fuente). `data-naira-numero`, `data-naira-asof`, `data-naira-fuente` para los tests.

### Anti-patrones
- **Fila, workspace o ruta `/naira`:** rompe el criterio 1, el test de 17 módulos (`arquitectura-del-panel.test.ts:197-203`) y el precedente de mantenimiento.
- **Gatear con `agencyRole` del front:** CONTADOR es VIEWER para el agente (T3).
- **Heredar el patrón `throw new Error(String(status))` + `setError` sin limpiar `data`** (`piloto.ts:150`, `use-piloto-briefing.ts:59-61`).
- **Poner la conversación en el Chat tal como está:** persiste en `localStorage` (`useBetaChat.ts:88`) contra 🔔 C2 y mezcla dos cerebros.
- **Recalcular o comparar números en el front** (EVAL-10: lo congelado manda; `10-06-PLAN.md` P4).
- **Inferir `claimClass`/categoría del texto**; **renderizar texto del agente como markdown/HTML**.
- **Mostrar el briefing del Gerente y el de Naira a la vez sin decisión (Q2).**

## No construir a mano

| Problema | No construir | Usar | Por qué |
|---|---|---|---|
| Autorización | matriz de Naira en el front | `/my-permissions.naira` + 403 del agente | V-7: la matriz vive en el agente (`ROADMAP.md:387`) |
| Token / reintento 401 | `fetch` propio con refresh | `agentFetch` | refresh manual revoca la familia de tokens (`agent-fetch.ts:20-35`) |
| Clasificar errores para copy | otra tabla de estados | `clasificarFallo`/`esSinPermiso` (copy) + `EstadoNaira` (tipo) | ya resuelve 401 vs sesión muerta (`clasificar.ts:84-160`) |
| Aviso de simulado | cartel propio | `AvisoModoSimulado` (global) + chip por bloque | un aviso silencioso es peor que ninguno (`AvisoModoSimulado.tsx:3-17`) |
| Validación de respuestas | chequeos `typeof` a mano | zod (`z.discriminatedUnion`, `.strict()`) | uniones por `kind` con muchos vocabularios |
| Detalle lateral | drawer nuevo | `PilotoCajon` (pila, volver, cero botones muertos) | pedido explícito de Nico (`PilotoCajon.tsx:6-13`) |
| Formato de fecha en Bogotá | aritmética de horas | `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })` (precedente `src/lib/recaudo/meses.ts:30`) | `formatDate` compartido usa la zona del navegador |
| Tipos del agente (cuando existan) | editar `generated/agent.ts` | `pnpm api:gen` desde el snapshot canónico | `CLAUDE.md` §Contratos |

**Idea clave:** la 13 no tiene conocimiento propio del dominio; todo lo que "sepa" (quién puede, qué número, qué causa, qué clase de afirmación) tiene que venir del agente, y donde el contrato no lo trae la respuesta correcta es una enmienda, no una reconstrucción en el front.

***
## Riesgos y trampas (falsos verdes candidatos `FG13-k`)

| # | Falso verde | Por qué pasa | Cómo se evita (marcador y mutación por la causa, en COPIA `mktemp -d`) |
|---|---|---|---|
| **FG13-1** | "El 403 no muestra datos" verde con datos viejos en pantalla | el test monta el componente con el estado 403 desde cero; nunca prueba "200 → refetch 403" | `[N13:403-sin-residuo]`: el MISMO hook recibe 200 con fixture (token único sembrado) y luego 403; asevera `kind === 'sin_permiso'` y que el contenedor NO contiene el token ni ningún `[data-naira-numero]`. Mutación: el hook conserva `data` al fallar ⇒ rojo |
| **FG13-2** | Fixtures verdes que no son el contrato | el fixture se escribe a la medida del componente | `[N13:fixture-es-contrato]`: cada fixture pasa `contrato.ts` con `.strict()`; mutación: renombrar un campo del fixture ⇒ rojo |
| **FG13-3** | "`asOf` visible" verde con una fecha cualquiera en la página | se busca texto de fecha en todo el documento | `[N13:asof-pegado]`: por cada `[data-naira-numero]` existe un `[data-naira-asof]` dentro del mismo nodo contenedor con el ISO del fixture; mutación: mover el `asOf` al pie ⇒ rojo |
| **FG13-4** | "Sin sección paralela" verde con una ruta nueva | el test mira solo `ARQUITECTURA_DEL_PANEL` | `[N13:sin-seccion-paralela]`: 0 `naira` en `ARQUITECTURA_DEL_PANEL` y `AGENT_WORKSPACES`; no existe `src/app/panel/inmobiliaria/naira/`; ningún `href` a `/naira`; los componentes de Naira solo se importan desde `piloto/**` (y lo que Q1/Q4 habiliten); mutación: crear `naira/page.tsx` ⇒ rojo |
| **FG13-5** | Gate verde que deja pasar al admin del monolito | `naira` no es módulo de agente ⇒ `canAccess` usa `isAdmin` (`PermissionsContext.tsx:204`) | `[N13:naira-fail-closed]`: `isAgentModule('naira')` y `canAccess('naira','briefing-view')` = false con payload SIN `naira` aunque `isAdmin` sea true; mutación: sacar `'naira'` de `FAIL_CLOSED_MODULES` ⇒ rojo |
| **FG13-6** | Tests verdes porque todo Naira está oculto | fail-closed sin permisos ⇒ nada se monta ⇒ ningún assert falla | control positivo en cada archivo: con `naira: [acciones]` el bloque SÍ pinta el token del fixture (`[N13:control-positivo]`) |
| **FG13-7** | Simulado en producción | la guarda copia `funnel.service.ts` (falta de URL ⇒ mock) | `[N13:simulado-nunca-en-prod]` con `vi.stubEnv('NODE_ENV','production')` + `NEXT_PUBLIC_USE_MOCK_API='true'` ⇒ se llama a `fetch`, nunca al fixture; sin URL ⇒ `no_disponible`, no fixture |
| **FG13-8** | `claimClass` "visible" inventado | se deriva de palabras ("probablemente") | `[N13:claimclass-del-contrato]`: el chip solo se pinta si el campo viene en el contrato; un grep-test prohíbe regex de vocabulario de probabilidad en `src/components/inmobiliaria/naira/` |
| **FG13-9** | Presentación registrada sin que nadie la viera | prefetch/polling del `GET /actions/{id}` (registra `presentada`) | `[N13:detalle-solo-al-abrir]`: el `fetch` del detalle de acción ocurre 0 veces hasta abrir el cajón y 1 vez al abrirlo |
| **FG13-10** | Aprobación con otra huella | se reintenta el POST con la huella nueva tras 409 | `[N13:huella-vista]`: el POST lleva la `huella` del detalle renderizado; 409 `huella_distinta` ⇒ re-lee y NO re-envía solo |
| **FG13-11** | Aceptación mostrada sola | el reporte pinta `aceptacion` como titular | `[N13:descubrimiento-titular]`: `descubrimiento` antes que `aceptacion`, ambos con `n` e IC; `no_medible` se dice con su razón |
| **FG13-12** | Persona colada | se muestra `writtenBy.userId`, un nombre o una latencia | `[N13:b5-sin-persona]`: ningún `userId` del fixture aparece en el DOM; 0 imports de `AgenteLeaderboard` en `naira/` |
| **FG13-13** | i18n verde con claves faltantes en inglés | `t: (k) => k` en los tests | usar `i18n-test-stub` (resuelve contra `es.json`) + `claves-naira.test.ts` para `en` |
| **FG13-14** | Conversación persistida | se reutiliza `useBetaChat` / `localStorage` | `[N13:conversacion-sin-persistencia]`: tras preguntar, `localStorage` y `sessionStorage` no contienen el texto de la pregunta ni de la respuesta |
| **FG13-15** | `contrato_roto` pintado a medias | se muestran los campos que sí parsearon | `safeParse` todo-o-nada; `[N13:contrato-roto-sin-datos]` |
| **FG13-16** | Test verde contra una base que ya no existe | la ejecución corre sobre `cambios-nico-10` y las líneas citadas se movieron | Paso 0 de cada plan re-mide `git rev-parse HEAD` y las anclas (Q6) |
| **FG13-17** | Enlace del correo roto | el front ignora `?senal=` o la 10 sigue armando `/naira/senales/<id>` | `[N13:deep-link]`: montar el Piloto con `?senal=<id>` abre el cajón de esa señal; E13-1 aplicada en la 10 antes de ejecutar su 10-04 |

## Hechos del ROADMAP/planes que el código contradice (candidatos a enmienda `Δ Fase 13`)

| # | Dónde | Dice hoy | Propuesta | Evidencia |
|---|---|---|---|---|
| **E13-1** 🔴 | `10-04-PLAN.md:379-380` (`RUTAS_DEL_PANEL`) y su test `[RND:enlaces]` (`:987`), P15 (`:513-515`) | rutas `/naira/briefing`, `/naira/senales`, `/naira/reglas`, `/naira/recall`, `/naira/cola-legacy`, `/naira/arranque` sobre `APP_URL`; el enlace de señal = `base + ruta + '/' + promocionId` | rutas del panel reales según Q1/Q4: `briefing: '/panel/inmobiliaria/piloto'` (+ `?dia=`), `senal: '/panel/inmobiliaria/piloto'` + `?senal=<promocionId>`; las de configuración, según Q4 (o se quitan del correo). **Bloquea ejecutar 10-04** si no se aplica (el test fija la forma) | T1; `arquitectura-del-panel.ts:82` (`PANEL`); crit. 1 |
| **E13-2** 🔴 | `09-01-PLAN.md:320-323` (`RefDeSenalInvestigada`), `09-04-PLAN.md:329` (`SenalPromovida`), `10-CONTEXT.md:260-263` (`ItemCongelado`), `10-06-PLAN.md:336` (`NairaSignalDetail`) | ninguno lleva entidades | `SenalPromovida` copia `affectedEntities: EntityRef[]` de la `Signal` (`src/naira/detect/types.ts:206`) y `NairaSignalDetail` gana `entidades: {kind:'agregado'} \| {kind:'lista'; entidades: EntityRef[]}` (nunca `member`) | UI-01; detectores `:93/:90/:105/:85/:163` |
| **E13-3** 🔴 | `09-06` (persistencia de `naira_investigation`), `9.5-04-PLAN.md:324` (`CitaPersistida`), `10-06-PLAN.md:336` (`citas: string[]`) | la cita se guarda y sirve sin `claimClass` y sin los campos de la hipótesis | persistir por cita `claimClass` (el que derivó el linter) y, si es hipótesis, `banda`/`alternativa`/`discriminador`; el detalle sirve `citas: { texto: TextoRenderizado; claimClass; hipotesis: … \| null }[]` | crit. 4; `09-03-PLAN.md:631-634` |
| **E13-4** | `9.5-06-PLAN.md:338-346` (`NairaConversationAnswered`), `9.5-04-PLAN.md:407` (`refsServidas`) | un `texto` plano; `refsServidas: string[]` mezcla `sourceRef` e `investigacionId`; `asOfs` por respuesta | la respuesta `respondida` agrega `oraciones: { seccion; texto: TextoRenderizado; claimClass: … \| null }[]` y `refs: ({kind:'chunk'; source; sourceRef} \| {kind:'investigacion'; id})[]`, conservando `texto` (aditivo, "agregar, no renombrar") | crit. 2 y 4 |
| **E13-5** | `10-06-PLAN.md:333-335` (`NairaBriefingDelivery`/`NairaBriefingDay`) | sin inventario, madurez ni arranque | `NairaBriefingDay` gana `inventario` (de `naira_briefing_day`, lector de 09-04/10-04 `leerInventarioDelDia`), `madurez` y `arranque`, leídos al mismo `corte` (no recompone: lee lo persistido) | crit. 3 de la 9; crit. 4 de la 10 |
| **E13-6** | `naira-memory.ts:421,451` y las rutas de 9.5/10/11/12 | el 404 de "Naira apagada" y el de "ítem no existe" tienen el mismo `reason: null` | `reason: 'naira_no_habilitada'` en el 404 de `acceso` (aditivo en todas las rutas de Naira) | T4 punto 6; E13-6 evita la heurística lista/ítem |
| **E13-7** | `ROADMAP.md:385` y `REQUIREMENTS.md:247` ("AI Hub existente") y `research/ARCHITECTURE.md:699` ("superficie de cards `agency-ai-hub-landing.ts`") | el hub de tarjetas | "Δ Fase 13: el hub de tarjetas murió (`/ai` → `/configuracion/agentes` → `/configuracion`); el hub vigente es Inicio (Piloto) + Chat; Naira vive en Inicio sin fila, sin workspace y sin ruta nueva" | T1 |
| **E13-8** | `ROADMAP.md:392` | "esta fase se ejecuta en `~/rent/mvp`" | "en un worktree propio del front (`~/rent/wt-front-naira`), nunca en `~/rent/mvp`" | brief `:9-23` |
| **E13-9** (informativa) | `10-06-PLAN.md:322` / front `agent-module-access.ts:24-34` | `MemberPermissionsResponse` sin `naira` | el front agrega `naira?: string[]` con postura FAIL CLOSED (no ABSENT = ALLOWED): antes de 10-06 desplegada, Naira (incluida la memoria, que ya existe) queda oculta | Q9 |
| **E13-10** (informativa, 12-07) | `12-CONTEXT.md:192-194`; `12-07-PLAN.md:428` | "la 13 pone `razonamiento` detrás de un tap" | la 13 lo asume + no prefetch del detalle + `huellaVista` = huella mostrada (FG13-9/10) | D12-12/D12-13 |
| **E13-11** (opcional) | `ItemCongelado`/`FactSnapshot` | `valor` crudo + `unidad` | agregar `valorRenderizado` (el mismo texto que usa el correo) para que ninguna superficie re-formatee | EVAL-10; `10-04-PLAN.md:981` |
| **E13-12** (a Victor/Gerente, fuera de Naira) | `origin/develop:src/server/routes/agency-ai-hub-briefing.ts` | briefing del Gerente con números sin `asOf` (`numeros.recuperadoMesCop`…) consumido por el Piloto y el Chat | decisión Q2: cuando Naira está habilitada para el tenant, el Piloto no muestra ambos | crit. 1 + EVAL-10 |

***
## Preguntas abiertas (RESOLVED — todas resueltas en `13-CONTEXT.md`; las 🔔 quedan como supuestos para Nico)

1. **Q1 — Dónde vive Naira.** **RESOLVED → D13-1 (workspace N3 en Reportes, 🔔; el Piloto queda como alternativa).** *Sabemos:* el hub de tarjetas murió; lo transversal es Inicio (Piloto) y Chat; un workspace exige módulo y fila. *Recomendación:* opción A de T1 (bloque en el Piloto + cajón + panel de conversación + panel "Qué cree Naira" desde el encabezado). *Alternativas:* conversación en el Chat sin persistencia; memoria en Configuración › Automatización IA.
2. **Q2 — Naira vs. el Gerente en el Piloto.** **RESOLVED → D13-2 (Inicio y Chat no se tocan en v1, 🔔; ticket V2).** *Sabemos:* el Piloto ya pinta la "lectura del Gerente" y `recuperadoMesCop` (`piloto/page.tsx:125-133,184-186`), y el Chat su briefing (`ai-hub-chat.ts:721-737`). *Recomendación:* con Naira habilitada para el tenant (su `/briefing` responde), el bloque de Naira REEMPLAZA la lectura y esa cifra del pulso; sin Naira, el Piloto queda igual. Requiere acuerdo con el dueño del Gerente (Victor/Nico, E13-12).
3. **Q3 — Conversación.** **RESOLVED → D13-13 + D13-2 (pestaña propia, sin persistencia).** *Recomendación:* panel en el Piloto, historial solo en memoria de la pestaña (🔔 C2: el agente no guarda el texto; el front tampoco). *Alternativa:* modo "Naira" del Chat con `localStorage` desactivado para esos turnos.
4. **Q4 — Superficies de configuración de la 10** **RESOLVED → D13-12 (configuración de la 10 fuera, 🔔; E13-1(b)).** (recall, reglas degradadas, arranque, preferencias, asignaciones de rol, tope de investigación, cola legacy). *Sabemos:* el correo enlaza a `reglas`, `recall`, `colaLegacy`, `arranque` (`10-04-PLAN.md:379-380`); sin `arranque` fijado nada entra a "atención" (`10-04-PLAN.md:993`); recall y reglas son parte del digest del lunes (crit. 4-5 de la 10) y solo tienen API. *Recomendación:* la 13 incluye **recall, confirmar/revertir regla y arranque** (sin ellas los criterios 4-5 de la 10 no tienen superficie humana); preferencias, asignaciones, tope y cola legacy en un plan aparte o 13.x, en Configuración (grupo `sistema`). *Alternativa:* la 10 quita esos enlaces del correo hasta que exista pantalla.
5. **Q5 — `writtenBy` en la memoria.** **RESOLVED → D13-11 (solo el tipo, 🔔).** *Recomendación:* mostrar la CLASE ("una persona del equipo" / "Naira") y no resolver `userId` a nombre hasta B-5. *Alternativa:* nombre visible solo para OWNER/ADMIN (consultar counsel con B-5).
6. **Q6 — Base del front.** **RESOLVED → D13-17 (🔔; ticket V1).** *Sabemos:* `5e3a6f85` (2026-09-07) vs `cambios-nico-10` (2026-09-26, 836 commits, Next 15/React 19, nav reescrita). *Recomendación:* planificar contra la base pero con Paso 0 que re-mide, y **ejecutar** sobre la rama de integración vigente en ese momento (no sobre `5e3a6f85` si ya quedó atrás); si es `cambios-nico-10`, re-medir T1/T3/T7 antes.
7. **Q7 — Mapeo 6 → 3 categorías** **RESOLVED → D13-9.** (T5). *Recomendación:* KNOWLEDGE y LIVE_DATA = DATO; MEMORY por procedencia; INFERENCE = INFERENCIA; RECOMMENDATION y ACTION = RECOMENDACIÓN.
8. **Q8 — Deep link de una señal.** **RESOLVED → D13-1 + E13-1 (ruta hoja `B/senales/<id>`).** *Recomendación:* query en el Piloto (`?senal=`), sin ruta nueva (E13-1). *Alternativa:* ruta hoja `/piloto/senales/[promocionId]` con `VolverALaLista`.
9. **Q9 — Antes de 10-06, ¿la memoria (que ya existe) se ve?** **RESOLVED → D13-3 (fail-closed, 🔔).** *Sabemos:* `/my-permissions` no trae `naira` hasta 10-06. *Recomendación:* FAIL CLOSED (no se ve hasta 10-06); la alternativa ABSENT = ALLOWED (`agent-module-access.ts:11-21`) dejaría a la UI prometer acciones que el agente niega.
10. **Q10 — Drill-down a ficha.** **RESOLVED → D13-7.** *Recomendación:* v1 = listado de la fuente (T5); ficha cuando E13-2 traiga entidades; `agent.prospect_leads` sin enlace hasta confirmar su pantalla.
11. **Q11 — CONTADOR = VIEWER para Naira** **RESOLVED → §7 del CONTEXT (se acepta en v1; ticket V5).** (hueco conocido del mapeo, `members-core.ts:102-110` en `origin/develop`). *Recomendación:* aceptarlo en v1 y decirlo en la UI por la matriz, no por el rol del front.
12. **Q12 — Panel en inglés.** **RESOLVED → §7 del CONTEXT.** *Recomendación:* chrome traducido; textos del agente en español (declarado).
13. **Q-OpenAPI — Tipos.** **RESOLVED → D13-5 (espejo zod; ticket V4).** *Recomendación:* espejo zod a mano hasta que el snapshot canónico del agente (develop con Naira) exista; ese día, test de paridad espejo↔generado y `pnpm api:check`.

## Propuesta de partición en planes (planners de a 2; el BASE primero)

| Plan | Ola | Qué | Depende en ejecución de |
|---|---|---|---|
| **13-01 BASE** | 1 | `contrato.ts` (zod de TODO T2 con `// fuente`), `cliente.ts` (`EstadoNaira`), `simulado/` con test de parseo, `naira` FAIL CLOSED en `agent-module-access.ts` + `naira?` en el payload, `formato.ts`/`fuente-a-ruta.ts`/`categorias.ts` puros, guardas estáticas `[N13:sin-seccion-paralela]` y `[N13:simulado-nunca-en-prod]`, `claves-naira.test.ts` vacío-pero-vivo | solo la base del front |
| 13-02 | 2 | Bloque Naira en el Piloto: briefing (ítems con `NumeroConFuente`, `sin_entrega{razon}`, `ocultosPorRol`), cajón `naira-senal` (ítem congelado + causa INFERENCIA + declaración de entidades), botones de feedback, deep link `?senal=`/`?dia=` | 10-06 (y E13-1/2/3/5 para datos reales) |
| 13-03 | 2 | Open loops (lista + detalle con eventos) + reporte de feedback (OWNER/ADMIN) | 11-07 |
| 13-04 | 3 | Propuestas de acción + cajón `naira-accion` (consecuencia primero, razonamiento tras tap, `huellaVista`, 403/409 por razón) + tareas (lista, cancelar) | 12-07 |
| 13-05 | 3 | Conversación (panel, sin persistencia, cuatro ramas, sugerencias `puedoResponder`) | 9.5-06 (E13-4 para categorías) |
| 13-06 | 4 | "Qué cree Naira": ver (procedencia, trust, derivedFrom con enlace), corregir, borrar (motivo), proponer/confirmar procedural, promover | Fase 8 (existe) + 11-07 (promover) + 10-06 (`/my-permissions`) |
| 13-07 (🔔 Q4) | 4 | recall + reglas + arranque (y lo que Nico sume) | 10-06 |
| 13-08 | 5 | Cierre: `panel-a11y` del bloque, `13-ACCEPTANCE.md` (por criterio: mecánica verificada / lo que exige agente vivo), enmiendas E13 para el orquestador, trazabilidad UI-01..03 | todos |

## Nombres candidatos (para que el CONTEXT los fije como contrato)
`src/lib/api/naira/contrato.ts` (esquemas con el nombre del agente: `NairaBriefingDay`, `NairaSignalDetail`, `NairaOpenLoopsList`, `NairaConversationAnswer`, `NairaActionDetail`, `NairaMemoryView`, …) · `src/lib/api/naira/cliente.ts` (`nairaFetch`, `EstadoNaira`) · `src/lib/api/naira/simulado/` · `src/lib/hooks/naira/use-naira-*.ts` · `src/lib/naira/{fuente-a-ruta,categorias,formato}.ts` (`FUENTE_A_RUTA`, `categoriaDe`, `formatearValorDeNaira`, `formatearAsOf`) · `src/components/inmobiliaria/naira/*.tsx` · i18n `inmobiliaria.naira.*` · marcadores `[N13:*]`.

## Registro de supuestos

| # | Supuesto | Sección | Riesgo si es falso |
|---|---|---|---|
| A1 | `pnpm install --frozen-lockfile` resuelve en el worktree con `../cadence` presente (sin red salvo motores de Prisma) | T7 | el ejecutor no puede correr tests; se declara y se para |
| A2 | Los nombres de los `<contrato_publicado>` de 9.5/10/11/12 llegan intactos al disco (el dueño solo AGREGA) | T2 | el espejo zod da `contrato_roto`; el Paso 0 re-mide |
| A3 | `agent.prospect_leads` no tiene pantalla propia en el front (`/pipeline` lista ítems del back) | T5 | se pierde un drill-down posible |
| A4 | El `userId` del agente (de `agency_members`) no coincide de forma verificable con el id que conoce el front (B-4 impide medirlo, `9.5-CONTEXT.md:296`) | T6 | se podría decir "tú" en la memoria |
| A5 | El Piloto sigue siendo Inicio cuando se ejecute (lo es en `cambios-nico-10`) | T1 | se re-hace T1 |
| A6 | Una ruta de Naira no desplegada en el agente responde 404 (Hono) | T4 | el bloque mostraría `fallo` en vez de ocultarse |
| A7 | El Gerente (develop) sigue publicando `/ai-hub/briefing` con la forma de `PilotoBriefingResponse` | Q2 | cambia la convivencia |

## Disponibilidad del entorno

| Dependencia | Lo necesita | Disponible | Versión | Alternativa |
|---|---|---|---|---|
| Node | tests/tsc | ✓ | 25.9.0 (CI: 20) | — (setup ya cubre Node 25) |
| pnpm | instalar | ✓ | 10.34.5 | — |
| `node_modules` del worktree | vitest, tsc, build | ✗ | — | `pnpm install --frozen-lockfile` (A1); verificación estructural mientras tanto |
| `@leasefy/cadence` (`../cadence`) | install + tests de componentes | ✓ | 1.0.57 (`1eece93`) | — |
| Agente local `:4000` | `api:gen` vivo, prueba contra agente | ✗ | — | snapshot + espejo zod + simulado |
| Agente con Naira desplegado | datos reales | ✗ (B-4, rama no pusheada) | — | simulado opt-in con marca |
| Front `:3001` + sesión | Playwright `panel-a11y` | ✗ | — | manual, declarado (como el CI) |
| Navegadores Playwright | a11y | ✓ (caché `chromium_headless_shell-1217/1223`) | — | — |

**Bloqueante sin alternativa:** ninguno para planificar; para EJECUTAR con datos reales, las fases 9.5-12 y el despliegue del agente.

***
## Arquitectura de validación

### Framework

| Propiedad | Valor |
|---|---|
| Framework | vitest `^4.0.18` + happy-dom `^20.6.0` (componentes con `createRoot` + `act`, sin Testing Library) |
| Config | `vitest.config.ts` + `vitest.setup.ts` (existen) |
| Comando rápido | `pnpm exec vitest run src/lib/api/naira src/lib/naira src/lib/hooks/naira src/components/inmobiliaria/naira src/lib/auth src/lib/nav src/lib/i18n/claves-naira.test.ts` |
| Suite completa | `pnpm test` (= `vitest run`) + `pnpm exec tsc --noEmit` |
| Manual | `pnpm lint`, `pnpm build`, Playwright `--project=panel-a11y` con `:3001` y sesión |

### Criterio / requisito → prueba (marcadores propuestos; "mutación por la causa" en COPIA con `mktemp -d`, nunca en `src/`)

| Criterio / REQ | Comportamiento | Tipo | Marcador y archivo propuesto | Mutación que DEBE ponerlo rojo |
|---|---|---|---|---|
| Crit. 1 / UI-01 (dónde) | Naira sin fila, sin workspace, sin ruta `/naira`; componentes montados solo desde el Piloto; sidebar sigue en 17 | estático (vitest, `fs`) | `[N13:sin-seccion-paralela]` en `src/lib/nav/naira-sin-seccion-paralela.test.ts` + el existente `arquitectura-del-panel.test.ts:197-203` | crear `src/app/panel/inmobiliaria/naira/page.tsx` o una fila `naira` |
| Crit. 1 / UI-01 (qué) | el bloque pinta briefing, loops, conversación y el cajón de señal con su declaración de entidades | componente | `[N13:bloque-completo]`, `[N13:senal-entidades]` (`agregado` ⇒ texto "señal agregada"; `lista` ⇒ una fila por entidad sin `member`) | quitar la sección de entidades del cajón |
| Crit. 1 (deep link) | `?senal=<id>` abre el cajón de esa señal; `?dia=` pide ese día | componente | `[N13:deep-link]` | ignorar el query |
| Crit. 2 / UI-02 | todo `[data-naira-numero]` tiene su `[data-naira-asof]` en el mismo contenedor y, si la fuente está en `FUENTE_A_RUTA`, un enlace a una ruta con `page.tsx` | componente + estático | `[N13:asof-pegado]`, `[N13:fuente-a-ruta-existe]` (molde `tienePagina`, `arquitectura-del-panel.test.ts:63-77`), `[N13:sin-href-interpolado]` | mover el `asOf` fuera del contenedor; apuntar una fuente a una ruta sin `page.tsx` |
| Crit. 2 (hora) | el `asOf` se formatea en `America/Bogota` | unit | `[N13:asof-bogota]` con `TZ` del proceso distinto (p. ej. `vi.stubEnv('TZ','UTC')` o fecha que cruza medianoche) | usar `formatDate` compartido |
| Crit. 3 / UI-03 | 200 → 403 deja `sin_permiso` SIN `data` y el DOM sin el token del fixture | hook + componente | `[N13:403-sin-residuo]` en `src/lib/hooks/naira/use-naira-briefing.test.ts` y `src/components/inmobiliaria/naira/NairaBloque.test.tsx` | el hook conserva `data` al fallar |
| Crit. 3 (cliente) | 403 del middleware (sin `reason`) y 403 de capa 2 (con `reason`) ⇒ ambos `sin_permiso`; 404 lista ⇒ `no_disponible` y bloque oculto; 409 ⇒ `conflicto{razon}`; 200 malformado ⇒ `contrato_roto` sin datos | unit | `[N13:cliente-estados]`, `[N13:contrato-roto-sin-datos]` en `src/lib/api/naira/cliente.test.ts` | pintar parcialmente un `safeParse` fallido |
| Crit. 3 (gate) | `naira` FAIL CLOSED aun con `isAdmin`; control positivo con permisos | unit | `[N13:naira-fail-closed]`, `[N13:control-positivo]` en `src/lib/auth/agent-module-access.test.ts` y `src/lib/context/PermissionsContext.test.tsx` (existen: se extienden) | sacar `'naira'` de `FAIL_CLOSED_MODULES` |
| Crit. 4 (categorías) | cada pieza lleva `data-categoria` ∈ DATO/INFERENCIA/RECOMENDACIÓN según su campo de origen; memoria por procedencia | componente | `[N13:categoria-por-campo]` | rotular una cita como DATO |
| Crit. 4 (`claimClass`) | chip solo si el contrato trae la clase; hipótesis con banda + alternativa + discriminador; sin campo ⇒ sin chip y declarado | componente + grep | `[N13:claimclass-del-contrato]` | derivar la clase de una palabra |
| Crit. 4 (memoria) | lista con procedencia/trust/derivedFrom; corregir/borrar solo con `memory-correct`/`memory-erase`; borrar exige `motivo`; 409/422 dichos por su razón, sin eco del texto | componente | `[N13:memoria-acciones-por-permiso]`, `[N13:borrar-exige-motivo]` | mostrar "Corregir" a un VIEWER |
| B-5 | ningún `userId`/nombre de persona en el DOM de Naira; 0 imports de `AgenteLeaderboard`; sin vista de latencia | componente + estático | `[N13:b5-sin-persona]`, `[N13:sin-latencia]` | pintar `writtenBy.userId` |
| Acciones (12) | detalle pedido solo al abrir; POST con la huella mostrada; `puedeDecidir=false` ⇒ sin botones; razonamiento tras tap | componente | `[N13:detalle-solo-al-abrir]`, `[N13:huella-vista]`, `[N13:consecuencia-primero]` | prefetch; reintentar con otra huella |
| Feedback (11) | tres botones solo en `atencion`/`informativo`; 409 `ventana_vencida` dicho; reporte con `descubrimiento` titular + `n` + IC | componente | `[N13:voto-secciones]`, `[N13:descubrimiento-titular]` | voto en `seguimiento`; `aceptacion` sola |
| Conversación (9.5) | cuatro ramas renderizadas; sin persistencia en storage | componente | `[N13:conversacion-ramas]`, `[N13:conversacion-sin-persistencia]` | reutilizar el `localStorage` del chat |
| Mock | fixtures parsean con el contrato; nunca en producción; chip "Simulado" visible | unit + componente | `[N13:fixture-es-contrato]`, `[N13:simulado-nunca-en-prod]`, `[N13:simulado-visible]` | guarda "sin URL ⇒ mock" |
| i18n | toda clave `inmobiliaria.naira.*` en `es` y `en`; mapas exhaustivos por vocabulario | unit + `tsc` | `src/lib/i18n/claves-naira.test.ts` | clave solo en `es` |
| A11y | el bloque y el cajón pasan axe | e2e manual | `tests/e2e/panel-a11y/naira.a11y.spec.ts` (con `route.fulfill` de los fixtures) | — (manual, declarado) |

### Muestreo
- **Por tarea:** el comando rápido sobre los archivos tocados + `tsc --noEmit`.
- **Por ola:** `pnpm test` completo.
- **Cierre:** suite completa verde + `pnpm lint` + `pnpm build` + a11y manual declarado en `13-ACCEPTANCE.md`. Sin `node_modules`, el plan-checker verifica por estructura y declara "no ejecutado" (brief `:46-48`).

### Brechas de Wave 0 (las cubre 13-01)
- [ ] `src/lib/api/naira/contrato.ts` + `cliente.ts` + `cliente.test.ts`
- [ ] `src/lib/api/naira/simulado/*` + test de parseo
- [ ] extender `src/lib/auth/agent-module-access.test.ts` y `src/lib/context/PermissionsContext.test.tsx` (existen) con `naira`
- [ ] `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- [ ] `src/lib/i18n/claves-naira.test.ts`
- [ ] Preparar entorno: `pnpm install --frozen-lockfile` (A1)

## Dominio de seguridad

### Categorías ASVS aplicables

| Categoría ASVS | Aplica | Control estándar |
|---|---|---|
| V2 Autenticación | no (se hereda) | Supabase + `agentFetch` (Bearer, sin refresh manual) |
| V3 Sesión | parcial | `agentFetch` respeta el 401 de sesión muerta (`agent-fetch.ts:110-116`) |
| V4 Control de acceso | **sí** | la autoridad es el agente (403); la UI es fail-closed por `/my-permissions.naira`, sin `isAdmin` de bypass, sin rol del front |
| V5 Validación | **sí** | zod en TODA respuesta (todo-o-nada); en pedidos: `question` 1..`ROUTER_QUESTION_MAX_CHARS`, `text` 1..4000, `motivo` y `decision` por enum, UUIDs en minúsculas validados antes de armar el path (10-06 P16) |
| V7 Errores | sí | nunca mostrar `mensajeOriginal`; copy por estado (`clasificar.ts:30-38`) |
| V8 Protección de datos | **sí** | nada de Naira en `localStorage`/`sessionStorage` (🔔 C2); texto del agente como texto plano; ningún dato de persona (B-5) |
| V6 Criptografía | no | — |

### Amenazas del stack

| Patrón | STRIDE | Mitigación |
|---|---|---|
| XSS por texto de la memoria/respuesta (escrito por humanos o derivado de terceros) | Tampering | render como texto (React escapa); prohibido `dangerouslySetInnerHTML` y `react-markdown` en `naira/` (grep-test) |
| Open redirect / navegación arbitraria desde `fuente`/`ref`/`sourceRef` | Spoofing | `FUENTE_A_RUTA` cerrada `as const satisfies`; ids con `encodeURIComponent` tras validar UUID; nunca `href` desde string del agente |
| Datos de otro rol visibles por caché/estado viejo tras cambio de rol o de agencia | Information disclosure | reset a `cargando` al cambiar `agencyId`/permisos; `[N13:403-sin-residuo]` |
| Decisión con consentimiento desinformado (huella vieja) | Repudiation | `huellaVista` = la mostrada; 409 re-muestra (FG13-10) |
| Simulado servido a un usuario real | Spoofing (datos) | guarda de `production` + opt-in explícito + chip visible (FG13-7) |
| Persistencia de preguntas/respuestas en el navegador compartido | Information disclosure | sin storage (FG13-14) |

## Fuentes

### Primarias (confianza ALTA — medidas en esta sesión)
- Front, worktree `/Users/nicolasgarcia/rent/wt-front-naira` en `5e3a6f85`: `CLAUDE.md`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.env.example`, `scripts/api-gen.sh`, `scripts/openapi-snapshot.json`, `src/lib/nav/{arquitectura-del-panel,agentWorkspaceNav,rutas-por-ciclo-de-vida.data}.*`, `src/lib/nav/{arquitectura-del-panel,gates-del-panel}.test.ts`, `src/app/panel/inmobiliaria/{layout,page}.tsx`, `piloto/page.tsx`, `configuracion/{secciones.ts,agentes/page.tsx,ia/page.tsx}`, `fichas-con-vuelta.test.ts`, `src/lib/api/{agent-fetch,agent-auth,piloto,ai-hub-chat,config,funnel.service}.ts`, `src/lib/hooks/piloto/use-piloto-briefing.ts`, `src/lib/hooks/useBetaChat.ts`, `src/lib/hooks/mantenimiento/*`, `src/lib/context/PermissionsContext.tsx`, `src/lib/auth/{agent-module-access,agency-roles}.ts`, `src/components/auth/{PageGuard,PermissionGate}.tsx`, `src/components/estado/AvisoModoSimulado.tsx`, `src/components/inmobiliaria/piloto/{PilotoCajon,PilotoDock,PilotoBandeja}.tsx`, `src/lib/errores/clasificar.ts`, `src/lib/i18n/*`, `.claude/skills/*`; rama local `cambios-nico-10` por `git show`/`git diff --stat` (solo lectura).
- Agente, `/Users/nicolasgarcia/rent/agent-account-manager` (`project/account-manager`): `src/server/routes/{naira-memory,permissions-matrix,agency-permissions}.ts`, `src/server/middleware/agency-role.ts`, `src/naira/{detect/types.ts,detect/detectors/*,volatility/registry.ts,metrics/{types,catalog}.ts,memory/*,fact/types.ts,graph-projection/node-types.ts,attribution/types.ts}`, `openapi-snapshot.json`; `origin/develop` por `git show` (`agency-ai-hub-briefing.ts`, `piloto-gerente.ts`, `onboarding/steps/members-core.ts`, `permissions-matrix.ts`).
- Planificación de Naira (`.planning/agents/account-manager/`): `ROADMAP.md`, `REQUIREMENTS.md`, `HANDOFF-2026-09-25.md`, `briefs/brief-suborquestador-fase-13.md`, `research/ARCHITECTURE.md`, CONTEXT/PLAN/PATTERNS/RESEARCH de las fases 8, 9, 9.5, 10, 11 y 12 (por `grep`/`sed`/`python`, citados con línea).

### Secundarias (confianza MEDIA — planes NO ejecutados; manda el disco al ejecutar)
- Todos los `<contrato_publicado>` citados en T2 (9.5-06, 10-06, 11-07, 12-07 y sus dependencias 09-01/09-03/09-04, 9.5-04, 10-02/10-04, 11-02/11-03, 12-01/12-03).

### Terciarias (confianza BAJA)
- Ninguna fuente web: la fase no depende de librerías nuevas ni de documentación externa.

## Metadatos

**Desglose de confianza:**
- Estado del front: ALTA — medido en la base; BAJA su vigencia (base de 20 días con una rama local de 836 commits encima).
- Contratos consumidos: MEDIA — 5 endpoints existen en código no desplegado; 25 son planificados.
- Recomendaciones de ubicación y patrón: MEDIA-ALTA — derivadas de tests y comentarios de decisión de Nico en el código; son 🔔.
- Trampas: ALTA — cada una tiene un precedente medido en el repo.

**Fecha:** 2026-09-27 · **Válido hasta:** re-medir al ejecutar (la base del front se mueve rápido: 7 días como máximo, o antes si cambia la rama de integración).
