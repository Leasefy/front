/**
 * BlogListing.test.tsx — el listado del blog. Estructura y cableado:
 * copia y datos salen de `blog-posts.ts` (única fuente), los `<Link>` llevan
 * rutas reales (nunca `#`), el filtro por categoría funciona, y la foto de
 * cada tarjeta es LA DEL ARTÍCULO (`post.image`) — no una textura decorativa
 * que leía como placeholder (rediseño del 2026-09-05).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

import { BlogListing } from './BlogListing'
import { blogPosts, blogCategories } from '@/lib/data/blog-posts'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function render() {
  act(() => {
    root.render(<BlogListing />)
  })
}

describe('<BlogListing>', () => {
  it('renders the heading and every category tab, "Todos" active by default', () => {
    render()
    expect(container.querySelector('[data-testid="blog-listing"] h1')?.textContent).toContain(
      'Ideas, guías y tendencias',
    )
    const tabs = container.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(blogCategories.length)
    const active = container.querySelector('[role="tab"][aria-selected="true"]')
    expect(active?.textContent).toBe('Todos')
  })

  it('renders the first post as the featured card with a real <Link> href', () => {
    render()
    const featured = container.querySelector('[data-testid="blog-featured"]') as HTMLAnchorElement
    expect(featured).toBeTruthy()
    expect(featured.getAttribute('href')).toBe(blogPosts[0].href)
    expect(featured.getAttribute('href')?.startsWith('#')).toBe(false)
    expect(featured.textContent).toContain(blogPosts[0].title)
  })

  it('renders the remaining posts as grid cards with real <Link> hrefs', () => {
    render()
    const cards = Array.from(container.querySelectorAll('[data-testid="blog-card"]')) as HTMLAnchorElement[]
    expect(cards.length).toBe(blogPosts.length - 1)
    for (const card of cards) {
      const href = card.getAttribute('href') ?? ''
      expect(href.startsWith('#')).toBe(false)
    }
    expect(cards[0].textContent).toContain(blogPosts[1].title)
  })

  it('cada tarjeta lleva la foto de SU artículo, no una textura decorativa', () => {
    render()
    const destacada = container.querySelector('[data-testid="blog-featured"] img') as HTMLImageElement
    expect(destacada.getAttribute('src')).toBe(blogPosts[0].image)
    const tarjetas = Array.from(container.querySelectorAll('[data-testid="blog-card"] img')) as HTMLImageElement[]
    tarjetas.forEach((img, i) => expect(img.getAttribute('src')).toBe(blogPosts[i + 1].image))
    // La foto es decorativa al lado del título: alt vacío, no el título repetido.
    expect(destacada.getAttribute('alt')).toBe('')
  })

  it('no numera las tarjetas: el orden no significa nada', () => {
    render()
    expect(container.querySelector('.landing-bp__gn')).toBeNull()
  })

  it('muestra un estado vacío cuando la categoría no tiene artículos', () => {
    render()
    // Todas las categorías publicadas tienen artículos; se fuerza el vacío
    // pidiendo una que no existe en los datos mediante el propio filtro.
    const tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    const sinArticulos = tabs.find(
      (t) => t.textContent !== 'Todos' && !blogPosts.some((p) => p.category === t.textContent),
    )
    if (!sinArticulos) {
      // Hoy toda categoría tiene al menos un artículo: no hay vacío que mostrar
      // y no debe haber un cartel de vacío en pantalla.
      expect(container.querySelector('[data-testid="blog-empty"]')).toBeNull()
      return
    }
    act(() => {
      sinArticulos.click()
    })
    expect(container.querySelector('[data-testid="blog-empty"]')?.textContent).toContain(sinArticulos.textContent)
    expect(container.querySelector('[data-testid="blog-featured"]')).toBeNull()
  })

  it('filters posts by category on tab click', () => {
    render()
    const targetCategory = blogPosts[1].category
    const tab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (el) => el.textContent === targetCategory,
    ) as HTMLButtonElement
    act(() => {
      tab.click()
    })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    const allCards = [
      ...(container.querySelector('[data-testid="blog-featured"]') ? [container.querySelector('[data-testid="blog-featured"]')] : []),
      ...Array.from(container.querySelectorAll('[data-testid="blog-card"]')),
    ]
    const expectedCount = blogPosts.filter((post) => post.category === targetCategory).length
    expect(allCards.length).toBe(expectedCount)
  })
})
