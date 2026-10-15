# Fase 13 — Re-medición SEMÁNTICA contra la base nueva (`cambios-nico-10` @ `4ad6c188`)

**Medido:** 2026-09-27/28 · **Worktree:** `/Users/nicolasgarcia/rent/wt-front-naira`, rama `project/naira-superficie`, HEAD `8b58966d`
(= `4ad6c188` + 12 commits SOLO de `.planning/naira/`: `git diff --name-only 4ad6c188 HEAD | grep -v ^.planning/naira/` = 0).
**Base vieja:** `5e3a6f85` (`origin/Main`, 2026-09-07). **Base nueva:** `4ad6c188bd79a1f1272d96411a75813f87707651` (2026-09-27 19:40).
**Alcance:** re-medición semántica (qué significa cada cambio para D13-k / plan / tarea). El censo mecánico de cada `archivo:línea` y de
cada ancla literal es de `13-REBASE-PATTERNS.md` (pattern-mapper, en paralelo): acá solo se cita la línea cuando sostiene una conclusión.
**Confianza:** ALTA en el front (todo medido con `git show`/`grep`/`python3` sobre las dos bases) · ALTA en el agente (git de
`agent-account-manager`, solo lectura) · MEDIA en lo que exige correr (`tsc`, `next build`, vitest): **no se instaló ni se corrió nada**.

> Método y límites. Solo lectura salvo este archivo. Temporales en `mktemp -d /tmp/f13_rebase.XXXXXX`. No se tocó `~/rent/mvp`,
> otros `wt-front-*` ni `~/.cursor`; en `~/rent/mvp-erp` se ejecutó UNA lectura (`git -C … rev-parse HEAD` = `4ad6c188`, sin escribir).
> En el agente: `git log/show/diff/cat-file` y `git worktree list`, sin escribir.

***

## Resumen — los 5 cambios de la base que más afectan a los planes

1. **Los agentes tienen SU sección, «Agentes IA», y cada agente es un MÓDULO N2 de ese grupo** (Nico, 2026-09-16), con la URL del
   módulo que lo hospedaba. El árbol pasó de 17 módulos en 4 grupos a **25 en 5** y los tests lo cierran: toda pantalla con `agente`
   vive en el grupo `agentes`, **ninguna** lleva `ia: true` (antes era obligatorio), y `reportes` tiene EXACTAMENTE `resumen` y
   `rentabilidad`. ⇒ **D13-1 tal como está escrita (N3 en Reportes con `ia: true`) deja rojos al menos 4 guardianes existentes.**
   El equivalente en la base nueva es un **N2 en «Agentes IA» con href `/panel/inmobiliaria/reportes/naira`** — el mismo patrón que
   «Desempeño IA» (`/reportes/ia`). La URL (y por tanto E13-1, ya aplicada en el agente) no cambia. 🔔
2. **Next 15.5.26 / React 19.3:** (a) `params` de página son `Promise` (0 páginas del repo con `params` síncronos; molde
   `pagos/cobranza/deudores/[id]/page.tsx:17-29`); (b) el `JSX` global ya no existe con `@types/react` 19 (el commit de la subida
   `4b6b093d` agregó `import type { JSX } from 'react'` donde había `JSX.Element`) ⇒ las **54** firmas `): JSX.Element` de 13-02..13-07
   rompen `tsc`. `act` de `react` + `createRoot` ya eran el molde (sin cambio). Sigue sin Testing Library.
3. **Guardián nuevo `doce-pixeles` (`src/components/doce-pixeles.guardian.test.ts:91,109`): el total de `text-xs` fuera de `/admin` debe
   ser EXACTAMENTE 2716.** Los planes 13-02..13-07 escriben **21** `text-xs` (más 4 en UI-SPEC). Todo `text-xs` nuevo pone rojo ese
   guardián ⇒ contenido en `text-caption` (13 px, `globals.css:767`), rótulos mono en `text-overline`/`text-label` (`:772`, `:779`).
4. **El Paso 0 de los 8 planes para en la primera línea:** fijan `5e3a6f85` y `git merge-base --is-ancestor 5e3a6f85 HEAD` hoy da
   **RC=1** (medido: la base nueva es descendiente de `4027f8c1`, no de `5e3a6f85`; el árbol de `5e3a6f85` = el de `4027f8c1`, así que
   no se perdió contenido). Además anclan `"next": "14.2.35"`, `toHaveLength(17)` y, en el agente, textos que E13-1/E13-2 ya cambiaron.
5. **El agente aplicó E13-1 y E13-2 después de la planificación** (`5d2f9291`, `fb8d3e8c`, 2026-09-27 23:56 / 09-28 00:05, solo
   planes de la Fase 10): `RUTAS_DEL_PANEL` ya apunta a `/panel/inmobiliaria/reportes/naira` y `NairaBriefingItem` pasó de 13 a **14**
   campos (`entidades`). El espejo de 13-01 y dos anclas de Paso 0 (13-01, 13-03) quedan viejos. Y un cambio de ruta más: el drill-down
   de 13-01 apunta a `/cobros/*`, que en la base nueva **no tiene `page.tsx`** (redirige a `/pagos/*`).

**D13-1:** la *intención* sigue en pie (Naira dentro del mecanismo de workspaces del panel, sin namespace, sin `/naira` en la raíz,
URL `/panel/inmobiliaria/reportes/naira`); la *forma* (N3 de Reportes, "la cuenta de módulos no se mueve", `ia: true`, migaja
«Reportes › Naira») **ya no es construible** sin reescribir guardianes que Nico dejó a propósito. Recomendación 🔔 en §1.

**Planes con cambios bloqueantes:** los 8 (Paso 0); además, por contenido, 13-01 (espejo E13-2, drill-down `/cobros`→`/pagos`,
control de `PermissionsContext` contra `5e3a6f85`), 13-02..13-07 (`JSX`, `text-xs`), 13-03 (montaje de navegación, ficha con
`params`), 13-04 y 13-05 (fichas con `params`). 13-08 solo por Paso 0 (el resto son advertencias).

***

## 1 · Ubicación (D13-1 🔔)

| # | VIEJO (`5e3a6f85`) | NUEVO (`4ad6c188`) | Consecuencia |
|---|---|---|---|
| 1.1 Hub de IA | `/ai` → `/configuracion/agentes` → `/configuracion` (`rutas-por-ciclo-de-vida.data.mjs:70`; `configuracion/agentes/page.tsx:1-14`) | **Igual**: `:75` y la misma página que redirige. `/procesos` (nuevo, top-level) es el «Centro de procesos» de cargas/descargas de documentos (`procesos/page.tsx:1-16`, Nico 22-09), no un hub de agentes; `/piloto/procesos` sigue siendo del Piloto. **No reapareció un hub de tarjetas.** | R13-1 sigue en pie en lo que dice del hub. |
| 1.2 Sección de agentes | No existía: cada agente era una pantalla N3 de su módulo («la IA es un modo, no un lugar») | **Existe** el grupo `key: 'agentes'`, «Agentes IA», PRIMERO del catálogo (`arquitectura-del-panel.ts:84-120` cabecera; `:331-366` datos; `GrupoDelPanel.key` gana `'agentes'` en `:307`). Cada agente es un **módulo N2** con `key` propio y la URL de antes; `moduloDeLaRuta` (prefijo más largo, `:774`) hace que `/pagos/cobranza/…` resuelva a Cobranza y el breadcrumb arranque en «Agentes IA» (`AgentHeaderBreadcrumb.tsx`, primer escalón = grupo). `CLAUDE.md:46` lo dice igual. | **Hay una sección de agentes.** Cambia la forma de D13-1 (ver 1.6). |
| 1.3 Guardianes del árbol | `expect(modulos).toHaveLength(17)` y 4 grupos (`arquitectura-del-panel.test.ts:201-202`); «toda pantalla con `agente` lleva la marca IA» (`:267-269`, `toBe(true)`) | `toHaveLength(5)` grupos y `toHaveLength(25)` módulos (`:233,238`); **«ninguna fila de Agentes IA lleva la marca IA»** y toda pantalla con `agente` tiene `ia` falsy (`:349-353`); «TODA sala de agente vive acá» (`:782-787`); «una sala la reclama UN solo lugar» (`:789-797`); las claves y hrefs del grupo, en orden, cerrados (`:755-780`); «cada rol ve en Agentes exactamente las salas que ya abría» (`:853-873`); `secciones('reportes')` = `['/reportes/resumen','/reportes/rentabilidad']` (`:963`). «El namespace murió» sigue (`:109`). | Una fila N3 `agente: 'naira'` en `reportes` con `ia: true` pone rojos `:349-353`, `:782-787` y `:963`. Un N2 en `agentes` exige actualizar `:238` (25→26), `:755-765`, `:767-780` y `:853-873` (práctica de la casa: el test documenta «Eran 25 hasta que entró …»). |
| 1.4 Módulo `reportes` | Grupo `pie`, `scope: 'general'`, pantallas resumen · rentabilidad · **Desempeño IA** (`arquitectura-del-panel.ts:259-271`) | Sigue en `pie`, `scope: 'general'` (`:666`), pantallas **resumen · rentabilidad** (`:667-673`). «Desempeño IA» se mudó a «Agentes IA» como N2 `key: 'desempeno-ia'`, href **`/reportes/ia` intacto**, `module: 'analytics'`, `scope: 'general'`, sin `agente` (`:365`; comentario `:363-364`: «es cómo rinden los agentes de arriba, por eso cierra la sección»). `reportes/ia/page.tsx` sigue siendo la misma pantalla de métricas de IA (`useAiMetrics`, `PageGuard` `analytics`; sin cambios de contenido relevantes). | **Precedente exacto** para Naira: un N2 transversal de «Agentes IA» que vive bajo `/reportes/…` sin ser pantalla de Reportes. |
| 1.5 Registro de workspace | `AGENT_WORKSPACES` con `pagos` (`agentWorkspaceNav.ts:231`), `WorkspaceNavItem` sin `action`, `WorkspaceNav.tsx:36` `canAccess(item.module, 'view')` | `pagos` **ya no es workspace** (NOTA al pie; `la-sala-de-pagos-se-fue.test.ts`); quedan cobranza, asegurabilidad, avaluos, conciliacion, matching (`:108-277`). `WorkspaceNavItem` (`:60-73`) sigue **sin** `action`; `WorkspaceNav.tsx:36` igual (solo cambió el docblock) y sigue ocultando la barra con < 2 pestañas (`:45`). `AgentIntroModal` (`AGENT_INTROS`) ahora persiste el «ya la vio» **por inmobiliaria en el back** (`PUT /inmobiliaria/onboarding-visto/agente:<id>`, `onboarding-visto.service.ts:24-26,50-70`) y `CabeceraDelAgente.tsx:50` solo presenta si `tourDismissed === true`. `VolverALaLista` y `SalaAgente` idénticos. `SeccionesDelModulo` reescrito (83→203 líneas) pero no dibuja riel en un módulo sin pantallas. | D13-3 (`action?: string`) sigue siendo necesaria y aditiva. El ancla de 13-03 «después del bloque `pagos`» ya no existe. La intro de Naira requiere que el back acepte la clave `agente:naira` [ASUMIDO: la clave es texto libre en el front; no medido en el back]. |
| 1.6 Ruta `/panel/inmobiliaria/reportes/naira` | Válida como N3 de Reportes | **Válida como N2 de «Agentes IA»** (mismo mecanismo que `/reportes/ia` y `/pagos/cobranza`): `moduloDeLaRuta('/reportes/naira/…')` devuelve Naira por prefijo más largo ⇒ grupo `agentes`, riel de Reportes callado, breadcrumb «Agentes IA › Naira › …». Y ya está **contratada por el agente**: `RUTAS_DEL_PANEL` de 10-04 (E13-1, `5d2f9291`). | La URL se conserva; lo que cambia es la fila y la migaja. |
| 1.7 Regla nueva de producto | — | «Lo que existe pero está sin sacar NO entra» a la sección (`arquitectura-del-panel.ts:109-111`; test `:905-910`, que solo mira rutas `/contratos/`, `/mantenimientos`, `/postulaciones/estudio`). Precedentes: Retención, Tickets y Evaluación de candidatos están **comentados** fuera del catálogo, no gateados. | Naira no está viva en ningún agente. Con D13-3 (fail-closed) la fila **no se ve** hasta que el agente publique `naira` en `/my-permissions` (tampoco en modo simulado: `PermissionsContext` no tiene bypass de mock, medido). Choca con la letra de la regla (registrada pero oculta), no con su efecto. 🔔 |

**Recomendación (no cambia la decisión; la ADAPTA y se marca 🔔 para Nico):**

- **D13-1′ 🔔 — Naira = módulo N2 del grupo «Agentes IA»**, fila `{ key: 'naira', labelKey: 'inmobiliaria.ai.nav.naira', href:
  r('/reportes/naira'), icon: Compass, module: 'naira', scope: 'general', agente: 'naira' }` — **sin `ia`** (`:349-353`), con o sin
  `hintKey` — y su `AGENT_WORKSPACES` con el mismo `basePath`. URL, pestañas, fichas y E13-1 **no cambian**; tampoco `src/lib/api/naira/`,
  `src/lib/hooks/naira/`, `src/lib/naira/`, `src/components/inmobiliaria/naira/` (la decisión de "cambiar de opinión barato" se paga
  sola: solo cambian la fila, la migaja esperada y los guardianes). Migaja: «Agentes IA › Naira › Detalle».
- **Orden 🔔:** antes de `desempeno-ia` (que «cierra la sección», `:363-364`) y después de `agente-de-pagos` (el otro que «hoy no
  trabaja», `:348-361`). Así no entra a la barra móvil (5 primeras filas navegables, `MobileNavBar.tsx:24`; comentario `:323-326`).
- **Regla "sin sacar" 🔔:** registrar la fila **gateada fail-closed** (oculta hasta que el agente publique `naira`; D13-3) y decirlo en
  el comentario de la fila, en vez de dejarla comentada como Retención/Tickets. Alternativa: dejarla comentada hasta el go-live y
  que el workspace se alcance solo por URL (pero entonces `:335-339` "cada workspace tiene su puerta" obliga a comentar también el
  workspace, y Naira queda inalcanzable incluso con el agente vivo hasta otra edición).
- Enmienda de texto a E13-9 (ROADMAP crit. 1): «… con el mecanismo de workspaces de agente del panel: módulo de la sección
  «Agentes IA» con URL `/panel/inmobiliaria/reportes/naira` …» (antes: «workspace de Reportes»).
- `navigation-source.ts` (⌘K): los agentes llevan fila con `context: 'Agentes IA'` (`src/lib/search/sources/navigation-source.ts:45-63`)
  y la receta de reactivación de `estudio` la cuenta como puerta (`arquitectura-del-panel.ts:448-455`). No hay test que la exija;
  ningún plan de la 13 la agrega ⇒ **advertencia**: sin ella Naira no se encuentra en el buscador (`permission: { module: 'naira', action: 'view' }`).
- D13-2 (Piloto/Chat no se tocan) **sigue válida**: Inicio = Piloto (`layout.tsx:186`), Chat en la raíz (`:199`), y el Piloto sigue
  pintando el briefing del Gerente y `recuperadoMesCop` (`piloto/page.tsx:82,128,190-192`). R13-3 intacto.

***

## 2 · Next 15 / React 19

| # | VIEJO | NUEVO | Consecuencia (plan/tarea) |
|---|---|---|---|
| 2.1 Versiones | `next 14.2.35`, `react ^18.2.0`, `@types/react ^18`, `eslint-config-next 14.2.21` (`package.json` viejo `:76,79`) | `next 15.5.26`, `react/react-dom ^19.3.0`, `@types/react ^19.3.0`, `eslint-config-next 15.5.26` (`package.json:73,76`). Subida `4b6b093d` (23-09, por seguridad; codemod `next-async-request-api`). `CLAUDE.md:4,33-35`. | Toda ancla `"next": "14.2.35"` (13-03 Paso 0; pattern-mapper lista el resto) ⇒ PARA. |
| 2.2 `params` de `page.tsx` | Síncronos (los planes escriben `({ params }: { params: { promocionId: string } })` y anclan `<SenalClient promocionId={params.promocionId} />`, 13-03:1390-1393,1473; 13-04:1417-1419,1488; 13-05 igual) | **`Promise`**: `interface PageProps { params: Promise<{ id: string }> }` + `export default async function … { const { id } = await params }` (`pagos/cobranza/deudores/[id]/page.tsx:17-29`); en cliente `use(params)`. Medido: **25** archivos con `params: Promise<`, **5** con `use(params)`, **0** `page.tsx` con `params: {` síncrono. Next 15 aún tolera el acceso síncrono con aviso (período de compatibilidad) [CITED: nextjs.org/docs upgrading/version-15 y version-16], pero `tsconfig.json` incluye `.next/types/**/*.ts`: tras `next build`, `tsc` valida la forma (`4b6b093d`: «.next/types lo exigía»). `next.config.mjs:58-59` ignora errores de TS/ESLint en el build. | **Bloquea** 13-03 (T de la ficha de señal), 13-04 (ficha de loop), 13-05 (ficha de propuesta): cambiar firma y anclas al molde `Promise` + `await`. El molde citado `cobros/cobranza/deudores/[id]` se llama hoy `pagos/cobranza/deudores/[id]`. |
| 2.3 `useSearchParams` | En Client sin `Suspense` (`inquilinos/page.tsx:194`) | Igual (`:196`); en el panel 61 archivos lo usan y solo 12 envuelven en `Suspense`. | Sin cambio de patrón [ASUMIDO: el build de la base pasa con esas 49 páginas; se confirma en el `pnpm build` de 13-08]. |
| 2.4 `act` / `createRoot` / `next/navigation` en tests | `import { act } from 'react'` + `createRoot` (`PilotoCajon.test.tsx:16-19`) | Igual (664 archivos con `act` de `react`; 0 con `react-dom/test-utils`); `vi.mock('next/navigation', …)` igual (p. ej. `sin-acceso-no-se-puede-nada.test.tsx:43`, `reportes/consola-limpia.test.tsx`). | Sin cambio. |
| 2.5 Tipos de React 19 | `JSX.Element` global disponible | Global `JSX` fuera en `@types/react` 19: `4b6b093d` «JSX importado de react»; los 7 usos de hoy importan `import type { JSX } from 'react'` o escriben `React.JSX.Element` (`pagos/dispersiones/page.tsx:2`, `ReQuoteOfBadge.tsx:19`). Además: `useRef` exige argumento, `RefObject<T \| null>`, `inert` es booleano (mismo commit). | **Bloquea `tsc`** en 13-02 (12 firmas), 13-03 (8), 13-04 (11), 13-05 (9), 13-06 (7), 13-07 (7): agregar `import type { JSX } from 'react'` o `React.JSX.Element`. `inert`/`useRef()` sin argumento: 0 usos en los planes (medido). |
| 2.6 `next lint` | `"lint": "next lint"` | Igual (`package.json` scripts), `.eslintrc.json` = `next/core-web-vitals`. Next 16 lo retira a favor de `eslint .` [CITED: codemod `next-lint-to-eslint-cli`, docs v16]. | 13-08 puede seguir con `pnpm lint` (cosmético). |
| 2.7 `next build` | Manual antes de PR | Igual + **después de `pnpm build`**: `node scripts/variables-libres-del-build.mjs` (`CLAUDE.md:122-128`; sale 1 si encuentra identificadores sueltos en `.next/static/chunks`). `postinstall` ahora también corre `node scripts/copiar-trabajador-de-maplibre.mjs` (escribe `public/maplibre/<ver>/`, ignorado en `.gitignore:85`). | 13-08: agregar el script al cierre del build (advertencia). El `status --porcelain` del Paso 0 no se ensucia con el postinstall (medido con `git check-ignore`). |

***

## 3 · Design system

| # | VIEJO | NUEVO | Consecuencia |
|---|---|---|---|
| 3.1 `@leasefy/cadence` | `../cadence` 1.0.57 (`1eece93`), peer `react ^18.2.0` | **Mismo** `../cadence` (1.0.57, `1eece93`, rama `main`, `dist/` y `node_modules/` presentes). El front acepta el peer con React 19 por `pnpm-workspace.yaml` `peerDependencyRules.allowedVersions` (`'@leasefy/cadence>react': '19'`, agregado en la subida). Snapshot del lock con las 24 dependencias de cadence resueltas contra React 19 (`pnpm-lock.yaml:6403-6431`). Exports que usan los planes presentes en `dist/index.d.ts`: `IconButton`, `SegmentedControl`, `MonoLabel`, `MessageBubble`, `KeyValueList`, `ListRow`, `Timeline`, `Chip`, `Banner`, `Callout`, `StatusBadge`, `FeatureAnnouncement`. | Sin cambio para los planes. `pnpm install --frozen-lockfile` debería resolver `file:../cadence` [ASUMIDO: no ejecutado]. |
| 3.2 `components.json`, `tailwind.config.ts`, `button`, `spinner`, `alert-dialog`, `toast`, `popover`, `collapsible`, `textarea`, `skeleton`, `breadcrumb`, `tabs`, `tooltip` | — | **Idénticos** entre bases (`git diff --quiet`). `badge.tsx` suma `dark:` para `neutral` (aditivo); `empty-state.tsx` gana `children?` (aditivo); `section-label`, `back-button` con cambios menores. | Sin cambio de API para los planes. |
| 3.3 Tokens | `globals.css` 1814 líneas; `.text-caption` = `@apply text-xs` (12 px) | 1839 líneas; `.text-caption` = **13 px** (`:767-770`, 22-09); `.text-overline` mono `text-xs` uppercase `tracking-widest` (`:772-775`); `.text-label` mono 11 px uppercase (`:779-782`); azul Leasefy `#1A40FF` re-auditado (comentarios `:29-33,313-325`). | Ver 3.4. |
| 3.4 Guardián `doce-pixeles` (NUEVO) | No existía | `src/components/doce-pixeles.guardian.test.ts`: cuenta `\btext-xs\b` en `src/app`, `src/components`, `src/lib` (sin tests ni `/admin`) y exige `toBe(CUANTOS_HABIA)` con **`CUANTOS_HABIA = 2716`** (`:91,109`). «Un `text-xs` nuevo en una pantalla nueva es contenido en 12 px otra vez.» | **Bloquea** 13-02 (7 `text-xs`), 13-03 (3), 13-04 (1), 13-05 (1), 13-06 (5), 13-07 (4), y la tabla tipográfica de UI-SPEC (`13-UI-SPEC.md:179,235,274,300`). Regla de reemplazo: rótulo mono en mayúsculas (DATO/INFERENCIA, cortes, «Referencia técnica») ⇒ `text-overline` o `text-label`; contenido (ayudas, contador, «Aportado por», `metricId`, entidades) ⇒ `text-caption`. Además el número es EXACTO: cualquier commit ajeno que lo mueva lo desincroniza (ver §7). |
| 3.5 `docs/DESIGN.md` | 957 líneas | 986; único cambio: sección nueva «Switch tab — `SegmentedControl`» (`:704-731`: segmentado = filtro de un bloque; `Tabs` = navegación; no re-pintar el activo; `data-testid` dentro del `label`; `ariaLabel` obligatorio si `label` no es string). Sentence case (`:35`), anti-patrones §9 (`:427-449`) y §21 «Marca de datos de muestra» (`:955-971`) **idénticos** en texto (solo corrieron de línea). | Si 13-07 usa `SegmentedControl` (filtro de capas de memoria), seguir `:704-731`. Resto sin cambio. |
| 3.6 `docs/COLOR_SYSTEM.md`, `docs/VOCABULARIO.md` | — | Idénticos. | Sin cambio (colores de agentes, vocabulario). |
| 3.7 Iconos | 0 imports de `lucide-react` en `src/` (R13-14) | 2 archivos lo importan (`contratos/CesionDelInmueble.tsx`, `contratos/TerminarContrato.tsx`); `CLAUDE.md:37` dice «Phosphor + Lucide». | La regla de la fase («solo Phosphor») sigue; corregir el dato de R13-14 (cosmético). |
| 3.8 `Banner` de cadence (guardián NUEVO `el-banner-no-lleva-bloques.test.ts`) | — | Hijos del `Banner` solo en línea (`span` con `block`, `role="list"`): su contenido va dentro de un `<p>`. | Ningún plan usa `Banner` (solo UI-SPEC lo lista, `:43`): advertencia si un ejecutor lo introduce. |

***

## 4 · Consumo del agente y mock-first

| # | VIEJO | NUEVO | Consecuencia |
|---|---|---|---|
| 4.1 `agent-fetch.ts` | `agentFetch` `:99`, solo reintenta el 401 (`:108`), sesión muerta ⇒ `terminarSesion('expirada')` | Mismas líneas `:99`/`:108`; sesión muerta ⇒ `void terminarSesionSiMurio('expirada')` (`:117`: confirma con el refresh token antes de cerrar). `agent-auth.ts` idéntico. | Transporte de 13-01 sin cambio. |
| 4.2 `config.ts` | `getApiConfig` `:43-51` (opt-in, nunca en `production`), `isMockMode` `:70` | **Idéntico.** `.env.example:42` sigue `NEXT_PUBLIC_USE_MOCK_API=true` (ticket V3 vigente). `funnel.service.ts:24-27` sigue con el anti-patrón «sin URL ⇒ mock». | D13-6 sin cambio. |
| 4.3 Molde del espejo | `piloto.ts` cabecera MIRROR `:3-26`, 651 líneas | Cabecera MIRROR igual (`:4-12`), 953 líneas. `piloto.ts` y `agent-workspace.ts` ahora envuelven el `fetch` en `conBackoff` (`src/lib/api/fetch-with-backoff.ts`, T-0076: 429 `agents_limit`). | Advertencia 13-01: un 429 del agente cae en `no_disponible` (P5) sin backoff; decidir si `pedirANaira` usa `conBackoff` (no cambia el contrato de estados). |
| 4.4 `clasificar.ts` | 253 líneas; `TipoDeFallo` = 5 valores; `esSinPermiso` `:251` | 613 líneas; `TipoDeFallo` gana `limitado`, `sinCreditos` (402), `sinSegundoFactor` (403 `SEGUNDO_FACTOR_REQUERIDO`), `segundoFactorPendiente`, `tardo`, `baseAtrasada` (503 `FALTA_UNA_MIGRACION`) (`:27-57`); `esSinPermiso` sigue = `statusDe(e) === 403` (`:611-613`); `new Error('403')` se sigue leyendo como 403 (`SOLO_EL_STATUS`, `:147-151`). | `NairaSinPermiso` con `new Error('403')` sigue clasificando `sinPermiso`. Naira no usa los tipos nuevos (D13-4 cierra sus 8 estados); declarado. |
| 4.5 `FalloDeCarga` | Props `error, queEs, onReintentar, volverA` | + `enmarcado`, y **lee `usePermissionsContextSafe()`** para pasar `creoQueTengoAcceso: isAdmin` a `clasificarFallo` (`:109-113`): al admin no se le dice «pedile permiso a un admin». `role="alert"` ahora `:176`. | Advertencia 13-02: el copy de `NairaSinPermiso` cambia si el usuario es admin del monolito (el caso típico de D13-3); los tests del cartel deben mockear `PermissionsContext` (o usar el `Safe` = `null`) y aseverar el texto que corresponda. |
| 4.6 `EstadoDeDatos` | 93 líneas | 148: prop `principal` (`:62`); si el dato principal fue NEGADO avisa a `ProveedorDeAcceso` y `PageGuard` cambia la pantalla ENTERA por el cartel (`:86-102`; `components/auth/acceso-de-la-pantalla.tsx:1-85`). Guardián de mecanismo `sin-acceso-no-se-puede-nada.test.tsx` (NUEVO). | Naira no usa `EstadoDeDatos` (usa `VistaDeNaira`, que ya evalúa el estado antes que los hijos): cumple la regla «negado ⇒ ningún control vivo» por construcción dentro de la vista. Advertencia: el compositor de 13-06 y los botones de 13-05/13-07 NO deben quedar fuera de `VistaDeNaira` (si no, contradicen la regla de Nico del 21-09). |
| 4.7 `AvisoDatosDeEjemplo`, `AvisoModoSimulado` | 71 / 71 líneas | **Idénticos.** | El arreglo de contraste C11 de 13-02 sigue aplicando tal cual. |
| 4.8 Fixtures | `src/lib/data/mock-*.ts` (8), incl. `mock-retencion.ts` (418 líneas) | Convención igual (`mock-candidates`, `mock-explanations`, `mock-mantenimiento`, `mock-reports`, `mock-users`); **`mock-retencion.ts` se borró** en `5b2e35d8` (26-09, «Vinci con datos reales en el panel»). | `src/lib/data/mock-naira.ts` sigue siendo la ubicación correcta. Pero todo texto del fixture pasa por `el-producto-tutea` (ver §5): tuteo obligatorio. |
| 4.9 `retencion.ts` (anti-análogo) | Caía al mock ante CUALQUIER error, sin guarda de producción (R13-8) | Reescrito (`5b2e35d8`): **«SIN DATOS DE EJEMPLO»**; `ErrorDeVinci(status, mensaje, code)`; sin URL ⇒ error declarado (`:41`); un 404 con Vinci apagado «se lee como "Vinci no está encendido", no como datos» (`:7-10,52`). | Ya **no** es anti-análogo: es el precedente más cercano de D13-4 (`apagada` ≠ datos; sin URL ⇒ `no_disponible`). Actualizar R13-8 y PATTERNS (cosmético). Señal de producto: Nico está retirando datos de ejemplo del panel (retención, `/pse-mock`); el mock-first de Naira sigue siendo opt-in y nunca en producción, pero se suma a la 🔔 U15. |
| 4.10 `PermissionsContext.tsx` | `isAgentModule` `:197` antes que `isAdmin` `:204` | Orden **preservado**: `:218` / `:225`. Nuevo: `consumePermissionsSeed()` del bootstrap para el lado del back (T-0082, `:139-158`); la llamada al agente `/my-permissions` sigue siempre desde acá (`CLAUDE.md:93-95`); `modulosPagos` en el valor del contexto. Sin bypass de mock (medido: 0 `isMockMode`). | 13-01 sigue sin tocar el archivo (P12 vale). El control `git diff --quiet 5e3a6f85 -- PermissionsContext.tsx` (13-01:1186) da RC≠0 porque el archivo cambió ENTRE bases ⇒ **bloquea**; va contra la base nueva. El molde `PermissionsContext.test.tsx` creció (+78) pero conserva `vi.mock('@/lib/auth')` y `vi.mock('@/lib/api/client')` (`:30,40`). |
| 4.11 `agent-module-access.ts` (+ test) | `FAIL_CLOSED_MODULES = ['cobranza','cotizador']` `:33`; test «recognizes the five» `:20-29` | **Idénticos** (65 / 89 líneas). | Tarea de 13-01 sin cambio (pasa a SEIS). |
| 4.12 `PageGuard.tsx` | `hasAccess = isAdmin \|\| …` `:48`; denegado ⇒ `router.replace('/panel/inmobiliaria')` `:52` | `isAdmin \|\|` sigue (`:57`). Denegado ⇒ **se DICE**: `FalloDeCarga` 403 `SIN_PERMISO_DE_MODULO` con «Ir al inicio del panel» (`:98-108`, QA 22-09). **Sin señal (`navigator.onLine === false`) NO expulsa** y renderiza los hijos (`:78,94-96`). Envuelve a los hijos en `ProveedorDeAcceso` (`:129-139`). | D13-3 se refuerza (ya no hay redirección muda). Actualizar las descripciones «PageGuard redirige» (PATTERNS `:156,682,861`, UI-SPEC `:126`, 13-03:445, 13-04:469): cosmético. Advertencia: dos carteles de "sin permiso" distintos según quién niegue (front ⇒ `FalloDeCarga` de PageGuard; agente ⇒ `NairaSinPermiso`); y con el navegador offline los hijos se montan (el cliente dará `no_disponible`, nunca datos). |
| 4.13 `AgencyRoleGuard`, `PermissionGate` | 52 / 58 | **Idénticos.** | Sin cambio. |
| 4.14 `agency-roles.ts` | `ADMIN \| AGENTE \| CONTADOR \| VIEWER` | + `COORDINADOR`, `AUXILIAR_CARTERA`, `ABOGADO_EXTERNO` (O-05, 18-09; `:10-24`). | R13-9 y ticket V5: el mapeo del agente (`members-core.ts`) no conoce los 3 nuevos [ASUMIDO: no medido en `origin/develop` del agente]. Ningún plan usa `Record<AgencyRole, …>` exhaustivo (la UI decide por el arreglo `naira`), así que no rompe `tsc`. Anotar en UI-SPEC U-vocabulario de roles. |
| 4.15 `useAuth().agency?.id`, `useRefetchOnVisible` | `use-piloto-briefing.ts:28-29`; `useRefetchOnVisible.ts:17` | Iguales (`useRefetchOnVisible.ts:17`, archivo con cambios menores). | Sin cambio. |

***

## 5 · Tests y comandos

**Infraestructura — idéntica entre bases** (`git diff --quiet` = 0 en los 6 archivos): `vitest.config.ts` (happy-dom, `globals`,
`setupFiles: ['./vitest.setup.ts']`, `include` `src/**/*.test.ts(x)` + `scripts/**/*.test.ts` `:24`, `server.deps.inline` de
`cadence/node_modules` `:32`, alias `react`/`react-dom` al del front `:45-46`, `dedupe` `:59`; sin proyectos), `vitest.setup.ts`
(arreglo de `localStorage` con Node 25), `playwright.config.ts` (proyecto `panel-a11y`), `tsconfig.json` (incluye `.next/types/**`,
excluye `tests/e2e`), `components.json`, `.github/workflows/ci.yml` (Node 20 `:43`, clona cadence con `CADENCE_REPO_TOKEN` `:59-64`,
`install --frozen-lockfile` `:70`, `tsc --noEmit` `:75`, `pnpm test` `:79`). Scripts: `test = vitest run`, `lint = next lint`,
`build = next build`, `api:gen = bash scripts/api-gen.sh` (sin cambio salvo `postinstall`, §2.7). **Sin Testing Library**
(`@testing-library/*` = 0 en `package.json`). i18n: `src/lib/i18n/locales/{es,en}.json`, `i18n-test-stub.tsx` y
`claves-avaluos.test.ts` idénticos; `inmobiliaria.nav.secAgentes` = «Agentes IA» / «AI Agents»; `naira` = 0 claves.
E2E: `_helpers/auth-helpers.ts` y `axe-helpers.ts` con 1 línea cambiada cada uno; `seedAuthState` sigue mockeando
`**/inmobiliaria/agency/my-permissions` y `**/api/agency/*/my-permissions` (este último con `cobranza`/`cotizador`, sin `naira`,
`:123-124,183-196`) y **no** mockea `GET /users/me/bootstrap`, que el `AuthProvider` ahora pide primero con fallback por sección
(`CLAUDE.md:77-94`) [ASUMIDO: el fallback deja entrar al E2E como antes; 13-08 lo verifica].

**Guardianes que los planes ya consumían** (estado en la base nueva):

| Guardián | Cambio | Qué asevera hoy / efecto sobre Naira |
|---|---|---|
| `src/lib/nav/arquitectura-del-panel.test.ts` | 353→973 líneas | §1.3. Es el que decide la ubicación. |
| `src/lib/nav/gates-del-panel.test.ts` | idéntico | `module` de todo `PageGuard` debe ser del back o `isAgentModule` (`:86`); lista de módulos rotos cerrada (`:159-165`). `naira` entra al agregarse en 13-01. |
| `src/app/panel/inmobiliaria/fichas-con-vuelta.test.ts` | idéntico | `*Client.tsx` bajo segmento dinámico ⇒ `VolverALaLista`. Sin cambio. |
| `src/app/panel/inmobiliaria/nav-badges.test.ts` | idéntico | Badges del layout. Sin efecto. |
| `src/lib/nav/rutas-por-ciclo-de-vida.test.ts` | +10/−5 | Destinos repuntados `/cobros`→`/pagos`. Sin efecto directo. |
| `src/components/ui/sin-dialogos-del-navegador.test.ts` | solo timeout 60 s | Sin `window.confirm/alert/prompt`. Sin cambio. |
| `src/components/estado/cuatro-estados.test.ts`, `el-reintento-devuelve-su-promesa.test.ts`, `destinos-de-los-vacios.test.ts` | existían; solo rutas/timeout | Sin cambio (13-03 ya los contaba). Nota: `recargar: () => void` de `useLecturaDeNaira` no rompe el guardián pero deja el botón sin estado «Intentando…» (`FalloDeCarga` espera una promesa): advertencia de UX, no de test. |
| `src/components/auth/PageGuard.test.tsx` | existe | Mecanismo nuevo (§4.12). |

**Guardianes NUEVOS que una página/workspace de Naira tiene que pasar** (medidos; 499 archivos de test nuevos entre bases, estos son
los que barren el repo o el árbol del panel):

| Guardián (nuevo) | Qué barre y asevera | ¿Naira lo toca? | Severidad |
|---|---|---|---|
| `src/components/doce-pixeles.guardian.test.ts` | `text-xs` total = 2716 exacto (`:91,109`) | Sí: 21 `text-xs` en 13-02..13-07 | **Bloquea** (§3.4) |
| `src/lib/i18n/el-producto-tutea.test.ts` | voseo inequívoco (`marcá`, `podés`, `avisale`…) en `.ts/.tsx/.json` de `src/app`, `src/components`, `src/lib` (incluye `es.json` y `mock-naira.ts`; saltea comentarios) | Sí: copy y fixtures (E13-8: ejemplos del agente en voseo) | Advertencia fuerte: copiar texto del agente a un fixture sin pasarlo a tuteo pone rojo el guardián |
| `src/lib/i18n/claves-que-faltan.guardian.test.ts` | todo `t('a.b.c')` literal del producto existe en es y en | Sí (refuerza `claves-naira.test.ts`) | Cubierto si 13-0N cumple su regla i18n |
| `src/lib/i18n/el-producto-no-nombra-al-operador.test.ts` | «Víctor» fuera de comentarios en `src/` (salvo `/admin`) | Solo si el copy nombra al operador | Advertencia (los tickets V1-V6 no deben llegar al copy) |
| `src/app/enlaces-a-pantallas-que-existen.guardian.test.ts` | enlaces con camino LITERAL (`href="/x"`, `router.push('/x')`) apuntan a rutas declaradas | Naira arma rutas desde mapas/constantes: no se juzgan; sí `volverA` literales | Advertencia |
| `src/app/destinos-de-la-url-saneados.guardian.test.ts` | quien lee `returnUrl/next/redirect…` de la URL llama `sanitizeReturnUrl`/`rutaDeRegreso` | Naira lee `dia`, `capa`, etc., no destinos | Sin efecto |
| `src/app/panel/inmobiliaria/el-fallo-de-una-ficha-tiene-salida.test.ts` | en fichas bajo `[id]`, un `<FalloDeCarga` a pantalla completa va con `BackButton`/`VolverALaLista`/`<Link href=` en el MISMO `return` | Las fichas de Naira pintan `VistaDeNaira` (el `FalloDeCarga` vive en `components/inmobiliaria/naira/`): no se juzgan; su `VolverALaLista` ya lo pide `fichas-con-vuelta` | Sin efecto (declarar) |
| `src/app/panel/inmobiliaria/el-panel-tiene-tope-de-ancho.test.ts` | el `<main>` del layout lleva `max-w-[1920px] mx-auto` | No (la fase no toca el layout) | Sin efecto |
| `src/app/panel/un-solo-main.guardian.test.ts` | ninguna página del panel abre su propio `<main>` (lista declarada que no crece) | Sí si una View de Naira usa `<main>` | Advertencia: usar `<section>`/`<div>` (los planes no escriben `<main>`, medido 0) |
| `src/components/auth/sin-acceso-no-se-puede-nada.test.tsx` | mecanismo `PageGuard` + `EstadoDeDatos principal` | No (prueba el mecanismo) | Sin efecto (§4.6) |
| `src/lib/api/un-contrato-sin-back-se-declara.test.ts` | toda frase `CONTRACT ONLY` / `no backend (today\|yet)` en `src/` está en su lista | El espejo de Naira ES un contrato sin back, pero sus cabeceras dicen `// estado: PLANIFICADO` (no matchea) | Advertencia: si el ejecutor escribe «no backend yet» en la cabecera, hay que declararlo en la lista (recomendado por el espíritu del guardián: el espejo aparenta endpoints que no existen) |
| `src/lib/api/puertas-que-faltan.guardian.test.ts`, `rutas-que-el-back-no-tiene.guardian.test.ts`, `lo-que-el-back-ofrece-y-nadie-usa.test.ts` | solo `src/lib/api/*.service.ts` de primer nivel con `export const xApi = {…}` / `apiClient.verbo(` contra el BACK | `src/lib/api/naira/cliente.ts` (funciones sobre `agentFetch`, en subcarpeta) no entra | Sin efecto (declarar) |
| `src/lib/errores/el-error-entero-llega-a-la-pantalla.test.ts` | nadie hace `setX(e instanceof Error ? e.message …)` y pasa `x` a `FalloDeCarga`/`EstadoDeDatos` | Naira pasa `new Error('403'/'503')` construido: OK | Sin efecto |
| `src/components/ui/el-banner-no-lleva-bloques.test.ts` | hijos en línea dentro de `Banner` | Solo si se usa `Banner` | Advertencia |
| `src/lib/nav/el-asesor-comercial.test.ts`, `fila-activa-del-menu.test.ts`, `secciones-del-menu.test.ts`, `la-sala-de-pagos-se-fue.test.ts`, `un-solo-modulo-de-plata.test.ts`, `los-nombres-que-no-decian-nada.test.ts`, `toda-sub-pantalla-tiene-vuelta.test.ts`, `la-etiqueta-no-repite-la-migaja.test.ts` | sidebar por rol (matriz por defecto del asesor), fila activa, secciones plegables, mudanzas de rutas, sub-pantallas de Contabilidad | Con `naira` fail-closed el asesor no la ve (su `canAccess` es la matriz del back); ninguno barre `/reportes/naira` | Sin efecto (el de fila activa: con N2 en `agentes`, `/reportes/naira/…` marca la fila de Naira, no Reportes — consistente) |
| `src/lib/search/sources/__tests__/navigation-source.test.ts` | los agentes se buscan bajo «Agentes IA» (lista puntual, no cerrada) | No exige fila de Naira | Advertencia (§1, ⌘K) |

**No hay guardián nuevo que obligue a un workspace a declarar algo más que lo de `arquitectura-del-panel.test.ts`.**

***

**E2E — un cambio que bloquea 13-08:** la intro del agente ya no se marca en `localStorage` (`leasefy.agent-intro.<id>`): se lee y
escribe por inmobiliaria en el back (`GET/PUT /inmobiliaria/onboarding-visto`, clave `agente:<id>`; `AgentIntroModal.tsx` cabecera
`:8-21`; `onboarding-visto.service.ts:18-70`), y se suprime mientras el recorrido del panel no conste visto (`tourDismissed !== true`,
`CabeceraDelAgente.tsx:50`). `const STORAGE_PREFIX = 'leasefy.agent-intro.'` ya no existe (queda solo en un comentario). 13-08 ancla
esa línea (`13-08-PLAN.md:210,627`) y su helper `sinIntroDeNaira` siembra `localStorage` (`:352,382`) ⇒ **PARA**; el helper pasa a
`route.fulfill` de `**/inmobiliaria/onboarding-visto` (o se apoya en que, sin respuesta, la intro queda suprimida).

***

## 6 · El agente (`agent-account-manager`, SOLO LECTURA)

HEAD de `project/account-manager` = **`fb8d3e8c`** (2026-09-28 00:05; el `9d4112ba` del encargo quedó 2 commits atrás). Desde `46e00d10`:

| Commit | Qué | Efecto en la 13 |
|---|---|---|
| `f750aafd`, `752e24f3` | SUMMARY y control #5 de 6.5-07 | Ninguno. |
| `9d4112ba` | HANDOFF §1.3 (avance de carriles) | Informativo: 09-01..03 y 11-01 ejecutados y 12-01 en curso **en otras ramas** (`exec/naira-lane-b` `fab4b083`, `exec/naira-lane-c` `4374e017`), sin integrar a `project/account-manager`. |
| **`5d2f9291`** | **E13-1 aplicada** en `10-04-PLAN.md` (`:379-380` contrato): `RUTAS_DEL_PANEL = { briefing: '/panel/inmobiliaria/reportes/naira', senal: '…/senales', recall: '/panel/inmobiliaria/reportes/naira' }` (recall = `?dia=<lunes>#recall`); sin `reglas`, `colaLegacy`, `arranque` (E13-1(b)); `[RND:enlaces]`, `[BRF:recall-lunes]`, `[BRF:sin-go-live]` ajustados. | Las URLs de la 13 ya son contrato del agente ⇒ la recomendación de §1 **no puede** cambiar la URL sin re-enmendar la 10. El ancla de 13-03 Paso 0 `RUTAS_DEL_PANEL = { briefing: '/naira/briefing', senal: '/naira/senales'` (`13-03-PLAN.md:350-351`) ya no está ⇒ **PARA**. |
| **`fb8d3e8c`** | **E13-2 aplicada** (parcial) en 10-CONTEXT `:126,:264`, 10-02, 10-04, 10-06, 10-08: `ItemCongelado` gana `entidades: {kind:'agregada'} \| {kind:'lista'; items:{tipo;id}[]}`; `NairaBriefingItem` = **14** campos; `NairaSignalDetail.item.entidades` = la lista de UI-01 (`10-06-PLAN.md:333`). Señal y Estado ⇒ `agregada`; cola legacy ⇒ `lista`; `tipo ≠ inmueble` ⇒ `TypeError` (B-5). La parte de 09-04 (`SenalPromovida` copia `affectedEntities`) NO se aplicó (09-* en ejecución). | 13-01: el espejo `NairaBriefingItem` (13 campos, `13-01-PLAN.md:342-345`) queda corto; con `.strict()` en los fixtures, el test de fixtures pasa pero el espejo miente respecto del contrato publicado; y el ancla de Paso 0 sobre 10-CONTEXT `readonly causa: … \| { readonly kind: 'investigacion_no_disponible' } }` (`13-01-PLAN.md:754`) **ya no está** (medido con `python3`) ⇒ **PARA**. 13-03: `entidadesDeLaSenal` («HOY `agregada`», `13-03-PLAN.md:548-549,748`) debe leer `detalle.item.entidades`. |

**Código consumido — sin cambios desde `46e00d10`** (`git diff --stat 46e00d10 HEAD -- src` = vacío): `src/server/routes/naira-memory.ts`
(la única ruta de Naira que EXISTE), `src/server/routes/permissions-matrix.ts`, `src/naira/metrics/catalog.ts`. No existen
`naira-conversacion.ts`, `naira-briefing.ts`, `naira-notification-config.ts`, `naira-open-loops.ts`, `naira-acciones.ts` (RC 128).
`/my-permissions` sigue sin `naira` (10-06 sin ejecutar) ⇒ R13-4 y D13-3 intactos. Los `<contrato_publicado>` de **9.5-06, 11-07,
12-07** no cambiaron; el de **10-06** solo por E13-2. En los carriles: 12-01 ejecutado en `exec/naira-lane-b` declara «todos los
nombres y firmas de `<contrato_publicado>` están en disco **sin renombres**» (`12-01-SUMMARY.md:139`) y exporta `TIPOS_DE_ACCION`,
`CLASES_DE_CONSECUENCIA`, `DUENOS_DE_TAREA = ['role:cartera','role:portafolio','role:prospectos']` (`src/naira/acciones/types.ts:40-66`);
ninguno de los dos carriles toca `permissions-matrix`, `naira-memory` ni `metrics/catalog` (medido). `ENMIENDAS-PASADA-UNICA.md`
§5 «Fase 13 — pendiente» sigue **vacía** (`:322-324`): E13-1/E13-2 se aplicaron inline en los planes, no por esa pasada; E13-3..E13-13
siguen sin aplicar.

***

## 7 · D13-17 resuelta (base = `cambios-nico-10`): cómo queda el Paso 0

**Hechos medidos.** `git merge-base --is-ancestor 5e3a6f85 HEAD` ⇒ **RC=1** (los 8 planes paran en su punto 1). `4ad6c188` sí es
ancestro (RC=0) y `4ad6c188..HEAD` = 12 commits `docs(13…)` que solo tocan `.planning/naira/`. `cambios-nico-10` recibe entre 2 y 105
commits por día (41 el 26-09, 2 el 27-09, `git log --since=2026-09-20`); hoy su punta = `4ad6c188`. `5e3a6f85` y `4027f8c1` tienen el
mismo árbol (`23c68ce6`): ningún contenido de la base vieja falta en la nueva.

**Por qué el control `AJENO` de 13-03..13-07 ya no sirve tal cual.** Hoy es: `git diff --name-only 5e3a6f85 HEAD -- src tests package.json
pnpm-lock.yaml vitest.config.ts tsconfig.json` (+ `status`) ⊆ unión de `files_modified` de 13-01..13-0N (`13-04-PLAN.md:913-915`,
ídem 13-05:1069, 13-06:1004, 13-07:1150; `MOV` en 13-03:963-965). Contra `5e3a6f85` da miles de «ajenos» (base equivocada). Y aun
cambiando el SHA, tiene un agujero que con una base quieta no importaba y con una base que se mueve sí: es un control **por archivo**, y
los archivos compartidos que la 13 edita (`arquitectura-del-panel.ts`, su test, `agentWorkspaceNav.ts`, `es.json`, `en.json`,
`AgentIntroModal.tsx`, `WorkspaceNav.tsx`, `agent-module-access.ts`) son justamente los que `cambios-nico-10` toca casi a diario: si
alguien re-basa, un cambio ajeno a esos archivos entra por la unión sin disparar nada.

**Paso 0 propuesto (reemplaza el punto 1 y el bloque `AJENO`/`MOV`, igual de estricto o más):**

1. **Base fijada en UN lugar:** `.planning/naira/phases/13-superficie-naira/BASE-DE-EJECUCION` con una línea
   `4ad6c188bd79a1f1272d96411a75813f87707651 cambios-nico-10 2026-09-27`; la escribe y commitea SOLO el coordinador. Los bloques
   `automated` leen `BASE=$(cut -d' ' -f1 "$FASE/BASE-DE-EJECUCION")` en vez de fijar el SHA; `test -n "$BASE"` y
   `git cat-file -e "${BASE}^{commit}"` RC 0.
2. **Descendencia:** `git merge-base --is-ancestor "$BASE" HEAD` RC 0 y `branch --show-current` = `project/naira-superficie`.
3. **Misma base que el plan anterior:** el SUMMARY de 13-0(N−1) registra `BASE=`; si difiere del archivo ⇒ **PARA** (hubo un re-base
   entre planes: ver 6).
4. **Procedencia POR COMMIT** (reemplaza `AJENO`): `git rev-list --merges "$BASE"..HEAD` vacío (sin merges) y, para CADA commit de
   `git rev-list "$BASE"..HEAD`: su asunto empieza con `docs(13` / `feat(13-0` / `test(13-0` / `fix(13-0` / `refactor(13-0`, y
   `git diff-tree --no-commit-id --name-only -r <c>` ⊆ `.planning/naira/` ∪ unión de `files_modified` de 13-01..13-0N (la unión de
   hoy, leída con `FM_JS`). Un commit ajeno — aunque solo toque un archivo compartido — ⇒ **PARA**. Más el `status --porcelain`
   ⊆ unión (como hoy).
5. **Anclas:** se re-miden contra `$BASE` con el censo de `13-REBASE-PATTERNS.md` (literal y línea); **un ancla movida ⇒ PARA** (sin
   cambio). Las anclas del agente se re-miden contra `project/account-manager` (HEAD registrado en el SUMMARY; hoy `fb8d3e8c`).
6. **Re-base = acto del coordinador, nunca del ejecutor:** ni `rebase`, ni `merge`, ni `pull` dentro de un plan. Si Nico/Victor quieren
   subir de base entre planes: un commit que solo cambia `BASE-DE-EJECUCION`, re-censo de anclas, re-corrida de los tests de los
   planes ya ejecutados (sus marcadores `[N13:*]` y los guardianes del §5) sobre la base nueva, y recién ahí el plan siguiente.
7. **Deriva, medida y declarada (no bloquea hasta 13-08):** cada SUMMARY anota `git rev-list --count "$BASE"..cambios-nico-10` y
   `git merge-tree --write-tree --name-only cambios-nico-10 HEAD` (git 2.54 local) con los archivos en conflicto. **En 13-08 bloquea:**
   conflicto en un archivo compartido ⇒ PARA y se reporta (no se arregla). Los contadores exactos de guardianes que la 13 mueve
   (`toHaveLength(25)`→26 y las listas de «Agentes IA», `CUANTOS_HABIA = 2716` si alguien baja `text-xs`) van a chocar con la
   punta de `cambios-nico-10` en la integración: se declaran en `13-ACCEPTANCE.md`.
8. Entorno (D13-16) sin cambio de fondo: `../cadence` 1.0.57 presente; `pnpm install --frozen-lockfile` (el `postinstall` ahora copia el
   worker de MapLibre a `public/maplibre/`, ignorado por git); Node 20 como el CI; si la instalación falla ⇒ PARA.

***

## Impacto por plan

Severidad: **B** = bloquea ejecutar (el `automated` da F=1 o `tsc`/un guardián existente queda rojo) · **A** = advertencia (se ejecuta,
pero algo queda mal o sin cubrir) · **C** = cosmético (texto/cita desactualizado). Las líneas exactas de cada ancla movida son de
`13-REBASE-PATTERNS.md`; acá, el QUÉ.

| Plan | Tarea | Qué hay que cambiar (cita nueva) | Sev. |
|---|---|---|---|
| todos | T1 Paso 0 | `merge-base --is-ancestor 5e3a6f85 HEAD` RC=1 ⇒ Paso 0 de §7 (`BASE-DE-EJECUCION` = `4ad6c188`, procedencia por commit en lugar de `AJENO`/`MOV`); cabecera «base origin/Main = 5e3a6f85» (`13-0N-PLAN.md:10-12`) | **B** |
| 13-01 | T1 | Ancla del agente en 10-CONTEXT `readonly causa: … \| { readonly kind: 'investigacion_no_disponible' } }` (`13-01-PLAN.md:754`) ya no está (E13-2, `fb8d3e8c`) | **B** |
| 13-01 | T1 (contrato) | `NairaBriefingItem` = 14 campos: agregar `entidades: {kind:'agregada'} \| {kind:'lista'; items:{tipo;id}[]}` (`10-06-PLAN.md:333`, `10-CONTEXT.md:264`) al espejo y a los fixtures; `NairaSignalDetail.item.entidades` | **B** |
| 13-01 | T4 (`fuente-a-ruta.ts`) | `/cobros/*` no tiene `page.tsx`: `RUTA_DE_LA_METRICA`/`RUTA_POR_FUENTE` (`13-01-PLAN.md:1012-1013`) ⇒ `/pagos/cartera`, `/pagos/recaudo`, `/pagos/cobranza`, `/pagos/cobranza/{acuerdos,disputas,deudores,pagos,escalaciones}` (las 8 existen, medido); `[N13:ruta-con-pagina]` quedaría rojo | **B** |
| 13-01 | T5 | `git diff --quiet 5e3a6f85 -- src/lib/context/PermissionsContext.tsx` (`13-01-PLAN.md:1186`) da RC≠0 (el archivo cambió entre bases) ⇒ contra `$BASE`; `git show 5e3a6f85:"$AT"` (`:1189`) ⇒ `$BASE` (el archivo es igual, pero no hay que depender de un SHA fuera de la historia) | **B** |
| 13-01 | T5 | P12: `isAgentModule` antes que `isAdmin` sigue siendo cierto (`PermissionsContext.tsx:218,225`, antes `:197,:204`); el molde de test sumó bootstrap-seed y `modulosPagos` | C |
| 13-01 | T2 | 429 del agente (`agents_limit`) ⇒ `no_disponible` sin backoff; evaluar `conBackoff` (`fetch-with-backoff.ts`, ya en `piloto.ts`/`agent-workspace.ts`) | A |
| 13-01 | T1 (fixtures `mock-naira.ts`) | `mock-naira.ts` entra al barrido de `el-producto-tutea` (voseo ⇒ rojo): textos en tuteo | A |
| 13-02 | T2-T5 | 12 firmas `): JSX.Element` ⇒ `import type { JSX } from 'react'` o `React.JSX.Element` (`4b6b093d`) | **B** |
| 13-02 | T2-T4 | 7 `text-xs` ⇒ `text-overline`/`text-label` (rótulos) o `text-caption` (contenido); `doce-pixeles` = 2716 exacto | **B** |
| 13-02 | T1 (`NairaSinPermiso`) | `FalloDeCarga` lee `usePermissionsContextSafe()` y cambia el copy si `isAdmin` (`FalloDeCarga.tsx:109-113`): mockear y aseverar ese texto | A |
| 13-02 | T1 | `role="alert"` de `FalloDeCarga` ahora `:176` (antes `:147`); UI-SPEC/PATTERNS dicen que `PageGuard` redirige (ya no) | C |
| 13-03 | T1 | Anclas `"next": "14.2.35"` (`13-03-PLAN.md:957`), `expect(modulos).toHaveLength(17);` (`:1003`) y, del agente, `RUTAS_DEL_PANEL = { briefing: '/naira/briefing', senal: '/naira/senales'` (`:350-351`, E13-1 ya aplicada) | **B** |
| 13-03 | T1 (`briefing-y-senal.ts`) | `entidadesDeLaSenal` («HOY `agregada`», `:548-549,748`) ⇒ leer `detalle.item.entidades` del contrato nuevo (señal hoy = `agregada`; `lista` = cola legacy) | A |
| 13-03 | T2-T5 | 8 `JSX.Element`; 3 `text-xs` | **B** |
| 13-03 | T4 (ficha de señal) | `page.tsx` con `params: Promise<{ promocionId: string }>` + `await` (molde `pagos/cobranza/deudores/[id]/page.tsx:17-29`); ancla `<SenalClient promocionId={params.promocionId} />` (`:1473`) cambia; molde citado `cobros/…` ⇒ `pagos/…` | **B** |
| 13-03 | T5 (A, `arquitectura-del-panel.ts`) | Fila N3 en `reportes.pantallas` con `ia: true` ⇒ **N2 en el grupo `agentes`** (`key: 'naira'`, `href: r('/reportes/naira')`, `module: 'naira'`, `scope: 'general'`, `agente: 'naira'`, sin `ia`), antes de `desempeno-ia` (`:365`); actualizar `arquitectura-del-panel.test.ts:238` (25→26), `:755-765`, `:767-780`, `:853-873` con su «Eran 25 hasta que entró Naira» 🔔 D13-1′ | **B** |
| 13-03 | T5 (B, `agentWorkspaceNav.ts`) | «DESPUÉS del bloque `pagos`» no existe (el workspace `pagos` se fue): insertar antes de `// ── Mantenimiento (tickets) — APAGADO` (`agentWorkspaceNav.ts:256`); `const PAGOS` sigue (`:105`); `action?: string` en `WorkspaceNavItem` (`:60-73`) sigue siendo necesario | **B** |
| 13-03 | T5 (guardia `naira-sin-seccion-paralela`) | `[N13:ficha-del-workspace]` espera `moduloDeLaRuta(...)?.key === 'reportes'` y migaja «Reportes › Naira › Detalle» ⇒ `'naira'` y «Agentes IA › Naira › Detalle»; `[N13:sin-seccion-paralela]` «la cuenta de 17 sigue» ⇒ «Naira es la única fila nueva, en `agentes`, y `reportes` sigue con resumen y rentabilidad» | **B** |
| 13-03 | T5 (D, `AgentIntroModal`) | La entrada `naira` en `AGENT_INTROS` sigue igual, pero la marca «vista» es del back (`agente:naira`) y la intro se suprime hasta `tourDismissed === true`; los tests que monten la intro mockean `PanelPrefsContext` | A |
| 13-03 | T5 | Fila en `navigation-source.ts` (⌘K, `context: 'Agentes IA'`) — ningún plan la agrega | A |
| 13-04 | T1 | Anclas `"next": "14.2.35"` y `toHaveLength(17)` (2 por plan, pattern-mapper); `AJENO` (`13-04-PLAN.md:913-915`) ⇒ §7.4 | **B** |
| 13-04 | T2-T5 | 11 `JSX.Element`; 1 `text-xs` | **B** |
| 13-04 | T5 (ficha del loop) | `params` `Promise` + `await`; anclas `<LoopClient loopId={params.loopId} />` (`:1419,1488`) cambian; molde «Alternativo (Next 15)» ya previsto en `:481-482` pero con la ruta vieja `cobros/…` | **B** |
| 13-04 | T1 (interfaces) | «PageGuard ⇒ `router.replace`» (`:469`) ya no: pinta `FalloDeCarga` 403 | C |
| 13-05 | T1 | Paso 0 / anclas / `AJENO` (`13-05-PLAN.md:1069`) como 13-04 | **B** |
| 13-05 | T2-T5 | 9 `JSX.Element`; 1 `text-xs` | **B** |
| 13-05 | T5 (ficha de propuesta) | `params` `Promise`; anclas `<PropuestaClient proposalId={params.proposalId} />` (`:1654-1655,1740`) cambian | **B** |
| 13-05 | T2-T3 | Vocabulario de 12-01 ejecutado en `exec/naira-lane-b` sin renombres (`12-01-SUMMARY.md:139`; `TIPOS_DE_ACCION`, `CLASES_DE_CONSECUENCIA`, `DUENOS_DE_TAREA` en `src/naira/acciones/types.ts:40-66`) — aún NO en `project/account-manager`: el Paso 0 sigue midiendo el `<contrato_publicado>` de 12-07 | C |
| 13-06 | T1 | Paso 0 / anclas / `AJENO` (`13-06-PLAN.md:1004`) | **B** |
| 13-06 | T2-T4 | 7 `JSX.Element`; 5 `text-xs` (contador, ayuda, alcance, etiqueta RESPUESTA) | **B** |
| 13-06 | T4 | El compositor debe quedar DENTRO de `VistaDeNaira` (regla «sin acceso no se puede nada», §4.6) | A |
| 13-07 | T1 | Paso 0 / anclas / `AJENO` (`13-07-PLAN.md:1150`) | **B** |
| 13-07 | T2-T4 | 7 `JSX.Element`; 4 `text-xs` | **B** |
| 13-07 | T4 | Si el filtro de capas usa `SegmentedControl`, seguir `docs/DESIGN.md:704-731` (nuevo) | C |
| 13-07 | — | `naira-memory.ts` sin cambios desde `46e00d10`: los 4 endpoints de memoria que consume siguen iguales | — |
| 13-08 | T1 | Paso 0 (base de la fase); ancla `const STORAGE_PREFIX = 'leasefy.agent-intro.'` (`13-08-PLAN.md:210,627`) ya no existe; `sinIntroDeNaira` por `localStorage` (`:352,382`) ⇒ `route.fulfill` de `**/inmobiliaria/onboarding-visto` | **B** |
| 13-08 | T1/T5 | `seedAuthState` no mockea `GET /users/me/bootstrap` (nuevo en el `AuthProvider`); verificar que el fallback por sección deja entrar | A |
| 13-08 | T3 (`13-ACCEPTANCE.md`) | Crit. 1 con la ubicación nueva (N2 de «Agentes IA», URL `/reportes/naira`, migaja «Agentes IA › Naira»); declarar los contadores de guardianes que chocarán al integrar (§7.7) | A |
| 13-08 | T4 | Tras `pnpm build`: `node scripts/variables-libres-del-build.mjs` (`CLAUDE.md:122-128`); `tsc` sobre la copia con `.next/types` valida los `params` `Promise`; `pnpm lint` = `next lint` (sigue en 15.5) | A |
| 13-08 | T4/T5 | Gate de deriva de §7.7 (`git merge-tree` contra la punta de `cambios-nico-10`) antes del checkpoint humano | A |
| docs | CONTEXT D13-1, R13-1/2/7/8/12/14; UI-SPEC U1 (`:27,68,76-92,854-856,947`), §6.2 (rutas `/cobros`), tipografía (`:179,235,274,300`); PATTERNS §0.2, `:156,682,861` | Ubicación N2, rutas `/pagos`, tipografía sin `text-xs`, `PageGuard` que ya no redirige, `retencion.ts` que ya no es anti-análogo, `lucide` presente en 2 archivos | C (pero los planes los copian: arreglar antes de re-emitir) |

***

## Decisiones 🔔 afectadas

| # | Estado con la base nueva | Qué se le pregunta a Nico |
|---|---|---|
| **D13-1** | Intención vigente; **forma inválida** (N3 de Reportes con `ia: true` rompe `arquitectura-del-panel.test.ts:349-353,782-787,963`). | **D13-1′:** ¿Naira como módulo N2 de «Agentes IA», URL `/panel/inmobiliaria/reportes/naira` (la ya contratada por E13-1), migaja «Agentes IA › Naira», sin píldora IA? (precedente: «Desempeño IA», `/reportes/ia`). |
| **D13-1′ orden** | Nuevo | ¿Antes de «Desempeño IA» (que cierra la sección) y después de «Agente de pagos»? Fuera de la barra móvil. |
| **Regla «sin sacar»** | Nuevo (`arquitectura-del-panel.ts:109-111`) | ¿Registrar la fila gateada fail-closed (invisible hasta que el agente publique `naira`) o comentarla como Retención/Tickets hasta el go-live? Recomendado: gateada, declarada en la fila. |
| **D13-2** | Vigente: Piloto = Inicio y sigue pintando el briefing y el recaudo del Gerente (`piloto/page.tsx:82,128,190-192`). | Sin cambio (ticket V2 sigue). |
| **D13-3** | Vigente y reforzada: `PageGuard` ya no redirige (dice «No tienes acceso», `:98-108`), `isAdmin \|\|` sigue (`:57`), orden `isAgentModule` → `isAdmin` intacto (`:218,225`). | Nuevo matiz: ¿un solo copy de "sin permiso" para Naira (front o agente), o se aceptan dos carteles? |
| **D13-10, D13-11, D13-12** | Sin cambio por la base. E13-2 aplicada no toca B-5 (`tipo ≠ inmueble` ⇒ `TypeError` en el agente). | — |
| **D13-17** | **Resuelta** (base `cambios-nico-10`). | Aprobar el Paso 0 de §7 (base fijada en un archivo, procedencia por commit, re-base solo del coordinador, deriva medida y bloqueante en 13-08). |
| **U-tipografía (UI-SPEC)** | Nueva restricción dura (`doce-pixeles`) | Rótulos mono en `text-overline` (12 px vía clase) / `text-label` (11 px) y contenido en `text-caption` (13 px): ¿de acuerdo con que DATO/INFERENCIA y los cortes vayan en `text-label`? |
| **U15 (datos de ejemplo)** | Contexto nuevo: Nico retiró el mock de retención (`5b2e35d8`, «SIN DATOS DE EJEMPLO») y `/pse-mock`. | ¿Sigue en pie el mock-first opt-in de Naira (nunca en producción) mientras el agente no esté vivo? |
| **Q11 / V5** | Tres roles de agencia nuevos (`agency-roles.ts:10-24`) sin mapeo medido en el agente. | Ticket a Victor: ¿cómo mapea el agente `COORDINADOR`, `AUXILIAR_CARTERA`, `ABOGADO_EXTERNO`? |

## Supuestos (a confirmar al ejecutar)

| # | Supuesto | Riesgo si falla |
|---|---|---|
| A1 | `pnpm install --frozen-lockfile` resuelve en el worktree con `../cadence` 1.0.57 y React 19 (no se ejecutó) | Paso 0 para (D13-16) |
| A2 | El back acepta la clave `agente:naira` en `PUT /inmobiliaria/onboarding-visto/:clave` | La intro de Naira no se marca vista (reaparece) |
| A3 | `useSearchParams` sin `Suspense` sigue construyendo como en las 49 páginas del panel que ya lo hacen | `next build` de 13-08 rojo en las páginas de Naira |
| A4 | El E2E entra sin mockear `/users/me/bootstrap` (fallback por sección) | 13-08 no monta la página; `[N13:e2e-montado]` lo detecta |
| A5 | El acceso síncrono a `params` "funcionaría" en 15.5 con aviso; igual se recomienda `Promise` por la convención de la casa y `.next/types` | Si alguien lo deja síncrono: aviso en dev y `tsc` rojo tras el build |

## Fuentes

- Front, las dos bases (`git show 5e3a6f85:…` / árbol en `4ad6c188`): `src/lib/nav/arquitectura-del-panel.ts` y su test, `agentWorkspaceNav.ts`,
  `WorkspaceNav.tsx`, `AgentIntroModal.tsx`, `CabeceraDelAgente.tsx`, `AgentHeaderBreadcrumb.tsx`, `PageGuard.tsx`, `acceso-de-la-pantalla.tsx`,
  `PermissionsContext.tsx`, `agent-module-access.ts`, `agency-roles.ts`, `clasificar.ts`, `FalloDeCarga.tsx`, `EstadoDeDatos.tsx`, `retencion.ts`,
  `piloto.ts`, `config.ts`, `agent-fetch.ts`, `onboarding-visto.service.ts`, `globals.css`, `docs/DESIGN.md`, `CLAUDE.md`, `package.json`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.github/workflows/ci.yml`, los guardianes del §5,
  commits `4b6b093d` (Next 15/React 19) y `5b2e35d8` (Vinci sin ejemplos).
- `/Users/nicolasgarcia/rent/cadence` (`package.json`, `dist/index.d.ts`, `1eece93`).
- Agente (solo lectura): `project/account-manager` `fb8d3e8c` (commits `5d2f9291`, `fb8d3e8c`; `10-04/10-06-PLAN.md`, `10-CONTEXT.md`;
  `ENMIENDAS-PASADA-UNICA.md:322-324`; `HANDOFF-2026-09-25.md`), ramas `exec/naira-lane-b` (`12-01-SUMMARY.md`, `src/naira/acciones/types.ts`)
  y `exec/naira-lane-c`.
- Next.js (Context7 `/vercel/next.js`): upgrading/version-15 (`params`/`searchParams` como `Promise`, `use()`), version-16 y codemod
  `next-lint-to-eslint-cli` (retiro de `next lint`).

**Válido hasta:** el próximo commit de `cambios-nico-10` que toque `src/lib/nav/`, `src/lib/i18n/locales/`, `doce-pixeles` o los
guardianes del §5 — por el ritmo medido, días. Re-medir con §7 antes de cada plan.
