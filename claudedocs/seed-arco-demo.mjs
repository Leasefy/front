/**
 * seed-arco-demo.mjs — solicitudes ARCO de demo, para poder VER la bandeja.
 *
 * En local no se puede usar el formulario público: `POST /api/arco` resuelve la
 * inmobiliaria por el header `Host` (`resolveAgencyByHost`), y `localhost:4100`
 * no mapea a ninguna. Así que se insertan las filas directo en la tabla real y
 * se leen por el endpoint real — nada mockeado en el código.
 *
 * El reparto cubre TODOS los estados que la pantalla sabe pintar, incluidos los
 * bordes: vencida, vence hoy, urgente, en plazo, sin confirmar, resuelta y
 * rechazada. Los días hábiles los calcula el agente a partir de `submitted_at`,
 * así que acá se retrocede esa fecha para provocar cada caso.
 *
 * Reversible: todo queda marcado con el sufijo `@demo.leasefy.co` en el correo.
 * Rollback al pie del archivo.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHash, randomUUID } from 'node:crypto'

const require = createRequire(`${process.env.HOME}/rent/back/package.json`)
const { Client } = require('pg')

const ENV = Object.fromEntries(
  readFileSync(`${process.env.HOME}/rent/back/.env`, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const AGENCIA = process.argv[2]
if (!AGENCIA) {
  console.error('uso: node seed-arco-demo.mjs <agencyId>')
  process.exit(1)
}

/**
 * `diasHabilesAtras` = hace cuántos días hábiles se envió. El agente resta ese
 * consumo del término (acceso 15, resto 10) para sacar los días restantes.
 */
const SOLICITUDES = [
  // ── Vencidas ──────────────────────────────────────────────────────────────
  { nombre: 'Gloria Patricia Henao Cardona', cedula: '43587412', tipo: 'rectificacion',
    estado: 'pending_admin_triage', diasHabilesAtras: 18, verificada: true,
    desc: 'El sistema tiene mi teléfono con un dígito de más y me llaman a un número ajeno.' },
  { nombre: 'Ricardo Antonio Villegas Mora', cedula: '16789023', tipo: 'oposicion',
    estado: 'in_progress', diasHabilesAtras: 14, verificada: true,
    desc: 'Solicito que dejen de contactarme por cobranza automatizada. Prefiero trato directo.' },

  // ── Vence hoy ─────────────────────────────────────────────────────────────
  // OJO: la tabla NO acepta 'pending_counsel_review' (lo prohíbe
  // arco_requests_status_check). Ese valor es un flag de la respuesta 503 del
  // gate de asesor, no un estado de la solicitud — el front lo tiene mal
  // tipado como estado y nunca podrá llegarle.
  { nombre: 'Carlos Andrés Zapata Molina', cedula: '79854123', tipo: 'cancelacion',
    estado: 'in_progress', diasHabilesAtras: 10, verificada: true,
    desc: 'Terminé el contrato hace dos años. Pido eliminación de mis datos personales.' },

  // ── Urgentes (≤ 2 días hábiles) ───────────────────────────────────────────
  { nombre: 'María Fernanda Restrepo Ochoa', cedula: '1035874210', tipo: 'rectificacion',
    estado: 'in_progress', diasHabilesAtras: 9, verificada: true,
    desc: 'Mi segundo apellido está mal escrito en el certificado de paz y salvo.' },
  { nombre: 'Andrea Paola Rodríguez Núñez', cedula: 'E1458796', tipo: 'acceso',
    estado: 'pending_admin_triage', diasHabilesAtras: 14, verificada: true,
    desc: 'Quiero copia de todos los datos que la inmobiliaria tiene sobre mí.' },

  // ── En plazo ──────────────────────────────────────────────────────────────
  { nombre: 'Juan Sebastián Ospina Vélez', cedula: '1128456789', tipo: 'acceso',
    estado: 'pending_admin_triage', diasHabilesAtras: 3, verificada: true,
    desc: 'Solicito el detalle de las llamadas de cobranza registradas a mi nombre.' },
  { nombre: 'Distribuciones El Poblado S.A.S.', cedula: '830125478', tipo: 'acceso',
    estado: 'in_progress', diasHabilesAtras: 5, verificada: true,
    desc: 'Requerimos el histórico de tratamiento de datos del representante legal.' },
  { nombre: 'Luz Marina Betancur Ríos', cedula: '52478963', tipo: 'oposicion',
    estado: 'pending_admin_triage', diasHabilesAtras: 1, verificada: true,
    desc: 'No autorizo que mis datos se consulten en centrales de riesgo.' },

  // ── Sin confirmar (el reloj no arranca) ───────────────────────────────────
  { nombre: 'Sergio Alonso Ramírez Duque', cedula: '1090525664', tipo: 'cancelacion',
    estado: 'pending_email_verification', diasHabilesAtras: 2, verificada: false,
    desc: 'Pido eliminación de mis datos tras la terminación del contrato.' },
  { nombre: 'Beatriz Elena Palacio Gómez', cedula: '41258963', tipo: 'acceso',
    estado: 'pending_email_verification', diasHabilesAtras: 0, verificada: false,
    desc: 'Quiero saber qué información mía manejan.' },

  // ── Cerradas ──────────────────────────────────────────────────────────────
  { nombre: 'Mauricio Alberto Correa Ángel', cedula: '94587123', tipo: 'acceso',
    estado: 'resolved', diasHabilesAtras: 12, verificada: true, resuelta: true,
    desc: 'Solicitud de copia de datos personales.' },
  { nombre: 'Diana Carolina Loaiza Franco', cedula: '52987456', tipo: 'cancelacion',
    estado: 'rejected', diasHabilesAtras: 20, verificada: true, resuelta: true,
    desc: 'Pide eliminación pero mantiene un contrato vigente con obligaciones pendientes.' },
]

/** Retrocede `n` días hábiles desde hoy (salta sábados y domingos). */
function haceDiasHabiles(n) {
  const d = new Date()
  let restantes = n
  while (restantes > 0) {
    d.setDate(d.getDate() - 1)
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) restantes--
  }
  return d
}

const c = new Client({ connectionString: ENV.DIRECT_URL })

const run = async () => {
  await c.connect()

  let n = 0
  for (const s of SOLICITUDES) {
    const enviada = haceDiasHabiles(s.diasHabilesAtras)
    // Correo de demo: es la marca que permite revertir sin tocar datos reales.
    const email = `${s.cedula.toLowerCase()}@demo.leasefy.co`

    await c.query(
      `INSERT INTO agent.arco_requests
         (id, agency_id, type, status, requester_email, requester_cedula_hash,
          requester_name, subject_description, submitted_at, email_verified_at,
          triaged_at, resolved_at, audit_log_ids, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9,
               $10, $11, $12, '{}', $9, NOW())`,
      [
        randomUUID(),
        AGENCIA,
        s.tipo,
        s.estado,
        email,
        // La cédula nunca se guarda en claro: el back la hashea al recibirla.
        createHash('sha256').update(s.cedula).digest('hex'),
        s.nombre,
        s.desc,
        enviada,
        s.verificada ? new Date(enviada.getTime() + 36e5) : null,
        s.estado === 'pending_admin_triage' || !s.verificada
          ? null
          : new Date(enviada.getTime() + 72e5),
        s.resuelta ? new Date() : null,
      ],
    )
    n++
  }

  const { rows } = await c.query(
    `SELECT status, count(*)::int AS n FROM agent.arco_requests
      WHERE agency_id = $1::uuid GROUP BY status ORDER BY status`,
    [AGENCIA],
  )
  console.log(`sembradas: ${n} solicitudes`)
  console.table(rows)
  await c.end()
}

run().catch(async (e) => {
  console.error('ERROR:', e.message)
  try { await c.end() } catch {}
  process.exit(1)
})

/*
ROLLBACK — borra sólo lo sembrado por este script:

DELETE FROM agent.arco_requests WHERE requester_email LIKE '%@demo.leasefy.co';
*/
