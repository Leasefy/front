import { describe, expect, it } from 'vitest'
import { actorDelReporte } from '../MantenimientoViewer'
import es from '@/lib/i18n/locales/es.json'

// FIXI-2 (QA de agentes 17-10): «Solicitud reportada · YENY PATRICIA PORTILLA»
// aunque la creó la administradora desde el panel.
const t = (key: string, params?: Record<string, string | number>) => {
  const texto = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], es) as string
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params?.[k] ?? ''))
}

describe('actorDelReporte', () => {
  it('la creada en el panel la reportó quien la creó, no el inquilino', () => {
    expect(actorDelReporte({ reportadaPor: { nombre: 'Ana Administradora', quien: 'INMOBILIARIA' } }, t)).toBe(
      'Ana Administradora (inmobiliaria)',
    )
  })

  it('sin el nombre de quien la creó, «La inmobiliaria»', () => {
    expect(actorDelReporte({ reportadaPor: { nombre: null, quien: 'INMOBILIARIA' } }, t)).toBe('La inmobiliaria')
  })

  it('la de una PQRS del inquilino, el inquilino', () => {
    expect(actorDelReporte({ reportadaPor: { nombre: 'Yeny Portilla', quien: 'INQUILINO' } }, t)).toBe(
      'Yeny Portilla (inquilino)',
    )
  })

  it('si no se sabe, no hay autor (antes salía el inquilino)', () => {
    expect(actorDelReporte({ reportadaPor: null }, t)).toBeUndefined()
    expect(actorDelReporte({}, t)).toBeUndefined()
    expect(actorDelReporte({ reportadaPor: { nombre: '  ', quien: 'INQUILINO' } }, t)).toBeUndefined()
  })
})
