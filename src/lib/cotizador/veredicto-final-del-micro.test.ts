/**
 * QA-IA-95 (05-10-2026, IA-A-11): el detalle de una cotización con Sura y Mapfre aprobadas decía «Estado
 * general: Sin resultado» y «Tiempo de respuesta 129.665,4 s». El micro manda la mejor opción como
 * `AseguradoraQuote` (`aseguradora`), el esquema del front exigía `carrier` y botaba el veredicto final; y
 * la latencia de una cotización vieja se medía contra el reloj de hoy.
 */
import { describe, it, expect } from 'vitest'
import { parseSSEEvent } from './sse-schemas'
import { latenciaEnVivo } from '@/lib/hooks/cotizador/use-quote-stream'

// Lo que el micro guardó para la cotización 34a0f62b del lab (agent.cotizador_quote_stream_events).
const DEL_MICRO = {
  failures: [], stub_mode: true, asegurabilidad: 'yes', cohort_insights: null, failed_carriers: [],
  reasoning_trace_es: 'Estado: APROBADO. Se consultaron 3 aseguradoras: 2 aprobaron, 1 rechazaron.',
  mejor_opcion: { via: 'direct', status: 'approved', aseguradora: 'sura', prima_mensual_cop: 54600, latency_ms: 319, condiciones: ['Ratio ingreso/canon ≥ 2x (regla sura)'] },
}

describe('el veredicto final del micro (QA-IA-95)', () => {
  it('se lee aunque la mejor opción venga con `aseguradora` (y queda en `carrier`)', () => {
    const e = parseSSEEvent(JSON.stringify(DEL_MICRO), 'agent.final_verdict')
    expect(e.type).toBe('agent.final_verdict')
    if (e.type !== 'agent.final_verdict') return
    expect(e.data.asegurabilidad).toBe('yes')
    expect(e.data.mejor_opcion?.carrier).toBe('sura')
    expect(e.data.mejor_opcion?.prima_mensual_cop).toBe(54600)
  })
  it('trae `stub_mode` (aseguradoras simuladas): el detalle dice «estimado», nunca «Confirmado por la aseguradora»', () => {
    const e = parseSSEEvent(JSON.stringify(DEL_MICRO), 'agent.final_verdict')
    expect(e.type === 'agent.final_verdict' && e.data.stub_mode).toBe(true)
  })
  it('con `carrier` (como antes) también; y sin mejor opción (todas rechazaron), null', () => {
    const conCarrier = parseSSEEvent(JSON.stringify({ ...DEL_MICRO, mejor_opcion: { carrier: 'mapfre', prima_mensual_cop: 56000 } }), 'agent.final_verdict')
    expect(conCarrier.type === 'agent.final_verdict' && conCarrier.data.mejor_opcion?.carrier).toBe('mapfre')
    const sin = parseSSEEvent(JSON.stringify({ ...DEL_MICRO, asegurabilidad: 'no', mejor_opcion: null }), 'agent.final_verdict')
    expect(sin.type === 'agent.final_verdict' && sin.data.mejor_opcion).toBeNull()
  })
  it('la latencia de una cotización reproducida (36 horas) no se inventa: null; la de una en vivo, sí', () => {
    const ahora = 1_791_227_000_000
    expect(latenciaEnVivo(ahora - 129_665_400, ahora)).toBeNull()
    expect(latenciaEnVivo(ahora - 1_400, ahora)).toBe(1_400)
    expect(latenciaEnVivo(null, ahora)).toBeNull()
  })
})
