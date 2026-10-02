import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Footer } from './Footer'

void React

/**
 * 🔴 02-10-2026 · «Suscríbete a nuestro boletín» decía «¡Suscrito!» sin guardar
 * el correo en ningún lado. Se quita mientras no haya dónde guardarlo, y la
 * cuadrícula no queda con un hueco donde estaba.
 */
describe('<Footer> sin el boletín que no guardaba nada', () => {
  const html = renderToStaticMarkup(<Footer />)

  it('🔴 no hay formulario de suscripción ni campo de correo', () => {
    expect(html).not.toContain('<form')
    expect(html).not.toMatch(/type="email"/)
    expect(html).not.toMatch(/Suscr[ií]b/i)
    expect(html).not.toMatch(/bolet[ií]n/i)
  })

  it('la cuadrícula queda en dos columnas, sin la del medio vacía', () => {
    expect(html).toContain('md:grid-cols-2')
    expect(html).not.toContain('md:grid-cols-3')
    // Lo que sigue en el pie: el menú, las redes, las páginas y el contacto.
    expect(html).toContain('Síguenos')
    expect(html).toContain('Páginas')
    expect(html).toContain('Contacto')
  })
})
