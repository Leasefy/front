/**
 * page.movil.test.tsx — Candidatos del propietario, layout en móvil (T-0173).
 *
 * A 360/412 px el filtro por estado (419 px) y el botón del scoring (407 px)
 * ensanchaban la página. El filtro scrollea por dentro y el botón se parte.
 *
 * It reads the source instead of rendering the page: the render depends on the
 * whole Cadence surface (`FranjaDeCifras`, ...) and jsdom has no layout anyway.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fuente = readFileSync(join(process.cwd(), 'src/app/panel/(landlord)/candidatos/page.tsx'), 'utf8').replace(/\r\n/g, '\n')

describe('Candidatos del propietario en móvil', () => {
  it('el filtro por estado scrollea por dentro', () => {
    expect(fuente).toMatch(/<div className="mb-6 max-w-full overflow-x-auto">\s*<SegmentedControl<StatusFunnel>/)
  })

  it('el botón de la guía de scoring puede partirse en líneas', () => {
    expect(fuente).toMatch(/className=\{cn\('[^']*max-w-full[^']*whitespace-normal[^']*'/)
  })
})
