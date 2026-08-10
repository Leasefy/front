/**
 * Tests del normalizador de transcripción.
 *
 * Existen porque la versión anterior del hook inventó el contrato entero y la
 * pantalla se caía con `Cannot read properties of undefined (reading 'map')`.
 * No se veía: `agent.call_turns` estaba vacía, así que el componente nunca
 * llegaba a recorrer los turnos. El bug apareció el día que hubo datos.
 *
 * El fixture se arma con el tipo del contrato generado, así que si el agente
 * cambia la respuesta, este archivo deja de compilar.
 */

import { describe, it, expect } from 'vitest'

import {
  normalizeTranscript,
  type TranscriptApiResponse,
} from '@/lib/hooks/cobranza/use-call-transcript'

function apiResponse(
  turns: TranscriptApiResponse['turns'],
): TranscriptApiResponse {
  return {
    turns,
    totalTurns: turns.length,
    generatedAt: '2026-08-09T02:00:00.000Z',
  }
}

const turno = (
  index: number,
  speaker: TranscriptApiResponse['turns'][number]['speaker'],
  startedAt: string,
  text = 'texto',
): TranscriptApiResponse['turns'][number] => ({
  index,
  speaker,
  startedAt,
  endedAt: null,
  text,
  complianceFlags: [],
})

describe('normalizeTranscript', () => {
  it('convierte marcas absolutas en segundos desde el inicio', () => {
    const out = normalizeTranscript(
      apiResponse([
        turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
        turno(2, 'customer', '2026-08-07T10:05:58.000Z'),
        turno(3, 'agent', '2026-08-07T10:06:15.000Z'),
      ]),
    )
    expect(out.turns.map((t) => t.startSec)).toEqual([0, 17, 34])
  })

  it('infiere el fin de cada turno del comienzo del siguiente', () => {
    const out = normalizeTranscript(
      apiResponse([
        turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
        turno(2, 'customer', '2026-08-07T10:05:58.000Z'),
      ]),
    )
    expect(out.turns[0].endSec).toBe(17)
    // El último no tiene siguiente: null, no 0 (0 lo pintaría como instantáneo).
    expect(out.turns[1].endSec).toBeNull()
  })

  it('respeta `endedAt` cuando el backend sí lo manda', () => {
    const out = normalizeTranscript(
      apiResponse([
        {
          ...turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
          endedAt: '2026-08-07T10:05:49.000Z',
        },
      ]),
    )
    expect(out.turns[0].endSec).toBe(8)
  })

  it('`complianceFlags` ausente queda como array, no undefined', () => {
    // Es exactamente lo que tumbaba la pantalla: `.map` sobre undefined.
    const crudo = apiResponse([turno(1, 'agent', '2026-08-07T10:05:41.000Z')])
    delete (crudo.turns[0] as { complianceFlags?: unknown }).complianceFlags
    const out = normalizeTranscript(crudo)
    expect(out.turns[0].complianceFlagIds).toEqual([])
  })

  it('conserva el hablante tal cual manda el agente', () => {
    const out = normalizeTranscript(
      apiResponse([
        turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
        turno(2, 'customer', '2026-08-07T10:05:50.000Z'),
        turno(3, 'operator', '2026-08-07T10:05:59.000Z'),
      ]),
    )
    expect(out.turns.map((t) => t.speaker)).toEqual(['agent', 'customer', 'operator'])
  })

  it('el id sale del índice del turno y es único dentro de la llamada', () => {
    const out = normalizeTranscript(
      apiResponse([
        turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
        turno(2, 'customer', '2026-08-07T10:05:50.000Z'),
      ]),
    )
    expect(out.turns.map((t) => t.id)).toEqual(['turno-1', 'turno-2'])
    expect(new Set(out.turns.map((t) => t.id)).size).toBe(2)
  })

  it('sin turnos devuelve lista vacía y no revienta', () => {
    const out = normalizeTranscript(apiResponse([]))
    expect(out.turns).toEqual([])
    expect(out.totalTurns).toBe(0)
  })

  it('una fecha inválida no propaga NaN a los segundos', () => {
    const out = normalizeTranscript(
      apiResponse([
        turno(1, 'agent', '2026-08-07T10:05:41.000Z'),
        turno(2, 'customer', 'no-es-una-fecha'),
      ]),
    )
    expect(out.turns[1].startSec).toBe(0)
    expect(Number.isNaN(out.turns[1].startSec)).toBe(false)
  })

  it('texto null se convierte en cadena vacía', () => {
    const crudo = apiResponse([turno(1, 'agent', '2026-08-07T10:05:41.000Z')])
    ;(crudo.turns[0] as { text: string | null }).text = null
    expect(normalizeTranscript(crudo).turns[0].text).toBe('')
  })
})
