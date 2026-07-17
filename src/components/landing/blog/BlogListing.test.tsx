/**
 * BlogListing.test.tsx — the blog listing (landing-react-port SLICE 6),
 * ported from the standalone's `#blogPage` (`landing-standalone/index.html`
 * ~L2773-2827, CSS ~L1520-1566). Structure/wiring only per Strict TDD:
 * copy/data sourced from `blog-posts.ts` (UNTOUCHED, design §2), real
 * `<Link>` hrefs (no `#` fragments), category filter interaction, and
 * texture-backed card art (t1-t7, HANDOFF §5b) sourced from the shared
 * `LANDING_TEXTURES` constants (S2) — never a hardcoded `/landing/**` path.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { BlogListing } from './BlogListing'
import { blogPosts, blogCategories } from '@/lib/data/blog-posts'
import { LANDING_TEXTURES } from '@/lib/landing/assets'

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

  it('sources card art from the shared LANDING_TEXTURES constants (t1-t7), never a hardcoded path', () => {
    render()
    const featuredMedia = container.querySelector('[data-testid="blog-featured"] .landing-bp__media') as HTMLElement
    const validSrcs = Object.values(LANDING_TEXTURES).map((texture) => texture.src)
    const matchesTexture = validSrcs.some((src) => featuredMedia.style.backgroundImage.includes(src))
    expect(matchesTexture).toBe(true)
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
