/**
 * cobranza-retiradas.data.mjs — las pantallas de Cobranza que ya no
 * existen y a dónde aterriza quien llega por un enlace guardado.
 *
 *   /pagos/cobranza/equipo     → /pagos/cobranza                          (MORI-37, Nico 19-10)
 *   /pagos/cobranza/promesas   → /pagos/cobranza/acuerdos?estado=vigente  (fusionada en Acuerdos)
 *   /pagos/cobranza/plantillas → /pagos/cobranza/configuracion            (Playbooks ocultos)
 *   /pagos/cobranza/analitica  → /pagos/cobranza#como-trabajo              (ronda 30, K8: fusionada en el Resumen)
 *   /pagos/cobranza/resultados → /pagos/cobranza#como-trabajo              (ronda 30, K8: fusionada en el Resumen)
 *   /pagos/cobranza/pendientes → /pagos/cobranza#te-toca-a-ti              (ronda 30, K8: fusionada en «Te toca a ti»)
 *
 * ── Por qué aquí y no sólo en el `page.tsx` ─────────────────────────────────
 *
 * Revisora r27 (K7, ronda 28): el `redirect()` de cada `page.tsx` vive DEBAJO
 * de la puerta del módulo (`cobranza/layout.tsx` → `AgentModuleGate`). Con el
 * asistente caído, la puerta no monta `children` y la redirección no corre: la
 * persona veía «Promesas de pago», «Plantillas de cobranza» o «Equipo IA de
 * cobranza», pantallas que ya no existen, con su nombre. En `next.config.mjs`
 * la redirección corre antes de montar nada y no depende del micro.
 *
 * Las fuentes son LITERALES: no tapan ninguna otra ruta. Cada una va también
 * con sus gemelos viejos (`/ai/cobranza/<x>` y `/cobros/cobranza/<x>`), que si
 * no pasarían primero por `/pagos/cobranza/<x>` y el salto sería doble.
 * Los `page.tsx` conservan su `redirect()` como respaldo.
 */
const P = '/panel/inmobiliaria'

/** [ruta vieja dentro de cobranza, destino completo] */
const RETIRADAS = [
  ['equipo', `${P}/pagos/cobranza`],
  ['promesas', `${P}/pagos/cobranza/acuerdos?estado=vigente`],
  ['plantillas', `${P}/pagos/cobranza/configuracion`],
  // Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»): repetían el Resumen; aterrizan en su ancla.
  ['analitica', `${P}/pagos/cobranza#como-trabajo`],
  ['resultados', `${P}/pagos/cobranza#como-trabajo`],
  ['pendientes', `${P}/pagos/cobranza#te-toca-a-ti`],
]

export const COBRANZA_RETIRADAS_DATA = RETIRADAS.flatMap(([de, a]) => [
  { source: `${P}/pagos/cobranza/${de}`, destination: a, permanent: false },
  { source: `${P}/ai/cobranza/${de}`, destination: a, permanent: false },
  { source: `${P}/cobros/cobranza/${de}`, destination: a, permanent: false },
])
