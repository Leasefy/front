# Fase 13 (cross-repo) · PLAN-CHECK (pre-ejecución · Revision Gate, iteración 1 de 3)

**Revisado:** 2026-09-27 · **Worktree:** `/Users/nicolasgarcia/rent/wt-front-naira` (`project/naira-superficie`, HEAD
`40da78e9`, árbol limpio; `git diff --name-only 5e3a6f85 HEAD` = 14 archivos, TODOS bajo `.planning/naira/`) · **Planes:**
`13-01-PLAN.md` … `13-08-PLAN.md` (leídos por RUTA y por secciones) · **Contra:** `ROADMAP.md:380-395` §Phase 13 (criterios
1-4, UI-01..03), `REQUIREMENTS.md:247-249`, `13-CONTEXT.md` (D13-1..18, §3/§3.1, FG13-1..20, §5, E13-1..13, 🔔 §7),
`13-RESEARCH.md` (`## Arquitectura de validación` `:673`), `13-PATTERNS.md`, `13-UI-SPEC.md` (`status: approved`),
`briefs/brief-planner-13.md`, el `CLAUDE.md` y las skills del front, y el molde `12-PLAN-CHECK.md`.

**Método (todo medido, solo lectura; sin `node_modules` en el worktree ⇒ NINGÚN test del front se corrió: lo que exige
vitest/tsc/playwright se verificó por ESTRUCTURA y queda declarado así; lo ejecutable corrió en un `mktemp -d` propio del
scratchpad de la sesión, borrado por su ruta exacta; nada escrito en `src/`, `tests/`, el agente ni el `.planning/` raíz):**
- `grep -c '^---$'` = **2** en los 8 planes; `gsd-tools verify plan-structure <ruta absoluta>` ×8 ⇒ `valid: true`, 0 errores,
  0 avisos; `frontmatter get` ×8 no vacío (9 campos, `must_haves` con truths/artifacts/key_links). **40 tareas** (5 por plan),
  **40 bloques `automated`** anclados en `^\s*<automated>` (uno por tarea, incluido el checkpoint de 13-08 T5); la etiqueta
  literal NO aparece en prosa antes de la Tarea 1 en ninguno. Completitud: 39/39 tareas `auto` con files/read_first/behavior/
  action/verify/acceptance_criteria/done; el checkpoint (13-08 T5) con what-built/how-to-verify/resume-signal.
- Olas 1..8, `depends_on` lineal `[]`→`["01"]`→…→`["07"]`, 13-01..13-07 `autonomous: true`, 13-08 `false`.
- **Shell del ejecutor = zsh 5.9** (medido: `ZSH_VERSION=5.9`; en la herramienta Bash `grep` y `find` son FUNCIONES que llaman
  a ugrep y bfs). Sobre los 40 bloques: `bash -n` RC=0 ×40 y `zsh -n` RC=0 ×40; `set +e` 40/40; 0 `timeout`, 0 `--watch`,
  0 `mapfile`/`read -a`/`${!x}`/`BASH_REMATCH`/`declare -A`, 0 `.{0,N}`, 0 `grep -P`, 0 `$?` tras tubería o `&&` (el único
  candidato es un `--grep "a|b|c"` entre comillas); censo de expansiones SIN comillas (tokenizador python, probado con un
  caso positivo sintético): **0**; toda lista es arreglo (`"${X[@]}"`); globs sin comillas: solo patrones de `case` (válidos
  en zsh, que NO dispara NOMATCH ahí). Modificador `$VAR:`: 0 formas `$X:<letra>`; las 816 formas `$X:: `, `$X: ` y
  `$RA:$1` se reprodujeron en zsh 5.9 y bash 3.2 con el mismo resultado literal (no son modificadores). `rm`: solo
  `rm -rf "$X"` sobre el arreglo `LIMPIAR` (rutas devueltas por `mktemp -d`) y 2 `rm -f` de una ruta exacta dentro de la copia;
  0 comodines. Mutaciones: 168, todas vía `mutar` sobre `$C/…` (copia `mktemp -d` con `node_modules` ENLAZADO y sonda
  `[N13:alias-en-la-copia]`); conteo con `--reporter=json` POR ARCHIVO (`testResults[].status` + `assertionResults`).
- **Anclas ejecutadas de verdad** (arnés de solo lectura con las secciones "Anclas del front" y "Nombres del agente" de los
  Paso 0, en zsh, con `/usr/bin/grep` Y con la función ugrep del ejecutor — mismo resultado): agente (`git show
  project/account-manager:…`) **124 + 20 + 23 + 18 + 29 + 29 + 43 presentes, 0 ausentes**; las 4 rutas planificadas del agente
  (`naira-conversacion|briefing|open-loops|acciones.ts`) siguen sin existir (RC 128, como declaran). Front: **160 anclas
  literales sobre archivos existentes que la fase no toca, 0 ausentes**; lo único "ausente" son archivos que el propio plan
  crea (`node_modules` de Phosphor, `vocabulario-de-*.ts`, `fuente-a-ruta.ts`), esperado.
- **Contratos entre planes:** 366 nombres consumidos por `exporta` en los Paso 0 de 13-02..13-08, cruzados contra los
  `<contrato_publicado>` de sus productores: 0 referencias hacia adelante (los 10 "faltantes" del cruce literal son los
  `<N>Request/<N>Result` que 13-01 publica como `<N>Schema` + tipo y ancla en `13-01-PLAN.md:718+` con el arreglo `NOMBRES`).
  53 anclas literales de un plan sobre archivos de un plan ANTERIOR: 50 prescritas literalmente por su productor, 2 son de la
  propia modificación del consumidor, **1 no está prescrita** (W4). Las 168 anclas de mutación tienen fuente literal (prosa del
  plan, código actual o ancla del mismo plan). `VISTAS_DE_NAIRA` (8 vistas), `VistaDeNairaProps`, las firmas de los 9 hooks, el
  registro de pestañas (`13-03-PLAN.md:575-603`: una línea por plan, orden del §3.1, `[N13:pestanas-de-naira]` ya conoce los 5
  pares) y `rutas-de-naira.ts` (13-03 crea; 13-04/05/07 agregan; 13-06 no lo toca, P17) coinciden.
- **Marcadores:** 299 distintos en los `automated`. Los **22** de `13-CONTEXT.md` §4 están todos exigidos por algún
  `automated`; FG13-1..20 con mutación "por la causa" donde aplica (tabla §4). De los 29 de `13-RESEARCH.md`, **7** no existen en
  ningún plan (renombrados o fuera de alcance: B1).
- **Copy planificada** (392 filas de tablas i18n de 13-02..13-07) barrida contra las guardias que los propios planes crean:
  0 términos de `LEXICO`/§10.5 en `es` (la única, «Probability», está en `en`, que la guardia no mira), 0 voseo, 0 «latencia»,
  0 roles del agente, 0 textos idénticos es=en fuera de lo que 13-03 agrega a `IDENTICAS_PERMITIDAS`.
- Anti-alcance: el agente solo con `git show`/`cat-file` (47 usos); 0 `git add -A`/`stash`/`push`/`checkout`/`switch`; nada en
  `~/rent/mvp`, `.planning/releases/` ni el `.planning/` raíz del front; ningún archivo de configuración de la 10 (D13-12).

***

## §0 · Veredicto

**NO EJECUTAR** — **1 bloqueante** (B1, de proceso: lo cierra el orquestador), **5 advertencias** (W1..W5) y **4
informativas** (I1..I4). Los planes en sí no tienen bloqueantes: los 4 criterios del ROADMAP y UI-01..03 tienen tarea con un
bloque `automated` que los muerde; las 18 decisiones del CONTEXT tienen control; los 40 bloques pueden ponerse verdes en zsh
5.9 tal como están escritos (sintaxis, listas, exit codes, conteo por archivo, mutaciones en copia); los contratos entre los 8
planes coinciden. Lo que impide ejecutar:

- **B1** — falta `13-VALIDATION.md` (Nyquist 8e; `nyquist_validation: true` en
  `agent-account-manager/.planning/agents/account-manager/config.json:11`; RESEARCH con `## Arquitectura de validación`
  `:673`), y su tabla necesita reconciliación RESEARCH → as-planned (el RESEARCH validaba la ubicación en el Piloto). Igual que
  B2 de `12-PLAN-CHECK.md`: **lo escribe el orquestador DESPUÉS de W1..W5**, sobre los marcadores finales.

Con B1 cerrado (y W1..W5 aplicadas o aceptadas explícitamente) el veredicto pasa a **EJECUTAR CON ADVERTENCIAS** — con la
condición externa que ya fija el CONTEXT: ejecutar exige una autorización NUEVA de Nico; sin las fases 9.5/10/11/12 del agente
ejecutadas y desplegadas, la fase cierra como «construida con ejemplos, no verificada contra el agente» (13-08).

### §0.1 · Lo que SÍ está bien (medido)

- **Fail-closed de punta a punta (D13-3/D13-4):** `naira` en `FAIL_CLOSED_MODULES` con alias `'view'` (13-01 T5,
  `[N13:naira-fail-closed]` con mutación que lo saca de la lista) — verificado en el código que `PermissionsContext.tsx:197`
  pregunta `isAgentModule` antes que `:204` `isAdmin`, y que `gates-del-panel.test.ts:86` acepta un módulo del agente vía
  `isAgentModule`; `EstadoNaira` cerrado de 8 kinds sin `data` fuera de `ok`; el hook reemplaza el estado entero;
  `[N13:403-sin-residuo]` por superficie (13-01 T3 y 13-02..13-07, 15 mutaciones) y en E2E (13-08 T2).
- **Criterio 1 con los guardianes REALES del panel:** 13-03 T5 corre `arquitectura-del-panel.test.ts` (página por ruta y por
  pestaña `:80-89`, 17 módulos `:202`, R4 `:221`, iconos únicos `:151-167`, dos puertas `:251-265`), `gates-del-panel`,
  `fichas-con-vuelta`, `cuatro-estados` y 12 más, + `naira-sin-seccion-paralela` con mutación que crea `naira/page.tsx`.
  `Compass` no se usa en ninguna fila; «Naira» cumple R4.
- **Simulado sin mentir (D13-6):** guarda única `isMockMode()` antes de la red (anclada, con mutación a
  `NEXT_PUBLIC_USE_MOCK_API === 'true'` ⇒ `[N13:simulado-nunca-en-prod]` rojo); `config.ts:43-51` verificado; sin URL ⇒
  `no_disponible`; `origen: 'ejemplo'` ⇒ `AvisoDatosDeEjemplo` + `data-naira-ejemplo`.
- **B-5 (D13-11) por AST, no por texto:** las dos guardias recorren carpetas (crecen solas), ignoran comentarios, y los
  `automated` que buscan tokens prohibidos quitan las líneas de comentario antes de contar; los tokens planificados como copy no
  chocan con esas guardias (barrido de las 392 filas).
- **Nada inventado como reducción de alcance:** todo "con datos reales queda para 13-08" remite a §3/§5 del CONTEXT; las
  exclusiones (configuración de la 10, procedural nuevo, `/feedback/report`) son D13-12; las entidades «agregada», la causa sin
  `claimClass` y el drill-down de la conversación son E13-2/E13-3/E13-4 declaradas.
- **Enmiendas al agente solo como paquete:** 13-08 escribe E13-1..E13-13 con anclas medidas por `git show` en la ACCEPTANCE y el
  SUMMARY; ningún plan edita `agent-account-manager`.

***

## §1 · Bloqueantes

### B1 · [nyquist 8e · proceso] `13-VALIDATION.md` no existe
- **Evidencia (medida):** la carpeta de la fase tiene CONTEXT, RESEARCH, PATTERNS, UI-SPEC y los 8 planes; ningún
  `*VALIDATION*`. `config.json:11` de Naira `"nyquist_validation": true`; `13-RESEARCH.md:673` `## Arquitectura de validación`.
  La tabla del RESEARCH NO describe lo planificado:
  - ubica Naira en el Piloto (`13-RESEARCH.md:689` «componentes montados solo desde el Piloto», `:690` «el bloque pinta…»,
    `:691` `?senal=`), cuando D13-1 🔔 la puso en el workspace N3 de Reportes;
  - fixtures en `src/lib/api/naira/simulado/*` (`:304`, `:715`) ⇒ as-planned `src/lib/data/mock-naira.ts` (D13-6);
  - "extender `PermissionsContext.test.tsx`" (`:716`) ⇒ as-planned `src/lib/context/PermissionsContext.naira.test.tsx` (13-01 T5);
  - **7 marcadores del RESEARCH que ningún plan tiene:** `[N13:bloque-completo]`, `[N13:senal-entidades]`, `[N13:deep-link]`,
    `[N13:cliente-estados]`, `[N13:fuente-a-ruta-existe]`, `[N13:sin-href-interpolado]` (renombrados a `[N13:entidades-siempre]`/
    `[N13:entidades-lista]`, `[N13:deep-link-dia]`/`[N13:deep-links]`, `[N13:estados-cerrados]`, `[N13:ruta-con-pagina]`,
    `[N13:sin-href-del-agente]`) y `[N13:descubrimiento-titular]` (`:587`, `:702`), que es del reporte de descubrimiento que D13-12
    dejó FUERA;
  - la numeración FG del RESEARCH no es la del CONTEXT (RESEARCH FG13-11 = «Aceptación mostrada sola» `:587`; CONTEXT FG13-11 =
    `claimClass` inventado). Manda el CONTEXT.
- **Por qué bloquea:** Dimensión 8 (8e) es compuerta y la casa la trató como bloqueante (`12-PLAN-CHECK.md` B2,
  `11-PLAN-CHECK.md` B1). Sin la reconciliación, el verificador de fase leería contra el RESEARCH un Piloto que no existe.
- **Arreglo (lo escribe el orquestador DESPUÉS de W1..W5):** `13-VALIDATION.md` con frontmatter `nyquist_compliant: true`,
  `wave_0_complete: false`; tabla por tarea (40 filas: plan · ola · tarea · resumen del comando `automated` · marcadores ·
  latencia, marcando los cierres pesados de W2); muestreo por ola (8 olas, 5/5 cada una); Wave 0 = ninguna (cada test lo crea la
  tarea que lo exige; el entorno lo prepara el Paso 0 de cada plan, D13-16); la reconciliación de arriba (RESEARCH → as-planned,
  FG del CONTEXT como numeración única); y lo que queda SIN muestreo automático: los E2E con navegador (solo en el checkpoint de
  13-08 T5, `--list` en los automated), axe, el smoke real (solo si el agente publica Naira), `next build` en copia, y todo lo
  "con datos reales" (9.5-06/10-06/11-07/12-07, E13-1..E13-8).

***

## §2 · Advertencias

### W1 · [context_compliance · D13-17 🔔 · task_completeness] La prosa del Paso 0 dice «re-medir y seguir si las anclas no se movieron»; el bloque `automated` PARA siempre que la base no sea 5e3a6f85
- **Evidencia:** prosa — `13-01-PLAN.md:196-201` («Si NO está vacío o la base ya no es ancestro (p. ej. `Main` con
  `cambios-nico-10` …), re-medir RESEARCH T1/T3/T7 y las anclas del punto 2: **un ancla movida ⇒ PARA**»), y el mismo texto en
  `13-02-PLAN.md:254-257`, `13-04-PLAN.md:233-237`, `13-07-PLAN.md:266-270` (y los demás Paso 0). Control — `git merge-base
  --is-ancestor 5e3a6f85 HEAD … test "$RC_BA" -eq 0 || F=1` en `13-01-PLAN.md:718`, `13-02:855`, `13-03:947`, `13-04:898`,
  `13-05:1052`, `13-06:987`, `13-07:1133`, `13-08:605`; y «cambios desde 5e3a6f85 fuera de los planes de la fase = 0» (`AJENO`)
  en `13-04-PLAN.md:902-903`, `13-05:1056-1057`, `13-06:991-992`, `13-07:1137-1138`.
- **Por qué importa:** D13-17 🔔 recomienda ejecutar sobre «la rama de integración vigente, con re-medición» y el ticket V1 sigue
  abierto (`cambios-nico-10` con 836 commits). Si Nico/Victor mueven la base, la prosa manda re-medir y SEGUIR con anclas
  intactas, pero ningún T1 puede ponerse verde (F=1 por ancestría o por `AJENO`) y el ejecutor quedaría entre editar el control
  (prohibido) o parar sin que el plan lo diga. Con la base de hoy (el worktree sobre `5e3a6f85`) no molesta: por eso es W y no B.
- **Arreglo (sin aflojar el control; compatible con el «PARA» de D13-17):** en el punto 1 del Paso 0 de los 8 planes, cambiar
  «re-medir … y las anclas … un ancla movida ⇒ PARA» por «si `5e3a6f85` no es ancestro de HEAD o hay cambios ajenos desde ella,
  **PARA y se re-planifica** contra la base nueva (V1): los bloques `automated` fijan esta base a propósito; re-medir RESEARCH
  T1/T3/T7 es insumo de esa re-planificación, no permiso para seguir». Una línea igual en `<execution_context>`.

### W2 · [nyquist 8b · latencia] Los cierres corren la suite entera (y 13-08 T4, además, dos suites de la base, lint y `next build`) sin decir que van en segundo plano
- **Evidencia:** la T5 de 13-01..13-07 corre la suite completa (`vitest run` sin filtro sobre 661 archivos de test del front,
  medidos) + re-corridas + `tsc --noEmit` + 3 mutaciones en copia: `13-01-PLAN.md:1197`, `13-02:1391`, `13-03:1635`,
  `13-04:1510`, `13-05:1766`, `13-06:1625`, `13-07:1841`. 13-08 T4 (`13-08-PLAN.md:892-949`): 2 suites en una copia de la base
  (`git archive` + `tar`), la suite en HEAD, 2 `tsc`, 2 `next lint`, `next build` en una copia de HEAD (`:934`) y, si falla, otro
  en la base (`:935`). Ningún plan dice cómo correrlos (`run_in_background`); `timeout` está prohibido (bien).
- **Por qué importa:** el Bash del ejecutor corta a los 10 min en primer plano; 13-08 T4 casi seguro los supera, y los T5
  probablemente también. Un bloque cortado no escribe su JSON ⇒ se lee como rojo (o se re-corre a medias). No lo medí (sin
  `node_modules`): es una estimación, declarada.
- **Arreglo:** en `<execution_context>` de los 8 planes: «el bloque `automated` de la T5 (y en 13-08 la T4) se lanza con
  `run_in_background` y se espera su fin; un corte por tiempo NO es un rojo: se re-corre en segundo plano, nunca se parte el
  bloque ni se saltea un paso». Y en `13-VALIDATION.md` (B1) la latencia de esas filas.

### W3 · [scope_sanity · Dim. 5] Ocho planes de 5 tareas, seis más grandes que cualquier plan ya ejecutado en la casa
- **Evidencia:** 5 tareas por plan (40); `files_modified` 18 / 33 / 35 / 25 / 29 / 19 / 22 / 7; tamaño 180 / 206 / 263 / 233 /
  292 / 253 / 307 / 171 KB. El plan ejecutado más grande de Naira es `08-05-PLAN.md` (177 KB); los de las fases 11-12, solo
  planificados, llegan a 222 KB. 13-07 es 1,7 veces el mayor ejecutado; 13-02, 13-03, 13-04, 13-05, 13-06 y 13-07 lo superan.
  La justificación de tamaño solo está en el frontmatter de 13-01 (`:10-12`).
- **Por qué importa:** la rúbrica marca 5 tareas / 15+ archivos como bloqueante; la casa lo bajó a advertencia cuando está
  justificado (`12-PLAN-CHECK.md` W7). Acá el costo es de contexto del ejecutor: 13-07 solo son ~85 k tokens antes de leer
  CONTEXT, UI-SPEC (sus secciones) y código.
- **Arreglo (decisión del orquestador):** o partir 13-05 (lista + tareas / ficha + decisión) y 13-07 (lectura / escrituras),
  con olas en cadena igual; o aceptarlo DECLARADO en `<execution_context>` de cada plan («leer `<interfaces>` y
  `<contrato_publicado>` por sección; tarea por tarea»).

### W4 · [key_links · Dim. 9] Un ancla entre planes no la prescribe su productor: 13-06 exige `'/conversation/questions'` con comillas simples en `contrato.ts`
- **Evidencia:** `13-06-PLAN.md:997` `ancla src/lib/api/naira/contrato.ts "'/conversation/questions'"` (y prosa `:239`). 13-01
  solo tipa `ruta: string` (`13-01-PLAN.md:439`) y su test compara VALORES contra una tabla literal (`:623`): la forma del
  literal en el fuente es discreción de su ejecutor (template, comillas dobles, o una ruta armada con `NAIRA_BASE`). Es la única
  de las 53 anclas literales entre planes sin prescripción del productor.
- **Por qué importa:** si el ejecutor de 13-01 no usa comillas simples, la T1 de 13-06 queda ROJA sin camino a verde salvo editar
  el control; y lo que ese ancla quiere probar ya lo prueba `[N13:endpoint-de-la-conversacion]` (`13-06-PLAN.md:896`) por valor.
- **Arreglo:** en `13-06-PLAN.md:997` (y `:239`) cambiar a presencia sin comillas (`"/conversation/questions"`, `grep -F`), o
  prescribir en la acción de la T1 de 13-01 «cada fila de `ENDPOINTS_DE_NAIRA` con `ruta: '<ruta>'` literal entre comillas
  simples» y agregar esa forma a su `automated`.

### W5 · [research_resolution · Dim. 11] `## Preguntas abiertas` del RESEARCH sin `(RESOLVED)`
- **Evidencia:** `13-RESEARCH.md:613` `## Preguntas abiertas (🔔 para Nico; …)`, Q1..Q13 sin marca. Todas están resueltas en el
  CONTEXT: Q1→D13-1 · Q2→D13-2 · Q3→D13-13/D13-2 · Q4→D13-12 · Q5→D13-11 · Q6→D13-17 · Q7→D13-9 · Q8→D13-1/E13-1 (ruta hoja
  `B/senales/<id>`) · Q9→D13-3 · Q10→D13-7 · Q11 y Q12→§7 · Q13→D13-5.
- **Arreglo:** encabezado `## Preguntas abiertas (RESOLVED)` y, por pregunta, «RESOLVED → D13-x» (lo hace el orquestador; ningún
  plan cambia).

***

## §3 · Informativas

- **I1 · [claude_md · «iconos solo Phosphor»]** solo 13-03 (T2-T4) comprueba que no se importe `lucide-react`; el paquete ESTÁ
  instalado (`package.json:73`) y ningún guardián del repo lo prohíbe, así que en 13-02 y 13-04..13-07 un import de Lucide pasaría.
  Sugerencia: sumar `lucide-react` como import prohibido a la guardia por AST de 13-02 (recorre todas las raíces de Naira).
- **I2 · [contrato]** `13-04-PLAN.md:514` publica `useNairaSeguimiento(habilitada?: boolean)` y la acción/ancla usa
  `habilitada = true` (`:1031`, ancla de la T2). Mismo tipo público; alinear el texto del `<contrato_publicado>`.
- **I3 · [claude_md]** el `CLAUDE.md` del front dice «Código en inglés»; los nombres en español los fija el §3.1 del CONTEXT y el
  repo ya los usa (`VolverALaLista`, `SeccionesDelModulo`, `AvisoDatosDeEjemplo`). Sin acción.
- **I4 · [entorno]** en la herramienta Bash del ejecutor `grep` = ugrep (`--ignore-files -I`) y `find` = bfs. Re-corrí las anclas
  de los Paso 0 con esa función: mismo resultado que con `/usr/bin/grep`; el único `grep -r` (`13-08` T1) recorre `src/`, que no
  está en `.gitignore`. Sin acción.

***

## §4 · Cobertura goal-backward (criterio / REQ → plan · tarea · marcador exigido por un bloque `automated`)

| Criterio / REQ | Plan · tarea | Marcadores (muestra; todos exigidos por `automated`, con mutación donde aplica) | Estado |
| :-- | :-- | :-- | :-- |
| **C1** briefing, open loops, conversación y detalle de señal (con entidades) dentro del hub, sin página ni sección paralela | 13-03 T3-T5 · 13-04 T4-T5 · 13-06 T4 · 13-07 T4 · 13-08 T1 | `[N13:sin-seccion-paralela]` `[N13:fila-de-naira]` `[N13:workspace-de-naira]` `[N13:pestanas-de-naira]` `[N13:guard-por-accion]` `[N13:componentes-solo-desde-naira]` `[N13:entidades-siempre]` `[N13:entidades-lista]` `[N13:rutas-del-workspace]` `[N13:e2e-montado]` | cubierto (D13-1 🔔; entidades «agregada» hasta E13-2, declarado) |
| **C2** drill-down desde cualquier número a su fuente; `asOf` junto al número | 13-01 T4 · 13-02 T2 · 13-03 T2-T4 · 13-04 T4-T5 · 13-05 T3-T5 · 13-07 T3-T4 | `[N13:ruta-con-pagina]` `[N13:sin-href-del-agente]` `[N13:asof-pegado]` `[N13:asof-bogota]` `[N13:asof-edad]` `[N13:fuente-sin-ruta]` `[N13:enlace-sin-permiso]` `[N13:destinos-del-panel]` `[N13:asof-de-la-consecuencia]` `[N13:origen-con-drill-down]` | cubierto (conversación: E13-4/E13-8; listado de aprobaciones: E13-6; declarados en 13-08) |
| **C3** consume endpoints protegidos y respeta el 403 sin datos parciales (test) | 13-01 T2/T3/T5 · 13-02 T1 · 13-03..13-07 (una superficie por plan) · 13-08 T2 | `[N13:403-sin-reason]` `[N13:contrato-roto-sin-datos]` `[N13:403-sin-residuo]` (×15 mutaciones) `[N13:naira-fail-closed]` `[N13:secundaria-403-sin-rastro]` `[N13:tareas-403-sin-rastro]` `[N13:escritura-403]` `[N13:e2e-403-sin-residuo]` | cubierto (E2E con navegador solo en el checkpoint 13-08 T5) |
| **C4** DATO / INFERENCIA / RECOMENDACIÓN; `claimClass` de toda oración causal; «qué cree Naira» con corregir/borrar | 13-01 T4 · 13-02 T3/T4 · 13-03 T4 · 13-05 T3 · 13-06 T3 · 13-07 T2-T5 | `[N13:categoria-por-campo]` `[N13:categoria-no-solo-color]` `[N13:claimclass-del-contrato]` `[N13:chip-solo-desde-oraciones]` `[N13:hipotesis-completa]` `[N13:causa-fail-closed]` `[N13:respuesta-no-es-dato]` `[N13:procedencia-primero]` `[N13:memoria-acciones-por-permiso]` `[N13:borrar-exige-motivo]` `[N13:rechazo-sin-eco]` `[N13:promover-solo-inferencias]` | cubierto (`claimClass` fail-closed hasta E13-3/E13-4, D13-10 🔔) |
| UI-01 | 13-02..13-08 (frontmatter de 7 planes) | ver C1 | cubierto |
| UI-02 | 13-01, 13-02, 13-03, 13-05, 13-07, 13-08 | ver C2 | cubierto |
| UI-03 (consumo; la matriz es API-01 del agente) | los 8 planes | ver C3 | cubierto |

**Decisiones del CONTEXT → control:** D13-1/2 (`[N13:sin-seccion-paralela]`, ningún archivo del Piloto ni del Chat en
`files_modified`) · D13-3 (`[N13:naira-fail-closed]`, `[N13:pestana-por-su-accion]`, `[N13:guard-por-accion]`,
`[N13:workspace-accion]`, `[N13:otros-workspaces-igual]`) · D13-4 (`[N13:estados-cerrados]`, `[N13:no-encontrado]`,
`[N13:apagada]`) · D13-5 (`[N13:fixture-es-contrato]`, `[N13:parseo-tolerante]`, `[N13:estricto-profundo]`, `// fuente:` +
`// estado:` por esquema) · D13-6 (`[N13:simulado-nunca-en-prod]`, `[N13:simulado-visible]`, `[N13:simulado-solo-en-el-cliente]`)
· D13-7 (`[N13:ruta-con-pagina]`, `[N13:sin-href-del-agente]`) · D13-8 (`[N13:asof-pegado]`, `[N13:ocultos-sin-numeral]`,
`[N13:conteos-sin-numeral]`) · D13-9 (`[N13:categoria-por-campo]`) · D13-10 (`[N13:claimclass-del-contrato]`,
`[N13:causa-no-clasificada-oculta]`, `[N13:respuesta-no-es-dato]`) · D13-11 (`[N13:b5-sin-persona]`, `[N13:sin-latencia]`,
`[N13:rol-no-persona]`, `[N13:autor-sin-persona]`, `[N13:sin-quien-cerro]`, `[N13:voto-sin-persistencia]`) · D13-12
(`[N13:sin-procedural-nuevo]`; 0 archivos de configuración de la 10) · D13-13 (`[N13:conversacion-sin-persistencia]`,
`[N13:sin-storage-en-naira]`, `[N13:sin-chat-beta]`) · D13-14 (`[N13:detalle-solo-al-abrir]`, `[N13:huella-vista]`,
`[N13:sin-reenvio]`, `[N13:puede-decidir]`, `[N13:consecuencia-primero]`, `[N13:razonamiento-tras-un-tap]`,
`[N13:listado-sin-consecuencia]`) · D13-15 (`[N13:feedback-por-seccion]`, `[N13:voto-secciones]`, `[N13:voto-razones]`,
`[N13:voto-del-loop]`) · D13-16/17 (Paso 0 en la T1 de cada plan; ver W1) · D13-18 (ningún `files_modified` en
`.planning/releases/`).

**FG13-1..20:** FG13-1 (15 mutaciones de `[N13:403-sin-residuo]` en 13-01..13-07 + E2E) · FG13-2 (13-01 T2) · FG13-3 (13-01 T1:
renombrar un campo ⇒ rojo; tolerante) · FG13-4 (13-01 T2) · FG13-5 (13-02 T2, 13-03 T2/T3; Bogotá 13-01 T4, 13-02 T2) · FG13-6
(13-01 T4; 13-02 T2, 13-04 T4, 13-05 T4/T5, 13-07 T3/T4) · FG13-7 (13-03 T5, 13-04 T4, 13-06 T4: crear `naira/page.tsx` ⇒ rojo)
· FG13-8 (13-01 T5) · FG13-9 (`[N13:control-positivo]` en 35/35 bloques de 13-01..13-07) · FG13-10 (13-01 T2; visible 13-02 T2/T4,
13-03 T2, 13-04 T3) · FG13-11 (13-02 T3/T5, 13-03 T4) · FG13-12 (13-01 T4, 13-02 T4, 13-07 T3) · FG13-13 (13-02 T5, 13-03 T4,
13-04 T3, 13-07 T3) · FG13-14 (13-05 T2/T3) · FG13-15 (13-05 T3/T5) · FG13-16 (13-06 T2) · FG13-17 (13-01 T5 y la mutación
«clave solo en es» en la T1 de 13-02..13-07; `i18n-test-stub` exigido y `t: (k) => k` prohibido en cada test de componente) ·
FG13-18 (13-08 T1/T2: `[N13:e2e-montado]` antes de axe; 403 con la red simulada del helper) · FG13-19
(`arquitectura-del-panel.test.ts` + `[N13:sin-seccion-paralela]` en 13-03 T5) · FG13-20 (Paso 0 de cada plan; ver W1).

Deferred del CONTEXT NO implementados (correcto): configuración de la 10, procedural nuevo, `/feedback/report`, Piloto/Chat,
ficha N4 de entidades (hasta E13-2), latencia/actores (B-5). Reducción de alcance inventada por un planner: **ninguna**.

***

## §5 · Dimensiones

| Dimensión | Estado | Nota |
| :-- | :-- | :-- |
| 1 Cobertura de requisitos | PASA | UI-01..03 en frontmatter (según la fila de §3 del CONTEXT) y con tareas (§4); los 4 criterios cubiertos |
| 2 Completitud de tareas | PASA | 40/40 con files/action/verify/done (+ read_first, behavior, acceptance); W1 es de coherencia prosa↔control, no de falta |
| 3 Dependencias | PASA | lineal 01→08, olas 1..8; externas (9.5-06, 10-06, 11-07, 12-07, Fase 8) medidas en cada Paso 0 |
| 4 Key links | ADVIERTE | W4 (un ancla no prescrita); el resto del cableado (cliente→agentFetch, cliente→config, pestaña→registro, ficha→VolverALaLista, E2E→fixtures) planificado y anclado |
| 5 Alcance | ADVIERTE | W3 (5 tareas, hasta 35 archivos y 307 KB por plan) |
| 6 must_haves | PASA | truths por criterio, artifacts con `contains`, key_links con `pattern` en los 8 |
| 7 Cumplimiento del CONTEXT | ADVIERTE | W1 (D13-17); ninguna 🔔 re-discutida; ningún deferred implementado |
| 7b Reducción de alcance | PASA | todo "después" remite a §3/§5/§6 del CONTEXT |
| 7c Mapa de responsabilidad | PASA | la autorización es del agente (403 = autoridad final); el front solo oculta y pinta estados cerrados |
| 8 Nyquist | FALLA | 8e (B1); 8a 40/40 con `automated`; 8b W2; 8c 5/5 por ola; 8d sin `MISSING` |
| 9 Contratos entre planes | ADVIERTE | W4; nombres, props, rutas, i18n y registro de pestañas coinciden (366 exports, 53 anclas cruzadas) |
| 10 CLAUDE.md | PASA | front: DESIGN.md, tuteo, Phosphor (I1), tests colocados, `AlertDialog`, `generated/agent.ts` intacto, sin mock en prod; agente: sin filas del tren (sin PR) |
| 11 Research resuelto | ADVIERTE | W5 |
| 12 Patrones | PASA | cada plan cita análogo y anti-análogo de `13-PATTERNS.md` §4 con `archivo:línea` |

**Dimensión 8 (detalle):** Wave 0 = ninguna. Muestreo: ola 1 (13-01) 5/5 · ola 2 5/5 · ola 3 5/5 · ola 4 5/5 · ola 5 5/5 · ola 6
5/5 · ola 7 5/5 · ola 8 5/5 con `automated` (13-08 T5, checkpoint, valida la evidencia y la línea de Nico). Todos pueden ponerse
verdes en zsh 5.9 por estructura (verificado arriba); ninguno se corrió (sin `node_modules`, D13-16). Latencia: los cierres (T5;
13-08 T4) probablemente > 10 min (W2). E2E con navegador: solo en el checkpoint (13-08 T5), correcto por no haber `webServer`
(`playwright.config.ts:65`). **VALIDATION ⇒ ❌ MISSING (B1). Resultado: FALLA hasta B1.**

***

## §6 · Orden para aplicar (en serie)

1. **W4** en `13-06-PLAN.md:997` y `:239` (o la prescripción en la T1 de 13-01).
2. **W1** en el punto 1 del Paso 0 y en `<execution_context>` de los 8 planes (una frase igual en todos).
3. **W2** en `<execution_context>` de los 8 planes.
4. Decisión del orquestador: **W3** (partir 13-05 y 13-07, o aceptarlo declarado).
5. **W5** en `13-RESEARCH.md:613` (orquestador) · I1/I2 si se quiere (opcionales).
6. **B1** al final: `13-VALIDATION.md` sobre los marcadores ya estables (§1 B1; re-medir con el censo de marcadores de este check).
7. Re-check (iteración 2): `grep -c '^---$'`, `verify plan-structure` ×8, extracción anclada en `^\s*<automated>` + `bash -n` +
   `zsh -n` + censo de `$VAR` sin comillas y de `$VAR:<letra>`, las anclas del arnés de solo lectura (agente y front) y el cruce de
   contratos; más la presencia de `13-VALIDATION.md` con su reconciliación.

***

## §7 · Issues estructurados

```yaml
issues:
  - id: B1
    plan: null
    dimension: nyquist_compliance
    severity: blocker
    description: "13-VALIDATION.md no existe (nyquist_validation true en config.json:11 de Naira; 13-RESEARCH.md:673 Arquitectura de validación) y la tabla del RESEARCH valida el Piloto, fixtures en simulado/*, PermissionsContext.test.tsx y 7 marcadores que ningún plan tiene; su numeración FG no es la del CONTEXT"
    fix_hint: "El orquestador escribe 13-VALIDATION.md DESPUÉS de W1..W5: nyquist_compliant true, wave_0_complete false, 40 filas por tarea, muestreo 5/5 por ola, reconciliación RESEARCH→as-planned (FG del CONTEXT como única numeración) y lo que queda sin muestreo automático (E2E con navegador, axe, smoke real, build, datos reales)"
  - id: W1
    plan: "13-01..13-08"
    dimension: context_compliance
    severity: warning
    description: "D13-17: la prosa del Paso 0 (13-01:196-201, 13-02:254-257, 13-04:233-237, 13-07:266-270) manda re-medir y seguir si las anclas no se movieron, pero el automated exige merge-base --is-ancestor 5e3a6f85 (13-01:718, 13-02:855, 13-03:947, 13-04:898, 13-05:1052, 13-06:987, 13-07:1133, 13-08:605) y AJENO=0 desde 5e3a6f85 (13-04:902-903, 13-05:1056-1057, 13-06:991-992, 13-07:1137-1138): con otra base ninguna T1 puede ponerse verde"
    fix_hint: "Alinear la prosa con el control (sin aflojarlo): base no descendiente de 5e3a6f85 o cambios ajenos => PARA y se re-planifica contra la base nueva (V1); una línea igual en <execution_context>"
  - id: W2
    plan: "13-01..13-08"
    dimension: nyquist_compliance
    severity: warning
    description: "Latencia: la T5 de 13-01..13-07 corre la suite completa (661 archivos) + tsc + mutaciones (13-01:1197, 13-02:1391, 13-03:1635, 13-04:1510, 13-05:1766, 13-06:1625, 13-07:1841) y 13-08 T4 (:892-949) dos suites de la base, la de HEAD, 2 tsc, 2 next lint y next build (:934-935); ningún plan dice que van en segundo plano y el Bash corta a los 10 min"
    fix_hint: "En <execution_context> de los 8 planes: el automated de cierre se lanza con run_in_background y se espera; un corte por tiempo no es rojo; nunca partir el bloque ni saltear pasos"
  - id: W3
    plan: "13-02..13-07"
    dimension: scope_sanity
    severity: warning
    description: "5 tareas por plan; files_modified hasta 35; 13-02..13-07 entre 206 y 307 KB, por encima del mayor plan ejecutado en la casa (08-05, 177 KB); justificación de tamaño solo en 13-01:10-12"
    metrics: {tasks_per_plan: 5, files: [18, 33, 35, 25, 29, 19, 22, 7], kb: [180, 206, 263, 233, 292, 253, 307, 171]}
    fix_hint: "Partir 13-05 (lista+tareas / ficha+decisión) y 13-07 (lectura / escrituras) con olas en cadena, o aceptarlo declarado en <execution_context> (lectura por secciones, tarea por tarea)"
  - id: W4
    plan: "13-06"
    dimension: key_links_planned
    severity: warning
    task: 1
    description: "13-06-PLAN.md:997 (y :239) ancla \"'/conversation/questions'\" con comillas simples en contrato.ts; 13-01 solo tipa ruta: string (13-01:439) y prueba valores (:623): es la única de 53 anclas entre planes que su productor no prescribe; otra forma del literal deja la T1 de 13-06 roja sin camino a verde"
    fix_hint: "Ancla por presencia sin comillas (/conversation/questions) o confiar en [N13:endpoint-de-la-conversacion] (13-06:896); alternativa: prescribir en la T1 de 13-01 ruta: '<ruta>' literal y anclarlo allí"
  - id: W5
    plan: null
    dimension: research_resolution
    severity: warning
    description: "13-RESEARCH.md:613 ## Preguntas abiertas sin (RESOLVED); Q1..Q13 resueltas por D13-1/2/3/5/7/9/11/12/13/17, E13-1 y §7 del CONTEXT"
    fix_hint: "Encabezado '## Preguntas abiertas (RESOLVED)' y 'RESOLVED → D13-x' por pregunta"
  - id: I1
    plan: "13-02, 13-04..13-07"
    dimension: claude_md_compliance
    severity: info
    description: "Solo 13-03 controla que no se importe lucide-react (instalado, package.json:73); la regla 'iconos solo Phosphor' no tiene guardián en el resto"
    fix_hint: "Sumar lucide-react como import prohibido a la guardia por AST de 13-02"
  - id: I2
    plan: "13-04"
    dimension: key_links_planned
    severity: info
    description: "13-04:514 publica useNairaSeguimiento(habilitada?: boolean) y la acción/ancla usa habilitada = true (:1031); mismo tipo público"
    fix_hint: "Alinear el texto del contrato_publicado"
  - id: I3
    plan: null
    dimension: claude_md_compliance
    severity: info
    description: "Identificadores en español frente a 'Código en inglés' del CLAUDE.md del front: los fija el §3.1 del CONTEXT y el repo ya los usa"
    fix_hint: "Sin acción"
  - id: I4
    plan: null
    dimension: task_completeness
    severity: info
    description: "grep/find del ejecutor son funciones (ugrep/bfs); las anclas re-corridas con esa función dan lo mismo que con /usr/bin/grep"
    fix_hint: "Sin acción"
```

### Recomendación

1 bloqueante de proceso (B1, lo cierra el orquestador DESPUÉS de los arreglos) y 5 advertencias: volver a los planners SOLO
para W4, W1 y W2 (ediciones de una línea por plan), decidir W3 y marcar W5; escribir `13-VALIDATION.md`; re-check en la
iteración 2. Nada de esto re-discute una 🔔 (D13-1, su lectura del criterio 1 y D13-17 quedan como están). **No se corrió ningún
test del front** (sin `node_modules`): todo lo que exige vitest/tsc/playwright está verificado por estructura, y así lo declara
este informe.
