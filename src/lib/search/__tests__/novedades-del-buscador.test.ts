/**
 * Las «Novedades» del ⌘K que Nico vio el 02-10-2026: cuatro filas idénticas
 * «Piloto retenido por autonomia · piloto retencion · hace 19 min». Acá se
 * fija que salen en español con tildes, sin claves crudas, y agrupadas.
 */
import { describe, it, expect } from 'vitest'
import { agruparNovedades, describirEvento, type EventoDeAuditoria } from '../novedades-del-buscador'

const AHORA = Date.parse('2026-10-02T15:00:00.000Z')
const hace = (min: number) => new Date(AHORA - min * 60_000).toISOString()

function ev(id: string, action: string, entity_type: string | null, min: number, details?: unknown, entity_id: string | null = null): EventoDeAuditoria {
  return { id, action, entity_type, entity_id, occurred_at: hace(min), details }
}

describe('describirEvento', () => {
  it('la huella de retención del piloto: frase humana, con tilde, y su contexto', () => {
    const d = describirEvento(ev('1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 19), 'es')
    expect(d.titulo).toBe('Acción retenida para tu aprobación')
    expect(d.contexto).toBe('Piloto automático')
    expect(d.familia).toBe('retenida')
    expect(`${d.titulo} ${d.contexto}`).not.toMatch(/autonomia|piloto retencion|piloto_/)
  })

  it('con el payload dice QUÉ se retuvo y de qué agente', () => {
    const d = describirEvento(
      ev('1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 19, { agente: 'prospectos', queSeRetuvo: 'recordatorios de visita', modo: 'copiloto' }),
      'es',
    )
    expect(d.titulo).toBe('Esperando tu aprobación: recordatorios de visita')
    expect(d.contexto).toBe('Piloto automático · prospectos')
  })

  it('el agente con tilde: conciliación, avalúos', () => {
    expect(describirEvento(ev('1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 1, { agente: 'conciliacion' }), 'es').contexto).toBe(
      'Piloto automático · conciliación',
    )
  })

  it('si el agente ya escribió su frase (`titulo`), ésa manda', () => {
    const d = describirEvento(ev('1', 'piloto_gerente_hecha', 'acciones_del_piloto', 5, { titulo: 'El Gerente envió 3 recordatorios de firma' }), 'es')
    expect(d.titulo).toBe('El Gerente envió 3 recordatorios de firma')
  })

  it('modos y reportes del piloto en palabras de pantalla', () => {
    expect(describirEvento(ev('1', 'piloto_autonomia_flota_cambiada', 'agent_autonomy', 5, { modo: 'autonomo' }), 'es').titulo).toBe(
      'Pasaste el piloto automático a Automático',
    )
    expect(describirEvento(ev('1', 'piloto_autonomia_cambiada', 'agent_autonomy', 5, { modo: 'sombra' }, 'cobranza'), 'es').titulo).toBe(
      'Pusiste cobranza en Manual',
    )
    expect(describirEvento(ev('1', 'piloto_reporte_enviado', 'piloto_reporte', 5, { tipo: 'manana' }), 'es').titulo).toBe(
      'El resumen de la mañana salió por correo',
    )
    expect(describirEvento(ev('1', 'piloto_evento_dominio', 'payment.confirmed', 5, {}), 'es').titulo).toBe('Entró un pago')
  })

  it('una huella `piloto_*` nueva sale humanizada sin el prefijo', () => {
    const d = describirEvento(ev('1', 'piloto_algo_que_nadie_tradujo', null, 5), 'es')
    expect(d.titulo).toBe('Algo que nadie tradujo')
    expect(d.contexto).toBe('Piloto automático')
  })

  it('fuera del piloto: la frase del diccionario y la entidad con mayúscula', () => {
    const d = describirEvento(ev('1', 'precall.held_for_approval', 'debtor', 5), 'es')
    expect(d.titulo).toBe('Llamada retenida para aprobación')
    expect(d.contexto).toBe('Deudor')
    expect(d.familia).toBe('retenida')
  })

  it('un payload raro (null, arreglo, texto) no rompe', () => {
    for (const details of [null, [1, 2], 'x', 3]) {
      expect(() => describirEvento(ev('1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 1, details), 'es')).not.toThrow()
    }
  })

  it('en inglés también', () => {
    const d = describirEvento(ev('1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 1), 'en')
    expect(d.titulo).toBe('Action held for your approval')
    expect(d.contexto).toBe('Autopilot')
  })
})

describe('agruparNovedades', () => {
  it('cuatro huellas idénticas son UNA fila con «veces» = 4 y el tiempo de la más reciente', () => {
    const eventos = [
      ev('a', 'piloto_retenido_por_autonomia', 'piloto_retencion', 19),
      ev('b', 'piloto_retenido_por_autonomia', 'piloto_retencion', 19),
      ev('c', 'piloto_retenido_por_autonomia', 'piloto_retencion', 25),
      ev('d', 'piloto_retenido_por_autonomia', 'piloto_retencion', 60),
    ]
    const filas = agruparNovedades(eventos, 'es', { ahora: AHORA })
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ titulo: 'Acción retenida para tu aprobación', veces: 4, cuando: 'hace 19 min', clave: 'a' })
  })

  it('lo que dice cosas distintas queda separado, de la más reciente a la más vieja', () => {
    const eventos = [
      ev('viejo', 'precall.held_for_approval', 'debtor', 360),
      ev('r1', 'piloto_retenido_por_autonomia', 'piloto_retencion', 19, { agente: 'prospectos', queSeRetuvo: 'recordatorios de visita' }),
      ev('r2', 'piloto_retenido_por_autonomia', 'piloto_retencion', 21, { agente: 'prospectos', queSeRetuvo: 'recordatorios de visita' }),
      ev('p', 'piloto_retenido_por_autonomia', 'piloto_retencion', 40, { agente: 'pagos' }),
    ]
    const filas = agruparNovedades(eventos, 'es', { ahora: AHORA })
    expect(filas.map((f) => [f.titulo, f.contexto, f.veces])).toEqual([
      ['Esperando tu aprobación: recordatorios de visita', 'Piloto automático · prospectos', 2],
      ['Acción retenida para tu aprobación', 'Piloto automático · pagos', 1],
      ['Llamada retenida para aprobación', 'Deudor', 1],
    ])
  })

  it('el tope se aplica DESPUÉS de agrupar: las copias no se comen el cupo', () => {
    const copias = Array.from({ length: 10 }, (_, i) => ev(`x${i}`, 'piloto_retenido_por_autonomia', 'piloto_retencion', i + 1))
    const otras = [ev('o1', 'dialer.call_placed', 'call', 30), ev('o2', 'followup.sent', 'debtor', 40)]
    const filas = agruparNovedades([...copias, ...otras], 'es', { ahora: AHORA, maximo: 3 })
    expect(filas).toHaveLength(3)
    expect(filas[0]!.veces).toBe(10)
  })

  it('sin eventos, sin filas', () => {
    expect(agruparNovedades([], 'es', { ahora: AHORA })).toEqual([])
  })
})
