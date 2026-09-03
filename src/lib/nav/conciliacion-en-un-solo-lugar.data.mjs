/**
 * conciliacion-en-un-solo-lugar.data.mjs — había DOS pantallas para conciliar
 * el banco y ahora hay una: `/panel/inmobiliaria/ai/conciliacion/movimientos`.
 *
 * ── Qué era cada una ───────────────────────────────────────────────────────
 *
 *   · `/cobros/extracto-bancario` (la que se retira) hablaba con el MONOLITO,
 *     vía `conciliacion-bancaria.service.ts`: subía el extracto en CSV **o
 *     Excel** de cualquier banco, lo cruzaba contra los cobros con saldo,
 *     conciliar EMITÍA UN RECIBO DE CAJA y tenía el lote de seguros.
 *   · `/ai/conciliacion/movimientos` habla con el MICRO: taxonomía de
 *     excepciones, sugerencias y `reverse`. Confirmar ahí no emite recibo.
 *
 * ── Por qué gana la del workspace ──────────────────────────────────────────
 *
 * Se midió antes de unificarlas: en la agencia de pruebas el ERP tiene 6 filas
 * en `movimientos_bancarios` y el micro 0 en `agent.bank_movements`. La plata
 * vive en el ERP, así que lo que se mudó fue la PANTALLA, no el backend: el
 * workspace del agente ahora monta `<ExtractoBancario />` (mismo servicio,
 * mismo recibo, mismo Excel, mismo lote de seguros) y deja lo del micro debajo,
 * visible sólo cuando el micro tiene datos.
 *
 * La redirección no es cosmética: el botón del encabezado de Cobros, el
 * buscador del panel y los enlaces que manda el Piloto («Ver en el extracto»)
 * apuntaban a la vieja, y hay pestañas abiertas y correos con ese enlace.
 *
 * La regla EXACTA va primero y la de `:path*` después, y el orden importa:
 * `:path*` también matchea cero segmentos, así que si fuera primera se comería
 * la URL pelada —la que de verdad tiene todo el mundo guardada— y, como el
 * destino no usa `:path`, Next le pegaría un `?path=` al final. Con la exacta
 * adelante, el enlace guardado cae limpio y `:path*` queda de red por si mañana
 * alguien guarda `/cobros/extracto-bancario/algo`.
 *
 * `permanent: false` (307) y no 301, por el mismo motivo que
 * `rutas-unificadas-del-panel.data.mjs`: un 301 lo cachea el navegador para
 * siempre y nadie podría volver a probar la ruta vieja si se revierte.
 *
 * Plain ESM y no `.ts` porque Next 14.2 no soporta `next.config.ts` y el config
 * corre bajo Node pelado. La re-exportación tipada vive en el `.ts` hermano.
 */
const PANEL = '/panel/inmobiliaria'

export const CONCILIACION_EN_UN_SOLO_LUGAR_DATA = [
  {
    source: `${PANEL}/cobros/extracto-bancario`,
    destination: `${PANEL}/ai/conciliacion/movimientos`,
    permanent: false,
  },
  {
    source: `${PANEL}/cobros/extracto-bancario/:path*`,
    destination: `${PANEL}/ai/conciliacion/movimientos`,
    permanent: false,
  },
]
