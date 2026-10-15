---
phase: 13-superficie-naira
plan: "04"
subsystem: front-naira-superficie
tags: [react, next15, vitest, navegacion, i18n, naira, open-loops]

requires:
  - phase: 13-01
    provides: "contrato zod (NairaOpenLoop*, vocabularios del loop), cliente (leerSeguimiento/leerLoop/votarSenal), useLecturaDeNaira, formatearCorte, METRICAS_DEL_CATALOGO, EJEMPLOS_DE_NAIRA"
  - phase: 13-02
    provides: "VistaDeNaira ('seguimiento'/'loop'), ProveedorDeOrigen/useOrigenDeNaira, BotonesDeUtilidad (loop_abierto), guardias B-5 y claimClass que crecen"
  - phase: 13-03
    provides: "rutas-de-naira.ts, workspace naira + WorkspaceNavItem.action, formatearDia/esDiaValido, ranura lineaDeSeguimiento de SenalView, guardia sin sección paralela"
provides:
  - "src/lib/naira/vocabulario-de-seguimiento.ts: nombre conversacional de las 14 métricas, CLAVE_* exhaustivas del loop, fechaLegible"
  - "useNairaSeguimiento(habilitada = true) y useNairaLoop(loopId)"
  - "FilaDeSeguimiento + LineaConFecha + LineaDeSeguimientoDeLaSenal; BitacoraDelLoop"
  - "pestaña B/seguimiento (open-loops-view) y ficha B/seguimiento/[loopId]; RUTA_DEL_SEGUIMIENTO y rutaDelLoop en el registro"
  - "la línea «Seguimiento: <estado> · Ver la bitácora» del detalle de señal como lectura SECUNDARIA"
affects: [13-05, 13-06, 13-07, 13-08]

tech-stack:
  added: []
  patterns:
    - "lectura secundaria = su hook con un booleano de su acción (leer = null ⇒ sin red) y solo pinta en ok"
    - "el dueño de algo de Naira se dice con CLAVE_DEL_ROL («Rol: …»); una fecha que no es cifra, con fechaLegible"

key-files:
  created:
    - src/lib/naira/vocabulario-de-seguimiento.ts
    - src/lib/hooks/naira/use-naira-seguimiento.ts
    - src/lib/hooks/naira/use-naira-loop.ts
    - src/components/inmobiliaria/naira/FilaDeSeguimiento.tsx
    - src/components/inmobiliaria/naira/BitacoraDelLoop.tsx
    - src/app/panel/inmobiliaria/reportes/naira/seguimiento/{page,SeguimientoClient,SeguimientoView}.tsx
    - src/app/panel/inmobiliaria/reportes/naira/seguimiento/[loopId]/{page,LoopClient,LoopView}.tsx
    - "(+ 9 tests colocados)"
  modified:
    - src/lib/i18n/locales/{es,en}.json
    - src/lib/nav/rutas-de-naira.ts
    - src/lib/nav/agentWorkspaceNav.ts
    - src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.tsx

key-decisions:
  - "el voto vive en la fila (loop_abierto sobre loop.promocionId), nunca en la bitácora (P2)"
  - "una lista vacía con ocultos no dice que Naira no sigue nada: solo la frase de ocultos (P6)"
  - "la línea del detalle de señal reusa GET /open-loops (no hay endpoint por señal) y, si falla, se omite sin cartel (P15)"

requirements-completed: []   # UI-01, UI-03 PARCIALES; los cierran 13-05..13-08

duration: 50min (en dos tramos, con un checkpoint en la Tarea 4)
completed: 2026-09-28
---

# Fase 13 Plan 04: Seguimiento de Naira (pestaña, bitácora, línea del detalle de señal) — Summary

**La pestaña Seguimiento (2.ª del workspace de Naira, gateada por `open-loops-view`) lista los loops vivos en el orden del
servidor: el nombre conversacional de la métrica, el estado y la forma, el dueño solo como rol, las fechas legibles y el voto
del loop. La bitácora de un loop respeta ese mismo orden, muestra el cierre y la reasignación sin actor y tiene vuelta a la
pestaña. El detalle de una señal suma «Seguimiento: <estado> · Ver la bitácora» como lectura secundaria: sin la acción no se
pide y, si falla, no deja rastro. Tras un ok, un 403 que llega por el disparador real no deja ningún dato.**

## Performance

- Tramo 1: 17:36 → 17:56 (-05): Paso 0, línea base y Tareas 1-3; en la Tarea 4, checkpoint por dos falsos rojos del control.
- Tramo 2 (MODO RECUPERACIÓN tras `787808cd`): 18:05 → 18:25, Tareas 4-5 y cierre.
- Tareas 5/5. Archivos 25 (los de `files_modified`). Node v20.20.0 (`~/.nvm/versions/node/v20.20.0`, el del CI).

## Condición operativa (reglas del coordinador)

- Toda corrida de vitest, tanto la suite completa como los tests por archivo, las copias y los 5 bloques `automated`, llevó
  `VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`. Cada bloque se extrajo del plan con `export VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`
  como primera línea, que es lo único agregado.
- Las corridas pesadas (las dos de la línea base y la suite completa del cierre de la Tarea 5) fueron envueltas en el candado
  propio del front `/tmp/naira-front-suite.lock` (`until mkdir …; … ; rmdir …`). El cierre de la T5 corrió desde
  `verify_t5_candado.sh`, que difiere del bloque del plan solo en ese envoltorio. `/tmp/naira-suite.lock` no se tocó. Al
  terminar no quedó ningún candado tomado.
- Guarda de lista vacía: en toda corrida por archivo armada con una variable se comprobó antes que la lista no estuviera vacía
  (`test "${#LISTA[@]}" -gt 0 || exit 9`). En los bloques del plan, `REG` solo se corre si `${#REG[@]} -gt 0`.
- Instalación: `pnpm install --frozen-lockfile --offline` (sin red). Los logs de cada verify y su RC están en
  `…/scratchpad/laned/13-04/` (`RC.txt`, `paso0_*.log`, `tarea1.log` … `tarea5.log`, `tarea4.intento1.log`).

## Base encadenada (D13-17)

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

- `BASE-DE-EJECUCION`: `4ad6c188… cambios-nico-10 2026-09-27`, igual a la línea `BASE=` de `13-03-SUMMARY.md` (x1).
- HEAD al empezar (`head_base.txt`): `4237bf99f0061aa4554e365e5590d16cceb96fb6`.
- Agente (`project/account-manager`, SOLO LECTURA): las anclas se midieron al empezar y el bloque de la Tarea 1 las volvió a
  leer; al cerrar, la rama está en `8aadefd70a372ca00ee4d2360984ea08197cfedf` (la mueven otros carriles).
- Deriva: `git rev-list --count "${BASE}..cambios-nico-10"` = **0**; `git merge-tree --write-tree --name-only cambios-nico-10
  HEAD` = árbol `d9662c59…`, RC 0, **sin archivos en conflicto**.

## (1) Paso 0 — salida

- **Punto 1 (base) ⛔ OK:** rama `project/naira-superficie`, árbol limpio; BASE commit RC 0; desciende de 4ad6c188 RC 0; HEAD
  desciende de BASE RC 0; 0 merges. Los commits de `BASE..HEAD` son `docs(13…)`/`<tipo>(13-0N)` y sus archivos quedan dentro de
  `.planning/naira/` ∪ `files_modified` de 13-01..13-04 (0 fuera). Pasan también `6b3f5e2e` y `787808cd`, las correcciones de
  plan del coordinador, que solo tocan `.planning/naira/`.
- **Punto 2 (13-01..13-03 en disco) ⛔ OK:** todos los exports por presencia. De 13-01: `EstadoNaira`, `leerSeguimiento`,
  `leerLoop`, `leerSenal`, `votarSenal`, los `NairaOpenLoop*`, los 5 vocabularios, `RESPUESTA_ESTRICTA_POR_ENDPOINT`,
  `ENDPOINTS_DE_NAIRA`, `LecturaDeNaira`, `useLecturaDeNaira`, `formatearCorte`, `METRICAS_DEL_CATALOGO`, `EJEMPLOS_DE_NAIRA` y
  `USER_IDS_DE_EJEMPLO`. De 13-02: `VistaDeNaira`, `VISTAS_DE_NAIRA` con `'seguimiento'` y `'loop'`, `ProveedorDeOrigen`,
  `useOrigenDeNaira`, `BotonesDeUtilidad` y `OrigenDelVoto` con `'loop_abierto'`, y las tres guardias. De 13-03:
  `RUTA_DE_NAIRA = '/panel/inmobiliaria/reportes/naira'`, `rutaDeLaSenal`, `esDiaValido`, `formatearDia`, `useNairaSenal`, el
  workspace `naira` (`const NAIRA = RUTA_DE_NAIRA`, `action?: string`, `action: 'briefing-view'`),
  `canAccess(item.module, item.action ?? 'view')`, la ranura `lineaDeSeguimiento?: ReactNode`, `SenalClient` con
  `estado={estado}` x1, la guardia con sus tres marcadores y `tabs.briefing` en es y en. Ningún ejecutor anterior renombró nada.
  `ENDPOINTS_DE_NAIRA['seguimiento.lista'].ruta = '/open-loops'` y `['seguimiento.detalle'].ruta = '/open-loops/{loopId}'`, los
  dos con `acciones: ['open-loops-view']`. 13-03 resolvió los `params` de la ficha como `Promise` + `await` (Next 15, D13-19), y
  13-04 hace lo mismo.
- **Punto 3 (anclas del front) ⛔ OK, todas en la línea medida:** `useRefetchOnVisible.ts:17`, `PageGuard.tsx:43`,
  `VolverALaLista.tsx:42`, `empty-state.tsx:106`, `skeleton.tsx:21`, `badge.tsx:94`, `PermissionsContext.tsx:41` y `:278`,
  `auth/index.ts:10`, `cuatro-estados.test.ts:82`, `fichas-con-vuelta.test.ts:36`, `gates-del-panel.test.ts:131`,
  `package.json:73` (next 15.5.26). Existen los iconos Phosphor `ArrowsCounterClockwise` y `Warning` y `src/app/panel/inmobiliaria/page.tsx`.
- **Punto 4 (sin colisión) ⛔ OK:** ninguno de los 14 archivos nuevos existía en la base; los tres `grep -c` dieron 0; las cuatro
  rutas i18n de 13-04 no existían en es ni en en.
- **Punto 5 (entorno) ⛔ OK:** `../cadence` con `"name": "@leasefy/cadence"`, `dist/` y `node_modules/`; `pnpm install
  --frozen-lockfile --offline` ⇒ **RC 0** («Done in 3.9s», postinstall Prisma + MapLibre OK); `package.json` y
  `pnpm-lock.yaml` intactos.
- **Punto 6 (agente, SOLO LECTURA) ⛔ OK:** las anclas de 11-07 (rutas, lista, dueño EFECTIVO, permisos, voto), 11-CONTEXT (4
  vocabularios y `OwnerDeLoop`) y 11-03 (`KINDS_DE_VERIFICACION_DEL_EVENTO`) están presentes con los espacios colapsados. Los 14
  pares de `NOMBRES_CONVERSACIONALES` están en `9.5-01-PLAN.md`. `naira-open-loops.ts` (11-07) y `negativa.ts` (9.5-01) dan
  **RC 128**, así que no están ejecutados: la paridad se midió contra el plan y no hay enmiendas de nombre.
- **Punto 7 (línea base, antes de escribir; candado propio y 4 workers):** `B=/tmp/p1304_base.zAM1aS` (puntero `/tmp/p1304_base.ruta`).

| Corrida | Archivos | Rojos | Tests | Tests fallidos |
|---|---|---|---|---|
| base_1 (17:39→17:45) | 1189 | 1 | 14591 | 1 |
| base_2 (17:45→17:53) | 1189 | 0 | 14591 | 0 |

  - Rojo de base_1: `src/lib/api/puertas-que-faltan.guardian.test.ts`. Rojos de base_2: ninguno. **Inestable: 1** (ese
    archivo). **Rojos en las dos: 0.** `tsc --noEmit`: **RC 0, 0 errores**.

## (2) Contrato publicado tal como quedó en disco

Todos los nombres y props del `<contrato_publicado>` quedaron sin renombrar (los bloques los buscaron por presencia):

- `vocabulario-de-seguimiento.ts` (puro): `NOMBRE_CONVERSACIONAL_DE_LA_METRICA` (14 pares, `as const satisfies Record<…>`),
  `nombreConversacional(metricId: string): string | null`, `tituloDeLaMetrica(metricId: string): string | null`,
  `CLAVE_DEL_ROL`, `CLAVE_DEL_ESTADO_DEL_LOOP`, `CLAVE_DE_LA_FORMA_DEL_LOOP`, `CLAVE_DEL_DESENLACE_DEL_LOOP`,
  `CLAVE_DEL_CANDIDATO_DEL_LOOP` (sin `expirado`), `CLAVE_DEL_EVENTO_DEL_LOOP`, `CLAVE_DE_LA_VERIFICACION_DEL_EVENTO` y
  `fechaLegible(valor: string): string | null`.
- Hooks: `useNairaSeguimiento(habilitada = true): { readonly estado: LecturaDeNaira<NairaOpenLoopsList>; readonly recargar: () => void }`
  (con `useRefetchOnVisible(lectura.recargar, true)`) y `useNairaLoop(loopId: string): { readonly estado:
  LecturaDeNaira<NairaOpenLoopDetail>; readonly recargar: () => void }` (deps `[loopId]`, sin refresco).
- Componentes: `FilaDeSeguimientoProps { loop; hrefDeLaSenal: string | null; hrefDeLaBitacora: string | null; puedeVotar }`,
  `FilaDeSeguimiento`, `LineaConFecha({ clave, valor, params? })`, `LineaDeSeguimientoDeLaSenalProps { loop; hrefDeLaBitacora }`,
  `LineaDeSeguimientoDeLaSenal`, `BitacoraDelLoopProps { detalle; hrefDeLaSenal }` y `BitacoraDelLoop`.
- Rutas (agregadas a `rutas-de-naira.ts`, que sigue sin imports): `RUTA_DEL_SEGUIMIENTO = \`${RUTA_DE_NAIRA}/seguimiento\`` y
  `rutaDelLoop(loopId)`.
- Páginas: `seguimiento/page.tsx` (`<PageGuard module="naira" action="open-loops-view">`), `SeguimientoClient()`,
  `SeguimientoViewProps { lista; puedeVotar; hrefDeLaSenal(promocionId); hrefDeLaBitacora(loopId) }`, `SeguimientoView`;
  `seguimiento/[loopId]/page.tsx` (async, `params: Promise<{ loopId: string }>`, `open-loops-view`), `LoopClient({ loopId })`,
  `LoopViewProps { detalle; hrefDeLaSenal }` y `LoopView`.
- Navegación: después de la pestaña `briefing-view`, `{ labelKey: 'inmobiliaria.ai.naira.tabs.seguimiento', href:
  \`${NAIRA}/seguimiento\`, icon: ArrowsCounterClockwise, module: 'naira', action: 'open-loops-view' }`. El comentario
  «← 13-04..13-07 AGREGAN…» sigue debajo para 13-05..13-07.
- `SenalClient.tsx`: `const { estado: lecturaDelSeguimiento } = useNairaSeguimiento(canAccess('naira', 'open-loops-view'))` ⇒
  `lineaDeSeguimiento={lineaDeSeguimiento}` en el `<SenalView>` existente. Las anclas de 13-03 (`estado={estado}`,
  `href={rutaDelBriefing(detalle.dia)}`) siguen apareciendo una vez cada una.
- Atributos: `data-naira-loop`, `data-naira-huerfano`, `data-naira-ocultos`, `data-naira-bitacora`, `data-naira-evento`,
  `data-naira-seguimiento-de-la-senal` y `data-testid="naira-seguimiento-vacio"`.

**Enmiendas al contrato:** ningún nombre del §3.1 cambió. Lo AGREGADO (todo lo marcado `+`) es el parámetro `habilitada`,
`LineaConFecha`, `LineaDeSeguimientoDeLaSenal`(`Props`), `RUTA_DEL_SEGUIMIENTO`, `rutaDelLoop` y las 57 hojas i18n
(`tabs.seguimiento`, `roles.*`, `seguimiento.*`, `bitacora.*`).

## (3) Por tarea

| Tarea | Commit | Resultado | Marcadores verdes |
|---|---|---|---|
| 1 vocabulario + copy | `e7bb3a95` | `TAREA1 F=0` | 10 (5 del vocabulario + claves-naira ×3 + claimclass ×2); 57 claves; formato intacto; 0 tsc |
| 2 hooks | `5dfa52d7` | `TAREA2 F=0` | 11; 0 tsc |
| 3 componentes | `33c9d752` | `TAREA3 F=0` | 26 (con las guardias B-5/claimClass/i18n, que crecen solas); 0 tsc |
| 4 pestaña | `8c260369` | `TAREA4 F=0` en el 2.º intento (1.º `F=1`, ver Desviaciones) | 26 (con `naira-sin-seccion-paralela` ×4 y `WorkspaceNav.accion` ×2); guardias globales 5/5 sin regresión; 0 tsc |
| 5 ficha + línea de la señal + cierre | `d9b9ec07` | `TAREA5+CIERRE F=0` | 26 (incluido `SenalClient.test.tsx` de 13-03 intacto: control-positivo, 403-sin-residuo, linea-de-seguimiento) |

## (4) Mutaciones por la causa (en copia `mktemp -d`, con la sonda de alias verde en cada tarea)

Rojos por `it` (DEBE ≥ 1), 24 en total:
T1: m_prototipo 1 (`[N13:nombres-del-catalogo]`) · m_dia_crudo 1 (`fecha-legible`) · m_rol 1 (`rol-no-persona`) · m_i18n 1 (`i18n-es-en`).
T2: m_residuo 1 (`403-sin-residuo`) · m_foco 1 (`refetch-al-volver`) · m_secundaria 1 (`secundaria-sin-red`) · m_otro_loop 1 (`loop-sin-residuo`).
T3: m_rol_fila 1 · m_voto 1 · m_conteo 1 · m_ejemplo 1 · m_orden 1 · m_rol_bitacora 1 · s_b5 1.
T4: m_residuo 1 · m_voto 1 · m_ocultos 1 · m_accion 1 (`pestana-por-su-accion`) · m_href 1 · s_paralela 1 (`sin-seccion-paralela`).
T5: m_residuo 1 (`403-sin-residuo` de la ficha) · m_vuelta 1 (`ficha-con-vuelta`) · m_secundaria 1 (`secundaria-sin-permiso-sin-red`).

## (5) Cierre contra la línea base

- Los 9 archivos de test del plan pasaron en verde con los 21 marcadores de sus falsos verdes y con un `[N13:control-positivo]`
  verde en cada uno (FG13-9). UBI=0: ningún puro, hook ni componente de 13-04 contiene rutas del panel.
- Suite completa (candado propio, 4 workers), **1198 archivos** (1189 + 9 nuevos). Hubo 1 rojo nuevo frente a las dos bases:
  `src/components/inmobiliaria/PipelineDetail.historial.test.tsx`, verde en las dos bases y ajeno a Naira. Al re-correrlo pasó
  en verde, así que hay **0 regresiones**.
- `tsc --noEmit`: **0 errores nuevos** (la base tenía 0). **0 archivos fuera de `files_modified`**; `package.json` y
  `pnpm-lock.yaml` intactos. No se agregó ninguna dependencia.

## (6) Declarado

- **P7:** el 503 `tabla_no_disponible` no se distingue. 13-01 mapea todo 503 a `no_disponible` sin razón, y la pestaña lo
  muestra como fallo reintentable en vez de «El seguimiento todavía no está disponible…». Queda como pedido a una fase
  posterior: una razón en `no_disponible`.
- **P5:** los días (`YYYY-MM-DD`) usan `formatearDia` (13-03) y los instantes con zona usan `formatearCorte` (13-01, Bogotá).
  `cierre.en` y `nextCheckAt.en` se aceptan como cualquiera de los dos. La fecha de cada evento es su DÍA, no
  `corte`/`recordedAt`. Los nombres de las métricas quedan en español también con el panel en inglés, porque son vocabulario del
  agente (Q12).
- **P9 (no se pinta):** `ownerRazon` (incluido `persona_espera_b5`), `claveDeCausa`, `episodio`, `detectorId`, `clase`,
  `familia`, `candidato.desde`, `ciclos`, `confirmaciones`, `rachaSinReincidencia`, el número de `ocultosPorRol`, el
  `cambioDeDueno` por evento y su razón libre, el interior de `memoria` y de `verificacion` (de esta última solo se lee `kind`),
  y `corte`/`recordedAt`.
- **P15:** la línea del detalle de señal reusa `GET /open-loops`, porque no hay endpoint por señal. Sin `open-loops-view` no se
  pide. Con 403, apagada, no disponible, contrato roto o sin un loop de esa señal, no aparece línea ni cartel y la señal se ve
  entera. Como usa el mismo hook que la lista, también refresca al volver al foco.
- **`[N13:workspace-accion]` de 13-03:** no hubo choque. Siguió verde con la 2.ª pestaña, porque compara contra las acciones que
  declara el registro, y la acción G no fue necesaria.
- Nada se verificó contra un agente vivo: 11-07 no está ejecutado (B-4). Los criterios 1 y 3 de la Fase 13 se cumplen para el
  seguimiento con datos de EJEMPLO; la verificación con datos reales queda para 13-08.

## (7) Commits

| Tarea | Commit | Mensaje |
|---|---|---|
| 1 | `e7bb3a95` | feat(13-04): vocabulario del seguimiento de Naira (nombre de la metrica, rol, estados, eventos, fechas) y su copy en es y en |
| 2 | `5dfa52d7` | feat(13-04): hooks del seguimiento de Naira (lista con refresco al volver y bitacora por loop) sobre la lectura base |
| 3 | `33c9d752` | feat(13-04): fila de seguimiento y bitacora del loop de Naira (rol, fechas, voto del loop, orden del servidor) sin persona ni conteos |
| 4 | `8c260369` | feat(13-04): pestana Seguimiento de Naira (open-loops-view) con su ruta en el registro y la lista de loops vivos sin persona ni conteos |
| 5 | `d9b9ec07` | feat(13-04): bitacora de un loop de Naira y la linea de seguimiento del detalle de senal como lectura secundaria |

## Deviations from Plan

### Checkpoint en la Tarea 4 y correcciones de plan del coordinador

**1. Dos falsos rojos del control de la Tarea 4 (1.er intento `TAREA4 F=1`, `tarea4.intento1.log`)**
- *Ancla contradictoria:* el bloque exigía el literal `href: '/panel/inmobiliaria/reportes'` en `SeguimientoClient.tsx`. Eso
  contradice P3, P16, la acción D y el comportamiento `[N13:403-sin-residuo]` del mismo plan, que piden `href:
  '/panel/inmobiliaria'` (D13-1′). No se satisfizo con el literal en un comentario.
- *Copia sin `public/`:* en la copia sin mutar quedaba rojo `[N13:intro-de-naira]` de 13-03, que comprueba que exista
  `public/images/features/leasefy-brand-10.jpg`, porque `copia()` no traía `public/`. Con `public/` enlazado pasa 10/10
  (`diag_t4_copia_con_public.txt`).
- El ejecutor PARÓ sin commitear la Tarea 4 y guardó su código en `scratchpad/laned/13-04/tarea4_pendiente/`.
- El coordinador corrigió solo los planes, en `6b3f5e2e` («docs(13): ancla del briefing alineada con D13-1′», 13-03) y
  `787808cd` («docs(13): vuelta al inicio del panel contada en codigo (D13-1′) y public/ en la copia de las mutaciones», 13-04..13-07).
  Ahora el bloque cuenta en el código sin comentarios `href: *'/panel/inmobiliaria'` (≥1) y `'/panel/inmobiliaria/reportes'`
  (0), y las 5 `copia()` hacen `ln -s "$W/public" "$C/public"`.
- En MODO RECUPERACIÓN se restauró la Tarea 4, byte a byte igual (`cmp` de los 7 archivos), y se re-corrió el bloque ENTERO sin
  tocar código ni control: `TAREA4 F=0`.

### Ajustes operativos

- Los bloques `automated` llevan `export VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`, y la suite del cierre va envuelta en el
  candado propio del front (ver «Condición operativa»).
- El script de la copy (57 hojas) vivió en el scratchpad de la sesión y se corrió desde un `mktemp -d` que se borró por su ruta;
  no se commitea.

### Auto-fixed

Ninguno: el código no se tuvo que corregir en ninguna tarea.

## Known Stubs

Ninguno que impida el objetivo. Los datos son de ejemplo mientras 11-07 no esté desplegado, y la vista lo avisa.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. La lectura nueva (`GET /open-loops` desde el detalle de señal)
está gateada por `open-loops-view` y no pinta nada si falla.

## Self-Check: PASSED

- En `git diff --name-status 4237bf99 HEAD -- src` hay 20 archivos nuevos y 5 modificados (`es.json`, `en.json`,
  `rutas-de-naira.ts`, `agentWorkspaceNav.ts`, `SenalClient.tsx`): los 25 de `files_modified`. El P1 del plan decía «21
  nuevos + 4 MOD» y contaba mal el reparto, no el total. Commits `e7bb3a95`, `5dfa52d7`, `33c9d752`, `8c260369` y
  `d9b9ec07` en `git log`.
