import { describe, expect, it } from 'vitest'
import { lineaDeTiempo, type EventoDelMicro } from './linea-de-tiempo'
import type { EntradaDelHistorial } from '@/lib/api/cobranza-manual.types'

/**
 * QA-AGENTES 16-10 (lab, deudor 6dbe43ba…): la pestaña abría el cambio de
 * etapa como JSON crudo (`id`, `from_stage`, `actor_type: admin:override`),
 * las notas salían como «Memo · ahora mismo» sin el texto, y con una gestión
 * y una promesa del equipo decía «Sin eventos registrados».
 */
const cambio: EventoDelMicro = {
  event_type: 'stage_transition',
  occurred_at: '2026-10-16T14:07:36.722Z',
  payload: {
    id: '5779446a-82b8-4c53-8831-a7e76e003068',
    from_stage: 'S3',
    to_stage: 'S2',
    reason: 'QA: el inquilino abonó por fuera, baja a administrativa',
    actor_type: 'admin:override',
  },
}

const nota: EventoDelMicro = {
  event_type: 'memo',
  occurred_at: '2026-10-16T14:12:00.210Z',
  payload: { memo_id: 'm1', body_excerpt: 'Le pagan el 18; volver a llamar el 19.', call_id: null },
}

const gestion: EntradaDelHistorial = {
  id: 'g1',
  origen: 'equipo',
  cuando: '2026-10-16T13:43:00.000Z',
  tipo: 'LLAMADA',
  tipoTexto: 'Llamada',
  resultado: 'PROMETIO_PAGAR',
  resultadoTexto: 'Prometió pagar',
  comentario: 'Dice que paga agosto el lunes.',
  quien: 'Ana Administradora Lab',
  promesa: { fecha: '2026-10-19', montoCop: 1_400_000, estado: 'PENDIENTE', abonadoCop: null, faltaCop: null },
}

describe('lineaDeTiempo', () => {
  it('el cambio de etapa en palabras: de qué etapa a cuál, por qué y que fue a mano; nada del JSON', () => {
    const [e] = lineaDeTiempo([cambio], [], 'es')
    expect(e!.titulo).toBe('De Mora pre-jurídica a Mora administrativa')
    expect(e!.detalle).toBe('QA: el inquilino abonó por fuera, baja a administrativa')
    expect(e!.quien).toBe('Lo cambió tu equipo a mano')
    // Lo que se ve (la clave es interna, para React).
    expect([e!.titulo, e!.detalle, e!.quien].join(' ')).not.toMatch(/admin:override|from_stage|5779446a/)
  })

  it('un cambio automático dice el motivo en palabras, nunca el código', () => {
    const [e] = lineaDeTiempo(
      [{ ...cambio, payload: { from_stage: 'S1', to_stage: 'S2', reason: 'dia_16_sin_pago', actor_type: 'SAAS_ORCHESTRATOR' } }],
      [],
      'es',
    )
    expect(e!.detalle).toBe('Cumplió 16 días sin pagar')
    expect(e!.quien).toBe('Automático')
  })

  it('la nota trae su texto', () => {
    const [e] = lineaDeTiempo([nota], [], 'es')
    expect(e!.titulo).toBe('Nota')
    expect(e!.detalle).toBe('Le pagan el 18; volver a llamar el 19.')
  })

  it('las gestiones del equipo entran, con la promesa, y todo va del más nuevo al más viejo', () => {
    const eventos = lineaDeTiempo([cambio, nota], [gestion, { ...gestion, id: 'g2', origen: 'agente' }], 'es')
    expect(eventos.map((e) => e.tipo)).toEqual(['nota', 'etapa', 'gestion'])
    const g = eventos[2]!
    expect(g.titulo).toBe('Llamada · Prometió pagar')
    expect(g.detalle).toContain('Dice que paga agosto el lunes.')
    expect(g.detalle).toMatch(/Prometió pagar \$\s1\.400\.000 el 19 de octubre de 2026/)
    expect(g.quien).toBe('Registró Ana Administradora Lab')
  })

  it('la clave es la del evento, no su posición (uno nuevo arriba no le cambia la clave a los demás)', () => {
    const antes = lineaDeTiempo([cambio], [gestion], 'es').map((e) => e.clave)
    const despues = lineaDeTiempo([nota, cambio], [gestion], 'es').map((e) => e.clave)
    expect(despues.slice(1)).toEqual(antes)
    expect(new Set(despues).size).toBe(despues.length)
  })

  // Lab 16-10: el back trae las notas del micro como `agente-nota-<id>`;
  // cada nota salía dos veces.
  it('una nota que el back ya trae sale una sola vez (con el tipo que dice el back)', () => {
    const delBack: EntradaDelHistorial = {
      ...gestion,
      id: 'agente-nota-m1',
      tipo: 'CARTA',
      tipoTexto: 'Carta prejurídica',
      resultado: null,
      resultadoTexto: null,
      comentario: 'Se generó a mano la carta prejurídica.',
      quien: 'Alguien del equipo, en Cobranza',
      promesa: null,
    }
    const eventos = lineaDeTiempo([nota], [delBack], 'es')
    expect(eventos).toHaveLength(1)
    expect(eventos[0]!.titulo).toBe('Carta prejurídica')
  })
})

