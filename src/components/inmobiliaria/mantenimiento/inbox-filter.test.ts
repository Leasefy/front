/**
 * inbox-filter.test.ts — Phase 7 plan 07-03 (DASH-02)
 *
 * Pure unit tests for the inbox sort + filter logic. No React, no i18n, no DOM.
 * `now` is always injected (never Date.now()) so every assertion is deterministic.
 */

import { describe, it, expect } from 'vitest'
import type { MaintenanceTicketCard } from '@/lib/types/mantenimiento'
import {
  EMPTY_FILTERS,
  sortByScoreDesc,
  applyInboxFilters,
  computeSlaBucket,
} from './inbox-filter'

const NOW = new Date('2026-06-20T12:00:00Z')
const NOW_MS = NOW.getTime()
const HOUR = 3_600_000

/** Minimal card factory — deterministic, overridable. */
function card(overrides: Partial<MaintenanceTicketCard> = {}): MaintenanceTicketCard {
  return {
    id: overrides.id ?? 'tkt-0',
    titulo: overrides.titulo ?? 'Fuga en cocina',
    inmueble: overrides.inmueble ?? { address: 'Calle 1 #2-3', unit: 'Apto 101' },
    score: overrides.score ?? 50,
    bucket: overrides.bucket ?? 'medio',
    categoria: overrides.categoria ?? 'plomeria',
    severidad: overrides.severidad ?? 'media',
    estado: overrides.estado ?? 'recibido',
    createdAt: overrides.createdAt ?? new Date(NOW_MS - 2 * HOUR).toISOString(),
    slaDeadlineAt: overrides.slaDeadlineAt ?? new Date(NOW_MS + 48 * HOUR).toISOString(),
    proveedorSugerido: overrides.proveedorSugerido,
    requiereAprobacion: overrides.requiereAprobacion ?? false,
    hasPhotos: overrides.hasPhotos ?? false,
    reabierto: overrides.reabierto ?? false,
    retencionRiesgo: overrides.retencionRiesgo,
    costoEstimadoCop: overrides.costoEstimadoCop,
    responsableProbable: overrides.responsableProbable ?? 'no_determinado',
  }
}

describe('sortByScoreDesc', () => {
  it('Test 1: orders [40,90,70] → [90,70,40] and does not mutate the input', () => {
    const input = [card({ id: 'a', score: 40 }), card({ id: 'b', score: 90 }), card({ id: 'c', score: 70 })]
    const snapshot = input.map((c) => c.score)
    const out = sortByScoreDesc(input)
    expect(out.map((c) => c.score)).toEqual([90, 70, 40])
    // input untouched
    expect(input.map((c) => c.score)).toEqual(snapshot)
    expect(out).not.toBe(input)
  })

  it('Test 2: ties break by createdAt DESC (most recent first)', () => {
    const older = card({ id: 'older', score: 80, createdAt: new Date(NOW_MS - 5 * HOUR).toISOString() })
    const newer = card({ id: 'newer', score: 80, createdAt: new Date(NOW_MS - 1 * HOUR).toISOString() })
    const out = sortByScoreDesc([older, newer])
    expect(out.map((c) => c.id)).toEqual(['newer', 'older'])
  })
})

describe('applyInboxFilters', () => {
  it('Test 3: EMPTY_FILTERS returns ALL cards', () => {
    const cards = [card({ id: 'a' }), card({ id: 'b' }), card({ id: 'c' })]
    const out = applyInboxFilters(cards, EMPTY_FILTERS, NOW)
    expect(out).toHaveLength(3)
  })

  it('Test 4: severidad=["emergencia"] keeps only emergencias', () => {
    const cards = [
      card({ id: 'emg', severidad: 'emergencia' }),
      card({ id: 'med', severidad: 'media' }),
      card({ id: 'alt', severidad: 'alta' }),
    ]
    const out = applyInboxFilters(cards, { ...EMPTY_FILTERS, severidad: ['emergencia'] }, NOW)
    expect(out.map((c) => c.id)).toEqual(['emg'])
  })

  it('Test 5: hasPhotos=true keeps only cards with photos', () => {
    const cards = [
      card({ id: 'with', hasPhotos: true }),
      card({ id: 'without', hasPhotos: false }),
    ]
    const out = applyInboxFilters(cards, { ...EMPTY_FILTERS, hasPhotos: true }, NOW)
    expect(out.map((c) => c.id)).toEqual(['with'])
  })

  it('Test 6: SLA vencido (slaBreached=true) keeps only deadline<now — deterministic, no Date.now()', () => {
    const breached = card({ id: 'breached', slaDeadlineAt: new Date(NOW_MS - 1 * HOUR).toISOString() })
    const ok = card({ id: 'ok', slaDeadlineAt: new Date(NOW_MS + 48 * HOUR).toISOString() })
    const out = applyInboxFilters(cards2(breached, ok), { ...EMPTY_FILTERS, slaBreached: true }, NOW)
    expect(out.map((c) => c.id)).toEqual(['breached'])
    // sanity: computeSlaBucket agrees with the filter and is injected-now driven
    expect(computeSlaBucket(breached, NOW)).toBe('vencido')
    expect(computeSlaBucket(ok, NOW)).toBe('ok')
  })

  it('Test 7: categoria + requiereAprobacion=true apply AND', () => {
    const cards = [
      card({ id: 'match', categoria: 'electricidad', requiereAprobacion: true }),
      card({ id: 'wrongCat', categoria: 'plomeria', requiereAprobacion: true }),
      card({ id: 'noApproval', categoria: 'electricidad', requiereAprobacion: false }),
    ]
    const out = applyInboxFilters(
      cards,
      { ...EMPTY_FILTERS, categoria: ['electricidad'], requiereAprobacion: true },
      NOW,
    )
    expect(out.map((c) => c.id)).toEqual(['match'])
  })
})

describe('computeSlaBucket', () => {
  it('classifies vencido / proximo / ok against an injected now', () => {
    const vencido = card({ slaDeadlineAt: new Date(NOW_MS - 1 * HOUR).toISOString() })
    const proximo = card({ slaDeadlineAt: new Date(NOW_MS + 12 * HOUR).toISOString() })
    const ok = card({ slaDeadlineAt: new Date(NOW_MS + 72 * HOUR).toISOString() })
    expect(computeSlaBucket(vencido, NOW)).toBe('vencido')
    expect(computeSlaBucket(proximo, NOW)).toBe('proximo')
    expect(computeSlaBucket(ok, NOW)).toBe('ok')
  })
})

function cards2(a: MaintenanceTicketCard, b: MaintenanceTicketCard): MaintenanceTicketCard[] {
  return [a, b]
}
