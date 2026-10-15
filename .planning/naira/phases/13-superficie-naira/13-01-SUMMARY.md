---
phase: 13-superficie-naira
plan: "01"
subsystem: front-naira-base
tags: [zod, react, vitest, permisos, i18n, naira]

requires:
  - phase: agente project/account-manager (Fase 8 EXISTE; 9.5-06, 10-06, 11-07, 12-07 PLANIFICADOS)
    provides: contrato HTTP de Naira (naira-memory.ts y los <contrato_publicado> de los planes sin ejecutar)
provides:
  - "src/lib/api/naira/contrato.ts: espejo zod de los 17 endpoints (tolerante en ejecución, estricto profundo en tests)"
  - "src/lib/api/naira/cliente.ts: EstadoNaira cerrado y las 17 funciones del §3.1 sobre un transporte único"
  - "src/lib/data/mock-naira.ts: un ejemplo por endpoint que ES el contrato"
  - "src/lib/hooks/naira/use-lectura-de-naira.ts: hook base que reemplaza el estado entero"
  - "src/lib/naira/{formato,fuente-a-ruta,categorias}.ts: corte/valor, drill-down cerrado, categoría por campo"
  - "naira FAIL CLOSED por acción real en agent-module-access.ts (el admin del monolito no pasa)"
  - "guardia i18n es<->en de Naira viva desde 13-01"
affects: [13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08]

tech-stack:
  added: []
  patterns:
    - "construirEsquemas(estricto): un solo árbol zod, helper objeto() decide strict/strip en TODOS los niveles"
    - "enmendado(esquema): campo del agente opcional en el tolerante y requerido en el estricto"
    - "EstadoNaira: unión cerrada donde solo 'ok' lleva data (el 403 no puede cargar datos por tipo)"
    - "hook con generación numérica y reemplazo entero del estado"

key-files:
  created:
    - src/lib/api/naira/contrato.ts
    - src/lib/api/naira/contrato.test.ts
    - src/lib/data/mock-naira.ts
    - src/lib/data/mock-naira.test.ts
    - src/lib/api/naira/cliente.ts
    - src/lib/api/naira/cliente.test.ts
    - src/lib/hooks/naira/use-lectura-de-naira.ts
    - src/lib/hooks/naira/use-lectura-de-naira.test.tsx
    - src/lib/naira/formato.ts
    - src/lib/naira/formato.test.ts
    - src/lib/naira/fuente-a-ruta.ts
    - src/lib/naira/fuente-a-ruta.test.ts
    - src/lib/naira/categorias.ts
    - src/lib/naira/categorias.test.ts
    - src/lib/context/PermissionsContext.naira.test.tsx
    - src/lib/i18n/claves-naira.test.ts
  modified:
    - src/lib/auth/agent-module-access.ts
    - src/lib/auth/agent-module-access.test.ts

key-decisions:
  - "Los cuerpos de pedido se validan con el árbol ESTRICTO (P6); las respuestas solo con el tolerante"
  - "formatearCorte arma el Intl.DateTimeFormat en cada llamada (una instancia de módulo congelaría la zona y la mutación de zona no se vería)"
  - "El hook sincroniza leerRef/agenciaRef en un efecto declarado antes del efecto de lectura (no escribe refs durante el render)"

requirements-completed: []   # UI-02 y UI-03 quedan PARCIALES (base); los cierran 13-02..13-08

duration: 85min
completed: 2026-09-28
---

# Fase 13 Plan 01: Base de datos y permisos de la superficie de Naira — Summary

**Espejo zod de los 17 endpoints de Naira (estricto profundo en tests, `strip` en ejecución), cliente con 8 estados
cerrados donde solo `ok` lleva datos, ejemplos que pasan el esquema estricto, hook que reemplaza el estado entero,
formateadores/mapas puros y `naira` fallando cerrado en el gate del front aun para el admin del monolito.**

## Performance

- **Duración:** ~85 min (2026-09-28 11:24 → 12:49 -05), de los cuales ~55 min fueron la línea base (2 × 21 min de suite) y el cierre.
- **Tareas:** 5/5.
- **Archivos:** 18 (16 nuevos, 2 modificados); 3774 inserciones, 3 borrados (`git diff --stat a0819b57 HEAD`).
- **Node:** v20.20.0 (`/Users/nicolasgarcia/.nvm/versions/node/v20.20.0`, el mismo del CI) para instalar, testear y `tsc`.

## Base encadenada (D13-17)

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

- `BASE-DE-EJECUCION`: `4ad6c188bd79a1f1272d96411a75813f87707651 cambios-nico-10 2026-09-27`.
- HEAD al empezar: `a0819b57f272e86bb66186ac6e56da6256f54106`; HEAD al cerrar las tareas: `4dd6a8bb`.
- `project/account-manager` (agente) contra el que se midieron las anclas: `821c102e3c89ba2074d535701fc0e3a35ab22c6c`
  (el plan lo había medido en `74323320`; se movió por 12-04 y todas las anclas siguen presentes).
- Deriva: `git rev-list --count "${BASE}..cambios-nico-10"` = **0**; `git merge-tree --write-tree --name-only cambios-nico-10 HEAD`
  = árbol `e2f541f6…`, RC 0, **sin archivos en conflicto**.

## (1) Paso 0 — salida

**Punto 1 (base) ⛔ OK.** Rama `project/naira-superficie`; `status --porcelain --untracked-files=all` vacío; BASE commit RC 0;
BASE desciende de 4ad6c188 RC 0; HEAD desciende de BASE RC 0; merges desde BASE = 0; los 28 commits de `BASE..HEAD` son todos
`docs(13…)` y tocan solo `.planning/naira/` (briefs, README y la carpeta de la fase).

**Punto 2 (anclas del front por presencia) ⛔ OK:**

```
src/lib/auth/agent-module-access.ts:33:const FAIL_CLOSED_MODULES = ['cobranza', 'cotizador'] as const;
src/lib/auth/agent-module-access.ts:34:const ABSENT_ALLOWED_MODULES = ['estudio', 'matching', 'avaluos'] as const;
src/lib/auth/agent-module-access.ts:30:  avaluos?: string[];
src/lib/auth/agent-module-access.ts:52:export function resolveAgentModuleAccess(
src/lib/auth/agent-module-access.test.ts:21:  it('recognizes the five agent modules', () => {
src/lib/context/PermissionsContext.tsx:218:      if (isAgentModule(module)) {        (< :225)
src/lib/context/PermissionsContext.tsx:225:      if (permissions.isAdmin) return true;
src/lib/api/config.ts:70:export function isMockMode(): boolean {
src/lib/api/config.ts:48:    process.env.NODE_ENV === 'production'
src/lib/api/agent-fetch.ts:99:export async function agentFetch(
src/lib/api/agent-fetch.ts:108:  if (res.status !== 401) return res
src/lib/hooks/piloto/use-piloto-briefing.ts:29:  const agencyId = agency?.id ?? null
src/lib/auth/index.ts:10:export { useAuth } from './use-auth'
package.json:91:    "zod": "^3.25.76"
tsconfig.json:3:    "target": "ES2017",
page.tsx RC 0 en: pagos/cartera, pagos/recaudo, pagos/cobranza, pagos/cobranza/{acuerdos,disputas,deudores,pagos,escalaciones}, inmuebles, pipeline
```

**Punto 3 (sin colisión) ⛔ OK:** ninguno de `src/lib/api/naira/`, `src/lib/naira/`, `src/lib/hooks/naira/`,
`src/lib/data/mock-naira.ts`, `PermissionsContext.naira.test.tsx`, `claves-naira.test.ts` existía (RC 1 los seis);
`'naira'` no estaba en `agent-module-access.ts` (0); `inmobiliaria.ai.naira` ausente en `es.json` y `en.json`.

**Punto 4 (entorno) ⛔ OK:** `../cadence/package.json` con `"name": "@leasefy/cadence"`, `dist/` y `node_modules/` presentes;
`package.json:30` `"@leasefy/cadence": "file:../cadence"`. Instalación: `pnpm install --frozen-lockfile --offline` (con
`--offline` por instrucción del coordinador) ⇒ **RC 0** ("Lockfile is up to date", `postinstall` `prisma generate` + copia del
worker de MapLibre OK). Después: `git status --porcelain -- package.json pnpm-lock.yaml` vacío.

**Punto 5 (nombres del agente, SOLO LECTURA) ⛔ OK:** todas las anclas del bloque de la Tarea 1 (secciones 1 y 1b) presentes
(`PASO0-anclas F=0`). Grupos ejecutados en el agente: `naira-conversacion.ts`, `naira-briefing.ts`, `naira-open-loops.ts`,
`naira-acciones.ts` ⇒ **los cuatro RC 128 (no existen)**: el espejo de esos grupos cita su PLAN. `naira-memory.ts` EXISTE.
Líneas movidas (mismo sentido, se citan las medidas): `FactSnapshot` en `write.ts:139-154` (el plan decía 122-137),
`UrgencyClass` en `detect/types.ts:102-106` (el plan decía 79-83).

**Punto 6 (línea base).** Dos corridas completas (con el candado global) y `tsc`:

| Corrida | Archivos | Verdes | Rojos | Tests | Tests fallidos |
|---|---|---|---|---|---|
| base_1 | 1153 | 1143 | 10 | 14117 | 34 |
| base_2 | 1153 | 1139 | 14 | 14117 | 84 |

- Rojos base_1: `reportes/consola-limpia.test.tsx`, `ReglasDeMora.test.tsx`, `EstadosFinancieros.test.tsx`, `ListaDeLotes.test.tsx`,
  `GenerarDocumentoDialog.test.tsx`, `el-reintento-devuelve-su-promesa.test.ts`, `CertificacionDelMandatario.test.tsx`,
  `ConfigPerfilAgencia.test.tsx`, `puertas-que-faltan.guardian.test.ts`, `claves-que-faltan.guardian.test.ts`.
- Rojos base_2: `destinos-de-la-url-saneados.guardian`, `enlaces-a-pantallas-que-existen.guardian`, `SeccionEquipo`, `no-promete`,
  `reportes/consola-limpia`, `sin-pago-simulado-publico.guardian`, `MigrarContratos`, `ListaDeLotes`, `doce-pixeles.guardian`,
  `ResolucionDeFacturacion`, `ConfigPermisos.puntuales`, `puertas-que-faltan.guardian`, `la-sala-de-pagos-se-fue`, `una-sola-seccion-de-inmuebles`.
- **Inestables (difieren entre corridas): 18.** Estables en rojo en las dos: `consola-limpia`, `ListaDeLotes`, `puertas-que-faltan.guardian`.
- `tsc --noEmit` de la base: **RC 0, 0 errores**.
- ⚠ Declarado: base_2 coincidió con un `tsc` que corrí sobre una COPIA de prueba fuera del worktree (carga), lo que explica
  parte de los inestables (guardianes que recorren el repo con límite de tiempo). Como eso ensancha lo que el cierre excusa,
  corrí aparte, después del cierre, los 11 archivos verdes en base_1 y rojos en base_2: **11/11 verdes** con los cambios de este plan.
- Logs: `…/scratchpad/laned/13-01/paso0_linea_base.txt`, `tsc_base.txt`, `instalacion.txt`, `paso0_p5.log`, `paso0_p6.log`, `inestables.json`.

## (2) Contrato publicado tal como quedó en disco

Todos los nombres EXACTOS del §3.1 y del `<contrato_publicado>` del plan están en disco (el bloque `automated` de cada tarea los
buscó por presencia). Resumen:

- `contrato.ts`: `NAIRA_BASE`, `ACCIONES_DE_NAIRA` (16), `AccionDeNaira`, `IdDeEndpoint` (17), `EndpointDeNaira`,
  `ENDPOINTS_DE_NAIRA` (la tabla del §3.1 fila por fila, `fuente` por fila), `IDS_DE_ENDPOINT`; los 35 `<N>Schema = TOLERANTES.<N>` +
  `type <N> = z.infer<…>` (24 de respuesta, 3 objetos enmendados, `NairaError`, 7 pedidos), cada `const <N>` con `// fuente:` y
  `// estado:` encima; `ESQUEMAS_ESTRICTOS_DE_NAIRA`, `RespuestasDeNaira`, `RESPUESTA_TOLERANTE_POR_ENDPOINT`,
  `RESPUESTA_ESTRICTA_POR_ENDPOINT`, `NODOS_OPACOS_DE_NAIRA`, `RAZON_NAIRA_NO_HABILITADA`, y los vocabularios `as const`
  (PERSISTED_MEMORY_LAYERS … SECCIONES_DE_ORACION, con los valores del agente).
- `cliente.ts`: `EstadoNaira<T>`, `KINDS_DE_ESTADO_NAIRA`, `RAZON_PEDIDO_INVALIDO` y las 17 funciones con las firmas EXACTAS del §3.1.
- `mock-naira.ts`: `EJEMPLOS_DE_NAIRA: { readonly [K in IdDeEndpoint]: RespuestasDeNaira[K] }`, `USER_IDS_DE_EJEMPLO`
  (`…0000000b5001`, `…0000000b5002`), `FECHA_DE_EJEMPLO = '2000-01-03'`.
- `use-lectura-de-naira.ts`: `LecturaDeNaira<T>`, `useLecturaDeNaira<T>(leer, deps)` con la firma del §3.1.
- `formato.ts`: `ZONA_DE_NAIRA`, `formatearCorte`, `formatearValorDeNaira`. `fuente-a-ruta.ts`: `METRICAS_DEL_CATALOGO` (14),
  `FUENTES_DEL_REGISTRO` (24), `RUTA_DE_LA_METRICA`, `RUTA_POR_FUENTE`, `rutaDeLaMetrica`, `rutaDeLaFuente`.
  `categorias.ts`: `CategoriaVisible`, `CATEGORIAS_VISIBLES`, `SECCIONES_DE_SALIDA`, `SeccionDeSalida`, `categoriaDeSeccion`,
  `categoriaDeProcedencia`.
- `agent-module-access.ts`: `naira?: string[]`, `const FAIL_CLOSED_MODULES = ['cobranza', 'cotizador', 'naira'] as const;`,
  `if (action === 'view') return granted.length > 0;`.
- `claves-naira.test.ts`: `NAMESPACES_DE_NAIRA`, `CLAVES_SUELTAS_DE_NAIRA`, `IDENTICAS_PERMITIDAS` (vacía).

**Enmiendas al contrato (todo AGREGADO; ningún nombre del §3.1 cambió):**
- `contrato.ts` (+): `CLASES_DE_DETECTOR` (`['state','trend']`, `detect/types.ts:29`), `CANALES_DE_ENTREGA`, `TIPOS_DE_ENTREGA`,
  `ESTADOS_DEL_ENVIO`, `KINDS_DE_MEMORIA_DEL_EVENTO`, `KINDS_DE_VERIFICACION_DEL_EVENTO` (los enums de los dos nodos opacos) y el
  tipo `EsquemasDeNaira`. Esquemas internos NO exportados (se alcanzan por anidamiento): `NairaMemoryWrittenBy`,
  `NairaMemoryDerivedFrom`, `NairaMemoryContent`, `NairaMemorySnapshot`, `NairaConversationScope`, `NairaConversationCanAnswer`,
  `NairaOpenLoopNextCheck`, `NairaOpenLoopCandidate` (desenlace = `DESENLACES_DEL_LOOP` sin `'expirado'`, vía `.exclude`),
  `NairaOpenLoopCommunication`, `NairaActionRecipient` (Destinatario), `NairaFactSnapshot`.
- `ESQUEMAS_ESTRICTOS_DE_NAIRA` además de los tests lo usa `cliente.ts` para validar los CUERPOS que arma el front (P6); una
  respuesta jamás se parsea con él.

## (3) Salida de cada bloque `automated`

| Tarea | Resultado | Log |
|---|---|---|
| 1 | `TAREA1 F=0` (13 marcadores + `el-producto-tutea` verdes; tsc 0 en la tarea; grupos citan su plan) | `…/laned/13-01/tarea1.log` |
| 2 | `TAREA2 F=0` (20 marcadores; 0 `fetch` pelado/storage) — 1.er intento `F=1`, ver Desviaciones | `tarea2.log`, `tarea2.intento1.log` |
| 3 | `TAREA3 F=0` (8 marcadores) | `tarea3.log` |
| 4 | `TAREA4 F=0` (15 marcadores; ninguna métrica nueva del agente fuera del mapa) | `tarea4.log` |
| 5 | `TAREA5+CIERRE F=0` (11 marcadores; 26 aserciones de la base presentes) | `tarea5.log` |

**Las 19 mutaciones por la causa (todas en una COPIA `mktemp -d`, sonda de alias verde):**

| # | Mutación | Marcador | Its rojos |
|---|---|---|---|
| 1 | `generatedAt:` renombrado en el ejemplo | `[N13:fixture-es-contrato]` | 1 |
| 2 | `TOLERANTES = construirEsquemas(true)` | `[N13:parseo-tolerante]` | 18 |
| 3 | helper sin `.strict()` | `[N13:estricto-profundo]` | 2 |
| 4 | `enmendado` sin `.optional()` | `[N13:enmiendas-opcionales]` | 6 |
| 5 | 403 exige `reason` | `[N13:403-sin-reason]` | 18 |
| 6 | parseo fallido devuelve el crudo | `[N13:contrato-roto-sin-datos]` | 18 |
| 7 | simulado sin la guarda de producción | `[N13:simulado-nunca-en-prod]` | 1 |
| 8 | sin URL sirve el ejemplo | `[N13:sin-url-no-disponible]` | 18 |
| 9 | cualquier `reason` del 404 = apagada | `[N13:404-por-razon]` | 10 |
| 10 | conservar el `ok` ante un no-`ok` | `[N13:403-sin-residuo]` | 1 |
| 11 | sin `setEstado(CARGANDO)` | `[N13:agencia-sin-residuo]` | 1 |
| 12 | ruta sin `page.tsx` | `[N13:ruta-con-pagina]` | 1 |
| 13 | `in` en vez de `Object.hasOwn` | `[N13:sin-href-del-agente]` | 1 |
| 14 | sin `timeZone: ZONA_DE_NAIRA` | `[N13:asof-bogota]` | 1 |
| 15 | INFERENCE ⇒ dato | `[N13:categoria-por-campo]` | 1 |
| 16 | `naira` fuera de FAIL_CLOSED (admin pasa) | `[N13:naira-fail-closed]` (PermissionsContext.naira) | 2 |
| 17 | `naira` a ABSENT_ALLOWED | `[N13:naira-fail-closed]` (agent-module-access) | 1 |
| 18 | alias `>= 0` | `[N13:naira-view-alias]` | 1 |
| 19 | clave de Naira solo en `es.json` | `[N13:i18n-es-en]` | 1 |

## (4) Cierre

- Suite completa (con el candado global) contra la línea base por ARCHIVO: **1162 archivos** (1153 + los 9 de test nuevos),
  **0 rojos nuevos ni verde→rojo**, sin re-corridas necesarias; RC de la suite 1 (informativo: los rojos preexistentes).
- `tsc --noEmit`: **0 errores nuevos** (la base tenía 0).
- **0 archivos fuera de `files_modified`** desde `head_base.txt` (salvo `.planning/naira/`); `PermissionsContext.tsx` idéntico a BASE,
  `isAgentModule` en `:218` antes que `isAdmin` en `:225`.
- Evidencia extra (fuera del control): los 11 archivos verdes en base_1 y rojos en base_2, corridos aparte tras el cierre ⇒ 11/11 verdes.

## (5) Avisos a 13-02..13-08

- `src/components/estado/cuatro-estados.test.ts:51` clasifica `use-lectura-de-naira.ts` (y todo `use-naira-*.ts`) como hook de datos:
  una pantalla que lo use y pinte un vacío tiene que nombrar el fallo (`MIRA_EL_ERROR = /\berror\b|isError/`).
- Choque UI-SPEC §8.5 ↔ D13-4 (manda D13-4): un `recargar()` que falla por red/5xx deja `no_disponible`, no lo anterior + banda.
- `si404` es heurística SOLO sin `reason: 'naira_no_habilitada'` (la memoria ejecutada responde `null`; `acciones_apagadas` y
  `no_entregado` caen en `si404`).
- 🔔 `agent.prospect_leads` ⇒ `/panel/inmobiliaria/pipeline` (RESEARCH A3 duda de que liste esos leads).
- P10: el `valor` `pct` llega en PUNTOS porcentuales (`'12.5'`) y se formatea por bps como el agente (`'12,5%'`); el
  «pct llega en bps» del §3.1 se leyó así. `days` repite «N días» del agente; con `valorRenderizado` (E13-13) manda el agente.
- Dos nodos opacos (P3): `NairaOpenLoopEvent.memoria` y `.verificacion` (solo `kind`, `passthrough` en los dos modos).
- `leerBriefing(agencyId, '')` NO manda `?dia=` (un día vacío se trata como ausente); la URL base del agente se usa sin barra final.
- En modo simulado TODOS los endpoints (también los POST) devuelven su ejemplo sin red: la vista deshabilita los botones de escritura (UI-SPEC §8.6).

## (6) Declarado (success_criteria)

- B-4: nada se verificó contra un agente vivo; fases 9.5, 10, 11 y 12 del agente sin ejecutar ⇒ su espejo es PLANIFICADO.
- E13-2, E13-3, E13-4, E13-6, E13-7 y E13-13 espejadas (D13-23; las enmendadas opcionales en el tolerante y presentes en los
  ejemplos); **E13-5 (inventario del silencio) sin aplicar**: el espejo no tiene inventario.
- D13-3: hasta que 10-06 publique `naira` en `/my-permissions`, Naira entera (incluida la memoria que ya existe) queda oculta;
  `PageGuard` sigue dejando pasar `isAdmin` (R13-7): el 403 del servicio y `NairaSinPermiso` (13-02) son la autoridad visible.
- UI-02 y UI-03 quedan PARCIALES (base); no se marcan como completos.

## (7) Commits

| Tarea | Commit | Mensaje |
|---|---|---|
| 1 | `bf6a0c4d` | feat(13-01): espejo zod del contrato de Naira y ejemplos que son el contrato |
| 2 | `1619893f` | feat(13-01): cliente de Naira con estados cerrados y simulado solo por la guarda de config |
| 3 | `9e0b7a2b` | feat(13-01): hook base de Naira que reemplaza el estado entero |
| 4 | `69523990` | feat(13-01): corte y valor de Naira en Bogota, mapas cerrados de drill-down y categoria por campo |
| 5 | `4dd6a8bb` | feat(13-01): naira falla cerrado por accion real en el gate del front y guardia i18n viva |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Línea-ancla repetida en `cliente.ts`**
- **Encontrado en:** Tarea 2, primer bloque `automated` (`TAREA2 F=1`: `MUTACION NO APLICADA … ancla x2`).
- **Problema:** `if (!r.success) return { kind: 'contrato_roto' }` aparecía en `ejemploDe` y en `pedirANaira`; P16 exige una sola.
- **Arreglo:** `ejemploDe` devuelve con un ternario (`ejemplo.success ? … : { kind: 'contrato_roto' }`); el control no se tocó.
- **Verificación:** bloque re-corrido ENTERO ⇒ `TAREA2 F=0`, `m_parcial` con 18 its rojos. Antes del commit `1619893f`.

### Ajustes operativos y de implementación (declarados)

- Instalación con `pnpm install --frozen-lockfile --offline` (instrucción del coordinador); RC 0.
- En el bloque de la Tarea 5 la corrida de la suite completa se envolvió en el candado global `/tmp/naira-suite.lock`
  (instrucción del coordinador); es la única diferencia con el bloque del plan (`tarea5_candado.zsh`).
- Hook: `leerRef`/`agenciaRef` se sincronizan en un efecto declarado ANTES del efecto de lectura (no se escriben durante el render);
  la semántica del plan (último `leer` de cada render) se conserva.
- Ejemplo `seguimiento.detalle`: el evento `nacimiento` trae `verificacion: { kind: 'nacimiento' }` y el evento `ciclo`
  `{ kind: 'del_dia' }` (nodo opaco; coherente con el tipo de evento).
- `cliente.test.ts`: el recorrido estático de `src/` lleva `timeout: 60_000` (mismo criterio que `arquitectura-del-panel.test.ts`).

**Total:** 1 auto-arreglo (Rule 1). **Impacto:** ninguno sobre el contrato ni sobre los controles.

## Issues Encountered

- La suite completa tarda ~21 min por corrida en esta máquina; los bloques se corrieron en segundo plano sin cortes.
- Tras el cierre, otro carril tomó el candado de la suite (esperado; no es de este plan).

## Known Stubs

Ninguno que impida el objetivo: `mock-naira.ts` son datos de ejemplo por diseño (D13-6), importados solo por `cliente.ts`
detrás de `isMockMode()`; `IDENTICAS_PERMITIDAS` vacía por diseño (13-02..13-07 la amplían).

## Self-Check: PASSED

- 18/18 archivos de `files_modified` presentes en disco; commits `bf6a0c4d`, `1619893f`, `9e0b7a2b`, `69523990`, `4dd6a8bb` en `git log`.
