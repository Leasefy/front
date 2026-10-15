---
phase: 13-superficie-naira
plan: "06"
subsystem: front / Naira (conversación ON-DEMAND)
tags: [naira, conversacion, preguntar, sin-persistencia, 403-sin-residuo, e13-4, b5]
requires: [13-01, 13-02, 13-03, 13-04, 13-05]
provides: [useNairaConversacion, RespuestaDeNaira, CompositorDePregunta, pestaña B/preguntar (conversation-ask), VistaDeNaira.apagada]
affects: [13-07, 13-08]
tech-stack:
  added: []
  patterns: [núcleo puro + hook sin useLecturaDeNaira (POST por gesto), vista vs turno (403/404 sin residuo por tipo), guardia por AST que crece]
key-files:
  created:
    - src/lib/naira/conversacion.ts
    - src/lib/naira/conversacion.test.ts
    - src/lib/hooks/naira/use-naira-conversacion.ts
    - src/lib/hooks/naira/use-naira-conversacion.test.tsx
    - src/components/inmobiliaria/naira/VistaDeNaira.apagada-propia.test.tsx
    - src/components/inmobiliaria/naira/RespuestaDeNaira.tsx
    - src/components/inmobiliaria/naira/RespuestaDeNaira.test.tsx
    - src/components/inmobiliaria/naira/CompositorDePregunta.tsx
    - src/components/inmobiliaria/naira/CompositorDePregunta.test.tsx
    - src/lib/nav/rutas-de-naira.preguntar.test.ts
    - src/app/panel/inmobiliaria/reportes/naira/preguntar/page.tsx
    - src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarClient.tsx
    - src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarView.tsx
    - src/app/panel/inmobiliaria/reportes/naira/preguntar/PreguntarClient.test.tsx
    - src/components/inmobiliaria/naira/conversacion-sin-persistencia.test.ts
  modified:
    - src/lib/i18n/locales/es.json
    - src/lib/i18n/locales/en.json
    - src/components/inmobiliaria/naira/VistaDeNaira.tsx
    - src/lib/nav/agentWorkspaceNav.ts
decisions:
  - "P2: useNairaConversacion no usa useLecturaDeNaira (la pregunta es un POST que registra y consume cupo): nada se envía sin gesto"
  - "P4: VistaDeNaira AGREGA la prop opcional apagada; el 404 de la conversación dice «no está habilitada» (Naira o su sub-flag)"
  - "P10: el campo queda readOnly (no disabled) mientras Naira responde, para no perder el foco"
metrics:
  completed: 2026-09-28
  tasks: 5
  files: 19
---

# Phase 13 Plan 06: Preguntar (conversación ON-DEMAND con Naira) Summary

Pestaña **Preguntar** (`B/preguntar`, `conversation-ask`) como 4.ª pestaña del workspace de Naira: el hilo vive solo en el
estado del hook, las 4 ramas de `NairaConversationAnswer` se pintan en un bloque neutro «RESPUESTA» (con `oraciones` E13-4:
cada una en la categoría de su sección, causa por `OracionesCausales`, corte y enlace por cifra; sin `oraciones`: U6 y
cortes por respuesta, C17), un 403 de la pregunta no deja ni pregunta ni respuesta ni compositor, y ninguna guardia
detectó persistencia, consola, chat beta, datos de la sesión ni simulado.

BASE=4ad6c188bd79a1f1272d96411a75813f87707651

## (1) Paso 0 (medido 2026-09-28, logs en `scratchpad/laned/13-06/`)

- **Punto 1 · base:** HEAD `0a3ee736` (SUMMARY de 13-05), rama `project/naira-superficie`, árbol limpio. `BASE-DE-EJECUCION` =
  `4ad6c188…7651` (`cambios-nico-10`), commit válido, desciende de `4ad6c188`, HEAD desciende de BASE; 0 merges; todo commit
  de `BASE..HEAD` con asunto `docs(13` o `<tipo>(13-0N)` y archivos ⊆ `.planning/naira/` ∪ `files_modified` de 13-01..13-06
  (0 fuera). `13-05-SUMMARY.md` registra la misma `BASE=`. Deriva: `rev-list --count BASE..cambios-nico-10` = **0**;
  `merge-tree --write-tree --name-only cambios-nico-10 HEAD` sin conflictos (solo el árbol `fab4e756`).
- **Punto 2 · 13-01..13-05 en disco:** los 5 SUMMARY existen; todos los exports del plan presentes (37 controles, ninguno
  ausente: `preguntarANaira`, vocabularios, `VistaDeNaira` con `'preguntar'` y `<NairaApagada />` una vez, anclas P6,
  `MarcaDeCorte`, `destinoDeLaRuta`, E13-4 `NairaConversationSentence`/`NairaConversationRef`/`RESPUESTA_TOLERANTE_POR_ENDPOINT`,
  `formatearCorte`, `OracionCausal`, `OracionesCausales`/`BloqueDeCategoria`/`EnlaceALaFuente`, `RUTA_DE_NAIRA`,
  `RUTA_DE_APROBACIONES`, `action: 'action-view'` una vez, comentario «13-04..13-07 AGREGAN», guardias de 13-03 con sus
  marcadores y el par `conversation-ask`, `nombreConversacional`, `tabs.briefing`/`tabs.aprobaciones` en es/en). Ningún
  nombre renombrado. `ENDPOINTS_DE_NAIRA['conversacion.preguntar']` = `{ metodo 'POST', ruta '/conversation/questions',
  acciones ['conversation-ask'], estado 'PLANIFICADO', si404 'apagada' }`. `EJEMPLOS_DE_NAIRA['conversacion.preguntar']` =
  `respondida` con `refsServidas ['catalogo:cartera.morosidad_rate (ejemplo)']`, `oraciones` (LIVE_DATA con cifra +
  `declaracion`) y `refs` (un chunk y una investigación).
- **Punto 3 · anclas del front (presentes):** UserBubble.tsx:16 · beta-chat.ts:302 · textarea.tsx:33 · spinner.tsx:91 ·
  visually-hidden.tsx:208 · button.tsx:66 · empty-state.tsx:106 · PageGuard.tsx:43 · agent-fetch.ts:99 · config.ts:70 ·
  useBetaChat.ts:122 · package.json:73 (`next 15.5.26`) · globals.css:1614; iconos Phosphor y `panel/inmobiliaria/page.tsx`
  presentes.
- **Punto 4 · sin colisión:** ningún archivo de 13-06 existía; nav sin `'conversation-ask'`; VistaDeNaira sin `apagada?:`;
  es/en sin `preguntar` ni `tabs.preguntar`.
- **Punto 5 · entorno:** `@leasefy/cadence` con `dist/` y `node_modules/`; Node **v20.20.0** (nvm), pnpm 10.34.5;
  `pnpm install --frozen-lockfile --offline` **RC=0** (offline por la regla de la sesión); `package.json`/`pnpm-lock.yaml`
  intactos.
- **Punto 6 · agente (solo lectura, `project/account-manager` @ `aca9c079`):** los 6 archivos leídos (RC 0) y todos los
  nombres presentes (9.5-06 con E13-4, 9.5-01, 07-01 `ROUTER_QUESTION_MAX_CHARS = 2000`, 9.5-04 `[DEC:reencuadre]`, H11,
  `dimensions.ts`). **9.5-06 y 9.5-04 NO ejecutados** (RC 128 los dos): no hay `TEXTOS_DE_NEGATIVA` que anotar.
- El `PASO0_P1A6 F=1` del primer control fue solo «FALTA la línea base» (chequeado antes del punto 7): benigno.
- **Punto 7 · línea base** (`/tmp/p1306_base.v8r7u2`, HEAD `0a3ee736`, candado propio, 4 workers): base_1 **1209 archivos,
  0 rojos** (14775 tests); base_2 **1209, 0 rojos**; inestables 0; `tsc --noEmit` **0 errores**.

## (2) Contrato publicado (tal como quedó en disco) y enmiendas

Sin renombres respecto de `<contrato_publicado>`. `conversacion.ts` exporta exactamente: `LARGO_MAXIMO_DE_PREGUNTA`,
`UMBRAL_DEL_CONTADOR`, `preguntaLista`, `NairaConversacionRespondida`, `NairaConversacionNegada`, `textoVisibleDeLaRespuesta`,
`TramoDeLaRespuesta`, `tramosDeLaRespuesta`, `oracionConCorte`, `causalesDeLaConversacion`, `KINDS_DEL_TURNO`,
`EstadoDelTurno`, `TurnoDeConversacion`, `HiloDeNaira`, `EstadoDeLaConversacion`, `CONVERSACION_VACIA`, `DesenlaceDelEnvio`,
`desenlaceDelEnvio`, `conTurnoConsultando`, `conDesenlace`, `CLAVE_DEL_EJE`, `CLAVE_DE_LA_FALLA`, `CLAVE_DEL_CARRIL_NO_SERVIDO`,
`CopiaPropiaDeLaNegativa`, `COPIA_PROPIA_DE_LA_NEGATIVA`, `SugerenciaDePregunta`, `preguntaSugerida`,
`sugerenciasDeLaNegativa`, `METRICAS_DE_EJEMPLO`, `sugerenciasIniciales`. Hook: `ConversacionConNaira { vista, enCurso,
preguntar, reintentar }` + `useNairaConversacion()`. Componentes: `RespuestaDeNairaProps { respuesta, origen,
hrefDeAprobaciones, onSugerir, ahora? }`, `CompositorDePreguntaProps { valor, onCambiar, onEnviar, ocupado, refDelCampo? }`,
`PreguntarClient()`, `PreguntarViewProps { hilo, enCurso, onPreguntar, onReintentarTurno, hrefDeAprobaciones, sugerencias }`,
`ConversacionApagada()`. `VistaDeNaira` AGREGA `readonly apagada?: ReactNode` (`<>{apagada ?? <NairaApagada />}</>`).
Registro: `{ labelKey: 'inmobiliaria.ai.naira.tabs.preguntar', href: \`${NAIRA}/preguntar\`, icon: ChatTeardropText,
module: 'naira', action: 'conversation-ask' }` después de la de `action-view` y antes del comentario «AGREGAN» (13-07
inserta la suya ahí). i18n: `tabs.preguntar` + 51 hojas bajo `inmobiliaria.ai.naira.preguntar` (52 en es y en).

**Enmiendas al contrato (agente):** la `OracionServida` podría servir la banda de una hipótesis (hoy llega sin `hipotesis`:
se oculta y se declara); la ruta podría servir `NOMBRES_DE_EJE` (E13-13; hoy copy propia del front).

## (3) Tareas

| Tarea | Commit | Verificación (log) | Marcadores |
|---|---|---|---|
| 1 · puro + copy es/en | `ae46ef47` | `TAREA1 F=0` (`tarea1.log`) | 14 del puro + i18n/copy-sin-lexico/B-5 verdes; tsc 0 en el archivo |
| 2 · hook + `apagada` | `e2160c3b` | `TAREA2 F=0` (`tarea2.log`) | 11 del hook + 4 de apagada-propia; VistaDeNaira.test.tsx de 13-02 sin tocar y verde |
| 3 · RespuestaDeNaira + Compositor | `58318404` | `TAREA3 F=0` (`tarea3.log`) | 16 + 7; B-5, claimClass (chip-solo-desde-oraciones) y componentes-solo-desde-naira verdes |
| 4 · pestaña + registro | `884f88fe` | `TAREA4 F=0` (`tarea4.log`) | 4 + 15; guardias de 13-03 sin editar y verdes; arquitectura-del-panel con el `it` de `naira/preguntar` verde; globales 0 verde→rojo |
| 5 · guardia AST + cierre | `564baf61` | `TAREA5+CIERRE F=0` (`tarea5.log`) | 6 de la guardia; control positivo verde en los 8 archivos de test del plan |

## (4) Mutaciones en copia (todas pusieron rojo su marcador, ≥1)

T1: m_residuo→403-sin-datos · m_u6 y m_refs_tipadas→causa-no-clasificada-oculta · m_tramos→oraciones-en-tramos ·
m_cifra_sin_corte→cifra-con-su-corte · m_clase→hipotesis-sin-banda · m_rechazado→desenlace-exhaustivo ·
m_accion→negativa-exhaustiva · m_i18n→i18n-es-en. T2: m_residuo→403-sin-residuo · m_vieja→respuesta-vieja-descartada ·
m_storage→conversacion-sin-persistencia · m_log→pregunta-sin-log · m_doble→una-a-la-vez · m_apagada→apagada-propia.
T3: m_dato→respuesta-no-es-dato · m_u6→causa-no-clasificada-oculta · m_sin_oraciones→oraciones-por-seccion ·
m_causa_sin_clase→chip-por-clase · m_dato_sin_corte y m_cifra_sin_marca→cifra-con-su-corte · m_corte→cortes-de-la-respuesta ·
m_sugiere→negativa-sugiere · m_aprobaciones→accion-en-aprobaciones · m_enter→enter-envia · m_contador→contador.
T4: m_residuo y m_compositor_fuera→403-sin-residuo · m_aprobaciones→accion-en-aprobaciones · m_apagada→apagada-propia ·
m_reintento→no-enviada-reintenta · m_accion→pestana-por-su-accion · s_paralela→sin-seccion-paralela.
T5: m_storage→sin-storage-en-naira · m_log→pregunta-sin-log · m_beta→sin-chat-beta · m_persona→b5-sin-quien-pregunta ·
m_simulado→simulado-solo-en-el-cliente.

## (5) Cierre contra la línea base

Suite completa (candado propio, 4 workers): 1217 archivos; 3 archivos en rojo que estaban verdes en la base —
`puertas-que-faltan.guardian.test.ts`, `ListaDeLotes.test.tsx`, `reportes/consola-limpia.test.tsx`, ajenos a 13-06 e
intermitentes conocidos (aparecen en la base_2 de 13-05)— **verdes al re-correr sin tocar nada** (0 siguen rojos).
`tsc --noEmit`: **0 errores nuevos**. 0 archivos fuera de `files_modified`; `package.json`/`pnpm-lock.yaml` intactos.

## (6) Declarado

- **P2:** el hook no usa `useLecturaDeNaira`; tras un 403 solo recargar la página vuelve a abrir la conversación.
- **P4:** el 404 cubre Naira y su sub-flag (con E13-7 los dos son `apagada`); `no_encontrado` también cae en `apagada`.
- **P5/P6:** con E13-4 cada oración en la categoría de su sección (declaración neutra), chip solo por `claimClass`; una
  hipótesis llega sin banda y se oculta con la declaración de 13-02; sin `oraciones`, U6 con `refs` tipadas (solo una
  `investigacion` oculta el texto) y cortes por respuesta sin enlace (C17); `asOfs` vacío ⇒ sin «Cortes de los datos:».
  Nombres de ejes propios hasta E13-13.
- **P7:** textos del servidor tal cual (sin Markdown ni traducción; voseo posible hasta E13-8).
- **P9:** pregunta precargada «Nombre: ¿cómo va?», en español también con el panel en inglés; el vacío usa el proxy de
  visibilidad (módulo destino del drill-down con `view`); si se equivoca, el agente niega con `metrica_no_visible_para_el_rol`.
- **P10:** `readOnly` en vez de `disabled` mientras responde; sin autofoco.
- **P13:** la banda de ejemplo aparece con la primera respuesta de ejemplo (antes no hay dato que marcar).
- Nada se verificó contra un agente vivo (9.5-06 no ejecutado, B-4); el E2E con `route.fulfill` y axe es de 13-08.

## Deviations from Plan

1. **[Rule 3] Candado y workers en los bloques.** Cada `run_tN.zsh` = el bloque `<automated>` del plan con `export
   VITEST_MAX_THREADS=4 VITEST_MAX_FORKS=4` al inicio; en la Tarea 5 la suite completa del cierre va envuelta en el candado
   propio `/tmp/naira-front-suite.lock` (reglas de la sesión). Nada más cambia (`verify_tN.zsh` = texto del plan).
2. **Test adaptado al DOM medido de 13-02 (sin aflojar):** `[N13:chip-por-clase]` — `OracionesCausales` marca con
   `data-claim-class` la oración (`p`) Y su chip (`button`); el test exige exactamente un `p[data-claim-class]`
   (`asociacion`, con TOKEN-ASOCIACION), exactamente un `button[data-claim-class]` y todo `[data-claim-class]` dentro de esa
   oración. `[N13:cifra-con-su-corte]` — `EnlaceALaFuente` pone `data-naira-enlace` en el `span` que envuelve al `a`: el test
   exige exactamente un `[data-naira-enlace="activo"]` con un `a[href]` = `rutaDeLaMetrica('cartera.morosidad_rate')`.
3. **PreguntarView:** el estado de cada turno se pinta con una función interna de `PreguntarView` (no un componente
   aparte), así la mutación `m_reintento` (`onPreguntar(turno.pregunta)`) tiene `onPreguntar` en alcance y se pone roja por
   su causa (una pregunta nueva), no por una referencia rota.
4. **Hook:** `conversacionRef` se actualiza en un `useEffect` sin dependencias (después de cada render) en vez de asignarse
   durante el render (regla de refs de React 19); mismo efecto observable.
5. El script de la copy vive en `scratchpad/laned/13-06/copy_1306.js` (fuera del repo, no se commitea) en vez de un
   `mktemp -d`.

## Known Stubs

Ninguno: todos los datos vienen del hook/cliente reales (en tests, simulados sobre el módulo real).

## Threat Flags

Ninguna superficie nueva fuera del `<threat_model>`: el único endpoint es `POST …/conversation/questions` vía
`preguntarANaira` (13-01).

## Self-Check: PASSED

Los 15 archivos creados y los 4 modificados existen; los commits `ae46ef47`, `e2160c3b`, `58318404`, `884f88fe` y `564baf61`
están en `project/naira-superficie`.
