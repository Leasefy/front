/**
 * seed-playbooks-demo.mjs — catálogo de demo para /ai/cobranza/plantillas.
 *
 * ⚠️ LEER ANTES DE CORRERLO.
 *
 * `agent.script_templates` y `agent.script_objection_handlers` están VACÍAS —
 * cero filas, para todos los tenants. Y no es que falte un seed: no hay NADA en
 * el producto que escriba esas tablas. La pantalla de Playbooks es un editor
 * sobre un catálogo que nadie llena.
 *
 * Peor: tampoco nadie lo lee en runtime. Los guiones que de verdad se le dicen
 * al deudor son datos en código, en `src/cartera/scripts/templates/{es,en}/`,
 * y ese módulo lo declara explícito:
 *
 *     «Greppable invariant: this file imports ONLY pure-data modules.
 *      No Mastra, no Prisma, no async — templates are deterministic data.»
 *
 * O sea que editar y publicar acá NO cambia un solo mensaje que salga. La única
 * excepción real es WhatsApp: publicar dispara `submitTemplate()` contra el BSP,
 * que sí registra la plantilla en Meta.
 *
 * Este script existe para poder VER la pantalla con datos (los tres estados del
 * ciclo borrador → publicado → cambios sin publicar). No lo corras esperando
 * que el agente empiece a usar estos textos.
 *
 * Uso:
 *   cd ~/rent/agent-develop && node ~/rent/mvp/claudedocs/seed-playbooks-demo.mjs
 *
 * Rollback:
 *   DELETE FROM agent.script_templates WHERE tenant_id = '<AGENCY>';
 */

import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const AGENCY = 'f1849975-2cdc-49a4-8983-ee5de56127f5'

/**
 * Los tres estados que la pantalla sabe distinguir. La fila S3 es la que
 * importa: publicada Y con cambios sin publicar — la tarjeta debe seguir
 * mostrando el texto VIVO (`body_published`), no el borrador, porque eso es lo
 * que hoy le llega al deudor.
 */
const ROWS = [
  {
    stage: 'S1',
    channel: 'voice',
    tone: 'cordial',
    body: 'Buenos días {{deudor_nombre}}, le llamo de {{nombre_inmobiliaria}} por el canon de {{monto_total}} que venció hace {{dias_mora}} días.',
    draft: null,
    published: null,
    wa: null,
  },
  {
    stage: 'S2',
    channel: 'whatsapp',
    tone: 'firme',
    body: 'Hola {{deudor_nombre}}: su arriendo sigue pendiente por {{monto_total}}. Puede pagar acá: {{link_pago}}',
    draft: 'Hola {{deudor_nombre}}: su arriendo sigue pendiente por {{monto_total}}. Puede pagar acá: {{link_pago}}',
    published: 'Hola {{deudor_nombre}}: su arriendo sigue pendiente por {{monto_total}}. Puede pagar acá: {{link_pago}}',
    wa: 'approved',
  },
  {
    stage: 'S3',
    channel: 'whatsapp',
    tone: 'firme',
    body: 'Texto viejo publicado.',
    draft: 'Texto nuevo sin publicar todavía.',
    published: 'Texto viejo publicado.',
    wa: 'pending',
  },
]

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
await client.connect()

const borradas = await client.query(
  'DELETE FROM agent.script_templates WHERE tenant_id = $1',
  [AGENCY],
)
if (borradas.rowCount) {
  console.log(`Limpiadas ${borradas.rowCount} filas de una siembra anterior.`)
}

for (const r of ROWS) {
  await client.query(
    `INSERT INTO agent.script_templates
       (id, stage, channel, language, tone_variant, body, version, active,
        tenant_id, created_at, body_draft, body_published, wa_submission_status)
     VALUES ($1, $2::agent.cartera_stage, $3, 'es', $4, $5, 1, true,
             $6, now(), $7, $8, $9)`,
    [randomUUID(), r.stage, r.channel, r.tone, r.body, AGENCY, r.draft, r.published, r.wa],
  )
}

const { rows } = await client.query(
  `SELECT stage::text, channel,
          CASE WHEN body_published IS NULL THEN 'borrador'
               WHEN body_draft IS DISTINCT FROM body_published THEN 'borrador (cambios sin publicar)'
               ELSE 'publicada' END AS estado,
          wa_submission_status
   FROM agent.script_templates WHERE tenant_id = $1 ORDER BY stage`,
  [AGENCY],
)
console.log(`\nSembradas ${ROWS.length} plantillas en la agencia demo:`)
console.table(rows)

await client.end()
