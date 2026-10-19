/**
 * 🔴 COTIZ-8 (QA 19-10-2026): «¿Qué pasaría si…?» rompía la página entera porque
 * el micro no mandaba las aseguradoras hipotéticas y el modal hacía `undefined.map`.
 */
import { describe, it, expect } from 'vitest'
import { leerLaRespuesta } from './use-ask-why'

describe('leerLaRespuesta', () => {
  it('la respuesta de un micro anterior (sólo el texto) no rompe nada: a re-cotizar', () => {
    const r = leerLaRespuesta({ reasoning_trace_es: 'Estado: APROBADO…', cost_cop: 4.2, variable_changed: 'ciudad' })
    expect(r.hypothetical_carriers).toEqual([])
    expect(r.narrative_es).toBe('Estado: APROBADO…')
    expect(r.modo).toBe('recotizar')
  })

  it('la nueva: cada aseguradora con su porqué, en la forma del modal', () => {
    const r = leerLaRespuesta({
      narrative_es: 'Con el canon en $ 1.750.000: …',
      cost_cop: 0,
      modo: 'calculado',
      hypothetical_carriers: [
        { carrier: 'bolivar', status: 'rejected', prima_mensual_cop: null, condiciones: [], motivo_rechazo: 'Codeudor no aportado', latency_ms: 245 },
        { carrier: 'mapfre', status: 'approved', prima_mensual_cop: 103_400, condiciones: ['x'], motivo_rechazo: null, latency_ms: 348 },
      ],
    })
    expect(r.modo).toBe('calculado')
    expect(r.cost_cop).toBe(0)
    expect(r.hypothetical_carriers).toEqual([
      expect.objectContaining({ carrier: 'bolivar', status: 'rejected', motivoRechazo: 'Codeudor no aportado', latencyMs: 245 }),
      expect.objectContaining({ carrier: 'mapfre', status: 'approved', primaMensualCop: 103_400, condiciones: ['x'] }),
    ])
  })

  it('un cuerpo vacío o raro tampoco rompe', () => {
    expect(leerLaRespuesta(null)).toEqual({ narrative_es: '', cost_cop: 0, hypothetical_carriers: [], modo: 'recotizar' })
  })
})
