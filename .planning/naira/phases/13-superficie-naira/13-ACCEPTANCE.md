# Fase 13 — Superficie de Naira en Leasefy/front · ACCEPTANCE

> **Estado de la fase:** CONSTRUIDA CON EJEMPLOS · NO VERIFICADA CONTRA EL AGENTE (13-08, 2026-09-30).
> BASE (de `BASE-DE-EJECUCION`): `4ad6c188bd79a1f1272d96411a75813f87707651` · base de la fase (BF, padre del primer commit `(13-01)`): `a0819b57f272e86bb66186ac6e56da6256f54106` · último commit que tocó código (`git log -1 --format=%H -- src tests package.json`): `f9ccdb47b9c70b34817e404a914ab52732d5cd2d` · agente leído: `project/account-manager` @ `4281b3edcc6eca37e8a27d3458e31ac31d8c0142` (solo lectura, `git show`).

## 0 · Cómo leer esto

Cada criterio del ROADMAP §Phase 13 y cada requisito UI-01..03 tiene tres partes:

- **(a) Mecánica verificada con ejemplos** — marcadores `[N13:*]` que existen en un test en disco, con su plan y su archivo. Los de
  vitest están verdes en la corrida final de la §6; los `[N13:e2e-*]` son de Playwright y se corren contra `:3001` en la §7.
  Todo lo que prueban lo prueban con los ejemplos de 13-01 (`src/lib/data/mock-naira.ts`) o con cuerpos armados desde ellos.
- **(b) Exige el agente vivo** — lo que ningún test del front puede probar sin un agente desplegado que publique Naira, y quién lo
  destraba (una fase del agente o una enmienda E13-N).
- **(c) Declarado fail-closed** — lo que la UI decidió NO mostrar mientras el contrato no lo traiga.

Reglas de lectura:

- La línea **Estado:** de cada bloque dice que está construido con ejemplos y no verificado contra el agente. Ningún bloque se da por
  cumplido con datos del agente (P15). El smoke real, si lo hubo, es un dato de la §7 y no cambia esas líneas.
- El Paso 0 de cada plan (13-01..13-08) re-midió su base antes de escribir (FG13-20, D13-17); 13-08 re-midió la base de la fase
  (`BF`) y la cruzó con 13-01-SUMMARY.
- Los datos de ejemplo nunca se presentaron como medidos (D13-6): banda de ejemplo, «DATO DE EJEMPLO» en lugar de fecha en cada
  cifra, enlaces a la fuente inactivos.
- Naira está **oculta en el panel** hasta que el agente desplegado publique `naira` en `/my-permissions` (10-06, D13-3, E13-11): el
  front falla cerrado, incluida la memoria de la Fase 8. Al cerrar esta fase, `agency-permissions.ts` del agente ya lo publica como
  CÓDIGO (10-06 construida), pero nada está desplegado.

**Ubicación (D13-1′).** Naira es un módulo N2 de «Agentes IA» del sidebar, con URL `/panel/inmobiliaria/reportes/naira` y migaja
«Agentes IA › Naira». Sus 5 pestañas (Briefing, Seguimiento, Aprobaciones, Preguntar, Qué cree Naira) y sus 3 fichas (señal, loop,
propuesta) viven bajo esa URL. No hay sección paralela, ni namespace propio, ni rutas fuera de `/panel/inmobiliaria`.

**Enmiendas del agente (D13-23), medidas en `project/account-manager` @ `4281b3edcc6eca37e8a27d3458e31ac31d8c0142`.** E13-1..E13-4 y E13-6..E13-13 están
APLICADAS (marca `Δ Fase 13, E13-N`; E13-2, E13-3, E13-7 y E13-13 en parte, porque su resto cae en código ejecutado). Se consumen
donde tocan: 13-01 el espejo y el 404 con `naira_no_habilitada`; 13-03 `entidades`, `citasConClase`, `valorRenderizado` y
`nombreDeMetrica`; 13-05 `asOfs`; 13-06 `oraciones` y `refs`. **E13-5 sigue PENDIENTE**: es la única sin aplicar (0 marcas). La
memoria ejecutada todavía responde el 404 de «apagada» con `reason: null` (`src/server/routes/naira-memory.ts:385` del agente; 13-07
P4). **Medido al cerrar (manda el disco):** la re-enmienda E13-9′ ya está aplicada (`ROADMAP.md:400` y `REQUIREMENTS.md:249` del
agente dicen D13-1′), así que el choque D13-1 ↔ D13-1′ que el plan preveía declarar acá quedó resuelto en el agente.

**El agente al cerrar (solo lectura, `git cat-file`/`git show`).** Existen como código los siete archivos de rutas de Naira:
`naira-memory.ts` (Fase 8), `naira-acceso.ts` y `naira-conversacion.ts` (9.5-06), `naira-briefing.ts` y
`naira-notification-config.ts` (Fase 10), `naira-open-loops.ts` (11-07) y `naira-acciones.ts` (12-07). Las 17 rutas del espejo de
13-01 (`ENDPOINTS_DE_NAIRA`) aparecen con el mismo método y la misma ruta en esos archivos. La forma de los cuerpos no se re-midió
contra el espejo en 13-08. **Nada está desplegado**: todo lo que diga «exige el agente vivo» sigue abierto.

**Guardianes que van a chocar al integrar con `cambios-nico-10`:**

- `src/lib/nav/arquitectura-del-panel.test.ts`: «el sidebar tiene 26 módulos en 5 grupos con nombre (+ Inicio y Chat = 28 filas)».
  Antes decía 25/27; Naira suma uno.
- Las listas del grupo «Agentes IA» a las que 13-03 suma Naira.
- `src/components/doce-pixeles.guardian.test.ts` (doce-pixeles) fija el total de `text-xs`. La fase no agrega ninguno (D13-20).

La deriva de `cambios-nico-10` sobre BASE y los conflictos con los archivos de la fase los mide la Tarea 4 (§6).

## 1 · Criterios del ROADMAP §Phase 13

### Criterio 1

**Texto:** «Briefing, open loops, conversación y detalle de señal (con la lista de entidades afectadas) viven **dentro del AI Hub existente** [Δ Fase 13, E13-9 (🔔 D13-1): el hub de tarjetas murió (`/ai` redirige); «dentro del AI Hub existente» = como módulo de la sección «Agentes IA» del panel (D13-1′: URL `/panel/inmobiliaria/reportes/naira`, el mismo mecanismo que «Desempeño IA»), sin namespace ni rutas fuera de `/panel/inmobiliaria`; Δ Fase 13 E13-9′, rebase sobre cambios-nico-10] — no se crea una página nueva ni una sección paralela.» (`ROADMAP.md:400` del agente, re-medido 2026-09-30; al planificar `:388`).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:sin-seccion-paralela]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:fila-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:workspace-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:pestanas-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:guard-por-accion]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:ficha-del-workspace]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:componentes-solo-desde-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:workspace-accion]` — 13-03 · `src/components/inmobiliaria/ai/WorkspaceNav.accion.test.tsx`
- `[N13:pestana-por-su-accion]` — 13-05, 13-07, 13-06 · `src/lib/nav/rutas-de-naira.aprobaciones.test.ts`, `src/lib/nav/rutas-de-naira.memoria.test.ts`, `src/lib/nav/rutas-de-naira.preguntar.test.ts` (+1 archivo)
- `[N13:entidades-siempre]` — 13-03 · `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx`
- `[N13:e2e-montado]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`

Más `src/lib/nav/arquitectura-del-panel.test.ts` (guardián del repo: cada pestaña del workspace tiene su `page.tsx` y ninguna ruta vive
bajo el namespace muerto del hub). `[N13:e2e-montado]` (vitest no lo corre) exige, en cada una de las 8 superficies, ver
`[data-naira-vista]` con su estado ANTES de axe.

#### (b) Exige el agente vivo

- Briefing y señal reales (10-06), `naira` en `/my-permissions` (10-06, E13-11), open loops (11-07) y conversación (9.5-06). Están
  construidos como código en el agente pero sin desplegar, así que nadie los vio contra un agente vivo.
- E13-1 (rutas del correo a `/panel/inmobiliaria/reportes/naira`) y E13-2 (entidades afectadas) están APLICADAS en el agente
  (D13-23). 13-03 consume las entidades.
- E13-9 está aplicada en `ROADMAP.md:400` y `REQUIREMENTS.md:249`. Al planificar su literal estaba en la forma vieja D13-1 («sin
  módulo N2») y chocaba con D13-1′. Al cerrar ya dice D13-1′ (E13-9′ aplicada), así que no queda choque que declarar (manda el disco).

#### (c) Declarado fail-closed

- Sin ficha N4 de entidad. La lista de entidades afectadas se pinta por tipo e id (hasta cincuenta), sin enlace por entidad; si el
  agente las da como agregadas, se dice eso (`SenalView.tsx:11`).
- Inicio y Chat no se tocan (D13-2).
- La ubicación es D13-1′: módulo N2 de «Agentes IA», URL `/panel/inmobiliaria/reportes/naira`.
- Sin `naira` en `/my-permissions`, Naira entera queda oculta (D13-3).

### Criterio 2

**Texto:** «Desde cualquier número se llega a su fuente en el ERP (drill-down), y el `asOf` es visible junto al número — un dato correcto de hace 13 horas es, sin esa marca, indistinguible de una alucinación.» (`ROADMAP.md:401` del agente, re-medido 2026-09-30; al planificar `:389`).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:asof-pegado]` — 13-03, 13-05, 13-07 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx` (+6 archivos)
- `[N13:asof-bogota]` — 13-03, 13-05, 13-02 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx`, `src/components/inmobiliaria/naira/CifraDeNaira.test.tsx` (+3 archivos)
- `[N13:asof-invalido]` — 13-02, 13-01 · `src/components/inmobiliaria/naira/MarcaDeCorte.test.tsx`, `src/lib/naira/formato.test.ts`
- `[N13:cifra-sin-corte]` — 13-02 · `src/components/inmobiliaria/naira/CifraDeNaira.test.tsx`
- `[N13:ruta-con-pagina]` — 13-01, 13-06, 13-04 · `src/lib/naira/fuente-a-ruta.test.ts`, `src/lib/nav/rutas-de-naira.preguntar.test.ts`, `src/lib/nav/rutas-de-naira.seguimiento.test.ts`
- `[N13:sin-href-del-agente]` — 13-03, 13-05 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` (+14 archivos)
- `[N13:destinos-del-panel]` — 13-02 · `src/lib/naira/destinos-del-drill-down.test.ts`
- `[N13:enlace-sin-permiso]` — 13-02 · `src/components/inmobiliaria/naira/EnlaceALaFuente.test.tsx`
- `[N13:fuente-sin-ruta]` — 13-02 · `src/components/inmobiliaria/naira/EnlaceALaFuente.test.tsx`
- `[N13:origen-con-drill-down]` — 13-07 · `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:asof-de-la-consecuencia]` — 13-05 · `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx`
- `[N13:cortes-de-la-respuesta]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`
- `[N13:listado-con-corte]` — 13-05 · `src/components/inmobiliaria/naira/TarjetaDePropuesta.test.tsx`, `src/lib/naira/vocabulario-de-aprobaciones.test.ts`
- `[N13:cifra-con-su-corte]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`, `src/lib/naira/conversacion.test.ts`
- `[N13:e2e-ejemplo]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`

#### (b) Exige el agente vivo

- Datos reales de 10-06, 11-07 y 12-07: código sin desplegar.
- E13-4 (métrica y corte por cifra en la conversación), E13-6 (cortes del listado de aprobaciones) y E13-13 (valor ya formateado y
  nombre de la métrica) están APLICADAS y consumidas por 13-06, 13-05 y 13-03 (D13-23). E13-13 está aplicada en parte: la parte de
  12-01 cae en código ejecutado.

#### (c) Declarado fail-closed

- El drill-down llega al LISTADO de la fuente, no a una ficha del ítem (D13-7).
- Sin un corte válido no se pintan la consecuencia del listado ni la cifra viva de una oración (INV-07).
- Un agente que todavía no sirva esas enmiendas cae en lo de antes, sin romper, gracias al espejo tolerante (D13-23).

### Criterio 3

**Texto:** «El front **consume** los endpoints ya protegidos y **respeta el 403 sin renderizar datos parciales** (test). La `permissions-matrix` extendida y `agencyRoleMiddleware` **no se construyen acá**: viven en `Leasefy/agent` y son `API-01` (V-7 — `UI-03` estaba asignado al repo equivocado y no se podía ejecutar en esta fase).» (`ROADMAP.md:402` del agente, re-medido 2026-09-30; al planificar `:390`).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:403-sin-residuo]` — 13-03, 13-05 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` (+16 archivos)
- `[N13:403-sin-reason]` — 13-01 · `src/lib/api/naira/cliente.test.ts`
- `[N13:naira-fail-closed]` — 13-01 · `src/lib/auth/agent-module-access.test.ts`, `src/lib/context/PermissionsContext.naira.test.tsx`
- `[N13:naira-view-alias]` — 13-01 · `src/lib/auth/agent-module-access.test.ts`, `src/lib/context/PermissionsContext.naira.test.tsx`
- `[N13:contrato-roto-sin-datos]` — 13-01 · `src/lib/api/naira/cliente.test.ts`
- `[N13:estado-entero]` — 13-01 · `src/lib/hooks/naira/use-lectura-de-naira.test.tsx`
- `[N13:secundaria-403-sin-rastro]` — 13-04 · `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.seguimiento.test.tsx`
- `[N13:tareas-403-sin-rastro]` — 13-05 · `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`
- `[N13:403-tras-escribir]` — 13-07 · `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx`
- `[N13:escritura-403]` — 13-07 · `src/components/inmobiliaria/naira/DialogoDeCorreccion.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:decision-403]` — 13-05 · `src/components/inmobiliaria/naira/DecisionDePropuesta.test.tsx`
- `[N13:loop-sin-residuo]` — 13-04 · `src/lib/hooks/naira/use-naira-loop.test.tsx`
- `[N13:propuesta-sin-residuo]` — 13-05 · `src/lib/hooks/naira/use-naira-propuesta.test.tsx`
- `[N13:e2e-403-sin-residuo]` — 13-08 · `tests/e2e/naira-403.spec.ts`
- `[N13:e2e-403-secundaria]` — 13-08 · `tests/e2e/naira-403.spec.ts`
- `[N13:e2e-403-escritura]` — 13-08 · `tests/e2e/naira-403.spec.ts`

#### (b) Exige el agente vivo

- El 403 REAL del agente: API-01 (matriz y `agencyRoleMiddleware`) y `/my-permissions` con `naira` (10-06, E13-11). Todo está
  construido como código y nada desplegado.
- E13-7 está APLICADA en las rutas nuevas: el 404 de «apagada» lleva `naira_no_habilitada` (`naira-acceso.ts:61`). La memoria
  EJECUTADA de la Fase 8 todavía responde `reason: null` (`naira-memory.ts:385`; 13-07 P4).

#### (c) Declarado fail-closed

- Hasta 10-06, Naira entera está oculta, también la memoria que ya existe (D13-3).
- Sin `naira_no_habilitada`, el 404 se decide por la fila del contrato (`si404`, D13-4).
- Las fichas (señal, loop, propuesta) no tienen E2E de 403 porque no refrescan al volver (P6). Su «otro id sin residuo» con el MISMO
  hook lo prueban `[N13:loop-sin-residuo]`, `[N13:propuesta-sin-residuo]` y el `[N13:403-sin-residuo]` de 13-03, todos en vitest.

### Criterio 4

**Texto:** «La UI distingue visualmente DATO / INFERENCIA / RECOMENDACIÓN, muestra el `claimClass` de toda oración causal, y expone la vista **"qué cree Naira sobre nosotros"** con corregir/borrar por ítem.» (`ROADMAP.md:403` del agente, re-medido 2026-09-30; al planificar `:391`).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:categoria-por-campo]` — 13-02, 13-07, 13-05 · `src/components/inmobiliaria/naira/BloqueDeCategoria.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`, `src/components/inmobiliaria/naira/RazonamientoDePropuesta.test.tsx` (+1 archivo)
- `[N13:categoria-no-solo-color]` — 13-02 · `src/components/inmobiliaria/naira/BloqueDeCategoria.test.tsx`
- `[N13:claimclass-del-contrato]` — 13-02, 13-03 · `src/components/inmobiliaria/naira/ChipDeAfirmacion.test.tsx`, `src/components/inmobiliaria/naira/OracionesCausales.test.tsx`, `src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts`
- `[N13:chip-solo-desde-oraciones]` — 13-02, 13-03 · `src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts`
- `[N13:causa-oculta-una-vez]` — 13-02 · `src/components/inmobiliaria/naira/OracionesCausales.test.tsx`
- `[N13:todo-oculto-hoy]` — 13-02 · `src/components/inmobiliaria/naira/OracionesCausales.test.tsx`
- `[N13:causa-fail-closed]` — 13-03 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx`, `src/components/inmobiliaria/naira/ItemDelBriefing.test.tsx`
- `[N13:respuesta-no-es-dato]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`
- `[N13:causa-no-clasificada-oculta]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`, `src/lib/naira/conversacion.test.ts`
- `[N13:procedencia-primero]` — 13-07 · `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:memoria-acciones-por-permiso]` — 13-07 · `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:borrar-exige-motivo]` — 13-07 · `src/components/inmobiliaria/naira/DialogoDeBorrado.test.tsx`, `src/components/inmobiliaria/naira/memoria-escrituras.test.ts`
- `[N13:pii-sin-eco]` — 13-07 · `src/components/inmobiliaria/naira/DialogoDeCorreccion.test.tsx`
- `[N13:escritura-en-un-solo-lugar]` — 13-07 · `src/components/inmobiliaria/naira/memoria-escrituras.test.ts`
- `[N13:sin-procedural-nuevo]` — 13-07 · `src/components/inmobiliaria/naira/memoria-escrituras.test.ts`
- `[N13:oraciones-por-seccion]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`
- `[N13:chip-por-clase]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`
- `[N13:hipotesis-sin-banda]` — 13-06 · `src/lib/naira/conversacion.test.ts`

#### (b) Exige el agente vivo

- **E13-5 (inventario del silencio) sigue PENDIENTE**: es la única enmienda sin aplicar.
- E13-3 (`claimClass` por cita) está aplicada en parte: la persistencia por oración de 09-06 cae en código ejecutado, así que hoy
  llega `null`. E13-4 (oraciones con sección y clase en la conversación) y E13-8 (tuteo de los textos servidos) están APLICADAS
  (D13-23).
- La banda de una hipótesis en la conversación: la `OracionServida` no la trae (13-06 P5).
- La memoria real exige la Fase 8 desplegada más 10-06. «Confirmar que es cierto» (promover) exige 11-07, construida como código
  sin desplegar.

#### (c) Declarado fail-closed

- Una oración causal sin `claimClass` NO se muestra y se dice que se ocultó (D13-10). Tampoco se muestra una hipótesis de la
  conversación sin banda (13-06 P5).
- La respuesta de la conversación se rotula «RESPUESTA», nunca DATO.
- El silencio sin inventario se dice como tal (INV-06); nunca «no hay nada».
- Ninguna memoria procedural nueva desde la UI (D13-12).
- La autoría de la memoria se dice solo como tipo, sin persona (D13-11, B-5).

## 2 · Requisitos

### UI-01

**Texto:** «Briefing, open loops y detalle de señal con lista de entidades afectadas, dentro del AI Hub existente [Δ Fase 13, E13-9 (🔔 D13-1): el hub de tarjetas murió (`/ai` redirige); «dentro del AI Hub existente» = como módulo de la sección «Agentes IA» del panel (D13-1′: URL `/panel/inmobiliaria/reportes/naira`, el mismo mecanismo que «Desempeño IA»), sin namespace ni rutas fuera de `/panel/inmobiliaria`; Δ Fase 13 E13-9′, rebase sobre cambios-nico-10] — no una página nueva» (`REQUIREMENTS.md:249` del agente, re-medido 2026-09-30).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:sin-seccion-paralela]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:fila-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:workspace-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:pestanas-de-naira]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:ficha-del-workspace]` — 13-03 · `src/lib/nav/naira-sin-seccion-paralela.test.ts`
- `[N13:rutas-del-workspace]` — 13-05, 13-07, 13-04 · `src/lib/nav/rutas-de-naira.aprobaciones.test.ts`, `src/lib/nav/rutas-de-naira.memoria.test.ts`, `src/lib/nav/rutas-de-naira.seguimiento.test.ts`
- `[N13:pestana-con-pagina]` — 13-05, 13-07 · `src/lib/nav/rutas-de-naira.aprobaciones.test.ts`, `src/lib/nav/rutas-de-naira.memoria.test.ts`
- `[N13:entidades-siempre]` — 13-03 · `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx`
- `[N13:entidades-lista]` — 13-03 · `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx`
- `[N13:e2e-montado]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`
- `[N13:e2e-ejemplo]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`

#### (b) Exige el agente vivo

- Datos reales del briefing y la señal con su lista de entidades (10-06; E13-2 aplicada, D13-23), de los open loops (11-07) y de
  la conversación (9.5-06). Todo construido como código en el agente y sin desplegar.
- La pestaña visible exige `naira` en `/my-permissions` del agente desplegado (10-06, E13-11).

#### (c) Declarado fail-closed

- Entidades agregadas (`kind: 'agregada'`): se dice que son agregadas y no se inventa la lista.
- Sin ficha N4 de entidad.
- Oculta hasta 10-06 (D13-3).

### UI-02

**Texto:** «Drill-down desde cada número hasta su fuente en el ERP» (`REQUIREMENTS.md:250` del agente, re-medido 2026-09-30).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:asof-pegado]` — 13-03, 13-05, 13-07 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx` (+6 archivos)
- `[N13:asof-bogota]` — 13-03, 13-05, 13-02 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx`, `src/components/inmobiliaria/naira/CifraDeNaira.test.tsx` (+3 archivos)
- `[N13:ruta-con-pagina]` — 13-01, 13-06, 13-04 · `src/lib/naira/fuente-a-ruta.test.ts`, `src/lib/nav/rutas-de-naira.preguntar.test.ts`, `src/lib/nav/rutas-de-naira.seguimiento.test.ts`
- `[N13:sin-href-del-agente]` — 13-03, 13-05 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` (+14 archivos)
- `[N13:destinos-del-panel]` — 13-02 · `src/lib/naira/destinos-del-drill-down.test.ts`
- `[N13:enlace-sin-permiso]` — 13-02 · `src/components/inmobiliaria/naira/EnlaceALaFuente.test.tsx`
- `[N13:origen-con-drill-down]` — 13-07 · `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:listado-con-corte]` — 13-05 · `src/components/inmobiliaria/naira/TarjetaDePropuesta.test.tsx`, `src/lib/naira/vocabulario-de-aprobaciones.test.ts`
- `[N13:cortes-de-la-respuesta]` — 13-06 · `src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx`
- `[N13:e2e-ejemplo]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`

#### (b) Exige el agente vivo

- Que las fuentes y los `metricId` que sirve el agente real caigan en el mapa cerrado del front (`RUTA_DE_LA_METRICA`,
  `RUTA_POR_FUENTE`). Eso solo se ve con 10-06, 11-07 y 12-07 desplegadas.
- E13-4, E13-6 y E13-13 aplicadas (D13-23). E13-13 en parte.

#### (c) Declarado fail-closed

- Una fuente o métrica sin ruta en el mapa se muestra sin enlace, nunca con un `href` armado desde un campo del agente.
- El drill-down llega al listado (D13-7).

### UI-03

**Texto:** «El front **consume** los endpoints protegidos y respeta el 403 sin renderizar datos parciales. La `permissions-matrix` extendida y `agencyRoleMiddleware` **no son de este REQ**: viven en `Leasefy/agent` y son `API-01` (V-7 — estaba asignado al repo equivocado y no se podía ejecutar en la Fase 13)» (`REQUIREMENTS.md:251` del agente, re-medido 2026-09-30).

**Estado:** CONSTRUIDO CON EJEMPLOS · NO VERIFICADO CONTRA EL AGENTE

#### (a) Mecánica verificada con ejemplos

- `[N13:403-sin-residuo]` — 13-03, 13-05 · `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` (+16 archivos)
- `[N13:403-sin-reason]` — 13-01 · `src/lib/api/naira/cliente.test.ts`
- `[N13:naira-fail-closed]` — 13-01 · `src/lib/auth/agent-module-access.test.ts`, `src/lib/context/PermissionsContext.naira.test.tsx`
- `[N13:contrato-roto-sin-datos]` — 13-01 · `src/lib/api/naira/cliente.test.ts`
- `[N13:secundaria-403-sin-rastro]` — 13-04 · `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.seguimiento.test.tsx`
- `[N13:tareas-403-sin-rastro]` — 13-05 · `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`
- `[N13:escritura-403]` — 13-07 · `src/components/inmobiliaria/naira/DialogoDeCorreccion.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`
- `[N13:e2e-403-sin-residuo]` — 13-08 · `tests/e2e/naira-403.spec.ts`
- `[N13:e2e-403-secundaria]` — 13-08 · `tests/e2e/naira-403.spec.ts`
- `[N13:e2e-403-escritura]` — 13-08 · `tests/e2e/naira-403.spec.ts`
- `[N13:e2e-estado]` — 13-08 · `tests/e2e/panel-a11y/naira.a11y.spec.ts`

#### (b) Exige el agente vivo

- El 403 del agente real: la matriz de API-01 y `/my-permissions` con `naira` (10-06, E13-11), construidos como código y sin
  desplegar.
- E13-7 en la memoria ejecutada: hoy su 404 va con `reason: null`.

#### (c) Declarado fail-closed

- Todo estado que no sea `ok` reemplaza el cuerpo entero (VistaDeNaira): no se conserva lo anterior.
- Un 403 de una lectura secundaria borra su sección sin rastro. Un 403 de una escritura deshabilita ese control, lo dice sin eco y
  conserva la lectura.

## 3 · Trazabilidad UI-01..03 → planes → marcadores

Una fila por par (plan, REQ) del frontmatter `requirements` de 13-01..13-08. Los archivos son los de ese plan (sus `files_modified`)
que contienen marcadores de ese REQ.

| REQ | Plan | Archivos de test | Marcadores |
|---|---|---|---|
| UI-02 | 13-01 | `src/lib/naira/formato.test.ts`, `src/lib/naira/fuente-a-ruta.test.ts` | `[N13:asof-bogota]` `[N13:asof-invalido]` `[N13:asof-edad]` `[N13:fuentes-del-registro]` `[N13:ruta-con-pagina]` `[N13:sin-href-del-agente]` |
| UI-03 | 13-01 | `src/lib/api/naira/cliente.test.ts`, `src/lib/hooks/naira/use-lectura-de-naira.test.tsx`, `src/lib/auth/agent-module-access.test.ts`, `src/lib/context/PermissionsContext.naira.test.tsx` | `[N13:404-por-endpoint]` `[N13:404-por-razon]` `[N13:403-sin-reason]` `[N13:contrato-roto-sin-datos]` `[N13:403-sin-residuo]` `[N13:estado-entero]` `[N13:agencia-sin-residuo]` `[N13:naira-fail-closed]` `[N13:naira-view-alias]` |
| UI-01 | 13-02 | `src/components/inmobiliaria/naira/b5-sin-persona.test.ts`, `src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts` | `[N13:raiz-de-la-superficie]` |
| UI-02 | 13-02 | `src/lib/naira/destinos-del-drill-down.test.ts`, `src/components/inmobiliaria/naira/EnlaceALaFuente.test.tsx`, `src/components/inmobiliaria/naira/MarcaDeCorte.test.tsx`, `src/components/inmobiliaria/naira/CifraDeNaira.test.tsx` | `[N13:destinos-bicondicional]` `[N13:destinos-del-panel]` `[N13:sin-href-del-agente]` `[N13:enlace-sin-permiso]` `[N13:fuente-sin-ruta]` `[N13:asof-bogota]` `[N13:asof-edad]` `[N13:asof-invalido]` `[N13:asof-pegado]` `[N13:cifra-sin-corte]` `[N13:cifra-ilegible]` |
| UI-03 | 13-02 | `src/components/inmobiliaria/naira/VistaDeNaira.test.tsx`, `src/components/inmobiliaria/naira/NairaSinPermiso.test.tsx`, `src/components/inmobiliaria/naira/NairaApagada.test.tsx`, `src/components/inmobiliaria/naira/EnlaceALaFuente.test.tsx` | `[N13:403-sin-residuo]` `[N13:sin-permiso-sin-reintentar]` `[N13:sin-permiso-copy]` `[N13:sin-permiso-admin]` `[N13:apagada-sin-cta]` `[N13:enlace-sin-permiso]` |
| UI-01 | 13-03 | `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx`, `src/components/inmobiliaria/naira/b5-sin-persona.test.ts`, `src/components/inmobiliaria/naira/claimclass-del-contrato.test.ts`, `src/components/inmobiliaria/ai/WorkspaceNav.accion.test.tsx`, `src/lib/nav/naira-sin-seccion-paralela.test.ts` | `[N13:entidades-siempre]` `[N13:entidades-del-contrato]` `[N13:entidades-lista]` `[N13:raiz-de-la-superficie]` `[N13:workspace-accion]` `[N13:otros-workspaces-igual]` `[N13:pestana-oculta-por-accion]` `[N13:sin-seccion-paralela]` `[N13:fila-de-naira]` `[N13:workspace-de-naira]` `[N13:pestanas-de-naira]` `[N13:guard-por-accion]` `[N13:componentes-solo-desde-naira]` `[N13:intro-de-naira]` `[N13:ficha-del-workspace]` `[N13:busqueda-de-naira]` |
| UI-02 | 13-03 | `src/lib/nav/rutas-de-naira.test.ts`, `src/components/inmobiliaria/naira/ItemDelBriefing.test.tsx`, `src/components/inmobiliaria/naira/PreguntaSemanal.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx` | `[N13:deep-links]` `[N13:senal-href-codificado]` `[N13:asof-pegado]` `[N13:recall-ancla]` `[N13:asof-bogota]` `[N13:deep-link-dia]` `[N13:sin-href-del-agente]` `[N13:volver-al-dia]` |
| UI-03 | 13-03 | `src/lib/hooks/naira/use-naira-briefing.test.tsx`, `src/lib/hooks/naira/use-naira-senal.test.tsx`, `src/components/inmobiliaria/naira/ItemDelBriefing.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.test.tsx` | `[N13:403-sin-residuo]` `[N13:causa-fail-closed]` |
| UI-01 | 13-04 | `src/lib/nav/rutas-de-naira.seguimiento.test.ts`, `src/app/panel/inmobiliaria/reportes/naira/seguimiento/[loopId]/LoopClient.test.tsx` | `[N13:rutas-del-workspace]` `[N13:pestana-por-su-accion]` `[N13:ficha-con-vuelta]` `[N13:ficha-con-pagina]` |
| UI-03 | 13-04 | `src/lib/hooks/naira/use-naira-seguimiento.test.tsx`, `src/lib/hooks/naira/use-naira-loop.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/seguimiento/SeguimientoClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/seguimiento/[loopId]/LoopClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/SenalClient.seguimiento.test.tsx` | `[N13:403-sin-residuo]` `[N13:secundaria-sin-red]` `[N13:loop-sin-residuo]` `[N13:apagada]` `[N13:secundaria-sin-permiso-sin-red]` `[N13:secundaria-403-sin-rastro]` `[N13:secundaria-falla-sin-rastro]` `[N13:secundaria-sin-loop]` |
| UI-01 | 13-05 | `src/lib/nav/rutas-de-naira.aprobaciones.test.ts`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` | `[N13:rutas-del-workspace]` `[N13:pestana-por-su-accion]` `[N13:pestana-con-pagina]` `[N13:ficha-con-pagina]` `[N13:ficha-con-vuelta]` |
| UI-02 | 13-05 | `src/lib/naira/vocabulario-de-aprobaciones.test.ts`, `src/components/inmobiliaria/naira/TarjetaDePropuesta.test.tsx`, `src/components/inmobiliaria/naira/FilaDeTarea.test.tsx`, `src/components/inmobiliaria/naira/RazonamientoDePropuesta.test.tsx`, `src/lib/nav/rutas-de-naira.aprobaciones.test.ts`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` | `[N13:listado-con-corte]` `[N13:cortes-en-orden]` `[N13:sin-href-del-agente]` `[N13:asof-pegado]` `[N13:fuente-solo-en-la-referencia]` `[N13:asof-de-la-consecuencia]` `[N13:asof-bogota]` |
| UI-03 | 13-05 | `src/lib/hooks/naira/use-naira-propuestas.test.tsx`, `src/lib/hooks/naira/use-naira-propuesta.test.tsx`, `src/lib/hooks/naira/use-naira-tareas.test.tsx`, `src/components/inmobiliaria/naira/DecisionDePropuesta.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx` | `[N13:403-sin-residuo]` `[N13:propuesta-sin-residuo]` `[N13:secundaria-sin-red]` `[N13:decision-403]` `[N13:tareas-403-sin-rastro]` `[N13:apagada]` |
| UI-01 | 13-06 | `src/lib/nav/rutas-de-naira.preguntar.test.ts` | `[N13:pestana-por-su-accion]` |
| UI-03 | 13-06 | `src/lib/naira/conversacion.test.ts`, `src/lib/hooks/naira/use-naira-conversacion.test.tsx`, `src/components/inmobiliaria/naira/VistaDeNaira.apagada-propia.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarClient.test.tsx` | `[N13:403-sin-datos]` `[N13:403-sin-residuo]` `[N13:apagada]` `[N13:apagada-propia]` `[N13:apagada-por-defecto]` `[N13:apagada-solo-en-apagada]` |
| UI-01 | 13-07 | `src/lib/nav/rutas-de-naira.memoria.test.ts` | `[N13:rutas-del-workspace]` `[N13:pestana-por-su-accion]` `[N13:pestana-con-pagina]` |
| UI-02 | 13-07 | `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`, `src/lib/nav/rutas-de-naira.memoria.test.ts`, `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx` | `[N13:origen-con-drill-down]` `[N13:sin-href-del-agente]` `[N13:asof-bogota]` `[N13:asof-pegado]` |
| UI-03 | 13-07 | `src/lib/hooks/naira/use-naira-memoria.test.tsx`, `src/components/inmobiliaria/naira/DialogoDeCorreccion.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/memoria/MemoriaClient.test.tsx` | `[N13:403-sin-residuo]` `[N13:escritura-403]` `[N13:403-tras-escribir]` `[N13:apagada]` |
| UI-01 | 13-08 | `tests/e2e/panel-a11y/naira.a11y.spec.ts` | `[N13:e2e-montado]` `[N13:e2e-ejemplo]` |
| UI-02 | 13-08 | `tests/e2e/panel-a11y/naira.a11y.spec.ts` | `[N13:e2e-ejemplo]` |
| UI-03 | 13-08 | `tests/e2e/panel-a11y/naira.a11y.spec.ts`, `tests/e2e/naira-403.spec.ts` | `[N13:e2e-estado]` `[N13:e2e-403-sin-residuo]` `[N13:e2e-403-secundaria]` `[N13:e2e-403-escritura]` |

## 4 · Barrido de falsos verdes (13-CONTEXT §4)

Una fila por FG13-1..20. Cada marcador que el CONTEXT nombra para un FG está en su fila, lo nombra al menos un plan de 13-01..13-07
(`[N13:e2e-montado]`: 13-08) y existe en un test en disco. Que esté VERDE se mide en la §6 (vitest) y en la §7 (Playwright).

| FG | Marcadores (CONTEXT §4) | Planes que lo nombran | Tests en disco | Cómo se cierra |
|---|---|---|---|---|
| FG13-1 | `[N13:403-sin-residuo]` | 13-01, 13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 19 archivos: `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, … | el MISMO hook recibe 200 sembrado y luego 403 (vitest por superficie) y el E2E `[N13:e2e-403-sin-residuo]` lo repite en el navegador por el refresco real |
| FG13-2 | `[N13:403-sin-reason]` | 13-01, 13-08 | 1 archivo: `src/lib/api/naira/cliente.test.ts` | el 403 del middleware sin `reason` ⇒ `sin_permiso`, nunca `contrato_roto` (cliente) y en E2E con `RESPUESTA_403_DEL_MIDDLEWARE` |
| FG13-3 | `[N13:fixture-es-contrato]` `[N13:parseo-tolerante]` | 13-01, 13-03, 13-04, 13-05, 13-06, 13-07 | 30 archivos: `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, … | cada ejemplo pasa su esquema ESTRICTO (vitest) y la red E2E solo sirve cuerpos que pasan `RESPUESTA_ESTRICTA_POR_ENDPOINT` |
| FG13-4 | `[N13:contrato-roto-sin-datos]` | 13-01, 13-08 | 1 archivo: `src/lib/api/naira/cliente.test.ts` | 200 con un requerido faltante ⇒ `contrato_roto` y la vista no pinta ningún campo |
| FG13-5 | `[N13:asof-pegado]` `[N13:asof-bogota]` | 13-01, 13-02, 13-03, 13-04, 13-05, 13-07, 13-08 | 13 archivos: `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, … | cada `[data-naira-numero]` con su `[data-naira-asof]` en el mismo contenedor; fecha que cruza la medianoche UTC |
| FG13-6 | `[N13:ruta-con-pagina]` `[N13:sin-href-del-agente]` | 13-01, 13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 18 archivos: `src/lib/naira/fuente-a-ruta.test.ts`, `src/lib/nav/rutas-de-naira.preguntar.test.ts`, … | toda ruta no nula del mapa tiene `page.tsx`; ningún `href` sale de un campo del contrato |
| FG13-7 | `[N13:sin-seccion-paralela]` | 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 1 archivo: `src/lib/nav/naira-sin-seccion-paralela.test.ts` | sin `src/app/panel/inmobiliaria/naira/` ni ruta `/naira` fuera del workspace; componentes solo desde el árbol de Naira |
| FG13-8 | `[N13:naira-fail-closed]` | 13-01, 13-08 | 2 archivos: `src/lib/auth/agent-module-access.test.ts`, `src/lib/context/PermissionsContext.naira.test.tsx` | admin con payload SIN `naira` ⇒ `canAccess(naira, …)` falso (fail-closed) |
| FG13-9 | `[N13:control-positivo]` | 13-01, 13-02, 13-03, 13-04, 13-05, 13-06, 13-07 | 75 archivos: `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, … | control positivo en cada archivo de componente/hook: con permisos y 200 el token del ejemplo SÍ aparece |
| FG13-10 | `[N13:simulado-nunca-en-prod]` `[N13:simulado-visible]` | 13-01, 13-02, 13-03, 13-04, 13-05, 13-06, 13-07 | 24 archivos: `src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarClient.test.tsx`, `src/lib/api/naira/cliente.test.ts`, … | con `NODE_ENV=production` el simulado nunca se usa; un `ok` de ejemplo pinta la banda y `data-naira-ejemplo` en cada cifra |
| FG13-11 | `[N13:claimclass-del-contrato]` | 13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 3 archivos: `src/components/inmobiliaria/naira/ChipDeAfirmacion.test.tsx`, `src/components/inmobiliaria/naira/OracionesCausales.test.tsx`, … | el chip de `claimClass` solo si viene en el contrato; guardia estática sin regex de probabilidad ni conectores causales |
| FG13-12 | `[N13:categoria-por-campo]` | 13-01, 13-02, 13-05, 13-07, 13-08 | 4 archivos: `src/components/inmobiliaria/naira/BloqueDeCategoria.test.tsx`, `src/components/inmobiliaria/naira/ItemDeMemoria.test.tsx`, … | la categoría sale del campo del contrato, nunca del texto |
| FG13-13 | `[N13:b5-sin-persona]` `[N13:sin-latencia]` | 13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 15 archivos: `src/app/panel/inmobiliaria/reportes/naira/BriefingClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, … | ningún `userId` de los ejemplos en el DOM; guardia estática B-5; ninguna vista de latencia |
| FG13-14 | `[N13:detalle-solo-al-abrir]` | 13-05 | 5 archivos: `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/AprobacionesClient.test.tsx`, `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx`, … | `GET /actions/{id}` 0 veces hasta abrir la ficha y 1 al abrirla (vitest; en E2E la lista no lo pide) |
| FG13-15 | `[N13:huella-vista]` | 13-05 | 2 archivos: `src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/PropuestaClient.test.tsx`, `src/components/inmobiliaria/naira/DecisionDePropuesta.test.tsx` | el POST lleva la huella renderizada; tras 409 `huella_distinta` se re-lee sin re-enviar |
| FG13-16 | `[N13:conversacion-sin-persistencia]` | 13-06, 13-08 | 2 archivos: `src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarClient.test.tsx`, `src/lib/hooks/naira/use-naira-conversacion.test.tsx` | tras preguntar, ni `localStorage` ni `sessionStorage` tienen la pregunta ni la respuesta |
| FG13-17 | `[N13:i18n-es-en]` | 13-01..13-07 (i18n de cada plan) | 1 archivo: `src/lib/i18n/claves-naira.test.ts` | sin marcador propio en el CONTEXT: `[N13:i18n-es-en]` de `src/lib/i18n/claves-naira.test.ts` y `i18n-test-stub` en cada `.test.tsx` de Naira que monta React, sin `t` identidad (lo mide la Tarea 4) |
| FG13-18 | `[N13:e2e-montado]` | 13-08 | 1 archivo: `tests/e2e/panel-a11y/naira.a11y.spec.ts` | `esperarVista` antes de `auditarMain` (sin `runAxeOrFixme`) y el reporte de la Tarea 5 con 0 saltados |
| FG13-19 | `[N13:sin-seccion-paralela]` | 13-03, 13-04, 13-05, 13-06, 13-07, 13-08 | 1 archivo: `src/lib/nav/naira-sin-seccion-paralela.test.ts` | `[N13:sin-seccion-paralela]` + `src/lib/nav/arquitectura-del-panel.test.ts` (guardián del repo, verde en la §6) |
| FG13-20 | — | 13-01..13-08 (Paso 0) | — (sin test: se cierra por procedimiento) | sin marcador: el Paso 0 de cada plan re-midió su base (sus SUMMARY) y 13-08 re-midió `BF` y la cruzó con 13-01-SUMMARY |

## 5 · E2E de 13-08

**Qué prueba cada spec:**

- `tests/e2e/panel-a11y/naira.a11y.spec.ts` (proyecto `panel-a11y`, UI-SPEC §11, FG13-18). Las 8 superficies con datos por la red
  (`[N13:e2e-montado]`) y en modo ejemplo (`[N13:e2e-ejemplo]`), más `[N13:e2e-estado]` sin_permiso / apagada / silencio del
  Briefing. Cada test exige ver `[data-naira-vista]` con su estado ANTES de axe, y axe corre sobre `main` (critical + serious = 0).
- `tests/e2e/naira-403.spec.ts` (proyecto `chromium`, UI-SPEC §8.2, FG13-1, FG13-2). `[N13:e2e-403-sin-residuo]` en las 5
  pestañas: 200 sembrado y luego 403 por el refresco real. `[N13:e2e-403-secundaria]` cubre las tareas y
  `[N13:e2e-403-escritura]` la corrección de memoria. Además tiene tres tests sin navegador (`[N13:e2e-red-por-contrato]`,
  `[N13:e2e-centinelas]`, `[N13:e2e-silencio-es-contrato]`) que ya corrieron verdes en la Tarea 2.
- La red la sirve SOLO `tests/e2e/panel-a11y/_helpers/naira-helpers.ts`, con los ejemplos de 13-01 validados en estricto (FG13-3).
  Un pedido a Naira sin fila del contrato se aborta y el test cae.

**Dos configuraciones del servidor (P2, P9).** `[N13:e2e-montado]`, `[N13:e2e-estado]` y el 403 exigen un servidor SIN simulado
(`NEXT_PUBLIC_USE_MOCK_API=false`). `[N13:e2e-ejemplo]` exige uno CON simulado (`=true`). Corridos contra el servidor equivocado dan
rojo, no verde. En ambos casos `NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:4999`: no vacía y sin nada escuchando. Todo lo de Naira y
`/my-permissions` lo sirve Playwright.

**Sesión sintética (P3, T-13-08-04).** `seedAuthState` entra como admin y el helper agrega `naira` a `/my-permissions`. El E2E no
prueba el gate del front: eso lo prueban `[N13:naira-fail-closed]` y `[N13:guard-por-accion]` en vitest. Prueba lo que decide el
servicio (un 403 deja la pantalla sin datos).

**axe fuera de `main` (P4).** Las violaciones de la página entera fuera de `main` son del layout (sidebar/header, preexistentes,
`tests/e2e/panel-a11y/MOCKS-DEBT.md:29`). Se anotan como `axe-fuera-de-main` y no bloquean. Si aparecen, la §7 las lista.

**StrictMode de desarrollo (medido al ejecutar).** Next 15 monta dos veces cada efecto en desarrollo con el App Router
(`next/dist/build/define-env.js:126`) y la agencia se lee sincrónica del almacenamiento (`auth-context.tsx:264`), así que una lectura
puede pedirse dos veces al montar. Por eso el 200 y el 403 se separan por una fase que el test cambia, no por el número de pedido, y
la ficha de la propuesta se mide como «pide su detalle al montar y no lo vuelve a pedir al volver».

**Comandos EXACTOS de la Tarea 5** (desde `/Users/nicolasgarcia/rent/wt-front-naira`, con Node 20):

1. Corrida A, servidor SIN simulado. Terminal 1:
   `cd /Users/nicolasgarcia/rent/wt-front-naira && NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:4999 pnpm dev`.
   Terminal 2, con el servidor listo:
   `cd /Users/nicolasgarcia/rent/wt-front-naira && PLAYWRIGHT_JSON_OUTPUT_FILE=/Users/nicolasgarcia/rent/wt-front-naira/.planning/naira/phases/13-superficie-naira/evidencia-13-08/e2e-a11y.json pnpm exec playwright test --project=panel-a11y tests/e2e/panel-a11y/naira.a11y.spec.ts --grep-invert "N13:e2e-ejemplo" --workers=1 --reporter=list,json`
   y después
   `PLAYWRIGHT_JSON_OUTPUT_FILE=/Users/nicolasgarcia/rent/wt-front-naira/.planning/naira/phases/13-superficie-naira/evidencia-13-08/e2e-403.json pnpm exec playwright test --project=chromium tests/e2e/naira-403.spec.ts --workers=1 --reporter=list,json`.
2. Corrida B, servidor CON simulado. Detener el servidor y levantarlo con
   `NEXT_PUBLIC_USE_MOCK_API=true NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:4999 pnpm dev`. Después:
   `PLAYWRIGHT_JSON_OUTPUT_FILE=/Users/nicolasgarcia/rent/wt-front-naira/.planning/naira/phases/13-superficie-naira/evidencia-13-08/e2e-ejemplo.json PLAYWRIGHT_HTML_OPEN=never pnpm exec playwright test --project=panel-a11y tests/e2e/panel-a11y/naira.a11y.spec.ts --grep "N13:e2e-ejemplo" --workers=1 --headed --reporter=list,json,html`
   y `pnpm exec playwright show-report` (las 8 capturas de página completa van adjuntas).

## 6 · Medición de cierre

<!-- CIERRE:INICIO -->
- resultado: ROJO
- codigo medido: f9ccdb47b9c70b34817e404a914ab52732d5cd2d
- base de la fase (BF): a0819b57f272e86bb66186ac6e56da6256f54106
- node: v20.20.0
- suite: base=1154 archivos (rojos en las dos corridas=5) final=1226 archivos (rojos=4, tolerados=0, candidatos a regresion=4)
- re-corridas: regresiones=2 inestables=2
- tsc: errores base=0 final=0 nuevos=0
- lint: errores base=6 final=6 nuevos=0
- build (copia de HEAD): verde
- variables libres del build: RC=1
- guardias: ROJAS
- barrido: marcadores vitest=104 e2e=9 todos verdes o listados
- i18n: tests que montan React=37 con i18n-test-stub y sin t identidad
- alcance: files_modified de 13-01..13-08=168 cambiados desde BF=177 fuera=0
- deriva: 36 commits de cambios-nico-10 sobre BASE; conflictos en archivos de la fase: 1
<!-- CIERRE:FIN -->

## 7 · Verificación humana

<!-- HUMANO:INICIO -->
(la llena la Tarea 5)
<!-- HUMANO:FIN -->

## 8 · Enmiendas para ENMIENDAS-PASADA-UNICA.md §5

Columnas de `ENMIENDAS-PASADA-UNICA.md` §1. Anclas re-medidas en `project/account-manager` @ `4281b3edcc6eca37e8a27d3458e31ac31d8c0142` (rutas relativas a
`.planning/agents/account-manager/`, salvo `src/…`). El estado APLICADA sale de la marca `Δ Fase 13, E13-N` medida en esa rama y de
su §5 («aplicada en serie», 2026-09-28).

| Id | Destino | Ancla ACTUAL (medida) | Cambio propuesto (fiel, resumido) | Tipo | Autorización Nico | Desbloquea |
|---|---|---|---|---|---|---|
| E13-1 | `10-04` (`RUTAS_DEL_PANEL`) y su test `[RND:enlaces]` | `phases/10-notificacion-briefing/10-04-PLAN.md:379` «export const RUTAS_DEL_PANEL = { briefing: '/panel/inmobiliaria/reportes/naira'» · `phases/10-notificacion-briefing/10-04-PLAN.md:987` «`[RND:enlaces]`» | (a) rutas del panel: briefing `/panel/inmobiliaria/reportes/naira` (+ `?dia=YYYY-MM-DD`), señal `…/senales/<promocionId>`, recall `…?dia=<lunes>#recall`; (b) no emitir `reglas`, `colaLegacy` ni `arranque` hasta que exista su pantalla (D13-12) | plan | no | crit. 1 (sin sección paralela) y deep links; bloquea ejecutar 10-04 · **APLICADA** (9 marcas) |
| E13-2 | `09-04` (`SenalPromovida`), `10-CONTEXT` (`ItemCongelado`), `10-06` (`NairaSignalDetail`) | `phases/9-investigacion-agentica/09-04-PLAN.md:329` «export interface SenalPromovida» · `phases/10-notificacion-briefing/10-CONTEXT.md:125` «(`ItemCongelado`:» · `phases/10-notificacion-briefing/10-06-PLAN.md:77` «GET /signals/{promocionId} (getNairaSignalDetail)» | `entidades: { kind: 'agregada' } o { kind: 'lista'; items: { tipo; id }[] }` copiado de `Signal.affectedEntities` (nunca una persona) | plan | no | UI-01 «lista de entidades afectadas» · **APLICADA EN PARTE** (20 marcas; la parte de 09-04 cae en código ejecutado) |
| E13-3 | `09-06` (persistencia de la investigación), `9.5-04` (`CitaPersistida`), `10-06` (`citas: string[]`) | `phases/9-investigacion-agentica/09-06-PLAN.md:228` «export async function persistirInvestigacion(tx, fila)» · `phases/9.5-carril-on-demand/9.5-04-PLAN.md:324` «export interface CitaPersistida» · `phases/10-notificacion-briefing/10-06-PLAN.md:336` «citas: string[]» | por cita `{ texto; claimClass; hipotesis: null o { banda; alternativa; discriminador } }` (lo que deriva el linter de 09-03 y hoy se descarta al persistir) | plan | no | crit. 4 en toda superficie · **APLICADA EN PARTE** (9 marcas; 09-06 pendiente: hasta entonces `null` y la oración causal se oculta, D13-10) |
| E13-4 | `9.5-06` (`NairaConversationAnswered`), `9.5-04` (`refsServidas`) | `phases/9.5-carril-on-demand/9.5-06-PLAN.md:340` «NairaConversationAnswered { kind: 'respondida'» · `phases/9.5-carril-on-demand/9.5-04-PLAN.md:220` «`refsServidas`» | `respondida` gana `oraciones: { seccion; texto; claimClass o null }[]`, `refs` tipadas (`chunk` / `investigacion`) y, por cifra, `{ metricId; asOf }`; se conserva `texto` | plan | no | crit. 2 y 4 en la conversación · **APLICADA** (12 marcas) |
| E13-5 | `10-06` (`NairaBriefingDay`) | `phases/10-notificacion-briefing/10-06-PLAN.md:329` «200 NairaBriefingDay» | gana `inventario`, `madurez`, `arranque` y `semanal` (al menos `recall.semana`), leídos al mismo `corte` de lo persistido | plan | no | crit. 3 de la 9 y 4 de la 10 en la UI (el silencio con inventario) · **PENDIENTE** (0 marcas; la única sin aplicar) |
| E13-6 | `12-07` (`AccionListada`) | `phases/12-acciones-hitl-chokepoint/12-07-PLAN.md:413` «export interface AccionListada» | gana `asOfs` de los hechos que cita su consecuencia | plan | no | crit. 2 en el listado de aprobaciones · **APLICADA** (6 marcas) |
| E13-7 | código EJECUTADO de la Fase 8 (`naira-memory.ts`, 404 de `acceso`) + rutas de 9.5/10/11/12 | `src/server/routes/naira-memory.ts:37` «DP5-7 — Naira apagada para el tenant ⇒ 404» · `src/server/routes/naira-memory.ts:173` «const E404» · `src/server/routes/naira-memory.ts:385` «error('Naira no está habilitada para esta agencia', null), 404)» · `src/server/routes/naira-acceso.ts:61` «export const RAZON_NAIRA_NO_HABILITADA = 'naira_no_habilitada'» | el 404 de «Naira no habilitada» lleva `reason: 'naira_no_habilitada'`; en la Fase 8 es un cambio de código, no solo de plan | ejecutada | sí | distinguir «apagada» de «ítem no existe» sin heurística · **APLICADA EN PARTE** (20 marcas; rutas nuevas con la razón; la memoria ejecutada sigue con `null` en `:385`) |
| E13-8 | `9.5-04` (declaraciones, negativas) y todo texto servido que la UI pinta tal cual | `phases/10-notificacion-briefing/10-CONTEXT.md:186` «"contame más del 2"» | tuteo (el panel tutea; NOT-10 y `10-CONTEXT` traían ejemplos en voseo) | plan | no | mezcla de registros en la misma pantalla · **APLICADA** (5 marcas) |
| E13-9 | `ROADMAP.md` (crit. 1 §Phase 13) y `REQUIREMENTS.md` (UI-01) | `ROADMAP.md:400` «viven **dentro del AI Hub existente**» · `REQUIREMENTS.md:249` «dentro del AI Hub existente» | «el hub de tarjetas murió; "dentro del AI Hub existente" = como módulo de la sección «Agentes IA» del panel (D13-1′: URL `/panel/inmobiliaria/reportes/naira`), sin namespace ni rutas fuera de `/panel/inmobiliaria`» (con su re-enmienda E13-9′) | doc | sí | criterio 1 verificable contra la base real · **APLICADA**, también E13-9′ (el literal ya dice D13-1′; al planificar estaba en `:388`) |
| E13-10 | `ROADMAP.md` (⚠️ cross-repo §Phase 13) | `ROADMAP.md:407` «esta fase se ejecuta en un worktree propio del front» | «se ejecuta en `~/rent/mvp`» ⇒ «en un worktree propio del front (`~/rent/wt-front-naira`), nunca en `~/rent/mvp`; base de integración a confirmar (ticket V1)» | doc | no | evita ejecutar en el checkout compartido · **APLICADA** (al planificar estaba en `:395`) |
| E13-11 | `10-06` (`/my-permissions`) | `phases/10-notificacion-briefing/10-06-PLAN.md:68` «/my-permissions devuelve naira» | el front falla cerrado hasta que `naira` esté desplegado, incluida la memoria que ya existe | informativa | no | D13-3 · **APLICADA** (informativa; 10-06 construida como código, sin desplegar) |
| E13-12 | `12-CONTEXT` D12-12/D12-13 y `12-07` | `phases/12-acciones-hitl-chokepoint/12-CONTEXT.md:192` «**D12-12 — ACT-05: consecuencia primero» · `phases/12-acciones-hitl-chokepoint/12-CONTEXT.md:197` «**D12-13 — ACT-06 neutral a B-5.**» | la 13 asume consecuencia primero, razonamiento tras un tap, sin prefetch del detalle y `huellaVista` = la huella mostrada | informativa | no | D13-14 · **APLICADA** (informativa) |
| E13-13 | `10-04`, `10-06` y `12-01` | `phases/10-notificacion-briefing/10-04-PLAN.md:383` «export interface ValorParaRender» | `valorRenderizado` junto a `valor` (una sola forma de formatear, EVAL-10) y el nombre legible de cada `metricId` servido por las rutas | plan | decide Nico | una sola forma de formatear y de nombrar (hoy el front duplica, con test de paridad cuando existan en disco) · **APLICADA EN PARTE** (opcional; la parte de 12-01 cae en código ejecutado) |

Este archivo NO edita `agent-account-manager`: la §8 se copia tal cual al SUMMARY para `ENMIENDAS-PASADA-UNICA.md` §5.
