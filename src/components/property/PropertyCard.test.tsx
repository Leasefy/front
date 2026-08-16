/**
 * PropertyCard — protege una sola regla que no es obvia leyendo el markup:
 * a `next/image` NUNCA le llega un `src` vacío. Las propiedades demo o
 * incompletas pueden traer `thumbnailUrl` en blanco (o entradas vacías en
 * `images`), y un `src=""` dispara el warning de `next/image` y un preload de
 * href vacío. Cuando no queda ninguna imagen usable, se cae al placeholder
 * compartido (`/placeholder-property.svg`), nunca a "".
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// next/image → <img> plano, descartando las props no-DOM (fill/priority/sizes).
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string } & Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Cadence e íconos: irrelevantes para esta regla y pesados de cargar.
vi.mock('@leasefy/cadence', () => ({
  IconButton: (props: Record<string, unknown>) => (
    <button aria-label={props['aria-label'] as string} />
  ),
}))

vi.mock('@phosphor-icons/react', () => ({
  Heart: () => null,
  MapPin: () => null,
  CaretLeft: () => null,
  CaretRight: () => null,
}))

import { PropertyCard } from './PropertyCard'
import type { Property } from '@/lib/types/property'

let container: HTMLDivElement
let root: Root

const BASE: Property = {
  id: 'p1',
  title: 'Apartamento Chapinero',
  images: ['a.jpg', 'b.jpg'],
  thumbnailUrl: 'thumb.jpg',
  monthlyRent: 2_000_000,
  neighborhood: 'Chapinero',
  city: 'Bogotá',
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  status: 'available',
  type: 'apartment',
} as Property

function montar(overrides: Partial<Property> = {}) {
  act(() => {
    root.render(<PropertyCard property={{ ...BASE, ...overrides }} />)
  })
}

function srcs(): string[] {
  return Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '')
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('PropertyCard — nunca un src vacío', () => {
  it('sin imágenes ni thumbnail cae al placeholder, no a ""', () => {
    montar({ images: [], thumbnailUrl: '' })
    expect(srcs()).toEqual(['/placeholder-property.svg'])
    expect(srcs()).not.toContain('')
  })

  it('filtra las entradas vacías de images', () => {
    montar({ images: ['', 'real.jpg', ''], thumbnailUrl: '' })
    expect(srcs()).toEqual(['real.jpg'])
    expect(srcs()).not.toContain('')
  })

  it('cae al thumbnail cuando images está vacío pero el thumbnail sirve', () => {
    montar({ images: [], thumbnailUrl: 'thumb.jpg' })
    expect(srcs()).toEqual(['thumb.jpg'])
  })

  it('con images válidas las usa (y no agrega el thumbnail al carrusel)', () => {
    montar({ images: ['a.jpg', 'b.jpg'], thumbnailUrl: 'thumb.jpg' })
    expect(srcs()).toEqual(['a.jpg', 'b.jpg'])
  })
})
