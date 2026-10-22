import { describe, expect, it } from 'vitest'
import { CORREO_PARA_REPORTES, enlaceParaReportar } from './reportar-publicacion'

describe('reportar una publicación del marketplace', () => {
  it('arma el correo a Leasefy con el enlace del inmueble y la pregunta por el motivo', () => {
    const url = new URL(enlaceParaReportar('abc-123', 'https://leasefy.co'))
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe(CORREO_PARA_REPORTES)
    expect(url.searchParams.get('subject')).toBe('Reporte de una publicación (abc-123)')
    expect(url.searchParams.get('body')).toContain('https://leasefy.co/propiedades/abc-123')
    expect(url.searchParams.get('body')).toContain('Motivo')
  })
})
