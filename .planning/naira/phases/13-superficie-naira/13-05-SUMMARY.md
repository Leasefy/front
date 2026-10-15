---
phase: 13-superficie-naira
plan: "05"
subsystem: front-naira-superficie
tags: [react, next15, vitest, navegacion, i18n, naira, aprobaciones, hitl]

requires:
  - phase: 13-01
    provides: "contrato zod (NairaAction*/NairaTask*, vocabularios de 12-07), cliente (leerPropuestas/leerPropuesta/decidirPropuesta/leerTareas/cancelarTarea), useLecturaDeNaira, formatearCorte, METRICAS_DEL_CATALOGO, EJEMPLOS_DE_NAIRA"
  - phase: 13-02
    provides: "VistaDeNaira ('aprobaciones'/'propuesta'), ProveedorDeOrigen/useOrigenDeNaira, MarcaDeCorte, EnlaceALaFuente, CifraDeNaira, BloqueDeCategoria, guardias B-5 y claimClass que crecen"
  - phase: 13-03
    provides: "rutas-de-naira.ts, workspace naira + WorkspaceNavItem.action, guardia sin sección paralela (ya conocía aprobaciones · action-view)"
  - phase: 13-04
    provides: "CLAVE_DEL_ROL, tituloDeLaMetrica, fechaLegible, LineaConFecha, rutaDelLoop, la pestaña Seguimiento"
provides:
  - "src/lib/naira/vocabulario-de-aprobaciones.ts: claves exhaustivas de tipo/clase/estado/tarea/conflicto/aporte, METRICA_DEL_DETECTOR_ACTIVO, consecuenciaDelListado, cortesDeLosHechos, valorDelHecho, grupos"
  - "useNairaPropuestas(), useNairaPropuesta(proposalId), useNairaTareas(habilitada)"
  - "TarjetaDePropuesta, FilaDeTarea, DecisionDePropuesta, RazonamientoDePropuesta"
  - "pestaña B/aprobaciones (action-view) y ficha B/aprobaciones/[proposalId]; RUTA_DE_APROBACIONES y rutaDeLaPropuesta en el registro"
affects: [13-06, 13-07, 13-08]

tech-stack:
  added: []
  patterns:
    - "el detalle que registra `presentada` se pide SOLO desde la ficha: hook sin refresco, enlace sin prefetch, guardia estática por identificador"
    - "la huella que viaja es la del MISMO detalle renderizado (data-naira-huella) y la decisión se monta con key={huella}"

key-files:
  created:
    - src/lib/naira/vocabulario-de-aprobaciones.ts
    - src/lib/hooks/naira/use-naira-propuestas.ts
    - src/lib/hooks/naira/use-naira-propuesta.ts
    - src/lib/hooks/naira/use-naira-tareas.ts
    - src/components/inmobiliaria/naira/{TarjetaDePropuesta,FilaDeTarea,DecisionDePropuesta,RazonamientoDePropuesta}.tsx
    - src/app/panel/inmobiliaria/reportes/naira/aprobaciones/{page,AprobacionesClient,AprobacionesView}.tsx
    - src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/{page,PropuestaClient,PropuestaView}.tsx
    - "(+ 11 tests colocados)"
  modified:
    - src/lib/i18n/locales/{es,en}.json
    - src/lib/nav/rutas-de-naira.ts
    - src/lib/nav/agentWorkspaceNav.ts

key-decisions:
  - "la relectura tras huella_distinta la dispara la persona con «Cargar la versión actual»; nada se reenvía solo (P3)"
  - "puedeDecidir es del servidor: false ⇒ ningún botón, ni deshabilitado (P4)"
  - "las tareas son lectura secundaria: sin task-view no se piden; un 403 las omite sin rastro (P9)"

requirements-completed: []   # UI-01, UI-02, UI-03 PARCIALES; los cierran 13-06..13-08

duration: 1h26min (con 1 h de línea base por la carga de la máquina)
completed: 2026-09-28
---

# Fase 13 Plan 05: Aprobaciones de Naira (pestaña, tareas, ficha con la huella mostrada) — Summary

**La pestaña Aprobaciones (3.ª del workspace de Naira, gateada por `action-view`) lista lo que Naira propone hacer en «Por
decidir» y «Recientes», en el orden del servidor. Cada propuesta muestra tipo · rol, clase, estado y vencimiento. La
consecuencia solo aparece con el corte de sus datos al lado (E13-6 aplicada); sin un corte válido no se pinta. Las tareas que
creó Naira son una lectura secundaria: sin `task-view` no se piden, y si fallan desaparecen sin rastro. Cancelar una tarea
siempre pasa por un diálogo. La ficha de una propuesta es lo único que pide su detalle: pone la consecuencia primero, con su
corte inmediatamente debajo y fuera del desplegable. Se decide con la huella que está en pantalla. Un cambio de situación solo
se resuelve cargando la versión actual, sin reenviar nada. El razonamiento queda detrás de un tap y no muestra la certeza del
agente.**

## Performance

- 18:29 → 19:56 (-05). Tareas 5/5. Archivos 29 (los de `files_modified`). Node v20.20.0 (`~/.nvm/versions/node/v20.20.0`,
  el del CI).
- La máquina estuvo muy cargada (load average 45-81). La segunda corrida de la línea base tardó 49 min y la suite del cierre,
  11 min.

## Condición operativa (reglas del coordinador)

- Toda corrida de vitest llevó `VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4`: la suite completa, los tests por archivo, las copias
  y los 5 bloques `automated`. Cada bloque se extrajo del plan a `scratchpad/laned/13-05/run_tN.zsh` con
  `export VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4` como primera línea, que es lo único agregado.
- Las corridas pesadas usaron el candado propio del front `/tmp/naira-front-suite.lock` (`until mkdir …; …; rmdir …`): las dos
  corridas de la línea base y la suite completa del cierre de la Tarea 5. `run_t5.zsh` difiere del bloque del plan solo en ese
  envoltorio. Por la regla nueva del coordinador (máquina en 60-70), el umbral de candado huérfano de la suite del cierre es
  `-mmin +90`. La línea base se había lanzado antes con `+40` y no se tocó. `/tmp/naira-suite.lock` no se tocó. Al terminar no
  quedó ningún candado mío tomado.
- Guarda de lista vacía: ninguna corrida por archivo se armó con una lista variable sin comprobarla. En el bloque del plan,
  `REG` solo se corre si `${#REG[@]} -gt 0`.
- Instalación: `pnpm install --frozen-lockfile --offline` (sin red), RC 0. Los logs de cada verify con su RC están en
  `scratchpad/laned/13-05/`: `paso0_p1.log`, `paso0_p4_p5.log`, `instalacion.txt`, `linea_base.log`,
  `linea_base_analisis.txt`, `tarea1.log` … `tarea5.log`, `tarea3.intento1.log` y `RC.txt`.

## Base encadenada (D13-17)

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

- `BASE-DE-EJECUCION`: `4ad6c188… cambios-nico-10 2026-09-27`. Es igual a la línea `BASE=` de `13-04-SUMMARY.md` (x1).
- HEAD al empezar (`head_base.txt`): `725fddc22a87d0985d2a52141076401d9a8ee711`.
- Agente (`project/account-manager`, SOLO LECTURA): las anclas se midieron con el bloque de la Tarea 1 (19:33). Al cerrar, la
  rama está en `76c697502dc0b6ff587ee676e144ebc30c6d53c2`; la mueven otros carriles.
- Deriva: `git rev-list --count "${BASE}..cambios-nico-10"` = **0**. `git merge-tree --write-tree --name-only cambios-nico-10
  HEAD` da el árbol `a77d03d3…`, RC 0, **sin archivos en conflicto**.

## (1) Paso 0 — salida

- **Punto 1 (base) ⛔ OK:** rama `project/naira-superficie`, árbol limpio. BASE es un commit (RC 0), desciende de 4ad6c188
  (RC 0) y HEAD desciende de BASE (RC 0). 0 merges. Los commits de `BASE..HEAD` son `docs(13…)` o `<tipo>(13-0N)` y sus
  archivos están dentro de `.planning/naira/` ∪ `files_modified` de 13-01..13-05 (0 fuera). `6b3f5e2e` y `787808cd`, las
  correcciones del coordinador, solo tocan `.planning/naira/`.
- **Punto 2 (13-01..13-04 en disco) ⛔ OK:** los exports están todos presentes y ningún ejecutor anterior renombró nada. Existen
  `13-01..13-04-SUMMARY.md`. `ENDPOINTS_DE_NAIRA`:
  - `acciones.lista`: GET `/actions` [action-view], si404 `apagada`.
  - `acciones.detalle`: GET `/actions/{proposalId}` [action-view], si404 `no_encontrado`.
  - `acciones.decidir`: POST `/actions/{proposalId}/decision` [action-approve-internal, action-approve-external], si404
    `no_encontrado`.
  - `tareas.lista`: GET `/tasks` [task-view], si404 `apagada`.
  - `tareas.cancelar`: POST `/tasks/{tareaId}/cancel` [task-cancel], si404 `no_encontrado`.

  La línea `BASE=` de 13-04 es la de arriba. Next 15.5.26: `params` de página es `Promise` (D13-19).
- **Punto 3 (anclas del front) ⛔ OK, en la línea medida:** `useRefetchOnVisible.ts:17`, `PageGuard.tsx:43`,
  `VolverALaLista.tsx:42`, `alert-dialog.tsx:188` (`AlertDialogAction,` dentro del `export {`), `collapsible.tsx:12`,
  `button.tsx:120`, `empty-state.tsx:106`, `PermissionsContext.tsx:41`, `cuatro-estados.test.ts:82` y `package.json:73`. El
  resto de las anclas del bloque también están (0 «ANCLA AUSENTE» en los cinco logs), igual que los iconos `SealCheck`,
  `CaretDown` y `ArrowRight` y `src/app/panel/inmobiliaria/page.tsx`.
- **Punto 4 (sin colisión) ⛔ OK:** ninguno de los 16 archivos nuevos existía en `head_base`. `'action-view'` aparecía 0 veces en
  la nav y `RUTA_DE_APROBACIONES|rutaDeLaPropuesta` 0 veces en el registro. Los 4 subárboles i18n de 13-05 no existían en es ni
  en en.
- **Punto 5 (entorno) ⛔ OK:** `../cadence` tiene `"name": "@leasefy/cadence"`, `dist/` y `node_modules/`. `pnpm install
  --frozen-lockfile --offline` dio **RC 0** (18.9 s; postinstall de Prisma y MapLibre OK). `package.json` y `pnpm-lock.yaml`
  quedaron intactos.
- **Punto 6 (agente, SOLO LECTURA) ⛔ OK:** las 18 anclas de `12-07-PLAN.md` (rutas, vocabularios, matriz, `puedeDecidir`, E3,
  valor del hecho, errores, `asOfs` de E13-6) y las 2 de `12-01-PLAN.md` están presentes, con los espacios colapsados.
  `DETECTOR_REGISTRY` tiene **5 activos** y el front tiene los mismos 5 pares detector → métrica. `naira-acciones.ts` da **RC
  128**, así que 12-07 no está ejecutado y no hay enmiendas de nombre.
- **Punto 7 (línea base, antes de escribir; candado propio y 4 workers):** `B=/tmp/p1305_base.Y8dmWP` (puntero
  `/tmp/p1305_base.ruta`).

| Corrida | Archivos | Rojos | Tests | Tests fallidos |
|---|---|---|---|---|
| base_1 (18:31→18:42) | 1198 | 0 | 14668 | 0 |
| base_2 (18:42→19:31) | 1198 | 15 | 14668 | 96 |

  - base_2 tuvo 15 archivos rojos, todos verdes en base_1: fallaron bajo la carga. Son `MigrarContratos`,
    `GenerarDocumentoDialog`, `el-reintento-devuelve-su-promesa`, `ConfigPermisos.puntuales`, `PermisosDeLaPersona`,
    `PropietarioForm.correo`, `configurar-el-convenio`, `puertas-que-faltan.guardian`, `auth-context`,
    `claves-que-faltan.guardian`, `una-sola-seccion-de-inmuebles`, `ListaDeLotes`, `CambioDeCuentaBancaria.reparto`,
    `reportes/consola-limpia` y `StepColumnMapping`. **Inestables: 15. Rojos en las dos corridas: 0.** `tsc --noEmit`: **RC
    0, 0 errores**.
  - Primer intento de línea base descartado (ver Desviaciones 1).

## (2) Contrato publicado tal como quedó en disco

Todos los nombres y props del `<contrato_publicado>` quedaron como en el plan; los bloques los buscaron por presencia.

- `vocabulario-de-aprobaciones.ts` (puro): `CLAVE_DEL_TIPO_DE_ACCION`, `CLAVE_DE_LA_CLASE_DE_CONSECUENCIA`,
  `CLAVE_DEL_ESTADO_DE_LA_PROPUESTA`, `CLAVE_DEL_ESTADO_DE_TAREA` y `CLAVE_DEL_CONFLICTO_DE_DECISION`, todos `as const satisfies
  Record<…>`; en el último, las 3 razones «no verificable» comparten `…propuesta.conflictos.no_verificable`. También
  `CLAVE_DEL_APORTE`, `claveDelAporte(trust: string): string | null` (un `switch`), `esRazonDeConflictoDeDecision(razon)`,
  `METRICA_DEL_DETECTOR_ACTIVO: Readonly<Record<string, (typeof METRICAS_DEL_CATALOGO)[number]>>` (los 5 pares),
  `metricaDelDetector`, `nombreDeLaTarea`, `GRUPOS_DE_PROPUESTA`, `GrupoDePropuesta`, `grupoDeLaPropuesta`,
  `propuestasDelGrupo`, `ConsecuenciaDelListado`, `consecuenciaDelListado`, `cortesDeLosHechos` y `valorDelHecho(value:
  unknown): string | null`.
- Hooks: `useNairaPropuestas()`, `useNairaPropuesta(proposalId: string)` y `useNairaTareas(habilitada: boolean)`. Los tres
  devuelven `{ readonly estado: LecturaDeNaira<…>; readonly recargar: () => void }`.
- Componentes: `TarjetaDePropuestaProps { accion; hrefDeLaFicha: string | null }`, `FilaDeTareaProps { tarea; hrefDelLoop:
  string | null; puedeCancelar }`, `DecisionDePropuestaProps { proposalId; huellaMostrada; puedeDecidir; estado; venceEn;
  onDecidida; onCargarVersionActual }` y `RazonamientoDePropuestaProps { razonamiento; hrefDeLaSenal; hrefDeLaExplicacion }`.
  Cada uno con su componente homónimo `(): JSX.Element`.
- Rutas (agregadas al final de `rutas-de-naira.ts` bajo `// + 13-05 (aprobaciones)`; el archivo sigue sin imports):
  `RUTA_DE_APROBACIONES = \`${RUTA_DE_NAIRA}/aprobaciones\`` y `rutaDeLaPropuesta(proposalId)` con `encodeURIComponent`.
- Páginas:
  - `aprobaciones/page.tsx`: `<PageGuard module="naira" action="action-view">`, con `AprobacionesClient()` y
    `AprobacionesViewProps { lista; tareas: { lista; origen } | null; puedeCancelar; hrefDeLaFicha(id); hrefDelLoop(id) }`.
  - `aprobaciones/[proposalId]/page.tsx`: `async`, `params: Promise<{ proposalId: string }>`, `action-view`, con
    `PropuestaClient({ proposalId })` y `PropuestaViewProps { proposalId; detalle; hrefDeLaSenal; hrefDeLaExplicacion;
    onRecargar }`.
- Navegación: después de la pestaña `open-loops-view` y antes del comentario «← 13-04..13-07 AGREGAN…» (que sigue ahí para
  13-06/13-07) va `{ labelKey: 'inmobiliaria.ai.naira.tabs.aprobaciones', href: \`${NAIRA}/aprobaciones\`, icon: SealCheck,
  module: 'naira', action: 'action-view' }`, más el import de `SealCheck`.
- Atributos: los de la lista del plan. Además, en la tarjeta: `data-naira-consecuencia-del-listado` y
  `data-naira-cortes-del-listado` (P6).

**Enmiendas al contrato:** ningún nombre del §3.1 cambió. Lo AGREGADO es `vocabulario-de-aprobaciones.ts`,
`RUTA_DE_APROBACIONES`, `rutaDeLaPropuesta` y las 85 hojas i18n (`tabs.aprobaciones`, `aprobaciones.*`, `tareas.*` y
`propuesta.*`).

## (3) Por tarea

| Tarea | Commit | Resultado | Marcadores verdes |
|---|---|---|---|
| 1 vocabulario + copy | `0e5edf73` | `TAREA1 F=0` | 17 (10 del vocabulario + claves-naira ×3 + claimclass ×2 + B-5 ×2); 85 claves; formato intacto; paridad 5/5 con el registro; 0 tsc |
| 2 hooks | `ada438dc` | `TAREA2 F=0` | 16; 0 tsc |
| 3 componentes | `2b4a767c` | `TAREA3 F=0` en el 2.º intento (1.º `F=1`, ver Desviaciones 2) | 45 (con B-5, claimClass, sin-diálogos-del-navegador y el-reintento verdes); 0 tsc |
| 4 pestaña | `20b309f9` | `TAREA4 F=0` | 35 (con naira-sin-seccion-paralela ×4, WorkspaceNav.accion ×2, arquitectura-del-panel ×4, gates, B-5, claimClass, i18n); 0 tsc |
| 5 ficha + cierre | `31082100` | `TAREA5+CIERRE F=0` | 22 en la tarea + 36 claves del cierre; control positivo en los 11 archivos |

## (4) Mutaciones por la causa (en copia `mktemp -d` con `public/` enlazado; sonda de alias verde en cada tarea)

36 mutaciones; cada una puso en rojo al menos un `it` (DEBE ≥ 1):

- **T1:** m_prototipo (`detector-activo`), m_cortes (`cortes-en-orden`), m_grupo (`grupos-de-propuesta`), m_texto y
  m_corte_invalido (`listado-sin-consecuencia`), m_listado_sin_corte y m_cortes_repetidos (`listado-con-corte`), m_i18n
  (`i18n-es-en`).
- **T2:** m_residuo (`403-sin-residuo`), m_foco (`refetch-al-volver`), m_precarga y m_relee (`detalle-solo-al-abrir`), m_otra
  (`propuesta-sin-residuo`), m_secundaria (`secundaria-sin-red`).
- **T3:** m_prefetch (`detalle-solo-al-abrir`), m_texto (`listado-sin-consecuencia`), m_sin_cortes (`listado-con-corte`),
  m_sin_dialogo (`cancelar-con-dialogo`), m_rol (`rol-no-persona`), m_huella (`huella-vista`), m_reenvio (`sin-reenvio`),
  m_puede (`puede-decidir`), m_rechazo (`rechazar-con-dialogo`), m_tap (`razonamiento-tras-un-tap`), m_confianza
  (`confianza-no-se-pinta`).
- **T4:** m_residuo (`403-sin-residuo`), m_sin_accion (`tareas-sin-accion-sin-red`), m_cancelar (`cancelar-segun-permiso`),
  m_tareas (`tareas-403-sin-rastro`), m_codificar (`sin-href-del-agente`), m_accion (`pestana-por-su-accion`).
- **T5:** m_residuo (`403-sin-residuo`), m_vuelta (`ficha-con-vuelta`), m_senal (`sin-href-del-agente`), m_huella
  (`huella-vista`), m_cortes (`asof-de-la-consecuencia`).

## (5) Cierre contra la línea base

- Los 11 archivos de test de 13-05 pasaron en verde con los 36 marcadores de sus falsos verdes, con un
  `[N13:control-positivo]` verde en cada uno (FG13-9), junto con las guardias de la fase y del repo. UBI=0: ningún puro, hook ni
  componente de 13-05 contiene rutas del panel ni el simulado. En todo el árbol no-test de Naira, solo
  `use-naira-propuesta.ts` nombra `leerPropuesta`.
- Suite completa (candado propio, 4 workers, 19:43→19:54): **1209 archivos** (1198 + 11 nuevos). Salió con RC 1, que es
  informativo. En la comparación por archivo hay **0 rojos nuevos y 0 verde→rojo**: todo archivo rojo del final ya estaba rojo
  en alguna corrida base (los inestables de base_2 bajo la carga), así que no hubo nada que re-correr.
- `tsc --noEmit`: **0 errores nuevos** (la base tenía 0). **0 archivos fuera de `files_modified`**. `package.json` y
  `pnpm-lock.yaml` intactos. No se agregó ninguna dependencia.
- Guardias de 13-02/13-03 (P19): no hubo que editar ninguna lista cerrada. `naira-sin-seccion-paralela` y
  `WorkspaceNav.accion` siguieron verdes con la 3.ª pestaña.

## (6) Declarado

- **P3:** es la lectura de D13-14 alineada con UI-SPEC §7.6. Tras un 409 `huella_distinta`, la relectura la dispara la persona
  con «Cargar la versión actual» (el `recargar()` de la ficha). La consecuencia nueva se pinta antes de que vuelva a haber
  botones, y el siguiente pedido lleva la huella nueva. Nada se reenvía ni se relee solo.
- **P5:** un 403 de capa 1 (sin `reason`) y uno de capa 2 (con `reason`) se pintan igual («No tienes permiso para esta
  acción.»), porque el cliente de 13-01 no lee `reason` en un 403. Ninguna rama copia la razón ni un texto del agente.
- **P8:** el valor de un hecho va crudo (`unidad=""`). La «unidad por métrica» de UI-SPEC §7.6 no se aplica hasta E13-13
  (`valorRenderizado`).
- **P9:** cancelar una tarea no relee la lista; la próxima vuelta a la pestaña la actualiza.
- **P13:** la pestaña no lleva punto ni número (`WorkspaceNav` no tiene ranura).
- **P18:** el 409 del GET de la ficha (propuesta no reproducible) se pinta como fallo reintentable de `VistaDeNaira`. La copy de
  «no reproducible» vive en la tarjeta del listado.
- **E13-6 aplicada y consumida:** el listado pinta la consecuencia con sus `asOfs`. Un agente sin la enmienda (`asOfs` ausente),
  un arreglo vacío o un corte inválido dan `sin_corte`, y entonces el texto no sale.
- Los títulos de las métricas (el nombre de una tarea) quedan en español también con el panel en inglés, porque son
  vocabulario del agente, igual que en 13-04.
- Nada se verificó contra un agente vivo: 12-07 no está ejecutado (B-4). Todo está construido y probado con los datos de
  ejemplo del contrato, y la vista lo marca; la verificación real es de 13-08.

## (7) Commits

| Tarea | Commit | Mensaje |
|---|---|---|
| 1 | `0e5edf73` | feat(13-05): vocabulario de las aprobaciones de Naira (tipo, clase, estado, tarea, conflicto, detector activo, cortes) y su copy en es y en |
| 2 | `ada438dc` | feat(13-05): hooks de las aprobaciones de Naira (lista con refresco al volver, detalle solo al abrir, tareas como lectura secundaria) |
| 3 | `2b4a767c` | feat(13-05): tarjeta de propuesta, fila de tarea, decision con la huella mostrada y razonamiento tras un tap (Naira) |
| 4 | `20b309f9` | feat(13-05): pestana Aprobaciones de Naira en su workspace de Agentes IA (propuestas y tareas, sin prefetch del detalle) |
| 5 | `31082100` | feat(13-05): ficha de la propuesta de Naira (consecuencia primero con su corte, decision con la huella mostrada, razonamiento tras un tap) |

## Deviations from Plan

**1. Línea base repetida (proceso, sin efecto en el código).** Lancé la primera línea base en segundo plano y, mientras corría
base_1, escribí en el árbol el vocabulario y la copy. Eso incumplía «la línea base se toma ANTES de escribir nada». Corté esa
corrida (maté mis procesos por PID y liberé mi candado, creado por ese mismo script) y restauré el árbol (`git checkout --` de
es/en y borrado del archivo nuevo por su ruta exacta). Después borré ese `$B` y su puntero por su ruta exacta y volví a tomar la
línea base entera con el árbol limpio. El código de la Tarea 1 se reescribió después, idéntico al primero (`cmp`). Log:
`linea_base.intento1_contaminado.log`.

**2. [Rule 1 - Bug] Ancla repetida en un comentario (Tarea 3, 1.er intento `TAREA3 F=1`).** El comentario de cabecera de
`TarjetaDePropuesta.tsx` citaba el literal `prefetch={false}`. El ancla quedaba dos veces y `m_prefetch` no se aplicaba («ancla
ausente o repetida»). Reescribí el comentario sin el literal y re-corrí el bloque ENTERO: `TAREA3 F=0`. No se tocó el control.

**3. Test de la Tarea 3: Radix deja la región cerrada vacía y oculta.** El plan (§E) daba por hecho que, cerrado, el contenido
del `Collapsible` no se monta. En el disco, `CollapsibleContent` cerrado deja su `div` con `hidden` y sin hijos. El test de
`[N13:razonamiento-tras-un-tap]` comprueba que no haya contenido visible: la región falta o está `hidden` sin hijos ni texto, y
no hay `[data-naira-hecho]`. Es lo que pide el `<behavior>`: «no hay contenido visible del razonamiento». El control sigue
detectando la causa (m_tap rojo).

**4. Dos incoherencias internas del `<behavior>`, resueltas por su intención:**
- `AprobacionesClient.test.tsx` `[N13:listado-sin-consecuencia]` decía «el innerHTML no contiene `CONSECUENCIA`», pero la misma
  fixture exige mostrar `CONSECUENCIA-VISIBLE 2468` (la propuesta con corte, `[N13:control-positivo]`). El test comprueba que no
  aparezcan `98765`, `CONSECUENCIA-CON-CIFRA` ni el texto del ejemplo base (los tres sin corte).
- `TarjetaDePropuesta.test.tsx` `[N13:control-positivo]` decía «raíz dentro de un bloque ACCIÓN», pero la acción A del plan pone
  el `<article>` por fuera del `BloqueDeCategoria`. El test comprueba que la raíz contiene el bloque ACCIÓN con el titular, la
  clase, el vencimiento y el enlace.

**5. Ajustes operativos:** los `export VITEST_MAX_*` en los bloques, el candado en la suite del cierre (umbral de 90 min por la
regla nueva del coordinador) y el script de la copy (85 hojas), que vivió en el scratchpad, se corrió desde un `mktemp -d` que se
borró por su ruta y no se commitea.

## Known Stubs

Ninguno que impida el objetivo. Los datos son de ejemplo mientras 12-07 no esté desplegado, y la vista lo avisa
(`aviso-datos-de-ejemplo`, decidir y cancelar deshabilitados).

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>` del plan. Las dos escrituras (`decidirPropuesta` y `cancelarTarea`) salen
del cliente de 13-01, con la huella mostrada y tras confirmar, respectivamente.

## Self-Check: PASSED

- En `git diff --name-status 725fddc2 HEAD -- src` están los 25 archivos nuevos y los 4 modificados: los 29 de
  `files_modified`.
- Los commits `0e5edf73`, `ada438dc`, `2b4a767c`, `20b309f9` y `31082100` están en `git log`.
- Árbol limpio tras el último commit de código. Tras escribir este SUMMARY se borran `$B` (`/tmp/p1305_base.Y8dmWP`) y
  `/tmp/p1305_base.ruta` por su ruta exacta (P16).
