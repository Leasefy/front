/**
 * reporte-href.test.ts — la URL del informe y el predicado de auto-redirect
 * (T-0007 §3.4, frozen): `slug != null && status !== 'rechazado' && capToken
 * != null`. No hace falta ningún campo nuevo en el wire — `slug` ya lo
 * discrimina.
 */

import { describe, it, expect } from 'vitest'
import { reporteAvaluoHref, shouldRedirectToReport } from './reporte-href'

describe('reporteAvaluoHref', () => {
  it('arma la URL con slug y token escapados', () => {
    expect(reporteAvaluoHref('slug con espacio', 'tok/en=x')).toBe(
      `/avaluo/reporte/${encodeURIComponent('slug con espacio')}?token=${encodeURIComponent('tok/en=x')}`,
    )
  })
})

describe('shouldRedirectToReport (T-0007 §3.4, frozen)', () => {
  it('slug presente + status distinto de rechazado + capToken presente ⇒ true', () => {
    expect(shouldRedirectToReport('en_revisión', 'slug-1', 'tok')).toBe(true)
    expect(shouldRedirectToReport('firmado', 'slug-1', 'tok')).toBe(true)
    expect(shouldRedirectToReport('entregado', 'slug-1', 'tok')).toBe(true)
  })

  it('sin slug ⇒ false (pipeline corriendo, sin cert row todavía)', () => {
    expect(shouldRedirectToReport('en_revisión', undefined, 'tok')).toBe(false)
    expect(shouldRedirectToReport('en_revisión', null, 'tok')).toBe(false)
  })

  it('rechazado ⇒ false SIEMPRE, aunque haya slug — está reembolsado, no se lo manda al informe', () => {
    expect(shouldRedirectToReport('rechazado', 'slug-1', 'tok')).toBe(false)
  })

  it('sin capToken ⇒ false — no hay con qué armar la URL del informe', () => {
    expect(shouldRedirectToReport('firmado', 'slug-1', null)).toBe(false)
  })
})
