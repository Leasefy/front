/**
 * «Inmuebles para ti» con aprobación (glow up 22-10): el encabezado común, el tope en grande, cuántos caben y
 * cuántos quedaron fuera en una línea, y el marketplace siempre en OTRA pestaña.
 */
import * as React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Aprobacion } from '@/lib/api/aprobacion.service'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const props = vi.hoisted(() => ({ lista: [] as unknown[], cargando: false, fallo: null as unknown }))
vi.mock('@/lib/hooks/useProperties', () => ({ useProperties: () => ({ properties: props.lista, isLoading: props.cargando, errorCrudo: props.fallo, refetch: vi.fn() }) }))
vi.mock('@/lib/hooks/useWishlist', () => ({ useWishlist: () => ({ isWishlisted: () => false, toggleWishlist: vi.fn() }) }))
vi.mock('@/components/estado/FalloDeCarga', () => ({ FalloDeCarga: () => <div data-testid="fallo-de-carga" /> }))
vi.mock('@/components/tenant/QueSignificaPostularse', () => ({ QueSignificaPostularse: () => null }))
vi.mock('@/components/property/PropertyGrid', () => ({
  PropertyGrid: ({ properties }: { properties: { id: string }[] }) => (
    <ul data-testid="grilla">{properties.map((p) => <li key={p.id}>{p.id}</li>)}</ul>
  ),
}))

import { CatalogoPorAprobacion } from './CatalogoPorAprobacion'

let host: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
function montar(a: Aprobacion) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<CatalogoPorAprobacion aprobacion={a} />))
}

const aprobada: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_500_000,
  aseguradoras: [],
  vigenteHasta: new Date(Date.now() + 40 * 86_400_000).toISOString(),
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}
const inmueble = (id: string, canon: number) => ({ id, monthlyRent: canon, status: 'available', listingType: 'rent' })

describe('CatalogoPorAprobacion', () => {
  it('encabezado común, el tope en grande y cuántos caben y cuántos se pasan', () => {
    props.lista = [inmueble('a', 1_800_000), inmueble('b', 2_400_000), inmueble('c', 3_100_000)]
    montar(aprobada)
    expect(host.querySelector('h1')?.textContent).toBe('Inmuebles para ti')
    expect(host.textContent).toContain('Buscar arriendo')
    expect(host.querySelector('[data-testid="tope-en-grande"]')?.textContent).toMatch(/2\.500\.000/)
    const conteo = host.querySelector('[data-testid="catalogo-conteo"]')?.textContent ?? ''
    expect(conteo).toContain('2 que puedes tomar con tu aprobación')
    expect(conteo).toContain('No te mostramos 1 inmueble que se pasa de tu tope.')
    expect(Array.from(host.querySelectorAll('[data-testid="grilla"] li')).map((l) => l.textContent)).toEqual(['a', 'b'])
  })

  it('el marketplace se abre en otra pestaña y no hay «Volver a Inicio»', () => {
    props.lista = []
    montar(aprobada)
    const ir = host.querySelector('[data-testid="catalogo-ir-al-marketplace"]')
    expect(ir?.getAttribute('href')).toBe('/propiedades')
    expect(ir?.getAttribute('target')).toBe('_blank')
    expect(ir?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(host.textContent).not.toContain('Volver a Inicio')
    // Sin nada dentro del tope: el vacío, sin rellenar con lo que no puede tomar.
    expect(host.querySelector('[data-testid="catalogo-vacio"]')).not.toBeNull()
  })

  it('si los inmuebles no llegaron, lo dice con reintento: nunca «no hay inmuebles dentro de tu tope»', () => {
    props.lista = []
    props.fallo = new Error('caído')
    montar(aprobada)
    expect(host.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="catalogo-vacio"]')).toBeNull()
    props.fallo = null
  })
})
