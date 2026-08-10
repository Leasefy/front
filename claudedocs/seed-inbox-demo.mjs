/**
 * seed-inbox-demo.mjs — conversaciones de demo para el Inbox de cobranza.
 *
 * El Inbox lee `agent.conversation_threads` + `agent.messages`, y las dos
 * estaban vacías, así que la pantalla mostraba su estado vacío correcto — pero
 * eso también significa que NADIE había visto nunca el inbox con datos, ni
 * probado el botón de responder. Una pantalla vacía no prueba que funcione.
 *
 * Siembra 7 hilos, uno por cada `label` que el backend agrupa, con sus
 * mensajes reales (inbound del inquilino, outbound de la agencia).
 *
 * CORRER: `pg` sólo existe en agent-develop, así que hay que ejecutarlo DESDE
 * ahí — Node resuelve los módulos desde la carpeta del archivo, no del cwd:
 *
 *   cp ~/rent/mvp/claudedocs/seed-inbox-demo.mjs ~/rent/agent-develop/.seed.tmp.mjs
 *   cd ~/rent/agent-develop && node .seed.tmp.mjs && rm .seed.tmp.mjs
 *
 * ROLLBACK (los mensajes caen por ON DELETE CASCADE):
 *   DELETE FROM agent.conversation_threads
 *    WHERE tenant_id='f1849975-2cdc-49a4-8983-ee5de56127f5';
 */

import pg from 'pg'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'

const TENANT = 'f1849975-2cdc-49a4-8983-ee5de56127f5'

const env = fs.readFileSync(`${os.homedir()}/rent/agent-develop/.env`, 'utf8')
const url = env
  .split('\n')
  .find((l) => l.startsWith('DIRECT_URL='))
  ?.slice('DIRECT_URL='.length)
  .replace(/^"|"$/g, '')
  .split('?')[0]

if (!url) throw new Error('DIRECT_URL no encontrado en ~/rent/agent-develop/.env')

/** Un hilo por cada label que el inbox agrupa. */
const HILOS = [
  {
    label: 'promesa_detectada',
    channel: 'whatsapp',
    unread: true,
    requiresAction: false,
    horasAtras: 2,
    mensajes: [
      ['outbound', 'Hola, te escribimos de la administración por el canon de agosto. ¿Podés contarnos cuándo lo podés cubrir?'],
      ['inbound', 'Buenas. El viernes me consignan y ese mismo día les pago todo.'],
    ],
  },
  {
    label: 'pago_reportado',
    channel: 'whatsapp',
    unread: true,
    requiresAction: true,
    horasAtras: 5,
    mensajes: [
      ['inbound', 'Ya hice la consignación esta mañana. Les mando el comprobante.'],
      ['inbound', 'Comprobante 4471-2290, Bancolombia, $1.850.000'],
    ],
  },
  {
    label: 'solicitud_acuerdo',
    channel: 'whatsapp',
    unread: true,
    requiresAction: true,
    horasAtras: 20,
    mensajes: [
      ['inbound', '¿Hay forma de dividir la deuda en cuotas? Se me juntó con el colegio de los niños.'],
    ],
  },
  {
    label: 'disputa',
    channel: 'whatsapp',
    unread: true,
    requiresAction: true,
    horasAtras: 26,
    mensajes: [
      ['inbound', 'Yo ya pagué ese mes, no sé por qué me siguen cobrando. Tengo el soporte.'],
    ],
  },
  {
    label: 'sin_entender',
    channel: 'sms',
    unread: true,
    requiresAction: true,
    horasAtras: 30,
    mensajes: [['inbound', 'Ok']],
  },
  {
    label: 'requiere_humano',
    channel: 'whatsapp',
    unread: true,
    requiresAction: true,
    horasAtras: 48,
    mensajes: [
      ['inbound', 'Necesito hablar con una persona, esto ya lo expliqué tres veces y nadie me responde.'],
    ],
  },
  {
    label: 'nueva_respuesta',
    channel: 'whatsapp',
    unread: false,
    requiresAction: false,
    horasAtras: 72,
    mensajes: [
      ['outbound', 'Te recordamos que el canon de agosto sigue pendiente.'],
      ['inbound', 'Listo, gracias por avisar. Lo reviso hoy.'],
    ],
  },
]

const c = new pg.Client({ connectionString: url })
await c.connect()

const { rows: deudores } = await c.query(
  `select id from agent.debtors where tenant_id = $1 order by created_at limit $2`,
  [TENANT, HILOS.length],
)

if (deudores.length === 0) {
  console.log('No hay deudores en esta agencia. Sembrá deudores primero.')
  await c.end()
  process.exit(0)
}

// Limpia una corrida anterior para que el script sea idempotente.
await c.query(`delete from agent.conversation_threads where tenant_id = $1`, [TENANT])

let nHilos = 0
let nMensajes = 0

for (const [i, h] of HILOS.entries()) {
  const debtorId = deudores[i % deudores.length].id
  const threadId = crypto.randomUUID()
  const ultimo = h.mensajes[h.mensajes.length - 1]

  await c.query(
    `insert into agent.conversation_threads
       (id, tenant_id, debtor_id, channel, last_message_at, last_message_preview,
        status, label, unread, requires_action, created_at)
     values ($1,$2,$3,$4, now() - ($5::int || ' hours')::interval, $6,
             'open', $7, $8, $9, now() - ($5::int || ' hours')::interval)`,
    [
      threadId,
      TENANT,
      debtorId,
      h.channel,
      h.horasAtras,
      ultimo[1].slice(0, 120),
      h.label,
      h.unread,
      h.requiresAction,
    ],
  )
  nHilos++

  // Los mensajes van del más viejo al más nuevo dentro de la ventana del hilo.
  for (const [j, [direction, body]] of h.mensajes.entries()) {
    const offset = h.horasAtras + (h.mensajes.length - 1 - j)
    await c.query(
      `insert into agent.messages
         (id, tenant_id, thread_id, debtor_id, direction, channel, body, occurred_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,
               now() - ($8::int || ' hours')::interval,
               now() - ($8::int || ' hours')::interval)`,
      [crypto.randomUUID(), TENANT, threadId, debtorId, direction, h.channel, body, offset],
    )
    nMensajes++
  }
}

const { rows: resumen } = await c.query(
  `select label, count(*)::int as hilos, sum(case when unread then 1 else 0 end)::int as sin_leer
     from agent.conversation_threads where tenant_id=$1 group by 1 order by 1`,
  [TENANT],
)

console.log(`\n✓ ${nHilos} hilos y ${nMensajes} mensajes sembrados`)
console.table(resumen)

await c.end()
