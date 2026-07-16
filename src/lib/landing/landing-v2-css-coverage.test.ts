/**
 * landing-v2-css-coverage.test.ts — regression guard mirroring
 * landing-css-coverage.test.ts (incident #267), scoped for the v2
 * (Cohere-style) home port (landing-react-port F1).
 *
 * Every rule in the scoped v2 stylesheet must live under `.lv2` (Next.js
 * bundles plain CSS globally even when imported from a nested layout, so
 * `.lv2` is what prevents these ~1,700 ported rules from leaking into the
 * rest of the app), with three documented exceptions:
 *   - `html{scroll-padding-top:96px}` — anchor-scroll offset must live on
 *     the real scrolling viewport, not a wrapper div.
 *   - `html.contact-open body`, `html.blog-open body`,
 *     `html.product-open body` — a genuine document-wide scroll lock while
 *     an internal overlay (blog/contact/product) is open, toggled directly
 *     on `<html>`/`<body>` by landing-fx.ts.
 * `html.xxx`/`body.xxx` state-class selectors otherwise still scope their
 * descendant chain under `.lv2` (e.g. `html.blog-open .lv2 header`).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const CSS_PATH = path.join(process.cwd(), 'src/app/(landing)/landing-v2.css')

const DOCUMENTED_EXCEPTIONS = [
  'html',
  'html.contact-open body',
  'html.blog-open body',
  'html.product-open body',
]

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Strips the body of at-rules whose inner selectors are exempt from the
 * `.lv2` prefix requirement (keyframe steps, font-face declarations aren't
 * selectors that need scoping). */
function stripExemptAtRuleBlocks(css: string): string {
  const exemptNames = ['keyframes', 'font-face', '-webkit-keyframes']
  let result = ''
  let i = 0
  while (i < css.length) {
    let nearestIdx = -1
    for (const name of exemptNames) {
      const idx = css.indexOf(`@${name}`, i)
      if (idx !== -1 && (nearestIdx === -1 || idx < nearestIdx)) nearestIdx = idx
    }
    if (nearestIdx === -1) {
      result += css.slice(i)
      break
    }
    result += css.slice(i, nearestIdx)
    const braceStart = css.indexOf('{', nearestIdx)
    let depth = 1
    let j = braceStart + 1
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    i = j
  }
  return result
}

/** Walks brace depth to collect selector text immediately before every `{`
 * at depth 0 (plain rules + at-rule preludes) and depth 1 (rules nested one
 * level inside e.g. `@media`/`@supports`). */
function collectScopableSelectors(css: string): string[] {
  const selectors: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of css) {
    if (ch === '{') {
      const text = buf.trim()
      buf = ''
      if (text && !text.startsWith('@') && (depth === 0 || depth === 1)) {
        selectors.push(text)
      }
      depth++
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1)
      buf = ''
    } else {
      buf += ch
    }
  }
  return selectors
}

/** A selector branch is considered scoped when it starts with `.lv2`, OR
 * when it is an `html.xxx`/`body.xxx` state-class prefix that descends into
 * `.lv2` further down the chain (these can't start with `.lv2` because the
 * state class lives on a real document-root ancestor). */
function isScoped(selector: string): boolean {
  if (selector.startsWith('.lv2')) return true
  if (/^(html|body)(\.[\w-]+)+\s+\.lv2(\s|$)/.test(selector)) return true
  return DOCUMENTED_EXCEPTIONS.includes(selector)
}

describe('landing-v2.css coverage', () => {
  it('exists as a stylesheet at src/app/(landing)/landing-v2.css', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true)
  })

  it('scopes every rule under .lv2 (except keyframes/font-face/documented html exceptions)', () => {
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    const stripped = stripExemptAtRuleBlocks(stripComments(css))
    const selectors = collectScopableSelectors(stripped)
    expect(selectors.length).toBeGreaterThan(0)

    const unscoped = selectors.filter((selectorGroup) =>
      selectorGroup
        .split(',')
        .map((s) => s.trim())
        .some((single) => single.length > 0 && !isScoped(single))
    )
    expect(unscoped).toEqual([])
  })

  it('never leaves the :root font/color tokens unscoped', () => {
    const css = fs.readFileSync(CSS_PATH, 'utf-8')
    expect(css).not.toMatch(/(^|[};])\s*:root\s*\{/)
  })
})
