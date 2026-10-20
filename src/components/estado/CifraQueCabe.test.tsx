/**
 * La cifra de una tarjeta siempre cabe entera (Nico, 20-10-2026: «Canon
 * mensual» de Propietarios se salía por el borde).
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { CifraQueCabe } from './CifraQueCabe'

describe('<CifraQueCabe>', () => {
  it('pinta la cifra entera, sin recortarla ni redondearla', () => {
    const html = renderToStaticMarkup(<CifraQueCabe>{'$ 1.270.514.293,50'}</CifraQueCabe>)
    expect(html).toContain('>$ 1.270.514.293,50</span>')
    expect(html).toContain('title="$ 1.270.514.293,50"')
  })

  it('la letra se achica según el largo, y nunca pasa del tamaño de siempre', () => {
    // 18 letras × 0,6 em = 10,8 em de ancho.
    expect(renderToStaticMarkup(<CifraQueCabe>{'$ 1.270.514.293,50'}</CifraQueCabe>)).toContain(
      'font-size:min(1em, calc(100cqi / 10.80))',
    )
    expect(renderToStaticMarkup(<CifraQueCabe>{'916'}</CifraQueCabe>)).toContain(
      'font-size:min(1em, calc(100cqi / 1.80))',
    )
  })
})
