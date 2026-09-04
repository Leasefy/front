/**
 * Redirecciones de la arquitectura anterior del panel a la nueva, por ciclo de
 * vida del contrato — septiembre 2026.
 *
 * El sidebar tenía 38 entradas en 7 grupos, once bajo un namespace paralelo
 * `/ai/*` que repetía módulos que ya existían afuera. Ahora la IA vive dentro
 * de cada módulo (Cobros → Cobranza, Pagos → la Sala, Postulaciones → el flujo
 * del candidato…), los grupos siguen el ciclo de vida y el rol filtra en vez
 * de bifurcar. La fuente de la estructura es
 * `src/lib/nav/arquitectura-del-panel.ts`.
 *
 * Ninguna pantalla se eliminó ni se reescribió: cambió la carpeta. Por eso
 * cada URL vieja llega a la nueva con `:path*`, que cubre la raíz y todas sus
 * subrutas, y las reglas van de la más específica a la más general (Next
 * aplica la primera que coincide). Los enlaces guardados, el histórico de
 * analítica, los correos y los enlaces que manda el micro (Piloto, cajones
 * `mov:`) siguen abriendo lo mismo. Estas reglas NO son limpieza temporal.
 *
 * `permanent: false` (307) y no 301, por el mismo motivo que
 * `rutas-unificadas-del-panel.data.mjs`: un 301 lo cachea el navegador para
 * siempre y nadie podría volver a probar la ruta vieja si se revierte. Cuando
 * la arquitectura quede validada en producción se sube a permanente.
 *
 * Es `.mjs` porque `next.config.mjs` lo importa en tiempo de build; la copia
 * tipada y el test viven en `rutas-por-ciclo-de-vida.ts` / `.test.ts`.
 */

const P = '/panel/inmobiliaria'

/** @type {Array<{ source: string, destination: string, permanent: boolean }>} */
export const RUTAS_POR_CICLO_DE_VIDA_DATA = [
  // ── Dinero ────────────────────────────────────────────────────────────────
  { source: `${P}/ai/cobranza/:path*`, destination: `${P}/cobros/cobranza/:path*`, permanent: false },
  { source: `${P}/cartera`, destination: `${P}/cobros/cartera`, permanent: false },
  { source: `${P}/recaudo`, destination: `${P}/cobros/recaudo`, permanent: false },
  { source: `${P}/ai/pagos/:path*`, destination: `${P}/pagos/:path*`, permanent: false },
  { source: `${P}/dispersiones/:path*`, destination: `${P}/pagos/dispersiones/:path*`, permanent: false },
  { source: `${P}/tesoreria/ap/:path*`, destination: `${P}/pagos/cxp/:path*`, permanent: false },
  { source: `${P}/tesoreria/facturas/nueva`, destination: `${P}/pagos/cxp/nueva`, permanent: false },
  { source: `${P}/tesoreria`, destination: `${P}/pagos/liquidaciones`, permanent: false },
  { source: `${P}/ai/conciliacion/:path*`, destination: `${P}/conciliacion/:path*`, permanent: false },

  // ── Captación y arriendo ─────────────────────────────────────────────────
  { source: `${P}/ai/estudio/:path*`, destination: `${P}/postulaciones/estudio/:path*`, permanent: false },
  { source: `${P}/ai/matching/:path*`, destination: `${P}/postulaciones/matching/:path*`, permanent: false },
  { source: `${P}/ai/asegurabilidad/:path*`, destination: `${P}/postulaciones/asegurabilidad/:path*`, permanent: false },
  // Alias histórico (los specs e2e del cotizador lo usan; nunca tuvo carpeta).
  { source: `${P}/ai/cotizador/:path*`, destination: `${P}/postulaciones/asegurabilidad/:path*`, permanent: false },
  { source: `${P}/documentos/revision`, destination: `${P}/postulaciones/soportes`, permanent: false },
  { source: `${P}/ai/avaluos/:path*`, destination: `${P}/inmuebles/avaluos/:path*`, permanent: false },
  { source: `${P}/renovaciones`, destination: `${P}/contratos/renovaciones`, permanent: false },
  // Retención: la Sala, la bandeja (Riesgo) y la cola de revisión (Por
  // aprobar) son pantallas hermanas de Contratos, como las dibuja la propuesta.
  { source: `${P}/ai/retencion/bandeja/:path*`, destination: `${P}/contratos/riesgo/:path*`, permanent: false },
  { source: `${P}/ai/retencion/revisiones`, destination: `${P}/contratos/aprobar`, permanent: false },
  { source: `${P}/ai/retencion`, destination: `${P}/contratos/retencion`, permanent: false },

  // ── Operación ────────────────────────────────────────────────────────────
  { source: `${P}/ai/mantenimiento/tickets/:path*`, destination: `${P}/mantenimientos/tickets/:path*`, permanent: false },
  { source: `${P}/ai/mantenimiento`, destination: `${P}/mantenimientos/tickets/resumen`, permanent: false },
  { source: `${P}/operaciones`, destination: `${P}/mantenimientos`, permanent: false },
  { source: `${P}/pqrs`, destination: `${P}/solicitudes`, permanent: false },

  // ── Pie: lectura y ajustes ───────────────────────────────────────────────
  { source: `${P}/analytics`, destination: `${P}/reportes/ia`, permanent: false },
  { source: `${P}/dashboard`, destination: `${P}/reportes/resumen`, permanent: false },
  { source: `${P}/agentes/:path*`, destination: `${P}/configuracion/equipo/:path*`, permanent: false },
  { source: `${P}/ai/aprendizaje`, destination: `${P}/configuracion/ia`, permanent: false },
  // El hub /ai (la vitrina de agentes) — va ÚLTIMO entre las de /ai: es exacto.
  { source: `${P}/ai`, destination: `${P}/configuracion/agentes`, permanent: false },
]
