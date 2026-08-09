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
 * ROLLBACK: el script reescribe las mismas filas de `calls`, así que no hay
 * vuelta atrás automática para ellas. Los turnos sí se borran limpio:
 *   DELETE FROM agent.call_turns WHERE tenant_id='f1849975-…';
 *   DELETE FROM agent.calls      WHERE tenant_id='f1849975-…';  -- todo
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

/**
 * Guiones de llamada. `outcome` es el bucket de la MÁQUINA (los 7 de la
 * columna); `summary.outcome` es el juicio del summarizer (los 11). Que no
 * coincidan es lo normal y es justamente lo que la pantalla ahora distingue.
 */
/**
 * Turnos de cada llamada, coherentes con su resumen. Se guardan en
 * `agent.call_turns`, que es de donde el endpoint de transcripción los lee —
 * NO de `transcript_url`. Sin turnos, el panel de transcripción sale vacío
 * aunque la llamada tenga resumen.
 */
const TURNOS_POR_RESULTADO = {
  "plan_agreed": [
    [
      "agent",
      "GREETING",
      "Buenos días, hablo con Gloria. Le llamo de parte de la administración del inmueble. ¿Tiene un minuto?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, dígame."
    ],
    [
      "agent",
      "DISCLOSURE_AI",
      "Antes de seguir le cuento que soy un asistente automatizado y esta llamada queda grabada."
    ],
    [
      "debtor",
      "DISCLOSURE_AI",
      "Está bien."
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "El canon de agosto está pendiente por un millón cuatrocientos cincuenta mil pesos. ¿Lo tiene presente?"
    ],
    [
      "debtor",
      "DEBT_PRESENTATION",
      "Sí, sé que me atrasé. Se me juntó con otros gastos este mes."
    ],
    [
      "agent",
      "DISCOVERY",
      "Entiendo. ¿Le sirve que lo dividamos en cuotas para que no se le acumule?"
    ],
    [
      "debtor",
      "NEGOTIATION_PLAN",
      "¿En cuántas se podría?"
    ],
    [
      "agent",
      "NEGOTIATION_PLAN",
      "Podemos hacerlo en tres cuotas, la primera el veinte de agosto."
    ],
    [
      "debtor",
      "NEGOTIATION_PLAN",
      "Listo, así sí me sirve. La primera la pago el veinte."
    ],
    [
      "agent",
      "CLOSING",
      "Perfecto. Le envío el link de pago al WhatsApp para la primera cuota."
    ],
    [
      "debtor",
      "CLOSING",
      "Sí, al WhatsApp está bien. Gracias."
    ]
  ],
  "hardship_extension": [
    [
      "agent",
      "GREETING",
      "Buenas tardes, ¿hablo con Nicolás?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, con él."
    ],
    [
      "agent",
      "DISCLOSURE_AI",
      "Le comento que soy un asistente automatizado y la llamada queda grabada."
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "Le llamo por el canon pendiente. ¿Cómo va el tema?"
    ],
    [
      "debtor",
      "DISCOVERY",
      "La verdad estoy complicado. Perdí el empleo hace seis semanas y estoy esperando la liquidación."
    ],
    [
      "agent",
      "NEGOTIATION_HARDSHIP",
      "Lamento escuchar eso. ¿Tiene una fecha aproximada para esa liquidación?"
    ],
    [
      "debtor",
      "NEGOTIATION_HARDSHIP",
      "Debería entrar a principios de septiembre. Yo podría abonar seiscientos mil apenas entre."
    ],
    [
      "agent",
      "NEGOTIATION_HARDSHIP",
      "Registro el abono parcial para el cinco de septiembre y pido la prórroga."
    ],
    [
      "debtor",
      "NEGOTIATION_HARDSHIP",
      "Otra cosa: la administración a mí no me corresponde, eso lo tiene que ver el dueño."
    ],
    [
      "agent",
      "CLOSING",
      "Dejo anotada esa observación para que la revisen. Le confirmo por escrito."
    ]
  ],
  "dispute": [
    [
      "agent",
      "GREETING",
      "Buenos días, ¿hablo con Andrés?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí. ¿De qué se trata?"
    ],
    [
      "agent",
      "DISCLOSURE_AI",
      "Soy un asistente automatizado de la administración y la llamada queda grabada."
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "Le llamo por un saldo pendiente del inmueble."
    ],
    [
      "debtor",
      "NEGOTIATION_DISPUTE",
      "Un momento, yo ya pagué ese mes. Consigné y tengo el comprobante."
    ],
    [
      "agent",
      "NEGOTIATION_DISPUTE",
      "Entiendo. ¿Recuerda por qué medio y en qué fecha lo hizo?"
    ],
    [
      "debtor",
      "NEGOTIATION_DISPUTE",
      "Por consignación en el banco. Yo no voy a seguir hablando de esto hasta que lo verifiquen."
    ],
    [
      "debtor",
      "NEGOTIATION_DISPUTE",
      "Y quiero hablar con una persona, no con una grabadora."
    ],
    [
      "agent",
      "ESCALATE_HUMAN",
      "Con gusto. Escalo el caso para que una persona lo revise y lo contacte."
    ]
  ],
  "paid_partial": [
    [
      "agent",
      "GREETING",
      "Buenas, ¿hablo con Daniela?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, señor."
    ],
    [
      "agent",
      "DISCLOSURE_AI",
      "Soy un asistente automatizado y esta llamada queda grabada."
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "Le llamo por el saldo pendiente del canon."
    ],
    [
      "debtor",
      "NEGOTIATION_IMMEDIATE",
      "Puedo pagar la mitad ya mismo y el resto el catorce."
    ],
    [
      "agent",
      "NEGOTIATION_IMMEDIATE",
      "Perfecto, con eso avanzamos. ¿Le envío el link para el abono de ahora?"
    ],
    [
      "debtor",
      "NEGOTIATION_IMMEDIATE",
      "Sí. Una pregunta: ¿ese abono frena el reporte a centrales?"
    ],
    [
      "agent",
      "CLOSING",
      "El abono deja constancia de la voluntad de pago; el reporte lo revisa el área correspondiente con el saldo al día."
    ],
    [
      "debtor",
      "CLOSING",
      "Listo, entonces pago ya y el resto el catorce."
    ]
  ],
  "callback_later": [
    [
      "agent",
      "GREETING",
      "Buenas tardes, ¿hablo con Jorge?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, pero estoy en el trabajo, no puedo hablar ahora."
    ],
    [
      "agent",
      "GREETING",
      "Sin problema. ¿A qué hora le queda mejor que lo llamemos?"
    ],
    [
      "debtor",
      "GREETING",
      "Después de las seis de la tarde."
    ],
    [
      "agent",
      "CLOSING",
      "Perfecto, lo llamamos después de las seis. Que siga bien."
    ]
  ],
  "no_resolution": [
    [
      "agent",
      "GREETING",
      "Buenos días, ¿hablo con Luz Marina?"
    ],
    [
      "debtor",
      "IDENTITY_VERIFICATION",
      "No, ella no vive aquí. ¿Quién la busca?"
    ],
    [
      "agent",
      "IDENTITY_VERIFICATION",
      "Gracias, entonces marqué un número equivocado. Que tenga buen día."
    ]
  ],
  "opt_out": [
    [
      "agent",
      "GREETING",
      "Buenas tardes, ¿hablo con Nicolás?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, y ya les dije que no me llamen más."
    ],
    [
      "agent",
      "OPT_OUT",
      "Entendido. Registro su solicitud de no ser contactado y no lo volvemos a llamar."
    ],
    [
      "debtor",
      "OPT_OUT",
      "Eso espero."
    ]
  ],
  "escalated": [
    [
      "agent",
      "GREETING",
      "Buenas tardes, ¿hablo con María Fernanda?"
    ],
    [
      "debtor",
      "GREETING",
      "¿Otra vez ustedes?"
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "Le llamo por el canon pendiente del inmueble."
    ],
    [
      "debtor",
      "NEGOTIATION_DISPUTE",
      "El canon que me cobran no es el que acordamos. Ustedes están cobrando de más."
    ],
    [
      "agent",
      "NEGOTIATION_DISPUTE",
      "Puedo revisar el valor registrado. ¿Recuerda cuál era el acordado?"
    ],
    [
      "debtor",
      "NEGOTIATION_DISPUTE",
      "Si me siguen molestando, esto lo veo con un abogado."
    ],
    [
      "agent",
      "ESCALATE_HUMAN",
      "Entiendo su molestia. Paso el caso a una persona del equipo para que lo revise con usted."
    ]
  ],
  "paid_full": [
    [
      "agent",
      "GREETING",
      "Buenos días, ¿hablo con Camilo?"
    ],
    [
      "debtor",
      "GREETING",
      "Sí, buenos días."
    ],
    [
      "agent",
      "DISCLOSURE_AI",
      "Soy un asistente automatizado y la llamada queda grabada."
    ],
    [
      "agent",
      "DEBT_PRESENTATION",
      "Le llamo por el saldo pendiente de dos millones cien mil pesos."
    ],
    [
      "debtor",
      "NEGOTIATION_IMMEDIATE",
      "Lo pago ya. Mándeme el link y lo hago ahora mismo."
    ],
    [
      "agent",
      "NEGOTIATION_IMMEDIATE",
      "Se lo envío en este momento."
    ],
    [
      "debtor",
      "CLOSING",
      "Listo, ya quedó pago. ¿Me pueden mandar el paz y salvo?"
    ],
    [
      "agent",
      "CLOSING",
      "Claro, se lo enviamos por correo."
    ],
    [
      "debtor",
      "CLOSING",
      "¿Y en cuánto se actualiza el reporte en centrales?"
    ],
    [
      "agent",
      "CLOSING",
      "El área correspondiente lo actualiza con el saldo al día; le confirmamos por escrito."
    ]
  ]
}

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
    // SIN marcas de cumplimiento — a propósito.
    //
    // Acá había `['tono_elevado', 'mencion_de_reporte_sin_advertencia']`,
    // inventado por mí. Dos problemas: (1) ese vocabulario NO existe en el
    // agente, que maneja el cumplimiento como un objeto de booleanos
    // (`aiDisclosed`, `consentToRecord`, `optOutRequested`, `habeasDataNoticed`,
    // `rneChecked`); (2) son acusaciones —tono elevado, mención de reporte a
    // centrales sin advertir— colgadas de una llamada, sin ningún rótulo que
    // diga que son de mentira, en la pantalla que sirve de evidencia ante una
    // queja de la SIC.
    //
    // Además `agent.calls.compliance_flags` hoy no la escribe NADIE en el
    // agente, así que sembrarla también fingía que la función está cableada.
    complianceFlags: [],
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

// Los turnos se reescriben enteros: el script es idempotente.
await c.query(`delete from agent.call_turns where tenant_id = $1`, [TENANT])

let conResumen = 0
let conTurnos = 0
let totalTurnos = 0

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
            -- recording_url / transcript_url quedan en NULL A PROPÓSITO.
            -- La versión anterior de este script les ponía 'demo://…', y eso
            -- hacía que la pantalla creyera que había grabación: montaba el
            -- reproductor, el proxy le pedía el audio a Vapi, y como estas
            -- llamadas no existen en Vapi terminaba en «No se pudo cargar la
            -- grabación». Un mock que promete algo que no hay es peor que no
            -- tener nada: la pantalla ahora dice que no hay grabación, que es
            -- la verdad.
            recording_url     = null,
            transcript_url    = null
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

  // Turnos de la conversación → `agent.call_turns`, que es de donde el
  // endpoint de transcripción los lee. Esto SÍ es dato real recorriendo el
  // camino real: tabla → endpoint → panel.
  const turnos = g.summary ? (TURNOS_POR_RESULTADO[g.summary.outcome] ?? []) : []
  if (turnos.length === 0) continue

  // Los turnos se reparten a lo largo de la llamada, desde `connected_at`
  // hasta el final: un transcript con todos los turnos en el mismo segundo
  // rompe el «saltar al minuto» del reproductor.
  const paso = Math.max(1, Math.floor((g.duration ?? turnos.length * 8) / turnos.length))

  for (const [n, [speaker, estado, texto]] of turnos.entries()) {
    await c.query(
      `insert into agent.call_turns
         (id, tenant_id, call_id, turn_number, speaker, text, state_at_turn, timestamp)
       select $1, $2, $3, $4, $5, $6, $7,
              coalesce(connected_at, initiated_at) + ($8::int || ' seconds')::interval
         from agent.calls where id = $3`,
      [crypto.randomUUID(), TENANT, id, n + 1, speaker, texto, estado, n * paso],
    )
    totalTurnos++
  }
  conTurnos++
}

const { rows: resumen } = await c.query(
  `select outcome, count(*)::int as n from agent.calls where tenant_id=$1 group by 1 order by 2 desc`,
  [TENANT],
)

console.log(
  `\n✓ ${llamadas.length} llamadas · ${conResumen} con resumen · ` +
    `${conTurnos} con transcripción (${totalTurnos} turnos)`,
)
console.log(
  '  Sin grabación a propósito: no existen en Vapi, así que no hay audio que reproducir.',
)
console.table(resumen)

await c.end()
