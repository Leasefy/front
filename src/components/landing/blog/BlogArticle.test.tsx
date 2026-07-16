/**
 * BlogArticle.test.tsx — blog article presentation (landing-react-port
 * SLICE 6). Structure/wiring only per Strict TDD: renders a post's hero,
 * parsed markdown-lite body, and related-articles rail via real `<Link>`
 * hrefs. Data shape (`BlogPost`) is UNTOUCHED (design §2) — this component
 * only restyles presentation to the landing language.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, ...rest } = props
    return <img data-testid="next-image-mock" alt="" {...rest} />
  },
}))

import { BlogArticle } from './BlogArticle'
import { blogPosts } from '@/lib/data/blog-posts'

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
  vi.restoreAllMocks()
})

describe('<BlogArticle>', () => {
  const post = blogPosts[0]
  const related = blogPosts.slice(1, 4)

  it('renders the hero heading, category and meta from the post', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={related} />)
    })
    expect(container.querySelector('[data-testid="article-title"]')?.textContent).toBe(post.title)
    expect(container.querySelector('[data-testid="article-category"]')?.textContent).toBe(post.category)
  })

  it('renders a "back" <Link> to the blog listing, no # fragment', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={related} />)
    })
    const back = container.querySelector('[data-testid="article-back"]') as HTMLAnchorElement
    expect(back).toBeTruthy()
    expect(back.getAttribute('href')).toBe('/blog')
  })

  it('renders the parsed content body when present', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={related} />)
    })
    const body = container.querySelector('[data-testid="article-body"]')
    expect(body?.textContent).toContain('Colombia se consolida')
    expect(body?.querySelector('h2')).toBeTruthy()
  })

  it('renders a fallback message when content is missing', () => {
    act(() => {
      root.render(<BlogArticle post={{ ...post, content: undefined }} related={related} />)
    })
    const body = container.querySelector('[data-testid="article-body"]')
    expect(body?.textContent).toContain('disponible pronto')
  })

  it('renders related posts as real <Link> cards, no # fragments', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={related} />)
    })
    const relatedLinks = Array.from(
      container.querySelectorAll('[data-testid="article-related-card"]'),
    ) as HTMLAnchorElement[]
    expect(relatedLinks.length).toBe(related.length)
    for (const link of relatedLinks) {
      expect(link.getAttribute('href')?.startsWith('#')).toBe(false)
    }
    expect(relatedLinks[0].textContent).toContain(related[0].title)
  })

  it('wraps numbered list items in a valid <ol> instead of leaving orphan <li> elements', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={related} />)
    })
    const body = container.querySelector('[data-testid="article-body"]') as HTMLElement
    const items = Array.from(body.querySelectorAll('li'))
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.parentElement?.tagName).toBe('OL')
    }
  })

  it('omits the related section entirely when there are no related posts', () => {
    act(() => {
      root.render(<BlogArticle post={post} related={[]} />)
    })
    expect(container.querySelector('[data-testid="article-related"]')).toBeNull()
  })
})
