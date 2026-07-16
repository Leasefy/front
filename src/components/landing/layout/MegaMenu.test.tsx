/**
 * MegaMenu.test.tsx — products mega menu (landing-react-port SLICE 4b).
 * Structure/wiring only: trigger disclosure, real `<Link>` hrefs to the 8
 * product routes (no `#` fragments), grouped by product family.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { MegaMenu } from './MegaMenu'
import { PRODUCT_SLUGS } from '@/lib/landing/products'

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

function openMenu() {
  act(() => {
    root.render(<MegaMenu />)
  })
  const trigger = container.querySelector('[aria-controls="landing-mega-panel"]') as HTMLButtonElement
  act(() => {
    trigger.click()
  })
}

describe('<MegaMenu>', () => {
  it('renders a closed trigger with no panel by default', () => {
    act(() => {
      root.render(<MegaMenu />)
    })
    const trigger = container.querySelector('[aria-controls="landing-mega-panel"]')
    expect(trigger?.textContent).toContain('Producto')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
  })

  it('opens the panel on trigger click and toggles aria-expanded', () => {
    openMenu()
    const trigger = container.querySelector('[aria-controls="landing-mega-panel"]')
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeTruthy()
  })

  it('renders a real <Link> tile for every product route, no # fragments', () => {
    openMenu()
    const tiles = Array.from(container.querySelectorAll('[data-testid="mega-menu-tile"]')) as HTMLAnchorElement[]
    expect(tiles.length).toBe(PRODUCT_SLUGS.length)
    for (const tile of tiles) {
      const href = tile.getAttribute('href') ?? ''
      expect(href.startsWith('#')).toBe(false)
      expect(href.startsWith('/productos/')).toBe(true)
    }
    for (const slug of PRODUCT_SLUGS) {
      expect(container.querySelector(`a[href="/productos/${slug}"]`)).toBeTruthy()
    }
  })

  it('groups CRM and ERP under "El sistema", the rest under "Agentes AI"', () => {
    openMenu()
    const cols = container.querySelectorAll('.landing-mega__col')
    expect(cols[0].textContent).toContain('El sistema')
    expect(cols[0].querySelectorAll('[data-testid="mega-menu-tile"]').length).toBe(2)
    expect(cols[1].textContent).toContain('Agentes AI')
    expect(cols[1].querySelectorAll('[data-testid="mega-menu-tile"]').length).toBe(6)
  })
})
