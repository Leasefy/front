/**
 * «¿Cuáles publicas?» (Nico, 10-10-2026: «nada sale hasta que lo elijan»).
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { lista, cambiar } = vi.hoisted(() => ({ lista: vi.fn(), cambiar: vi.fn() }))

vi.mock('@/lib/api/marketplace-del-portafolio.service', async (original) => {
  const real = await original<typeof import('@/lib/api/marketplace-del-portafolio.service')>()
  return { ...real, marketplaceDelPortafolioApi: { lista, cambiar, uno: vi.fn() } }
})
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { fraseDelCambio } from '@/lib/api/marketplace-del-portafolio.service'
import { ElegirQuePublicar } from './ElegirQuePublicar'

const inmueble = (id: string, fotos: number, publicado = false) => ({
  id,
  titulo: `Apartamento ${id}`,
  direccion: 'CR 76 # 33-10',
  ciudad: 'Medellín',
  barrio: 'Laureles',
  canonCop: 2_400_000,
  venta: false,
  fotos,
  publicado,
  seVe: publicado,
  porQueNoSeVe: null,
})

let raiz: Root
let caja: HTMLDivElement

beforeEach(() => {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
  lista.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    resumen: { publicados: 1, noPublicados: 2, noPublicadosConFotos: 1, seVen: 1 },
    inmuebles: [inmueble('a', 3), inmueble('b', 0), inmueble('c', 2, true)],
  })
  cambiar.mockReset().mockResolvedValue({ publicar: true, cambiados: 1, sinFotos: 0 })
})

afterEach(() => {
  act(() => raiz.unmount())
  caja.remove()
})

const montar = async (props: React.ComponentProps<typeof ElegirQuePublicar> = {}) => {
  await act(async () => raiz.render(<ElegirQuePublicar {...props} />))
}

describe('<ElegirQuePublicar>', () => {
  it('arranca en «No publicados» y ofrece publicar los que tienen fotos', async () => {
    await montar()
    expect(caja.querySelectorAll('[data-testid="inmueble-para-elegir"]')).toHaveLength(2)
    expect(caja.querySelector('[data-testid="publicar-los-que-tienen-fotos"]')?.textContent).toContain(
      'Publicar los 1 que tienen fotos',
    )
  })

  it('🔴 «los que tienen fotos» de un lote va por el lote, con soloConFotos', async () => {
    await montar({ lote: 'lote-1' })
    await act(async () => {
      caja.querySelector<HTMLButtonElement>('[data-testid="publicar-los-que-tienen-fotos"]')!.click()
    })
    expect(cambiar).toHaveBeenCalledWith({ publicar: true, soloConFotos: true, lote: 'lote-1' })
  })

  it('elegir uno y publicarlo manda sólo ese id', async () => {
    await montar()
    const primero = caja.querySelector<HTMLElement>('[data-testid="inmueble-para-elegir"] button[role="checkbox"]')!
    await act(async () => primero.click())
    await act(async () => {
      caja.querySelector<HTMLButtonElement>('[data-testid="publicar-los-elegidos"]')!.click()
    })
    expect(cambiar).toHaveBeenCalledWith({ publicar: true, propertyIds: ['a'] })
  })

  it('sin la migración lo dice y no ofrece nada', async () => {
    lista.mockResolvedValueOnce({
      disponible: false,
      motivo: 'Esta parte del marketplace todavía no está disponible.',
      resumen: { publicados: 0, noPublicados: 0, noPublicadosConFotos: 0, seVen: 0 },
      inmuebles: [],
    })
    await montar()
    expect(caja.querySelector('[data-testid="publicar-sin-migrar"]')).not.toBeNull()
    expect(caja.querySelector('[data-testid="publicar-los-que-tienen-fotos"]')).toBeNull()
  })
})

describe('la frase del resultado', () => {
  it('publicados y los que quedaron sin fotos', () => {
    expect(fraseDelCambio({ publicar: true, cambiados: 12, sinFotos: 3 })).toBe(
      'Publicamos 12 inmuebles en el marketplace. 3 quedaron sin publicar porque no tienen fotos.',
    )
    expect(fraseDelCambio({ publicar: true, cambiados: 1, sinFotos: 1 })).toBe(
      'Publicamos 1 inmueble en el marketplace. 1 quedó sin publicar porque no tiene fotos.',
    )
    expect(fraseDelCambio({ publicar: false, cambiados: 2, sinFotos: 0 })).toBe('Quitamos 2 inmuebles del marketplace.')
  })
})
