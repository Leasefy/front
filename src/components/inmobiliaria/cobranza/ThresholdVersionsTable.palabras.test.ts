import { describe, expect, it } from 'vitest'
import { cuandoSeGuardo, quienLaGuardo } from './ThresholdVersionsTable'

/**
 * MORI-23 (QA-AGENTES 16-10, lab Portofino): el historial de umbrales decía
 * «16/10/2026, 11:02:31», «Por —» siempre y «EDIT».
 */
describe('historial de umbrales en palabras', () => {
  it('el día en palabras, con la hora de Colombia', () => {
    const texto = cuandoSeGuardo('2026-10-16T16:02:31.269Z', 'es')
    expect(texto).toMatch(/^16 de octubre de 2026/)
    expect(texto).toMatch(/11:02/)
    expect(texto).not.toMatch(/16\/10/)
  })

  it('quién la guardó: el nombre, si no el correo, nunca un id', () => {
    expect(quienLaGuardo({ created_by_name: 'Ana Administradora Lab', created_by_email: 'a@x.co' })).toBe(
      'Ana Administradora Lab',
    )
    expect(quienLaGuardo({ created_by_name: null, created_by_email: 'a@x.co' })).toBe('a@x.co')
    expect(quienLaGuardo({ created_by_name: '  ', created_by_email: null })).toBe('—')
  })
})
