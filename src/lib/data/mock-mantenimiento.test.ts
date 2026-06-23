/**
 * mock-mantenimiento.test.ts — Phase 7 plan 07-01 (Task 2 TDD)
 *
 * Asserts the deterministic mock fixtures:
 *  - getMockKpis: all 9 fields, anti-gaming metrics > 0, integer COP
 *  - getMockInbox: >=8 cards covering the required severity/category/state/flag matrix,
 *    deterministic off a passed-in `now` (no Date.now / Math.random)
 *  - getMockTicketDetail: card fields match the inbox card; null for unknown id;
 *    vision reflects safety_hold/cannot_determine for gas/electricidad/estructural
 */

import { describe, it, expect } from 'vitest'
import { getMockKpis, getMockInbox, getMockTicketDetail } from './mock-mantenimiento'
import {
  MAINTENANCE_STATES,
  SEVERITIES,
  CATEGORIES,
  type MaintenanceTicketState,
} from '@/lib/types/mantenimiento'

const NOW = new Date('2026-06-22T12:00:00.000Z')

const isInt = (n: number | undefined) => n === undefined || Number.isInteger(n)

describe('getMockKpis', () => {
  it('returns all 9 fields, anti-gaming metrics > 0, integer COP', () => {
    const k = getMockKpis(NOW)
    expect(k.ticketsAbiertos).toBeTypeOf('number')
    expect(k.emergenciasActivas).toBeTypeOf('number')
    expect(k.vencidos).toBeTypeOf('number')
    expect(k.tiempoPrimeraRespuestaMin).toBeTypeOf('number')
    expect(k.slaCumplidoPct).toBeTypeOf('number')
    // anti-gaming
    expect(k.reaperturas30dPct).toBeGreaterThan(0)
    expect(k.tiempoResolucionRealDias).toBeGreaterThan(0)
    // integer COP
    expect(Number.isInteger(k.costoEstimadoAbiertoCop)).toBe(true)
    expect(k.propietariosEnRiesgo).toBeTypeOf('number')
  })

  it('is deterministic for the same now', () => {
    expect(getMockKpis(NOW)).toEqual(getMockKpis(new Date(NOW.getTime())))
  })
})

describe('getMockInbox — coverage matrix', () => {
  const inbox = getMockInbox(NOW)

  it('returns >= 8 cards', () => {
    expect(inbox.length).toBeGreaterThanOrEqual(8)
  })

  it('covers at least one emergencia and one informativa severity', () => {
    const sevs = new Set(inbox.map((c) => c.severidad))
    expect(sevs.has('emergencia')).toBe(true)
    expect(sevs.has('informativa')).toBe(true)
  })

  it('covers >= 5 distinct categories and >= 5 distinct states', () => {
    expect(new Set(inbox.map((c) => c.categoria)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(inbox.map((c) => c.estado)).size).toBeGreaterThanOrEqual(5)
  })

  it('has at least one of each required flag', () => {
    expect(inbox.some((c) => c.requiereAprobacion)).toBe(true)
    expect(inbox.some((c) => c.hasPhotos)).toBe(true)
    expect(inbox.some((c) => c.reabierto)).toBe(true)
    expect(inbox.some((c) => c.retencionRiesgo === true)).toBe(true)
    expect(inbox.some((c) => c.proveedorSugerido)).toBe(true)
    expect(inbox.some((c) => !c.proveedorSugerido)).toBe(true)
  })

  it('spans all 5 score buckets', () => {
    expect(new Set(inbox.map((c) => c.bucket)).size).toBe(5)
  })

  it('only uses valid enum members and integer COP', () => {
    for (const c of inbox) {
      expect(MAINTENANCE_STATES).toContain(c.estado)
      expect(SEVERITIES).toContain(c.severidad)
      expect(CATEGORIES).toContain(c.categoria)
      expect(isInt(c.costoEstimadoCop)).toBe(true)
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
    }
  })
})

describe('getMockInbox — determinism', () => {
  it('same now → deep-equal arrays', () => {
    expect(getMockInbox(NOW)).toEqual(getMockInbox(new Date(NOW.getTime())))
  })

  it('returns a fresh array each call (sortable without mutating fixtures)', () => {
    expect(getMockInbox(NOW)).not.toBe(getMockInbox(NOW))
  })

  it('shifted now shifts dates by the same delta but keeps ids/scores identical', () => {
    const base = getMockInbox(NOW)
    const tenDays = 10 * 24 * 60 * 60 * 1000
    const later = getMockInbox(new Date(NOW.getTime() + tenDays))
    expect(later.map((c) => c.id)).toEqual(base.map((c) => c.id))
    expect(later.map((c) => c.score)).toEqual(base.map((c) => c.score))
    for (let i = 0; i < base.length; i++) {
      const dBase = new Date(base[i].createdAt).getTime()
      const dLater = new Date(later[i].createdAt).getTime()
      expect(dLater - dBase).toBe(tenDays)
    }
  })
})

describe('getMockTicketDetail', () => {
  it('returns null for unknown id', () => {
    expect(getMockTicketDetail('does-not-exist', NOW)).toBeNull()
  })

  it('matches the inbox card for a known id', () => {
    const card = getMockInbox(NOW)[0]
    const detail = getMockTicketDetail(card.id, NOW)
    expect(detail).not.toBeNull()
    expect(detail!.id).toBe(card.id)
    expect(detail!.titulo).toBe(card.titulo)
    expect(detail!.estado).toBe(card.estado)
    expect(detail!.score).toBe(card.score)
    expect(detail!.categoria).toBe(card.categoria)
    // clasificacion echoes the card
    expect(detail!.clasificacion.categoria).toBe(card.categoria)
    expect(detail!.clasificacion.severidad).toBe(card.severidad)
    expect(detail!.clasificacion.score).toBe(card.score)
  })

  it('vision reflects safety_hold + cannot_determine for a gas/electricidad/estructural ticket', () => {
    const inbox = getMockInbox(NOW)
    const dangerous = inbox.find(
      (c) => c.categoria === 'gas' || c.categoria === 'electricidad' || c.categoria === 'estructural',
    )
    expect(dangerous).toBeDefined()
    const detail = getMockTicketDetail(dangerous!.id, NOW)!
    expect(detail.vision.length).toBeGreaterThan(0)
    expect(detail.vision.some((v) => v.safety_hold)).toBe(true)
    expect(detail.vision.some((v) => v.cannot_determine.length > 0)).toBe(true)
  })

  it('the hasPhotos ticket has a non-empty vision array with a real photo_quality_score', () => {
    const inbox = getMockInbox(NOW)
    const photo = inbox.find((c) => c.hasPhotos)!
    const detail = getMockTicketDetail(photo.id, NOW)!
    expect(detail.vision.length).toBeGreaterThan(0)
    expect(detail.vision[0].photo_quality_score).toBeGreaterThan(0)
  })

  it('aprobacion.requiresApproval mirrors the card requiereAprobacion + integer COP caps', () => {
    const inbox = getMockInbox(NOW)
    const needsApproval = inbox.find((c) => c.requiereAprobacion)!
    const detail = getMockTicketDetail(needsApproval.id, NOW)!
    expect(detail.aprobacion.requiresApproval).toBe(true)
    expect(Number.isInteger(detail.aprobacion.capCop)).toBe(true)
    expect(Number.isInteger(detail.aprobacion.estimatedMaxCop)).toBe(true)
  })

  it('eventos have ISO `at` strings and valid actors', () => {
    const card = getMockInbox(NOW)[0]
    const detail = getMockTicketDetail(card.id, NOW)!
    expect(detail.eventos.length).toBeGreaterThanOrEqual(2)
    for (const e of detail.eventos) {
      expect(new Date(e.at).toISOString()).toBe(e.at)
      expect(['agent', 'human']).toContain(e.actor)
    }
  })
})

// guard: keep `MaintenanceTicketState` import meaningful (avoids unused-import lint)
const _stateProbe: MaintenanceTicketState = 'recibido'
void _stateProbe
