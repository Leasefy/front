/**
 * Tests del normalizador del detalle de llamada.
 *
 * Estos tests existen por una razón concreta: la versión anterior de este hook
 * declaraba el contrato a mano y NINGÚN campo importante coincidía con lo que
 * manda el agente. `data.qa.overall` sobre `undefined` tumbaba la pantalla
 * entera al error boundary, en el 100% de las llamadas, con `tsc` en verde.
 *
 * El fixture se arma con la forma REAL del contrato generado (el tipo lo
 * exige), así que si el agente cambia la respuesta, este archivo deja de
 * compilar antes de que la pantalla vuelva a romperse.
 */

import { describe, it, expect } from 'vitest'

import {
  normalizeCallDetail,
  type CallDetailApiResponse,
} from '@/lib/hooks/cobranza/use-call-detail'

function apiResponse(over: Partial<CallDetailApiResponse> = {}): CallDetailApiResponse {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    debtorId: '22222222-2222-4222-8222-222222222222',
    debtorNameMasked: 'Gl•••ona',
    debtorCedulaMasked: '43•••412',
    vapiCallId: '11111111-1111-4111-8111-111111111111',
    direction: 'outbound',
    channel: 'voice',
    status: 'completed',
    outcome: 'completed',
    initiatedAt: '2026-08-07T10:05:37.549Z',
    startedAt: '2026-08-07T10:05:41.549Z',
    endedAt: '2026-08-07T10:09:11.549Z',
    durationSeconds: 214,
    // Las cuatro dimensiones que escribe el evaluador, ya convertidas por el
    // agente a 0-100 (allá son enteros 0-5).
    qaDimensions: { empatia: 60, claridad: 100, adherencia: 20, objeciones: 60 },
    // Campos del combinado (2026-08-24): null/[] = llamada anterior a que el
    // evaluador los produjera — el caso que el normalizador debe tolerar.
    qaScore: null,
    qaCompliance: null,
    qaQuality: null,
    qaViolations: [],
    complianceEvents: [],
    summary: null,
    hasRecording: true,
    hasTranscript: true,
    stateTrace: [],
    costBreakdown: {
      llmUsd: 0,
      voiceUsd: 0,
      platformUsd: 0,
      whatsappUsd: 0,
      totalUsd: 0,
    },
    generatedAt: '2026-08-08T20:00:00.000Z',
    ...over,
  }
}

describe('normalizeCallDetail', () => {
  it('traduce los nombres que el front tenía mal', () => {
    const out = normalizeCallDetail(apiResponse())
    // `durationSeconds`, no `durationSec`; `cost`, no `costBreakdown`.
    expect(out.durationSeconds).toBe(214)
    expect(out.cost.totalUsd).toBe(0)
    expect(out.debtorNameMasked).toBe('Gl•••ona')
  })

  it('lee las CUATRO dimensiones que el evaluador escribe de verdad', () => {
    // Antes esto leía `rapport`/`compliance`/`resolution`/`sentiment`, claves
    // que ningún productor escribe: las cuatro salían `null` y la tarjeta
    // decía siempre «QA pendiente» aun con el puntaje en la base.
    const out = normalizeCallDetail(apiResponse())
    expect(out.qa.empatia).toBe(60)
    expect(out.qa.claridad).toBe(100)
    expect(out.qa.adherencia).toBe(20)
    expect(out.qa.objeciones).toBe(60)
    // (60 + 100 + 20 + 60) / 4 = 60 — en escala 0-100, no 0-1.
    expect(out.qa.overall).toBe(60)
  })

  it('la llamada real 01a034e9 (3/3/3/3 → 60) deja de verse como «QA pendiente»', () => {
    const out = normalizeCallDetail(
      apiResponse({
        qaDimensions: { empatia: 60, claridad: 60, adherencia: 60, objeciones: 60 },
      }),
    )
    // `compliance`/`violations`/`quality` (2026-08-24) se apartan: acá se
    // afirma sobre las CUATRO dimensiones del evaluador.
    const { overall, compliance: _c, violations: _v, quality: _q, ...dims } = out.qa
    expect(Object.values(dims).every((v) => v !== null)).toBe(true)
    expect(overall).toBe(60)
  })

  it('«General» usa el puntaje COMBINADO del agente cuando llega — no el promedio (llamada 01a03712)', () => {
    // El juez dio 4/4/4/4 (promedio 80) pero el cumplimiento falló y el
    // combinado quedó capado a 40. Mostrar 80 como «General» era contar dos
    // verdades distintas con el mismo nombre.
    const out = normalizeCallDetail({
      ...apiResponse({
        qaDimensions: { empatia: 80, claridad: 80, adherencia: 80, objeciones: 80 },
      }),
      qaScore: 40,
      qaCompliance: false,
      qaQuality: 80,
      qaViolations: ['habeas_data_noticed'],
    })
    expect(out.qa.overall).toBe(40)
    expect(out.qa.quality).toBe(80)
    expect(out.qa.compliance).toBe(false)
    expect(out.qa.violations).toEqual(['habeas_data_noticed'])
  })

  it('las llamadas viejas (claves antiguas → cuatro null) no rompen la pantalla', () => {
    // El agente ignora `rapport`/`compliance`/… a propósito y manda null en
    // las cuatro; el panel muestra «QA pendiente», que es cierto: a esas
    // llamadas nunca las puntuó un evaluador.
    const out = normalizeCallDetail(
      apiResponse({
        qaDimensions: {
          empatia: null,
          claridad: null,
          adherencia: null,
          objeciones: null,
        },
      }),
    )
    expect(out.qa).toEqual({
      overall: null,
      compliance: null,
      violations: [],
      quality: null,
      empatia: null,
      claridad: null,
      adherencia: null,
      objeciones: null,
    })
  })

  it('promedia sólo las dimensiones presentes', () => {
    const out = normalizeCallDetail(
      apiResponse({
        qaDimensions: { empatia: 80, claridad: 90, adherencia: null, objeciones: null },
      }),
    )
    expect(out.qa.overall).toBe(85)
  })

  it('sin ninguna dimensión, `overall` es null y no NaN', () => {
    const out = normalizeCallDetail(
      apiResponse({
        qaDimensions: { empatia: null, claridad: null, adherencia: null, objeciones: null },
      }),
    )
    expect(out.qa.overall).toBeNull()
    expect(Number.isNaN(out.qa.overall as unknown as number)).toBe(false)
  })

  it('traduce los eventos de cumplimiento y les asigna gravedad', () => {
    const out = normalizeCallDetail(
      apiResponse({
        complianceEvents: [
          {
            id: 'e1',
            code: 'schedule_violation',
            at: '2026-08-08T19:00:05.000Z',
            channel: 'voice',
          },
          {
            id: 'e2',
            code: 'sms_schedule_blocked',
            at: '2026-08-08T19:00:09.000Z',
            channel: 'sms',
          },
        ],
      }),
    )
    expect(out.complianceEvents[0].label).toBe('Contacto fuera de horario')
    // Ocurrió → grave.
    expect(out.complianceEvents[0].severity).toBe('critical')
    // El sistema lo IMPIDIÓ → no es una falta. Pintarlo igual haría leer como
    // infracción lo contrario de una infracción.
    expect(out.complianceEvents[1].severity).toBe('prevented')
  })

  it('un código desconocido no se pinta crudo ni se marca como grave', () => {
    const out = normalizeCallDetail(
      apiResponse({
        complianceEvents: [
          { id: 'e9', code: 'algo_nuevo', at: '2026-08-08T19:00:05.000Z', channel: null },
        ],
      }),
    )
    expect(out.complianceEvents[0].label).toBe('Otro (algo_nuevo)')
    expect(out.complianceEvents[0].severity).toBe('info')
  })

  it('renombra actorType/createdAt en la traza de estados', () => {
    const out = normalizeCallDetail(
      apiResponse({
        stateTrace: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            fromStage: null,
            toStage: 'PREJURIDICO',
            reason: 'dpd_threshold',
            actorType: 'saas_orchestrator',
            createdAt: '2026-08-07T10:06:00.000Z',
          },
        ],
      }),
    )
    expect(out.stateTrace[0]).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      fromStage: null,
      toStage: 'PREJURIDICO',
      reason: 'dpd_threshold',
      actor: 'saas_orchestrator',
      at: '2026-08-07T10:06:00.000Z',
    })
  })

  it('pasa el resumen del agente tal cual', () => {
    const summary: CallDetailApiResponse['summary'] = {
      outcome: 'plan_agreed',
      digest: 'Acepta un plan a tres cuotas.',
      sentiment: 'cooperative',
      paymentPromised: { amountCop: 1_450_000, dueDate: '2026-08-20', channel: 'wompi' },
      hardshipDetected: false,
      fraudFlags: [],
      nextActionRecommended: 'send_payment_link',
      keyTopics: ['acuerdo-de-pago'],
      unresolvedObjection: null,
    }
    const out = normalizeCallDetail(apiResponse({ summary }))
    expect(out.summary).toEqual(summary)
  })

  it('una llamada sin contestar no revienta: todo null y sin resumen', () => {
    const out = normalizeCallDetail(
      apiResponse({
        outcome: 'no_answer',
        startedAt: null,
        endedAt: null,
        durationSeconds: null,
        summary: null,
        hasRecording: false,
        hasTranscript: false,
        qaDimensions: { empatia: null, claridad: null, adherencia: null, objeciones: null },
      }),
    )
    expect(out.durationSeconds).toBeNull()
    expect(out.summary).toBeNull()
    expect(out.hasRecording).toBe(false)
    expect(out.qa.overall).toBeNull()
  })
})
