/**
 * rutas-unificadas-del-panel.data.mjs — «Consignaciones» e «Inmuebles ·
 * catálogo» eran dos entradas del menú sobre UNA sola lista, y ahora son
 * `/panel/inmobiliaria/inmuebles`.
 *
 * Se midió antes de unificarlas: 10 consignaciones, 10 inmuebles,
 * correspondencia 1:1, ningún huérfano de ningún lado y el mismo permiso
 * (`portafolio`) protegiendo las dos. Las 6 filas que se veían en una contra
 * las 10 de la otra no eran conjuntos distintos: era el filtro «disponibles»
 * que venía puesto por defecto.
 *
 * Las redirecciones no son cosmética. Hay enlaces guardados, correos con
 * enlace al detalle de una consignación y pestañas abiertas; y son `:path*`
 * para que `/portafolio/nuevo`, `/portafolio/<id>` y
 * `/propiedades/<id>/candidatos` lleguen a su equivalente sin escribir una
 * regla por ruta.
 *
 * `permanent: false` (307) a propósito y no 301: un 301 lo cachea el navegador
 * para siempre, y si mañana se decide que el catálogo vuelve a tener pantalla
 * propia, nadie podría entrar a probarla.
 *
 * ⚠️ El `source` arranca en `/panel/inmobiliaria/` — `/propiedades` a secas es
 * el buscador PÚBLICO del marketplace y no se toca.
 *
 * Plain ESM y no `.ts` por el mismo motivo que `legacy-redirects.data.mjs`:
 * Next 14.2 no soporta `next.config.ts` y el config corre bajo Node pelado.
 */
const PANEL = '/panel/inmobiliaria'

export const RUTAS_UNIFICADAS_DEL_PANEL_DATA = [
  {
    source: `${PANEL}/portafolio/:path*`,
    destination: `${PANEL}/inmuebles/:path*`,
    permanent: false,
  },
  {
    source: `${PANEL}/propiedades/:path*`,
    destination: `${PANEL}/inmuebles/:path*`,
    permanent: false,
  },
]
