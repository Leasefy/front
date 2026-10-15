---
phase: 13-superficie-naira
slug: superficie-naira
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-27
---

# Phase 13 (cross-repo) — Validation Strategy · Superficie de Naira en `Leasefy/front`

> Contrato de validación por fase: qué test prueba cada requisito y cada criterio del ROADMAP, qué tarea lo crea y con qué
> comando corre. Es el arreglo de **B1** de `13-PLAN-CHECK.md` (Nyquist 8e; `config.json:11` de Naira
> `"nyquist_validation": true`). **Fuentes:** `13-CONTEXT.md` (MANDA: §3 planes y olas, §3.1 contrato, §4 FG13-1..20, §6
> enmiendas, §7 🔔), `13-RESEARCH.md` §`Arquitectura de validación` (reconciliado abajo), `13-UI-SPEC.md` (aprobado),
> `ROADMAP.md:383-395` (§Phase 13, criterios 1-4 en `:388-391`; re-medido tras `46e00d10`) y `REQUIREMENTS.md:249-251` (UI-01..03) de `agent-account-manager`, y los OCHO
> planes finales (`13-01`…`13-08`) con los arreglos del PLAN-CHECK v1 ya aplicados en serie (`37842fc3`: W1 base distinta ⇒
> PARA; W2 cierres en segundo plano; W3 tamaño declarado; W4 ancla sin comillas en 13-06; W5 preguntas del RESEARCH
> resueltas; I2). **Censo por extracción** (Python sobre los planes finales, bloques anclados en `^\s*<automated>`, sin
> comentarios `#`): **40 tareas** (39 `auto` + 1 `checkpoint:human-verify`), **40 bloques `automated`**, **313 marcadores
> `[N13:*]` distintos** (296 literales + 17 que 13-01 T2/T3 exigen vía `MARCAS=(…)`; re-censo del PLAN-CHECK v3 tras la re-medición contra `cambios-nico-10` @ `4ad6c188`; antes 299), **215 llamadas a `rojo`** (antes 194) (cada una: una mutación o sonda en copia `mktemp -d` que
> DEBE ponerse roja con el marcador en la línea FAIL). 🔴 **Nada de esto se ejecuta sin una autorización nueva de Nico**
> (`13-CONTEXT.md` §5). 🔴 **Ningún test se corrió al planificar** (el worktree no tiene `node_modules`): todo lo de abajo es
> estructura medida, no un resultado. Los fixtures prueban MECÁNICA contra un contrato espejo; ningún número de esta
> validación es un dato de producción.

***

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^4.0.18` + happy-dom `^20.6.0` (`vitest.config.ts:9`, setup `vitest.setup.ts`, tests colocados `src/**/*.test.ts(x)` `:24`); componentes con `createRoot` + `act` (**sin Testing Library**, molde `SalaAgente.test.tsx`); i18n con `i18n-test-stub` (resuelve contra `es.json` real); E2E Playwright (`playwright.config.ts`, proyecto `panel-a11y`, `seedAuthState`, `route.fulfill`), **fuera de `tsc`** (`tsconfig` excluye `tests/e2e`) |
| **Entorno** | el worktree NO tiene `node_modules`: cada Paso 0 verifica `../cadence` (`@leasefy/cadence` `file:../cadence`) e instala con `pnpm install --frozen-lockfile` (Node 20 como el CI); si falla, **PARA** (D13-16). La fase no agrega dependencias |
| **Quick run command** | `pnpm exec vitest run <archivos de la tarea> --reporter=json --outputFile="$D/r.json" > "$D/r.txt" 2>&1; RC=$?` con `D=$(mktemp -d)`; se cuentan fallos POR ARCHIVO en el JSON (un archivo que no carga cuenta) y cada marcador exigido en un `assertionResults` `passed` |
| **Full suite command** | `pnpm test` / `vitest run` completo con `--reporter=json` contra la línea base del Paso 0 de 13-01 (lo gateado: ningún archivo nuevo en rojo; ningún archivo tocado por la fase pasa de verde a rojo) + `pnpm exec tsc --noEmit` sin errores NUEVOS; en 13-08 T4 además `next lint` y `next build` en copia |
| **Estilo de los `automated`** (medido ×40) | `bash -n` RC=0 y `zsh -n` RC=0 en 40/40; 0 variables seguidas de una LETRA tras `:` (forma modificador de zsh; el arreglo `23bfaf06` corrigió 8 `"$RA:src/…"` que dan `bad substitution` y que `zsh -n` no detecta); las formas `$X::`, `$X: ` y `$X:$…` dan lo mismo en zsh y en bash (medido por el PLAN-CHECK v2, I6); listas como arreglo; 0 `rm` con comodines; globs solo en patrones de `case`; mutaciones solo en copia `mktemp -d` con `node_modules` enlazado y sonda `[N13:alias-en-la-copia]` de que `@` resuelve a la copia |
| **Estimated runtime** | no medido (sin `node_modules`). Los 8 cierres (T5 de 13-01..13-07; T4 de 13-08) corren la suite entera: **latencia alta, en segundo plano** (W2) |

***

## Sampling Rate

- **Después de cada tarea:** su bloque `automated` (39 `tdd`/`auto`; la T5 de 13-08 es el checkpoint humano).
- **Después de cada plan (ola):** el cierre del plan (T5; en 13-08 la T4) — suite completa por archivo contra la línea base +
  guardias de la fase + `tsc`. **8 olas en cadena lineal** (01 → 08): 5/5 tareas con bloque `automated` en cada ola.
- **Mutaciones en copia:** 194 llamadas a `rojo` repartidas en 13-01..13-07 (13-08 no muta: verifica presencia, el cierre y el
  checkpoint). Cada una exige el JSON `failed` con el marcador "por la causa" en la línea FAIL.
- **Wave 0:** ninguna. Cada test lo crea la tarea que lo exige (TDD); el entorno lo prepara el Paso 0 de cada plan (D13-16).

***

## Per-Task Verification Map (medido sobre los planes finales)

| Plan · ola · tarea | Tipo | Qué corre el bloque `automated` | Marcadores `[N13:*]` exigidos (distintos) | Llamadas a `rojo` (mutación/sonda por la causa) | Latencia |
|---|---|---|---|---|---|
| 13-01 · 1 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 12 | 3 | media (tests de la tarea + `tsc`) |
| 13-01 · 1 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 20 | 4 | media (tests de la tarea + `tsc`) |
| 13-01 · 1 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 9 | 2 | media (tests de la tarea + `tsc`) |
| 13-01 · 1 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 14 | 4 | media (tests de la tarea + `tsc`) |
| 13-01 · 1 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 7 | 4 | **alta — `run_in_background` (W2)** |
| 13-02 · 2 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 11 | 3 | media (tests de la tarea + `tsc`) |
| 13-02 · 2 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 16 | 7 | media (tests de la tarea + `tsc`) |
| 13-02 · 2 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 11 | 4 | media (tests de la tarea + `tsc`) |
| 13-02 · 2 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 12 | 4 | media (tests de la tarea + `tsc`) |
| 13-02 · 2 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 19 | 5 | **alta — `run_in_background` (W2)** |
| 13-03 · 3 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 24 | 7 | media (tests de la tarea + `tsc`) |
| 13-03 · 3 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 22 | 6 | media (tests de la tarea + `tsc`) |
| 13-03 · 3 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 18 | 3 | media (tests de la tarea + `tsc`) |
| 13-03 · 3 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 21 | 9 | media (tests de la tarea + `tsc`) |
| 13-03 · 3 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 26 | 7 | **alta — `run_in_background` (W2)** |
| 13-04 · 4 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 14 | 4 | media (tests de la tarea + `tsc`) |
| 13-04 · 4 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 9 | 4 | media (tests de la tarea + `tsc`) |
| 13-04 · 4 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 22 | 7 | media (tests de la tarea + `tsc`) |
| 13-04 · 4 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 24 | 6 | media (tests de la tarea + `tsc`) |
| 13-04 · 4 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 29 | 3 | **alta — `run_in_background` (W2)** |
| 13-05 · 5 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 20 | 5 | media (tests de la tarea + `tsc`) |
| 13-05 · 5 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 9 | 6 | media (tests de la tarea + `tsc`) |
| 13-05 · 5 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 32 | 10 | media (tests de la tarea + `tsc`) |
| 13-05 · 5 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 28 | 7 | media (tests de la tarea + `tsc`) |
| 13-05 · 5 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 34 | 5 | **alta — `run_in_background` (W2)** |
| 13-06 · 6 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 23 | 5 | media (tests de la tarea + `tsc`) |
| 13-06 · 6 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 17 | 6 | media (tests de la tarea + `tsc`) |
| 13-06 · 6 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 24 | 7 | media (tests de la tarea + `tsc`) |
| 13-06 · 6 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 27 | 6 | media (tests de la tarea + `tsc`) |
| 13-06 · 6 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 25 | 5 | **alta — `run_in_background` (W2)** |
| 13-07 · 7 · T1 | auto | Paso 0 D13-17 (`BASE-DE-EJECUCION` ⊇ `4ad6c188`, HEAD desciende, 0 merges, procedencia por commit, `BASE=` encadenada; entorno, anclas del front y del agente, línea base) + vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 23 | 7 | media (tests de la tarea + `tsc`) |
| 13-07 · 7 · T2 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 23 | 7 | media (tests de la tarea + `tsc`) |
| 13-07 · 7 · T3 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 26 | 9 | media (tests de la tarea + `tsc`) |
| 13-07 · 7 · T4 | auto | vitest de los tests de la tarea (JSON por archivo) + `tsc --noEmit`; mutaciones en copia `mktemp -d` | 27 | 9 | media (tests de la tarea + `tsc`) |
| 13-07 · 7 · T5 | auto | CIERRE: suite completa por archivo contra la línea base + guardias + `tsc`; mutaciones en copia `mktemp -d` | 32 | 4 | **alta — `run_in_background` (W2)** |
| 13-08 · 8 · T1 | auto | Paso 0 (base de la fase `BF`, 13-01..13-07 en disco, anclas E2E por presencia, entorno) | 6 | 0 | baja (presencia, sin tests) |
| 13-08 · 8 · T2 | auto | `naira-403.spec.ts` + helper: existe, cubre cada ruta del workspace, marcadores por presencia; `playwright --list` (sin navegador) | 9 | 0 | baja (presencia, sin tests) |
| 13-08 · 8 · T3 | auto | `13-ACCEPTANCE.md`: secciones por criterio/REQ y marcadores citados por presencia | 3 | 0 | baja (presencia, sin tests) |
| 13-08 · 8 · T4 | auto | CIERRE: suite completa por archivo (HEAD y base), `tsc` ×2, `next lint` ×2, `next build` en copia, guardias de la fase | 9 | 0 | **alta — `run_in_background` (W2)** |
| 13-08 · 8 · T5 | checkpoint:human-verify | valida la línea de reanudación de Nico (§7), §1-§2 NO VERIFICADO, §6 VERDE ×1, evidencia E2E = lo listado por Playwright y posterior al último commit de los E2E, alcance de 13-08 (la corrida E2E con `:3001`, lo visual y el smoke real los hace el humano) | 2 (`e2e-montado`, `e2e-ejemplo`, por grep) | 0 | manual + bloque de evidencia (baja) |
***

## Criterios 1-4 / REQ → plan · tarea · marcador que lo PRUEBA (exigido por un bloque `automated`)

### Criterios del ROADMAP §Phase 13 (`ROADMAP.md:388-391`, re-medido)

| Criterio | Qué lo vuelve ejecutable (con fixtures) | Plan · tarea (primera exigencia; crece en los siguientes) | Lo que exige agente vivo |
|---|---|---|---|
| **1** — briefing, open loops, conversación y detalle de señal (con entidades afectadas) DENTRO del hub; sin página nueva ni sección paralela | `[N13:sin-seccion-paralela]`, `[N13:fila-de-naira]`, `[N13:workspace-de-naira]`, `[N13:pestanas-de-naira]`, `[N13:componentes-solo-desde-naira]` + los guardianes EXISTENTES de `arquitectura-del-panel.test.ts` (25 ⇒ 26 módulos con D13-1′ — N2 de «Agentes IA» —, dos puertas, R4, página por ruta) y `gates-del-panel.test.ts`; superficies: `[N13:silencio-sin-inventario]` (briefing), `[N13:entidades-siempre]`/`[N13:entidades-lista]` (señal), `[N13:conversacion-ramas]` (conversación), la lista y bitácora de 13-04 | 13-03 T5 (navegación), 13-03 T2-T4, 13-04 T3-T5, 13-06 T3-T4 | datos reales de 9.5-06 / 10-06 / 11-07; entidades reales con **E13-2**; enlaces del correo con **E13-1** |
| **2** — drill-down de cada número a su fuente en el ERP; `asOf` junto al número | `[N13:asof-pegado]`, `[N13:asof-bogota]`, `[N13:ruta-con-pagina]`, `[N13:sin-href-del-agente]` | 13-01 T4 (puros), 13-02 T2 (primitivas), en cada superficie 13-03..13-07 | `asOf` por cifra en la conversación con **E13-4**; en el listado de aprobaciones con **E13-6** |
| **3** — consume endpoints protegidos y respeta el 403 SIN datos parciales (test) | `[N13:403-sin-residuo]` (200 → 403 sobre el MISMO hook/vista: sin el token del fixture ni `[data-naira-numero]`), `[N13:403-sin-reason]`, `[N13:contrato-roto-sin-datos]`, `[N13:naira-fail-closed]`, `[N13:guard-por-accion]`, `[N13:workspace-accion]`, `[N13:pestana-oculta-por-accion]`; E2E `naira-403.spec.ts` (presencia en 13-08 T2; corrida en el checkpoint T5) | 13-01 T2-T3, T5; 13-02 T1; cada superficie 13-03..13-07; 13-08 T2/T5 | 403 real del `agencyRoleMiddleware` y `/my-permissions` con `naira` (10-06) |
| **4** — DATO / INFERENCIA / RECOMENDACIÓN distinguibles; `claimClass` visible en toda oración causal; "qué cree Naira" con corregir/borrar por ítem | `[N13:categoria-por-campo]`, `[N13:claimclass-del-contrato]` (+ guardia estática sin regex de vocabulario), `[N13:memoria-acciones-por-permiso]`, `[N13:borrar-exige-motivo]` | 13-01 T4, 13-02 T3-T5, 13-05 T3, 13-06 T3, 13-07 T2-T5 | `claimClass` por cita con **E13-3** (hasta entonces fail-closed: la causa no se muestra, D13-10); categorías en la conversación con **E13-4** |

**Marcadores agregados por la re-medición contra `cambios-nico-10`** (PLAN-CHECK v3 W1; 14 nuevos, 0 quitados): crit. 1
`[N13:busqueda-de-naira]` (13-03 T5, fila ⌘K), `[N13:entidades-del-contrato]` · crit. 2 `[N13:cifra-con-su-corte]` (13-06),
`[N13:listado-con-corte]` (13-05, E13-6), `[N13:valor-renderizado]` (13-02) · crit. 3 `[N13:404-por-razon]` y
`[N13:enmiendas-opcionales]` (13-01), `[N13:sin-permiso-admin]` (13-02) · crit. 4 `[N13:causa-con-clase]`, `[N13:citas-con-clase]`
(13-02/13-03, E13-3), `[N13:chip-por-clase]`, `[N13:oraciones-por-seccion]`, `[N13:oraciones-en-tramos]`, `[N13:hipotesis-sin-banda]`
(13-06, E13-4). La tabla por tarea de arriba conserva los conteos de la planificación original (40 tareas; los marcadores por fila
crecieron en los planes que consumen D13-23).

### Requisitos → tests

| REQ | Planes | Marcadores núcleo |
|---|---|---|
| **UI-01** (briefing, open loops, detalle de señal con entidades, dentro del hub) | 13-02..13-08 | criterio 1 + `[N13:voto-secciones]` (feedback), `[N13:deep-links]`/`[N13:deep-link-dia]` |
| **UI-02** (drill-down a la fuente) | 13-01, 13-02, 13-03, 13-05, 13-07, 13-08 | criterio 2 |
| **UI-03** (consume y respeta el 403 sin datos parciales; la matriz es `API-01` del agente) | 13-01..13-08 | criterio 3 |

### FG13-1..20 (`13-CONTEXT.md` §4) → marcador y tarea (todas con bloque `automated`)

| FG | Marcador(es) | Primera exigencia → también en |
|---|---|---|
| FG13-1 | `[N13:403-sin-residuo]` | 13-01 T3 → todas las superficies; E2E en 13-08 |
| FG13-2 | `[N13:403-sin-reason]` | 13-01 T2 |
| FG13-3 | `[N13:fixture-es-contrato]`, `[N13:parseo-tolerante]` | `fixture-es-contrato`: 13-01 T1 → 13-03..13-07; `parseo-tolerante`: 13-01 T1/T2 |
| FG13-4 | `[N13:contrato-roto-sin-datos]` | 13-01 T2 |
| FG13-5 | `[N13:asof-pegado]`, `[N13:asof-bogota]` | 13-01 T4 / 13-02 T2 → 13-03..13-07 |
| FG13-6 | `[N13:ruta-con-pagina]`, `[N13:sin-href-del-agente]` | 13-01 T4 → 13-02..13-07 |
| FG13-7 | `[N13:sin-seccion-paralela]` | 13-03 T5 → 13-04..13-07 |
| FG13-8 | `[N13:naira-fail-closed]` | 13-01 T5 |
| FG13-9 | `[N13:control-positivo]` | en cada archivo de test (13-01..13-07) |
| FG13-10 | `[N13:simulado-nunca-en-prod]`, `[N13:simulado-visible]` | 13-01 T2 / 13-02 T2 → 13-03..13-07 |
| FG13-11 | `[N13:claimclass-del-contrato]` | 13-02 T3 → 13-03..13-07 |
| FG13-12 | `[N13:categoria-por-campo]` | 13-01 T4 → 13-02, 13-05, 13-07 |
| FG13-13 | `[N13:b5-sin-persona]`, `[N13:sin-latencia]` | 13-02 T5 → 13-03..13-08 |
| FG13-14 | `[N13:detalle-solo-al-abrir]` | 13-05 T2-T5 |
| FG13-15 | `[N13:huella-vista]` | 13-05 T3, T5 |
| FG13-16 | `[N13:conversacion-sin-persistencia]` | 13-06 T2, T4-T5; 13-08 T4 |
| FG13-17 | `[N13:i18n-es-en]` | 13-01 T5 → 13-02..13-07 |
| FG13-18 | `[N13:e2e-montado]` | 13-08 T1-T3 (presencia); corrida real en el checkpoint T5 |
| FG13-19 | `[N13:sin-seccion-paralela]` + guardianes existentes de la arquitectura | 13-03 T5 → 13-04..13-07 |
| FG13-20 | Paso 0 canónico de D13-17 en la T1 de los 8 planes (BASE de `BASE-DE-EJECUCION`, descendiente de `4ad6c188`, procedencia por commit, BASE encadenada; no es marcador) + `[N13:alias-en-la-copia]` | 13-01 T1 → todas |

***

## Reconciliación RESEARCH → as-planned (manda lo PLANIFICADO; numeración FG única = la del CONTEXT)

| RESEARCH (`13-RESEARCH.md` §Arquitectura de validación) | As-planned |
|---|---|
| Naira en el Piloto: «componentes montados solo desde el Piloto», «el bloque pinta…», `?senal=` (`:689-691`) | workspace N3 en Reportes (D13-1 🔔): `[N13:componentes-solo-desde-naira]` (solo desde `reportes/naira/**`), ficha `B/senales/[promocionId]` con URL (E13-1), `?dia=` en el briefing |
| fixtures en `src/lib/api/naira/simulado/*` (`:304`, `:715`) | `src/lib/data/mock-naira.ts` (`EJEMPLOS_DE_NAIRA`, D13-6) |
| extender `PermissionsContext.test.tsx` (`:716`) | `src/lib/context/PermissionsContext.naira.test.tsx` nuevo (13-01 T5); `PermissionsContext.tsx` no se toca (Δ 13-01) |
| `[N13:bloque-completo]`, `[N13:senal-entidades]` | `[N13:entidades-siempre]`, `[N13:entidades-lista]` (13-03 T4) + superficies por pestaña |
| `[N13:deep-link]` | `[N13:deep-links]`, `[N13:deep-link-dia]` (13-03) |
| `[N13:cliente-estados]` | `[N13:estados-cerrados]` (13-02 T1) + los estados del cliente de 13-01 T2 |
| `[N13:fuente-a-ruta-existe]`, `[N13:sin-href-interpolado]` | `[N13:ruta-con-pagina]`, `[N13:sin-href-del-agente]` |
| `[N13:descubrimiento-titular]` (reporte de feedback) | **fuera de alcance** (D13-12: el reporte de descubrimiento no entra en la 13); sin marcador |
| FG del RESEARCH (FG13-11 = «aceptación mostrada sola», etc.) | FG del CONTEXT §4 (FG13-11 = `claimClass` inventado); la del RESEARCH no se usa |

Los marcadores de los planes que el RESEARCH no tenía (la mayoría de los 299) son de superficie, de navegación o de controles
de las tareas (p. ej. `[N13:guard-por-accion]`, `[N13:workspace-accion]`, `[N13:consecuencia-primero]`, `[N13:conteos-sin-numeral]`,
`[N13:recall-ancla]`, `[N13:endpoint-de-la-conversacion]`); los fija cada plan en su `<contrato_publicado>` / `<acceptance_criteria>`.

***

## Dependencias de EJECUCIÓN externas (cada Paso 0 las re-mide y PARA)

| Plan | Del front | Del agente (SOLO LECTURA; "manda el disco") |
|---|---|---|
| 13-01 | Paso 0 D13-17 (`BASE-DE-EJECUCION`), entorno instalado | `naira-memory.ts` (Fase 8, EXISTE); `<contrato_publicado>` de 9.5-06, 10-06, 11-07, 12-07 (PLANIFICADOS); catálogo de métricas |
| 13-02 | 13-01 ejecutado | — |
| 13-03 | 13-01..13-02 | 10-06 (`/briefing`, `/signals/{id}`, `/recall`), 11-07 (voto) |
| 13-04 | 13-01..13-03 | 11-07 (`/open-loops`) |
| 13-05 | 13-01..13-04 | 12-07 (`/actions`, `/tasks`) |
| 13-06 | 13-01..13-05 | 9.5-06 (`/conversation/questions`) |
| 13-07 | 13-01..13-06 | Fase 8 (memoria) + 11-07 (promoción) + 10-06 (`/my-permissions` con `naira`) |
| 13-08 | 13-01..13-07 | para el smoke real: 9.5-06, 10-06, 11-07, 12-07 ejecutadas y el agente desplegado |

Con los planes del agente sin ejecutar, 13-01..13-07 se pueden ejecutar (con autorización) contra el espejo + fixtures; la
UI queda **oculta en producción** hasta que 10-06 publique `naira` en `/my-permissions` (D13-3).

***

## Manual-Only Verifications (13-08 T5, `checkpoint:human-verify`)

| Qué | Por qué es manual |
|---|---|
| Autorización de ejecución de Nico | decisión humana (`13-CONTEXT.md` §5) |
| E2E `naira.a11y.spec.ts` (axe sobre `main` en las 5 pestañas y 3 fichas) y `naira-403.spec.ts` | necesitan `:3001` + sesión; el CI del front no corre E2E; el modo ejemplo exige un segundo arranque (la variable se fija al iniciar el servidor, `config.ts:47-50`) |
| Revisión visual en modo ejemplo | con sesión real Naira queda oculta (fail-closed, `/my-permissions` sin `naira`); se usa la sesión sintética de Playwright |
| Smoke real por pestaña | solo si el agente publica Naira desplegado; si no, se declara |
| `next build` | en copia del árbol (no prueba tipos ni lint: `next.config.mjs:36-37`); se mide aparte con `tsc` y `lint` |

***

## Huecos declarados (lo que ningún fixture de esta fase mide)

- Que el agente real responda con la forma del espejo (A2 del RESEARCH): lo mide el smoke real o el día que `pnpm api:gen` traiga
  `Naira*` (ticket V4).
- `claimClass` por cita, entidades afectadas, inventario del silencio, categorías y `asOf` por cifra en la conversación,
  `asOfs` en el listado de acciones: **fail-closed y declarados** hasta E13-2..E13-6.
- Que el 404 sea "Naira apagada" y no "ítem inexistente": indistinguible hasta E13-7.
- a11y con axe: solo en el checkpoint (manual).
- Cualquier número "real" (latencias, tasas, conteos): no existe en esta fase.

***

## Decisiones 🔔 de Nico que esta validación NO toma

D13-1 (ubicación), D13-2 (Inicio/Chat), D13-3 (fail-closed antes de 10-06), D13-10 (`claimClass` fail-closed), D13-11 (B-5 en
la UI), D13-12 (alcance), D13-17 (base) y U5-U21 del UI-SPEC: se planificaron con la recomendación; si Nico cambia una, se
re-planifica el plan afectado y esta validación se regenera por el mismo censo.

***

## Validation Sign-Off

- [x] Todas las tareas tienen un bloque `automated` (40/40; la T5 de 13-08 es el checkpoint humano y su bloque valida la evidencia que deja el humano)
- [x] Continuidad de muestreo: ninguna ola sin verificación automática (8 olas, 5/5)
- [x] Wave 0: no hace falta (cada test lo crea su tarea; el entorno, el Paso 0)
- [x] Sin `--watch`; sin `timeout`; cierres pesados en segundo plano (W2)
- [x] Cada criterio 1-4 y cada REQ UI-01..03 con marcador exigido; FG13-1..20 cubiertos
- [ ] `wave_0_complete` — no aplica hasta ejecutar (sin autorización)

**Approval:** PLAN-CHECK v2 (iteración 2 de 3) = EJECUTAR CON ADVERTENCIAS; W6/W7 e I6/I7/I8 aplicados sin re-check (2026-09-27).
**Re-medición (2026-09-28):** PLAN-CHECK v3 (ronda única tras el rebase a `cambios-nico-10` @ `4ad6c188`) = EJECUTAR CON
ADVERTENCIAS (0 bloqueantes); W1 (esta validación) y W2/I1 aplicados sin re-check.
