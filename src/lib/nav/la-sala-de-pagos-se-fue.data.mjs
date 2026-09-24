/**
 * la-sala-de-pagos-se-fue.data.mjs — el TERCER renglón de pestañas de
 * `/panel/inmobiliaria/pagos` desapareció, y estas son las URLs que sostenía.
 *
 * ── Qué se decidió, y por quién ────────────────────────────────────────────
 *
 * Nico, 2026-09-16, mirando el encabezado de Pagos: «eso de inquilinos y
 * propietarios **no se entiende realmente**, y que las tabs de abajo estén
 * atadas a lo seleccionado arriba. Y esa tab de **generar cobros, ¿para qué?**
 * Sigo preguntando si eso está con **estado de cuenta atado**, y ya te he
 * explicado tantas veces que **eso va atado al estado de cuenta**.»
 *
 * Había TRES renglones: la cara (inquilinos / propietarios), las secciones del
 * módulo, y las pestañas de la Sala del agente de Pagos. El tercero decía
 * «Pagos a propietarios» mientras arriba estaba elegido «Inquilinos»: no le
 * obedecía a nadie. Es herencia de cuando el módulo ERA la sala de un agente,
 * cosa que dejó de ser la noche anterior («no debe llamarse Pagos IA»).
 *
 * El detalle de las nueve pestañas —cuál se mudó, cuál murió y por qué— vive
 * en la NOTA al pie de `agentWorkspaceNav.ts`. Acá van sólo sus URLs:
 *
 *   /pagos/generar        → /pagos/cartera/cobros            (maqueta, borrada)
 *   /pagos/reglas         → /pagos/cartera/reglas-de-mora    (maqueta, borrada)
 *   /pagos/propietarios   → /pagos/liquidaciones             (maqueta, borrada)
 *   /pagos/cola           → /pagos/liquidaciones/por-aprobar (mudada)
 *   /pagos/fallidos       → /pagos/cobranza/fallidos         (mudada)
 *   /pagos/recordatorios  → /pagos/cobranza/recordatorios    (mudada)
 *
 * ── Por qué cada una va DOS veces ──────────────────────────────────────────
 *
 * Estas seis pantallas nacieron bajo `${P}/ai/pagos/*`, con el namespace de
 * los agentes. Ese
 * namespace murió y hoy lo cubre `/ai/pagos/:path*` → `/pagos/:path*`
 * (`rutas-por-ciclo-de-vida.data.mjs`). Con una sola entrada por pantalla,
 * `/ai/pagos/cola` daría DOS saltos: primero a `/pagos/cola` y de ahí a
 * `/pagos/liquidaciones/por-aprobar`. Funciona, pero es una cadena — y la casa
 * no las acepta (hay un test en `un-solo-modulo-de-plata.test.ts` que las
 * prohíbe). Declarar el gemelo `/ai/pagos/<x>` cuesta seis líneas y deja todo
 * en un salto.
 *
 * ── 🔴 Esta tabla va PRIMERA en `next.config.mjs` ──────────────────────────
 *
 * Next aplica la primera regla que calza, y `/ai/pagos/:path*` se comería los
 * seis gemelos de arriba. Todas las fuentes de acá son literales (ningún
 * comodín), así que ponerlas primero no puede tapar nada más. Hay un test que
 * lee `next.config.mjs` de verdad y exige ese orden: no se puede ver leyendo
 * ninguno de los dos archivos por separado.
 *
 * `permanent: false` (307) por el mismo motivo que sus hermanas: un 301 lo
 * cachea el navegador para siempre y nadie podría volver a probar la ruta
 * vieja si esto se revierte.
 *
 * Plain ESM y no `.ts` porque Next 14.2 no soporta `next.config.ts` y el
 * config corre bajo Node pelado. La re-exportación tipada vive en el `.ts`
 * hermano.
 */
const P = '/panel/inmobiliaria'

/** Las seis, con su destino. La tabla de abajo la expande a doce. */
const MUDANZAS = [
  ['generar', 'cartera/cobros'],
  ['reglas', 'cartera/reglas-de-mora'],
  ['propietarios', 'liquidaciones'],
  ['cola', 'liquidaciones/por-aprobar'],
  ['fallidos', 'cobranza/fallidos'],
  ['recordatorios', 'cobranza/recordatorios'],
]

/** @type {Array<{ source: string, destination: string, permanent: boolean }>} */
export const LA_SALA_DE_PAGOS_SE_FUE_DATA = MUDANZAS.flatMap(([de, a]) => [
  { source: `${P}/pagos/${de}`, destination: `${P}/pagos/${a}`, permanent: false },
  { source: `${P}/ai/pagos/${de}`, destination: `${P}/pagos/${a}`, permanent: false },
])
