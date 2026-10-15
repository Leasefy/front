# Brief común — planners de la Fase 13 (cross-repo): Superficie de Naira en `Leasefy/front`

## Dónde
- Worktree ÚNICO: `/Users/nicolasgarcia/rent/wt-front-naira` (repo `Leasefy/front`, rama local `project/naira-superficie`, base
  `origin/Main` = `5e3a6f85` al planificar; **Δ REBASE 2026-09-28: base de ejecución `cambios-nico-10` @ `4ad6c188`**, fijada en
  `phases/13-superficie-naira/BASE-DE-EJECUCION`; el Paso 0 sigue D13-17 del CONTEXT). Rutas absolutas en CADA comando. **Sin
  `node_modules`** (no instales nada).
- **Base nueva (Next 15.5 / React 19, CONTEXT §0 RB-1..RB-8):** `params` de `page.tsx` es `Promise` (con `await`); nada de `JSX`
  global (`import type { JSX } from 'react'`); ningún `text-xs` nuevo (guardián `doce-pixeles`: rótulos `text-overline`/`text-label`,
  contenido `text-caption`); Naira es módulo N2 de «Agentes IA» (D13-1′), no pantalla de Reportes; drill-down a `/pagos/*`.
- Fase: `/Users/nicolasgarcia/rent/wt-front-naira/.planning/naira/phases/13-superficie-naira/`. Escribís SOLO tu `13-0N-PLAN.md`.
- PROHIBIDO tocar: `~/rent/mvp` (nunca `checkout`/`switch` ahí), `~/rent/mvp-*`, otros `~/rent/wt-front-*`, `~/.cursor/worktrees/*`,
  el `.planning/` raíz del front (ROADMAP, STATE, phases, releases: es OTRO proyecto GSD) y `agent-account-manager` (SOLO LECTURA).
- Otro planner de ESTA fase puede estar escribiendo en paralelo su plan: tocá SOLO el tuyo.
- **Despachá y leé por RUTA.** `gsd-tools phase-plan-index` / `init phase-op` ven el proyecto RAÍZ del front: no los uses.
- Temporales: `mktemp -d` y borrá SOLO por la ruta exacta que te devolvió. **PROHIBIDO `rm` con comodines (`*`)** en cualquier
  directorio compartido (un revisor anterior borró temporales ajenos así).

## Leer (en este orden)
1. `13-CONTEXT.md` — **decisiones D13-1..D13-18 tomadas (las 🔔 son supuestos para Nico: se planifican igual, declaradas); no las
   re-discutas.** §3 dice qué plan hace qué (olas en cadena lineal) y §3.1 es el **contrato de nombres EXACTOS** (el dueño puede
   AGREGAR, no renombrar). §4 son los falsos verdes que tu plan debe cerrar si le tocan. §5 bloqueadores. §6 enmiendas (si una
   condiciona tu plan, tu plan la declara, no la esquiva). 🔴 **SOLO SE PLANIFICA**: el plan tiene que ser ejecutable cuando se
   autorice, pero **no lo ejecutes**. 🔴 **B-5**: ninguna persona, actor, ranking ni latencia en la UI (D13-11).
2. `13-UI-SPEC.md` (contrato visual: §2 ubicación y pestañas, §6 reglas transversales, §7 vistas, §8 estados, §10 copy, §11 a11y,
   §13 componentes, §14 choques) — **para lo visual manda el UI-SPEC; para nombres, alcance y decisiones manda el CONTEXT.**
3. `13-RESEARCH.md` (T2 = inventario de endpoints con sus campos y códigos; `## Arquitectura de validación` con los marcadores) y
   `13-PATTERNS.md` (análogo y ANTI-análogo por archivo con `archivo:línea`; §0.2 = los tests de navegación que un workspace
   debe pasar; §5 patrones transversales; §9 guion de re-medición).
4. El contrato del agente que tu plan consume (SOLO LECTURA; los PLAN pesan 100-200 KB: grep, no los leas enteros):
   `/Users/nicolasgarcia/rent/agent-account-manager/src/server/routes/naira-memory.ts` (Fase 8, EXISTE) y los `<contrato_publicado>`
   de `/Users/nicolasgarcia/rent/agent-account-manager/.planning/agents/account-manager/phases/{9.5-carril-on-demand/9.5-06-PLAN.md,
   10-notificacion-briefing/10-06-PLAN.md,11-open-loops-feedback-medicion/11-07-PLAN.md,12-acciones-hitl-chokepoint/12-07-PLAN.md}`
   (PLANIFICADOS: sus nombres son dependencia de ejecución; tu Paso 0 los re-mide y "manda el disco").
5. Si ya existe un `13-0M-PLAN.md` del que dependés: su `<contrato_publicado>` manda (nombres exactos); el §3.1 para todo lo demás.
6. El código real del front. **Medí, no leas**: todo `archivo:línea` que cites lo verificaste con un comando (el grep es ugrep:
   evitá `.{0,N}` sobre UTF-8; usá python).

## Reglas del front (del `CLAUDE.md` del front, de `docs/DESIGN.md` y del CONTEXT)
- `docs/DESIGN.md` es la fuente de verdad visual; `src/lib/api/generated/agent.ts` NUNCA se edita; mock nunca en producción
  (`isMockMode()` de `src/lib/api/config.ts`, antes de la red, nunca en un `catch`); copy en **tuteo**; iconos **solo Phosphor**;
  componentes `PascalCase.tsx`, hooks `use-kebab-case.ts`; toda clave i18n en `es.json` **y** `en.json`; `AlertDialog`, nunca
  `window.confirm`.
- Tests **colocados** (`src/**/*.test.ts(x)`); componentes con `createRoot` + `act` (**no hay Testing Library**; molde
  `src/components/inmobiliaria/ai/SalaAgente.test.tsx`); i18n en tests con `vi.mock('@/lib/i18n', async () => await
  import('@/lib/i18n/i18n-test-stub'))`, nunca `t: (k) => k`. E2E en `tests/e2e/` (fuera de `tsc`), con `route.fulfill`.
- La fase **no agrega dependencias** ni toca `package.json`/`pnpm-lock.yaml`.

## Formato del plan (igual a `/Users/nicolasgarcia/rent/agent-account-manager/.planning/agents/account-manager/phases/11-open-loops-feedback-medicion/11-03-PLAN.md`)
- Frontmatter YAML entre los DOS primeros `---` (phase `13-superficie-naira`, plan `"0N"`, type execute, `wave`, `depends_on`,
  `autonomous`, requirements, `files_modified`, `must_haves` con truths/artifacts/key_links).
- Cuerpo: `<objective>`, `<execution_context>` (con **cómo se prepara el entorno**: verificar `../cadence`, `pnpm install
  --frozen-lockfile`, Node 20 como el CI; si la instalación falla, PARAR y reportar), `<context>` (con `<contrato_publicado>` de
  los nombres que tu plan crea y `<reglas_duras>`), `<tasks>` con `<task type="auto" tdd="true">` (cada una con `<read_first>`,
  `<action>`, `<verify><automated>…</automated></verify>`, `<acceptance_criteria>`, `<done>`), `<threat_model>`, `<verification>`,
  `<success_criteria>`, `<output>` (el SUMMARY que debe escribir el ejecutor: `13-0N-SUMMARY.md` en la carpeta de la fase).
  **Tarea 1 / Paso 0:** re-medir `git -C /Users/nicolasgarcia/rent/wt-front-naira rev-parse HEAD`, las anclas del front que usás y
  los nombres del agente que consumís; ancla movida ⇒ PARAR (D13-17).
- 🔴 **En el CUERPO jamás una línea `---`** (el parser de gsd-tools toma el ÚLTIMO bloque `---…---` y el plan queda con frontmatter
  `{}` con RC=0). Separadores de sección: `***`.
- 🔴 **Lo único que EJECUTA es el bloque `automated` de cada tarea**; `<done>`/`<verification>` se leen. El control fuerte va ahí.
- 🔴 La etiqueta literal del bloque `automated` (con corchetes angulares) **no aparece en prosa antes de la primera tarea** (I2 de
  la 12: un extractor que toma la primera ocurrencia agarra prosa). En prosa escribí "el bloque `automated`".
- 🔴 Medir por **marcador o presencia, nunca por número ni igualdad** contra algo que otro plan puede cambiar legítimamente.
- 🔴 Exit codes: `cmd > "$D/x.txt" 2>&1; RC=$?` — nunca por tubería ni tras `&&`; `set +e`; `${N:-0}`; sin `timeout`. En macOS
  `/tmp` es symlink: borrá por la ruta que devolvió `mktemp -d`.
- 🔴 **El ejecutor corre zsh 5.9**: zsh NO parte en palabras una variable sin comillas. Toda lista va en ARREGLO (`ARR=(a b)` +
  `"${ARR[@]}"`), un argumento opcional con `${7:+--project} ${7:+"$7"}`; validá cada bloque `automated` con `bash -n` Y `zsh -n`.
  **Una variable pegada a `:` va SIEMPRE con llaves** (`"${RA}:src/x"`, nunca `"$RA:src/x"`): en zsh `$RA:s…` es el
  modificador `:s` y da `bad substitution` EN EJECUCIÓN — `zsh -n` NO lo detecta (medido; pasó en 13-01/13-04/13-05).
- 🔴 Conteo de fallos con `pnpm exec vitest run <archivos> --reporter=json --outputFile="$D/r.json"` y POR ARCHIVO (un archivo que
  no carga cuenta como fallo; leé `testResults[].status` y `assertionResults`, no el texto de consola).
- 🔴 Mutaciones "por la causa" SOLO en una copia `mktemp -d` del worktree (copiá `src/`, `tests/`, configs, y ENLAZÁ
  `node_modules`; verificá en la copia que el alias `@` resuelve), **ningún test escribe dentro de `src/` del worktree**; el
  marcador `[N13:*]` va en la línea FAIL.
- 🔴 El bloque `automated` no puede contar como violación la prosa que el `<action>` manda escribir (p. ej. la guardia B-5 que
  busca `userId` no puede encontrar el comentario que explica que no se pinta `userId`). Si choca, reformulá la prosa.
- 🟠 **Sin `node_modules`, el plan-checker verifica por estructura**: tu bloque `automated` tiene que ser correcto de todos modos
  (el ejecutor lo corre después de instalar). Tests existentes del front (navegación, permisos, estados): sus aserciones NO se
  debilitan salvo que el CONTEXT lo diga explícito (único caso: `agent-module-access.test.ts` "los cinco" ⇒ seis, D13-3).
- 🟠 Línea base de la suite: el ejecutor la TOMA en el Paso 0 (`pnpm test` con `--reporter=json`, dos corridas) y lo gateado es
  "ningún archivo nuevo en rojo" + "ningún archivo que tu plan toca pasa de verde a rojo"; `tsc --noEmit` sin errores NUEVOS.

## Cómo escribir (OBLIGATORIO — las respuestas largas cortan la conexión)
No escribas el plan en una sola llamada. Usá **Bash + heredoc, un `cat >>` por bloque** (frontmatter, objective+context, UNA
tarea por llamada, threat_model+verification, success+output):
```bash
cat >> /Users/nicolasgarcia/rent/wt-front-naira/.planning/naira/phases/13-superficie-naira/13-0N-PLAN.md <<'PLANEOF'
<task type="auto" tdd="true">…</task>
PLANEOF
```
Las comillas simples en `<<'PLANEOF'` son obligatorias (el plan lleva `$1`, `$(...)`, backticks). Si una llamada se corta, al
reanudar mirá el `tail` del archivo y limpiá XML de tool-call filtrado antes de seguir.
Al terminar validá (RUTA ABSOLUTA): `node ~/.claude/get-shit-done/bin/gsd-tools.cjs frontmatter get <ruta>` NO debe devolver
`{}`; `node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure <ruta>` sin errores; `grep -c '^---$'` = **2**;
nº de tareas = nº de bloques `automated` dentro de tareas; y `bash -n` + `zsh -n` limpios sobre cada bloque `automated`
extraído anclando `^\s*<automated>` (no por la primera ocurrencia en el archivo).

## Qué NO hacer
No ejecutes el plan. No toques `src/`, `public/`, `tests/`, `package.json`, lockfiles ni el `.planning/` raíz del front. No
commitees. No pushees. No edites `13-CONTEXT.md`, `13-UI-SPEC.md`, `13-RESEARCH.md`, `13-PATTERNS.md` ni nada de `agent-account-manager`.

## Respuesta final
CORTA (≤15 líneas): ruta del plan, nº de tareas, `files_modified`, qué enmienda del CONTRATO §3.1 hace (si alguna: solo AGREGAR),
y cualquier hecho del CONTEXT/RESEARCH/UI-SPEC que el código contradiga (con `archivo:línea`).
