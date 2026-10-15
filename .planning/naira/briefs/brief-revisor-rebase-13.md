# Brief — revisor ÚNICO de la re-planificación de la Fase 13 contra la base nueva (`cambios-nico-10` @ `4ad6c188`)

Sos el ÚNICO revisor: aplicás los arreglos **EN SERIE, un plan por vez** (el orquestador te pasa el plan de cada turno), con
**ediciones por ancla exacta que abortan si no coinciden** (Python con `assert s.count(ancla) == 1`, o Edit). Nunca reescribís un
plan entero. Respondé en español.

## Dónde y reglas
- Worktree: `/Users/nicolasgarcia/rent/wt-front-naira` (rama `project/naira-superficie`, rebaseada sobre `cambios-nico-10` @
  `4ad6c188bd79a1f1272d96411a75813f87707651`). Sin `node_modules`: no instalás ni corrés tests. SOLO editás
  `.planning/naira/phases/13-superficie-naira/13-0N-PLAN.md` del turno (y, si el turno lo dice, una línea de otro plan).
- No commiteás (lo hace el orquestador), no pusheás. PROHIBIDO tocar `~/rent/mvp`, `~/rent/mvp-*` (incluida `~/rent/mvp-erp`),
  otros `~/rent/wt-front-*`, `~/.cursor/worktrees/*`, y escribir en `agent-account-manager` (solo lectura).
- Temporales: en un directorio `mktemp -d` con nombres `f13_…`; borrado SOLO por ruta exacta; **PROHIBIDO `rm` con comodines**.
- Medí todo lo que escribas (el grep es ugrep: evitá `.{0,N}` sobre UTF-8; usá python). Las anclas NUEVAS que metas en un bloque
  `automated` tienen que estar HOY en el archivo del front (verificalo con `grep -cF` antes de escribirlas).
- **zsh 5.9** corre los bloques: listas en arreglos; toda variable seguida de `:` con llaves (`"${BASE}:$AT"`, nunca `"$BASE:$AT"`:
  es un modificador y `zsh -n` no lo detecta); `cmd > "$D/x.txt" 2>&1; RC=$?`; `set +e`; `${N:-0}`; sin `timeout`; nada de `---` en
  el cuerpo (usar `***`); la etiqueta literal del bloque `automated` jamás en prosa antes de la Tarea 1.

## Leer primero
1. `13-CONTEXT.md` §0 (RB-1..RB-8) y las decisiones D13-1′, D13-17 (resuelta), D13-19..D13-22 — MANDAN.
2. `13-REBASE-RESEARCH.md` — `## Impacto por plan` (qué cambiar, con la cita nueva) y §1-§7.
3. `13-REBASE-PATTERNS.md` — `## Lo que bloquea ejecutar` (B1-B13 con el literal nuevo medido), §1 (citas movidas/cambiadas por
   plan), §2 (anclas de bloque), §3 (controles de base y cifras fijas), §4 (anclas de edición de los MOD). La tabla completa de citas:
   `/private/tmp/claude-501/-Users-nicolasgarcia-rent-agent-account-manager/fc51fffb-af24-4931-869c-ced24a7fbdfd/scratchpad/f13_censo_wlDmX0/f13_citas.tsv`
   (si ya no está, re-medí con `git show 5e3a6f85:<ruta>` contra el worktree).

## Arreglos GLOBALES (en cada plan)
- **G1 — cabecera y prosa de base:** «base `origin/Main` = `5e3a6f85`» ⇒ «base de ejecución: la de
  `phases/13-superficie-naira/BASE-DE-EJECUCION` (hoy `cambios-nico-10` @ `4ad6c188`)». Las citas `archivo:línea` del front que
  el plan escribe como medidas: actualizá las `movida` a su línea nueva y las `cambiada`/`archivo_no_existe` a lo que hay hoy (o
  quitá la cita si ya no aplica), según el censo.
- **G2 — Paso 0 y `<execution_context>` (D13-17):** el punto 1 del Paso 0 y el bloque «Δ PLAN-CHECK v1 (W1 · W2 · W3)» del
  `<execution_context>`: la viñeta W1 pasa a decir «la base es la de `BASE-DE-EJECUCION`, descendiente de `4ad6c188`; HEAD desciende
  de ella; procedencia por commit; si el SUMMARY del plan anterior registró otra `BASE=`, PARA; un ancla ausente o movida de sentido
  ⇒ PARA; re-basar es del coordinador, nunca del ejecutor (ni `rebase`/`merge`/`pull`)». Las viñetas W2/W3 no cambian.
- **G3 — control de base en el bloque `automated` de la Tarea 1** (y en cualquier otro que use `5e3a6f85`): reemplazar
  `git merge-base --is-ancestor 5e3a6f85 HEAD` (y su `test`) por el fragmento canónico de abajo, ADAPTADO a las variables del plan
  (`F`, `D`/`W`, `WT`/`FASE`…) sin cambiar el resto del bloque. En 13-03..13-07 el control `AJENO`/`MOV` deja de usar
  `git diff --name-only 5e3a6f85 HEAD …` y usa la lista de archivos del fragmento (`b_files.txt`, commits de `"$BASE"..HEAD`) +
  `git status --porcelain` contra la MISMA unión de `files_modified` que ya calcula el plan (`FM_JS`/`PREF`): un archivo fuera de la
  unión ⇒ F=1. En 13-01/13-02 (que no tenían `AJENO`) basta el fragmento: `FUERA` debe ser 0 salvo los `files_modified` del propio
  plan (y de 13-01 para 13-02). En 13-08, todo `5e3a6f85..HEAD` ⇒ `"${BASE}..HEAD"`. En 13-01 T5, `git diff --quiet 5e3a6f85 -- …` y
  `git show 5e3a6f85:"$AT"` ⇒ `"$BASE"` y `"${BASE}:$AT"`.
- **G4 — base encadenada:** en 13-02..13-08, el bloque de la T1 exige además que `13-0(N−1)-SUMMARY.md` tenga una línea `BASE=<sha>`
  igual a la de `BASE-DE-EJECUCION` (`grep -c "^BASE=${BASE}$"` ≥ 1; si no, F=1 con "hubo re-base entre planes: PARA"); y el `<output>`
  de CADA plan pide que su SUMMARY registre `BASE=<sha>` en una línea propia y la deriva (`git rev-list --count "${BASE}..cambios-nico-10"`
  + archivos en conflicto de `git merge-tree --write-tree --name-only cambios-nico-10 HEAD`). En 13-08 T4, un conflicto en un archivo
  que la fase modifica ⇒ F=1 (se reporta, no se arregla).
- **G5 — Next 15 / React 19 (D13-19):** toda firma `): JSX.Element` ⇒ `import type { JSX } from 'react'` al inicio del archivo (o
  `React.JSX.Element`); toda ficha `page.tsx` con `params` ⇒ `params: Promise<{ … }>` + `const { x } = await params` en un Server
  Component `async` (molde `src/app/panel/inmobiliaria/pagos/cobranza/deudores/[id]/page.tsx:17-29`), y sus anclas/mutaciones que
  buscaban `params.x` pasan a la forma nueva.
- **G6 — tipografía (D13-20):** ningún `text-xs` en lo que el plan manda escribir: rótulos mono ⇒ `text-label` (11 px) u
  `text-overline`; contenido ⇒ `text-caption`. Medí esas clases en `src/app/globals.css`/`tailwind*.ts` antes de usarlas.
- **G7 — cifras fijas medidas sobre la base vieja** que un bloque exige (p. ej. «17 módulos», «los cinco», nº de workspaces/intros):
  re-medirlas y, si 13-03 las mueve (Naira suma un módulo: 25→26), usar en cada plan la cifra que habrá en ESE momento.

- **G8 — contratos enmendados del agente (CONTEXT RB-9 / D13-23):** medí en `agent-account-manager` (rama `project/account-manager`,
  SOLO LECTURA; `ENMIENDAS-PASADA-UNICA.md` §5 y los planes 9.5-04/9.5-06/10-06/12-07/11-07) las formas exactas de `citasConClase`,
  `OracionServida` (`seccion`, `texto`, `claimClass`, `cifras`), `refs` tipadas, `AccionListada.asOfs`, `valorRenderizado` y
  `reason: 'naira_no_habilitada'`, y hacé que el plan del turno los CONSUMA según D13-23 (aditivo; nombres del agente; sin fabricar
  campos). Donde un plan decía "hasta E13-3/E13-4/E13-6/E13-7/E13-13", pasa a consumirlo; lo de E13-5 sigue fail-closed.

## Fragmento canónico del Paso 0 (probado en zsh 5.9 y bash 3.2 sobre este worktree: verde con la base real; rojo con base fuera de `4ad6c188` y con commits ajenos)
```sh
MINIMA=4ad6c188bd79a1f1272d96411a75813f87707651
BASE=$(cut -d' ' -f1 "$FASE/BASE-DE-EJECUCION" 2>/dev/null); echo "BASE=${BASE:-VACIA}"; test -n "$BASE" || F=1
git -C "$WT" cat-file -e "${BASE}^{commit}" > "$D/b_cat.txt" 2>&1; RC_BC=$?; echo "BASE es un commit RC=$RC_BC (DEBE 0)"; test "$RC_BC" -eq 0 || F=1
git -C "$WT" merge-base --is-ancestor "$MINIMA" "$BASE" > "$D/b_min.txt" 2>&1; RC_BM=$?; echo "BASE desciende de 4ad6c188 RC=$RC_BM (DEBE 0)"; test "$RC_BM" -eq 0 || F=1
git -C "$WT" merge-base --is-ancestor "$BASE" HEAD > "$D/b_anc.txt" 2>&1; RC_BA=$?; echo "HEAD desciende de BASE RC=$RC_BA (DEBE 0)"; test "$RC_BA" -eq 0 || F=1
git -C "$WT" rev-list --merges "${BASE}..HEAD" > "$D/b_merges.txt" 2>&1; N_MG=$(wc -l < "$D/b_merges.txt" | tr -d ' '); echo "merges desde BASE=${N_MG:-0} (DEBE 0)"; test "${N_MG:-0}" -eq 0 || F=1
git -C "$WT" log --format='%H %s' "${BASE}..HEAD" > "$D/b_log.txt" 2>&1; : > "$D/b_files.txt"
while IFS= read -r L; do C=${L%% *}; SU=${L#* }; case "$SU" in 'docs(13'*|'feat(13-0'*|'test(13-0'*|'fix(13-0'*|'refactor(13-0'*|'chore(13-0'*) ;; *) echo "COMMIT AJENO: $L"; F=1;; esac; git -C "$WT" diff-tree --no-commit-id --name-only -r "$C" >> "$D/b_files.txt"; done < "$D/b_log.txt"
```
(`WT` = raíz del worktree; `FASE` = carpeta de la fase; `D` = el `mktemp -d` del bloque. Si el plan ya tiene equivalentes con otro
nombre, usalos.)

## Arreglos ESPECÍFICOS (del censo y del research; el literal nuevo está medido en `13-REBASE-PATTERNS.md`)
- `"next": "14.2.35"` ⇒ `"next": "15.5.26"` (B4). Firma de `PageGuard` ⇒ la nueva de `PageGuard.tsx:43` (B5).
- 13-03 T1: `toHaveLength(17)` ⇒ `toHaveLength(25)` (B6, antes de que 13-03 lo mueva); la fila `desempenoIa` ⇒ la nueva de `:365` (B8);
  el ancla del agente `RUTAS_DEL_PANEL = { briefing: '/naira/briefing'…` ⇒ la aplicada por E13-1 (re-medila en
  `agent-account-manager` rama `project/account-manager`).
- 13-03 T5 (D13-1′): la fila es un **módulo N2 del grupo `agentes`**, `{ key: 'naira', …, scope: 'general', agente: 'naira' }` sin
  `ia`, insertado ANTES de la fila `desempeno-ia` (`arquitectura-del-panel.ts:363-365`); `AGENT_WORKSPACES` `naira` después del
  bloque `matching` y antes de `// ── Mantenimiento (tickets) — APAGADO` (`agentWorkspaceNav.ts:242-256`); el test de la arquitectura
  se actualiza con la frase de la casa («Eran 25 hasta que entró Naira»): `:238` 25→26 y el título del `it` (`:208`), y las listas
  cerradas de «Agentes IA» (`:755-765`, `:767-780`, `:853-873`); `secciones('reportes')` (`:963`) NO cambia; la guardia
  `naira-sin-seccion-paralela.test.ts` espera `moduloDeLaRuta('/panel/inmobiliaria/reportes/naira/…')?.key === 'naira'`, migaja
  «Agentes IA › Naira › …», sin `ia`, y que `reportes` sigue con resumen y rentabilidad; fila ⌘K en
  `src/lib/search/sources/navigation-source.ts:45-63` (`context: 'Agentes IA'`, `permission: { module: 'naira', action: 'view' }`)
  sumada a `files_modified`. Los marcadores de títulos del test de la arquitectura en 13-03 T5 / 13-05 T4 / 13-07 T4 (B7) ⇒ el título
  DESPUÉS de 13-03 (26 módulos).
- 13-01: espejo y fixtures con `NairaBriefingItem.entidades` (14 campos, RB-6; medí `10-06-PLAN.md`/`10-CONTEXT.md` en el agente);
  ancla del agente en 10-CONTEXT de la `causa` (cambió con E13-2) re-medida; `fuente-a-ruta.ts` con `/pagos/*` (D13-21, B12: literal
  `'/panel/inmobiliaria/pagos/cartera'` y las rutas del Paso 0); T5 contra `"$BASE"` (B3).
- 13-02: `/pagos/*` en `destinos-del-drill-down.ts` (B12); quitar el test borrado `retencion/aviso-de-ejemplo.test.tsx` del `vitest run`
  y de los marcadores (B13); `FalloDeCarga` lee `usePermissionsContextSafe()`: mockearlo en los tests de `NairaSinPermiso`.
- 13-03 T4, 13-04 T5, 13-05 T5: fichas con `params` `Promise` (G5). 13-03: `entidadesDeLaSenal` lee `detalle.item.entidades`.
- 13-05 y 13-07: `cobros/cobranza/arco/[id]/page.tsx` ⇒ `pagos/cobranza/arco/[id]/page.tsx` (B9).
- 13-08: intro por D13-22 (B10a: `route.fulfill` de `**/inmobiliaria/onboarding-visto**`, sin `STORAGE_PREFIX` ni
  `'leasefy.agent-intro.naira'`); `<main id="main-content" tabIndex={-1}>` ⇒ dos anclas `id="main-content"` y `tabIndex={-1}` (B10b);
  después de `pnpm build`, `node scripts/variables-libres-del-build.mjs`; gate de deriva (G4); `13-ACCEPTANCE.md` con la ubicación
  D13-1′ y los contadores de guardianes que chocarán al integrar.
- Advertencias del research (aplicalas si caen en tu plan): `mock-naira.ts` en tuteo (barrido `el-producto-tutea`); 429 del agente ⇒
  `no_disponible` (evaluar `conBackoff`); `PageGuard` ya no redirige (prosa); el compositor de 13-06 dentro de `VistaDeNaira`.

## Validación después de CADA plan (obligatoria, con ruta ABSOLUTA)
`grep -c '^---$'` = 2; `node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure <ruta>` sin errores; nº de tareas = nº
de bloques `automated` dentro de tareas; `bash -n` y `zsh -n` de cada bloque extraído anclando `^\s*<automated>`; censo de
`\$[A-Za-z_][A-Za-z0-9_]*:[A-Za-z&]` dentro de los bloques = 0; `grep -c 5e3a6f85` en el plan (solo puede quedar en prosa histórica,
nunca en un bloque); y que cada ancla literal nueva de tus bloques esté en el árbol de hoy.

## Respuesta de cada turno
CORTA (≤10 líneas): plan, arreglos aplicados (G1-G7 + específicos), anclas nuevas medidas, validación, y lo que no pudiste arreglar
(con la razón). Nada de volcar el plan.
