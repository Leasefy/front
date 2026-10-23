/**
 * El aviso de Inmuebles «lo que no sale en el marketplace» (revisora r25): con nada publicado, el número del aviso
 * es el mismo «Todos» de la tabla; entonces se dice sin la cifra. Con algo publicado, la cifra sí informa.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { lista } = vi.hoisted(() => ({ lista: vi.fn() }))

vi.mock('@/lib/api/marketplace-del-portafolio.service', async (original) => {
  const real = await original<typeof import('@/lib/api/marketplace-del-portafolio.service')>()
  return { ...real, marketplaceDelPortafolioApi: { lista, cambiar: vi.fn(), uno: vi.fn() } }
})
vi.mock('./ElegirQuePublicar', () => ({ ElegirQuePublicar: () => null }))

import { AvisoDeNoPublicados } from './AvisoDeNoPublicados'

let raiz: Root
let caja: HTMLDivElement

beforeEach(() => {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
})

afterEach(() => {
  act(() => raiz.unmount())
  caja.remove()
  lista.mockReset()
})

async function montar(resumen: { publicados: number; noPublicados: number; noPublicadosConFotos: number }) {
  lista.mockResolvedValue({ disponible: true, resumen: { ...resumen, seVen: 0 }, inmuebles: [] })
  await act(async () => {
    raiz.render(<AvisoDeNoPublicados />)
  })
  await act(async () => {})
  return caja.querySelector('[data-testid="aviso-no-publicados-titulo"]')?.textContent ?? ''
}

describe('AvisoDeNoPublicados', () => {
  it('con nada publicado dice «Ninguno…» sin repetir el total de la tabla', async () => {
    const titulo = await montar({ publicados: 0, noPublicados: 2923, noPublicadosConFotos: 0 })
    expect(titulo).toBe('Ninguno de tus inmuebles sale en el marketplace')
    expect(titulo).not.toContain('2.923')
  })

  it('con algo publicado dice cuántos no salen', async () => {
    const titulo = await montar({ publicados: 10, noPublicados: 2913, noPublicadosConFotos: 0 })
    expect(titulo).toContain('2.913')
    expect(titulo).toContain('inmuebles no salen en el marketplace')
  })

  it('sin nada por publicar no se pinta', async () => {
    await montar({ publicados: 5, noPublicados: 0, noPublicadosConFotos: 0 })
    expect(caja.querySelector('[data-testid="aviso-no-publicados"]')).toBeNull()
  })
})
