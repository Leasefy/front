/**
 * page.test.tsx — /blog/[slug] thin route shell (landing-react-port
 * SLICE 6). SEO-bearing `generateMetadata`/`generateStaticParams`/
 * `notFound()` logic is UNCHANGED from the pre-restyle page (design §2 risk:
 * blog metadata must stay intact) — only the rendered presentation swaps
 * to `<BlogArticle>`.
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

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

import BlogArticlePage, { generateMetadata, generateStaticParams } from './page'
import { blogPosts } from '@/lib/data/blog-posts'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  notFoundMock.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('/blog/[slug] page', () => {
  const post = blogPosts[0]

  it('generateStaticParams returns every post slug', async () => {
    const params = generateStaticParams()
    expect(params).toEqual(blogPosts.map((p) => ({ slug: p.slug })))
  })

  it('generateMetadata resolves title/description/canonical from the post', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: post.slug }) })
    expect(metadata.title).toBe(post.title)
    expect(metadata.description).toBe(post.excerpt)
    expect(metadata.alternates?.canonical).toContain(`/blog/${post.slug}`)
  })

  it('generateMetadata falls back gracefully for an unknown slug', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'no-existe' }) })
    expect(metadata.title).toBe('Articulo no encontrado')
  })

  it('renders BlogArticle with the resolved post for a valid slug', async () => {
    const element = await BlogArticlePage({ params: Promise.resolve({ slug: post.slug }) })
    act(() => {
      root.render(element)
    })
    expect(container.querySelector('[data-testid="article-title"]')?.textContent).toBe(post.title)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('calls notFound() for an unknown slug', async () => {
    await expect(BlogArticlePage({ params: Promise.resolve({ slug: 'no-existe' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(notFoundMock).toHaveBeenCalled()
  })
})
