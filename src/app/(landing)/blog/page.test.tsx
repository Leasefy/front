/**
 * page.test.tsx — /blog thin route shell (landing-react-port SLICE 6).
 * The route lives inside the `(landing)` group so it inherits scoped fonts
 * + `<LandingHeader>`/`<LandingFooter>` from `(landing)/layout.tsx` for
 * free (design's "header lives on all internals" rule) — this shell only
 * renders the presentation component, no metadata of its own (the SEO-
 * bearing metadata stays in `blog/layout.tsx`, UNTOUCHED).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import BlogPage from './page'

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

describe('/blog page', () => {
  it('renders the BlogListing presentation component', () => {
    act(() => {
      root.render(<BlogPage />)
    })
    expect(container.querySelector('[data-testid="blog-listing"]')).toBeTruthy()
  })
})
