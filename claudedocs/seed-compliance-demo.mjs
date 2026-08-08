/**
 * seed-compliance-demo.mjs — datos de demo para /ai/cobranza/compliance.
 *
 * Por qué las pantallas salían vacías: la agencia demo
 * (f1849975-2cdc-49a4-8983-ee5de56127f5) tiene CERO filas en
 * `agent.compliance_events`. Los 162 eventos que hay en la base son de otros
 * tres tenants, y además de tipos que estas pantallas no leen (los que emite el
 * agente de voz). No es un bug de la pantalla: no hay nada que mostrar.
 *
 * Los cuatro tipos que se siembran acá SÍ los escribe el sistema en producción:
 *   cadence_skip           <- cartera/cadence-orchestrator.ts (emitSkip)
 *   inbound_outside_hours  <- server/routes/vapi-inbound.ts
 *   opt_out_request        <- server/routes/habeas-data-opt-out.ts
 *   opt_out_acknowledged   <- server/lib/audit-actions.ts
 * O sea que esto reproduce un estado alcanzable, no uno inventado.
 *
 * Los plazos se eligen para que se vean los cuatro colores del semáforo de
 * habeas data (verde / amarillo / rojo / rojo intermitente), incluido un caso
 * ya vencido — que es el que hay que poder reconocer de un vistazo.
 *
 * Rollback:
 *   DELETE FROM agent.compliance_events WHERE details->>'seed' = 'demo-compliance';
 */

import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const AGENCY = 'f1849975-2cdc-49a4-8983-ee5de56127f5'
const SEED_TAG = 'demo-compliance'

/**
 * Retrocede N días HÁBILES (fines de semana y festivos colombianos fuera).
 *
 * Antes se restaban días calendario, y cuando la pantalla pasó a contar en
 * hábiles —como manda la ley— la siembra dejó de ejercitar los casos que
 * buscaba: lo que era «vencida» quedó con cuatro días de holgura. Un fixture
 * que no usa el mismo calendario que el código mide otra cosa.
 */
import { isColombianBusinessDay } from './src/lib/colombian-holidays.ts'

const daysAgo = (n) => {
  const d = new Date()
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() - 1)
    if (isColombianBusinessDay(d)) left--
  }
  // Deja una hora fija para que la siembra sea reproducible dentro del día.
  d.setHours(10, 0, 0, 0)
  return d
}

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
await client.connect()

const { rows: debtors } = await client.query(
  `SELECT id::text, full_name FROM agent.debtors WHERE tenant_id = $1 ORDER BY created_at LIMIT 8`,
  [AGENCY],
)
if (debtors.length < 8) {
  console.error(`Se esperaban 8 deudores en la agencia demo, hay ${debtors.length}.`)
  process.exit(1)
}
const [nicolas, maria, carlos, luz, juan, gloria, andres, daniela] = debtors

const events = []
const add = (debtor, eventType, ago, details = {}, channel = null) => {
  const ts = daysAgo(ago)
  events.push({
    id: randomUUID(),
    tenantId: AGENCY,
    debtorId: debtor.id,
    eventType,
    details: { ...details, seed: SEED_TAG },
    timestamp: ts,
    dayBucket: ts.toISOString().slice(0, 10),
    channel,
  })
}

// ── Habeas data: los cuatro colores del semáforo ─────────────────────────────
// Término del reclamo = 15 días HÁBILES (Art. 15). Restantes:
// verde (>7) · amarillo (4–7) · rojo (2–3) · rojo intermitente (≤1) · vencida (<0)
add(nicolas, 'opt_out_request', 2, { reason: 'Solicita no ser contactado por WhatsApp' }, 'whatsapp')
add(daniela, 'arco_request', 4, { arco_type: 'acceso' }, 'email')
add(maria, 'arco_request', 8, { arco_type: 'rectificacion' }, 'email')
add(carlos, 'opt_out_request', 12, { reason: 'Pide baja total de contacto' }, 'voice')
add(luz, 'opt_out_request', 14, { reason: 'Manifiesta molestia por frecuencia' }, 'sms')
// Vencida: el caso que hay que reconocer de un vistazo.
add(juan, 'opt_out_request', 18, { reason: 'Solicita supresión de datos' }, 'voice')

// Dos ya atendidas: salen de la lista de abiertas y quedan como resueltas en el
// registro. Sin esto la pantalla sólo mostraría el estado malo.
add(gloria, 'opt_out_request', 20, { reason: 'No autoriza llamadas' }, 'whatsapp')
add(gloria, 'opt_out_acknowledged', 18, { resolved_by: 'operaciones' })
add(andres, 'opt_out_request', 25, { reason: 'Prefiere sólo correo' }, 'voice')
add(andres, 'opt_out_acknowledged', 24, { resolved_by: 'operaciones' })

// ── Ley 2300: intentos fuera de la ventana horaria ───────────────────────────
// El objetivo es 0, así que con esto el indicador queda fuera de meta — que es
// el estado que vale la pena poder ver.
const canales = ['whatsapp', 'voice', 'sms', 'email']
const ley2300Recientes = [
  [nicolas, 0.4], [carlos, 1.2], [maria, 2.6],
  [luz, 3.5], [daniela, 5.1], [juan, 6.3],
]
ley2300Recientes.forEach(([d, ago], i) => {
  add(d, 'cadence_skip', ago, { rule: 'ley_2300_outside_window' }, canales[i % canales.length])
})

// Más viejos: le dan forma a la curva de 30 días en vez de un pico solitario.
const ley2300Viejos = [
  [andres, 9.2], [gloria, 11.5], [nicolas, 14.1], [carlos, 16.8],
  [maria, 19.3], [luz, 22.6], [daniela, 25.4], [juan, 28.1],
]
ley2300Viejos.forEach(([d, ago], i) => {
  add(d, 'cadence_skip', ago, { rule: 'ley_2300_outside_window' }, canales[i % canales.length])
})

// Entrantes fuera de horario: aparecen en la bitácora de Ley 2300 junto a los
// saltos, y son un caso distinto (llama el deudor, no la inmobiliaria).
;[[gloria, 1.8], [juan, 4.4], [andres, 7.7], [carlos, 13.2], [maria, 21.9]].forEach(
  ([d, ago]) => add(d, 'inbound_outside_hours', ago, { hora_local: 'fuera de 7am-7pm' }, 'voice'),
)

// ── Escritura ────────────────────────────────────────────────────────────────
const borrados = await client.query(
  `DELETE FROM agent.compliance_events WHERE details->>'seed' = $1`,
  [SEED_TAG],
)
if (borrados.rowCount) console.log(`Limpiadas ${borrados.rowCount} filas de una siembra anterior.`)

for (const e of events) {
  await client.query(
    `INSERT INTO agent.compliance_events
       (id, tenant_id, debtor_id, event_type, details, timestamp, day_bucket, channel)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
    [e.id, e.tenantId, e.debtorId, e.eventType, JSON.stringify(e.details), e.timestamp, e.dayBucket, e.channel],
  )
}

const { rows: resumen } = await client.query(
  `SELECT event_type, count(*)::int AS n
   FROM agent.compliance_events WHERE details->>'seed' = $1
   GROUP BY event_type ORDER BY 2 DESC`,
  [SEED_TAG],
)
console.log(`\nSembrados ${events.length} eventos en la agencia demo:`)
console.table(resumen)

await client.end()
