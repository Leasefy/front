# Fase 13 (Superficie de Naira) — Censo MECÁNICO de anclas contra la base nueva

**Medido:** 2026-09-28 · **Base vieja (de la planificación):** `5e3a6f85` (= `origin/Main`, Merge PR #147) · **Base nueva:** `4ad6c188`
(`cambios-nico-10`, Next 15.5 / React 19) · **HEAD del worktree:** `8b58966d` = `4ad6c188` + 13 commits que SOLO tocan `.planning/`
(`git diff --quiet 4ad6c188 HEAD -- . ':!.planning'` RC 0) · **Alcance:** solo lectura; la re-medición semántica está en `13-REBASE-RESEARCH.md`.

Hechos de base (medidos con git, sin ejecutar ningún plan):
- `git merge-base --is-ancestor 5e3a6f85 HEAD` → **RC 1** (ya no es ancestro). `HEAD..5e3a6f85` = 9 commits de `Main` (merges de `develop` #56…#147) que
  la rama nueva no tiene; `5e3a6f85..HEAD` = 851 commits. `git merge-base --is-ancestor 4ad6c188 HEAD` → RC 0.
- `git diff --name-only 5e3a6f85 HEAD -- src tests package.json pnpm-lock.yaml vitest.config.ts tsconfig.json` = **2064 archivos**
  (con `4ad6c188` en lugar de `5e3a6f85`: **0**). 70 renombres detectados por `git diff -M` (todo `cobros/…` → `pagos/…`).

## Método (cómo se corrió; scripts en el `mktemp -d` `f13_censo_wlDmX0` del scratchpad de la sesión)

Directorio: `/private/tmp/claude-501/-Users-nicolasgarcia-rent-agent-account-manager/fc51fffb-af24-4931-869c-ced24a7fbdfd/scratchpad/f13_censo_wlDmX0/` (`$T`).
1. Árboles: `git archive 5e3a6f85 -- . ':(exclude)public' ':(exclude)landing-standalone' | tar -x -C $T/old` y lo mismo con `HEAD` en `$T/new`
   (+ `.planning/naira` de HEAD en `old`); listados `git ls-tree -r --name-only` de los dos commits y de `project/account-manager` del agente
   (`f13_tree_{old,new,agent}.txt`), renombres `git diff -M --name-status 5e3a6f85 4ad6c188` (`f13_namestatus.txt`).
2. `python3 $T/f13_citas.py $T` → `citas.json` (+ `f13_citas.tsv`): citas `ruta:N`, `ruta:N-M`, `ruta:N,M`/`N,:M`, nombre o ruta parcial
   (`piloto.ts:3-21`, `retencion/aviso-de-ejemplo.test.tsx:78`) resuelto por sufijo único del front o por la ruta completa citada antes en el mismo
   documento, y `(`:N`)`/`:N` sueltos que continúan el último archivo del párrafo (si el rango no cabe, el archivo anterior; si ninguno, "no resuelta").
3. `python3 $T/f13_bloques.py $T` → corre EN SECO los 40 bloques `<automated>` (extraídos desde `^\s*<automated>` hasta `</automated>`) dos veces,
   contra `old/` y contra `new/`, con `bash` y un preludio (`f13_prelude.sh`) que reemplaza `ancla`/`una`/`mutar`/`exporta` por registradores
   (misma semántica de conteo: `grep -cF`), registra todo `grep`, `node`, `test -f/-d`, `[ -f ]` y `find` sobre archivos del front, y neutraliza
   `git`, `pnpm`, `rm`, `cp`, `mv`, `ln` (ningún comando toca el worktree real: las rutas `/Users/…/wt-front-naira` y `/tmp/p13…` se reescriben a
   las copias). Los dos lados registraron el mismo número de llamadas en cada bloque (mismo flujo). `python3 $T/f13_anclas.py $T` → `anclas.json`.
4. `python3 $T/f13_marcadores.py $T` (marcadores `archivo::título` que `MARC_JS` exige verdes sobre tests EXISTENTES), `f13_rutas.py` (rutas del
   panel con/sin `page.tsx`), `f13_mod.py` (literales entre backticks de `<action>`/`<read_first>`/`<behavior>` contados en cada MOD, y choques de
   los archivos a crear), `f13_i18n.py` (claves i18n de la base vieja citadas). Las anclas de EDICIÓN por posición (4.1) se midieron a mano con
   `grep -nF` sobre `new/`.

## Lo que bloquea ejecutar

Con la base nueva, **toda Tarea 1 de los 8 planes sale con F=1** (ancestría) y 13-03..13-07 además por "cambios ajenos". Lista exacta, con la
corrección medida en `4ad6c188`:

| # | Dónde (plan · tarea · línea) | Qué falla hoy | Corrección propuesta (medida en la base nueva) |
|---|---|---|---|
| B1 | 13-01 T1 L730 · 13-02 T1 L867 · 13-03 T1 L959 · 13-04 T1 L910 · 13-05 T1 L1064 · 13-06 T1 L999 · 13-07 T1 L1145 · 13-08 T1 L617 | `git merge-base --is-ancestor 5e3a6f85 HEAD` → RC 1 | `4ad6c188` en lugar de `5e3a6f85` → RC 0 (y el texto "base origin/Main = 5e3a6f85" de cada `<execution_context>`/Paso 0) |
| B2 | 13-03 T1 L963-965 (`MOV` con `PREF`) · 13-04 T1 L914-915 · 13-05 T1 L1068-1069 · 13-06 T1 L1003-1004 · 13-07 T1 L1149-1150 (`AJENO`) | `git diff --name-only 5e3a6f85 …` lista 2064 archivos: 2062 fuera de `PREF` (13-03) y 2058 fuera de la unión de `files_modified` (13-04..13-07) ⇒ MOV/AJENO = 1 | misma línea con `4ad6c188` → hoy 0 archivos |
| B3 | 13-01 T5 L1186 | `git diff --quiet 5e3a6f85 -- src/lib/context/PermissionsContext.tsx` → RC 1 (+28/−3: `consumePermissionsSeed`, `modulosPagos`) | `git diff --quiet 4ad6c188 -- …` → RC 0. (L1187, orden `isAgentModule` :218 < `isAdmin` :225, sigue valiendo; L1189 `git show 5e3a6f85:src/lib/auth/agent-module-access.test.ts` da el mismo contenido que `4ad6c188`: el test no cambió) |
| B4 | 13-03 T1 L957 · 13-04 T1 L963 · 13-05 T1 L1123 · 13-06 T1 L1053 · 13-07 T1 L1220 | `ancla package.json '"next": "14.2.35"'` → 0 | `'"next": "15.5.26"'` (`package.json:73`, ×1) |
| B5 | 13-03 T1 L998 · 13-04 T1 L948 · 13-05 T1 L1096 · 13-06 T1 L1040 · 13-07 T1 L1204 | `ancla src/components/auth/PageGuard.tsx "export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {"` → 0 | `"export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {"` (`PageGuard.tsx:43`, ×1) |
| B6 | 13-03 T1 L1003 | `ancla src/lib/nav/arquitectura-del-panel.test.ts 'expect(modulos).toHaveLength(17);'` → 0 | `'expect(modulos).toHaveLength(25);'` (`:238`, ×1) |
| B7 | 13-03 T5 L1623 · 13-05 T4 L1600 · 13-07 T4 L1745 | marcador `"$AQT::el sidebar tiene 17 módulos"` exigido verde: el título ya no existe ⇒ `FALTA VERDE` | `"$AQT::el sidebar tiene 25 módulos"` (título completo `:208`: `el sidebar tiene 25 módulos en 5 grupos con nombre (+ Inicio y Chat = 27 filas)`) |
| B8 | 13-03 T1 L990 | `ancla …/arquitectura-del-panel.ts "{ labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics' },"` → 0 | ya no es pantalla de Reportes: `{ key: 'desempeno-ia', labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics', scope: 'general' },` (`:365`, módulo del grupo `agentes`). **No basta cambiar el literal**: ver B11 |
| B9 | 13-05 T1 L1101 · 13-07 T1 L1192 | `ancla 'src/app/panel/inmobiliaria/cobros/cobranza/arco/[id]/page.tsx' 'tone="danger"'` → archivo no existe | `src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx` (git R098); `tone="danger"` sigue en `:419` |
| B10 | 13-08 T1 L627 | (a) `ancla src/components/tour/AgentIntroModal.tsx "const STORAGE_PREFIX = 'leasefy.agent-intro.'"` → 0; (b) `ancla src/app/panel/inmobiliaria/layout.tsx '<main id="main-content" tabIndex={-1}>'` → 0 | (a) **sin literal equivalente**: el «ya la vi» dejó `localStorage` y es `claveDeLaPresentacionDelAgente(agent.id)` + `usePanelPrefs()` (`/inmobiliaria/onboarding-visto`); arrastra L639 (`'leasefy.agent-intro.naira'` exigido en el helper que se crea) y `sinIntroDeNaira`/`CLAVE_DE_LA_INTRO` (L566): re-planificar la supresión de la intro en el E2E. (b) el tag se partió: `id="main-content"` (`:345`, ×1) + `tabIndex={-1}` (`:346`, ×1) |
| B11 | 13-03 T5 `<action>` A (L1536-1541) y B (L1543-1550) | posición de inserción rota (grep de presencia no lo ve): A "en `reportes.pantallas`, DESPUÉS de la línea de `/reportes/ia`" — `/reportes/ia` ya no está en `reportes.pantallas` (`:667-673`; queda el comentario `// «Desempeño IA» se mudó a «Agentes IA» el 2026-09-16, con su URL.` en `:672`). B "DESPUÉS del bloque `pagos` y ANTES de `// ── Mantenimiento (tickets) — APAGADO`" — ya no hay bloque `slug: 'pagos'` en `AGENT_WORKSPACES` (quedan 5 activos; antes 7) | literal mecánico más cercano: A tras `{ labelKey: 'inmobiliaria.nav.rentabilidad', href: r('/reportes/rentabilidad'), icon: TrendUp, module: 'reportes' },` (`:671`); B tras el bloque `matching` (`:242-255`), antes de `:256`. **Pero** dónde vive Naira (Reportes vs «Agentes IA») es decisión semántica → `13-REBASE-RESEARCH.md` |
| B12 | 13-01 T4 L1085 (`ancla`) y L1100 (`mutar`) sobre `fuente-a-ruta.ts`; 13-02 T2 L1033 (`ancla`) y L1059 (`mutar`) sobre `destinos-del-drill-down.ts` (archivos que se crean) | exigen el literal `'/panel/inmobiliaria/cobros/cartera'` y el mismo plan exige `[N13:ruta-con-pagina]` (toda ruta con `page.tsx`): `cobros/cartera/page.tsx` se BORRÓ ⇒ o falla el ancla o falla el test | rutas nuevas: `/pagos/cartera`, `/pagos/recaudo`, `/pagos/cobranza`, `/pagos/cobranza/{acuerdos,deudores,disputas,escalaciones,pagos}` (§1.4); cambiar el literal a `'/panel/inmobiliaria/pagos/cartera'` en los 4 sitios y las 10 rutas del Paso 0 (13-01 L227-229, 13-02 L292-294) y de UI-SPEC §6.2 |
| B13 | 13-02 T4 L1257 (`RET=retencion/aviso-de-ejemplo.test.tsx`), L1285 (`vitest run … "$RET"`) y L1286 (marcador `"$RET::"`) | el test `src/app/panel/inmobiliaria/contratos/(retencion)/retencion/aviso-de-ejemplo.test.tsx` se BORRÓ en la base nueva (sin renombre; ningún otro test busca `aviso-datos-de-ejemplo` fuera de `AvisoDatosDeEjemplo.test.tsx`) ⇒ `MARC_JS`: `FALTA ARCHIVO` ⇒ F=1 | quitar `$RET` del `vitest run` y de la lista de marcadores (y la cita `retencion/aviso-de-ejemplo.test.tsx:78,:88` de 13-02 L386); no hay sustituto medido |

No bloquean (medido): ningún archivo a crear existe ya (164/164 libres; §5); las anclas de edición de `agent-module-access.ts(+test)`,
`AvisoDatosDeEjemplo.tsx(+test)` (idénticos entre bases), `WorkspaceNav.tsx:36`, `AgentIntroModal.tsx` "después de la entrada `pagos`"
(`:98-104`, sigue siendo la última) y los nodos i18n (`inmobiliaria.ai.nav`, `.intro`, `.breadcrumb.detalle`) siguen en su sitio; ninguna de
las 18 claves i18n viejas citadas desapareció; `inmobiliaria.ai.naira` sigue sin existir. `git log 5e3a6f85..HEAD` de 13-08 (T1 L619, T2 L749,
T3 L856, T4 L920, T5 L1041) funciona igual (0 commits `(13-0N):` ajenos entre los 851), aunque conviene pasarlo a `4ad6c188..HEAD`.

## 1. Citas `archivo:línea` del front

Estados: **igual** mismo texto en la misma línea · **movida** el tramo entero, idéntico, en otra línea N' · **cambiada** el texto ya no está tal cual (línea más parecida; en tramos, cuántas líneas se conservan en orden: "k/k conservadas" = solo se insertaron líneas en medio) · **archivo_no_existe** (con el renombre de `git diff -M`). Cada tramo de `N-M,P` cuenta aparte. Tabla completa (todas las citas, también las `igual` y las que no son del front): `/private/tmp/claude-501/-Users-nicolasgarcia-rent-agent-account-manager/fc51fffb-af24-4931-869c-ced24a7fbdfd/scratchpad/f13_censo_wlDmX0/f13_citas.tsv`.

| Documento | igual | movida | cambiada | archivo_no_existe | total front | no front (agente / lo crea la fase / no resuelta) |
|---|---|---|---|---|---|---|
| 13-01 | 44 | 31 | 11 | 0 | 86 | 15 |
| 13-02 | 32 | 34 | 11 | 2 | 79 | 1 |
| 13-03 | 43 | 37 | 24 | 0 | 104 | 2 |
| 13-04 | 14 | 12 | 1 | 2 | 29 | 0 |
| 13-05 | 31 | 13 | 1 | 2 | 47 | 0 |
| 13-06 | 27 | 21 | 3 | 0 | 51 | 0 |
| 13-07 | 59 | 20 | 3 | 0 | 82 | 23 |
| 13-08 | 70 | 16 | 5 | 0 | 91 | 12 |
| 13-CONTEXT | 16 | 8 | 6 | 0 | 30 | 7 |
| 13-UI-SPEC | 18 | 12 | 6 | 0 | 36 | 10 |
| 13-VALIDATION | 3 | 1 | 0 | 0 | 4 | 5 |
| **total** | **357** | **205** | **71** | **6** | **639** | 75 |

Resolución: 293 `:N` sueltas al archivo del párrafo; 160 por nombre/ruta parcial (3 desambiguadas por contenido: `retencion.ts`→`src/lib/api/retencion.ts`, `inquilinos/page.tsx`→`src/app/panel/inmobiliaria/inquilinos/page.tsx`, `config.ts`→`src/lib/api/config.ts`); 7 DUDOSA (el literal junto a la `:N` no está en esa línea: paráfrasis u otro archivo; todas dan `igual`): 13-05:318, 13-08:265, 13-08:270, 13-08:271, 13-08:275, 13-08:277, 13-VALIDATION:33. No resueltas: 13-08:264 `:3001` (puerto) y 13-VALIDATION:151 `:716` (línea del RESEARCH).

### 1.1 Las que NO están `igual`

| Doc | Línea | Cita (base vieja) | Estado | Cita nueva | Texto en `5e3a6f85` · detalle |
|---|---|---|---|---|---|
| 13-01 | 116 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 116 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 120 | `src/lib/nav/arquitectura-del-panel.test.ts:63-77` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:72-86` | `function tienePagina(href: string): boolean { … (15 lineas)` · +9 lineas |
| 13-01 | 132 | `src/lib/api/retencion.ts:51` | cambiada | `src/lib/api/retencion.ts:72` | `} catch {` · la mas parecida (ratio 0.55): «cambio: {» |
| 13-01 | 133 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 163 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-01 | 220 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 221 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 271 | `src/lib/context/PermissionsContext.tsx:194-216` | movida | `src/lib/context/PermissionsContext.tsx:215-237` | `const canAccess = useCallback( … (23 lineas)` · +21 lineas |
| 13-01 | 271 | `src/lib/context/PermissionsContext.tsx:196` | movida | `src/lib/context/PermissionsContext.tsx:217` | `if (isLoading) return false;` · +21 lineas |
| 13-01 | 271 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 272 | `src/lib/context/PermissionsContext.tsx:203` | movida | `src/lib/context/PermissionsContext.tsx:224` | `if (!permissions) return false;` · +21 lineas |
| 13-01 | 272 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 274 | `src/lib/context/PermissionsContext.test.tsx:20-104` | cambiada | `src/lib/context/PermissionsContext.test.tsx:27-111` | `true … (85 lineas)` · 84/85 lineas conservadas en orden; el tramo igual mas largo (40) empieza en :50 |
| 13-01 | 278 | `src/lib/api/agent-fetch.ts:99-127` | cambiada | `src/lib/api/agent-fetch.ts:99-127` | `export async function agentFetch( … (29 lineas)` · 28/29 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :99 |
| 13-01 | 285 | `src/lib/nav/arquitectura-del-panel.test.ts:45` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:54` | `const APP = join(process.cwd(), 'src/app/panel/inmobiliaria');` · +9 lineas |
| 13-01 | 285 | `src/lib/nav/arquitectura-del-panel.test.ts:63-77` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:72-86` | `function tienePagina(href: string): boolean { … (15 lineas)` · +9 lineas |
| 13-01 | 287 | `src/components/estado/cuatro-estados.test.ts:41` | movida | `src/components/estado/cuatro-estados.test.ts:49` | `* sigue valiendo cuando alguien agregue el próximo hook de UI.` · +8 lineas |
| 13-01 | 535 | `src/components/estado/cuatro-estados.test.ts:41` | movida | `src/components/estado/cuatro-estados.test.ts:49` | `* sigue valiendo cuando alguien agregue el próximo hook de UI.` · +8 lineas |
| 13-01 | 587 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 587 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 631 | `src/lib/api/piloto.ts:1-30` | cambiada | `src/lib/api/piloto.ts:1-30` | `'use client' … (30 lineas)` · 30/30 lineas conservadas en orden; el tramo igual mas largo (23) empieza en :1 |
| 13-01 | 802 | `src/lib/api/agent-fetch.ts:99-127` | cambiada | `src/lib/api/agent-fetch.ts:99-127` | `export async function agentFetch( … (29 lineas)` · 28/29 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :99 |
| 13-01 | 803 | `src/lib/api/piloto.ts:139-153` | cambiada | `src/lib/api/piloto.ts:160-174` | `export interface PilotoFetchResult<T> { … (15 lineas)` · 13/15 lineas conservadas en orden; el tramo igual mas largo (6) empieza en :160 |
| 13-01 | 803 | `src/lib/api/piloto.ts:337-363` | movida | `src/lib/api/piloto.ts:419-445` | `export async function putPilotoAutonomia( … (27 lineas)` · +82 lineas |
| 13-01 | 803 | `src/lib/api/retencion.ts:43-54` | cambiada | `src/lib/api/retencion.ts:26-37` | `export async function fetchDashboard( … (12 lineas)` · 2/12 lineas conservadas en orden; el tramo igual mas largo (2) empieza en :36 |
| 13-01 | 829 | `src/lib/api/retencion.ts:51` | cambiada | `src/lib/api/retencion.ts:72` | `} catch {` · la mas parecida (ratio 0.55): «cambio: {» |
| 13-01 | 917 | `src/components/estado/cuatro-estados.test.ts:25-67` | movida | `src/components/estado/cuatro-estados.test.ts:33-75` | ` … (43 lineas)` · +8 lineas |
| 13-01 | 1002 | `src/lib/nav/arquitectura-del-panel.test.ts:26-45` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:28-47` | `import { existsSync, readdirSync, readFileSync } from 'node:fs'; … (20 lineas)` · 19/20 lineas conservadas en orden; el tramo igual mas largo (8) empieza en :28 |
| 13-01 | 1002 | `src/lib/nav/arquitectura-del-panel.test.ts:63-77` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:72-86` | `function tienePagina(href: string): boolean { … (15 lineas)` · +9 lineas |
| 13-01 | 1024 | `src/lib/i18n/i18n-context.tsx:114-124` | movida | `src/lib/i18n/i18n-context.tsx:115-125` | `const formatDate = useCallback( … (11 lineas)` · +1 lineas |
| 13-01 | 1038 | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:474-494` | movida | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:498-518` | `{(artifactId ? [] : data.enlaces).map((enlace) => ( … (21 lineas)` · +24 lineas |
| 13-01 | 1121 | `src/lib/context/PermissionsContext.tsx:60-79` | movida | `src/lib/context/PermissionsContext.tsx:70-89` | `async function fetchAgentPermissions(agencyId: string): Promise<AgentPermissions…` · +10 lineas |
| 13-01 | 1121 | `src/lib/context/PermissionsContext.tsx:101-216` | cambiada | `src/lib/context/PermissionsContext.tsx:122-237` | `export function PermissionsProvider({ children }: { children: ReactNode }) { … (…` · 113/116 lineas conservadas en orden; el tramo igual mas largo (80) empieza en :158 |
| 13-01 | 1121 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 1121 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-01 | 1122 | `src/lib/i18n/i18n-context.tsx:37-45` | movida | `src/lib/i18n/i18n-context.tsx:38-46` | `* Supports {{param}} syntax … (9 lineas)` · +1 lineas |
| 13-01 | 1122 | `src/lib/i18n/i18n-context.tsx:75-84` | movida | `src/lib/i18n/i18n-context.tsx:76-85` | `const t = useCallback( … (10 lineas)` · +1 lineas |
| 13-01 | 1126 | `src/lib/context/PermissionsContext.test.tsx:20-104` | cambiada | `src/lib/context/PermissionsContext.test.tsx:27-111` | `true … (85 lineas)` · 84/85 lineas conservadas en orden; el tramo igual mas largo (40) empieza en :50 |
| 13-01 | 1152 | `src/lib/i18n/i18n-context.tsx:79` | movida | `src/lib/i18n/i18n-context.tsx:80` | `` console.warn(`[i18n] Missing translation for key: "${key}" in locale: "${locale}… `` · +1 lineas |
| 13-01 | 1250 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-01 | 1250 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-02 | 210 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-02 | 218 | `package.json:114` | movida | `package.json:111` | `"typescript": "^5",` · -3 lineas |
| 13-02 | 281 | `src/components/estado/FalloDeCarga.tsx:148` | movida | `src/components/estado/FalloDeCarga.tsx:177` | `data-testid="fallo-de-carga"` · +29 lineas |
| 13-02 | 282 | `src/lib/errores/clasificar.ts:141` | movida | `src/lib/errores/clasificar.ts:335` | `if (status === 403) {` · +194 lineas |
| 13-02 | 282 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-02 | 283 | `src/components/ui/empty-state.tsx:106` | movida | `src/components/ui/empty-state.tsx:123` | `data-testid="empty-state"` · +17 lineas |
| 13-02 | 284 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-02 | 284 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-02 | 290 | `src/lib/nav/arquitectura-del-panel.ts:295` | movida | `src/lib/nav/arquitectura-del-panel.ts:716` | `export function modulosDelPanel(): ModuloDelPanel[] {` · +421 lineas |
| 13-02 | 291 | `src/lib/nav/arquitectura-del-panel.ts:308` | movida | `src/lib/nav/arquitectura-del-panel.ts:739` | `export function pestanasDelModulo(m: ModuloDelPanel): PantallaDelPanel[] {` · +431 lineas |
| 13-02 | 292 | `src/lib/nav/agentWorkspaceNav.ts:103` | movida | `src/lib/nav/agentWorkspaceNav.ts:108` | `export const AGENT_WORKSPACES: AgentWorkspace[] = [` · +5 lineas |
| 13-02 | 372 | `src/components/estado/FalloDeCarga.tsx:36-68` | movida | `src/components/estado/FalloDeCarga.tsx:55-87` | ` … (33 lineas)` · +19 lineas |
| 13-02 | 372 | `src/components/estado/FalloDeCarga.tsx:76-83` | movida | `src/components/estado/FalloDeCarga.tsx:95-102` | `export function FalloDeCarga({ … (8 lineas)` · +19 lineas |
| 13-02 | 375 | `src/lib/errores/clasificar.ts:141-151` | cambiada | `src/lib/errores/clasificar.ts:464-474` | `if (status === 403) { … (11 lineas)` · 11/11 lineas conservadas en orden; el tramo igual mas largo (10) empieza en :465 |
| 13-02 | 375 | `src/lib/errores/clasificar.ts:147` | movida | `src/lib/errores/clasificar.ts:302` | `sePuedeReintentar: false,` · +155 lineas; 6 apariciones |
| 13-02 | 376 | `src/lib/errores/clasificar.ts:148` | movida | `src/lib/errores/clasificar.ts:303` | `status,` · +155 lineas; 9 apariciones |
| 13-02 | 376 | `src/lib/errores/clasificar.ts:149` | movida | `src/lib/errores/clasificar.ts:304` | `mensajeOriginal,` · +155 lineas; 9 apariciones |
| 13-02 | 377 | `src/lib/errores/clasificar.ts:134` | movida | `src/lib/errores/clasificar.ts:313` | `'Puede que se haya eliminado, o que el enlace esté mal. Revisa la dirección o vu…` · +179 lineas |
| 13-02 | 379 | `src/components/ui/empty-state.tsx:48-65` | cambiada | `src/components/ui/empty-state.tsx:49-66` | `export type EmptyStateAction = … (18 lineas)` · 18/18 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :49 |
| 13-02 | 379 | `src/components/ui/empty-state.tsx:90-120` | cambiada | `src/components/ui/empty-state.tsx:107-137` | `export function EmptyState({ … (31 lineas)` · 31/31 lineas conservadas en orden; el tramo igual mas largo (20) empieza en :113 |
| 13-02 | 386 | `src/app/panel/inmobiliaria/contratos/(retencion)/retencion/aviso-de-ejemplo.test.tsx:78` | archivo_no_existe | — | `const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]');` · borrado; sin rastro del texto en el arbol nuevo |
| 13-02 | 386 | `src/app/panel/inmobiliaria/contratos/(retencion)/retencion/aviso-de-ejemplo.test.tsx:88` | archivo_no_existe | — | `expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNu…` · borrado; sin rastro del texto en el arbol nuevo |
| 13-02 | 389 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-02 | 389 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-02 | 390 | `src/lib/context/PermissionsContext.tsx:262` | movida | `src/lib/context/PermissionsContext.tsx:287` | `export function usePermissionsContextSafe(): PermissionsContextValue \| null {` · +25 lineas |
| 13-02 | 399 | `src/lib/nav/arquitectura-del-panel.ts:94-137` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:228-271` | `export interface PantallaDelPanel { … (44 lineas)` · 43/44 lineas conservadas en orden; el tramo igual mas largo (14) empieza en :228 |
| 13-02 | 400 | `src/lib/nav/arquitectura-del-panel.ts:295` | movida | `src/lib/nav/arquitectura-del-panel.ts:716` | `export function modulosDelPanel(): ModuloDelPanel[] {` · +421 lineas |
| 13-02 | 400 | `src/lib/nav/arquitectura-del-panel.ts:308` | movida | `src/lib/nav/arquitectura-del-panel.ts:739` | `export function pestanasDelModulo(m: ModuloDelPanel): PantallaDelPanel[] {` · +431 lineas |
| 13-02 | 400 | `src/lib/nav/arquitectura-del-panel.ts:154` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:376` | `{ key: 'pipeline', labelKey: 'inmobiliaria.nav.pipelineCorto', href: r('/pipelin…` · la mas parecida (ratio 0.99): «key: 'pipeline', labelKey: 'inmobiliaria.nav.pipelineCorto', href: r('/pipeline'), icon: Kanban, module: 'pipeline', scope: 'comercial',» |
| 13-02 | 401 | `src/lib/nav/arquitectura-del-panel.ts:156` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:416` | `key: 'inmuebles', labelKey: 'inmobiliaria.nav.inmuebles', href: r('/inmuebles'),…` · la mas parecida (ratio 0.88): «{ key: 'inmuebles', labelKey: 'inmobiliaria.nav.inmuebles', href: r('/inmuebles'), icon: Buildings, module: 'portafolio', scope: 'comercial', dataTour» |
| 13-02 | 401 | `src/lib/nav/arquitectura-del-panel.ts:222` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:592` | `{ labelKey: 'inmobiliaria.nav.recaudo', href: r('/cobros/recaudo'), icon: Coins,…` · la mas parecida (ratio 0.89): «{ labelKey: 'inmobiliaria.nav.recaudo', href: r('/pagos/recaudo'), icon: Coins, module: 'cobros', cara: 'inquilinos' },» |
| 13-02 | 402 | `src/lib/nav/arquitectura-del-panel.ts:223` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:597` | `{ labelKey: 'inmobiliaria.nav.cartera', href: r('/cobros/cartera'), icon: Curren…` · la mas parecida (ratio 0.90): «{ labelKey: 'inmobiliaria.nav.cartera', href: r('/pagos/cartera'), icon: CurrencyCircleDollar, module: 'cobros', cara: 'inquilinos' },» |
| 13-02 | 402 | `src/lib/nav/arquitectura-del-panel.ts:224` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:343` | `{ labelKey: 'inmobiliaria.ai.nav.cobranza', href: r('/cobros/cobranza'), icon: C…` · la mas parecida (ratio 0.68): «{ key: 'cobranza', labelKey: 'inmobiliaria.ai.nav.cobranza', href: r('/pagos/cobranza'), icon: ChatCircleText, module: 'cobranza', scope: 'finanzas', » |
| 13-02 | 404 | `src/lib/nav/agentWorkspaceNav.ts:103` | movida | `src/lib/nav/agentWorkspaceNav.ts:108` | `export const AGENT_WORKSPACES: AgentWorkspace[] = [` · +5 lineas |
| 13-02 | 404 | `src/lib/nav/agentWorkspaceNav.ts:106` | movida | `src/lib/nav/agentWorkspaceNav.ts:111` | `slug: 'cobranza',` · +5 lineas |
| 13-02 | 672 | `src/lib/errores/clasificar.ts:134` | movida | `src/lib/errores/clasificar.ts:313` | `'Puede que se haya eliminado, o que el enlace esté mal. Revisa la dirección o vu…` · +179 lineas |
| 13-02 | 675 | `src/components/estado/FalloDeCarga.tsx:147` | movida | `src/components/estado/FalloDeCarga.tsx:176` | `role="alert"` · +29 lineas |
| 13-02 | 725 | `package.json:114` | movida | `package.json:111` | `"typescript": "^5",` · -3 lineas |
| 13-02 | 783 | `src/components/estado/EstadoDeDatos.tsx:45` | movida | `src/components/estado/EstadoDeDatos.tsx:48` | `conservarContenido?: boolean` · +3 lineas |
| 13-02 | 783 | `src/components/estado/EstadoDeDatos.tsx:58` | movida | `src/components/estado/EstadoDeDatos.tsx:75` | `conservarContenido = false,` · +17 lineas |
| 13-02 | 950 | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:474-494` | movida | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:498-518` | `{(artifactId ? [] : data.enlaces).map((enlace) => ( … (21 lineas)` · +24 lineas |
| 13-02 | 971 | `src/lib/format.ts:64-76` | movida | `src/lib/format.ts:84-96` | `export function formatDateTime(dateString: string, locale?: 'es' \| 'en'): string…` · +20 lineas |
| 13-02 | 982 | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:474-494` | movida | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:498-518` | `{(artifactId ? [] : data.enlaces).map((enlace) => ( … (21 lineas)` · +24 lineas |
| 13-02 | 1197 | `src/components/beta/AssistantBubble.tsx:171-213` | cambiada | `src/components/beta/AssistantBubble.tsx:1-43` | `<Tooltip content={t('beta.actions.like')}> … (43 lineas)` · 1/43 lineas conservadas en orden; el tramo igual mas largo (1) empieza en :2 |
| 13-02 | 1197 | `src/lib/hooks/useBetaChat.ts:1474-1487` | cambiada | `src/lib/hooks/useBetaChat.ts:2405-2418` | `/** Marca el pulgar. Volver a tocar el mismo pulgar lo quita. */ … (14 lineas)` · 11/14 lineas conservadas en orden; el tramo igual mas largo (5) empieza en :2414 |
| 13-02 | 1313 | `src/components/estado/cuatro-estados.test.ts:30-66` | movida | `src/components/estado/cuatro-estados.test.ts:38-74` | `` * ¿Este hook de `@/lib/hooks` sale a la red? … (37 lineas) `` · +8 lineas |
| 13-02 | 1452 | `package.json:114` | movida | `package.json:111` | `"typescript": "^5",` · -3 lineas |
| 13-03 | 14 | `src/lib/nav/arquitectura-del-panel.test.ts:63-89` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:72-98` | `function tienePagina(href: string): boolean { … (27 lineas)` · 26/27 lineas conservadas en orden; el tramo igual mas largo (16) empieza en :72 |
| 13-03 | 164 | `src/lib/nav/arquitectura-del-panel.test.ts:252-265` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:327-340` | `` it('cada pantalla con `agente` es un workspace registrado en la misma ruta', () … `` · +75 lineas |
| 13-03 | 220 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-03 | 309 | `src/lib/nav/arquitectura-del-panel.ts:263` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:666` | `key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), ic…` · la mas parecida (ratio 0.89): «key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), icon: ChartLine, module: 'reportes', scope: 'general', dataTourTarget: '» |
| 13-03 | 310 | `src/lib/nav/arquitectura-del-panel.ts:270` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:365` | `{ labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: Chart…` · la mas parecida (ratio 0.84): «{ key: 'desempeno-ia', labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics', scope: 'general' },» |
| 13-03 | 310 | `src/lib/nav/arquitectura-del-panel.ts:33` | movida | `src/lib/nav/arquitectura-del-panel.ts:32` | `TrendUp,` · -1 lineas |
| 13-03 | 311 | `src/lib/nav/agentWorkspaceNav.ts:58` | movida | `src/lib/nav/agentWorkspaceNav.ts:60` | `export interface WorkspaceNavItem {` · +2 lineas |
| 13-03 | 311 | `src/lib/nav/agentWorkspaceNav.ts:70` | movida | `src/lib/nav/agentWorkspaceNav.ts:72` | `dataTourTarget?: string;` · +2 lineas |
| 13-03 | 311 | `src/lib/nav/agentWorkspaceNav.ts:100` | movida | `src/lib/nav/agentWorkspaceNav.ts:105` | `` const PAGOS = `${PANEL}/pagos`; `` · +5 lineas |
| 13-03 | 312 | `src/lib/nav/agentWorkspaceNav.ts:103` | movida | `src/lib/nav/agentWorkspaceNav.ts:108` | `export const AGENT_WORKSPACES: AgentWorkspace[] = [` · +5 lineas |
| 13-03 | 312 | `src/lib/nav/agentWorkspaceNav.ts:253` | movida | `src/lib/nav/agentWorkspaceNav.ts:256` | `// ── Mantenimiento (tickets) — APAGADO ─────────────────────────────────────` · +3 lineas |
| 13-03 | 313 | `src/lib/nav/agentWorkspaceNav.ts:452` | movida | `src/lib/nav/agentWorkspaceNav.ts:589` | `export function findAgentWorkspace(pathname: string): AgentWorkspace \| null {` · +137 lineas |
| 13-03 | 315 | `src/components/tour/AgentIntroModal.tsx:36` | movida | `src/components/tour/AgentIntroModal.tsx:49` | `export const AGENT_INTROS: AgentIntroConfig[] = [` · +13 lineas |
| 13-03 | 316 | `src/components/tour/AgentIntroModal.tsx:84` | movida | `src/components/tour/AgentIntroModal.tsx:103` | `image: '/images/features/leasefy-brand-08.jpg',` · +19 lineas |
| 13-03 | 318 | `src/components/auth/PageGuard.tsx:39` | cambiada | `src/components/auth/PageGuard.tsx:43` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · la mas parecida (ratio 0.96): «export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {» |
| 13-03 | 320 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:46` | movida | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:53` | `` const fichaSuelta = current == null && pathname.startsWith(`${ws.basePath}/`); `` · +7 lineas |
| 13-03 | 322 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-03 | 325 | `src/lib/nav/arquitectura-del-panel.test.ts:202` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:238` | `expect(modulos).toHaveLength(17);` · la mas parecida (ratio 0.95): «expect(modulos).toHaveLength(25);» |
| 13-03 | 326 | `src/components/ui/badge.tsx:67` | movida | `src/components/ui/badge.tsx:94` | `export { Badge }` · +27 lineas |
| 13-03 | 328 | `src/app/panel/inmobiliaria/inquilinos/page.tsx:194` | movida | `src/app/panel/inmobiliaria/inquilinos/page.tsx:196` | `const searchParams = useSearchParams();` · +2 lineas |
| 13-03 | 429 | `src/lib/nav/arquitectura-del-panel.ts:263-271` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:666-674` | `key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), ic…` · 6/9 lineas conservadas en orden; el tramo igual mas largo (5) empieza en :667 |
| 13-03 | 431 | `src/lib/nav/arquitectura-del-panel.ts:146` | movida | `src/lib/nav/arquitectura-del-panel.ts:313` | `` const r = (p: string) => `${PANEL}${p}`; `` · +167 lineas |
| 13-03 | 431 | `src/lib/nav/arquitectura-del-panel.ts:2-34` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:1-33` | `import { … (33 lineas)` · 31/33 lineas conservadas en orden; el tramo igual mas largo (11) empieza en :22 |
| 13-03 | 431 | `src/lib/nav/arquitectura-del-panel.ts:33` | movida | `src/lib/nav/arquitectura-del-panel.ts:32` | `TrendUp,` · -1 lineas |
| 13-03 | 432 | `src/lib/nav/agentWorkspaceNav.ts:58-71` | movida | `src/lib/nav/agentWorkspaceNav.ts:60-73` | `export interface WorkspaceNavItem { … (14 lineas)` · +2 lineas |
| 13-03 | 433 | `src/lib/nav/agentWorkspaceNav.ts:73-91` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:78-96` | `export interface AgentWorkspace { … (19 lineas)` · 15/19 lineas conservadas en orden; el tramo igual mas largo (9) empieza en :88 |
| 13-03 | 433 | `src/lib/nav/agentWorkspaceNav.ts:93-101` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:98-106` | `const PANEL = '/panel/inmobiliaria'; … (9 lineas)` · 7/9 lineas conservadas en orden; el tramo igual mas largo (3) empieza en :100 |
| 13-03 | 434 | `src/lib/nav/agentWorkspaceNav.ts:103-274` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:123-294` | `export const AGENT_WORKSPACES: AgentWorkspace[] = [ … (172 lineas)` · 123/172 lineas conservadas en orden; el tramo igual mas largo (34) empieza en :181 |
| 13-03 | 434 | `src/lib/nav/agentWorkspaceNav.ts:230-252` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:197-219` | `{ … (23 lineas)` · 6/23 lineas conservadas en orden; el tramo igual mas largo (3) empieza en :203 |
| 13-03 | 434 | `src/lib/nav/agentWorkspaceNav.ts:253-273` | movida | `src/lib/nav/agentWorkspaceNav.ts:256-276` | `// ── Mantenimiento (tickets) — APAGADO ───────────────────────────────────── … …` · +3 lineas |
| 13-03 | 434 | `src/lib/nav/agentWorkspaceNav.ts:452-461` | movida | `src/lib/nav/agentWorkspaceNav.ts:589-598` | `export function findAgentWorkspace(pathname: string): AgentWorkspace \| null { … …` · +137 lineas |
| 13-03 | 436 | `src/lib/api/ai-hub-chat.ts:166` | cambiada | `src/lib/api/ai-hub-chat.ts:556` | `const ws = slug ? AGENT_WORKSPACES.find((w) => w.slug === slug) : undefined;` · la mas parecida (ratio 0.46): «const code = typeof cuerpo?.code === 'string' ? cuerpo.code : undefined;» |
| 13-03 | 441 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:22-62` | cambiada | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:29-69` | `export function AgentHeaderBreadcrumb() { … (41 lineas)` · 41/41 lineas conservadas en orden; el tramo igual mas largo (28) empieza en :29 |
| 13-03 | 442 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:46` | movida | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:53` | `` const fichaSuelta = current == null && pathname.startsWith(`${ws.basePath}/`); `` · +7 lineas |
| 13-03 | 443 | `src/components/tour/AgentIntroModal.tsx:24-86` | cambiada | `src/components/tour/AgentIntroModal.tsx:37-99` | `export interface AgentIntroConfig { … (63 lineas)` · 62/63 lineas conservadas en orden; el tramo igual mas largo (53) empieza en :39 |
| 13-03 | 445 | `src/components/auth/PageGuard.tsx:39-65` | cambiada | `src/components/auth/PageGuard.tsx:93-119` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · 17/27 lineas conservadas en orden; el tramo igual mas largo (7) empieza en :111 |
| 13-03 | 449 | `src/lib/nav/arquitectura-del-panel.test.ts:63-89` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:72-98` | `function tienePagina(href: string): boolean { … (27 lineas)` · 26/27 lineas conservadas en orden; el tramo igual mas largo (16) empieza en :72 |
| 13-03 | 449 | `src/lib/nav/arquitectura-del-panel.test.ts:160-167` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:171-178` | `it('dentro de un módulo ninguna pestaña repite icono ni nombre', () => { … (8 li…` · +11 lineas |
| 13-03 | 450 | `src/lib/nav/arquitectura-del-panel.test.ts:175-188` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:186-199` | `it('toda clave i18n del sidebar y de las pestañas existe en es y en en', () => {…` · +11 lineas |
| 13-03 | 450 | `src/lib/nav/arquitectura-del-panel.test.ts:202` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:238` | `expect(modulos).toHaveLength(17);` · la mas parecida (ratio 0.95): «expect(modulos).toHaveLength(25);» |
| 13-03 | 450 | `src/lib/nav/arquitectura-del-panel.test.ts:221-248` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:287-314` | `it('la etiqueta y la ruta se escriben igual (R4): el segmento sale del nombre', …` · 27/28 lineas conservadas en orden; el tramo igual mas largo (17) empieza en :287 |
| 13-03 | 450 | `src/lib/nav/arquitectura-del-panel.test.ts:252-269` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:327-344` | `` it('cada pantalla con `agente` es un workspace registrado en la misma ruta', () … `` · 16/18 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :327 |
| 13-03 | 451 | `src/lib/nav/arquitectura-del-panel.test.ts:336-342` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:507-513` | `it('ninguna pantalla cuyo nombre termina en «IA» lleva además ia: true', () => {…` · +171 lineas |
| 13-03 | 453 | `src/components/estado/cuatro-estados.test.ts:43` | movida | `src/components/estado/cuatro-estados.test.ts:51` | `const HOOK_HABLA_CON_LA_RED = /useApiData\|apiClient\|agentAuthHeaders\|fetch\(\|@\/…` · +8 lineas |
| 13-03 | 453 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-03 | 454 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-03 | 458 | `src/app/panel/inmobiliaria/inquilinos/page.tsx:194-195` | movida | `src/app/panel/inmobiliaria/inquilinos/page.tsx:196-197` | `const searchParams = useSearchParams(); … (2 lineas)` · +2 lineas |
| 13-03 | 615 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-03 | 734 | `src/lib/nav/arquitectura-del-panel.test.ts:63-89` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:72-98` | `function tienePagina(href: string): boolean { … (27 lineas)` · 26/27 lineas conservadas en orden; el tramo igual mas largo (16) empieza en :72 |
| 13-03 | 784 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:46` | movida | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:53` | `` const fichaSuelta = current == null && pathname.startsWith(`${ws.basePath}/`); `` · +7 lineas |
| 13-03 | 834 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-03 | 1220 | `src/components/estado/cuatro-estados.test.ts:43` | movida | `src/components/estado/cuatro-estados.test.ts:51` | `const HOOK_HABLA_CON_LA_RED = /useApiData\|apiClient\|agentAuthHeaders\|fetch\(\|@\/…` · +8 lineas |
| 13-03 | 1220 | `src/components/estado/cuatro-estados.test.ts:74-76` | movida | `src/components/estado/cuatro-estados.test.ts:82-84` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/ … (3 lineas)` · +8 lineas |
| 13-03 | 1220 | `src/app/panel/inmobiliaria/inquilinos/page.tsx:194-195` | movida | `src/app/panel/inmobiliaria/inquilinos/page.tsx:196-197` | `const searchParams = useSearchParams(); … (2 lineas)` · +2 lineas |
| 13-03 | 1251 | `src/app/panel/inmobiliaria/inquilinos/page.tsx:194-195` | movida | `src/app/panel/inmobiliaria/inquilinos/page.tsx:196-197` | `const searchParams = useSearchParams(); … (2 lineas)` · +2 lineas |
| 13-03 | 1364 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:46` | movida | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:53` | `` const fichaSuelta = current == null && pathname.startsWith(`${ws.basePath}/`); `` · +7 lineas |
| 13-03 | 1518 | `src/lib/nav/agentWorkspaceNav.ts:58-91` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:60-93` | `export interface WorkspaceNavItem { … (34 lineas)` · 30/34 lineas conservadas en orden; el tramo igual mas largo (21) empieza en :60 |
| 13-03 | 1518 | `src/lib/nav/agentWorkspaceNav.ts:103-274` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:123-294` | `export const AGENT_WORKSPACES: AgentWorkspace[] = [ … (172 lineas)` · 123/172 lineas conservadas en orden; el tramo igual mas largo (34) empieza en :181 |
| 13-03 | 1518 | `src/lib/nav/agentWorkspaceNav.ts:452-461` | movida | `src/lib/nav/agentWorkspaceNav.ts:589-598` | `export function findAgentWorkspace(pathname: string): AgentWorkspace \| null { … …` · +137 lineas |
| 13-03 | 1518 | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:22-62` | cambiada | `src/components/inmobiliaria/ai/AgentHeaderBreadcrumb.tsx:29-69` | `export function AgentHeaderBreadcrumb() { … (41 lineas)` · 41/41 lineas conservadas en orden; el tramo igual mas largo (28) empieza en :29 |
| 13-03 | 1518 | `src/components/tour/AgentIntroModal.tsx:24-86` | cambiada | `src/components/tour/AgentIntroModal.tsx:37-99` | `export interface AgentIntroConfig { … (63 lineas)` · 62/63 lineas conservadas en orden; el tramo igual mas largo (53) empieza en :39 |
| 13-04 | 172 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-04 | 229 | `src/lib/hooks/useBetaChat.ts:1474-1487` | cambiada | `src/lib/hooks/useBetaChat.ts:2405-2418` | `/** Marca el pulgar. Volver a tocar el mismo pulgar lo quita. */ … (14 lineas)` · 11/14 lineas conservadas en orden; el tramo igual mas largo (5) empieza en :2414 |
| 13-04 | 278 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-04 | 279 | `src/components/ui/badge.tsx:67` | movida | `src/components/ui/badge.tsx:94` | `export { Badge }` · +27 lineas |
| 13-04 | 280 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-04 | 280 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-04 | 472 | `src/app/panel/inmobiliaria/cobros/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx:28-32` | archivo_no_existe | `src/app/panel/inmobiliaria/pagos/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx:28-32` | `vi.mock('next/navigation', () => ({ … (5 lineas)` · renombrado a src/app/panel/inmobiliaria/pagos/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx (R100); alli: igual |
| 13-04 | 473 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-04 | 474 | `src/components/ui/badge.tsx:67` | movida | `src/components/ui/badge.tsx:94` | `export { Badge }` · +27 lineas |
| 13-04 | 475 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-04 | 475 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-04 | 476 | `src/components/estado/cuatro-estados.test.ts:41-86` | movida | `src/components/estado/cuatro-estados.test.ts:49-94` | `* sigue valiendo cuando alguien agregue el próximo hook de UI. … (46 lineas)` · +8 lineas |
| 13-04 | 484 | `src/app/panel/inmobiliaria/cobros/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx:20-45` | archivo_no_existe | `src/app/panel/inmobiliaria/pagos/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx:20-45` | `useAuth: () => ({ … (26 lineas)` · renombrado a src/app/panel/inmobiliaria/pagos/cobranza/siniestros/[id]/SiniestroApprovalClient.test.tsx (R100); alli: igual |
| 13-04 | 485 | `package.json:112` | movida | `package.json:109` | `"tailwindcss": "^3.4.0",` · -3 lineas |
| 13-04 | 675 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-05 | 314 | `src/components/auth/PageGuard.tsx:39` | cambiada | `src/components/auth/PageGuard.tsx:43` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · la mas parecida (ratio 0.96): «export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {» |
| 13-05 | 317 | `src/app/panel/inmobiliaria/cobros/cobranza/arco/[id]/page.tsx:419` | archivo_no_existe | `src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx:419` | `<AlertDialogAction onClick={() => void handleReject()} tone="danger">` · renombrado a src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx (R098); alli: igual |
| 13-05 | 321 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-05 | 322 | `src/components/ui/badge.tsx:67` | movida | `src/components/ui/badge.tsx:94` | `export { Badge }` · +27 lineas |
| 13-05 | 323 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-05 | 324 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-05 | 326 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-05 | 327 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-05 | 328 | `src/components/ui/sin-dialogos-del-navegador.test.ts:40` | movida | `src/components/ui/sin-dialogos-del-navegador.test.ts:48` | `const LLAMADA_NATIVA = /\bwindow\.(confirm\|alert\|prompt)\s*\(/` · +8 lineas |
| 13-05 | 489 | `src/app/panel/inmobiliaria/cobros/cobranza/arco/[id]/page.tsx:419` | archivo_no_existe | `src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx:419` | `<AlertDialogAction onClick={() => void handleReject()} tone="danger">` · renombrado a src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx (R098); alli: igual |
| 13-05 | 492 | `src/components/ui/sin-dialogos-del-navegador.test.ts:40` | movida | `src/components/ui/sin-dialogos-del-navegador.test.ts:48` | `const LLAMADA_NATIVA = /\bwindow\.(confirm\|alert\|prompt)\s*\(/` · +8 lineas |
| 13-05 | 497 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-05 | 500 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-05 | 500 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-05 | 766 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-05 | 939 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-06 | 158 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-06 | 224 | `src/lib/hooks/useBetaChat.ts:88` | movida | `src/lib/hooks/useBetaChat.ts:122` | `const STORAGE_KEY = 'leasefy-beta-conversations';` · +34 lineas |
| 13-06 | 231 | `src/lib/hooks/useBetaChat.ts:596-603` | movida | `src/lib/hooks/useBetaChat.ts:844-851` | `// despachos). La pasada final CONTINÚA desde donde quedó ésta en vez de … (8 li…` · +248 lineas |
| 13-06 | 273 | `src/lib/types/beta-chat.ts:261` | movida | `src/lib/types/beta-chat.ts:302` | `export interface ChatMessage {` · +41 lineas |
| 13-06 | 279 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-06 | 281 | `src/components/auth/PageGuard.tsx:39` | cambiada | `src/components/auth/PageGuard.tsx:43` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · la mas parecida (ratio 0.96): «export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {» |
| 13-06 | 286 | `src/components/estado/cuatro-estados.test.ts:43` | movida | `src/components/estado/cuatro-estados.test.ts:51` | `const HOOK_HABLA_CON_LA_RED = /useApiData\|apiClient\|agentAuthHeaders\|fetch\(\|@\/…` · +8 lineas |
| 13-06 | 286 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-06 | 286 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-06 | 288 | `src/lib/nav/arquitectura-del-panel.test.ts:85` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:96` | `'pestaña del agente %s → %s tiene su page.tsx',` · +11 lineas |
| 13-06 | 290 | `src/lib/hooks/useBetaChat.ts:88` | movida | `src/lib/hooks/useBetaChat.ts:122` | `const STORAGE_KEY = 'leasefy-beta-conversations';` · +34 lineas |
| 13-06 | 290 | `package.json:76` | cambiada | `package.json:73` | `"next": "14.2.35",` · la mas parecida (ratio 0.82): «"next": "15.5.26",» |
| 13-06 | 291 | `src/app/globals.css:1598` | movida | `src/app/globals.css:1614` | `--border-faint: #eceae6;` · +16 lineas |
| 13-06 | 455 | `src/lib/types/beta-chat.ts:261` | movida | `src/lib/types/beta-chat.ts:302` | `export interface ChatMessage {` · +41 lineas |
| 13-06 | 458 | `src/lib/hooks/useBetaChat.ts:88` | movida | `src/lib/hooks/useBetaChat.ts:122` | `const STORAGE_KEY = 'leasefy-beta-conversations';` · +34 lineas |
| 13-06 | 465 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-06 | 467 | `src/components/auth/PageGuard.tsx:39` | cambiada | `src/components/auth/PageGuard.tsx:43` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · la mas parecida (ratio 0.96): «export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {» |
| 13-06 | 473 | `src/components/estado/cuatro-estados.test.ts:43-76` | movida | `src/components/estado/cuatro-estados.test.ts:51-84` | `const HOOK_HABLA_CON_LA_RED = /useApiData\|apiClient\|agentAuthHeaders\|fetch\(\|@\/…` · +8 lineas |
| 13-06 | 479 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-06 | 479 | `src/app/panel/inmobiliaria/reportes/page.tsx:175` | movida | `src/app/panel/inmobiliaria/reportes/page.tsx:189` | `const flujoCajaReport = useFlujoCajaReport('semester');` · +14 lineas |
| 13-06 | 480 | `src/app/panel/inmobiliaria/reportes/page.tsx:160` | movida | `src/app/panel/inmobiliaria/reportes/page.tsx:174` | `const advancedTabs: { key: AdvancedTab; label: string; icon: typeof Buildings }[…` · +14 lineas |
| 13-06 | 481 | `src/app/globals.css:1598` | movida | `src/app/globals.css:1614` | `--border-faint: #eceae6;` · +16 lineas |
| 13-06 | 718 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-06 | 1571 | `src/lib/hooks/useBetaChat.ts:88` | movida | `src/lib/hooks/useBetaChat.ts:122` | `const STORAGE_KEY = 'leasefy-beta-conversations';` · +34 lineas |
| 13-07 | 261 | `src/components/inmobiliaria/ai/lessons/ChatLessonCard.tsx:222-243` | movida | `src/components/inmobiliaria/ai/lessons/ChatLessonCard.tsx:225-246` | `<Button … (22 lineas)` · +3 lineas |
| 13-07 | 327 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-07 | 328 | `src/components/ui/badge.tsx:67` | movida | `src/components/ui/badge.tsx:94` | `export { Badge }` · +27 lineas |
| 13-07 | 329 | `src/components/auth/PageGuard.tsx:39` | cambiada | `src/components/auth/PageGuard.tsx:43` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, c…` · la mas parecida (ratio 0.96): «export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {» |
| 13-07 | 330 | `src/lib/context/PermissionsContext.tsx:40` | movida | `src/lib/context/PermissionsContext.tsx:41` | `canAccess: (module: string, action: string) => boolean;` · +1 lineas |
| 13-07 | 330 | `src/lib/context/PermissionsContext.tsx:253` | movida | `src/lib/context/PermissionsContext.tsx:278` | `export function usePermissionsContext(): PermissionsContextValue {` · +25 lineas |
| 13-07 | 335 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-07 | 335 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-07 | 337 | `src/components/ui/sin-dialogos-del-navegador.test.ts:40` | movida | `src/components/ui/sin-dialogos-del-navegador.test.ts:48` | `const LLAMADA_NATIVA = /\bwindow\.(confirm\|alert\|prompt)\s*\(/` · +8 lineas |
| 13-07 | 338 | `src/lib/nav/arquitectura-del-panel.test.ts:85` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:96` | `'pestaña del agente %s → %s tiene su page.tsx',` · +11 lineas |
| 13-07 | 340 | `package.json:76` | cambiada | `package.json:73` | `"next": "14.2.35",` · la mas parecida (ratio 0.82): «"next": "15.5.26",» |
| 13-07 | 529 | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:232-252` | movida | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:258-278` | `<DropdownList open={kebabOpen} onOpenChange={setKebabOpen}> … (21 lineas)` · +26 lineas |
| 13-07 | 535 | `src/app/panel/inmobiliaria/inquilinos/page.tsx:194` | movida | `src/app/panel/inmobiliaria/inquilinos/page.tsx:196` | `const searchParams = useSearchParams();` · +2 lineas |
| 13-07 | 537 | `src/components/ui/empty-state.tsx:90` | movida | `src/components/ui/empty-state.tsx:106` | `export function EmptyState({` · +16 lineas |
| 13-07 | 538 | `src/components/estado/cuatro-estados.test.ts:43` | movida | `src/components/estado/cuatro-estados.test.ts:51` | `const HOOK_HABLA_CON_LA_RED = /useApiData\|apiClient\|agentAuthHeaders\|fetch\(\|@\/…` · +8 lineas |
| 13-07 | 538 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-07 | 538 | `src/components/estado/cuatro-estados.test.ts:76` | movida | `src/components/estado/cuatro-estados.test.ts:84` | `const MIRA_EL_ERROR = /\berror\b\|isError/` · +8 lineas |
| 13-07 | 544 | `src/lib/nav/agentWorkspaceNav.ts:1-34` | cambiada | `src/lib/nav/agentWorkspaceNav.ts:1-34` | `import type { Icon } from '@phosphor-icons/react'; … (34 lineas)` · 32/34 lineas conservadas en orden; el tramo igual mas largo (23) empieza en :1 |
| 13-07 | 839 | `src/lib/nav/arquitectura-del-panel.test.ts:84-89` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:95-100` | `it.each(AGENT_WORKSPACES.flatMap((w) => w.items.map((i) => [w.slug, i.href] as c…` · +11 lineas |
| 13-07 | 1017 | `src/components/estado/cuatro-estados.test.ts:74` | movida | `src/components/estado/cuatro-estados.test.ts:82` | `const PINTA_VACIO = /EmptyState\|Sin .*aún\|No hay/` · +8 lineas |
| 13-07 | 1436 | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:232-252` | movida | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:258-278` | `<DropdownList open={kebabOpen} onOpenChange={setKebabOpen}> … (21 lineas)` · +26 lineas |
| 13-07 | 1436 | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:238-270` | movida | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:264-296` | `` aria-label={`Acciones para ${row.global.name}`} … (33 lineas) `` · +26 lineas |
| 13-07 | 1498 | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:232-252` | movida | `src/components/inmobiliaria/cotizador/CarrierRegistryTable.tsx:258-278` | `<DropdownList open={kebabOpen} onOpenChange={setKebabOpen}> … (21 lineas)` · +26 lineas |
| 13-08 | 210 | `src/components/tour/AgentIntroModal.tsx:88` | cambiada | `src/components/tour/AgentIntroModal.tsx:49` | `const STORAGE_PREFIX = 'leasefy.agent-intro.'` · la mas parecida (ratio 0.43): «export const AGENT_INTROS: AgentIntroConfig[] = [» |
| 13-08 | 212 | `src/lib/context/PermissionsContext.tsx:61` | movida | `src/lib/context/PermissionsContext.tsx:71` | `const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;` · +10 lineas |
| 13-08 | 213 | `src/lib/context/PermissionsContext.tsx:62` | movida | `src/lib/context/PermissionsContext.tsx:72` | `if (!agentUrl) return null;` · +10 lineas |
| 13-08 | 214 | `src/app/panel/inmobiliaria/layout.tsx:312` | cambiada | `src/app/panel/inmobiliaria/layout.tsx:345` | `<main id="main-content" tabIndex={-1}>` · la mas parecida (ratio 0.73): «id="main-content"» |
| 13-08 | 215 | `next.config.mjs:16` | movida | `next.config.mjs:19` | `...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),` · +3 lineas |
| 13-08 | 216 | `next.config.mjs:36` | movida | `next.config.mjs:58` | `typescript: { ignoreBuildErrors: true },` · +22 lineas |
| 13-08 | 216 | `next.config.mjs:37` | movida | `next.config.mjs:59` | `eslint: { ignoreDuringBuilds: true },` · +22 lineas |
| 13-08 | 217 | `package.json:97` | movida | `package.json:94` | `"@axe-core/playwright": "4.11.3",` · -3 lineas |
| 13-08 | 218 | `package.json:98` | movida | `package.json:95` | `"@playwright/test": "^1.60.0",` · -3 lineas |
| 13-08 | 282 | `src/app/panel/inmobiliaria/layout.tsx:312-316` | cambiada | `src/app/panel/inmobiliaria/layout.tsx:348-352` | `<main id="main-content" tabIndex={-1}> … (5 lineas)` · 4/5 lineas conservadas en orden; el tramo igual mas largo (4) empieza en :349 |
| 13-08 | 287 | `src/lib/context/PermissionsContext.tsx:61-62` | movida | `src/lib/context/PermissionsContext.tsx:71-72` | `const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL; … (2 lineas)` · +10 lineas |
| 13-08 | 289 | `src/components/tour/AgentIntroModal.tsx:88-100` | cambiada | `src/components/tour/AgentIntroModal.tsx:38-50` | `const STORAGE_PREFIX = 'leasefy.agent-intro.' … (13 lineas)` · 3/13 lineas conservadas en orden; el tramo igual mas largo (2) empieza en :46 |
| 13-08 | 292 | `next.config.mjs:10-16` | movida | `next.config.mjs:13-19` | `/** @type {import('next').NextConfig} */ … (7 lineas)` · +3 lineas |
| 13-08 | 292 | `next.config.mjs:36-37` | movida | `next.config.mjs:58-59` | `typescript: { ignoreBuildErrors: true }, … (2 lineas)` · +22 lineas |
| 13-08 | 352 | `src/components/tour/AgentIntroModal.tsx:88` | cambiada | `src/components/tour/AgentIntroModal.tsx:49` | `const STORAGE_PREFIX = 'leasefy.agent-intro.'` · la mas parecida (ratio 0.43): «export const AGENT_INTROS: AgentIntroConfig[] = [» |
| 13-08 | 438 | `src/lib/context/PermissionsContext.tsx:61-77` | movida | `src/lib/context/PermissionsContext.tsx:71-87` | `const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL; … (17 lineas)` · +10 lineas |
| 13-08 | 464 | `next.config.mjs:10-16` | movida | `next.config.mjs:13-19` | `/** @type {import('next').NextConfig} */ … (7 lineas)` · +3 lineas |
| 13-08 | 464 | `next.config.mjs:36-37` | movida | `next.config.mjs:58-59` | `typescript: { ignoreBuildErrors: true }, … (2 lineas)` · +22 lineas |
| 13-08 | 525 | `src/lib/nav/arquitectura-del-panel.test.ts:98-127` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:109-138` | `it('el código tampoco enlaza a /panel/inmobiliaria/ai (el namespace murió)', () …` · +11 lineas |
| 13-08 | 877 | `next.config.mjs:10-16` | movida | `next.config.mjs:13-19` | `/** @type {import('next').NextConfig} */ … (7 lineas)` · +3 lineas |
| 13-08 | 877 | `next.config.mjs:36-37` | movida | `next.config.mjs:58-59` | `typescript: { ignoreBuildErrors: true }, … (2 lineas)` · +22 lineas |
| 13-CONTEXT | 41 | `src/lib/nav/rutas-por-ciclo-de-vida.data.mjs:69-70` | movida | `src/lib/nav/rutas-por-ciclo-de-vida.data.mjs:74-75` | `// El hub /ai (la vitrina de agentes) — va ÚLTIMO entre las de /ai: es exacto. ……` · +5 lineas |
| 13-CONTEXT | 42 | `src/lib/nav/arquitectura-del-panel.test.ts:98` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:109` | `it('el código tampoco enlaza a /panel/inmobiliaria/ai (el namespace murió)', () …` · +11 lineas |
| 13-CONTEXT | 44 | `src/lib/nav/arquitectura-del-panel.ts:37-80` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:49-92` | ` … (44 lineas)` · 31/44 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :49 |
| 13-CONTEXT | 48 | `src/lib/nav/arquitectura-del-panel.test.ts:202` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:238` | `expect(modulos).toHaveLength(17);` · la mas parecida (ratio 0.95): «expect(modulos).toHaveLength(25);» |
| 13-CONTEXT | 62 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-CONTEXT | 63 | `src/components/auth/PageGuard.tsx:48` | movida | `src/components/auth/PageGuard.tsx:57` | `const hasAccess = isAdmin \|\| (adminOnly ? false : moduleAllowed && roleAllowed);` · +9 lineas |
| 13-CONTEXT | 66 | `src/lib/api/retencion.ts:51` | cambiada | `src/lib/api/retencion.ts:72` | `} catch {` · la mas parecida (ratio 0.55): «cambio: {» |
| 13-CONTEXT | 90 | `src/lib/nav/arquitectura-del-panel.ts:263` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:666` | `key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), ic…` · la mas parecida (ratio 0.89): «key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), icon: ChartLine, module: 'reportes', scope: 'general', dataTourTarget: '» |
| 13-CONTEXT | 123 | `src/lib/api/piloto.ts:3-26` | cambiada | `src/lib/api/piloto.ts:3-26` | `/** … (24 lineas)` · 24/24 lineas conservadas en orden; el tramo igual mas largo (21) empieza en :3 |
| 13-CONTEXT | 136 | `src/lib/nav/arquitectura-del-panel.test.ts:63-77` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:72-86` | `function tienePagina(href: string): boolean { … (15 lineas)` · +9 lineas |
| 13-CONTEXT | 137 | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:474-494` | movida | `src/components/inmobiliaria/piloto/PilotoCajon.tsx:498-518` | `{(artifactId ? [] : data.enlaces).map((enlace) => ( … (21 lineas)` · +24 lineas |
| 13-CONTEXT | 343 | `src/lib/context/PermissionsContext.tsx:197` | movida | `src/lib/context/PermissionsContext.tsx:218` | `if (isAgentModule(module)) {` · +21 lineas |
| 13-CONTEXT | 343 | `src/lib/context/PermissionsContext.tsx:204` | movida | `src/lib/context/PermissionsContext.tsx:225` | `if (permissions.isAdmin) return true;` · +21 lineas |
| 13-CONTEXT | 371 | `src/lib/nav/arquitectura-del-panel.test.ts:202` | cambiada | `src/lib/nav/arquitectura-del-panel.test.ts:238` | `expect(modulos).toHaveLength(17);` · la mas parecida (ratio 0.95): «expect(modulos).toHaveLength(25);» |
| 13-UI-SPEC | 25 | `package.json:31` | movida | `package.json:30` | `"@leasefy/cadence": "file:../cadence",` · -1 lineas |
| 13-UI-SPEC | 66 | `src/lib/nav/arquitectura-del-panel.test.ts:91-98` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:102-109` | `it('ninguna ruta vive bajo /ai/', () => { … (8 lineas)` · +11 lineas |
| 13-UI-SPEC | 68 | `src/lib/nav/arquitectura-del-panel.ts:37-80` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:49-92` | ` … (44 lineas)` · 31/44 lineas conservadas en orden; el tramo igual mas largo (15) empieza en :49 |
| 13-UI-SPEC | 68 | `src/lib/nav/arquitectura-del-panel.ts:79` | movida | `src/lib/nav/arquitectura-del-panel.ts:119` | `` * · Inicio (`/piloto`) y Chat (`/`) viven en el layout, no acá: no se tocan. `` · +40 lineas |
| 13-UI-SPEC | 76 | `src/lib/nav/arquitectura-del-panel.ts:263` | cambiada | `src/lib/nav/arquitectura-del-panel.ts:666` | `key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), ic…` · la mas parecida (ratio 0.89): «key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), icon: ChartLine, module: 'reportes', scope: 'general', dataTourTarget: '» |
| 13-UI-SPEC | 126 | `src/components/auth/PageGuard.tsx:48-52` | cambiada | `src/components/auth/PageGuard.tsx:57-61` | `const hasAccess = isAdmin \|\| (adminOnly ? false : moduleAllowed && roleAllowed);…` · 2/5 lineas conservadas en orden; el tramo igual mas largo (2) empieza en :57 |
| 13-UI-SPEC | 126 | `src/components/auth/PageGuard.tsx:48` | movida | `src/components/auth/PageGuard.tsx:57` | `const hasAccess = isAdmin \|\| (adminOnly ? false : moduleAllowed && roleAllowed);` · +9 lineas |
| 13-UI-SPEC | 133 | `src/lib/api/piloto.ts:120` | movida | `src/lib/api/piloto.ts:141` | `recuperadoMesCop?: number` · +21 lineas |
| 13-UI-SPEC | 141 | `src/components/tour/AgentIntroModal.tsx:36-88` | cambiada | `src/components/tour/AgentIntroModal.tsx:49-101` | `export const AGENT_INTROS: AgentIntroConfig[] = [ … (53 lineas)` · 52/53 lineas conservadas en orden; el tramo igual mas largo (43) empieza en :49 |
| 13-UI-SPEC | 237 | `src/lib/format.ts:64-76` | movida | `src/lib/format.ts:84-96` | `export function formatDateTime(dateString: string, locale?: 'es' \| 'en'): string…` · +20 lineas |
| 13-UI-SPEC | 401 | `src/lib/format.ts:19` | movida | `src/lib/format.ts:21` | `export function formatCurrency(amount: number \| null \| undefined, locale?: 'es' …` · +2 lineas |
| 13-UI-SPEC | 609 | `src/lib/errores/clasificar.ts:141-150` | cambiada | `src/lib/errores/clasificar.ts:464-473` | `if (status === 403) { … (10 lineas)` · 10/10 lineas conservadas en orden; el tramo igual mas largo (9) empieza en :465 |
| 13-UI-SPEC | 707 | `src/lib/i18n/locales/es.json:7551` | movida | `src/lib/i18n/locales/es.json:8094` | `"pipelineAria": "Pipeline: {{total}} casos",` · +543 lineas |
| 13-UI-SPEC | 831 | `src/app/panel/inmobiliaria/piloto/page.tsx:193-194` | movida | `src/app/panel/inmobiliaria/piloto/page.tsx:201-202` | `` {/* `min-w-0`: sin esto el contenido largo empuja el track del grid … (2 lineas) `` · +8 lineas |
| 13-UI-SPEC | 864 | `src/lib/format.ts:19` | movida | `src/lib/format.ts:21` | `export function formatCurrency(amount: number \| null \| undefined, locale?: 'es' …` · +2 lineas |
| 13-UI-SPEC | 911 | `src/lib/nav/arquitectura-del-panel.test.ts:91-98` | movida | `src/lib/nav/arquitectura-del-panel.test.ts:102-109` | `it('ninguna ruta vive bajo /ai/', () => { … (8 lineas)` · +11 lineas |
| 13-UI-SPEC | 912 | `next.config.mjs:126-130` | cambiada | `next.config.mjs:186-190` | `async redirects() { … (5 lineas)` · 3/5 lineas conservadas en orden; el tramo igual mas largo (2) empieza en :186 |
| 13-UI-SPEC | 924 | `src/lib/api/piloto.ts:120` | movida | `src/lib/api/piloto.ts:141` | `recuperadoMesCop?: number` · +21 lineas |
| 13-VALIDATION | 191 | `next.config.mjs:36-37` | movida | `next.config.mjs:58-59` | `typescript: { ignoreBuildErrors: true }, … (2 lineas)` · +22 lineas |

### 1.2 Rutas del panel citadas que ya no tienen `page.tsx`

`f13_rutas.py`: 152 menciones de rutas que en `5e3a6f85` tenían `page.tsx` → existen 108, movidas 27, no existen 17.

| Ruta vieja | Estado | Ruta nueva | Menciones (doc:línea) |
|---|---|---|---|
| `/cobros` | movida | `/pagos/cartera/cobros` (git R059: la lista de cobros quedó bajo Cartera) | 13-01:1015, 13-02:698, 13-02:699, 13-02:956, 13-UI-SPEC:255, 13-UI-SPEC:256 |
| `/cobros/cartera` | no_existe | `/pagos/cartera` (sin renombre: `cobros/cartera/page.tsx` se BORRÓ; la fila es `r('/pagos/cartera')`, `arquitectura-del-panel.ts:597`) | 13-01:227, 13-01:1012, 13-01:1017, 13-01:1044, 13-01:1085, 13-01:1100, 13-02:292, 13-02:682, 13-02:698, 13-02:955, 13-02:1033, 13-02:1059, 13-07:435, 13-07:1441, 13-UI-SPEC:255 |
| `/cobros/cobranza` | movida | `/pagos/cobranza` | 13-01:228, 13-02:293, 13-UI-SPEC:258 |
| `/cobros/cobranza/acuerdos` | movida | `/pagos/cobranza/acuerdos` | 13-01:228, 13-02:293, 13-UI-SPEC:257 |
| `/cobros/cobranza/deudores` | movida | `/pagos/cobranza/deudores` | 13-01:228, 13-01:1017, 13-02:293 |
| `/cobros/cobranza/disputas` | movida | `/pagos/cobranza/disputas` | 13-01:228, 13-02:293, 13-UI-SPEC:259 |
| `/cobros/cobranza/escalaciones` | movida | `/pagos/cobranza/escalaciones` | 13-01:229, 13-02:294 |
| `/cobros/cobranza/pagos` | movida | `/pagos/cobranza/pagos` | 13-01:228, 13-02:294 |
| `/cobros/recaudo` | movida | `/pagos/recaudo` | 13-01:227, 13-02:293, 13-05:1639, 13-UI-SPEC:256 |


## 2. Anclas literales de los bloques `automated` (corrida en seco old vs new)

1969 llamadas `ancla`/`una`/`mutar`/`exporta` sobre archivos del front; 261 sobre archivos que EXISTEN en `5e3a6f85` (las demás son archivos que crea la fase). Ninguna "pasa solo en new" y ningún texto que la fase agrega existe ya en la base nueva (ningún `una`/`mutar` de conteo 1 queda duplicado).

| Plan | pasan en old y new | **fallan en new (pasaban en old)** | fallan en ambas: texto que agrega la propia fase (esperado) |
|---|---|---|---|
| 13-01 | 4 | **0** | 8 |
| 13-02 | 18 | **0** | 4 |
| 13-03 | 17 | **4** | 23 |
| 13-04 | 17 | **2** | 9 |
| 13-05 | 27 | **3** | 11 |
| 13-06 | 28 | **2** | 13 |
| 13-07 | 38 | **3** | 13 |
| 13-08 | 15 | **2** | 0 |

### 2.1 Todas las que fallan (pasaban en `5e3a6f85`)

| Plan · tarea | Línea | Función | Archivo | Literal | Qué hay hoy (4ad6c188) |
|---|---|---|---|---|---|
| 13-03 T1 | 957 | `ancla` | `package.json` | `"next": "14.2.35"` | `:73` `"next": "15.5.26",` (React `^19.3.0` en `:76`) |
| 13-03 T1 | 990 | `ancla` | `src/lib/nav/arquitectura-del-panel.ts` | `{ labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics' },` | `:365` `{ key: 'desempeno-ia', labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics', scope: 'general' },` — ya NO es pantalla de Reportes: es un MÓDULO del grupo `agentes` («Agentes IA», `:330-367`); en `reportes.pantallas` (`:667-673`) queda el comentario `// «Desempeño IA» se mudó a «Agentes IA» el 2026-09-16, con su URL.` (`:672`; la última pantalla es `rentabilidad`, `:671`) |
| 13-03 T1 | 998 | `ancla` | `src/components/auth/PageGuard.tsx` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` | `:43` `export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` (se agregó la prop `modulos`) |
| 13-03 T1 | 1003 | `ancla` | `src/lib/nav/arquitectura-del-panel.test.ts` | `expect(modulos).toHaveLength(17);` | `:238` `expect(modulos).toHaveLength(25);` (título del it: `el sidebar tiene 25 módulos en 5 grupos con nombre (+ Inicio y Chat = 27 filas)`, `:208`) |
| 13-04 T1 | 948 | `ancla` | `src/components/auth/PageGuard.tsx` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` | `:43` `export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` (se agregó la prop `modulos`) |
| 13-04 T1 | 963 | `ancla` | `package.json` | `"next": "14.2.35"` | `:73` `"next": "15.5.26",` (React `^19.3.0` en `:76`) |
| 13-05 T1 | 1096 | `ancla` | `src/components/auth/PageGuard.tsx` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` | `:43` `export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` (se agregó la prop `modulos`) |
| 13-05 T1 | 1101 | `ancla` | `src/app/panel/inmobiliaria/cobros/cobranza/arco/[id]/page.tsx` | `tone="danger"` | el archivo se movió (git R098) a `src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx`; el literal sigue ahí ×1 en `:419` |
| 13-05 T1 | 1123 | `ancla` | `package.json` | `"next": "14.2.35"` | `:73` `"next": "15.5.26",` (React `^19.3.0` en `:76`) |
| 13-06 T1 | 1040 | `ancla` | `src/components/auth/PageGuard.tsx` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` | `:43` `export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` (se agregó la prop `modulos`) |
| 13-06 T1 | 1053 | `ancla` | `package.json` | `"next": "14.2.35"` | `:73` `"next": "15.5.26",` (React `^19.3.0` en `:76`) |
| 13-07 T1 | 1192 | `ancla` | `src/app/panel/inmobiliaria/cobros/cobranza/arco/[id]/page.tsx` | `tone="danger"` | el archivo se movió (git R098) a `src/app/panel/inmobiliaria/pagos/cobranza/arco/[id]/page.tsx`; el literal sigue ahí ×1 en `:419` |
| 13-07 T1 | 1204 | `ancla` | `src/components/auth/PageGuard.tsx` | `export function PageGuard({ module, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` | `:43` `export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {` (se agregó la prop `modulos`) |
| 13-07 T1 | 1220 | `ancla` | `package.json` | `"next": "14.2.35"` | `:73` `"next": "15.5.26",` (React `^19.3.0` en `:76`) |
| 13-08 T1 | 627 | `ancla` | `src/components/tour/AgentIntroModal.tsx` | `const STORAGE_PREFIX = 'leasefy.agent-intro.'` | sin equivalente literal: el literal no está en ningún `.ts/.tsx` no-test de la base nueva. El «ya la vi» dejó localStorage y ahora es `claveDeLaPresentacionDelAgente(agent.id)` + `usePanelPrefs()` (`estaVista`/`marcarVista`, servicio `/inmobiliaria/onboarding-visto`); `leasefy.agent-intro.` solo queda en el docblock (`:15`) y en `AgentIntroModal.test.tsx:139` |
| 13-08 T1 | 627 | `ancla` | `src/app/panel/inmobiliaria/layout.tsx` | `<main id="main-content" tabIndex={-1}>` | `:345` `id="main-content"` — el tag se partió en 4 líneas: `<main` (`:344`) · `id="main-content"` (`:345`) · `tabIndex={-1}` (`:346`) · `className="mx-auto w-full max-w-[1920px]"` (`:347`) |

### 2.2 Marcadores de tests EXISTENTES exigidos verdes (`MARC_JS` `archivo::título`)

| Plan · tarea | Línea | Archivo | Marcador | en el fuente old | en el fuente new |
|---|---|---|---|---|---|
| 13-02 T4 | 1286 | `src/components/estado/AvisoDatosDeEjemplo.test.tsx` | `dice que los datos son de ejemplo` | sí | sí |
| 13-02 T4 | 1286 | `src/components/estado/AvisoDatosDeEjemplo.test.tsx` | `no se puede cerrar` | sí | sí |
| 13-03 T3 | 1338 | `src/components/estado/cuatro-estados.test.ts` | `la lista de pantallas que lo hacen no crece` | sí | sí |
| 13-03 T4 | 1487 | `src/components/estado/cuatro-estados.test.ts` | `la lista de pantallas que lo hacen no crece` | sí | sí |
| 13-03 T5 | 1623 | `src/lib/nav/arquitectura-del-panel.test.ts` | `cada workspace registrado tiene su puerta en la arquitectura` | sí | sí |
| 13-03 T5 | 1623 | `src/lib/nav/arquitectura-del-panel.test.ts` | `la etiqueta y la ruta se escriben igual (R4)` | sí | sí |
| 13-03 T5 | 1623 | `src/lib/nav/arquitectura-del-panel.test.ts` | `el sidebar tiene 17 módulos` | sí | **NO** |
| 13-03 T5 | 1623 | `src/lib/nav/arquitectura-del-panel.test.ts` | `toda clave i18n del sidebar y de las pestañas existe en es y en en` | sí | sí |
| 13-03 T5 | 1623 | `src/lib/nav/arquitectura-del-panel.test.ts` | `dentro de un módulo ninguna pestaña repite icono ni nombre` | sí | sí |
| 13-05 T4 | 1600 | `src/lib/nav/arquitectura-del-panel.test.ts` | `el sidebar tiene 17 módulos` | sí | **NO** |
| 13-05 T4 | 1600 | `src/lib/nav/arquitectura-del-panel.test.ts` | `toda clave i18n del sidebar y de las pestañas existe en es y en en` | sí | sí |
| 13-05 T4 | 1600 | `src/lib/nav/arquitectura-del-panel.test.ts` | `es un workspace registrado en la misma ruta` | sí | sí |
| 13-05 T4 | 1600 | `src/lib/nav/gates-del-panel.test.ts` | `la lista de módulos rotos no crece sola` | sí | sí |
| 13-07 T4 | 1745 | `src/lib/nav/arquitectura-del-panel.test.ts` | `el sidebar tiene 17 módulos` | sí | **NO** |
| 13-07 T4 | 1745 | `src/lib/nav/arquitectura-del-panel.test.ts` | `toda clave i18n del sidebar y de las pestañas existe en es y en en` | sí | sí |
| 13-07 T4 | 1745 | `src/lib/nav/arquitectura-del-panel.test.ts` | `es un workspace registrado en la misma ruta` | sí | sí |
| 13-07 T4 | 1745 | `src/lib/nav/gates-del-panel.test.ts` | `la lista de módulos rotos no crece sola` | sí | sí |

Los marcadores sobre tests existentes que NO están en el fuente viejo son títulos que agrega la fase (`[N13:…]`, "recognizes the six…") o títulos `it.each` con filas de Naira; sus plantillas siguen: `arquitectura-del-panel.test.ts:96` (`pestaña del agente %s → %s tiene su page.tsx`), `gates-del-panel.test.ts:146/:154/:182`, `fichas-con-vuelta.test.ts:66`, `modales-alineados.test.ts:74`.

### 2.3 Anclas sobre archivos que se CREAN pero que codifican la base vieja

| Plan · tarea | Línea | Archivo creado | Literal | Por qué choca con la base nueva |
|---|---|---|---|---|
| 13-01 T4 | 1085 | `src/lib/naira/fuente-a-ruta.ts` | `'cartera.morosidad_rate': '/panel/inmobiliaria/cobros/cartera'` (`ancla`) | `/panel/inmobiliaria/cobros/cartera` no tiene `page.tsx` (hoy `/pagos/cartera`) y el mismo plan exige `[N13:ruta-con-pagina]` |
| 13-01 T4 | 1100 | `src/lib/naira/fuente-a-ruta.ts` | `'cartera.morosidad_rate': '/panel/inmobiliaria/cobros/cartera'` (`mutar`) | `/panel/inmobiliaria/cobros/cartera` no tiene `page.tsx` (hoy `/pagos/cartera`) y el mismo plan exige `[N13:ruta-con-pagina]` |
| 13-02 T2 | 1033 | `src/lib/naira/destinos-del-drill-down.ts` | `'/panel/inmobiliaria/cobros/cartera': { etiquetaKey: 'inmobiliaria.nav.cartera', modulo: 'cobros' },` (`ancla`) | `/panel/inmobiliaria/cobros/cartera` no tiene `page.tsx` (hoy `/pagos/cartera`) y el mismo plan exige `[N13:ruta-con-pagina]` |
| 13-02 T2 | 1059 | `src/lib/naira/destinos-del-drill-down.ts` | `'/panel/inmobiliaria/cobros/cartera': { etiquetaKey: 'inmobiliaria.nav.cartera', modulo: 'cobros' },` (`mutar`) | `/panel/inmobiliaria/cobros/cartera` no tiene `page.tsx` (hoy `/pagos/cartera`) y el mismo plan exige `[N13:ruta-con-pagina]` |
| 13-08 T1 | 639 | `tests/e2e/panel-a11y/_helpers/naira-helpers.ts` | `leasefy.agent-intro.naira` (`ancla`) | la intro ya no lee `localStorage` (`usePanelPrefs`/`onboarding-visto`): sembrar esa clave no la suprime |

`grep`/`node` directos sobre archivos del front que cambian de salida: solo 13-01 T5 L1187 (`grep -nF` en `PermissionsContext.tsx`: `isAgentModule` :197→:218, `isAdmin` :204→:225): el control es de ORDEN y sigue pasando. `test -f`/`find` sobre archivos existentes: sin diferencias.


## 3. Controles de base y cifras fijas en los bloques

### 3.1 Toda aparición de `5e3a6f85` dentro de un bloque `automated`

| Plan · tarea | Línea | Qué hace | Resultado con la base nueva |
|---|---|---|---|
| 13-01 T1 | 730 | `git merge-base --is-ancestor 5e3a6f85 HEAD` (ancestría) | **RC 1 ⇒ F=1** |
| 13-01 T5 | 1186 | `git diff --quiet 5e3a6f85 -- src/lib/context/PermissionsContext.tsx` ("intacto", P12) | **RC 1 ⇒ F=1** (+28/−3) |
| 13-01 T5 | 1189 | `git show 5e3a6f85:src/lib/auth/agent-module-access.test.ts` = base del control "no debilitar" (`NODEBIL_JS`) | pasa: el archivo es idéntico en `4ad6c188` |
| 13-02 T1 | 867 | ancestría | **RC 1 ⇒ F=1** |
| 13-03 T1 | 959 | ancestría | **RC 1 ⇒ F=1** |
| 13-03 T1 | 963-965 | `git diff --name-only 5e3a6f85 "$HB" -- src tests …` + lista `PREF` ⇒ `MOV` | **MOV=1**: 2062 archivos fuera de `PREF` |
| 13-04 T1 | 910 | ancestría | **RC 1 ⇒ F=1** |
| 13-04 T1 | 914-915 | `git diff --name-only 5e3a6f85 HEAD …` + `git status` contra la unión de `files_modified` 13-01..13-04 ⇒ `AJENO` | **AJENO=1**: 2058 archivos |
| 13-05 T1 | 1064 | ancestría | **RC 1 ⇒ F=1** |
| 13-05 T1 | 1068-1069 | ídem (unión 13-01..13-05) | **AJENO=1**: 2058 |
| 13-06 T1 | 999 | ancestría | **RC 1 ⇒ F=1** |
| 13-06 T1 | 1003-1004 | ídem (unión 13-01..13-06) | **AJENO=1**: 2058 |
| 13-07 T1 | 1145 | ancestría | **RC 1 ⇒ F=1** |
| 13-07 T1 | 1149-1150 | ídem (unión 13-01..13-07) | **AJENO=1**: 2058 |
| 13-08 T1 | 617 | ancestría | **RC 1 ⇒ F=1** |
| 13-08 T1 | 619-621 | `git log --reverse 5e3a6f85..HEAD` ⇒ `BF` = padre del primer commit `(13-01):`, debe estar citado en `13-01-SUMMARY.md` | funciona (851 commits, 0 `(13-0N):` ajenos); sugerido `4ad6c188..HEAD` |
| 13-08 T2 | 749 | ídem ⇒ `H0` = padre del primer commit `(13-08):` | funciona |
| 13-08 T3 | 856 | ídem | funciona |
| 13-08 T4 | 920-921 | ídem ⇒ `BF` | funciona |
| 13-08 T5 | 1041 | ídem ⇒ `H0` | funciona |

Fuera de los bloques (prosa: `<execution_context>`, Paso 0, CONTEXT/VALIDATION): 13-01 ×5 (L10, 147, 211, 256), 13-02 ×5 (L10, 194, 266, 327), 13-03 ×7 (L11, 203, 284, 368, 1067, 1744), 13-04 ×6 (L12, 156, 245, 326, 1012), 13-05 ×6 (L13, 176, 280, 486, 1168), 13-06 ×6 (L13, 142, 241, 334, 1105), 13-07 ×6 (L15, 167, 278, 390, 1276), 13-08 ×8 (L12, 113, 194-199, 260, 659), CONTEXT ×4 (L4, 75, 175, 465), UI-SPEC ×2 (L9, 19), VALIDATION ×9 (L57-87, 141, 169). Los Paso 0 de cada plan dicen además: "base distinta (no ancestro, o cambios ajenos) ⇒ PARA y se re-planifica".

### 3.2 Cifras fijas medidas sobre la base vieja

| Dónde | Cifra exigida | Base nueva |
|---|---|---|
| 13-03 T1 L1003 (`ancla`) | `expect(modulos).toHaveLength(17);` | **25** (`arquitectura-del-panel.test.ts:238`); grupos con nombre 4 → **5** (`:233`) |
| 13-03 T5 L1623 · 13-05 T4 L1600 · 13-07 T4 L1745 (marcador) | "el sidebar tiene 17 módulos" | **"el sidebar tiene 25 módulos en 5 grupos con nombre (+ Inicio y Chat = 27 filas)"** (`:208`) |
| 13-03 L434/L1518 (prosa `<interfaces>`) | `AGENT_WORKSPACES` 7 activos, "el último activo es 'pagos', :230-252" | **5 activos** (cobranza, asegurabilidad, avaluos, conciliacion, matching); `estudio` comentado (`:215-241`), `pagos` retirado; el último es `matching` (`:242-255`) |
| 13-03 L443/L464 (prosa) | `AGENT_INTROS` 7 agentes; `inmobiliaria.ai.intro` 7 | siguen **7** (es y en) |
| 13-03 L450/L1541/L1662 · CONTEXT L48/L371 · VALIDATION L105 (prosa) | "17 módulos" | **25** |
| 13-03 T1 L996 (`ancla`) | `  if (items.length < 2) return null;` | igual (`WorkspaceNav.tsx:45`) |
| 13-01 T5 L1187 | `isAgentModule` antes que `isAdmin` | 218 < 225 (pasa) |
| 13-01 T5 L1191 / D13-3 | "five" ⇒ "six" en `agent-module-access.test.ts:21` | el test es idéntico: el cambio sigue aplicando |

Cifras que un bloque exige pero NO dependen de la base (las fija el propio plan): claves i18n 81 (13-03 L1038), 57 (13-04 L992), 85 (13-05 L1147), 52 (13-06 L1084), 82 (13-07 L1253); `PERMITIDOS` 35 (13-03 T5 L1653); iconos ≥2 (13-04 L1361, 13-06 L1507); líneas Estado ≥7 y E2E ≥8 (13-08 T5 L1028/L1036); 20 FG (13-08 T3 L846). No hay ninguna cifra de `setError` ni de "nº de archivos de test existentes" en los bloques.


## 4. Archivos MOD: ¿el ancla que cada `<action>` manda editar sigue ahí?

MOD con existencia en `5e3a6f85` (de `files_modified`): 13-01 `agent-module-access.ts`, `.test.ts` · 13-02 `es.json`, `en.json`, `AvisoDatosDeEjemplo.tsx`, `.test.tsx` · 13-03 `es.json`, `en.json`, `arquitectura-del-panel.ts`, `agentWorkspaceNav.ts`, `WorkspaceNav.tsx`, `AgentIntroModal.tsx` · 13-04..13-07 `es.json`, `en.json`, `agentWorkspaceNav.ts` · 13-08 ninguno. Idénticos entre bases: `agent-module-access.ts(+test)`, `AvisoDatosDeEjemplo.tsx(+test)`. Cambiados: `arquitectura-del-panel.ts` (626 líneas de diff), `agentWorkspaceNav.ts` (261), `AgentIntroModal.tsx` (101), `WorkspaceNav.tsx` (12, solo docblock), `es.json`/`en.json` (~2200 c/u).

### 4.1 Anclas de edición por posición (medidas con `grep -nF` en `new/`)

| Plan · tarea | Archivo | Ancla del `<action>` | Base nueva |
|---|---|---|---|
| 13-01 T5 | `agent-module-access.ts` / `.test.ts` | constantes `FAIL_CLOSED_MODULES`/`ABSENT_ALLOWED_MODULES`; `it` de `:21` | igual (archivos idénticos) |
| 13-02 T4 | `AvisoDatosDeEjemplo.tsx` | `:51` `'border-warning/30 bg-warning-soft text-warning',` · `:58` `<Warning …/>` · `:67` `{queFalta ? …}` | igual (archivo idéntico) |
| 13-02..13-07 | `es.json` / `en.json` | nodos `inmobiliaria.ai`, `.nav`, `.intro`, `.breadcrumb.detalle`; `inmobiliaria.ai.naira` ausente | existen / sigue ausente |
| 13-03 T5 A | `arquitectura-del-panel.ts` | `  Compass,` después de `  TrendUp,` | `  TrendUp,` `:32` ×1; `Compass` aún no importado — OK |
| 13-03 T5 A | `arquitectura-del-panel.ts` | "en `reportes.pantallas`, DESPUÉS de la línea de `/reportes/ia`" | **ROTA**: `/reportes/ia` está en el grupo `agentes` (`:365`), no en `reportes.pantallas` (`:667-673`, termina en `rentabilidad` `:671` + comentario `:672`) |
| 13-03 T5 B | `agentWorkspaceNav.ts` | `  Compass,`/`  Newspaper,` después de `  Bank,`; `import { RUTA_DE_NAIRA }` después del import de `agency-roles`; `action?: string;` después de `dataTourTarget?: string;`; `const NAIRA` después de `const PAGOS = …;` | OK: `:32`, `:34`, `:72` (dentro de `WorkspaceNavItem` `:60`), `:105`, ×1 cada uno |
| 13-03 T5 B | `agentWorkspaceNav.ts` | "DESPUÉS del bloque `pagos` y ANTES del comentario `// ── Mantenimiento (tickets) — APAGADO`" | **ROTA**: no hay bloque `slug: 'pagos'`; el comentario está en `:256`, precedido por `matching` (`:242-255`) |
| 13-03 T5 C | `WorkspaceNav.tsx` | `:36` `if (item.module && !canAccess(item.module, 'view')) return false;`; cierre del docblock | igual (`:36`; `*/` en `:26`) |
| 13-03 T5 D | `AgentIntroModal.tsx` | "Después de la entrada `pagos`", formato multilínea | OK: `pagos` es la última (`:98-104`), ahora con el comentario "Sin workspace desde el 2026-09-16" |
| 13-04..13-07 T4 | `agentWorkspaceNav.ts` | `// ← 13-04..13-07 AGREGAN su pestaña AQUÍ` | lo escribe 13-03: no depende de la base |
| 13-03..13-07 | `VistaDeNaira.tsx` y demás archivos de otro plan de la fase | textos de 13-02.. | creados por la fase: no dependen de la base |

### 4.2 Barrido mecánico (`f13_mod.py`): literales entre backticks de `<action>`/`<read_first>`/`<behavior>` presentes en el MOD viejo

| Plan | Archivo | literales presentes en `5e3a6f85` | con 0 apariciones en `4ad6c188` |
|---|---|---|---|
| 13-01 | `src/lib/auth/agent-module-access.test.ts` | 18 | 0 |
| 13-01 | `src/lib/auth/agent-module-access.ts` | 20 | 0 |
| 13-02 | `src/components/estado/AvisoDatosDeEjemplo.test.tsx` | 15 | 0 |
| 13-02 | `src/components/estado/AvisoDatosDeEjemplo.tsx` | 26 | 0 |
| 13-02 | `src/lib/i18n/locales/en.json` | 16 | 0 |
| 13-02 | `src/lib/i18n/locales/es.json` | 22 | 0 |
| 13-03 | `src/components/inmobiliaria/ai/WorkspaceNav.tsx` | 16 | 0 |
| 13-03 | `src/components/tour/AgentIntroModal.tsx` | 11 | 0 |
| 13-03 | `src/lib/i18n/locales/en.json` | 12 | 0 |
| 13-03 | `src/lib/i18n/locales/es.json` | 16 | 0 |
| 13-03 | `src/lib/nav/agentWorkspaceNav.ts` | 28 | 0 |
| 13-03 | `src/lib/nav/arquitectura-del-panel.ts` | 31 | 0 |
| 13-04 | `src/lib/i18n/locales/en.json` | 13 | 0 |
| 13-04 | `src/lib/i18n/locales/es.json` | 15 | 0 |
| 13-04 | `src/lib/nav/agentWorkspaceNav.ts` | 14 | 0 |
| 13-05 | `src/lib/i18n/locales/en.json` | 29 | 0 |
| 13-05 | `src/lib/i18n/locales/es.json` | 32 | 0 |
| 13-05 | `src/lib/nav/agentWorkspaceNav.ts` | 15 | 0 |
| 13-06 | `src/lib/i18n/locales/en.json` | 22 | 0 |
| 13-06 | `src/lib/i18n/locales/es.json` | 33 | 0 |
| 13-06 | `src/lib/nav/agentWorkspaceNav.ts` | 13 | 0 |
| 13-07 | `src/lib/i18n/locales/en.json` | 34 | 0 |
| 13-07 | `src/lib/i18n/locales/es.json` | 38 | 0 |
| 13-07 | `src/lib/nav/agentWorkspaceNav.ts` | 20 | 0 |

Ningún literal existente nombrado por un `<action>` desapareció: lo roto es la POSICIÓN (4.1). Los que cambian de conteo son fragmentos de backticks mal emparejados (`, con `, `2026`, `.tsx`…), no anclas.


## 5. Archivos que los planes CREAN

164 archivos (13-01: 16, 13-02: 29, 13-03: 29, 13-04: 22, 13-05: 26, 13-06: 16, 13-07: 19, 13-08: 7). **Ya existen en `4ad6c188`: 0.** Ningún archivo con `naira` en el nombre fuera de `.planning/`; no existen `src/lib/api/naira/`, `src/lib/naira/`, `src/lib/hooks/naira/`, `src/components/inmobiliaria/naira/` ni `src/app/panel/inmobiliaria/reportes/naira/` (sus padres sí). Sin choques.


## Resumen por plan

| Plan | Citas igual / movida / cambiada / no_existe | Anclas de bloque que fallarían con la base nueva | MOD con ancla de edición rota |
|---|---|---|---|
| 13-01 | 44 / 31 / 11 / 0 | T1 L730 (ancestría); T5 L1186 (`PermissionsContext` "intacto"); T4 L1085+L1100 (`/cobros/cartera` en archivo creado vs `[N13:ruta-con-pagina]`) ⇒ **4** | ninguno |
| 13-02 | 32 / 34 / 11 / 2 | T1 L867 (ancestría); T2 L1033+L1059 (`/cobros/cartera` en archivo creado); T4 L1285+L1286 (test viejo borrado, B13) ⇒ **5** | ninguno |
| 13-03 | 43 / 37 / 24 / 0 | T1 L959 (ancestría), L963-965 (MOV), L957 (`next`), L990 (`desempenoIa`), L998 (`PageGuard`), L1003 (`toHaveLength(17)`); T5 L1623 (marcador 17 módulos) ⇒ **7** | `arquitectura-del-panel.ts` (T5 A: tras `/reportes/ia` en `reportes.pantallas`) y `agentWorkspaceNav.ts` (T5 B: tras el bloque `pagos`) |
| 13-04 | 14 / 12 / 1 / 2 | T1 L910 (ancestría), L914-915 (AJENO), L948 (`PageGuard`), L963 (`next`) ⇒ **4** | ninguno |
| 13-05 | 31 / 13 / 1 / 2 | T1 L1064 (ancestría), L1068-1069 (AJENO), L1096 (`PageGuard`), L1101 (`arco` movido), L1123 (`next`); T4 L1600 (marcador) ⇒ **6** | ninguno |
| 13-06 | 27 / 21 / 3 / 0 | T1 L999 (ancestría), L1003-1004 (AJENO), L1040 (`PageGuard`), L1053 (`next`) ⇒ **4** | ninguno |
| 13-07 | 59 / 20 / 3 / 0 | T1 L1145 (ancestría), L1149-1150 (AJENO), L1192 (`arco` movido), L1204 (`PageGuard`), L1220 (`next`); T4 L1745 (marcador) ⇒ **6** | ninguno |
| 13-08 | 70 / 16 / 5 / 0 | T1 L617 (ancestría), L627 ×2 (`STORAGE_PREFIX`, `<main …>`), L639 (`leasefy.agent-intro.naira` en helper creado) ⇒ **4** | ninguno |
| 13-CONTEXT | 16 / 8 / 6 / 0 | (sin bloques) | — |
| 13-UI-SPEC | 18 / 12 / 6 / 0 | (sin bloques) | — |
| 13-VALIDATION | 3 / 1 / 0 / 0 | (sin bloques) | — |


## Lo que bloquea ejecutar (cierre)

La tabla completa, con la corrección medida de cada uno, está arriba (B1-B13). En cifras: **13 causas, 40 puntos de falla** en los bloques
`automated` de los 8 planes (8 de ancestría, 5 de AJENO/MOV, 1 de "PermissionsContext intacto", 16 anclas literales que pasaban en
`5e3a6f85`, 3 marcadores de un título que ya no existe, 5 anclas sobre archivos que se crean pero codifican la base vieja, 2 líneas de un test
borrado; más las 2 posiciones de inserción de 13-03 T5 que un grep no ve). Se corrigen con un literal nuevo medido: B1-B7, B9, B10(b), B13 y el
literal de B12. Necesitan decisión antes de re-escribir el plan (ver `13-REBASE-RESEARCH.md`): B8/B11 (Naira en Reportes o en «Agentes IA»;
no hay bloque `pagos` para anclar), B10(a) (cómo se suprime la intro en el E2E sin `localStorage`) y el mapa de rutas de B12 (`/cobros/*` →
`/pagos/*`, y `/cobros/cartera` sin `page.tsx`). Todos los Paso 0 dicen "base distinta ⇒ PARA y se re-planifica": con esta base, ningún plan
arranca sin esa re-planificación.
