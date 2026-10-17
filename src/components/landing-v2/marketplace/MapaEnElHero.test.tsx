/**
 * El mapa chico del hero sin catálogo (Nico, 16-10-2026: «no veo el widget
 * bonito de marketplace que habías colocado acá al lado de la pantalla
 * grande»). Con el back sin contestar se escondía entero; ahora se queda con un
 * solo pin, el de quien publique, y lleva a publicar gratis.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const catalogo = vi.hoisted(() => ({ respuesta: null as null | { data: Record<string, unknown>[] } }))

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    list: () =>
      catalogo.respuesta
        ? Promise.resolve({ data: catalogo.respuesta.data, meta: { total: catalogo.respuesta.data.length } })
        : Promise.reject(new Error('503')),
  },
}))
vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span data-mapa>{children}</span>,
  Marker: ({ children }: { children: React.ReactNode }) => <span data-marcador>{children}</span>,
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('@/components/map/trabajador-de-maplibre', () => ({}))

let container: HTMLDivElement
let root: Root

// La primera carga del módulo es lenta cuando corren todas juntas.
beforeAll(async () => {
  await import('./MapaEnElHero')
}, 120_000)

beforeEach(() => {
  vi.resetModules()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(idioma: 'es' | 'en' = 'es') {
  // Del mismo módulo que lee el mapa: cada prueba es una página nueva (`resetModules`).
  const { MapaEnElHero } = await import('./MapaEnElHero')
  const { IdiomaDeLaPagina } = await import('@/lib/idioma/use-idioma')
  await act(async () => {
    root.render(
      <IdiomaDeLaPagina idioma={idioma}>
        <MapaEnElHero hrefPublicar="/publicar" alTocarPublicar={() => {}} />
      </IdiomaDeLaPagina>,
    )
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const EN_LAURELES = (id: string, lat: number) => ({ id, status: 'available', images: ['a.jpg'], latitude: lat, longitude: -75.59, monthlyRent: 2_400_000 })

describe('el mapa chico del hero', () => {
  it('si el back no contesta, se queda con «Tu inmueble aquí» y lleva a publicar', async () => {
    catalogo.respuesta = null
    await montar()
    const pip = container.querySelector('a.mk-pip')!
    expect(pip).not.toBeNull()
    expect(pip.getAttribute('href')).toBe('/publicar')
    expect(pip.querySelectorAll('[data-marcador]')).toHaveLength(1)
    expect(pip.textContent).toContain('Tu inmueble aquí')
    expect(pip.textContent).toContain('Publicar es gratis')
    // Sin catálogo no dice «En vivo» ni cuenta inmuebles.
    expect(pip.textContent).not.toContain('En vivo')
    expect(pip.textContent).not.toMatch(/\d+\s+inmuebles/)
  })

  it('con precios cerca, los muestra y lleva al marketplace en el idioma de la página', async () => {
    catalogo.respuesta = { data: [EN_LAURELES('a', 6.24), EN_LAURELES('b', 6.25)] }
    await montar('en')
    const pip = container.querySelector('a.mk-pip')!
    expect(pip.getAttribute('href')).toBe('/en/propiedades')
    expect(pip.querySelectorAll('[data-marcador]')).toHaveLength(2)
    expect(pip.textContent).toContain('$2.4M')
    expect(pip.textContent).toContain('2 properties')
    expect(pip.textContent).toContain('Live')
  })
})
