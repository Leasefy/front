/**
 * La franja del marketplace, arriba de todas las páginas públicas (Nico,
 * 16-10-2026: «agrégalo para toda la experiencia, dale opción de poder
 * cerrarlo y quita eso de 14 inmuebles 5 inmobiliarias… otro tipo de
 * conquista y sentido de urgencia»).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// `act` sin avisos en la consola.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const catalogo = vi.hoisted(() => ({ data: [] as Record<string, unknown>[] }))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null, activeContext: null, agencyRole: null }),
}))

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    list: () => Promise.resolve({ data: catalogo.data, meta: { total: catalogo.data.length } }),
  },
}))

const CLAVE = 'leasefy.franja-del-marketplace'
const DIA = 24 * 60 * 60 * 1000

const PUBLICADOS = [
  { id: 'a', status: 'available', images: ['a.jpg'], agencyName: 'Teja Roja Arriendos', neighborhood: 'Laureles', city: 'Medellín' },
  { id: 'b', status: 'available', images: ['b.jpg'], agencyName: 'Teja Roja Arriendos', neighborhood: 'Belén', city: 'Medellín' },
  { id: 'c', status: 'available', images: ['c.jpg'], agencyName: 'Cuadra Arriendos', neighborhood: null, city: 'Envigado' },
]

let container: HTMLDivElement
let root: Root
let Header: typeof import('../LandingHeaderV2').LandingHeaderV2

// La primera importación trae framer y Cadence en frío (con la máquina
// ocupada pasa de 30 s); después, cada `resetModules` la vuelve a evaluar ya
// transformada.
beforeAll(async () => {
  await import('../LandingHeaderV2')
}, 120_000)

beforeEach(async () => {
  // Cada prueba es una visita nueva: lo que la franja recuerda de la visita
  // vive en el módulo.
  vi.resetModules()
  Header = (await import('../LandingHeaderV2')).LandingHeaderV2
  catalogo.data = PUBLICADOS
  window.localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
}, 30_000)

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  await act(async () => {
    root.render(<Header fxExterno />)
  })
  // El catálogo llega en una promesa.
  await act(async () => {
    await Promise.resolve()
  })
}

const franja = () => container.querySelector('.mk-anuncio')
const header = () => container.querySelector('#hdr')

describe('FranjaDelMarketplace', () => {
  it('va arriba de todo, ANTES del header, y lleva a publicar gratis', async () => {
    await montar()
    expect(franja()).not.toBeNull()
    expect(franja()!.compareDocumentPosition(header()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(franja()!.querySelector('a.mk-anuncio-t')?.getAttribute('href')).toBe('/publica')
    // El header baja para dejarla ver.
    expect(header()?.hasAttribute('data-franja')).toBe(true)
  })

  it('ya no cuenta inmuebles ni inmobiliarias', async () => {
    await montar()
    expect(franja()!.textContent).not.toMatch(/\d+\s+inmuebles|inmobiliarias/i)
  })

  it('no abre con «Nuevo» (Nico, 16-10-2026)', async () => {
    await montar()
    expect(franja()!.textContent).not.toMatch(/nuevo/i)
  })

  it('dice quién ya publica y pregunta «¿Y tú?»', async () => {
    await montar()
    expect(franja()!.querySelector('.mk-anuncio-pista')?.textContent).toBe('Teja Roja Arriendos ya publica en Laureles. ¿Y tú?')
  })

  it('una razón social que no cabe en la franja se salta', async () => {
    catalogo.data = [
      { id: 'l', status: 'available', images: ['l.jpg'], agencyName: 'Sociedad de Arrendamientos y Administración del Valle de Aburrá S.A.S.', neighborhood: 'Laureles', city: 'Medellín' },
      ...PUBLICADOS.slice(2),
    ]
    await montar()
    expect(franja()!.querySelector('.mk-anuncio-pista')?.textContent).toBe('Cuadra Arriendos ya publica en Envigado. ¿Y tú?')
  })

  it('sin nadie publicando, queda la frase fija', async () => {
    catalogo.data = []
    await montar()
    expect(franja()!.querySelector('.mk-anuncio-quien')).toBeNull()
    const fija = franja()!.querySelector('.mk-anuncio-fija')
    expect(fija?.textContent?.trim()).toBe('Antes que tu competencia')
    expect(fija?.hasAttribute('data-con-quien')).toBe(false)
  })

  it('la × la cierra: el header vuelve arriba y queda guardado', async () => {
    await montar()
    const x = container.querySelector<HTMLButtonElement>('button.mk-anuncio-x')
    expect(x?.getAttribute('aria-label')).toBe('Cerrar este aviso')
    await act(async () => {
      x!.click()
    })
    expect(header()?.hasAttribute('data-franja')).toBe(false)
    expect(header()?.hasAttribute('data-cerrando')).toBe(true)
    expect(Number(window.localStorage.getItem(CLAVE))).toBeGreaterThan(Date.now() - 5000)
  })

  it('cerrada, al pasar a otra página de la misma visita ya llega cerrada', async () => {
    await montar()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button.mk-anuncio-x')!.click()
    })
    act(() => root.unmount())
    root = createRoot(container)
    act(() => {
      root.render(<Header activo="inmuebles" />)
    })
    // Ni un cuadro con la franja: el primer pintado ya sale sin ella.
    expect(franja()).toBeNull()
    expect(header()?.hasAttribute('data-franja')).toBe(false)
  })

  it('cerrada hace menos de una semana no vuelve; después, sí', async () => {
    window.localStorage.setItem(CLAVE, String(Date.now() - DIA))
    await montar()
    expect(header()?.hasAttribute('data-franja')).toBe(false)

    act(() => root.unmount())
    vi.resetModules()
    Header = (await import('../LandingHeaderV2')).LandingHeaderV2
    window.localStorage.setItem(CLAVE, String(Date.now() - 8 * DIA))
    root = createRoot(container)
    await montar()
    expect(header()?.hasAttribute('data-franja')).toBe(true)
  })
})
