/**
 * un-solo-modulo-de-plata.data.mjs — «Cobros» y «Pagos» eran DOS filas del
 * sidebar para la misma plata. Ahora hay UNA: `/panel/inmobiliaria/pagos`.
 *
 * ── Qué se decidió, y por quién ────────────────────────────────────────────
 *
 * Nico, 2026-09-15, mirando el sidebar: «hay dos cosas de lo mismo, que son
 * Cobros y uno en Pagos y el otro en Cobros […] creo que dijo que se fuera lo
 * de Cobros, **porque todo funciona alrededor del estado de cuenta del
 * contrato**.»
 *
 * El CEO, el mismo día: «yo le pondría de una vez lo que es inquilinos
 * —recibos de caja, facturación general— y dispersión a propietarios, todo en
 * **un solo módulo**»; y «el cobro […] ni siquiera debería generarse de forma
 * automática: que la persona de finanzas decida cuándo cobrar basado en la
 * cartera».
 *
 * De ahí sale el mapa nuevo: la deuda NACE CON EL CONTRATO y vive en su estado
 * de cuenta; el cobro del mes es el DOCUMENTO con el que se reclama una parte
 * de ella. Un documento no es un módulo, así que la lista de cobros emitidos
 * bajó a ser una lectura más de Cartera. Ver
 * `back-erp/docs/pagos-conciliacion-dispersion-plan.md` §P2.7.
 *
 *   /cobros                      → /pagos/cartera/cobros
 *   /cobros/<id>/cuenta-de-cobro → /pagos/cartera/cobros/<id>/cuenta-de-cobro
 *   /cobros/recaudo              → /pagos/recaudo
 *   /cobros/cartera[/…]          → /pagos/cartera[/…]
 *   /cobros/reglas-de-mora       → /pagos/cartera/reglas-de-mora
 *   /cobros/cobranza[/…]         → /pagos/cobranza[/…]
 *   /pagos/cobros                → /pagos/cartera/cobros
 *
 * ── Por qué hay redirecciones y no sólo un sidebar nuevo ───────────────────
 *
 * Ninguna pantalla se eliminó ni se reescribió: cambió la carpeta. Hay
 * enlaces guardados, correos con enlace a una cuenta de cobro, enlaces que
 * manda el micro (cajones `mov:` del Piloto, las cartas de cobranza) y
 * pestañas abiertas. `:path*` cubre la raíz y todas sus subrutas de una vez.
 *
 * La ÚNICA que muere de verdad es `/pagos/cobros`: era una maqueta con un
 * cobro de ejemplo y tres enlaces a la tabla real. Es exactamente la
 * duplicación que Nico señaló, así que su URL cae en la tabla real.
 *
 * ── El orden, que acá importa más que de costumbre ─────────────────────────
 *
 * Las reglas van de la MÁS ESPECÍFICA a la más general, porque Next aplica la
 * primera que calza y `/cobros/:path*` se come todo lo que cuelgue de
 * `/cobros`.
 *
 * 🔴 Y esta tabla va DESPUÉS de `CONCILIACION_EN_UN_SOLO_LUGAR_DATA` en
 * `next.config.mjs`. `/cobros/extracto-bancario` ya redirige al workspace de
 * Conciliación desde otra tanda; si esta tabla fuera primero, esa URL —que
 * está en correos y en enlaces del Piloto— terminaría en
 * `/pagos/cartera/cobros/extracto-bancario`, que no existe. Hay un test que
 * lee `next.config.mjs` y exige ese orden.
 *
 * `permanent: false` (307) y no 301, por el mismo motivo que sus hermanas: un
 * 301 lo cachea el navegador para siempre y nadie podría volver a probar la
 * ruta vieja si se revierte.
 *
 * Plain ESM y no `.ts` porque Next 14.2 no soporta `next.config.ts` y el
 * config corre bajo Node pelado. La re-exportación tipada vive en el `.ts`
 * hermano.
 */
const P = '/panel/inmobiliaria'

/** @type {Array<{ source: string, destination: string, permanent: boolean }>} */
export const UN_SOLO_MODULO_DE_PLATA_DATA = [
  // ── Cara inquilinos ──────────────────────────────────────────────────────
  { source: `${P}/cobros/cobranza/:path*`, destination: `${P}/pagos/cobranza/:path*`, permanent: false },
  // Reglas de mora bajó DENTRO de Cartera: es la perilla de cuándo una cuota
  // vencida pasa a ser cartera, no una pantalla suelta de un listado.
  { source: `${P}/cobros/reglas-de-mora`, destination: `${P}/pagos/cartera/reglas-de-mora`, permanent: false },
  { source: `${P}/cobros/cartera/:path*`, destination: `${P}/pagos/cartera/:path*`, permanent: false },
  { source: `${P}/cobros/recaudo`, destination: `${P}/pagos/recaudo`, permanent: false },
  // La general va ÚLTIMA: cubre `/cobros` pelada y `/cobros/<id>/cuenta-de-cobro`.
  { source: `${P}/cobros/:path*`, destination: `${P}/pagos/cartera/cobros/:path*`, permanent: false },
  // La maqueta que Nico señaló, ahora la tabla de verdad.
  { source: `${P}/pagos/cobros`, destination: `${P}/pagos/cartera/cobros`, permanent: false },
]
