# Fase 13 · PLAN-CHECK v3 — re-medición contra `cambios-nico-10` @ `4ad6c188` (ronda ÚNICA)

> 2026-09-28 · Worktree `/Users/nicolasgarcia/rent/wt-front-naira`, rama `project/naira-superficie` @ `49de7038` (27 commits
> `docs(13…` sobre BASE, 0 merges, árbol limpio) · `BASE-DE-EJECUCION` = `4ad6c188bd79a1f1272d96411a75813f87707651` (ancestro de
> HEAD, RC=0) · agente `project/account-manager` re-medido @ `11177c51` · Contra: `13-CONTEXT.md` §0 (RB-1..RB-9), D13-1′, D13-17,
> D13-19..D13-23; `13-REBASE-RESEARCH.md`, `13-REBASE-PATTERNS.md`, `briefs/brief-revisor-rebase-13.md` (G1-G8).
> **Solo lectura:** ningún plan editado, nada ejecutado, instalado ni commiteado. **Ningún test se corrió** (ver I2: `node_modules`
> apareció en el worktree hoy 10:10 con `next 15.5.26`/`react 19.3.0`/`vitest 4.0.18`, pero el mandato de esta ronda es estático).
> Temporales en `mktemp -d` con prefijo `f13_`.

## §0 · Veredicto

**EJECUTAR CON ADVERTENCIAS** — **0 bloqueantes · 2 advertencias · 4 informativas.**
Los 8 planes quedan estructuralmente válidos, el Paso 0 de D13-17 es uniforme en los 8, las anclas de BASE pasan en seco y todo
lo rojo en seco depende de un plan anterior y está declarado como tal. Las dos advertencias son de documentos (`13-VALIDATION.md`
con el censo viejo; texto del criterio 1 en el agente que contradice D13-1′), no de los planes.

## §1 · Estructura (medido)

| Plan | `^---$` | plan-structure | tareas | bloques `automated` | `bash -n`/`zsh -n` | `$VAR:letra` | `5e3a6f85` (plan entero) | ola / depends_on |
|------|---------|----------------|--------|---------------------|--------------------|--------------|--------------------------|------------------|
| 13-01 | 2 | valid, 0 err, 0 warn | 5 | 5 | 5/5 OK | 0 | 0 | 1 / `[]` |
| 13-02 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 2 / `["01"]` |
| 13-03 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 3 / `["02"]` |
| 13-04 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 4 / `["03"]` |
| 13-05 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 5 / `["04"]` |
| 13-06 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 6 / `["05"]` |
| 13-07 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 7 / `["06"]` |
| 13-08 | 2 | valid | 5 | 5 | 5/5 OK | 0 | 0 | 8 / `["07"]`, `autonomous: false` |

Bloques extraídos anclando `^\s*<automated>` (40; ninguna etiqueta `<automated>` fuera de tareas). Sin `timeout`, sin `--watch`,
sin `rm` con comodines, sin `pnpm install/add`, sin `git commit/checkout/rebase/pull/stash/reset`, sin rutas `~/rent/mvp*`, sin
filas en `.planning/releases/` (D13-18: solo prohibiciones en prosa, 13-01:175, 13-08:147/546/1158/1184). Olas lineales 01→08,
sin ciclos ni referencias futuras. zsh 5.9 / bash 3.2.57 (los del brief).

## §2 · Ejecutabilidad en la base nueva (EN SECO)

**Método:** de cada bloque de la Tarea 1 se tomó el tramo del Paso 0 (desde la cabecera hasta antes de «Forma de…/Grupo
ejecutado») y se corrió con **zsh** sobre el worktree real (solo lecturas: `git -C`, `grep -cF`, `git show` del agente; todo
volcado en su `$D`; verificado que el tramo no escribe fuera de `$D` ni llama a `copia`/`vcopia`/`rojo`/`mutar`).

| Plan | Resultado del tramo Paso 0 | Qué quedó rojo y por qué |
|------|----------------------------|--------------------------|
| 13-01 | **F=0** | nada: BASE, `cat-file`, desciende de `4ad6c188`, HEAD desciende, 0 merges, procedencia (27 commits `docs(13…`), rama, `files_modified`=18, FUERA=0, cadence/zod, y TODAS las anclas del agente (§1 y §1b del bloque) |
| 13-02 | F=1 esperado | línea base del punto 7 (se crea antes de escribir), `13-01-SUMMARY` con `BASE=`, archivos de 13-01 (`cliente.ts`, `contrato.ts`, hook, puros, mock, `claves-naira.test.ts`) |
| 13-03 | F=1 esperado | ídem + archivos de 13-02 (`VistaDeNaira`, `CifraDeNaira` con `valorRenderizado?`, guardias B-5/claimClass) y `FAIL_CLOSED_MODULES` con `'naira'` (13-01 T5) |
| 13-04..13-07 | F=1 esperado | ídem + lo de 13-03..13-0(N−1): `rutas-de-naira.ts`, `slug: 'naira'`, `action?: string`, pestañas `briefing-view`/`open-loops-view`/`action-view`/`conversation-ask`, comentario `← 13-04..13-07 AGREGAN su pestaña AQUÍ`, `canAccess(item.module, item.action ?? 'view')`, `WorkspaceNav.accion.test.tsx`, claves i18n; y las tres comparaciones agente↔front (13-04 nombres conversacionales, 13-05 `METRICA_DEL_DETECTOR_ACTIVO`, 13-07 `MOTIVOS_DE_RECHAZO_DE_CONTENIDO`) caen solo porque el lado front lo crea la propia T1 (ENOENT del `vocabulario-de-*.ts`) |
| 13-08 | F=1 esperado | los 7 SUMMARY, las 8 `page.tsx`, marcas `data-naira-*`, `contrato.ts`/`mock-naira.ts`/`rutas-de-naira.ts`, `BF` (padre del primer `(13-01):`), claves de 13-06/13-07 |

**Verificación de que ningún rojo es de base:** para cada `ANCLA AUSENTE`/`ANCLA x0` de 13-02..13-08 se buscó (a) el archivo en
los `files_modified` de un plan ANTERIOR y (b) el literal en el texto de ese plan: **todos** cumplen (a) y (b). Los tres archivos
de base que la fase modifica y que aparecen rojos (`agentWorkspaceNav.ts` ∈ 13-03..13-07, `WorkspaceNav.tsx` ∈ 13-03,
`agent-module-access.ts` ∈ 13-01) reciben ese literal de un plan anterior. **0 anclas de base fallan.**

**Barrido completo de los 40 bloques:** 168 anclas literales (`ancla`/`una`) sobre archivos de la base que NINGÚN plan modifica
⇒ **168/168 presentes** (215 anclas con ruta o literal dinámico, en archivos que crea la fase, quedan fuera y se cubren arriba).
**Consumo entre planes por `exporta`:** 232/232 nombres presentes en el plan dueño (`RUTA_DEL_SEGUIMIENTO` la agrega 13-04 y
`RUTA_DE_APROBACIONES` 13-05, ambos con `rutas-de-naira.ts` en su `files_modified`).
**Agente (SOLO LECTURA, `11177c51`):** 0 lecturas fallidas en los tramos; 21/21 citas `archivo:línea «literal»` de 13-08
(13-08:338-346: E13-3..E13-13, `ROADMAP.md:388/:395`, `REQUIREMENTS.md:249`) exactas; `src/naira/metrics/catalog.ts`,
`src/naira/volatility/registry.ts` (13-01 T4) y `ADR-005-vocabulario-de-probabilidad.md` (13-02 T3) existen.
**Cifras fijas de base:** `toHaveLength(25)` y el título de `arquitectura-del-panel.test.ts:208/:238`, `:755-780`, `:853-873`,
`secciones('reportes')` `:963`, filas `agente-de-pagos`/`desempeno-ia` (`arquitectura-del-panel.ts:362/:365`), `slug: 'matching'` y
`// ── Mantenimiento (tickets) — APAGADO` (`agentWorkspaceNav.ts:244/:256`), fila ⌘K de «Desempeño IA» (`navigation-source.ts`),
`"next": "15.5.26"`, firma de `PageGuard`, `id="main-content"` + `tabIndex={-1}` (`inmobiliaria/layout.tsx`), `onboarding-visto.service.ts`
(`claveDeLaPresentacionDelAgente`, `const BASE = '/inmobiliaria/onboarding-visto'`), `scripts/variables-libres-del-build.mjs`, las 11
rutas `/pagos/*` de D13-21 (incluida `pagos/cobranza/arco/[id]`, B9) y `/cobros` inexistente: **todo presente**. El guardián
`doce-pixeles` contado como él lo cuenta: **2716 = `CUANTOS_HABIA`** (verde en la base ⇒ un `text-xs` nuevo sería regresión).

## §3 · Paso 0 (D13-17) — uniforme en los 8

Medido con `grep -cF` sobre cada bloque de la T1 (el fragmento canónico del brief, adaptado a `W`/`FASE` o `FA`):

| Control | 13-01 | 13-02 | 13-03 | 13-04 | 13-05 | 13-06 | 13-07 | 13-08 |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|
| `BASE=$(cut -d' ' -f1 …/BASE-DE-EJECUCION)` no vacía + `cat-file -e "${BASE}^{commit}"` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `merge-base --is-ancestor "$MINIMA" "$BASE"` (`4ad6c188…` completo) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `merge-base --is-ancestor "$BASE" HEAD` + rama `project/naira-superficie` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `rev-list --merges "${BASE}..HEAD"` = 0 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| procedencia POR COMMIT (`log "${BASE}..HEAD"` + `case` de asuntos + `diff-tree` ⇒ archivos ⊆ `.planning/naira/` ∪ unión de `files_modified` 13-01..13-0N) + `status --porcelain` | ✅ (unión 13-01) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (unión 13-01..13-08) |
| BASE encadenada: `grep -c "^BASE=${BASE}$" 13-0(N−1)-SUMMARY.md` ≥ 1, si no F=1 | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `<output>` pide línea propia `BASE=<sha 40>` + deriva (`rev-list --count "${BASE}..cambios-nico-10"` + `merge-tree --write-tree --name-only cambios-nico-10 HEAD`) | ✅ 13-01:1390 | ✅ :1563 | ✅ :1868 | ✅ :1611 | ✅ :1890 | ✅ :1818 | ✅ :1975 | ✅ :532 |
| sin `rebase`/`merge`/`pull` en bloques | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**13-08 T4 (gate de deriva):** 13-08:1022 — `merge-tree` contra `cambios-nico-10`, lista de conflictos hasta la primera línea en
blanco, cruce con `git diff --name-only "$BF" HEAD`: conflicto en un archivo de la fase ⇒ `CHOCA=1` ⇒ F=1, y `RC_MT > 1` ⇒ F=1; se
reporta, no se arregla. `cambios-nico-10` es una rama LOCAL que Nico usa en `~/rent/mvp-erp` (misma base de objetos), así que la
deriva medida es la real; hoy `4ad6c188..cambios-nico-10` = 0 y `merge-tree` RC=0 (git 2.54). **13-08 T1**: `BF` = padre del
primer commit `(13-01):` y sus 8 caracteres deben estar en `13-01-SUMMARY` — lo garantiza el punto (1) del `<output>` de 13-01
(«salida ENTERA del Paso 0 (HEAD, …)», 13-01:214 `rev-parse HEAD`). Ningún bloque usa ya `AJENO`/`MOV` contra un SHA fijo: los
`git diff --name-only` que quedan son contra `$HB` (HEAD al iniciar el plan, 7), `$H0` (inicio de 13-08, 4) y `$BF` (1).

## §4 · Consistencia entre planes tras la re-medición

- **Contrato de 13-01** (`<contrato_publicado>` 13-01:476-591): `RAZON_NAIRA_NO_HABILITADA = 'naira_no_habilitada'` (:517),
  enmendados `valorRenderizado`/`nombreDeMetrica`, `citasConClase`, `oraciones`/`refs`, `NairaActionSummary.asOfs` (:519-520;
  nombre real del agente en `12-07-PLAN.md:433` — `AccionListada` es el interno de :413), `EstadoNaira<T>` (:523), 404 por razón
  (:564-570: con `naira_no_habilitada` ⇒ `apagada` en CUALQUIER endpoint; sin ella ⇒ `si404`). Consumo: `EstadoNaira` en 13-02..13-07
  (10/12/10/11/9/16 menciones); `apagada` lo pinta 13-02; 13-07 declara la memoria ejecutada sin `reason` (heurística `si404`).
- **Registro de navegación (13-03):** fila N2 en `agentes` con `ia` falsy, después de `agente-de-pagos` y antes de `desempeno-ia`
  (`[N13:fila-de-naira]` 13-03:1623); workspace después de `matching` (13-03:1624); test de la arquitectura con «Eran 25 hasta que
  entró Naira» (13-03:640-642, :1644-1648): título `:208` y `:238` a 26/28, `'naira'` en `:755-765`, `'/reportes/naira'` en
  `:767-780` y en las DOS listas de `:853-873`, `secciones('reportes')` intacto (anclado en su T1); fila ⌘K en `navigation-source.ts`
  (en `files_modified` de 13-03 + `[N13:busqueda-de-naira]` 13-03:657). El comentario `// ← 13-04..13-07 AGREGAN su pestaña AQUÍ`
  lo escribe 13-03 (:1661) y lo verifica su T5; lo consumen 13-05/13-07 (T1, T4) y 13-06 (subcadena).
- **Pestañas y su acción:** 13-03 `briefing-view` (primera, `exact`), 13-04 `open-loops-view`, 13-05 `action-view`, 13-06
  `conversation-ask`, 13-07 `memory-view` — las cinco ∈ `ACCIONES_DE_NAIRA` (13-01:484-486); cada plan ancla en su T1 las de los
  anteriores (dry-run: exactamente esas faltan hoy, ninguna otra). Guardias de 13-02/13-03 que crecen solas: «NO se edita»
  (13-04:417, 13-05:894/:1598, 13-06:418, 13-07:972/:1746).
- **Título de 26 módulos** («el sidebar tiene 26 módulos en 5 grupos con nombre (+ Inicio y Chat = 28 filas)»): exigido en los
  bloques de 13-03 T5, 13-05 T4 y 13-07 T4 (B7); 13-08:846 lo lista entre los guardianes que chocarán. Ninguna cifra 17/25 de
  módulos queda en bloques posteriores a 13-03.
- **`files_modified` compartidos (todos declarados en la lista de CADA plan que los toca; olas lineales ⇒ sin carrera):**
  `es.json`/`en.json` (02-07), `agentWorkspaceNav.ts` (03-07), `rutas-de-naira.ts` (03, 04, 05, 07), `VistaDeNaira.tsx` (02, 06:
  compositor dentro, RB), `SenalClient.tsx` (03, 04), `claves-naira.test.ts` (01, 03), `b5-sin-persona.test.ts` y
  `claimclass-del-contrato.test.ts` (02, 03). Búsqueda de «MOD/edita» sobre archivos ajenos sin declarar: 0 (los hallazgos fueron
  todos «NO se edita»).
- **Next 15 / React 19 (D13-19):** fichas con `params: Promise<{…}>` + `await params` en 13-03 (T4), 13-04 (T5), 13-05 (T5);
  13-06/13-07 no tienen ficha dinámica; `import type { JSX } from 'react'` en 13-02..13-07. **Tipografía (D13-20):** 0 `text-xs`
  prescritos (las 13 menciones son prohibiciones o la guardia); guardia explícita en 13-02 T5 y 13-03 T5, y en 13-04..13-07 por la
  regresión de suite completa (línea base ×2 vs final) que incluye `doce-pixeles` (verde en la base: 2716) + `tsc` vs `tsc_base`.
- **D13-22 (13-08):** `route.fulfill` de `**/inmobiliaria/onboarding-visto**`, sin `localStorage`/`STORAGE_PREFIX`/
  `'leasefy.agent-intro.naira'` (13-08:478, bloque :696 lo cuenta en código = 0), y el bloque exige el orden `sembrar → sinIntro → red` en el helper.

## §5 · Cobertura

- **Requisitos:** UI-01 (13-02..13-08), UI-02 (13-01..13-03, 13-05, 13-07, 13-08), UI-03 (los 8) en `requirements` ⇒ 3/3.
- **Criterios del ROADMAP §Phase 13** (`ROADMAP.md:388-391` en `11177c51`) mapeados en la ACCEPTANCE de 13-08 (13-08:850-880):
  criterio 1 = 11 marcadores, 2 = 14, 3 = 16, 4 = 21 — **todos exigidos por un bloque** (`[N13:estado-entero]` vía `MARCAS=(…)` de
  13-01 T3; `[N13:e2e-montado]` en 13-08).
- **FG13-1..FG13-20:** las 20 filas de `13-VALIDATION.md:122-141` apuntan a marcadores que siguen exigidos por un bloque ⇒ 20/20
  cerrados (FG13-20 ya no es `--is-ancestor 5e3a6f85` sino el fragmento de D13-17, ver W1).
- **D13-23 consumido:** 13-01 `[N13:404-por-razon]` (:908), `[N13:enmiendas-opcionales]` (:701) · 13-02 `[N13:citas-con-clase]`
  (:1152), `[N13:valor-renderizado]` (:1023), `[N13:sin-permiso-admin]` (:717) · 13-03 `[N13:causa-con-clase]` (:1471),
  `[N13:valor-renderizado]` (:1181), `[N13:entidades-del-contrato]` (:1474; `entidadesDeLaSenal` = `detalle.item.entidades`) ·
  13-05 `[N13:listado-con-corte]`/`[N13:asof-de-la-consecuencia]` (:913) · 13-06 `[N13:oraciones-por-seccion]`/`[N13:chip-por-clase]`
  (:884), `[N13:cortes-de-la-respuesta]` (:882), `[N13:oraciones-en-tramos]`, `[N13:hipotesis-sin-banda]`. 13-04 no consume
  enmiendas (ninguna le corresponde por D13-23).
- **E13-5 fail-closed y declarado:** 13-03 P3 (:800-806) y :571-576 — `loQueTraeElDia` devuelve `{ kind: 'no_viaja' }` en los tres
  tipos espejados; componentes probados con fixtures; 13-08:854/:898 lo lista como la única enmienda no aplicada.

## §6 · `13-VALIDATION.md` frente al censo nuevo

Censo re-medido con el MISMO método que el de VALIDATION (reproduce exacto sus 299 sobre `8b58966d`):

| Medida | VALIDATION (viejo, `8b58966d`) | Planes hoy (`49de7038`) |
|--------|--------------------------------|--------------------------|
| tareas / bloques `automated` | 40 / 40 | 40 / 40 |
| marcadores `[N13:*]` distintos | 299 (282 literales + 17 vía `MARCAS=(…)`) | **313** (296 + 17) |
| ocurrencias de marcadores en el código de los bloques | 1294 (VALIDATION las cuenta como 737 exigencias, otro criterio) | **1346** |
| llamadas a `rojo` | 194 | **215** |
| marcadores quitados / agregados | — | **0 / 14**: `404-por-razon`, `busqueda-de-naira`, `causa-con-clase`, `chip-por-clase`, `cifra-con-su-corte`, `citas-con-clase`, `enmiendas-opcionales`, `entidades-del-contrato`, `hipotesis-sin-banda`, `listado-con-corte`, `oraciones-en-tramos`, `oraciones-por-seccion`, `sin-permiso-admin`, `valor-renderizado` |

Además VALIDATION sigue describiendo la base vieja: `5e3a6f85` en el Paso 0 de las filas T1 (`13-VALIDATION.md:57/62/67/72/77/82/87`),
en FG13-20 (`:141`) y en `:169`; el criterio 1 (`:105`) cita «17 módulos» (hoy 25 ⇒ 26) y no nombra D13-1′, D13-23 ni E13-5. **Es
una desactualización material del documento** (el mapa criterio→marcador no incluye los 14 nuevos ni el control de D13-17), pero
**no es bloqueante**: ningún marcador que VALIDATION nombra desapareció (los 7 que no están en bloques son los nombres del RESEARCH
de su tabla de reconciliación `:152-156`), los 20 FG siguen cerrados y los planes exigen todo lo de §5. Nyquist (8a-8d): 40/40
tareas con `<automated>`, sin Wave 0, sin `--watch` ⇒ PASA por estructura.

## §7 · Dimensiones

| Dimensión | Estado |
|-----------|--------|
| 1 Cobertura de requisitos | PASA (UI-01..03; criterios 1-4) |
| 2 Completitud de tareas | PASA (40/40 con files/action/verify/done; plan-structure 8/8 válidos) |
| 3 Dependencias | PASA (cadena 01→08) |
| 4 Enlaces | PASA (exports 232/232; pestañas y acciones; comentario de inserción) |
| 5 Alcance | INFO (5 tareas/plan; 13-02 = 33 y 13-03 = 37 archivos: W3 aceptado y declarado desde v1, sin cambio de forma) |
| 6 must_haves | PASA (8/8 con truths/artifacts/key_links) |
| 7 / 7b Contexto y reducción de alcance | PASA — D13-1′, D13-17, D13-19..D13-23 aplicados; E13-5 fail-closed declarado (no es reducción: la enmienda no existe en el agente) |
| 7c Tiers (mapa de `13-RESEARCH.md:83`) | PASA — sin cambio de tier; la intro pasa al back (D13-22) como manda RB-7 |
| 8 Nyquist | PASA con W1 |
| 9 Contratos entre planes | PASA |
| 10 CLAUDE.md del front | PASA (hooks `use-kebab-case.ts`, E2E con `route.fulfill`, mock nunca en producción `[N13:simulado-nunca-en-prod]`, `docs/DESIGN.md` citado por 13-07) |
| 11 Research | PASA (`13-RESEARCH.md:613` «RESOLVED»; `13-REBASE-RESEARCH.md` sin preguntas abiertas) |
| 12 Patrones | PASA (B1-B13 de `13-REBASE-PATTERNS.md` aplicados: B3, B4, B5, B6-B8, B9, B10a/b, B12, B13 verificados en §2/§4) |

## §8 · Hallazgos

### Bloqueantes
Ninguno.

### Advertencias
**W1 · [nyquist / validation] `13-VALIDATION.md` quedó con el censo y la base viejos.** 40/40 no cambia, pero 299→**313**
marcadores (14 nuevos, 0 quitados), `rojo` 194→**215**, Paso 0 con `5e3a6f85` (`:57/62/67/72/77/82/87/141/169`) y «17 módulos»
en el criterio 1 (`:105`). **Arreglo exacto (sin re-check, no toca planes):** en `13-VALIDATION.md` — cabecera `:20` ⇒ «40 tareas,
40 bloques, 313 marcadores distintos (296 literales + 17 vía `MARCAS`), 215 `rojo`»; filas T1 `:57-87` y `:169` ⇒ «Paso 0 D13-17
(`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada)»; FG13-20 `:141` ⇒ el
fragmento canónico + `[N13:alias-en-la-copia]`; criterio 1 `:105` ⇒ «25 ⇒ 26 módulos, D13-1′»; sumar los 14 al mapa: crit. 1
`busqueda-de-naira`, `entidades-del-contrato` · crit. 2 `cifra-con-su-corte`, `listado-con-corte`, `valor-renderizado` · crit. 3
`404-por-razon`, `sin-permiso-admin`, `enmiendas-opcionales` · crit. 4 `causa-con-clase`, `chip-por-clase`, `citas-con-clase`,
`oraciones-por-seccion`, `oraciones-en-tramos`, `hipotesis-sin-banda`.

**W2 · [context / criterio 1] El texto aplicado de E13-9 en el agente contradice D13-1′.** `ROADMAP.md:388` y
`REQUIREMENTS.md:249` (`project/account-manager` @ `11177c51`) dicen «(`/panel/inmobiliaria/reportes/naira`), **sin módulo N2**,
sin namespace…», y D13-1′ construye justamente un módulo N2 de «Agentes IA». 13-08:854-855 da E13-9 por «YA APLICADA» y pone D13-1′
como ubicación sin declarar el choque, así que el verificador leerá el criterio 1 literal en contra. **Arreglo exacto:** el
orquestador principal aplica la re-enmienda de E13-9 de `13-CONTEXT.md:521` (texto en `13-REBASE-RESEARCH.md:75-76`: «como módulo
de la sección «Agentes IA» del panel … URL `/panel/inmobiliaria/reportes/naira`») en esas dos líneas del agente ANTES de 13-08,
editando en línea (las anclas de 13-08 `ROADMAP.md:388 «viven **dentro del AI Hub existente**»` y `REQUIREMENTS.md:249 «dentro del
AI Hub existente»` sobreviven si no se corren líneas); si no se aplica, 13-08 debe escribir en la ACCEPTANCE §1 «Criterio 1» que el
literal del agente sigue en la forma D13-1 y que D13-1′ 🔔 la reemplaza.

### Informativas
**I1 · 13-07:1187** ancla en `contrato.ts` las rutas CON comillas simples (`"'/memory/items/{itemId}/promotion'"`,
`"'/memory/procedural/proposals/{proposalId}/resolution'"`) y 13-01 no fija el tipo de comillas de `ruta` (solo el ejemplo del test,
13-01:696). Si 13-01 escribe otras, 13-07 PARA en su Paso 0 (falla cerrada, no falso verde). Es el patrón de W4-v1 que 13-06 ya
resolvió (13-06:259). Arreglo opcional: quitar las comillas simples de esos dos literales.
**I2 · Entorno:** apareció `node_modules` en el worktree (2026-09-28 10:10; `.pnpm` presente; `next 15.5.26`, `react 19.3.0`,
`vitest 4.0.18` = `package.json`), por eso el punto 1 del Paso 0 de 13-01 da RC=0 en seco. **Ningún test se corrió en esta ronda.**
**I3 · Alcance:** 5 tareas por plan y 13-02/13-03 con 33/37 archivos — W3 aceptado y declarado desde v1; la re-medición no cambió
la forma (solo sumó `navigation-source.ts` a 13-03).
**I4 · D13-19/D13-20 en 13-04..13-07** se custodian por la regresión de suite completa (`doce-pixeles`, verde en la base con 2716) y
por `tsc` contra `tsc_base`, no por un `grep` explícito como en 13-02 T5/13-03 T5. Válido mientras la línea base tenga ese guardián
en verde (lo registra el Paso 0 punto 7).

### Issues estructurados
```yaml
issues:
  - plan: null
    dimension: nyquist_compliance
    severity: warning
    description: "13-VALIDATION.md con censo y base viejos: 299->313 marcadores (14 nuevos, 0 quitados), rojo 194->215, 5e3a6f85 en :57-87/:141/:169, '17 módulos' en :105"
    fix_hint: "Actualizar cabecera :20, filas T1 :57-87 y :169 al Paso 0 de D13-17, FG13-20 :141, criterio 1 :105 (26 módulos, D13-1′) y mapear los 14 marcadores nuevos por criterio (lista en §8 W1)"
  - plan: "13-08"
    dimension: context_compliance
    severity: warning
    description: "ROADMAP.md:388 y REQUIREMENTS.md:249 del agente (@11177c51) dicen 'sin módulo N2' (E13-9 en forma D13-1); 13-08:854-855 la da por aplicada y ubica a Naira por D13-1′ (módulo N2) sin declarar el choque"
    fix_hint: "Orquestador: aplicar la re-enmienda E13-9 de 13-CONTEXT.md:521 en esas dos líneas (en línea, sin correr líneas) antes de 13-08; si no, 13-08 lo declara en ACCEPTANCE §1 Criterio 1"
  - plan: "13-07"
    task: 1
    dimension: key_links_planned
    severity: info
    description: "13-07:1187 exige comillas simples en dos rutas de contrato.ts que 13-01 no fija; falla cerrada (PARA), no falso verde"
    fix_hint: "Quitar las comillas simples de '/memory/items/{itemId}/promotion' y '/memory/procedural/proposals/{proposalId}/resolution' (como W4 en 13-06:259)"
  - plan: null
    dimension: environment
    severity: info
    description: "node_modules presente desde 2026-09-28 10:10 con versiones del package.json; esta ronda no corrió tests"
    fix_hint: "El coordinador confirma que es la instalación del lockfile de la base antes de 13-01"
  - plan: null
    dimension: scope_sanity
    severity: info
    description: "5 tareas/plan; 13-02 = 33 y 13-03 = 37 archivos (W3 aceptado y declarado desde v1)"
    fix_hint: "Ninguno (aceptado)"
  - plan: ["13-04", "13-05", "13-06", "13-07"]
    dimension: verification_derivation
    severity: info
    description: "D13-19/D13-20 custodiados por la regresión de suite completa (doce-pixeles 2716, verde en la base) y por tsc vs tsc_base, sin grep explícito"
    fix_hint: "Ninguno obligatorio"
```

## §9 · Recomendación

**EJECUTAR CON ADVERTENCIAS.** 0 bloqueantes: se puede ejecutar 13-01 ya. W1 y W2 son de documentos y se aplican sin re-check
(W2 conviene resolverla antes de 13-08; W1 en cualquier momento). Recordatorio de D13-17: si alguien mueve `BASE-DE-EJECUCION`
entre planes, el Paso 0 del plan siguiente PARA por la `BASE=` encadenada, y re-basar es del coordinador.
