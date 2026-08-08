/**
 * El bug que estos tests existen para impedir que vuelva:
 *
 * La pantalla leía `data.requests` y `data.kpis`, pero el agente devuelve las
 * solicitudes AGRUPADAS POR TIPO y sin KPIs. `undefined` no explota en React,
 * así que la bandeja mostraba cero solicitudes y cuatro ceros — exactamente
 * igual con cero solicitudes que con cincuenta. Un contrato roto que se veía
 * como una bandeja vacía.
 *
 * Por eso lo que se prueba acá es la NORMALIZACIÓN contra la forma real del
 * agente, no contra la que el front esperaba.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeArcoResponse,
  deriveArcoKpis,
  deriveSlaTerms,
  toCedulaRef,
  ARCO_URGENT_THRESHOLD_DAYS,
} from '../use-arco-requests'

/** El hash real es SHA-256; se usa uno de 64 hex para ejercitar `toCedulaRef`. */
const HASH = 'a'.repeat(64)

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: 'r1',
    agencyId: 'a1',
    type: 'acceso',
    status: 'pending_admin_triage',
    requesterName: 'Ana Ruiz',
    requesterCedulaHash: HASH,
    submittedAt: '2026-08-01T10:00:00.000Z',
    auditLogIds: [],
    sla_remaining_days: 5,
    ...over,
    // El helper arma payloads crudos del agente, incluidos los degradados que
    // los tests provocan a propósito; el cast evita repetirlo en cada llamada.
  }) as never

describe('normalizeArcoResponse — forma agrupada del agente', () => {
  it('aplana los cuatro grupos en una sola lista', () => {
    const rows = normalizeArcoResponse({
      acceso: [row({ id: 'a' })],
      rectificacion: [row({ id: 'b', type: 'rectificacion' })],
      cancelacion: [row({ id: 'c', type: 'cancelacion' })],
      oposicion: [row({ id: 'd', type: 'oposicion' })],
    })

    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.type).sort()).toEqual([
      'acceso', 'cancelacion', 'oposicion', 'rectificacion',
    ])
  })

  it('tolera grupos ausentes sin romperse', () => {
    expect(normalizeArcoResponse({ acceso: [row()] })).toHaveLength(1)
    expect(normalizeArcoResponse({})).toHaveLength(0)
  })

  it('ordena por plazo: lo que vence antes va primero', () => {
    const rows = normalizeArcoResponse({
      acceso: [
        row({ id: 'holgada', sla_remaining_days: 9 }),
        row({ id: 'vencida', sla_remaining_days: -3 }),
        row({ id: 'justa', sla_remaining_days: 1 }),
      ],
    })
    expect(rows.map((r) => r.id)).toEqual(['vencida', 'justa', 'holgada'])
  })

  it('manda las cerradas al final aunque su plazo sea el más viejo', () => {
    const rows = normalizeArcoResponse({
      acceso: [
        row({ id: 'cerrada', status: 'resolved', sla_remaining_days: -99 }),
        row({ id: 'abierta', sla_remaining_days: 4 }),
      ],
    })
    expect(rows.map((r) => r.id)).toEqual(['abierta', 'cerrada'])
  })

  it('marca vencida sólo si además sigue abierta', () => {
    const [abierta, cerrada] = normalizeArcoResponse({
      acceso: [row({ id: 'x', sla_remaining_days: -1 })],
      oposicion: [row({ id: 'y', type: 'oposicion', status: 'resolved', sla_remaining_days: -1 })],
    })
    expect(abierta.isOverdue).toBe(true)
    expect(cerrada.isOverdue).toBe(false)
    expect(cerrada.isClosed).toBe(true)
  })

  it('una solicitud rechazada cuenta como cerrada, no como incumplida', () => {
    const [r] = normalizeArcoResponse({
      acceso: [row({ status: 'rejected', sla_remaining_days: -10 })],
    })
    expect(r.isClosed).toBe(true)
    expect(r.isOverdue).toBe(false)
  })

  it('marca urgente dentro del umbral, y no en el borde superior', () => {
    const rows = normalizeArcoResponse({
      acceso: [
        row({ id: 'justo', sla_remaining_days: ARCO_URGENT_THRESHOLD_DAYS }),
        row({ id: 'fuera', sla_remaining_days: ARCO_URGENT_THRESHOLD_DAYS + 1 }),
      ],
    })
    expect(rows.find((r) => r.id === 'justo')!.isUrgent).toBe(true)
    expect(rows.find((r) => r.id === 'fuera')!.isUrgent).toBe(false)
  })

  it('vencida no es "urgente": son estados distintos, no acumulables', () => {
    const [r] = normalizeArcoResponse({ acceso: [row({ sla_remaining_days: -2 })] })
    expect(r.isOverdue).toBe(true)
    expect(r.isUrgent).toBe(false)
  })

  it('un sla_remaining_days ausente o no numérico no rompe el orden', () => {
    const rows = normalizeArcoResponse({
      acceso: [row({ id: 'malo', sla_remaining_days: null })],
    })
    expect(rows[0].slaRemainingDays).toBe(0)
    expect(rows[0].isOverdue).toBe(true)
  })
})

describe('deriveSlaTerms — el plazo sale del contrato, no de una constante', () => {
  it('usa el `sla_business_days` que manda el agente', () => {
    // El agente aplica los términos de la Ley 1581: acceso (consulta, Art. 14)
    // 10 días hábiles; reclamos (Art. 15 num. 3) 15. La pantalla los lee, no los
    // decide: si allá cambian, el encabezado los sigue solo.
    const rows = normalizeArcoResponse({
      acceso: [row({ sla_business_days: 10, sla_remaining_days: 4 })],
      cancelacion: [row({ type: 'cancelacion', sla_business_days: 15, sla_remaining_days: 10 })],
    })
    expect(deriveSlaTerms(rows)).toEqual({ acceso: 10, reclamo: 15 })
  })

  it('no despeja nada cuando el término viene explícito, aunque las fechas mientan', () => {
    // `submittedAt` en el futuro haría negativo cualquier despeje; con el
    // término explícito el resultado no depende de la fecha.
    const future = new Date(Date.now() + 30 * 864e5).toISOString()
    const rows = normalizeArcoResponse({
      acceso: [row({ submittedAt: future, sla_business_days: 10, sla_remaining_days: 99 })],
    })
    expect(deriveSlaTerms(rows).acceso).toBe(10)
  })


  /** Fecha de envío a N días hábiles atrás, para forzar un `elapsed` conocido. */
  const submittedBusinessDaysAgo = (n: number) => {
    const d = new Date()
    let left = n
    while (left > 0) {
      d.setDate(d.getDate() - 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) left--
    }
    return d.toISOString()
  }

  it('recupera el término que el agente está aplicando', () => {
    // Enviada hace 4 días hábiles y le quedan 11 ⇒ el término es 15.
    // Antes esto era una constante `{ acceso: 15 }` escrita en la pantalla:
    // si el back cambiaba el término, el encabezado seguía diciendo 15.
    const rows = normalizeArcoResponse({
      acceso: [row({ submittedAt: submittedBusinessDaysAgo(4), sla_remaining_days: 11 })],
      cancelacion: [
        row({ type: 'cancelacion', submittedAt: submittedBusinessDaysAgo(3), sla_remaining_days: 7 }),
      ],
    })

    expect(deriveSlaTerms(rows)).toEqual({ acceso: 15, reclamo: 10 })
  })

  it('trata rectificación, cancelación y oposición como un solo término', () => {
    const rows = normalizeArcoResponse({
      rectificacion: [
        row({ type: 'rectificacion', submittedAt: submittedBusinessDaysAgo(2), sla_remaining_days: 8 }),
      ],
      oposicion: [
        row({ type: 'oposicion', submittedAt: submittedBusinessDaysAgo(6), sla_remaining_days: 4 }),
      ],
    })
    expect(deriveSlaTerms(rows).reclamo).toBe(10)
  })

  it('una fila corrida no arrastra al resto: gana la mayoría', () => {
    // El `sla_remaining_days` de una fila puede haberse calculado del otro lado
    // de la medianoche y quedar corrido en uno.
    const rows = normalizeArcoResponse({
      acceso: [
        row({ id: 'a', submittedAt: submittedBusinessDaysAgo(2), sla_remaining_days: 13 }),
        row({ id: 'b', submittedAt: submittedBusinessDaysAgo(3), sla_remaining_days: 12 }),
        row({ id: 'c', submittedAt: submittedBusinessDaysAgo(4), sla_remaining_days: 10 }), // corrida
      ],
    })
    expect(deriveSlaTerms(rows).acceso).toBe(15)
  })

  it('sin solicitudes de un grupo devuelve null — no un número inventado', () => {
    const soloAcceso = normalizeArcoResponse({
      acceso: [row({ submittedAt: submittedBusinessDaysAgo(1), sla_remaining_days: 14 })],
    })
    expect(deriveSlaTerms(soloAcceso)).toEqual({ acceso: 15, reclamo: null })
    expect(deriveSlaTerms([])).toEqual({ acceso: null, reclamo: null })
  })

  it('las solicitudes cerradas también sirven para despejarlo', () => {
    // El back calcula `sla_remaining_days` desde `submittedAt` sin importar el
    // estado, así que una resuelta es tan válida como una abierta.
    const rows = normalizeArcoResponse({
      acceso: [
        row({ status: 'resolved', submittedAt: submittedBusinessDaysAgo(5), sla_remaining_days: 10 }),
      ],
    })
    expect(deriveSlaTerms(rows).acceso).toBe(15)
  })
})

describe('toCedulaRef — la cédula sólo existe hasheada', () => {
  it('recorta el SHA-256 a una referencia corta en mayúsculas', () => {
    // Pintar los 64 caracteres del hash en la tabla no le sirve a nadie; era
    // lo que pasaba al mandárselo a <Mask/>, que espera un valor ya enmascarado.
    expect(toCedulaRef('abc123'.padEnd(64, '0'))).toBe('ABC123')
    expect(toCedulaRef('a'.repeat(64))).toHaveLength(6)
  })

  it('deja intacto un valor que NO es un hash', () => {
    // Si algún día el back manda algo ya enmascarado, recortarlo lo arruinaría.
    expect(toCedulaRef('••••4567')).toBe('••••4567')
  })

  it('sin valor devuelve un guion, no "undefined"', () => {
    expect(toCedulaRef(null)).toBe('—')
    expect(toCedulaRef(undefined)).toBe('—')
    expect(toCedulaRef('')).toBe('—')
  })
})

describe('deriveArcoKpis', () => {
  it('reparte cada solicitud en exactamente un cubo', () => {
    const rows = normalizeArcoResponse({
      acceso: [
        row({ id: '1', sla_remaining_days: -4 }),
        row({ id: '2', sla_remaining_days: 7 }),
        row({ id: '3', status: 'pending_email_verification', sla_remaining_days: 12 }),
        row({ id: '4', status: 'resolved', sla_remaining_days: 3 }),
        row({ id: '5', status: 'rejected', sla_remaining_days: 1 }),
      ],
    })
    const kpis = deriveArcoKpis(rows)

    expect(kpis).toEqual({
      pendingVerification: 1,
      onTime: 1,
      overdue: 1,
      closed: 2,
    })
    // Invariante: ninguna solicitud se pierde ni se cuenta dos veces.
    const total = kpis.pendingVerification + kpis.onTime + kpis.overdue + kpis.closed
    expect(total).toBe(rows.length)
  })

  it('una sin confirmar no cuenta como vencida aunque su plazo sea negativo', () => {
    // El reloj legal arranca al confirmar el correo: contarla como incumplida
    // acusaría a la inmobiliaria de algo que todavía no le corresponde.
    const rows = normalizeArcoResponse({
      acceso: [row({ status: 'pending_email_verification', sla_remaining_days: -5 })],
    })
    const kpis = deriveArcoKpis(rows)
    expect(kpis.pendingVerification).toBe(1)
    expect(kpis.overdue).toBe(0)
  })

  it('sin solicitudes, todo en cero', () => {
    expect(deriveArcoKpis([])).toEqual({
      pendingVerification: 0, onTime: 0, overdue: 0, closed: 0,
    })
  })
})
