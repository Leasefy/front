/**
 * seed-llamadas-demo.mjs — datos de demo para la pantalla de Llamadas.
 *
 * POR QUÉ EXISTE
 * Las 24 llamadas que había sembradas tenían dos problemas:
 *   1. `outcome` con valores que NO son del vocabulario (`contacted`,
 *      `promise`, `refused`). La columna `agent.calls.outcome` NO tiene CHECK
 *      constraint —pese a lo que dice el comentario del schema de Prisma— así
 *      que la base los aceptó y la tabla los mostró crudos, en inglés.
 *   2. TODO lo demás en NULL: sin duración, sin resumen, sin QA, sin flags.
 *      La pantalla se veía "vacía pero funcionando", que es la peor forma de
 *      estar rota.
 *
 * Este script las reescribe con forma real: los 7 buckets válidos en la
 * columna, y `summary_json` con la salida del CallSummarizer (Phase 13) para
 * las que fueron contestadas.
 *
 * CORRER: `pg` sólo existe en agent-develop, así que hay que ejecutarlo DESDE
 * ahí — con `node ~/rent/mvp/claudedocs/…` no alcanza, porque Node resuelve
 * los módulos desde la carpeta del archivo, no desde el cwd:
 *
 *   cp ~/rent/mvp/claudedocs/seed-llamadas-demo.mjs ~/rent/agent-develop/.seed.tmp.mjs
 *   cd ~/rent/agent-develop && node .seed.tmp.mjs && rm .seed.tmp.mjs
 *
 * ROLLBACK: las llamadas siguen siendo las mismas filas; para dejarlas como
 * estaban no hay vuelta atrás automática. Para borrarlas del todo:
 *   DELETE FROM agent.calls WHERE tenant_id='f1849975-2cdc-49a4-8983-ee5de56127f5';
 */

import pg from 'pg'
import fs from 'node:fs'
import os from 'node:os'

const TENANT = 'f1849975-2cdc-49a4-8983-ee5de56127f5'

const env = fs.readFileSync(`${os.homedir()}/rent/agent-develop/.env`, 'utf8')
const url = env
  .split('\n')
  .find((l) => l.startsWith('DIRECT_URL='))
  ?.slice('DIRECT_URL='.length)
  .replace(/^"|"$/g, '')
  .split('?')[0]

if (!url) throw new Error('DIRECT_URL no encontrado en ~/rent/agent-develop/.env')

/**
 * Guiones de llamada. `outcome` es el bucket de la MÁQUINA (los 7 de la
 * columna); `summary.outcome` es el juicio del summarizer (los 11). Que no
 * coincidan es lo normal y es justamente lo que la pantalla ahora distingue.
 */
const GUIONES = [
  {
    outcome: 'completed',
    duration: 214,
    qa: { rapport: 88, compliance: 95, resolution: 90, sentiment: 82 },
    summary: {
      outcome: 'plan_agreed',
      paymentPromised: { amountCop: 1_450_000, dueDate: '2026-08-20', channel: 'wompi' },
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'send_payment_link',
      keyTopics: ['acuerdo-de-pago', 'tres-cuotas'],
      sentimentDeudor: 'cooperative',
      transcriptDigest:
        'Reconoce la mora y acepta un plan a tres cuotas. Pide que le llegue el link de pago al WhatsApp. Confirma que la primera cuota la paga el 20.',
      unresolvedObjection: null,
    },
  },
  {
    outcome: 'completed',
    duration: 168,
    qa: { rapport: 74, compliance: 92, resolution: 60, sentiment: 55 },
    summary: {
      outcome: 'hardship_extension',
      paymentPromised: { amountCop: 600_000, dueDate: '2026-09-05', channel: null },
      hardshipDetected: true,
      fraudFlags: [],
      nextActionRecommended: 'send_reminder',
      keyTopics: ['perdida-de-empleo', 'abono-parcial'],
      sentimentDeudor: 'frustrated',
      transcriptDigest:
        'Perdió el empleo hace seis semanas. Pide prórroga hasta que entre la liquidación y ofrece un abono parcial a principios de septiembre.',
      unresolvedObjection: 'Insiste en que la administración no le corresponde a él.',
    },
  },
  {
    outcome: 'completed',
    duration: 96,
    qa: { rapport: 52, compliance: 88, resolution: 30, sentiment: 28 },
    summary: {
      outcome: 'dispute',
      paymentPromised: null,
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'escalate_human',
      keyTopics: ['pago-no-registrado', 'disputa'],
      sentimentDeudor: 'hostile',
      transcriptDigest:
        'Afirma que ya pagó por consignación y que tiene el comprobante. Exige hablar con una persona y que dejen de llamarlo hasta que lo verifiquen.',
      unresolvedObjection: 'Dice tener comprobante de un pago que no figura en el sistema.',
    },
  },
  {
    outcome: 'no_answer',
    duration: null,
    qa: null,
    summary: null,
  },
  {
    outcome: 'completed',
    duration: 132,
    qa: { rapport: 80, compliance: 97, resolution: 75, sentiment: 70 },
    summary: {
      outcome: 'paid_partial',
      paymentPromised: { amountCop: 900_000, dueDate: '2026-08-14', channel: 'bold' },
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'send_payment_link',
      keyTopics: ['abono-parcial', 'saldo-pendiente'],
      sentimentDeudor: 'cooperative',
      transcriptDigest:
        'Abona la mitad del saldo durante la llamada y se compromete con el resto para el 14. Pregunta si el abono frena el reporte a centrales.',
      unresolvedObjection: null,
    },
  },
  {
    outcome: 'voicemail',
    duration: 18,
    qa: null,
    summary: null,
  },
  {
    outcome: 'completed',
    duration: 74,
    qa: { rapport: 60, compliance: 99, resolution: 40, sentiment: 45 },
    summary: {
      outcome: 'callback_later',
      paymentPromised: null,
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'retry_voice',
      keyTopics: ['horario-laboral', 'devolver-llamada'],
      sentimentDeudor: 'neutral',
      transcriptDigest:
        'Está en el trabajo y no puede hablar. Pide que lo llamen después de las seis de la tarde.',
      unresolvedObjection: null,
    },
  },
  {
    outcome: 'wrong_party',
    duration: 41,
    qa: { rapport: 55, compliance: 100, resolution: 20, sentiment: 50 },
    summary: {
      outcome: 'no_resolution',
      paymentPromised: null,
      hardshipDetected: false,
      fraudFlags: ['third_party_answered'],
      nextActionRecommended: 'no_action',
      keyTopics: ['numero-equivocado'],
      sentimentDeudor: 'neutral',
      transcriptDigest:
        'Contesta una persona distinta al titular. El agente corta sin revelar el motivo de la llamada ni el monto.',
      unresolvedObjection: null,
    },
  },
  {
    outcome: 'opt_out',
    duration: 52,
    qa: { rapport: 45, compliance: 100, resolution: 25, sentiment: 20 },
    summary: {
      outcome: 'opt_out',
      paymentPromised: null,
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'no_action',
      keyTopics: ['no-contactar', 'ley-2300'],
      sentimentDeudor: 'hostile',
      transcriptDigest:
        'Pide expresamente que no lo vuelvan a llamar. El agente confirma la solicitud y cierra la llamada.',
      unresolvedObjection: null,
    },
  },
  {
    outcome: 'escalated',
    duration: 187,
    qa: { rapport: 66, compliance: 78, resolution: 35, sentiment: 30 },
    complianceFlags: ['tono_elevado', 'mencion_de_reporte_sin_advertencia'],
    summary: {
      outcome: 'escalated',
      paymentPromised: null,
      hardshipDetected: false,
      fraudFlags: ['contradictory_data'],
      nextActionRecommended: 'escalate_human',
      keyTopics: ['amenaza-legal', 'escalamiento'],
      sentimentDeudor: 'hostile',
      transcriptDigest:
        'La conversación se pone tensa y el deudor amenaza con acciones legales. Se escala a un humano según la política de hostilidad.',
      unresolvedObjection: 'Sostiene que el canon acordado era menor al que le cobran.',
    },
  },
  {
    outcome: 'no_answer',
    duration: null,
    qa: null,
    summary: null,
  },
  {
    outcome: 'completed',
    duration: 245,
    qa: { rapport: 92, compliance: 96, resolution: 95, sentiment: 90 },
    summary: {
      outcome: 'paid_full',
      paymentPromised: { amountCop: 2_100_000, dueDate: '2026-08-08', channel: 'wompi' },
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'no_action',
      keyTopics: ['pago-total', 'paz-y-salvo'],
      sentimentDeudor: 'cooperative',
      transcriptDigest:
        'Paga el total durante la llamada y pide el paz y salvo por correo. Consulta cuándo se actualiza su reporte en centrales.',
      unresolvedObjection: null,
    },
  },
]

const c = new pg.Client({ connectionString: url })
await c.connect()

const { rows: llamadas } = await c.query(
  `select id from agent.calls where tenant_id = $1 order by initiated_at desc`,
  [TENANT],
)

if (llamadas.length === 0) {
  console.log('No hay llamadas para esta agencia. Nada que hacer.')
  await c.end()
  process.exit(0)
}

console.log(`${llamadas.length} llamadas a reescribir…`)

let conResumen = 0

for (const [i, { id }] of llamadas.entries()) {
  const g = GUIONES[i % GUIONES.length]

  // La duración fija el `connected_at` / `ended_at` de forma coherente con
  // `initiated_at` — que una llamada dure 214s y no tenga fin es incoherente.
  await c.query(
    `update agent.calls
        set outcome           = $2,
            duration_seconds  = $3,
            connected_at      = case when $3::int is null then null
                                     else initiated_at + interval '4 seconds' end,
            ended_at          = case when $3::int is null then null
                                     else initiated_at + ($3::int || ' seconds')::interval end,
            qa_dimensions     = $4::jsonb,
            qa_score_decimal  = $5,
            qa_compliance     = $6,
            compliance_flags  = $7::text[],
            summary_json      = $8::jsonb,
            recording_url     = case when $3::int is null then null
                                     else 'demo://recording/' || id end,
            transcript_url    = case when $8::jsonb is null then null
                                     else 'demo://transcript/' || id end
      where id = $1 and tenant_id = $9`,
    [
      id,
      g.outcome,
      g.duration,
      g.qa ? JSON.stringify(g.qa) : null,
      g.qa ? Object.values(g.qa).reduce((a, b) => a + b, 0) / Object.keys(g.qa).length : null,
      g.qa ? g.qa.compliance >= 90 : null,
      g.complianceFlags ?? [],
      g.summary ? JSON.stringify(g.summary) : null,
      TENANT,
    ],
  )

  if (g.summary) conResumen++
}

const { rows: resumen } = await c.query(
  `select outcome, count(*)::int as n from agent.calls where tenant_id=$1 group by 1 order by 2 desc`,
  [TENANT],
)

console.log(`\n✓ ${llamadas.length} llamadas actualizadas — ${conResumen} con resumen del agente`)
console.table(resumen)

await c.end()
