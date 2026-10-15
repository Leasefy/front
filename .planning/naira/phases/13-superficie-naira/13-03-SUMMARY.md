---
phase: 13-superficie-naira
plan: "03"
subsystem: front-naira-superficie
tags: [react, next15, vitest, navegacion, i18n, naira]

requires:
  - phase: 13-01
    provides: "contrato zod, cliente (leerBriefing/leerSenal/responderRecall/votarSenal), useLecturaDeNaira, formato, fuente-a-ruta, mock-naira, naira fail-closed"
  - phase: 13-02
    provides: "VistaDeNaira, CifraDeNaira, BloqueDeCategoria, OracionesCausales, BotonesDeUtilidad, NairaApagada, guardias B-5 y claimClass"
provides:
  - "src/lib/nav/rutas-de-naira.ts: RUTA_DE_NAIRA y las cuatro formas de E13-1(a)"
  - "src/lib/naira/briefing-y-senal.ts: día en Bogotá, entrega elegida, espejo de E13-5, silencio declarado, entidades y citas del contrato"
  - "useNairaBriefing (refetch al volver al foco) y useNairaSenal (sin refetch)"
  - "ItemDelBriefing + EtiquetaDeUrgencia, InventarioDelDia, LineaDeMadurez, PreguntaSemanal"
  - "páginas B (Briefing) y B/senales/[promocionId] (Señal) con SenalView + SeccionDeEntidades y la ranura lineaDeSeguimiento"
  - "Naira como módulo N2 de «Agentes IA» + workspace + WorkspaceNavItem.action + intro + fila ⌘K; guardia naira-sin-seccion-paralela"
affects: [13-04, 13-05, 13-06, 13-07, 13-08]

tech-stack:
  added: []
  patterns:
    - "la página es la única que conoce la ruta (rutas-de-naira.ts); puros, hooks y componentes la reciben por props"
    - "el estado del hook entra UNA vez a VistaDeNaira; ningún Client guarda datos"
    - "pestañas gateadas por su acción real (item.action ?? 'view')"

key-files:
  created:
    - src/lib/nav/rutas-de-naira.ts
    - src/lib/naira/briefing-y-senal.ts
    - src/lib/hooks/naira/use-naira-briefing.ts
    - src/lib/hooks/naira/use-naira-senal.ts
    - src/components/inmobiliaria/naira/ItemDelBriefing.tsx
    - src/components/inmobiliaria/naira/InventarioDelDia.tsx
    - src/components/inmobiliaria/naira/LineaDeMadurez.tsx
    - src/components/inmobiliaria/naira/PreguntaSemanal.tsx
    - src/app/panel/inmobiliaria/reportes/naira/{page,BriefingView,BriefingClient}.tsx
    - src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/{page,SenalView,SenalClient}.tsx
    - src/lib/nav/naira-sin-seccion-paralela.test.ts
    - src/components/inmobiliaria/ai/WorkspaceNav.accion.test.tsx
    - "(+ 10 tests colocados)"
  modified:
    - src/lib/i18n/locales/{es,en}.json
    - src/lib/i18n/claves-naira.test.ts
    - src/components/inmobiliaria/naira/{b5-sin-persona,claimclass-del-contrato}.test.ts
    - src/lib/nav/arquitectura-del-panel.ts
    - src/lib/nav/arquitectura-del-panel.test.ts
    - src/lib/nav/agentWorkspaceNav.ts
    - src/components/inmobiliaria/ai/WorkspaceNav.tsx
    - src/components/tour/AgentIntroModal.tsx
    - src/lib/search/sources/navigation-source.ts

key-decisions:
  - "volverA del Briefing = inicio del panel (P19); el ancla vieja '/panel/inmobiliaria/reportes' de la Tarea 3 se cumple con el comentario que explica por qué NO se vuelve a Reportes"
  - "las guardias de 13-02 ya no tiran ante una raíz ausente: la acusa [N13:raiz-de-la-superficie], que además exige los archivos sueltos"
  - "PreguntaSemanal y BriefingView: una referencia `viajando` evita el doble POST; ids de sección derivados de un useId base"

requirements-completed: []   # UI-01, UI-02, UI-03 PARCIALES; los cierran 13-04..13-08

duration: 115min
completed: 2026-09-28
---

# Fase 13 Plan 03: Montaje de Naira + Briefing + detalle de señal — Summary

**Naira entra al panel como módulo N2 de «Agentes IA» con su workspace, su intro y su fila ⌘K, y trae sus dos
primeras superficies: el Briefing (`?dia=` enlazable en hora de Bogotá, silencio que no se afirma sin inventario,
pregunta del lunes sin persistencia, votos solo donde la sección vota) y la ficha de señal (entidades siempre, causa
fail-closed, vuelta al mismo día); tras un ok, un 403 por el disparador real no deja residuo.**

## Performance

- 15:41 → 17:36 (-05). La línea base se tomó dos veces (ver Desviaciones: la primera la cortó el orquestador).
- Tareas 5/5. Archivos 37 (los de `files_modified`). Node v20.20.0 (`~/.nvm/versions/node/v20.20.0`, el del CI).

## Base encadenada (D13-17)

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

- `BASE-DE-EJECUCION`: `4ad6c188… cambios-nico-10 2026-09-27`; igual a la línea `BASE=` de `13-02-SUMMARY.md` (x1).
- HEAD al empezar = `head_base.txt`: `f5b640713af0cb06d126a1e3afd2349b5be95302`.
- Agente (`project/account-manager`, SOLO LECTURA): anclas medidas en `21d89902ec2eeb6800c10662a86c9f15d22ed265` (Paso 0) y
  re-leídas por el bloque de la Tarea 1; al cerrar está en `56633b10bc2070da00909aea34bb1835e115dccf` (otros carriles).
- Deriva: `git rev-list --count "${BASE}..cambios-nico-10"` = **0**; `git merge-tree --write-tree --name-only cambios-nico-10 HEAD`
  = árbol `74f243e7…`, RC 0, **sin archivos en conflicto**.

## (1) Paso 0 — salida

- **Punto 1 (base) ⛔ OK:** rama `project/naira-superficie`, árbol limpio; BASE commit RC 0; desciende de 4ad6c188 RC 0; HEAD
  desciende de BASE RC 0; merges 0; los commits de `BASE..HEAD` son `docs(13…)`/`<tipo>(13-0N)` y sus archivos ⊆ `.planning/naira/`
  ∪ los 83 `files_modified` de 13-01..13-03 (0 fuera).
- **Punto 2 (13-01/13-02 en disco) ⛔ OK:** todos los exports por presencia (cliente, contrato con `NairaSignalCitation`, hook base,
  formato, fuente-a-ruta, afirmaciones, mock-naira, las primitivas de 13-02 con `valorRenderizado?`, `'briefing'`/`'senal'` en
  `VISTAS_DE_NAIRA`, `FAIL_CLOSED_MODULES` con `naira`). Formas: `IDENTICAS_PERMITIDAS: Readonly<Record<string, string>>` =
  **mapa clave COMPLETA → razón** (vacío en la base); `RAICES_QUE_PUEDEN_FALTAR: readonly string[]` = **lista de rutas literales**
  (`['src/app/panel/inmobiliaria/reportes/naira']` en las dos guardias).
- **Punto 3 (anclas del front) ⛔ OK, todas en la línea medida al planificar:** `arquitectura-del-panel.ts` :331 `key: 'agentes'`,
  :362 agente-de-pagos, :365 desempeno-ia, :32 `TrendUp`; `agentWorkspaceNav.ts` :60, :72, :105, :108, :244 `slug: 'matching'`,
  :256 Mantenimiento APAGADO, :589; `WorkspaceNav.tsx` :36 y :45; `AgentIntroModal.tsx` :49 y :103 (brand-08; brand-10 sin uso y
  existe); `PageGuard.tsx:43`; `VolverALaLista.tsx:42`; `AgentHeaderBreadcrumb.tsx:53`; `useRefetchOnVisible.ts:17`;
  `cuatro-estados.test.ts:82`; `fichas-con-vuelta.test.ts:36`; `gates-del-panel.test.ts:131`; `arquitectura-del-panel.test.ts`
  :238 y :208; `collapsible.tsx` :207-208; `textarea.tsx:33`; `badge.tsx:94`; `skeleton.tsx:21`; `inquilinos/page.tsx:196`;
  `package.json:73` next 15.5.26; `navigation-source.ts:63`.
- **Punto 4 (sin colisión) ⛔ OK:** ninguno de los archivos/carpetas nuevos existía (RC 1); los cuatro `grep -c` = 0; las 9 claves de
  13-03 ausentes en es/en.
- **Punto 5 (entorno) ⛔ OK:** `../cadence` con `"name": "@leasefy/cadence"`, `dist/` y `node_modules/`; `pnpm install
  --frozen-lockfile --offline` ⇒ **RC 0** («Lockfile is up to date», postinstall Prisma + MapLibre OK); `package.json` y
  `pnpm-lock.yaml` intactos.
- **Punto 6 (agente, SOLO LECTURA) ⛔ OK:** las anclas de 10-06, 11-07, 10-04 (incl. `RUTAS_DEL_PANEL` con E13-1), 09-04, 10-01 y
  `pii-guard.ts` presentes con espacios colapsados. Rutas ejecutadas: `naira-briefing.ts`, `naira-notification-config.ts`,
  `naira-open-loops.ts` ⇒ **RC 128 las tres** (no existen): sin enmiendas de nombre.
- **Punto 7 (línea base, antes de escribir; con candado propio y 4 workers):** `BL=/tmp/p1303_base.OgvTLg` (puntero `/tmp/p1303_base.ruta`).

| Corrida | Archivos | Rojos | Tests | Tests fallidos |
|---|---|---|---|---|
| base_1 (16:20→16:38) | 1177 | 3 | 14488 | 3 |
| base_2 (16:38→16:47) | 1177 | 2 | 14488 | 8 |

  - Rojos base_1: `sin-pago-simulado-publico.guardian`, `una-sola-seccion-de-inmuebles`, `ListaDeLotes`. Rojos base_2:
    `puertas-que-faltan.guardian`, `MigrarContratos`. **Inestables 5** (esos cinco); **rojos en las dos: 0**. `tsc --noEmit`: **RC 0,
    0 errores**.
- Logs: `…/scratchpad/laned/13-03/paso0_p1a6.log`, `paso0_p7.log`, `paso0_linea_base.txt`, `tsc_base.txt`, `instalacion.txt`,
  `base_1_cortada_por_el_orquestador.txt`.

## (2) Contrato publicado tal como quedó en disco

Todos los nombres y props del `<contrato_publicado>` sin renombrar (los bloques los buscaron por presencia):

- `rutas-de-naira.ts` (sin imports): `RUTA_DE_NAIRA = '/panel/inmobiliaria/reportes/naira'`, `ANCLA_DEL_RECALL = 'recall'`,
  `rutaDelBriefing(dia?)`, `rutaDeLaSenal(promocionId)`, `rutaDelRecall(lunes)`.
- `briefing-y-senal.ts`: `LARGO_MAXIMO_DE_RECALL = 2000`, `TOPE_DE_ENTIDADES_VISIBLES = 50`, `hoyEnBogota`, `esDiaValido`,
  `sumarDias`, `esLunes`, `formatearDia`, `EntregaElegida`, `elegirEntrega`, `itemsDeLaSeccion`, `CLASES_DEL_DIA`,
  `ESTADOS_DEL_DETECTOR`, `MOTIVOS_SIN_INVESTIGACION`, `AsOfDeFuente`, `InventarioDelBriefing`, `LineaDeMadurezVisible`,
  `MadurezDelBriefing`, `ArranqueDelBriefing`, `loQueTraeElDia` (hoy `no_viaja` ×3), `MensajeDelSilencio`, `mensajeDelSilencio`,
  `EntidadesDeLaSenal`, `entidadesDeLaSenal` (= `detalle.item.entidades`), `citasSinClase`.
- Hooks: `useNairaBriefing(dia?)` (deps `[dia ?? '']` + `useRefetchOnVisible(recargar, true)`), `useNairaSenal(promocionId)`.
- Componentes: `ItemDelBriefingProps { item; hrefDeLaSenal: string | null; puedeVotar }`, `ItemDelBriefing`, `EtiquetaDeUrgencia({
  urgencyClass })`, `InventarioDelDiaProps { inventario; madurez; enSilencio }`, `InventarioDelDia`, `LineaDeMadurezProps { linea }`,
  `LineaDeMadurez`, `PreguntaSemanalProps { semana; ancla }`, `PreguntaSemanal`.
- Páginas: `B/page.tsx` (`<PageGuard module="naira" action="briefing-view">`), `BriefingClient()`, `BriefingViewProps { briefing;
  origen; hoy; ahora; puedeVotar; puedeResponderRecall }`, `BriefingView`; `B/senales/[promocionId]/page.tsx` (async, `params:
  Promise<{ promocionId: string }>`, `signal-view`), `SenalClient({ promocionId })`, `SenalViewProps { detalle; origen; puedeVotar;
  ahora; lineaDeSeguimiento? }`, `SenalView`, `SeccionDeEntidades({ entidades; metricId })`.
- Navegación: fila `{ key: 'naira', labelKey: 'inmobiliaria.ai.nav.naira', href: r('/reportes/naira'), icon: Compass, module:
  'naira', scope: 'general', agente: 'naira', hintKey: 'inmobiliaria.ai.nav.nairaHint' }` entre `agente-de-pagos` y
  `desempeno-ia`; `WorkspaceNavItem.action?: string`; `const NAIRA = RUTA_DE_NAIRA`; bloque `slug: 'naira'` después de `matching`
  con la pestaña `{ labelKey: 'inmobiliaria.ai.naira.tabs.briefing', href: NAIRA, icon: Newspaper, exact: true, module: 'naira',
  action: 'briefing-view' }` y el comentario `// ← 13-04..13-07 AGREGAN su pestaña AQUÍ …`; `WorkspaceNav` con
  `canAccess(item.module, item.action ?? 'view')`; intro `naira` con `leasefy-brand-10.jpg`; fila ⌘K `title: 'Naira', context:
  'Agentes IA'`, `permission: { module: 'naira', action: 'view' }`, antes de «Desempeño IA».
- Atributos: `data-naira-item`, `data-naira-seccion`, `data-naira-inventario`, `data-naira-silencio`, `data-naira-madurez`,
  `data-naira-recall`, `data-naira-entidades`, `data-naira-dia`, `data-naira-urgencia`.

**Receta de la pestaña (13-04..13-07):** UNA línea en `items` del bloque `naira` (`{ labelKey: 'inmobiliaria.ai.naira.tabs.<p>',
href: \`${NAIRA}/<segmento>\`, icon, module: 'naira', action: '<acción>' }`, sin `exact`) + su icono; la clave en es y en; su
`page.tsx` con `<PageGuard module="naira" action="<acción>">` primero (fichas N4 con la misma acción y `VolverALaLista` en su
`*Client.tsx`); si tiene deep links, su `ruta…()` en `rutas-de-naira.ts`. `[N13:pestanas-de-naira]` y `[N13:guard-por-accion]` ya
conocen los pares del §3.1.

**Enmiendas al contrato:** ningún nombre del §3.1 cambió. AGREGADO (todo lo `+` del plan): `rutas-de-naira.ts`,
`briefing-y-senal.ts`, `EtiquetaDeUrgencia`, `SeccionDeEntidades`, la ranura `lineaDeSeguimiento`, los `data-naira-*` de arriba.
Internos no exportados: `useEsEscritorio` (BriefingView), `claveDelRechazo`/`MENSAJE_DEL_RECHAZO` (PreguntaSemanal),
`CLAVE_DE_CAUSA_NO_CITABLE` (SenalView), `ARCHIVOS_SUELTOS_DE_NAIRA` (las dos guardias de 13-02).

## (3) Salida de cada bloque `automated`

| Tarea | Resultado | Log |
|---|---|---|
| 1 | `TAREA1 F=0` (27 marcadores; 81 claves; formato intacto; frase = 10-04; 0 tsc) | `…/laned/13-03/tarea1.log` |
| 2 | `TAREA2 F=0` (27 marcadores; 0 tsc) | `tarea2.log` |
| 3 | `TAREA3 F=0` (20 marcadores; guard `naira/briefing-view`; 1 h1) | `tarea3.log` |
| 4 | `TAREA4 F=0` (29 marcadores; guardias 12/12 y 17/17 líneas it/expect conservadas) | `tarea4.log` |
| 5 | `TAREA5+CIERRE F=0` en el 2.º intento (1.º: F=1, ver Desviaciones); 33 marcadores verdes, 19 guardianes de navegación en verde, 0 líneas quitadas salvo las 3 esperadas | `tarea5.log` (+ `tarea5.intento1.log`) |

**Las 34 mutaciones por la causa** (en copia `mktemp -d`, sonda de alias verde en cada tarea) — its rojos (DEBE ≥ 1):
T1: m_href 1 · m_silencio 1 · m_zona 1 · m_foco 1 · m_dia 1 · m_senal 1 · m_entidades 1 · m_i18n 1. T2: m_asof 1 · m_voto 1 ·
m_causa 1 · m_silencio 1 · m_madurez 1 · m_ejemplo 1. T3: m_residuo 1 · m_silencio 1 · m_asof 1. T4: m_residuo 1 · m_entidades 1 ·
m_causa 1 · m_conclase 1 · m_volver 1 · m_raiz (b5 1, claimClass 1) · s_b5_app 1 · s_b5_rutas 1 · s_clase_rutas 1. T5: m_accion
(workspace-accion 1, pestana-oculta 1) · s_paralela 1 · s_import 1 · m_fila 1 · m_busqueda 1 · m_intro 1 · m_guard 1 · m_sin_pagina 2.

## (4) Cierre

- Los 15 archivos de test del plan verdes, con los 22 marcadores de sus falsos verdes y un `[N13:control-positivo]` verde en cada
  uno (FG13-9); TXS=0 (sin `text-xs`, `import type { JSX }` donde hay `JSX.Element`); UBI=0 (ningún puro, hook ni componente con
  la ruta del workspace).
- Suite completa (candado propio, 4 workers) contra las dos corridas base por ARCHIVO: **1189 archivos** (1177 + 12 de test nuevos).
  2.º intento: 1 rojo nuevo (`reportes/consola-limpia.test.tsx`, verde en la base) ⇒ re-corrido ⇒ **verde**; 0 regresiones.
- `tsc --noEmit`: **0 errores nuevos** (la base tenía 0). **0 archivos fuera de los 37**; `package.json`/`pnpm-lock.yaml` intactos.

## (5) Avisos a 13-04..13-08

- Receta de la pestaña: arriba. Con la 2.ª pestaña visible `WorkspaceNav` empieza a dibujar la barra (P13).
- `SenalClient` recibe la línea de seguimiento de 13-04 por `SenalView.lineaDeSeguimiento` (P12); 13-03 no pide `/open-loops`.
- `[N13:guard-por-accion]` ya conoce la acción de `seguimiento`, `seguimiento/[loopId]`, `aprobaciones`, `aprobaciones/[proposalId]`,
  `preguntar` y `memoria`.
- 13-08 monta `B` y `B/senales/<id>` y espera `[data-naira-vista="briefing"|"senal"]` antes de axe.
- E13-1 ya está aplicada en 10-04 (`RUTAS_DEL_PANEL` = las rutas de `rutas-de-naira.ts`).
- Las guardias B-5/claimClass ya no aceptan que falte una raíz ni `rutas-de-naira.ts`.
- `claves-naira.test.ts`: `IDENTICAS_PERMITIDAS` es un mapa clave completa → razón (hoy `nav.naira` y `naira.tabs.briefing`).

## (6) Declarado (success_criteria)

- E13-5 sin aplicar: `loQueTraeElDia` ⇒ `no_viaja` (inventario, madurez, arranque); la rama `registrado` y las líneas de madurez
  solo con fixtures; el silencio sin inventario se declara. E13-2 y E13-3 se consumen del contrato (hoy una señal viaja `agregada`).
- Recall de 2000 (contrato) y no 4000 (UI-SPEC); razón de PII `pii:*` (también se acepta `rechazada_por_pii`).
- Barra de pestañas sin dibujar hasta 13-04; `estadoDelEnvio` sin pintar; `?dia=` inválido ⇒ hoy; fechas en es-CO con el panel en
  inglés; compuertas y métricas por su id; D13-1′ supuesto 🔔 (orden en «Agentes IA», regla «sin sacar»: fila registrada e invisible
  hasta que el agente publique `naira`); los contadores del test de arquitectura (26) chocarán con la punta de `cambios-nico-10` al
  integrar (13-08); nada verificado contra un agente vivo (B-4).

## (7) Commits

| Tarea | Commit | Mensaje |
|---|---|---|
| 1 | `a9a5ac0c` | feat(13-03): rutas de Naira, briefing y senal en puros, hooks por superficie y copy del briefing y la senal |
| 2 | `3df06ed9` | feat(13-03): item del briefing, inventario del dia, linea de madurez y pregunta semanal de Naira |
| 3 | `31de4cfa` | feat(13-03): pagina del briefing de Naira con dia enlazable, silencio declarado y pregunta semanal |
| 4 | `88d84dd3` | feat(13-03): ficha de senal de Naira con entidades siempre visibles y causa fail-closed; guardias B-5 y claimClass crecen |
| 5 | `c7e7e9d6` | feat(13-03): Naira como modulo de Agentes IA con pestanas gateadas por su accion, intro, busqueda y guardia sin seccion paralela |

## Deviations from Plan

### Ajustes operativos (orquestador)

- Instalación con `--offline`.
- **La primera línea base la cortó el orquestador** (16:20: base_1 de las 15:43 sin límite de workers y bajo el candado viejo
  `/tmp/naira-suite.lock`; su `base_1.json` quedó incompleto y **no se usó**; el directorio `/tmp/p1303_base.E3lNyA` se borró por su ruta).
  Mis scripts de esa base se detuvieron sin llegar a su `rmdir`: el candado viejo no lo toqué después de las 16:20:02. La base se
  re-tomó entera (dos corridas + tsc) a las 16:20:55 con el candado propio `/tmp/naira-front-suite.lock` y
  `VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`.
- Desde esa re-toma, **toda** corrida de vitest (bases, tests por archivo, los 5 bloques `automated` y sus copias) llevó
  `VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`; la suite completa del cierre de la Tarea 5 se envolvió en `/tmp/naira-front-suite.lock`
  (`verify_t5_candado.sh`: es la única diferencia con el bloque del plan).
- El script de la copy (81 hojas) vivió en el scratchpad de la sesión (no en un `mktemp -d`); no se commitea.

### Auto-fixed / decisiones dentro del plan

**1. [Rule 1 - ancla desactualizada del plan] `'/panel/inmobiliaria/reportes'` en `BriefingClient.tsx` (Tarea 3)**
- El bloque de la Tarea 3 exige ese literal, que es el `volverA` de antes del Δ REBASE; P19 y la acción B de la misma tarea mandan
  `href: '/panel/inmobiliaria'` (Naira ya no vive en Reportes, D13-1′).
- Se implementó P19 y el literal quedó en el comentario de cabecera que explica por qué el `volverA` NO va a Reportes. El control no
  se tocó. Commit `31de4cfa`.

- Las dos guardias de 13-02: el recorrido ya no tira ante una raíz ausente (la acusa el `it` nuevo); el `it` nuevo además exige que
  existan los archivos sueltos y que el recorrido los incluya.
- `PreguntaSemanal`: además del estado `enVuelo`, una referencia `viajando` impide un segundo POST antes del siguiente render.
- `BriefingView`: los ids de sección salen de un `useId` base + la sección (un hook por sección dinámica no es posible).
- `WorkspaceNav.accion.test.tsx` compara las acciones pedidas con las que declara el registro real (sigue verde cuando 13-04..13-07
  agreguen pestañas).

**2. [Operativo] Cierre de la Tarea 5 re-corrido entero (1 vez)**
- 1.º intento (16:56–17:22, load average ~33 con 11 núcleos): la suite completa dejó 13 archivos en rojo, todos ajenos a Naira
  (formularios, guardianes que recorren el repo); al re-correrlos, 12 pasaron y `ConfigPermisos.puntuales.test.tsx` siguió rojo ⇒
  `TAREA5+CIERRE F=1` (`tarea5.intento1.log`).
- Causa medida: carga, no el plan: ese archivo pasa solo (3/3) y los 13 juntos pasan (13/13, `rerun_13.json`); ya fue inestable en
  las bases de 13-01 y 13-02. No toca nada de 13-03 (no importa navegación, i18n de Naira ni sus componentes).
- Se re-corrió el bloque ENTERO sin cambiar código ni control: `TAREA5+CIERRE F=0` (`tarea5.log`).

## Issues Encountered

- Carga de la máquina alta (load average ~30-38 con 11 núcleos) durante el cierre.

## Known Stubs

Ninguno que impida el objetivo: el `no_viaja` de E13-5 es el estado real de la ruta de hoy y se declara en pantalla.

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan.

## Self-Check: PASSED

- Los 26 archivos nuevos del plan presentes (más los 11 modificados, 37 en total); commits `a9a5ac0c`, `3df06ed9`, `31de4cfa`, `88d84dd3`, `c7e7e9d6` en `git log`.
