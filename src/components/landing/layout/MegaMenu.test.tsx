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

  it('does not use role="menu" — it is a plain disclosure panel, not an ARIA menu', () => {
    openMenu()
    const panel = container.querySelector('[data-testid="mega-menu-panel"]')
    expect(panel?.getAttribute('role')).toBeNull()
  })

  it('closes on Escape', () => {
    openMenu()
    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeTruthy()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
    const trigger = container.querySelector('[aria-controls="landing-mega-panel"]')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes when clicking outside the menu', () => {
    openMenu()
    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeTruthy()

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
  })

  it('returns focus to the trigger on Escape when focus was inside the panel', () => {
    openMenu()
    const trigger = container.querySelector('[aria-controls="landing-mega-panel"]') as HTMLButtonElement
    const panelLink = container.querySelector('[data-testid="mega-menu-tile"]') as HTMLAnchorElement
    act(() => {
      panelLink.focus()
    })
    expect(document.activeElement).toBe(panelLink)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('does not steal focus on Escape when focus was outside the panel (opened via hover)', () => {
    const outsideButton = document.createElement('button')
    outsideButton.textContent = 'outside'
    document.body.appendChild(outsideButton)

    act(() => {
      root.render(<MegaMenu />)
    })
    const menu = container.querySelector('[data-testid="mega-menu"]') as HTMLDivElement
    act(() => {
      // React's onMouseEnter is implemented on top of the native "mouseover"
      // event (bubbling), not the native non-bubbling "mouseenter" event.
      menu.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeTruthy()

    act(() => {
      outsideButton.focus()
    })
    expect(document.activeElement).toBe(outsideButton)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
    expect(document.activeElement).toBe(outsideButton)

    outsideButton.remove()
  })

  it('restores focus to the trigger on click-outside when focus was inside the panel', () => {
    openMenu()
    const trigger = container.querySelector('[aria-controls="landing-mega-panel"]') as HTMLButtonElement
    const panelLink = container.querySelector('[data-testid="mega-menu-tile"]') as HTMLAnchorElement
    act(() => {
      panelLink.focus()
    })
    expect(document.activeElement).toBe(panelLink)

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('does not move focus on click-outside when focus was elsewhere', () => {
    const outsideButton = document.createElement('button')
    outsideButton.textContent = 'outside'
    document.body.appendChild(outsideButton)

    openMenu()
    act(() => {
      outsideButton.focus()
    })
    expect(document.activeElement).toBe(outsideButton)

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="mega-menu-panel"]')).toBeNull()
    expect(document.activeElement).toBe(outsideButton)

    outsideButton.remove()
  })
})
