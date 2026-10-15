# Fase 13 (cross-repo): Superficie de Naira en `Leasefy/front` — Mapa de patrones y realidad MEDIDA

**Mapeado:** 2026-09-27 · **Worktree:** `/Users/nicolasgarcia/rent/wt-front-naira` (rama `project/naira-superficie`, base `origin/Main` = `5e3a6f85`)
**Árbol al empezar:** limpio salvo `?? .planning/naira/` (esta carpeta). `phases/13-superficie-naira/` **vacía** (sin CONTEXT ni RESEARCH); `briefs/` **vacío**. Este mapa sale de `agent-account-manager/.planning/agents/account-manager/ROADMAP.md:380-392` (Phase 13) y del código del front.
**Sin `node_modules`:** todo lo de abajo es lectura estática (`grep -n` / `sed -n` / `awk` / python). Nada se ejecutó. Cada `archivo:línea` se midió en esta sesión.
**Requisitos:** `UI-01..03` · criterios 1-4 `ROADMAP.md:385-388`. ⚠️ `ROADMAP.md:392` dice «esta fase se ejecuta en `~/rent/mvp`»: acá se ejecuta en el **worktree** (`~/rent/mvp` está PROHIBIDO para esta fase).
**Nombres de archivo nuevos:** PROVISIONALES (§3). Los análogos no cambian si el CONTEXT elige otros.

***

## Cómo leer este documento

Mismo orden que `12-PATTERNS.md`: **realidad medida (§0) → lo que el brief / CLAUDE.md / skills afirman y el código contradice (§1) →
decisiones que bloquean el diseño (§2) → clasificación (§3) → patrones por archivo con análogo y ANTI-análogo (§4) → transversales (§5)
→ rutas del ERP (§6) → comandos y CI (§7) → tabla final (§8) → guion de re-medición (§9)**.

**La novedad de esta fase, en una línea:** es la PRIMERA superficie del front que tiene que (a) **negarse a pintar** datos ya cargados
cuando el micro responde 403, (b) mostrar la **clase epistémica** de cada oración (DATO / INFERENCIA / RECOMENDACIÓN + `claimClass`),
y (c) poner un **`asOf` y un enlace a la fuente** junto a cada número. Llega a un front donde (1) **ningún** hook del agente limpia
`data` al fallar un refetch, (2) el único "briefing" que existe **aplana** las frases en un párrafo, (3) los enlaces del micro se
pintan **verbatim**, y (4) los gates del front preguntan siempre por la acción `'view'`, que **Naira no tiene**.

***

## §0 — LA REALIDAD MEDIDA

### §0.0 Piso y bloqueadores

```
$ git -C wt-front-naira log --oneline -1          -> 5e3a6f85 Merge pull request #147 from Leasefy/develop
$ git -C wt-front-naira status --porcelain        -> ?? .planning/naira/
$ ls wt-front-naira/node_modules                  -> No such file or directory
$ grep -c naira src/lib/api/generated/agent.ts    -> 0
$ grep -c naira scripts/openapi-snapshot.json     -> 0
$ python: 'naira' in es.json                      -> False
$ grep -rn "status: 403" tests/e2e                -> 0   (ningún E2E simula un 403 hoy)
$ grep -c "@testing-library" package.json pnpm-lock.yaml -> 0 · 0
```

- **Contrato del agente:** el único endpoint de Naira que EXISTE en disco (repo del agente, rama `project/account-manager`) es la
  memoria: `agent-account-manager/src/server/routes/naira-memory.ts:183` (`BASE = '/api/agency/{agencyId}/naira/memory'`), con
  `GET` vista (`:185-199`), `POST …/items/{itemId}/correction` (`:201-214`), `POST …/items/{itemId}/erasure` (`:216-229`),
  procedural (`:231-269`). El resto (`/naira/briefing`, `/naira/open-loops`, `/naira/signals/{id}`, `…/feedback`,
  `/naira/conversation/questions`, `/naira/actions/{proposalId}/decision`) está **solo planificado** en las fases 9.5-12
  (grep de rutas en `.planning/agents/account-manager/phases/*`). ⇒ el front codifica contra un **espejo escrito a mano** detrás de un
  mock con fixtures (§2 B13-5).
- **Roles distintos a cada lado** (medido): front `ADMIN | AGENTE | CONTADOR | VIEWER` (`src/lib/auth/agency-roles.ts:5-12`, espejo del
  **monolito**); agente `OWNER | ADMIN | OPERATOR | VIEWER` (`agent-account-manager/src/server/middleware/agency-role.ts:95`). Las
  acciones de Naira son `memory-view | memory-correct | memory-erase | procedural-propose | procedural-approve`
  (`agent-account-manager/src/server/routes/permissions-matrix.ts:63`) y las fases 9.5-12 planifican `briefing-view`,
  `open-loops-view`, `signal-view`, `signal-feedback`, `conversation-ask`, `action-view`, `action-approve-internal|external`,
  `task-view|cancel`, `feedback-report-view`, `memory-promote`. **Ninguna se llama `view`** (ver §2 B13-2).
- **B-5** (counsel `naira_desempeno_empleados`): la memoria trae `writtenBy: { kind:'user', userId }` (`naira-memory.ts:84-86`, `:110`)
  y `proposedBy.userId` (`:125`). El front **no** los pinta (§2 B13-7).

### §0.1 Dónde vive un agente hoy (N1→N4) — y dónde NO puede vivir

| Pieza | Medido | `archivo:línea` |
|:--|:--|:--|
| La arquitectura es DATOS | `ARQUITECTURA_DEL_PANEL: readonly GrupoDelPanel[]` (4 grupos con cabecera + pie) | `src/lib/nav/arquitectura-del-panel.ts:148` |
| Contrato de una fila N2/N3 | `labelKey, href, icon, exact?, module, roles?, scope?, ia?, agente?, hintKey?, dataTourTarget?` | `arquitectura-del-panel.ts:94-125`, `:127-137` |
| Un workspace = fila con `agente: '<slug>'` + `ia: true` | ej. Avalúos (N3 dentro de Inmuebles) | `arquitectura-del-panel.ts:160` |
| Un agente puede ser la RAÍZ de un módulo | Pagos (`agente: 'pagos'`, hermanas en `excluir`) | `arquitectura-del-panel.ts:232-236` · `agentWorkspaceNav.ts:233` |
| Mock-first sin endpoint ⇒ FUERA del catálogo | Tickets/mantenimiento comentado; Retención sólo por URL | `arquitectura-del-panel.ts:181-185`, `:195-203` · `agentWorkspaceNav.ts:253-273` |
| Pestañas internas: fuente única | `AGENT_WORKSPACES: AgentWorkspace[]` (`slug, basePath, excluir?, labelKey, icon, module?, roles?, items[]`) | `src/lib/nav/agentWorkspaceNav.ts:73-91`, `:103` |
| Resolución ruta→workspace | `findAgentWorkspace` (prefijo más largo, respeta `excluir`) | `agentWorkspaceNav.ts:451-461` |
| La barra de pestañas | `WorkspaceNav` filtra con `canAccess(item.module, 'view')` y **no se dibuja con <2 pestañas** | `src/components/inmobiliaria/ai/WorkspaceNav.tsx:35-45` |
| Dónde se monta | `CabeceraDelAgente` = `WorkspaceNav` + `AgentIntroModal`, montada UNA vez en `<main>` | `CabeceraDelAgente.tsx:34-44` · `src/app/panel/inmobiliaria/layout.tsx:312-316` |
| Intro de primera visita (por slug) | `AGENT_INTROS[]` (7 agentes) — un slug sin entrada no presenta nada | `src/components/tour/AgentIntroModal.tsx:24-33`, `:36-86`, `:140-141` |
| Inicio y Chat viven en el LAYOUT | fila «Inicio» → `/piloto`, `module: null`, badge; «Chat» → raíz exacta | `layout.tsx:168-188`, `:193` · `arquitectura-del-panel.ts:79` |
| El namespace `/ai` murió | todo `/ai/*` redirige (307); `/ai` exacto → `/configuracion/agentes` | `src/lib/nav/rutas-por-ciclo-de-vida.data.mjs:31-71` (`:69-70`) |
| `/piloto` NO es de la arquitectura | `moduloDeLaRuta('/piloto') === null` (asertado) | `arquitectura-del-panel.test.ts:301` |

⇒ **Consecuencia (F13-1):** un workspace registrado en `AGENT_WORKSPACES` **tiene** que tener puerta en `ARQUITECTURA_DEL_PANEL`
(`arquitectura-del-panel.test.ts:260-265`), y la arquitectura **no** contiene `/piloto`. Un "workspace de Naira bajo Inicio" no se puede
registrar sin romper ese test: si Naira vive en Inicio, vive **sin** `WorkspaceNav`, sin `AgentIntroModal` y **fuera** de todos los
guardianes de navegación (ver §0.2, fila "falso verde").

### §0.2 Todo lo que un workspace NUEVO tiene que satisfacer (tests medidos, qué asertan y qué rompe)

| Test | Aserción | `archivo:línea` | Qué rompe un workspace nuevo |
|:--|:--|:--|:--|
| page por ruta | cada `pestanasDelModulo(m)` tiene `page.tsx` (busca también en route groups `(…)`) | `arquitectura-del-panel.test.ts:63-82` | fila N3 sin `page.tsx` |
| page por pestaña | cada `AGENT_WORKSPACES[].items[].href` tiene `page.tsx` | `:84-89` | pestaña sin página |
| sin `/ai/` | ni en la arquitectura ni en `basePath` | `:91-96` | `basePath` bajo `/ai` |
| código sin `/panel/inmobiliaria/ai` | recorre `src/` y `tests/` (salvo `generated/`) con `/\/panel\/inmobiliaria\/ai\b/` | `:98-127` | cualquier string/fixture/spec con esa ruta (¡también fixtures y E2E!) |
| prefijo y barra | `href` empieza por `/panel/inmobiliaria/` y no termina en `/` | `:129-134` | — |
| cuelga del módulo | `p.href.startsWith(m.href + '/')` | `:136-142` | N3 fuera del prefijo del módulo |
| sin duplicados | `href` únicos | `:144-147` | — |
| icono por fila N2 | ningún icono de módulo repetido ni igual a `AirTrafficControl`/`ChatsCircle` | `:151-158` | sólo si Naira fuera **módulo** N2 |
| icono y nombre por pestaña del MÓDULO | dentro de un módulo, íconos y textos `es` únicos | `:160-167` | N3 con icono ya usado en ese módulo |
| i18n es+en | toda `labelKey`/`hintKey` de arquitectura **y** de `AGENT_WORKSPACES` (+ items) existe en `es.json` y `en.json` | `:175-188` | clave sólo en `es` |
| 17 módulos / 4 grupos | `expect(modulos).toHaveLength(17)` | `:197-203` | **agregar un módulo N2** (Naira como fila del sidebar) |
| R4 etiqueta ↔ segmento | último segmento de la ruta ≈ texto `es` normalizado (excepciones nombradas) | `:221-248` | `/naira` con etiqueta que no empiece por «naira» |
| agente ↔ workspace | cada fila con `agente` tiene `AGENT_WORKSPACES` con **el mismo** `basePath` | `:252-258` | `basePath` distinto al `href` |
| puerta por workspace | cada workspace registrado tiene su fila con `agente` | `:260-265` | workspace sin fila (p. ej. bajo `/piloto`) |
| marca IA | toda fila con `agente` lleva `ia: true` | `:267-269` | olvidar `ia` |
| agente raíz excluye hermanas | si el agente es raíz del módulo, sus hermanas en `excluir` | `:288-294` | sólo si Naira fuera raíz de un módulo |
| «IA IA» | ninguna pantalla con `ia: true` cuyo texto termine en «IA»/«AI» | `:336-342` | etiqueta «Naira IA» |
| módulo existe | toda `module` de fila y de `<PageGuard module="…">` ∈ `MODULOS_DEL_BACK` ∪ `isAgentModule` | `src/lib/nav/gates-del-panel.test.ts:51-68`, `:85-87`, `:141-157` | `module: 'naira'` sin tocar `agent-module-access.ts` |
| lista de rotos no crece | módulos desconocidos en uso = exactamente `['ap','retencion']` | `gates-del-panel.test.ts:83`, `:159-166` | idem |
| guard = sidebar | el PRIMER `<PageGuard module>` del `page.tsx` = `module` de la fila (o fila con `roles`) | `:169-203` | `page.tsx` con otro módulo; el test lee **regex** `<PageGuard\b([^>]*)>` (`:131`) |
| visible a todos ⇒ abre para todos | fila sin `module` ni `roles` no puede tener `AgencyRoleGuard allowed="managers"` | `:205-223` | gate por rol sin declararlo |
| redirecciones | destinos declarados; «lo que no cambió no se toca» (`/piloto`, `''`, …) | `rutas-por-ciclo-de-vida.test.ts:63-75`, `:134-138` | sólo si se agrega una redirección |
| fichas con vuelta | todo `*Client.tsx` dentro de un segmento dinámico `[x]` contiene `VolverALaLista`/`BackButton`/`function BackLink`/`← t(` | `src/app/panel/inmobiliaria/fichas-con-vuelta.test.ts:35-40`, `:42-56`, `:65-77` | ficha de señal `[id]/SenalClient.tsx` sin salida |
| badges del layout | todo `badge:`/`contratos:`/`postulaciones:` del layout referencia una variable de hook y está en las deps del `useMemo` | `src/app/panel/inmobiliaria/nav-badges.test.ts:63`, `:74-98` | agregar un badge de Naira al layout sin sumarlo a `:218` |
| CTAs del pie | sólo mira `upgradeHref`/`showInvite` del layout | `ctas-del-sidebar.test.ts:25-58` | nada (no afectado) |
| `filterAgencyNav` | usa **su propio** fixture `RAW` | `src/lib/nav/agency-nav-filter.test.ts:49-70` | 🟡 **falso verde:** no ve filas nuevas |
| `ruta-de-regreso` | `rutaDeRegreso`/`conRegreso`/`lugarDeRegreso` con casos fijos | `src/lib/nav/ruta-de-regreso.test.ts:6-53` | nada; pero `lugarDeRegreso` devuelve `'otro'` para `/piloto` y cualquier ruta de Naira (`ruta-de-regreso.ts:56-77`) |
| agent-module-access | `isAgentModule` "reconoce los cinco" | `src/lib/auth/agent-module-access.test.ts:20-29` | agregar `naira` exige actualizar este test |

🔴 **Falso verde medido:** si Naira vive en Inicio (`/piloto/*`), **ningún** test de esta tabla la ve: `pestanasDelModulo` no la
recorre (no está en la arquitectura), `fichas-con-vuelta` sólo mira `*Client.tsx` en segmentos dinámicos, y
`gates-del-panel` sólo compara filas declaradas. El precedente de sub-página de Inicio es `/piloto/procesos`
(`src/app/panel/inmobiliaria/piloto/procesos/page.tsx:1-20`, entrada por botón del encabezado `piloto/page.tsx:167-172`): tampoco lo
cubre ningún test de navegación. ⇒ un plan que elija Inicio tiene que **escribir** su propio guardián (§5.8).

### §0.3 Consumo del agente: transporte, envelope, mock, tipos

| Pieza | Medido | `archivo:línea` |
|:--|:--|:--|
| Base URL + token | `process.env.NEXT_PUBLIC_AGENT_URL` + `Authorization: Bearer <token en memoria>` (NO cookies) | `src/lib/api/agent-auth.ts:1-20` |
| Transporte que sobrevive a un token vencido | `agentFetch`: reintenta **sólo el 401** una vez (espera token nuevo ≤3 s); **el 403 pasa tal cual** | `src/lib/api/agent-fetch.ts:51`, `:99-127` (`:108`) |
| Envelope canónico de lectura | `{ data, notAvailable }`; `404 ⇒ notAvailable` (NO error); `!ok ⇒ throw new Error(\`${res.status}\`)` | `src/lib/api/piloto.ts:139-152` (con `agentFetch`) · `src/lib/api/agent-workspace.ts:165-184` (con `globalThis.fetch`, sin reintento 401) |
| Espejo escrito a mano "contra el contrato" | cabecera `MIRROR hand-authored`, endpoints listados, "no inventar campos" | `piloto.ts:3-21`, `:26` |
| Tipo defensivo cuando el contrato no fija shape | `PilotoBriefing` con TODO opcional; "lo que no venga con el shape esperado no se pinta" | `piloto.ts:123-135` |
| Escritura canónica | `Promise<{ ok, data?, error? }>`, nunca tira; `error = body.error ?? String(status)` | `piloto.ts:337-363` (PUT) · `:428-462` (`runInboxAccion`, cuerpo VERBATIM + valores) |
| Frescura en el contrato | `generatedAt` (Sala, hub, lecciones) · `tomadoAt` (flota) | `agent-workspace.ts:51-57`, `:157-161` · `piloto.ts:475-484` · `ai-hub-lessons.ts:70-78` |
| Chat (AI Hub) | `POST …/ai-hub/chat` one-shot + `…/chat/stream` SSE por `fetch`+reader (no EventSource); errores `ai-hub chat ${status}` | `src/lib/api/ai-hub-chat.ts:3-16`, `:406-421`, `:449-487` |
| Aprobación en el chat que NO ejecuta | `resolveChatApproval` sólo registra la decisión | `ai-hub-chat.ts:423-443` |
| Roster del chat (sin Naira) | `BackendDispatchAgent = cobranza…pagos` | `ai-hub-chat.ts:30-37` |
| Tipos generados | `paths[...]['get']['responses'][200]['content']['application/json']` | `src/lib/hooks/cobranza/use-calls.ts:22-29` |
| Codegen | `pnpm api:gen` = `scripts/api-gen.sh` (vivo `localhost:4000/openapi.json` → si no, `scripts/openapi-snapshot.json`; guardarraíl si el vivo trae MENOS rutas) | `package.json:18-20` · `scripts/api-gen.sh:26-29`, `:36-77` |
| Guarda de mock (la única real) | `NODE_ENV==='production' ⇒ false`; si no, `NEXT_PUBLIC_USE_MOCK_API==='true'` | `src/lib/api/config.ts:43-57`, `:70-72` |
| Guarda de mock local (funnel) | + `!NEXT_PUBLIC_AGENT_URL ⇒ mock`; demo rotulada `stubMode: true` | `src/lib/api/funnel.service.ts:24-28`, `:45-59` |
| Fixtures | viven en `src/lib/data/mock-*.ts` (`mock-retencion.ts`, `mock-mantenimiento.ts`, `mock-reports.ts`…) | `git ls-files src/lib/data` |
| Cartel de mock | `<AvisoModoSimulado>` global (layout) · `<AvisoDatosDeEjemplo queEsInventado queFalta>` por pantalla | `layout.tsx:337` · `src/components/estado/AvisoModoSimulado.tsx:39-43` · `AvisoDatosDeEjemplo.tsx:28-44` |

🔴 **ANTI-análogo de mock (Retención):** `src/lib/api/retencion.ts:43-54` — `try { real } catch { return { data: getMockDashboard(), usingMock: true } }`.
**Cualquier** error —403 incluido— sirve datos inventados, y **sin** guarda de `NODE_ENV` (el archivo no la tiene: `:1-41`). Lo mismo para
la escritura (`:135-155`: un PATCH que falla "se aplica" al mock). Para Naira esto es exactamente lo prohibido por el criterio 3.

🔴 **ANTI-análogo de briefing (chat):** `ai-hub-chat.ts:716-737` — `fetchBriefing` "fail-open": `if (!res.ok) return null` (403 incluido) y
el hook se queda con lo que tenía (`src/lib/hooks/useBetaChat.ts:499-516`). Un 403 es indistinguible de "no hay briefing".

### §0.4 Permisos, estados de carga y el 403

| Pieza | Medido | `archivo:línea` |
|:--|:--|:--|
| `canAccess(module, action)` | agente si `isAgentModule(module)`; si no, monolito (`isAdmin ⇒ true`, `'FULL_ACCESS' ⇒ true`, clave ausente ⇒ **false**) | `src/lib/context/PermissionsContext.tsx:194-216` |
| Tri-estado del agente | `resolviendo | resuelto | sin-verificar` | `PermissionsContext.tsx:27`, `:177-192` |
| Payload del agente | `GET {AGENT}/api/agency/{id}/my-permissions`, `!ok ⇒ null` | `PermissionsContext.tsx:60-79` |
| Módulos del agente en el front | `AgentModulePermissions = { cobranza, cotizador, estudio?, matching?, avaluos? }` — **sin `naira`** | `src/lib/auth/agent-module-access.ts:24-31` |
| Posturas | `cobranza|cotizador` FAIL-CLOSED · `estudio|matching|avaluos` ausente ⇒ PERMITIDO | `agent-module-access.ts:33-34`, `:52-65` |
| Gate de página del agente (el bueno) | `AgentModuleGate`: `resolviendo ⇒ esqueleto` · `sin-verificar ⇒ «No pudimos verificar tu acceso» + Reintentar` · `!canAccess(module,'view') ⇒ negado` | `src/components/auth/AgentModuleGate.tsx:40-95` (`:83` acción fija `'view'`) · usado en `cobros/cobranza/layout.tsx:18`, `postulaciones/asegurabilidad/layout.tsx:12-24` |
| `PageGuard` | acción por defecto `'view'`; si no pasa **redirige** a `/panel/inmobiliaria` (sin decir por qué) | `src/components/auth/PageGuard.tsx:39-65` |
| `PermissionGate` | UI parcial; `fallback` por defecto «Acceso restringido»; `null` = no pintar | `src/components/auth/PermissionGate.tsx:29-58` · consumidores `inquilinos/page.tsx:121`, `:148`, `documentos/page.tsx:274` |
| `AgencyRoleGuard` | por rol del monolito (`managers`/`members`), redirige | `src/components/auth/AgencyRoleGuard.tsx:25-52` |
| Clasificador de fallos | recupera el status de un `Error('403')` **sólo si el mensaje ES el número** (`/^[1-5]\d\d$/`) | `src/lib/errores/clasificar.ts:63-64`, `:84-122` |
| 403 ⇒ «No tienes acceso a esto», **sin** reintentar | `tipo: 'sinPermiso'`, `sePuedeReintentar: false` | `clasificar.ts:141-151` |
| Cartel de fallo | `<FalloDeCarga>`: reintentar sólo si sirve; `role="alert"`, `data-tipo={fallo.tipo}` | `src/components/estado/FalloDeCarga.tsx:76-92`, `:140-150` |
| Orden de estados | `<EstadoDeDatos>`: cargando → **falló (antes que los hijos)** → vacío → hijos; `conservarContenido` deja los hijos ante un fallo | `src/components/estado/EstadoDeDatos.tsx:49-93` (`:73`) |
| Varias fuentes, un solo fallo | `error={a.errorCrudo ?? b.errorCrudo}` ⇒ cualquier fallo tapa todo | `src/app/panel/inmobiliaria/reportes/page.tsx:828-840` |

**Análogo POSITIVO de "un 403 no pinta datos parciales":** `SalaAgente` corta con `return` en `isLoading` y en `error` **antes** de
leer `overview` (`src/components/inmobiliaria/ai/SalaAgente.tsx:109-132`, datos recién en `:162`). Idem `<EstadoDeDatos>` sin
`conservarContenido` (`EstadoDeDatos.tsx:73-88`).

🔴 **ANTI-análogos medidos (renderizan datos + error a la vez):**
- `src/lib/hooks/piloto/use-piloto-detalle.ts:54-66` — el `catch` hace `setError` y **no** `setData(null)`; tras una acción el cajón
  llama `refetch()` (`PilotoCajon.tsx:227`) y, si vuelve 403, pinta el cartel de error (`PilotoCajon.tsx:385`) **y** el detalle viejo
  (`PilotoCajon.tsx:406`: `{!alerta && data && (`).
- `src/lib/hooks/piloto/use-piloto-briefing.ts:59-61` — mismo patrón (error sin limpiar `data`).
- `src/components/inmobiliaria/ai/lessons/ChatLessonsPanel.tsx:137` — `if (error && lessons.length === 0)` ⇒ con lecciones ya cargadas
  un 403 de refresco **deja la lista**. Y detecta el 403 por substring (`:96` `message.includes('403')`).
- `src/lib/hooks/useBetaChat.ts:88` — `STORAGE_KEY = 'leasefy-beta-conversations'` sin usuario/agencia: la conversación persiste en
  `localStorage` (`:248`) y se vuelve a pintar aunque el micro niegue.
- Gate por heurística de rol en vez de por la respuesta del micro: `PilotoCajon.tsx:196-199`, `PilotoBandeja.tsx:128-133`
  (`agencyRole !== 'VIEWER'` con el rol del **monolito**, comparado contra roles del **agente** en el comentario).

### §0.5 Componentes de UI que ya resuelven un pedazo (y los que enseñan lo contrario)

| Necesidad de Naira | Análogo medido | ANTI-análogo medido |
|:--|:--|:--|
| "Actualizado hace…" junto a un dato | `relativeTime(iso, t)` → `hace {{n}}s|m|h|d` (`src/components/inmobiliaria/ai/ColaHumana.tsx:132-142`; claves `inmobiliaria.ai.workspace.tiempo.*`) · `t('inmobiliaria.piloto.procesos.actualizado', { hace })` = «Actualizado {{hace}}» (`PilotoDock.tsx:114-119`) · `EquipoAgentes.tsx:236-238` con `generatedAt` | KPIs de la Sala **sin** `generatedAt` a la vista (`SalaAgente.tsx:167-181`; el tipo lo trae: `agent-workspace.ts:56`). Hay un SEGUNDO `relativeTime(ts, locale)` en `@/lib/cartera` (`QuoteHeader.tsx:7`, `:90`): no mezclar las dos firmas |
| Número en mono tabular | `font-mono tabular-nums` (`PilotoCajon.tsx:288-297`) · regla `DESIGN.md:39` | `font-sans` en cifras (prohibido `DESIGN.md:39`) |
| Chip/estado con tono semántico | `StatusBadge` + `SEVERIDAD_TONE: Record<Severidad, SemanticTone>` (`ColaHumana.tsx:35`, `:154-160`) · mapa finito con fallback neutro y tokens `bg-*-soft text-*` (`contratos/(retencion)/aprobar/RevisionesClient.tsx:67-100`) | paleta cruda por categoría `border-l-blue-400`/`emerald`/`amber` + `bg-white/60` (`src/components/beta/ActionProposalCard.tsx:46-56`, `:134`) — viola `DESIGN.md:33-37` |
| Estado sólo con color | — | prohibido: «Color alone for state → Color + icon + text» (`docs/DESIGN.md:427-445`) |
| Botones de feedback | `IconButton` + `aria-pressed` + `Tooltip` (`src/components/beta/AssistantBubble.tsx:171-213`) | el feedback es **local**: `rateMessage` sólo muta estado (`useBetaChat.ts:1474-1487`) y el toast agradece sin haber guardado nada (`AssistantBubble.tsx:97-107`) |
| Aprobar / rechazar con confirmación | `AlertDialog` con `confirmTitle`/`confirmBody` por acción + `alreadyReviewed` ⇒ `toast.warning` (`RevisionesClient.tsx:148-178`, `:222-237`, `:450-469`) · regla: nada de `window.confirm` (`src/components/ui/sin-dialogos-del-navegador.test.ts:37`, `:67`) | `ActionProposalCard` muestra `resumen` (texto libre del micro) antes que la consecuencia y etiquetas hardcodeadas (`ActionProposalCard.tsx:26-38`, `:90`) |
| Editar/borrar por ítem | lista con acciones por fila deshabilitadas en vuelo (`ai/lessons/ChatLessonCard.tsx:207-246`) + resultado "rechazado por la valla" como `toast` con razón (`ChatLessonsPanel.tsx:92`) | «Descartar»/«Revertir» de un clic **sin** confirmación (`ChatLessonCard.tsx:222-243`) — para "borrar" en Naira (irreversible: `erasure` redacta el linaje, `naira-memory.ts:216-229`) hace falta `AlertDialog` |
| Detalle con contexto + traza + enlaces | cajón `Sheet` con encabezado fijo, cuerpo con `data-lenis-prevent`, pila «volver» (`PilotoCajon.tsx:1-33`, `:247-300`; pila en `piloto/page.tsx:96-116`) | enlaces del micro pintados **verbatim**, incluso externos (`PilotoCajon.tsx:474-494`) |
| Traza del caso | `TrazaCaso` (`ai/TrazaCaso.tsx:99-190`) | pinta `entry.actorId` (quién) en cada línea (`TrazaCaso.tsx:179`) — **B-5** |
| Briefing | el "lectura del Gerente" de Inicio (`piloto/page.tsx:120-133` → `PilotoPulso.tsx:205-206`) | **aplana** `resumen[]`+`narrativa[]` y los pinta con `lectura.join(' ')`: pierde cualquier clase por oración |
| Estados de una lista del agente | `ColaHumana` (props `items/isLoading/error/onAction`, `ColaHumana.tsx:164-187`) | — |
| Sala de un workspace | `SalaAgente` (`SalaAgente.tsx:70-93`) | tipada a `AgenteId` sin `naira` (`src/lib/api/work-item.ts:13-20`) y alimentada por `/ai-hub/agentes/{agente}/overview`, que Naira no expone ⇒ mostraría «el agente aún no reporta métricas» (`SalaAgente.tsx:134-160`) |
| Métricas por persona | — | `AgenteLeaderboard` (ranking con medallas, `src/components/inmobiliaria/AgenteLeaderboard.tsx:27`) — **B-5** |
| Diseño del backoffice | — | `src/app/admin/admin.css` (clases `card/btn/pill` propias, no shadcn — `CLAUDE.md` §Estructura) |

### §0.6 Cómo se testea hoy (vitest + happy-dom, SIN testing-library)

- `vitest.config.ts:9` `environment: 'happy-dom'` · `:20` `setupFiles: ['./vitest.setup.ts']` (arregla `localStorage` de Node 25,
  `vitest.setup.ts:56-67`) · `:24` `include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts']` (tests **colocados**
  junto al archivo) · `:42` alias `@`.
- **No hay `@testing-library`** (0 en `package.json` y lockfile; `src/components/beta/ActionProposalCard.test.tsx:5` «not in this project's
  deps»; `.claude/skills/testing-patterns/SKILL.md:23` «No RTL»). El arnés es `createRoot` + `act`:
  `src/components/inmobiliaria/ai/SalaAgente.test.tsx:57-90` · `src/components/estado/EstadoDeDatos.test.tsx:21-38`
  (`IS_REACT_ACT_ENVIRONMENT = true` en `:26`).
- i18n en tests: `vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))` (es.json REAL, `SalaAgente.test.tsx:17`)
  o `t: (k) => k` (`piloto/PilotoCajon.test.tsx:36-39`).
- Mock de dependencias por módulo: `PermissionsContext`, hook, servicio, `sonner` (`PilotoCajon.test.tsx:41-69`); portal de Radix ⇒
  leer `document.body.textContent` (`:108-109`).
- Servicio: `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 403)))` + `rejects.toThrow(...)`
  (`src/lib/api/ai-hub-lessons.test.ts:153-157`); env con `vi.stubEnv('NEXT_PUBLIC_AGENT_URL', …)` (`src/lib/hooks/use-chat-lessons.test.tsx:78`).
- **E2E** (`playwright.config.ts:16` `testDir: './tests/e2e'`; sin `webServer`, `:65-66`): proyecto `panel-a11y` (`:59-63`) con
  `seedAuthState(page)` (`tests/e2e/panel-a11y/_helpers/auth-helpers.ts:159`) + `page.route(glob, route => route.fulfill({...}))`
  (`tests/e2e/panel-a11y/ai-hub.a11y.spec.ts:39-59`) + `runAxeOrFixme`/`assertNoBlockingViolations` (`_helpers/axe-helpers.ts:137`, `:161`).
  `tsconfig.json` **excluye** `tests/e2e` ⇒ el CI no tipa los specs.

***

## §1 — Afirmaciones (brief, `CLAUDE.md`, skills, ROADMAP) que el código contradice o matiza

| # | Afirmación | Realidad medida | Consecuencia para los planes |
|:--|:--|:--|:--|
| F13-1 | "3 servicios con la guarda `NODE_ENV === 'production'` → false: `funnel`, `funnel-applications`, `aprobacion`" (`CLAUDE.md` §Contratos) | `grep -rn "NODE_ENV === 'production'" src/lib` (sin tests) → **2**: `src/lib/api/config.ts:48` y `src/lib/api/funnel.service.ts:25`. `funnel-applications.service.ts` **no existe** (`git ls-files`). `aprobacion.service.ts` «NO pega a ningún backend» (`aprobacion.service.ts:12-16`) | el molde de guarda es `config.ts:43-57` (+ `isMockMode()` `:70-72`), no "los tres servicios" |
| F13-2 | "vitest + happy-dom + testing-library" (brief) | sin RTL (§0.6) | todo test de componente usa `createRoot`+`act` |
| F13-3 | skill `agent-api-contract`: mock por defecto `!== 'false'` y `src/lib/api/mock.ts` (`.claude/skills/agent-api-contract/SKILL.md:23`, `:37-38`, `:51`) | `config.ts:47-50` es opt-in (`=== 'true'`); `src/lib/api/mock.ts` **no existe** | no seguir la skill en este punto |
| F13-4 | skill `agency-permissions`: «`PermissionGate` … no tiene consumidores» (`SKILL.md:24`) | 3 consumidores (§0.4) | `PermissionGate fallback={null}` es un patrón vivo para ocultar un botón |
| F13-5 | `CLAUDE.md` §Trabajo de UI: «botones primarios en mayúsculas» | `docs/DESIGN.md:35` y `:226`: **sentence case**, pills; `DESIGN.md` es la fuente de verdad | copy de botones en sentence case |
| F13-6 | "`WorkspaceNav` en el layout" (brief) | lo monta `CabeceraDelAgente` (`CabeceraDelAgente.tsx:40`) dentro de `<main>` (`layout.tsx:314`) | registrar el slug alcanza; no se toca el layout |
| F13-7 | "AI Hub existente" (ROADMAP crit. 1) | en el front no hay una página "AI Hub": hay **Inicio** (`/piloto`, "torre de control de los agentes", gate "como el hub /ai", `layout.tsx:168-188`), **Chat** (raíz, `src/app/panel/inmobiliaria/page.tsx:1-29`) y `/configuracion/agentes` (destino del viejo `/ai`, `rutas-por-ciclo-de-vida.data.mjs:69-70`). El backend de las tres es `/api/agency/{id}/ai-hub/*` (`piloto.ts:11-14`, `ai-hub-chat.ts:7-8`) | B13-1 |
| F13-8 | "un 403 no renderiza datos parciales" se puede heredar | **ningún** hook del agente limpia `data` en el `catch` (§0.4) | el hook nuevo tiene que hacerlo, y el test tiene que pasar **datos + 403 a la vez** (el test de error de la Sala pasa sólo `error: '500'`: `SalaAgente.test.tsx:112-117`) |
| F13-9 | "se consume detrás de un mock con fixtures del contrato" | el "contrato" existe en disco sólo para la memoria (`naira-memory.ts:84-172`); el resto es texto de planes | fixtures de memoria **derivados de esos zod**; los demás, marcados como provisionales en el fixture |

***

## §2 — Decisiones que bloquean el diseño (para el CONTEXT)

### 🔴 B13-1 — ¿Dónde vive Naira dentro del "AI Hub"?

| Opción | Qué implica (medido) | Tests que la cubren | Riesgo |
|:--|:--|:--|:--|
| **(A) Dentro de Inicio** (`/piloto`): briefing en el lugar de la "lectura del Gerente" (`piloto/page.tsx:120-133`), open loops como banda nueva, señal/aprobación en el patrón cajón (`PilotoCajon`), "qué cree Naira" como sub-página tipo `/piloto/procesos` (`piloto/procesos/page.tsx:1-20`) | cero cambios de nav; gate `module: null` de Inicio (`layout.tsx:172-183`) ⇒ el 403 del micro es la ÚNICA compuerta; sin `WorkspaceNav` ni intro | **ninguno** de §0.2 | falso verde de navegación (hay que escribir un guardián propio, §5.8) |
| **(B) Workspace N3 registrado** dentro de un módulo existente (p. ej. `reportes` — `arquitectura-del-panel.ts:263-271` — o el que el CONTEXT elija) | fila `{ labelKey, href, icon, module, ia: true, agente: 'naira' }` + `AGENT_WORKSPACES` con el MISMO `basePath` + `page.tsx` por pestaña + i18n es/en + `AGENT_INTROS` | todos los de §0.2 | choca con «no se crea … una sección paralela» (crit. 1) — es una sección nueva |
| **(C) Sólo Chat** (raíz) | conversación en `ChatContainer`; `BackendDispatchAgent` no incluye Naira (`ai-hub-chat.ts:30-37`) | ninguno | no cubre briefing/loops/memoria |

Lectura literal del criterio 1 ⇒ (A) para briefing/loops/señal/aprobación y (A)+(C) para conversación; (B) sólo si el CONTEXT
decide que un workspace N3 no es "sección paralela". **No agregar un módulo N2**: rompe `arquitectura-del-panel.test.ts:202` (17).

### 🔴 B13-2 — El gate del front no puede preguntar por `'view'`

`WorkspaceNav.tsx:36`, `agency-nav-filter.ts:71`, `PageGuard.tsx:39` (default) y `AgentModuleGate.tsx:83` preguntan
`canAccess(module, 'view')`. El agente de Naira no tiene una acción `view` (§0.0). Opciones: (a) `naira` en `FAIL_CLOSED_MODULES`
(`agent-module-access.ts:33`) + pedir la acción REAL por pantalla (`briefing-view`, `memory-view`…), sin `PageGuard`/`AgentModuleGate`
tal como están (ambos fijan `'view'`); (b) alias en `resolveAgentModuleAccess` (`naira`+`'view'` ⇒ "alguna `*-view`"); (c) sin gate
de front (`module: null`, como Inicio) y el 403 del micro manda. En (a)/(b): `gates-del-panel.test.ts:85-87` pasa porque
`isAgentModule('naira')` pasa a ser true; `agent-module-access.test.ts:21` («los cinco») hay que actualizarlo.
**Nunca** `ABSENT_ALLOWED_MODULES` (`agent-module-access.ts:34`): con el micro caído o sin la clave, concede.

### 🔴 B13-3 — Semántica del 403 (el micro es la autoridad)

- Criterio 3 prohíbe datos parciales ⇒ el hook de Naira, ante `403`: `setData(null)` **y** `setError(err)`, y el componente evalúa el
  error **antes** que los datos (molde `SalaAgente.tsx:109-132` / `EstadoDeDatos.tsx:73-88`, sin `conservarContenido`).
- Un briefing compuesto (briefing + loops + señales) con **una** fuente en 403: ¿se tapa todo o sólo esa banda? Molde "todo":
  `reportes/page.tsx:828-840`. Molde "por widget": `piloto/page.tsx:47-48` ("fail-soft POR WIDGET"). Decidir; el test lo fija.
- El servicio tira `new Error(String(res.status))` (exactamente el número) para que `clasificarFallo` lo lea como 403
  (`clasificar.ts:63-64`, `:112`). `Error('naira briefing 403')` ⇒ `tipo: 'servidor'` + «Intentar de nuevo» (`clasificar.ts:227-235`). Helper listo: `esSinPermiso(error)` (`clasificar.ts:251-253`).
- 404 de la memoria = «Naira apagada para el tenant, ítem no creído / de otro tenant» (`naira-memory.ts:169`), **no** "endpoint no
  publicado": la convención `404 ⇒ notAvailable` (`piloto.ts:149`) sirve para la vista, pero en `correction`/`erasure` un 404 es un error
  del ítem. 409 = revisión vieja / ya redactado (`:170`) ⇒ refetch + aviso (molde `alreadyReviewed`, `RevisionesClient.tsx:228-232`).

### 🟠 B13-4 — Mock-first sin mentir

Guarda de `config.ts:43-57` (nunca en producción; opt-in). Fixtures en `src/lib/data/mock-naira.ts` (precedente `mock-retencion.ts`).
El mock se elige ANTES de la red (`if (isMockMode()) return fixture`), **nunca** en el `catch` (anti `retencion.ts:49-53`). Pantalla con
mock ⇒ `<AvisoDatosDeEjemplo queEsInventado=… queFalta=…>` (`RevisionesClient.tsx:248-254`). Los fixtures incluyen un caso 403 y uno
con `asOf` viejo.

### 🟠 B13-5 — Tipos: espejo a mano hasta que el agente publique

`generated/agent.ts` no tiene Naira (§0.0) y no se edita a mano (`CLAUDE.md` §Contratos). Molde: `piloto.ts:3-26` (cabecera MIRROR,
endpoints, "no inventar campos") en `src/lib/types/naira.ts`. Para la memoria, copiar los nombres de `naira-memory.ts:84-172`
(`NairaMemoryItem`, `…Content` con `present|erased`, `…Error = { error, reason|null }`). Cuando el agente publique: `pnpm api:gen` +
`paths[...]` (molde `use-calls.ts:22-29`) y borrar el espejo.

### 🟠 B13-6 — Drill-down: mapa tipado entidad → ruta del ERP, no `href` del micro

Anti: `PilotoCajon.tsx:474-494` pinta cualquier `href` (hasta externos). Molde de "ruta de panel validada": `rutaDeRegreso`
(`src/lib/nav/ruta-de-regreso.ts:17-21`) + `conRegreso` (`:24-27`). Rutas y params medidos en §6.

### 🟠 B13-7 — B-5 en el front

Prohibido pintar: `writtenBy.userId`/`proposedBy.userId` (memoria), `actorId` en trazas (anti `TrazaCaso.tsx:179`), rankings o
métricas por persona (anti `AgenteLeaderboard.tsx`), "quién aprobó/cerró". Sí: `writtenBy.kind` (`user`/`system`) como "una persona del
equipo" / "Naira". Test estático sugerido: el árbol `naira/` no contiene `userId`/`actorId` en JSX (§5.8).

### 🟢 B13-8 — Conversación: ¿dentro del Chat o panel propio?

El Chat persiste en `localStorage` con clave global (`useBetaChat.ts:88`, `:248`) y no tiene a Naira en el roster (`ai-hub-chat.ts:30-37`).
Si la conversación con Naira va al Chat, un 403 debe borrar lo persistido de ese hilo; si va en panel propio, estado en memoria.

***

## §3 — Clasificación de archivos (nombres PROVISIONALES)

| # | Archivo nuevo / MOD | Rol | Flujo | Análogo más cercano | Calidad |
|:--|:--|:--|:--|:--|:--|
| 1 | `src/lib/types/naira.ts` | model | transform | `src/lib/api/piloto.ts:26-135` + zod de `agent-account-manager/src/server/routes/naira-memory.ts:84-172` | exacto (forma) |
| 2 | `src/lib/api/naira.service.ts` | service | request-response | `src/lib/api/piloto.ts:139-152`, `:337-363`, `:428-462` | exacto |
| 3 | `src/lib/data/mock-naira.ts` | fixture | batch (estático) | `src/lib/data/mock-retencion.ts` (ubicación) + `funnel.service.ts:45-59` (rotulado) | de rol |
| 4 | `src/lib/hooks/naira/use-naira-{briefing,open-loops,senal,memoria,aprobaciones}.ts` | hook | request-response | `src/lib/hooks/piloto/use-piloto-briefing.ts:27-79` + `use-piloto-detalle.ts:69-81` | exacto con Δ (limpiar `data` en 403) |
| 5 | `src/lib/hooks/naira/use-naira-conversacion.ts` | hook | streaming | `src/lib/api/ai-hub-chat.ts:449-487` + `useBetaChat.ts` | de rol |
| 6 | `src/lib/naira/fuente-erp.ts` | utility | transform | `src/lib/nav/ruta-de-regreso.ts:17-27` | de rol |
| 7 | `src/components/inmobiliaria/naira/ClaseDeAfirmacion.tsx` | component | transform | `RevisionesClient.tsx:67-100` + `ColaHumana.tsx:154-160` | de rol |
| 8 | `src/components/inmobiliaria/naira/CifraConFuente.tsx` | component | transform | `ColaHumana.tsx:132-142` + `PilotoDock.tsx:114-119` | de rol |
| 9 | `src/components/inmobiliaria/naira/NairaBriefing.tsx` | component | request-response | `SalaAgente.tsx:97-160` (estados) + slot de `PilotoPulso` | de rol |
| 10 | `src/components/inmobiliaria/naira/NairaOpenLoops.tsx` | component | CRUD (feedback) | `ColaHumana.tsx:164-187` + `AssistantBubble.tsx:171-213` | de rol |
| 11 | `src/components/inmobiliaria/naira/NairaSenal.tsx` (cajón) | component | request-response | `PilotoCajon.tsx:188-300` | exacto con Δ |
| 12 | `src/components/inmobiliaria/naira/NairaAprobacion.tsx` | component | request-response (HITL) | `RevisionesClient.tsx:222-237`, `:450-469` | exacto |
| 13 | `src/components/inmobiliaria/naira/NairaMemoria.tsx` (+ `NairaMemoriaItem.tsx`) | component | CRUD | `ai/lessons/ChatLessonsPanel.tsx` + `ChatLessonCard.tsx:207-246` | de rol |
| 14 | `src/components/inmobiliaria/naira/NairaConversacion.tsx` | component | streaming | `src/components/beta/ChatContainer.tsx` | parcial |
| 15 | `src/components/inmobiliaria/naira/NairaGate.tsx` (si B13-2 = a) | middleware (UI) | request-response | `src/components/auth/AgentModuleGate.tsx:40-95` | exacto con Δ (acción) |
| 16 | Páginas (según B13-1): (A) MOD `src/app/panel/inmobiliaria/piloto/page.tsx` + `piloto/naira/…/page.tsx`; (B) `src/app/panel/inmobiliaria/<modulo>/naira/**/page.tsx` | route | request-response | (A) `piloto/page.tsx:76-228`, `piloto/procesos/page.tsx`; (B) `postulaciones/matching/page.tsx:40-99` | exacto |
| 17 | MOD `src/lib/auth/agent-module-access.ts` (+ `.test.ts`) | config | — | el propio archivo `:24-34` | exacto |
| 18 | MOD (sólo B) `src/lib/nav/arquitectura-del-panel.ts`, `agentWorkspaceNav.ts`, `src/components/tour/AgentIntroModal.tsx` | config | — | fila `:160` + bloque avalúos `agentWorkspaceNav.ts:164-176` + `AgentIntroModal.tsx:51-57` | exacto |
| 19 | MOD `src/lib/i18n/locales/{es,en}.json` + `src/lib/i18n/claves-naira.test.ts` | config + test | — | `src/lib/i18n/claves-avaluos.test.ts:18-106` | exacto |
| 20 | Tests de componente/hook/servicio colocados (`*.test.ts[x]`) | test | — | `SalaAgente.test.tsx`, `PilotoCajon.test.tsx`, `ai-hub-lessons.test.ts`, `use-chat-lessons.test.tsx` | exacto |
| 21 | `src/lib/nav/naira-en-el-hub.test.ts` (guardián propio, sobre todo si B13-1 = A) + guardián B-5 | test (estático) | file-I/O | `arquitectura-del-panel.test.ts:63-77`, `fichas-con-vuelta.test.ts:42-77`, `sin-dialogos-del-navegador.test.ts` | de rol |
| 22 | `tests/e2e/panel-a11y/naira.a11y.spec.ts` + `tests/e2e/naira-403.spec.ts` | test (E2E) | request-response | `tests/e2e/panel-a11y/ai-hub.a11y.spec.ts:10-80` | de rol (el 403 no tiene precedente) |
| 23 | MOD `.planning/releases/v1.md` (fila del PR) | docs | — | `.planning/releases/v1.md:1-15`, `README.md:32` | exacto |

***

## §4 — Asignación de patrones por archivo (análogo y ANTI-análogo, con `archivo:línea`)

### 1. `src/lib/types/naira.ts` — el espejo del contrato (UI-01..03)

**Análogo:** `src/lib/api/piloto.ts:3-26` (cabecera MIRROR) y `:123-135` (tipo defensivo). **Forma real de la memoria:** zod del agente.

```ts
// agent-account-manager/src/server/routes/naira-memory.ts:84-86, :97-116, :131-133, :160-162 (lo que el espejo copia, sin zod)
const WrittenBySchema = z.discriminatedUnion('kind', [z.object({ kind: z.literal('user'), userId: z.string() }), z.object({ kind: z.literal('system') })])
const ContentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('present'), text: z.string() }),
  z.object({ kind: z.literal('erased'), erasedAt: z.string(), erasedBy: WrittenBySchema }),
])
const ItemSchema = z.object({ id, layer, provenance, trust, writtenBy, derivedFrom, recordedAt, revision /* bigint string */, content })
const ViewSchema = z.object({ snapshot: { revision }, items: z.array(ItemSchema), pendingProposals: z.array(ProposalSchema), generatedAt: z.string() })
const ErrorSchema = z.object({ error: z.string(), reason: z.string().nullable() })
```

- Vocabularios cerrados como uniones literales (molde `work-item.ts:13-20`; `Record<Union, …>` exhaustivo en `ColaHumana.tsx:145-160`):
  `ClaseDeAfirmacion = 'dato' | 'inferencia' | 'recomendacion'` y `claimClass` con **fallback neutro** para un valor desconocido
  (molde "mapas finitos con FALLBACK neutro", `RevisionesClient.tsx:67`).
- Todo número del contrato viaja con `asOf` (ISO) y `fuente: { entidad, id }` — nunca un `href` (B13-6).
- **ANTI:** `revision` es `bigint` como string (`naira-memory.ts:113`, `:119`): no `Number(...)`.
- **ANTI:** `PilotoBriefing` todo-opcional (`piloto.ts:128-135`) sirve para un shape que "no fija el contrato"; Naira SÍ lo fija ⇒ campos
  requeridos, y un payload que no valida es **error**, no "no se pinta".

### 2. `src/lib/api/naira.service.ts` — transporte (UI-03)

**Análogo exacto:** `piloto.ts:139-152` (lectura) + `:337-363` (escritura).

```ts
// src/lib/api/piloto.ts:145-152
async function getJson<T>(path: string, signal?: AbortSignal): Promise<PilotoFetchResult<T>> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('not_configured')
  const res = await agentFetch(`${agentUrl}${path}`, { signal })
  if (res.status === 404) return { data: null, notAvailable: true }
  if (!res.ok) throw new Error(`${res.status}`)
  return { data: (await res.json()) as T, notAvailable: false }
}
```

```ts
// src/lib/api/piloto.ts:344-362 (escritura: nunca tira, devuelve {ok,error})
if (!agentUrl) return { ok: false, error: 'not_configured' }
try {
  const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/ai-hub/agentes/${agente}/autonomia`,
    { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modo }) })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: errBody.error ?? `${res.status}` }
  }
  return { ok: true, data: (await res.json()) as PilotoAutonomiaPutResponse }
} catch (err) { return { ok: false, error: err instanceof Error ? err.message : 'put_failed' } }
```

- Δ Naira: la escritura devuelve también `status` (el cuerpo de error de Naira es `{ error, reason }`, `naira-memory.ts:160-162`; `error`
  puede ser prosa en inglés, «Forbidden — naira:memory-erase required», `:472`) ⇒ la UI decide por `status`, no por `error`.
- Δ Naira: el mock se decide **arriba**, antes de la red: `if (isMockMode()) return fixture` (guarda `config.ts:43-57`).
- Usar `agentFetch` (reintento 401) y **no** `globalThis.fetch` crudo (`agent-workspace.ts:177`, `retencion.ts:38`, `ai-hub-chat.ts:413`).
- **ANTI:** `retencion.ts:49-53` (catch ⇒ mock) · `ai-hub-chat.ts:725-736` (non-OK ⇒ `null` silencioso) · `ai-hub-chat.ts:419`
  (`Error('ai-hub chat 403')` no lo clasifica `clasificar.ts:63-64`).

### 3. `src/lib/data/mock-naira.ts` — fixtures del contrato

**Análogo de ubicación:** `src/lib/data/mock-retencion.ts` (+ tipos en `src/lib/types/retencion.ts`, importados por `retencion.ts:15-23`).
**Análogo de honestidad:** el resultado demo se marca en el dato (`stubMode: true`, `funnel.service.ts:45-59`) y la pantalla lo dice
(`<AvisoDatosDeEjemplo>` `RevisionesClient.tsx:248-254`).

```ts
// src/lib/api/config.ts:47-50 — la guarda que decide si se sirve el fixture
const useMock =
  process.env.NODE_ENV === 'production'
    ? false
    : process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
```

- Fixtures mínimos: briefing con ≥1 oración de cada clase y una causal con `claimClass`; cifra con `asOf` de hace >12 h (crit. 2:
  «un dato correcto de hace 13 horas»); open loop con los 3 feedbacks; señal con ≥2 entidades afectadas de tipos distintos (§6);
  propuesta de acción con consecuencia; memoria con un ítem `present` y uno `erased`; **un escenario 403** por endpoint.
- Sin nombres ni `userId` de personas reales (B-5 / regla «no datos inventados» `AvisoDatosDeEjemplo.tsx:7-12`).
- **ANTI:** `retencion.ts:43-54` (el fixture como red de seguridad del `catch`).

### 4. `src/lib/hooks/naira/use-naira-*.ts` — hooks de lectura (UI-01, UI-03)

**Análogo:** `src/lib/hooks/piloto/use-piloto-briefing.ts:27-79` (abort por fetch, `notAvailable`, agencia de `useAuth()`).

```ts
// src/lib/hooks/piloto/use-piloto-briefing.ts:49-65
abortRef.current?.abort()
const controller = new AbortController()
abortRef.current = controller
try {
  setIsLoading(true)
  const res = await fetchPilotoBriefing(agencyId, controller.signal)
  if (controller.signal.aborted) return
  setData(res.data)
  setNotAvailable(res.notAvailable)
  setError(null)
} catch (err) {
  if (controller.signal.aborted) return
  setError(err instanceof Error ? err.message : 'Failed to fetch piloto briefing')   // ← ANTI: `data` queda
} finally {
  if (!controller.signal.aborted) setIsLoading(false)
}
```

- Δ obligatorio (crit. 3): en el `catch`, `setData(null)` **siempre** (o al menos si `esSinPermiso(err)`, `clasificar.ts:251-253`), y
  exponer el error **entero** además del mensaje (molde `errorCrudo`, `src/lib/hooks/ai/use-agent-overview.ts:40-43`, `:77-80`) para
  `<FalloDeCarga error={…}>`.
- Detalle por id: limpiar al cambiar de id (molde `use-piloto-detalle.ts:69-81` — «sobre ese caso viejo se dibujarían los botones de acción»).
- **Vivir en `src/lib/hooks/`** (no en `src/lib/naira/`): el guardián `cuatro-estados` sólo detecta hooks de red bajo esa carpeta
  (`src/components/estado/cuatro-estados.test.ts:43-67`) — fuera de ahí, una pantalla que pinte vacío sin mirar el error pasa verde.
- **ANTI:** `use-piloto-detalle.ts:61-63`, `use-piloto-briefing.ts:59-61` (error sin limpiar datos).

### 5. `src/lib/hooks/naira/use-naira-conversacion.ts` — preguntas a Naira (UI-01)

**Análogo de transporte:** `ai-hub-chat.ts:449-487` (POST + reader SSE; `splitSSEEvents`/`handleSSEEvent` exportados y testeables sin red,
`:270-284`). Endpoint planificado `/api/agency/{agencyId}/naira/conversation/questions` (planes 9.5; no existe en disco).
- Estado en memoria o `localStorage` con clave **por agencia y usuario**; ante 403, borrar el hilo (B13-8).
- **ANTI:** `useBetaChat.ts:88` (`'leasefy-beta-conversations'` global) y `:1474-1487` (feedback sólo local).

### 6. `src/lib/naira/fuente-erp.ts` — de `{ entidad, id }` a la ficha del ERP (UI-02)

**Análogo:** `src/lib/nav/ruta-de-regreso.ts:17-27` (valida que la ruta sea del panel; arma `?volver=`).

```ts
// src/lib/nav/ruta-de-regreso.ts:17-27
export function rutaDeRegreso(volver: string | null | undefined, porDefecto: string): string {
  if (!volver) return porDefecto;
  if (!volver.startsWith(PANEL) || volver.startsWith('//')) return porDefecto;
  return volver;
}
export function conRegreso(destino: string, origen: string): string {
  const separador = destino.includes('?') ? '&' : '?';
  return `${destino}${separador}volver=${encodeURIComponent(origen)}`;
}
```

- `Record<EntidadErp, (id) => string>` exhaustivo con las rutas de §6 (las trampas de param están ahí: el `[id]` de inmuebles es una
  **consignación**; `/cobros/{id}` **no tiene** `page.tsx`; inquilinos es `?persona=<tenantId>`).
- Entidad sin ficha ⇒ `null` ⇒ la cifra se muestra **sin** enlace y con el motivo (molde `DetalleEnlace.razon`, `piloto.ts:284-290`),
  nunca un enlace a 404.
- Test: `it.each` sobre el mapa ⇒ cada destino tiene `page.tsx` (molde `tienePagina`, `arquitectura-del-panel.test.ts:63-77`).
- **ANTI:** `PilotoCajon.tsx:474-494` (href del micro verbatim, externos incluidos).

### 7. `src/components/inmobiliaria/naira/ClaseDeAfirmacion.tsx` — DATO / INFERENCIA / RECOMENDACIÓN + `claimClass` (crit. 4)

**Análogo:** mapa finito con fallback neutro y tokens semánticos.

```ts
// src/app/panel/inmobiliaria/contratos/(retencion)/aprobar/RevisionesClient.tsx:69-87 (extracto)
interface DecisionMeta { label: string; icon: PhosphorIcon; badge: string }
const DECISION_META: Record<DecisionType, DecisionMeta> = {
  plan_created:    { label: 'Plan creado',      icon: ClipboardText, badge: 'bg-primary-soft text-primary' },
  escalated_legal: { label: 'Escalado a legal', icon: Scales,        badge: 'bg-warning-soft text-warning' },
  ...
}
```

```ts
// src/components/inmobiliaria/ai/ColaHumana.tsx:154-160 — tono de Cadence
export const SEVERIDAD_TONE: Record<Severidad, SemanticTone> = { critica: 'critical', alta: 'critical', media: 'warning', baja: 'success' }
```

- Tres clases ⇒ **color + icono + texto** (regla `DESIGN.md:427-445`), texto vía i18n; tokens `-soft` sin opacidad (`DESIGN.md:104-116`:
  `bg-danger-soft/70` no se genera). Una sola marca cobalto por momento (`DESIGN.md:22`, `:34`).
- **ANTI:** `ActionProposalCard.tsx:46-56` (azul/esmeralda/ámbar crudos) · `PilotoPulso.tsx:205-206` (`lectura.join(' ')`: la oración pierde
  su clase) · `SalaAgente.tsx:129` (pinta el `error` crudo dentro del texto).

### 8. `src/components/inmobiliaria/naira/CifraConFuente.tsx` — número + `asOf` + enlace (crit. 2)

**Análogo:** `relativeTime(iso, t)` y el rótulo «Actualizado …».

```ts
// src/components/inmobiliaria/ai/ColaHumana.tsx:132-142
export function relativeTime(iso: string, t: TranslateFn): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (deltaSec < 60) return t(`${WORKSPACE_NS}.tiempo.s`, { n: deltaSec })
  ...
  return t(`${WORKSPACE_NS}.tiempo.d`, { n: Math.round(deltaHr / 24) })
}
```

```tsx
// src/components/inmobiliaria/piloto/PilotoDock.tsx:114-119
{procesos.data && (
  <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
    {enVivo > 0 ? t('inmobiliaria.piloto.dock.enVivo', { n: String(enVivo) })
                : t('inmobiliaria.piloto.procesos.actualizado', { hace: relativeTime(procesos.data.tomadoAt, t) })}
  </span>
)}
```

- Δ: `asOf` inválido ⇒ `relativeTime` devuelve `''` (`:134`) ⇒ la cifra NO se pinta "sin fecha" (el crit. 2 dice que sin la marca es
  indistinguible de una alucinación): se pinta como dato no fechado explícito o no se pinta. Además de lo relativo, la fecha absoluta en
  `title`/texto (molde `TrazaCaso.tsx:179`, `absolute(...)`, sin el `actorId`).
- Cifras `font-mono tabular-nums` (`DESIGN.md:39`); dinero con `formatCurrency` (`PilotoCajon.tsx:295-297`).
- **ANTI:** KPIs de la Sala sin `generatedAt` visible (`SalaAgente.tsx:167-181`) · `relativeTime(ts, locale)` de `@/lib/cartera` (otra firma).

### 9. `NairaBriefing.tsx` — el briefing (UI-01, crit. 1-4)

**Análogo de estados:** `SalaAgente.tsx:97-160` — `return` temprano en cargando y en error, **antes** de tocar los datos.

```tsx
// src/components/inmobiliaria/ai/SalaAgente.tsx:109-134 (extracto)
if (isLoading) { return (<div className="space-y-4" data-testid="sala-agente-loading">…</div>) }
if (error) { return (<div className="rounded-lg border border-danger/30 bg-danger-soft text-danger" data-testid="sala-agente-error">…</div>) }
if (!overview) { /* 404 / notAvailable — empty state monocromo, NO banner de error */ }
```

- Δ: el error va por `<FalloDeCarga error={errorCrudo} queEs="el briefing">` (403 ⇒ «No tienes acceso a esto», sin reintentar,
  `FalloDeCarga.tsx:84-92`) o `<EstadoDeDatos>` **sin** `conservarContenido`.
- Cada oración del briefing con su `<ClaseDeAfirmacion>`; cada número con `<CifraConFuente>`.
- Si vive en Inicio (B13-1 = A): ocupa el lugar de `lecturaDelGerente` (`piloto/page.tsx:120-133`) y respeta el marco de la página
  (`space-y-6 p-6 lg:p-8`, `piloto/page.tsx:35-45`, `:150`).
- **ANTI:** `PilotoPulso.tsx:205-206` (aplanado) · `useBetaChat.ts:499-516` (briefing fail-open).

### 10. `NairaOpenLoops.tsx` — lista + 3 botones de feedback (útil / no útil / ya lo sabía)

**Análogo de lista:** `ColaHumana` (props `items/isLoading/error/onAction`, `ColaHumana.tsx:164-187`; paginación `TablePagination` +
`useTablePagination`, `:47-48`). **Análogo del botón:** `IconButton` + `aria-pressed` + `Tooltip`.

```tsx
// src/components/beta/AssistantBubble.tsx:171-190
<Tooltip content={t('beta.actions.like')}>
  <IconButton type="button" icon={<ThumbsUp className="w-3.5 h-3.5" weight={message.feedback === 'up' ? 'fill' : 'regular'} />}
    variant="ghost" onClick={() => handlePulgar('up')} aria-pressed={message.feedback === 'up'}
    className={cn('p-1.5 rounded-sm hover:bg-surface-muted', message.feedback === 'up' ? 'text-primary' : 'text-fg-subtle hover:text-fg-muted')}
    aria-label={t('beta.actions.like')} />
</Tooltip>
```

- Δ: tres opciones con **texto visible** (no sólo icono: `DESIGN.md:427-445`), estado `aria-pressed` desde la **respuesta del servidor**
  (endpoint planificado `…/naira/signals/{promocionId}/feedback`), deshabilitado en vuelo (molde `ChatLessonCard.tsx:214-215`), toast de
  éxito **sólo** tras `ok` (molde `PilotoCajon.tsx:224-231`).
- 403 al mandar feedback ⇒ `toast.error` con copy de permiso y **no** marcar el botón.
- **ANTI:** `useBetaChat.ts:1474-1487` + `AssistantBubble.tsx:97-107` (marca local y agradece sin persistir).

### 11. `NairaSenal.tsx` — detalle de señal con entidades afectadas (UI-01, UI-02)

**Análogo:** el cajón `PilotoCajon` (Sheet derecha, encabezado fijo, cuerpo con scroll y `data-lenis-prevent`, pila «volver»).

```tsx
// src/components/inmobiliaria/piloto/PilotoCajon.tsx:248-262 (extracto)
<Sheet open={apertura !== null} onOpenChange={(abierto) => !abierto && onClose()}>
  <SheetContent side="right" hideCloseButton className={cn('flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl', …)} data-testid="piloto-cajon">
```

- Entidades afectadas: lista de filas con `CifraConFuente`/`fuente-erp` (una fila = una ficha del ERP), **no** los `enlaces` libres.
- Δ crítico: el cuerpo es excluyente — `cargando | 403/error | notAvailable | datos` (un solo bloque). El cajón actual pinta error y
  datos a la vez (`PilotoCajon.tsx:385`, `:406`).
- Si la ficha es una RUTA (`…/[id]/…Client.tsx`), lleva `<VolverALaLista href label>` (`src/components/inmobiliaria/ai/VolverALaLista.tsx:34-62`;
  lo exige `fichas-con-vuelta.test.ts:65-77`).
- Modales/cajones: `createPortal` y `data-lenis-prevent` (`DESIGN.md:427-445`); cabecera estándar del Dialog (`modales-alineados.test.ts:73-87`).

### 12. `NairaAprobacion.tsx` — aprobar/rechazar con **consecuencia primero** (`ROADMAP.md:372` crit. 5 de la Fase 12; «se renderiza en la Fase 13» `ROADMAP.md:374`)

**Análogo exacto:** confirmación con `AlertDialog`, título y cuerpo por acción, conflicto concurrente.

```tsx
// src/app/panel/inmobiliaria/contratos/(retencion)/aprobar/RevisionesClient.tsx:222-237
const onConfirm = async () => {
  if (!pending) return
  const { decision, action } = pending
  setPending(null)
  try {
    const result = await review(decision.id, action.outcome)
    if (result.alreadyReviewed) { toast.warning('Otra persona ya revisó esta decisión') } else { toast.success('Revisión registrada') }
    await refetch()
  } catch { toast.error('No pude registrar la revisión. Intenta de nuevo.') }
}
```

```tsx
// RevisionesClient.tsx:450-469
<AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{pending?.action.confirmTitle}</AlertDialogTitle>
      <AlertDialogDescription>{pending?.action.confirmBody}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isReviewing}>Cancelar</AlertDialogCancel>
      <Button type="button" variant={pending?.action.variant ?? 'default'} hideArrow isLoading={isReviewing} onClick={onConfirm}>{pending?.action.label}</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- Δ: la **consecuencia** (qué efecto concreto produce y sobre qué entidad) va arriba, el razonamiento debajo, las clases de afirmación
  visibles; copy del cuerpo desde el contrato (plantilla), no texto libre.
- B-5: el `toast.warning` del molde dice «Otra persona ya revisó»; **no** nombrar quién. Nada de "aprobado por X".
- **ANTI:** `ActionProposalCard.tsx:84-140` (resumen libre + colores crudos) · `ai-hub-chat.ts:423-443` (aprobación que "no ejecuta"
  ─ la UI de Naira tiene que decir qué pasa de verdad) · `window.confirm` (prohibido, `sin-dialogos-del-navegador.test.ts:67`).

### 13. `NairaMemoria.tsx` — «qué cree Naira sobre nosotros» con corregir / borrar por ítem (crit. 4)

**Análogo de rol:** la valla de lecciones del chat (lista de "lo que el asistente aprendió", acciones por ítem, razón del rechazo visible).
Montada hoy en Configuración → «Automatización IA» (`src/app/panel/inmobiliaria/configuracion/contenido.tsx:12`, `:54`;
sección `ia` con gate `todos`, `configuracion/secciones.ts:196-202`).

```tsx
// src/components/inmobiliaria/ai/lessons/ChatLessonCard.tsx:207-231 (extracto)
{canCertify && (isCandidate || isCertified) && (
  <div className="mt-4 flex flex-wrap items-center gap-2">
    {isCandidate && (<>
      <Button size="sm" variant="default" isLoading={isBusy} disabled={isBusy} hideArrow onClick={() => onDecide(lesson.id, 'certified')}>…Certificar</Button>
      <Button size="sm" variant="outline" disabled={isBusy} onClick={() => onDecide(lesson.id, 'rejected')}>…Descartar</Button>
    </>)}
```

- Contrato real: `GET …/naira/memory` ⇒ `{ snapshot, items[], pendingProposals[], generatedAt }`; corregir `POST …/items/{itemId}/correction`
  con `{ text }` (1..4000); borrar `POST …/items/{itemId}/erasure` con `{ motivo }` (enum `ERASURE_REASONS`) (`naira-memory.ts:131-139`,
  `:201-229`). Respuestas de error: 403 (acción fuera de la matriz / miembro no resuelto), 404 (Naira apagada o ítem no creído),
  409 (revisión vieja / ya redactado), 422 (contenido rechazado por la pantalla de PII, `reason` sin el texto) (`:166-172`).
- Δ: **borrar** con `AlertDialog` (irreversible: «Borrar efectivamente un ítem (texto y vector de su linaje entero)», `naira-memory.ts:220`);
  **corregir** con formulario (molde de campos en cajón `PilotoAccionForm.tsx`); 409 ⇒ refetch + aviso; 422 ⇒ mostrar `reason` traducido.
- Mostrar `provenance`, `trust`, `derivedFrom.kind` y `recordedAt` (con `CifraConFuente`-style `asOf`); ítem `erased` ⇒ «borrado el …»,
  **sin** `erasedBy.userId`.
- Gate por acción: pintar «Corregir»/«Borrar» sólo si `canAccess('naira','memory-correct'|'memory-erase')` (B13-2 a/b) — o con
  `PermissionGate module=… action=… fallback={null}` (`PermissionGate.tsx:29-42`) — y **aun así** manejar el 403 del POST.
- **ANTI:** `ChatLessonsPanel.tsx:137` (lista queda con error) · `:96` (403 por substring) · `ChatLessonCard.tsx:222-243` (sin confirmación)
  · `ChatLessonsPanel.tsx:60-62` (`isAgencyManager` del rol del **monolito** como proxy del permiso del agente).

### 14. `NairaConversacion.tsx` — conversación (UI-01)

**Análogo parcial:** `src/components/beta/ChatContainer.tsx` (turnos, snapshot deduplicado por lo que SE VE: `ChatContainer.tsx:242-256`,
porque `generatedAt` cambia cada turno) + `AssistantBubble.tsx` (acciones por mensaje). Cada respuesta de Naira con clases de afirmación y
cifras con fuente. **ANTI:** persistencia global (`useBetaChat.ts:88`).

### 15. `NairaGate.tsx` — compuerta de página (si B13-2 = a/b)

**Análogo exacto:** `AgentModuleGate` (tres estados, sin acusar mientras resuelve).

```tsx
// src/components/auth/AgentModuleGate.tsx:49-94 (extracto)
if (isLoading || agentAccessStatus === 'resolviendo') { return <PageSkeleton variant="dashboard" /> }
if (agentAccessStatus === 'sin-verificar') { return (/* «No pudimos verificar tu acceso» + Reintentar → refetch() */) }
if (!canAccess(module, 'view')) { return (/* deniedTitle + t('inmobiliaria.ai.access.contactAdmin') */) }
return <>{children}</>
```

- Δ: recibir `action` (no fijar `'view'`, `:83`). El gate del front es UX; la autoridad es el 403 del micro (crit. 3) — el gate NO reemplaza
  el manejo del 403 en cada hook.
- **ANTI:** `PageGuard.tsx:50-54` (redirige a la portada sin decir por qué; lo documenta `ctas-del-sidebar.test.ts:9-13`).

### 16. Páginas — `page.tsx` (+ `XxxView.tsx` + `XxxClient.tsx`)

- Patrón del repo (`CLAUDE.md` §Estructura): `page.tsx` + `XxxView.tsx` (presentación) + `XxxClient.tsx` (interacción). Par medido:
  `postulaciones/soportes/DocumentReviewQueueView.tsx` + `DocumentReviewQueueClient.tsx`. Las páginas de agentes hoy son `'use client'`
  enteras con el guard envolviendo un componente interno (`postulaciones/matching/page.tsx:91-99`).
- (B13-1 = A) MOD `src/app/panel/inmobiliaria/piloto/page.tsx:76-228` (la página es dueña de los hooks y del cajón; «fail-soft por widget»
  `:47-48`) + sub-páginas como `piloto/procesos/page.tsx` (enlace desde el encabezado `piloto/page.tsx:166-174`).
- (B13-1 = B) una `page.tsx` por pestaña de `AGENT_WORKSPACES` (lo exige `arquitectura-del-panel.test.ts:84-89`); el primer
  `<PageGuard module=…>` del archivo = `module` de la fila (`gates-del-panel.test.ts:169-203`) — si el gate es `NairaGate`, la fila
  lleva `module: null` + `roles`, o el test no la compara.
- Fichas dinámicas `…/[id]/XxxClient.tsx` ⇒ `VolverALaLista` (`fichas-con-vuelta.test.ts:35-40`).

### 17. MOD `src/lib/auth/agent-module-access.ts` (+ test) — `naira` como módulo del agente

```ts
// src/lib/auth/agent-module-access.ts:24-34
export interface AgentModulePermissions {
  cobranza: string[];
  cotizador: string[];
  /** Added by the agent-repo pair PR — optional so either repo merges first. */
  estudio?: string[];
  matching?: string[];
  avaluos?: string[];
}
const FAIL_CLOSED_MODULES = ['cobranza', 'cotizador'] as const;
const ABSENT_ALLOWED_MODULES = ['estudio', 'matching', 'avaluos'] as const;
```

- Δ: `naira?: string[]` + `'naira'` en `FAIL_CLOSED_MODULES` (ausente ⇒ **denegado**, no permitido). Tests nuevos en el molde de
  `agent-module-access.test.ts:75-90` (FAIL CLOSED) y ajustar «recognizes the five» (`:21`).
- El payload del agente ya lo trae si `resolvePermissions` expone el módulo `naira` (`agent-account-manager/src/server/routes/permissions-matrix.ts:66`,
  `PermissionsModule = 'cobranza' | 'cotizador' | 'naira'`). NO MEDIDO: que la ruta `my-permissions` del agente incluya `naira` en su
  respuesta (verificar en el Paso 0 del plan).

### 18. MOD nav (sólo B13-1 = B)

```ts
// src/lib/nav/arquitectura-del-panel.ts:160 — la fila N3 de un workspace
{ labelKey: 'inmobiliaria.ai.nav.avaluos', href: r('/inmuebles/avaluos'), icon: Scales, module: 'avaluos', ia: true, agente: 'avaluos' },
```

```ts
// src/lib/nav/agentWorkspaceNav.ts:165-176 — el workspace con el MISMO basePath
{
  slug: 'avaluos',
  basePath: AVALUOS,
  labelKey: 'inmobiliaria.ai.nav.avaluos',
  icon: Scales,
  module: 'avaluos',
  items: [
    { labelKey: 'inmobiliaria.ai.nav.resumen', href: AVALUOS, icon: SquaresFour, exact: true, module: 'avaluos' },
    { labelKey: 'inmobiliaria.ai.nav.avaluosCola', href: `${AVALUOS}/cola`, icon: ClipboardText, module: 'avaluos' },
    { labelKey: 'inmobiliaria.ai.nav.avaluosConfiguracion', href: `${AVALUOS}/configuracion`, icon: SlidersHorizontal, module: 'avaluos' },
  ],
},
```

- + entrada en `AGENT_INTROS` (`AgentIntroModal.tsx:51-57`, imagen distinta por agente, `:35`) + claves es/en.
- Trampas: `WorkspaceNav` filtra items con `canAccess(item.module, 'view')` (`WorkspaceNav.tsx:36`) ⇒ con `module: 'naira'` y sin
  alias (B13-2) **ninguna** pestaña se ve para no-admins; con <2 pestañas visibles no hay barra (`:45`). El gate de la fila del sidebar
  usa también `'view'` (`agency-nav-filter.ts:71`).

### 19. i18n — claves nuevas + guardián de claves

- Todo copy nuevo en `src/lib/i18n/locales/es.json` **y** `en.json` (bloque `inmobiliaria.ai` empieza en `es.json:5066`; `nav` de los
  agentes en `es.json:5092-5111` / `en.json:5052-5071`). `t()` con clave faltante **devuelve la clave** y avisa por consola
  (`src/lib/i18n/i18n-context.tsx:75-82`): en pantalla sale `inmobiliaria.naira.loQueSea`, no revienta.
- Guardián propio en el molde de `src/lib/i18n/claves-avaluos.test.ts:18-106` (lista de claves ⇒ `existe(es)` y `existe(en)`), porque
  el test de la arquitectura sólo cubre `labelKey` de nav (`arquitectura-del-panel.test.ts:175-188`).
- Etiquetas: R4 (`arquitectura-del-panel.test.ts:221-248`) si hay fila; nada termina en «IA» con `ia: true` (`:336-342`); vocabulario en
  `docs/VOCABULARIO.md`.

### 20. Tests colocados (componente / hook / servicio)

**Componente** — molde `SalaAgente.test.tsx:17-90` (i18n real vía stub, `next/link` → `<a>`, `createRoot` + `act`):

```tsx
// src/components/inmobiliaria/ai/SalaAgente.test.tsx:17, :57-72
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
let container: HTMLDivElement
let root: Root
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container) })
afterEach(() => { act(() => { root.unmount() }); container.remove(); vi.restoreAllMocks() })
```

**Componente con hook mockeado** — molde `PilotoCajon.test.tsx:36-69` (mock de `PermissionsContext`, del hook y del servicio; leer
`document.body` por el portal, `:108-109`).

**Servicio** — molde `ai-hub-lessons.test.ts:153-157`:

```ts
it('throws on 403 (VIEWER cannot certify)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 403)));
  await expect(/* … */).rejects.toThrow('ai-hub chat lessons certify 403');
});
```
Δ Naira: la aserción es `rejects.toThrow('403')` **exacto** (o `.status === 403`) para que `clasificarFallo` lo lea.

**Hook** — molde `use-chat-lessons.test.tsx:16-22`, `:78` (`vi.mock` del servicio + `vi.stubEnv('NEXT_PUBLIC_AGENT_URL', …)`).

🔴 **El test del 403 (crit. 3) tiene que montar DATOS + 403 a la vez**: primer render con datos, refetch que rechaza con `Error('403')`,
aserción `querySelector('[data-testid="fallo-de-carga"][data-tipo="sinPermiso"]')` presente **y** ningún nodo de datos
(`FalloDeCarga.tsx:147-150` da los `data-*`). El test de error existente pasa sólo `error` (`SalaAgente.test.tsx:112-117`) y el de
`EstadoDeDatos` prueba lo contrario (`conservarContenido`, `EstadoDeDatos.test.tsx:97-99`): copiar esos tal cual da **falso verde**.

### 21. Guardianes estáticos propios

- **Si B13-1 = A** (Inicio): un test que recorra las rutas de Naira y exija `page.tsx` (copiar `tienePagina`,
  `arquitectura-del-panel.test.ts:63-77`) y que ninguna viva bajo `/ai` (`:98-127`), porque ningún test de §0.2 las ve.
- **B-5:** recorrer `src/components/inmobiliaria/naira/**` y `src/app/**/naira/**` y fallar si el JSX referencia `userId`, `actorId`,
  `writtenBy.userId`, `proposedBy`, `erasedBy.userId` (molde de recorrido + lista de infractores: `sin-dialogos-del-navegador.test.ts:27-67`;
  molde "lista que sólo puede achicarse": `cuatro-estados.test.ts:86-89`, `:130-145`).
- **Tokens:** `pantallas-en-tokens.test.ts:83` cubre una lista `COBERTURA` fija — un archivo nuevo NO se revisa hasta agregarlo a esa lista.

### 22. E2E — `tests/e2e/panel-a11y/naira.a11y.spec.ts` + `tests/e2e/naira-403.spec.ts`

**Análogo:** `tests/e2e/panel-a11y/ai-hub.a11y.spec.ts:10-80`.

```ts
// tests/e2e/panel-a11y/ai-hub.a11y.spec.ts:39-59 (extracto)
test.beforeEach(async ({ page }) => { await seedAuthState(page) })
await page.route(HUB_LANDING_MOCK, async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(POPULATED_LANDING) })
})
await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
```

- `seedAuthState` siembra `isAdmin: true`, `FULL_ACCESS`, `role: 'ADMIN'` y permisos de agente **sólo** de cobranza/cotizador
  (`auth-helpers.ts:116-125`) ⇒ el gate del front **siempre pasa**; el 403 del spec se simula en el endpoint de Naira con
  `route.fulfill({ status: 403, body: JSON.stringify({ error: 'Forbidden', reason: null }) })` registrado DESPUÉS de `seedAuthState`
  (`auth-helpers.ts:110-114`). Si B13-2 exige `naira` en `my-permissions`, el spec tiene que sobreescribir ese mock también.
- Glob del mock: `**/naira/**` (el string `/panel/inmobiliaria/ai` prohibido también en `tests/`, `arquitectura-del-panel.test.ts:123`).
- `runAxeOrFixme` hace `test.fixme` si la página no montó (`axe-helpers.ts:137-139`) ⇒ **falso verde** si la ruta o el mock están mal.
  La suite a11y arrastra ~54 fallos preexistentes, muchos del sidebar (`tests/e2e/panel-a11y/MOCKS-DEBT.md`, tabla «Failure categories»).
- Ningún E2E de hoy simula un 403 (`grep -rn "status: 403" tests/e2e` → 0): no hay precedente de spec, sólo de mecanismo.

### 23. MOD `.planning/releases/v1.md` — tren de versiones del front

Cada PR agrega su fila en la versión ABIERTA (`.planning/releases/v1.md:3` «Estado: ABIERTA»; regla `README.md:32`). No decidir cortes.

***

## §5 — Patrones transversales (aplican a TODO archivo nuevo de la fase)

1. **Transporte:** `agentFetch` + `NEXT_PUBLIC_AGENT_URL` + `/api/agency/${agencyId}/naira/...`; lectura `{ data, notAvailable }`, escritura
   `{ ok, status, error }` (§4.2). Agencia desde `useAuth().agency?.id` (`use-piloto-briefing.ts:28-29`).
2. **Orden de estados sin excepción:** cargando → **fallo** → vacío → datos; nunca `conservarContenido` en Naira
   (`EstadoDeDatos.tsx:61-92`). El hook limpia `data` al fallar (§4.4).
3. **403 = `Error(String(status))`** ⇒ `<FalloDeCarga>` lo dice sin reintentar (`clasificar.ts:141-151`, `FalloDeCarga.tsx:90-92`).
4. **Mock arriba, nunca en el `catch`:** `isMockMode()` (`config.ts:70-72`) + `<AvisoDatosDeEjemplo>` (§4.3).
5. **Clase epistémica + `asOf` + fuente** en cada oración/número (§4.7, §4.8, §6). Color + icono + texto; tokens `-soft`; cifras mono.
6. **Confirmación = `AlertDialog`**, nunca `window.confirm` (`sin-dialogos-del-navegador.test.ts:67`); modales con cabecera estándar
   (`modales-alineados.test.ts:73-87`) y `data-lenis-prevent` en el cuerpo con scroll (`DESIGN.md:427-445`).
7. **Toast:** `toast` de `sonner`/`@/components/ui/toast` sólo tras `ok`; un único `<Toaster>` global (`layout.tsx:340-343`).
8. **B-5:** ningún `userId`/`actorId`/"quién" en la UI (§2 B13-7), ni rankings (`AgenteLeaderboard`).
9. **DESIGN.md manda sobre CLAUDE.md** en botones (sentence case, pills: `DESIGN.md:35`, `:226`); sin glass ni gradientes en datos
   (`DESIGN.md:33`, `:40`); el backoffice `src/app/admin/admin.css` no es referencia.

***

## §6 — Rutas del ERP para el drill-down (medidas en `src/app/panel/inmobiliaria/**`)

| Entidad | Ruta | Param y qué es | Honra `?volver=` | `archivo:línea` |
|:--|:--|:--|:--|:--|
| Inmueble | `/panel/inmobiliaria/inmuebles/{id}` | ⚠️ `id` = **`consignacionId`**, no el id de la propiedad | no | `inmuebles/[id]/page.tsx:214-221` |
| Contrato | `/panel/inmobiliaria/contratos/{id}` | `useParams<{ id }>` | no | `contratos/[id]/page.tsx:79` |
| Propietario | `/panel/inmobiliaria/propietarios/{id}` | `params.id` | **sí** (`rutaDeRegreso`) | `propietarios/[id]/page.tsx:386-393` |
| Cobro | `/panel/inmobiliaria/cobros/{id}/cuenta-de-cobro` | `useParams<{ id }>` | **sí** | `cobros/[id]/cuenta-de-cobro/page.tsx:30-33` — ⚠️ **no existe** `cobros/[id]/page.tsx` |
| Inquilino | `/panel/inmobiliaria/inquilinos?persona={tenantId}` | abre `InquilinoDrawer`; compara `i.tenantId`; si no está, lo dice | — | `inquilinos/page.tsx:194-229` |
| Cuenta por pagar | `/panel/inmobiliaria/pagos/cxp/{id}` | `useParams()` | no | `pagos/cxp/[id]/page.tsx:415` |
| Lote de dispersión | `/panel/inmobiliaria/pagos/dispersiones/lotes/{id}` | `useParams<{ id }>` | no | `pagos/dispersiones/lotes/[id]/page.tsx:17` |
| Caso de Pagos (agente) | `/panel/inmobiliaria/pagos/{id}` | work item del agente | no | `pagos/[id]/page.tsx:1-12` |
| Caso de Conciliación (agente) | `/panel/inmobiliaria/conciliacion/{id}` | work item del agente | no | `conciliacion/[id]/page.tsx` (existe) |
| Listas sin ficha | `/solicitudes`, `/facturacion`, `/mantenimientos`, `/agenda`, `/documentos` | sólo listado: ningún segmento `[x]` propio (única excepción `mantenimientos/tickets/[ticketId]`, FUERA del catálogo, `arquitectura-del-panel.ts:195-203`) | — | `find <modulo> -type d -name '[[]*'` → sólo `tickets/[ticketId]` |

- El link lleva `conRegreso(ruta, rutaActualDeNaira)` (`ruta-de-regreso.ts:24-27`); sólo 2 fichas lo leen. `lugarDeRegreso` rotula
  `'otro'` todo lo que no sea contrato/inmueble/cobro/propietario/dispersiones (`ruta-de-regreso.ts:56-77`).
- Todas estas rutas están detrás de su propio `PageGuard`/permiso: un drill-down a una ficha que el rol no puede abrir redirige a la
  portada (`PageGuard.tsx:50-54`). Mostrar el link sólo si `canAccess(module_de_la_ficha, 'view')` (módulos de fila en §0.2 / `arquitectura-del-panel.ts:154-253`).

***

## §7 — Comandos de verificación y forma del CI

**Sin `node_modules` (lo que un plan puede exigir hoy, determinista):**

```bash
cd /Users/nicolasgarcia/rent/wt-front-naira
git status --porcelain ; git log --oneline -1                                   # piso
grep -rn "NODE_ENV === 'production'" src/lib --include='*.ts' | grep -v test     # guardas de mock (hoy 2)
grep -c naira src/lib/api/generated/agent.ts                                     # 0 hasta que el agente publique
grep -rnE "/panel/inmobiliaria/ai\b" src tests --include='*.ts' --include='*.tsx' --include='*.mjs' | grep -v generated/   # debe ser vacío
grep -rnE "userId|actorId" src/components/inmobiliaria/naira src/app --include='*.tsx' | grep -i naira   # B-5: vacío
grep -rn "window\.confirm\|window\.alert" src/components/inmobiliaria/naira       # vacío
python3 -c "import json;es=json.load(open('src/lib/i18n/locales/es.json'));en=json.load(open('src/lib/i18n/locales/en.json'));print('naira' in es['inmobiliaria'], 'naira' in en['inmobiliaria'])"
find src/app/panel/inmobiliaria -path '*naira*' -name page.tsx                   # una por ruta/pestaña
```

(⚠️ el grep de la máquina es ugrep: evitar `.{0,N}` sobre UTF-8; para JSON usar python.)

**Con `node_modules`** (requiere `@leasefy/cadence` en `../cadence` = `/Users/nicolasgarcia/rent/cadence`, `package.json:31`; existe):

```bash
pnpm exec vitest run src/lib/nav src/lib/auth/agent-module-access.test.ts src/components/estado src/components/ui/sin-dialogos-del-navegador.test.ts
pnpm exec vitest run src/components/inmobiliaria/naira src/lib/hooks/naira src/lib/api/naira.service.test.ts src/lib/i18n/claves-naira.test.ts
pnpm exec tsc --noEmit            # lo corre el CI (no tipa tests/e2e: tsconfig.json "exclude")
pnpm lint                         # manual (next lint) — NO lo corre el CI
pnpm api:check                    # manual; sólo si se tocó el contrato del agente (hoy NO aplica: espejo a mano)
pnpm build                        # manual antes de PR
npx playwright test --project=panel-a11y tests/e2e/panel-a11y/naira.a11y.spec.ts   # requiere dev server :3001
```

**CI** (`.github/workflows/ci.yml`): job `test` = clona `Leasefy/cadence` en `../cadence` (`:59-64`) → `pnpm install --frozen-lockfile`
(`:70`) → `pnpm exec tsc --noEmit` (`:75`) → `pnpm test` (`:79`). El job `e2e` es `workflow_dispatch` + `continue-on-error` (`:95-100`):
**ningún E2E bloquea un merge**. Lint, `api:check` y `build` son gates manuales (`CLAUDE.md` §Gates manuales).

***

## §8 — Tabla final: archivo nuevo probable → análogo → anti-análogo → trampa medida

| Archivo (provisional) | Análogo (`archivo:línea`) | ANTI-análogo (`archivo:línea`) | Trampa medida |
|:--|:--|:--|:--|
| `src/lib/types/naira.ts` | `piloto.ts:3-26`, `:123-135`; zod `naira-memory.ts:84-172` | todo-opcional `piloto.ts:128-135` (Naira sí fija el shape) | `revision` es bigint-string (`naira-memory.ts:113`); `writtenBy.userId` existe y NO se pinta (B-5) |
| `src/lib/api/naira.service.ts` | `piloto.ts:145-152`, `:337-363` | `retencion.ts:49-53` (catch⇒mock); `ai-hub-chat.ts:725-736` (403⇒null) | `Error('naira 403')` no lo clasifica `clasificar.ts:63-64` ⇒ «Intentar de nuevo» sobre un 403 |
| `src/lib/data/mock-naira.ts` | `mock-retencion.ts` (ubicación); `config.ts:47-50` (guarda) | `retencion.ts:43-54` | CLAUDE.md promete 3 guardas; hay 2 (`config.ts:48`, `funnel.service.ts:25`) |
| `src/lib/hooks/naira/use-naira-*.ts` | `use-piloto-briefing.ts:27-79`; `use-piloto-detalle.ts:69-81`; `use-agent-overview.ts:40-43` | `use-piloto-briefing.ts:59-61`; `use-piloto-detalle.ts:61-63` | fuera de `src/lib/hooks/` el guardián `cuatro-estados.test.ts:43-67` no los ve ⇒ falso verde |
| `use-naira-conversacion.ts` | `ai-hub-chat.ts:449-487`, `:270-284` | `useBetaChat.ts:88`, `:1474-1487` | `localStorage` global: la conversación sobrevive a un 403 y a un cambio de usuario |
| `src/lib/naira/fuente-erp.ts` | `ruta-de-regreso.ts:17-27` | `PilotoCajon.tsx:474-494` | `inmuebles/[id]` = consignación; `cobros/{id}` sin `page.tsx`; inquilino = `?persona=tenantId` |
| `ClaseDeAfirmacion.tsx` | `RevisionesClient.tsx:67-100`; `ColaHumana.tsx:154-160` | `ActionProposalCard.tsx:46-56`; `PilotoPulso.tsx:205-206` | `bg-*-soft/70` no se genera (`DESIGN.md:104-116`); color solo = inválido (`DESIGN.md:427-445`) |
| `CifraConFuente.tsx` | `ColaHumana.tsx:132-142`; `PilotoDock.tsx:114-119`; `EquipoAgentes.tsx:236-238` | `SalaAgente.tsx:167-181` | `relativeTime('')` devuelve `''` (`ColaHumana.tsx:134`): cifra "sin fecha" silenciosa; dos `relativeTime` con firmas distintas |
| `NairaBriefing.tsx` | `SalaAgente.tsx:109-160`; `reportes/page.tsx:828-840` | `piloto/page.tsx:125-133` + `PilotoPulso.tsx:205-206` | test de error de la Sala no pasa datos (`SalaAgente.test.tsx:112-117`) |
| `NairaOpenLoops.tsx` | `ColaHumana.tsx:164-187`; `AssistantBubble.tsx:171-213` | `useBetaChat.ts:1474-1487`; `AssistantBubble.tsx:97-107` | feedback optimista local + toast de éxito sin servidor |
| `NairaSenal.tsx` | `PilotoCajon.tsx:188-300` | `PilotoCajon.tsx:385` + `:406` | error y datos viejos a la vez tras `refetch` (`:227`) |
| `NairaAprobacion.tsx` | `RevisionesClient.tsx:222-237`, `:450-469` | `ActionProposalCard.tsx:84-140`; `ai-hub-chat.ts:423-443` | `window.confirm` prohibido (`sin-dialogos-del-navegador.test.ts:67`); «Otra persona ya revisó» sí, «X revisó» no (B-5) |
| `NairaMemoria.tsx` | `ChatLessonCard.tsx:207-246`; `ChatLessonsPanel.tsx:92`; contrato `naira-memory.ts:185-229` | `ChatLessonsPanel.tsx:137`, `:96`; `ChatLessonCard.tsx:222-243` | borrar es irreversible (`naira-memory.ts:220`) ⇒ AlertDialog; 404 = Naira apagada/ítem no creído, 409 = revisión vieja, 422 = PII |
| `NairaConversacion.tsx` | `ChatContainer.tsx:242-256` | `useBetaChat.ts:88` | `generatedAt` cambia en cada turno: comparar lo que se VE |
| `NairaGate.tsx` | `AgentModuleGate.tsx:40-95` | `PageGuard.tsx:50-54` (redirige mudo) | `'view'` fijo (`AgentModuleGate.tsx:83`, `WorkspaceNav.tsx:36`, `agency-nav-filter.ts:71`) y Naira no tiene `view` |
| páginas (A) `piloto/**` | `piloto/page.tsx:76-228`; `piloto/procesos/page.tsx` | — | **ningún** test de navegación cubre `/piloto/*` (`arquitectura-del-panel.test.ts:301`) |
| páginas (B) `<modulo>/naira/**` | `postulaciones/matching/page.tsx:40-99` | `SalaAgente` para Naira (`work-item.ts:13-20`, overview inexistente) | 17 módulos (`arquitectura-del-panel.test.ts:202`); primer `PageGuard` = `module` de la fila (`gates-del-panel.test.ts:169-203`) |
| MOD `agent-module-access.ts` | `:33` FAIL_CLOSED | `:34` ABSENT_ALLOWED (concede sin payload) | `agent-module-access.test.ts:21` «los cinco» |
| MOD nav (B) | `arquitectura-del-panel.ts:160`; `agentWorkspaceNav.ts:165-176`; `AgentIntroModal.tsx:51-57` | Tickets/Retención (mock-first ⇒ fuera del catálogo, `arquitectura-del-panel.ts:181-203`) | las dos puertas o ninguna (`arquitectura-del-panel.test.ts:252-265`); <2 pestañas visibles ⇒ sin barra (`WorkspaceNav.tsx:45`) |
| i18n + `claves-naira.test.ts` | `claves-avaluos.test.ts:18-106` | — | clave faltante ⇒ se pinta la clave (`i18n-context.tsx:78-80`) |
| tests colocados | `SalaAgente.test.tsx:17-90`; `PilotoCajon.test.tsx:36-69`; `ai-hub-lessons.test.ts:153-157` | RTL (no existe) | 403 con datos previos o no prueba nada; `rejects.toThrow('403')` exacto |
| guardianes propios | `arquitectura-del-panel.test.ts:63-77`; `sin-dialogos-del-navegador.test.ts:27-67` | `agency-nav-filter.test.ts:49-70` (fixture propio) | `pantallas-en-tokens.test.ts:83` sólo mira su lista |
| E2E | `ai-hub.a11y.spec.ts:39-80` | — | `seedAuthState` = admin (`auth-helpers.ts:116-120`) ⇒ el gate del front nunca niega; `runAxeOrFixme` hace `fixme` si no montó (`axe-helpers.ts:137-139`); E2E no bloquea (`ci.yml:95-100`) |

***

## §9 — Guion de re-medición (Paso 0 de cada plan)

```bash
cd /Users/nicolasgarcia/rent/wt-front-naira
# 1. Piso — esperado: sólo ?? .planning/naira/ (o los commits de la fase) y base 5e3a6f85
git status --porcelain ; git log --oneline -3 ; git merge-base HEAD origin/Main
# 2. ¿El agente ya publicó Naira en el contrato del front? — esperado hoy: 0 · 0
grep -c naira src/lib/api/generated/agent.ts ; grep -c naira scripts/openapi-snapshot.json
# 3. ¿Existe la ruta de memoria y su forma? (repo del agente, sólo lectura) — esperado: BASE en :183, 403/404/409/422 en :166-172
grep -n "const BASE\|const E40\|const E42" /Users/nicolasgarcia/rent/agent-account-manager/src/server/routes/naira-memory.ts
# 4. Acciones de Naira en la matriz — esperado: 5 acciones, ninguna 'view'
grep -n "export const NAIRA_ACTIONS" /Users/nicolasgarcia/rent/agent-account-manager/src/server/routes/permissions-matrix.ts
# 5. Los gates del front siguen fijando 'view' — esperado: 6 líneas (4 de código: WorkspaceNav.tsx:36, PageGuard.tsx:39, AgentModuleGate.tsx:83, agency-nav-filter.ts:71; + 2 comentarios en agency-nav-filter.ts:10,:49)
grep -n "'view'" src/components/inmobiliaria/ai/WorkspaceNav.tsx src/lib/nav/agency-nav-filter.ts src/components/auth/AgentModuleGate.tsx src/components/auth/PageGuard.tsx
# 6. Conteos que un workspace nuevo movería — esperado: 17 módulos; 7 workspaces; 7 intros
grep -n "toHaveLength(17)" src/lib/nav/arquitectura-del-panel.test.ts ; grep -c "^    slug: '" src/lib/nav/agentWorkspaceNav.ts ; grep -c "^    slug: '" src/components/tour/AgentIntroModal.tsx
# 7. Hooks que NO limpian data al fallar (siguen siendo el anti) — esperado: las dos líneas setError sin setData(null) al lado
grep -n "setError(err" src/lib/hooks/piloto/use-piloto-detalle.ts src/lib/hooks/piloto/use-piloto-briefing.ts
# 8. Guardas de mock — esperado: 2
grep -rn "NODE_ENV === 'production'" src/lib --include='*.ts' | grep -v test | grep -v logger
# 9. Ningún E2E simula 403 — esperado hoy: 0 (la fase agrega el primero)
grep -rn "status: 403" tests/e2e | wc -l
# 10. B-5 en lo nuevo — esperado: vacío
grep -rnE "userId|actorId" src/components/inmobiliaria/naira 2>/dev/null
```

***

## §10 — Sin análogo en el repo (usar RESEARCH / decidir en CONTEXT)

| Pieza | Por qué no hay | Qué usar |
|:--|:--|:--|
| Chip de clase epistémica + `claimClass` por oración | ninguna UI clasifica oraciones (el briefing se aplana: `PilotoPulso.tsx:205-206`) | mapa finito `RevisionesClient.tsx:67-100` + contrato de Naira (planes 9.5/10) |
| Test "403 con datos previos ⇒ nada de datos" | ningún test del repo lo cubre (§4.20) | arnés `SalaAgente.test.tsx:57-90` + hook mockeado `PilotoCajon.test.tsx:45-54` |
| E2E con 403 | `grep "status: 403" tests/e2e` → 0 | mecanismo `route.fulfill` de `ai-hub.a11y.spec.ts:45-59` |
| Mapa entidad → ficha del ERP | los enlaces hoy vienen del micro (`piloto.ts:284-290`) | §6 + `ruta-de-regreso.ts` |
| Gate de front por acción distinta de `view` | los 4 gates fijan `'view'` | B13-2 |
| Guardián de rutas bajo `/piloto/*` | la arquitectura no contiene Inicio | §4.21 |

***

## §11 — Metadata

**Alcance del barrido (front):** `src/lib/nav/**` (13 archivos + tests), `src/app/panel/inmobiliaria/{layout.tsx,page.tsx,*.test.ts,piloto/**,postulaciones/{matching,asegurabilidad,soportes}/**,contratos/(retencion)/aprobar/**,reportes/page.tsx,configuracion/{secciones.ts,contenido.tsx},inquilinos/page.tsx,inmuebles/[id],contratos/[id],propietarios/[id],cobros/[id],pagos/**/[id]}`,
`src/components/inmobiliaria/{ai/**,piloto/**,AgenteLeaderboard.tsx}`, `src/components/{auth,estado,beta,tour,ui}/**` (selección), `src/lib/api/{agent-fetch,agent-auth,agent-workspace,piloto,ai-hub-chat,ai-hub-lessons,config,funnel.service,aprobacion.service,retencion,work-item}.ts`,
`src/lib/hooks/{piloto,ai}/**`, `useBetaChat.ts`, `src/lib/context/PermissionsContext.tsx`, `src/lib/auth/{agency-roles,agent-module-access}.ts`, `src/lib/errores/clasificar.ts`,
`src/lib/i18n/**`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `tests/e2e/panel-a11y/**` (helpers + 1 spec + MOCKS-DEBT), `.github/workflows/ci.yml`, `scripts/api-gen.sh`, `package.json`, `tsconfig.json`,
`docs/DESIGN.md` (§1, §2, §9), `CLAUDE.md`, `.claude/skills/{testing-patterns,agent-api-contract,agency-permissions}/SKILL.md`, `.planning/releases/{README,v1}.md`.
**Agente (sólo lectura):** `src/server/routes/naira-memory.ts`, `src/server/routes/permissions-matrix.ts:63-70`, `src/server/middleware/agency-role.ts:95`, `ROADMAP.md:372-392`, grep de rutas/acciones en `phases/{9.5,10,11,12}-*`.
**Archivos leídos o barridos:** ~110. **Ejecuciones:** 0 (sin `node_modules`). **Escrituras:** sólo este archivo.
**Archivos clasificados:** 23 filas (§3). **Con análogo:** 23/23 — exacto 12 (tipos, servicio, hooks, cajón, aprobación, gate, páginas, agent-module-access, nav, i18n, tests, releases), de rol 10, parcial 1 (conversación). **Piezas sin análogo** (no son archivos, §10): 6.
**Fecha de extracción:** 2026-09-27.
