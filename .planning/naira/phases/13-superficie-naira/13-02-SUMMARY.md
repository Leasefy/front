---
phase: 13-superficie-naira
plan: "02"
subsystem: front-naira-primitivas
tags: [react, vitest, typescript-ast, i18n, a11y, naira]

requires:
  - phase: 13-01
    provides: "EstadoNaira/votarSenal, espejo zod (CLAIM_CLASSES, IDS_DE_BANDA, NairaSignalCitation, METRIC_UNITS…), LecturaDeNaira, formatearCorte/formatearValorDeNaira, mapas cerrados de drill-down, categorias por campo, claves-naira.test"
provides:
  - "VistaDeNaira (estado ANTES que los hijos), NairaSinPermiso, NairaApagada, ProveedorDeOrigen/useOrigenDeNaira"
  - "MarcaDeCorte, EnlaceALaFuente, CifraDeNaira + destinos-del-drill-down.ts"
  - "afirmaciones.ts (clases del contrato + 7 bandas ADR-005), ChipDeAfirmacion, BloqueDeHipotesis, OracionesCausales"
  - "BloqueDeCategoria, BotonesDeUtilidad; contraste AA de AvisoDatosDeEjemplo (C11)"
  - "guardias que crecen: b5-sin-persona.test.ts y claimclass-del-contrato.test.ts (por AST)"
  - "59 hojas de copy de 13-02 en es y en bajo inmobiliaria.ai.naira"
affects: [13-03, 13-04, 13-05, 13-06, 13-07, 13-08]

tech-stack:
  added: []
  patterns:
    - "switch exhaustivo con never sobre el estado vigente; solo 'ok' monta hijos"
    - "origen del ok por contexto (ProveedorDeOrigen) en vez de props enhebradas"
    - "guardias estáticas por AST de TypeScript: los comentarios no son nodos"

key-files:
  created:
    - src/components/inmobiliaria/naira/OrigenDeNaira.tsx
    - src/components/inmobiliaria/naira/VistaDeNaira.tsx
    - src/components/inmobiliaria/naira/NairaSinPermiso.tsx
    - src/components/inmobiliaria/naira/NairaApagada.tsx
    - src/components/inmobiliaria/naira/MarcaDeCorte.tsx
    - src/components/inmobiliaria/naira/EnlaceALaFuente.tsx
    - src/components/inmobiliaria/naira/CifraDeNaira.tsx
    - src/components/inmobiliaria/naira/ChipDeAfirmacion.tsx
    - src/components/inmobiliaria/naira/BloqueDeHipotesis.tsx
    - src/components/inmobiliaria/naira/OracionesCausales.tsx
    - src/components/inmobiliaria/naira/BloqueDeCategoria.tsx
    - src/components/inmobiliaria/naira/BotonesDeUtilidad.tsx
    - src/lib/naira/afirmaciones.ts
    - src/lib/naira/destinos-del-drill-down.ts
    - src/components/inmobiliaria/naira/b5-sin-persona.test.ts
    - src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts
    - "(+ 14 tests colocados: uno por primitiva y por puro)"
  modified:
    - src/components/estado/AvisoDatosDeEjemplo.tsx
    - src/components/estado/AvisoDatosDeEjemplo.test.tsx
    - src/lib/i18n/locales/es.json
    - src/lib/i18n/locales/en.json

key-decisions:
  - "VistaDeNaira pinta AvisoDatosDeEjemplo por origen (P3); 13-03 NO lo monta en el layout"
  - "Sin proveedor, useOrigenDeNaira da 'agente' (P4, riesgo aceptado)"
  - "La tabla de destinos sigue al disco de 13-01, no a UI-SPEC §7.8 (P8)"
  - "Las bandas del ADR-005 viven en código (afirmaciones.ts), no en i18n (P7)"

requirements-completed: []   # UI-01, UI-02 y UI-03 quedan PARCIALES (primitivas); los cierran 13-03..13-08

duration: 150min
completed: 2026-09-28
---

# Fase 13 Plan 02: Primitivas transversales de Naira — Summary

**Diez primitivas (+ `OrigenDeNaira` y `OracionesCausales`) con las reglas duras de la superficie viviendo UNA vez: el estado
se evalúa antes que los hijos (un 403 tras un 200 no deja residuo), todo número sale con su corte en hora de Colombia y un
drill-down por mapa cerrado con el gate del destino, la categoría y la `claimClass` salen de campos del contrato (fail-closed),
los votos no tienen actor ni persisten, y dos guardias por AST que crecen solas con cada archivo del árbol de Naira.**

## Performance

- **Duración:** 12:52 → ~15:25 (-05). Incluye ~23 min de línea base, ~80 min esperando el candado global de suite
  (otros carriles) y un corte por el límite de uso de la API (retomado 15:22).
- **Tareas:** 5/5. **Archivos:** 33 (29 nuevos, 4 modificados).
- **Node:** v20.20.0 (`/Users/nicolasgarcia/.nvm/versions/node/v20.20.0`, el del CI) para instalar, testear y `tsc`.

## Base encadenada (D13-17)

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

- `BASE-DE-EJECUCION`: `4ad6c188bd79a1f1272d96411a75813f87707651 cambios-nico-10 2026-09-27`; igual a la línea `BASE=` de
  `13-01-SUMMARY.md` (x1).
- HEAD al empezar: `31e3144256bcc6f19e8d5f63842f4b4470a9e535` (= `head_base.txt`).
- `project/account-manager` (agente, SOLO LECTURA) contra el que se midieron las anclas: `d874f73dd4e9246247dea382d7bf888af3b547c9`
  (Paso 0); re-medidas en `a790749f` durante la ejecución (09-03 y 11-07 RC 0). Al cerrar el agente está en `d36c6e67` (lo
  movieron otros carriles; no se re-midió).
- Deriva: `git rev-list --count "${BASE}..cambios-nico-10"` = **0**; `git merge-tree --write-tree --name-only cambios-nico-10 HEAD`
  = árbol `a51b4eee…`, RC 0, **sin archivos en conflicto**.

## (1) Paso 0 — salida

**Punto 1 (base) ⛔ OK.** Rama `project/naira-superficie`; `status --porcelain --untracked-files=all` vacío; BASE commit RC 0;
BASE desciende de 4ad6c188 RC 0; HEAD desciende de BASE RC 0; merges desde BASE = 0; los commits de `BASE..HEAD` son `docs(13…)`
(solo `.planning/naira/`) y los 5 `feat(13-01)`, cuyos archivos están todos en `files_modified` de 13-01 (control del bloque de
la Tarea 1: 51 rutas leídas del disco, 0 fuera).

**Punto 2 (13-01 en disco) ⛔ OK.** Todos los exports por presencia: `cliente.ts` (EstadoNaira :63, KINDS_DE_ESTADO_NAIRA :73,
votarSenal :214); `contrato.ts` (METRIC_UNITS :81, SECCIONES_DEL_BRIEFING :110, VALORES_DE_FEEDBACK :152, CLAIM_CLASSES :177,
IDS_DE_BANDA :179, NairaBriefingItem :729, NairaSignalFeedbackResult :735, NairaSignalCitation :763, NairaSignalFeedbackRequest
:775); `use-lectura-de-naira.ts` (LecturaDeNaira :28, useLecturaDeNaira :34); `formato.ts` (ZONA_DE_NAIRA :17, formatearCorte :24,
formatearValorDeNaira :51); `fuente-a-ruta.ts` (RUTA_DE_LA_METRICA :64, RUTA_POR_FUENTE :82, rutaDeLaMetrica :110, rutaDeLaFuente
:115); `categorias.ts` (CategoriaVisible :11, CATEGORIAS_VISIBLES :12, SECCIONES_DE_SALIDA :15, SeccionDeSalida :16,
categoriaDeSeccion :32, categoriaDeProcedencia :36); `mock-naira.ts` (USER_IDS_DE_EJEMPLO :31, EJEMPLOS_DE_NAIRA :467);
`claves-naira.test.ts` existe. **Rutas no nulas de `RUTA_DE_LA_METRICA` ∪ `RUTA_POR_FUENTE` (10, iguales a `<interfaces>` §B):**
`/panel/inmobiliaria/pagos/{cartera, recaudo, cobranza, cobranza/acuerdos, cobranza/disputas, cobranza/deudores, cobranza/pagos,
cobranza/escalaciones}`, `/panel/inmobiliaria/inmuebles`, `/panel/inmobiliaria/pipeline`.

**Punto 3 (anclas del front) ⛔ OK** (todas en la línea medida al planificar): `FalloDeCarga.tsx:177` `data-testid="fallo-de-carga"`,
`:178` `data-tipo={fallo.tipo}`, `:109` `const permisos = usePermissionsContextSafe()`; `clasificar.ts:335` `if (status === 403) {`,
`:467` `titulo: 'No tienes acceso a esto',`; `empty-state.tsx:106`/`:123`; `PermissionsContext.tsx:41`/`:278`/`:287`;
`auth/index.ts:10`; `i18n-test-stub.tsx:55`; `popover.tsx:52`; `toast.tsx:69`; `skeleton.tsx:21`; `AvisoDatosDeEjemplo.tsx:51`/`:58`/`:67`;
`arquitectura-del-panel.ts:716`/`:739`; `agentWorkspaceNav.ts:108`. Las 10 rutas destino con `page.tsx`: RC 0 las 10.

**Punto 4 (sin colisión) ⛔ OK.** `src/components/inmobiliaria/naira/`, `src/lib/naira/afirmaciones.ts`,
`src/lib/naira/destinos-del-drill-down.ts` no existían (RC 1); `inmobiliaria.ai.naira` ausente en `es.json` y `en.json`.

**Punto 5 (entorno) ⛔ OK.** `../cadence/package.json` con `"name": "@leasefy/cadence"`, `dist/` y `node_modules/` presentes;
`package.json:30` `file:../cadence`; `typescript` en `package.json:111`. `pnpm install --frozen-lockfile --offline` ⇒ **RC 0**
("Lockfile is up to date", postinstall de Prisma y MapLibre OK); después `package.json`/`pnpm-lock.yaml` intactos.

**Punto 6 (agente, SOLO LECTURA) ⛔ OK.** Las 13 anclas de `09-03-PLAN.md` (CLAIM_CLASSES, Hipotesis, las 7 bandas y su render) y las
2 de `11-07-PLAN.md` (SECCIONES_VOTABLES, razones 409) presentes con espacios colapsados; `detect/types.ts:75-78` `EntityRef` con
`kind`/`id`. **09-03 EJECUTADO** (`vocabulario-probabilidad.ts` RC 0: manda su ADR, la Tarea 3 comparó las 7 filas contra
`ADR-005-vocabulario-de-probabilidad.md` ⇒ iguales); **11-07 sin ejecutar** (`naira-open-loops.ts` RC 128: las razones del 409 se
citan de su PLAN, sin enmienda de nombre).

**Punto 7 (línea base, antes de escribir nada; con el candado global).**

| Corrida | Archivos | Rojos | Tests | Tests fallidos |
|---|---|---|---|---|
| base_1 | 1162 | 0 | 14419 | 0 |
| base_2 | 1162 | 4 | 14419 | 4 |

- Rojos base_2 (los 4 por tiempo, `STACK_TRACE_ERROR`): `sin-pago-simulado-publico.guardian`, `ConfigPermisos.puntuales`,
  `puertas-que-faltan.guardian`, `ListaDeLotes`. **Inestables: 4** (los mismos). `tsc --noEmit` de la base: **RC 0, 0 errores**.
- Logs: `…/scratchpad/laned/13-02/paso0_p1a6.log`, `paso0_p6.log`, `paso0_p7.log`, `paso0_linea_base.txt`, `instalacion.txt`.

## (2) Contrato publicado tal como quedó en disco

Todos los nombres y props del `<contrato_publicado>` del plan, sin renombrar (el bloque de cada tarea los buscó por presencia):

- `OrigenDeNaira.tsx`: `OrigenDeLosDatos`, `ProveedorDeOrigen({ origen, children })`, `useOrigenDeNaira()` (default `'agente'`).
- `VistaDeNaira.tsx`: `VISTAS_DE_NAIRA` (8), `NombreDeVistaDeNaira`, `VistaDeNairaProps<T>` { nombre, estado, renderOk, queEs, volverA,
  onReintentar?, esqueleto? }, `VistaDeNaira<T>`. Raíz `data-naira-vista` / `data-naira-estado` / `data-sample="true"` (solo ok de ejemplo).
- `NairaSinPermiso({ volverA })` (`data-testid="naira-sin-permiso"`), `NairaApagada()` (`data-testid="naira-apagada"`).
- `MarcaDeCorte({ asOf, ahora? })`, `FuenteDelDato`, `EnlaceALaFuente({ de, referenciaTecnica? })` (`data-naira-enlace` =
  activo | sin-permiso | sin-ruta | inactivo-ejemplo), `CifraDeNaira({ valor, unidad, asOf, de, referenciaTecnica?, ahora?, valorRenderizado? })`.
- `OrigenDeCategoria`, `BloqueDeCategoria({ origen, children?, razonDeVacio? })` (`data-categoria`, `data-seccion`).
- `afirmaciones.ts`: `CLASES_DE_AFIRMACION = CLAIM_CLASSES`, `ClaseDeAfirmacion`, `BandaId`, `BANDAS_DE_PROBABILIDAD` (7),
  `renderizarBanda`, `HipotesisDeLaCita`, `EntidadDeHipotesis`, `OracionCausal = NairaSignalCitation`.
- `ChipDeAfirmacion({ claimClass })`, `BloqueDeHipotesis({ hipotesis })`, `OracionesCausales({ oraciones })` (`data-claim-class`,
  `data-naira-causa-oculta`).
- `BotonesDeUtilidad.tsx`: `SECCIONES_VOTABLES`, `OrigenDelVoto`, `BotonesDeUtilidad({ promocionId, origenDelVoto })` (`data-naira-voto`).
- `destinos-del-drill-down.ts`: `DestinoDelDrillDown`, `DESTINOS_DEL_DRILL_DOWN` (10 rutas, tabla de P8 sin cambios), `destinoDeLaRuta`.

**Enmiendas al contrato:** ninguna de nombre. Todo lo AGREGADO es lo marcado `+` en el plan. Internos no exportados:
`EstadoDelEnlace` (EnlaceALaFuente), `UnidadDeNaira`/`esUnidadDeNaira` (CifraDeNaira), `Alternativa` (BloqueDeHipotesis),
`categoriaDelOrigen` y los mapas de icono/etiqueta/borde/fondo (BloqueDeCategoria), y en `afirmaciones.ts` un tipo de
comprobación `_LaTablaCubreElContrato` (deja de compilar si `IDS_DE_BANDA` gana una banda que la tabla no tiene).

## (3) Salida de cada bloque `automated`

| Tarea | Resultado | Log |
|---|---|---|
| 1 | `TAREA1 F=0` (14 marcadores, 59 claves en es/en, formato intacto, 0 tsc en la carpeta) | `…/laned/13-02/tarea1.log` |
| 2 | `TAREA2 F=0` (23 marcadores; 0 template literals, 1 `href=`, 0 formateo propio) | `tarea2.log` |
| 3 | `TAREA3 F=0` (15 marcadores; bandas = ADR-005, chip sin `texto`, sin confianza) | `tarea3.log` |
| 4 | `TAREA4 F=0` (15 marcadores; 10/10 líneas `it(`/`expect(` de la base del test del aviso presentes) | `tarea4.log` |
| 5 | `TAREA5+CIERRE F=0` (7 marcadores de las guardias + cierre) | `tarea5.log` |

**Las 24 mutaciones/sondas por la causa** (en una COPIA `mktemp -d` con `node_modules` enlazado; la sonda del alias `@` verde en
cada una) — todas con **1** `it` rojo en su marcador (DEBE ≥ 1):

| T | Mutación / sonda | Marcador |
|---|---|---|
| 1 | la vista conserva el ok ante un 403 | `[N13:403-sin-residuo]` |
| 1 | `ProveedorDeOrigen origen="agente"` | `[N13:ejemplo-avisado]` |
| 1 | hoja de Naira borrada de en.json | `[N13:i18n-es-en]` |
| 2 | `href` armado con el metricId/fuente | `[N13:sin-href-del-agente]` |
| 2 | gate `canAccess` salteado | `[N13:enlace-sin-permiso]` |
| 2 | corte con `toLocaleString` del proceso | `[N13:asof-bogota]` |
| 2 | marca fuera del contenedor | `[N13:asof-pegado]` |
| 2 | fail-closed del corte salteado | `[N13:cifra-sin-corte]` |
| 2 | vista que provee siempre `'agente'` | `[N13:simulado-visible]` (Cifra) |
| 2 | Cartera con módulo `cobranza` | `[N13:destinos-del-panel]` |
| 2 | `valorRenderizado` ignorado | `[N13:valor-renderizado]` |
| 3 | oración sin clase deja de ocultarse | `[N13:claimclass-del-contrato]` (Oraciones) |
| 3 | chip rotula siempre hipótesis | `[N13:claimclass-del-contrato]` (Chip) |
| 3 | banda `probable` corrida a 55-66 | `[N13:bandas-del-adr]` |
| 3 | se pinta el id de la banda | `[N13:banda-renderizada]` |
| 4 | todo rotulado DATO | `[N13:categoria-por-campo]` |
| 4 | vota en cualquier sección | `[N13:voto-secciones]` |
| 4 | origen ignorado | `[N13:simulado-visible]` (Botones) |
| 4 | texto del aviso vuelve a `text-warning` | `[N13:aviso-contraste]` |
| 5 | componente que lee `p.userId` | `[N13:b5-sin-persona]` |
| 5 | `latenciaDeAprobacion` en `src/lib/hooks/naira/` | `[N13:sin-latencia]` |
| 5 | regex `/porque|probablemente/` en `src/lib/naira/` | `[N13:claimclass-del-contrato]` (guardia) |
| 5 | `ChipDeAfirmacion` montado fuera de OracionesCausales | `[N13:chip-solo-desde-oraciones]` |
| 5 | hoja «Seguramente subió porque bajó el recaudo» | `[N13:copy-sin-lexico]` |

**Sonda de prosa (DEBE quedar verde):** un archivo cuyo único rastro de los tokens B-5 y de «latencia» son comentarios ⇒
`[N13:b5-sin-persona]` y `[N13:sin-latencia]` **verdes** (RC 0).

## (4) Cierre (Tarea 5, suite completa con el candado global)

- Los 17 archivos de test del plan (+ `claves-naira.test.ts`) verdes; los 19 marcadores de falsos verdes verdes; un
  `[N13:control-positivo]` verde en cada uno de los 16 archivos de 13-02 (FG13-9).
- Ningún componente ni puro de 13-02 con la ruta del workspace (UBI=0); ninguno con `text-xs` y todos con `import type { JSX }` (TXS=0).
- Suite completa contra la línea base por ARCHIVO: **1177 archivos** (1162 + 15 de test nuevos), RC de la suite **0** (todo verde),
  **0 rojos nuevos ni verde→rojo**, sin re-corridas necesarias.
- `tsc --noEmit`: **0 errores nuevos** (la base tenía 0). **0 archivos fuera de `files_modified`** desde `head_base.txt`;
  `package.json`/`pnpm-lock.yaml` intactos.
- El bloque de cierre corrió 13:35–14:59 sobre las guardias con mtime 13:34:22, idénticas a las commiteadas en `b836f00e` (nada en
  `src/` posterior al log): no hizo falta otra corrida de suite tras el corte de la API.

## (5) Avisos a 13-03..13-08

- **`VistaDeNaira` pinta `AvisoDatosDeEjemplo`** por el `origen` del ok (P3): 13-03 NO lo monta en `reportes/naira/layout.tsx`.
- **`volverA` lo pone la página** (P17): ninguna primitiva conoce rutas del workspace (las únicas rutas son las de destino del drill-down).
- **Toda cifra por `CifraDeNaira`** (con `valorRenderizado={item.valorRenderizado}` cuando venga) y **toda causa por
  `OracionesCausales` dentro de `BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'INFERENCE' }}`**: `ChipDeAfirmacion` solo
  se monta desde `OracionesCausales` (la guardia lo fija). La señal le pasa `causa.citasConClase` TAL CUAL; sin él,
  `citas.map((texto) => ({ texto, claimClass: null, hipotesis: null }))`.
- **`origenDelVoto`:** ítems del briefing con su `seccion` (solo `atencion`/`informativo` votan), loops de Seguimiento con `loop_abierto`.
- **El mapa `metricId → nombre` sigue pendiente** (P18): `BloqueDeHipotesis` pinta el `metricId` en mono; 13-04 puede AGREGAR una prop.
- **Tests:** popover plano (molde `PilotoModoHeader.test.tsx:56-61`; con `span` si el chip va dentro de un `<p>`), `ProveedorDeOrigen
  origen="ejemplo"` para el modo ejemplo, y `vi.mock('@/lib/context/PermissionsContext', …)` con `usePermissionsContext` (para
  `EnlaceALaFuente`) y `usePermissionsContextSafe` (lo lee `FalloDeCarga` en todo estado distinto de ok).
- Las dos guardias recorren `src/app/panel/inmobiliaria/reportes/naira` en cuanto exista (hoy está en `RAICES_QUE_PUEDEN_FALTAR`):
  toda página nueva entra sola. Evitar en el árbol: `text-xs` (doce-pixeles cuenta también comentarios) y la palabra `ErrorState`
  en `.tsx` (cuatro-estados la busca en todo el archivo).

## (6) Declarado (success_criteria)

- E13-3/E13-4/E13-13 consumidas del espejo de 13-01 (D13-23): una cita con `claimClass: null` se oculta y se declara; una
  hipótesis de la conversación (sin banda) se oculta; `valorRenderizado` manda sobre `formatearValorDeNaira`.
- Default `'agente'` del origen sin proveedor (P4). `NairaSinPermiso` hereda `role="alert"` de `FalloDeCarga` y el 403 genérico
  también para el admin (P5, `[N13:sin-permiso-admin]`). `no_disponible`/`conflicto`/`rechazado` en una lectura ⇒ `FalloDeCarga`
  de servidor sin distinguir red/5xx/sin URL (P5).
- Tabla de destinos según el disco de 13-01, no UI-SPEC §7.8 (P8); escalaciones sin paridad de pestaña. `metricId` crudo del
  discriminador (P18). La edad del corte no se refresca sola (P9). El voto no se recuerda al recargar (U20).
- `AvisoModoSimulado.tsx:55` conserva su 3.2:1 (UI-SPEC §13.1 «sin cambios»): fuera de alcance.
- Nada verificado contra un agente vivo (B-4); la parte DOM de FG13-13 (ningún `userId` de los ejemplos en pantalla) la cierran 13-05/13-07.

## (7) Commits

| Tarea | Commit | Mensaje |
|---|---|---|
| 1 | `a000a7b8` | feat(13-02): VistaDeNaira evalua el estado antes que los hijos, carteles de sin permiso y apagada, copy de Naira |
| 2 | `a276e4c0` | feat(13-02): CifraDeNaira con corte pegado en Bogota y drill-down por mapa cerrado |
| 3 | `2839e94d` | feat(13-02): claimClass del contrato con hipotesis ICD 203 y oraciones causales fail-closed |
| 4 | `b1334762` | feat(13-02): categoria por campo, botones de utilidad de sesion y contraste AA del aviso de datos de ejemplo |
| 5 | `b836f00e` | test(13-02): guardias de Naira que crecen: B-5 sin persona ni latencia y claimClass del contrato con copy sin lexico |

## Deviations from Plan

### Ajustes operativos (instrucción del coordinador)

- Instalación con `pnpm install --frozen-lockfile --offline`; RC 0.
- En el bloque de la Tarea 5 la corrida de la suite completa se envolvió en el candado global `/tmp/naira-suite.lock`
  (`tarea5_candado.zsh`); es la única diferencia con el bloque del plan. La línea base (punto 7) también tomó el candado por corrida.

### Decisiones de implementación dentro del plan (sin tocar contrato ni controles)

- `import type { JSX } from 'react'` en su propia línea (y `ReactNode` en otra) para que la línea literal que mide el cierre exista.
- `afirmaciones.ts`: `renderizarBanda` busca la fila con `find`; el caso sin fila es inalcanzable (tipo `_LaTablaCubreElContrato` +
  esquema zod) y devuelve `''`.
- `BotonesDeUtilidad`: además del estado `enVuelo`, una referencia `viajando` impide un segundo POST si llegan dos clics antes del
  siguiente render (T-13-02-08). El botón presionado es el `valor` que devuelve el servidor en el 201.
- `BloqueDeCategoria`: un `razonDeVacio` vacío cuenta como ausente.
- `claimclass-del-contrato.test.ts`: además de los 4 prefijos del plan (`probab`, `improbab`, `verosimil`, `plausible`), `quiza` e
  `imposible` también se buscan como prefijo (sin eso `new RegExp('quizás')`, que el control exige marcar, no se vería).
- `OracionesCausales.test.tsx` `[N13:citas-con-clase]`: el ejemplo de 13-01 trae una sola cita (con clase); para probar que «una
  con `claimClass: null` no» se agregó una segunda vuelta con esa cita sumada a las del ejemplo (la primera vuelta las pasa tal cual).

**Total:** 0 auto-arreglos (Rules 1-3). **Impacto:** ninguno sobre el contrato ni sobre los controles.

## Issues Encountered

- El candado global estuvo tomado por otros carriles ~80 min durante el cierre; el bloque esperó sin cortes.
- La ejecución se cortó por el límite de uso de la API después del cierre y antes del commit de la Tarea 5; se retomó a las 15:22
  (el log ya tenía `TAREA5+CIERRE F=0`; se verificó que las guardias no cambiaron desde que el bloque arrancó).

## Known Stubs

Ninguno. Las primitivas no traen datos propios: los reciben de las superficies (13-03..13-07).

## Self-Check: PASSED

- Los 33 archivos de `files_modified` presentes; commits `a000a7b8`, `a276e4c0`, `2839e94d`, `b1334762`, `b836f00e` en `git log`.
