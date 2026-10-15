# Fase 13 (cross-repo) · PLAN-CHECK v2 (pre-ejecución · Revision Gate, iteración 2 de 3)

**Revisado:** 2026-09-27 · **Worktree:** `/Users/nicolasgarcia/rent/wt-front-naira` (`project/naira-superficie`, HEAD `a5814f4c`,
árbol limpio; `5e3a6f85` ancestro RC=0) · **Contra:** `13-PLAN-CHECK.md` (iteración 1: NO EJECUTAR por B1; W1..W5, I1..I4), los
arreglos `37842fc3` (W1..W5 + I2) y `a5814f4c` (`13-VALIDATION.md`), `13-CONTEXT.md` (manda; las 🔔 no se re-discuten),
`13-RESEARCH.md`, `ROADMAP.md`/`REQUIREMENTS.md` de `agent-account-manager` (SOLO LECTURA, `git show project/account-manager:…`).

**Método (solo lectura; nada escrito fuera de este archivo y de un `mktemp -d` propio del scratchpad, borrado por su ruta exacta):**
- `git diff 40da78e9 HEAD` sobre los 8 planes: SOLO los hunks de los arreglos (10 líneas nuevas en `<execution_context>` + 1 línea
  en el punto 1 del Paso 0 por plan; +1 en 13-04 por I2; +2 en 13-06 por W4). Ningún otro bloque `automated` cambió salvo
  `13-06-PLAN.md:1007` (W4).
- Extractor propio (python) anclado en `^\s*<automated>` hasta `</automated>` ⇒ **40 bloques** (uno por tarea), 2 422 líneas.
- **Sin `node_modules` en el worktree ⇒ NINGÚN test del front (vitest/tsc/playwright/next) se corrió.** Lo que los exige está
  verificado por ESTRUCTURA; no se da por verde. Lo único ejecutado: `bash -n`/`zsh -n`, la evaluación de cadenas `"$VAR:…"` y un
  arnés de SOLO LECTURA con las secciones "Nombres del agente" / "Anclas del front" de los T1 (git show + grep, `TMPDIR` propio).

***

## §0 · Veredicto

**EJECUTAR CON ADVERTENCIAS** — **0 bloqueantes**, **2 advertencias nuevas** (W6, W7: ambas SOLO de texto en `13-VALIDATION.md`) y
**5 informativas nuevas** (I5..I9). B1 y W1, W2, W4, W5 quedaron **resueltos**; W3 **aceptado y declarado** en los 8 planes; I2
resuelto. Los arreglos no introdujeron contradicciones que impidan poner verde un bloque.

**W6 y W7 se pueden aplicar SIN re-check** (no tocan ningún plan ni ningún bloque `automated`; son 6 líneas de `13-VALIDATION.md`
con el reemplazo exacto dado abajo). No hace falta la iteración 3.

Condición externa (sin cambios, la fija el CONTEXT §5): ejecutar exige una autorización NUEVA de Nico; sin 9.5/10/11/12 del
agente ejecutadas y desplegadas, la fase cierra "construida con ejemplos, no verificada contra el agente" (13-08).

***

## §1 · Estado de los hallazgos de la iteración 1 (con `plan:línea`)

| ID | Estado | Evidencia (medida) |
| :-- | :-- | :-- |
| **B1** | **RESUELTO** | `13-VALIDATION.md` existe (frontmatter `nyquist_compliant: true`, `wave_0_complete: false`), 40 filas por tarea, muestreo 5/5 por ola, Wave 0 = ninguna, mapa criterio/REQ/FG y reconciliación RESEARCH → as-planned. Citas del RESEARCH verificadas: `:304`, `:587`, `:689-691`, `:702`, `:715-716` dicen lo que la reconciliación afirma; los 7 marcadores del RESEARCH (`bloque-completo`, `senal-entidades`, `deep-link`, `cliente-estados`, `fuente-a-ruta-existe`, `sin-href-interpolado`, `descubrimiento-titular`) no aparecen en ningún plan. Precisión del censo: ver W6/W7. |
| **W1** | **RESUELTO** | Punto 1 del Paso 0: `13-01:212`, `13-02:267`, `13-03:288`, `13-04:247`, `13-05:282`, `13-06:243`, `13-07:280`, `13-08:193` («base distinta … ⇒ PARA y se re-planifica»); bloque Δ en `<execution_context>`: `13-01:146-154`, `13-02:193-201`, `13-03:202-210`, `13-04:155-163`, `13-05:175-183`, `13-06:141-149`, `13-07:166-174`, `13-08:112-120` (todos DENTRO de `<execution_context>`). La prosa ya no permite seguir con otra base; coincide con el control (`merge-base --is-ancestor 5e3a6f85` en los 8 T1; `AJENO`/`MOV` en 13-03..13-07). Matiz sin impacto: I5. |
| **W2** | **RESUELTO** | `run_in_background` en `<execution_context>` de los 8 (`13-01:150`, `13-02:197`, `13-03:206`, `13-04:159`, `13-05:179`, `13-06:145`, `13-07:170`, `13-08:116`); T5 en 13-01..13-07 y T4 en 13-08 (la T5 de 13-08 nombrada como checkpoint). Re-correr ENTERO es seguro: las T5 no escriben fuera de `$D`/`$C`, y 13-08 T4 escribe §6 de la ACCEPTANCE entre `<!-- CIERRE:INICIO -->`/`FIN` (reemplazo idempotente). Extensión opcional: I9. |
| **W3** | **ACEPTADO Y DECLARADO** | Tercera viñeta del Δ en los 8 (lectura por sección, tarea por tarea, MODO RECUPERACIÓN). No se re-emite. |
| **W4** | **RESUELTO** | `13-06-PLAN.md:1007` `ancla … "/conversation/questions"; ancla … "conversation-ask"` (presencia, `grep -cF`), prosa `:249`. El productor lo garantiza: `13-01-PLAN.md:633` fija `ruta` relativa a `NAIRA_BASE` (⇒ el literal `/conversation/questions` está en la tabla) y `:445` lista `'conversation-ask'` en `ACCIONES_DE_NAIRA`. |
| **W5** | **RESUELTO** | `13-RESEARCH.md:613` `## Preguntas abiertas (RESOLVED — …)`; 13/13 preguntas con «RESOLVED → D13-x / §7». |
| I1 | sin cambio (no aplicada) | informativa; 13-03 ya prohíbe `lucide-react`. |
| **I2** | **RESUELTO** | `13-04-PLAN.md:69`, `:524`, `:1020`, `:1041` y el ancla del bloque T2 dicen `useNairaSeguimiento(habilitada = true)`; los consumidores usan `useNairaSeguimiento()` o `(canAccess('naira','open-loops-view'))` (`:578`, `:730`, `:1492`). |
| I3, I4 | sin cambio | sin acción. |

**Contradicciones nuevas buscadas y NO encontradas:** (a) el Δ de `<execution_context>` vs el punto 1 del Paso 0: ambos PARAN con
base distinta; el resto de la frase vieja («re-medir … un ancla movida ⇒ PARA») queda como insumo, y el Δ lo dice («no permiso para
seguir»). (b) La etiqueta literal `<automated>` aparece **exactamente 5 veces por plan, las 5 ancladas** en `^\s*<automated>` y todas
después de la primera `<task` (`13-01`: tarea `:622`, primer bloque `:708`; … `13-08`: `:540`/`:606`); 0 formas escapadas. (c) Con
D13-17: la versión estricta es un subconjunto de su texto («re-mide … PARA ante un ancla movida; manda el disco»); ejecutar sobre la
rama de integración vigente pasa por re-planificar (ticket V1). Medido: `5e3a6f85` **no** es ancestro de `cambios-nico-10` (RC=1,
838 commits) ⇒ ese caso lo para el control de ancestría en cualquier plan.

***
## §2 · Bloqueantes

Ninguno.

***

## §3 · Advertencias nuevas (ambas en `13-VALIDATION.md`; aplicables SIN re-check)

### W6 · [nyquist · verification_derivation] El censo de VALIDATION sub-cuenta los marcadores que 13-01 T2/T3 exigen por arreglo
- **Evidencia (re-medido con extractor propio, anclado en `^\s*<automated>`, sin líneas `#`):**
  - 40 tareas / 40 bloques ✓; **194 llamadas a `rojo`** ✓ (y las 40 cifras por tarea de la columna «Llamadas a `rojo`» coinciden una
    por una).
  - **282 distintos / 716 exigencias** se reproduce SOLO con un regex literal `\[N13:[a-z0-9][a-z0-9-]*\]` (716 = suma de distintos
    por tarea). Pero `13-01-PLAN.md:885-886` (T2) y `:973-974` (T3) arman sus exigencias con `MARCAS=(…)` +
    `PARES+=("$CT::[N13:$X]")` / `("$HT::[N13:$X]")`: el literal no las ve. Contándolas, el censo real es **299 distintos / 737
    exigencias** (los 17 que faltan: `404-por-endpoint`, `conflicto-y-rechazo`, `estado-entero`, `kinds-cerrados`,
    `leer-null-sin-red`, `mock-solo-desde-cliente`, `no-disponible`, `nunca-tira`, `ok-origen-agente`, `origen-ejemplo`,
    `pedido-invalido-sin-red`, `razon-sin-eco`, `recargar-reemplaza`, `red-no-simula`, `ruta-exacta`, `sin-agencia-cargando`,
    `un-solo-transporte`). 299 es la misma cifra que midió la iteración 1.
  - Filas afectadas: `13-VALIDATION.md:58` (13-01 · T2: dice **5**, son **20**) y `:59` (13-01 · T3: dice **3**, son **9**);
    encabezado `:20-21` y `:159` («la mayoría de los 282»).
- **Por qué importa:** VALIDATION es la referencia del verificador; con 5/3 en 13-01 T2/T3 subestima el contrato del cliente y del
  hook (FG13-2/FG13-4 siguen bien citados porque esos dos sí aparecen literales). No cambia ningún plan ni la cobertura.
- **Arreglo (texto exacto):** `:20-21` «**282 marcadores `[N13:*]` distintos, 716 exigencias**» ⇒ «**299 marcadores `[N13:*]`
  distintos, 737 exigencias** (282/716 literales + 17 que 13-01 T2/T3 exigen vía `MARCAS=(…)`/`PARES+=("…::[N13:$X]")`)»;
  `:58` columna marcadores `5` ⇒ `20`; `:59` `3` ⇒ `9`; `:159` «282» ⇒ «299».

### W7 · [nyquist · task_completeness] La fila de 13-08 T5 dice «sin bloque verificable … 0 marcadores» y su propio sign-off dice lo contrario
- **Evidencia:** `13-VALIDATION.md:96` «checkpoint humano (sin bloque verificable: …)» con `0` marcadores; `:217` «la T5 de 13-08 es
  el checkpoint humano con su bloque de evidencia». El bloque existe: `13-08-PLAN.md:1019-1043` valida la línea de reanudación de
  Nico en §7 (`HUMANO_JS`, formato exacto), que §1-§2 sigan `NO VERIFICADO`, `- resultado: VERDE` ×1 en §6, que cada reporte E2E
  corrió EXACTAMENTE lo que lista Playwright y después del último commit de los E2E (`EVID_JS`), `^\[N13:e2e-montado\]` y
  `^\[N13:e2e-ejemplo\]` ≥ 8 cada uno (escapados en el `grep`, por eso el regex literal dio 0), y nada fuera de los
  `files_modified` de 13-08.
- **Por qué importa:** un verificador que lea «sin bloque verificable» puede dar por cumplida la T5 sin correr su bloque.
- **Arreglo (texto exacto):** `:96` ⇒ `| 13-08 · 8 · T5 | checkpoint:human-verify | valida la línea de reanudación de Nico (§7), §1-§2
  NO VERIFICADO, §6 VERDE ×1, evidencia E2E = lo listado por Playwright y posterior al último commit de los E2E, alcance de 13-08
  (la corrida E2E con `:3001`, lo visual y el smoke real los hace el humano) | 2 (`e2e-montado`, `e2e-ejemplo`, por grep) | 0 |
  manual + bloque de evidencia (baja) |`.

***

## §4 · Informativas nuevas

- **I5 · [context_compliance · D13-17]** El Δ dice «si hay cambios ajenos desde [`5e3a6f85`], ninguna Tarea 1 puede ponerse verde»;
  eso es cierto en 13-03..13-07 (`MOV`/`AJENO`) pero **no en 13-01 ni 13-02**, cuyo T1 solo exige ancestría (13-08 lo cubre en T4
  con `FASE_JS` sobre `git diff BF HEAD`). Ahí el freno es el ⛔ de la prosa, y `13-01-PLAN.md:209` todavía llama «Informativo» a
  ese `git diff`. Sin impacto práctico: el caso real (`cambios-nico-10`) lo para la ancestría (medido). Opcional: en `:209`
  «Informativo:» ⇒ «⛔ (lo exige la prosa, no el bloque):».
- **I6 · [zsh 5.9]** Variables seguidas de `:` sin llaves: **775** en los bloques (730 `"$X::…"`, 34 `"$X: …"`, 11 `"$RA:$1"` /
  `"$RA:$PL/…"` / `"$RA:$P"`); **0** seguidas de letra o `&` (formas modificador). Las **448 cadenas distintas** que las contienen se
  evaluaron en zsh 5.9 y bash 3.2 con valores sintéticos: salida **idéntica**, 0 errores. No son un riesgo; NO tocarlas antes de
  ejecutar (775 ediciones en bloques pedirían otro re-check). Lo inexacto es `13-VALIDATION.md:37` («0 variables pegadas a `:` sin
  llaves») ⇒ «0 variables seguidas de una letra tras `:` (modificador zsh); las formas `$X::`, `$X: `, `$X:$` dan lo mismo en zsh y
  bash (medido)».
- **I7 · [anclas del agente · deriva posterior a la planificación]** `46e00d10` (agente, 2026-09-27 23:25:54, después de los planes)
  movió `ROADMAP.md` +3 y `REQUIREMENTS.md` +2: §Phase 13 hoy `:383-395`, criterios `:388-391`, «viven **dentro del AI Hub
  existente**» `:388`, «esta fase se ejecuta en `~/rent/mvp`» `:395`, UI-01..03 `REQUIREMENTS.md:249-251`. Quedaron viejos en
  `13-08-PLAN.md:183` (`:380-392`, `:247-249`), `:327-328` (E13-9 `ROADMAP.md:385`/`REQUIREMENTS.md:247`, E13-10 `ROADMAP.md:392`),
  `:331` y `:405` (`:385-388`/`:247-249`), y en `13-VALIDATION.md:16` y `:101`. Se cura solo: el bloque de 13-08 T3 re-lee cada ancla
  `ruta:línea «fragmento»` con `git show` (P14, «ancla que no es verdad hoy») y el ejecutor escribe las medidas. Ningún otro archivo
  del agente citado por los planes cambió desde la planificación, y el arnés de solo lectura dio **0 anclas del agente ausentes** en
  los 9 bloques con `git show` (13-01 T1/T4, 13-02 T1/T3, 13-03..13-07 T1), igual con `/usr/bin/grep` y con la función ugrep del
  ejecutor; lo "ausente" es solo lo que el propio plan crea (`fuente-a-ruta.ts`, `afirmaciones.ts`, `vocabulario-de-*.ts`), los
  iconos Phosphor (sin `node_modules`) y los archivos PLANIFICADOS del agente (RC 128, como declaran).
- **I8 · [VALIDATION]** `13-VALIDATION.md:124` (FG13-3) dice `[N13:parseo-tolerante]` → «13-03..13-07»; solo está en 13-01 T1/T2 (el
  que se extiende es `[N13:fixture-es-contrato]`). Opcional: «`fixture-es-contrato` 13-01 T1 → 13-03..13-07; `parseo-tolerante` 13-01
  T1/T2».
- **I9 · [nyquist 8b · latencia fuera de los cierres, NO medida]** Los T1-T4 corren `tsc --noEmit` del repo entero (2 613 archivos
  en `src`+`tests`) + 3 a 12 invocaciones de vitest (13-05 T3: 10 `rojo` + 2) + `cp -R src tests` (33 MB). El timeout por defecto de
  la herramienta Bash es 2 min y el Δ W2 solo cubre el cierre. Opcional (una frase en el Δ de los 8): «cualquier bloque `automated` se
  lanza con `timeout: 600000` o `run_in_background`; un corte por tiempo no es un rojo». Aplicarla es prosa de `<execution_context>`;
  no cambia ningún bloque.

***
## §5 · Dimensiones re-corridas sobre los 8 planes finales

### 5.1 · Estructura (medida)
- `grep -c '^---$'` = **2** en los 8. `node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure <ruta absoluta>` ×8 ⇒
  `valid: True`, `errors: []`, `warnings: []`, `task_count: 5`, las 5 tareas con files/action/verify/done.
- Tareas = bloques `automated`: 5 = 5 en cada plan (`<task ` ×5, `<automated>` ×5 anclados, `</automated>` ×5).
- Frontmatter: olas 1..8, `depends_on` lineal `[]`→`["01"]`→…→`["07"]`, 13-01..13-07 `autonomous: true`, 13-08 `false`;
  `must_haves` con truths/artifacts/key_links en los 8; `files_modified` 18/33/35/25/29/19/22/7.

### 5.2 · Cobertura (UI-01..03 y criterios 1-4)
- `requirements`: UI-01 en 13-02..13-08; UI-02 en 13-01, 13-02, 13-03, 13-05, 13-07, 13-08; UI-03 en los 8 (= VALIDATION §REQ).
- Criterios 1-4: cada marcador que VALIDATION cita existe y está exigido donde dice (muestreo abajo). Los 22 marcadores de
  `13-CONTEXT.md` §4 están TODOS en algún bloque `automated`; FG13-1..20 (20 bloques en §4) cubiertos; `[N13:control-positivo]` en
  los 35 bloques de 13-01..13-07.
- **Muestreo de citas de VALIDATION (plan · tarea · marcador), 20 verificadas contra la extracción:** FG13-1 `403-sin-residuo` 13-01 T3
  ✓ · FG13-2 `403-sin-reason` 13-01 T2 ✓ · FG13-3 `fixture-es-contrato` 13-01 T1 → 13-03..13-06 ✓ (`parseo-tolerante`: I8) · FG13-4
  `contrato-roto-sin-datos` 13-01 T2 ✓ · FG13-5 `asof-bogota` 13-01 T4 / `asof-pegado` 13-02 T2 ✓ · FG13-6 `ruta-con-pagina` y
  `sin-href-del-agente` 13-01 T4 ✓ · FG13-7 `sin-seccion-paralela` 13-03 T5 → 13-04..13-07 (+13-08 T4) ✓ · FG13-8 `naira-fail-closed`
  13-01 T5 ✓ · FG13-10 `simulado-nunca-en-prod` 13-01 T2 / `simulado-visible` 13-02 T2 ✓ · FG13-11 `claimclass-del-contrato` 13-02 T3 ✓
  · FG13-12 `categoria-por-campo` 13-01 T4 ✓ · FG13-13 `b5-sin-persona`/`sin-latencia` 13-02 T5 ✓ · FG13-14 `detalle-solo-al-abrir`
  13-05 T2-T5 ✓ · FG13-15 `huella-vista` 13-05 T3, T5 ✓ · FG13-16 `conversacion-sin-persistencia` 13-06 T2, T4-T5, 13-08 T4 ✓ · FG13-17
  `i18n-es-en` 13-01 T5 ✓ · FG13-18 `e2e-montado` 13-08 T1-T3 (+T5) ✓ · FG13-20 `alias-en-la-copia` 13-01 T1 ✓ · crit. 1
  `entidades-siempre`/`entidades-lista` 13-03 T4 ✓, `estados-cerrados` 13-02 T1 ✓, `endpoint-de-la-conversacion` 13-06 T1 ✓.
- Infraestructura citada por VALIDATION verificada en el front: vitest `^4.0.18` y happy-dom `^20.6.0` (`package.json:115`, `:108`),
  `environment: 'happy-dom'` `vitest.config.ts:9`, `include` `:24`, `next.config.mjs:36-37` (`ignoreBuildErrors`/`ignoreDuringBuilds`),
  simulado nunca en producción `src/lib/api/config.ts:43-51`.

### 5.3 · Cumplimiento del CONTEXT
- Diff de los planes = solo los arreglos (§Método); ninguna decisión D13-1..18 cambió de control; ninguna 🔔 re-discutida; ningún
  deferred implementado; sin reducción de alcance nueva (barrido de las líneas agregadas: las únicas coincidencias son «PLAN-CHECK v1», «ticket V1» y «nunca … se saltea un paso»).
- D13-17: la versión estricta de W1 es compatible (§1, (c)).

### 5.4 · Contratos entre planes (`<contrato_publicado>`)
- El único cambio de firma es I2 (mismo tipo público; consumidores sin cambio). El único cambio de ancla entre planes es W4
  (consumidor más laxo, productor que lo garantiza). El resto del cruce de la iteración 1 (366 exports, 53 anclas entre planes)
  no cambió: ningún `<contrato_publicado>` ni Paso 0 de consumidor fue editado fuera de esas dos líneas.

### 5.5 · Ejecutabilidad en zsh 5.9 (shell del ejecutor medido: `ZSH_VERSION=5.9`, opciones no default: `nobareglobqual
nohashdirs login promptsubst`; `grep`/`find` = funciones ugrep/bfs)
- `bash -n` (3.2.57) RC=0 ×40 y `zsh -n` RC=0 ×40.
- Tokenizador propio (comillas simples/dobles, `$(…)`, `${…}`, comentarios): **0** expansiones de parámetro o de `$(…)` sin comillas
  fuera de asignaciones y de `[[ ]]`; globs sin comillas solo en patrones de `case` (13); **0** palabras `==`; los 14 `=` sueltos son
  de `[ "$a" = "$b" ]` (probado en zsh: OK); **0** asignaciones a especiales de zsh (`path`, `status`, `argv`, `options`,
  `commands`, `match`, `signals`…); **0** `${X[0]}`/índices, `${X,,}`/`${X^^}`, `BASH_REMATCH`, `PIPESTATUS`, `mapfile`, `read -a`,
  `declare -A`, `${!x}`, `=~`, `local`, `echo -e`/`echo` con `\`; **0** `--watch`, `timeout`, `grep -P`; 0 `git add -A/stash/push/
  checkout/switch/commit`. Listas: arreglos `"${X[@]}"` (p. ej. `PARES`, `LIMPIAR`, `PREF`); `${1//\//_}` probado (arnés OK).
- `$VAR:` sin llaves: I6 (775, ninguna modificador, 448 cadenas idénticas zsh/bash).
- Exit codes: **688** capturas de `$?`, **0** tras tubería y **0** tras `&&`/`&` (los `2>&1` excluidos); `F` solo toma `F=1` (706
  veces) ⇒ `exit "$F"` ∈ {0,1}.
- Conteo por archivo con JSON: `MARC_JS` marca `testResults[].status !== "passed"` (un archivo que no carga cuenta) y exige cada
  marcador en un `assertionResults` `passed`; `ROJO_JS` cuenta `failed` con el marcador.
- Mutaciones en copia: 35 `mutar` → `"$C/$1"`, `restaurar` = `cp "$W/$1" "$C/$1"`; 0 `sed -i`; 0 redirecciones a `$W`, `src/`,
  `tests/`; los `writeFileSync` escriben en `$D`/`$C`, salvo 13-08 T4 → ACCEPTANCE §6 entre marcas (idempotente, es su salida).
- `rm`: 40 × `rm -rf "$X"` en el `trap` sobre `LIMPIAR` (rutas de `mktemp -d "${TMPDIR:-/tmp}/p13…XXXXXX"`, 77 usos) y 13 `rm -f`
  de una ruta exacta dentro de `$C`; **0** comodines.

### 5.6 · Tabla de dimensiones

| Dimensión | Estado | Nota |
| :-- | :-- | :-- |
| 1 Cobertura | PASA | UI-01..03 en frontmatter y con tareas; criterios 1-4 con marcador exigido |
| 2 Completitud de tareas | PASA | 40/40 con files/action/verify/done |
| 3 Dependencias | PASA | lineal 01→08, olas 1..8 |
| 4 Key links | PASA | W4 resuelto |
| 5 Alcance | ADVIERTE (aceptado) | W3 declarado en los 8; no se re-emite |
| 6 must_haves | PASA | sin cambios |
| 7 CONTEXT | PASA | W1 resuelto; I5 |
| 7b Reducción de alcance | PASA | ninguna nueva |
| 7c Mapa de responsabilidad | PASA | sin cambios |
| 8 Nyquist | PASA con W6/W7 | 8e VALIDATION presente; 8a 40/40; 8b W2 resuelto (I9 opcional); 8c 5/5 por ola; 8d sin `MISSING` |
| 9 Contratos entre planes | PASA | I2/W4 resueltos |
| 10 CLAUDE.md | PASA | sin cambios (I1/I3 siguen informativas); sin filas del tren |
| 11 Research resuelto | PASA | W5 resuelto |
| 12 Patrones | PASA | sin cambios |

***
## §6 · Dimensión 8 (Nyquist) — detalle

| Plan (ola) | T1 | T2 | T3 | T4 | T5 | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 13-01 (1) | ✅ `:708-784` | ✅ `:861-898` | ✅ `:953-984` | ✅ `:1061-1102` | ✅ `:1164-1217` cierre, fondo | T2/T3 exigen por `MARCAS` (W6) |
| 13-02 (2) | ✅ `:843-929` | ✅ `:1011-1058` | ✅ `:1133-1177` | ✅ `:1255-1296` | ✅ `:1351-1412` cierre, fondo | |
| 13-03 (3) | ✅ `:931-1062` | ✅ `:1162-1203` | ✅ `:1300-1347` | ✅ `:1445-1501` | ✅ `:1585-1656` cierre, fondo | |
| 13-04 (4) | ✅ `:883-1007` | ✅ `:1065-1103` | ✅ `:1198-1239` | ✅ `:1336-1388` | ✅ `:1465-1531` cierre, fondo | |
| 13-05 (5) | ✅ `:1037-1163` | ✅ `:1228-1270` | ✅ `:1406-1457` | ✅ `:1563-1612` | ✅ `:1713-1787` cierre, fondo | T3: 10 `rojo` (I9) |
| 13-06 (6) | ✅ `:972-1100` | ✅ `:1181-1225` | ✅ `:1333-1378` | ✅ `:1483-1539` | ✅ `:1591-1646` cierre, fondo | T1 `:1007` W4 |
| 13-07 (7) | ✅ `:1118-1271` | ✅ `:1373-1418` | ✅ `:1537-1581` | ✅ `:1706-1759` | ✅ `:1804-1862` cierre, fondo | |
| 13-08 (8) | ✅ `:606-654` | ✅ `:721-751` | ✅ `:842-858` | ✅ `:902-959` cierre, fondo | ✅ `:1019-1043` checkpoint + evidencia | T5: W7 |

Muestreo: 8 olas × 5/5 con `automated` ⇒ ✅ · Wave 0: ninguna (cada test lo crea su tarea; el entorno, el Paso 0) ⇒ ✅ · `MISSING`: 0 ⇒ ✅
· `--watch`/`timeout`: 0 ⇒ ✅ · VALIDATION: presente (B1 cerrado; W6/W7 de precisión) ⇒ ✅ · **Resultado: PASA** — por estructura: ninguno
de los 40 se corrió (sin `node_modules`, D13-16); el Paso 0 de cada plan instala antes de la Tarea 1.

***

## §7 · Issues estructurados

```yaml
issues:
  - id: W6
    plan: null
    dimension: nyquist_compliance
    severity: warning
    file: "13-VALIDATION.md"
    description: "El censo 282 distintos / 716 exigencias solo cuenta marcadores literales; 13-01 T2 (13-01-PLAN.md:885-886) y T3 (:973-974) exigen 17 más vía MARCAS=(…) + PARES+=(\"…::[N13:$X]\"). Real: 299 / 737. Filas 13-VALIDATION.md:58 (dice 5, son 20) y :59 (dice 3, son 9); encabezado :20-21 y :159"
    fix_hint: ":20-21 => '299 marcadores distintos, 737 exigencias (282/716 literales + 17 por MARCAS en 13-01 T2/T3)'; :58 5=>20; :59 3=>9; :159 282=>299. Sin re-check"
  - id: W7
    plan: null
    dimension: nyquist_compliance
    severity: warning
    file: "13-VALIDATION.md"
    description: "13-VALIDATION.md:96 dice que 13-08 T5 no tiene bloque verificable y exige 0 marcadores; el bloque existe (13-08-PLAN.md:1019-1043: línea de Nico, §6 VERDE x1, evidencia E2E = lista de Playwright, e2e-montado/e2e-ejemplo >= 8, alcance) y el propio sign-off (:217) dice 'con su bloque de evidencia'"
    fix_hint: "Reemplazar la fila :96 por la del §3 W7 (2 marcadores por grep, bloque de evidencia + manual). Sin re-check"
  - id: I5
    plan: "13-01, 13-02"
    dimension: context_compliance
    severity: info
    description: "El Δ afirma que con cambios ajenos ninguna T1 puede ponerse verde; en 13-01/13-02 el T1 solo exige ancestría (el freno es el ⛔ de la prosa; 13-01-PLAN.md:209 aún dice 'Informativo'). El caso real (cambios-nico-10) lo para la ancestría"
    fix_hint: "Opcional: 13-01-PLAN.md:209 'Informativo:' => '⛔ (lo exige la prosa, no el bloque):'"
  - id: I6
    plan: "13-01..13-08"
    dimension: task_completeness
    severity: info
    description: "775 '$VAR:' sin llaves ($X:: 730, '$X: ' 34, $X:$ 11), 0 formas modificador; 448 cadenas distintas idénticas en zsh 5.9 y bash 3.2, 0 errores. 13-VALIDATION.md:37 afirma '0 variables pegadas a : sin llaves'"
    fix_hint: "No tocar los bloques; corregir la frase de 13-VALIDATION.md:37"
  - id: I7
    plan: "13-08"
    dimension: key_links_planned
    severity: info
    description: "Tras 46e00d10 del agente (posterior a la planificación) ROADMAP +3 y REQUIREMENTS +2: E13-9 :385=>:388 y REQUIREMENTS :247=>:249, E13-10 :392=>:395, criterios :385-388=>:388-391, UI :247-249=>:249-251 (13-08-PLAN.md:183, :327-328, :331, :405; 13-VALIDATION.md:16, :101). Lo cura el bloque de 13-08 T3 (P14)"
    fix_hint: "Opcional: actualizar esos números; el ejecutor igual escribe las anclas medidas"
  - id: I8
    plan: null
    dimension: nyquist_compliance
    severity: info
    description: "13-VALIDATION.md:124 (FG13-3) extiende parseo-tolerante a 13-03..13-07; solo está en 13-01 T1/T2"
    fix_hint: "Opcional: separar fixture-es-contrato (13-01 T1 -> 13-03..13-07) y parseo-tolerante (13-01 T1/T2)"
  - id: I9
    plan: "13-01..13-07"
    dimension: nyquist_compliance
    severity: info
    description: "Latencia no medida de T1-T4: tsc del repo entero + 3-12 vitest + cp -R; el timeout por defecto del Bash es 2 min y el Δ W2 solo cubre el cierre"
    fix_hint: "Opcional, una frase en el Δ de los 8: cualquier bloque automated con timeout 600000 o run_in_background; un corte no es un rojo"
```

***

## §8 · Recomendación

**EJECUTAR CON ADVERTENCIAS.** Aplicar W6 y W7 en `13-VALIDATION.md` (texto exacto en §3) — **sin re-check**: no tocan planes ni
bloques. I5..I9 son opcionales; si se aplica I9 (o I5), es prosa del Δ/Paso 0 y tampoco pide re-check. La iteración 3 no hace
falta. Ejecutar sigue exigiendo la autorización NUEVA de Nico (CONTEXT §5). **No se corrió ningún test del front** (sin
`node_modules`): todo lo que exige vitest/tsc/playwright/next quedó verificado por estructura, no por resultado.
