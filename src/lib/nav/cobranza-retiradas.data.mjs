/**
 * cobranza-retiradas.data.mjs — las tres pantallas de Cobranza que ya no
 * existen y a dónde aterriza quien llega por un enlace guardado.
 *
 *   /pagos/cobranza/equipo     → /pagos/cobranza                          (MORI-37, Nico 19-10)
 *   /pagos/cobranza/promesas   → /pagos/cobranza/acuerdos?estado=vigente  (fusionada en Acuerdos)
 *   /pagos/cobranza/plantillas → /pagos/cobranza/configuracion            (Playbooks ocultos)
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
]

export const COBRANZA_RETIRADAS_DATA = RETIRADAS.flatMap(([de, a]) => [
  { source: `${P}/pagos/cobranza/${de}`, destination: a, permanent: false },
  { source: `${P}/ai/cobranza/${de}`, destination: a, permanent: false },
  { source: `${P}/cobros/cobranza/${de}`, destination: a, permanent: false },
])
