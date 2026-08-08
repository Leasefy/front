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
 * Uso (el script tiene que EJECUTARSE dentro del repo del agente: `pg` y el
 * `.env` con DIRECT_URL viven allá, y ESM resuelve los imports contra la
 * ubicación del archivo, no contra el cwd):
 *
 *   cp ~/rent/mvp/claudedocs/seed-playbooks-demo.mjs ~/rent/agent-develop/ && \
 *   cd ~/rent/agent-develop && node seed-playbooks-demo.mjs && \
 *   rm seed-playbooks-demo.mjs
 *
 * Rollback:
 *   DELETE FROM agent.script_templates          WHERE tenant_id = '<AGENCY>';
 *   DELETE FROM agent.script_objection_handlers WHERE tenant_id = '<AGENCY>';
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

/**
 * Los manejadores de objeción viven en OTRA tabla y no tienen ciclo de
 * borrador: `response_es` es el texto vivo y punto. Por eso en la lista salen
 * siempre como «Publicada» y sin píldora de Meta.
 */
const OBJECTIONS = [
  {
    stage: 'S2',
    key: 'no_tengo_plata',
    response:
      'Entiendo, {{deudor_nombre}}, y le agradezco que me lo diga de frente. No vine a presionarlo: vine a ver qué sí se puede. ¿Le sirve que miremos un abono parcial esta semana y el resto lo acomodamos?',
    escalation: null,
  },
  {
    stage: 'S2',
    key: 'ya_pague',
    response:
      'Puede ser que el pago no se haya cruzado todavía. ¿Me confirma la fecha y el medio por el que pagó? Lo dejo anotado y lo verificamos hoy mismo antes de volver a contactarlo.',
    escalation: 'requires_agency_followup',
  },
  {
    stage: 'S3',
    key: 'no_me_vuelvan_a_llamar',
    response:
      'Con mucho gusto, {{deudor_nombre}}. Registro ahora mismo su solicitud de no ser contactado y no volvemos a llamarlo. ¿Prefiere que le escribamos por correo o que no lo contactemos por ningún medio?',
    escalation: 'opt_out_request',
  },
]

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
})
await client.connect()

let limpiadas = 0
for (const tabla of ['script_templates', 'script_objection_handlers']) {
  const r = await client.query(`DELETE FROM agent.${tabla} WHERE tenant_id = $1`, [AGENCY])
  limpiadas += r.rowCount ?? 0
}
if (limpiadas) console.log(`Limpiadas ${limpiadas} filas de una siembra anterior.`)

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

for (const o of OBJECTIONS) {
  await client.query(
    `INSERT INTO agent.script_objection_handlers
       (id, stage, objection_key, response_es, escalation_signal, tenant_id, created_at)
     VALUES ($1, $2::agent.cartera_stage, $3, $4, $5, $6, now())`,
    [randomUUID(), o.stage, o.key, o.response, o.escalation, AGENCY],
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
console.log(
  `\nSembradas ${ROWS.length} plantillas + ${OBJECTIONS.length} objeciones en la agencia demo:`,
)
console.table(rows)

await client.end()
