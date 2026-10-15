---
phase: 13-superficie-naira
plan: "07"
subsystem: front-naira
tags: [naira, memoria, ley-1581, b5, permisos, i18n]
requires: [13-01, 13-02, 13-03, 13-04, 13-05, 13-06]
provides:
  - "pestaña «Qué cree Naira» (B/memoria · memory-view), 5.ª y última del workspace naira"
  - "vocabulario-de-memoria.ts (desenlaceDeEscritura: el único mapa EstadoNaira ⇒ UI tras escribir)"
  - "useNairaMemoria, DialogoDeCorreccion, DialogoDeBorrado, ItemDeMemoria, PropuestaProceduralPendiente"
  - "RUTA_DE_LA_MEMORIA, rutaDeLaMemoria(filtros)"
  - "guardia memoria-escrituras.test.ts"
affects: [13-08]
tech-stack:
  added: []
  patterns: ["escritura en un solo archivo por función", "desenlace puro exhaustivo", "foco tras escribir en useEffect post-commit"]
key-files:
  created:
    - src/lib/naira/vocabulario-de-memoria.ts
    - src/lib/hooks/naira/use-naira-memoria.ts
    - src/components/inmobiliaria/naira/DialogoDeCorreccion.tsx
    - src/components/inmobiliaria/naira/DialogoDeBorrado.tsx
    - src/components/inmobiliaria/naira/ItemDeMemoria.tsx
    - src/components/inmobiliaria/naira/PropuestaProceduralPendiente.tsx
    - src/app/panel/inmobiliaria/reportes/naira/memoria/{page,MemoriaClient,MemoriaView}.tsx
    - src/components/inmobiliaria/naira/memoria-escrituras.test.ts
  modified:
    - src/lib/nav/rutas-de-naira.ts
    - src/lib/nav/agentWorkspaceNav.ts
    - src/lib/i18n/locales/es.json
    - src/lib/i18n/locales/en.json
decisions:
  - "La clave de copy del 422 de la corrección es memoria.correccion.quitarYGuardar (no quitalo): el guardián el-producto-tutea lee el nombre como voseo (plan corregido en eaa5db3e)"
  - "El foco tras un hecho se aplica en un useEffect de MemoriaView (con el diálogo de Radix aún montado, el focus directo volvía al diálogo)"
metrics:
  duration: "~62 min (20:33-21:35, 2026-09-28)"
  completed: 2026-09-28
  tasks: 5
  files: 22
---

# Phase 13 Plan 07: «Qué cree Naira» (memoria con procedencia, corrección sin eco, borrado con motivo, acciones por permiso) Summary

La pestaña `B/memoria` (acción `memory-view`) muestra en el workspace de Naira lo que Naira cree sobre la inmobiliaria, en el orden del servidor. Cada ítem muestra su procedencia primero, se rotula DATO o INFERENCIA por el campo `provenance`, dice el autor solo como tipo, enlaza el origen al listado de la fuente por el mapa cerrado y dice «Desde el …» en hora de Colombia. Las cuatro escrituras (corregir, borrar con motivo obligatorio, confirmar como cierto y resolver una propuesta procedural) viven en un solo archivo cada una y existen solo con su permiso. El 422 de la pantalla de datos personales se dice por su razón sin repetir el texto. Un 403 de lectura no deja residuo.

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

## 1. Paso 0 (salida medida)

- HEAD al lanzar: `eca015f3` (SUMMARY de 13-06). Rama `project/naira-superficie`. Árbol limpio. `merge-base --is-ancestor 4ad6c188 HEAD` = 0.
- `BASE-DE-EJECUCION` = `4ad6c188bd79a1f1272d96411a75813f87707651 cambios-nico-10`. `13-06-SUMMARY.md:52` tiene `BASE=` igual: base encadenada. Merges desde la base: 0. Todos los commits desde la base son `docs(13…` o `<tipo>(13-0N)`. Archivos fuera de `.planning/naira/` ∪ `files_modified` de 13-01..13-07: 0.
- `node -v` = v20.20.0 (nvm, igual que el CI). Instalación: `pnpm install --frozen-lockfile --offline` RC=0 (postinstall de Prisma y MapLibre). `package.json` y `pnpm-lock.yaml` intactos.
- 13-01..13-06 en disco: todos los nombres del punto 2 exportados. Ningún ejecutor previo renombró nada de lo que 13-07 usa. `ENDPOINTS_DE_NAIRA` en `contrato.ts:837-881`:
  - `memoria.vista`: GET `/memory`, `[memory-view]`, EXISTE, `si404: 'apagada'`.
  - `memoria.corregir`: POST `/memory/items/{itemId}/correction`, `[memory-correct]`, `no_encontrado`.
  - `memoria.borrar`: POST `/memory/items/{itemId}/erasure`, `[memory-erase]`, `no_encontrado`.
  - `memoria.resolverPropuesta`: POST `/memory/procedural/proposals/{proposalId}/resolution`, `[procedural-approve]`, `no_encontrado`.
  - `memoria.promover`: POST `/memory/items/{itemId}/promotion`, `[memory-promote]`, PLANIFICADO (11-07-PLAN.md:401), `no_encontrado`.
- `EJEMPLOS_DE_NAIRA['memoria.vista']` trae ítems `present` de las 3 procedencias (observed/fact `agent.debtor_states`, stated_by_human/human_statement, inferred/memory), uno `erased` y una propuesta pendiente.
- Anclas del front, todas presentes en las líneas re-medidas: responsive-dialog.tsx:152, modales-alineados.test.ts:79, textarea.tsx:33, use-mobile.ts:13, dropdown-menu.tsx:150/164, DESIGN.md:688, alert-dialog.tsx:188, toast.tsx:69, button.tsx:66, empty-state.tsx:106, PageGuard.tsx:43, useRefetchOnVisible.ts:17, config.ts:70, agent-fetch.ts:99, cuatro-estados.test.ts:82, gates-del-panel.test.ts:131, package.json:73. Los iconos Notebook, DotsThree y CaretDown existen.
- Agente (solo lectura, `git show project/account-manager:…`; HEAD medido `12b7c445`):
  - `naira-memory.ts` (rutas, esquemas y códigos): RC=0.
  - `isPromotable` (`promotion.ts:69`): RC=0.
  - Los 5 vocabularios: RC=0.
  - Matriz OWNER/ADMIN y VIEWER: RC=0.
  - `MEMORY_CONTENT_REJECTION_REASONS` = `["pii:cedula","pii:telefono","pii:email","pending_counsel:naira_desempeno_empleados"]` = `MOTIVOS_DE_RECHAZO_DE_CONTENIDO` del front: RC=0.
  - 11-07 ejecutado: no (`promoteNairaMemoryItem` ×0). 10-06 ejecutado: no (`naira` en `agency-permissions.ts` ×0).
- Sin colisión en la base: ninguno de los 12 archivos nuevos existía. No había `memory-view` en la nav, ni rutas de memoria, ni el subárbol `memoria`/`tabs.memoria` en es/en.
- `PASO0_P1A6 F=1` (corrido antes del punto 7): su única causa fue «FALTA la línea base». Es benigno, confirmado por las líneas no cero del log.
- Línea base (`/tmp/p1307_base.O6pK9A`, HEAD `eca015f3`): `base_1` y `base_2` dieron 1217 archivos, 0 rojos, 14854 tests, 0 fallidos. Inestables: 0. `tsc` de la base: 0 errores.

## 2. Contrato publicado (tal como quedó en disco)

Coincide con el `<contrato_publicado>` del plan, con estos nombres y props exactos:
- **`vocabulario-de-memoria.ts`**: `CLAVE_DE_LA_CAPA`, `CLAVE_DE_LA_PROCEDENCIA`, `MotivoDeBorrado`, `CLAVE_DEL_MOTIVO_DE_BORRADO`, `MOTIVOS_DE_RECHAZO_DE_CONTENIDO`, `CLAVE_DEL_RECHAZO_DE_CONTENIDO`, `CLAVE_DEL_RECHAZO_OTRO`, `claveDelRechazoDeContenido`, `RAZON_NO_PROMOVIBLE = 'no-promovible'` (PLANIFICADO), `AutorDeLaMemoria`, `autorDelItem`, `CLAVE_DEL_AUTOR`, `esPromovible`, `FILTRO_SIN_ELEGIR`, `FiltrosDeMemoria`, `SIN_FILTROS`, `leerFiltrosDeMemoria`, `filtrarLaMemoria`, `hayFiltros`, `OPERACIONES_DE_MEMORIA`, `OperacionDeMemoria`, `AVISOS_DE_MEMORIA`, `AvisoDeMemoria`, `CLAVE_DEL_AVISO`, `DesenlaceDeEscritura`, `DesenlaceParaLaVista`, `desenlaceDeEscritura`, `claveDelHecho`, `siguienteFocoTrasBorrar`, `PREFIJO_DEL_ARTICULO_DE_MEMORIA`, `idDelArticuloDeMemoria`.
- **Hook y componentes**: `useNairaMemoria(): { estado, recargar }`; `DialogoDeCorreccion({ itemId, textoActual, abierto, onAbiertoCambia, onDesenlace })`; `DialogoDeBorrado({ itemId, abierto, onAbiertoCambia, onDesenlace })`; `PermisosDeMemoria { corregir, borrar, promover, resolver }`; `ItemDeMemoria({ item, permisos, idsVisibles, onDesenlace })`; `PropuestaProceduralPendiente({ propuesta, puedeResolver, onDesenlace })`.
- **Rutas y vistas**: `RUTA_DE_LA_MEMORIA = `${RUTA_DE_NAIRA}/memoria``; `rutaDeLaMemoria(filtros?)`; `memoria/page.tsx` con `<PageGuard module="naira" action="memory-view">`; `MemoriaClient()`; `MemoriaView({ vista, permisos, filtrosIniciales, onFiltrosCambiados, onRecargar })`.
- **Nav y copy**: pestaña `{ labelKey: 'inmobiliaria.ai.naira.tabs.memoria', href: `${NAIRA}/memoria`, icon: Notebook, module: 'naira', action: 'memory-view' }`, justo después de `conversation-ask` y antes del comentario «← 13-04..13-07 AGREGAN». Copy: `inmobiliaria.ai.naira.tabs.memoria` + subárbol `inmobiliaria.ai.naira.memoria.*` (82 hojas en es y en).

**Enmiendas al contrato (AGREGADO al §3.1):** `vocabulario-de-memoria.ts` entero, `PropuestaProceduralPendiente`, `PermisosDeMemoria`, `RUTA_DE_LA_MEMORIA`, `rutaDeLaMemoria`, `MemoriaClient`, `MemoriaView`, las 82 claves y el atributo `data-naira-filtro-capa` (disparador de la Filter Pill; viene del texto de la acción del plan). **Renombrado por el disco:** `memoria.correccion.quitalo` pasó a `memoria.correccion.quitarYGuardar` (corrección del plan `eaa5db3e`; el texto visible no cambia). `RAZON_NO_PROMOVIBLE` no cambió porque 11-07 no está ejecutado.

## 3. Por tarea

| Tarea | Commit | Verify | Archivos |
|---|---|---|---|
| 1 vocabulario + copy | `3995dd73` (+ `0be07a3c` fix de la clave) | `TAREA1 F=0` (re-corrida con el plan corregido; primer intento `tarea1_intento1.log` F=1 por el ancla `// estado: PLANIFICADO`, corregido antes del commit) | vocabulario-de-memoria.ts(+test), es.json, en.json |
| 2 hook + diálogos | `0f172d8a` (+ `0be07a3c`) | `TAREA2 F=0` (re-corrida con el plan corregido) | use-naira-memoria.ts(+test), DialogoDeCorreccion(+test), DialogoDeBorrado(+test) |
| 3 ítem + propuesta | `8fb07f9c` | `TAREA3 F=0` | ItemDeMemoria(+test), PropuestaProceduralPendiente(+test) |
| 4 pestaña | `32bcd5d3` | `TAREA4 F=0` | rutas-de-naira.ts(+memoria.test), memoria/{page,MemoriaClient,MemoriaView,MemoriaClient.test}, agentWorkspaceNav.ts |
| 5 guardia + cierre | `989494bc` | `TAREA5+CIERRE F=0` (primer intento `tarea5_intento_previo.log` F=1: guardián de tuteo, ver §6) | memoria-escrituras.test.ts |

Todos los marcadores de `<behavior>` están verdes. Cada archivo de test tiene su `[N13:control-positivo]` (lo verifica el cierre). Logs: `scratchpad/laned/13-07/tarea{1..5}.log` (más `*_intento_previo.log`).

## 4. Mutaciones en copia (cada una pone rojo su marcador)

- T1: promovible sin capa ⇒ `[N13:promovible-como-el-agente]`; autor crudo ⇒ `[N13:autor-sin-persona]`; razón cruda ⇒ `[N13:rechazo-sin-eco]`; 409 reintentable ⇒ `[N13:desenlace-por-operacion]`; capa sin validar ⇒ `[N13:filtros-validados]`; foco al primero ⇒ `[N13:foco-tras-borrar]`; hoja borrada de en.json ⇒ `[N13:i18n-es-en]`.
- T2: residuo ⇒ `[N13:403-sin-residuo]`; sin refetch ⇒ `[N13:refetch-al-volver]`; eco del texto y cierre ante un 422 ⇒ `[N13:pii-sin-eco]`; texto sin validar ⇒ `[N13:guardar-deshabilitado]`; motivo preseleccionado o borrar sin motivo ⇒ `[N13:borrar-exige-motivo]`.
- T3: categoría por texto ⇒ `[N13:categoria-por-campo]`; autor, borrado o quien propuso pintados ⇒ `[N13:b5-sin-persona]`; promovible sin mirar la capa ⇒ `[N13:promover-solo-inferencias]`; promover sin diálogo ⇒ `[N13:promover-con-dialogo]`; fecha propia ⇒ `[N13:fecha-del-item]`; href del agente ⇒ `[N13:sin-href-del-agente]`; rechazar sin diálogo ⇒ `[N13:rechazar-con-dialogo]`.
- T4: residuo ⇒ `[N13:403-sin-residuo]`; permiso ignorado ⇒ `[N13:memoria-acciones-por-permiso]`; URL, filtro y filtro de capa ⇒ `[N13:filtros-en-el-cliente]`; sin recarga ⇒ `[N13:conflicto-recarga]`; sin siguiente foco ⇒ `[N13:foco-tras-borrar]`; sin codificar ⇒ `[N13:sin-href-del-agente]`; otra acción ⇒ `[N13:pestana-por-su-accion]`.

## 5. Cierre contra la línea base

- La suite completa corrió bajo `/tmp/naira-front-suite.lock`, con 4 workers: 1226 archivos. Único rojo nuevo: `src/lib/api/puertas-que-faltan.guardian.test.ts` (intermitente conocido), verde al re-correrlo solo ⇒ «siguen rojos al re-correr = 0».
- Errores de `tsc` nuevos: 0. Archivos fuera de `files_modified`: 0. `package.json` y `pnpm-lock.yaml` intactos. Ningún guardián rojo tolerado (la base no tenía rojos).
- Tests del plan + guardias de la fase y del repo: 21 archivos verdes. UBI=0: puro, hook y componentes sin rutas del panel ni simulado.
- Punto 4 del coordinador:
  ```
  $ grep -rn 'correccion.quitalo' src .planning/naira/phases/13-superficie-naira
  RC=1 (1 = 0 coincidencias)
  $ VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4 pnpm exec vitest run src/lib/i18n/el-producto-tutea.test.ts
   ✓ src/lib/i18n/el-producto-tutea.test.ts (1 test) 619ms
       ✓ 🔴 ninguna frase que lea un usuario está en voseo  618ms
   Test Files  1 passed (1)
        Tests  1 passed (1)
  RC=0
  ```
  `el-producto-tutea.test.ts` no se tocó (sin diff desde `eca015f3`).
- Deriva: `git rev-list --count 4ad6c188..cambios-nico-10` = 0. `merge-tree --write-tree --name-only cambios-nico-10 HEAD` ⇒ árbol `d2d4d9cf…` sin archivos en conflicto. Agente medido en `project/account-manager` @ `12b7c445`.

## 6. Deviations from Plan

1. **[Rule 1 — defecto del plan] Clave `correccion.quitalo` renombrada a `correccion.quitarYGuardar`.** El cierre de la T5 dio rojo en `el-producto-tutea.test.ts` (guardián del repo, verde en la base), que lee `quitalo` en el NOMBRE de la clave (es.json, en.json y DialogoDeCorreccion.tsx) como voseo. Lo reporté y paré, y el coordinador corrigió el plan (`eaa5db3e`, 3 menciones). El rename quedó en el fix `0be07a3c`, con los valores iguales («Quítalo y vuelve a guardar.» / «Remove it and save again.»). T1 y T2 se re-corrieron desde el plan corregido: F=0.
2. **[Rule 1] El foco tras un hecho se aplica en un `useEffect` de `MemoriaView`.** El plan pedía `focus()` directo dentro del manejador del desenlace. Como el diálogo de Radix sigue montado en ese momento, su trampa de foco lo devolvía adentro (`[N13:hecho-toast-recarga]` en rojo). Ahora el destino (siguiente ítem o `h1`) se guarda en estado y se enfoca después del commit. Las anclas P20 (`const siguiente = siguienteFocoTrasBorrar(idsVisibles, itemId)`, etc.) y sus mutaciones siguen iguales.
3. **Contaminación de la línea base (~1 min).** Durante `base_1` (20:35-20:40), unos 60 s los `es.json`/`en.json` tuvieron la copy de 13-07 ya aplicada (aditiva y válida) y el puro sin test existió en el árbol. Lo revertí de inmediato. `base_2` corrió limpia y dio exactamente lo mismo que `base_1` (1217 archivos, 0 rojos, 0 inestables).
4. **Menores:** el script de la copy vivió en la carpeta de trabajo del scratchpad (no en `mktemp -d`); fuera del repo, sin commitear. El aviso «Datos de ejemplo: no se puede cambiar la memoria.» del ítem se pinta solo si el ítem tiene acciones (sin acciones no hay nada que apagar). En `run_t5.zsh` la corrida de la suite completa se envolvió con el candado propio del front (regla 2 del coordinador); el control no cambió.

## 7. Declarado

- **P4**: tras 409/404 la vista recarga sola y avisa. UI-SPEC decía que recargue la persona.
- **P4/G8**: una escritura con Naira apagada se ve como «ya no está», porque la memoria ejecutada responde 404 con `reason: null` y el `si404` de las escrituras es `no_encontrado`. La recarga que sigue pinta `NairaApagada`.
- **P8**: el ítem borrado va sin procedencia ni categoría, solo «Se borró el …».
- **P9**: `recordedAt` con `LineaConFecha` (UI-SPEC §6.1), no con `MarcaDeCorte`. El corte de la vista es `MarcaDeCorte` sobre `generatedAt`, junto a la versión.
- **P10**: «Ver esa memoria» es un botón que lleva el foco, sin `href`.
- **P12**: «Guardar corrección» queda deshabilitado sin cambios.
- **P15**: `useSearchParams` sin `Suspense`, como 13-03.
- **P17**: foco al `h1` tras corregir, promover o resolver.
- **P19**: se reusa «Aportado por» de 13-05.
- La corrección del agente responde 200, no 201 como dice UI-SPEC §7.8.
- **P6/D13-3**: la pestaña queda oculta en producción hasta que 10-06 publique `naira` en `/my-permissions`. «Confirmar que es cierto» no aparece hasta que 11-07 agregue `memory-promote`.
- Nada se verificó contra un agente vivo (Fase 8 en rama local sin desplegar, B-4). El E2E con `route.fulfill` y axe es de 13-08.

## Known Stubs

Ninguno: toda la pestaña lee del cliente real de 13-01 (en simulado, del ejemplo marcado como tal).

## Self-Check: PASSED

- Los 19 archivos nuevos existen en HEAD y los 3 MOD tienen su diff.
- Commits `3995dd73`, `0f172d8a`, `8fb07f9c`, `32bcd5d3`, `0be07a3c` y `989494bc` presentes en `project/naira-superficie`.
