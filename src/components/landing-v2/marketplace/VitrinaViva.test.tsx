/**
 * La vitrina viva sin inmuebles (Nico, 16-10-2026: «¿por qué le quitaste lo de
 * la sección de publicar gratis después del hero y en el hero el widget de
 * marketplace?»). Lo que invita a publicar se ve SIEMPRE; lo que sale del
 * catálogo (fotos, números, mosaico), sólo con inmuebles.
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
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span data-imagen={p.alt} /> }))

let container: HTMLDivElement
let root: Root
let Vitrina: typeof import('./VitrinaViva')

// Cada prueba es una página nueva: el catálogo se pide una vez por página.
beforeAll(async () => {
  await import('./VitrinaViva')
}, 120_000)

beforeEach(async () => {
  vi.resetModules()
  Vitrina = await import('./VitrinaViva')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
}, 30_000)

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar() {
  const alTocar = vi.fn()
  await act(async () => {
    root.render(
      <>
        <Vitrina.BoletoDelMarketplace hrefPublicar="/publicar" alTocarPublicar={alTocar} />
        <Vitrina.MosaicoDelMarketplace hrefPublicar="/publicar" alTocarPublicar={alTocar} />
      </>,
    )
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const PUBLICADO = { id: 'a', status: 'available', images: ['a.jpg'], agencyName: 'Teja Roja Arriendos', neighborhood: 'Laureles', city: 'Medellín', monthlyRent: 2_350_000, type: 'apartment' }

describe('la vitrina viva sin inmuebles', () => {
  it('si el back no contesta, el boleto y «Publica gratis» siguen, sin afirmar nada del catálogo', async () => {
    catalogo.respuesta = null
    await montar()
    const boleto = container.querySelector('.mk-boleto')!
    expect(boleto).not.toBeNull()
    expect(boleto.querySelector('a.mk-boleto-pub')?.getAttribute('href')).toBe('/publicar')
    expect(boleto.textContent).not.toMatch(/\d+\s+inmuebles/)
    expect(boleto.querySelector('.mk-boleto-fotos')).toBeNull()

    const seccion = container.querySelector('#marketplace')!
    expect(seccion.textContent).toContain('Que te encuentre toda la ciudad.')
    expect(seccion.textContent).toContain('Publicar mis inmuebles gratis')
    expect(seccion.textContent).toContain('Tu inmueble aquí')
    expect(seccion.textContent).not.toContain('Todavía no hay inmuebles publicados')
  })

  it('con el catálogo vacío lo dice: los primeros que publiquen salen ahí', async () => {
    catalogo.respuesta = { data: [] }
    await montar()
    const seccion = container.querySelector('#marketplace')!
    expect(seccion.textContent).toContain('Todavía no hay inmuebles publicados')
    expect(seccion.querySelector('.mk-tile-libre a')?.getAttribute('href')).toBe('/publicar')
  })

  it('sin inmuebles, las cinco casillas chicas son inmuebles armándose', async () => {
    catalogo.respuesta = null
    await montar()
    expect(container.querySelectorAll('.mk-tile-armandose')).toHaveLength(5)
  })

  it('con inmuebles, «Tu inmueble aquí» se queda y lo publicado ocupa las casillas chicas (Nico, 16-10-2026)', async () => {
    catalogo.respuesta = { data: [PUBLICADO] }
    await montar()
    expect(container.querySelector('.mk-boleto-fotos')).not.toBeNull()
    expect(container.querySelector('.mk-boleto')!.textContent).toContain('1 inmuebles para arrendar')
    const seccion = container.querySelector('#marketplace')!
    expect(seccion.querySelector('.mk-tile-0')?.textContent).toContain('Tu inmueble aquí')
    // Con el idioma de la página en la URL (16-10-2026): sin prefijo, el middleware tendría que redirigir.
    expect(seccion.querySelectorAll('a.mk-tile[href="/es/propiedades/a"]')).toHaveLength(1)
    expect(seccion.querySelectorAll('.mk-tile-armandose')).toHaveLength(4)
    expect(seccion.textContent).toContain('Teja Roja Arriendos')
  })
})

describe('en /en (Nico, 16-10-2026)', () => {
  it('la vitrina habla inglés y el español queda igual', async () => {
    catalogo.respuesta = null
    const { IdiomaDeLaPagina } = await import('@/lib/idioma/use-idioma')
    await act(async () => {
      root.render(
        <IdiomaDeLaPagina idioma="en">
          <Vitrina.BoletoDelMarketplace hrefPublicar="/publicar" alTocarPublicar={() => {}} />
          <Vitrina.MosaicoDelMarketplace hrefPublicar="/publicar" alTocarPublicar={() => {}} />
        </IdiomaDeLaPagina>,
      )
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.querySelector('.mk-boleto')!.textContent).toContain('List for free')
    const seccion = container.querySelector('#marketplace')!
    expect(seccion.textContent).toContain('Let the whole city find you.')
    expect(seccion.textContent).toContain('Your property here')
    expect(seccion.querySelector('[role="tabpanel"]')!.textContent).toContain('Listing costs nothing')
    expect(seccion.textContent).not.toContain('Publica')
  })
})

describe('las razones, de a una', () => {
  it('01 02 03 04 son pestañas y debajo va sólo la elegida', async () => {
    catalogo.respuesta = null
    await montar()
    const pestanas = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(pestanas.map((b) => b.textContent)).toEqual(['01', '02', '03', '04'])
    expect(pestanas[0].getAttribute('aria-selected')).toBe('true')
    const panel = () => container.querySelector('[role="tabpanel"]')!.textContent
    expect(panel()).toContain('Publicar no cuesta')
    expect(panel()).not.toContain('Inquilinos que llegan listos')

    await act(async () => {
      pestanas[2].click()
    })
    await vi.waitFor(() => expect(panel()).toContain('Inquilinos que llegan listos'))
    expect(pestanas[2].getAttribute('aria-selected')).toBe('true')
    // Las de antes quedan marcadas como vistas.
    expect(pestanas[0].hasAttribute('data-vista')).toBe(true)
  })
})
